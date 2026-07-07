#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  CURRENT_YEAR,
  renderAnalyticsBody,
  renderAnalyticsHead,
  renderFooterLinks,
  renderPrimaryNavLinks,
  renderSourceBlock,
} = require('./lib/site-shell');

const ROOT_DIR = path.join(__dirname, '..');
const DATA_PATH = path.join(ROOT_DIR, 'data', 'worksheets.json');
const OUTPUT_DIR = path.join(ROOT_DIR, 'worksheets');

const GA_TRACKING_ID = process.env.GA_TRACKING_ID || 'G-2578PT1WSS';
const GTM_CONTAINER_ID = process.env.GTM_CONTAINER_ID || 'GTM-KQ4R2LKP';
const GOOGLE_SITE_VERIFICATIONS = [
  'Kec6RfGhFL-qG_8zKxCqt7yxjgy65WeDAftCBm90G2s',
  '92MoCnkdQOj_ey1lEafT5Mz-znCcCQ3UABZlI-JG_nM',
];

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

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

function buildSEOTitle(rawTitle) {
  const suffix = ' | Legacy Investing Show';
  const title = String(rawTitle || '').trim();
  const maxLen = 60;

  if ((title + suffix).length <= maxLen) return title + suffix;
  const budget = maxLen - suffix.length - 1;
  if (budget > 30) return `${title.slice(0, budget).trimEnd()}…${suffix}`;
  return `${title.slice(0, maxLen - 1).trimEnd()}…`;
}

function renderParagraphs(paragraphs = []) {
  if (!Array.isArray(paragraphs) || paragraphs.length === 0) return '';
  return paragraphs.map((p) => `<p>${esc(p)}</p>`).join('\n');
}

function renderBullets(items = []) {
  if (!Array.isArray(items) || items.length === 0) return '';
  return items.map((item) => `<li>${esc(item)}</li>`).join('\n');
}

function renderFaqItems(items = []) {
  return items
    .map(
      (item, idx) => `<div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
                        <button class="faq-question" aria-expanded="${idx === 0 ? 'true' : 'false'}" aria-controls="faq-answer-${idx}">
                            <span itemprop="name">${esc(item.q)}</span>
                            <svg class="faq-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6 9 12 15 18 9"/>
                            </svg>
                        </button>
                        <div class="faq-answer ${idx === 0 ? 'faq-answer--open' : ''}" id="faq-answer-${idx}" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
                            <p itemprop="text">${esc(item.a)}</p>
                        </div>
                    </div>`
    )
    .join('\n');
}

function worksheetKeywords(worksheet) {
  const values = [
    worksheet.title,
    worksheet.badge,
    worksheet.description,
    ...(worksheet.related || []).map((item) => item.label),
    ...(worksheet.fieldGroups || []).map((group) => group.title),
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(/[,|]/))
    .map((value) => value.trim())
    .filter(Boolean);

  return [...new Set(values)].slice(0, 12).join(', ');
}

function faqSchema(worksheet) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: (worksheet.faq || []).map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };
}

function worksheetSchema(worksheet, isoDate) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: worksheet.title,
    description: worksheet.description,
    learningResourceType: 'Worksheet',
    isAccessibleForFree: true,
    datePublished: isoDate,
    dateModified: isoDate,
    url: `https://www.legacyinvestingshow.com/worksheets/${worksheet.slug}`,
    keywords: worksheetKeywords(worksheet),
    publisher: {
      '@type': 'Organization',
      name: 'Legacy Investing Show',
    },
    author: {
      '@type': 'Person',
      name: 'Preston Seo',
    },
  };
}

function breadcrumbSchema(worksheet) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://www.legacyinvestingshow.com/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Worksheets',
        item: 'https://www.legacyinvestingshow.com/worksheets',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: worksheet.title,
        item: `https://www.legacyinvestingshow.com/worksheets/${worksheet.slug}`,
      },
    ],
  };
}

function worksheetIndexSchema(worksheets, isoDate) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Execution Worksheets',
    description: 'Printable and fillable worksheets for tax, retirement, and documentation decisions.',
    datePublished: isoDate,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: worksheets.map((worksheet, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `https://www.legacyinvestingshow.com/worksheets/${worksheet.slug}`,
        name: worksheet.title,
      })),
    },
  };
}

function renderRelated(items = []) {
  if (!Array.isArray(items) || items.length === 0) return '';
  return items
    .map((item) => `<article class="related-card">
                      <h3 class="related-card__title">${esc(item.label)}</h3>
                      <a class="related-card__cta" href="${esc(item.href)}">Open resource</a>
                    </article>`)
    .join('\n');
}

function renderWorksheetFields(groups = []) {
  return groups
    .map((group) => `<section class="worksheet-panel">
        <div class="worksheet-panel__header">
          <h2 class="worksheet-panel__title">${esc(group.title)}</h2>
          <p class="worksheet-panel__hint">${esc(group.hint || '')}</p>
        </div>
        <div class="worksheet-fields">
          ${(group.fields || []).map((field) => {
            const inputMarkup = field.type === 'textarea'
              ? `<textarea id="${esc(field.key)}" data-field-key="${esc(field.key)}" rows="4" placeholder="${esc(field.placeholder || '')}"></textarea>`
              : `<input id="${esc(field.key)}" data-field-key="${esc(field.key)}" type="text" placeholder="${esc(field.placeholder || '')}">`;
            return `<div class="worksheet-field">
                      <label for="${esc(field.key)}">${esc(field.label)}</label>
                      ${inputMarkup}
                    </div>`;
          }).join('\n')}
        </div>
      </section>`)
    .join('\n');
}

function renderWorksheetPage(worksheet) {
  const isoDate = new Date().toISOString().split('T')[0];
  const canonical = `https://www.legacyinvestingshow.com/worksheets/${worksheet.slug}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>${esc(buildSEOTitle(worksheet.title))}</title>
    <meta name="description" content="${esc(worksheet.description)}">
    <meta name="keywords" content="${esc(worksheetKeywords(worksheet))}">
    <meta name="robots" content="index, follow">
${GOOGLE_SITE_VERIFICATIONS.map((code) => `    <meta name="google-site-verification" content="${code}">`).join('\n')}
    <link rel="canonical" href="${canonical}">

    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonical}">
    <meta property="og:title" content="${esc(worksheet.title)}">
    <meta property="og:description" content="${esc(worksheet.description)}">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(worksheet.title)}">
    <meta name="twitter:description" content="${esc(worksheet.description)}">

    <meta name="theme-color" content="#ffffff">
    <link rel="icon" type="image/png" href="/assets/images/logo.png">
    <link rel="stylesheet" href="/assets/css/styles.css">

    <script type="application/ld+json">${JSON.stringify(worksheetSchema(worksheet, isoDate))}</script>
    <script type="application/ld+json">${JSON.stringify(breadcrumbSchema(worksheet))}</script>
    <script type="application/ld+json">${JSON.stringify(faqSchema(worksheet))}</script>

    ${renderAnalyticsHead({ gaTrackingId: GA_TRACKING_ID, gtmContainerId: GTM_CONTAINER_ID })}

    <style>
      .worksheet-hero {
        padding: 8rem 0 3rem;
        background:
          radial-gradient(circle at top right, rgba(201, 169, 97, 0.18), transparent 36%),
          linear-gradient(180deg, #faf7f2 0%, #ffffff 100%);
      }
      .worksheet-hero__grid {
        display: grid;
        gap: 1.25rem;
        align-items: start;
      }
      @media (min-width: 1024px) {
        .worksheet-hero__grid {
          grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.8fr);
        }
      }
      .worksheet-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: #111827;
        color: white;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        border-radius: 999px;
        margin-bottom: 1rem;
      }
      .worksheet-title {
        font-size: clamp(2.25rem, 5vw, 4.2rem);
        font-weight: 700;
        line-height: 0.98;
        letter-spacing: -0.04em;
        color: #111827;
        margin-bottom: 0.95rem;
        max-width: 12ch;
      }
      .worksheet-subtitle {
        max-width: 46rem;
        color: #475569;
        font-size: 1.08rem;
        line-height: 1.78;
      }
      .worksheet-hero__panel {
        padding: 1.25rem;
        border-radius: 1.25rem;
        background: linear-gradient(160deg, #182234, #0f172a);
        color: white;
        box-shadow: 0 22px 54px rgba(15, 23, 42, 0.18);
      }
      .worksheet-hero__panel h2 {
        color: white;
        font-size: 1.45rem;
        line-height: 1.1;
        margin: 0 0 0.75rem;
      }
      .worksheet-hero__panel p {
        margin: 0;
        color: #cbd5e1;
        line-height: 1.72;
      }
      .worksheet-summary-grid {
        display: grid;
        gap: 0.95rem;
        margin-top: 1.35rem;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      }
      .worksheet-summary-card {
        padding: 1rem 1.05rem;
        border-radius: 1rem;
        background: rgba(255, 255, 255, 0.92);
        border: 1px solid rgba(15, 23, 42, 0.08);
        box-shadow: 0 16px 36px rgba(15, 23, 42, 0.05);
      }
      .worksheet-summary-card__eyebrow {
        margin: 0 0 0.45rem;
        color: #b8933f;
        font-size: 0.74rem;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }
      .worksheet-summary-card p {
        margin: 0;
        color: #334155;
        font-size: 0.95rem;
        line-height: 1.68;
      }
      .worksheet-section {
        padding: 0 0 3.25rem;
      }
      .worksheet-shell {
        padding: 1.45rem;
        border-radius: 1.5rem;
        background: rgba(255, 255, 255, 0.96);
        border: 1px solid rgba(15, 23, 42, 0.08);
        box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
      }
      .worksheet-copy h2 {
        color: #111827;
        font-size: 1.5rem;
        line-height: 1.12;
        margin-bottom: 0.85rem;
      }
      .worksheet-copy p,
      .worksheet-copy li {
        color: #475569;
        line-height: 1.72;
      }
      .worksheet-copy ul {
        padding-left: 1.2rem;
      }
      .worksheet-stack {
        display: grid;
        gap: 1rem;
        margin-top: 1.5rem;
      }
      .worksheet-panel {
        border: 1px solid rgba(15, 23, 42, 0.08);
        border-radius: 1.1rem;
        background: linear-gradient(180deg, rgba(250, 247, 242, 0.7), rgba(255, 255, 255, 0.94));
        padding: 1rem;
      }
      .worksheet-panel__title {
        margin: 0 0 0.35rem;
        font-size: 1.15rem;
        color: #111827;
      }
      .worksheet-panel__hint {
        margin: 0 0 0.85rem;
        color: #64748b;
        font-size: 0.9rem;
        line-height: 1.6;
      }
      .worksheet-fields {
        display: grid;
        gap: 0.85rem;
      }
      .worksheet-field label {
        display: block;
        margin-bottom: 0.35rem;
        color: #111827;
        font-weight: 700;
        font-size: 0.92rem;
      }
      .worksheet-field input,
      .worksheet-field textarea {
        width: 100%;
        border: 1px solid #d1d5db;
        border-radius: 0.75rem;
        padding: 0.75rem 0.85rem;
        background: white;
        color: #111827;
        font-size: 0.95rem;
      }
      .worksheet-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.7rem;
        margin-top: 1rem;
      }
      .worksheet-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.78rem 1rem;
        border-radius: 0.75rem;
        border: none;
        font-weight: 700;
        cursor: pointer;
        text-decoration: none;
      }
      .worksheet-button--primary {
        background: #111827;
        color: white;
      }
      .worksheet-button--ghost {
        background: white;
        border: 1px solid #d1d5db;
        color: #111827;
      }
      .worksheet-status {
        margin-top: 0.9rem;
        padding: 0.85rem 0.95rem;
        border-radius: 0.75rem;
        background: #eff6ff;
        color: #1e3a8a;
        font-size: 0.92rem;
        line-height: 1.6;
      }
      .worksheet-grid {
        display: grid;
        gap: 1rem;
        margin-top: 1.5rem;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      }
      .worksheet-mini-card {
        border: 1px solid rgba(15, 23, 42, 0.08);
        border-radius: 1rem;
        background: white;
        padding: 1rem;
      }
      .worksheet-mini-card h3 {
        margin: 0 0 0.65rem;
        color: #111827;
        font-size: 1.05rem;
      }
      .related-section {
        margin-top: 1.75rem;
        padding-top: 1.25rem;
        border-top: 1px solid #e5e7eb;
      }
      .related-grid {
        display: grid;
        gap: 0.85rem;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      }
      .related-card {
        background: white;
        border: 1px solid rgba(15, 23, 42, 0.08);
        border-radius: 1rem;
        padding: 1rem;
      }
      .related-card__title {
        margin: 0 0 0.7rem;
        color: #111827;
        font-size: 0.98rem;
        line-height: 1.35;
      }
      .related-card__cta {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.62rem 0.9rem;
        background: #111827;
        color: white;
        border-radius: 0.7rem;
        text-decoration: none;
        font-weight: 800;
      }
      .faq-section {
        background: #f9fafb;
        padding: 3.5rem 0;
      }
      .faq-section__title {
        font-size: 1.7rem;
        font-weight: 800;
        color: #111827;
        margin-bottom: 1.75rem;
        text-align: center;
      }
      .faq-list {
        max-width: 52rem;
        margin: 0 auto;
      }
      .faq-item {
        background: white;
        border-radius: 0.75rem;
        margin-bottom: 0.9rem;
        overflow: hidden;
        border: 1px solid #e5e7eb;
      }
      .faq-question {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.1rem;
        background: none;
        border: none;
        cursor: pointer;
        text-align: left;
        color: #111827;
        font-size: 0.98rem;
        font-weight: 700;
      }
      .faq-chevron { width: 1.2rem; height: 1.2rem; color: #9ca3af; transition: transform 0.2s; }
      .faq-question[aria-expanded="true"] .faq-chevron { transform: rotate(180deg); }
      .faq-answer { display: none; padding: 0 1.1rem 1.1rem; color: #4b5563; line-height: 1.65; }
      .faq-answer--open { display: block; }
      .cta-section {
        padding: 3.5rem 0;
        text-align: center;
      }
      .cta-card {
        background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
        border-radius: 1rem;
        padding: 2.5rem 1.5rem;
        color: white;
      }
      .cta-card__title {
        font-size: 1.7rem;
        font-weight: 800;
        color: #ffffff;
        margin-bottom: 0.85rem;
      }
      .cta-card__text {
        color: #d1d5db;
        max-width: 46rem;
        margin: 0 auto 1.4rem;
      }
      .cta-card__button {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.85rem 1.6rem;
        background: #10b981;
        color: white;
        border-radius: 0.5rem;
        font-weight: 700;
        text-decoration: none;
      }
      .breadcrumb { padding: 1rem 0; font-size: 0.875rem; color: #6b7280; }
      .breadcrumb a { color: #6b7280; text-decoration: none; }
      .breadcrumb a:hover { color: #111827; }
      .breadcrumb span.sep { margin: 0 0.5rem; color: #9ca3af; }
      @media (max-width: 767px) {
        .worksheet-hero { padding: 6.75rem 0 2.35rem; }
        .worksheet-title { font-size: 1.75rem; max-width: none; }
        .worksheet-subtitle { font-size: 1rem; line-height: 1.6; }
        .worksheet-section { padding-bottom: 2.4rem; }
        .worksheet-shell { padding: 1.15rem; }
        .worksheet-summary-grid,
        .worksheet-grid,
        .related-grid { grid-template-columns: 1fr; }
      }
    </style>
</head>
<body class="bg-white text-gray-900" data-page-type="worksheet" data-page-slug="${esc(worksheet.slug)}" data-page-title="${esc(worksheet.title)}">
    ${renderAnalyticsBody({ gtmContainerId: GTM_CONTAINER_ID })}
    <a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-gray-900 text-white px-4 py-2 z-50">
        Skip to main content
    </a>

    <header class="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <nav class="container-custom" aria-label="Main navigation">
            <div class="flex items-center justify-between h-16">
                <a href="/" class="flex items-center gap-2 font-medium text-gray-900 hover:text-gray-700 transition-colors">
                    <img src="/assets/images/logo.png" alt="Legacy Investing Show Logo" width="28" height="28" class="w-7 h-7">
                    <span>Legacy Investing Show</span>
                </a>

                <div class="hidden md:flex items-center gap-4">
                    ${renderPrimaryNavLinks('/worksheets')}
                </div>

                <button id="mobile-menu-btn" class="md:hidden p-2 text-gray-700" aria-label="Open menu">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                </button>
            </div>

            <div id="mobile-menu" class="hidden md:hidden pb-4">
                <div class="flex flex-col gap-3">
                    ${renderPrimaryNavLinks('/worksheets')}
                </div>
            </div>
        </nav>
    </header>

    <main id="main">
      <div class="container-custom breadcrumb" style="padding-top: 5rem;">
          <a href="/">Home</a>
          <span class="sep">/</span>
          <a href="/worksheets/">Worksheets</a>
          <span class="sep">/</span>
          <span class="text-gray-900">${esc(worksheet.title)}</span>
      </div>

      <section class="worksheet-hero">
        <div class="container-custom">
          <div class="worksheet-hero__grid">
            <div>
              <span class="worksheet-badge">${esc(worksheet.badge || 'Worksheet')}</span>
              <h1 class="worksheet-title">${esc(worksheet.title)}</h1>
              <p class="worksheet-subtitle">${esc(worksheet.description)}</p>
            </div>
            <aside class="worksheet-hero__panel">
              <h2>Write the decision down before you act.</h2>
              <p>Use the worksheet to organize the facts, the weak points, and the advisor questions before this turns into a cleanup project.</p>
            </aside>
          </div>

          <div class="worksheet-summary-grid">
            <article class="worksheet-summary-card">
              <p class="worksheet-summary-card__eyebrow">Fillable</p>
              <p>Works in the browser with local save, export, and print so you can keep the worksheet alive during execution.</p>
            </article>
            <article class="worksheet-summary-card">
              <p class="worksheet-summary-card__eyebrow">Advisor Ready</p>
              <p>Built to help you hand your CPA or advisor a cleaner packet instead of a rambling explanation.</p>
            </article>
            <article class="worksheet-summary-card">
              <p class="worksheet-summary-card__eyebrow">SEO Surface</p>
              <p>This creates another high-intent landing page around the core decision, not just another generic blog post.</p>
            </article>
          </div>
        </div>
      </section>

      <section class="worksheet-section">
        <div class="container-custom">
          <article class="worksheet-shell">
            <div class="worksheet-copy">
              <h2>Why This Worksheet Exists</h2>
              ${renderParagraphs(worksheet.opening || [])}
              ${renderParagraphs(worksheet.howTo || [])}
            </div>

            <div class="worksheet-stack">
              ${renderWorksheetFields(worksheet.fieldGroups || [])}
            </div>

            <div class="worksheet-actions">
              <button type="button" class="worksheet-button worksheet-button--primary" id="worksheet-save">Save locally</button>
              <button type="button" class="worksheet-button worksheet-button--ghost" id="worksheet-export">Export notes</button>
              <button type="button" class="worksheet-button worksheet-button--ghost" id="worksheet-print">Print / PDF</button>
              <button type="button" class="worksheet-button worksheet-button--ghost" id="worksheet-clear">Clear</button>
            </div>
            <div class="worksheet-status" id="worksheet-status" aria-live="polite">Nothing saved yet on this device.</div>

            <div class="worksheet-grid">
              <section class="worksheet-mini-card">
                <h3>Documentation Checklist</h3>
                <ul>${renderBullets(worksheet.checklist || [])}</ul>
              </section>
              <section class="worksheet-mini-card">
                <h3>Advisor Packet</h3>
                <ul>${renderBullets(worksheet.advisorPacket || [])}</ul>
              </section>
            </div>

            <section class="related-section" aria-label="Related resources">
              <h2>Related Resources</h2>
              <div class="related-grid">
                ${renderRelated(worksheet.related || [])}
              </div>
            </section>

            ${renderSourceBlock({ title: worksheet.title, slug: worksheet.slug, type: 'worksheet' })}
          </article>
        </div>
      </section>

      <section class="faq-section" id="faq">
        <div class="container-custom">
          <h2 class="faq-section__title">Frequently Asked Questions</h2>
          <div class="faq-list" itemscope itemtype="https://schema.org/FAQPage">
            ${renderFaqItems(worksheet.faq || [])}
          </div>
        </div>
      </section>

    </main>

    <footer class="minimal-footer">
        <div class="container-custom">
            <div class="minimal-footer-content">
                <div class="footer-brand">
                    <img src="/assets/images/logo.png" alt="Legacy Investing Show" width="32" height="32">
                    <span>Legacy Investing Show</span>
                </div>
                <div class="footer-links">
                    ${renderFooterLinks()}
                </div>
            </div>
            <div class="footer-copyright">Copyright ${CURRENT_YEAR}</div>
        </div>
    </footer>

    <script defer src="/assets/js/main.js"></script>
    <script>
      const worksheetMeta = {
        id: ${JSON.stringify(worksheet.id || '')},
        slug: ${JSON.stringify(worksheet.slug || '')},
        title: ${JSON.stringify(worksheet.title || '')}
      };
      const WORKSHEET_STORAGE_KEY = 'worksheet_' + worksheetMeta.slug;

      function emitWorksheetEvent(action, detail = {}) {
        const payload = {
          worksheet_id: worksheetMeta.id,
          worksheet_slug: worksheetMeta.slug,
          worksheet_title: worksheetMeta.title,
          worksheet_action: action,
          page_type: 'worksheet',
          ...detail
        };
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: 'worksheet_interaction', ...payload });
        if (typeof gtag === 'function') {
          gtag('event', action, payload);
        }
      }

      function collectWorksheetData() {
        const data = {};
        document.querySelectorAll('[data-field-key]').forEach((field) => {
          data[field.dataset.fieldKey] = field.value;
        });
        return data;
      }

      function populateWorksheetData(data) {
        document.querySelectorAll('[data-field-key]').forEach((field) => {
          field.value = data[field.dataset.fieldKey] || '';
        });
      }

      function setWorksheetStatus(message) {
        document.getElementById('worksheet-status').textContent = message;
      }

      function saveWorksheet(quiet = false) {
        const data = collectWorksheetData();
        localStorage.setItem(WORKSHEET_STORAGE_KEY, JSON.stringify(data));
        if (!quiet) {
          setWorksheetStatus('Saved locally on this device.');
          emitWorksheetEvent('worksheet_save_local');
        }
      }

      function exportWorksheet() {
        const lines = [worksheetMeta.title, ''];
        document.querySelectorAll('[data-field-key]').forEach((field) => {
          const label = document.querySelector('label[for=\"' + field.id + '\"]')?.textContent?.trim() || field.dataset.fieldKey;
          lines.push(label + ':');
          lines.push(field.value || '(blank)');
          lines.push('');
        });
        const blob = new Blob([lines.join('\\n')], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = worksheetMeta.slug + '.txt';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 500);
        setWorksheetStatus('Exported notes file.');
        emitWorksheetEvent('worksheet_export_text');
      }

      function clearWorksheet() {
        document.querySelectorAll('[data-field-key]').forEach((field) => {
          field.value = '';
        });
        localStorage.removeItem(WORKSHEET_STORAGE_KEY);
        setWorksheetStatus('Cleared local worksheet data from this device.');
        emitWorksheetEvent('worksheet_clear');
      }

      document.querySelectorAll('.faq-question').forEach((button) => {
        button.addEventListener('click', () => {
          const expanded = button.getAttribute('aria-expanded') === 'true';
          button.setAttribute('aria-expanded', String(!expanded));
          button.nextElementSibling.classList.toggle('faq-answer--open');
          if (!expanded) {
            emitWorksheetEvent('worksheet_faq_open', {
              faq_question: button.textContent.trim().slice(0, 120)
            });
          }
        });
      });

      document.getElementById('mobile-menu-btn')?.addEventListener('click', function() {
        document.getElementById('mobile-menu').classList.toggle('hidden');
      });

      document.getElementById('worksheet-save').addEventListener('click', () => saveWorksheet(false));
      document.getElementById('worksheet-export').addEventListener('click', exportWorksheet);
      document.getElementById('worksheet-print').addEventListener('click', () => {
        emitWorksheetEvent('worksheet_print');
        window.print();
      });
      document.getElementById('worksheet-clear').addEventListener('click', clearWorksheet);

      let autoSaveTimer = null;
      document.querySelectorAll('[data-field-key]').forEach((field) => {
        field.addEventListener('input', () => {
          window.clearTimeout(autoSaveTimer);
          autoSaveTimer = window.setTimeout(() => saveWorksheet(true), 350);
        });
      });

      document.querySelectorAll('.related-card__cta').forEach((link) => {
        link.addEventListener('click', () => {
          emitWorksheetEvent('worksheet_related_click', {
            destination: link.getAttribute('href') || ''
          });
        });
      });

      const saved = localStorage.getItem(WORKSHEET_STORAGE_KEY);
      if (saved) {
        try {
          populateWorksheetData(JSON.parse(saved));
          setWorksheetStatus('Loaded saved worksheet data from this device.');
        } catch (error) {
          setWorksheetStatus('Worksheet is ready. Save locally when you want to keep your notes.');
        }
      }

      emitWorksheetEvent('worksheet_page_view');
    </script>
</body>
</html>`;
}

function renderIndex(worksheets) {
  const canonical = 'https://www.legacyinvestingshow.com/worksheets';
  const isoDate = new Date().toISOString().split('T')[0];
  const worksheetGuide = worksheets
    .map((worksheet) => `<li><strong>${esc(worksheet.title)}:</strong> ${esc(worksheet.description)}</li>`)
    .join('\n');

  const cards = worksheets
    .map((worksheet) => `<article class="library-card">
                    <div class="library-card__badge">${esc(worksheet.badge || 'Worksheet')}</div>
                    <h3><a href="/worksheets/${esc(worksheet.slug)}">${esc(worksheet.title)}</a></h3>
                    <p>${esc(worksheet.description)}</p>
                    <a class="library-card__cta" href="/worksheets/${esc(worksheet.slug)}">Open worksheet</a>
                </article>`)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Execution Worksheets | Legacy Investing Show</title>
    <meta name="description" content="Execution-first worksheets for estimated tax planning, Roth conversion decisions, and documentation-heavy tax strategies.">
    <meta name="robots" content="index, follow">
${GOOGLE_SITE_VERIFICATIONS.map((code) => `    <meta name="google-site-verification" content="${code}">`).join('\n')}
    <link rel="canonical" href="${canonical}">

    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonical}">
    <meta property="og:title" content="Execution Worksheets | Legacy Investing Show">
    <meta property="og:description" content="Fillable worksheets for high-intent tax and wealth decisions.">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Execution Worksheets | Legacy Investing Show">
    <meta name="twitter:description" content="Fillable worksheets for high-intent tax and wealth decisions.">

    <meta name="theme-color" content="#ffffff">
    <link rel="icon" type="image/png" href="/assets/images/logo.png">
    <link rel="stylesheet" href="/assets/css/styles.css">

    <script type="application/ld+json">${JSON.stringify(worksheetIndexSchema(worksheets, isoDate))}</script>
    <script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.legacyinvestingshow.com/' },
        { '@type': 'ListItem', position: 2, name: 'Worksheets', item: canonical }
      ]
    })}</script>

    ${renderAnalyticsHead({ gaTrackingId: GA_TRACKING_ID, gtmContainerId: GTM_CONTAINER_ID })}

    <style>
      .hero {
        padding: 8rem 0 3.25rem;
        background:
          radial-gradient(circle at top right, rgba(201, 169, 97, 0.18), transparent 38%),
          linear-gradient(180deg, #faf7f2 0%, #ffffff 100%);
      }
      .hero-grid {
        display: grid;
        gap: 1.25rem;
        align-items: start;
      }
      @media (min-width: 1024px) {
        .hero-grid {
          grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.85fr);
        }
      }
      .hero-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.55rem;
        padding: 0.45rem 0.85rem;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.04);
        border: 1px solid rgba(201, 169, 97, 0.18);
        color: #a88b4a;
        font-size: 0.74rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        margin-bottom: 0.95rem;
      }
      .hero-title {
        font-size: clamp(2.35rem, 5vw, 4.2rem);
        font-weight: 800;
        color: #111827;
        line-height: 0.98;
        letter-spacing: -0.04em;
        margin-bottom: 0.9rem;
        max-width: 12ch;
      }
      .hero-subtitle {
        max-width: 48rem;
        color: #475569;
        font-size: 1.06rem;
        line-height: 1.78;
      }
      .hero-panel {
        padding: 1.25rem;
        border-radius: 1.25rem;
        background: linear-gradient(160deg, #182234, #0f172a);
        color: white;
        box-shadow: 0 22px 54px rgba(15, 23, 42, 0.18);
      }
      .hero-panel__stat {
        padding: 0.85rem 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      .hero-panel__stat:last-child { border-bottom: none; padding-bottom: 0; }
      .hero-panel__stat strong {
        display: block;
        font-size: 1.7rem;
        line-height: 1;
      }
      .hero-panel__stat span {
        display: block;
        margin-top: 0.35rem;
        color: #cbd5e1;
        font-size: 0.92rem;
        line-height: 1.6;
      }
      .section { padding: 3.25rem 0; }
      .hub-copy {
        max-width: 56rem;
        margin: 0 auto;
        color: #374151;
        line-height: 1.75;
      }
      .hub-copy h2 {
        color: #111827;
        font-size: 1.6rem;
        font-weight: 800;
        margin-bottom: 0.85rem;
      }
      .hub-copy p {
        margin-bottom: 1rem;
      }
      .hub-copy ul {
        margin: 1rem 0 0;
        padding-left: 1.25rem;
      }
      .hub-copy li {
        margin-bottom: 0.75rem;
      }
      .grid {
        display: grid;
        gap: 1.2rem;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      }
      .library-card {
        background: rgba(255, 255, 255, 0.95);
        border: 1px solid rgba(15, 23, 42, 0.08);
        border-radius: 1.15rem;
        padding: 1.1rem 1.1rem 1rem;
        box-shadow: 0 18px 40px rgba(15, 23, 42, 0.06);
      }
      .library-card__badge {
        display: inline-flex;
        align-items: center;
        padding: 0.25rem 0.65rem;
        background: #111827;
        color: white;
        border-radius: 999px;
        font-size: 0.72rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        font-weight: 700;
        margin-bottom: 0.75rem;
      }
      .library-card h3 {
        margin: 0 0 0.6rem;
        font-size: 1.05rem;
        line-height: 1.35;
        font-weight: 800;
        color: #111827;
      }
      .library-card h3 a { color: inherit; text-decoration: none; }
      .library-card h3 a:hover { text-decoration: underline; }
      .library-card p { color: #4b5563; line-height: 1.65; margin: 0 0 0.9rem; }
      .library-card__cta {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.7rem 1rem;
        background: #111827;
        color: white;
        border-radius: 0.65rem;
        text-decoration: none;
        font-weight: 800;
      }
      .breadcrumb { padding: 1rem 0; font-size: 0.875rem; color: #6b7280; }
      .breadcrumb a { color: #6b7280; text-decoration: none; }
      .breadcrumb a:hover { color: #111827; }
      .breadcrumb span.sep { margin: 0 0.5rem; color: #9ca3af; }
      @media (max-width: 767px) {
        .hero { padding: 6.75rem 0 2.4rem; }
        .hero-title { font-size: 1.75rem; max-width: none; }
        .hero-subtitle { font-size: 1rem; line-height: 1.6; }
        .section { padding: 2.2rem 0; }
      }
    </style>
</head>
<body class="bg-white text-gray-900" data-page-type="worksheet_hub" data-page-title="Execution Worksheets">
    ${renderAnalyticsBody({ gtmContainerId: GTM_CONTAINER_ID })}
    <a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-gray-900 text-white px-4 py-2 z-50">
        Skip to main content
    </a>

    <header class="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <nav class="container-custom" aria-label="Main navigation">
            <div class="flex items-center justify-between h-16">
                <a href="/" class="flex items-center gap-2 font-medium text-gray-900 hover:text-gray-700 transition-colors">
                    <img src="/assets/images/logo.png" alt="Legacy Investing Show Logo" width="28" height="28" class="w-7 h-7">
                    <span>Legacy Investing Show</span>
                </a>

                <div class="hidden md:flex items-center gap-4">
                    ${renderPrimaryNavLinks('/worksheets')}
                </div>

                <button id="mobile-menu-btn" class="md:hidden p-2 text-gray-700" aria-label="Open menu">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                </button>
            </div>

            <div id="mobile-menu" class="hidden md:hidden pb-4">
                <div class="flex flex-col gap-3">
                    ${renderPrimaryNavLinks('/worksheets')}
                </div>
            </div>
        </nav>
    </header>

    <main id="main">
      <div class="container-custom breadcrumb" style="padding-top: 5rem;">
          <a href="/">Home</a>
          <span class="sep">/</span>
          <span class="text-gray-900">Worksheets</span>
      </div>

      <section class="hero">
        <div class="container-custom">
          <div class="hero-grid">
            <div>
              <span class="hero-badge">Worksheets</span>
              <h1 class="hero-title">Execution Worksheets for Expensive Decisions</h1>
              <p class="hero-subtitle">These are fillable planning documents for the decisions where a calculator alone is not enough. Use them to organize the facts, the gaps, and the advisor packet before you act.</p>
            </div>
            <aside class="hero-panel">
              <div class="hero-panel__stat">
                <strong>${worksheets.length}</strong>
                <span>Fillable worksheets now live locally and tied to the tools and compare clusters.</span>
              </div>
              <div class="hero-panel__stat">
                <strong>3</strong>
                <span>Core jobs: organize the facts, document the gaps, and prepare the advisor review packet.</span>
              </div>
              <div class="hero-panel__stat">
                <strong>SEO</strong>
                <span>Worksheet pages add high-intent search surface around the same topics as the tools and comparison pages.</span>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section class="section" style="padding-bottom: 0;">
        <div class="container-custom">
          <div class="hub-copy">
            <h2>Use The Worksheets Before The Strategy Gets Expensive</h2>
            <p>The best tax and wealth decisions usually fail in the handoff: the idea sounds good, but the facts, documents, advisor questions, and timing are scattered. This worksheet library is built for that middle step between reading an article and asking a CPA, attorney, or planner to review the move.</p>
            <p>Each worksheet is fillable in the browser, can be saved locally on the device, and can be exported or printed before an advisor call. Use the pages here to capture the numbers, assumptions, documents, and open questions that determine whether a strategy is worth pursuing.</p>
            <ul>
              ${worksheetGuide}
            </ul>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="container-custom">
          <div class="grid">
            ${cards}
          </div>
        </div>
      </section>
    </main>

    <footer class="minimal-footer">
        <div class="container-custom">
            <div class="minimal-footer-content">
                <div class="footer-brand">
                    <img src="/assets/images/logo.png" alt="Legacy Investing Show" width="32" height="32">
                    <span>Legacy Investing Show</span>
                </div>
                <div class="footer-links">
                    ${renderFooterLinks()}
                </div>
            </div>
            <div class="footer-copyright">Copyright ${CURRENT_YEAR}</div>
        </div>
    </footer>

    <script defer src="/assets/js/main.js"></script>
    <script>
      document.getElementById('mobile-menu-btn')?.addEventListener('click', function() {
        document.getElementById('mobile-menu').classList.toggle('hidden');
      });

      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'worksheet_hub_view',
        page_type: 'worksheet_hub',
        worksheet_count: ${worksheets.length}
      });

      if (typeof gtag === 'function') {
        gtag('event', 'worksheet_hub_view', {
          page_type: 'worksheet_hub',
          worksheet_count: ${worksheets.length}
        });
      }
    </script>
</body>
</html>`;
}

function main() {
  const data = readData();
  const worksheets = Array.isArray(data.worksheets) ? data.worksheets : [];

  ensureDir(OUTPUT_DIR);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), renderIndex(worksheets));

  worksheets.forEach((worksheet) => {
    const html = renderWorksheetPage(worksheet);
    fs.writeFileSync(path.join(OUTPUT_DIR, `${worksheet.slug}.html`), html);
  });

  console.log(`Generated ${worksheets.length} worksheet pages in worksheets/`);
}

main();
