'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { runGates } = require('../scripts/blogeo/lib/gates');

test('gates fail a draft with no Quick Take or FAQ', () => {
    const result = runGates({
        draft: {
            body: '# Hello\n\nNo structure here.',
            cluster: 'tax',
            persona: 'high-earner',
            faq: [],
            claims: [{ type: 'stat', sourceUrl: '', asOf: null }],
            targetQuery: 's corp election',
            intendedUrl: '/blog/new-s-corp-post',
        },
        ownership: {
            ownership: {
                's corp election': { canonical: '/tax-strategies/s-corp-strategy' },
            },
        },
        banned: ['guaranteed returns'],
    });
    assert.equal(result.ok, false);
    assert.ok(result.failures.some((item) => /Quick Take/i.test(item)));
    assert.ok(result.failures.some((item) => /FAQ/i.test(item)));
    assert.ok(result.failures.some((item) => /owned by/i.test(item)));
});

test('gates pass a structured draft with provenance', () => {
    const result = runGates({
        draft: {
            body: '## Quick Take\n\nS-corp elections are a salary math problem.\n',
            cluster: 'tax',
            persona: 'consultant',
            faq: [
                { q: 'When should I elect S-corp?', a: 'When payroll overhead is covered.' },
                { q: 'What is a reasonable salary?', a: 'What similar roles pay.' },
                { q: 'Does QBI still apply?', a: 'Often, with wage limits.' },
                { q: 'Do I need a CPA?', a: 'Yes for the election package.' },
            ],
            claims: [{ type: 'stat', sourceUrl: 'https://www.irs.gov/businesses/small-businesses-self-employed/s-corporations', asOf: '2026-01-01' }],
            targetQuery: 's corp reasonable salary',
            intendedUrl: '/blog/s-corp-reasonable-salary',
        },
        ownership: { ownership: {} },
        banned: ['guaranteed returns'],
    });
    assert.equal(result.ok, true);
    assert.deepEqual(result.failures, []);
});
