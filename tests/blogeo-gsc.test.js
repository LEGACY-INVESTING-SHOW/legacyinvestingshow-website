'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { ingestGscCsv } = require('../scripts/blogeo/lib/gsc');

test('ingestGscCsv reads GSC UI exports', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'blogeo-gsc-'));
    const dir = path.join(root, 'import');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'Filters.csv'), 'Filter,Value\nSearch type,Web\nDate,Last 3 months\n');
    fs.writeFileSync(path.join(dir, 'Pages.csv'), 'Top pages,Clicks,Impressions,CTR,Position\nhttps://www.legacyinvestingshow.com/,10,100,10%,3.2\n');
    fs.writeFileSync(path.join(dir, 'Queries.csv'), 'Top queries,Clicks,Impressions,CTR,Position\npreston seo,8,80,10%,2.1\n');
    fs.writeFileSync(path.join(dir, 'Chart.csv'), 'Date,Clicks,Impressions,CTR,Position\n2026-08-01,4,40,10%,3\n2026-08-02,6,60,10%,3\n');

    const snapshot = ingestGscCsv(dir, root);
    assert.equal(snapshot.pages.length, 1);
    assert.equal(snapshot.queries.length, 1);
    assert.equal(snapshot.sitewide.clicks, 10);
    assert.equal(snapshot.sitewide.impressions, 100);
    assert.equal(snapshot.windowNote, 'Last 3 months');
    assert.equal(snapshot.pages[0].path, '/');
});
