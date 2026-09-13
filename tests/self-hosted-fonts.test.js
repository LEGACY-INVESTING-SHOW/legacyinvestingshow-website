const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.join(__dirname, '..');

// Directories that are not part of the deployed public surface, or that the
// build never regenerates: old snapshots, the Eleventy workspace, scratch
// design files, and the unlisted course libraries (robots.txt Disallow, and
// AGENTS.md says site-wide SEO passes leave them alone).
const SKIP_DIRS = new Set([
    '.git',
    '.claude',
    '.vercel',
    'node_modules',
    'analysis',
    'backups',
    'cms',
    'docs',
    'lx',
    'plans',
    'screenshots',
    'todos',
]);

// Generated output that is not committed from a source branch, so a fresh
// checkout can still carry the pre-build copy. Its source template is scanned
// instead, which is what a regression would have to pass through.
const SKIP_FILES = new Set([
    path.join('tools', 'tax-structure-calculator.html'),
]);

function walkHtmlFiles(dir, files = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            if (!SKIP_DIRS.has(entry.name)) walkHtmlFiles(path.join(dir, entry.name), files);
            continue;
        }
        if (entry.isFile() && entry.name.endsWith('.html')) files.push(path.join(dir, entry.name));
    }
    return files;
}

test('no built HTML loads fonts from Google', () => {
    const offenders = [];

    for (const filePath of walkHtmlFiles(ROOT_DIR)) {
        const relativePath = path.relative(ROOT_DIR, filePath);
        if (SKIP_FILES.has(relativePath)) continue;

        const html = fs.readFileSync(filePath, 'utf8');
        if (/fonts\.(googleapis|gstatic)\.com/i.test(html)) {
            offenders.push(relativePath);
        }
    }

    assert.deepEqual(
        offenders,
        [],
        `These pages still reach out to Google Fonts. Self-host the family in assets/fonts/, ` +
            `add the @font-face rule to assets/css/fonts.css, and link that instead.`
    );
});

test('every face declared in fonts.css points at a file on disk', () => {
    const cssPath = path.join(ROOT_DIR, 'assets', 'css', 'fonts.css');
    const css = fs.readFileSync(cssPath, 'utf8');
    const urls = [...css.matchAll(/url\('(\/assets\/fonts\/[^']+)'\)/g)].map((match) => match[1]);

    assert.ok(urls.length > 0, 'fonts.css declares no faces');
    assert.doesNotMatch(css, /fonts\.(googleapis|gstatic)\.com/i);

    for (const url of urls) {
        const absPath = path.join(ROOT_DIR, url.replace(/^\//, ''));
        assert.ok(fs.existsSync(absPath), `fonts.css references a missing file: ${url}`);
    }

    assert.equal(
        urls.length,
        (css.match(/font-display:\s*swap/g) || []).length,
        'every @font-face in fonts.css must set font-display: swap'
    );
});
