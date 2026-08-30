'use strict';

const path = require('path');
const { ROOT_DIR } = require('./paths');
const { readJson } = require('./fs');
const { normalizePath } = require('./urls');

function loadRedirectMap(root = ROOT_DIR) {
    const map = new Map();
    const vercel = readJson(path.join(root, 'vercel.json'), { redirects: [] });
    for (const entry of vercel.redirects || []) {
        if (!entry.source || !entry.destination) continue;
        if (entry.source.includes('(') || entry.source.includes(':') || entry.source.includes('*')) continue;
        map.set(normalizePath(entry.source), normalizePath(entry.destination));
    }
    const policy = readJson(path.join(root, 'data', 'indexation-policy.json'), {});
    for (const entry of policy.blogRedirects || []) {
        if (entry.source && entry.destination) {
            map.set(normalizePath(entry.source), normalizePath(entry.destination));
        }
    }
    return map;
}

function resolveRedirect(pathname, map) {
    let current = normalizePath(pathname);
    const seen = new Set();
    while (map.has(current) && !seen.has(current)) {
        seen.add(current);
        current = map.get(current);
    }
    return current;
}

module.exports = { loadRedirectMap, resolveRedirect };
