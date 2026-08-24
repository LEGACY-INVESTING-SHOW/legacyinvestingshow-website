'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT_DIR } = require('./paths');
const { normalizePath } = require('./urls');
const { opportunity, IMPRESSION_FLOOR } = require('./opportunity');
const { loadRedirectMap, resolveRedirect } = require('./redirects');
const { isBrandedQuery } = require('./queries');
const { extractMarkdownLinks } = require('./frontmatter');
const { extractHtmlHrefs } = require('./html');

function gscByPath(snapshot) {
    const map = new Map();
    if (!snapshot || !snapshot.pages) return map;
    for (const page of snapshot.pages) {
        const key = normalizePath(page.path || page.url);
        const existing = map.get(key) || { clicks: 0, impressions: 0, positionWeighted: 0, urls: [] };
        existing.clicks += page.clicks;
        existing.impressions += page.impressions;
        existing.positionWeighted += (page.position || 0) * (page.impressions || 0);
        existing.urls.push(page.url);
        map.set(key, existing);
    }
    for (const [key, value] of map) {
        value.position = value.impressions ? value.positionWeighted / value.impressions : 0;
        value.ctr = value.impressions ? value.clicks / value.impressions : 0;
        map.set(key, value);
    }
    return map;
}

function sitelinkClusters(gscMap) {
    const groups = new Map();
    for (const [urlPath, row] of gscMap) {
        const signature = `${Math.round(row.impressions)}:${row.position.toFixed(2)}:${row.clicks}`;
        if (!groups.has(signature)) groups.set(signature, []);
        groups.get(signature).push(urlPath);
    }
    const suspects = new Set();
    for (const paths of groups.values()) {
        if (paths.length >= 3) paths.forEach((item) => suspects.add(item));
    }
    return suspects;
}

function scoreCatalog(catalog, snapshot, previous) {
    const currentMap = gscByPath(snapshot);
    const prevMap = gscByPath(previous);
    const sitelinks = sitelinkClusters(currentMap);
    const scored = catalog.pages.map((page) => {
        const gsc = currentMap.get(page.path) || { clicks: 0, impressions: 0, position: 0, ctr: 0 };
        const prev = prevMap.get(page.path) || { clicks: 0 };
        return {
            ...page,
            gsc: {
                clicks: gsc.clicks,
                impressions: gsc.impressions,
                position: Number((gsc.position || 0).toFixed(2)),
                ctr: gsc.ctr || 0,
            },
            opportunity: opportunity({
                clicks: gsc.clicks,
                impressions: gsc.impressions,
                position: gsc.position,
            }, prev),
            sitelinkSuspect: sitelinks.has(page.path),
            sitelinkSuspect: sitelinks.has(page.path),
        };
    });
    scored.sort((a, b) => b.opportunity.score - a.opportunity.score || b.gsc.impressions - a.gsc.impressions);
    return scored;
}

function powerLaw(scored, sitewideClicks) {
    const withClicks = scored.filter((page) => page.gsc.clicks > 0).sort((a, b) => b.gsc.clicks - a.gsc.clicks);
    const total = sitewideClicks || withClicks.reduce((sum, page) => sum + page.gsc.clicks, 0);
    const share = (count) => {
        const clicks = withClicks.slice(0, count).reduce((sum, page) => sum + page.gsc.clicks, 0);
        return total ? clicks / total : 0;
    };
    return {
        totalClicks: total,
        urlsWithClicks: withClicks.length,
        top1Share: share(1),
        top5Share: share(5),
        top14Share: share(14),
        topUrls: withClicks.slice(0, 14).map((page) => ({
            path: page.path,
            clicks: page.gsc.clicks,
            impressions: page.gsc.impressions,
            position: page.gsc.position,
            ctr: page.gsc.ctr,
            share: total ? page.gsc.clicks / total : 0,
        })),
    };
}

function nearMissQueries(snapshot, ownership) {
    const owned = new Set(Object.keys((ownership && ownership.ownership) || {}).map((key) => key.toLowerCase()));
    return (snapshot.queries || []).map((row) => {
        const ownedHit = owned.has(String(row.query).toLowerCase());
        return {
            ...row,
            branded: isBrandedQuery(row.query),
            owned: ownedHit,
            nearMiss: !isBrandedQuery(row.query)
                && !ownedHit
                && row.impressions >= IMPRESSION_FLOOR
                && row.position >= 5
                && row.position <= 20,
            watchlist: !isBrandedQuery(row.query)
                && row.impressions >= 30
                && row.impressions < IMPRESSION_FLOOR
                && row.position >= 5
                && row.position <= 20,
        };
    });
}

function fileExistsOnDisk(root, href) {
    const urlPath = normalizePath(href);
    const candidates = [
        path.join(root, `${urlPath.replace(/^\//, '')}.html`),
        path.join(root, urlPath.replace(/^\//, ''), 'index.html'),
        path.join(root, 'content', `${urlPath.replace(/^\//, '')}.md`),
    ];
    if (urlPath.startsWith('/blog/')) {
        candidates.push(path.join(root, 'content', 'blog', `${urlPath.slice('/blog/'.length)}.md`));
    }
    return candidates.some((candidate) => fs.existsSync(candidate));
}

function pageHrefs(page, root) {
    if (Array.isArray(page.hrefs) && page.hrefs.length) return page.hrefs;
    const abs = path.join(root, page.sourcePath || '');
    if (!page.sourcePath || !fs.existsSync(abs)) return [];
    const raw = fs.readFileSync(abs, 'utf8');
    return page.pageType === 'blog' ? extractMarkdownLinks(raw) : extractHtmlHrefs(raw);
}

function runHygiene(catalog, snapshot, root = ROOT_DIR) {
    const redirectMap = loadRedirectMap(root);
    const pathSet = new Set(catalog.pages.map((page) => page.path));
    const flags = [];
    const gscMap = gscByPath(snapshot);
    const seenDead = new Set();

    for (const page of catalog.pages) {
        const gsc = gscMap.get(page.path);
        if (gsc && gsc.clicks > 0 && !page.indexable) {
            flags.push({ type: 'noindexButTraffic', path: page.path, detail: `${gsc.clicks} GSC clicks on a noindex URL`, autoApply: false });
        }
        if (page.indexable && page.description && gsc && gsc.impressions > 0) {
            const len = page.description.length;
            if (len < 120 || len > 165) {
                flags.push({ type: 'descriptionLength', path: page.path, detail: `meta description ${len} chars`, autoApply: false });
            }
        }
        if (page.indexable && /2025/.test(`${page.title} ${page.description || ''}`)) {
            flags.push({ type: 'taxYearStale', path: page.path, detail: 'Visible 2025 in title or description during 2026+', autoApply: false });
        }
        if (page.pageType === 'blog' && page.indexable && gsc && gsc.impressions > 0 && !page.hasFaq) {
            flags.push({ type: 'emptyFaq', path: page.path, detail: 'Indexable blog missing FAQ', autoApply: false });
        }
        if (page.pageType === 'blog' && page.indexable && gsc && gsc.impressions > 0 && !page.hasQuickTake) {
            flags.push({ type: 'noQuickTake', path: page.path, detail: 'Indexable blog missing Quick Take', autoApply: false });
        }
        if ((page.pageType === 'city' || page.pageType === 'pseo-persona' || page.pageType === 'insurance-state')
            && page.wordCount < 1200) {
            flags.push({ type: 'thinProgrammatic', path: page.path, detail: `wordCount ${page.wordCount}`, autoApply: false });
        }
        if (page.image && page.image.startsWith('/')) {
            const imagePath = path.join(root, page.image.replace(/^\//, ''));
            if (!fs.existsSync(imagePath)) {
                flags.push({ type: 'missingImage', path: page.path, detail: page.image, autoApply: false });
            }
        }

        for (const href of pageHrefs(page, root)) {
            if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) continue;
            if (/^https?:\/\//i.test(href) && !/legacyinvestingshow\.com/i.test(href)) continue;
            const urlPath = normalizePath(href);
            if (urlPath.startsWith('/assets/') || urlPath.startsWith('/css') || urlPath.startsWith('/js')) continue;
            const redirected = resolveRedirect(urlPath, redirectMap);
            if (redirected !== urlPath) {
                const key = `${page.path}|${urlPath}|${redirected}`;
                if (!seenDead.has(key)) {
                    seenDead.add(key);
                    flags.push({
                        type: 'deadInternalLink',
                        path: page.path,
                        detail: `${urlPath} redirects to ${redirected}`,
                        hrefFrom: urlPath,
                        hrefTo: redirected,
                        autoApply: true,
                        kind: 'dead-link',
                    });
                }
                continue;
            }
            if (!pathSet.has(urlPath) && !fileExistsOnDisk(root, urlPath)) {
                const key = `${page.path}|${urlPath}`;
                if (!seenDead.has(key)) {
                    seenDead.add(key);
                    flags.push({
                        type: 'deadInternalLink',
                        path: page.path,
                        detail: `${urlPath} is not in the catalog`,
                        hrefFrom: urlPath,
                        autoApply: false,
                    });
                }
            }
        }
    }

    const keywordOwners = new Map();
    for (const page of catalog.pages.filter((item) => item.indexable && item.primaryKeyword)) {
        const key = String(page.primaryKeyword).toLowerCase();
        if (!keywordOwners.has(key)) keywordOwners.set(key, []);
        keywordOwners.get(key).push(page.path);
    }
    for (const [keyword, paths] of keywordOwners) {
        if (paths.length > 1) {
            flags.push({ type: 'dualCanonicalRisk', path: paths[0], detail: `"${keyword}" claimed by ${paths.join(', ')}`, autoApply: false });
        }
    }
    return flags;
}

module.exports = { gscByPath, scoreCatalog, powerLaw, nearMissQueries, runHygiene, sitelinkClusters };
