#!/usr/bin/env node

/**
 * Build competitor "alternatives" and "vs" pages.
 *
 * Data: every data/alternatives-pages*.json file (each an array of entries
 * that share one schema). Entries with kind "alternatives" render to
 * alternatives/<slug>.html (URL /alternatives/<slug>); entries with kind "vs"
 * render to vs/<slug>.html (URL /vs/<slug>). A hub page is written for each
 * kind that has at least one entry (alternatives/index.html, vs/index.html).
 *
 * Usage: node scripts/build-alternatives-pages.js
 */

const fs = require('fs');
const path = require('path');
const {
    renderAnalyticsBody,
    renderAnalyticsHead,
    renderHeadAssets,
    renderSiteFooter,
    renderSiteHeader,
} = require('./lib/site-shell');

const ROOT_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const DATA_FILE_PATTERN = /^alternatives-pages.*\.json$/;
const SITE_URL = 'https://www.legacyinvestingshow.com';
const OG_IMAGE = `${SITE_URL}/assets/images/og-image.jpg`;
const LOGO_URL = `${SITE_URL}/assets/images/logo.png`;
const AUTHOR_URL = `${SITE_URL}/about/preston-seo`;
const MASTERCLASS_URL = 'https://join.managemoney101.com/tax-strategies';
const OUR_PROGRAM = 'Legacy Wealth Blueprint';

const GA_TRACKING_ID = process.env.GA_TRACKING_ID || 'G-2578PT1WSS';
const GTM_CONTAINER_ID = process.env.GTM_CONTAINER_ID || 'GTM-KQ4R2LKP';
const GOOGLE_SITE_VERIFICATIONS = [
    'Kec6RfGhFL-qG_8zKxCqt7yxjgy65WeDAftCBm90G2s',
    '92MoCnkdQOj_ey1lEafT5Mz-znCcCQ3UABZlI-JG_nM',
];

const COMPETITOR_DISCLAIMER = 'Competitor descriptions are based on publicly available information as of the update date; verify current offerings directly with each provider. Legacy Investing Show publishes this page and offers one of the programs discussed.';
const EDUCATION_DISCLAIMER = 'Educational content only, not personalised tax, legal, or investment advice. The right choice depends on your facts, your records, and your own advisor\'s review.';

const KINDS = {
    alternatives: {
        dir: 'alternatives',
        crumb: 'Alternatives',
        hubTitle: 'Alternatives Guides',
        hubH1: 'Alternatives guides',
        hubKey: 'Name what you actually need first. Most programs are good at one job and quietly weak at the rest.',
        hubLede: 'Honest alternatives to the tax, wealth, and real estate programs people compare us with. Each guide profiles the competitor, lists the realistic options, and says plainly when the other program is the better pick.',
        hubDescription: 'Alternatives to popular tax strategy, wealth, and real estate programs: a profile of each competitor, the realistic options, and who should pick what.',
        pageLabel: 'Alternatives guide',
    },
    vs: {
        dir: 'vs',
        crumb: 'Comparisons',
        hubTitle: 'Program Comparisons',
        hubH1: 'Program comparisons',
        hubKey: 'Two programs rarely win on the same axis. Decide which axis matters before you compare.',
        hubLede: 'Head-to-head comparisons between programs people weigh against Legacy Wealth Blueprint. Each one covers format, who teaches, what is delivered, and the situations where each side is the better choice.',
        hubDescription: 'Head-to-head comparisons of tax and wealth programs against Legacy Wealth Blueprint: format, deliverables, who teaches, and which fits which situation.',
        pageLabel: 'Comparison',
    },
};

const TYPE_LABELS = {
    course: 'Course',
    coaching: 'Coaching program',
    firm: 'Firm or professional service',
    community: 'Community',
    software: 'Software',
    free: 'Free resource',
    book: 'Book',
    diy: 'Do it yourself',
};

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function esc(str = '') {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Escape text, then turn [label](/href) or [label](https://...) into links.
 * Only site-relative and http(s) targets become anchors; anything else stays text.
 */
function rich(str = '') {
    return esc(str).replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, href) => {
        if (!/^(\/|https?:\/\/)/.test(href)) return match;
        const external = /^https?:\/\//.test(href) && !href.startsWith(SITE_URL);
        const rel = external ? ' rel="noopener noreferrer" target="_blank"' : '';
        return `<a href="${href}"${rel}>${label}</a>`;
    });
}

/** Plain text for JSON-LD: strip the [label](href) markup down to the label. */
function plain(str = '') {
    return String(str).replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1');
}

function isArray(value) {
    return Array.isArray(value) && value.length > 0;
}

function isText(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function formatDate(iso) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '').trim());
    if (!match) return String(iso || '');
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[Number(match[2]) - 1]} ${Number(match[3])}, ${Number(match[1])}`;
}

function buildSEOTitle(rawTitle) {
    const suffix = ' | Legacy Investing Show';
    const title = String(rawTitle || 'Alternatives Guide').replace(/\s+/g, ' ').trim() || 'Alternatives Guide';
    return title.endsWith(suffix) ? title : title + suffix;
}

function typeLabel(type) {
    const key = String(type || '').trim().toLowerCase();
    if (TYPE_LABELS[key]) return TYPE_LABELS[key];
    return key ? key.charAt(0).toUpperCase() + key.slice(1) : '';
}

function absoluteUrl(href) {
    if (!isText(href)) return '';
    if (/^https?:\/\//.test(href)) return href;
    if (href.startsWith('/')) return `${SITE_URL}${href}`;
    return '';
}

function pageUrl(page) {
    return `${SITE_URL}/${KINDS[page.kind].dir}/${page.slug}`;
}

function hubUrl(kind) {
    return `${SITE_URL}/${KINDS[kind].dir}`;
}

// ---- Data loading ---------------------------------------------------------

function listDataFiles() {
    if (!fs.existsSync(DATA_DIR)) return [];
    return fs
        .readdirSync(DATA_DIR)
        .filter((name) => DATA_FILE_PATTERN.test(name))
        .sort()
        .map((name) => path.join(DATA_DIR, name));
}

function validatePage(page, sourceFile) {
    const problems = [];
    ['kind', 'slug', 'competitor', 'title', 'metaDescription', 'h1', 'updated'].forEach((key) => {
        if (!isText(page[key])) problems.push(`missing "${key}"`);
    });
    if (page.kind && !KINDS[page.kind]) problems.push(`unknown kind "${page.kind}" (expected alternatives or vs)`);
    if (page.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(page.slug)) problems.push(`slug "${page.slug}" must be lowercase kebab-case`);
    if (page.updated && !/^\d{4}-\d{2}-\d{2}$/.test(page.updated)) problems.push(`"updated" must be YYYY-MM-DD`);
    if (page.metaDescription && (page.metaDescription.length < 120 || page.metaDescription.length > 165)) {
        console.warn(`Warning: ${sourceFile} ${page.slug || '?'}: metaDescription is ${page.metaDescription.length} chars (target 150-160).`);
    }
    if (problems.length) {
        throw new Error(`${path.basename(sourceFile)} entry "${page.slug || page.title || '?'}": ${problems.join('; ')}`);
    }
}

function loadPages() {
    const files = listDataFiles();
    if (!files.length) {
        throw new Error(`No data/alternatives-pages*.json files found in ${DATA_DIR}`);
    }

    const pages = [];
    const seen = new Map();

    files.forEach((file) => {
        let parsed;
        try {
            parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
        } catch (err) {
            throw new Error(`Could not parse ${file}: ${err.message}`);
        }
        if (!Array.isArray(parsed)) {
            throw new Error(`${file} must contain a JSON array of page entries`);
        }
        parsed.forEach((page) => {
            validatePage(page, file);
            const key = `${page.kind}/${page.slug}`;
            if (seen.has(key)) {
                throw new Error(`Duplicate page ${key} in ${file} (first seen in ${seen.get(key)})`);
            }
            seen.set(key, file);
            pages.push({ ...page, sourceFile: path.basename(file) });
        });
        console.log(`Loaded ${parsed.length} entries from ${path.relative(ROOT_DIR, file)}`);
    });

    return pages;
}

// ---- Fragments ------------------------------------------------------------

function renderParagraphs(paragraphs = []) {
    if (!isArray(paragraphs)) return '';
    return paragraphs.map((p) => `<p>${rich(p)}</p>`).join('\n');
}

function renderBullets(items = []) {
    if (!isArray(items)) return '';
    return items.map((item) => `<li>${rich(item)}</li>`).join('\n');
}

function renderFaqItems(items = []) {
    return items
        .map(
            (item) => `<details class="faq__item">
                            <summary>${esc(item.q)}</summary>
                            <div class="faq__answer">
                                <p>${rich(item.a)}</p>
                            </div>
                        </details>`
        )
        .join('\n');
}

function renderRelated(items = []) {
    return items
        .filter((item) => item && isText(item.href) && isText(item.label))
        .map((item) => `<li><a href="${esc(item.href)}">${esc(item.label)}</a></li>`)
        .join('\n');
}

function renderCompetitorProfile(page) {
    const profile = page.competitorProfile || {};
    const parts = [];
    if (isText(profile.what)) parts.push(`<p>${rich(profile.what)}</p>`);
    if (isText(profile.format)) parts.push(`<p><strong>Format.</strong> ${rich(profile.format)}</p>`);
    if (isArray(profile.knownFor)) parts.push(`<h3>Known for</h3>\n<ul>\n${renderBullets(profile.knownFor)}\n</ul>`);
    if (isArray(profile.bestFor)) parts.push(`<h3>Best for</h3>\n<ul>\n${renderBullets(profile.bestFor)}\n</ul>`);
    if (isArray(profile.notIdealFor)) parts.push(`<h3>Not ideal for</h3>\n<ul>\n${renderBullets(profile.notIdealFor)}\n</ul>`);
    return parts.join('\n');
}

function renderAlternativeItem(alt, index) {
    const meta = [];
    const label = typeLabel(alt.type);
    if (label) meta.push(`<strong>Type:</strong> ${esc(label)}.`);
    if (isText(alt.bestFor)) meta.push(`<strong>Best for:</strong> ${rich(alt.bestFor)}`);

    const parts = [`<h3 id="alt-${index + 1}">${index + 1}. ${esc(alt.name)}</h3>`];
    if (meta.length) parts.push(`<p>${meta.join(' ')}</p>`);
    if (isText(alt.summary)) parts.push(`<p>${rich(alt.summary)}</p>`);
    if (isArray(alt.strengths)) parts.push(`<h4>Strengths</h4>\n<ul>\n${renderBullets(alt.strengths)}\n</ul>`);
    if (isArray(alt.tradeoffs)) parts.push(`<h4>Tradeoffs</h4>\n<ul>\n${renderBullets(alt.tradeoffs)}\n</ul>`);

    if (isText(alt.url) && absoluteUrl(alt.url)) {
        const external = /^https?:\/\//.test(alt.url) && !alt.url.startsWith(SITE_URL);
        const rel = external ? ' rel="noopener noreferrer" target="_blank"' : '';
        const text = external ? `Visit ${alt.name} (opens their site)` : `Read more about ${alt.name}`;
        parts.push(`<p><a href="${esc(alt.url)}"${rel}>${esc(text)}</a></p>`);
    }
    return parts.join('\n');
}

function renderAlternatives(page) {
    return (page.alternatives || []).map(renderAlternativeItem).join('\n\n');
}

function renderComparisonTable(page) {
    const table = page.comparisonTable || {};
    const columns = isArray(table.columns) ? table.columns : [];
    const rows = isArray(table.rows) ? table.rows : [];
    if (!columns.length || !rows.length) return '';

    const head = columns.map((col) => `<th scope="col">${esc(col)}</th>`).join('\n                                    ');
    const body = rows
        .map((row) => {
            const cells = columns.map((col, i) => {
                const value = Array.isArray(row) ? row[i] : '';
                const content = rich(value == null ? '' : value);
                return i === 0 ? `<td><strong>${content}</strong></td>` : `<td>${content}</td>`;
            });
            return `<tr>\n                                        ${cells.join('\n                                        ')}\n                                    </tr>`;
        })
        .join('\n');

    const caption = isText(table.caption) ? table.caption : `${page.competitor} compared with the alternatives on this page. Descriptions reflect public information as of ${formatDate(page.updated)}.`;

    return `<div class="table-inset table-inset--wide">
                        <table class="table--zebra">
                            <caption>${rich(caption)}</caption>
                            <thead>
                                <tr>
                                    ${head}
                                </tr>
                            </thead>
                            <tbody>
${body}
                            </tbody>
                        </table>
                    </div>`;
}

function renderScenarios(page) {
    const rows = (page.scenarios || [])
        .filter((row) => row && isText(row.situation))
        .map((row) => `<tr>
                                        <td><strong>${rich(row.situation)}</strong></td>
                                        <td>${rich(row.pick || '')}</td>
                                        <td>${rich(row.why || '')}</td>
                                    </tr>`)
        .join('\n');
    if (!rows) return '';
    return `<div class="table-inset table-inset--wide">
                        <table class="table--zebra">
                            <thead>
                                <tr>
                                    <th scope="col">Situation</th>
                                    <th scope="col">Likely pick</th>
                                    <th scope="col">Why</th>
                                </tr>
                            </thead>
                            <tbody>
${rows}
                            </tbody>
                        </table>
                    </div>`;
}

function renderSteps(items = []) {
    return `<ol class="steps">
${items.map((item) => `                        <li><p>${rich(item)}</p></li>`).join('\n')}
                    </ol>`;
}

function renderSourceNote(page) {
    const items = [];
    if (isText(page.competitorUrl) && absoluteUrl(page.competitorUrl)) {
        items.push({ label: `${page.competitor}: current offering, format, and terms on its own site`, href: page.competitorUrl });
    }
    (page.alternatives || []).forEach((alt) => {
        if (isText(alt.url) && /^https?:\/\//.test(alt.url) && !alt.url.startsWith(SITE_URL)) {
            items.push({ label: `${alt.name}: current offering on its own site`, href: alt.url });
        }
    });
    items.push({ label: 'Legacy Investing Show client results, case studies, and third-party reviews', href: '/reviews' });
    items.push({ label: 'Your own returns, records, and a conversation with your CPA or advisor before you buy anything' });

    const rows = items
        .map((item) => {
            if (item.href && /^https?:\/\//.test(item.href)) {
                return `<li><a href="${esc(item.href)}" rel="noopener noreferrer" target="_blank">${esc(item.label)}</a></li>`;
            }
            if (item.href) return `<li><a href="${esc(item.href)}">${esc(item.label)}</a></li>`;
            return `<li>${esc(item.label)}</li>`;
        })
        .join('\n              ');

    return `<section class="source-note" aria-label="Sources to verify">
            <h2 id="sources">Sources to check before you decide</h2>
            <p>${esc(COMPETITOR_DISCLAIMER)}</p>
            <ul>
              ${rows}
            </ul>
          </section>`;
}

// ---- Section plan ---------------------------------------------------------

function headingsFor(page) {
    const c = page.competitor;
    const base = page.kind === 'vs'
        ? {
            verdict: 'Quick verdict',
            competitorProfile: `What ${c} is`,
            whyPeopleLook: `Why people compare ${c} and ${OUR_PROGRAM}`,
            alternatives: 'The options, one by one',
            comparisonTable: 'Side by side',
            scenarios: 'Which one fits which situation',
            whereLisFits: `Where ${OUR_PROGRAM} fits`,
            whereLisDoesNotFit: `Where ${OUR_PROGRAM} does not fit`,
            howToDecide: 'How to decide',
            faqs: 'Questions people ask',
        }
        : {
            verdict: 'Quick verdict',
            competitorProfile: `What ${c} is`,
            whyPeopleLook: `Why people look for ${c} alternatives`,
            alternatives: `${c} alternatives, one by one`,
            comparisonTable: 'Side by side',
            scenarios: 'Which option fits which situation',
            whereLisFits: `Where ${OUR_PROGRAM} fits`,
            whereLisDoesNotFit: `Where ${OUR_PROGRAM} does not fit`,
            howToDecide: 'How to decide',
            faqs: 'Questions people ask',
        };
    return { ...base, ...(page.headings && typeof page.headings === 'object' ? page.headings : {}) };
}

function buildSections(page) {
    const h = headingsFor(page);
    const sections = [];
    const prose = (id, title, inner) => sections.push({ id, title, html: `<div class="prose">\n<h2 id="${id}">${esc(title)}</h2>\n${inner}\n</div>` });

    if (isArray(page.verdict)) prose('verdict', h.verdict, renderParagraphs(page.verdict));

    const profileHtml = renderCompetitorProfile(page);
    if (profileHtml) prose('competitor-profile', h.competitorProfile, profileHtml);

    if (isArray(page.whyPeopleLook)) prose('why-people-look', h.whyPeopleLook, `<ul>\n${renderBullets(page.whyPeopleLook)}\n</ul>`);

    if (isArray(page.alternatives)) prose('alternatives', h.alternatives, renderAlternatives(page));

    const tableHtml = renderComparisonTable(page);
    if (tableHtml) {
        sections.push({
            id: 'comparison-table',
            title: h.comparisonTable,
            html: `<div class="prose">\n<h2 id="comparison-table">${esc(h.comparisonTable)}</h2>\n${isText(page.comparisonIntro) ? `<p>${rich(page.comparisonIntro)}</p>` : ''}\n</div>\n${tableHtml}`,
        });
    }

    const scenariosHtml = renderScenarios(page);
    if (scenariosHtml) {
        sections.push({
            id: 'scenarios',
            title: h.scenarios,
            html: `<div class="prose">\n<h2 id="scenarios">${esc(h.scenarios)}</h2>\n${isText(page.scenariosIntro) ? `<p>${rich(page.scenariosIntro)}</p>` : ''}\n</div>\n${scenariosHtml}`,
        });
    }

    if (isArray(page.whereLisFits)) prose('where-lis-fits', h.whereLisFits, renderParagraphs(page.whereLisFits));
    if (isArray(page.whereLisDoesNotFit)) prose('where-lis-does-not-fit', h.whereLisDoesNotFit, renderParagraphs(page.whereLisDoesNotFit));

    if (isArray(page.howToDecide)) {
        sections.push({
            id: 'how-to-decide',
            title: h.howToDecide,
            html: `<div class="prose">\n<h2 id="how-to-decide">${esc(h.howToDecide)}</h2>\n</div>\n${renderSteps(page.howToDecide)}`,
        });
    }

    if (isArray(page.faqs)) {
        sections.push({
            id: 'faq',
            title: h.faqs,
            html: `<div class="prose">\n<h2 id="faq">${esc(h.faqs)}</h2>\n</div>\n<div class="faq">\n${renderFaqItems(page.faqs)}\n</div>`,
        });
    }

    sections.push({ id: 'sources', title: 'Sources to check', html: renderSourceNote(page) });

    return sections;
}

// ---- Schema ---------------------------------------------------------------

function buildSchemaGraph(page) {
    const canonical = pageUrl(page);
    const kind = KINDS[page.kind];
    const published = isText(page.published) ? page.published : page.updated;

    const graph = [
        {
            '@type': 'Article',
            '@id': `${canonical}#article`,
            headline: page.title,
            description: page.metaDescription,
            image: OG_IMAGE,
            author: { '@type': 'Person', name: 'Preston Seo', url: AUTHOR_URL },
            publisher: {
                '@type': 'Organization',
                name: 'Legacy Investing Show',
                url: SITE_URL,
                logo: { '@type': 'ImageObject', url: LOGO_URL },
            },
            datePublished: published,
            dateModified: page.updated,
            mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
            about: { '@type': 'Thing', name: page.competitor },
        },
        {
            '@type': 'WebPage',
            '@id': canonical,
            url: canonical,
            name: page.title,
            description: page.metaDescription,
            dateModified: page.updated,
            isPartOf: { '@type': 'WebSite', name: 'Legacy Investing Show', url: SITE_URL },
            breadcrumb: { '@id': `${canonical}#breadcrumb` },
        },
        {
            '@type': 'BreadcrumbList',
            '@id': `${canonical}#breadcrumb`,
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
                { '@type': 'ListItem', position: 2, name: kind.crumb, item: hubUrl(page.kind) },
                { '@type': 'ListItem', position: 3, name: page.title, item: canonical },
            ],
        },
    ];

    if (isArray(page.faqs)) {
        graph.push({
            '@type': 'FAQPage',
            '@id': `${canonical}#faq`,
            mainEntity: page.faqs.map((item) => ({
                '@type': 'Question',
                name: plain(item.q),
                acceptedAnswer: { '@type': 'Answer', text: plain(item.a) },
            })),
        });
    }

    if (isArray(page.alternatives)) {
        graph.push({
            '@type': 'ItemList',
            '@id': `${canonical}#alternatives`,
            name: page.kind === 'vs' ? `Options compared on ${page.title}` : `${page.competitor} alternatives`,
            itemListOrder: 'https://schema.org/ItemListOrderAscending',
            numberOfItems: page.alternatives.length,
            itemListElement: page.alternatives.map((alt, index) => {
                const item = { '@type': 'ListItem', position: index + 1, name: alt.name };
                if (isText(alt.bestFor)) item.description = plain(alt.bestFor);
                const url = absoluteUrl(alt.url);
                if (url) item.url = url;
                return item;
            }),
        });
    }

    return { '@context': 'https://schema.org', '@graph': graph };
}

// ---- Pages ----------------------------------------------------------------

function renderPage(page) {
    const kind = KINDS[page.kind];
    const canonical = pageUrl(page);
    const sections = buildSections(page);
    const updatedLabel = formatDate(page.updated);
    const hubHref = `/${kind.dir}`;
    const keyLine = isText(page.keyLine) ? page.keyLine : (isArray(page.verdict) ? page.verdict[0] : page.metaDescription);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>${esc(buildSEOTitle(page.title))}</title>
    <meta name="description" content="${esc(page.metaDescription)}">
    <meta name="robots" content="index, follow">
${GOOGLE_SITE_VERIFICATIONS.map((code) => `    <meta name="google-site-verification" content="${code}">`).join('\n')}
    <link rel="canonical" href="${canonical}">

    <meta property="og:type" content="article">
    <meta property="og:url" content="${canonical}">
    <meta property="og:title" content="${esc(page.title)}">
    <meta property="og:description" content="${esc(page.metaDescription)}">
    <meta property="og:image" content="${OG_IMAGE}">
    <meta property="og:site_name" content="Legacy Investing Show">
    <meta property="article:author" content="Preston Seo">
    <meta property="article:modified_time" content="${esc(page.updated)}">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(page.title)}">
    <meta name="twitter:description" content="${esc(page.metaDescription)}">
    <meta name="twitter:image" content="${OG_IMAGE}">

    <meta name="theme-color" content="#FBF8F1">
    <link rel="icon" href="/favicon.ico" sizes="32x32">
    ${renderHeadAssets()}
    <link rel="stylesheet" href="/assets/css/guides.css">

    <script type="application/ld+json">${JSON.stringify(buildSchemaGraph(page))}</script>

    ${renderAnalyticsHead({ gaTrackingId: GA_TRACKING_ID, gtmContainerId: GTM_CONTAINER_ID })}
</head>
<body class="guide-page" data-page-type="${esc(page.kind)}" data-page-slug="${esc(page.slug)}" data-page-title="${esc(page.title)}">
    ${renderAnalyticsBody({ gtmContainerId: GTM_CONTAINER_ID })}
    <a href="#main" class="guide-skip">Skip to main content</a>

    ${renderSiteHeader('/compare')}

    <main id="main">
        <section class="opener">
            <div class="container-custom">
                <div class="col">
                    <nav aria-label="Breadcrumb">
                        <ol class="breadcrumb">
                            <li class="breadcrumb__item"><a href="/" class="breadcrumb__link">Home</a></li>
                            <li class="breadcrumb__item"><a href="${hubHref}" class="breadcrumb__link">${esc(kind.crumb)}</a></li>
                            <li class="breadcrumb__item"><span class="breadcrumb__current">${esc(page.competitor)}</span></li>
                        </ol>
                    </nav>
                    <h1 class="opener__title">${esc(page.h1)}</h1>
                    <p class="opener__key">${rich(keyLine)}</p>
                    <p class="opener__lede">${esc(page.metaDescription)}</p>
                    <p class="guide-opener__meta">${esc(kind.pageLabel)} by <a href="/about/preston-seo">Preston Seo</a>. Last updated <time datetime="${esc(page.updated)}">${esc(updatedLabel)}</time>.</p>
                </div>
            </div>
        </section>

        <section class="section section--rule">
            <div class="container-custom">
                <div class="col">
                    <details class="toc" open>
                        <summary>On this page</summary>
                        <ul>
${sections.map((s) => `                            <li><a href="#${s.id}">${esc(s.title)}</a></li>`).join('\n')}
                        </ul>
                    </details>

${sections.map((s) => s.html).join('\n\n')}

                    <div class="cta">
                        <h2>Related reading</h2>
                        <ul>
                            ${renderRelated(page.related || [])}
                            <li><a href="/reviews">Client results and reviews</a></li>
                            <li><a href="${hubHref}">All ${esc(kind.crumb.toLowerCase())} guides</a></li>
                        </ul>
                        <p>If you want to see how we teach before you compare programs, the free tax masterclass is the same material the strategy call starts from. There is no public price menu; what a program involves is discussed on that call.</p>
                        <p class="cta__actions">
                            <a href="${MASTERCLASS_URL}" class="btn-primary" data-track-event="cta_clicked" data-track-label="Free Tax Strategy Masterclass" data-track-location="${esc(page.kind)}_page" data-track-destination="${MASTERCLASS_URL}">Join the free tax masterclass</a>
                            <a href="/reviews" class="btn-secondary" data-track-event="cta_clicked" data-track-label="Client Results" data-track-location="${esc(page.kind)}_page" data-track-destination="/reviews">Read client results</a>
                        </p>
                    </div>
                    <p class="guide-note">${esc(COMPETITOR_DISCLAIMER)}</p>
                    <p class="guide-note">${esc(EDUCATION_DISCLAIMER)}</p>
                </div>
            </div>
        </section>
    </main>

    ${renderSiteFooter()}

    <script defer src="/assets/js/main.js"></script>
</body>
</html>`;
}

function summaryLine(page) {
    if (isText(page.summary)) return page.summary;
    return page.metaDescription;
}

function renderHub(kindKey, pages, otherHubs = []) {
    const kind = KINDS[kindKey];
    const canonical = hubUrl(kindKey);
    const updated = pages.map((p) => p.updated).sort().pop();

    const rows = pages
        .map((page) => `                        <li>
                            <p class="list-rows__title"><a href="/${kind.dir}/${esc(page.slug)}">${esc(page.title)}</a></p>
                            <p class="list-rows__desc">${esc(summaryLine(page))}</p>
                            <p class="list-rows__meta">Updated ${esc(formatDate(page.updated))}</p>
                        </li>`)
        .join('\n');

    const schema = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'CollectionPage',
                '@id': canonical,
                url: canonical,
                name: kind.hubTitle,
                description: kind.hubDescription,
                dateModified: updated,
                author: { '@type': 'Person', name: 'Preston Seo', url: AUTHOR_URL },
                publisher: { '@type': 'Organization', name: 'Legacy Investing Show', url: SITE_URL },
                mainEntity: {
                    '@type': 'ItemList',
                    numberOfItems: pages.length,
                    itemListElement: pages.map((page, index) => ({
                        '@type': 'ListItem',
                        position: index + 1,
                        url: pageUrl(page),
                        name: page.title,
                    })),
                },
            },
            {
                '@type': 'BreadcrumbList',
                itemListElement: [
                    { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
                    { '@type': 'ListItem', position: 2, name: kind.crumb, item: canonical },
                ],
            },
        ],
    };

    const otherLinks = otherHubs
        .map((k) => `<li><a href="/${KINDS[k].dir}">${esc(KINDS[k].hubH1)}</a>. ${esc(KINDS[k].hubDescription)}</li>`)
        .join('\n                            ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>${esc(buildSEOTitle(kind.hubTitle))}</title>
    <meta name="description" content="${esc(kind.hubDescription)}">
    <meta name="robots" content="index, follow">
${GOOGLE_SITE_VERIFICATIONS.map((code) => `    <meta name="google-site-verification" content="${code}">`).join('\n')}
    <link rel="canonical" href="${canonical}">

    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonical}">
    <meta property="og:title" content="${esc(kind.hubTitle)}">
    <meta property="og:description" content="${esc(kind.hubDescription)}">
    <meta property="og:image" content="${OG_IMAGE}">
    <meta property="og:site_name" content="Legacy Investing Show">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(kind.hubTitle)}">
    <meta name="twitter:description" content="${esc(kind.hubDescription)}">
    <meta name="twitter:image" content="${OG_IMAGE}">

    <meta name="theme-color" content="#FBF8F1">
    <link rel="icon" href="/favicon.ico" sizes="32x32">
    ${renderHeadAssets()}
    <link rel="stylesheet" href="/assets/css/guides.css">

    <script type="application/ld+json">${JSON.stringify(schema)}</script>

    ${renderAnalyticsHead({ gaTrackingId: GA_TRACKING_ID, gtmContainerId: GTM_CONTAINER_ID })}
</head>
<body class="guide-page" data-page-type="${esc(kindKey)}_hub" data-page-title="${esc(kind.hubTitle)}">
    ${renderAnalyticsBody({ gtmContainerId: GTM_CONTAINER_ID })}
    <a href="#main" class="guide-skip">Skip to main content</a>

    ${renderSiteHeader('/compare')}

    <main id="main">
        <section class="opener">
            <div class="container-custom">
                <div class="col">
                    <nav aria-label="Breadcrumb">
                        <ol class="breadcrumb">
                            <li class="breadcrumb__item"><a href="/" class="breadcrumb__link">Home</a></li>
                            <li class="breadcrumb__item"><span class="breadcrumb__current">${esc(kind.crumb)}</span></li>
                        </ol>
                    </nav>
                    <h1 class="opener__title">${esc(kind.hubH1)}</h1>
                    <p class="opener__key">${esc(kind.hubKey)}</p>
                    <p class="opener__lede">${esc(kind.hubLede)}</p>
                    <p class="guide-opener__meta">Written by <a href="/about/preston-seo">Preston Seo</a>. Last updated <time datetime="${esc(updated)}">${esc(formatDate(updated))}</time>.</p>
                </div>
            </div>
        </section>

        <section class="section section--rule">
            <div class="container-custom">
                <div class="col">
                    <div class="prose">
                        <h2 id="how-to-read">How to read these guides</h2>
                        <p>Every guide starts with a verdict, profiles the other program from its own public material, and then lists the realistic options with strengths and tradeoffs for each. Where the other program is the better fit, the guide says so.</p>
                        <p>Legacy Investing Show publishes these pages and offers one of the programs discussed. No prices are quoted for any program; check each provider's own site for current terms.</p>

                        <h2 id="the-guides">The guides</h2>
                    </div>
                    <ul class="list-rows">
${rows}
                    </ul>

                    <div class="cta">
                        <h2>Elsewhere on the site</h2>
                        <ul>
                            ${otherLinks}
                            <li><a href="/compare">Compare guides</a>. Head-to-head decisions between two tax strategies.</li>
                            <li><a href="/tax-strategies">Tax strategies</a>. Every strategy guide in one table.</li>
                            <li><a href="/reviews">Client results</a>. Case studies, written results, and third-party reviews.</li>
                        </ul>
                        <p class="cta__actions">
                            <a href="${MASTERCLASS_URL}" class="btn-primary" data-track-event="cta_clicked" data-track-label="Free Tax Strategy Masterclass" data-track-location="${esc(kindKey)}_hub" data-track-destination="${MASTERCLASS_URL}">Join the free tax masterclass</a>
                            <a href="/reviews" class="btn-secondary" data-track-event="cta_clicked" data-track-label="Client Results" data-track-location="${esc(kindKey)}_hub" data-track-destination="/reviews">Read client results</a>
                        </p>
                    </div>
                    <p class="guide-note">${esc(COMPETITOR_DISCLAIMER)}</p>
                    <p class="guide-note">${esc(EDUCATION_DISCLAIMER)}</p>
                </div>
            </div>
        </section>
    </main>

    ${renderSiteFooter()}

    <script defer src="/assets/js/main.js"></script>
</body>
</html>`;
}

// ---- Main -----------------------------------------------------------------

function main() {
    let pages;
    try {
        pages = loadPages();
    } catch (err) {
        console.error(`build-alternatives-pages: ${err.message}`);
        process.exit(1);
    }

    const byKind = { alternatives: [], vs: [] };
    pages.forEach((page) => byKind[page.kind].push(page));

    Object.keys(KINDS).forEach((kindKey) => {
        const kind = KINDS[kindKey];
        const list = byKind[kindKey];
        if (!list.length) {
            console.log(`No "${kindKey}" entries yet; skipping ${kind.dir}/ output.`);
            return;
        }
        const outDir = path.join(ROOT_DIR, kind.dir);
        ensureDir(outDir);

        list.forEach((page) => {
            fs.writeFileSync(path.join(outDir, `${page.slug}.html`), renderPage(page), 'utf8');
            console.log(`Built ${kind.dir}/${page.slug}.html`);
        });

        const otherHubs = Object.keys(KINDS).filter((k) => k !== kindKey && byKind[k].length > 0);
        fs.writeFileSync(path.join(outDir, 'index.html'), renderHub(kindKey, list, otherHubs), 'utf8');
        console.log(`Built ${kind.dir}/index.html (${list.length} entries)`);
    });
}

if (require.main === module) {
    main();
}

module.exports = { loadPages, renderPage, renderHub, buildSchemaGraph, KINDS };
