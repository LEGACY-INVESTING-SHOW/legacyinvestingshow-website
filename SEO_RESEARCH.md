# SEO research: education comparison guides

Last updated: 2026-09-16.

This file is the working brief for Legacy Investing Show comparison, alternatives, best-for, and checklist pages that are **not** tax A-vs-B scorecards. Tax scorecards stay in `data/edge-comparison-pages.json`. Education and program-choice pages live in `data/education-guides/`.

Do not invent search volume, prices, ratings, or student results. Re-open seller pages before changing a number.

## What already exists (do not thin-duplicate)

### Tax compare scorecards (`/compare`, indexed)

Built from `data/edge-comparison-pages.json`. Jobs: two tax or money strategies, a score, a worked example, failure modes.

Includes `/compare/mortgage-payoff-vs-investing`. A new "debt payoff vs investing for high earners" page would cannibalize this unless it is a clearly different job (for example Ramsey Baby Steps vs Money Guy FOO, which is a **method** comparison, not a mortgage math comparison).

### Blog posts that already cover vendor roundups (Sep 2026)

These stay on `/blog`. Many `-vs-` blogs are noindexed by `data/indexation-policy.json`. The posts below are forced index or otherwise live commercial pages. Do not clone them under `/compare`.

| Live URL | Job | Keep /compare away from |
| --- | --- | --- |
| `/blog/tax-alchemy-alternatives` | Tax Alchemy and seven tax programs | Another Tax Alchemy list |
| `/blog/taxfreeceo-alternatives` | TaxFreeCEO and priced alternatives, including Anderson Platinum | Another TaxFreeCEO list |
| `/blog/karlton-dennis-vs-mark-kohler-vs-legacy-wealth-blueprint` | Karlton vs Kohler vs LWB | A third founder bake-off |
| `/blog/best-tax-strategy-programs-w2-earners-over-250k` | Tax programs for high W-2 | A second tax-vendor table |
| `/blog/best-real-estate-investing-courses-full-time-job` | RE courses while employed | A generic "best RE course" clone |
| `/blog/bnb-formula-vs-10xbnb-vs-airbnb-ascension` | Airbnb training vendors | Another Airbnb course stack |
| `/blog/sean-rakidzich-vs-preston-seo-airbnb-training` | Two Airbnb trainers | Another Preston-vs-trainer page |
| `/reviews` | Proof for LIS programs; founder review blogs 301 here (PR #12) | A new Preston Seo review |

Unlisted course libraries `/lx/wbp-26` and `/lx/str-rd` stay out of nav, sitemap, and these guides.

### Pricing risk on this site

Do **not** print Legacy Wealth Blueprint tuition, Splitit, Course plus AI, or any LIS sticker on `/compare` education pages. Confirm fees on a strategy call. Competitor public prices may stay, dated.

Internal research (do not ship on compare pages): `/reviews` FAQ and `llms.txt` still list LWB $9,800 cash or card ($10,800 Splitit); LWB Course + AI $1,500; Airbnb Ascension $9,800; Airbnb Ascension Scale $18,000; STR Concierge $16,000; STR Concierge Portfolio $30,000; bundles $17,000 to $34,000. Free entry: https://join.managemoney101.com/tax-strategies.

Older success-story copy still quotes "$2,497" as a student line about community value. That is not a list price. Do not ship $2,497 as what Blueprint costs.

Portfolio claims: prefer the current homepage/about $15M+ figure. That is bio, not a price. Do not invent $15M vs $20M.

## Inventory of this ship (2026-09-15)

Sixteen `/compare` education pages. Source JSON in `data/education-guides/`. Hub: `/compare` (two groups). First twelve shipped as the education-compare set. Four more shipped the same day from the unused research-priority list.

| Slug | Type | Query | Job | Proof used |
| --- | --- | --- | --- | --- |
| `biggerpockets-alternatives` | alternatives | BiggerPockets alternatives | BiggerPockets vs our wealth plan | BP staff post 2026-03-03; membership table; KenPro store; about $15M+; FTC coaching |
| `subto-alternatives` | alternatives | SubTo alternatives | SubTo vs our wealth plan | buy.subto.com $9,800 / 4x $2,450; subto.com disclaimer; Preston bio; FTC |
| `dave-ramsey-alternatives` | alternatives | Dave Ramsey alternatives | Ramsey vs our wealth plan after Baby Steps | FPU class page $99.99; FOO guide 2026-07-29; about page |
| `rich-dad-alternatives` | alternatives | Rich Dad alternatives | Rich Dad vs our wealth plan | BP essay on Rich Dad; public $17 / $27 digital offers; Preston bio |
| `biggerpockets-vs-rich-dad` | vs | BiggerPockets vs a wealth plan | Those brands vs Blueprint, not a fan war | Same BP and Rich Dad public pages; about $15M+ |
| `biggerpockets-what-to-know` | review | BiggerPockets review | Briefing vs our plan, not a star review | Free vs Pro; dated prices; no Review schema |
| `best-wealth-education-high-earners` | best-for | best wealth education for high-income professionals | Path by leak, then Blueprint | IRS IR-2025-111; Rev. Proc. 2025-19; Preston bio |
| `real-estate-coaching-vs-course` | decision | real estate coaching vs self-paced course | Format guide + Blueprint as coaching plus curriculum | FTC coaching pages; KenPro; SubTo checkout |
| `tax-course-vs-cpa` | vs | tax course vs CPA | Class vs filer vs our written plan (still keep a CPA) | WealthAbility Live $197; Formula price not printed |
| `short-term-rental-vs-long-term-rental` | vs | short-term rental vs long-term rental | Ops + IRS 7-day test, then Blueprint closer | Publication 925; calculators on this site |
| `401k-vs-rental-property` | vs | 401k vs rental property | Match first; then Blueprint for leftover order | IRS 2026 401(k) limits |
| `wealth-plan-checklist-high-earners` | checklist | wealth plan checklist for high earners | Export facts before a Blueprint call | Same IRS figures; site calculators |
| `money-guy-foo-vs-ramsey-baby-steps` | vs | Dave Ramsey vs a wealth plan | Dollar-order maps vs Blueprint | FOO guide 2026-07-29; FPU $99.99 |
| `wealthability-alternatives` | alternatives | WealthAbility alternatives | WealthAbility vs our wealth plan | Live $197; Formula checkout not printed 2026-09-15 |
| `legacy-wealth-blueprint-what-to-know` | review | what is Legacy Wealth Blueprint | Inclusions, Preston journey, buyer scorecard. No tuition. | Blueprint page; about $15M+; `/reviews`; old `/compare/legacy-wealth-blueprint-cost` 301s here |
| `anderson-platinum-vs-tax-course` | vs | Anderson Platinum vs Legacy Wealth Blueprint | Attorney membership vs our wealth plan | andersonadvisors.com/platinum-membership $3,495+$75; FAQ: tax packages not included |

SaaS patterns we skipped: MCP, "export your data," "software for [role]." Those do not map to a coaching/media business.

Skipped on purpose this pass: a second "debt payoff vs investing" URL (use FOO or Ramsey vs our wealth plan for method, `/compare/mortgage-payoff-vs-investing` for mortgage math); a dedicated W-2 tax checklist (buyer scorecard lives on the Blueprint what-to-know page); a SubTo review URL (would cannibalize `subto-alternatives`); another Preston Seo review; competitor-vs-competitor pages (KenPro vs BiggerPockets Pro, FOO vs Ramsey as a trophy).

## Competitor table (public pages we opened)

Facts dated 2026-09-15 unless noted. Re-check before editing a price.

| Brand | What it is | Public price we could copy | Source | Notes |
| --- | --- | --- | --- | --- |
| BiggerPockets | RE media, forums, Pro tools | Free forums/podcasts. Pro $39/mo or $32.50/mo billed yearly ($390/yr) | [Staff post 2026-03-03](https://www.biggerpockets.com/forums/48/topics/1280018-new-to-biggerpockets-pro-insurance-and-loan-discounts); [membership table](https://blogdev.biggerpockets.com/membership-types) | Bootcamps URL showed free resources, not a live class checkout |
| SubTo (Pace Morby) | Creative finance community | Accelerator $9,800 or 4 x $2,450 | [buy.subto.com](https://buy.subto.com/) | Homepage has no price. Disclaimer: results not typical |
| KenPro (Ken McElroy) | Rental/apartment membership | $39.99/mo or $399/yr | [kenmcelroy.com/kenprostore](https://kenmcelroy.com/kenprostore/) | Older pages still show $29.99 |
| BetterLife (Brandon Turner) | Coaching / Tribe | Not on the pages we opened | [abetterlife.com](https://abetterlife.com/home-2/) | Tribe is for people who already did a deal |
| Ramsey Solutions / FPU | Debt class + Baby Steps | Class finder "$99.99 to start FPU" | [FPU class page](https://www.ramseysolutions.com/money/financial-peace/class) | Main FPU page also uses $100 / $80 in ads |
| Money Guy Show | FOO (Financial Order of Operations) | Guide is free. Course listed at $49 on the guide and on learn.moneyguy.com (sale copy from $249). Product page did not reprint the number. | [FOO guide](https://moneyguy.com/guide/foo/) last updated 2026-07-29; [learn course page](https://learn.moneyguy.com/financial-order-of-operations-course) | Vs-Ramsey page shipped. Confirm $49 at checkout. |
| WealthAbility (Tom Wheelwright) | Tax class / Tax-Free Wealth adjacent | Live $197/mo. Tax-Free Formula checkout **not printed** on the sales page we opened 2026-09-15. | [Live](https://www.wealthability.com/wealthability-live/); [Formula](https://www.wealthability.com/new-tax-free-formula/) | Do not reuse an old $497 screenshot. Mentorship pages hid price. |
| Anderson Advisors Platinum | Legal/tax/asset protection membership | $3,495 enrollment + $75/mo. FAQ: tax packages not included. | [andersonadvisors.com/platinum-membership](https://andersonadvisors.com/platinum-membership/) | Vs education-only page shipped. Do not clone Sep 14 vendor tables. |
| Legacy Wealth Blueprint | Our 12-month wealth plan | Not published on `/compare`. Confirm on a strategy call. | Canonical briefing: `/compare/legacy-wealth-blueprint-what-to-know`. Old `/compare/legacy-wealth-blueprint-cost` 301s there. | Always disclose we sell it. Talk inclusions, Preston journey, $15M+ portfolio from about/homepage. Do not print Splitit, Course plus AI, or any LIS sticker on compare pages. |
| IRS | Rules, not a competitor | 2026 401(k) deferral $24,500; 50+ $8,000; 60-63 $11,250; HSA $4,400 / $8,750 | [IR-2025-111](https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500); [Rev. Proc. 2025-19](https://www.irs.gov/irb/2025-21_IRB) | Cite, do not paraphrase into advice |
| FTC | Coaching scam patterns | n/a | [Coaching scam article](https://consumer.ftc.gov/articles/when-business-offer-or-coaching-program-scam) | Use as warning signs, not as a verdict on a named living brand |

## Editorial policy (YMYL)

1. LIS-authored pages say who wrote them and that we sell programs.
2. Criteria sit near the top. Inclusion needs a live page plus a price or an explicit "not published."
3. No stars, no Review schema, no aggregateRating, no fake testimonials.
4. Define finance terms on first use (subject to, fiduciary, material participation, HSA).
5. Grade 4-5 English. Short sentences. No em dashes. No fake urgency.
6. Competitor facts get an as-of date. If the live page changed, update the JSON and rebuild.
7. Internal CTAs: `/legacy-wealth-blueprint`, `/reviews`, `/tax-strategies/for/*`, `/tools/*`, https://join.managemoney101.com/tax-strategies. Never `/lx/`.
8. Blog `-vs-` URLs stay noindex. New education comparisons ship under `/compare` so they can be indexed.
9. One job per URL. If a Sep 14 blog already owns the query, link it instead of cloning it.
10. Compare the other brand with us. Do not crown two competitors against each other.
11. Do not print LIS tuition on compare pages. Competitor public prices may stay, dated.
12. Talk about the Blueprint offering and Preston's journey (corporate job, house-hacked duplex, $15M+ portfolio) more than a sticker.

## Measurement (no invented baselines)

Track after launch. Do not write a starting rank or traffic number you did not export.

- Search Console: queries that match the table above, landing on `/compare/{slug}`.
- Unique titles and meta descriptions (this repo's tests fail duplicates).
- CTR and average position once GSC has impressions. Empty until then.
- Assist metric: clicks from education pages to `/tax-strategies/for/*`, `/tools/*`, `/legacy-wealth-blueprint`, `/reviews`.
- Quality: bounce is a weak metric here. Prefer scroll to sources + outbound seller clicks.
- Recrawl prices every 90 days or when a seller emails a change.

## Next 20 pages

Skip any row if a live URL already owns that query. Struck rows below already shipped under `/compare`.

| # | Slug | Query | Intent | Angle | Proof to gather | Internal links | Cannibalization risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | ~~`money-guy-foo-vs-ramsey-baby-steps`~~ | shipped | vs | Dollar order after consumer debt | FOO $49; FPU $99.99; Baby Steps page | `/compare/dave-ramsey-alternatives`, `/compare/mortgage-payoff-vs-investing` | Shipped. Do not add a third debt-vs-invest URL. |
| 2 | ~~`wealthability-alternatives`~~ | shipped | alternatives | Tax class vs CPA vs LWB | Live $197; Formula not printed | `/compare/tax-course-vs-cpa` | Shipped |
| 3 | ~~`anderson-platinum-vs-tax-course`~~ | shipped | vs | Attorney membership vs education-only | Platinum $3,495+$75 | `/blog/taxfreeceo-alternatives` | Shipped. Do not clone vendor tables. |
| 4 | `w2-tax-checklist` | tax checklist for W-2 high earners | checklist | Accounts before a coach | IRS 401(k)/HSA; `/tools` | `/compare/wealth-plan-checklist-high-earners`, persona W-2 | Medium: buyer scorecard already on Blueprint what-to-know. Only ship if the job is tax-only. |
| 5 | ~~`legacy-wealth-blueprint-what-to-know`~~ | shipped (was `legacy-wealth-blueprint-cost`) | commercial | Inclusions + Preston journey. No tuition. | Blueprint page; about | `/reviews` | Shipped. Do not add a Preston star review. |
| 6 | `betterlife-what-to-know` | BetterLife review / Brandon Turner coaching | review | Briefing when price is hidden | Tribe page; FTC | `/compare/real-estate-coaching-vs-course` | Low if we still cannot find a price |
| 7 | `kenpro-vs-biggerpockets-pro` | KenPro vs BiggerPockets Pro | vs | Skip: two competitors vs each other | Both public prices | BP what-to-know | Do not ship this axis |
| 8 | `house-hacking-vs-short-term-rental` | house hacking vs Airbnb | vs | Live-in vs guest stays | Pub 925; local rules, no occupancy claims | STR vs LTR | Medium with STR vs LTR |
| 9 | `backdoor-roth-vs-mega-backdoor` | backdoor Roth vs mega backdoor | vs | Plan features, not slogans | IRS IRA limits; plan SPD language | existing tax compare + strategy pages | High: tax library already covers both |
| 10 | `fee-only-planner-vs-coaching` | fee-only advisor vs wealth coach | vs | Fiduciary vs education | CFP Board / NAPFA definitions; FTC | tax-course-vs-cpa | Low |
| 11 | `ramsey-baby-steps-vs-investing-with-debt` | should I invest while in debt | decision | Interest rate vs behavior | FPU; FOO page already shipped | `/compare/money-guy-foo-vs-ramsey-baby-steps` | High with the FOO vs Ramsey page |
| 12 | `subto-what-to-know` | SubTo review | review | Checklist before $9,800 | buy.subto.com; disclaimer; FTC | `/compare/subto-alternatives` | Medium with alternatives page; only if SERP wants a review URL |
| 13 | `creative-finance-vs-conventional-loan` | subject to vs new mortgage | vs | Due-on-sale in plain words | CFPB/FTC if any; attorney caveat | SubTo alts | Low |
| 14 | `solo-401k-vs-mega-backdoor-roth` | solo 401k vs mega backdoor | vs | Side business vs W-2 plan | IRS; existing strategy pages | tax compare set | High |
| 15 | `cost-segregation-what-to-know` | cost segregation review / worth it | review | Study cost vs first-year deduction, no invented savings ranges beyond cited IRS mechanics | `/tax-strategies/cost-segregation` | tax hub | Medium with the pillar page |
| 16 | `airbnb-arbitrage-vs-buying` | Airbnb arbitrage vs buying a rental | vs | Lease rights vs basis | Our tools; no fake ROI | `/topics/airbnb-arbitrage` | Medium with existing arbitrage blogs |
| 17 | `splitit-vs-cash-for-coaching` | pay in installments vs cash for a course | decision | Skip: would force our tuition onto compare | FTC rush warning | Blueprint what-to-know | Do not ship while compare pages hide LIS fees |
| 18 | `trustpilot-how-we-read-reviews` | how to read coaching reviews | checklist | 4.2 TrustScore context without Review schema on compare pages | `/reviews` | `/reviews` | Low |
| 19 | `tax-strategy-accelerator-alternatives` | Tax Strategy Accelerator alternatives | alternatives | $97/mo class vs others | Figure from Sep 14 blog after re-open | tax program blog | High: already in that blog |
| 20 | `navi-maraj-vs-diy-tax-course` | Navi Maraj CPA course vs DIY | vs | Fixed $1,498 vs cheaper class | Re-open seller page from Sep 14 post | tax program blog | High |

## Ten paste-ready copy prompts

Use with the education-guide JSON shape. Fill sources from live pages. If a price is missing, write "Not published on the pages we opened."

1. Write `/compare/{slug}` as JSON. Type `{alternatives|vs|best-for|review|checklist|decision}`. Grade 4-5 English. No em dashes. First `answer` field must answer the query in under 120 words. Disclose that Legacy Investing Show sells Legacy Wealth Blueprint. Do not print our tuition. Compare the other brand with us. Cite every competitor fact with url + asOf. Include Preston's journey and what Blueprint includes.

2. Alternatives page for `{brand}`. The table is `{brand}` vs Legacy Wealth Blueprint. Cheap free/other doors sit below if you need neither. Do not rank two other brands against each other.

3. Vs page for `{brand}` vs our wealth plan. Define both terms on first use. One table: topic / them / Blueprint / plain read. No winner trophy. WhoFits and WhoSkips required. Do not make the pole two other brands.

4. Best-for page for `{audience}`. Inclusion rules first. No numbered "best" rank. Paths by leak (tax, debt, rental, plan).

5. What-to-know briefing for `{product}`. Not a customer review. No stars. Free vs paid. Price only from a public page. Questions before buying as a checklist.

6. Checklist page for `{job}`. Each item produces a number or a document. Link a calculator on this site when one exists. No invented net-worth targets.

7. Coaching vs course. Use FTC coaching-scam language as warning signs, not as a verdict that `{brand}` is a scam.

8. Refresh prices on `{slug}`. Open each `sources.url`. If the number changed, update `costRows` and the prose that quotes it. Keep the old asOf in git history, not on the page.

9. Internal linking pass. Every new page must link the hub `/compare`, one persona `/tax-strategies/for/{slug}`, and one tool. Never `/lx/`.

10. Schema pass. Article + BreadcrumbList. FAQPage only if `faqs` is non-empty. Never Review or aggregateRating.

## How to add a page

1. Add `{slug}.json` under `data/education-guides/`.
2. Append the slug to `data/education-guides/index.json`.
3. Run `npm run build:compare` then `npm run build:sitemap`.
4. Run `npm test` (includes `tests/education-guides.test.js`).
5. Link it from a persona `readNext` only if the job matches.
6. Do not hand-edit `compare/{slug}.html`.
