# Architecture

How the wealth plan conversion system works: components, relationships, data flows, invariants.

## Blog Pipeline Overview

```
content/blog/*.md  →  scripts/build-blog.js  →  blog/*.html + blog/index.html
                                                            ↓
content/blog/*.md  →  scripts/generate-sitemap.js  →  sitemap.xml
                                                            ↓
blog/*.html        →  scripts/generate-rss.js       →  feed.xml
```

1. **Authoring**: Write markdown with YAML frontmatter in `content/blog/`
2. **Building**: `npm run build:blog` reads all `.md` files, parses frontmatter, converts markdown to HTML, applies `templates/blog-post.html`, outputs to `blog/`
3. **Index**: `build-blog.js` also generates `blog/index.html` with category filtering
4. **Sitemap**: `npm run build:sitemap` scans `blog/*.html` for posts
5. **RSS**: `npm run build:rss` generates `feed.xml` from blog HTML

## New Wealth Plan Conversion Pipeline

```
Wealth Plans (PDF/DOCX)
         ↓
[pipeline script: extract + anonymize]
         ↓
content/blog/{slug}.md  (with YAML frontmatter)
         ↓
npm run build  (existing pipeline)
         ↓
blog/{slug}.html + updated blog/index.html + sitemap.xml + feed.xml
```

## Key Components

### 1. Extraction Script (`scripts/extract-wealth-plan.js` or `.py`)
- **Input**: PDF or DOCX file path
- **Output**: Structured JSON with sections, financial data, strategies
- **Uses**: PyMuPDF for PDF, zipfile for DOCX
- **Key invariant**: Must preserve all financial data, only redact full names

### 2. Markdown Generator (`scripts/generate-wealth-plan-post.js`)
- **Input**: Structured JSON from extraction
- **Output**: Markdown file in `content/blog/{slug}.md`
- **Frontmatter**: Must include all required fields (title, description, date, author, category, statistics, faq, seo, tags, image, canonical)
- **Category**: Always "Wealth Plan"
- **Disclaimer**: Standardized anonymization/disclaimer text at top of content

### 3. Anonymization Module
- **Input**: Raw text from wealth plan
- **Output**: Text with full names replaced by first names only
- **Invariants**: 
  - No full names (first+last) anywhere in output
  - First names preserved for readability
  - Location data preserved (city/state) as it's not PII in this context
  - All financial figures preserved exactly

### 4. Keyword Enrichment (`scripts/build-blog.js` modification)
- Add "Wealth Plan" category mapping to `extractKeywords()` function
- Keywords: wealth plan, case study, personalized wealth strategy, tax optimization, financial roadmap

## Frontmatter Template for Wealth Plan Posts

```yaml
---
title: "How [FirstName] Saved $XX,XXX in Taxes with a Personalized Wealth Plan (2026 Case Study)"
titleTemplate: '%s | Legacy Investing Show Case Studies'
description: "150-160 char SEO description"
date: "2026-04-XX"
modifiedDate: "2026-04-XX"
author: Preston Seo
authorTitle: 'Founder, Legacy Investing Show'
authorCredentials: '2,000+ students trained, $10M+ student revenue generated'
category: Wealth Plan
canonical: 'https://www.legacyinvestingshow.com/blog/{slug}'
seo:
  primaryKeyword: wealth plan case study
  secondaryKeywords: [personalized wealth strategy, tax optimization plan, financial roadmap]
  longTailKeywords: [specific long-tail from plan content]
  searchIntent: informational
tags:
  - wealth plan
  - case study
  - tax strategy
  - [strategy-specific tags from plan]
image: /assets/images/og-blog.jpg
featured: false
statistics:
  - value: '$XX,XXX'
    label: Year-One Tax Savings
    icon: dollar
    context: Conservative estimate
  - value: '$XX,XXX'
    label: Total First-Year Value
    icon: chart
  - value: 'X'
    label: Tax Strategies Deployed
    icon: star
  - value: 'X months'
    label: Emergency Fund Target
    icon: clock
faq:
  - question: "..."
    answer: "..."
---
```

## Blog Post Content Structure

1. **Disclaimer block** (HTML div with standardized text)
2. **Introduction** — Hook with key numbers from executive summary
3. **Executive Summary** — Year-one value, primary objectives, strategic path
4. **Current Financial Position** — Anonymized table of key metrics
5. **Tax Strategy Playbook** — Each strategy as H2/H3 with explanation and dollar estimates
6. **Primary Strategy** — STR business model, entity structure, scenario projections
7. **Investment Strategy** — Bitcoin DCA, income sleeve, portfolio allocation
8. **Year-One Value Breakdown** — Summary table with Conservative/Aggressive columns
9. **Timeline/Action Items** — Week-by-week or month-by-month milestones
10. **Key Takeaways** — Actionable summary
11. **Disclaimer** — Repetition of legal disclaimer at end

## Invariants

- No full names (first+last) in any generated content, filenames, slugs, or frontmatter
- Every post starts with the anonymization disclaimer
- Every post has category "Wealth Plan"
- Every post has at least 3 statistics cards in frontmatter
- Every post has at least 5 FAQ items
- Posts are 3,000-5,000 words
- Canonical URLs follow pattern: `https://www.legacyinvestingshow.com/blog/{slug}`
- All slugs are URL-safe (lowercase, hyphens, no special characters)
- Build must complete without errors after adding any batch of posts
