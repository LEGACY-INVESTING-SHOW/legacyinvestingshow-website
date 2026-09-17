#!/usr/bin/env node

/**
 * Build the root-level "best of" commercial-intent guides from
 * data/best-of-pages.json.
 *
 * Output: <slug>.html at the repo root, served at /<slug> (cleanUrls).
 *
 * The page shell, CSS classes and JSON-LD shape mirror
 * scripts/build-compare-pages.js so the guides match the rest of the site.
 *
 * Guards (the build fails on any of them):
 *   - an internal href that does not resolve to a file on disk
 *   - a link to /success-stories, /pricing or /programs (all 301 to /reviews)
 *   - a link that ends in .html
 *   - a dollar figure within reach of a Legacy Investing Show program name
 *   - a FAQ list outside 6 to 8 questions
 *   - a meta description outside 150 to 160 characters
 */

const fs = require('fs');
const path = require('path');
const {
  renderAnalyticsBody,
  renderAnalyticsHead,
  renderHeadAssets,
  renderSiteFooter,
  renderSiteHeader,
  renderSourceBlock,
} = require('./lib/site-shell');

const ROOT_DIR = path.join(__dirname, '..');
const DATA_PATH = path.join(ROOT_DIR, 'data', 'best-of-pages.json');
const OUTPUT_DIR = ROOT_DIR;
const SITE_URL = 'https://www.legacyinvestingshow.com';
// og-image.jpg does not exist in this repo; og-home.jpg is the real file the
// build's social-image repair step falls back to for non-blog pages.
const OG_IMAGE = `${SITE_URL}/assets/images/og-home.jpg`;
const MASTERCLASS_URL = 'https://join.managemoney101.com/tax-strategies';

const GA_TRACKING_ID = process.env.GA_TRACKING_ID || 'G-2578PT1WSS';
const GTM_CONTAINER_ID = process.env.GTM_CONTAINER_ID || 'GTM-KQ4R2LKP';
const GOOGLE_SITE_VERIFICATIONS = [
  'Kec6RfGhFL-qG_8zKxCqt7yxjgy65WeDAftCBm90G2s',
  '92MoCnkdQOj_ey1lEafT5Mz-znCcCQ3UABZlI-JG_nM',
];

const REDIRECTED_PATHS = ['/success-stories', '/pricing', '/programs'];
const PROGRAM_NAMES = [
  'Legacy Wealth Blueprint',
  'Airbnb Ascension',
  'Airbnb Arbitrage Roadmap',
  'Arbitrage Roadmap',
  'STR Concierge',
  'Manage Money 101',
];

function readData() {
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
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
 * Inline markup: [label](/href) links and **bold** only. Everything else is
 * escaped. Keeps the JSON readable while letting prose carry links.
 */
function inline(str = '') {
  const escaped = esc(str);
  return escaped
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, href) => `<a href="${href}">${label}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

function plain(str = '') {
  return String(str)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1');
}

function buildSEOTitle(rawTitle) {
  const suffix = ' | Legacy Investing Show';
  const title = String(rawTitle || 'Guide').replace(/\s+/g, ' ').trim();
  return title.endsWith(suffix) ? title : title + suffix;
}

function paragraphs(items = []) {
  return (items || []).map((p) => `<p>${inline(p)}</p>`).join('\n');
}

function bullets(items = []) {
  return (items || [])
    .map((item) => {
      if (item && typeof item === 'object') {
        return `<li><strong>${inline(item.label)}</strong> ${inline(item.text)}</li>`;
      }
      return `<li>${inline(item)}</li>`;
    })
    .join('\n');
}

function calloutHtml(callout, modifier = '') {
  if (!callout) return '';
  const cls = modifier ? `callout ${modifier}` : 'callout';
  return `<div class="${cls}">
                        <p class="callout__label">${esc(callout.label)}</p>
                        ${paragraphs(callout.paragraphs || [callout.text])}
                    </div>`;
}

// ---- Section renderers ---------------------------------------------------

function renderProse(section) {
  const subs = (section.sub || [])
    .map(
      (sub) => `<h3>${inline(sub.h3)}</h3>
                        ${paragraphs(sub.paragraphs)}
                        ${sub.bullets ? `<ul>${bullets(sub.bullets)}</ul>` : ''}`
    )
    .join('\n');
  return `<div class="prose">
                        <h2 id="${esc(section.id)}">${inline(section.heading)}</h2>
                        ${paragraphs(section.paragraphs)}
                        ${section.bullets ? `<ul>${bullets(section.bullets)}</ul>` : ''}
                        ${subs}
                    </div>
                    ${calloutHtml(section.callout, section.calloutStyle)}`;
}

function renderList(section) {
  const tag = section.ordered ? 'ol' : 'ul';
  const cls = section.ordered ? ' class="steps"' : '';
  const items = (section.items || [])
    .map((item) => {
      if (item && typeof item === 'object') {
        return section.ordered
          ? `<li><h3 class="steps__title">${inline(item.label)}</h3><p>${inline(item.text)}</p></li>`
          : `<li><strong>${inline(item.label)}</strong> ${inline(item.text)}</li>`;
      }
      return section.ordered ? `<li><p>${inline(item)}</p></li>` : `<li>${inline(item)}</li>`;
    })
    .join('\n');
  return `<div class="prose">
                        <h2 id="${esc(section.id)}">${inline(section.heading)}</h2>
                        ${paragraphs(section.intro)}
                        ${section.ordered ? '' : `<ul>${items}</ul>`}
                    </div>
                    ${section.ordered ? `<${tag}${cls}>${items}</${tag}>` : ''}
                    <div class="prose">${paragraphs(section.outro)}</div>`;
}

function renderTable(section) {
  const numeric = new Set(section.numeric || []);
  const head = (section.columns || [])
    .map((c, i) => `<th scope="col"${numeric.has(i) ? ' class="num"' : ''}>${inline(c)}</th>`)
    .join('');
  const body = (section.rows || [])
    .map(
      (row) => `<tr>${row
        .map((cell, i) => `<td${numeric.has(i) ? ' class="num"' : ''}>${inline(cell)}</td>`)
        .join('')}</tr>`
    )
    .join('\n');
  const wide = section.wide === false ? '' : ' table-inset--wide';
  return `<div class="prose">
                        <h2 id="${esc(section.id)}">${inline(section.heading)}</h2>
                        ${paragraphs(section.intro)}
                    </div>
                    <div class="table-inset${wide}">
                        <table class="table--zebra">
                            ${section.caption ? `<caption>${inline(section.caption)}</caption>` : ''}
                            <thead><tr>${head}</tr></thead>
                            <tbody>
${body}
                            </tbody>
                        </table>
                    </div>
                    <div class="prose">${paragraphs(section.outro)}</div>`;
}

function renderRanked(section) {
  const items = (section.items || [])
    .map((item, index) => {
      const n = index + 1;
      const anchor = `${section.id}-${n}`;
      const block = (title, list) =>
        list && list.length ? `<h3>${esc(title)}</h3>\n<ul>${bullets(list)}</ul>` : '';
      return `<div class="prose">
                        <h2 id="${esc(anchor)}">${n}. ${inline(item.name)}</h2>
                        <p class="meta">Format: ${inline(item.format)}${item.href ? ` &middot; <a href="${esc(item.href)}">${esc(item.hrefLabel || 'Program page')}</a>` : ''}</p>
                        ${paragraphs(item.knownFor)}
                        ${block('Who it fits', item.fits)}
                        ${block('Who it does not fit', item.notFits)}
                        ${block('What to verify before buying', item.verify)}
                    </div>
                    ${item.disclosure ? calloutHtml({ label: 'Disclosure', paragraphs: item.disclosure }, 'callout--gold') : ''}`;
    })
    .join('\n');
  return `<div class="prose">
                        <h2 id="${esc(section.id)}">${inline(section.heading)}</h2>
                        ${paragraphs(section.intro)}
                    </div>
                    ${items}`;
}

function scorecardTotals(section) {
  const criteria = section.criteria || [];
  const weightSum = criteria.reduce((sum, c) => sum + c.weight, 0);
  if (weightSum !== 100) {
    throw new Error(`Scorecard weights must sum to 100 (got ${weightSum})`);
  }
  return (section.programs || [])
    .map((program) => {
      let total = 0;
      criteria.forEach((c) => {
        const score = program.scores[c.key];
        if (typeof score !== 'number' || score < 1 || score > 5) {
          throw new Error(`Score for ${program.name} / ${c.key} must be 1 to 5`);
        }
        total += (c.weight * score) / 5;
      });
      return { ...program, total: Math.round(total) };
    })
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

function renderScorecard(section) {
  const ranked = scorecardTotals(section);
  const criteria = section.criteria || [];
  const critRows = criteria
    .map(
      (c) => `<tr><td>${inline(c.name)}</td><td class="num">${c.weight}</td><td>${inline(c.text)}</td></tr>`
    )
    .join('\n');
  const head = criteria.map((c) => `<th scope="col" class="num">${esc(c.short || c.name)}</th>`).join('');
  const rows = ranked
    .map(
      (p, i) => `<tr><td>${i + 1}</td><td>${inline(p.name)}</td>${criteria
        .map((c) => `<td class="num">${p.scores[c.key]}</td>`)
        .join('')}<td class="num">${p.total}</td></tr>`
    )
    .join('\n');
  const notes = ranked
    .map((p) => `<li><strong>${inline(p.name)} (${p.total}).</strong> ${inline(p.notes)}</li>`)
    .join('\n');
  const alternatives = renderAlternatives(section);
  return `<div class="prose">
                        <h2 id="${esc(section.id)}">${inline(section.heading)}</h2>
                        ${paragraphs(section.intro)}
                        <h3>Criteria and weights</h3>
                    </div>
                    <div class="table-inset table-inset--wide">
                        <table class="table--zebra">
                            <caption>Each criterion is scored 1 to 5. Weighted total is out of 100.</caption>
                            <thead><tr><th scope="col">Criterion</th><th scope="col" class="num">Weight</th><th scope="col">What earns a 5</th></tr></thead>
                            <tbody>
${critRows}
                            </tbody>
                        </table>
                    </div>
                    <div class="prose">
                        <h3 id="${esc(section.id)}-table">${inline(section.tableHeading || 'Ranked results')}</h3>
                        ${paragraphs(section.tableIntro)}
                    </div>
                    <div class="table-inset table-inset--wide">
                        <table class="table--zebra">
                            <caption>${inline(section.caption || 'Weighted scores, highest first.')}</caption>
                            <thead><tr><th scope="col">Rank</th><th scope="col">Program</th>${head}<th scope="col" class="num">Total</th></tr></thead>
                            <tbody>
${rows}
                            </tbody>
                        </table>
                    </div>
                    <div class="prose">
                        <h3>Why each program scored the way it did</h3>
                        <ul>${notes}</ul>
                    </div>
                    ${alternatives}
                    <div class="prose">
                        ${paragraphs(section.outro)}
                    </div>`;
}

/**
 * Re-score the same programs under alternative weightings so the page can
 * show, with computed numbers, how much the order depends on the weights.
 */
function renderAlternatives(section) {
  const alternatives = section.alternatives || [];
  if (!alternatives.length) return '';
  const criteria = section.criteria || [];
  const rows = alternatives
    .map((alt) => {
      const weightSum = Object.values(alt.weights).reduce((s, w) => s + w, 0);
      if (weightSum !== 100) throw new Error(`Alternative weighting "${alt.label}" must sum to 100`);
      Object.keys(alt.weights).forEach((key) => {
        if (!criteria.some((c) => c.key === key)) throw new Error(`Unknown criterion "${key}" in alternative weighting`);
      });
      const scored = (section.programs || [])
        .map((p) => ({
          name: p.name,
          total: Math.round(
            Object.entries(alt.weights).reduce((sum, [key, weight]) => sum + (weight * p.scores[key]) / 5, 0)
          ),
        }))
        .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
      const top = scored.slice(0, 3).map((p) => `${plain(p.name)} (${p.total})`).join(', ');
      const highlightIndex = scored.findIndex((p) => p.name === section.highlight);
      const highlight = highlightIndex >= 0 ? `${highlightIndex + 1} of ${scored.length} (${scored[highlightIndex].total})` : 'n/a';
      return `<tr><td>${inline(alt.label)}</td><td>${esc(top)}</td><td>${esc(highlight)}</td></tr>`;
    })
    .join('\n');
  return `<div class="prose">
                        <h3 id="${esc(section.id)}-reweighted">${esc(section.alternativesHeading || 'The same scores under different weights')}</h3>
                        ${paragraphs(section.alternativesIntro)}
                    </div>
                    <div class="table-inset table-inset--wide">
                        <table class="table--zebra">
                            <caption>Computed from the scores above; only the weights change.</caption>
                            <thead><tr><th scope="col">Weighting</th><th scope="col">Top three</th><th scope="col">${esc(plain(section.highlight || ''))} position</th></tr></thead>
                            <tbody>
${rows}
                            </tbody>
                        </table>
                    </div>`;
}

function renderResults(section) {
  const items = (section.items || [])
    .map(
      (r) => `<li><strong>${inline(r.name)}.</strong> ${inline(r.result)}${r.href ? ` <a href="${esc(r.href)}">${esc(r.linkLabel || 'Read the case study')}</a>.` : ''}</li>`
    )
    .join('\n');
  return `<div class="prose">
                        <h2 id="${esc(section.id)}">${inline(section.heading)}</h2>
                        ${paragraphs(section.intro)}
                        <ul>${items}</ul>
                    </div>
                    ${section.note ? calloutHtml({ label: 'Read these the right way', paragraphs: [section.note] }, 'callout--warn') : ''}`;
}

function renderFit(section) {
  return `<div class="prose">
                        <h2 id="${esc(section.id)}">${inline(section.heading)}</h2>
                        ${paragraphs(section.paragraphs)}
                        ${section.fits ? `<h3>${esc(section.fitsHeading || 'Where it fits')}</h3><ul>${bullets(section.fits)}</ul>` : ''}
                        ${section.notFits ? `<h3>${esc(section.notFitsHeading || 'Where it does not fit')}</h3><ul>${bullets(section.notFits)}</ul>` : ''}
                        ${paragraphs(section.outro)}
                    </div>`;
}

function renderFailures(section) {
  const rows = (section.rows || [])
    .map((r) => `<tr><td>${inline(r.mode)}</td><td>${inline(r.fix)}</td></tr>`)
    .join('\n');
  return `<div class="prose">
                        <h2 id="${esc(section.id)}">${inline(section.heading)}</h2>
                        ${paragraphs(section.intro)}
                    </div>
                    <div class="table-inset table-inset--wide">
                        <table class="table--zebra">
                            <thead><tr><th scope="col">${esc(section.modeLabel || 'Failure mode')}</th><th scope="col">${esc(section.fixLabel || 'What a good program teaches instead')}</th></tr></thead>
                            <tbody>
${rows}
                            </tbody>
                        </table>
                    </div>
                    <div class="prose">${paragraphs(section.outro)}</div>`;
}

const RENDERERS = {
  prose: renderProse,
  list: renderList,
  table: renderTable,
  ranked: renderRanked,
  scorecard: renderScorecard,
  results: renderResults,
  fit: renderFit,
  failures: renderFailures,
};

function renderSection(section) {
  const fn = RENDERERS[section.type];
  if (!fn) throw new Error(`Unknown section type: ${section.type}`);
  return fn(section);
}

// ---- FAQ / related / schema ---------------------------------------------

function renderFaqItems(items = []) {
  return items
    .map(
      (item) => `<details class="faq__item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
                            <summary itemprop="name">${esc(item.q)}</summary>
                            <div class="faq__answer" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
                                <p itemprop="text">${inline(item.a)}</p>
                            </div>
                        </details>`
    )
    .join('\n');
}

function renderRelated(items = []) {
  return items
    .map((item) => `<li><a href="${esc(item.href)}">${esc(item.label)}</a>${item.note ? ` ${esc(item.note)}` : ''}</li>`)
    .join('\n');
}

function articleSchema(page, canonical) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: page.title,
    description: page.description,
    image: OG_IMAGE,
    author: {
      '@type': 'Person',
      name: 'Preston Seo',
      url: `${SITE_URL}/about/preston-seo`,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Legacy Investing Show',
      url: `${SITE_URL}/`,
    },
    datePublished: page.lastUpdated,
    dateModified: page.lastUpdated,
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
  };
}

function breadcrumbSchema(page, canonical) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: page.breadcrumbLabel || page.title, item: canonical },
    ],
  };
}

function faqSchema(page) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: (page.faq || []).map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: plain(item.a) },
    })),
  };
}

function itemListSchema(page, rankedItems, canonical) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: page.itemListName || page.title,
    url: canonical,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    numberOfItems: rankedItems.length,
    itemListElement: rankedItems.map((item, index) => {
      const entry = {
        '@type': 'ListItem',
        position: index + 1,
        name: plain(item.name),
        description: plain((item.knownFor || [])[0] || ''),
      };
      if (item.href && item.href.startsWith('/')) entry.url = `${SITE_URL}${item.href}`;
      return entry;
    }),
  };
}

/** renderSourceBlock still ships inline styles; guides.css owns the look. */
function plainSourceBlock(options) {
  return renderSourceBlock({ heading: 'Sources to check', ...options }).replace(/ style="[^"]*"/g, '');
}

// ---- Page ----------------------------------------------------------------

function resolveRankedOrder(page) {
  const ranked = page.sections.find((s) => s.type === 'ranked');
  const scorecard = page.sections.find((s) => s.type === 'scorecard');
  if (ranked && scorecard && ranked.orderFromScorecard) {
    const order = scorecardTotals(scorecard).map((p) => p.name);
    ranked.items.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
    ranked.items.forEach((item) => {
      if (!order.includes(item.name)) {
        throw new Error(`${page.slug}: ranked item "${item.name}" has no scorecard entry`);
      }
    });
  }
  return ranked ? ranked.items : [];
}

function renderPage(page) {
  const canonical = `${SITE_URL}/${page.slug}`;
  const rankedItems = resolveRankedOrder(page);
  const tocEntries = page.sections
    .map((s) => [s.id, s.tocLabel || plain(s.heading)])
    .concat([['faq', 'Questions people ask'], ['related', 'Related reading']]);
  const schemas = [
    articleSchema(page, canonical),
    breadcrumbSchema(page, canonical),
    itemListSchema(page, rankedItems, canonical),
    faqSchema(page),
  ];
  const evaluationMeta = page.evaluation
    ? ` &middot; Evaluation date: ${esc(page.evaluation.date)} &middot; Next review: ${esc(page.evaluation.nextReview)}`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>${esc(buildSEOTitle(page.title))}</title>
    <meta name="description" content="${esc(page.description)}">
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
<body class="guide-page" data-page-type="best_of" data-page-slug="${esc(page.slug)}" data-page-title="${esc(page.title)}">
    ${renderAnalyticsBody({ gtmContainerId: GTM_CONTAINER_ID })}
    <a href="#main" class="guide-skip">Skip to main content</a>

    ${renderSiteHeader(page.activeNav || '')}

    <main id="main">
        <section class="opener">
            <div class="container-custom">
                <div class="col">
                    <nav aria-label="Breadcrumb">
                        <ol class="breadcrumb">
                            <li class="breadcrumb__item"><a href="/" class="breadcrumb__link">Home</a></li>
                            <li class="breadcrumb__item"><span class="breadcrumb__current">${esc(page.breadcrumbLabel || page.title)}</span></li>
                        </ol>
                    </nav>
                    <h1 class="opener__title">${inline(page.h1 || page.title)}</h1>
                    <p class="opener__key">${inline(page.verdict)}</p>
                    <p class="opener__lede">${inline(page.lede)}</p>
                    <p class="meta">By <a href="/about/preston-seo">Preston Seo</a> &middot; Last updated: ${esc(page.lastUpdated)}${evaluationMeta}</p>
                    <div class="opener__actions">
                        <a href="${MASTERCLASS_URL}" class="btn-primary" data-track-event="cta_clicked" data-track-label="Free Tax Strategy Masterclass" data-track-location="best_of_hero" data-track-destination="${MASTERCLASS_URL}">Join the free tax masterclass</a>
                        <a href="/reviews" class="btn-secondary">See documented client results</a>
                    </div>
                </div>
            </div>
        </section>

        <section class="section section--rule">
            <div class="container-custom">
                <div class="col">
                    <details class="toc" open>
                        <summary>On this page</summary>
                        <ul>
${tocEntries.map(([id, label]) => `                            <li><a href="#${esc(id)}">${esc(label)}</a></li>`).join('\n')}
                        </ul>
                    </details>

                    ${page.sections.map(renderSection).join('\n\n                    ')}

                    <div class="prose">
                        <h2 id="faq">Questions people ask</h2>
                    </div>
                    <div class="faq" itemscope itemtype="https://schema.org/FAQPage">
                        ${renderFaqItems(page.faq || [])}
                    </div>

                    ${plainSourceBlock({ title: page.title, slug: page.slug, type: page.sourceType || 'guide' })}

                    <div class="do">
                        <p class="do__label">Do this next</p>
                        <ul>
                            ${bullets(page.next || [])}
                        </ul>
                    </div>

                    <div class="cta">
                        <h2 id="related">Related reading</h2>
                        <ul>
                            ${renderRelated(page.related || [])}
                        </ul>
                        <p>${inline(page.ctaText || 'The free masterclass walks through the strategies these programs teach, live, with a Q&A. Nothing to buy to attend. Pricing for any Legacy Investing Show program is discussed on a strategy call and is not published.')}</p>
                        <p class="cta__actions">
                            <a href="${MASTERCLASS_URL}" class="btn-primary" data-track-event="cta_clicked" data-track-label="Free Tax Strategy Masterclass" data-track-location="best_of_footer" data-track-destination="${MASTERCLASS_URL}">Register for the masterclass</a>
                            <a href="/reviews" class="btn-secondary">Read client reviews</a>
                        </p>
                    </div>
                    <p class="guide-note">${inline(page.disclaimer)}</p>
                </div>
            </div>
        </section>
    </main>

    ${renderSiteFooter()}

    <script defer src="/assets/js/main.js"></script>
</body>
</html>`;
}

// ---- Guards --------------------------------------------------------------

function resolvesOnDisk(href, builtSlugs) {
  const clean = href.replace(/[#?].*$/, '').replace(/^\/+/, '').replace(/\/+$/, '');
  // The four guides link to one another, so a sibling slug from this data
  // file counts as resolvable even on the first build.
  if (builtSlugs.has(clean)) return true;
  const candidates = clean ? [clean, `${clean}.html`, path.join(clean, 'index.html')] : ['index.html'];
  return candidates.some((c) => fs.existsSync(path.join(ROOT_DIR, c)));
}

function validate(page, html, builtSlugs) {
  const problems = [];

  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  hrefs.forEach((href) => {
    if (href.startsWith('/') && !href.startsWith('//')) {
      if (/\.html(\?|#|$)/.test(href)) problems.push(`.html href: ${href}`);
      const bare = href.replace(/[#?].*$/, '').replace(/\/$/, '');
      if (REDIRECTED_PATHS.includes(bare)) problems.push(`redirected href: ${href}`);
      if (!href.startsWith('/assets/') && href !== '/favicon.ico' && !resolvesOnDisk(href, builtSlugs)) {
        problems.push(`unresolved href: ${href}`);
      }
    }
  });

  const text = html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  PROGRAM_NAMES.forEach((name) => {
    const re = new RegExp(`${name}[^.]{0,160}\\$\\s?\\d|\\$\\s?\\d[^.]{0,160}${name}`, 'g');
    const hits = text.match(re) || [];
    hits.forEach((hit) => problems.push(`dollar figure near "${name}": ${hit.slice(0, 140)}`));
  });

  const faqCount = (page.faq || []).length;
  if (faqCount < 6 || faqCount > 8) problems.push(`FAQ count ${faqCount} (want 6 to 8)`);

  const descLength = page.description.length;
  if (descLength < 150 || descLength > 160) problems.push(`meta description is ${descLength} chars (want 150 to 160)`);

  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) problems.push(`${h1s} h1 elements`);

  for (const block of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(block[1]);
    } catch (error) {
      problems.push(`JSON-LD does not parse: ${error.message}`);
    }
  }

  if (/\{\{|\}\}|\$\{/.test(text)) problems.push('template braces leaked into output');

  return problems;
}

function main() {
  const pages = readData();
  const builtSlugs = new Set(pages.map((page) => page.slug));
  let failed = false;

  pages.forEach((page) => {
    const html = renderPage(page);
    const problems = validate(page, html, builtSlugs);
    if (problems.length) {
      failed = true;
      console.error(`\n${page.slug}.html has ${problems.length} problem(s):`);
      problems.forEach((p) => console.error(`  - ${p}`));
      return;
    }
    fs.writeFileSync(path.join(OUTPUT_DIR, `${page.slug}.html`), html, 'utf8');
    console.log(`Built ${page.slug}.html`);
  });

  if (failed) process.exit(1);
}

main();
