'use strict';

/**
 * One place for the brand's entity graph.
 *
 * Every renderer that writes Organization or Person JSON-LD reads from here,
 * so the whole site points at the same two `@id` values:
 *
 *   Organization  https://www.legacyinvestingshow.com/#organization
 *   Person        https://www.legacyinvestingshow.com/about/preston-seo#person
 *
 * Only profile URLs that were opened and confirmed live belong in `sameAs`.
 * A guessed handle is worse than no handle, because search engines use these
 * links to decide which accounts are the same entity.
 */

const SITE_ORIGIN = 'https://www.legacyinvestingshow.com';

const ORGANIZATION_ID = `${SITE_ORIGIN}/#organization`;
const PERSON_PAGE_URL = `${SITE_ORIGIN}/about/preston-seo`;
const PERSON_ID = `${PERSON_PAGE_URL}#person`;
const ABOUT_URL = `${SITE_ORIGIN}/about`;

const LOGO = {
    '@type': 'ImageObject',
    url: `${SITE_ORIGIN}/assets/images/logo.png`,
    width: 2836,
    height: 1290,
};

const PERSON_IMAGE = `${SITE_ORIGIN}/assets/images/preston-main.jpg`;

// Confirmed live on Sep 14, 2026.
const ORGANIZATION_SAME_AS = [
    'https://www.youtube.com/@LegacyInvestingShow',
    'https://www.instagram.com/thelegacyinvestingshow/',
    'https://www.facebook.com/thelegacyinvestingshow',
    // The share link the site already published. It redirects to the page
    // above; both are kept so no existing profile link is dropped.
    'https://www.facebook.com/share/19LQhE6gmh/',
    'https://www.tiktok.com/@thelegacyinvestingshow',
    'https://www.linkedin.com/company/legacy-investing-show',
    'https://www.trustpilot.com/review/legacyinvestingshow.com',
];

const PERSON_SAME_AS = [
    'https://www.youtube.com/@LegacyInvestingShow',
    'https://www.instagram.com/thelegacyinvestingshow/',
    'https://www.facebook.com/thelegacyinvestingshow',
    'https://www.tiktok.com/@thelegacyinvestingshow',
    'https://www.linkedin.com/in/preston-seo/',
];

const PERSON_KNOWS_ABOUT = [
    'Tax Strategy',
    'Investment Planning',
    'Business Structures',
    'Retirement Accounts',
    'Real Estate Investing',
    'Short-Term Rentals',
    'Airbnb Arbitrage',
    'Debt Management',
];

const PERSON_JOB_TITLE = 'Founder, Legacy Investing Show';

const PERSON_DESCRIPTION =
    'Preston Seo founded Legacy Investing Show in 2020. He teaches tax strategy, investment planning, business structures, and retirement accounts to professionals, investors, and founders.';

const ORGANIZATION_DESCRIPTION =
    'Legacy Investing Show teaches tax strategy, wealth-building systems, decision frameworks, and practical execution for professionals, business owners, and investors.';

/** The node other schemas point at. Always carries the full detail. */
function organization() {
    return {
        '@type': 'Organization',
        '@id': ORGANIZATION_ID,
        name: 'Legacy Investing Show',
        url: `${SITE_ORIGIN}/`,
        description: ORGANIZATION_DESCRIPTION,
        logo: { ...LOGO },
        image: LOGO.url,
        founder: { '@id': PERSON_ID },
        sameAs: [...ORGANIZATION_SAME_AS],
    };
}

/** Standalone `<script>` payload: the same node with a context. */
function organizationWithContext() {
    return { '@context': 'https://schema.org', ...organization() };
}

/**
 * The author node used by Article schema. `name` stays per-post because the
 * byline is frontmatter, but the `@id` and profile links never vary.
 */
function author(name = 'Preston Seo') {
    return {
        '@type': 'Person',
        '@id': PERSON_ID,
        name,
        url: PERSON_PAGE_URL,
        jobTitle: PERSON_JOB_TITLE,
        knowsAbout: [...PERSON_KNOWS_ABOUT],
        sameAs: [...PERSON_SAME_AS],
    };
}

/** The full Person node for the author page. */
function person() {
    return {
        '@type': 'Person',
        '@id': PERSON_ID,
        name: 'Preston Seo',
        url: PERSON_PAGE_URL,
        mainEntityOfPage: PERSON_PAGE_URL,
        image: PERSON_IMAGE,
        jobTitle: PERSON_JOB_TITLE,
        description: PERSON_DESCRIPTION,
        knowsAbout: [...PERSON_KNOWS_ABOUT],
        worksFor: { '@id': ORGANIZATION_ID },
        sameAs: [...PERSON_SAME_AS],
    };
}

// U+2028 and U+2029 are valid JSON but break a JavaScript string literal, so
// they are escaped too. Built from char codes to keep this file plain ASCII.
const JS_LINE_TERMINATORS = new RegExp(`[${String.fromCharCode(0x2028, 0x2029)}]`, 'g');

/** JSON safe to drop inside a `<script type="application/ld+json">`. */
function toJsonLd(value, indent = 0) {
    return JSON.stringify(value === undefined ? null : value, null, indent)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026')
        .replace(JS_LINE_TERMINATORS, (char) => `\\u${char.charCodeAt(0).toString(16)}`);
}

/** A complete `<script>` tag for one JSON-LD node. */
function renderJsonLdScript(value, indent = 4) {
    return `<script type="application/ld+json">\n${toJsonLd(value, indent)}\n</script>`;
}

module.exports = {
    ABOUT_URL,
    LOGO,
    ORGANIZATION_ID,
    ORGANIZATION_SAME_AS,
    PERSON_ID,
    PERSON_IMAGE,
    PERSON_JOB_TITLE,
    PERSON_KNOWS_ABOUT,
    PERSON_PAGE_URL,
    PERSON_SAME_AS,
    SITE_ORIGIN,
    author,
    organization,
    organizationWithContext,
    person,
    renderJsonLdScript,
    toJsonLd,
};
