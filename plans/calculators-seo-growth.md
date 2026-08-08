# Calculators SEO & Traffic Growth Plan

Date: 2026-08-09
Status: Implemented 2026-08-09 (batch 2 complete; deploy pending)

## Goal

Turn the 71 new calculators (deployed 2026-08-08) from a library into an
organic-traffic engine. Primary targets: "[thing] calculator" searches and the
informational questions around them ("how much is renters insurance", "is pet
insurance worth it").

## Current state (measured 2026-08-09)

- Every calculator page is server-rendered static HTML with ~700-750 visible
  words, meta description, canonical, WebApplication + FAQPage + BreadcrumbList
  schema. This is a strong baseline; most "calculator SEO" failures are fixed.
- All 77 tool URLs (hub + 71 calculators + 5 categories) are in
  sitemap-pages.xml and robots allows them.
- The insurance category (11 tools) is completely new territory: the blog has
  no insurance articles, and no tax/real-estate post links to an insurance
  tool. Good news: no cannibalization. Bad news: zero topical authority yet.
- Tax, housing, and money tools sit next to 670+ existing posts, so those
  clusters can rank faster.

## The core idea

One companion article per high-value calculator, written for the question the
calculator answers. Article links to the calculator; the calculator already
links to its category and related calculators. This creates the classic
cluster: article ranks for "how much is X", calculator ranks for "X
calculator", they reinforce each other.

Not every tool needs an article. Selection criteria:

1. Real search demand for the tool's question ("how much does X cost",
   "is X worth it", "X vs Y").
2. Fits the LIS audience: tax, real estate, Airbnb arbitrage, high-income
   money decisions.
3. Existing authority adjacency (tax/housing/real estate first, insurance
   second).

## Priority layers

### Layer 1 - Companion articles (highest ROI)

IMPLEMENTED: 42 articles published in content/blog/ (13 in batch 1, 29 in
batch 2 covering money, banking, taxes, housing, and insurance), each
950-1,250 words with sourced figures, statistics cards, FAQ accordion +
schema, calculator CTA, and 4-11 internal links. Distinct structure per
article (no shared skeleton). Plus 1 comparison page
(compare/mortgage-payoff-vs-investing) via data/edge-comparison-pages.json.
Six "-vs-" slugs force-indexed in data/indexation-policy.json.

Write 6-10 posts to start, in markdown under `content/blog/`, using the normal
build pipeline. Each post: 900-1,400 words, real numbers with sources, a
clearly marked calculator CTA, and 2-3 internal links (category hub, one
related article, one tax/real-estate page).

Pilot: the insurance cluster (greenfield, no own-site competition).

| Article | Target keyword | Calculator it feeds |
| --- | --- | --- |
| How much is renters insurance in 2026? | renters insurance cost | /tools/renters-insurance-cost |
| How much does auto insurance cost per year? | auto insurance cost | /tools/auto-insurance-annual-cost |
| Is pet insurance worth it? Cost comparison | is pet insurance worth it | /tools/pet-insurance-comparison |
| How to estimate your home contents value for insurance | home contents value | /tools/home-contents-replacement-value |
| How to compare health insurance plans | compare health insurance plans | /tools/health-insurance-plan-comparison |
| Income protection vs disability insurance | income protection insurance | /tools/income-protection-gap |

Honest difficulty note: insurance SERPs are dominated by Insurance.com,
Policygenius, NerdWallet, Forbes Advisor. Expect 3-6 months for new terms, and
win the long-tail question formats first. The calculator pages themselves can
rank for "[x] calculator" queries sooner because tool SERPs mix tools and
articles.

Second batch (faster wins, existing authority): taxes and housing.

| Article | Calculator it feeds |
| --- | --- |
| Take-home pay: what your salary actually pays you | /tools/gross-to-net-pay-estimate |
| How to fix your W-2 withholding mid-year | /tools/payroll-withholding-estimate |
| Capital gains tax: what you owe when you sell | /tools/capital-gains-tax-estimate |
| Mortgage payment: principal, interest, tax, insurance | /tools/mortgage-payment |
| Should you pay off your mortgage early? | /tools/mortgage-extra-payment |
| Emergency fund: how many months is enough | /tools/emergency-fund-target |
| Retirement runway: how long will your savings last | /tools/retirement-income-runway |

### Layer 2 - Tool page enrichment

IMPLEMENTED: "Read the full guide" cards on all 42 mapped calculator pages,
3-4 new long-tail FAQs per tool across 18 guides, a Sources block under
Assumptions on the featured tools, and GTM dataLayer events (tool_view,
tool_calculate, tool_click).

- Expand each tool's FAQ toward question-phrased long-tails (already present,
  add 3-5 more per tool). These feed FAQPage schema and AI answer engines.
- Add a "Sources / data notes" line where the tool uses an assumption (some
  tools already show assumptions under the result; make the rate sources
  explicit in the guide content).
- Link each tool page to its companion article when one exists (small change
  in the calcs2 catalog/guide data, then re-import).

### Layer 3 - Category hub pages

IMPLEMENTED: editorial intro + "Start with <tool>" on all 5 category pages.

The five `/tools/categories/*` pages are bare catalogs. Add one editorial
paragraph per category (what the tools cover, who they are for) and a "Start
with" suggestion. Cheap, useful, helps the hub rank for category terms like
"insurance calculators".

### Layer 4 - Internal linking from existing content

IMPLEMENTED: 19 contextual tool links added to 14 existing high-value posts
(Airbnb, tax, retirement, wealth, mortgage, debt). Redirect map already
current.

- Add contextual tool links inside the 10-20 highest-traffic existing posts
  (Airbnb guides -> airbnb-arbitrage-roi, tax posts -> capital-gains /
  withholding tools, retirement posts -> retirement-income-runway).
- Link tools from programmatic city pages where relevant (STR tools).
- The build's link normalizer already rewrites old tool URLs; keep that map
  current.

### Layer 5 - GEO / answer engines and measurement

PARTIALLY IMPLEMENTED: llms.txt and llms-full.txt updated with category
pages, top calculators, companion guides, and the state hub. GA4/GTM events
wired into the calculator app. Remaining (needs account access): Search
Console monitoring setup and rich-results verification.

- Keep llms.txt current (it lists the hub now; add the category pages and the
  top 10 calculators).
- Verify FAQ rich results in Search Console after launch.
- Wire GA4/GTM events on calculator interactions (the old tools fired
  dataLayer events; the new app does not yet). Track: tool page views, tool
  completed, category clicks.
- Set up Search Console monitoring for /tools/* (impressions, position,
  queries) and review monthly.

### Layer 6 - Later: data-driven programmatic pages

IMPLEMENTED: 52 pages (hub + 50 states + DC) under
programmatic-pages/insurance/ from data/renters-insurance-by-state.json
(NAIC 2021 HO-4 averages via Triple-I), generated by
scripts/fix-programmatic-seo.js, in the sitemap, linked from the renters
article and insurance category.

Once insurance authority exists, add pages like "Average renters insurance
cost by state" using public rate data, through the existing programmatic page
system. Do not do this before the article layer; thin templated pages without
authority or data will not rank.

## Explicitly NOT doing

- Thin pages (calculator + 200 words) - the tool pages are already near the
  useful minimum; volume alone will not rank.
- Keyword stuffing or invented statistics. Every number in companion articles
  must have a verifiable source.
- Doorway pages or duplicate calculators under different URLs.

## Measurement (first 90 days)

- Search Console: impressions and average position for /tools/*, grouped by
  category.
- GA4: sessions from organic on /tools/*, tool completion rate, navigation to
  the main site (the "Show" CTA).
- Ranking check on 10 pilot keywords at day 30 / 60 / 90.

## First step proposed

Pilot the insurance cluster: 4-6 companion articles + FAQ expansion on the
insurance tools + one category-hub intro. Then measure for 60 days before
scaling to the tax/housing batch.
