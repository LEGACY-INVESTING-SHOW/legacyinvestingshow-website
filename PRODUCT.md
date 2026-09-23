# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
The main visitor on /reviews is a prospect before a sales call. They already know Preston Seo from a webinar, an ad, or a booked call, and they are checking whether Legacy Investing Show is legit before they pay about $10,000. Most are regular American earners, not finance experts, and many read on a phone.

## Product Purpose
legacyinvestingshow.com is the official site of Legacy Investing Show (Preston Seo): financial education on tax strategy, real estate, Airbnb arbitrage, and wealth building. The /reviews page exists to build trust with proof. It succeeds when a prospect finishes it believing the results are real and honestly shown.

## Positioning
"Build Wealth That Lasts Beyond A Paycheck." The reviews page shows the best, the typical, and the lowest results side by side, and links to the one-star reviews, which most competitors hide.

## Operating Context
Prospects arrive between a webinar or booking and a sales call. The sales call closes; the page does not push an action. The page has no closing CTA by owner decision.

## Capabilities and Constraints
- Static HTML plus Node build scripts. `scripts/build-reviews-sections.js` generates the range, Trustpilot, wealth plan, and transcript blocks from `data/`. `scripts/build-reviews-text.js`, `build-reviews-schema.js`, and the image and video sitemaps read the page.
- `main` deploys to production on Vercel.
- Owner rules for /reviews: no stats strips, no "source" lines, no hedging blocks, no closing CTA.
- Wealth plan figures are targets written into a plan, not achieved results. Keep them apart from client-reported results.

## Brand Commitments
Name: Legacy Investing Show, founder Preston Seo. Colors in use across the site: forest green, cream paper, gold accent. Plain words, short sentences, exact numbers, no sales language or promised results.

## Evidence on Hand
- 4 Legacy Wealth Blueprint video interviews (Stephanie Dailey, Albert, Abigail, Shawn): `reviews.html`, Vimeo.
- 44 written community results: `reviews.html`.
- Trustpilot: 4.2 across 66 reviews (51 five, 7 four, 2 three, 6 one). 58 four- and five-star reviews captured with screenshots: `data/trustpilot-reviews.json`, `data/trustpilot-summary.json`.
- 18 Airbnb client case study videos (YouTube) with transcripts.
- 61 wealth plans, 28 with a stated first-year figure: `data/wealth-plan-inventory.json`. 76 redacted wealth plan pages: `data/lwb-proof-images.json`.
- The one-star reviews are not captured. Do not invent their text.

## Product Principles
1. Proof first, claims never. Every figure belongs to a named client and says whether it is a result or a plan target.
2. Show the bottom as clearly as the top.
3. A regular person on a phone should understand every section in a few seconds.
4. The page informs; the sales call sells.

## Accessibility & Inclusion
Readable by a general audience at about a grade 6 level. Works on a phone first. WCAG AA contrast.
