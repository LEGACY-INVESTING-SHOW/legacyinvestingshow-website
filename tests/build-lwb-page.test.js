const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { renderPage } = require('../scripts/build-lwb-page');
const data = require('../data/lwb-success-stories.json');
const template = fs.readFileSync(
    path.join(__dirname, '../templates/legacy-wealth-blueprint.html'),
    'utf8',
);

test('retains all successstories videos once and replaces the duplicated Shawn upload', () => {
    const html = renderPage(template, data);
    const ids = [...html.matchAll(/data-vimeo-id="(\d+)"/g)].map(
        (match) => match[1],
    );
    assert.equal(ids.length, new Set(ids).size);
    for (const id of [
        '1207907513',
        '1207906800',
        '1124934002',
        '1210332705',
        '1177459394',
        '1124930953',
        '1124933172',
    ])
        assert.ok(ids.includes(id), id);
    assert.ok(!ids.includes('1124930840'));
    assert.ok(!html.includes('{{'));
});

test('rejects duplicate or malformed video IDs before producing a page', () => {
    const duplicate = structuredClone(data);
    duplicate.interviews.push(duplicate.interviews[0]);
    assert.throws(() => renderPage(template, duplicate), /Duplicate/);
    const malformed = structuredClone(data);
    malformed.hero.id = 'invalid';
    assert.throws(() => renderPage(template, malformed), /Invalid/);
});
