#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const DATA_PATH = path.join(ROOT_DIR, 'data', 'edge-comparison-pages.json');
const OUTPUT_DIR = path.join(ROOT_DIR, 'compare');

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
  const title = String(rawTitle || '').trim();
  const maxLen = 60;

  if ((title + suffix).length <= maxLen) return title + suffix;

  const budget = maxLen - suffix.length - 1;
  if (budget > 30) return `${title.slice(0, budget).trimEnd()}…${suffix}`;

  return `${title.slice(0, maxLen - 1).trimEnd()}…`;
}

function bestText(page) {
  return page.winnerLabel ? `${page.winnerLabel}.` : 'Scenario-dependent.';
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
    `Step 1: Define your primary objective first (cash flow, tax liability, liquidity, audit defensibility, or admin simplicity).`,
    `Step 2: Validate qualification gates for both ${page.optionAName} and ${page.optionBName} before comparing dollar outcomes.`,
    'Step 3: Build a baseline model and at least two stress scenarios (conservative and adverse).',
    'Step 4: Score each option across decision factors, then pressure-test the top option against edge cases.',
    'Step 5: Select execution path and documentation standard before year-end, not during filing season.',
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

function renderPage(page) {
  const isoDate = new Date().toISOString().split('T')[0];
  const canonical = `https://www.legacyinvestingshow.com/compare/${page.slug}`;
  const { aTotal, bTotal } = computeTotals(page);
  const ninetyDay = normalizeChecklist(page.checklist || []);

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

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(page.title)}">
    <meta name="twitter:description" content="${esc(page.description)}">

    <meta name="theme-color" content="#ffffff">
    <link rel="icon" type="image/png" href="/assets/images/logo.png">
    <link rel="stylesheet" href="/assets/css/styles.css">

    <script type="application/ld+json">${JSON.stringify(articleSchema(page, isoDate))}</script>
    <script type="application/ld+json">${JSON.stringify(faqSchema(page))}</script>

    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_CONTAINER_ID}');</script>
    <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${GA_TRACKING_ID}');
    </script>

    <style>
        .compare-hero {
            padding: 8rem 0 3.5rem;
            background: linear-gradient(135deg, #f8fafc 0%, #e5e7eb 100%);
        }
        .compare-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: #111827;
            color: white;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            border-radius: 999px;
            margin-bottom: 1rem;
        }
        .compare-title {
            font-size: 2.125rem;
            font-weight: 700;
            line-height: 1.15;
            color: #111827;
            margin-bottom: 1rem;
        }
        @media (min-width: 768px) {
            .compare-title { font-size: 2.6rem; }
        }
        .compare-subtitle {
            max-width: 52rem;
            color: #4b5563;
            font-size: 1.1rem;
            line-height: 1.7;
        }
        .compare-kpis {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 1rem;
            margin-top: 1.5rem;
        }
        @media (min-width: 768px) {
            .compare-kpis {
                grid-template-columns: repeat(4, minmax(0, 1fr));
            }
        }
        .compare-kpi {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 0.75rem;
            padding: 1rem;
        }
        .compare-kpi__label {
            font-size: 0.72rem;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: #6b7280;
            margin-bottom: 0.35rem;
        }
        .compare-kpi__value {
            color: #111827;
            font-weight: 700;
            font-size: 1.05rem;
        }
        .compare-kpi__value--good {
            color: #047857;
        }

        .content-section {
            padding: 3.25rem 0;
        }
        .content-section--alt {
            background: #f9fafb;
        }
        .content-grid {
            display: grid;
            gap: 2rem;
        }
        @media (min-width: 1024px) {
            .content-grid {
                grid-template-columns: minmax(0, 2.2fr) minmax(280px, 1fr);
            }
        }
        .prose-content {
            color: #374151;
            line-height: 1.75;
        }
        .prose-content h2 {
            color: #111827;
            font-size: 1.6rem;
            line-height: 1.3;
            margin-bottom: 1rem;
        }
        .prose-content h3 {
            color: #111827;
            font-size: 1.18rem;
            margin: 1.6rem 0 0.65rem;
        }
        .prose-content p {
            margin-bottom: 1rem;
        }
        .prose-content ul,
        .prose-content ol {
            padding-left: 1.2rem;
            margin: 0.5rem 0 1rem;
        }
        .prose-content li {
            margin-bottom: 0.55rem;
        }
        .compare-note {
            background: #ecfdf5;
            border-left: 4px solid #10b981;
            padding: 1rem 1rem;
            border-radius: 0.5rem;
            color: #065f46;
        }

        .table-wrap {
            border: 1px solid #e5e7eb;
            border-radius: 0.75rem;
            overflow-x: auto;
            background: white;
            margin-top: 1rem;
        }
        .compare-table {
            width: 100%;
            border-collapse: collapse;
            min-width: 860px;
        }
        .compare-table th {
            background: #111827;
            color: white;
            text-align: left;
            font-size: 0.85rem;
            font-weight: 600;
            letter-spacing: 0.02em;
            padding: 0.8rem;
            vertical-align: top;
        }
        .compare-table td {
            border-bottom: 1px solid #e5e7eb;
            padding: 0.78rem;
            vertical-align: top;
            color: #374151;
            font-size: 0.94rem;
        }
        .compare-table tr.alt td {
            background: #f9fafb;
        }

        .split-panels {
            display: grid;
            gap: 1rem;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            margin-top: 1rem;
        }
        .panel {
            border: 1px solid #e5e7eb;
            border-radius: 0.75rem;
            background: white;
            padding: 1rem;
        }
        .panel h3 {
            margin-top: 0;
        }

        .sidebar {
            position: sticky;
            top: 6rem;
            align-self: start;
        }
        .sidebar-card {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 0.75rem;
            padding: 1rem;
            margin-bottom: 1rem;
        }
        .sidebar-card__title {
            font-size: 0.95rem;
            font-weight: 700;
            color: #111827;
            margin-bottom: 0.8rem;
        }
        .sidebar-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .sidebar-list li {
            margin-bottom: 0.55rem;
        }
        .sidebar-list a {
            color: #374151;
            text-decoration: none;
            font-size: 0.9rem;
        }
        .sidebar-list a:hover {
            color: #111827;
            text-decoration: underline;
        }

        .faq-section {
            background: #f9fafb;
            padding: 3.5rem 0;
        }
        .faq-section__title {
            font-size: 1.7rem;
            font-weight: 700;
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
            font-weight: 600;
        }
        .faq-question:hover {
            background: #f9fafb;
        }
        .faq-chevron {
            width: 1.2rem;
            height: 1.2rem;
            color: #9ca3af;
            transition: transform 0.2s;
        }
        .faq-question[aria-expanded="true"] .faq-chevron {
            transform: rotate(180deg);
        }
        .faq-answer {
            display: none;
            padding: 0 1.1rem 1.1rem;
            color: #4b5563;
            line-height: 1.65;
        }
        .faq-answer--open {
            display: block;
        }

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
            font-weight: 700;
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
            font-weight: 600;
            text-decoration: none;
        }
        .cta-card__button:hover {
            background: #059669;
        }

        .breadcrumb {
            padding: 1rem 0;
            font-size: 0.875rem;
            color: #6b7280;
        }
        .breadcrumb a {
            color: #6b7280;
            text-decoration: none;
        }
        .breadcrumb a:hover {
            color: #111827;
        }
        .breadcrumb span.sep {
            margin: 0 0.5rem;
            color: #9ca3af;
        }
        @media (max-width: 767px) {
            .compare-hero {
                padding: 6.75rem 0 2.4rem;
            }
            .compare-title {
                font-size: 1.65rem;
            }
            .compare-subtitle {
                font-size: 1rem;
                line-height: 1.6;
            }
            .compare-kpis {
                grid-template-columns: 1fr;
                gap: 0.75rem;
            }
            .compare-kpi {
                padding: 0.8rem;
            }
            .content-section {
                padding: 2.2rem 0;
            }
            .prose-content h2 {
                font-size: 1.35rem;
            }
            .prose-content h3 {
                font-size: 1.05rem;
            }
            .table-wrap {
                margin-left: -0.25rem;
                margin-right: -0.25rem;
            }
            .compare-table {
                min-width: 0;
            }
            .compare-table thead {
                display: none;
            }
            .compare-table,
            .compare-table tbody,
            .compare-table tr,
            .compare-table td {
                display: block;
                width: 100%;
            }
            .compare-table tr {
                border-bottom: 1px solid #e5e7eb;
                padding: 0.45rem 0.1rem;
            }
            .compare-table td {
                border-bottom: none;
                padding: 0.45rem 0.6rem;
            }
            .compare-table td::before {
                content: attr(data-label);
                display: block;
                font-size: 0.73rem;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.04em;
                color: #6b7280;
                margin-bottom: 0.2rem;
            }
            .split-panels {
                grid-template-columns: 1fr;
            }
            .panel {
                padding: 0.85rem;
            }
            .cta-card {
                padding: 2rem 1rem;
            }
            .cta-card__title {
                font-size: 1.45rem;
            }
        }
    </style>
</head>
<body class="bg-white text-gray-900">
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_CONTAINER_ID}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
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

                <div class="hidden md:flex items-center gap-6">
                    <a href="/" class="nav-link">Home</a>
                    <a href="/about" class="nav-link">About</a>
                    <a href="/success-stories" class="nav-link">Results</a>
                    <a href="/blog/" class="nav-link">Blog</a>
                </div>

                <button id="mobile-menu-btn" class="md:hidden p-2 text-gray-700" aria-label="Open menu">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                </button>
            </div>

            <div id="mobile-menu" class="hidden md:hidden pb-4">
                <div class="flex flex-col gap-3">
                    <a href="/" class="nav-link">Home</a>
                    <a href="/about" class="nav-link">About</a>
                    <a href="/success-stories" class="nav-link">Results</a>
                    <a href="/blog/" class="nav-link">Blog</a>
                </div>
            </div>
        </nav>
    </header>

    <main id="main">
        <div class="container-custom breadcrumb" style="padding-top: 5rem;">
            <a href="/">Home</a>
            <span class="sep">/</span>
            <a href="/compare/">Compare</a>
            <span class="sep">/</span>
            <span class="text-gray-900">${esc(page.title)}</span>
        </div>

        <section class="compare-hero">
            <div class="container-custom">
                <span class="compare-badge">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M8 12h8M8 8h8M8 16h8M4 8h.01M4 12h.01M4 16h.01"/>
                    </svg>
                    Edge-Case Comparison
                </span>
                <h1 class="compare-title">${esc(page.title)}</h1>
                <p class="compare-subtitle">${esc(page.description)}</p>

                <div class="compare-kpis">
                    <div class="compare-kpi">
                        <div class="compare-kpi__label">Quick Verdict</div>
                        <div class="compare-kpi__value compare-kpi__value--good">${esc(bestText(page))}</div>
                    </div>
                    <div class="compare-kpi">
                        <div class="compare-kpi__label">Option A</div>
                        <div class="compare-kpi__value">${esc(page.optionAName)}</div>
                    </div>
                    <div class="compare-kpi">
                        <div class="compare-kpi__label">Option B</div>
                        <div class="compare-kpi__value">${esc(page.optionBName)}</div>
                    </div>
                    <div class="compare-kpi">
                        <div class="compare-kpi__label">Decision Factors</div>
                        <div class="compare-kpi__value">${(page.decisionMatrix || []).length} scored criteria</div>
                    </div>
                </div>
            </div>
        </section>

        <section class="content-section">
            <div class="container-custom content-grid">
                <article class="prose-content">
                    <h2 id="executive-summary">Executive Summary</h2>
                    <div class="compare-note"><strong>Bottom line:</strong> ${esc(page.intro)}</div>
                    <p><strong>${esc(page.optionAName)}</strong> tends to win when ${esc(page.whenA)}</p>
                    <p><strong>${esc(page.optionBName)}</strong> tends to win when ${esc(page.whenB)}</p>
                    <p>This guide is intentionally built for edge-case implementation decisions, not generic "best strategy" takes. The objective is to help you choose the option that survives real execution constraints and advisor review, then document that choice in an audit-defensible way.</p>

                    <h2 id="comparison-matrix">How This Compares to Alternatives</h2>
                    <p>The table below scores each decision factor and adds point values to force tradeoff clarity. Scores are directional only; your facts still control final implementation.</p>
                    <div class="table-wrap">
                        <table class="compare-table">
                            <thead>
                                <tr>
                                    <th>Decision Factor</th>
                                    <th>${esc(page.optionAName)}</th>
                                    <th>${esc(page.optionBName)}</th>
                                    <th>Edge-Case Read</th>
                                    <th>A Score</th>
                                    <th>B Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${buildDecisionRows(page)}
                                <tr>
                                    <td data-label="Decision Factor"><strong>Total Weighted Signal</strong></td>
                                    <td data-label="${esc(page.optionAName)}">Directional score from matrix interpretation.</td>
                                    <td data-label="${esc(page.optionBName)}">Directional score from matrix interpretation.</td>
                                    <td data-label="Edge-Case Read">Use this only after qualification checks and stress testing.</td>
                                    <td data-label="A Score"><strong>${aTotal}</strong></td>
                                    <td data-label="B Score"><strong>${bTotal}</strong></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <h2 id="decision-framework">Decision Framework (Execution-First)</h2>
                    <p>Most failures happen because teams jump directly from idea to filing and skip method design. Run this sequence before implementation:</p>
                    <ol>
                        ${decisionPlaybookItems(page).map((item) => `<li>${esc(item)}</li>`).join('')}
                    </ol>

                    <h2 id="worked-example">Worked Example (Scenario Model)</h2>
                    <p><strong>Profile:</strong> ${esc(page.workedExample.profile)}</p>
                    <ul>
                        ${renderBullets(page.workedExample.assumptions)}
                    </ul>
                    <div class="split-panels">
                        <article class="panel">
                            <h3>${esc(page.optionAName)} outcome</h3>
                            <p>${esc(page.workedExample.aOutcome)}</p>
                        </article>
                        <article class="panel">
                            <h3>${esc(page.optionBName)} outcome</h3>
                            <p>${esc(page.workedExample.bOutcome)}</p>
                        </article>
                    </div>
                    <div class="compare-note" style="margin-top: 1rem;"><strong>Scenario takeaway:</strong> ${esc(page.workedExample.takeaway)}</div>

                    <h2 id="evidence-standards">Evidence and Documentation Standards</h2>
                    <p>If your evidence package is weak, the "better" strategy on paper usually underperforms in practice. Build the following standards before filing season:</p>
                    <div class="table-wrap">
                        <table class="compare-table">
                            <thead>
                                <tr>
                                    <th>Evidence Requirement</th>
                                    <th>What Good Looks Like</th>
                                    <th>Common Failure Mode</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${renderEvidenceRows(page)}
                            </tbody>
                        </table>
                    </div>

                    <h2 id="failure-modes">Failure Modes and Mitigations</h2>
                    <p>These are not hypothetical. They are the practical breakdowns that repeatedly turn a valid strategy into an expensive cleanup project:</p>
                    <div class="table-wrap">
                        <table class="compare-table" style="min-width: 700px;">
                            <thead>
                                <tr>
                                    <th>Failure Mode</th>
                                    <th>Mitigation Control</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${renderFailureRows(page)}
                            </tbody>
                        </table>
                    </div>

                    <h2 id="edge-cases">Edge Cases That Change the Decision</h2>
                    <ul>
                        ${renderBullets(page.edgeCases)}
                    </ul>

                    <h2 id="avoidance-zones">When Not to Use This Strategy</h2>
                    <div class="split-panels">
                        <article class="panel">
                            <h3>Avoid ${esc(page.optionAName)} if...</h3>
                            <ul>${renderBullets(page.avoidA)}</ul>
                        </article>
                        <article class="panel">
                            <h3>Avoid ${esc(page.optionBName)} if...</h3>
                            <ul>${renderBullets(page.avoidB)}</ul>
                        </article>
                    </div>

                    <h2 id="execution-plan">90-Day Implementation Plan</h2>
                    <h3>Days 0-30: Decision and controls setup</h3>
                    <ul>${renderBullets(ninetyDay.days0to30)}</ul>
                    <h3>Days 31-60: Execution and documentation cadence</h3>
                    <ul>${renderBullets(ninetyDay.days31to60)}</ul>
                    <h3>Days 61-90: Validation and advisor packet prep</h3>
                    <ul>${renderBullets(ninetyDay.days61to90)}</ul>

                    <h2 id="advisor-packet">Questions to Ask Your CPA/Advisor</h2>
                    <ul>
                        ${renderBullets(page.advisorQuestions)}
                    </ul>
                    <h3>What to include in your advisor packet</h3>
                    <ul>
                        ${renderBullets(advisorPacketItems(page))}
                    </ul>
                </article>

                <aside class="sidebar">
                    <div class="sidebar-card">
                        <h3 class="sidebar-card__title">Page Outline</h3>
                        <ul class="sidebar-list">
                            <li><a href="#executive-summary">Executive Summary</a></li>
                            <li><a href="#comparison-matrix">Comparison Matrix</a></li>
                            <li><a href="#decision-framework">Decision Framework</a></li>
                            <li><a href="#worked-example">Worked Example</a></li>
                            <li><a href="#evidence-standards">Evidence Standards</a></li>
                            <li><a href="#failure-modes">Failure Modes</a></li>
                            <li><a href="#execution-plan">90-Day Plan</a></li>
                            <li><a href="#advisor-packet">Advisor Packet</a></li>
                        </ul>
                    </div>

                    <div class="sidebar-card">
                        <h3 class="sidebar-card__title">Quick Decision Signal</h3>
                        <p style="margin:0 0 0.75rem; color:#374151; font-size:0.9rem;"><strong>${esc(page.optionAName)}</strong>: ${aTotal} points</p>
                        <p style="margin:0 0 0.75rem; color:#374151; font-size:0.9rem;"><strong>${esc(page.optionBName)}</strong>: ${bTotal} points</p>
                        <p style="margin:0; color:#4b5563; font-size:0.88rem;">Treat score as a directional input, then validate with qualification and execution constraints.</p>
                    </div>

                    <div class="sidebar-card" style="background:#ecfdf5; border-color:#a7f3d0;">
                        <h3 class="sidebar-card__title">Implementation Checklist</h3>
                        <ul class="sidebar-list" style="list-style:disc; padding-left:1rem;">
                            ${renderBullets((page.checklist || []).slice(0, 5))}
                        </ul>
                    </div>

                    <div class="sidebar-card">
                        <h3 class="sidebar-card__title">Related Resources</h3>
                        <ul class="sidebar-list">
                            ${renderRelated(page.related)}
                        </ul>
                    </div>
                </aside>
            </div>
        </section>

        <section class="faq-section" id="faq">
            <div class="container-custom">
                <h2 class="faq-section__title">Frequently Asked Questions</h2>
                <div class="faq-list" itemscope itemtype="https://schema.org/FAQPage">
                    ${renderFaqItems(page.faq || [])}
                </div>
            </div>
        </section>

        <section class="cta-section">
            <div class="container-custom">
                <div class="cta-card">
                    <h2 class="cta-card__title">Turn Comparison Into an Execution Plan</h2>
                    <p class="cta-card__text">If you want the strategy to hold up in the real world, your documentation system and advisor packet matter as much as your math model.</p>
                    <a href="https://www.managemoney101.com/challengeoptin" class="cta-card__button">
                        Join the 3-Day Wealth Challenge
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                    </a>
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
                    <a href="/success-stories">Results</a>
                    <a href="/blog/">Blog</a>
                    <a href="/tax-strategies/">Tax Strategies</a>
                </div>
            </div>
            <div class="footer-copyright">Copyright 2025</div>
        </div>
    </footer>

    <script defer src="/assets/js/main.js"></script>
    <script>
        document.querySelectorAll('.faq-question').forEach((button) => {
            button.addEventListener('click', () => {
                const expanded = button.getAttribute('aria-expanded') === 'true';
                button.setAttribute('aria-expanded', String(!expanded));
                button.nextElementSibling.classList.toggle('faq-answer--open');
            });
        });

        document.getElementById('mobile-menu-btn')?.addEventListener('click', function() {
            document.getElementById('mobile-menu').classList.toggle('hidden');
        });
    </script>
</body>
</html>`;
}

function renderIndex(pages) {
  const canonical = 'https://www.legacyinvestingshow.com/compare/';
  const isoDate = new Date().toISOString().split('T')[0];

  const cards = pages
    .map((page) => `<article class="library-card">
                    <h3><a href="/compare/${esc(page.slug)}">${esc(page.title)}</a></h3>
                    <p>${esc(page.description)}</p>
                    <div class="library-card__meta">
                        <span><strong>Quick signal:</strong> ${esc(bestText(page))}</span>
                    </div>
                    <a class="library-card__cta" href="/compare/${esc(page.slug)}">Open guide</a>
                </article>`)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Edge-Case Comparison Guides | Legacy Investing Show</title>
    <meta name="description" content="Deep, scenario-driven comparison guides for high-leverage tax and wealth decisions.">
    <meta name="robots" content="index, follow">
${GOOGLE_SITE_VERIFICATIONS.map((code) => `    <meta name="google-site-verification" content="${code}">`).join('\n')}
    <link rel="canonical" href="${canonical}">

    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonical}">
    <meta property="og:title" content="Edge-Case Comparison Guides | Legacy Investing Show">
    <meta property="og:description" content="Deep, scenario-driven comparison guides for high-leverage tax and wealth decisions.">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Edge-Case Comparison Guides | Legacy Investing Show">
    <meta name="twitter:description" content="Deep, scenario-driven comparison guides for high-leverage tax and wealth decisions.">

    <meta name="theme-color" content="#ffffff">
    <link rel="icon" type="image/png" href="/assets/images/logo.png">
    <link rel="stylesheet" href="/assets/css/styles.css">

    <script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Edge-Case Comparison Guides',
      description: 'Scenario-specific comparison pages for complex tax and wealth implementation decisions.',
      datePublished: isoDate,
    })}</script>

    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_CONTAINER_ID}');</script>
    <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${GA_TRACKING_ID}');
    </script>

    <style>
        .library-hero {
            padding: 8rem 0 3.25rem;
            background: linear-gradient(135deg, #f8fafc 0%, #e5e7eb 100%);
        }
        .library-hero h1 {
            font-size: 2.25rem;
            color: #111827;
            margin-bottom: 0.8rem;
            line-height: 1.15;
        }
        @media (min-width: 768px) {
            .library-hero h1 { font-size: 2.8rem; }
        }
        .library-hero p {
            max-width: 54rem;
            color: #4b5563;
            line-height: 1.7;
            font-size: 1.05rem;
        }
        .library-section {
            padding: 3rem 0;
        }
        .library-grid {
            display: grid;
            gap: 1rem;
            grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
        }
        .library-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 0.9rem;
            padding: 1rem;
        }
        .library-card h3 {
            font-size: 1.08rem;
            line-height: 1.4;
            margin-bottom: 0.45rem;
        }
        .library-card h3 a {
            text-decoration: none;
            color: #111827;
        }
        .library-card h3 a:hover {
            text-decoration: underline;
        }
        .library-card p {
            color: #4b5563;
            font-size: 0.94rem;
            line-height: 1.6;
            margin-bottom: 0.6rem;
        }
        .library-card__meta {
            margin-bottom: 0.75rem;
            font-size: 0.86rem;
            color: #065f46;
        }
        .library-card__cta {
            display: inline-block;
            background: #111827;
            color: white;
            text-decoration: none;
            font-weight: 600;
            font-size: 0.85rem;
            border-radius: 0.5rem;
            padding: 0.45rem 0.8rem;
        }
        .library-card__cta:hover {
            background: #1f2937;
        }
        .how-it-works {
            display: grid;
            gap: 1rem;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        }
        .how-step {
            border: 1px solid #e5e7eb;
            border-radius: 0.75rem;
            padding: 1rem;
            background: #f9fafb;
        }
        .how-step__num {
            width: 1.6rem;
            height: 1.6rem;
            border-radius: 999px;
            background: #111827;
            color: white;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 0.78rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
        }
    </style>
</head>
<body class="bg-white text-gray-900">
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_CONTAINER_ID}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
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

                <div class="hidden md:flex items-center gap-6">
                    <a href="/" class="nav-link">Home</a>
                    <a href="/about" class="nav-link">About</a>
                    <a href="/success-stories" class="nav-link">Results</a>
                    <a href="/blog/" class="nav-link">Blog</a>
                </div>

                <button id="mobile-menu-btn" class="md:hidden p-2 text-gray-700" aria-label="Open menu">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                </button>
            </div>

            <div id="mobile-menu" class="hidden md:hidden pb-4">
                <div class="flex flex-col gap-3">
                    <a href="/" class="nav-link">Home</a>
                    <a href="/about" class="nav-link">About</a>
                    <a href="/success-stories" class="nav-link">Results</a>
                    <a href="/blog/" class="nav-link">Blog</a>
                </div>
            </div>
        </nav>
    </header>

    <main id="main">
        <section class="library-hero">
            <div class="container-custom">
                <h1>Edge-Case Comparison Playbooks</h1>
                <p>This library is built for decisions where generic "X is better than Y" content fails. Every page includes a scored decision matrix, scenario modeling, documentation standards, failure controls, and an execution plan you can use with your CPA/advisor.</p>
            </div>
        </section>

        <section class="library-section">
            <div class="container-custom">
                <h2 style="font-size:1.7rem; color:#111827; margin-bottom:1rem;">How to Use These Guides</h2>
                <div class="how-it-works">
                    <article class="how-step">
                        <span class="how-step__num">1</span>
                        <h3 style="font-size:1rem; color:#111827; margin:0 0 0.4rem;">Clarify the objective</h3>
                        <p style="margin:0; color:#4b5563; font-size:0.93rem;">Define whether your priority is tax reduction, cash flow, liquidity, operational simplicity, or risk control.</p>
                    </article>
                    <article class="how-step">
                        <span class="how-step__num">2</span>
                        <h3 style="font-size:1rem; color:#111827; margin:0 0 0.4rem;">Model both paths</h3>
                        <p style="margin:0; color:#4b5563; font-size:0.93rem;">Use the comparison matrix and worked examples to identify practical winners under your assumptions.</p>
                    </article>
                    <article class="how-step">
                        <span class="how-step__num">3</span>
                        <h3 style="font-size:1rem; color:#111827; margin:0 0 0.4rem;">Build controls</h3>
                        <p style="margin:0; color:#4b5563; font-size:0.93rem;">Adopt the documentation and failure-mitigation sections before implementation, not after filing issues appear.</p>
                    </article>
                    <article class="how-step">
                        <span class="how-step__num">4</span>
                        <h3 style="font-size:1rem; color:#111827; margin:0 0 0.4rem;">Review annually</h3>
                        <p style="margin:0; color:#4b5563; font-size:0.93rem;">Re-score annually as income, laws, liquidity needs, and advisor recommendations change.</p>
                    </article>
                </div>
            </div>
        </section>

        <section class="library-section" style="background:#f9fafb;">
            <div class="container-custom">
                <h2 style="font-size:1.7rem; color:#111827; margin-bottom:1rem;">C01-C10 Comparison Pages</h2>
                <div class="library-grid">
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
                    <a href="/success-stories">Results</a>
                    <a href="/blog/">Blog</a>
                    <a href="/tax-strategies/">Tax Strategies</a>
                </div>
            </div>
            <div class="footer-copyright">Copyright 2025</div>
        </div>
    </footer>

    <script defer src="/assets/js/main.js"></script>
    <script>
        document.getElementById('mobile-menu-btn')?.addEventListener('click', function() {
            document.getElementById('mobile-menu').classList.toggle('hidden');
        });
    </script>
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
