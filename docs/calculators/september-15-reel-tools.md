# September 15 reel tools

Reviewed September 8, 2026 against all eight Instagram database rows dated September 15, 2026.

| Reel | Keyword | Deliverable | Public URL |
|---|---|---|---|
| 1 | SPLIT | Adjustable 50/40/10 Money Split Calculator, cash targets and 15/20-year projections | https://www.legacyinvestingshow.com/tools/money-split-calculator |
| 2 | HSA | HSA setup, investing and reimbursement checklist with receipt log template | https://www.legacyinvestingshow.com/tools/hsa-setup-checklist |
| 4 | AGE | $1M by 60 monthly contribution chart with starting age and extra-income inputs | https://www.legacyinvestingshow.com/tools/millionaire-age-chart |
| 7 | CALENDAR | Month-by-month money checklist and review reminders | https://www.legacyinvestingshow.com/tools/money-calendar |

Reels 3, 6 and 8 have discussion CTAs. Reel 5 promises a future retirement follow-up video and explicitly says it is not a calculator yet. No additional tool was required by these scripts.

Existing catalog overlaps: monthly-budget-planner and compound-savings-growth cover parts of the calculations, but none of the four promised resources existed in the live 71-tool catalog. These four additions bring the catalog to 75 tools.

## Sources

- Content database: https://app.notion.com/p/e015f0a9ca944685913f835bea4d9f4e
- Reel 1: https://app.notion.com/p/3ce32819117e811cb13edd7bade083cb
- Reel 2: https://app.notion.com/p/3ce32819117e81ed8e09dbe4ccb7e569
- Reel 4: https://app.notion.com/p/3cf32819117e81f0afd4dfd6c5dbbe8c
- Reel 7: https://app.notion.com/p/3cf32819117e81968c28d1573792e2ba
- HSA rules: https://www.irs.gov/publications/p969
- 2026 HSA limits: https://www.irs.gov/publications/p15b
- Estimated-tax deadlines: https://www.irs.gov/publications/p505

## Build and source

The calculator application source is `/Users/deveshdhardubey/calcs2`. The website's `scripts/import-calculators.js` builds its Next.js static export and imports it into `tools/`. Do not hand-edit generated HTML or the stale `data/tools.json` catalog.

New UI: `src/components/calculators/{money-split-calculator,millionaire-age-chart,hsa-setup-checklist,money-calendar}.tsx`.
Models/content: `src/lib/calculators/reel-money.ts` and `reel-planning.ts`.
Registration: `src/lib/catalog.ts`, `src/lib/calculators/index.ts`, `src/components/calculators/calculator-client.tsx`.
Print rules are scoped to `.reel-resource` in `src/app/globals.css`.

Run `npm test` in calcs2, then `npm run build` in the website release checkout. The custom tools use the existing design components and have focused behavior tests; the generic calculator content contract excludes custom presentations.

Releases must start from current origin/main. This user's initial website checkout was behind main and contained unrelated, unfinished tax-structure-calculator work, which was excluded from this release.
