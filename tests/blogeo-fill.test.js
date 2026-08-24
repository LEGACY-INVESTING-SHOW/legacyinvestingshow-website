'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { fillWindows } = require('../scripts/blogeo/lib/fill');
const { writeJson } = require('../scripts/blogeo/lib/fs');

test('fillWindows writes 28-day points for edits and generated posts', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'blogeo-fill-'));
    writeJson(path.join(root, 'data', 'blogeo', 'gsc', 'latest.json'), {
        windowNote: 'Last 28 days',
        sitewide: { clicks: 10, impressions: 100, ctr: 0.1, position: 8, endDate: '2026-08-24' },
        pages: [{ path: '/blog/demo', clicks: 4, impressions: 40, position: 7, ctr: 0.1 }],
    });
    writeJson(path.join(root, 'data', 'blogeo', 'edits', 'be-old.json'), {
        id: 'be-old',
        path: '/blog/demo',
        appliedAt: '2026-07-20T00:00:00.000Z',
    });
    writeJson(path.join(root, 'data', 'blogeo', 'generated-posts', '2026-W30.json'), {
        week: '2026-W30',
        path: '/blog/demo',
        enrolledAt: '2026-07-20T00:00:00.000Z',
    });
    const result = fillWindows(root);
    assert.ok(result.filled >= 1);
    const edit = JSON.parse(fs.readFileSync(path.join(root, 'data', 'blogeo', 'edits', 'be-old.json'), 'utf8'));
    assert.equal(edit.gsc28d.clicks, 4);
    const post = JSON.parse(fs.readFileSync(path.join(root, 'data', 'blogeo', 'generated-posts', '2026-W30.json'), 'utf8'));
    assert.equal(post.gsc28d.clicks, 4);
});
