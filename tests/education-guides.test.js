'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const {
    loadEducationGuides,
    ALLOWED_TYPES,
} = require('../scripts/lib/load-education-guides');
const {
    renderEducationPage,
    buildSEOTitle,
    rich,
} = require('../scripts/lib/render-education-guide');

const EM_DASH = /\u2014/;
const STAR_GLYPH = /[★⭐]|aggregateRating|"@type":\s*"Review"/;
const PLACEHOLDER = /\b(TODO|TBD|FIXME|lorem ipsum|placeholder)\b/i;

function collectText(value, bag = []) {
    if (typeof value === 'string') {
        bag.push(value);
        return bag;
    }
    if (Array.isArray(value)) {
        value.forEach((item) => collectText(item, bag));
        return bag;
    }
    if (value && typeof value === 'object') {
        Object.values(value).forEach((item) => collectText(item, bag));
    }
    return bag;
}

function extractInternalHrefs(html) {
    return [...html.matchAll(/\shref="(\/[^"]*)"/g)].map((match) => match[1]);
}

function publicFileCandidates(pathname) {
    const clean = pathname.split('#')[0].split('?')[0];
    const rel = clean.replace(/^\//, '').replace(/\/+$/, '');
    if (!rel) {
        return [path.join(ROOT, 'index.html')];
    }
    return [
        path.join(ROOT, rel),
        path.join(ROOT, `${rel}.html`),
        path.join(ROOT, rel, 'index.html'),
    ];
}

const EDUCATION_SLUGS = new Set(
    JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'education-guides', 'index.json'), 'utf8')).slugs
);

test('education guide data loads with unique metadata and required types', () => {
    const { meta, pages } = loadEducationGuides();

    assert.equal(meta.author, 'Preston Seo');
    assert.match(meta.disclosure, /Legacy Wealth Blueprint/);
    assert.ok(pages.length >= 8 && pages.length <= 16, `expected 8-16 pages, got ${pages.length}`);

    const types = new Set(pages.map((page) => page.type));
    for (const required of ['alternatives', 'vs', 'best-for', 'review', 'checklist', 'decision']) {
        assert.ok(types.has(required), `missing page type ${required}`);
        assert.ok(ALLOWED_TYPES.has(required));
    }

    const titles = new Set();
    const descriptions = new Set();
    const h1s = new Set();
    const queries = new Set();

    for (const page of pages) {
        assert.ok(!titles.has(page.title), `duplicate title: ${page.title}`);
        assert.ok(!descriptions.has(page.description), `duplicate description: ${page.slug}`);
        assert.ok(!h1s.has(page.h1), `duplicate h1: ${page.h1}`);
        assert.ok(!queries.has(page.query), `duplicate query: ${page.query}`);
        titles.add(page.title);
        descriptions.add(page.description);
        h1s.add(page.h1);
        queries.add(page.query);

        assert.ok(page.answer.split(/\s+/).length >= 40, `thin opener on ${page.slug}`);
        assert.ok(page.description.length >= 110 && page.description.length <= 170, `meta length on ${page.slug}: ${page.description.length}`);
        assert.doesNotMatch(buildSEOTitle(page.title), / \| Legacy Investing Show \| /);

        const blob = collectText(page).join('\n');
        assert.doesNotMatch(blob, EM_DASH, `em dash in ${page.slug}`);
        assert.doesNotMatch(blob, STAR_GLYPH, `star or review schema copy in ${page.slug}`);
        assert.doesNotMatch(blob, PLACEHOLDER, `placeholder in ${page.slug}`);
        assert.doesNotMatch(blob, /\/lx\//, `unlisted course library linked from ${page.slug}`);

        page.costRows.forEach((row) => {
            assert.match(row.asOf, /^\d{4}-\d{2}-\d{2}$/, `bad asOf on ${page.slug} ${row.name}`);
        });
        page.sources.forEach((source) => {
            if (source.url) {
                assert.match(source.url, /^https?:\/\//, `bad source url on ${page.slug}`);
            }
        });
        page.related.forEach((item) => {
            assert.ok(item.href.startsWith('/') || item.href.startsWith('https://'), `bad related href on ${page.slug}`);
        });
        assert.ok(!page.cta.primaryHref.includes('/lx/'));
        assert.ok(!page.cta.secondaryHref.includes('/lx/'));
    }

    assert.ok(pages.some((page) => page.slug === 'biggerpockets-alternatives'));
    assert.ok(pages.some((page) => page.slug === 'subto-alternatives'));
    assert.ok(pages.some((page) => page.slug === 'best-wealth-education-high-earners'));
    assert.ok(pages.some((page) => page.slug === 'wealth-plan-checklist-high-earners'));
    assert.ok(pages.some((page) => page.slug === 'money-guy-foo-vs-ramsey-baby-steps'));
    assert.ok(pages.some((page) => page.slug === 'wealthability-alternatives'));
    assert.ok(pages.some((page) => page.slug === 'legacy-wealth-blueprint-cost'));
    assert.ok(pages.some((page) => page.slug === 'anderson-platinum-vs-tax-course'));
});

test('education guide HTML carries Article schema, not Review schema', () => {
    const { meta, pages } = loadEducationGuides();

    for (const page of pages) {
        const html = renderEducationPage(page, meta);
        assert.match(
            html,
            new RegExp(`<link rel="canonical" href="https://www\\.legacyinvestingshow\\.com/compare/${page.slug}">`)
        );
        assert.match(html, /<meta name="description"/);
        assert.match(html, /application\/ld\+json/);
        assert.match(html, /"@type":"Article"/);
        assert.match(html, /"@type":"BreadcrumbList"/);
        assert.doesNotMatch(html, /"@type":"Review"/);
        assert.doesNotMatch(html, /aggregateRating/);
        assert.doesNotMatch(html, EM_DASH);
        assert.match(html, /class="guide-byline"/);
        assert.match(html, /Who wrote this/);
        assert.match(html, new RegExp(page.h1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        assert.match(html, /class="opener__lede"/);
        assert.match(html, /table-inset/);
        assert.match(html, /id="cost"/);
        assert.match(html, /id="questions-before-buying"/);
        assert.match(html, /id="sources"/);

        if (page.faqs.length) {
            assert.match(html, /"@type":"FAQPage"/);
        } else {
            assert.doesNotMatch(html, /"@type":"FAQPage"/);
        }

        const hrefs = extractInternalHrefs(html);
        assert.ok(hrefs.includes('/compare'), `${page.slug} should link the hub`);
        for (const href of hrefs) {
            assert.doesNotMatch(href, /\/lx\//);
            const pathname = href.split('#')[0];
            if (pathname.startsWith('/compare/')) {
                const slug = pathname.replace('/compare/', '');
                if (EDUCATION_SLUGS.has(slug)) continue;
                const exists = publicFileCandidates(pathname).some((candidate) => fs.existsSync(candidate));
                assert.ok(exists, `broken compare link on ${page.slug}: ${href}`);
                continue;
            }
            const exists = publicFileCandidates(pathname).some((candidate) => fs.existsSync(candidate));
            assert.ok(exists, `broken internal link on ${page.slug}: ${href}`);
        }
    }
});

test('rich text turns markdown links into safe anchors', () => {
    const html = rich('See [Tax strategies](/tax-strategies) and [IRS](https://www.irs.gov).');
    assert.match(html, /href="\/tax-strategies"/);
    assert.match(html, /href="https:\/\/www\.irs\.gov" rel="noopener noreferrer" target="_blank"/);
    assert.equal(rich('<script>'), '&lt;script&gt;');
});

test('persona pages point at matching education compare guides', () => {
    const checks = [
        ['tax-strategies/for/w2-employees.html', '/compare/401k-vs-rental-property'],
        ['tax-strategies/for/w2-employees.html', '/compare/money-guy-foo-vs-ramsey-baby-steps'],
        ['tax-strategies/for/high-income-earners.html', '/compare/best-wealth-education-high-earners'],
        ['tax-strategies/for/high-income-earners.html', '/compare/legacy-wealth-blueprint-cost'],
        ['tax-strategies/for/real-estate-investors.html', '/compare/biggerpockets-alternatives'],
        ['tax-strategies/for/real-estate-investors.html', '/compare/anderson-platinum-vs-tax-course'],
        ['tax-strategies/for/airbnb-hosts.html', '/compare/short-term-rental-vs-long-term-rental'],
    ];
    for (const [rel, href] of checks) {
        const html = fs.readFileSync(path.join(ROOT, rel), 'utf8');
        assert.match(html, new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${rel} missing ${href}`);
        assert.doesNotMatch(html, /\/lx\//);
    }
});

test('generated education pages and hub are on disk after a compare build', () => {
    const { pages } = loadEducationGuides();
    for (const page of pages) {
        const filePath = path.join(ROOT, 'compare', `${page.slug}.html`);
        assert.ok(fs.existsSync(filePath), `missing ${filePath}. Run npm run build:compare`);
        const html = fs.readFileSync(filePath, 'utf8');
        assert.match(html, /data-page-type="education_compare"/);
        assert.doesNotMatch(html, /"@type":"Review"/);
    }

    const hub = fs.readFileSync(path.join(ROOT, 'compare', 'index.html'), 'utf8');
    assert.match(hub, /id="education-guides"/);
    assert.match(hub, /id="the-guides"/);
    assert.match(hub, /biggerpockets-alternatives/);
    assert.match(hub, /subto-alternatives/);
    assert.match(hub, /cost-segregation-vs-bonus-depreciation/);
    assert.match(hub, /"@type":"CollectionPage"/);
    assert.doesNotMatch(hub, /\/lx\//);

    const itemUrls = [...hub.matchAll(/"url":"https:\/\/www\.legacyinvestingshow\.com\/compare\/([^"]+)"/g)]
        .map((match) => match[1]);
    for (const page of pages) {
        assert.ok(itemUrls.includes(page.slug), `hub schema missing ${page.slug}`);
    }
});
