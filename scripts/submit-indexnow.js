#!/usr/bin/env node

/**
 * Pings IndexNow with the URLs of the /reviews proof layer, so Bing, Yandex,
 * Seznam and Naver see a change within minutes instead of on their own crawl
 * schedule. Google does not take IndexNow; for Google use Search Console, and
 * scripts/SEO-SUBMISSION.md says how.
 *
 * Set INDEXNOW_KEY to a key of 8 to 128 hexadecimal characters, invented once
 * and never changed. IndexNow verifies ownership by fetching
 * https://www.legacyinvestingshow.com/<key>.txt and reading the key back out
 * of it, so the key file has to be deployed before the ping is believed.
 * With INDEXNOW_KEY set, this script writes that file into the repo root if it
 * is missing; without it, the script prints what to do and exits.
 *
 * Usage:
 *   INDEXNOW_KEY=<key> node scripts/submit-indexnow.js
 *   INDEXNOW_KEY=<key> node scripts/submit-indexnow.js --dry-run   # print, send nothing
 *   npm run seo:indexnow
 *
 * This was written in a sandbox with no route to api.indexnow.org, so it has
 * never been run against the live endpoint. Run it once with --dry-run first.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE_URL = process.env.SITE_URL || 'https://www.legacyinvestingshow.com';
const HOST = new URL(SITE_URL).host;
const ENDPOINT = 'https://api.indexnow.org/indexnow';

/* The proof layer: the page, its plain-text mirror, the three sitemaps and
   every post that links into it. */
const PATHS = [
    '/reviews',
    '/llms/reviews.txt',
    '/sitemap.xml',
    '/sitemap-video.xml',
    '/sitemap-images.xml',
    '/blog/stephanie-dailey-legacy-wealth-blueprint-case-study',
    '/blog/albert-legacy-wealth-blueprint-case-study',
    '/blog/abigail-legacy-wealth-blueprint-case-study',
    '/blog/shawn-legacy-wealth-blueprint-roi-case-study',
    '/blog/preston-seo-review',
];

function urlList() {
    return PATHS.map((entry) => SITE_URL + entry);
}

/**
 * IndexNow keys are 8 to 128 characters of [0-9a-zA-Z-].
 * @param {string} key
 * @returns {boolean}
 */
function isValidKey(key) {
    return /^[0-9a-zA-Z-]{8,128}$/.test(String(key || ''));
}

/**
 * Write <key>.txt at the repo root if it is not already there. The file holds
 * the key and nothing else.
 * @param {string} key
 * @returns {{file: string, created: boolean}}
 */
function ensureKeyFile(key) {
    const file = path.join(ROOT, `${key}.txt`);
    if (fs.existsSync(file)) return { file, created: false };
    fs.writeFileSync(file, `${key}\n`, 'utf8');
    return { file, created: true };
}

function instructions() {
    return [
        'INDEXNOW_KEY is not set, so nothing was submitted.',
        '',
        'To set this up once:',
        '  1. Invent a key of 8 to 128 characters from [0-9a-zA-Z-]. A UUID with the',
        '     dashes left in is fine. Keep it: changing it costs you the verification.',
        '  2. INDEXNOW_KEY=<key> node scripts/submit-indexnow.js',
        '     That writes <key>.txt at the repo root, holding the key and nothing else.',
        `  3. Commit and deploy, then open ${SITE_URL}/<key>.txt and check it returns the key.`,
        '  4. Run the same command again to send the ping.',
        '',
        `URLs that would be submitted (${PATHS.length}):`,
    ].concat(urlList().map((url) => `  ${url}`)).join('\n');
}

async function submit(key) {
    const body = {
        host: HOST,
        key,
        keyLocation: `${SITE_URL}/${key}.txt`,
        urlList: urlList(),
    };

    const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            Accept: 'application/json',
        },
        body: JSON.stringify(body),
    });

    const text = await response.text();
    return { status: response.status, body: text.trim() };
}

async function main() {
    const dryRun = process.argv.slice(2).includes('--dry-run');
    const key = process.env.INDEXNOW_KEY || '';

    if (!key) {
        console.log(instructions());
        return;
    }

    if (!isValidKey(key)) {
        console.error('submit-indexnow: INDEXNOW_KEY must be 8 to 128 characters of [0-9a-zA-Z-].');
        process.exit(1);
        return;
    }

    const keyFile = ensureKeyFile(key);
    console.log(
        keyFile.created
            ? `submit-indexnow: wrote ${path.relative(ROOT, keyFile.file)}. Commit and deploy it before the ping is trusted.`
            : `submit-indexnow: ${path.relative(ROOT, keyFile.file)} is already in the repo.`
    );

    if (dryRun) {
        console.log(`submit-indexnow: --dry-run, would POST ${PATHS.length} URLs to ${ENDPOINT}:`);
        for (const url of urlList()) console.log(`  ${url}`);
        return;
    }

    try {
        const result = await submit(key);
        // 200 accepted, 202 accepted but the key file has not been read yet.
        if (result.status === 200 || result.status === 202) {
            console.log(`submit-indexnow: ${result.status}, ${PATHS.length} URLs submitted.`);
            if (result.status === 202) {
                console.log(`  202 means the key file at ${SITE_URL}/${key}.txt has not been verified yet.`);
            }
            return;
        }
        console.error(`submit-indexnow: HTTP ${result.status} ${result.body}`);
        process.exit(1);
    } catch (error) {
        console.error(`submit-indexnow: ${error.message}`);
        process.exit(1);
    }
}

if (require.main === module) main();

module.exports = { urlList, isValidKey, ensureKeyFile, PATHS };
