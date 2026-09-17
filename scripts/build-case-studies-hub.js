#!/usr/bin/env node

/**
 * Builds /case-studies (case-studies.html at the repo root): one structured hub
 * page of named client results, generated from data/case-studies-hub.json.
 *
 * The full case studies already exist as blog posts; this page only summarises
 * them and links back. Every internal href is verified against the repo before
 * the file is written, and the page is refused if a figure or link would point
 * at a redirecting path (/success-stories, /pricing, /programs) or a .html URL.
 *
 * Usage: node scripts/build-case-studies-hub.js
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
const DATA_PATH = path.join(ROOT_DIR, 'data', 'case-studies-hub.json');
const VIDEOS_PATH = path.join(ROOT_DIR, 'data', 'reviews-videos.json');
const OUTPUT_PATH = path.join(ROOT_DIR, 'case-studies.html');
const SITE_URL = 'https://www.legacyinvestingshow.com';
const OG_IMAGE = `${SITE_URL}/assets/images/og-image.jpg`;
const BLOG_PREFIX = `${SITE_URL}/blog/`;

const GA_TRACKING_ID = process.env.GA_TRACKING_ID || 'G-2578PT1WSS';
const GTM_CONTAINER_ID = process.env.GTM_CONTAINER_ID || 'GTM-KQ4R2LKP';
const GOOGLE_SITE_VERIFICATIONS = [
    'Kec6RfGhFL-qG_8zKxCqt7yxjgy65WeDAftCBm90G2s',
    '92MoCnkdQOj_ey1lEafT5Mz-znCcCQ3UABZlI-JG_nM',
];

// Paths that 301 elsewhere or must never be linked from generated pages.
const FORBIDDEN_PATH_PREFIXES = ['/success-stories', '/pricing', '/programs', '/home', '/markets/', '/renters-insurance/'];

function fail(message) {
    console.error(`build-case-studies-hub: ${message}`);
    process.exit(1);
}

function readJson(filePath) {
    if (!fs.existsSync(filePath)) {
        fail(`missing input file ${filePath}`);
    }
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        return fail(`could not parse ${filePath}: ${error.message}`);
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

function lowerFirst(str = '') {
    const text = String(str);
    return /^[A-Z][a-z]/.test(text) ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

function possessive(name = '') {
    return /s$/i.test(name) ? `${name}'` : `${name}'s`;
}

/**
 * Resolve an internal href the way Vercel does with cleanUrls on:
 * "/" -> index.html, "/foo" -> foo.html or foo/index.html, files served as-is.
 */
function hrefResolves(href) {
    const clean = href.split('#')[0].split('?')[0];
    if (clean === '/' || clean === '') return fs.existsSync(path.join(ROOT_DIR, 'index.html'));
    const rel = clean.replace(/^\//, '');
    return (
        fs.existsSync(path.join(ROOT_DIR, `${rel}.html`)) ||
        fs.existsSync(path.join(ROOT_DIR, rel, 'index.html')) ||
        (path.extname(rel) !== '' && fs.existsSync(path.join(ROOT_DIR, rel)))
    );
}

function buildVideoIndex(videos) {
    const index = new Map();
    videos.forEach((video) => {
        if (!video.postUrl || !video.postUrl.startsWith(BLOG_PREFIX)) return;
        index.set(video.postUrl.slice(BLOG_PREFIX.length), video);
    });
    return index;
}

function renderBullets(items = []) {
    return items.map((item) => `<li>${esc(item)}</li>`).join('\n                            ');
}

function renderFaqItems(items = []) {
    return items
        .map(
            (item) => `<details class="faq__item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
                            <summary itemprop="name">${esc(item.q)}</summary>
                            <div class="faq__answer" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
                                <p itemprop="text">${esc(item.a)}</p>
                            </div>
                        </details>`
        )
        .join('\n                        ');
}

function reviewsAnchorFor(client) {
    return client.group === 'lwb' ? '/reviews#case-studies' : '/reviews#airbnb';
}

function sourceCell(client, videoIndex) {
    const caseStudy = `<a href="/blog/${esc(client.slug)}">Case study</a>`;
    if (videoIndex.has(client.slug)) {
        return `${caseStudy}<br><a href="${reviewsAnchorFor(client)}">Video interview</a>`;
    }
    return `${caseStudy}<br>Written post (interview embedded)`;
}

function renderSummaryTable(data, videoIndex) {
    const rows = data.clients
        .map(
            (client) => `<tr id="row-${esc(client.id)}">
                                    <th scope="row"><a href="#${esc(client.id)}">${esc(client.name)}</a></th>
                                    <td>${esc(client.program)}</td>
                                    <td>${esc(client.incomeType)}</td>
                                    <td>${esc(client.startingSituation)}</td>
                                    <td><strong>${esc(client.result)}</strong>${
                                        client.resultDetail && client.resultDetail.length
                                            ? ` ${esc(client.resultDetail.join('. '))}.`
                                            : ''
                                    }</td>
                                    <td>${esc(client.timeline)}</td>
                                    <td>${esc(client.methods.join('; '))}</td>
                                    <td>${sourceCell(client, videoIndex)}</td>
                                </tr>`
        )
        .join('\n                                ');

    return `<div class="table-inset table-inset--wide table-scroll">
                        <table class="table--zebra">
                            <caption>${data.clients.length} named clients. Result wording follows the source; "Not stated" means the source does not say.</caption>
                            <thead>
                                <tr>
                                    <th scope="col">Name</th>
                                    <th scope="col">Program</th>
                                    <th scope="col">Income type</th>
                                    <th scope="col">Starting situation</th>
                                    <th scope="col">Documented result</th>
                                    <th scope="col">Timeline</th>
                                    <th scope="col">Method used</th>
                                    <th scope="col">Source</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows}
                            </tbody>
                        </table>
                    </div>`;
}

function renderClientSection(client, videoIndex) {
    const hasVideo = videoIndex.has(client.slug);
    const heading = `${client.name}: ${lowerFirst(client.headline)}`;
    const meta = [
        esc(client.program),
        hasVideo ? `<a href="${reviewsAnchorFor(client)}">Video interview on /reviews</a>` : 'Written case study',
        `<a href="/blog/${esc(client.slug)}">Full case study</a>`,
    ].join(' &middot; ');

    return `<section class="prose" id="${esc(client.id)}" aria-labelledby="${esc(client.id)}-title">
                        <h2 id="${esc(client.id)}-title">${esc(heading)}</h2>
                        <p class="list-rows__meta">${meta}</p>
                        <h3>Before</h3>
                        <ul>
                            ${renderBullets(client.before)}
                        </ul>
                        <h3>After</h3>
                        <ul>
                            ${renderBullets(client.after)}
                        </ul>
                        <h3>How</h3>
                        <ul>
                            ${renderBullets(client.how)}
                        </ul>
                        <blockquote>
                            <p>&ldquo;${esc(client.quote)}&rdquo;</p>
                            <p>&mdash; ${esc(client.name)}, in ${hasVideo ? 'the interview' : 'the case study'}</p>
                        </blockquote>
                        <p><a href="/blog/${esc(client.slug)}">Read ${esc(possessive(client.name))} full case study</a>${
                            hasVideo ? ` &middot; <a href="${reviewsAnchorFor(client)}">Watch the interview</a>` : ''
                        }</p>
                    </section>`;
}

function renderGroup(group, data, videoIndex) {
    const clients = data.clients.filter((client) => client.group === group.id);
    const sections = clients.map((client) => renderClientSection(client, videoIndex)).join('\n\n                    ');
    return `<div class="prose" id="${esc(group.id)}">
                        <h2>${esc(group.heading)}</h2>
                        <p>${esc(group.intro)}</p>
                        <p>${clients.map((client) => `<a href="#${esc(client.id)}">${esc(client.name)}</a>`).join(' &middot; ')}</p>
                    </div>

                    ${sections}`;
}

function renderHowToRead(items = []) {
    return items
        .map(
            (item) => `<h3>${esc(item.title)}</h3>
                        <p>${esc(item.text)}</p>`
        )
        .join('\n                        ');
}

function renderWealthPlans(plans) {
    const items = plans.items
        .map(
            (item) => `<li><a href="/blog/${esc(item.slug)}">${esc(item.label)}</a>: ${esc(item.note)}</li>`
        )
        .join('\n                            ');
    return `<h2 id="wealth-plans">Wealth plans are planning documents, not case studies</h2>
                        <p>${esc(plans.intro)}</p>
                        <ul>
                            ${items}
                        </ul>`;
}

function renderVerification(verification) {
    const items = verification.items
        .map((item) => {
            const label = item.href
                ? `<a href="${esc(item.href)}"${item.external ? ' rel="nofollow noopener" target="_blank"' : ''}>${esc(item.label)}</a>`
                : `<strong>${esc(item.label)}</strong>`;
            return `<li>${label}: ${esc(item.text)}</li>`;
        })
        .join('\n                            ');
    return `<h2 id="verification">Verification</h2>
                        <p>${esc(verification.intro)}</p>
                        <ul>
                            ${items}
                        </ul>`;
}

function renderRelated(items = []) {
    return items.map((item) => `<li><a href="${esc(item.href)}">${esc(item.label)}</a></li>`).join('\n                            ');
}

function renderToc(data) {
    const lwb = data.clients.filter((client) => client.group === 'lwb');
    const airbnb = data.clients.filter((client) => client.group === 'airbnb');
    const names = (list) => list.map((client) => `<a href="#${esc(client.id)}">${esc(client.name)}</a>`).join(', ');
    return `<details class="toc" open>
                        <summary>On this page</summary>
                        <ul>
                            <li><a href="#summary">Summary table</a></li>
                            <li><a href="#programs">What the programs include</a></li>
                            <li><a href="#lwb">Tax and wealth (Legacy Wealth Blueprint)</a>: ${names(lwb)}</li>
                            <li><a href="#airbnb">Short-term rental income (Airbnb programs)</a>: ${names(airbnb)}</li>
                            <li><a href="#how-to-read">How to read these numbers</a></li>
                            <li><a href="#wealth-plans">Wealth plans are not case studies</a></li>
                            <li><a href="#verification">Verification</a></li>
                            <li><a href="#faq">Questions people ask</a></li>
                        </ul>
                    </details>`;
}

function buildSchemaGraph(data, videoIndex) {
    const canonical = `${SITE_URL}/${data.slug}`;
    const orgId = `${SITE_URL}/#organization`;
    const personId = `${SITE_URL}/about/preston-seo#person`;
    const listId = `${canonical}#case-study-list`;
    const breadcrumbId = `${canonical}#breadcrumb`;

    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Organization',
                '@id': orgId,
                name: 'Legacy Investing Show',
                url: `${SITE_URL}/`,
                logo: OG_IMAGE,
                sameAs: ['https://www.trustpilot.com/review/firstairbnb.com'],
            },
            {
                '@type': 'Person',
                '@id': personId,
                name: 'Preston Seo',
                url: `${SITE_URL}/about/preston-seo`,
                jobTitle: 'Founder, Legacy Investing Show',
                worksFor: { '@id': orgId },
            },
            {
                '@type': 'WebPage',
                '@id': canonical,
                url: canonical,
                name: data.h1,
                headline: data.h1,
                description: data.description,
                inLanguage: 'en-US',
                datePublished: data.lastUpdated,
                dateModified: data.lastUpdated,
                author: { '@id': personId },
                publisher: { '@id': orgId },
                primaryImageOfPage: OG_IMAGE,
                breadcrumb: { '@id': breadcrumbId },
                mainEntity: { '@id': listId },
            },
            {
                '@type': 'BreadcrumbList',
                '@id': breadcrumbId,
                itemListElement: [
                    { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
                    { '@type': 'ListItem', position: 2, name: 'Reviews', item: `${SITE_URL}/reviews` },
                    { '@type': 'ListItem', position: 3, name: 'Case studies', item: canonical },
                ],
            },
            {
                '@type': 'ItemList',
                '@id': listId,
                name: 'Legacy Investing Show client case studies',
                description: 'Named client case studies with the documented result each client gave, linking to the full written case study.',
                numberOfItems: data.clients.length,
                itemListOrder: 'https://schema.org/ItemListUnordered',
                itemListElement: data.clients.map((client, index) => ({
                    '@type': 'ListItem',
                    position: index + 1,
                    name: `${client.name}: ${client.result}`,
                    url: `${BLOG_PREFIX}${client.slug}`,
                    item: {
                        '@type': 'Article',
                        '@id': `${BLOG_PREFIX}${client.slug}`,
                        url: `${BLOG_PREFIX}${client.slug}`,
                        headline: `${client.name}: ${client.result}`,
                        about: client.program,
                        author: { '@id': personId },
                        publisher: { '@id': orgId },
                        ...(videoIndex.has(client.slug)
                            ? {
                                video: {
                                    '@type': 'VideoObject',
                                    name: `${client.name} client interview`,
                                    description: client.result,
                                    thumbnailUrl: videoIndex.get(client.slug).thumbnail
                                        ? `${SITE_URL}${videoIndex.get(client.slug).thumbnail}`
                                        : OG_IMAGE,
                                    uploadDate: videoIndex.get(client.slug).uploadDate || data.lastUpdated,
                                    url: `${SITE_URL}${reviewsAnchorFor(client)}`,
                                },
                            }
                            : {}),
                    },
                })),
            },
            {
                '@type': 'FAQPage',
                '@id': `${canonical}#faq`,
                mainEntity: data.faq.map((item) => ({
                    '@type': 'Question',
                    name: item.q,
                    acceptedAnswer: { '@type': 'Answer', text: item.a },
                })),
            },
        ],
    };
}

function renderPage(data, videoIndex) {
    const canonical = `${SITE_URL}/${data.slug}`;
    const title = `${data.title} | Legacy Investing Show`;
    const lwbCount = data.clients.filter((client) => client.group === 'lwb').length;
    const airbnbCount = data.clients.filter((client) => client.group === 'airbnb').length;
    const videoCount = data.clients.filter((client) => videoIndex.has(client.slug)).length;
    const schema = buildSchemaGraph(data, videoIndex);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>${esc(title)}</title>
    <meta name="description" content="${esc(data.description)}">
    <meta name="robots" content="index, follow">
${GOOGLE_SITE_VERIFICATIONS.map((code) => `    <meta name="google-site-verification" content="${code}">`).join('\n')}
    <link rel="canonical" href="${canonical}">

    <meta property="og:type" content="article">
    <meta property="og:url" content="${canonical}">
    <meta property="og:title" content="${esc(data.h1)}">
    <meta property="og:description" content="${esc(data.description)}">
    <meta property="og:image" content="${OG_IMAGE}">
    <meta property="og:site_name" content="Legacy Investing Show">
    <meta property="article:modified_time" content="${esc(data.lastUpdated)}">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(data.h1)}">
    <meta name="twitter:description" content="${esc(data.description)}">
    <meta name="twitter:image" content="${OG_IMAGE}">

    <meta name="theme-color" content="#FBF8F1">
    <link rel="icon" href="/favicon.ico" sizes="32x32">
    ${renderHeadAssets()}
    <link rel="stylesheet" href="/assets/css/guides.css">

    <script type="application/ld+json">${JSON.stringify(schema)}</script>

    ${renderAnalyticsHead({ gaTrackingId: GA_TRACKING_ID, gtmContainerId: GTM_CONTAINER_ID })}
</head>
<body class="guide-page" data-page-type="case_studies_hub" data-page-slug="${esc(data.slug)}" data-page-title="${esc(data.h1)}">
    ${renderAnalyticsBody({ gtmContainerId: GTM_CONTAINER_ID })}
    <a href="#main" class="guide-skip">Skip to main content</a>

    ${renderSiteHeader('/reviews')}

    <main id="main">
        <section class="opener">
            <div class="container-custom">
                <div class="col">
                    <nav aria-label="Breadcrumb">
                        <ol class="breadcrumb">
                            <li class="breadcrumb__item"><a href="/" class="breadcrumb__link">Home</a></li>
                            <li class="breadcrumb__item"><a href="/reviews" class="breadcrumb__link">Reviews</a></li>
                            <li class="breadcrumb__item"><span class="breadcrumb__current">Case studies</span></li>
                        </ol>
                    </nav>
                    <h1 class="opener__title">${esc(data.h1)}</h1>
                    <p class="opener__key">${esc(data.keyLine)}</p>
                    <p class="opener__lede">${data.intro.map((sentence) => esc(sentence)).join(' ')}</p>
                    <p class="list-rows__meta">By <a href="/about/preston-seo">Preston Seo</a> &middot; Last updated <time datetime="${esc(data.lastUpdated)}">${esc(data.lastUpdatedLabel)}</time> &middot; ${data.clients.length} named clients: ${lwbCount} Legacy Wealth Blueprint, ${airbnbCount} short-term rental; ${videoCount} with a video interview on <a href="/reviews">/reviews</a></p>
                </div>
            </div>
        </section>

        <section class="section section--rule">
            <div class="container-custom">
                <div class="col">
                    ${renderToc(data)}

                    <div class="prose">
                        <h2 id="summary">Summary table</h2>
                        <p>One row per named client. The result column keeps the wording of the source, the timeline column is filled only where the source gives one, and the method column lists the strategies the client names. Scroll sideways on a phone.</p>
                    </div>
                    ${renderSummaryTable(data, videoIndex)}

                    <div class="prose">
                        <h2 id="programs">What the programs include</h2>
                        <p>${esc(data.programsInclude)}</p>
                    </div>

                    ${renderGroup(data.groups[0], data, videoIndex)}

                    ${renderGroup(data.groups[1], data, videoIndex)}

                    <div class="prose">
                        <h2 id="how-to-read">How to read these numbers</h2>
                        ${renderHowToRead(data.howToRead)}
                    </div>
                    <div class="callout">
                        <p class="callout__label">Disclaimer</p>
                        <p>Every result published is self-reported and individual. It is not typical and it is not a promise. Nothing on this page is tax, legal or investment advice; review your own situation with a qualified professional who can see all of it.</p>
                    </div>

                    <div class="prose">
                        ${renderWealthPlans(data.wealthPlans)}

                        ${renderVerification(data.verification)}

                        <h2 id="faq">Questions people ask</h2>
                    </div>
                    <div class="faq" itemscope itemtype="https://schema.org/FAQPage">
                        ${renderFaqItems(data.faq)}
                    </div>

                    <div class="cta">
                        <h2>Related reading</h2>
                        <ul>
                            ${renderRelated(data.related)}
                        </ul>
                        <p class="cta__actions">
                            <a href="${esc(data.cta.primaryHref)}" class="btn-primary" data-track-event="cta_clicked" data-track-label="Free Tax Strategy Masterclass" data-track-location="case_studies_hub" data-track-destination="${esc(data.cta.primaryHref)}">${esc(data.cta.primaryLabel)}</a>
                            <a href="${esc(data.cta.secondaryHref)}" class="btn-secondary">${esc(data.cta.secondaryLabel)}</a>
                        </p>
                    </div>
                    <p class="guide-note">Educational content only. Every figure above is one client's self-reported result from one interview or written note; results are individual, not typical, and not a promise. Program pricing is not published and is discussed on the strategy call.</p>
                </div>
            </div>
        </section>
    </main>

    ${renderSiteFooter()}

    <script defer src="/assets/js/main.js"></script>
</body>
</html>`;
}

function validateData(data) {
    const problems = [];
    if (!Array.isArray(data.clients) || data.clients.length === 0) problems.push('no clients in data');
    const ids = new Set();
    data.clients.forEach((client) => {
        ['id', 'group', 'name', 'headline', 'program', 'incomeType', 'startingSituation', 'result', 'timeline', 'slug', 'quote'].forEach((key) => {
            if (!client[key]) problems.push(`${client.name || client.id || '?'}: missing ${key}`);
        });
        ['methods', 'before', 'after', 'how'].forEach((key) => {
            if (!Array.isArray(client[key]) || client[key].length < 2) problems.push(`${client.name}: ${key} needs at least 2 bullets`);
        });
        if (ids.has(client.id)) problems.push(`duplicate client id ${client.id}`);
        ids.add(client.id);
        if (!fs.existsSync(path.join(ROOT_DIR, 'blog', `${client.slug}.html`))) {
            problems.push(`${client.name}: blog/${client.slug}.html does not exist`);
        }
        if (!data.groups.some((group) => group.id === client.group)) problems.push(`${client.name}: unknown group ${client.group}`);
    });
    (data.wealthPlans.items || []).forEach((item) => {
        if (!fs.existsSync(path.join(ROOT_DIR, 'blog', `${item.slug}.html`))) {
            problems.push(`wealth plan blog/${item.slug}.html does not exist`);
        }
    });
    if (data.description.length < 150 || data.description.length > 160) {
        problems.push(`meta description is ${data.description.length} chars; needs 150-160`);
    }
    if (data.title.length > 60) problems.push(`title before suffix is ${data.title.length} chars; keep it at 60 or under`);
    if (data.faq.length < 5) problems.push('need at least 5 FAQ items');
    return problems;
}

function validateHtml(html) {
    const problems = [];
    const hrefs = Array.from(html.matchAll(/href="([^"]+)"/g)).map((match) => match[1]);
    const internal = hrefs.filter((href) => href.startsWith('/') && !href.startsWith('//'));

    internal.forEach((href) => {
        const clean = href.split('#')[0];
        if (FORBIDDEN_PATH_PREFIXES.some((prefix) => clean === prefix.replace(/\/$/, '') || clean.startsWith(prefix))) {
            problems.push(`forbidden internal href ${href}`);
        }
        if (/\.html($|[?#])/.test(clean)) problems.push(`internal href uses .html: ${href}`);
        if (!hrefResolves(href)) problems.push(`internal href does not resolve: ${href}`);
    });

    hrefs.filter((href) => href.startsWith('#')).forEach((href) => {
        const id = href.slice(1);
        if (!new RegExp(`id="${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`).test(html)) {
            problems.push(`fragment link has no target: ${href}`);
        }
    });

    const h1Count = (html.match(/<h1[\s>]/g) || []).length;
    if (h1Count !== 1) problems.push(`expected exactly one <h1>, found ${h1Count}`);

    if (/\$\{|\{\{/.test(html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, ''))) {
        problems.push('unrendered template braces in output');
    }

    const blocks = Array.from(html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g));
    if (blocks.length === 0) problems.push('no JSON-LD block');
    blocks.forEach((block) => {
        try {
            JSON.parse(block[1]);
        } catch (error) {
            problems.push(`JSON-LD does not parse: ${error.message}`);
        }
    });

    return problems;
}

function main() {
    const data = readJson(DATA_PATH);
    const videos = readJson(VIDEOS_PATH);
    const videoIndex = buildVideoIndex(videos);

    const dataProblems = validateData(data);
    if (dataProblems.length) {
        dataProblems.forEach((problem) => console.error(`  - ${problem}`));
        fail(`${dataProblems.length} data problem(s) in ${path.relative(ROOT_DIR, DATA_PATH)}`);
    }

    const html = renderPage(data, videoIndex);
    const htmlProblems = validateHtml(html);
    if (htmlProblems.length) {
        htmlProblems.forEach((problem) => console.error(`  - ${problem}`));
        fail(`${htmlProblems.length} problem(s) in rendered HTML; nothing written`);
    }

    fs.writeFileSync(OUTPUT_PATH, html, 'utf8');
    const withVideo = data.clients.filter((client) => videoIndex.has(client.slug)).length;
    console.log(`Built ${path.relative(ROOT_DIR, OUTPUT_PATH)}: ${data.clients.length} clients (${withVideo} with a video interview), ${data.faq.length} FAQs, ${Buffer.byteLength(html, 'utf8')} bytes`);
}

main();
