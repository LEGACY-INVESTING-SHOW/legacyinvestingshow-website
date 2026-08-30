'use strict';

const { SITE_URL } = require('./paths');

function stripTrailingSlash(pathname) {
    if (!pathname || pathname === '/') return '/';
    return pathname.replace(/\/+$/, '');
}

function normalizePath(input) {
    if (!input) return '/';
    let raw = String(input).trim();
    if (/^https?:\/\//i.test(raw)) {
        try {
            raw = new URL(raw).pathname;
        } catch {
            raw = raw.replace(/^https?:\/\/[^/]+/i, '');
        }
    }
    raw = raw.split('?')[0].split('#')[0];
    if (!raw.startsWith('/')) raw = `/${raw}`;
    raw = raw.replace(/\/index\.html$/i, '');
    raw = raw.replace(/\.html$/i, '');
    return stripTrailingSlash(raw);
}

function toAbsUrl(pathname, siteUrl = SITE_URL) {
    const pathName = normalizePath(pathname);
    if (pathName === '/') return `${siteUrl}/`;
    return `${siteUrl}${pathName}`;
}

function pathToId(pageType, pathname) {
    const clean = normalizePath(pathname).replace(/^\//, '') || 'home';
    return `${pageType}:${clean.replace(/\//g, ':')}`;
}

function slugToTitleHint(slug) {
    return String(slug || '')
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

module.exports = { normalizePath, toAbsUrl, pathToId, slugToTitleHint, stripTrailingSlash };
