'use strict';

const { getDecision, readPolicy } = require('../../apply-indexation-policy');

function getBlogIndexation(slug) {
    const decision = getDecision(slug);
    return {
        indexable: !/noindex/i.test(decision.robots || ''),
        robots: decision.robots,
        canonicalUrl: decision.canonicalUrl,
        reason: decision.reason,
    };
}

module.exports = { readPolicy, getDecision, getBlogIndexation };
