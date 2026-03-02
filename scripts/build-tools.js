#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: tool.title,
    description: tool.description,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    isAccessibleForFree: true,
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

function toolAnchors(tool) {
  const anchors = [];
  anchors.push({ href: '#calculator', label: 'Calculator' });
  (tool.sections || []).forEach((section) => {
    if (section && section.id && section.title) anchors.push({ href: `#${section.id}`, label: section.title });
  });
  anchors.push({ href: '#faq', label: 'FAQ' });
  return anchors;
}

function renderSidebar(tool) {
  const anchors = toolAnchors(tool);
  const related = tool.related || [];

  return `<aside class="sidebar">
            <div class="sidebar-card">
                <div class="sidebar-card__title">On This Page</div>
                <ul class="sidebar-list">
                    ${anchors.map((a) => `<li><a href="${esc(a.href)}">${esc(a.label)}</a></li>`).join('\n')}
                </ul>
            </div>
            ${related.length ? `<div class="sidebar-card">
                <div class="sidebar-card__title">Related Guides</div>
                <ul class="sidebar-list">
                    ${renderRelated(related)}
                </ul>
            </div>` : ''}
            <div class="sidebar-card">
                <div class="sidebar-card__title">Reminder</div>
                <p style="color:#4b5563; font-size:0.92rem; line-height:1.6; margin:0;">
                  These tools are educational. Your facts decide what is defensible. If you are implementing a tax strategy, involve a qualified professional early.
                </p>
            </div>
        </aside>`;
}

function toolWidget(tool) {
  if (tool.id === 'T01') return widgetSafeHarbor();
  if (tool.id === 'T02') return widgetAccountablePlan();
  if (tool.id === 'T03') return widgetAugustaRule();
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

            <div class="tool-grid">
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

function renderToolPage(tool) {
  const isoDate = new Date().toISOString().split('T')[0];
  const canonical = `https://www.legacyinvestingshow.com/tools/${tool.slug}`;
  const openingHtml = renderParagraphs(tool.opening || []);
  const sectionsHtml = (tool.sections || []).map((s) => {
    return `<h2 id="${esc(s.id)}">${esc(s.title)}</h2>${renderParagraphs(s.paragraphs || [])}`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>${esc(buildSEOTitle(tool.title))}</title>
    <meta name="description" content="${esc(tool.description)}">
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
    <script type="application/ld+json">${JSON.stringify(faqSchema(tool))}</script>

    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_CONTAINER_ID}');</script>
    <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${GA_TRACKING_ID}');
    </script>

    <style>
        .tools-hero {
            padding: 8rem 0 3.5rem;
            background: linear-gradient(135deg, #f8fafc 0%, #e5e7eb 100%);
        }
        .tools-badge {
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
        .tools-title {
            font-size: 2.125rem;
            font-weight: 700;
            line-height: 1.15;
            color: #111827;
            margin-bottom: 1rem;
        }
        @media (min-width: 768px) {
            .tools-title { font-size: 2.6rem; }
        }
        .tools-subtitle {
            max-width: 52rem;
            color: #4b5563;
            font-size: 1.1rem;
            line-height: 1.7;
        }

        .content-section { padding: 3.25rem 0; }
        .content-section--alt { background: #f9fafb; }
        .content-grid { display: grid; gap: 2rem; }
        @media (min-width: 1024px) {
            .content-grid { grid-template-columns: minmax(0, 2.2fr) minmax(280px, 1fr); }
        }
        .prose-content { color: #374151; line-height: 1.75; }
        .prose-content h2 { color: #111827; font-size: 1.6rem; line-height: 1.3; margin-bottom: 1rem; }
        .prose-content p { margin-bottom: 1rem; }
        .prose-content ul { padding-left: 1.2rem; margin: 0.5rem 0 1rem; }
        .prose-content li { margin-bottom: 0.55rem; }

        .tool-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 1rem;
            overflow: hidden;
            margin: 1.25rem 0 2rem;
        }
        .tool-card__header {
            padding: 1.25rem 1.25rem 0.75rem;
            border-bottom: 1px solid #f3f4f6;
        }
        .tool-card__title {
            margin: 0;
            color: #111827;
            font-weight: 800;
            font-size: 1.25rem;
            line-height: 1.25;
        }
        .tool-card__subtitle {
            margin: 0.45rem 0 0;
            color: #6b7280;
            font-size: 0.95rem;
            line-height: 1.55;
        }
        .tool-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: 1rem;
            padding: 1.25rem;
        }
        @media (min-width: 1024px) {
            .tool-grid { grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr); gap: 1.25rem; }
        }

        .tool-form {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 0.9rem;
            padding: 1rem;
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
            border: 1px solid #d1d5db;
            border-radius: 0.6rem;
            padding: 0.65rem 0.75rem;
            font-size: 0.95rem;
            background: white;
            color: #111827;
        }
        .hint { margin-top: 0.35rem; color: #6b7280; font-size: 0.82rem; line-height: 1.5; }
        .tool-button {
            width: 100%;
            display: inline-flex;
            justify-content: center;
            align-items: center;
            padding: 0.85rem 1.1rem;
            background: #111827;
            color: white;
            border: none;
            border-radius: 0.65rem;
            font-weight: 700;
            cursor: pointer;
        }
        .tool-button:hover { background: #0b1220; }
        .tool-button--ghost {
            background: transparent;
            border: 1px solid #d1d5db;
            color: #111827;
            width: auto;
            padding: 0.6rem 0.9rem;
            font-weight: 700;
        }
        .tool-button--ghost:hover { background: #f3f4f6; }

        .tool-results { padding: 0.2rem 0; }
        .results-kpis { display: grid; gap: 0.85rem; }
        @media (min-width: 768px) { .results-kpis { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        .kpi {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 0.9rem;
            padding: 0.9rem 0.95rem;
        }
        .kpi__label {
            font-size: 0.72rem;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: #6b7280;
            margin-bottom: 0.35rem;
        }
        .kpi__value { color: #111827; font-weight: 800; font-size: 1.1rem; }
        .kpi__value--good { color: #047857; }
        .kpi__meta { color: #6b7280; font-size: 0.82rem; margin-top: 0.35rem; line-height: 1.4; }

        .results-table-wrap {
            margin-top: 1rem;
            border: 1px solid #e5e7eb;
            border-radius: 0.9rem;
            overflow-x: auto;
            background: white;
        }
        .results-table { width: 100%; border-collapse: collapse; min-width: 620px; }
        .results-table th {
            background: #111827;
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
            background: #ecfdf5;
            border-left: 4px solid #10b981;
            padding: 0.9rem 0.95rem;
            border-radius: 0.6rem;
            color: #065f46;
            line-height: 1.6;
            font-size: 0.95rem;
        }
        .results-note--alt {
            background: #eff6ff;
            border-left-color: #3b82f6;
            color: #1e3a8a;
        }

        .sidebar { position: sticky; top: 6rem; align-self: start; }
        .sidebar-card {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 0.75rem;
            padding: 1rem;
            margin-bottom: 1rem;
        }
        .sidebar-card__title { font-size: 0.95rem; font-weight: 800; color: #111827; margin-bottom: 0.8rem; }
        .sidebar-list { list-style: none; padding: 0; margin: 0; }
        .sidebar-list li { margin-bottom: 0.55rem; }
        .sidebar-list a { color: #374151; text-decoration: none; font-size: 0.9rem; }
        .sidebar-list a:hover { color: #111827; text-decoration: underline; }

        .faq-section { background: #f9fafb; padding: 3.5rem 0; }
        .faq-section__title { font-size: 1.7rem; font-weight: 800; color: #111827; margin-bottom: 1.75rem; text-align: center; }
        .faq-list { max-width: 52rem; margin: 0 auto; }
        .faq-item { background: white; border-radius: 0.75rem; margin-bottom: 0.9rem; overflow: hidden; border: 1px solid #e5e7eb; }
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
            border-radius: 1rem;
            padding: 2.5rem 1.5rem;
            color: white;
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
            border: 1px solid #e5e7eb;
            border-radius: 0.75rem;
            background: white;
            overflow-x: auto;
            margin-top: 0.6rem;
        }
        .log-table { width: 100%; border-collapse: collapse; min-width: 640px; }
        .log-table th {
            background: #111827;
            color: white;
            text-align: left;
            font-size: 0.85rem;
            font-weight: 700;
            padding: 0.75rem;
        }
        .log-table td { border-bottom: 1px solid #e5e7eb; padding: 0.65rem 0.75rem; }
        .log-table input {
            width: 100%;
            border: 1px solid #d1d5db;
            border-radius: 0.55rem;
            padding: 0.55rem 0.65rem;
            font-size: 0.92rem;
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

        @media (max-width: 767px) {
            .tools-hero { padding: 6.75rem 0 2.4rem; }
            .tools-title { font-size: 1.65rem; }
            .tools-subtitle { font-size: 1rem; line-height: 1.6; }
            .content-section { padding: 2.2rem 0; }
            .prose-content h2 { font-size: 1.35rem; }
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
            <a href="/tools/">Tools</a>
            <span class="sep">/</span>
            <span class="text-gray-900">${esc(tool.title)}</span>
        </div>

        <section class="tools-hero">
            <div class="container-custom">
                <span class="tools-badge">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 6v6l4 2"/>
                        <path d="M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9z"/>
                    </svg>
                    ${esc(tool.badge || 'Free Tool')}
                </span>
                <h1 class="tools-title">${esc(tool.title)}</h1>
                <p class="tools-subtitle">${esc(tool.description)}</p>
            </div>
        </section>

        <section class="content-section">
            <div class="container-custom content-grid">
                <article class="prose-content">
                    <h2>Why This Tool Exists</h2>
                    ${openingHtml}

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
                </article>

                ${renderSidebar(tool)}
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
                <div class="cta-card">
                    <h2 class="cta-card__title">Turn The Tool Into An Execution Plan</h2>
                    <p class="cta-card__text">The people who win are not the ones who find a strategy. They are the ones who build a monthly system, keep receipts and logs, and hand their CPA a clean packet.</p>
                    <a href="https://www.managemoney101.com/challengeoptin" class="cta-card__button">
                        Join the 3-Day Wealth Challenge
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                    </a>
                    <p style="margin: 1.25rem 0 0; color: #9ca3af; font-size: 0.85rem; line-height: 1.6;">Educational content only. Results vary based on your facts. Always consult a qualified tax professional before making decisions.</p>
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

function renderIndex(tools) {
  const canonical = 'https://www.legacyinvestingshow.com/tools/';
  const isoDate = new Date().toISOString().split('T')[0];

  const cards = tools
    .map((tool) => `<article class="library-card">
                    <div class="library-card__badge">${esc(tool.badge || 'Tool')}</div>
                    <h3><a href="/tools/${esc(tool.slug)}">${esc(tool.title)}</a></h3>
                    <p>${esc(tool.description)}</p>
                    <a class="library-card__cta" href="/tools/${esc(tool.slug)}">Open tool</a>
                </article>`)
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

    <script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Free Tools (Execution-First)',
      description: 'Free tools and calculators for implementing tax and wealth strategies with clean documentation.',
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
      .hero {
        padding: 8rem 0 3.5rem;
        background: linear-gradient(135deg, #f8fafc 0%, #e5e7eb 100%);
      }
      .hero-title {
        font-size: 2.2rem;
        font-weight: 800;
        color: #111827;
        line-height: 1.1;
        margin-bottom: 0.9rem;
      }
      @media (min-width: 768px) { .hero-title { font-size: 2.8rem; } }
      .hero-subtitle {
        max-width: 52rem;
        color: #4b5563;
        font-size: 1.1rem;
        line-height: 1.7;
      }
      .section { padding: 3.25rem 0; }
      .grid {
        display: grid;
        gap: 1.2rem;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      }
      .library-card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 0.9rem;
        padding: 1.1rem 1.1rem 1rem;
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
      .library-card__cta:hover { background: #0b1220; }
      .breadcrumb { padding: 1rem 0; font-size: 0.875rem; color: #6b7280; }
      .breadcrumb a { color: #6b7280; text-decoration: none; }
      .breadcrumb a:hover { color: #111827; }
      .breadcrumb span.sep { margin: 0 0.5rem; color: #9ca3af; }
      @media (max-width: 767px) {
        .hero { padding: 6.75rem 0 2.4rem; }
        .hero-title { font-size: 1.75rem; }
        .hero-subtitle { font-size: 1rem; line-height: 1.6; }
        .section { padding: 2.2rem 0; }
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
          <span class="text-gray-900">Tools</span>
      </div>

      <section class="hero">
        <div class="container-custom">
          <h1 class="hero-title">Free Tools (Execution-First)</h1>
          <p class="hero-subtitle">These tools are built for implementation, not vibes. Conservative math, clean documentation, and checklists your advisor can sign off on.</p>
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

