'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const catalog = require('../data/calculators/operator-catalog.json');
const models = require('../assets/js/operator-calculator-models');
const vercel = require('../vercel.json');

function close(actual, expected, label) {
    const delta = Math.abs(actual - expected);
    assert.ok(delta < 0.02, `${label || 'value'} ${actual} != ${expected}`);
}

function hrefToFile(href) {
    const clean = href.replace(/\/$/, '');
    return path.join(ROOT, `${clean.slice(1)}.html`);
}

test('operator catalog stays at or under the 25-tool cap', () => {
    assert.ok(Array.isArray(catalog.tools));
    assert.equal(catalog.tools.length, 25);
    const slugs = catalog.tools.map((tool) => tool.slug);
    assert.equal(new Set(slugs).size, slugs.length);
});

test('every catalog slug has a model and three examples', () => {
    for (const tool of catalog.tools) {
        assert.ok(models.slugs.includes(tool.slug), `missing model for ${tool.slug}`);
        assert.equal(tool.examples.length, 3, tool.slug);
        assert.ok(tool.inputs.length >= 2, tool.slug);
        assert.ok(tool.faqs.length >= 3, tool.slug);
        const defaults = Object.fromEntries(tool.inputs.map((input) => [input.id, input.default]));
        const result = models.compute(tool.slug, defaults);
        assert.ok(result.headline && result.headline.label, tool.slug);
        assert.notEqual(result.headline.value, undefined, tool.slug);
    }
});

test('cap rate, FIRE, Rule of 72, and DSCR match round-number formulas', () => {
    close(models.compute('cap-rate', { noi: 24000, price: 400000 }).headline.value, 6, 'cap rate');
    close(
        models.compute('fire-number', { annualSpend: 80000, swr: 4, currentPortfolio: 220000 }).headline.value,
        2000000,
        'FIRE'
    );
    close(models.compute('rule-of-72', { rate: 8, startingAmount: 10000 }).headline.value, 9, 'rule of 72');
    const dscr = models.compute('dscr', { noi: 36000, loan: 320000, rate: 6.75, years: 30 });
    const annualDebt = models.payment(320000, 6.75, 30) * 12;
    close(dscr.headline.value, 36000 / annualDebt, 'DSCR');
    assert.ok(dscr.headline.value > 1.2, `expected DSCR above 1.20, got ${dscr.headline.value}`);
});

test('S corp vs sole prop isolates 2026 payroll-tax savings', () => {
    const result = models.compute('scorp-vs-sole-prop', { profit: 180000, salary: 90000 });
    const se = models.selfEmploymentTax(180000);
    close(se.seBase, 180000 * 0.9235, 'SE base');
    close(result.headline.value, se.total - (90000 * 0.124 + 90000 * 0.029), 'S corp savings');
    assert.ok(result.headline.value > 10000);
    assert.throws(
        () => models.compute('scorp-vs-sole-prop', { profit: 90000, salary: 100000 }),
        /cannot exceed profit/
    );
});

test('bonus, QBI, 1031, and credit utilization screens use the documented math', () => {
    close(
        models.compute('bonus-depreciation-estimate', {
            qualifyingBasis: 80000,
            bonusPercent: 100,
            taxRate: 37
        }).headline.value,
        29600,
        'bonus savings'
    );
    close(
        models.compute('qbi-deduction-estimate', {
            qbi: 140000,
            taxableIncome: 180000,
            w2Wages: 0,
            applyWageLimit: 0
        }).headline.value,
        28000,
        'QBI under threshold'
    );
    close(
        models.compute('qbi-deduction-estimate', {
            qbi: 220000,
            taxableIncome: 280000,
            w2Wages: 60000,
            applyWageLimit: 1
        }).headline.value,
        30000,
        'QBI wage limit'
    );
    close(
        models.compute('1031-exchange-deferred-gain', {
            salePrice: 650000,
            sellingCosts: 39000,
            adjustedBasis: 280000,
            replacementPrice: 700000,
            cashBoot: 0
        }).headline.value,
        331000,
        '1031 deferred'
    );
    close(
        models.compute('credit-utilization', { balances: 8200, limits: 24000 }).headline.value,
        8200 / 24000 * 100,
        'utilization'
    );
});

test('related links resolve to real pages and avoid vercel redirect sources', () => {
    const redirectSources = new Set(
        (vercel.redirects || []).map((rule) => String(rule.source).replace(/\/$/, ''))
    );
    const missing = [];
    const redirected = [];
    for (const tool of catalog.tools) {
        const own = `/tools/${tool.slug}`;
        if (redirectSources.has(own)) redirected.push(own);
        for (const related of tool.related) {
            const href = related.href.replace(/\/$/, '');
            if (redirectSources.has(href)) redirected.push(`${tool.slug} -> ${href}`);
            const filePath = hrefToFile(href);
            if (!fs.existsSync(filePath)) missing.push(`${tool.slug} -> ${href}`);
        }
    }
    assert.deepEqual(redirected, [], `redirected: ${redirected.join(', ')}`);
    assert.deepEqual(missing, [], `missing files: ${missing.join(', ')}`);
});

test('generated operator pages exist with canonical URLs, a form, and live results', () => {
    for (const tool of catalog.tools) {
        const filePath = path.join(ROOT, 'tools', `${tool.slug}.html`);
        assert.ok(fs.existsSync(filePath), `missing ${tool.slug}.html`);
        const html = fs.readFileSync(filePath, 'utf8');
        assert.ok(html.includes(`rel="canonical" href="https://www.legacyinvestingshow.com/tools/${tool.slug}"`));
        assert.ok(html.includes('id="operator-form"'));
        assert.ok(html.includes('id="operator-result"'));
        assert.ok(html.includes('/assets/js/operator-calculator-models.js'));
        assert.ok(html.includes(`<h1 class="text-[28px] font-semibold tracking-tight text-ink sm:text-[32px]">${tool.title}</h1>`));
        assert.ok(!html.includes('{{'));
    }
    const embed = fs.readFileSync(path.join(ROOT, 'assets', 'js', 'operator-catalog-embed.js'), 'utf8');
    assert.ok(embed.includes('No calculators match'));
    assert.ok(embed.includes('catalog-heading'));
    assert.ok(embed.includes('cap-rate'));
    assert.ok(embed.includes('replace(/\\/+$/'), 'embed path regex must keep its backslashes');
    const index = fs.readFileSync(path.join(ROOT, 'tools', 'index.html'), 'utf8');
    assert.ok(index.includes('id="operator-calculators"'));
    assert.ok(index.includes('operator-catalog-embed.js'));
    assert.ok(index.includes('/tools/cap-rate'));
    assert.ok(index.includes('/tools/cost-segregation-savings'));
    const headingAt = index.indexOf('id="catalog-heading"');
    const operatorAt = index.indexOf('id="operator-calculators"');
    const reactListAt = index.indexOf('class="space-y-10"');
    assert.ok(headingAt !== -1 && operatorAt > headingAt);
    assert.ok(reactListAt !== -1 && operatorAt > reactListAt);
});
