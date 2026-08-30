'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { ingestAeoCsv } = require('../scripts/blogeo/lib/aeo-csv');
const { generateNearMiss } = require('../scripts/blogeo/lib/generate');
const { writePublishBlockedTicket, shouldBlockDirectPublish } = require('../scripts/blogeo/lib/pipeline-handoff');
const { writeJson } = require('../scripts/blogeo/lib/fs');
const { pickIsoWeek } = require('../scripts/blogeo/lib/opportunity');

test('ingestAeoCsv maps citation rows to catalog paths', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'blogeo-aeo-'));
    const dir = path.join(root, 'import');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'citations.csv'), 'url,engine,cited,query\nhttps://www.legacyinvestingshow.com/blog/augusta-rule,chatgpt,1,what is the augusta rule\n');
    const snapshot = ingestAeoCsv(dir, root);
    assert.equal(snapshot.rowCount, 1);
    assert.equal(snapshot.citedUrlCount, 1);
    assert.ok(snapshot.byPath['/blog/augusta-rule']);
});

test('generateNearMiss honors the weekly cap', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'blogeo-gen-'));
    const week = pickIsoWeek();
    writeJson(path.join(root, 'data', 'blogeo', 'gsc', 'latest.json'), {
        week,
        queries: [{ query: 'cost segregation study', impressions: 400, position: 12, clicks: 3 }],
    });
    writeJson(path.join(root, 'data', 'blogeo', 'keyword-ownership.json'), { ownership: {} });
    const first = generateNearMiss(root);
    assert.equal(first.count, 1);
    assert.equal(first.skipped, undefined);
    const second = generateNearMiss(root);
    assert.equal(second.skipped, true);
    assert.match(second.reason, /cap/i);
});

test('writePublishBlockedTicket stores a near-miss-draft suggestion', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'blogeo-pub-'));
    const draftPath = path.join(root, 'pipeline', 'runs', 'demo', '04-draft.md');
    fs.mkdirSync(path.dirname(draftPath), { recursive: true });
    fs.writeFileSync(draftPath, '---\ntitle: Draft\n---\n\nHello.\n');
    const ticket = writePublishBlockedTicket({
        draftPath,
        slug: 'draft',
        query: 'cost segregation study',
        reason: 'publish blocked',
    }, root);
    const saved = JSON.parse(fs.readFileSync(path.join(root, 'data', 'blogeo', 'suggestions', `${ticket.id}.json`), 'utf8'));
    assert.equal(saved.kind, 'near-miss-draft');
    assert.equal(saved.status, 'open');
    assert.match(saved.sourcePath, /04-draft\.md/);
});

test('generateNearMiss routes an owned query to an audit ticket without burning the cap', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'blogeo-owned-'));
    const week = pickIsoWeek();
    writeJson(path.join(root, 'data', 'blogeo', 'gsc', 'latest.json'), {
        week,
        queries: [{ query: 'cost segregation study', impressions: 400, position: 12, clicks: 3 }],
    });
    writeJson(path.join(root, 'data', 'blogeo', 'keyword-ownership.json'), {
        ownership: {
            'cost segregation': { canonical: '/tax-strategies/cost-segregation' },
        },
    });
    const owned = generateNearMiss(root, { query: 'cost segregation' });
    assert.equal(owned.count, 0);
    assert.equal(owned.owner, '/tax-strategies/cost-segregation');
    assert.equal(owned.tickets[0].kind, 'content-push');
    const after = generateNearMiss(root);
    assert.equal(after.count, 1);
    assert.notEqual(after.skipped, true);
});

test('generateNearMiss accepts a human-named unowned in-cluster query and burns the cap', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'blogeo-req-'));
    writeJson(path.join(root, 'data', 'blogeo', 'keyword-ownership.json'), { ownership: {} });
    const first = generateNearMiss(root, { query: 'cost segregation study' });
    assert.equal(first.count, 1);
    assert.equal(first.tickets[0].kind, 'near-miss-draft');
    const second = generateNearMiss(root, { query: 'bonus depreciation recapture' });
    assert.equal(second.skipped, true);
});

test('shouldBlockDirectPublish is on unless the emergency override is set', () => {
    const previous = process.env.BLOGEO_ALLOW_DIRECT_PUBLISH;
    delete process.env.BLOGEO_ALLOW_DIRECT_PUBLISH;
    assert.equal(shouldBlockDirectPublish(), true);
    process.env.BLOGEO_ALLOW_DIRECT_PUBLISH = '1';
    assert.equal(shouldBlockDirectPublish(), false);
    if (previous == null) delete process.env.BLOGEO_ALLOW_DIRECT_PUBLISH;
    else process.env.BLOGEO_ALLOW_DIRECT_PUBLISH = previous;
});
