#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  CURRENT_YEAR,
  renderAnalyticsBody,
  renderAnalyticsHead,
  renderFooterLinks,
  renderPageCtaSection,
  renderPrimaryNavLinks,
  renderSourceBlock,
} = require('./lib/site-shell');

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

function renderPage(page) {
  const isoDate = new Date().toISOString().split('T')[0];
  const canonical = `https://www.legacyinvestingshow.com/compare/${page.slug}`;
  const { aTotal, bTotal } = computeTotals(page);
  const ninetyDay = normalizeChecklist(page.checklist || []);
  const openingHtml = renderParagraphs(page.opening || []);
  const steps = decisionStepsFor(page);

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

    ${renderAnalyticsHead({ gaTrackingId: GA_TRACKING_ID, gtmContainerId: GTM_CONTAINER_ID })}

    <style>
        .compare-hero {
            padding: 8rem 0 3rem;
            background:
                radial-gradient(circle at top right, rgba(201, 169, 97, 0.18), transparent 36%),
                linear-gradient(180deg, #faf7f2 0%, #ffffff 100%);
        }
        .compare-hero__grid {
            display: grid;
            gap: 1.5rem;
            align-items: start;
        }
        @media (min-width: 1024px) {
            .compare-hero__grid {
                grid-template-columns: minmax(0, 1.55fr) minmax(300px, 0.8fr);
            }
        }
        .compare-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 0.95rem;
            background: #111827;
            color: white;
            font-size: 0.74rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            border-radius: 999px;
            margin-bottom: 1rem;
        }
        .compare-title {
            font-size: clamp(2.25rem, 5vw, 4.3rem);
            line-height: 0.98;
            letter-spacing: -0.04em;
            color: #111827;
            margin-bottom: 0.95rem;
            max-width: 14ch;
        }
        .compare-subtitle {
            max-width: 46rem;
            color: #475569;
            font-size: 1.08rem;
            line-height: 1.78;
        }
        .compare-anchor-nav {
            display: flex;
            flex-wrap: wrap;
            gap: 0.6rem;
            margin-top: 1.3rem;
        }
        .compare-anchor-nav a {
            display: inline-flex;
            align-items: center;
            padding: 0.45rem 0.75rem;
            border-radius: 999px;
            border: 1px solid rgba(15, 23, 42, 0.08);
            background: rgba(255, 255, 255, 0.85);
            color: #334155;
            text-decoration: none;
            font-size: 0.84rem;
            font-weight: 600;
        }
        .compare-anchor-nav a:hover {
            color: #111827;
            border-color: rgba(201, 169, 97, 0.45);
            box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
        }
        .compare-kpis {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.95rem;
            margin-top: 1.4rem;
        }
        @media (min-width: 768px) {
            .compare-kpis {
                grid-template-columns: repeat(4, minmax(0, 1fr));
            }
        }
        .compare-kpi {
            background: rgba(255, 255, 255, 0.92);
            border: 1px solid rgba(15, 23, 42, 0.08);
            border-radius: 1rem;
            padding: 1rem;
            box-shadow: 0 14px 32px rgba(15, 23, 42, 0.05);
        }
        .compare-kpi__label {
            font-size: 0.72rem;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #6b7280;
            margin-bottom: 0.35rem;
            font-weight: 700;
        }
        .compare-kpi__value {
            color: #111827;
            font-weight: 700;
            font-size: 1.02rem;
            line-height: 1.4;
        }
        .compare-kpi__value--good {
            color: #0f766e;
        }
        .compare-hero__panel {
            padding: 1.35rem 1.35rem 1.45rem;
            border-radius: 1.25rem;
            background: linear-gradient(160deg, #182234, #0f172a);
            color: white;
            box-shadow: 0 24px 56px rgba(15, 23, 42, 0.18);
        }
        .compare-hero__panel-eyebrow {
            margin: 0 0 0.55rem;
            color: rgba(217, 196, 138, 0.9);
            font-size: 0.74rem;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
        }
        .compare-hero__panel-title {
            margin: 0 0 0.85rem;
            color: white;
            font-size: 1.5rem;
            line-height: 1.1;
        }
        .compare-hero__panel-text {
            margin: 0;
            color: #cbd5e1;
            font-size: 0.96rem;
            line-height: 1.72;
        }
        .compare-hero__panel-rule {
            margin-top: 1rem;
            padding: 0.95rem 1rem;
            border-radius: 1rem;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .compare-hero__panel-rule span {
            display: block;
            font-size: 0.72rem;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #cbd5e1;
            margin-bottom: 0.35rem;
            font-weight: 700;
        }
        .compare-hero__panel-rule strong {
            color: white;
            font-size: 1rem;
            line-height: 1.5;
        }
        .snapshot-grid {
            display: grid;
            gap: 0.95rem;
            margin-top: 1.35rem;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        }
        .snapshot-card {
            padding: 1rem 1.05rem;
            border-radius: 1rem;
            background: rgba(255, 255, 255, 0.9);
            border: 1px solid rgba(15, 23, 42, 0.08);
            box-shadow: 0 16px 36px rgba(15, 23, 42, 0.05);
        }
        .snapshot-card__eyebrow {
            margin: 0 0 0.45rem;
            color: #b8933f;
            font-size: 0.74rem;
            font-weight: 700;
            letter-spacing: 0.1em;
            text-transform: uppercase;
        }
        .snapshot-card p {
            margin: 0;
            color: #334155;
            font-size: 0.95rem;
            line-height: 1.68;
        }

        .content-section {
            padding: 0 0 3.5rem;
        }
        .content-grid {
            display: grid;
            gap: 1.75rem;
            align-items: start;
        }
        @media (min-width: 1024px) {
            .content-grid {
                grid-template-columns: minmax(0, 1.8fr) minmax(290px, 0.8fr);
            }
        }
        .prose-content {
            padding: 1.45rem;
            border-radius: 1.5rem;
            background: rgba(255, 255, 255, 0.96);
            border: 1px solid rgba(15, 23, 42, 0.08);
            box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
            color: #374151;
            line-height: 1.78;
        }
        .prose-content h2 {
            color: #111827;
            font-size: clamp(1.65rem, 2.5vw, 2.35rem);
            line-height: 1.08;
            margin-bottom: 0.95rem;
        }
        .prose-content h3 {
            color: #111827;
            font-size: 1.18rem;
            margin: 1.65rem 0 0.65rem;
            line-height: 1.35;
        }
        .prose-content p {
            margin-bottom: 1rem;
        }
        .prose-content ul,
        .prose-content ol {
            padding-left: 1.25rem;
            margin: 0.6rem 0 1rem;
        }
        .prose-content li {
            margin-bottom: 0.55rem;
        }
        .compare-note {
            background: #ecfdf5;
            border-left: 4px solid #10b981;
            padding: 1rem 1rem;
            border-radius: 0.9rem;
            color: #065f46;
        }
        .compare-note--warning {
            margin-top: 1rem;
            background: #fff7ed;
            border-left-color: #f59e0b;
            color: #9a3412;
        }

        .table-wrap {
            border: 1px solid rgba(15, 23, 42, 0.08);
            border-radius: 1rem;
            overflow-x: auto;
            background: white;
            margin-top: 1rem;
            box-shadow: 0 18px 40px rgba(15, 23, 42, 0.06);
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
            font-size: 0.78rem;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            padding: 0.9rem 0.85rem;
            vertical-align: top;
        }
        .compare-table td {
            border-bottom: 1px solid #e5e7eb;
            padding: 0.88rem;
            vertical-align: top;
            color: #374151;
            font-size: 0.94rem;
            line-height: 1.62;
        }
        .compare-table tr.alt td {
            background: #f8fafc;
        }

        .split-panels {
            display: grid;
            gap: 1rem;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            margin-top: 1rem;
        }
        .panel {
            border: 1px solid rgba(15, 23, 42, 0.08);
            border-radius: 1rem;
            background: rgba(250, 247, 242, 0.65);
            padding: 1rem;
        }
        .panel h3 {
            margin-top: 0;
        }

        .sidebar {
            display: grid;
            gap: 1rem;
        }
        @media (min-width: 1024px) {
            .sidebar {
                position: sticky;
                top: 6rem;
            }
        }
        .sidebar-card {
            background: rgba(255, 255, 255, 0.92);
            border: 1px solid rgba(15, 23, 42, 0.08);
            border-radius: 1rem;
            padding: 1rem;
            box-shadow: 0 16px 36px rgba(15, 23, 42, 0.05);
        }
        .sidebar-card--dark {
            background: linear-gradient(160deg, #182234, #0f172a);
            color: white;
            box-shadow: 0 22px 54px rgba(15, 23, 42, 0.18);
        }
        .sidebar-card__eyebrow {
            margin: 0 0 0.45rem;
            color: rgba(217, 196, 138, 0.92);
            font-size: 0.72rem;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
        }
        .sidebar-card--dark .sidebar-card__title {
            color: white;
        }
        .sidebar-card__title {
            font-size: 1.05rem;
            font-weight: 700;
            color: #111827;
            margin-bottom: 0.75rem;
            line-height: 1.35;
        }
        .sidebar-card__body {
            margin: 0;
            color: inherit;
            font-size: 0.93rem;
            line-height: 1.68;
        }
        .sidebar-card__body--muted {
            color: #cbd5e1;
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
            border-radius: 1rem;
            margin-bottom: 0.9rem;
            overflow: hidden;
            border: 1px solid rgba(15, 23, 42, 0.08);
            box-shadow: 0 14px 30px rgba(15, 23, 42, 0.05);
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
            border-radius: 1.4rem;
            padding: 2.75rem 1.5rem;
            color: white;
            box-shadow: 0 28px 70px rgba(15, 23, 42, 0.2);
        }
        .cta-card__title {
            font-size: 1.9rem;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 0.85rem;
        }
        .cta-card__text {
            color: #d1d5db;
            max-width: 46rem;
            margin: 0 auto 1.4rem;
            line-height: 1.72;
        }
        .cta-card__button {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.9rem 1.65rem;
            background: #10b981;
            color: white;
            border-radius: 999px;
            font-weight: 700;
            text-decoration: none;
        }
        .cta-card__button:hover {
            background: #059669;
            transform: translateY(-1px);
        }

        .breadcrumb {
            padding: 1rem 0 1.2rem;
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
                padding: 6.7rem 0 2.35rem;
            }
            .compare-title {
                max-width: none;
            }
            .compare-subtitle {
                font-size: 1rem;
                line-height: 1.68;
            }
            .compare-kpis {
                grid-template-columns: 1fr;
                gap: 0.75rem;
            }
            .content-section {
                padding-bottom: 2.5rem;
            }
            .prose-content {
                padding: 1.15rem;
            }
            .prose-content h2 {
                font-size: 1.45rem;
            }
            .prose-content h3 {
                font-size: 1.08rem;
            }
            .table-wrap {
                margin-left: -0.15rem;
                margin-right: -0.15rem;
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
            .split-panels,
            .snapshot-grid {
                grid-template-columns: 1fr;
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
<body class="bg-white text-gray-900" data-page-type="compare" data-page-slug="${esc(page.slug)}" data-page-title="${esc(page.title)}">
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
                    ${renderPrimaryNavLinks('/compare/')}
                </div>

                <button id="mobile-menu-btn" class="md:hidden p-2 text-gray-700" aria-label="Open menu">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                </button>
            </div>

            <div id="mobile-menu" class="hidden md:hidden pb-4">
                <div class="flex flex-col gap-3">
                    ${renderPrimaryNavLinks('/compare/')}
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
                <div class="compare-hero__grid">
                    <div>
                        <span class="compare-badge">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M8 12h8M8 8h8M8 16h8M4 8h.01M4 12h.01M4 16h.01"/>
                            </svg>
                            Edge-Case Comparison
                        </span>
                        <h1 class="compare-title">${esc(page.title)}</h1>
                        <p class="compare-subtitle">${esc(page.description)}</p>

                        <div class="compare-anchor-nav">
                            <a href="#executive-summary">Executive Summary</a>
                            <a href="#comparison-matrix">Decision Scorecard</a>
                            <a href="#worked-example">Worked Example</a>
                            <a href="#execution-plan">90-Day Plan</a>
                            <a href="#advisor-packet">Advisor Packet</a>
                        </div>

                        <div class="compare-kpis">
                            <div class="compare-kpi">
                                <div class="compare-kpi__label">Quick Verdict</div>
                                <div class="compare-kpi__value compare-kpi__value--good">${esc(page.quickVerdict || bestText(page))}</div>
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

                    <aside class="compare-hero__panel">
                        <p class="compare-hero__panel-eyebrow">Who this page is for</p>
                        <h2 class="compare-hero__panel-title">${esc(page.bestFor || page.description)}</h2>
                        <p class="compare-hero__panel-text">${esc(page.intro)}</p>
                        <div class="compare-hero__panel-rule">
                            <span>Read this before you decide</span>
                            <strong>${esc(page.quickVerdict || bestText(page))}</strong>
                        </div>
                    </aside>
                </div>

                <div class="snapshot-grid">
                    <article class="snapshot-card">
                        <p class="snapshot-card__eyebrow">When ${esc(page.optionAName)} Wins</p>
                        <p>${esc(page.whenA)}</p>
                    </article>
                    <article class="snapshot-card">
                        <p class="snapshot-card__eyebrow">When ${esc(page.optionBName)} Wins</p>
                        <p>${esc(page.whenB)}</p>
                    </article>
                    <article class="snapshot-card">
                        <p class="snapshot-card__eyebrow">Where People Lose Money</p>
                        <p>${esc(page.commonMistake || 'Forcing the facts to match the strategy after the year is over.')}</p>
                    </article>
                </div>
            </div>
        </section>

        <section class="content-section">
            <div class="container-custom content-grid">
                <article class="prose-content">
                    <h2 id="executive-summary">Executive Summary</h2>
                    ${openingHtml}
                    <div class="compare-note"><strong>Bottom line:</strong> ${esc(page.intro)}</div>
                    <div class="split-panels">
                        <article class="panel">
                            <h3>When ${esc(page.optionAName)} tends to win</h3>
                            <p>${esc(page.whenA)}</p>
                        </article>
                        <article class="panel">
                            <h3>When ${esc(page.optionBName)} tends to win</h3>
                            <p>${esc(page.whenB)}</p>
                        </article>
                    </div>
                    <div class="compare-note compare-note--warning"><strong>Where people lose money:</strong> ${esc(page.commonMistake || 'Forcing the facts to match the strategy after the year is over.')}</div>
                    <p>This page is written like a playbook. Use it to make the decision early, set guardrails, and keep your documentation clean while you execute.</p>

                    <h2 id="comparison-matrix">Decision Scorecard</h2>
                    <p>The table below forces tradeoffs. The score is directional, not a guarantee. Your facts and your documentation decide what is actually defensible.</p>
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
                    <p>${esc(page.decisionFrameworkLead || 'This only works when execution is clean. Run this sequence before you commit.')}</p>
                    <ol>
                        ${steps.map((item) => `<li>${esc(item)}</li>`).join('')}
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

                    ${renderSourceBlock({ title: page.title, slug: page.slug, type: 'compare' })}
                </article>

                <aside class="sidebar">
                    <div class="sidebar-card sidebar-card--dark">
                        <p class="sidebar-card__eyebrow">Decision Signal</p>
                        <h3 class="sidebar-card__title">${esc(page.quickVerdict || bestText(page))}</h3>
                        <p class="sidebar-card__body sidebar-card__body--muted">${esc(page.bestFor || page.description)}</p>
                    </div>

                    <div class="sidebar-card">
                        <h3 class="sidebar-card__title">Page Outline</h3>
                        <ul class="sidebar-list">
                            <li><a href="#executive-summary">Executive Summary</a></li>
                            <li><a href="#comparison-matrix">Decision Scorecard</a></li>
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

                    <div class="sidebar-card">
                        <h3 class="sidebar-card__title">Important</h3>
                        <p class="sidebar-card__body">Use this as an educational decision brief, not personalized tax or legal advice. The right answer depends on your facts, your records, and your advisor review.</p>
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
                ${renderPageCtaSection({
                  variant: 'tax_masterclass',
                  title: 'Take The Comparison Into Before You File',
                  text: 'The live challenge runs March 27-29, 2026, from 10 AM to 4 PM Eastern each day. Day 1 helps you read the return, Day 2 builds the strategy stack, and Day 3 turns it into a dated 12-month execution plan.',
                  trackLocation: 'compare_page_cta',
                })}
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
                    <div class="library-card__eyebrow">${esc(page.bestFor || 'Decision playbook')}</div>
                    <h3><a href="/compare/${esc(page.slug)}">${esc(page.title)}</a></h3>
                    <p>${esc(page.description)}</p>
                    <div class="library-card__meta">
                        <span><strong>Quick signal:</strong> ${esc(page.quickVerdict || bestText(page))}</span>
                    </div>
                    <a class="library-card__cta" href="/compare/${esc(page.slug)}">Open playbook</a>
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

    ${renderAnalyticsHead({ gaTrackingId: GA_TRACKING_ID, gtmContainerId: GTM_CONTAINER_ID })}

    <style>
        .library-hero {
            padding: 8rem 0 3.25rem;
            background:
                radial-gradient(circle at top right, rgba(201, 169, 97, 0.18), transparent 38%),
                linear-gradient(180deg, #faf7f2 0%, #ffffff 100%);
        }
        .library-hero__grid {
            display: grid;
            gap: 1.25rem;
            align-items: start;
        }
        @media (min-width: 1024px) {
            .library-hero__grid {
                grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.85fr);
            }
        }
        .library-hero__eyebrow {
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
        .library-hero__eyebrow::before {
            content: "";
            width: 0.45rem;
            height: 0.45rem;
            border-radius: 999px;
            background: #c9a961;
        }
        .library-hero h1 {
            font-size: clamp(2.35rem, 5vw, 4.2rem);
            color: #111827;
            margin-bottom: 0.9rem;
            line-height: 0.98;
            letter-spacing: -0.04em;
            max-width: 12ch;
        }
        .library-hero p {
            max-width: 48rem;
            color: #475569;
            line-height: 1.78;
            font-size: 1.06rem;
            margin-bottom: 0.9rem;
        }
        .library-hero__panel {
            padding: 1.25rem;
            border-radius: 1.25rem;
            background: linear-gradient(160deg, #182234, #0f172a);
            color: white;
            box-shadow: 0 22px 54px rgba(15, 23, 42, 0.18);
        }
        .library-hero__stat {
            padding: 0.85rem 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .library-hero__stat:last-child {
            border-bottom: none;
            padding-bottom: 0;
        }
        .library-hero__stat strong {
            display: block;
            font-size: 1.7rem;
            line-height: 1;
            color: white;
        }
        .library-hero__stat span {
            display: block;
            margin-top: 0.35rem;
            color: #cbd5e1;
            font-size: 0.92rem;
            line-height: 1.6;
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
            display: flex;
            flex-direction: column;
            gap: 0.8rem;
            background: rgba(255, 255, 255, 0.95);
            border: 1px solid rgba(15, 23, 42, 0.08);
            border-radius: 1.15rem;
            padding: 1.1rem;
            box-shadow: 0 18px 40px rgba(15, 23, 42, 0.06);
        }
        .library-card__eyebrow {
            color: #b8933f;
            font-size: 0.74rem;
            font-weight: 700;
            letter-spacing: 0.11em;
            text-transform: uppercase;
        }
        .library-card h3 {
            font-size: 1.12rem;
            line-height: 1.38;
            margin-bottom: 0;
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
            line-height: 1.68;
            margin-bottom: 0;
        }
        .library-card__meta {
            font-size: 0.88rem;
            color: #065f46;
            line-height: 1.6;
        }
        .library-card__cta {
            display: inline-flex;
            align-items: center;
            gap: 0.45rem;
            align-self: flex-start;
            background: #111827;
            color: white;
            text-decoration: none;
            font-weight: 700;
            font-size: 0.85rem;
            border-radius: 999px;
            padding: 0.55rem 0.9rem;
        }
        .library-card__cta:hover {
            background: #1f2937;
            transform: translateY(-1px);
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
<body class="bg-white text-gray-900" data-page-type="compare_hub" data-page-title="Edge-Case Comparison Guides">
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
                    ${renderPrimaryNavLinks('/compare/')}
                </div>

                <button id="mobile-menu-btn" class="md:hidden p-2 text-gray-700" aria-label="Open menu">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                </button>
            </div>

            <div id="mobile-menu" class="hidden md:hidden pb-4">
                <div class="flex flex-col gap-3">
                    ${renderPrimaryNavLinks('/compare/')}
                </div>
            </div>
        </nav>
    </header>

    <main id="main">
        <section class="library-hero">
            <div class="container-custom">
                <div class="library-hero__grid">
                    <div>
                        <span class="library-hero__eyebrow">Decision Library</span>
                        <h1>Comparison Playbooks for Expensive Money Decisions</h1>
                        <p>If you make good money but still feel like one wrong move can set you back, this library is for you. These are not vague "it depends" articles. They show where the math works, where execution usually breaks, and what to bring to your CPA before you move money.</p>
                        <p>Each guide includes a scorecard, worked example, documentation standard, failure modes, and a 90-day action plan built for real life.</p>
                    </div>
                    <aside class="library-hero__panel">
                        <div class="library-hero__stat">
                            <strong>${pages.length}</strong>
                            <span>Scenario-specific playbooks for tax, retirement, real-estate, and operating decisions.</span>
                        </div>
                        <div class="library-hero__stat">
                            <strong>1</strong>
                            <span>Question that matters: what still works when the facts are less perfect than the plan.</span>
                        </div>
                        <div class="library-hero__stat">
                            <strong>90</strong>
                            <span>Day implementation path included in every guide so the decision survives contact with real life.</span>
                        </div>
                    </aside>
                </div>
            </div>
        </section>

        <section class="library-section">
            <div class="container-custom">
                <h2 style="font-size:1.7rem; color:#111827; margin-bottom:1rem;">How to Use These Guides</h2>
                <div class="how-it-works">
                    <article class="how-step">
                        <span class="how-step__num">1</span>
                        <h3 style="font-size:1rem; color:#111827; margin:0 0 0.4rem;">Clarify the objective</h3>
                        <p style="margin:0; color:#4b5563; font-size:0.93rem;">Pick one primary objective first: lower tax, better cash flow, more liquidity, or simpler execution.</p>
                    </article>
                    <article class="how-step">
                        <span class="how-step__num">2</span>
                        <h3 style="font-size:1rem; color:#111827; margin:0 0 0.4rem;">Model both paths</h3>
                        <p style="margin:0; color:#4b5563; font-size:0.93rem;">Run the matrix and the scenario model. Use conservative assumptions. No fantasy numbers.</p>
                    </article>
                    <article class="how-step">
                        <span class="how-step__num">3</span>
                        <h3 style="font-size:1rem; color:#111827; margin:0 0 0.4rem;">Build controls</h3>
                        <p style="margin:0; color:#4b5563; font-size:0.93rem;">Set the documentation standard and guardrails before you execute. Year-end scrambling is where people get hurt.</p>
                    </article>
                    <article class="how-step">
                        <span class="how-step__num">4</span>
                        <h3 style="font-size:1rem; color:#111827; margin:0 0 0.4rem;">Review annually</h3>
                        <p style="margin:0; color:#4b5563; font-size:0.93rem;">Re-score every year. Income, laws, and life change. The plan should change too.</p>
                    </article>
                </div>
            </div>
        </section>

        <section class="library-section" style="background:#f9fafb;">
            <div class="container-custom">
                <h2 style="font-size:1.7rem; color:#111827; margin-bottom:1rem;">Featured Comparison Guides</h2>
                <div class="library-grid">
                    ${cards}
                </div>
                <p style="margin:1.5rem 0 0; color:#6b7280; font-size:0.95rem; line-height:1.65; max-width:60rem;">Educational content only. Results vary based on your facts. Always consult a qualified tax professional before making decisions.</p>
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
