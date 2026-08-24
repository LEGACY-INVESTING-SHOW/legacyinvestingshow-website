'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { opportunity, IMPRESSION_FLOOR } = require('../scripts/blogeo/lib/opportunity');

test('low-impression URLs are not opportunities', () => {
    const result = opportunity({ clicks: 0, impressions: 40, position: 8 });
    assert.equal(result.lowVisibility, true);
    assert.equal(result.score, 0);
    assert.equal(result.lever, 'none');
    assert.ok(IMPRESSION_FLOOR === 150);
});

test('CTR headroom ranks title work', () => {
    const result = opportunity({ clicks: 10, impressions: 1000, position: 3 });
    assert.equal(result.lever, 'ctr');
    assert.ok(result.ctrHeadroom > 0);
    assert.ok(result.score > 0);
});

test('rank headroom applies below page one', () => {
    const result = opportunity({ clicks: 171, impressions: 8599, position: 16.32 });
    assert.equal(result.lever, 'rank');
    assert.ok(result.rankHeadroom > 100);
});

test('real traffic drops beat estimates', () => {
    const result = opportunity(
        { clicks: 10, impressions: 400, position: 8 },
        { clicks: 80 }
    );
    assert.equal(result.realDrop, true);
    assert.equal(result.lever, 'recover');
    assert.ok(result.score > 1e6);
});
