'use strict';

function checkProvenance(blocks = []) {
    const failures = [];
    const advisories = [];
    blocks.forEach((block, index) => {
        if (!block || !['stat', 'tax-figure', 'formula'].includes(block.type)) return;
        if (!block.sourceUrl || !/^https?:\/\//i.test(block.sourceUrl)) failures.push(`claim ${index} has no sourceUrl`);
        if (!block.asOf) advisories.push(`claim ${index} has no asOf date`);
    });
    return { failures, advisories };
}

function runGates({ draft, ownership, banned = [] }) {
    const failures = [];
    const advisories = [];
    const body = String(draft.body || '');
    const lower = body.toLowerCase();
    for (const term of banned) {
        if (term && lower.includes(String(term).toLowerCase())) failures.push(`banned term: ${term}`);
    }
    if (!draft.cluster || !draft.persona) failures.push('missing cluster or persona');
    if (!/^## Quick Take/m.test(body)) failures.push('missing Quick Take');
    if (!Array.isArray(draft.faq) || draft.faq.length < 4) failures.push('FAQ < 4');
    const prov = checkProvenance(draft.claims || []);
    failures.push(...prov.failures);
    advisories.push(...prov.advisories);
    const target = String(draft.targetQuery || '').toLowerCase().trim();
    const owner = ownership && (ownership[target] || (ownership.ownership && ownership.ownership[target]));
    if (owner && owner.canonical && draft.intendedUrl && owner.canonical !== draft.intendedUrl) {
        failures.push(`query owned by ${owner.canonical}; send to audit`);
    }
    return { ok: failures.length === 0, failures, advisories };
}

module.exports = { checkProvenance, runGates };
