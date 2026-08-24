'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { saveSuggestion, applyEdit, skipTicket } = require('../scripts/blogeo/lib/apply-edit');
const { sha256 } = require('../scripts/blogeo/lib/hash');

function makeRoot() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'blogeo-'));
    fs.mkdirSync(path.join(root, 'content', 'blog'), { recursive: true });
    return root;
}

test('applyEdit patches a unique title and refuses a stale hash', () => {
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
