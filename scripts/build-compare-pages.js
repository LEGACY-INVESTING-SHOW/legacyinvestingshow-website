#!/usr/bin/env node

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
const DATA_PATH = path.join(ROOT_DIR, 'data', 'edge-comparison-pages.json');
const OUTPUT_DIR = path.join(ROOT_DIR, 'compare');
const SITE_URL = 'https://www.legacyinvestingshow.com';
const OG_IMAGE = `${SITE_URL}/assets/images/og-image.jpg`;

const GA_TRACKING_ID = process.env.GA_TRACKING_ID || 'G-2578PT1WSS';
const GTM_CONTAINER_ID = process.env.GTM_CONTAINER_ID || 'GTM-KQ4R2LKP';
const GOOGLE_SITE_VERIFICATIONS = [
  'Kec6RfGhFL-qG_8zKxCqt7yxjgy65WeDAftCBm90G2s',
  '92MoCnkdQOj_ey1lEafT5Mz-znCcCQ3UABZlI-JG_nM',
];

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
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
  const title = String(rawTitle || 'Comparison Guide').replace(/\s+/g, ' ').trim() || 'Comparison Guide';
  return title.endsWith(suffix) ? title : title + suffix;
}

function bestText(page) {
  if (page && page.quickVerdict) return String(page.quickVerdict).trim();
  return page.winnerLabel ? `${page.winnerLabel}.` : 'Scenario-dependent.';
}

function renderParagraphs(paragraphs = []) {
  if (!Array.isArray(paragraphs) || paragraphs.length === 0) return '';
  return paragraphs.map((p) => `<p>${esc(p)}</p>`).join('\n');
}

function decisionStepsFor(page) {
  const steps = page && Array.isArray(page.preDecisionSteps) ? page.preDecisionSteps : [];
  if (steps.length > 0) return steps;
  return decisionPlaybookItems(page);
}

function scoreSideFromBetter(betterText, side) {
  const text = String(betterText || '').toLowerCase();
  const hasA = /\ba\b|option a|left|first|a for/.test(text);
  const hasB = /\bb\b|option b|right|second|b for/.test(text);
  const tie = /tie|depends|case|context|mixed|equal/.test(text);

  if (tie || (hasA && hasB)) return 1;
  if (side === 'a' && hasA) return 2;
  if (side === 'b' && hasB) return 2;
  return 0;
}

function buildDecisionRows(page) {
  const rows = page.decisionMatrix || [];
  const aLabel = page.optionAName || 'Option A';
  const bLabel = page.optionBName || 'Option B';

  return rows
    .map((row, idx) => {
      const aScore = scoreSideFromBetter(row.better, 'a');
      const bScore = scoreSideFromBetter(row.better, 'b');
      const className = idx % 2 ? ' class="alt"' : '';
      return `<tr${className}>
          <td data-label="Decision Factor"><strong>${esc(row.factor)}</strong></td>
          <td data-label="${esc(aLabel)}">${esc(row.a)}</td>
          <td data-label="${esc(bLabel)}">${esc(row.b)}</td>
          <td data-label="Edge-Case Read">${esc(row.better)}</td>
          <td data-label="A Score">${aScore}</td>
          <td data-label="B Score">${bScore}</td>
        </tr>`;
    })
    .join('\n');
}

function computeTotals(page) {
  const rows = page.decisionMatrix || [];
  let aTotal = 0;
  let bTotal = 0;

  rows.forEach((row) => {
    aTotal += scoreSideFromBetter(row.better, 'a');
    bTotal += scoreSideFromBetter(row.better, 'b');
  });

  return { aTotal, bTotal };
}

function renderBullets(items = []) {
  return items.map((item) => `<li>${esc(item)}</li>`).join('\n');
}

function renderFaqItems(items = []) {
  return items
    .map(
      (item, idx) => `<div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
                        <button class="faq-toggle" aria-expanded="${idx === 0 ? 'true' : 'false'}" aria-controls="faq-answer-${idx}">
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

function renderRelated(items = []) {
  return items
    .map(
      (item) => `<li><a href="${esc(item.href)}">${esc(item.label)}</a></li>`
    )
    .join('\n');
}

function normalizeChecklist(checklist = []) {
  const base = checklist.length ? checklist.slice(0, 6) : [
    'Document baseline assumptions and target outcomes.',
    'Create a documentation workflow before execution.',
    'Run a conservative math model and stress test.',
    'Review edge-case risks with your advisor before filing.',
  ];

  return {
    days0to30: base.slice(0, 2),
    days31to60: base.slice(2, 4),
    days61to90: base.slice(4, 6).concat([
      'Run post-implementation review, compare projected vs actual results, and adjust the playbook for next quarter.',
    ]),
  };
}

function buildFailureModes(page) {
  const edgeCases = page.edgeCases || [];
  const avoidA = page.avoidA || [];
  const avoidB = page.avoidB || [];

  const defaultMitigation = [
    'Define decision gates in writing before execution.',
    'Collect contemporaneous evidence, not year-end reconstructions.',
    'Run a pre-filing review with your CPA/advisor.',
    'Maintain one owner-ready audit folder per strategy year.',
  ];

  const modes = [];

  if (edgeCases[0]) {
    modes.push({
      risk: edgeCases[0],
      mitigation: `${page.optionAName} and ${page.optionBName} should only be implemented after an explicit documentation standard is agreed with your advisor.`,
    });
  }

  if (edgeCases[1]) {
    modes.push({
      risk: edgeCases[1],
      mitigation: 'Replace assumptions with verifiable evidence (contracts, logs, policy docs, or third-party support).',
    });
  }

  if (avoidA[0]) {
    modes.push({
      risk: `${page.optionAName} misuse: ${avoidA[0]}`,
      mitigation: `Use ${page.optionAName} only when the qualification gate is clearly met and documented before filing.`,
    });
  }

  if (avoidB[0]) {
    modes.push({
      risk: `${page.optionBName} misuse: ${avoidB[0]}`,
      mitigation: `Use ${page.optionBName} only when the execution process can be maintained consistently during the year.`,
    });
  }

  if (!modes.length) {
    defaultMitigation.forEach((line) => {
      modes.push({
        risk: 'Insufficient process quality increases audit and execution risk.',
        mitigation: line,
      });
    });
  }

  return modes;
}

function renderFailureRows(page) {
  return buildFailureModes(page)
    .map((mode, idx) => `<tr${idx % 2 ? ' class="alt"' : ''}>
          <td data-label="Failure Mode">${esc(mode.risk)}</td>
          <td data-label="Mitigation Control">${esc(mode.mitigation)}</td>
        </tr>`)
    .join('\n');
}

function renderEvidenceRows(page) {
  const checklist = page.checklist || [];
  const edgeCases = page.edgeCases || [];

  const standards = [
    {
      requirement: 'Eligibility and qualification proof',
      example: checklist[0] || `Document factual criteria that support ${page.optionAName} or ${page.optionBName}.`,
      failure: edgeCases[0] || 'Missing qualification proof creates weak filing positions.',
    },
    {
      requirement: 'Economic substantiation',
      example: checklist[1] || 'Store calculations and assumptions used for the decision model.',
      failure: edgeCases[1] || 'Unsupported numbers trigger advisor rework and higher audit risk.',
    },
    {
      requirement: 'Contemporaneous logs and operating records',
      example: checklist[2] || 'Capture logs during execution, not after year end.',
      failure: edgeCases[2] || 'Retroactive documentation is often inconsistent and less defensible.',
    },
    {
      requirement: 'Governance artifacts and approvals',
      example: checklist[3] || 'Preserve policy documents, memos, and advisor sign-off notes.',
      failure: edgeCases[3] || 'No governance trail increases implementation risk.',
    },
    {
      requirement: 'Annual review archive',
      example: checklist[4] || 'Archive assumptions, outcomes, and adjustments for next-year decisions.',
      failure: 'Without annual review data, the same mistakes are repeated in later filing years.',
    },
  ];

  return standards
    .map((item, idx) => `<tr${idx % 2 ? ' class="alt"' : ''}>
          <td data-label="Evidence Requirement"><strong>${esc(item.requirement)}</strong></td>
          <td data-label="What Good Looks Like">${esc(item.example)}</td>
          <td data-label="Common Failure Mode">${esc(item.failure)}</td>
        </tr>`)
    .join('\n');
}

function advisorPacketItems(page) {
  return [
    `A one-page objective memo clarifying what "winning" means for this decision (${page.optionAName} vs ${page.optionBName}).`,
    'Baseline and alternative math model with all assumptions clearly listed.',
    'Supporting evidence folder for qualification, valuations, logs, and policy records.',
    'Risk memo covering edge cases, red flags, and fallback plan if assumptions fail.',
    'Annual review checklist showing what will be re-evaluated before next filing cycle.',
  ];
}

function decisionPlaybookItems(page) {
  return [
    `Define your primary objective (cash flow, tax liability, liquidity, risk control, or simplicity).`,
    `Confirm you actually qualify for ${page.optionAName} and ${page.optionBName} before you compare dollars.`,
    'Build a baseline model and at least two stress scenarios.',
    'Score tradeoffs, then pressure-test the likely winner against edge cases and failure modes.',
    'Commit to the execution process before year end and keep records as you go.',
  ];
}

function articleSchema(page, isoDate) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: page.title,
    description: page.description,
    author: {
      '@type': 'Person',
      name: 'Preston Seo',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Legacy Investing Show',
    },
    datePublished: isoDate,
    dateModified: isoDate,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://www.legacyinvestingshow.com/compare/${page.slug}`,
    },
  };
}

function faqSchema(page) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: (page.faq || []).map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
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
      { '@type': 'ListItem', position: 3, name: page.title, item: `${SITE_URL}/compare/${page.slug}` },
    ],
  };
}

/** renderSourceBlock still ships inline styles; guides.css owns the look. */
function plainSourceBlock(options) {
  return renderSourceBlock({ heading: 'Primary sources to verify before you act', ...options })
    .replace(/ style="[^"]*"/g, '');
}

const OUTLINE = [
  ['executive-summary', 'Executive summary'],
  ['comparison-matrix', 'Decision scorecard'],
  ['decision-framework', 'Decision framework'],
  ['worked-example', 'Worked example'],
  ['evidence-standards', 'Evidence standards'],
  ['failure-modes', 'Failure modes'],
  ['edge-cases', 'Edge cases'],
  ['execution-plan', '90-day plan'],
  ['advisor-packet', 'Advisor packet'],
  ['faq', 'Questions'],
];

function renderPage(page) {
  const isoDate = new Date().toISOString().split('T')[0];
  const canonical = `${SITE_URL}/compare/${page.slug}`;
  const { aTotal, bTotal } = computeTotals(page);
  const ninetyDay = normalizeChecklist(page.checklist || []);
  const openingHtml = renderParagraphs(page.opening || []);
  const steps = decisionStepsFor(page);
  const verdict = page.quickVerdict || bestText(page);

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

    <meta name="theme-color" content="#FAF7F2">
    <link rel="icon" type="image/png" href="/assets/images/logo.png">
    ${renderHeadAssets()}
    <link rel="stylesheet" href="/assets/css/guides.css">

    <script type="application/ld+json">${JSON.stringify(articleSchema(page, isoDate))}</script>
    <script type="application/ld+json">${JSON.stringify(breadcrumbSchema(page))}</script>
    <script type="application/ld+json">${JSON.stringify(faqSchema(page))}</script>

    ${renderAnalyticsHead({ gaTrackingId: GA_TRACKING_ID, gtmContainerId: GTM_CONTAINER_ID })}
</head>
<body class="guide-page" data-page-type="compare" data-page-slug="${esc(page.slug)}" data-page-title="${esc(page.title)}">
    ${renderAnalyticsBody({ gtmContainerId: GTM_CONTAINER_ID })}
    <a href="#main" class="guide-skip">Skip to main content</a>

    ${renderSiteHeader('/compare')}

    <div class="container-custom">
        <nav aria-label="Breadcrumb">
            <ol class="breadcrumb">
                <li class="breadcrumb__item"><a href="/" class="breadcrumb__link">Home</a></li>
                <li class="breadcrumb__item"><a href="/compare" class="breadcrumb__link">Compare</a></li>
                <li class="breadcrumb__item"><span class="breadcrumb__current">${esc(page.title)}</span></li>
            </ol>
        </nav>
    </div>

    <main id="main">
        <section class="guide-hero">
            <div class="container-custom">
                <h1 class="guide-hero__title">${esc(page.title)}</h1>
                <p class="guide-deck">${esc(page.description)}</p>
                <dl class="compare-verdict">
                    <div>
                        <dt>Option A</dt>
                        <dd>${esc(page.optionAName)}</dd>
                    </div>
                    <div>
                        <dt>Option B</dt>
                        <dd>${esc(page.optionBName)}</dd>
                    </div>
                    <div>
                        <dt>Quick verdict</dt>
                        <dd>${esc(verdict)}</dd>
                    </div>
                </dl>
            </div>
        </section>

        <section class="guide-section">
            <div class="container-custom">
                <article class="guide-prose">
                    <nav class="compare-outline-nav" aria-label="On this page">
                        <p class="guide-rail__title">On this page</p>
                        <ul class="compare-outline">
${OUTLINE.map(([id, label]) => `                            <li><a href="#${id}">${esc(label)}</a></li>`).join('\n')}
                        </ul>
                    </nav>

                    <h2 id="executive-summary">Executive summary</h2>
                    ${openingHtml}
                    <p>${esc(page.intro)}</p>
                    <p>Written for ${esc(String(page.bestFor || page.description).replace(/^./, (c) => c.toLowerCase()))}</p>

                    <h3>When ${esc(page.optionAName)} tends to win</h3>
                    <p>${esc(page.whenA)}</p>
                    <h3>When ${esc(page.optionBName)} tends to win</h3>
                    <p>${esc(page.whenB)}</p>
                    <h3>Where people lose money</h3>
                    <p>${esc(page.commonMistake || 'Forcing the facts to match the strategy after the year is over.')}</p>

                    <h2 id="comparison-matrix">Decision scorecard</h2>
                    <p>The score is directional, not a guarantee. Your facts and your documentation decide what is actually defensible.</p>
                    <div class="table-scroll">
                        <table class="compare-table">
                            <thead>
                                <tr>
                                    <th scope="col">Decision factor</th>
                                    <th scope="col">${esc(page.optionAName)}</th>
                                    <th scope="col">${esc(page.optionBName)}</th>
                                    <th scope="col">Edge-case read</th>
                                    <th scope="col">A</th>
                                    <th scope="col">B</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${buildDecisionRows(page)}
                                <tr>
                                    <td data-label="Decision Factor"><strong>Total signal</strong></td>
                                    <td data-label="${esc(page.optionAName)}">Directional score from the matrix.</td>
                                    <td data-label="${esc(page.optionBName)}">Directional score from the matrix.</td>
                                    <td data-label="Edge-Case Read">Use it after qualification checks and stress testing.</td>
                                    <td data-label="A Score"><strong>${aTotal}</strong></td>
                                    <td data-label="B Score"><strong>${bTotal}</strong></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <h2 id="decision-framework">Decision framework</h2>
                    <p>${esc(page.decisionFrameworkLead || 'This only works when execution is clean. Run this sequence before you commit.')}</p>
                    <ol>
                        ${steps.map((item) => `<li>${esc(item)}</li>`).join('')}
                    </ol>

                    <h2 id="worked-example">Worked example</h2>
                    <p><strong>Profile:</strong> ${esc(page.workedExample.profile)}</p>
                    <ul>
                        ${renderBullets(page.workedExample.assumptions)}
                    </ul>
                    <h3>${esc(page.optionAName)} outcome</h3>
                    <p>${esc(page.workedExample.aOutcome)}</p>
                    <h3>${esc(page.optionBName)} outcome</h3>
                    <p>${esc(page.workedExample.bOutcome)}</p>
                    <p><strong>Takeaway:</strong> ${esc(page.workedExample.takeaway)}</p>

                    <h2 id="evidence-standards">Evidence and documentation standards</h2>
                    <p>If the evidence package is weak, the strategy that looks better on paper usually underperforms in practice.</p>
                    <div class="table-scroll">
                        <table class="compare-table">
                            <thead>
                                <tr>
                                    <th scope="col">Evidence requirement</th>
                                    <th scope="col">What good looks like</th>
                                    <th scope="col">Common failure mode</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${renderEvidenceRows(page)}
                            </tbody>
                        </table>
                    </div>

                    <h2 id="failure-modes">Failure modes and mitigations</h2>
                    <p>These are the practical breakdowns that turn a valid strategy into an expensive cleanup project.</p>
                    <div class="table-scroll">
                        <table class="compare-table">
                            <thead>
                                <tr>
                                    <th scope="col">Failure mode</th>
                                    <th scope="col">Mitigation control</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${renderFailureRows(page)}
                            </tbody>
                        </table>
                    </div>

                    <h2 id="edge-cases">Edge cases that change the decision</h2>
                    <ul>
                        ${renderBullets(page.edgeCases)}
                    </ul>

                    <h3>Avoid ${esc(page.optionAName)} if</h3>
                    <ul>${renderBullets(page.avoidA)}</ul>
                    <h3>Avoid ${esc(page.optionBName)} if</h3>
                    <ul>${renderBullets(page.avoidB)}</ul>

                    <h2 id="execution-plan">90-day implementation plan</h2>
                    <h3>Days 0-30: decision and controls</h3>
                    <ul>${renderBullets(ninetyDay.days0to30)}</ul>
                    <h3>Days 31-60: execution and documentation</h3>
                    <ul>${renderBullets(ninetyDay.days31to60)}</ul>
                    <h3>Days 61-90: validation and advisor packet</h3>
                    <ul>${renderBullets(ninetyDay.days61to90)}</ul>

                    <h2 id="advisor-packet">Questions to ask your CPA</h2>
                    <ul>
                        ${renderBullets(page.advisorQuestions)}
                    </ul>
                    <h3>What to include in the packet</h3>
                    <ul>
                        ${renderBullets(advisorPacketItems(page))}
                    </ul>

                    <h2 id="faq">Questions people ask</h2>
                    <div class="faq-list" itemscope itemtype="https://schema.org/FAQPage">
                        ${renderFaqItems(page.faq || [])}
                    </div>

                    <div class="guide-rail">
                        <div class="guide-rail__block">
                            <h2 class="guide-rail__title">Decision signal</h2>
                            <p class="sidebar-card__body"><strong>${esc(page.optionAName)}</strong>: ${aTotal} points. <strong>${esc(page.optionBName)}</strong>: ${bTotal} points. Treat the score as a directional input, then validate it against qualification and execution constraints.</p>
                        </div>
                        <div class="guide-rail__block">
                            <h2 class="guide-rail__title">Implementation checklist</h2>
                            <ul class="guide-linklist">
                                ${renderBullets((page.checklist || []).slice(0, 5))}
                            </ul>
                        </div>
                        <div class="guide-rail__block">
                            <h2 class="guide-rail__title">Related reading</h2>
                            <ul class="guide-linklist">
                                ${renderRelated(page.related)}
                            </ul>
                        </div>
                    </div>

                    ${plainSourceBlock({ title: page.title, slug: page.slug, type: 'compare' })}

                    <p class="guide-row__note">This is an educational decision brief, not personalised tax or legal advice. The right answer depends on your facts, your records, and your advisor's review.</p>
                </article>
            </div>
        </section>
    </main>

    ${renderSiteFooter()}

    <script defer src="/assets/js/main.js"></script>
    <script>
        document.querySelectorAll('.faq-toggle').forEach(function (button) {
            button.addEventListener('click', function () {
                var expanded = button.getAttribute('aria-expanded') === 'true';
                button.setAttribute('aria-expanded', String(!expanded));
                if (button.nextElementSibling) {
                    button.nextElementSibling.classList.toggle('faq-answer--open');
                }
            });
        });
    </script>
</body>
</html>`;
}

function renderIndex(pages) {
  const canonical = `${SITE_URL}/compare`;
  const isoDate = new Date().toISOString().split('T')[0];
  const description = 'Head-to-head guides for tax and wealth decisions where two options both look reasonable: a scored comparison, a worked example, the failure modes, and a 90-day plan.';

  const rows = pages
    .map((page) => `                        <li>
                            <h3 class="guide-row__title"><a href="/compare/${esc(page.slug)}">${esc(page.title)}</a></h3>
                            <p>${esc(page.description)}</p>
                            <p class="guide-row__note">Verdict: ${esc(page.quickVerdict || bestText(page))}</p>
                        </li>`)
    .join('\n');

  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Comparison guides',
      description,
      url: canonical,
      datePublished: isoDate,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: pages.length,
        itemListElement: pages.map((page, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `${SITE_URL}/compare/${page.slug}`,
          name: page.title,
        })),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Compare', item: canonical },
      ],
    },
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Comparison Guides | Legacy Investing Show</title>
    <meta name="description" content="${esc(description)}">
    <meta name="robots" content="index, follow">
${GOOGLE_SITE_VERIFICATIONS.map((code) => `    <meta name="google-site-verification" content="${code}">`).join('\n')}
    <link rel="canonical" href="${canonical}">

    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonical}">
    <meta property="og:title" content="Comparison Guides">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:image" content="${OG_IMAGE}">
    <meta property="og:site_name" content="Legacy Investing Show">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Comparison Guides">
    <meta name="twitter:description" content="${esc(description)}">
    <meta name="twitter:image" content="${OG_IMAGE}">

    <meta name="theme-color" content="#FAF7F2">
    <link rel="icon" type="image/png" href="/assets/images/logo.png">
    ${renderHeadAssets()}
    <link rel="stylesheet" href="/assets/css/guides.css">

${schema.map((entry) => `    <script type="application/ld+json">${JSON.stringify(entry)}</script>`).join('\n')}

    ${renderAnalyticsHead({ gaTrackingId: GA_TRACKING_ID, gtmContainerId: GTM_CONTAINER_ID })}
</head>
<body class="guide-page" data-page-type="compare_hub" data-page-title="Comparison guides">
    ${renderAnalyticsBody({ gtmContainerId: GTM_CONTAINER_ID })}
    <a href="#main" class="guide-skip">Skip to main content</a>

    ${renderSiteHeader('/compare')}

    <div class="container-custom">
        <nav aria-label="Breadcrumb">
            <ol class="breadcrumb">
                <li class="breadcrumb__item"><a href="/" class="breadcrumb__link">Home</a></li>
                <li class="breadcrumb__item"><span class="breadcrumb__current">Compare</span></li>
            </ol>
        </nav>
    </div>

    <main id="main">
        <section class="guide-hero">
            <div class="container-custom">
                <h1 class="guide-hero__title">Comparison guides</h1>
                <p class="guide-deck">${pages.length} decisions where two options both look reasonable. Each guide scores the tradeoffs, works an example, names the failure modes, and sets out a 90-day plan.</p>
            </div>
        </section>

        <section class="guide-section">
            <div class="container-custom">
                <div class="guide-prose">
                    <h2>How to use them</h2>
                    <p>Pick one primary objective first — lower tax, better cash flow, more liquidity, or simpler execution — because the two options rarely win on the same axis. Then run both paths through the scorecard and the scenario model with conservative assumptions.</p>
                    <p>Set the documentation standard before you execute, not at year end, and re-score the decision annually as income, law, and circumstances change.</p>

                    <h2>The guides</h2>
                    <ul class="guide-rows">
${rows}
                    </ul>

                    <p class="guide-row__note">Educational content only. Results vary with your facts. Confirm the decision with a qualified tax professional.</p>
                </div>
            </div>
        </section>
    </main>

    ${renderSiteFooter()}

    <script defer src="/assets/js/main.js"></script>
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
