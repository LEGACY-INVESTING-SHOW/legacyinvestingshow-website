#!/usr/bin/env node

/**
 * Apply the site indexation policy after all generated blog output is present.
 *
 * The CMS publish step owns final blog HTML, so this script intentionally runs
 * near the end of the build to keep robots/canonical/sitemap signals aligned.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const BLOG_DIR = path.join(ROOT_DIR, 'blog');
const TOOLS_DIR = path.join(ROOT_DIR, 'tools');
const TOOL_CATEGORIES_DIR = path.join(TOOLS_DIR, 'categories');
const POLICY_PATH = path.join(ROOT_DIR, 'data', 'indexation-policy.json');
const SITE_URL = process.env.SITE_URL || 'https://www.legacyinvestingshow.com';

function readPolicy() {
    if (!fs.existsSync(POLICY_PATH)) {
        return {
            blogCategoryArchivesRobots: 'noindex, follow',
            blogRedirects: [],
            forceIndexBlogSlugs: [],
            noindexBlogSlugPatterns: [],
        };
    }

    return JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'));
}

const policy = readPolicy();
const forceIndexSlugs = new Set(policy.forceIndexBlogSlugs || []);
const redirectsBySlug = new Map(
    (policy.blogRedirects || [])
        .filter((entry) => entry.source && entry.destination)
        .map((entry) => [entry.source.replace(/^\/blog\//, ''), entry])
);
const noindexPatterns = (policy.noindexBlogSlugPatterns || []).map((entry) => ({
    regex: new RegExp(entry.pattern),
    reason: entry.reason || 'Matched indexation policy',
}));

function replaceOrInsertHeadTag(html, matcher, replacement) {
    if (matcher.test(html)) {
        return html.replace(matcher, replacement);
    }

    return html.replace(/<head>/i, `<head>\n    ${replacement}`);
}

function getDecision(slug) {
    const redirect = redirectsBySlug.get(slug);
    if (redirect) {
        return {
            robots: 'noindex, follow',
            canonicalUrl: `${SITE_URL}${redirect.destination}`,
            reason: redirect.reason || 'Redirected duplicate',
        };
    }

    if (forceIndexSlugs.has(slug)) {
        return {
            robots: 'index, follow',
            canonicalUrl: `${SITE_URL}/blog/${slug}`,
            reason: 'Force-indexed in indexation policy',
        };
    }

    const matched = noindexPatterns.find((entry) => entry.regex.test(slug));
    if (matched) {
        return {
            robots: 'noindex, follow',
            canonicalUrl: `${SITE_URL}/blog/${slug}`,
            reason: matched.reason,
        };
    }

    return {
        robots: 'index, follow',
        canonicalUrl: `${SITE_URL}/blog/${slug}`,
        reason: 'Default indexable blog URL',
    };
}

function updateHtmlSignals(html, decision, currentUrl) {
    let next = html;

    next = replaceOrInsertHeadTag(
        next,
        /<meta\s+name=["']robots["']\s+content=["'][^"']*["']\s*\/?>/i,
        `<meta name="robots" content="${decision.robots}">`
    );

    next = replaceOrInsertHeadTag(
        next,
        /<link\s+rel=["']canonical["']\s+href=["'][^"']*["']\s*\/?>/i,
        `<link rel="canonical" href="${decision.canonicalUrl}">`
    );

    next = replaceOrInsertHeadTag(
        next,
        /<meta\s+property=["']og:url["']\s+content=["'][^"']*["']\s*\/?>/i,
        `<meta property="og:url" content="${decision.canonicalUrl}">`
    );

    if (currentUrl && currentUrl !== decision.canonicalUrl) {
        next = next.split(currentUrl).join(decision.canonicalUrl);
    }

    return next;
}

function applyToPost(filePath) {
    const slug = path.basename(filePath, '.html');
    const decision = getDecision(slug);
    const currentUrl = `${SITE_URL}/blog/${slug}`;
    const original = fs.readFileSync(filePath, 'utf8');
    const updated = updateHtmlSignals(original, decision, currentUrl);

    if (updated !== original) {
        fs.writeFileSync(filePath, updated, 'utf8');
        return decision.robots;
    }

    return null;
}

function applyToCategory(filePath) {
    const slug = path.basename(filePath, '.html');
    const robots = policy.blogCategoryArchivesRobots || 'noindex, follow';
    const canonicalUrl = `${SITE_URL}/blog/category/${slug}`;
    const original = fs.readFileSync(filePath, 'utf8');
    const updated = updateHtmlSignals(original, {
        robots,
        canonicalUrl,
        reason: 'Blog category archive',
    }, canonicalUrl);

    if (updated !== original) {
        fs.writeFileSync(filePath, updated, 'utf8');
        return robots;
    }

    return null;
}

const toolPolicy = (() => {
    const entry = policy.noindexToolSlugs;
    if (!entry) {
        return { slugs: [], robots: 'noindex, follow', minPerHub: 3 };
    }

    const slugs = Array.isArray(entry) ? entry : (entry.slugs || []);
    return {
        slugs,
        robots: (!Array.isArray(entry) && entry.robots) || 'noindex, follow',
        minPerHub: (!Array.isArray(entry) && entry.minIndexableToolsPerCategoryHub) || 3,
    };
})();

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Set a robots meta inside <head>. Tools HTML is a minified single-line
 * Next.js export, so this works on markup without line breaks.
 */
function setRobotsMeta(html, robots) {
    const tag = `<meta name="robots" content="${robots}">`;

    if (/<meta\s+name=["']robots["'][^>]*>/i.test(html)) {
        return html.replace(/<meta\s+name=["']robots["'][^>]*>/i, tag);
    }

    return html.replace(/<head(\s[^>]*)?>/i, (match) => `${match}${tag}`);
}

/**
 * Remove whole <a>...</a> listing cards that point at a given path.
 * Tool and category cards never nest another anchor, so the lazy match is safe.
 */
function removeLinksTo(html, hrefs) {
    let next = html;

    for (const href of hrefs) {
        const pattern = new RegExp(`<a\\b[^>]*href="${escapeRegExp(href)}"[^>]*>[\\s\\S]*?<\\/a>`, 'g');
        next = next.replace(pattern, '');
    }

    return next;
}

function updateCategoryCount(html, categorySlug, count) {
    const pattern = new RegExp(
        `(id="cat-${escapeRegExp(categorySlug)}"[^>]*>[^<]*<span[^>]*>)\\d+(<\\/span>)`
    );

    return html.replace(pattern, `$1${count}$2`);
}

function toolSlugsLinkedFrom(html, knownSlugs) {
    const found = new Set();
    const pattern = /href="\/tools\/([a-z0-9-]+)"/g;
    let match;

    while ((match = pattern.exec(html)) !== null) {
        if (knownSlugs.has(match[1])) {
            found.add(match[1]);
        }
    }

    return found;
}

function applyToTools() {
    if (!fs.existsSync(TOOLS_DIR) || toolPolicy.slugs.length === 0) {
        return;
    }

    const knownSlugs = new Set(
        fs.readdirSync(TOOLS_DIR, { withFileTypes: true })
            .filter((entry) => entry.isFile() && entry.name.endsWith('.html') && entry.name !== 'index.html')
            .map((entry) => path.basename(entry.name, '.html'))
    );

    const noindexSlugs = toolPolicy.slugs.filter((slug) => knownSlugs.has(slug));
    const missing = toolPolicy.slugs.filter((slug) => !knownSlugs.has(slug));
    if (missing.length > 0) {
        console.warn(`Indexation policy lists tool slugs with no HTML file: ${missing.join(', ')}`);
    }

    let taggedTools = 0;
    for (const slug of noindexSlugs) {
        const filePath = path.join(TOOLS_DIR, `${slug}.html`);
        const original = fs.readFileSync(filePath, 'utf8');
        const updated = setRobotsMeta(original, toolPolicy.robots);
        if (updated !== original) {
            fs.writeFileSync(filePath, updated, 'utf8');
        }
        taggedTools += 1;
    }

    const noindexSet = new Set(noindexSlugs);
    const removableToolHrefs = noindexSlugs.map((slug) => `/tools/${slug}`);
    const hubCounts = new Map();
    const noindexHubs = [];

    if (fs.existsSync(TOOL_CATEGORIES_DIR)) {
        for (const entry of fs.readdirSync(TOOL_CATEGORIES_DIR, { withFileTypes: true })) {
            if (!entry.isFile() || !entry.name.endsWith('.html')) continue;

            const categorySlug = path.basename(entry.name, '.html');
            const filePath = path.join(TOOL_CATEGORIES_DIR, entry.name);
            const original = fs.readFileSync(filePath, 'utf8');

            const linked = toolSlugsLinkedFrom(original, knownSlugs);
            const remaining = [...linked].filter((slug) => !noindexSet.has(slug));
            hubCounts.set(categorySlug, remaining.length);

            let updated = removeLinksTo(original, removableToolHrefs);
            updated = updateCategoryCount(updated, categorySlug, remaining.length);

            if (remaining.length < toolPolicy.minPerHub) {
                updated = setRobotsMeta(updated, toolPolicy.robots);
                noindexHubs.push(categorySlug);
            }

            if (updated !== original) {
                fs.writeFileSync(filePath, updated, 'utf8');
            }
        }
    }

    const indexPath = path.join(TOOLS_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
        const original = fs.readFileSync(indexPath, 'utf8');
        let updated = removeLinksTo(original, removableToolHrefs);
        updated = removeLinksTo(updated, noindexHubs.map((slug) => `/tools/categories/${slug}`));

        for (const [categorySlug, count] of hubCounts) {
            updated = updateCategoryCount(updated, categorySlug, count);
        }

        if (updated !== original) {
            fs.writeFileSync(indexPath, updated, 'utf8');
        }
    }

    console.log(`Tools indexation: ${taggedTools} calculator page(s) set to "${toolPolicy.robots}".`);
    console.log(
        noindexHubs.length > 0
            ? `Tool category hubs noindexed for thin coverage: ${noindexHubs.join(', ')}.`
            : 'All tool category hubs kept indexable.'
    );
}

function main() {
    if (!fs.existsSync(BLOG_DIR)) {
        console.log('Blog directory missing; no indexation policy applied.');
        return;
    }

    let updated = 0;
    let noindexed = 0;
    let indexable = 0;

    for (const entry of fs.readdirSync(BLOG_DIR, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith('.html') || entry.name === 'index.html') continue;

        const robots = applyToPost(path.join(BLOG_DIR, entry.name));
        if (robots) updated += 1;
        if (/noindex/i.test(getDecision(path.basename(entry.name, '.html')).robots)) {
            noindexed += 1;
        } else {
            indexable += 1;
        }
    }

    const categoryDir = path.join(BLOG_DIR, 'category');
    if (fs.existsSync(categoryDir)) {
        for (const entry of fs.readdirSync(categoryDir, { withFileTypes: true })) {
            if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
            const robots = applyToCategory(path.join(categoryDir, entry.name));
            if (robots) updated += 1;
            if (/noindex/i.test(robots || policy.blogCategoryArchivesRobots || '')) noindexed += 1;
        }
    }

    applyToTools();

    console.log(`Applied indexation policy to ${updated} HTML file(s).`);
    console.log(`Blog indexation target: ${indexable} indexable post(s), ${noindexed} noindex URL(s) including category archives.`);
}

main();
