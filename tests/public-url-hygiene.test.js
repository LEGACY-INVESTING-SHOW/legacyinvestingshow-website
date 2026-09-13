const test = require('node:test');
const assert = require('node:assert/strict');
const {
    rentersInsurancePath,
    marketPath,
    personaPath,
    comparisonPath,
    siteUrl,
} = require('../scripts/lib/public-urls');
const { collectFailures } = require('../scripts/check-public-url-hygiene');

test('public URL helpers hide generation internals', () => {
    assert.equal(rentersInsurancePath(), '/renters-insurance');
    assert.equal(rentersInsurancePath('kentucky'), '/renters-insurance/kentucky');
    assert.equal(marketPath('austin-tx'), '/markets/austin-tx');
    assert.equal(personaPath('airbnb-hosts'), '/tax-strategies/for/airbnb-hosts');
    assert.equal(personaPath('small-business-owners'), '/tax-strategies/for/business-owners');
    assert.equal(personaPath('retirement-savers'), '/retirement/traditional-vs-roth-401k');
    assert.equal(comparisonPath('cost-segregation-vs-bonus-depreciation'), '/compare/cost-segregation-vs-bonus-depreciation');
    assert.equal(
        siteUrl(rentersInsurancePath('kentucky')),
        'https://www.legacyinvestingshow.com/renters-insurance/kentucky'
    );
});

test('indexable SEO surfaces do not advertise programmatic-pages', () => {
    const failures = collectFailures();
    assert.deepEqual(failures, []);
});
