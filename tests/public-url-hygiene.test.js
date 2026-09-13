const test = require('node:test');
const assert = require('node:assert/strict');
const {
    personaPath,
    comparisonPath,
    siteUrl,
} = require('../scripts/lib/public-urls');
const { collectFailures } = require('../scripts/check-public-url-hygiene');

test('public URL helpers hide generation internals', () => {
    assert.equal(personaPath('airbnb-hosts'), '/tax-strategies/for/airbnb-hosts');
    assert.equal(personaPath('small-business-owners'), '/tax-strategies/for/business-owners');
    assert.equal(personaPath('retirement-savers'), '/retirement/traditional-vs-roth-401k');
    assert.equal(comparisonPath('cost-segregation-vs-bonus-depreciation'), '/compare/cost-segregation-vs-bonus-depreciation');
    assert.equal(
        siteUrl(comparisonPath('s-corp-vs-qbi-deduction')),
        'https://www.legacyinvestingshow.com/compare/s-corp-vs-qbi-deduction'
    );
});

test('indexable SEO surfaces do not advertise programmatic-pages', () => {
    const failures = collectFailures();
    assert.deepEqual(failures, []);
});
