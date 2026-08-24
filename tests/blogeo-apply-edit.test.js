'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { saveSuggestion, applyEdit, skipTicket, COOLDOWN_DAYS } = require('../scripts/blogeo/lib/apply-edit');
const { sha256 } = require('../scripts/blogeo/lib/hash');
const { writeJson } = require('../scripts/blogeo/lib/fs');

function makeRoot() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'blogeo-'));
    fs.mkdirSync(path.join(root, 'content', 'blog'), { recursive: true });
    return root;
}

test('applyEdit patches a unique title and refuses a stale hash before cooldown', () => {
    const root = makeRoot();
    const sourcePath = 'content/blog/demo.md';
    const abs = path.join(root, sourcePath);
    const original = `---\ntitle: Old Title\ndescription: Old description that is long enough to keep.\n---\n\nBody copy stays.\n`;
    fs.writeFileSync(abs, original);

    saveSuggestion({
        id: 'be-test-001',
        status: 'open',
        kind: 'seo-fields',
        sourcePath,
        beforeTitle: 'Old Title',
        afterTitle: 'New Title For CTR',
        contentHash: sha256(original),
    }, root);

    const edit = applyEdit('be-test-001', 'test', root);
    const updated = fs.readFileSync(abs, 'utf8');
    assert.equal(edit.status, 'applied');
    assert.match(updated, /New Title For CTR/);
    assert.match(updated, /Body copy stays/);
    assert.equal(COOLDOWN_DAYS, 28);

    saveSuggestion({
        id: 'be-test-002',
        status: 'open',
        kind: 'seo-fields',
        sourcePath,
        afterTitle: 'Should Not Apply',
        contentHash: 'deadbeef',
    }, root);
    assert.throws(() => applyEdit('be-test-002', 'test', root), /source changed|refusing/i);
});

test('applyEdit refuses a non-unique phrase swap', () => {
    const root = makeRoot();
    const sourcePath = 'content/blog/dup.md';
    const original = `---\ntitle: Dup\ndescription: desc\n---\n\nfoo foo\n`;
    fs.writeFileSync(path.join(root, sourcePath), original);
    saveSuggestion({
        id: 'be-test-003',
        status: 'open',
        kind: 'phrase-swap',
        sourcePath,
        phraseFrom: 'foo',
        phraseTo: 'bar',
        contentHash: sha256(original),
    }, root);
    assert.throws(() => applyEdit('be-test-003', 'test', root), /not unique/i);
});

test('skipTicket locks the id', () => {
    const root = makeRoot();
    saveSuggestion({ id: 'be-test-004', status: 'open', kind: 'seo-fields', sourcePath: 'x.md' }, root);
    const skipped = skipTicket('be-test-004', 'test', root);
    assert.equal(skipped.status, 'skipped');
    assert.throws(() => skipTicket('be-test-004', 'test', root), /already/i);
});

test('applyEdit refuses cannibalization against keyword ownership', () => {
    const root = makeRoot();
    const sourcePath = 'content/blog/other.md';
    const original = `---\ntitle: Other\ndescription: desc\n---\n\nBody.\n`;
    fs.writeFileSync(path.join(root, sourcePath), original);
    writeJson(path.join(root, 'data', 'blogeo', 'keyword-ownership.json'), {
        ownership: {
            'cost segregation': { canonical: '/tax-strategies/cost-segregation', supporting: [] },
        },
    });
    saveSuggestion({
        id: 'be-test-005',
        status: 'open',
        kind: 'seo-fields',
        sourcePath,
        path: '/blog/other',
        targetQuery: 'cost segregation',
        afterTitle: 'Cost Segregation Guide',
        contentHash: sha256(original),
    }, root);
    assert.throws(() => applyEdit('be-test-005', 'test', root), /owned by|cannibal/i);
});

test('applyEdit refuses tools HTML as source of truth', () => {
    const root = makeRoot();
    saveSuggestion({
        id: 'be-test-tools',
        status: 'open',
        kind: 'seo-fields',
        sourcePath: 'tools/renters-insurance-cost.html',
        afterTitle: 'Nope',
    }, root);
    assert.throws(
        () => applyEdit('be-test-tools', 'test', root),
        /tools\/\*\.html|calcs2|source of truth/i
    );
});

test('applyEdit enforces 28-day cooldown when the hash still matches', () => {
    const root = makeRoot();
    const sourcePath = 'content/blog/cool.md';
    const abs = path.join(root, sourcePath);
    const original = `---\ntitle: Cool\ndescription: desc\n---\n\nBody.\n`;
    fs.writeFileSync(abs, original);
    saveSuggestion({
        id: 'be-test-006',
        status: 'open',
        kind: 'seo-fields',
        sourcePath,
        afterTitle: 'Cooler Title',
        contentHash: sha256(original),
    }, root);
    applyEdit('be-test-006', 'test', root);
    const next = fs.readFileSync(abs, 'utf8');
    saveSuggestion({
        id: 'be-test-007',
        status: 'open',
        kind: 'seo-fields',
        sourcePath,
        afterTitle: 'Too Soon',
        contentHash: sha256(next),
    }, root);
    assert.throws(() => applyEdit('be-test-007', 'test', root), /cooldown/i);
});
