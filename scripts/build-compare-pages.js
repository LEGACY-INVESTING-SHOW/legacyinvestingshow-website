#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const DATA_PATH = path.join(ROOT_DIR, 'data', 'edge-comparison-pages.json');
const OUTPUT_DIR = path.join(ROOT_DIR, 'compare');

const GA_TRACKING_ID = process.env.GA_TRACKING_ID || 'G-2578PT1WSS';
const GTM_CONTAINER_ID = process.env.GTM_CONTAINER_ID || 'GTM-KQ4R2LKP';

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

function faqSchema(page) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: page.faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.a,
      },
    })),
  };
}

function articleSchema(page, isoDate) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: page.title,
    description: page.description,
    author: { '@type': 'Person', name: 'Preston Seo' },
    publisher: { '@type': 'Organization', name: 'Legacy Investing Show' },
    datePublished: isoDate,
    dateModified: isoDate,
  };
}

function renderDecisionRows(rows) {
  return rows
    .map(
      (r, i) => `<tr${i % 2 ? ' class="alt"' : ''}>
          <td><strong>${esc(r.factor)}</strong></td>
          <td>${esc(r.a)}</td>
          <td>${esc(r.b)}</td>
          <td>${esc(r.better)}</td>
        </tr>`
    )
    .join('\n');
}

function renderList(items) {
  return items.map((item) => `<li>${esc(item)}</li>`).join('\n');
}

function renderFaq(items) {
  return items
    .map(
      (f) => `<details>
          <summary>${esc(f.q)}</summary>
          <p>${esc(f.a)}</p>
        </details>`
    )
    .join('\n');
}

function renderRelated(items) {
  return items
    .map(
      (l) => `<a href="${esc(l.href)}" class="resource-link">${esc(l.label)} <span aria-hidden="true">→</span></a>`
    )
    .join('');
}

function renderPage(page) {
  const isoDate = new Date().toISOString().split('T')[0];
  const canonical = `https://www.legacyinvestingshow.com/compare/${page.slug}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(buildSEOTitle(page.title))}</title>
  <meta name="description" content="${esc(page.description)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${canonical}">

  <meta property="og:type" content="article">
  <meta property="og:url" content="${canonical}">
  <meta property="og:title" content="${esc(page.title)}">
  <meta property="og:description" content="${esc(page.description)}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(page.title)}">
  <meta name="twitter:description" content="${esc(page.description)}">

  <meta name="theme-color" content="#059669">
  <link rel="icon" type="image/png" href="/assets/images/logo.png">
  <link rel="stylesheet" href="/assets/css/styles.css">

  <script type="application/ld+json">${JSON.stringify(articleSchema(page, isoDate))}</script>
  <script type="application/ld+json">${JSON.stringify(faqSchema(page))}</script>

  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_CONTAINER_ID}');</script>
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}"></script>
  <script>window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${GA_TRACKING_ID}');</script>

  <style>
    .cmp-wrap { max-width: 1100px; margin: 0 auto; padding: 0 1rem; }
    .cmp-hero { background: linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%); padding: 5.5rem 0 3rem; }
    .cmp-hero h1 { font-size: clamp(1.8rem,3.2vw,2.6rem); line-height:1.15; margin-bottom: .8rem; color:#111827; }
    .cmp-hero p { color:#374151; max-width: 860px; font-size:1.06rem; }
    .cmp-grid { display:grid; gap:1rem; grid-template-columns: repeat(auto-fit,minmax(250px,1fr)); }
    .cmp-card { background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:1rem 1.1rem; }
    .cmp-card h3 { margin:0 0 .4rem; color:#111827; font-size:1.02rem; }
    .cmp-card p { margin:0; color:#4b5563; font-size:.96rem; }
    .cmp-sec { padding: 2.6rem 0; }
    .cmp-sec h2 { font-size:1.5rem; margin-bottom: .9rem; color:#111827; }
    .cmp-sec p { color:#374151; }
    .cmp-table-wrap { overflow:auto; border:1px solid #e5e7eb; border-radius: 12px; }
    .cmp-table { width:100%; border-collapse: collapse; min-width:820px; }
    .cmp-table th { background:#065f46; color:#fff; padding:.82rem; text-align:left; font-size:.95rem; }
    .cmp-table td { padding:.82rem; border-bottom:1px solid #e5e7eb; color:#374151; vertical-align: top; }
    .cmp-table tr.alt td { background:#f9fafb; }
    .cmp-cols { display:grid; gap:1.2rem; grid-template-columns: repeat(auto-fit,minmax(290px,1fr)); }
    .cmp-panel { border:1px solid #e5e7eb; border-radius:12px; padding:1rem 1.1rem; background:#fff; }
    .cmp-panel h3 { margin-top:0; color:#111827; }
    .cmp-panel ul { margin:.2rem 0 0; padding-left:1.1rem; color:#374151; }
    .cmp-panel li { margin:.45rem 0; }
    .cmp-note { border-left:4px solid #059669; background:#f0fdf4; border-radius:8px; padding:.9rem 1rem; color:#14532d; }
    .resource-links { display:grid; gap:.85rem; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); }
    .resource-link { border:1px solid #d1d5db; border-radius:10px; padding:.8rem .95rem; text-decoration:none; color:#065f46; background:#fff; font-weight:600; }
    details { border:1px solid #e5e7eb; border-radius:10px; padding:.75rem .9rem; background:#fff; }
    details + details { margin-top:.7rem; }
    summary { cursor:pointer; font-weight:600; color:#111827; }
    details p { color:#374151; margin:.65rem 0 .2rem; }
  </style>
</head>
<body class="bg-white text-navy">
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_CONTAINER_ID}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>

  <header class="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gold">
    <nav class="container-custom" aria-label="Main navigation">
      <div class="flex items-center justify-between h-16">
        <a href="/" class="flex items-center gap-2 font-medium text-navy hover:text-gray-700 transition-colors">
          <img src="/assets/images/logo.png" alt="Legacy Investing Show Logo" width="28" height="28" class="w-7 h-7">
          <span>Legacy Investing Show</span>
        </a>
        <div class="hidden md:flex items-center gap-6">
          <a href="/" class="nav-link">Home</a>
          <a href="/about" class="nav-link">About</a>
          <a href="/compare/" class="nav-link nav-link-active">Compare</a>
          <a href="/tax-strategies/" class="nav-link">Tax Strategies</a>
          <a href="/blog/" class="nav-link">Blog</a>
        </div>
      </div>
    </nav>
  </header>

  <main id="main" class="pt-16">
    <section class="cmp-hero">
      <div class="cmp-wrap">
        <h1>${esc(page.title)}</h1>
        <p>${esc(page.description)}</p>
      </div>
    </section>

    <section class="cmp-sec">
      <div class="cmp-wrap">
        <div class="cmp-note"><strong>Quick Verdict:</strong> ${esc(page.winnerLabel)}. ${esc(page.intro)}</div>
      </div>
    </section>

    <section class="cmp-sec" style="padding-top:0">
      <div class="cmp-wrap">
        <div class="cmp-grid">
          <article class="cmp-card"><h3>When ${esc(page.optionAName)} Usually Wins</h3><p>${esc(page.whenA)}</p></article>
          <article class="cmp-card"><h3>When ${esc(page.optionBName)} Usually Wins</h3><p>${esc(page.whenB)}</p></article>
          <article class="cmp-card"><h3>Most Common Mistake</h3><p>Optimizing for the biggest deduction headline instead of the most reliable after-tax outcome for your actual facts.</p></article>
        </div>
      </div>
    </section>

    <section class="cmp-sec">
      <div class="cmp-wrap">
        <h2>How This Compares to Alternatives</h2>
        <div class="cmp-table-wrap">
          <table class="cmp-table">
            <thead>
              <tr>
                <th>Decision Factor</th>
                <th>${esc(page.optionAName)}</th>
                <th>${esc(page.optionBName)}</th>
                <th>Edge-Case Read</th>
              </tr>
            </thead>
            <tbody>
              ${renderDecisionRows(page.decisionMatrix)}
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="cmp-sec" style="background:#f9fafb;">
      <div class="cmp-wrap">
        <h2>Worked Example (Scenario Model)</h2>
        <p><strong>Profile:</strong> ${esc(page.workedExample.profile)}</p>
        <ul>${renderList(page.workedExample.assumptions)}</ul>
        <div class="cmp-cols" style="margin-top:1rem;">
          <article class="cmp-panel">
            <h3>${esc(page.optionAName)} Outcome</h3>
            <p>${esc(page.workedExample.aOutcome)}</p>
          </article>
          <article class="cmp-panel">
            <h3>${esc(page.optionBName)} Outcome</h3>
            <p>${esc(page.workedExample.bOutcome)}</p>
          </article>
        </div>
        <div class="cmp-note" style="margin-top:1rem;"><strong>Scenario takeaway:</strong> ${esc(page.workedExample.takeaway)}</div>
      </div>
    </section>

    <section class="cmp-sec">
      <div class="cmp-wrap">
        <h2>Edge Cases That Change the Decision</h2>
        <ul>${renderList(page.edgeCases)}</ul>
      </div>
    </section>

    <section class="cmp-sec" style="background:#f9fafb;">
      <div class="cmp-wrap">
        <h2>When Not to Use This Strategy</h2>
        <div class="cmp-cols">
          <article class="cmp-panel">
            <h3>Avoid ${esc(page.optionAName)} If...</h3>
            <ul>${renderList(page.avoidA)}</ul>
          </article>
          <article class="cmp-panel">
            <h3>Avoid ${esc(page.optionBName)} If...</h3>
            <ul>${renderList(page.avoidB)}</ul>
          </article>
        </div>
      </div>
    </section>

    <section class="cmp-sec">
      <div class="cmp-wrap">
        <h2>30-Day Implementation Checklist</h2>
        <ul>${renderList(page.checklist)}</ul>
      </div>
    </section>

    <section class="cmp-sec" style="background:#f9fafb;">
      <div class="cmp-wrap">
        <h2>Questions to Ask Your CPA/Advisor</h2>
        <ul>${renderList(page.advisorQuestions)}</ul>
      </div>
    </section>

    <section class="cmp-sec">
      <div class="cmp-wrap">
        <h2>Frequently Asked Questions</h2>
        ${renderFaq(page.faq)}
      </div>
    </section>

    <section class="cmp-sec" style="background:#f9fafb;">
      <div class="cmp-wrap">
        <h2>Related Resources</h2>
        <div class="resource-links">${renderRelated(page.related)}</div>
      </div>
    </section>

    <section class="cmp-sec" style="text-align:center;">
      <div class="cmp-wrap">
        <h2>Need a Personalized Decision Model?</h2>
        <p>Use these comparisons as education, then validate your assumptions with a qualified tax advisor before implementing.</p>
        <a href="/blog/" class="btn-primary">Explore More Strategy Guides</a>
      </div>
    </section>
  </main>

  <footer class="bg-navy text-white py-12">
    <div class="container-custom">
      <div class="grid md:grid-cols-4 gap-8">
        <div>
          <h3 class="font-semibold text-lg mb-4">Legacy Investing Show</h3>
          <p class="text-cream-dark text-sm">Building wealth that lasts beyond a paycheck.</p>
        </div>
        <div>
          <h4 class="font-medium mb-4">Quick Links</h4>
          <ul class="space-y-2 text-sm text-cream-dark">
            <li><a href="/about" class="hover:text-gold">About</a></li>
            <li><a href="/blog/" class="hover:text-gold">Resources</a></li>
            <li><a href="/success-stories" class="hover:text-gold">Success Stories</a></li>
          </ul>
        </div>
        <div>
          <h4 class="font-medium mb-4">Resources</h4>
          <ul class="space-y-2 text-sm text-cream-dark">
            <li><a href="/compare/" class="hover:text-gold">Compare Pages</a></li>
            <li><a href="/tax-strategies/" class="hover:text-gold">Tax Strategies</a></li>
            <li><a href="/blog/" class="hover:text-gold">Blog</a></li>
          </ul>
        </div>
        <div>
          <h4 class="font-medium mb-4">Educational Notice</h4>
          <p class="text-sm text-cream-dark">Educational content only. Consult a qualified advisor for legal, tax, or investment advice.</p>
        </div>
      </div>
      <div class="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-cream-dark">
        <p>&copy; ${new Date().getFullYear()} Legacy Investing Show. All rights reserved.</p>
      </div>
    </div>
  </footer>
</body>
</html>`;
}

function renderIndex(pages) {
  const isoDate = new Date().toISOString().split('T')[0];
  const canonical = 'https://www.legacyinvestingshow.com/compare/';

  const cards = pages
    .map(
      (p) => `<article class="cmp-card">
          <h3><a href="/compare/${esc(p.slug)}">${esc(p.title)}</a></h3>
          <p>${esc(p.description)}</p>
          <a href="/compare/${esc(p.slug)}" class="resource-link" style="margin-top:.7rem;display:inline-block;">Open Comparison →</a>
        </article>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Edge-Case Comparison Guides | Legacy Investing Show</title>
  <meta name="description" content="Scenario-specific comparison guides for advanced tax and wealth decisions.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${canonical}">
  <link rel="stylesheet" href="/assets/css/styles.css">
  <meta property="og:title" content="Edge-Case Comparison Guides">
  <meta property="og:description" content="Scenario-specific comparison guides for advanced tax and wealth decisions.">
  <script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    headline: 'Edge-Case Comparison Guides',
    datePublished: isoDate,
  })}</script>
</head>
<body class="bg-white text-navy">
  <header class="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gold">
    <nav class="container-custom" aria-label="Main navigation">
      <div class="flex items-center justify-between h-16">
        <a href="/" class="flex items-center gap-2 font-medium text-navy hover:text-gray-700 transition-colors">
          <img src="/assets/images/logo.png" alt="Legacy Investing Show Logo" width="28" height="28" class="w-7 h-7">
          <span>Legacy Investing Show</span>
        </a>
        <div class="hidden md:flex items-center gap-6">
          <a href="/" class="nav-link">Home</a>
          <a href="/about" class="nav-link">About</a>
          <a href="/compare/" class="nav-link nav-link-active">Compare</a>
          <a href="/tax-strategies/" class="nav-link">Tax Strategies</a>
          <a href="/blog/" class="nav-link">Blog</a>
        </div>
      </div>
    </nav>
  </header>

  <main class="pt-16">
    <section style="padding:5.5rem 0 2.5rem;background:linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%);">
      <div class="container-custom">
        <h1 style="font-size:2.4rem;font-weight:700;color:#111827;margin-bottom:.8rem;">Edge-Case Comparison Guides</h1>
        <p style="color:#374151;max-width:880px;">These pages target complex scenario decisions where generic advice fails. Each page includes worked examples, failure modes, and implementation checklists.</p>
      </div>
    </section>

    <section style="padding:2.5rem 0 3rem;">
      <div class="container-custom">
        <div style="display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));">${cards}</div>
      </div>
    </section>
  </main>

  <footer class="bg-navy text-white py-12">
    <div class="container-custom">
      <div class="border-t border-gray-800 pt-8 text-center text-sm text-cream-dark">
        <p>&copy; ${new Date().getFullYear()} Legacy Investing Show. All rights reserved.</p>
      </div>
    </div>
  </footer>
</body>
</html>`;
}

function main() {
  ensureDir(OUTPUT_DIR);
  const pages = readData();

  pages.forEach((page) => {
    const html = renderPage(page);
    fs.writeFileSync(path.join(OUTPUT_DIR, `${page.slug}.html`), html, 'utf8');
    console.log(`Built compare/${page.slug}.html`);
  });

  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), renderIndex(pages), 'utf8');
  console.log('Built compare/index.html');
}

main();
