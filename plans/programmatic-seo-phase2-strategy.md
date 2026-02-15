# Programmatic SEO Phase 2 Strategy

Date: 2026-02-15
Site: legacyinvestingshow.com

## Opportunity Analysis

- Business focus is strong for tax, investing, retirement, business structures, and debt.
- `data/seo-topics-100.json` tracks 100 planned pages with 30 marked complete and 70 pending.
- Current completed coverage is concentrated in `tax-strategies` and a small subset of `retirement`.
- Highest upside now is expanding beyond tax into retirement, investing, and business structures to capture broader intent and reduce topical over-concentration.

## Current State Risks to Fix Before Scale

1. Path mismatch in tracking
- `data/seo-topics-100.json` category paths point to top-level folders like `tax-strategies` and `retirement`.
- Prior reports mention output under `programmatic-pages/...`.
- Decision required: use one canonical URL structure and update all generators + metadata to match.

2. Completion mismatch
- 30 topics are marked `completed` in metadata, but those completed files are not all found where the tracker expects.
- This can break internal QA, sitemap generation, and reporting.

3. Thin/duplicate risk at scale
- Phase 2 should enforce per-page uniqueness blocks (examples, calculations, mistakes, local constraints, and decision frameworks).

## Implementation Plan

### Phase A: Normalize Source of Truth (1 day)

1. Pick canonical URL convention:
- Option 1: top-level category folders (`/tax-strategies/...`, `/retirement/...`)
- Option 2: fully nested pSEO folders (`/programmatic-pages/...`)

2. Update generator scripts to one convention:
- `scripts/generate-seo-pages.js`
- `scripts/generate-programmatic-seo.js`
- `scripts/generate-sitemap.js` (if needed)

3. Reconcile `data/seo-topics-100.json`:
- `status` and `completed_date` must match existing files.
- `category_path` must match canonical URL structure.

### Phase B: Launch High-Intent Expansion (2-3 weeks)

1. Batch 1 (first 20 pages):
- Retirement (15 pending)
- Business structures (5 highest-intent pages)

2. Batch 2 (next 25 pages):
- Investing (20 pages)
- Debt management (5 pages)

3. Batch 3 (final 25 pages):
- Debt management remaining (5)
- Passive income (10)
- Business structures remaining (10)

### Phase C: Indexation + CRO Loop (ongoing)

1. Submit updated sitemap after each batch.
2. Add contextual links from blog posts to new pSEO pages.
3. Add clear CTA blocks for consultation/program enrollment on every page.
4. Review Search Console weekly for coverage and query data.

## Content Guidelines (to avoid doorway/thin pages)

- Minimum depth target: 2,200+ words for long-tail pages, 3,000+ for head terms.
- Every page must include:
  - Unique scenario examples
  - Numeric examples/calculations
  - "When this fails" section
  - Decision checklist
  - Cross-links to at least 3 related pages
- Avoid reusing intros/conclusions across pages.
- Keep advice educational and include tax/legal disclaimers.

## Page Template Standard

1. URL Structure
- `/[category]/[slug].html` (recommended if keeping existing live structure)

2. Title Template
- `[Primary Keyword]: Complete 2026 Guide | Legacy Investing Show`

3. Meta Description Template
- `Learn [primary keyword] with examples, pros/cons, and action steps. See how to apply it to your tax and wealth strategy.`

4. Content Outline
- H1 target keyword
- TL;DR summary
- What it is and who it is for
- How it works (step-by-step)
- Cost/tax/math examples
- Common mistakes
- Alternatives and comparisons
- FAQ (8-12 questions)
- Next-step CTA

5. Schema Markup
- `Article` (or `FAQPage` when FAQ is substantial)
- `BreadcrumbList`
- `Organization` references in site-wide data

## Internal Linking Architecture

- Hub pages:
  - `/tax-strategies/index.html`
  - `/retirement/index.html`
  - Add new hubs for `/investing/`, `/business-structures/`, `/debt-management/`, `/passive-income/`
- Spokes:
  - Each spoke links to its category hub and 3 to 5 sibling spokes.
- Blog integration:
  - Add "Related strategy" blocks in new and existing blog posts.

## Indexation Strategy

- Include only pages with full sections and unique examples in sitemap.
- Noindex placeholder or unfinished pages.
- Split sitemap by type if URL count grows quickly.

## Success Metrics

- Index coverage rate of newly published pages.
- Top-20 keyword count by category.
- Organic sessions per category hub and spoke.
- CTA click-through rate to `/programs`.
- Assisted conversions from pSEO entry pages.

## Immediate Next Actions

1. Resolve URL/path mismatch between tracker and generated files.
2. Build and publish first 20-page phase-2 batch.
3. Run internal link pass from existing high-traffic blogs to new pages.
