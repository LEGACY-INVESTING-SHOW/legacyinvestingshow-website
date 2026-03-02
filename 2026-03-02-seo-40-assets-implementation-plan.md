# SEO: 40 Assets Implementation Plan (2026-03-02)

This plan tracks the 40 SEO assets (comparison pages, tools, worksheets) and how we implement them inside the existing Legacy Investing Show site structure.

Non-negotiables:
- All pages must reuse the current site shell (header/nav/footer, mobile menu behavior, typography).
- Pages are generated via scripts (no hand-editing generated HTML).
- Content must be dense and execution-first: qualification gates, worked examples, documentation standards, and failure modes.
- Every asset includes an educational disclaimer.

## Status Snapshot

Completed:
- C01 to C10 comparison pages (live under `/compare/*`)
- Tools T01 to T10 (live under `/tools/*`)

In Progress:
- Tools T11+

Next:
- Worksheets W01+
- Remaining comparisons C11+

## Comparisons (C01 to C10) Completed

Index:
- https://www.legacyinvestingshow.com/compare/

Pages:
- https://www.legacyinvestingshow.com/compare/augusta-rule-vs-home-office-deduction-s-corp
- https://www.legacyinvestingshow.com/compare/mfj-vs-mfs-high-income-student-loans
- https://www.legacyinvestingshow.com/compare/safe-harbor-vs-annualized-income-1099
- https://www.legacyinvestingshow.com/compare/cost-segregation-vs-str-loophole-w2-passive-loss
- https://www.legacyinvestingshow.com/compare/721-upreit-vs-dst-aging-landlords
- https://www.legacyinvestingshow.com/compare/pricelabs-vs-pms-native-pricing-multi-property
- https://www.legacyinvestingshow.com/compare/solo-401k-loan-vs-heloc-down-payment
- https://www.legacyinvestingshow.com/compare/mark-to-market-vs-capital-gains-active-traders
- https://www.legacyinvestingshow.com/compare/qcd-first-vs-roth-conversion-first-irmaa
- https://www.legacyinvestingshow.com/compare/installment-sale-vs-deferred-sales-trust-small-business-exit

Implementation notes:
- Data-driven generator: `data/edge-comparison-pages.json`
- Build script: `scripts/build-compare-pages.js` outputs `compare/index.html` and `compare/<slug>.html`
- Sitemap includes `/compare/*`

## Tools (T01+) Implementation Notes

High-level approach:
- Add `data/tools.json` with tool metadata + copy + FAQs.
- Add generator `scripts/build-tools.js` which outputs:
  - `tools/index.html`
  - `tools/<slug>.html` for each tool.
- Add `build:tools` to the build pipeline and include `tools` in `scripts/generate-sitemap.js`.
- Each tool page includes:
  - interactive calculator UI (vanilla JS)
  - worked examples + execution notes
  - documentation checklist
  - FAQ (on-page + FAQ schema)
  - JSON-LD `SoftwareApplication`

### T01: Estimated Tax Safe Harbor Planner

Primary intent:
- Catch-up planning for W-2 + 1099 filers who need a penalty-avoidance baseline, then a simple payment cadence.

Inputs:
- Filing status (MFJ, Single, HOH, MFS)
- Prior-year AGI (approx)
- Prior-year total tax
- Estimated withholding for the year
- Estimated payments already made
- Number of payments remaining (1-4)
- Optional conservatism buffer (0%, +5%, +10%)

Outputs:
- Estimated safe-harbor annual target (100% or 110% baseline, with manual override)
- Covered amount (withholding + payments)
- Remaining amount and per-payment plan
- Catch-up warnings and execution notes

Copy requirements:
- Explain why safe harbor is a floor, not a projection.
- Show common execution failures and how to avoid them.

### T02: Home Office Reimbursement Calculator (Accountable Plan)

Primary intent:
- Build a boring, repeatable reimbursement workflow with clean documentation (especially S corp owners).

Inputs:
- Total home square feet
- Dedicated office square feet
- Annual expense categories (rent/mortgage proxy, utilities, internet, insurance, repairs, HOA)
- Reimbursement cadence (monthly, quarterly, annual)
- Optional conservatism rounding (0%, -5%, -10%)

Outputs:
- Business-use percentage
- Annual reimbursement estimate (allocated)
- Per-payment reimbursement amount
- Allocation table by expense category
- Warnings for unrealistic allocations

Copy requirements:
- Qualification gate before math.
- Monthly workflow + advisor packet list.

### T03: Augusta Rule Rent Calculator + Meeting Log

Primary intent:
- Execution-first log builder plus a simple rent estimate with the 14-day guardrail front and center.

Inputs:
- Meeting rows (date, purpose, attendees)
- Daily rate
- Optional days override

Outputs:
- Count of unique dates (or override)
- Total rent estimate
- Warning if over 14 days
- Downloadable CSV of the meeting log

Copy requirements:
- Rate defensibility: comps and evidence.
- Audit-folder checklist: log, minutes, approvals, payment record.

### T04: Annualized Income Estimated Tax Calculator

Primary intent:
- 1099 / lumpy-income filers who want payment timing to match reality, without inventing numbers in Q4.

Inputs:
- Months of income so far
- Year-to-date net income
- Planning effective tax rate (user-supplied)
- Withholding + payments already made (YTD)
- Remaining payments (1-4) and optional buffer

Outputs:
- Annualized income projection
- Projected tax (planning)
- Estimated catch-up needed by this point in the year
- Simple catch-up plan over remaining payments

### T05: REP Status + STR Hours Tracker (Log + CSV)

Primary intent:
- Execution-first hours logging with categories, totals, and a CSV export that fits into an audit folder.

Inputs:
- Other job hours (estimate) for a pressure test
- Target hours (planning)
- Log rows: date, category, property (optional), hours, short note

Outputs:
- Total logged hours and number of dates
- Category breakdown + concentration signal
- Pressure-test prompt vs target and other-job hours
- CSV export for advisor packet

### T06: Cost Segregation Payback Calculator (Sensitivity)

Primary intent:
- First-year acceleration signal plus a sensitivity view so small assumption changes do not fool you.

Inputs:
- Purchase price, land %, reclass %, bonus %, marginal tax rate, fee

Outputs:
- Estimated depreciable basis
- Estimated first-year accelerated deduction and tax savings
- Net first-year benefit after fee and fee-multiple
- Sensitivity table (conservative/base/aggressive)

### T07: IRMAA Headroom + Roth Conversion Room Planner

Primary intent:
- Retirees who need an execution ceiling for conversions using an IRMAA guardrail that changes by year and filing status.

Inputs:
- Baseline projected MAGI (before conversions)
- IRMAA threshold guardrail (user-entered)
- Buffer (optional)
- Planned conversion cadence / remaining conversions this year

Outputs:
- Headroom and max conversion that stays inside the guardrail
- Scenario table (0%, 50%, 100% of headroom, plus buffer)

### T08: QCD vs Roth Conversion Planner (RMD + IRMAA)

Primary intent:
- Retirees balancing RMDs, QCD intent, and Roth conversion goals without accidental IRMAA bracket crossings.

Inputs:
- Baseline MAGI (before RMD/QCD/conversions)
- RMD amount
- Planned QCD amount
- IRMAA threshold guardrail (user-entered) + buffer

Outputs:
- Taxable RMD after QCD (planning)
- Conversion room inside the IRMAA guardrail
- Sequencing playbook notes

### T09: Solo 401(k) Loan vs HELOC Calculator

Primary intent:
- Down payment funding decisions that require cash flow and risk visibility (not vibes).

Inputs:
- Amount borrowed / down payment funding need
- HELOC rate and term assumptions
- Solo 401(k) loan rate and term assumptions
- Expected market return (opportunity cost)

Outputs:
- Payment and total-interest comparison
- Estimated opportunity cost (planning)
- Stress test view (higher HELOC rate, lower market return)

### T10: Installment Sale Tax + Cashflow Planner

Primary intent:
- Small business exits where the schedule matters: annual payment, interest, taxable gain, and after-tax cash flow.

Inputs:
- Sale price, basis, down payment
- Term years, note rate
- Capital gains rate, ordinary rate (and state if included)

Outputs:
- Annual schedule with principal, interest, taxable gain portion, estimated tax, and net cash
- Advisor packet checklist for execution

### T11: Backdoor Roth Pro-Rata Calculator (Form 8606)

Primary intent:
- High-income earners using backdoor Roth who need to understand how year-end IRA balances change what is taxable.

Inputs:
- Year-end total Traditional/SEP/SIMPLE IRA balance (12/31)
- Existing nondeductible basis (Form 8606 carryforward)
- Current-year nondeductible contribution (optional)
- Planned Roth conversion amount
- Other IRA distributions (optional)

Outputs:
- Estimated taxable vs nontaxable conversion portion (pro-rata)
- Remaining basis estimate after conversion
- Warnings for common failure modes (large pre-tax IRA balances, missing basis tracking)

### T12: W-2 Withholding Catch-Up Planner (Late-Year Fix)

Primary intent:
- W-2 + side income filers who want a clean catch-up plan, with the option to use withholding to simplify timing.

Inputs:
- Target total to cover (your additional tax or buffer goal)
- Year-to-date withholding
- Year-to-date estimated payments
- Remaining paychecks
- Remaining estimated payments (optional)

Outputs:
- Additional withholding needed and per-paycheck increase
- Equivalent per-quarter estimated payment option
- Execution reminders (update W-4, save the plan, re-run monthly)

### T13: Capital Gains Headroom Calculator (User-Entered Guardrails)

Primary intent:
- Taxable-brokerage investors who want to harvest gains intentionally without accidentally spilling into a higher cap gains tier.

Inputs:
- Baseline taxable income (before LTCG)
- Cap gains threshold guardrail (user-entered)
- Buffer (optional)
- Planned long-term capital gains
- Optional tax rates for estimate (lower and higher)

Outputs:
- Headroom amount at the lower tier
- Split of planned gains: inside vs above guardrail
- Optional estimated tax at each tier

## QA Checklist (Applies to Every Tool Page)

- Mobile-first: calculators usable on 360px wide screens.
- Header/footer/nav identical to the rest of the site, including mobile menu.
- Meta: title, description, canonical, OG/Twitter tags.
- Schema: `SoftwareApplication` + `FAQPage`.
- Sitemap includes `/tools/` and each tool page.
- Links: breadcrumbs correct; related links go to real pages.
- Accessibility: labels associated to inputs; `aria-live` for results.
- Disclaimer present near CTA.
