'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT_DIR, SOURCE_PACK_DIR } = require('./paths');
const { readJson } = require('./fs');

function loadSourcePack(root = ROOT_DIR) {
    const dir = path.join(root, 'data', 'blogeo', 'source-pack');
    const fallback = SOURCE_PACK_DIR;
    const packDir = fs.existsSync(dir) ? dir : fallback;
    return {
        taxYear: readJson(path.join(packDir, 'tax-year.json'), { taxYear: 2026, staleTokens: [] }),
        banned: readJson(path.join(packDir, 'banned-terms.json'), { terms: [] }),
        irs: readJson(path.join(packDir, 'irs-anchors.json'), { anchors: [] }),
        positioning: readJson(path.join(packDir, 'positioning.json'), {}),
    };
}

function bodyFor(page, root = ROOT_DIR) {
    if (page.body) return page.body;
    const sourcePath = page.sourcePath;
    if (!sourcePath) return '';
    const abs = path.join(root, sourcePath);
    if (!fs.existsSync(abs)) return '';
    return fs.readFileSync(abs, 'utf8');
}

function haystackFor(page, root = ROOT_DIR) {
    return `${page.title || ''} ${page.description || ''} ${bodyFor(page, root)}`.toLowerCase();
}

function factCheckPage(page, pack, root = ROOT_DIR) {
    const flags = [];
    const text = haystackFor(page, root);
    const year = Number((pack.taxYear && pack.taxYear.taxYear) || 2026);
    const stale = (pack.taxYear && pack.taxYear.staleTokens) || [];
    if (page.indexable) {
        for (const token of stale) {
            if (token && text.includes(String(token).toLowerCase()) && !text.includes(String(year))) {
                flags.push({
                    type: 'staleTaxYear',
                    path: page.path,
                    sourcePath: page.sourcePath,
                    detail: `Source pack tax year is ${year}; found "${token}"`,
                    autoApply: false,
                    kind: 'content-push',
                });
            }
        }
        if (year >= 2026 && /\b2025\b/.test(`${page.title || ''} ${page.description || ''}`)) {
            flags.push({
                type: 'staleTaxYear',
                path: page.path,
                sourcePath: page.sourcePath,
                detail: 'Visible 2025 in title/description while source pack is 2026+',
                autoApply: false,
                kind: 'content-push',
            });
        }
    }
    for (const term of (pack.banned && pack.banned.terms) || []) {
        if (term && text.includes(String(term).toLowerCase())) {
            flags.push({
                type: 'bannedTerm',
                path: page.path,
                sourcePath: page.sourcePath,
                detail: `Banned phrase: "${term}"`,
                autoApply: false,
                kind: 'content-push',
            });
        }
    }
    return flags;
}

function factCheckTopPages(pages, pack, root = ROOT_DIR) {
    const ranked = (pages || [])
        .filter((page) => page && page.indexable)
        .slice()
        .sort((a, b) => {
            const scoreA = (a.opportunity && a.opportunity.score) || 0;
            const scoreB = (b.opportunity && b.opportunity.score) || 0;
            const impA = (a.gsc && a.gsc.impressions) || 0;
            const impB = (b.gsc && b.gsc.impressions) || 0;
            return scoreB - scoreA || impB - impA;
        });
    const top = ranked.slice(0, 15);
    const rest = ranked.slice(15);
    const weekSeed = new Date().getUTCDay();
    const buffer = [];
    for (let i = 0; i < 3 && rest.length; i += 1) {
        buffer.push(rest[(weekSeed + i) % rest.length]);
    }
    const selected = [...top, ...buffer];
    const flags = [];
    for (const page of selected) flags.push(...factCheckPage(page, pack, root));
    return { flags, checked: selected.map((page) => page.path), checkedCount: selected.length };
}

module.exports = {
    loadSourcePack,
    factCheckPage,
    factCheckTopPages,
    bodyFor,
};
