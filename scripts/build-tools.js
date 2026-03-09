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
const DATA_PATH = path.join(ROOT_DIR, 'data', 'tools.json');
const OUTPUT_DIR = path.join(ROOT_DIR, 'tools');

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

function renderRelated(items = []) {
  if (!Array.isArray(items) || items.length === 0) return '';
  return items
    .map((item) => `<li><a href="${esc(item.href)}">${esc(item.label)}</a></li>`)
    .join('\n');
}

function faqSchema(tool) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: (tool.faq || []).map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };
}

function softwareApplicationSchema(tool, isoDate) {
  const featureList = ['Interactive calculator', 'Worked execution notes', 'Documentation checklist', 'FAQ'];
  const sectionTitles = (tool.sections || []).map((section) => section.title).filter(Boolean);

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: tool.title,
    description: tool.description,
    applicationCategory: 'FinanceApplication',
    applicationSubCategory: tool.badge || 'Tax and wealth planning tool',
    operatingSystem: 'Web',
    isAccessibleForFree: true,
    browserRequirements: 'Requires JavaScript',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: [...featureList, ...sectionTitles].slice(0, 6),
    keywords: [tool.title, tool.badge, ...(tool.related || []).map((item) => item.label)].filter(Boolean).join(', '),
    datePublished: isoDate,
    dateModified: isoDate,
    url: `https://www.legacyinvestingshow.com/tools/${tool.slug}`,
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

function toolKeywords(tool) {
  const values = [
    tool.title,
    tool.badge,
    tool.description,
    ...(tool.sections || []).map((section) => section.title),
    ...(tool.related || []).map((item) => item.label),
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(/[,|]/))
    .map((value) => value.trim())
    .filter(Boolean);

  return [...new Set(values)].slice(0, 12).join(', ');
}

function toolTheme(tool) {
  const haystack = `${tool.title || ''} ${tool.badge || ''} ${tool.description || ''}`.toLowerCase();

  if (/estimated tax|safe harbor|annualized|withholding/.test(haystack)) {
    return {
      key: 'estimated-tax',
      label: 'Estimated Tax',
      summary: 'Quarterly payment planning, catch-up math, and underpayment guardrails.',
    };
  }

  if (/roth|irmaa|qcd|backdoor|401\(k\)|401k/.test(haystack)) {
    return {
      key: 'retirement',
      label: 'Retirement Planning',
      summary: 'Conversion headroom, withdrawal sequencing, and account-level tradeoffs.',
    };
  }

  if (/capital gains|installment sale/.test(haystack)) {
    return {
      key: 'capital-gains',
      label: 'Capital Gains',
      summary: 'Sale timing, cash-flow pacing, and gain management decisions.',
    };
  }

  if (/cost segregation|real estate|augusta|heloc|rep status|hours tracker/.test(haystack)) {
    return {
      key: 'real-estate',
      label: 'Real Estate Ops',
      summary: 'Documentation, property strategy math, and operator discipline.',
    };
  }

  return {
    key: 'entity-workflows',
    label: 'Entity Workflows',
    summary: 'Reimbursement, compliance, and owner-operator process cleanup.',
  };
}

function breadcrumbSchema(tool) {
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
        name: 'Tools',
        item: 'https://www.legacyinvestingshow.com/tools',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: tool.title,
        item: `https://www.legacyinvestingshow.com/tools/${tool.slug}`,
      },
    ],
  };
}

function toolIndexSchema(tools, isoDate) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Free Tools (Execution-First)',
    description: 'Free calculators and planning tools for tax, retirement, and wealth-building decisions.',
    datePublished: isoDate,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: tools.map((tool, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `https://www.legacyinvestingshow.com/tools/${tool.slug}`,
        name: tool.title,
      })),
    },
  };
}

function toolAnchors(tool) {
  const anchors = [];
  anchors.push({ href: '#calculator', label: 'Calculator' });
  (tool.sections || []).forEach((section) => {
    if (section && section.id && section.title) anchors.push({ href: `#${section.id}`, label: section.title });
  });
  anchors.push({ href: '#faq', label: 'FAQ' });
  return anchors;
}

function renderJumpBar(tool) {
  const anchors = toolAnchors(tool);
  return `<div class="jumpbar-wrap" aria-label="Page navigation">
            <div class="jumpbar">
              <span class="jumpbar__label">Jump:</span>
              <div class="jumpbar__links">
                ${anchors
                  .map((a) => `<a class="jumpbar__link" href="${esc(a.href)}">${esc(a.label)}</a>`)
                  .join('\n')}
              </div>
            </div>
        </div>`;
}

function renderRelatedSection(tool) {
  const related = Array.isArray(tool.related) ? tool.related : [];
  if (!related.length) return '';

  const cards = related
    .slice(0, 6)
    .map(
      (item) => `<article class="related-card">
                  <h3 class="related-card__title">${esc(item.label)}</h3>
                  <a class="related-card__cta" href="${esc(item.href)}">Open guide</a>
                </article>`
    )
    .join('\n');

  return `<section class="related-section" aria-label="Related guides">
            <h2 class="related-section__title">Related Guides</h2>
            <div class="related-grid">
              ${cards}
            </div>
          </section>`;
}

function toolWidget(tool) {
  if (tool.id === 'T01') return widgetSafeHarbor();
  if (tool.id === 'T02') return widgetAccountablePlan();
  if (tool.id === 'T03') return widgetAugustaRule();
  if (tool.id === 'T04') return widgetAnnualizedIncome();
  if (tool.id === 'T05') return widgetHoursTracker();
  if (tool.id === 'T06') return widgetCostSegPayback();
  if (tool.id === 'T07') return widgetIrmaaHeadroom();
  if (tool.id === 'T08') return widgetQcdRothPlanner();
  if (tool.id === 'T09') return widgetLoanComparator();
  if (tool.id === 'T10') return widgetInstallmentSalePlanner();
  if (tool.id === 'T11') return widgetBackdoorRothProrata();
  if (tool.id === 'T12') return widgetWithholdingCatchUp();
  if (tool.id === 'T13') return widgetCapitalGainsHeadroom();
  return `<div class="tool-card"><p>Tool widget not implemented.</p></div>`;
}

function widgetSafeHarbor() {
  return `<section class="tool-card" id="calculator" aria-label="Estimated tax safe harbor planner">
            <div class="tool-card__header">
              <h2 class="tool-card__title">Safe Harbor Catch-Up Planner</h2>
              <p class="tool-card__subtitle">Conservative baseline first. Then a payment plan you can actually execute.</p>
            </div>

            <div class="tool-grid">
              <form class="tool-form" id="t01-form">
                <div class="field-row">
                  <div class="field">
                    <label for="t01-filing">Filing status</label>
                    <select id="t01-filing">
                      <option value="mfj">Married filing jointly</option>
                      <option value="single">Single</option>
                      <option value="hoh">Head of household</option>
                      <option value="mfs">Married filing separately</option>
                    </select>
                  </div>
                  <div class="field">
                    <label for="t01-priorAgi">Prior-year AGI (rough)</label>
                    <input id="t01-priorAgi" inputmode="decimal" type="text" placeholder="e.g. 240000">
                  </div>
                </div>

                <div class="field-row">
                  <div class="field">
                    <label for="t01-priorTax">Prior-year total tax (Form 1040 total tax)</label>
                    <input id="t01-priorTax" inputmode="decimal" type="text" placeholder="e.g. 62000">
                  </div>
                  <div class="field">
                    <label for="t01-safePct">Safe-harbor percentage (override)</label>
                    <select id="t01-safePct">
                      <option value="auto">Auto (100% or 110% based on AGI)</option>
                      <option value="1.0">100%</option>
                      <option value="1.1">110%</option>
                    </select>
                  </div>
                </div>

                <div class="field-row">
                  <div class="field">
                    <label for="t01-withholding">Estimated total withholding for the year</label>
                    <input id="t01-withholding" inputmode="decimal" type="text" placeholder="e.g. 38000">
                  </div>
                  <div class="field">
                    <label for="t01-paid">Estimated payments already made (year-to-date)</label>
                    <input id="t01-paid" inputmode="decimal" type="text" placeholder="e.g. 8000">
                  </div>
                </div>

                <div class="field-row">
                  <div class="field">
                    <label for="t01-remaining">Payments remaining this year</label>
                    <select id="t01-remaining">
                      <option value="4">4 (start of year)</option>
                      <option value="3">3</option>
                      <option value="2">2</option>
                      <option value="1">1</option>
                    </select>
                    <div class="hint">Pick what you will actually do. Execution beats theory.</div>
                  </div>
                  <div class="field">
                    <label for="t01-buffer">Conservatism buffer</label>
                    <select id="t01-buffer">
                      <option value="0">0%</option>
                      <option value="0.05">+5%</option>
                      <option value="0.10">+10%</option>
                    </select>
                    <div class="hint">If your income is lumpy, a small buffer reduces surprise.</div>
                  </div>
                </div>

                <button type="button" class="tool-button" id="t01-calc">Calculate plan</button>
              </form>

              <div class="tool-results" aria-live="polite">
                <div class="results-kpis">
                  <div class="kpi">
                    <div class="kpi__label">Safe-harbor annual target</div>
                    <div class="kpi__value" id="t01-kpi-target">$0</div>
                    <div class="kpi__meta" id="t01-kpi-pct">Using 100%</div>
                  </div>
                  <div class="kpi">
                    <div class="kpi__label">Covered by withholding + paid</div>
                    <div class="kpi__value" id="t01-kpi-covered">$0</div>
                    <div class="kpi__meta">Estimated</div>
                  </div>
                  <div class="kpi">
                    <div class="kpi__label">Remaining to pay</div>
                    <div class="kpi__value kpi__value--good" id="t01-kpi-remaining">$0</div>
                    <div class="kpi__meta" id="t01-kpi-note">Spread across remaining payments</div>
                  </div>
                </div>

                <div class="results-table-wrap" role="region" aria-label="Payment plan table">
                  <table class="results-table">
                    <thead>
                      <tr>
                        <th>Payment #</th>
                        <th>Recommended amount</th>
                        <th>Execution note</th>
                      </tr>
                    </thead>
                    <tbody id="t01-plan-rows"></tbody>
                  </table>
                </div>

                <div class="results-note" id="t01-warning" style="display:none;"></div>
                <div class="results-note results-note--alt">
                  Keep this boring: 1) run the tool monthly, 2) adjust when your paycheck or profit changes, 3) keep one evidence folder per year.
                </div>
              </div>
            </div>
        </section>

        <script>
          (function() {
            function parseMoney(raw) {
              if (raw == null) return 0;
              const cleaned = String(raw).replace(/[^0-9.\\-]/g, '');
              const num = Number(cleaned);
              return Number.isFinite(num) ? num : 0;
            }
            function fmtUSD(n) {
              const v = Number.isFinite(n) ? n : 0;
              return v.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
            }
            function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

            function computeSafePct(filing, priorAgi) {
              const agi = priorAgi || 0;
              const threshold = (filing === 'mfs') ? 75000 : 150000;
              return (agi > threshold) ? 1.1 : 1.0;
            }

            function buildPlanRows(count, perPayment) {
              const rows = [];
              for (let i = 1; i <= count; i++) {
                const note = (i === 1)
                  ? 'Pay early if you are catching up. Then keep the cadence.'
                  : 'Treat this like a recurring bill, not a guess.';
                rows.push({ idx: i, amount: perPayment, note });
              }
              return rows;
            }

            function calculate() {
              const filing = document.getElementById('t01-filing').value;
              const priorAgi = parseMoney(document.getElementById('t01-priorAgi').value);
              const priorTax = parseMoney(document.getElementById('t01-priorTax').value);
              const withholding = parseMoney(document.getElementById('t01-withholding').value);
              const paid = parseMoney(document.getElementById('t01-paid').value);
              const remainingCount = Number(document.getElementById('t01-remaining').value) || 4;
              const bufferPct = Number(document.getElementById('t01-buffer').value) || 0;

              const pctSel = document.getElementById('t01-safePct').value;
              const autoPct = computeSafePct(filing, priorAgi);
              const pct = (pctSel === 'auto') ? autoPct : Number(pctSel);

              const rawTarget = priorTax * pct;
              const target = rawTarget * (1 + bufferPct);
              const covered = Math.max(0, withholding + paid);
              const remaining = Math.max(0, target - covered);
              const perPayment = remainingCount > 0 ? (remaining / remainingCount) : remaining;

              document.getElementById('t01-kpi-target').textContent = fmtUSD(target);
              document.getElementById('t01-kpi-covered').textContent = fmtUSD(covered);
              document.getElementById('t01-kpi-remaining').textContent = fmtUSD(remaining);
              document.getElementById('t01-kpi-pct').textContent = 'Using ' + Math.round(pct * 100) + '%';
              document.getElementById('t01-kpi-note').textContent = 'Spread across ' + remainingCount + ' payment' + (remainingCount === 1 ? '' : 's');

              const tbody = document.getElementById('t01-plan-rows');
              tbody.innerHTML = '';
              buildPlanRows(remainingCount, perPayment).forEach((row) => {
                const tr = document.createElement('tr');
                tr.innerHTML = '<td data-label=\"Payment #\"><strong>' + row.idx + '</strong></td>' +
                               '<td data-label=\"Recommended amount\">' + fmtUSD(row.amount) + '</td>' +
                               '<td data-label=\"Execution note\">' + row.note + '</td>';
                tbody.appendChild(tr);
              });

              const warn = document.getElementById('t01-warning');
              const msgs = [];
              if (priorTax <= 0) msgs.push('Enter your prior-year total tax to build a baseline.');
              if (remainingCount < 4) msgs.push('Catch-up plans can be lumpy. Consider increasing withholding if you want smoother cash flow.');
              if (remaining === 0 && priorTax > 0) msgs.push('Based on these inputs, you are already at or above the safe-harbor floor.');
              warn.style.display = msgs.length ? 'block' : 'none';
              warn.textContent = msgs.join(' ');
            }

            document.getElementById('t01-calc').addEventListener('click', calculate);
          })();
        </script>`;
}

function widgetAccountablePlan() {
  return `<section class="tool-card" id="calculator" aria-label="Accountable plan home office reimbursement calculator">
            <div class="tool-card__header">
              <h2 class="tool-card__title">Home Office Reimbursement Calculator</h2>
              <p class="tool-card__subtitle">Square-foot allocation, reimbursement cadence, and a documentation checklist.</p>
            </div>

            <div class="tool-grid">
              <form class="tool-form" id="t02-form">
                <div class="field-row">
                  <div class="field">
                    <label for="t02-totalSqft">Total home square footage</label>
                    <input id="t02-totalSqft" inputmode="decimal" type="text" placeholder="e.g. 2400">
                  </div>
                  <div class="field">
                    <label for="t02-officeSqft">Dedicated office square footage</label>
                    <input id="t02-officeSqft" inputmode="decimal" type="text" placeholder="e.g. 240">
                  </div>
                </div>

                <div class="field-row">
                  <div class="field">
                    <label for="t02-rent">Annual rent (or mortgage interest as proxy)</label>
                    <input id="t02-rent" inputmode="decimal" type="text" placeholder="e.g. 36000">
                    <div class="hint">This is a simplified model. Your CPA may categorize differently.</div>
                  </div>
                  <div class="field">
                    <label for="t02-utilities">Annual utilities (electric, gas, water)</label>
                    <input id="t02-utilities" inputmode="decimal" type="text" placeholder="e.g. 4200">
                  </div>
                </div>

                <div class="field-row">
                  <div class="field">
                    <label for="t02-internet">Annual internet</label>
                    <input id="t02-internet" inputmode="decimal" type="text" placeholder="e.g. 1200">
                  </div>
                  <div class="field">
                    <label for="t02-insurance">Annual homeowners or renters insurance</label>
                    <input id="t02-insurance" inputmode="decimal" type="text" placeholder="e.g. 1800">
                  </div>
                </div>

                <div class="field-row">
                  <div class="field">
                    <label for="t02-repairs">Annual repairs and maintenance</label>
                    <input id="t02-repairs" inputmode="decimal" type="text" placeholder="e.g. 1500">
                  </div>
                  <div class="field">
                    <label for="t02-hoa">Annual HOA (if any)</label>
                    <input id="t02-hoa" inputmode="decimal" type="text" placeholder="e.g. 0">
                  </div>
                </div>

                <div class="field-row">
                  <div class="field">
                    <label for="t02-cadence">Reimbursement cadence</label>
                    <select id="t02-cadence">
                      <option value="12">Monthly</option>
                      <option value="4">Quarterly</option>
                      <option value="1">Annual</option>
                    </select>
                    <div class="hint">Monthly is usually easier to document and defend.</div>
                  </div>
                  <div class="field">
                    <label for="t02-buffer">Conservatism buffer</label>
                    <select id="t02-buffer">
                      <option value="0">0%</option>
                      <option value="-0.05">-5% (extra conservative)</option>
                      <option value="-0.10">-10% (very conservative)</option>
                    </select>
                    <div class="hint">If you want fewer debates, round down.</div>
                  </div>
                </div>

                <button type="button" class="tool-button" id="t02-calc">Calculate reimbursement</button>
              </form>

              <div class="tool-results" aria-live="polite">
                <div class="results-kpis">
                  <div class="kpi">
                    <div class="kpi__label">Business-use percentage</div>
                    <div class="kpi__value" id="t02-kpi-pct">0%</div>
                    <div class="kpi__meta">Dedicated space assumption</div>
                  </div>
                  <div class="kpi">
                    <div class="kpi__label">Estimated annual reimbursement</div>
                    <div class="kpi__value kpi__value--good" id="t02-kpi-annual">$0</div>
                    <div class="kpi__meta" id="t02-kpi-buffer">Conservative rounding</div>
                  </div>
                  <div class="kpi">
                    <div class="kpi__label">Per-payment reimbursement</div>
                    <div class="kpi__value" id="t02-kpi-per">$0</div>
                    <div class="kpi__meta" id="t02-kpi-cadence">Monthly</div>
                  </div>
                </div>

                <div class="results-table-wrap" role="region" aria-label="Allocation table">
                  <table class="results-table">
                    <thead>
                      <tr>
                        <th>Expense category</th>
                        <th>Annual expense</th>
                        <th>Allocated reimbursement</th>
                      </tr>
                    </thead>
                    <tbody id="t02-rows"></tbody>
                  </table>
                </div>

                <div class="results-note" id="t02-warning" style="display:none;"></div>
                <div class="results-note results-note--alt">
                  Execution standard: keep the same worksheet, folder structure, and reimbursement request format every month.
                </div>
              </div>
            </div>
        </section>

        <script>
          (function() {
            function parseMoney(raw) {
              if (raw == null) return 0;
              const cleaned = String(raw).replace(/[^0-9.\\-]/g, '');
              const num = Number(cleaned);
              return Number.isFinite(num) ? num : 0;
            }
            function fmtUSD(n) {
              const v = Number.isFinite(n) ? n : 0;
              return v.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
            }

            function calculate() {
              const totalSqft = parseMoney(document.getElementById('t02-totalSqft').value);
              const officeSqft = parseMoney(document.getElementById('t02-officeSqft').value);
              const cadence = Number(document.getElementById('t02-cadence').value) || 12;
              const buffer = Number(document.getElementById('t02-buffer').value) || 0;

              const expenses = [
                { key: 'Rent / mortgage proxy', val: parseMoney(document.getElementById('t02-rent').value) },
                { key: 'Utilities', val: parseMoney(document.getElementById('t02-utilities').value) },
                { key: 'Internet', val: parseMoney(document.getElementById('t02-internet').value) },
                { key: 'Insurance', val: parseMoney(document.getElementById('t02-insurance').value) },
                { key: 'Repairs / maintenance', val: parseMoney(document.getElementById('t02-repairs').value) },
                { key: 'HOA', val: parseMoney(document.getElementById('t02-hoa').value) },
              ];

              const pct = (totalSqft > 0) ? Math.min(1, Math.max(0, officeSqft / totalSqft)) : 0;
              const pctAdj = Math.max(0, pct * (1 + buffer));

              let annual = 0;
              const tbody = document.getElementById('t02-rows');
              tbody.innerHTML = '';

              expenses.forEach((e) => {
                const alloc = e.val * pctAdj;
                annual += alloc;
                const tr = document.createElement('tr');
                tr.innerHTML = '<td data-label=\"Expense category\"><strong>' + e.key + '</strong></td>' +
                               '<td data-label=\"Annual expense\">' + fmtUSD(e.val) + '</td>' +
                               '<td data-label=\"Allocated reimbursement\">' + fmtUSD(alloc) + '</td>';
                tbody.appendChild(tr);
              });

              const per = cadence > 0 ? (annual / cadence) : annual;
              document.getElementById('t02-kpi-pct').textContent = Math.round(pct * 1000) / 10 + '%';
              document.getElementById('t02-kpi-annual').textContent = fmtUSD(annual);
              document.getElementById('t02-kpi-per').textContent = fmtUSD(per);

              const cadLabel = cadence === 12 ? 'Monthly' : (cadence === 4 ? 'Quarterly' : 'Annual');
              document.getElementById('t02-kpi-cadence').textContent = cadLabel;
              document.getElementById('t02-kpi-buffer').textContent = buffer < 0 ? ('Rounded down (' + Math.round(Math.abs(buffer) * 100) + '%)') : 'No rounding';

              const warn = document.getElementById('t02-warning');
              const msgs = [];
              if (totalSqft <= 0 || officeSqft <= 0) msgs.push('Enter square footage to compute the allocation percentage.');
              if (officeSqft > totalSqft && totalSqft > 0) msgs.push('Office square footage should not exceed total square footage.');
              if (pct > 0.5) msgs.push('High business-use percentages are more likely to invite questions. Make sure the space is truly dedicated and documented.');
              warn.style.display = msgs.length ? 'block' : 'none';
              warn.textContent = msgs.join(' ');
            }

            document.getElementById('t02-calc').addEventListener('click', calculate);
          })();
        </script>`;
}

function widgetAugustaRule() {
  return `<section class="tool-card" id="calculator" aria-label="Augusta Rule meeting log builder and rent calculator">
            <div class="tool-card__header">
              <h2 class="tool-card__title">Meeting Log + Rent Calculator</h2>
              <p class="tool-card__subtitle">Build the log first. Then run the rent math with 14-day guardrails.</p>
            </div>

            <div class="tool-grid tool-grid--stack">
              <form class="tool-form" id="t03-form">
                <div class="field">
                  <label>Meeting log</label>
                  <div class="hint">Add meeting rows. The tool counts unique dates as days.</div>
                  <div class="log-table-wrap" role="region" aria-label="Meeting log table">
                    <table class="log-table" id="t03-log">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Purpose</th>
                          <th>Attendees</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody></tbody>
                    </table>
                  </div>
                  <div class="log-actions">
                    <button type="button" class="tool-button tool-button--ghost" id="t03-add">Add meeting</button>
                    <button type="button" class="tool-button tool-button--ghost" id="t03-csv">Download CSV</button>
                  </div>
                </div>

                <div class="field-row">
                  <div class="field">
                    <label for="t03-rate">Daily rate (defensible)</label>
                    <input id="t03-rate" inputmode="decimal" type="text" placeholder="e.g. 450">
                    <div class="hint">Base this on comps or venue pricing you can show on paper.</div>
                  </div>
                  <div class="field">
                    <label for="t03-daysOverride">Days override (optional)</label>
                    <input id="t03-daysOverride" inputmode="decimal" type="text" placeholder="leave blank to use log count">
                    <div class="hint">If you group multiple meetings into one rental day, override here.</div>
                  </div>
                </div>

                <button type="button" class="tool-button" id="t03-calc">Calculate rent + guardrails</button>
              </form>

              <div class="tool-results" aria-live="polite">
                <div class="results-kpis">
                  <div class="kpi">
                    <div class="kpi__label">Rental days used</div>
                    <div class="kpi__value" id="t03-kpi-days">0</div>
                    <div class="kpi__meta" id="t03-kpi-guard">Guardrail: 14</div>
                  </div>
                  <div class="kpi">
                    <div class="kpi__label">Daily rate</div>
                    <div class="kpi__value" id="t03-kpi-rate">$0</div>
                    <div class="kpi__meta">Evidence matters</div>
                  </div>
                  <div class="kpi">
                    <div class="kpi__label">Estimated total rent</div>
                    <div class="kpi__value kpi__value--good" id="t03-kpi-total">$0</div>
                    <div class="kpi__meta">Educational estimate</div>
                  </div>
                </div>

                <div class="results-note" id="t03-warning" style="display:none;"></div>
                <div class="results-note results-note--alt">
                  If your log is clean, your story is clean. If your log is sloppy, your CPA inherits your risk.
                </div>
              </div>
            </div>
        </section>

        <script>
          (function() {
            function parseMoney(raw) {
              if (raw == null) return 0;
              const cleaned = String(raw).replace(/[^0-9.\\-]/g, '');
              const num = Number(cleaned);
              return Number.isFinite(num) ? num : 0;
            }
            function fmtUSD(n) {
              const v = Number.isFinite(n) ? n : 0;
              return v.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
            }
            function uniqDates(rows) {
              const set = new Set();
              rows.forEach((r) => { if (r.date) set.add(r.date); });
              return Array.from(set);
            }
            function getRows() {
              const tbody = document.querySelector('#t03-log tbody');
              return Array.from(tbody.querySelectorAll('tr')).map((tr) => {
                const date = tr.querySelector('input[type=\"date\"]').value;
                const purpose = tr.querySelector('input[data-col=\"purpose\"]').value;
                const attendees = tr.querySelector('input[data-col=\"attendees\"]').value;
                return { date, purpose, attendees };
              });
            }
            function addRow(defaults) {
              const tbody = document.querySelector('#t03-log tbody');
              const tr = document.createElement('tr');
              tr.innerHTML =
                '<td><input type=\"date\" value=\"' + (defaults && defaults.date ? defaults.date : '') + '\" aria-label=\"Meeting date\"></td>' +
                '<td><input type=\"text\" data-col=\"purpose\" value=\"' + (defaults && defaults.purpose ? defaults.purpose.replace(/\"/g,'&quot;') : '') + '\" placeholder=\"Quarterly planning\" aria-label=\"Meeting purpose\"></td>' +
                '<td><input type=\"text\" data-col=\"attendees\" value=\"' + (defaults && defaults.attendees ? defaults.attendees.replace(/\"/g,'&quot;') : '') + '\" placeholder=\"You, spouse, bookkeeper\" aria-label=\"Attendees\"></td>' +
                '<td class=\"log-remove\"><button type=\"button\" class=\"linklike\">Remove</button></td>';
              tr.querySelector('button').addEventListener('click', function() { tr.remove(); });
              tbody.appendChild(tr);
            }

            function calculate() {
              const rows = getRows();
              const overrideDays = parseMoney(document.getElementById('t03-daysOverride').value);
              const days = overrideDays > 0 ? Math.round(overrideDays) : uniqDates(rows).length;
              const rate = parseMoney(document.getElementById('t03-rate').value);
              const total = Math.max(0, days * rate);

              document.getElementById('t03-kpi-days').textContent = String(days);
              document.getElementById('t03-kpi-rate').textContent = fmtUSD(rate);
              document.getElementById('t03-kpi-total').textContent = fmtUSD(total);

              const warn = document.getElementById('t03-warning');
              const msgs = [];
              if (days === 0) msgs.push('Add meeting dates (or set a days override) to compute the day count.');
              if (rate <= 0) msgs.push('Enter a daily rate to compute rent.');
              if (days > 14) msgs.push('You are over 14 days. Stop and talk to your CPA before you execute more days.');
              if (days > 0 && rows.length === 0 && overrideDays > 0) msgs.push('You are using the days override without a meeting log. Logs are the point of this tool.');
              warn.style.display = msgs.length ? 'block' : 'none';
              warn.textContent = msgs.join(' ');
            }

            function downloadCsv() {
              const rows = getRows();
              const header = ['date','purpose','attendees'];
              const lines = [header.join(',')].concat(rows.map((r) => {
                function q(v) {
                  const s = String(v || '');
                  const escaped = s.replace(/\"/g, '\"\"');
                  return '\"' + escaped + '\"';
                }
                return [q(r.date), q(r.purpose), q(r.attendees)].join(',');
              }));
              const blob = new Blob([lines.join('\\n')], { type: 'text/csv;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'augusta-rule-meeting-log.csv';
              document.body.appendChild(a);
              a.click();
              a.remove();
              setTimeout(() => URL.revokeObjectURL(url), 500);
            }

            document.getElementById('t03-add').addEventListener('click', function() { addRow(); });
            document.getElementById('t03-csv').addEventListener('click', downloadCsv);
            document.getElementById('t03-calc').addEventListener('click', calculate);

            // Start with two rows so the tool is not empty.
            addRow();
            addRow();
          })();
        </script>`;
}

function widgetAnnualizedIncome() {
  return `<section class="tool-card" id="calculator" aria-label="Annualized income estimated tax calculator">
            <div class="tool-card__header">
              <h2 class="tool-card__title">Annualized Payment Planner</h2>
              <p class="tool-card__subtitle">Project a full-year number from YTD reality, then build a clean catch-up plan.</p>
            </div>

            <div class="tool-grid">
              <form class="tool-form" id="t04-form">
                <div class="field-row">
                  <div class="field">
                    <label for="t04-months">Months of income so far</label>
                    <select id="t04-months">
                      <option value="2">2</option>
                      <option value="3" selected>3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                      <option value="6">6</option>
                      <option value="7">7</option>
                      <option value="8">8</option>
                      <option value="9">9</option>
                      <option value="10">10</option>
                      <option value="11">11</option>
                    </select>
                    <div class="hint">Use whole months. Re-run this monthly if your income is lumpy.</div>
                  </div>
                  <div class="field">
                    <label for="t04-ytdNet">Year-to-date net income (1099/business)</label>
                    <input id="t04-ytdNet" inputmode="decimal" type="text" placeholder="e.g. 85000">
                    <div class="hint">Net after direct business expenses (a planning approximation).</div>
                  </div>
                </div>

                <div class="field-row">
                  <div class="field">
                    <label for="t04-rate">Estimated effective tax rate (%)</label>
                    <input id="t04-rate" inputmode="decimal" type="text" placeholder="e.g. 28">
                    <div class="hint">Use a conservative planning rate from last year or from your CPA.</div>
                  </div>
                  <div class="field">
                    <label for="t04-withheldPaid">Withholding + estimated payments already made (YTD)</label>
                    <input id="t04-withheldPaid" inputmode="decimal" type="text" placeholder="e.g. 19000">
                    <div class="hint">Include W-2 withholding if applicable.</div>
                  </div>
                </div>

                <div class="field-row">
                  <div class="field">
                    <label for="t04-remaining">Payments remaining this year</label>
                    <select id="t04-remaining">
                      <option value="4">4 (start of year)</option>
                      <option value="3" selected>3</option>
                      <option value="2">2</option>
                      <option value="1">1</option>
                    </select>
                    <div class="hint">Pick what you will actually do. Execution beats theory.</div>
                  </div>
                  <div class="field">
                    <label for="t04-buffer">Conservatism buffer</label>
                    <select id="t04-buffer">
                      <option value="0">0%</option>
                      <option value="0.05">+5%</option>
                      <option value="0.10">+10%</option>
                    </select>
                    <div class="hint">If income is volatile, a small buffer reduces surprise.</div>
                  </div>
                </div>

                <button type="button" class="tool-button" id="t04-calc">Calculate annualized plan</button>
              </form>

              <div class="tool-results" aria-live="polite">
                <div class="results-kpis">
                  <div class="kpi">
                    <div class="kpi__label">Annualized income (projection)</div>
                    <div class="kpi__value" id="t04-kpi-income">$0</div>
                    <div class="kpi__meta" id="t04-kpi-months">From 3 months</div>
                  </div>
                  <div class="kpi">
                    <div class="kpi__label">Projected tax (planning)</div>
                    <div class="kpi__value" id="t04-kpi-tax">$0</div>
                    <div class="kpi__meta" id="t04-kpi-rate">At 0%</div>
                  </div>
                  <div class="kpi">
                    <div class="kpi__label">Catch-up needed</div>
                    <div class="kpi__value kpi__value--good" id="t04-kpi-catchup">$0</div>
                    <div class="kpi__meta" id="t04-kpi-note">Spread across remaining payments</div>
                  </div>
                </div>

                <div class="results-table-wrap" role="region" aria-label="Catch-up plan table">
                  <table class="results-table">
                    <thead>
                      <tr>
                        <th>Payment #</th>
                        <th>Recommended amount</th>
                        <th>Execution note</th>
                      </tr>
                    </thead>
                    <tbody id="t04-plan-rows"></tbody>
                  </table>
                </div>

                <div class="results-note" id="t04-warning" style="display:none;"></div>
                <div class="results-note results-note--alt">
                  Annualized planning is only useful if you re-run it when the year changes. Save your assumptions and a dated P&amp;L snapshot.
                </div>
              </div>
            </div>
        </section>

        <script>
          (function() {
            function parseMoney(raw) {
              if (raw == null) return 0;
              const cleaned = String(raw).replace(/[^0-9.\\-]/g, '');
              const num = Number(cleaned);
              return Number.isFinite(num) ? num : 0;
            }
            function parsePct(raw) {
              const cleaned = String(raw || '').replace(/[^0-9.\\-]/g, '');
              const num = Number(cleaned);
              if (!Number.isFinite(num)) return 0;
              return Math.max(0, num) / 100;
            }
            function fmtUSD(n) {
              const v = Number.isFinite(n) ? n : 0;
              return v.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
            }

            function buildPlanRows(count, perPayment) {
              const rows = [];
              for (let i = 1; i <= count; i++) {
                const note = (i === 1)
                  ? 'If you are behind, pay early. Then keep the cadence.'
                  : 'Treat this like a recurring bill, not a guess.';
                rows.push({ idx: i, amount: perPayment, note });
              }
              return rows;
            }

            function calculate() {
              const months = Number(document.getElementById('t04-months').value) || 3;
              const ytdNet = parseMoney(document.getElementById('t04-ytdNet').value);
              const rate = parsePct(document.getElementById('t04-rate').value);
              const paid = parseMoney(document.getElementById('t04-withheldPaid').value);
              const remainingCount = Number(document.getElementById('t04-remaining').value) || 3;
              const bufferPct = Number(document.getElementById('t04-buffer').value) || 0;

              const annualizedIncome = months > 0 ? (ytdNet * 12 / months) : 0;
              const projectedTax = annualizedIncome * rate;
              const bufferedTax = projectedTax * (1 + bufferPct);
              const shouldHavePaidByNow = bufferedTax * (months / 12);
              const catchUp = Math.max(0, shouldHavePaidByNow - Math.max(0, paid));
              const perPayment = remainingCount > 0 ? (catchUp / remainingCount) : catchUp;

              document.getElementById('t04-kpi-income').textContent = fmtUSD(annualizedIncome);
              document.getElementById('t04-kpi-tax').textContent = fmtUSD(bufferedTax);
              document.getElementById('t04-kpi-catchup').textContent = fmtUSD(catchUp);
              document.getElementById('t04-kpi-months').textContent = 'From ' + months + ' months';
              document.getElementById('t04-kpi-rate').textContent = 'At ' + Math.round(rate * 100) + '% (plus buffer)';
              document.getElementById('t04-kpi-note').textContent = 'Spread across ' + remainingCount + ' payment' + (remainingCount === 1 ? '' : 's');

              const tbody = document.getElementById('t04-plan-rows');
              tbody.innerHTML = '';
              buildPlanRows(remainingCount, perPayment).forEach((row) => {
                const tr = document.createElement('tr');
                tr.innerHTML = '<td data-label=\"Payment #\"><strong>' + row.idx + '</strong></td>' +
                               '<td data-label=\"Recommended amount\">' + fmtUSD(row.amount) + '</td>' +
                               '<td data-label=\"Execution note\">' + row.note + '</td>';
                tbody.appendChild(tr);
              });

              const warn = document.getElementById('t04-warning');
              const msgs = [];
              if (ytdNet <= 0) msgs.push('Enter year-to-date net income to compute an annualized projection.');
              if (rate <= 0) msgs.push('Enter a planning tax rate (effective %) to estimate projected tax.');
              if (catchUp === 0 && ytdNet > 0 && rate > 0) msgs.push('Based on these inputs, you appear caught up through this point in the year.');
              warn.style.display = msgs.length ? 'block' : 'none';
              warn.textContent = msgs.join(' ');
            }

            document.getElementById('t04-calc').addEventListener('click', calculate);
          })();
        </script>`;
}

function widgetHoursTracker() {
  return `<section class="tool-card" id="calculator" aria-label="Real estate hours tracker log">
            <div class="tool-card__header">
              <h2 class="tool-card__title">Hours Tracker (REP + STR)</h2>
              <p class="tool-card__subtitle">Fast entry, clean categories, totals that make sense, and a CSV export for your audit folder.</p>
            </div>

            <div class="tool-grid tool-grid--stack">
              <form class="tool-form" id="t05-form">
                <div class="field-row">
                  <div class="field">
                    <label for="t05-otherHours">Other job hours this year (estimate)</label>
                    <input id="t05-otherHours" inputmode="decimal" type="text" placeholder="e.g. 1800">
                    <div class="hint">Used only to pressure-test the \"more than half\" concept. Your facts decide.</div>
                  </div>
                  <div class="field">
                    <label for="t05-target">Target hours (planning)</label>
                    <select id="t05-target">
                      <option value="750" selected>750 hours (REP benchmark)</option>
                      <option value="500">500 hours (STR planning)</option>
                      <option value="250">250 hours (light ops)</option>
                    </select>
                    <div class="hint">This is a planning prompt, not a legal conclusion.</div>
                  </div>
                </div>

                <div class="field">
                  <label>Log entries</label>
                  <div class="hint">Be specific. Date + category + short note. Backfilled logs are the #1 failure mode.</div>
                  <div class="log-table-wrap" role="region" aria-label="Hours log table">
                    <table class="log-table" id="t05-log">
                      <thead>
                        <tr>
                          <th style="min-width:150px;">Date</th>
                          <th style="min-width:160px;">Category</th>
                          <th style="min-width:160px;">Property (optional)</th>
                          <th style="min-width:120px;">Hours</th>
                          <th style="min-width:240px;">Note (short)</th>
                          <th style="min-width:90px;"></th>
                        </tr>
                      </thead>
                      <tbody></tbody>
                    </table>
                  </div>
                  <div class="log-actions">
                    <button type="button" class="tool-button tool-button--ghost" id="t05-add">Add entry</button>
                    <button type="button" class="tool-button tool-button--ghost" id="t05-csv">Download CSV</button>
                    <button type="button" class="tool-button" id="t05-calc">Update totals</button>
                  </div>
                </div>
              </form>

              <div class="tool-results" aria-live="polite">
                <div class="results-kpis">
                  <div class="kpi">
                    <div class="kpi__label">Logged hours</div>
                    <div class="kpi__value kpi__value--good" id="t05-kpi-hours">0</div>
                    <div class="kpi__meta" id="t05-kpi-days">0 dates logged</div>
                  </div>
                  <div class="kpi">
                    <div class="kpi__label">Top category</div>
                    <div class="kpi__value" id="t05-kpi-top">N/A</div>
                    <div class="kpi__meta" id="t05-kpi-topmeta">0 hours</div>
                  </div>
                  <div class="kpi">
                    <div class="kpi__label">Pressure test</div>
                    <div class="kpi__value" id="t05-kpi-test">N/A</div>
                    <div class="kpi__meta" id="t05-kpi-testmeta">Planning prompt</div>
                  </div>
                </div>

                <div class="results-table-wrap" role="region" aria-label="Category breakdown table">
                  <table class="results-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Hours</th>
                        <th>Signal</th>
                      </tr>
                    </thead>
                    <tbody id="t05-breakdown"></tbody>
                  </table>
                </div>

                <div class="results-note" id="t05-warning" style="display:none;"></div>
                <div class="results-note results-note--alt">
                  Strong logs are contemporaneous and specific. Pair this CSV with calendars, invoices, vendor notes, and communications.
                </div>
              </div>
            </div>
        </section>

        <script>
          (function() {
            function parseMoney(raw) {
              if (raw == null) return 0;
              const cleaned = String(raw).replace(/[^0-9.\\-]/g, '');
              const num = Number(cleaned);
              return Number.isFinite(num) ? num : 0;
            }
            function uniqDates(rows) {
              const set = new Set();
              rows.forEach((r) => { if (r.date) set.add(r.date); });
              return Array.from(set);
            }

            const categories = [
              'Acquisition / underwriting',
              'Operations / turnovers',
              'Guest communication',
              'Maintenance / repairs',
              'Vendor management',
              'Pricing / revenue management',
              'Bookkeeping / admin',
              'Travel / on-site work',
              'Education / planning',
            ];

            function addRow(defaults) {
              const tbody = document.querySelector('#t05-log tbody');
              const tr = document.createElement('tr');
              const catOptions = categories.map((c) => '<option value=\"' + c.replace(/\"/g,'&quot;') + '\">' + c + '</option>').join('');
              tr.innerHTML =
                '<td><input type=\"date\" value=\"' + (defaults && defaults.date ? defaults.date : '') + '\" aria-label=\"Entry date\"></td>' +
                '<td><select data-col=\"category\" aria-label=\"Category\">' + catOptions + '</select></td>' +
                '<td><input type=\"text\" data-col=\"property\" value=\"' + (defaults && defaults.property ? defaults.property.replace(/\"/g,'&quot;') : '') + '\" placeholder=\"Lake House\" aria-label=\"Property\"></td>' +
                '<td><input type=\"text\" inputmode=\"decimal\" data-col=\"hours\" value=\"' + (defaults && defaults.hours ? String(defaults.hours).replace(/\"/g,'&quot;') : '') + '\" placeholder=\"1.5\" aria-label=\"Hours\"></td>' +
                '<td><input type=\"text\" data-col=\"note\" value=\"' + (defaults && defaults.note ? defaults.note.replace(/\"/g,'&quot;') : '') + '\" placeholder=\"Replaced lockbox, coordinated cleaner\" aria-label=\"Note\"></td>' +
                '<td class=\"log-remove\"><button type=\"button\" class=\"linklike\">Remove</button></td>';
              if (defaults && defaults.category) {
                tr.querySelector('select').value = defaults.category;
              }
              tr.querySelector('button').addEventListener('click', function() { tr.remove(); });
              tbody.appendChild(tr);
            }

            function getRows() {
              const tbody = document.querySelector('#t05-log tbody');
              return Array.from(tbody.querySelectorAll('tr')).map((tr) => {
                const date = tr.querySelector('input[type=\"date\"]').value;
                const category = tr.querySelector('select[data-col=\"category\"]').value;
                const property = tr.querySelector('input[data-col=\"property\"]').value;
                const hours = parseMoney(tr.querySelector('input[data-col=\"hours\"]').value);
                const note = tr.querySelector('input[data-col=\"note\"]').value;
                return { date, category, property, hours, note };
              });
            }

            function compute() {
              const rows = getRows();
              const totalHours = rows.reduce((sum, r) => sum + (Number.isFinite(r.hours) ? r.hours : 0), 0);
              const dates = uniqDates(rows);
              const byCat = new Map();
              let notesMissing = 0;

              rows.forEach((r) => {
                if (!r.note || String(r.note).trim().length < 8) notesMissing += 1;
                const prev = byCat.get(r.category) || 0;
                byCat.set(r.category, prev + (Number.isFinite(r.hours) ? r.hours : 0));
              });

              const sorted = Array.from(byCat.entries()).sort((a, b) => b[1] - a[1]);
              const top = sorted[0] ? sorted[0][0] : 'N/A';
              const topHours = sorted[0] ? sorted[0][1] : 0;

              document.getElementById('t05-kpi-hours').textContent = String(Math.round(totalHours * 10) / 10);
              document.getElementById('t05-kpi-days').textContent = dates.length + ' dates logged';
              document.getElementById('t05-kpi-top').textContent = top;
              document.getElementById('t05-kpi-topmeta').textContent = (Math.round(topHours * 10) / 10) + ' hours';

              const otherHours = parseMoney(document.getElementById('t05-otherHours').value);
              const target = Number(document.getElementById('t05-target').value) || 750;
              const passTarget = totalHours >= target;
              const halfTest = otherHours > 0 ? (totalHours > otherHours) : null;

              let test = passTarget ? 'On track' : 'Behind';
              let testMeta = 'Target: ' + target + ' hours';
              if (halfTest === true) testMeta += '. Logged hours exceed other-job estimate.';
              if (halfTest === false) testMeta += '. Logged hours do NOT exceed other-job estimate.';
              if (halfTest === null) testMeta += '. Add other-job hours for a pressure test.';
              document.getElementById('t05-kpi-test').textContent = test;
              document.getElementById('t05-kpi-testmeta').textContent = testMeta;

              const tbody = document.getElementById('t05-breakdown');
              tbody.innerHTML = '';
              sorted.forEach(([cat, hrs]) => {
                const pct = totalHours > 0 ? (hrs / totalHours) : 0;
                const signal = pct > 0.6 ? 'Heavy concentration, add detail' : (pct < 0.05 ? 'Low signal' : 'Balanced');
                const tr = document.createElement('tr');
                tr.innerHTML = '<td data-label=\"Category\"><strong>' + cat + '</strong></td>' +
                               '<td data-label=\"Hours\">' + (Math.round(hrs * 10) / 10) + '</td>' +
                               '<td data-label=\"Signal\">' + signal + '</td>';
                tbody.appendChild(tr);
              });

              const warn = document.getElementById('t05-warning');
              const msgs = [];
              if (rows.length === 0) msgs.push('Add entries to build a usable log.');
              if (notesMissing > 0) msgs.push('Some entries have short or empty notes. Specificity is what makes a log defensible.');
              if (dates.length < Math.min(6, rows.length)) msgs.push('If many hours sit on very few dates, your log may look backfilled. Spread entries across real workdays.');
              warn.style.display = msgs.length ? 'block' : 'none';
              warn.textContent = msgs.join(' ');
            }

            function downloadCsv() {
              const rows = getRows();
              const header = ['date','category','property','hours','note'];
              const lines = [header.join(',')].concat(rows.map((r) => {
                function q(v) {
                  const s = String(v == null ? '' : v);
                  const escaped = s.replace(/\"/g, '\"\"');
                  return '\"' + escaped + '\"';
                }
                return [q(r.date), q(r.category), q(r.property), q(r.hours), q(r.note)].join(',');
              }));
              const blob = new Blob([lines.join('\\n')], { type: 'text/csv;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'real-estate-hours-log.csv';
              document.body.appendChild(a);
              a.click();
              a.remove();
              setTimeout(() => URL.revokeObjectURL(url), 500);
            }

            document.getElementById('t05-add').addEventListener('click', function() { addRow(); });
            document.getElementById('t05-csv').addEventListener('click', downloadCsv);
            document.getElementById('t05-calc').addEventListener('click', compute);

            addRow({ category: categories[1] });
            addRow({ category: categories[2] });
            compute();
          })();
        </script>`;
}

function widgetCostSegPayback() {
  return `<section class="tool-card" id="calculator" aria-label="Cost segregation payback calculator">
            <div class="tool-card__header">
              <h2 class="tool-card__title">Cost Seg Payback (First-Year Signal)</h2>
              <p class="tool-card__subtitle">Estimate first-year accelerated depreciation tax savings and stress test the assumptions.</p>
            </div>

            <div class="tool-grid">
              <form class="tool-form" id="t06-form">
                <div class="field-row">
                  <div class="field">
                    <label for="t06-price">Purchase price</label>
                    <input id="t06-price" inputmode="decimal" type="text" placeholder="e.g. 650000">
                  </div>
                  <div class="field">
                    <label for="t06-landPct">Land percentage (%)</label>
                    <input id="t06-landPct" inputmode="decimal" type="text" placeholder="e.g. 20">
                    <div class="hint">Land is not depreciable. If unsure, start conservative (higher land %).</div>
                  </div>
                </div>

                <div class="field-row">
                  <div class="field">
                    <label for="t06-reclassPct">Reclassified short-life (%)</label>
                    <input id="t06-reclassPct" inputmode="decimal" type="text" placeholder="e.g. 25">
                    <div class="hint">Portion of building basis moved into shorter-lived buckets (planning input).</div>
                  </div>
                  <div class="field">
                    <label for="t06-bonusPct">Bonus depreciation (%)</label>
                    <input id="t06-bonusPct" inputmode="decimal" type="text" placeholder="e.g. 60">
                    <div class="hint">Use the assumption you are planning for. This can change by year and asset type.</div>
                  </div>
                </div>

                <div class="field-row">
                  <div class="field">
                    <label for="t06-taxPct">Marginal tax rate (federal + state) (%)</label>
                    <input id="t06-taxPct" inputmode="decimal" type="text" placeholder="e.g. 35">
                    <div class="hint">Planning rate. If you understate it, you understate savings.</div>
                  </div>
                  <div class="field">
                    <label for="t06-fee">Estimated study + admin cost (fee)</label>
                    <input id="t06-fee" inputmode="decimal" type="text" placeholder="e.g. 4500">
                  </div>
                </div>

                <button type="button" class="tool-button" id="t06-calc">Calculate signal + sensitivity</button>
              </form>

              <div class="tool-results" aria-live="polite">
                <div class="results-kpis">
                  <div class="kpi">
                    <div class="kpi__label">Depreciable basis (est.)</div>
                    <div class="kpi__value" id="t06-kpi-basis">$0</div>
                    <div class="kpi__meta">Purchase minus land</div>
                  </div>
                  <div class="kpi">
                    <div class="kpi__label">First-year acceleration (est.)</div>
                    <div class="kpi__value" id="t06-kpi-accel">$0</div>
                    <div class="kpi__meta">Short-life x bonus</div>
                  </div>
                  <div class="kpi">
                    <div class="kpi__label">Net first-year benefit (after fee)</div>
                    <div class="kpi__value kpi__value--good" id="t06-kpi-net">$0</div>
                    <div class="kpi__meta" id="t06-kpi-multiple">Fee multiple</div>
                  </div>
                </div>

                <div class="results-table-wrap" role="region" aria-label="Sensitivity table">
                  <table class="results-table">
                    <thead>
                      <tr>
                        <th>Scenario</th>
                        <th>Tax rate</th>
                        <th>Bonus</th>
                        <th>Est. tax savings</th>
                        <th>Net after fee</th>
                      </tr>
                    </thead>
                    <tbody id="t06-sens"></tbody>
                  </table>
                </div>

                <div class="results-note" id="t06-warning" style="display:none;"></div>
                <div class="results-note results-note--alt">
                  This is a first-year acceleration view. Passive limits, use-ability, and recapture can matter. Treat this as a go/no-go signal, not a full optimization.
                </div>
              </div>
            </div>
        </section>

        <script>
          (function() {
            function parseMoney(raw) {
              if (raw == null) return 0;
              const cleaned = String(raw).replace(/[^0-9.\\-]/g, '');
              const num = Number(cleaned);
              return Number.isFinite(num) ? num : 0;
            }
            function parsePct(raw) {
              const cleaned = String(raw || '').replace(/[^0-9.\\-]/g, '');
              const num = Number(cleaned);
              if (!Number.isFinite(num)) return 0;
              return Math.max(0, num) / 100;
            }
            function fmtUSD(n) {
              const v = Number.isFinite(n) ? n : 0;
              return v.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
            }

            function computeSavings(basis, reclassPct, bonusPct, taxPct) {
              const accelDeduction = basis * reclassPct * bonusPct;
              const taxSavings = accelDeduction * taxPct;
              return { accelDeduction, taxSavings };
            }

            function calculate() {
              const price = parseMoney(document.getElementById('t06-price').value);
              const landPct = parsePct(document.getElementById('t06-landPct').value);
              const reclassPct = parsePct(document.getElementById('t06-reclassPct').value);
              const bonusPct = parsePct(document.getElementById('t06-bonusPct').value);
              const taxPct = parsePct(document.getElementById('t06-taxPct').value);
              const fee = parseMoney(document.getElementById('t06-fee').value);

              const basis = Math.max(0, price * (1 - landPct));
              const base = computeSavings(basis, reclassPct, bonusPct, taxPct);
              const net = base.taxSavings - fee;
              const multiple = fee > 0 ? (base.taxSavings / fee) : 0;

              document.getElementById('t06-kpi-basis').textContent = fmtUSD(basis);
              document.getElementById('t06-kpi-accel').textContent = fmtUSD(base.accelDeduction);
              document.getElementById('t06-kpi-net').textContent = fmtUSD(net);
              document.getElementById('t06-kpi-multiple').textContent = fee > 0 ? ('~' + (Math.round(multiple * 10) / 10) + 'x fee (savings/fee)') : 'No fee entered';

              const scenarios = [
                { name: 'Conservative', tax: Math.max(0, taxPct - 0.05), bonus: Math.max(0, bonusPct - 0.20) },
                { name: 'Base', tax: taxPct, bonus: bonusPct },
                { name: 'Aggressive', tax: Math.min(0.60, taxPct + 0.05), bonus: Math.min(1, bonusPct + 0.20) },
              ];

              const tbody = document.getElementById('t06-sens');
              tbody.innerHTML = '';
              scenarios.forEach((s) => {
                const r = computeSavings(basis, reclassPct, s.bonus, s.tax);
                const n = r.taxSavings - fee;
                const tr = document.createElement('tr');
                tr.innerHTML =
                  '<td data-label=\"Scenario\"><strong>' + s.name + '</strong></td>' +
                  '<td data-label=\"Tax rate\">' + Math.round(s.tax * 100) + '%</td>' +
                  '<td data-label=\"Bonus\">' + Math.round(s.bonus * 100) + '%</td>' +
                  '<td data-label=\"Est. tax savings\">' + fmtUSD(r.taxSavings) + '</td>' +
                  '<td data-label=\"Net after fee\">' + fmtUSD(n) + '</td>';
                tbody.appendChild(tr);
              });

              const warn = document.getElementById('t06-warning');
              const msgs = [];
              if (price <= 0) msgs.push('Enter a purchase price to compute basis and savings.');
              if (reclassPct <= 0) msgs.push('Enter a reclass % (short-life). If you are unsure, start conservative (10% to 20%).');
              if (bonusPct <= 0) msgs.push('Enter a bonus % assumption to estimate first-year acceleration.');
              if (taxPct <= 0) msgs.push('Enter a planning tax rate to translate deductions into dollars.');
              warn.style.display = msgs.length ? 'block' : 'none';
              warn.textContent = msgs.join(' ');
            }

            document.getElementById('t06-calc').addEventListener('click', calculate);
          })();
        </script>`;
}

function widgetIrmaaHeadroom() {
  return `<section class="tool-card" id="calculator" aria-label="IRMAA headroom and Roth conversion room planner">
            <div class="tool-card__header">
              <h2 class="tool-card__title">IRMAA Headroom Planner</h2>
              <p class="tool-card__subtitle">Enter your baseline MAGI and the next IRMAA guardrail, then get conversion room with buffer.</p>
            </div>

            <div class="tool-grid">
              <form class="tool-form" id="t07-form">
                <div class="field-row">
                  <div class="field">
                    <label for="t07-base">Projected baseline MAGI (before conversions)</label>
                    <input id="t07-base" inputmode="decimal" type="text" placeholder="e.g. 168000">
                    <div class="hint">Include pension, interest, dividends, capital gains, etc. Use conservative estimates.</div>
                  </div>
                  <div class="field">
                    <label for="t07-thresh">Next IRMAA threshold (guardrail)</label>
                    <input id="t07-thresh" inputmode="decimal" type="text" placeholder="e.g. 194000">
                    <div class="hint">Thresholds vary by year and filing status. Enter the guardrail you care about.</div>
                  </div>
                </div>

                <div class="field-row">
                  <div class="field">
                    <label for="t07-buffer">Buffer under threshold</label>
                    <input id="t07-buffer" inputmode="decimal" type="text" placeholder="e.g. 2000">
                    <div class="hint">If you are close to the line, buffer reduces accidental crossings.</div>
                  </div>
                  <div class="field">
                    <label for="t07-planned">Planned conversion (optional)</label>
                    <input id="t07-planned" inputmode="decimal" type="text" placeholder="e.g. 15000">
                    <div class="hint">Used to show whether your planned conversion crosses the guardrail.</div>
                  </div>
                </div>

                <button type="button" class="tool-button" id="t07-calc">Calculate headroom</button>
              </form>

              <div class="tool-results" aria-live="polite">
                <div class="results-kpis">
                  <div class="kpi">
                    <div class="kpi__label">Headroom (after buffer)</div>
                    <div class="kpi__value kpi__value--good" id="t07-kpi-headroom">$0</div>
                    <div class="kpi__meta">Threshold minus baseline minus buffer</div>
                  </div>
                  <div class="kpi">
                    <div class="kpi__label">Max conversion (guardrail)</div>
                    <div class="kpi__value" id="t07-kpi-max">$0</div>
                    <div class="kpi__meta">Directional ceiling</div>
                  </div>
                  <div class="kpi">
                    <div class="kpi__label">Planned conversion status</div>
                    <div class="kpi__value" id="t07-kpi-status">N/A</div>
                    <div class="kpi__meta" id="t07-kpi-statusmeta">Enter a planned conversion to test it.</div>
                  </div>
                </div>

                <div class="results-table-wrap" role="region" aria-label="Scenario table">
                  <table class="results-table">
                    <thead>
                      <tr>
                        <th>Scenario</th>
                        <th>Conversion</th>
                        <th>Projected MAGI</th>
                        <th>Guardrail</th>
                        <th>Result</th>
                      </tr>
                    </thead>
                    <tbody id="t07-rows"></tbody>
                  </table>
                </div>

                <div class="results-note" id="t07-warning" style="display:none;"></div>
                <div class="results-note results-note--alt">
                  If avoiding the threshold costs you a valuable conversion, that can still be the right trade. This tool helps you see the ceiling so you decide intentionally.
                </div>
              </div>
            </div>
        </section>

        <script>
          (function() {
            function parseMoney(raw) {
              if (raw == null) return 0;
              const cleaned = String(raw).replace(/[^0-9.\\-]/g, '');
              const num = Number(cleaned);
              return Number.isFinite(num) ? num : 0;
            }
            function fmtUSD(n) {
              const v = Number.isFinite(n) ? n : 0;
              return v.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
            }

            function rowHtml(name, conversion, magi, guardrail) {
              const ok = magi <= guardrail;
              return '<tr>' +
                '<td data-label=\"Scenario\"><strong>' + name + '</strong></td>' +
                '<td data-label=\"Conversion\">' + fmtUSD(conversion) + '</td>' +
                '<td data-label=\"Projected MAGI\">' + fmtUSD(magi) + '</td>' +
                '<td data-label=\"Guardrail\">' + fmtUSD(guardrail) + '</td>' +
                '<td data-label=\"Result\">' + (ok ? 'Inside' : 'Over') + '</td>' +
              '</tr>';
            }

            function calculate() {
              const base = parseMoney(document.getElementById('t07-base').value);
              const thresh = parseMoney(document.getElementById('t07-thresh').value);
              const buffer = parseMoney(document.getElementById('t07-buffer').value);
              const planned = parseMoney(document.getElementById('t07-planned').value);

              const guardrail = Math.max(0, thresh - Math.max(0, buffer));
              const headroom = Math.max(0, guardrail - Math.max(0, base));
              const maxConv = headroom;

              document.getElementById('t07-kpi-headroom').textContent = fmtUSD(headroom);
              document.getElementById('t07-kpi-max').textContent = fmtUSD(maxConv);

              const status = planned > 0 ? ((base + planned) <= guardrail ? 'Inside' : 'Over') : 'N/A';
              const statusMeta = planned > 0 ? ('Projected MAGI: ' + fmtUSD(base + planned)) : 'Enter a planned conversion to test it.';
              document.getElementById('t07-kpi-status').textContent = status;
              document.getElementById('t07-kpi-statusmeta').textContent = statusMeta;

              const tbody = document.getElementById('t07-rows');
              tbody.innerHTML = '';
              const half = headroom * 0.5;
              const rows = [
                { name: 'No conversion', conv: 0 },
                { name: 'Half headroom', conv: half },
                { name: 'Max inside guardrail', conv: headroom },
                { name: 'Aggressive (over)', conv: headroom + Math.max(0, buffer) + 1 },
              ];
              rows.forEach((r) => {
                tbody.insertAdjacentHTML('beforeend', rowHtml(r.name, r.conv, base + r.conv, guardrail));
              });

              const warn = document.getElementById('t07-warning');
              const msgs = [];
              if (thresh <= 0) msgs.push('Enter the IRMAA threshold you want to treat as a guardrail.');
              if (base <= 0) msgs.push('Enter a projected baseline MAGI to compute headroom.');
              if (base > guardrail && guardrail > 0) msgs.push('Your baseline is already over the guardrail. Conversions may still be beneficial, but the goal changes.');
              warn.style.display = msgs.length ? 'block' : 'none';
              warn.textContent = msgs.join(' ');
            }

            document.getElementById('t07-calc').addEventListener('click', calculate);
          })();
        </script>`;
}

function widgetQcdRothPlanner() {
  return `<section class="tool-card" id="calculator" aria-label="QCD versus Roth conversion planner">
            <div class="tool-card__header">
              <h2 class="tool-card__title">QCD + Conversion Room Planner</h2>
              <p class="tool-card__subtitle">Estimate taxable RMD after QCD and conversion room inside an IRMAA guardrail you enter.</p>
            </div>

            <div class="tool-grid">
              <form class="tool-form" id="t08-form">
                <div class="field-row">
                  <div class="field">
                    <label for="t08-base">Baseline MAGI (before RMD/QCD/conversions)</label>
                    <input id="t08-base" inputmode="decimal" type="text" placeholder="e.g. 98000">
                  </div>
                  <div class="field">
                    <label for="t08-irmaa">IRMAA threshold guardrail</label>
                    <input id="t08-irmaa" inputmode="decimal" type="text" placeholder="e.g. 103000">
                    <div class="hint">Enter the next threshold you want to avoid (year + filing status dependent).</div>
                  </div>
                </div>

                <div class="field-row">
                  <div class="field">
                    <label for="t08-rmd">RMD amount</label>
                    <input id="t08-rmd" inputmode="decimal" type="text" placeholder="e.g. 42000">
                  </div>
                  <div class="field">
                    <label for="t08-qcd">Planned QCD amount</label>
                    <input id="t08-qcd" inputmode="decimal" type="text" placeholder="e.g. 15000">
                    <div class="hint">QCD can reduce taxable distribution income depending on mechanics.</div>
                  </div>
                </div>

                <div class="field-row">
                  <div class="field">
                    <label for="t08-buffer">Buffer under threshold</label>
                    <input id="t08-buffer" inputmode="decimal" type="text" placeholder="e.g. 1500">
                  </div>
                  <div class="field">
                    <label for="t08-conv">Planned Roth conversion</label>
                    <input id="t08-conv" inputmode="decimal" type="text" placeholder="e.g. 8000">
                  </div>
                </div>

                <button type="button" class="tool-button" id="t08-calc">Calculate conversion room</button>
              </form>

              <div class="tool-results" aria-live="polite">
                <div class="results-kpis">
                  <div class="kpi">
                    <div class="kpi__label">Taxable RMD (after QCD)</div>
                    <div class="kpi__value" id="t08-kpi-rmd">$0</div>
                    <div class="kpi__meta">Planning estimate</div>
                  </div>
                  <div class="kpi">
                    <div class="kpi__label">Conversion room (guardrail)</div>
                    <div class="kpi__value kpi__value--good" id="t08-kpi-room">$0</div>
                    <div class="kpi__meta">After buffer</div>
                  </div>
                  <div class="kpi">
                    <div class="kpi__label">Projected MAGI (with conversion)</div>
                    <div class="kpi__value" id="t08-kpi-magi">$0</div>
                    <div class="kpi__meta" id="t08-kpi-status">Inside</div>
                  </div>
                </div>

                <div class="results-table-wrap" role="region" aria-label="Scenarios table">
                  <table class="results-table">
                    <thead>
                      <tr>
                        <th>Scenario</th>
                        <th>QCD</th>
                        <th>Conversion</th>
                        <th>Projected MAGI</th>
                        <th>Result</th>
                      </tr>
                    </thead>
                    <tbody id="t08-rows"></tbody>
                  </table>
                </div>

                <div class="results-note" id="t08-warning" style="display:none;"></div>
                <div class="results-note results-note--alt">
                  Practical rule: decide your guardrail early, then execute monthly. The \"right\" sequence is the one you can actually follow without surprises.
                </div>
              </div>
            </div>
        </section>

        <script>
          (function() {
            function parseMoney(raw) {
              if (raw == null) return 0;
              const cleaned = String(raw).replace(/[^0-9.\\-]/g, '');
              const num = Number(cleaned);
              return Number.isFinite(num) ? num : 0;
            }
            function fmtUSD(n) {
              const v = Number.isFinite(n) ? n : 0;
              return v.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
            }

            function rowHtml(name, qcd, conv, magi, guardrail) {
              const ok = magi <= guardrail;
              return '<tr>' +
                '<td data-label=\"Scenario\"><strong>' + name + '</strong></td>' +
                '<td data-label=\"QCD\">' + fmtUSD(qcd) + '</td>' +
                '<td data-label=\"Conversion\">' + fmtUSD(conv) + '</td>' +
                '<td data-label=\"Projected MAGI\">' + fmtUSD(magi) + '</td>' +
                '<td data-label=\"Result\">' + (ok ? 'Inside' : 'Over') + '</td>' +
              '</tr>';
            }

            function calculate() {
              const base = parseMoney(document.getElementById('t08-base').value);
              const irmaa = parseMoney(document.getElementById('t08-irmaa').value);
              const rmd = parseMoney(document.getElementById('t08-rmd').value);
              const qcd = parseMoney(document.getElementById('t08-qcd').value);
              const buffer = parseMoney(document.getElementById('t08-buffer').value);
              const conv = parseMoney(document.getElementById('t08-conv').value);

              const taxableRmd = Math.max(0, rmd - qcd);
              const guardrail = Math.max(0, irmaa - Math.max(0, buffer));
              const room = Math.max(0, guardrail - (Math.max(0, base) + taxableRmd));
              const projectedMagi = Math.max(0, base) + taxableRmd + Math.max(0, conv);

              document.getElementById('t08-kpi-rmd').textContent = fmtUSD(taxableRmd);
              document.getElementById('t08-kpi-room').textContent = fmtUSD(room);
              document.getElementById('t08-kpi-magi').textContent = fmtUSD(projectedMagi);
              document.getElementById('t08-kpi-status').textContent = (guardrail > 0 && projectedMagi <= guardrail) ? 'Inside guardrail' : 'Over guardrail';

              const tbody = document.getElementById('t08-rows');
              tbody.innerHTML = '';
              const maxConv = room;
              const rows = [
                { name: 'No QCD', qcd: 0, conv: conv },
                { name: 'Your plan', qcd: qcd, conv: conv },
                { name: 'Max conversion inside guardrail', qcd: qcd, conv: maxConv },
              ];
              rows.forEach((r) => {
                const trRmd = Math.max(0, rmd - r.qcd);
                const magi = Math.max(0, base) + trRmd + Math.max(0, r.conv);
                tbody.insertAdjacentHTML('beforeend', rowHtml(r.name, r.qcd, r.conv, magi, guardrail));
              });

              const warn = document.getElementById('t08-warning');
              const msgs = [];
              if (irmaa <= 0) msgs.push('Enter an IRMAA guardrail threshold (next bracket you care about).');
              if (rmd <= 0) msgs.push('Enter your RMD amount to model taxable RMD after QCD.');
              if (qcd > rmd && rmd > 0) msgs.push('QCD exceeds RMD in this model. Confirm mechanics with your CPA.');
              if (base + taxableRmd > guardrail && guardrail > 0) msgs.push('Baseline + taxable RMD already exceeds the guardrail. The decision shifts to whether conversion is still worth it.');
              warn.style.display = msgs.length ? 'block' : 'none';
              warn.textContent = msgs.join(' ');
            }

            document.getElementById('t08-calc').addEventListener('click', calculate);
          })();
        </script>`;
}

function widgetLoanComparator() {
  return `<section class="tool-card" id="calculator" aria-label="Solo 401k loan vs HELOC calculator">
            <div class="tool-card__header">
              <h2 class="tool-card__title">Loan Comparator (HELOC vs 401k Loan)</h2>
              <p class="tool-card__subtitle">Compare payment, interest cost, and opportunity cost using conservative assumptions.</p>
            </div>

            <div class="tool-grid">
              <form class="tool-form" id="t09-form">
                <div class="field-row">
                  <div class="field">
                    <label for="t09-amt">Amount borrowed</label>
                    <input id="t09-amt" inputmode="decimal" type="text" placeholder="e.g. 60000">
                  </div>
                  <div class="field">
                    <label for="t09-term">Term (years)</label>
                    <select id="t09-term">
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5" selected>5</option>
                      <option value="7">7</option>
                      <option value="10">10</option>
                    </select>
                  </div>
                </div>

                <div class="field-row">
                  <div class="field">
                    <label for="t09-helocRate">HELOC rate (APR %)</label>
                    <input id="t09-helocRate" inputmode="decimal" type="text" placeholder="e.g. 9.5">
                  </div>
                  <div class="field">
                    <label for="t09-401kRate">401(k) loan rate (% paid to self)</label>
                    <input id="t09-401kRate" inputmode="decimal" type="text" placeholder="e.g. 9.0">
                  </div>
                </div>

                <div class="field-row">
                  <div class="field">
                    <label for="t09-return">Expected market return (annual %)</label>
                    <input id="t09-return" inputmode="decimal" type="text" placeholder="e.g. 7">
                    <div class="hint">Use a conservative number. Over-optimism hides leverage risk.</div>
                  </div>
                  <div class="field">
                    <label for="t09-stressRate">Stress test: HELOC rate bump</label>
                    <select id="t09-stressRate">
                      <option value="0">+0%</option>
                      <option value="0.02">+2%</option>
                      <option value="0.04">+4%</option>
                    </select>
                    <div class="hint">Variable rates are a fragility lever. Stress test it.</div>
                  </div>
                </div>

                <button type="button" class="tool-button" id="t09-calc">Compare costs</button>
              </form>

              <div class="tool-results" aria-live="polite">
                <div class="results-kpis">
                  <div class="kpi">
                    <div class="kpi__label">HELOC payment (est.)</div>
                    <div class="kpi__value" id="t09-kpi-helocPay">$0</div>
                    <div class="kpi__meta" id="t09-kpi-helocInt">Total interest: $0</div>
                  </div>
                  <div class="kpi">
                    <div class="kpi__label">401(k) loan payment (est.)</div>
                    <div class="kpi__value" id="t09-kpi-401kPay">$0</div>
                    <div class="kpi__meta" id="t09-kpi-401kInt">Interest credited: $0</div>
                  </div>
                  <div class="kpi">
                    <div class="kpi__label">Opportunity cost (est.)</div>
                    <div class="kpi__value kpi__value--good" id="t09-kpi-opp">$0</div>
                    <div class="kpi__meta" id="t09-kpi-net">Net drag estimate</div>
                  </div>
                </div>

                <div class="results-table-wrap" role="region" aria-label="Stress scenarios table">
                  <table class="results-table">
                    <thead>
                      <tr>
                        <th>Scenario</th>
                        <th>HELOC rate</th>
                        <th>HELOC interest</th>
                        <th>Opp. cost</th>
                        <th>Quick read</th>
                      </tr>
                    </thead>
                    <tbody id="t09-rows"></tbody>
                  </table>
                </div>

                <div class="results-note" id="t09-warning" style="display:none;"></div>
                <div class="results-note results-note--alt">
                  This is a planning model. Taxes, deductibility, and plan rules can matter. The win is choosing the option that stays stable when the timeline slips.
                </div>
              </div>
            </div>
        </section>

        <script>
          (function() {
            function parseMoney(raw) {
              if (raw == null) return 0;
              const cleaned = String(raw).replace(/[^0-9.\\-]/g, '');
              const num = Number(cleaned);
              return Number.isFinite(num) ? num : 0;
            }
            function parsePct(raw) {
              const cleaned = String(raw || '').replace(/[^0-9.\\-]/g, '');
              const num = Number(cleaned);
              if (!Number.isFinite(num)) return 0;
              return Math.max(0, num) / 100;
            }
            function fmtUSD(n) {
              const v = Number.isFinite(n) ? n : 0;
              return v.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
            }

            function payment(principal, annualRate, years) {
              const n = Math.max(1, Math.round(years * 12));
              const r = annualRate / 12;
              if (r === 0) return principal / n;
              return principal * r / (1 - Math.pow(1 + r, -n));
            }

            function totals(principal, annualRate, years) {
              const n = Math.max(1, Math.round(years * 12));
              const pmt = payment(principal, annualRate, years);
              const totalPaid = pmt * n;
              const interest = Math.max(0, totalPaid - principal);
              return { pmt, interest };
            }

            function futureValue(principal, annualReturn, years) {
              const r = annualReturn;
              return principal * Math.pow(1 + r, years);
            }

            function calculate() {
              const amt = parseMoney(document.getElementById('t09-amt').value);
              const years = Number(document.getElementById('t09-term').value) || 5;
              const helocRate = parsePct(document.getElementById('t09-helocRate').value);
              const kRate = parsePct(document.getElementById('t09-401kRate').value);
              const ret = parsePct(document.getElementById('t09-return').value);
              const stressBump = Number(document.getElementById('t09-stressRate').value) || 0;

              const heloc = totals(amt, helocRate, years);
              const kloan = totals(amt, kRate, years);

              const fv = futureValue(amt, ret, years);
              const missedGrowth = Math.max(0, fv - amt);
              const netDrag = Math.max(0, missedGrowth - kloan.interest);

              document.getElementById('t09-kpi-helocPay').textContent = fmtUSD(heloc.pmt);
              document.getElementById('t09-kpi-helocInt').textContent = 'Total interest: ' + fmtUSD(heloc.interest);
              document.getElementById('t09-kpi-401kPay').textContent = fmtUSD(kloan.pmt);
              document.getElementById('t09-kpi-401kInt').textContent = 'Interest credited: ' + fmtUSD(kloan.interest);
              document.getElementById('t09-kpi-opp').textContent = fmtUSD(missedGrowth);
              document.getElementById('t09-kpi-net').textContent = 'Net drag est.: ' + fmtUSD(netDrag);

              const tbody = document.getElementById('t09-rows');
              tbody.innerHTML = '';
              const baseRow = { name: 'Base', rate: helocRate };
              const stressRow = { name: 'Stress', rate: Math.max(0, helocRate + stressBump) };
              [baseRow, stressRow].forEach((s) => {
                const t = totals(amt, s.rate, years);
                const quick = (t.interest > netDrag && netDrag > 0) ? '401(k) loan looks cheaper (econ)' : 'HELOC may be cheaper (cash)';
                const tr = document.createElement('tr');
                tr.innerHTML =
                  '<td data-label=\"Scenario\"><strong>' + s.name + '</strong></td>' +
                  '<td data-label=\"HELOC rate\">' + Math.round(s.rate * 1000) / 10 + '%</td>' +
                  '<td data-label=\"HELOC interest\">' + fmtUSD(t.interest) + '</td>' +
                  '<td data-label=\"Opp. cost\">' + fmtUSD(missedGrowth) + '</td>' +
                  '<td data-label=\"Quick read\">' + quick + '</td>';
                tbody.appendChild(tr);
              });

              const warn = document.getElementById('t09-warning');
              const msgs = [];
              if (amt <= 0) msgs.push('Enter an amount borrowed.');
              if (helocRate <= 0) msgs.push('Enter a HELOC rate to model cash interest cost.');
              if (kRate <= 0) msgs.push('Enter a 401(k) loan rate to model interest credited.');
              if (ret <= 0) msgs.push('Enter an expected market return to model opportunity cost.');
              warn.style.display = msgs.length ? 'block' : 'none';
              warn.textContent = msgs.join(' ');
            }

            document.getElementById('t09-calc').addEventListener('click', calculate);
          })();
        </script>`;
}

function widgetInstallmentSalePlanner() {
  return `<section class="tool-card" id="calculator" aria-label="Installment sale tax and cashflow planner">
            <div class="tool-card__header">
              <h2 class="tool-card__title">Installment Sale Schedule (Planning)</h2>
              <p class="tool-card__subtitle">Build a simple annual schedule: principal, interest, taxable gain, estimated tax, net cash.</p>
            </div>

            <div class="tool-grid tool-grid--stack">
              <form class="tool-form" id="t10-form">
                <div class="field-row">
                  <div class="field">
                    <label for="t10-price">Sale price</label>
                    <input id="t10-price" inputmode="decimal" type="text" placeholder="e.g. 1200000">
                  </div>
                  <div class="field">
                    <label for="t10-basis">Tax basis</label>
                    <input id="t10-basis" inputmode="decimal" type="text" placeholder="e.g. 350000">
                  </div>
                </div>

                <div class="field-row">
                  <div class="field">
                    <label for="t10-down">Down payment (year 0)</label>
                    <input id="t10-down" inputmode="decimal" type="text" placeholder="e.g. 200000">
                  </div>
                  <div class="field">
                    <label for="t10-years">Note term (years)</label>
                    <select id="t10-years">
                      <option value="3">3</option>
                      <option value="5" selected>5</option>
                      <option value="7">7</option>
                      <option value="10">10</option>
                    </select>
                  </div>
                </div>

                <div class="field-row">
                  <div class="field">
                    <label for="t10-rate">Note interest rate (annual %)</label>
                    <input id="t10-rate" inputmode="decimal" type="text" placeholder="e.g. 7.0">
                  </div>
                  <div class="field">
                    <label for="t10-cap">Capital gains rate (%)</label>
                    <input id="t10-cap" inputmode="decimal" type="text" placeholder="e.g. 20">
                  </div>
                </div>

                <div class="field-row">
                  <div class="field">
                    <label for="t10-intTax">Interest tax rate (%)</label>
                    <input id="t10-intTax" inputmode="decimal" type="text" placeholder="e.g. 32">
                    <div class="hint">Enter your planning rate for interest income (ordinary). Include state if desired.</div>
                  </div>
                  <div class="field">
                    <label for="t10-state">Optional: add state to both rates (%)</label>
                    <input id="t10-state" inputmode="decimal" type="text" placeholder="e.g. 5">
                    <div class="hint">Simple additive planning assumption.</div>
                  </div>
                </div>

                <button type="button" class="tool-button" id="t10-calc">Build schedule</button>
              </form>

              <div class="tool-results" aria-live="polite">
                <div class="results-kpis">
                  <div class="kpi">
                    <div class="kpi__label">Gross profit %</div>
                    <div class="kpi__value" id="t10-kpi-gpp">0%</div>
                    <div class="kpi__meta">Gain / sale price</div>
                  </div>
                  <div class="kpi">
                    <div class="kpi__label">Annual payment (note)</div>
                    <div class="kpi__value" id="t10-kpi-pay">$0</div>
                    <div class="kpi__meta">Excludes down payment</div>
                  </div>
                  <div class="kpi">
                    <div class="kpi__label">Total tax (est.)</div>
                    <div class="kpi__value kpi__value--good" id="t10-kpi-tax">$0</div>
                    <div class="kpi__meta" id="t10-kpi-net">Net cash estimate</div>
                  </div>
                </div>

                <div class="results-table-wrap" role="region" aria-label="Installment schedule table">
                  <table class="results-table">
                    <thead>
                      <tr>
                        <th>Year</th>
                        <th>Payment</th>
                        <th>Principal</th>
                        <th>Interest</th>
                        <th>Tax (est.)</th>
                        <th>Net cash</th>
                      </tr>
                    </thead>
                    <tbody id="t10-rows"></tbody>
                  </table>
                </div>

                <div class="results-note" id="t10-warning" style="display:none;"></div>
                <div class="results-note results-note--alt">
                  This is a planning schedule. Buyer risk, contract terms, and IRS forms matter. Use this to plan cash and estimated taxes, then validate with your CPA.
                </div>
              </div>
            </div>
        </section>

        <script>
          (function() {
            function parseMoney(raw) {
              if (raw == null) return 0;
              const cleaned = String(raw).replace(/[^0-9.\\-]/g, '');
              const num = Number(cleaned);
              return Number.isFinite(num) ? num : 0;
            }
            function parsePct(raw) {
              const cleaned = String(raw || '').replace(/[^0-9.\\-]/g, '');
              const num = Number(cleaned);
              if (!Number.isFinite(num)) return 0;
              return Math.max(0, num) / 100;
            }
            function fmtUSD(n) {
              const v = Number.isFinite(n) ? n : 0;
              return v.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
            }

            function annualPayment(principal, annualRate, years) {
              const n = Math.max(1, Math.round(years));
              const r = annualRate;
              if (r === 0) return principal / n;
              return principal * r / (1 - Math.pow(1 + r, -n));
            }

            function calculate() {
              const price = parseMoney(document.getElementById('t10-price').value);
              const basis = parseMoney(document.getElementById('t10-basis').value);
              const down = parseMoney(document.getElementById('t10-down').value);
              const years = Number(document.getElementById('t10-years').value) || 5;
              const rate = parsePct(document.getElementById('t10-rate').value);
              const cap = parsePct(document.getElementById('t10-cap').value);
              const intTax = parsePct(document.getElementById('t10-intTax').value);
              const state = parsePct(document.getElementById('t10-state').value);

              const totalGain = Math.max(0, price - basis);
              const gpp = price > 0 ? Math.min(1, Math.max(0, totalGain / price)) : 0;
              const notePrincipal = Math.max(0, price - down);
              const pay = annualPayment(notePrincipal, rate, years);

              const capRate = Math.min(0.9, cap + state);
              const intRate = Math.min(0.9, intTax + state);

              document.getElementById('t10-kpi-gpp').textContent = Math.round(gpp * 1000) / 10 + '%';
              document.getElementById('t10-kpi-pay').textContent = fmtUSD(pay);

              const tbody = document.getElementById('t10-rows');
              tbody.innerHTML = '';

              let balance = notePrincipal;
              let totalTax = 0;
              let totalNet = 0;

              function addRow(yearLabel, payment, principal, interest) {
                const gainPart = principal * gpp;
                const tax = gainPart * capRate + interest * intRate;
                const net = payment - tax;
                totalTax += tax;
                totalNet += net;
                const tr = document.createElement('tr');
                tr.innerHTML =
                  '<td data-label=\"Year\"><strong>' + yearLabel + '</strong></td>' +
                  '<td data-label=\"Payment\">' + fmtUSD(payment) + '</td>' +
                  '<td data-label=\"Principal\">' + fmtUSD(principal) + '</td>' +
                  '<td data-label=\"Interest\">' + fmtUSD(interest) + '</td>' +
                  '<td data-label=\"Tax (est.)\">' + fmtUSD(tax) + '</td>' +
                  '<td data-label=\"Net cash\">' + fmtUSD(net) + '</td>';
                tbody.appendChild(tr);
              }

              // Year 0 down payment treated as principal payment.
              if (down > 0) {
                addRow('0 (down)', down, down, 0);
              }

              for (let y = 1; y <= years; y++) {
                const interest = balance * rate;
                const principal = Math.min(balance, Math.max(0, pay - interest));
                const payment = principal + interest;
                addRow(String(y), payment, principal, interest);
                balance = Math.max(0, balance - principal);
              }

              document.getElementById('t10-kpi-tax').textContent = fmtUSD(totalTax);
              document.getElementById('t10-kpi-net').textContent = 'Net cash est.: ' + fmtUSD(totalNet);

              const warn = document.getElementById('t10-warning');
              const msgs = [];
              if (price <= 0) msgs.push('Enter a sale price.');
              if (basis <= 0) msgs.push('Enter a basis to compute gross profit percentage.');
              if (basis > price && price > 0) msgs.push('Basis exceeds sale price in this model. Confirm inputs.');
              if (notePrincipal === 0) msgs.push('Down payment equals sale price. No note schedule to build.');
              warn.style.display = msgs.length ? 'block' : 'none';
              warn.textContent = msgs.join(' ');
            }

            document.getElementById('t10-calc').addEventListener('click', calculate);
          })();
        </script>`;
}

function widgetBackdoorRothProrata() {
  return `<section class="tool-card" id="calculator" aria-label="Backdoor Roth pro-rata calculator">
            <div class="tool-card__header">
              <h2 class="tool-card__title">Pro-Rata Calculator (Planning)</h2>
              <p class="tool-card__subtitle">Estimate taxable vs nontaxable conversion amounts using year-end IRA balances and basis.</p>
            </div>

            <div class="tool-grid">
              <form class="tool-form" id="t11-form">
                <div class="field-row">
                  <div class="field">
                    <label for="t11-ira">Year-end IRA balance (12/31, Trad+SEP+SIMPLE)</label>
                    <input id="t11-ira" inputmode="decimal" type="text" placeholder="e.g. 85000">
                    <div class="hint">Exclude Roth. Include all Traditional, SEP, and SIMPLE IRAs.</div>
                  </div>
                  <div class="field">
                    <label for="t11-basis">Existing nondeductible basis (Form 8606 carryforward)</label>
                    <input id="t11-basis" inputmode="decimal" type="text" placeholder="e.g. 12000">
                    <div class="hint">Use your last filed Form 8606 carryforward basis.</div>
                  </div>
                </div>

                <div class="field-row">
                  <div class="field">
                    <label for="t11-newBasis">Current-year nondeductible contribution (optional)</label>
                    <input id="t11-newBasis" inputmode="decimal" type="text" placeholder="e.g. 7000">
                    <div class="hint">If you made a nondeductible contribution this year, include it here.</div>
                  </div>
                  <div class="field">
                    <label for="t11-conv">Planned Roth conversion amount</label>
                    <input id="t11-conv" inputmode="decimal" type="text" placeholder="e.g. 7000">
                  </div>
                </div>

                <div class="field-row">
                  <div class="field">
                    <label for="t11-dist">Other IRA distributions (optional)</label>
                    <input id="t11-dist" inputmode="decimal" type="text" placeholder="e.g. 0">
                    <div class="hint">If you took distributions from IRAs this year, include them for a closer denominator.</div>
                  </div>
                  <div class="field">
                    <label for="t11-buffer">Conservatism buffer (basis haircut)</label>
                    <select id="t11-buffer">
                      <option value="0">0%</option>
                      <option value="0.05">-5%</option>
                      <option value="0.10">-10%</option>
                    </select>
                    <div class="hint">If you are unsure about basis accuracy, haircut it and stay conservative.</div>
                  </div>
                </div>

                <button type="button" class="tool-button" id="t11-calc">Estimate taxable portion</button>
              </form>

              <div class="tool-results" aria-live="polite">
                <div class="results-kpis">
                  <div class="kpi">
                    <div class="kpi__label">Nontaxable portion (est.)</div>
                    <div class="kpi__value kpi__value--good" id="t11-kpi-non">$0</div>
                    <div class="kpi__meta">Based on basis ratio</div>
                  </div>
                  <div class="kpi">
                    <div class="kpi__label">Taxable portion (est.)</div>
                    <div class="kpi__value" id="t11-kpi-tax">$0</div>
                    <div class="kpi__meta">This is the part you plan for</div>
                  </div>
                  <div class="kpi">
                    <div class="kpi__label">Remaining basis (est.)</div>
                    <div class="kpi__value" id="t11-kpi-rem">$0</div>
                    <div class="kpi__meta">Carryforward estimate</div>
                  </div>
                </div>

                <div class="results-table-wrap" role="region" aria-label="Pro-rata breakdown table">
                  <table class="results-table">
                    <thead>
                      <tr>
                        <th>Line item</th>
                        <th>Amount</th>
                        <th>Execution note</th>
                      </tr>
                    </thead>
                    <tbody id="t11-rows"></tbody>
                  </table>
                </div>

                <div class="results-note" id="t11-warning" style="display:none;"></div>
                <div class="results-note results-note--alt">
                  If you want clean backdoor Roth execution, plan around 12/31 IRA balances. That is the lever most people ignore until it is too late.
                </div>
              </div>
            </div>
        </section>

        <script>
          (function() {
            function parseMoney(raw) {
              if (raw == null) return 0;
              const cleaned = String(raw).replace(/[^0-9.\\-]/g, '');
              const num = Number(cleaned);
              return Number.isFinite(num) ? num : 0;
            }
            function fmtUSD(n) {
              const v = Number.isFinite(n) ? n : 0;
              return v.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
            }
            function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

            function calculate() {
              const ira = parseMoney(document.getElementById('t11-ira').value);
              const basis0 = parseMoney(document.getElementById('t11-basis').value);
              const newBasis = parseMoney(document.getElementById('t11-newBasis').value);
              const conv = parseMoney(document.getElementById('t11-conv').value);
              const dist = parseMoney(document.getElementById('t11-dist').value);
              const haircut = Number(document.getElementById('t11-buffer').value) || 0;

              const basis = Math.max(0, (basis0 + newBasis) * (1 - haircut));
              const denom = Math.max(0, ira + Math.max(0, dist) + Math.max(0, conv));
              const ratio = denom > 0 ? clamp(basis / denom, 0, 1) : 0;
              const nonTaxable = Math.min(conv, conv * ratio);
              const taxable = Math.max(0, conv - nonTaxable);
              const remainingBasis = Math.max(0, basis - nonTaxable);

              document.getElementById('t11-kpi-non').textContent = fmtUSD(nonTaxable);
              document.getElementById('t11-kpi-tax').textContent = fmtUSD(taxable);
              document.getElementById('t11-kpi-rem').textContent = fmtUSD(remainingBasis);

              const tbody = document.getElementById('t11-rows');
              tbody.innerHTML = '';
              function addRow(label, amount, note) {
                const tr = document.createElement('tr');
                tr.innerHTML =
                  '<td data-label=\"Line item\"><strong>' + label + '</strong></td>' +
                  '<td data-label=\"Amount\">' + amount + '</td>' +
                  '<td data-label=\"Execution note\">' + note + '</td>';
                tbody.appendChild(tr);
              }

              addRow('Basis used (after haircut)', fmtUSD(basis), 'If basis is uncertain, conservatism protects you from surprises.');
              addRow('Denominator (IRA + distributions + conversion)', fmtUSD(denom), 'Year-end IRA balance is the lever that changes the ratio.');
              addRow('Basis ratio', (Math.round(ratio * 1000) / 10) + '%', 'Higher ratio means more nontaxable conversion.');
              addRow('Estimated taxable conversion', fmtUSD(taxable), 'Plan cash for this amount (plus state if applicable).');

              const warn = document.getElementById('t11-warning');
              const msgs = [];
              if (conv <= 0) msgs.push('Enter a conversion amount to estimate taxable portion.');
              if (denom <= 0 && conv > 0) msgs.push('Enter year-end IRA balance (and any distributions) to compute pro-rata ratio.');
              if (ira > 0 && basis > 0 && ratio < 0.2) msgs.push('Your basis is small relative to IRA balances. Most of the conversion will likely be taxable.');
              if (ira === 0 && dist === 0 && basis >= conv && conv > 0) msgs.push('Clean case: no year-end IRA balance and basis covers conversion. This often looks like a clean backdoor execution.');
              warn.style.display = msgs.length ? 'block' : 'none';
              warn.textContent = msgs.join(' ');
            }

            document.getElementById('t11-calc').addEventListener('click', calculate);
          })();
        </script>`;
}

function widgetWithholdingCatchUp() {
  return `<section class="tool-card" id="calculator" aria-label="W-2 withholding catch-up planner">
            <div class="tool-card__header">
              <h2 class="tool-card__title">Withholding Catch-Up Planner</h2>
              <p class="tool-card__subtitle">Pick a target amount to cover by year-end, then split the gap across paychecks or quarterly payments.</p>
            </div>

            <div class="tool-grid">
              <form class="tool-form" id="t12-form">
                <div class="field-row">
                  <div class="field">
                    <label for="t12-target">Target to cover by year-end (your goal)</label>
                    <input id="t12-target" inputmode="decimal" type="text" placeholder="e.g. 24000">
                    <div class="hint">This can be a safe-harbor gap, a CPA projection gap, or a conservative buffer goal.</div>
                  </div>
                  <div class="field">
                    <label for="t12-ytdW">Year-to-date withholding</label>
                    <input id="t12-ytdW" inputmode="decimal" type="text" placeholder="e.g. 14500">
                  </div>
                </div>

                <div class="field-row">
                  <div class="field">
                    <label for="t12-ytdE">Year-to-date estimated payments</label>
                    <input id="t12-ytdE" inputmode="decimal" type="text" placeholder="e.g. 2000">
                  </div>
                  <div class="field">
                    <label for="t12-paychecks">Remaining paychecks</label>
                    <select id="t12-paychecks">
                      <option value="2">2</option>
                      <option value="4">4</option>
                      <option value="6" selected>6</option>
                      <option value="8">8</option>
                      <option value="10">10</option>
                      <option value="12">12</option>
                      <option value="18">18</option>
                      <option value="24">24</option>
                    </select>
                  </div>
                </div>

                <div class="field-row">
                  <div class="field">
                    <label for="t12-quarters">Remaining estimated payments (quarters)</label>
                    <select id="t12-quarters">
                      <option value="0">0</option>
                      <option value="1">1</option>
                      <option value="2" selected>2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                    </select>
                    <div class="hint">If you are not making estimates, leave this at 0 and just use withholding.</div>
                  </div>
                  <div class="field">
                    <label for="t12-buffer">Conservatism buffer</label>
                    <select id="t12-buffer">
                      <option value="0">0%</option>
                      <option value="0.05">+5%</option>
                      <option value="0.10">+10%</option>
                    </select>
                    <div class="hint">If your income is volatile, a small buffer reduces surprises.</div>
                  </div>
                </div>

                <button type="button" class="tool-button" id="t12-calc">Build catch-up plan</button>
              </form>

              <div class="tool-results" aria-live="polite">
                <div class="results-kpis">
                  <div class="kpi">
                    <div class="kpi__label">Remaining gap</div>
                    <div class="kpi__value kpi__value--good" id="t12-kpi-gap">$0</div>
                    <div class="kpi__meta">Target minus paid to date</div>
                  </div>
                  <div class="kpi">
                    <div class="kpi__label">Per paycheck (extra withholding)</div>
                    <div class="kpi__value" id="t12-kpi-perpay">$0</div>
                    <div class="kpi__meta" id="t12-kpi-paymeta">Across remaining paychecks</div>
                  </div>
                  <div class="kpi">
                    <div class="kpi__label">Per quarter (estimated payment)</div>
                    <div class="kpi__value" id="t12-kpi-perq">$0</div>
                    <div class="kpi__meta" id="t12-kpi-qmeta">Across remaining quarters</div>
                  </div>
                </div>

                <div class="results-table-wrap" role="region" aria-label="Execution options table">
                  <table class="results-table">
                    <thead>
                      <tr>
                        <th>Execution path</th>
                        <th>What you do</th>
                        <th>Why it works</th>
                      </tr>
                    </thead>
                    <tbody id="t12-rows"></tbody>
                  </table>
                </div>

                <div class="results-note" id="t12-warning" style="display:none;"></div>
                <div class="results-note results-note--alt">
                  Execution standard: update payroll, confirm it shows on the next pay stub, and re-run the plan monthly. Do not wait until December to discover the gap.
                </div>
              </div>
            </div>
        </section>

        <script>
          (function() {
            function parseMoney(raw) {
              if (raw == null) return 0;
              const cleaned = String(raw).replace(/[^0-9.\\-]/g, '');
              const num = Number(cleaned);
              return Number.isFinite(num) ? num : 0;
            }
            function fmtUSD(n) {
              const v = Number.isFinite(n) ? n : 0;
              return v.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
            }

            function calculate() {
              const target0 = parseMoney(document.getElementById('t12-target').value);
              const ytdW = parseMoney(document.getElementById('t12-ytdW').value);
              const ytdE = parseMoney(document.getElementById('t12-ytdE').value);
              const paychecks = Number(document.getElementById('t12-paychecks').value) || 1;
              const quarters = Number(document.getElementById('t12-quarters').value) || 0;
              const bufferPct = Number(document.getElementById('t12-buffer').value) || 0;

              const target = Math.max(0, target0 * (1 + bufferPct));
              const paid = Math.max(0, ytdW + ytdE);
              const gap = Math.max(0, target - paid);
              const perPay = paychecks > 0 ? (gap / paychecks) : gap;
              const perQ = quarters > 0 ? (gap / quarters) : gap;

              document.getElementById('t12-kpi-gap').textContent = fmtUSD(gap);
              document.getElementById('t12-kpi-perpay').textContent = fmtUSD(perPay);
              document.getElementById('t12-kpi-perq').textContent = quarters > 0 ? fmtUSD(perQ) : 'N/A';
              document.getElementById('t12-kpi-paymeta').textContent = 'Across ' + paychecks + ' paycheck' + (paychecks === 1 ? '' : 's');
              document.getElementById('t12-kpi-qmeta').textContent = quarters > 0 ? ('Across ' + quarters + ' quarter' + (quarters === 1 ? '' : 's')) : 'Set quarters to compare';

              const tbody = document.getElementById('t12-rows');
              tbody.innerHTML = '';
              function addRow(path, what, why) {
                const tr = document.createElement('tr');
                tr.innerHTML =
                  '<td data-label=\"Execution path\"><strong>' + path + '</strong></td>' +
                  '<td data-label=\"What you do\">' + what + '</td>' +
                  '<td data-label=\"Why it works\">' + why + '</td>';
                tbody.appendChild(tr);
              }
              addRow('Withholding catch-up', 'Increase withholding by ' + fmtUSD(perPay) + ' per paycheck.', 'Simple execution: automatic, consistent, and easy to track.');
              addRow('Estimated payments', quarters > 0 ? ('Pay ' + fmtUSD(perQ) + ' per quarter.') : 'Set remaining quarters to see an estimate-payment option.', 'Useful when you do not have steady W-2 withholding control.');
              addRow('Hybrid', 'Split the gap between withholding and estimates.', 'Often the most stable path when cash flow is uneven.');

              const warn = document.getElementById('t12-warning');
              const msgs = [];
              if (target0 <= 0) msgs.push('Enter a target amount you want covered by year-end.');
              if (gap === 0 && target0 > 0) msgs.push('Based on these inputs, you are already at or above your target.');
              if (perPay > 0 && perPay > 3000) msgs.push('Large per-paycheck changes can be hard to execute. Consider a hybrid plan or re-check your target.');
              warn.style.display = msgs.length ? 'block' : 'none';
              warn.textContent = msgs.join(' ');
            }

            document.getElementById('t12-calc').addEventListener('click', calculate);
          })();
        </script>`;
}

function widgetCapitalGainsHeadroom() {
  return `<section class="tool-card" id="calculator" aria-label="Capital gains headroom calculator">
            <div class="tool-card__header">
              <h2 class="tool-card__title">Capital Gains Headroom</h2>
              <p class="tool-card__subtitle">Enter your baseline taxable income and a guardrail threshold to see how planned gains split across tiers.</p>
            </div>

            <div class="tool-grid">
              <form class="tool-form" id="t13-form">
                <div class="field-row">
                  <div class="field">
                    <label for="t13-base">Baseline taxable income (before LTCG)</label>
                    <input id="t13-base" inputmode="decimal" type="text" placeholder="e.g. 76000">
                    <div class="hint">Use a conservative estimate from a projection or last year. This is taxable income, not gross.</div>
                  </div>
                  <div class="field">
                    <label for="t13-thresh">Guardrail threshold (user-entered)</label>
                    <input id="t13-thresh" inputmode="decimal" type="text" placeholder="e.g. 94000">
                    <div class="hint">Enter the boundary you care about (thresholds vary by year and filing status).</div>
                  </div>
                </div>

                <div class="field-row">
                  <div class="field">
                    <label for="t13-buffer">Buffer under threshold</label>
                    <input id="t13-buffer" inputmode="decimal" type="text" placeholder="e.g. 1500">
                    <div class="hint">Dividends and income surprises happen. Buffer keeps the plan stable.</div>
                  </div>
                  <div class="field">
                    <label for="t13-gain">Planned long-term capital gain</label>
                    <input id="t13-gain" inputmode="decimal" type="text" placeholder="e.g. 22000">
                  </div>
                </div>

                <div class="field-row">
                  <div class="field">
                    <label for="t13-lowRate">Optional: lower-tier tax rate (%)</label>
                    <input id="t13-lowRate" inputmode="decimal" type="text" placeholder="e.g. 0">
                    <div class="hint">If you want a dollar estimate, enter the rate you expect to apply inside the guardrail.</div>
                  </div>
                  <div class="field">
                    <label for="t13-highRate">Optional: higher-tier tax rate (%)</label>
                    <input id="t13-highRate" inputmode="decimal" type="text" placeholder="e.g. 15">
                    <div class="hint">Enter the rate you expect to apply above the guardrail. Include state if desired.</div>
                  </div>
                </div>

                <button type="button" class="tool-button" id="t13-calc">Calculate headroom</button>
              </form>

              <div class="tool-results" aria-live="polite">
                <div class="results-kpis">
                  <div class="kpi">
                    <div class="kpi__label">Headroom (after buffer)</div>
                    <div class="kpi__value kpi__value--good" id="t13-kpi-room">$0</div>
                    <div class="kpi__meta">Threshold minus baseline minus buffer</div>
                  </div>
                  <div class="kpi">
                    <div class="kpi__label">Planned inside guardrail</div>
                    <div class="kpi__value" id="t13-kpi-in">$0</div>
                    <div class="kpi__meta">Lower tier portion</div>
                  </div>
                  <div class="kpi">
                    <div class="kpi__label">Planned above guardrail</div>
                    <div class="kpi__value" id="t13-kpi-over">$0</div>
                    <div class="kpi__meta">Higher tier portion</div>
                  </div>
                </div>

                <div class="results-table-wrap" role="region" aria-label="Tier split table">
                  <table class="results-table">
                    <thead>
                      <tr>
                        <th>Component</th>
                        <th>Amount</th>
                        <th>Tax estimate</th>
                      </tr>
                    </thead>
                    <tbody id="t13-rows"></tbody>
                  </table>
                </div>

                <div class="results-note" id="t13-warning" style="display:none;"></div>
                <div class="results-note results-note--alt">
                  Headroom is only useful if your baseline is honest. If you are near the line, buffer aggressively and re-run the tool before you execute the sale.
                </div>
              </div>
            </div>
        </section>

        <script>
          (function() {
            function parseMoney(raw) {
              if (raw == null) return 0;
              const cleaned = String(raw).replace(/[^0-9.\\-]/g, '');
              const num = Number(cleaned);
              return Number.isFinite(num) ? num : 0;
            }
            function parsePct(raw) {
              const cleaned = String(raw || '').replace(/[^0-9.\\-]/g, '');
              const num = Number(cleaned);
              if (!Number.isFinite(num)) return 0;
              return Math.max(0, num) / 100;
            }
            function fmtUSD(n) {
              const v = Number.isFinite(n) ? n : 0;
              return v.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
            }
            function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

            function calculate() {
              const base = parseMoney(document.getElementById('t13-base').value);
              const thresh0 = parseMoney(document.getElementById('t13-thresh').value);
              const buffer = parseMoney(document.getElementById('t13-buffer').value);
              const gain = parseMoney(document.getElementById('t13-gain').value);
              const lowRate = parsePct(document.getElementById('t13-lowRate').value);
              const highRate = parsePct(document.getElementById('t13-highRate').value);

              const thresh = Math.max(0, thresh0 - Math.max(0, buffer));
              const room = Math.max(0, thresh - Math.max(0, base));
              const inside = clamp(gain, 0, room);
              const over = Math.max(0, gain - inside);

              document.getElementById('t13-kpi-room').textContent = fmtUSD(room);
              document.getElementById('t13-kpi-in').textContent = fmtUSD(inside);
              document.getElementById('t13-kpi-over').textContent = fmtUSD(over);

              const taxIn = inside * lowRate;
              const taxOver = over * highRate;
              const totalTax = taxIn + taxOver;

              const tbody = document.getElementById('t13-rows');
              tbody.innerHTML = '';
              function addRow(label, amount, tax) {
                const tr = document.createElement('tr');
                tr.innerHTML =
                  '<td data-label=\"Component\"><strong>' + label + '</strong></td>' +
                  '<td data-label=\"Amount\">' + fmtUSD(amount) + '</td>' +
                  '<td data-label=\"Tax estimate\">' + (tax === null ? 'N/A' : fmtUSD(tax)) + '</td>';
                tbody.appendChild(tr);
              }
              addRow('Inside guardrail', inside, (lowRate > 0 ? taxIn : (lowRate === 0 ? taxIn : null)));
              addRow('Above guardrail', over, (highRate > 0 ? taxOver : (highRate === 0 ? taxOver : null)));
              addRow('Total (planned)', gain, (lowRate > 0 || highRate > 0 || lowRate === 0 || highRate === 0) ? totalTax : null);

              const warn = document.getElementById('t13-warning');
              const msgs = [];
              if (thresh0 <= 0) msgs.push('Enter a guardrail threshold.');
              if (gain <= 0) msgs.push('Enter a planned long-term capital gain to see the tier split.');
              if (base > thresh && thresh > 0) msgs.push('Your baseline is already above the guardrail after buffer. Any gain will be above in this model.');
              if (over > 0 && room > 0) msgs.push('Part of your planned gain spills above the guardrail. Consider sizing the sale or using a bigger buffer.');
              warn.style.display = msgs.length ? 'block' : 'none';
              warn.textContent = msgs.join(' ');
            }

            document.getElementById('t13-calc').addEventListener('click', calculate);
          })();
        </script>`;
}

function renderToolPage(tool) {
  const isoDate = new Date().toISOString().split('T')[0];
  const canonical = `https://www.legacyinvestingshow.com/tools/${tool.slug}`;
  const theme = toolTheme(tool);
  const openingHtml = renderParagraphs(tool.opening || []);
  const sectionsHtml = (tool.sections || []).map((s) => {
    return `<h2 id="${esc(s.id)}">${esc(s.title)}</h2>${renderParagraphs(s.paragraphs || [])}`;
  }).join('\n');
  const insightCards = [
    {
      eyebrow: 'Category',
      text: theme.summary,
    },
    {
      eyebrow: 'On This Page',
      text: `${(tool.sections || []).length} planning notes, ${(tool.faq || []).length} FAQs, and source links for follow-up.`,
    },
    {
      eyebrow: 'Workflow',
      text: 'Start with sample inputs, review the live output, then save the assumptions you plan to act on.',
    },
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>${esc(buildSEOTitle(tool.title))}</title>
    <meta name="description" content="${esc(tool.description)}">
    <meta name="keywords" content="${esc(toolKeywords(tool))}">
    <meta name="robots" content="index, follow">
${GOOGLE_SITE_VERIFICATIONS.map((code) => `    <meta name="google-site-verification" content="${code}">`).join('\n')}
    <link rel="canonical" href="${canonical}">

    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonical}">
    <meta property="og:title" content="${esc(tool.title)}">
    <meta property="og:description" content="${esc(tool.description)}">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(tool.title)}">
    <meta name="twitter:description" content="${esc(tool.description)}">

    <meta name="theme-color" content="#ffffff">
    <link rel="icon" type="image/png" href="/assets/images/logo.png">
    <link rel="stylesheet" href="/assets/css/styles.css">

    <script type="application/ld+json">${JSON.stringify(softwareApplicationSchema(tool, isoDate))}</script>
    <script type="application/ld+json">${JSON.stringify(breadcrumbSchema(tool))}</script>
    <script type="application/ld+json">${JSON.stringify(faqSchema(tool))}</script>

    ${renderAnalyticsHead({ gaTrackingId: GA_TRACKING_ID, gtmContainerId: GTM_CONTAINER_ID })}

    <style>
        :root {
            --tools-ink: #111827;
            --tools-muted: #475569;
            --tools-line: rgba(15, 23, 42, 0.1);
            --tools-accent: #c9a961;
            --tools-accent-strong: #9f7a27;
            --tools-surface: #fffdf8;
            --tools-surface-strong: #f5efe2;
            --tools-card: rgba(255, 255, 255, 0.92);
            --tools-shadow: 0 24px 64px rgba(15, 23, 42, 0.08);
        }
        .tools-hero {
            position: relative;
            overflow: hidden;
            padding: 8rem 0 3.5rem;
            background:
              radial-gradient(circle at top right, rgba(201, 169, 97, 0.2), transparent 34%),
              radial-gradient(circle at left center, rgba(15, 23, 42, 0.06), transparent 26%),
              linear-gradient(180deg, #fbf8f1 0%, #ffffff 100%);
        }
        .tools-hero::after {
            content: '';
            position: absolute;
            inset: auto 0 -1px;
            height: 1px;
            background: linear-gradient(90deg, rgba(201, 169, 97, 0), rgba(201, 169, 97, 0.5), rgba(201, 169, 97, 0));
        }
        .tools-hero__grid {
            display: grid;
            gap: 1.4rem;
            align-items: start;
        }
        @media (min-width: 1024px) {
            .tools-hero__grid {
                grid-template-columns: minmax(0, 1.38fr) minmax(320px, 0.84fr);
            }
        }
        .tools-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.52rem 1rem;
            background: rgba(17, 24, 39, 0.92);
            color: #ffffff;
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            border-radius: 999px;
            margin-bottom: 1rem;
            box-shadow: 0 14px 36px rgba(15, 23, 42, 0.12);
        }
        .tools-title {
            font-size: clamp(2.25rem, 5vw, 4.3rem);
            font-weight: 800;
            line-height: 0.94;
            letter-spacing: -0.04em;
            color: var(--tools-ink);
            margin-bottom: 0.95rem;
            max-width: 11ch;
        }
        .tools-subtitle {
            max-width: 44rem;
            color: var(--tools-muted);
            font-size: 1.06rem;
            line-height: 1.76;
        }
        .tools-hero__actions {
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem;
            margin-top: 1.35rem;
        }
        .tools-action {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.55rem;
            min-height: 2.9rem;
            padding: 0.82rem 1.15rem;
            border-radius: 999px;
            font-weight: 800;
            text-decoration: none;
            transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }
        .tools-action:hover {
            transform: translateY(-1px);
        }
        .tools-action--primary {
            background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
            color: #ffffff;
            box-shadow: 0 18px 34px rgba(17, 24, 39, 0.14);
        }
        .tools-action--secondary {
            background: rgba(255, 255, 255, 0.82);
            color: var(--tools-ink);
            border: 1px solid rgba(17, 24, 39, 0.12);
            backdrop-filter: blur(8px);
        }
        .tools-hero__panel {
            padding: 1.35rem 1.35rem 1.4rem;
            border-radius: 1.4rem;
            background:
              linear-gradient(165deg, rgba(24, 34, 52, 0.98), rgba(15, 23, 42, 0.98)),
              linear-gradient(135deg, rgba(201, 169, 97, 0.18), rgba(201, 169, 97, 0));
            color: white;
            box-shadow: 0 28px 64px rgba(15, 23, 42, 0.18);
            border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .tools-hero__panel-eyebrow {
            margin: 0 0 0.55rem;
            color: rgba(217, 196, 138, 0.92);
            font-size: 0.74rem;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
        }
        .tools-hero__panel-title {
            margin: 0 0 0.8rem;
            color: white;
            font-size: 1.55rem;
            line-height: 1.1;
        }
        .tools-hero__panel-text {
            margin: 0;
            color: #cbd5e1;
            font-size: 0.96rem;
            line-height: 1.72;
        }
        .tools-hero__panel-list {
            display: grid;
            gap: 0.75rem;
            margin-top: 1rem;
        }
        .tools-hero__panel-point {
            display: grid;
            gap: 0.2rem;
            padding-top: 0.75rem;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .tools-hero__panel-point strong {
            color: #ffffff;
            font-size: 0.94rem;
        }
        .tools-hero__panel-point span {
            color: #cbd5e1;
            font-size: 0.88rem;
            line-height: 1.55;
        }
        .tools-summary-grid {
            display: grid;
            gap: 1rem;
            margin-top: 1.55rem;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        }
        .tools-summary-card {
            position: relative;
            padding: 1.05rem 1.1rem 1.1rem;
            border-radius: 1.15rem;
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(255, 252, 246, 0.96));
            border: 1px solid rgba(15, 23, 42, 0.08);
            box-shadow: 0 16px 40px rgba(15, 23, 42, 0.06);
        }
        .tools-summary-card::before {
            content: '';
            position: absolute;
            inset: 0 auto 0 0;
            width: 3px;
            border-radius: 999px;
            background: linear-gradient(180deg, var(--tools-accent), rgba(201, 169, 97, 0));
        }
        .tools-summary-card__eyebrow {
            margin: 0 0 0.45rem;
            color: var(--tools-accent-strong);
            font-size: 0.74rem;
            font-weight: 700;
            letter-spacing: 0.1em;
            text-transform: uppercase;
        }
        .tools-summary-card p {
            margin: 0;
            color: #334155;
            font-size: 0.95rem;
            line-height: 1.68;
        }

        .content-section { padding: 0 0 3.25rem; }
        .content-section--alt { background: #f9fafb; }
        .prose-content {
            color: #374151;
            line-height: 1.75;
            padding: 1.55rem;
            border-radius: 1.6rem;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(255, 252, 247, 0.98));
            border: 1px solid rgba(15, 23, 42, 0.08);
            box-shadow: var(--tools-shadow);
        }
        .prose-content h2 { color: #111827; font-size: 1.6rem; line-height: 1.3; margin-bottom: 1rem; }
        .prose-content p { margin-bottom: 1rem; }
        .prose-content ul { padding-left: 1.2rem; margin: 0.5rem 0 1rem; }
        .prose-content li { margin-bottom: 0.55rem; }
        .prose-content h2,
        #calculator {
          scroll-margin-top: 7.75rem;
        }

        .operator-note {
          margin: 1.25rem 0 1.6rem;
          background: linear-gradient(180deg, rgba(236, 253, 245, 0.85), rgba(236, 253, 245, 0.55));
          border: 1px solid rgba(16, 185, 129, 0.35);
          border-left: 4px solid #10b981;
          padding: 0.95rem 1rem;
          border-radius: 0.75rem;
          color: #065f46;
          line-height: 1.65;
        }
        .operator-note strong { color: #064e3b; }

        .jumpbar-wrap {
          position: sticky;
          top: 4.15rem;
          z-index: 20;
          margin: 1.25rem 0 1.6rem;
        }
        .jumpbar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.7rem 0.85rem;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(17, 24, 39, 0.12);
          border-radius: 0.85rem;
          box-shadow: 0 12px 30px rgba(17, 24, 39, 0.06);
          backdrop-filter: blur(10px);
        }
        .jumpbar__label {
          font-size: 0.72rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 900;
          color: #111827;
          white-space: nowrap;
        }
        .jumpbar__links {
          display: flex;
          gap: 0.5rem;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          flex: 1;
        }
        .jumpbar__links::-webkit-scrollbar { display: none; }
        .jumpbar__link {
          display: inline-flex;
          align-items: center;
          padding: 0.38rem 0.7rem;
          border-radius: 999px;
          border: 1px solid rgba(17, 24, 39, 0.16);
          color: #111827;
          text-decoration: none;
          font-weight: 800;
          font-size: 0.85rem;
          white-space: nowrap;
          background: linear-gradient(180deg, rgba(255,255,255,1), rgba(249,250,251,1));
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease;
        }
        .jumpbar__link:hover {
          border-color: rgba(17, 24, 39, 0.28);
          box-shadow: 0 10px 22px rgba(17, 24, 39, 0.06);
          transform: translateY(-1px);
        }
        .jumpbar__link.is-active {
          background: linear-gradient(135deg, rgba(17, 24, 39, 0.98), rgba(39, 50, 66, 0.98));
          border-color: rgba(17, 24, 39, 0.98);
          color: #ffffff;
          box-shadow: 0 12px 24px rgba(17, 24, 39, 0.12);
        }

        .tool-card {
            background: linear-gradient(180deg, #ffffff, #fffdf9);
            border: 1px solid rgba(15, 23, 42, 0.08);
            border-radius: 1.4rem;
            overflow: hidden;
            margin: 1.25rem 0 2rem;
            box-shadow: 0 30px 70px rgba(15, 23, 42, 0.08);
        }
        .tool-card__header {
            padding: 1.35rem 1.3rem 1rem;
            border-bottom: 1px solid rgba(15, 23, 42, 0.08);
            background:
              linear-gradient(180deg, rgba(250, 247, 242, 0.92), rgba(255, 255, 255, 0.96));
        }
        .tool-card__title {
            margin: 0;
            color: #111827;
            font-weight: 800;
            font-size: 1.28rem;
            line-height: 1.25;
        }
        .tool-card__subtitle {
            margin: 0.45rem 0 0;
            color: #6b7280;
            font-size: 0.95rem;
            line-height: 1.55;
        }
        .tool-assist {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.9rem;
            padding: 0.85rem 1.25rem;
            background: linear-gradient(180deg, rgba(250, 247, 242, 0.6), rgba(255, 255, 255, 0.96));
            border-bottom: 1px solid rgba(15, 23, 42, 0.08);
        }
        .tool-assist__copy {
            min-width: 0;
        }
        .tool-assist__title {
            margin: 0;
            color: #111827;
            font-size: 0.92rem;
            font-weight: 800;
        }
        .tool-assist__meta {
            margin: 0.18rem 0 0;
            color: #64748b;
            font-size: 0.84rem;
            line-height: 1.5;
        }
        .tool-assist__actions {
            display: flex;
            flex-wrap: wrap;
            gap: 0.6rem;
            justify-content: flex-end;
        }
        .tool-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: 1.15rem;
            padding: 1.25rem;
        }
        @media (min-width: 1024px) {
            .tool-grid { grid-template-columns: minmax(0, 1.02fr) minmax(320px, 0.98fr); gap: 1.25rem; }
        }
        @media (min-width: 1024px) {
            .tool-grid--stack { grid-template-columns: minmax(0, 1fr); }
        }

        .tool-form {
            background: linear-gradient(180deg, rgba(249, 250, 251, 0.98), rgba(255, 255, 255, 0.98));
            border: 1px solid rgba(15, 23, 42, 0.08);
            border-radius: 1rem;
            padding: 1rem;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
        }
        .field { margin-bottom: 0.9rem; }
        .field-row { display: grid; gap: 0.85rem; }
        @media (min-width: 768px) { .field-row { grid-template-columns: 1fr 1fr; } }
        .field label {
            display: block;
            font-weight: 700;
            color: #111827;
            font-size: 0.9rem;
            margin-bottom: 0.35rem;
        }
        .field input,
        .field select {
            width: 100%;
            border: 1px solid #cbd5e1;
            border-radius: 0.75rem;
            padding: 0.75rem 0.82rem;
            font-size: 0.95rem;
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.98));
            color: #111827;
            transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
        }
        .field input:hover,
        .field select:hover {
            border-color: #94a3b8;
        }
        .field input:focus,
        .field select:focus {
            outline: none;
            border-color: rgba(201, 169, 97, 0.95);
            box-shadow: 0 0 0 4px rgba(201, 169, 97, 0.16);
            background: #ffffff;
        }
        .hint { margin-top: 0.35rem; color: #6b7280; font-size: 0.82rem; line-height: 1.5; }
        .tool-button {
            display: inline-flex;
            justify-content: center;
            align-items: center;
            min-height: 2.9rem;
            width: 100%;
            padding: 0.85rem 1.1rem;
            background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
            color: white;
            border: none;
            border-radius: 0.8rem;
            font-weight: 800;
            cursor: pointer;
            box-shadow: 0 18px 28px rgba(15, 23, 42, 0.12);
            transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
        }
        .tool-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 22px 30px rgba(15, 23, 42, 0.16);
        }
        .tool-button--ghost {
            background: rgba(255, 255, 255, 0.9);
            border: 1px solid #d1d5db;
            color: #111827;
            width: auto;
            padding: 0.68rem 0.95rem;
            font-weight: 800;
            box-shadow: none;
        }
        .tool-button--ghost:hover { background: #f8fafc; }

        .tool-results {
            padding: 0.2rem 0;
            align-self: start;
        }
        @media (min-width: 1024px) {
            .tool-grid:not(.tool-grid--stack) .tool-results {
                position: sticky;
                top: 6rem;
            }
        }
        .results-kpis { display: grid; gap: 0.85rem; }
        @media (min-width: 768px) { .results-kpis { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        .kpi {
            background: linear-gradient(180deg, #ffffff, #fff9ef);
            border: 1px solid rgba(15, 23, 42, 0.08);
            border-radius: 1rem;
            padding: 0.95rem 1rem;
            box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05);
        }
        .kpi__label {
            font-size: 0.72rem;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: #6b7280;
            margin-bottom: 0.35rem;
        }
        .kpi__value { color: #111827; font-weight: 900; font-size: 1.12rem; }
        .kpi__value--good { color: #047857; }
        .kpi__meta { color: #6b7280; font-size: 0.82rem; margin-top: 0.35rem; line-height: 1.4; }

        .results-table-wrap {
            margin-top: 1rem;
            border: 1px solid rgba(15, 23, 42, 0.08);
            border-radius: 1rem;
            overflow-x: auto;
            background: #ffffff;
            box-shadow: 0 14px 28px rgba(15, 23, 42, 0.05);
        }
        .results-table { width: 100%; border-collapse: collapse; min-width: 620px; }
        .results-table th {
            background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
            color: white;
            text-align: left;
            font-size: 0.85rem;
            font-weight: 700;
            letter-spacing: 0.02em;
            padding: 0.8rem;
            vertical-align: top;
        }
        .results-table td {
            border-bottom: 1px solid #e5e7eb;
            padding: 0.78rem;
            vertical-align: top;
            color: #374151;
            font-size: 0.94rem;
        }

        .results-note {
            margin-top: 1rem;
            background: linear-gradient(180deg, rgba(236, 253, 245, 0.92), rgba(236, 253, 245, 0.68));
            border-left: 4px solid #10b981;
            padding: 0.9rem 0.95rem;
            border-radius: 0.8rem;
            color: #065f46;
            line-height: 1.6;
            font-size: 0.95rem;
        }
        .results-note--alt {
            background: linear-gradient(180deg, rgba(239, 246, 255, 0.92), rgba(239, 246, 255, 0.7));
            border-left-color: #3b82f6;
            color: #1e3a8a;
        }

        .related-section {
          margin-top: 2.25rem;
          padding-top: 1.25rem;
          border-top: 1px solid #e5e7eb;
        }
        .related-section__title {
          font-size: 1.2rem;
          font-weight: 900;
          color: #111827;
          margin: 0 0 0.85rem;
        }
        .related-grid {
          display: grid;
          gap: 0.85rem;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        }
        .related-card {
          background: linear-gradient(180deg, #ffffff, #f9fafb);
          border: 1px solid rgba(17, 24, 39, 0.12);
          border-radius: 0.9rem;
          padding: 1rem 1rem 0.95rem;
        }
        .related-card__title {
          margin: 0 0 0.7rem;
          font-weight: 900;
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
          color: #ffffff;
          border-radius: 0.7rem;
          text-decoration: none;
          font-weight: 900;
        }
        .related-card__cta:hover { background: #0b1220; }

        .faq-section { background: #f9fafb; padding: 3.5rem 0; }
        .faq-section__title { font-size: 1.7rem; font-weight: 800; color: #111827; margin-bottom: 1.75rem; text-align: center; }
        .faq-list { max-width: 52rem; margin: 0 auto; }
        .faq-item { background: white; border-radius: 0.95rem; margin-bottom: 0.9rem; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 16px 34px rgba(15, 23, 42, 0.05); }
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
        .faq-question:hover { background: #f9fafb; }
        .faq-chevron { width: 1.2rem; height: 1.2rem; color: #9ca3af; transition: transform 0.2s; }
        .faq-question[aria-expanded="true"] .faq-chevron { transform: rotate(180deg); }
        .faq-answer { display: none; padding: 0 1.1rem 1.1rem; color: #4b5563; line-height: 1.65; }
        .faq-answer--open { display: block; }

        .cta-section { padding: 3.5rem 0; text-align: center; }
        .cta-card {
            background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
            border-radius: 1.2rem;
            padding: 2.5rem 1.5rem;
            color: white;
            box-shadow: 0 26px 54px rgba(15, 23, 42, 0.16);
        }
        .cta-card__title { font-size: 1.7rem; font-weight: 800; color: #ffffff; margin-bottom: 0.85rem; }
        .cta-card__text { color: #d1d5db; max-width: 46rem; margin: 0 auto 1.4rem; }
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
        .cta-card__button:hover { background: #059669; }

        .breadcrumb { padding: 1rem 0; font-size: 0.875rem; color: #6b7280; }
        .breadcrumb a { color: #6b7280; text-decoration: none; }
        .breadcrumb a:hover { color: #111827; }
        .breadcrumb span.sep { margin: 0 0.5rem; color: #9ca3af; }

        .log-table-wrap {
            border: 1px solid rgba(15, 23, 42, 0.08);
            border-radius: 0.95rem;
            background: white;
            overflow-x: auto;
            margin-top: 0.6rem;
            box-shadow: 0 14px 28px rgba(15, 23, 42, 0.05);
        }
        .log-table { width: 100%; border-collapse: collapse; min-width: 640px; }
        .log-table th {
            background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
            color: white;
            text-align: left;
            font-size: 0.85rem;
            font-weight: 700;
            padding: 0.75rem;
        }
        .log-table td { border-bottom: 1px solid #e5e7eb; padding: 0.65rem 0.75rem; }
        .log-table input {
            width: 100%;
            border: 1px solid #cbd5e1;
            border-radius: 0.65rem;
            padding: 0.62rem 0.7rem;
            font-size: 0.92rem;
            transition: border-color 0.18s ease, box-shadow 0.18s ease;
        }
        .log-table input:focus {
            outline: none;
            border-color: rgba(201, 169, 97, 0.95);
            box-shadow: 0 0 0 4px rgba(201, 169, 97, 0.16);
        }
        .log-actions { display: flex; gap: 0.6rem; flex-wrap: wrap; margin-top: 0.75rem; }
        .linklike {
            background: none;
            border: none;
            padding: 0;
            color: #374151;
            text-decoration: underline;
            cursor: pointer;
            font-weight: 700;
        }
        .log-remove { white-space: nowrap; }
        a:focus-visible,
        button:focus-visible,
        input:focus-visible,
        select:focus-visible {
            outline: 3px solid rgba(201, 169, 97, 0.28);
            outline-offset: 2px;
        }

        @media (max-width: 767px) {
            .tools-hero { padding: 6.75rem 0 2.5rem; }
            .tools-title { font-size: 1.75rem; max-width: none; }
            .tools-subtitle { font-size: 1rem; line-height: 1.6; }
            .tools-hero__actions { gap: 0.6rem; }
            .tools-action {
                flex: 1 1 100%;
                width: 100%;
            }
            .content-section { padding: 0 0 2.4rem; }
            .prose-content { padding: 1.15rem; border-radius: 1.2rem; }
            .prose-content h2 { font-size: 1.35rem; }
            .tools-summary-grid { grid-template-columns: 1fr; }
            .jumpbar-wrap { top: 4.05rem; margin: 1rem 0 1.25rem; }
            .jumpbar {
                padding: 0.62rem 0.7rem;
                flex-direction: column;
                align-items: flex-start;
            }
            .jumpbar__links { width: 100%; }
            .tool-assist {
                flex-direction: column;
                align-items: flex-start;
                padding: 0.85rem 1rem;
            }
            .tool-assist__actions {
                width: 100%;
                justify-content: stretch;
            }
            .tool-assist__actions .tool-button--ghost {
                flex: 1 1 calc(50% - 0.3rem);
                justify-content: center;
            }
            .tool-grid { padding: 1rem; }
            .tool-form { padding: 0.85rem; }
            .results-table { min-width: 0; }
            .results-table thead { display: none; }
            .results-table, .results-table tbody, .results-table tr, .results-table td { display: block; width: 100%; }
            .results-table tr { border-bottom: 1px solid #e5e7eb; padding: 0.45rem 0.1rem; }
            .results-table td { border-bottom: none; padding: 0.45rem 0.6rem; }
            .results-table td::before {
                content: attr(data-label);
                display: block;
                font-size: 0.73rem;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.04em;
                color: #6b7280;
                margin-bottom: 0.2rem;
            }
        }
    </style>
</head>
<body class="bg-white text-gray-900" data-page-type="tool" data-page-slug="${esc(tool.slug)}" data-page-title="${esc(tool.title)}">
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
                    ${renderPrimaryNavLinks('/tools')}
                </div>

                <button id="mobile-menu-btn" class="md:hidden p-2 text-gray-700" aria-label="Open menu">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                </button>
            </div>

            <div id="mobile-menu" class="hidden md:hidden pb-4">
                <div class="flex flex-col gap-3">
                    ${renderPrimaryNavLinks('/tools')}
                </div>
            </div>
        </nav>
    </header>

    <main id="main">
        <div class="container-custom breadcrumb" style="padding-top: 5rem;">
            <a href="/">Home</a>
            <span class="sep">/</span>
            <a href="/tools/">Tools</a>
            <span class="sep">/</span>
            <span class="text-gray-900">${esc(tool.title)}</span>
        </div>

        <section class="tools-hero">
            <div class="container-custom">
                <div class="tools-hero__grid">
                    <div>
                        <span class="tools-badge">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 6v6l4 2"/>
                                <path d="M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9z"/>
                            </svg>
                            ${esc(tool.badge || 'Free Tool')}
                        </span>
                        <h1 class="tools-title">${esc(tool.title)}</h1>
                        <p class="tools-subtitle">${esc(tool.description)}</p>
                        <div class="tools-hero__actions">
                            <a class="tools-action tools-action--primary" href="#calculator">Jump to calculator</a>
                            <a class="tools-action tools-action--secondary" href="#doc-checklist">Open doc checklist</a>
                            <a class="tools-action tools-action--secondary" href="/tools/">Browse all tools</a>
                        </div>
                    </div>
                    <aside class="tools-hero__panel">
                        <p class="tools-hero__panel-eyebrow">What You Get</p>
                        <h2 class="tools-hero__panel-title">A cleaner decision flow, not another spreadsheet rabbit hole.</h2>
                        <p class="tools-hero__panel-text">Use this page to get a conservative number fast, pressure-test the weak spots, and leave with notes you can hand to an advisor.</p>
                        <div class="tools-hero__panel-list">
                            <div class="tools-hero__panel-point">
                                <strong>${esc(theme.label)}</strong>
                                <span>${esc(theme.summary)}</span>
                            </div>
                            <div class="tools-hero__panel-point">
                                <strong>Live workspace</strong>
                                <span>Most fields auto-refresh the outputs while you type, so you spend less time hunting for the calculate button.</span>
                            </div>
                            <div class="tools-hero__panel-point">
                                <strong>Advisor-ready follow-through</strong>
                                <span>Every page ends with a documentation checklist so the output can survive after the browser tab closes.</span>
                            </div>
                        </div>
                    </aside>
                </div>

                <div class="tools-summary-grid">
                    ${insightCards.map((card) => `<article class="tools-summary-card">
                        <p class="tools-summary-card__eyebrow">${esc(card.eyebrow)}</p>
                        <p>${esc(card.text)}</p>
                    </article>`).join('\n')}
                </div>
            </div>
        </section>

        <section class="content-section">
            <div class="container-custom">
                <article class="prose-content">
                    <h2>Why This Tool Exists</h2>
                    ${openingHtml}

                    <div class="operator-note"><strong>Execution note:</strong> Run the tool, then write down your assumptions and keep the receipts and logs as you go. The strategy that wins on paper only matters if your process holds up in the real world.</div>

                    ${renderJumpBar(tool)}

                    ${toolWidget(tool)}

                    ${sectionsHtml}

                    <h2 id="doc-checklist">Documentation Checklist (Keep It Defensible)</h2>
                    <ul>
                      ${renderBullets([
                        'Create a one-page objective memo before you execute (what outcome you are trying to buy).',
                        'Store your assumptions and calculations in a dated PDF (no year-end reconstructions).',
                        'Keep evidence in the same folder structure every month (receipts, logs, approvals).',
                        'Ask your CPA what would make this easy to sign off on, then build that packet.'
                      ])}
                    </ul>

                    ${renderSourceBlock({ title: tool.title, slug: tool.slug, type: 'tool' })}

                    ${renderRelatedSection(tool)}
                </article>
            </div>
        </section>

        <section class="faq-section" id="faq">
            <div class="container-custom">
                <h2 class="faq-section__title">Frequently Asked Questions</h2>
                <div class="faq-list" itemscope itemtype="https://schema.org/FAQPage">
                    ${renderFaqItems(tool.faq || [])}
                </div>
            </div>
        </section>

        <section class="cta-section">
            <div class="container-custom">
                ${renderPageCtaSection({
                  variant: 'tax_masterclass',
                  title: 'Use The Tool, Then Build The Full Plan Live',
                  text: 'Before You File runs live on Zoom from Friday, March 27, 2026 through Sunday, March 29, 2026, from 10 AM to 4 PM Eastern each day. Preston walks through how to read your 2025 return, choose the right tax and wealth moves, and leave with a dated 12-month 2026 plan.',
                  trackLocation: 'tool_page_cta',
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
        const toolMeta = {
            id: ${JSON.stringify(tool.id || '')},
            slug: ${JSON.stringify(tool.slug || '')},
            title: ${JSON.stringify(tool.title || '')}
        };

        function emitToolEvent(action, detail = {}) {
            const payload = {
                tool_id: toolMeta.id,
                tool_slug: toolMeta.slug,
                tool_title: toolMeta.title,
                tool_action: action,
                page_type: 'tool',
                ...detail
            };

            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
                event: 'tool_interaction',
                ...payload
            });

            if (typeof gtag === 'function') {
                gtag('event', action, payload);
            }
        }

        document.querySelectorAll('.faq-question').forEach((button) => {
            button.addEventListener('click', () => {
                const expanded = button.getAttribute('aria-expanded') === 'true';
                button.setAttribute('aria-expanded', String(!expanded));
                button.nextElementSibling.classList.toggle('faq-answer--open');
                if (!expanded) {
                    emitToolEvent('tool_faq_open', {
                        faq_question: button.textContent.trim().slice(0, 120)
                    });
                }
            });
        });

        document.getElementById('mobile-menu-btn')?.addEventListener('click', function() {
            document.getElementById('mobile-menu').classList.toggle('hidden');
        });

        document.querySelectorAll('#calculator button').forEach((button) => {
            button.addEventListener('click', () => {
                const label = button.textContent.trim().replace(/\s+/g, ' ');
                let action = 'tool_button_click';

                if ((button.id || '').endsWith('-calc')) action = 'tool_calculate';
                if ((button.id || '').endsWith('-csv')) action = 'tool_export_csv';
                if ((button.id || '').endsWith('-add')) action = 'tool_add_log_row';

                emitToolEvent(action, {
                    button_label: label.slice(0, 120)
                });
            });
        });

        document.querySelectorAll('.jumpbar__link').forEach((link) => {
            link.addEventListener('click', () => {
                emitToolEvent('tool_jump_nav_click', {
                    jump_target: link.getAttribute('href') || ''
                });
            });
        });

        function debounce(fn, wait) {
            let timeoutId;
            return function(...args) {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => fn.apply(this, args), wait);
            };
        }

        function extractPlaceholderSample(input) {
            if (!(input instanceof HTMLInputElement)) return '';
            if (input.type === 'date') return new Date().toISOString().slice(0, 10);

            const placeholder = (input.getAttribute('placeholder') || '').trim();
            if (!placeholder) return '';

            const normalized = placeholder.replace(/^e\\.g\\.\\s*/i, '').trim();
            if (!normalized || /leave blank/i.test(normalized)) return '';
            return normalized;
        }

        function fillSampleValues(form) {
            form.querySelectorAll('input, textarea, select').forEach((field) => {
                if (field.disabled || field.readOnly) return;

                if (field instanceof HTMLSelectElement) {
                    if (!field.value && field.options.length) field.selectedIndex = 0;
                    return;
                }

                if (!(field instanceof HTMLInputElement) && !(field instanceof HTMLTextAreaElement)) return;
                if (field.value) return;

                const sample = extractPlaceholderSample(field);
                if (sample) field.value = sample;
            });
        }

        function clearFormValues(form) {
            form.reset();
            form.querySelectorAll('input[type="text"], input[type="date"], textarea').forEach((field) => {
                field.value = '';
            });
        }

        function setupJumpbarState() {
            const jumpLinks = Array.from(document.querySelectorAll('.jumpbar__link'));
            const jumpTargets = jumpLinks
                .map((link) => {
                    const href = link.getAttribute('href') || '';
                    if (!href.startsWith('#')) return null;
                    const target = document.querySelector(href);
                    if (!target) return null;
                    return { link, target };
                })
                .filter(Boolean);

            if (!jumpTargets.length) return;

            function setActive(activeId) {
                jumpTargets.forEach(({ link, target }) => {
                    link.classList.toggle('is-active', target.id === activeId);
                });
            }

            setActive(jumpTargets[0].target.id);

            if (!('IntersectionObserver' in window)) return;

            const observer = new IntersectionObserver((entries) => {
                const visible = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

                if (visible && visible.target.id) setActive(visible.target.id);
            }, {
                rootMargin: '-18% 0px -62% 0px',
                threshold: [0.15, 0.4, 0.7],
            });

            jumpTargets.forEach(({ target }) => observer.observe(target));
        }

        function setupToolWorkspace() {
            const calculator = document.getElementById('calculator');
            const form = calculator?.querySelector('.tool-form');
            const calcButton = calculator?.querySelector('button[id$="-calc"]');
            const header = calculator?.querySelector('.tool-card__header');

            if (!calculator || !form || !calcButton || !header) return;

            const assist = document.createElement('div');
            assist.className = 'tool-assist';
            assist.innerHTML = '<div class="tool-assist__copy">' +
                '<p class="tool-assist__title">Faster workflow</p>' +
                '<p class="tool-assist__meta" data-tool-status>Auto-updates while you type. Use sample inputs if you want a quick walkthrough.</p>' +
              '</div>' +
              '<div class="tool-assist__actions">' +
                '<button type="button" class="tool-button tool-button--ghost" data-tool-fill>Try sample inputs</button>' +
                '<button type="button" class="tool-button tool-button--ghost" data-tool-reset>Reset</button>' +
              '</div>';
            header.insertAdjacentElement('afterend', assist);

            const status = assist.querySelector('[data-tool-status]');
            const fillButton = assist.querySelector('[data-tool-fill]');
            const resetButton = assist.querySelector('[data-tool-reset]');

            function setStatus(message) {
                if (status) status.textContent = message;
            }

            function runCalculation() {
                calcButton.click();
                setStatus('Updated just now. Save the assumptions you intend to act on.');
            }

            const debouncedRun = debounce(() => {
                runCalculation();
            }, 220);

            form.addEventListener('input', (event) => {
                if (!event.target.matches('input, select, textarea')) return;
                setStatus('Updating outputs…');
                debouncedRun();
            });

            form.addEventListener('change', (event) => {
                if (!event.target.matches('input, select, textarea')) return;
                setStatus('Updating outputs…');
                debouncedRun();
            });

            calculator.addEventListener('click', (event) => {
                if (event.target.closest('button[id$="-add"]') || event.target.closest('.linklike')) {
                    setStatus('Refreshing totals…');
                    setTimeout(runCalculation, 0);
                }
            });

            fillButton?.addEventListener('click', () => {
                fillSampleValues(form);
                runCalculation();
                emitToolEvent('tool_fill_sample_inputs');
            });

            resetButton?.addEventListener('click', () => {
                clearFormValues(form);
                runCalculation();
                setStatus('Reset to blank inputs. Add your real numbers when you are ready.');
                emitToolEvent('tool_reset');
            });

            setTimeout(runCalculation, 0);
        }

        document.querySelectorAll('.related-card__cta').forEach((link) => {
            link.addEventListener('click', () => {
                emitToolEvent('tool_related_guide_click', {
                    destination: link.getAttribute('href') || ''
                });
            });
        });

        setupJumpbarState();
        setupToolWorkspace();
        emitToolEvent('tool_page_view');
    </script>
</body>
</html>`;
}

function renderIndex(tools) {
  const canonical = 'https://www.legacyinvestingshow.com/tools';
  const isoDate = new Date().toISOString().split('T')[0];
  const themes = tools.reduce((acc, tool) => {
    const theme = toolTheme(tool);
    if (!acc.has(theme.key)) {
      acc.set(theme.key, {
        ...theme,
        count: 0,
      });
    }
    acc.get(theme.key).count += 1;
    return acc;
  }, new Map());

  const filterButtons = [
    { key: 'all', label: 'All Tools', count: tools.length },
    ...Array.from(themes.values()).sort((a, b) => a.label.localeCompare(b.label)),
  ]
    .map((theme, index) => `<button type="button" class="filter-chip${index === 0 ? ' is-active' : ''}" data-filter="${esc(theme.key)}">
                    <span>${esc(theme.label)}</span>
                    <strong>${theme.count}</strong>
                </button>`)
    .join('\n');

  const cards = tools
    .map((tool) => {
      const theme = toolTheme(tool);
      const searchBlob = [tool.title, tool.badge, tool.description, theme.label, theme.summary].filter(Boolean).join(' ');

      return `<article class="library-card" data-theme="${esc(theme.key)}" data-search="${esc(searchBlob.toLowerCase())}" data-href="/tools/${esc(tool.slug)}">
                    <div class="library-card__top">
                        <div class="library-card__eyebrow">
                            <span class="library-card__badge">${esc(tool.badge || 'Tool')}</span>
                            <span class="library-card__theme">${esc(theme.label)}</span>
                        </div>
                        <h3><a href="/tools/${esc(tool.slug)}">${esc(tool.title)}</a></h3>
                    </div>
                    <p>${esc(tool.description)}</p>
                    <div class="library-card__footer">
                        <p class="library-card__signal">${esc(theme.summary)}</p>
                        <a class="library-card__cta" href="/tools/${esc(tool.slug)}">Open tool</a>
                    </div>
                </article>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Free Tools (Execution-First) | Legacy Investing Show</title>
    <meta name="description" content="Free, execution-first tools for high-income earners: calculators, checklists, and documentation playbooks that help strategies hold up in the real world.">
    <meta name="robots" content="index, follow">
${GOOGLE_SITE_VERIFICATIONS.map((code) => `    <meta name="google-site-verification" content="${code}">`).join('\n')}
    <link rel="canonical" href="${canonical}">

    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonical}">
    <meta property="og:title" content="Free Tools (Execution-First) | Legacy Investing Show">
    <meta property="og:description" content="Free, execution-first tools for high-income earners: calculators, checklists, and documentation playbooks.">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Free Tools (Execution-First) | Legacy Investing Show">
    <meta name="twitter:description" content="Free, execution-first tools for high-income earners: calculators, checklists, and documentation playbooks.">

    <meta name="theme-color" content="#ffffff">
    <link rel="icon" type="image/png" href="/assets/images/logo.png">
    <link rel="stylesheet" href="/assets/css/styles.css">

    <script type="application/ld+json">${JSON.stringify(toolIndexSchema(tools, isoDate))}</script>
    <script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.legacyinvestingshow.com/' },
        { '@type': 'ListItem', position: 2, name: 'Tools', item: canonical }
      ]
    })}</script>

    ${renderAnalyticsHead({ gaTrackingId: GA_TRACKING_ID, gtmContainerId: GTM_CONTAINER_ID })}

    <style>
      :root {
        --tools-ink: #111827;
        --tools-muted: #475569;
        --tools-accent: #c9a961;
        --tools-accent-strong: #9f7a27;
      }
      .hero {
        position: relative;
        overflow: hidden;
        padding: 8rem 0 3.5rem;
        background:
          radial-gradient(circle at top right, rgba(201, 169, 97, 0.2), transparent 36%),
          radial-gradient(circle at left center, rgba(15, 23, 42, 0.06), transparent 25%),
          linear-gradient(180deg, #fbf8f1 0%, #ffffff 100%);
      }
      .hero::after {
        content: "";
        position: absolute;
        inset: auto 0 -1px;
        height: 1px;
        background: linear-gradient(90deg, rgba(201, 169, 97, 0), rgba(201, 169, 97, 0.55), rgba(201, 169, 97, 0));
      }
      .hero-grid {
        display: grid;
        gap: 1.35rem;
        align-items: start;
      }
      @media (min-width: 1024px) {
        .hero-grid {
          grid-template-columns: minmax(0, 1.38fr) minmax(300px, 0.84fr);
        }
      }
      .hero-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.55rem;
        padding: 0.48rem 0.9rem;
        border-radius: 999px;
        background: rgba(17, 24, 39, 0.9);
        color: #ffffff;
        font-size: 0.74rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        margin-bottom: 0.95rem;
        box-shadow: 0 14px 34px rgba(15, 23, 42, 0.12);
      }
      .hero-badge::before {
        content: "";
        width: 0.45rem;
        height: 0.45rem;
        border-radius: 999px;
        background: var(--tools-accent);
      }
      .hero-title {
        font-size: clamp(2.35rem, 5vw, 4.2rem);
        font-weight: 800;
        color: var(--tools-ink);
        line-height: 0.94;
        letter-spacing: -0.04em;
        margin-bottom: 0.9rem;
        max-width: 11ch;
      }
      .hero-subtitle {
        max-width: 44rem;
        color: var(--tools-muted);
        font-size: 1.06rem;
        line-height: 1.76;
      }
      .hero-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        margin-top: 1.35rem;
      }
      .hero-action {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 2.9rem;
        padding: 0.82rem 1.1rem;
        border-radius: 999px;
        text-decoration: none;
        font-weight: 800;
        transition: transform 0.18s ease, box-shadow 0.18s ease;
      }
      .hero-action:hover {
        transform: translateY(-1px);
      }
      .hero-action--primary {
        background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
        color: white;
        box-shadow: 0 18px 34px rgba(15, 23, 42, 0.14);
      }
      .hero-action--secondary {
        background: rgba(255, 255, 255, 0.82);
        border: 1px solid rgba(17, 24, 39, 0.12);
        color: var(--tools-ink);
        backdrop-filter: blur(8px);
      }
      .hero-panel {
        padding: 1.3rem;
        border-radius: 1.35rem;
        background:
          linear-gradient(160deg, rgba(24, 34, 52, 0.98), rgba(15, 23, 42, 0.98)),
          linear-gradient(135deg, rgba(201, 169, 97, 0.16), rgba(201, 169, 97, 0));
        color: white;
        box-shadow: 0 24px 58px rgba(15, 23, 42, 0.18);
        border: 1px solid rgba(255, 255, 255, 0.08);
      }
      .hero-panel__stat {
        padding: 0.85rem 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      .hero-panel__stat:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }
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
      .library-shell {
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(255, 251, 245, 0.98));
        border: 1px solid rgba(15, 23, 42, 0.08);
        border-radius: 1.5rem;
        box-shadow: 0 24px 64px rgba(15, 23, 42, 0.08);
        padding: 1.15rem;
      }
      .library-toolbar {
        display: grid;
        gap: 1rem;
        align-items: end;
      }
      @media (min-width: 1024px) {
        .library-toolbar {
          grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
        }
      }
      .library-toolbar__eyebrow {
        margin: 0 0 0.4rem;
        color: var(--tools-accent-strong);
        font-size: 0.75rem;
        font-weight: 800;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }
      .library-toolbar__title {
        margin: 0;
        color: var(--tools-ink);
        font-size: 1.45rem;
        line-height: 1.15;
      }
      .library-toolbar__text {
        margin: 0.45rem 0 0;
        color: var(--tools-muted);
        line-height: 1.65;
      }
      .library-search label {
        display: block;
        color: var(--tools-ink);
        font-size: 0.84rem;
        font-weight: 800;
        margin-bottom: 0.45rem;
      }
      .library-search input {
        width: 100%;
        min-height: 3rem;
        border-radius: 0.95rem;
        border: 1px solid #cbd5e1;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.98));
        padding: 0.82rem 0.95rem;
        font-size: 0.96rem;
        color: #111827;
        transition: border-color 0.18s ease, box-shadow 0.18s ease;
      }
      .library-search input:focus {
        outline: none;
        border-color: rgba(201, 169, 97, 0.95);
        box-shadow: 0 0 0 4px rgba(201, 169, 97, 0.16);
      }
      .library-filters {
        display: flex;
        flex-wrap: wrap;
        gap: 0.7rem;
        margin-top: 1rem;
      }
      .filter-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.65rem;
        min-height: 2.7rem;
        padding: 0.68rem 0.9rem;
        border-radius: 999px;
        border: 1px solid rgba(17, 24, 39, 0.12);
        background: rgba(255, 255, 255, 0.94);
        color: #111827;
        font-size: 0.88rem;
        font-weight: 800;
        cursor: pointer;
        transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease;
      }
      .filter-chip strong {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 1.6rem;
        height: 1.6rem;
        padding: 0 0.35rem;
        border-radius: 999px;
        background: rgba(17, 24, 39, 0.08);
        font-size: 0.78rem;
      }
      .filter-chip:hover {
        transform: translateY(-1px);
        box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
      }
      .filter-chip.is-active {
        background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
        border-color: rgba(17, 24, 39, 0.95);
        color: white;
        box-shadow: 0 16px 28px rgba(15, 23, 42, 0.14);
      }
      .filter-chip.is-active strong {
        background: rgba(255, 255, 255, 0.12);
      }
      .library-meta {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        margin-top: 1rem;
        padding-top: 0.95rem;
        border-top: 1px solid rgba(15, 23, 42, 0.08);
      }
      .library-meta strong {
        color: var(--tools-ink);
        font-size: 0.96rem;
      }
      .library-meta span {
        color: var(--tools-muted);
        font-size: 0.9rem;
      }
      .section { padding: 3.25rem 0; }
      .grid {
        display: grid;
        gap: 1.2rem;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        margin-top: 1.2rem;
      }
      .library-card {
        display: flex;
        flex-direction: column;
        gap: 0.9rem;
        min-height: 100%;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(255, 252, 247, 0.98));
        border: 1px solid rgba(15, 23, 42, 0.08);
        border-radius: 1.2rem;
        padding: 1.1rem 1.1rem 1rem;
        box-shadow: 0 18px 42px rgba(15, 23, 42, 0.06);
        transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        cursor: pointer;
      }
      .library-card:hover {
        transform: translateY(-3px);
        border-color: rgba(17, 24, 39, 0.16);
        box-shadow: 0 24px 46px rgba(15, 23, 42, 0.1);
      }
      .library-card.is-hidden {
        display: none;
      }
      .library-card__top {
        display: grid;
        gap: 0.7rem;
      }
      .library-card__eyebrow {
        display: flex;
        flex-wrap: wrap;
        gap: 0.55rem;
        align-items: center;
      }
      .library-card__badge {
        display: inline-flex;
        align-items: center;
        padding: 0.28rem 0.68rem;
        background: #111827;
        color: white;
        border-radius: 999px;
        font-size: 0.72rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        font-weight: 700;
      }
      .library-card__theme {
        display: inline-flex;
        align-items: center;
        padding: 0.26rem 0.68rem;
        border-radius: 999px;
        background: rgba(201, 169, 97, 0.16);
        color: var(--tools-accent-strong);
        font-size: 0.72rem;
        font-weight: 800;
      }
      .library-card h3 {
        margin: 0;
        font-size: 1.08rem;
        line-height: 1.35;
        font-weight: 800;
        color: #111827;
      }
      .library-card h3 a { color: inherit; text-decoration: none; }
      .library-card h3 a:hover { text-decoration: underline; }
      .library-card p { color: #4b5563; line-height: 1.65; margin: 0; }
      .library-card__footer {
        display: flex;
        flex-direction: column;
        gap: 0.9rem;
        margin-top: auto;
      }
      .library-card__signal {
        font-size: 0.9rem;
        color: #64748b;
      }
      .library-card__cta {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 2.85rem;
        padding: 0.72rem 1rem;
        background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
        color: white;
        border-radius: 0.8rem;
        text-decoration: none;
        font-weight: 800;
        box-shadow: 0 16px 28px rgba(15, 23, 42, 0.1);
      }
      .library-card__cta:hover { background: #0b1220; }
      .library-empty {
        display: none;
        margin-top: 1.2rem;
        padding: 1.15rem;
        border-radius: 1rem;
        border: 1px dashed rgba(15, 23, 42, 0.16);
        background: rgba(248, 250, 252, 0.88);
        color: #475569;
        text-align: center;
        line-height: 1.65;
      }
      .library-empty.is-visible {
        display: block;
      }
      .breadcrumb { padding: 1rem 0; font-size: 0.875rem; color: #6b7280; }
      .breadcrumb a { color: #6b7280; text-decoration: none; }
      .breadcrumb a:hover { color: #111827; }
      .breadcrumb span.sep { margin: 0 0.5rem; color: #9ca3af; }
      a:focus-visible,
      button:focus-visible,
      input:focus-visible {
        outline: 3px solid rgba(201, 169, 97, 0.28);
        outline-offset: 2px;
      }
      @media (max-width: 767px) {
        .hero { padding: 6.75rem 0 2.55rem; }
        .hero-title { font-size: 1.75rem; max-width: none; }
        .hero-subtitle { font-size: 1rem; line-height: 1.6; }
        .hero-actions {
          gap: 0.6rem;
        }
        .hero-action {
          flex: 1 1 100%;
          width: 100%;
        }
        .section { padding: 2.2rem 0; }
        .library-shell {
          padding: 1rem;
          border-radius: 1.2rem;
        }
        .library-meta {
          align-items: flex-start;
        }
      }
    </style>
</head>
<body class="bg-white text-gray-900" data-page-type="tool_hub" data-page-title="Free Tools">
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
                    ${renderPrimaryNavLinks('/tools')}
                </div>

                <button id="mobile-menu-btn" class="md:hidden p-2 text-gray-700" aria-label="Open menu">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                </button>
            </div>

            <div id="mobile-menu" class="hidden md:hidden pb-4">
                <div class="flex flex-col gap-3">
                    ${renderPrimaryNavLinks('/tools')}
                </div>
            </div>
        </nav>
    </header>

    <main id="main">
      <div class="container-custom breadcrumb" style="padding-top: 5rem;">
          <a href="/">Home</a>
          <span class="sep">/</span>
          <span class="text-gray-900">Tools</span>
      </div>

      <section class="hero">
        <div class="container-custom">
          <div class="hero-grid">
            <div>
              <span class="hero-badge">Free Tools</span>
              <h1 class="hero-title">Free planning tools for taxes, real estate, and retirement moves</h1>
              <p class="hero-subtitle">Each tool is built to answer one decision clearly: give you the math, explain the guardrails, and make the next step easier to execute in real life.</p>
              <div class="hero-actions">
                <a class="hero-action hero-action--primary" href="#tool-library">Browse the library</a>
                <a class="hero-action hero-action--secondary" href="/worksheets">See worksheets</a>
              </div>
            </div>
            <aside class="hero-panel">
              <div class="hero-panel__stat">
                <strong>${tools.length}</strong>
                <span>Interactive tools covering estimated taxes, deductions, real estate ops, retirement planning, and exit decisions.</span>
              </div>
              <div class="hero-panel__stat">
                <strong>Search</strong>
                <span>Use the search bar and category filters below to narrow the list fast instead of scanning a flat wall of cards.</span>
              </div>
              <div class="hero-panel__stat">
                <strong>Workflow</strong>
                <span>Every tool page pairs the calculator with process notes, documentation reminders, and next-step links.</span>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section class="section" id="tool-library">
        <div class="container-custom">
          <div class="library-shell">
            <div class="library-toolbar">
              <div>
                <p class="library-toolbar__eyebrow">Tool Library</p>
                <h2 class="library-toolbar__title">Find the right planning workflow faster</h2>
                <p class="library-toolbar__text">Filter by theme, search by problem, and open the tool that matches the decision you are trying to make today.</p>
              </div>
              <div class="library-search">
                <label for="tool-search">Search tools</label>
                <input id="tool-search" type="search" placeholder="Search by strategy, problem, or tool name">
              </div>
            </div>

            <div class="library-filters">
              ${filterButtons}
            </div>

            <div class="library-meta">
              <strong id="tool-count-label">${tools.length} tools shown</strong>
              <span id="tool-count-copy">Showing the full library.</span>
            </div>

            <div class="grid" id="tool-grid">
              ${cards}
            </div>

            <div class="library-empty" id="tool-empty-state">
              No tools match that search yet. Clear the filters or try a broader phrase like <strong>Roth</strong>, <strong>estimated tax</strong>, or <strong>home office</strong>.
            </div>
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
            event: 'tool_hub_view',
            page_type: 'tool_hub',
            tool_count: ${tools.length}
        });

        if (typeof gtag === 'function') {
            gtag('event', 'tool_hub_view', {
                page_type: 'tool_hub',
                tool_count: ${tools.length}
            });
        }

        document.querySelectorAll('.library-card a').forEach((link) => {
            link.addEventListener('click', () => {
                const href = link.getAttribute('href') || '';
                const title = link.closest('.library-card')?.querySelector('h3')?.textContent?.trim() || '';
                window.dataLayer.push({
                    event: 'tool_hub_click',
                    page_type: 'tool_hub',
                    destination: href,
                    tool_title: title
                });

                if (typeof gtag === 'function') {
                    gtag('event', 'tool_hub_click', {
                        page_type: 'tool_hub',
                        destination: href,
                        tool_title: title
                    });
                }
            });
        });

        const searchInput = document.getElementById('tool-search');
        const filterButtons = Array.from(document.querySelectorAll('.filter-chip'));
        const cards = Array.from(document.querySelectorAll('.library-card'));
        const toolCountLabel = document.getElementById('tool-count-label');
        const toolCountCopy = document.getElementById('tool-count-copy');
        const emptyState = document.getElementById('tool-empty-state');
        let activeFilter = 'all';

        function updateToolLibrary() {
            const query = (searchInput?.value || '').trim().toLowerCase();
            let visibleCount = 0;

            cards.forEach((card) => {
                const matchesFilter = activeFilter === 'all' || card.dataset.theme === activeFilter;
                const matchesQuery = !query || (card.dataset.search || '').includes(query);
                const isVisible = matchesFilter && matchesQuery;
                card.classList.toggle('is-hidden', !isVisible);
                if (isVisible) visibleCount += 1;
            });

            if (toolCountLabel) {
                toolCountLabel.textContent = visibleCount + ' tool' + (visibleCount === 1 ? '' : 's') + ' shown';
            }

            if (toolCountCopy) {
                if (query) {
                    toolCountCopy.textContent = 'Filtered by "' + query + '"' + (activeFilter === 'all' ? '.' : ' within ' + (document.querySelector('.filter-chip.is-active span')?.textContent || 'selected tools') + '.');
                } else if (activeFilter !== 'all') {
                    toolCountCopy.textContent = 'Showing ' + (document.querySelector('.filter-chip.is-active span')?.textContent || 'selected tools') + '.';
                } else {
                    toolCountCopy.textContent = 'Showing the full library.';
                }
            }

            emptyState?.classList.toggle('is-visible', visibleCount === 0);
        }

        filterButtons.forEach((button) => {
            button.addEventListener('click', () => {
                filterButtons.forEach((item) => item.classList.remove('is-active'));
                button.classList.add('is-active');
                activeFilter = button.dataset.filter || 'all';
                updateToolLibrary();

                window.dataLayer.push({
                    event: 'tool_hub_filter',
                    page_type: 'tool_hub',
                    tool_filter: activeFilter
                });

                if (typeof gtag === 'function') {
                    gtag('event', 'tool_hub_filter', {
                        page_type: 'tool_hub',
                        tool_filter: activeFilter
                    });
                }
            });
        });

        searchInput?.addEventListener('input', updateToolLibrary);

        cards.forEach((card) => {
            card.addEventListener('click', (event) => {
                if (event.target.closest('a, button, input')) return;
                const href = card.dataset.href;
                if (href) window.location.href = href;
            });
        });

        updateToolLibrary();
    </script>
</body>
</html>`;
}

function main() {
  const data = readData();
  const tools = Array.isArray(data.tools) ? data.tools : [];

  ensureDir(OUTPUT_DIR);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), renderIndex(tools));

  tools.forEach((tool) => {
    const html = renderToolPage(tool);
    fs.writeFileSync(path.join(OUTPUT_DIR, `${tool.slug}.html`), html);
  });

  console.log(`Generated ${tools.length} tool pages in tools/`);
}

main();
