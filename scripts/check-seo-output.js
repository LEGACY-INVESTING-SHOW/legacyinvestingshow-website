#!/usr/bin/env node

/**
 * A quick check over what the SEO build writes, so a broken sitemap or a
 * malformed JSON-LD block is caught before a deploy rather than in Search
 * Console a week later.
 *
 * It checks three things and nothing else:
 *   1. Every <script type="application/ld+json"> on the named pages parses.
 *   2. Every URL in every sitemap is absolute and https.
 *   3. Every URL on this site's own host resolves to a file on disk.
 *
 * Run with: node scripts/check-seo-output.js
 * Exits 1 on the first set of problems, listing them all.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE_URL = process.env.SITE_URL || 'https://www.legacyinvestingshow.com';

const PAGES = ['reviews.html', 'index.html', 'about.html', 'about/preston-seo.html'];
const SITEMAPS = [
    'sitemap.xml',
    'sitemap-pages.xml',
    'sitemap-blog.xml',
    'sitemap-video.xml',
    'sitemap-images.xml',
];

/**
 * The file a clean URL is served from, if any.
 * @param {string} url
 * @returns {boolean}
 */
function resolvesOnDisk(url) {
    const relative = url.slice(SITE_URL.length).replace(/^\/+/, '').replace(/\/+$/, '');
    const candidates = relative
        ? [relative, `${relative}.html`, path.join(relative, 'index.html')]
        : ['index.html'];
    return candidates.some((candidate) => fs.existsSync(path.join(ROOT, candidate)));
}

function checkJsonLd(problems) {
    let blocks = 0;
    for (const page of PAGES) {
        const file = path.join(ROOT, page);
        if (!fs.existsSync(file)) continue;
        const html = fs.readFileSync(file, 'utf8');
        const found = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
        for (const match of found) {
            blocks += 1;
            try {
                JSON.parse(match[1]);
            } catch (error) {
                problems.push(`${page}: a JSON-LD block does not parse: ${error.message}`);
            }
        }
    }
    return blocks;
}

function checkSitemaps(problems) {
    let urls = 0;
    for (const sitemap of SITEMAPS) {
        const file = path.join(ROOT, sitemap);
        if (!fs.existsSync(file)) {
            problems.push(`${sitemap} is missing`);
            continue;
        }
        const xml = fs.readFileSync(file, 'utf8');
        const found = [...xml.matchAll(/<(?:loc|image:loc|video:thumbnail_loc|video:player_loc)>([^<]+)<\/(?:loc|image:loc|video:thumbnail_loc|video:player_loc)>/g)]
            .map((match) => match[1].trim());

        for (const url of found) {
            urls += 1;
            if (!/^https:\/\//.test(url)) {
                problems.push(`${sitemap}: not an absolute https URL: ${url}`);
                continue;
            }
            // Player and thumbnail URLs point at YouTube and Vimeo on purpose.
            if (!url.startsWith(`${SITE_URL}/`)) continue;
            if (!resolvesOnDisk(url)) {
                problems.push(`${sitemap}: nothing on disk serves ${url}`);
            }
        }
    }
    return urls;
}

function run() {
    const problems = [];
    const blocks = checkJsonLd(problems);
    const urls = checkSitemaps(problems);
    return { problems, blocks, urls };
}

function main() {
    const result = run();
    console.log(`check-seo-output: ${result.blocks} JSON-LD block(s), ${result.urls} sitemap URL(s).`);
    if (result.problems.length) {
        for (const problem of result.problems) console.error(`  ${problem}`);
        console.error(`check-seo-output: ${result.problems.length} problem(s).`);
        process.exit(1);
        return;
    }
    console.log('check-seo-output: all clear.');
}

if (require.main === module) main();

module.exports = { run, resolvesOnDisk };
