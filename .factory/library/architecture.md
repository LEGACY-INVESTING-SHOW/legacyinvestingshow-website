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

## Wealth Plan Conversion Pipeline

```
Wealth Plans (PDF/DOCX)
         ↓
scripts/wealth-plan-pipeline/extractor.py  (extract text)
         ↓
scripts/wealth-plan-pipeline/anonymizer.py  (scrub PII)
         ↓
scripts/wealth-plan-pipeline/generator.py  (create markdown skeleton)
         ↓
[LLM-expansion to 3000-5000 words]
         ↓
content/blog/{slug}.md  (with YAML frontmatter)
         ↓
npm run build  (existing pipeline)
         ↓
blog/{slug}.html + updated blog/index.html + sitemap.xml + feed.xml
```

## Key Components

### 1. Extraction Script (`scripts/wealth-plan-pipeline/extractor.py`)
- **Input**: PDF or DOCX file path
- **Output**: Structured JSON with sections, financial data, strategies
- **Uses**: PyMuPDF for PDF, zipfile for DOCX
- **Key invariant**: Must preserve all financial data, only redact full names

### 2. Markdown Generator (`scripts/wealth-plan-pipeline/generator.py`)
- **Input**: Structured JSON from extraction
- **Output**: Markdown file skeleton in `content/blog/{slug}.md`
- **Produces structural skeleton**: The content sections are placeholders `[Perspective content based on extracted plan data]`
- **Workers must expand**: Replace all placeholders with real 3,000-5,000 word content

### 3. Anonymization Module (`scripts/wealth-plan-pipeline/anonymizer.py`)
- **Input**: Raw text from wealth plan
- **Output**: Text with full names replaced by first names only
- **Known safe false positives**: "Personalized Wealth", "Financial Independence", "Preston Seo", "Legacy Investing Show", etc.
- **Invariants**: No full names, emails, phone numbers, SSNs, or addresses in output

### 4. Keyword Enrichment (`scripts/build-blog.js`)
- "Wealth Plan" category mapping added to `extractKeywords()` function
- Keywords: wealth plan, personalized strategy, tax optimization, financial planning, retirement strategy

## Current State

- **37 wealth plan `.md` files** exist in `content/blog/`
- **1 broken**: `ian-wealth-plan.md` (contains error string, not content)
- **17 skeletons**: placeholder content, need expansion to 3,000-5,000 words
- **1 thin**: `trent-wealth-plan.md` (generic shell, ~85 words)
- **19 expanded**: real content, 2,800+ words each
- **~57 remaining** unique wealth plans still need conversion

## Frontmatter Template for Wealth Plan Posts

```yaml
---
title: "How [FirstName] Saved $XX,XXX in Taxes with a Personalized Wealth Plan"
titleTemplate: '%s | Legacy Investing Show Wealth Plans'
description: "150-160 char SEO description"
date: "2026-04-XX"
author: Preston Seo
category: Wealth Plan
canonical: 'https://www.legacyinvestingshow.com/blog/{slug}'
seo:
  primaryKeyword: wealth plan case study
  secondaryKeywords: [personalized wealth strategy, tax optimization plan]
  longTailKeywords: [specific long-tail from plan content]
  searchIntent: informational
tags:
  - wealth plan
  - tax strategy
  - wealth building
image: /assets/images/blog/wealth-plan-{firstname}.jpg
imageAlt: "{FirstName}'s Personalized Wealth Plan Strategy"
disclaimer: true
statistics:
  - label: "Year-One Tax Savings"
    value: "$XX,XXX"
    icon: dollar
  - label: "Total First-Year Value"
    value: "$XX,XXX"
    icon: chart
  - label: "Tax Strategies Deployed"
    value: "X"
    icon: star
faq:
  - question: "..."
    answer: "..."
---
```

## Invariants

- No full names (first+last) in any generated content, filenames, slugs, or frontmatter
- Every post starts with the anonymization disclaimer
- Every post has category "Wealth Plan"
- Every post has at least 3 statistics cards in frontmatter
- Every post has at least 5 FAQ items
- Posts are 3,000-5,000 words (excluding frontmatter)
- Canonical URLs follow pattern: `https://www.legacyinvestingshow.com/blog/{slug}`
- All slugs are URL-safe (lowercase, hyphens, no special characters)
- Build must complete without errors after adding any batch of posts
