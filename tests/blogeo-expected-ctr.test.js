'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { expectedCtr } = require('../scripts/blogeo/lib/expected-ctr');

test('expectedCtr matches the essay curve', () => {
    assert.equal(expectedCtr(0), 0);
    assert.equal(expectedCtr(1), 0.28);
    assert.equal(expectedCtr(2), 0.15);
    assert.equal(expectedCtr(3), 0.10);
    assert.equal(expectedCtr(5), 0.06);
    assert.equal(expectedCtr(7), 0.04);
    assert.equal(expectedCtr(10), 0.025);
    assert.equal(expectedCtr(16), 0.01);
});
