# BlogEO baseline

Week: **2026-W35**  
GSC export: **Last 3 months**  
Chart range: **2026-05-23 → 2026-08-22**  
Catalog: **947** URLs, **608** indexable, **339** noindex  
Keyword ownership keys: **187**

## What this snapshot can and cannot say

- This is a **Search Console UI export**, not the API. Pages and queries are truncated to what GSC put in the CSV.
- The date filter is **Last 3 months**, not two consecutive 28-day windows. The **recover** lever is zero until a second comparable snapshot exists.
- `expectedCtr(position)` is a ranking heuristic. GSC positions are query-blended, so CTR headroom is a **soft** number.

## Sitewide

| Metric | Value |
|---|---:|
| Clicks | 875 |
| Impressions | 25,237 |
| CTR | 3.5% |
| Avg position (impression-weighted daily) | 23.8 |
| Branded query clicks (approx.) | 596 |

## Power law

Clicks on this property are extremely concentrated. Homepage plus one review URL already dominate the exported page table.

| Cut | Share of clicks |
|---|---:|
| Top 1 URL | 79.2% |
| Top 5 URLs | 99.5% |
| Top 14 URLs | 99.9% |
| URLs with any clicks in the export | 8 |

### Top URLs by clicks

| URL | Clicks | Impr | Pos | CTR | Share |
|---|---:|---:|---:|---:|---:|
| `/` | 693 | 11241 | 9.19 | 6.2% | 79.2% |
| `/blog/preston-seo-review` | 171 | 8599 | 16.32 | 2.0% | 19.5% |
| `/blog/legacy-investing-show-review` | 5 | 345 | 14.31 | 1.4% | 0.6% |
| `/about` | 1 | 1011 | 7.25 | 0.1% | 0.1% |
| `/tax-strategies` | 1 | 1011 | 7.25 | 0.1% | 0.1% |
| `/blog/money-moves-cpa-never-mentioned-high-earners` | 1 | 68 | 12.49 | 1.5% | 0.1% |
| `/blog/tax-planning-for-high-earners` | 1 | 35 | 16.06 | 2.9% | 0.1% |
| `/tools/home-purchase-cash-to-close` | 1 | 5 | 54.4 | 20.0% | 0.1% |

## Opportunity queue (first look)

Sitelink-suspect rows (identical impression/position signatures across hub URLs) are scored but should not get title tickets.

| URL | Lever | Score | Clicks | Impr | Pos | CTR | Expected | Notes |
|---|---|---:|---:|---:|---:|---:|---:|---|
| `/blog/preston-seo-review` | rank | 173.0 | 171 | 8599 | 16.32 | 2.0% | 1.0% | — |
| `/blog/how-much-is-renters-insurance-cost-guide` | rank | 43.1 | 0 | 1077 | 79.15 | 0.0% | 1.0% | — |
| `/tools` | ctr | 25.5 | 0 | 1018 | 7.24 | 0.0% | 2.5% | — |
| `/compare` | ctr | 25.3 | 0 | 1012 | 7.24 | 0.0% | 2.5% | — |
| `/about` | ctr | 24.3 | 1 | 1011 | 7.25 | 0.1% | 2.5% | — |
| `/tax-strategies` | ctr | 24.3 | 1 | 1011 | 7.25 | 0.1% | 2.5% | — |
| `/blog/best-tax-planning-software-for-cpas` | rank | 20.0 | 0 | 501 | 44.69 | 0.0% | 1.0% | noindex |
| `/blog` | ctr | 16.2 | 0 | 646 | 7.13 | 0.0% | 2.5% | — |
| `/worksheets` | ctr | 16.1 | 0 | 644 | 7.13 | 0.0% | 2.5% | — |
| `/blog/best-tax-planning-software-for-financial-advisors` | rank | 14.2 | 0 | 354 | 57.47 | 0.0% | 1.0% | noindex |
| `/blog/401k-rollover-guide` | rank | 12.2 | 0 | 304 | 61.43 | 0.0% | 1.0% | — |
| `/blog/2026-mileage-reimbursement-rates` | rank | 9.7 | 0 | 242 | 74.87 | 0.0% | 1.0% | — |
| `/blog/best-tax-planning-software-for-retirees` | rank | 9.3 | 0 | 233 | 49.69 | 0.0% | 1.0% | noindex |
| `/blog/legacy-investing-show-review` | rank | 8.8 | 5 | 345 | 14.31 | 1.4% | 1.0% | — |
| `/blog/how-to-pay-off-a-loan-early` | rank | 8.3 | 0 | 208 | 68.16 | 0.0% | 1.0% | — |
| `/blog/best-side-hustles-no-money-full-time-job` | rank | 6.3 | 0 | 157 | 21.68 | 0.0% | 1.0% | — |
| `/` | none | 0.0 | 693 | 11241 | 9.19 | 6.2% | 2.5% | — |
| `/blog/best-airbnb-automation-tools-for-small-operators` | none | 0.0 | 0 | 146 | 28.77 | 0.0% | 1.0% | low-visibility |
| `/topics/airbnb-arbitrage` | none | 0.0 | 0 | 135 | 28.42 | 0.0% | 1.0% | low-visibility |
| `/blog/how-to-calculate-home-equity` | none | 0.0 | 0 | 107 | 80.47 | 0.0% | 1.0% | low-visibility |

## Near-miss generator input

Near-miss candidates: **1**. Cap remains 1 post/week.

Watchlist (30–149 impressions, pos 5–20): `legacy investing` (86 impr, pos 14.83); `augusta rule calculator` (37 impr, pos 16.95).

## Hygiene counts

| Flag | Count |
|---|---:|
| deadInternalLink | 342 |
| descriptionLength | 47 |
| dualCanonicalRisk | 8 |
| emptyFaq | 10 |
| missingImage | 551 |
| noQuickTake | 49 |
| noindexButTraffic | 1 |
| staleTaxYear | 1 |
| taxYearStale | 18 |
| thinProgrammatic | 73 |

## AEO citations

Citation CSV rows: **0**. Cited URLs: **0**. Google winners and cited URLs will diverge; that is expected.
No citation CSV loaded yet. Phase 4 stays CSV-manual until a vendor export exists.

## What to do next

1. Keep dropping GSC CSVs into `data/blogeo/gsc-imports/<date>/` until API credentials exist. Prefer **Last 28 days** plus the previous 28 days as two folders.
2. Review `analysis/blogeo-audit-latest.md` tickets. Apply only through `node scripts/blogeo/cli.js apply --ticket <id>`.
3. Do not un-noindex persona farms. Do not resume `seo-topics-1000.json`.
4. The homepage masterclass CTA and dual GTM/gtag audit are **not** this engine. Separate PRs.
