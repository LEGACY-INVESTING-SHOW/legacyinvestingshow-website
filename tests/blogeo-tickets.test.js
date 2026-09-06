'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { uniqueTitleYearSwap, buildAuditTickets } = require('../scripts/blogeo/lib/tickets');

test('uniqueTitleYearSwap only fires when 2025 appears once in the title file', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'blogeo-tickets-'));
    const sourcePath = 'content/blog/year.md';
    fs.mkdirSync(path.join(root, 'content', 'blog'), { recursive: true });
    fs.writeFileSync(path.join(root, sourcePath), '---\ntitle: 2025 Cost Segregation Guide\ndescription: A planning overview.\n---\n\nBody without another year token.\n');
    const swap = uniqueTitleYearSwap({ sourcePath }, root);
    assert.equal(swap.phraseFrom, '2025');
    assert.equal(swap.phraseTo, '2026');
});

test('buildAuditTickets emits phrase-swap for a unique stale title year', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'blogeo-tickets-'));
    const sourcePath = 'content/blog/year.md';
    fs.mkdirSync(path.join(root, 'content', 'blog'), { recursive: true });
    fs.writeFileSync(path.join(root, sourcePath), '---\ntitle: 2025 Cost Segregation Guide\ndescription: A planning overview.\n---\n\nBody without another year token.\n');
    const tickets = buildAuditTickets([{
        path: '/blog/year',
        url: 'https://www.legacyinvestingshow.com/blog/year',
        sourcePath,
        title: '2025 Cost Segregation Guide',
        description: 'A planning overview.',
        indexable: true,
        sitelinkSuspect: false,
        primaryKeyword: 'cost segregation',
        opportunity: { lever: 'none', score: 0, expectedCtr: 0 },
        gsc: { clicks: 0, impressions: 0, position: 0, ctr: 0 },
    }], [{
        type: 'staleTaxYear',
        path: '/blog/year',
        sourcePath,
        detail: 'Visible 2025 in title',
        autoApply: false,
    }], { week: '2026-W35', sitewide: { clicks: 1 } }, root);
    assert.ok(tickets.some((ticket) => ticket.kind === 'phrase-swap' && ticket.phraseFrom === '2025'));
});
