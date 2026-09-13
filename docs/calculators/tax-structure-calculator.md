# Tax Structure Calculator

Built for the September 8, 2026 MATH carousel. A mobile web calculator with no sign-in, registration or checkout.

## Delivery links

Original brief preset: https://www.legacyinvestingshow.com/tools/tax-structure-calculator

Updated September 8 caption preset: https://www.legacyinvestingshow.com/tools/tax-structure-calculator?rental=updated

These are the intended production routes. Deployment verification is recorded separately; this document alone does not assert that they are live.

## Calibration

2026, single, $150,000, no other income, standard deduction:

| Output | Original brief | Updated caption |
| --- | ---: | ---: |
| Federal income tax on wages | $24,734 | $24,734 |
| Employee payroll tax | $11,475 | $11,475 |
| Total wage taxes | $36,209 | $36,209 |
| Long-term capital gains tax | $12,667.50 | $12,667.50 |
| Rental expenses | $105,500 | $105,500 |
| Rental cash before depreciation and tax | $44,500 | $44,500 |
| Total depreciation | $89,090.91 | $60,000 |
| Taxable rental result | -$44,590.91 | -$15,500 |

The current parent Notion caption explicitly changed rental depreciation to $60,000 TOTAL. The build brief retained the original $44,591 paper-loss target. Both are available by name; the updated URL selects the caption-consistent example. The original is a reconstruction, not a verified cost-segregation study.

## Model boundaries

In "All three ways" mode each column treats the entire input as the only income source in a separate scenario. "My real split" mode (added Sep 8, 2026) puts the three shares on one return: wages and any positive rental result share the standard deduction and the ordinary brackets, long-term gains stack on top for the 0/15/20 brackets, NIIT applies to gains plus rental profit above the threshold, and rental paper losses are never used to offset the other income. The property assumptions do not scale with the rental share. Capital gains are realized gains, not sale proceeds. Rental is gross rent, not spendable profit. Property acquisition cost, principal payments and capital improvements are not subtracted from the displayed operating cash amount.

2026 standard deduction is $16,100 single / $32,200 joint. Ordinary and capital gains brackets are progressive. NIIT uses income before the standard deduction. Social Security is capped at $184,500 per worker; joint filing assumes one wage earner. Employee Additional Medicare is included above $200,000 single / $250,000 joint.

Rental expenses default to 105,500 / 150,000 = 70⅓%. Property value is fixed at $1 million, with 20% land and 27.5-year recovery. Changing annual income changes rent and operating expenses; it does not automatically buy a different property or change depreciation.

Standard depreciation is an annual straight-line illustration, ignoring placed-in-service conventions. Additional acceleration is an assumed INCREMENT above the standard baseline, net of depreciation it replaces. It is not a bonus percentage or an engineering estimate. Total modeled depreciation cannot exceed depreciable basis. Actual allocation among asset classes, eligibility, timing and remaining basis require a professional calculation. The updated example caps total depreciation at $60,000.

Rental losses create no automatic refund or wage offset. The tool notes that deductions/carryforwards depend on passive-activity, basis and at-risk rules. Positive rental profit is taxed as ordinary income, with simplified NIIT assuming an investment rental. No substantial hotel-like services or self-employment tax are modeled.

Excludes state taxes, AMT, credits, itemized deductions, age-related deductions, QBI, sale/recapture, loss-limitation calculations and other income. Amounts from $0 to $100 million are accepted; this is a simplified educational comparison, not a return estimator.

## Sources

- [IRS 2026 tables, Revenue Procedure 2025-32](https://www.irs.gov/irb/2025-45_IRB)
- [SSA contribution and benefit base](https://www.ssa.gov/oact/cola/cbb.html)
- [IRS Additional Medicare Tax](https://www.irs.gov/taxtopics/tc560)
- [IRS Net Investment Income Tax](https://www.irs.gov/taxtopics/tc559)
- [IRS Publication 527, residential rental property](https://www.irs.gov/publications/p527)
- [Build brief](https://app.notion.com/p/3d432819117e81d8b443e7c34892b54b)
- [Updated carousel](https://app.notion.com/p/3d432819117e81fe9717eb9cc6a2b017)

## ManyChat copy for review

Keyword: MATH. Optional alias: TOOL.

Here’s the Tax Structure Calculator from the carousel. Enter your income and filing status to compare wages, long-term gains and rental income. It’s educational, not tax advice.

Button: Open calculator

Use the updated-caption link above for the September 8 post.

No messages have been sent, and no ManyChat automation has been changed by this implementation.

## Design (Sep 8, 2026, chosen from design-explorations/tax-structure-calculator.html: B + C)

Single 640px column on cream paper, navy ink, DM Serif Display for the title and amount, Plus Jakarta Sans elsewhere. Top: title with the live amount, amount input with slider, filing and mode toggles. Then one chart: three equal-length bars for the same amount with the dark part showing federal tax; labels move outside the bar when it is narrow. Under the chart, the carousel tagline, then a statement-style ledger with every line item, the rental steps in order, and a "you keep" line per path. Split mode adds share sliders and a total line comparing the split against all-wages. Screenshots: `screenshots/tax-structure/*-v3.png`.

## Maintenance

- Template: `templates/tax-structure-calculator.html`
- Tax tables/defaults: `data/calculators/tax-structure.json`
- Shared math: `assets/js/tax-structure-model.js`
- Controller: `assets/js/tax-structure-calculator.js`
- Styles: `assets/css/tax-structure-calculator.css`
- Build: `npm run build:tax-structure`
- Focused tests: `node --test tests/tax-structure-calculator.test.js`

The standard `build:tools` pipeline renders this page AFTER importing the existing calculator catalog, so catalog imports cannot erase it. Do not edit the generated HTML directly.

## Verified preview

[Open original preset](https://legacyinvestingshow-6ypta75a3-legacy-investing-show.vercel.app/tools/tax-structure-calculator?_vercel_share=j8Znx2fPYtK2CvKtRZzVSfrb7AKwbRKc)

[Open updated caption preset](https://legacyinvestingshow-6ypta75a3-legacy-investing-show.vercel.app/tools/tax-structure-calculator?_vercel_share=j8Znx2fPYtK2CvKtRZzVSfrb7AKwbRKc&rental=updated)

Preview is READY and both links were checked in fresh browser contexts without login. Production has not been changed. Seven focused model tests and the full site build passed. Desktop and 320/390px mobile checks covered inputs, filing status, both presets, custom rental assumptions, validation, reset and overflow.
