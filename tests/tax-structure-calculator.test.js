const test = require('node:test');
const assert = require('node:assert/strict');
const { calculate } = require('../assets/js/tax-structure-model');
const tables = require('../data/calculators/tax-structure.json');
function model(amount = 150000, status = 'single', overrides = {}) {
    return calculate({ amount, status, rental: { ...tables.rental, preset: 'brief', ...overrides } }, tables);
}
function close(actual, expected) { assert.ok(Math.abs(actual - expected) < 0.001, `${actual} != ${expected}`); }
test('2026 single reproduces all three original carousel targets', () => {
    const r = model();
    close(r.wages.incomeTax, 24734);
    close(r.wages.total, 36209);
    close(r.gains.total, 12667.5);
    close(r.rental.taxableRental, -44590.90909090909);
    close(r.rental.cashBeforeTax, 44500);
    assert.equal(r.rental.total, 0);
});
test('updated carousel counts 60000 total depreciation, not an additional 60000', () => {
    const r = model(150000, 'single', { preset: 'updated' });
    close(r.rental.standardDepreciation + r.rental.accelerated, 60000);
    close(r.rental.taxableRental, -15500);
});
test('joint filing uses joint ordinary and capital gain brackets', () => {
    const r = model(150000, 'joint');
    close(r.wages.total, 26815);
    close(r.gains.total, 2835);
});
test('SS stops at per-worker cap; Medicare continues and surtaxes use gross income', () => {
    const single = model(300000);
    close(single.wages.socialSecurity, 184500 * 0.062);
    close(single.wages.medicare, 4350);
    close(single.wages.additionalMedicare, 900);
    close(single.gains.niit, 3800);
    const joint = model(300000, 'joint');
    close(joint.wages.additionalMedicare, 450);
    close(joint.gains.niit, 1900);
});
test('zero and bracket boundaries do not create negative taxes or NaN', () => {
    for (const status of ['single', 'joint']) {
        for (const amount of [0, 1, tables.standardDeduction[status], 184500, tables.niitThreshold[status]]) {
            const r = model(amount, status);
            assert.ok(Number.isFinite(r.wages.total) && r.wages.total >= 0);
            assert.ok(Number.isFinite(r.gains.total) && r.gains.total >= 0);
            assert.ok(r.rental.total >= 0);
        }
        close(model(tables.standardDeduction[status] + tables.capitalGainsThresholds[status][0], status).gains.capitalGainsTax, 0);
        close(model(tables.standardDeduction[status] + tables.capitalGainsThresholds[status][1] + 100, status).gains.capitalGainsTax,
            (tables.capitalGainsThresholds[status][1] - tables.capitalGainsThresholds[status][0]) * 0.15 + 20);
    }
});
test('custom rental changes affect rental only and rental profit can incur income tax and NIIT', () => {
    const r = model(300000, 'single', { preset: 'custom', expensePercent: 0, propertyValue: 0, accelerated: 0 });
    close(r.rental.taxableRental, 300000);
    close(r.rental.niit, 3800);
    close(r.rental.incomeTax, r.wages.incomeTax);
});
test('invalid amounts and depreciation beyond basis are rejected', () => {
    for (const amount of [-1, NaN, Infinity, 100000001]) assert.throws(() => model(amount));
    assert.throws(() => model(150000, 'invalid'));
    assert.throws(() => model(150000, 'single', { expensePercent: 101 }));
    assert.throws(() => model(150000, 'single', { propertyValue: 1000 }));
    assert.throws(() => model(150000, 'single', { landPercent: -1 }));
});
test('split mode matches the sole-income paths at 100% and stacks gains on wages otherwise', () => {
    const { calculateSplit } = require('../assets/js/tax-structure-model');
    const rental = { ...tables.rental, preset: 'brief' };
    const only = (wages, gains, rentalShare) => calculateSplit({ amount: 150000, status: 'single', rental, split: { wages, gains, rental: rentalShare } }, tables);
    close(only(100, 0, 0).total, 36209);
    close(only(0, 100, 0).total, 12667.5);
    close(only(0, 0, 100).rental.taxableRental, -44590.90909090909);
    close(only(0, 0, 100).total, 0);
    const mixed = only(50, 50, 0);
    close(mixed.wages.incomeTax, 7670);
    close(mixed.gains.capitalGainsTax, 75000 * 0.15);
    assert.ok(mixed.total < only(100, 0, 0).total);
    assert.throws(() => only(50, 30, 10), /add up to 100/);
});
