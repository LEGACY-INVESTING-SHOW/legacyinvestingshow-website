'use strict';

const BRANDED_PATTERNS = [
    /preston\s*seo/i,
    /legacy investing show/i,
    /legacyinvestingshow/i,
    /legacy wealth blueprint/i,
];

const IN_CLUSTER_PATTERNS = [
    /tax|irs|s[- ]?corp|llc|qbi|hsa|401k|ira|roth|depreciat|1031|augusta|cost seg/i,
    /renters? insurance|airbnb|arbitrage|mortgage|loan|debt|retirement|payroll|w-?2|1099/i,
    /capital gains|opportunity zone|installment|solo 401|backdoor|heloc|insurance/i,
];

function isBrandedQuery(query) {
    return BRANDED_PATTERNS.some((pattern) => pattern.test(query || ''));
}

function isInClusterQuery(query) {
    return IN_CLUSTER_PATTERNS.some((pattern) => pattern.test(query || ''));
}

function normalizeQuery(query) {
    return String(query || '')
        .toLowerCase()
        .replace(/['’]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

module.exports = { BRANDED_PATTERNS, isBrandedQuery, isInClusterQuery, normalizeQuery };
