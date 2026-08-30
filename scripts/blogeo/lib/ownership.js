'use strict';

const path = require('path');
const { ROOT_DIR } = require('./paths');
const { writeJson, readJson } = require('./fs');
const { normalizeQuery } = require('./queries');
const { slugToTitleHint } = require('./urls');

const BRANDED = [
    'preston seo',
    'preston seo reviews',
    'is preston seo legit',
    'who is preston seo',
    'legacy investing show',
    'the legacy investing show',
    'legacy investing show reviews',
    'legacyinvestingshow',
    'legacy wealth blueprint',
    'preston seo legacy wealth blueprint',
];

function addOwner(map, query, canonical, supporting = []) {
    const key = normalizeQuery(query);
    if (!key || !canonical) return;
    if (!map[key]) map[key] = { canonical, supporting: [] };
    if (canonical !== map[key].canonical && !map[key].supporting.includes(canonical)) {
        map[key].supporting.push(canonical);
    }
    for (const url of supporting) {
        if (url && url !== map[key].canonical && !map[key].supporting.includes(url)) {
            map[key].supporting.push(url);
        }
    }
}

function seedKeywordOwnership(catalog, extra = {}, root = ROOT_DIR) {
    const ownership = {};
    addOwner(ownership, 'preston seo', '/blog/preston-seo-review', ['/']);
    addOwner(ownership, 'legacy investing show', '/', ['/blog/legacy-investing-show-review', '/about']);
    addOwner(ownership, 'cost segregation', '/tax-strategies/cost-segregation', ['/tools/cost-segregation-payback-calculator']);
    addOwner(ownership, 'cost segregation calculator', '/tools/cost-segregation-payback-calculator', ['/tax-strategies/cost-segregation']);
    addOwner(ownership, 'augusta rule', '/tax-strategies/augusta-rule', [
        '/tools/augusta-rule-meeting-log-and-rent-calculator',
        '/compare/augusta-rule-vs-home-office-deduction-s-corp',
    ]);
    addOwner(ownership, 's corp election', '/tax-strategies/s-corp-strategy', [
        '/blog/s-corp-election-break-even-guide',
        '/worksheets/s-corp-election-decision-worksheet',
    ]);
    addOwner(ownership, 'qbi deduction', '/tax-strategies/qualified-business-income-deduction', ['/worksheets/qbi-deduction-worksheet']);
    addOwner(ownership, 'short term rental loophole', '/tax-strategies/short-term-rental-loophole', []);
    addOwner(ownership, 'renters insurance cost', '/tools/renters-insurance-cost', ['/blog/how-much-is-renters-insurance-cost-guide']);
    addOwner(ownership, 'how much is renters insurance', '/blog/how-much-is-renters-insurance-cost-guide', ['/tools/renters-insurance-cost']);
    addOwner(ownership, '401k rollover', '/blog/401k-rollover-guide', []);
    addOwner(ownership, 'tax planning software', '/blog/best-tax-planning-software-for-cpas', []);
    addOwner(ownership, 'bonus depreciation', '/tax-strategies/bonus-depreciation', []);
    addOwner(ownership, '1031 exchange', '/tax-strategies/1031-exchange', []);
    addOwner(ownership, 'real estate professional status', '/tax-strategies/real-estate-professional-status', [
        '/tools/real-estate-professional-status-hours-tracker',
    ]);
    addOwner(ownership, 'backdoor roth', '/tax-strategies/backdoor-roth-ira', []);
    addOwner(ownership, 'hsa strategy', '/tax-strategies/hsa-strategy', []);
    addOwner(ownership, 'solo 401k', '/tax-strategies/solo-401k', []);
    addOwner(ownership, 'tax loss harvesting', '/tax-strategies/tax-loss-harvesting', ['/worksheets/tax-loss-harvesting-worksheet']);
    addOwner(ownership, 'airbnb arbitrage', '/topics/airbnb-arbitrage', []);

    const tax = readJson(path.join(root, 'data', 'tax-strategies.json'), { strategies: [] });
    for (const strategy of tax.strategies || []) {
        const canonical = `/tax-strategies/${strategy.slug}`;
        addOwner(ownership, slugToTitleHint(strategy.slug), canonical);
        addOwner(ownership, strategy.title, canonical);
        for (const keyword of strategy.keywords || []) addOwner(ownership, keyword, canonical);
    }

    const tools = readJson(path.join(root, 'data', 'tools.json'), { tools: [] });
    for (const tool of tools.tools || []) {
        addOwner(ownership, slugToTitleHint(tool.slug), `/tools/${tool.slug}`);
        addOwner(ownership, tool.title, `/tools/${tool.slug}`);
    }

    const worksheets = readJson(path.join(root, 'data', 'worksheets.json'), { worksheets: [] });
    for (const worksheet of worksheets.worksheets || []) {
        addOwner(ownership, slugToTitleHint(worksheet.slug), `/worksheets/${worksheet.slug}`);
        addOwner(ownership, worksheet.title, `/worksheets/${worksheet.slug}`);
    }

    const compareSlugs = extra.compareSlugs || (catalog.pages || [])
        .filter((page) => page.pageType === 'compare')
        .map((page) => page.slug);
    for (const slug of compareSlugs) addOwner(ownership, slugToTitleHint(slug), `/compare/${slug}`);

    for (const slug of extra.forceIndexSlugs || []) {
        const page = (catalog.pages || []).find((item) => item.slug === slug && item.pageType === 'blog');
        const canonical = `/blog/${slug}`;
        addOwner(ownership, slugToTitleHint(slug), canonical);
        if (page && page.primaryKeyword) addOwner(ownership, page.primaryKeyword, canonical);
        if (page && page.title) addOwner(ownership, page.title, canonical);
    }

    const payload = {
        generatedAt: new Date().toISOString(),
        brandedQueries: BRANDED,
        ownership,
        notes: 'One canonical URL per head query. Tool + companion article is an intentional cluster.',
    };
    writeJson(path.join(root, 'data', 'blogeo', 'keyword-ownership.json'), payload);
    return payload;
}

function loadOwnership(root = ROOT_DIR) {
    return readJson(path.join(root, 'data', 'blogeo', 'keyword-ownership.json'), {
        brandedQueries: BRANDED,
        ownership: {},
    });
}

function findOwner(query, ownershipDoc) {
    const doc = ownershipDoc || loadOwnership();
    return (doc.ownership || {})[normalizeQuery(query)] || null;
}

module.exports = { seedKeywordOwnership, loadOwnership, findOwner, BRANDED };
