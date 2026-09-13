'use strict';

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const BANNED_PUBLIC_SUBSTRINGS = [
    '/programmatic-pages',
    'Programmatic Pages',
    'programmatic_hub',
    'programmatic_city',
    'programmatic_persona',
    'programmatic_comparison',
    'programmatic_renters',
];

const PUBLIC_TEXT_SURFACES = [
    'llms.txt',
    'llms-full.txt',
    'robots.txt',
    'sitemap.xml',
    'sitemap-pages.xml',
    'feed.xml',
];

const PUBLIC_HTML_ROOTS = [
    'renters-insurance',
    'markets',
    'compare',
    'tax-strategies',
    'topics',
    'blog',
    'tools',
];

const SKIP_DIR_NAMES = new Set([
    '.git',
    'node_modules',
    'backups',
    'analysis',
    'cms',
    'scripts',
    'templates',
    'docs',
    'plans',
    'pipeline',
]);

function walkHtml(dir, files = []) {
    if (!fs.existsSync(dir)) {
        return files;
    }
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (SKIP_DIR_NAMES.has(entry.name)) {
            continue;
        }
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walkHtml(fullPath, files);
        } else if (entry.isFile() && entry.name.endsWith('.html')) {
            files.push(fullPath);
        }
    }
    return files;
}

function collectFailures() {
    const failures = [];

    const leftoverDir = path.join(ROOT_DIR, 'programmatic-pages');
    if (fs.existsSync(leftoverDir)) {
        failures.push('programmatic-pages/ still exists as a public directory');
    }

    for (const relative of PUBLIC_TEXT_SURFACES) {
        const filePath = path.join(ROOT_DIR, relative);
        if (!fs.existsSync(filePath)) {
            failures.push(`missing SEO surface: ${relative}`);
            continue;
        }
        const content = fs.readFileSync(filePath, 'utf8');
        for (const banned of BANNED_PUBLIC_SUBSTRINGS) {
            if (content.includes(banned)) {
                failures.push(`${relative} still contains ${banned}`);
            }
        }
    }

    const htmlFiles = PUBLIC_HTML_ROOTS.flatMap((dirName) => (
        walkHtml(path.join(ROOT_DIR, dirName))
    ));
    htmlFiles.push(path.join(ROOT_DIR, 'index.html'));

    for (const filePath of htmlFiles) {
        if (!fs.existsSync(filePath)) {
            continue;
        }
        const content = fs.readFileSync(filePath, 'utf8');
        const robots = /name=["']robots["'][^>]*content=["']([^"']+)/i.exec(content);
        if (robots && /noindex/i.test(robots[1])) {
            continue;
        }
        for (const banned of BANNED_PUBLIC_SUBSTRINGS) {
            if (content.includes(banned)) {
                failures.push(`${path.relative(ROOT_DIR, filePath)} still contains ${banned}`);
            }
        }
    }

    const kentucky = path.join(ROOT_DIR, 'renters-insurance', 'kentucky.html');
    if (!fs.existsSync(kentucky)) {
        failures.push('renters-insurance/kentucky.html is missing');
    } else {
        const html = fs.readFileSync(kentucky, 'utf8');
        if (!html.includes('canonical" href="https://www.legacyinvestingshow.com/renters-insurance/kentucky"')) {
            failures.push('Kentucky canonical is not /renters-insurance/kentucky');
        }
        if (!/Louisville/i.test(html)) {
            failures.push('Kentucky page has no Louisville-specific copy');
        }
        if (!html.includes('FAQPage')) {
            failures.push('Kentucky page is missing FAQPage schema');
        }
    }

    const austin = path.join(ROOT_DIR, 'markets', 'austin-tx.html');
    if (!fs.existsSync(austin)) {
        failures.push('markets/austin-tx.html is missing');
    } else {
        const html = fs.readFileSync(austin, 'utf8');
        if (html.includes('Programmatic Pages')) {
            failures.push('Austin market page still uses a Programmatic Pages breadcrumb');
        }
        if (!html.includes('canonical" href="https://www.legacyinvestingshow.com/markets/austin-tx"')) {
            failures.push('Austin canonical is not /markets/austin-tx');
        }
    }

    const sitemapPages = fs.readFileSync(path.join(ROOT_DIR, 'sitemap-pages.xml'), 'utf8');
    if (!sitemapPages.includes('https://www.legacyinvestingshow.com/renters-insurance/kentucky')) {
        failures.push('sitemap-pages.xml is missing the Kentucky URL');
    }
    if (!sitemapPages.includes('https://www.legacyinvestingshow.com/markets/austin-tx')) {
        failures.push('sitemap-pages.xml is missing the Austin URL');
    }

    const llms = fs.readFileSync(path.join(ROOT_DIR, 'llms.txt'), 'utf8');
    if (!llms.includes('https://www.legacyinvestingshow.com/renters-insurance/kentucky')) {
        failures.push('llms.txt is missing the Kentucky URL');
    }
    if (!llms.includes('https://www.legacyinvestingshow.com/markets/austin-tx')) {
        failures.push('llms.txt is missing the Austin URL');
    }

    return failures;
}

function main() {
    const failures = collectFailures();
    if (failures.length > 0) {
        console.error(failures.map((line) => `- ${line}`).join('\n'));
        process.exit(1);
    }
    console.log('Public URL hygiene check passed.');
}

module.exports = { collectFailures };

if (require.main === module) {
    main();
}
