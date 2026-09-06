'use strict';

function titleCaseQuery(query) {
    return String(query || '')
        .trim()
        .split(/\s+/)
        .map((word) => (word.length <= 3 && /^(vs|for|and|the|a|an|of|to)$/i.test(word)
            ? word.toLowerCase()
            : word.charAt(0).toUpperCase() + word.slice(1)))
        .join(' ');
}

function proposeTitle(page, headQuery) {
    const query = String(headQuery || page.primaryKeyword || '').trim();
    if (!query) return null;
    const base = titleCaseQuery(query);
    const current = String(page.title || '');
    if (current.toLowerCase().includes(query.toLowerCase())) return null;
    const next = `${base} | Legacy Investing Show`;
    if (next.length > 70) return `${base}`;
    return next;
}

function proposeDescription(page, headQuery) {
    const query = String(headQuery || page.primaryKeyword || '').trim();
    const current = String(page.description || '');
    if (!query) return null;
    if (current.toLowerCase().includes(query.toLowerCase()) && current.length >= 120 && current.length <= 165) {
        return null;
    }
    const drafted = `${titleCaseQuery(query)}: the numbers, the IRS rules, and the decision that actually changes your tax bill. Not advice — verify with a CPA.`;
    return drafted.slice(0, 160);
}

module.exports = { proposeTitle, proposeDescription, titleCaseQuery };
