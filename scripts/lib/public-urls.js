'use strict';

const SITE_ORIGIN = 'https://www.legacyinvestingshow.com';

const PERSONA_MIGRATIONS = {
    'small-business-owners': '/tax-strategies/for/business-owners',
    'retirement-savers': '/retirement/traditional-vs-roth-401k',
};

function siteUrl(pathname) {
    const raw = String(pathname || '/');
    const withSlash = raw.startsWith('/') ? raw : `/${raw}`;
    const cleaned = withSlash.replace(/\/+$/, '');
    if (!cleaned) {
        return `${SITE_ORIGIN}/`;
    }
    return `${SITE_ORIGIN}${cleaned}`;
}

function rentersInsurancePath(stateSlug) {
    if (!stateSlug) {
        return '/renters-insurance';
    }
    return `/renters-insurance/${stateSlug}`;
}

function marketPath(citySlug) {
    if (!citySlug) {
        return '/markets';
    }
    return `/markets/${citySlug}`;
}

function personaPath(slug) {
    if (PERSONA_MIGRATIONS[slug]) {
        return PERSONA_MIGRATIONS[slug];
    }
    return `/tax-strategies/for/${slug}`;
}

function comparisonPath(slug) {
    return `/compare/${slug}`;
}

module.exports = {
    SITE_ORIGIN,
    PERSONA_MIGRATIONS,
    siteUrl,
    rentersInsurancePath,
    marketPath,
    personaPath,
    comparisonPath,
};
