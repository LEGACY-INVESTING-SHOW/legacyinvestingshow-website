# Legacy Investing Show - Eleventy CMS

A static site generator using Eleventy for the Legacy Investing Show blog content.

## Migration Complete ✓

**43 blog posts** successfully migrated from HTML to Markdown + YAML format.

## Project Structure

```
├── src/
│   └── blog/              # Markdown blog posts (43 files)
├── _includes/
│   ├── layouts/           # Nunjucks templates
│   └── components/        # Reusable components
├── _site/                 # Generated output (don't edit)
├── assets/                # CSS, images, JS
└── scripts/               # Migration and utility scripts
```

## Content Format

Each blog post is a Markdown file with YAML frontmatter:

```yaml
---
title: "Post Title"
description: "SEO description"
date: "2026-02-07"
author: "Preston Seo"
category: "Success Story"
image: "/assets/images/blog/image.jpg"
keywords:
  - "keyword1"
  - "keyword2"
stats:
  - value: "$90,000"
    label: "Annual Revenue"
    context: "First year"
faqs:
  - question: "Question?"
    answer: "Answer text"
---

# Your markdown content here...
```

## Commands

```bash
# Build site
npm run build

# Serve locally
npm run serve

# Debug
npm run debug
```

## Categories

- **Success Story** - Student success stories
- **How-To Guide** - Step-by-step tutorials
- **Strategy** - Investment strategies
- **Tax Strategies** - Tax-related content
- **Real Estate Investing** - Property investment guides
- **Side Hustles** - Income generation ideas

## Migration Details

- **Source of truth**: `../content/blog/` (canonical markdown in parent repo)
- **CMS source copy**: `src/blog/` (synced from canonical source)
- **Generated HTML**: `_site/blog/`

All posts include:
- YAML frontmatter with metadata
- Converted markdown content
- Preserved statistics cards
- Preserved FAQ sections
- SEO meta tags
- Schema.org structured data

## Next Steps

1. Review a few generated posts
2. Set up deployment (Vercel/Netlify)
3. Configure custom domain
4. Update DNS/settings
