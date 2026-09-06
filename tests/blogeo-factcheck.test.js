'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { factCheckPage, factCheckTopPages, loadSourcePack } = require('../scripts/blogeo/lib/factcheck');
const { listedOnBlogIndex, hideFromBlogIndex } = require('../scripts/blogeo/lib/listing');

test('factCheckPage flags stale tax year and banned terms', () => {
    const pack = {
        taxYear: { taxYear: 2026, staleTokens: ['2025 tax year'] },
        banned: { terms: ['guaranteed returns'] },
    };
    const flags = factCheckPage({
        indexable: true,
        path: '/blog/demo',
        title: '2025 Guide',
        description: 'A 2025 tax year overview',
        body: 'This strategy offers guaranteed returns.',
    }, pack);
    assert.ok(flags.some((flag) => flag.type === 'staleTaxYear'));
    assert.ok(flags.some((flag) => flag.type === 'bannedTerm'));
});

test('factCheckTopPages checks top 15 plus a 3-page buffer', () => {
    const pack = { taxYear: { taxYear: 2026, staleTokens: [] }, banned: { terms: [] } };
    const pages = [];
    for (let i = 0; i < 20; i += 1) {
        pages.push({
            indexable: true,
            path: `/blog/p${i}`,
            title: `Post ${i}`,
            description: 'desc',
            body: 'body',
            opportunity: { score: 20 - i },
            gsc: { impressions: 1000 - i },
        });
    }
    const result = factCheckTopPages(pages, pack);
    assert.equal(result.checkedCount, 18);
    assert.ok(result.checked.includes('/blog/p0'));
});

test('loadSourcePack reads repo source pack', () => {
    const pack = loadSourcePack();
    assert.equal(pack.taxYear.taxYear, 2026);
    assert.ok(Array.isArray(pack.banned.terms));
});

test('hideFromBlogIndex keeps sitemap pages off the listing', () => {
    assert.equal(hideFromBlogIndex({ hideFromBlogIndex: true }), true);
    assert.equal(listedOnBlogIndex({ hideFromBlogIndex: true }), false);
    assert.equal(listedOnBlogIndex({}), true);
});
