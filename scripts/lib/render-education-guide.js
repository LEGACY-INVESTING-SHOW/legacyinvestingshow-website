'use strict';

const {
    renderAnalyticsBody,
    renderAnalyticsHead,
    renderHeadAssets,
    renderSiteFooter,
    renderSiteHeader,
} = require('./site-shell');

const SITE_URL = 'https://www.legacyinvestingshow.com';
const OG_IMAGE = `${SITE_URL}/assets/images/og-image.jpg`;
const GA_TRACKING_ID = process.env.GA_TRACKING_ID || 'G-2578PT1WSS';
const GTM_CONTAINER_ID = process.env.GTM_CONTAINER_ID || 'GTM-KQ4R2LKP';
const GOOGLE_SITE_VERIFICATIONS = [
    'Kec6RfGhFL-qG_8zKxCqt7yxjgy65WeDAftCBm90G2s',
    '92MoCnkdQOj_ey1lEafT5Mz-znCcCQ3UABZlI-JG_nM',
];

const TYPE_LABELS = {
    alternatives: 'Alternatives',
    vs: 'Side by side',
    'best-for': 'Best for',
    review: 'What to know',
    checklist: 'Checklist',
    decision: 'Decision guide',
};

function esc(str = '') {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function rich(str = '') {
    const source = String(str || '');
    const parts = [];
    const re = /\[([^\]]+)\]\(([^)]+)\)/g;
    let last = 0;
    let match;
    while ((match = re.exec(source))) {
        parts.push(esc(source.slice(last, match.index)));
        const href = match[2];
        const label = esc(match[1]);
        const external = /^https?:\/\//i.test(href);
        const attrs = external ? ' rel="noopener noreferrer" target="_blank"' : '';
        parts.push(`<a href="${esc(href)}"${attrs}>${label}</a>`);
        last = match.index + match[0].length;
    }
    parts.push(esc(source.slice(last)));
    return parts.join('');
}

function buildSEOTitle(rawTitle) {
    const suffix = ' | Legacy Investing Show';
    const title = String(rawTitle || 'Compare').replace(/\s+/g, ' ').trim() || 'Compare';
    return title.endsWith(suffix) ? title : title + suffix;
}

function formatLongDate(iso) {
    const date = new Date(`${iso}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return iso;
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
    }).format(date);
}

function tocItems(page) {
    const items = [
        ['how-we-chose', 'How we chose'],
        ...page.blocks.map((block) => [block.id, block.heading]).filter((entry) => entry[0] && entry[1]),
        ['who-it-fits', 'Who it fits'],
        ['cost', 'Cost'],
        ['questions-before-buying', 'Questions before you buy'],
    ];
    if (page.faqs && page.faqs.length) {
        items.push(['faq', 'Questions']);
    }
    items.push(['sources', 'Sources']);
    return items;
}

function renderList(items = [], className) {
    if (!items.length) return '';
    const cls = className ? ` class="${className}"` : '';
    return `<ul${cls}>
${items.map((item) => `                            <li>${rich(item)}</li>`).join('\n')}
                        </ul>`;
}

function renderParagraphs(paragraphs = []) {
    return paragraphs.map((p) => `                        <p>${rich(p)}</p>`).join('\n');
}

function renderTable(block) {
    const headers = block.headers || [];
    const rows = block.rows || [];
    const wide = block.wide ? ' table-inset--wide' : '';
    const zebra = rows.length > 4 ? ' class="table--zebra"' : '';
    const head = headers
        .map((h, i) => {
            const num = i === headers.length - 1 && /cost|price|as of/i.test(h) ? ' class="num"' : '';
            return `<th scope="col"${num}>${esc(h)}</th>`;
        })
        .join('');
    const body = rows
        .map((row) => {
                const cells = row
                .map((cell, i) => {
                    const num = i === row.length - 1 && headers[i] && /cost|price|as of/i.test(headers[i])
                        ? ' class="num"'
                        : '';
                    if (i === 0) return `<th scope="row">${rich(cell)}</th>`;
                    return `<td${num}>${rich(cell)}</td>`;
                })
                .join('');
            return `                                <tr>${cells}</tr>`;
        })
        .join('\n');
    return `                    <div class="table-inset${wide}">
                        <table${zebra}>
                            <caption>${esc(block.caption || block.heading)}</caption>
                            <thead>
                                <tr>${head}</tr>
                            </thead>
                            <tbody>
${body}
                            </tbody>
                        </table>
                    </div>`;
}

function renderOptions(block) {
    const items = (block.items || [])
        .map(
            (item) => `                        <li>
                            <p class="list-rows__title">${rich(item.name)}</p>
                            <p class="list-rows__desc">${rich(item.summary)}</p>
                            ${item.meta ? `<p class="list-rows__meta">${esc(item.meta)}</p>` : ''}
                        </li>`
        )
        .join('\n');
    return `                    <ul class="list-rows">
${items}
                    </ul>`;
}

function renderBlock(block) {
    const heading = block.heading
        ? `                        <h2 id="${esc(block.id)}">${esc(block.heading)}</h2>`
        : '';
    const intro = block.intro ? `                        <p>${rich(block.intro)}</p>` : '';
    if (block.type === 'table') {
        return `                    <div class="prose">
${heading}
${intro}
                    </div>
${renderTable(block)}`;
    }
    if (block.type === 'options') {
        return `                    <div class="prose">
${heading}
${intro}
                    </div>
${renderOptions(block)}`;
    }
    if (block.type === 'steps') {
        const steps = (block.items || [])
            .map((item) => `                        <li><p>${rich(item)}</p></li>`)
            .join('\n');
        return `                    <div class="prose">
${heading}
${intro}
                    </div>
                    <ol class="steps">
${steps}
                    </ol>`;
    }
    if (block.type === 'check') {
        return `                    <div class="prose">
${heading}
${intro}
                    </div>
                    ${renderList(block.items, 'check')}`;
    }
    if (block.type === 'callout') {
        const variant = block.variant === 'warn' ? ' callout--warn' : ' callout--gold';
        return `                    <div class="callout${variant}">
                        <p class="callout__label">${esc(block.label || 'Note')}</p>
${renderParagraphs(block.paragraphs || [])}
                    </div>`;
    }
    return `                    <div class="prose">
${heading}
${intro}
${renderParagraphs(block.paragraphs || [])}
${block.bullets && block.bullets.length ? renderList(block.bullets) : ''}
                    </div>`;
}

function articleSchema(page, meta) {
    return {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: page.title,
        description: page.description,
        author: {
            '@type': 'Person',
            name: meta.author,
            url: `${SITE_URL}/about/preston-seo`,
        },
        publisher: {
            '@type': 'Organization',
            name: 'Legacy Investing Show',
            url: SITE_URL,
        },
        datePublished: page.published,
        dateModified: page.updated,
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': `${SITE_URL}/compare/${page.slug}`,
        },
    };
}

function faqSchema(page) {
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: (page.faqs || []).map((item) => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: {
                '@type': 'Answer',
                text: item.a.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1'),
            },
        })),
    };
}

function breadcrumbSchema(page) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
            { '@type': 'ListItem', position: 2, name: 'Compare', item: `${SITE_URL}/compare` },
            {
                '@type': 'ListItem',
                position: 3,
                name: page.title,
                item: `${SITE_URL}/compare/${page.slug}`,
            },
        ],
    };
}

function renderEducationPage(page, meta) {
    const canonical = `${SITE_URL}/compare/${page.slug}`;
    const published = page.published || meta.published;
    const updated = page.updated || meta.updated;
    const faqs = page.faqs || [];
    const schemas = [articleSchema(page, meta), breadcrumbSchema(page)];
    if (faqs.length) schemas.push(faqSchema(page));
    const toc = tocItems(page);
    const typeLabel = TYPE_LABELS[page.type] || 'Guide';

    const costRows = (page.costRows || []).map((row) => [
        row.name,
        row.price,
        row.asOf,
        row.sourceUrl ? `[${row.sourceLabel}](${row.sourceUrl})` : row.sourceLabel,
    ]);

    const sourceList = (page.sources || [])
        .map((source) => {
            const asOf = source.asOf ? ` Checked ${source.asOf}.` : '';
            const note = source.note ? ` ${source.note}` : '';
            if (source.url) {
                return `[${source.label}](${source.url}).${asOf}${note}`;
            }
            return `${source.label}.${asOf}${note}`;
        });

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>${esc(buildSEOTitle(page.title))}</title>
    <meta name="description" content="${esc(page.description)}">
    <meta name="author" content="${esc(meta.author)}">
    <meta name="robots" content="index, follow">
${GOOGLE_SITE_VERIFICATIONS.map((code) => `    <meta name="google-site-verification" content="${code}">`).join('\n')}
    <link rel="canonical" href="${canonical}">

    <meta property="og:type" content="article">
    <meta property="og:url" content="${canonical}">
    <meta property="og:title" content="${esc(page.title)}">
    <meta property="og:description" content="${esc(page.description)}">
    <meta property="og:image" content="${OG_IMAGE}">
    <meta property="og:site_name" content="Legacy Investing Show">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(page.title)}">
    <meta name="twitter:description" content="${esc(page.description)}">
    <meta name="twitter:image" content="${OG_IMAGE}">

    <meta name="theme-color" content="#FBF8F1">
    <link rel="icon" href="/favicon.ico" sizes="32x32">
    ${renderHeadAssets()}
    <link rel="stylesheet" href="/assets/css/guides.css">

${schemas.map((entry) => `    <script type="application/ld+json">${JSON.stringify(entry)}</script>`).join('\n')}

    ${renderAnalyticsHead({ gaTrackingId: GA_TRACKING_ID, gtmContainerId: GTM_CONTAINER_ID })}
</head>
<body class="guide-page" data-page-type="education_compare" data-page-kind="${esc(page.type)}" data-page-slug="${esc(page.slug)}" data-page-title="${esc(page.title)}">
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
                            <li class="breadcrumb__item"><a href="/compare" class="breadcrumb__link">Compare</a></li>
                            <li class="breadcrumb__item"><span class="breadcrumb__current">${esc(page.title)}</span></li>
                        </ol>
                    </nav>
                    <p class="label">${esc(typeLabel)}</p>
                    <h1 class="opener__title">${esc(page.h1 || page.title)}</h1>
                    <p class="opener__key">${esc(page.keyLine)}</p>
                    <p class="opener__lede">${rich(page.answer)}</p>
                    <p class="guide-byline">By <a href="/about/preston-seo">${esc(meta.author)}</a>, ${esc(meta.authorRole)}. Updated ${esc(formatLongDate(updated))}. First published ${esc(formatLongDate(published))}.</p>
                </div>
            </div>
        </section>

        <section class="section section--rule">
            <div class="container-custom">
                <div class="col">
                    <details class="toc" open>
                        <summary>On this page</summary>
                        <ul>
${toc.map(([id, label]) => `                            <li><a href="#${id}">${esc(label)}</a></li>`).join('\n')}
                        </ul>
                    </details>

                    <div class="callout callout--gold">
                        <p class="callout__label">Who wrote this</p>
                        <p>${rich(meta.disclosure)}</p>
                    </div>

                    <div class="prose">
                        <h2 id="how-we-chose">How we chose</h2>
                        <p>${rich(page.criteriaIntro || meta.criteriaIntro)}</p>
                    </div>
                    ${renderList(page.criteria || meta.criteria)}

${page.blocks.map(renderBlock).join('\n\n')}

                    <div class="prose">
                        <h2 id="who-it-fits">Who it fits, and who should skip it</h2>
                        <h3>This page is useful if</h3>
                    </div>
                    ${renderList(page.whoFits)}
                    <div class="prose">
                        <h3>Skip this path if</h3>
                    </div>
                    ${renderList(page.whoSkips)}

                    <div class="prose">
                        <h2 id="cost">What it costs, from public pages</h2>
                        <p>${rich(page.costIntro)}</p>
                    </div>
${renderTable({
        heading: 'Published prices we could confirm',
        caption: page.costCaption || 'Prices from seller pages we opened. If a seller hides the price, we say so.',
        wide: true,
        headers: ['Offer', 'Published price', 'As of', 'Source'],
        rows: costRows,
    })}

                    <div class="prose">
                        <h2 id="questions-before-buying">Questions to ask before you pay</h2>
                        <p>Get the answers in writing. A good seller can wait a day.</p>
                    </div>
                    ${renderList(page.questionsBeforeBuying, 'check')}

                    ${faqs.length ? `<div class="prose">
                        <h2 id="faq">Questions people ask</h2>
                    </div>
                    <div class="faq" itemscope itemtype="https://schema.org/FAQPage">
${faqs
        .map(
            (item) => `                        <details class="faq__item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
                            <summary itemprop="name">${esc(item.q)}</summary>
                            <div class="faq__answer" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
                                <p itemprop="text">${rich(item.a)}</p>
                            </div>
                        </details>`
        )
        .join('\n')}
                    </div>` : ''}

                    <section class="source-note" aria-label="Sources" id="sources">
                        <h2>Sources</h2>
                        <p>We opened these pages while writing. Prices and terms change. Check the live page before you buy.</p>
                        <ul>
${sourceList.map((item) => `                            <li>${rich(item)}</li>`).join('\n')}
                        </ul>
                    </section>

                    <div class="do">
                        <p class="do__label">Do this next</p>
                        ${renderList(page.nextSteps)}
                    </div>

                    <div class="cta">
                        <h2>${esc(page.cta.title)}</h2>
                        <p>${rich(page.cta.body)}</p>
                        <ul>
${(page.related || []).map((item) => `                            <li><a href="${esc(item.href)}">${esc(item.label)}</a></li>`).join('\n')}
                        </ul>
                        <p class="cta__actions">
                            <a href="${esc(page.cta.primaryHref)}" class="btn-primary">${esc(page.cta.primaryLabel)}</a>
                            <a href="${esc(page.cta.secondaryHref)}" class="btn-secondary">${esc(page.cta.secondaryLabel)}</a>
                        </p>
                    </div>
                    <p class="guide-note">${rich(meta.legal)}</p>
                </div>
            </div>
        </section>
    </main>

    ${renderSiteFooter()}

    <script defer src="/assets/js/main.js"></script>
</body>
</html>`;
}

module.exports = {
    TYPE_LABELS,
    buildSEOTitle,
    renderEducationPage,
    rich,
};
