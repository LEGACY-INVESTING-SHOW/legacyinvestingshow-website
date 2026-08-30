const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const ROOT = path.join(__dirname, '..');

const PAGES = [
    {
        dir: 'lx/wbp-26',
        url: '/lx/wbp-26',
        title: 'Legacy Wealth Blueprint',
        download: 'legacy-wealth-blueprint.md',
    },
    {
        dir: 'lx/str-rd',
        url: '/lx/str-rd',
        title: 'Airbnb Arbitrage Roadmap',
        download: 'airbnb-arbitrage-roadmap.md',
    },
];

const PUBLIC_SURFACES = [
    'index.html',
    'about.html',
    'success-stories.html',
    'llms.txt',
    'llms-full.txt',
    'sitemap.xml',
    'sitemap-pages.xml',
    'feed.xml',
];

test('unlisted course libraries exist with assets and downloadable markdown', () => {
    for (const page of PAGES) {
        const htmlPath = path.join(ROOT, page.dir, 'index.html');
        assert.ok(fs.existsSync(htmlPath), `${page.dir}/index.html missing`);
        assert.ok(
            fs.existsSync(path.join(ROOT, page.dir, 'assets', 'app.css')),
            `${page.dir} CSS missing`
        );
        assert.ok(
            fs.existsSync(path.join(ROOT, page.dir, 'assets', 'app.js')),
            `${page.dir} JS missing`
        );
        assert.ok(
            fs.existsSync(path.join(ROOT, page.dir, page.download)),
            `${page.download} missing`
        );
    }
});

test('unlisted course libraries are noindexed and canonicalized on the brand domain', () => {
    for (const page of PAGES) {
        const html = fs.readFileSync(path.join(ROOT, page.dir, 'index.html'), 'utf8');
        assert.match(html, /noindex, nofollow, noarchive/);
        assert.match(
            html,
            new RegExp(`rel="canonical" href="https://www\\.legacyinvestingshow\\.com${page.url}"`)
        );
        assert.match(html, new RegExp(`<base href="${page.url}/">`));
        assert.match(html, new RegExp(page.title));
        assert.match(html, /class="kb-root"/);
    }
});

test('unlisted course libraries are not linked from public SEO surfaces', () => {
    for (const file of PUBLIC_SURFACES) {
        const content = fs.readFileSync(path.join(ROOT, file), 'utf8');
        assert.doesNotMatch(content, /\/lx\/wbp-26/);
        assert.doesNotMatch(content, /\/lx\/str-rd/);
    }

    const robots = fs.readFileSync(path.join(ROOT, 'robots.txt'), 'utf8');
    assert.match(robots, /Disallow: \/lx\//);
});
