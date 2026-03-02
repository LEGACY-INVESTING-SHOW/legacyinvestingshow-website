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

In Progress:
- Tools: T01 to T03 (this sprint)

Next:
- Tools T04+
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

## Tools (T01 to T03) This Sprint

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

## QA Checklist (Applies to Every Tool Page)

- Mobile-first: calculators usable on 360px wide screens.
- Header/footer/nav identical to the rest of the site, including mobile menu.
- Meta: title, description, canonical, OG/Twitter tags.
- Schema: `SoftwareApplication` + `FAQPage`.
- Sitemap includes `/tools/` and each tool page.
- Links: breadcrumbs correct; related links go to real pages.
- Accessibility: labels associated to inputs; `aria-live` for results.
- Disclaimer present near CTA.
