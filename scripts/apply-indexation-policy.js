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

    console.log(`Applied indexation policy to ${updated} HTML file(s).`);
    console.log(`Blog indexation target: ${indexable} indexable post(s), ${noindexed} noindex URL(s) including category archives.`);
}

if (require.main === module) {
    main();
}

module.exports = {
    readPolicy,
    getDecision,
};
