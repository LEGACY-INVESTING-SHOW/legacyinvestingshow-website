'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildBaselineMarkdown } = require('../scripts/blogeo/lib/report');

test('buildBaselineMarkdown includes AEO citations without throwing', () => {
    const markdown = buildBaselineMarkdown({
        catalog: { pageCount: 10, indexableCount: 8, noindexCount: 2 },
        snapshot: {
            week: '2026-W35',
            windowNote: 'Last 28 days',
            sitewide: {
                clicks: 100,
                impressions: 1000,
                ctr: 0.1,
                position: 8,
                startDate: '2026-07-27',
                endDate: '2026-08-23',
            },
            queries: [],
        },
        power: {
            top1Share: 0.5,
            top5Share: 0.9,
            top14Share: 1,
            urlsWithClicks: 3,
            topUrls: [],
        },
        scored: [],
        flags: [{ type: 'descriptionLength' }],
        queries: [],
        ownership: { ownership: {} },
        aeo: { rowCount: 4, citedUrlCount: 2 },
    });
    assert.match(markdown, /AEO citations/i);
    assert.match(markdown, /Cited URLs: \*\*2\*\*/);
});

test('buildBaselineMarkdown always includes an AEO stub when no CSV is loaded', () => {
    const markdown = buildBaselineMarkdown({
        catalog: { pageCount: 1, indexableCount: 1, noindexCount: 0 },
        snapshot: { week: '2026-W35', windowNote: 'Last 28 days', sitewide: { clicks: 1, impressions: 10, ctr: 0.1, position: 4 } },
        power: { top1Share: 1, top5Share: 1, top14Share: 1, urlsWithClicks: 1, topUrls: [] },
        scored: [],
        flags: [],
        queries: [],
        ownership: { ownership: {} },
    });
    assert.match(markdown, /AEO citations/i);
    assert.match(markdown, /Cited URLs: \*\*0\*\*/);
});
