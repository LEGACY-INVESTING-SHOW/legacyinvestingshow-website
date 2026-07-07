# Legacy Investing Show Website Rebuild Plan

**Date:** January 2026
**Project Type:** Full Website Rebuild
**Primary Goals:** Social Proof, SEO, LLM Accessibility, Blog Automation

---

## Overview

Rebuild the Legacy Investing Show website from Framer to a custom HTML/CSS/Tailwind CSS static site optimized for:
- Lightning-fast performance (< 1s LCP)
- Technical SEO excellence
- LLM/AI crawler accessibility
- Automated blog content publishing
- Social proof and conversion optimization

---

## Current Website Analysis

### Site Structure (legacyinvestingshow.com)

| Page | URL | Purpose |
|------|-----|---------|
| Home | `/` | Hero, social proof, CTAs, testimonials, FAQ |
| About | `/about` | Preston's story timeline, social links |
| Programs | `/program` | Sales page for Legacy Wealth System |
| Success Stories | `/success-stories` | Case study links, testimonials |
| Blog | `/blog` | Case study articles (5 posts) |
| Blog Posts | `/blog/[slug]` | Individual case studies |

### Current Technical Issues Identified

#### SEO Problems
1. **Missing Structured Data** - No JSON-LD schema markup on any page
2. **Poor Heading Hierarchy** - Uses H5/H6 for important content, inconsistent structure
3. **Missing Alt Text** - All images have empty alt attributes
4. **Generic Page Titles** - "Preston Seo" instead of keyword-rich titles
5. **No Article Schema** - Blog posts lack BlogPosting/Article schema
6. **Missing Author/Date Markup** - No structured data for content attribution
7. **No FAQ Schema** - FAQ section exists but not marked up
8. **Basic Sitemap** - No lastmod, changefreq, or priority attributes
9. **No llms.txt** - Not optimized for AI crawlers

#### Performance Issues
1. **Large Images** - Preston's main image is 2.6MB (unoptimized)
2. **No Modern Formats** - Mix of PNG/JPG instead of WebP/AVIF
3. **No Preloading** - Critical resources not preloaded
4. **Framer Overhead** - Framework JavaScript adds bloat

#### Content Issues
1. **Limited Blog Content** - Only 5 case study posts
2. **No Content Categories** - All posts are "Case Study" type
3. **No RSS Feed** - Can't syndicate content
4. **No Search** - No way to find content

---

## Proposed Architecture

### Technology Stack

```
├── HTML5 (Semantic markup)
├── Tailwind CSS v4 (Styling)
├── Vanilla JavaScript (Minimal interactivity)
├── Markdown (Blog content)
├── Node.js Scripts (Build/automation)
└── GitHub Actions (CI/CD)
```

### Directory Structure

```
legacyinvestingshow-website/
├── index.html                 # Homepage
├── about.html                 # About page
├── programs.html              # Programs/sales page
├── success-stories.html       # Success stories
├── blog/
│   ├── index.html            # Blog listing
│   └── [slug].html           # Generated blog posts
├── assets/
│   ├── css/
│   │   └── styles.css        # Compiled Tailwind
│   ├── js/
│   │   └── main.js           # Minimal JS
│   └── images/
│       ├── optimized/        # WebP/AVIF versions
│       └── originals/        # Source images
├── content/
│   └── blog/
│       ├── _template.md      # Blog post template
│       └── *.md              # Markdown blog posts
├── scripts/
│   ├── build-blog.js         # Generate HTML from MD
│   ├── generate-sitemap.js   # Dynamic sitemap
│   ├── generate-rss.js       # RSS feed generator
│   └── optimize-images.js    # Image optimization
├── public/
│   ├── robots.txt            # Search engine directives
│   ├── llms.txt              # AI crawler guidance
│   ├── sitemap.xml           # Generated sitemap
│   ├── rss.xml               # RSS feed
│   └── favicon.ico           # Favicon
└── .github/
    └── workflows/
        └── deploy.yml        # Auto-deploy on push
```

---

## Phase 1: Foundation & Technical SEO

### 1.1 Semantic HTML Structure

Each page will follow this structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <!-- Preconnect to critical origins -->
    <link rel="preconnect" href="https://fonts.googleapis.com">

    <!-- Critical CSS inline -->
    <style>/* Critical path CSS */</style>

    <!-- Meta tags -->
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>[Page Title] | Legacy Investing Show</title>
    <meta name="description" content="[Page-specific description]">

    <!-- Canonical -->
    <link rel="canonical" href="https://www.legacyinvestingshow.com/[path]">

    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://www.legacyinvestingshow.com/[path]">
    <meta property="og:title" content="[Title]">
    <meta property="og:description" content="[Description]">
    <meta property="og:image" content="https://www.legacyinvestingshow.com/assets/images/og-[page].jpg">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@thelegacyshow">

    <!-- Structured Data -->
    <script type="application/ld+json">[Schema markup]</script>

    <!-- Stylesheet -->
    <link rel="stylesheet" href="/assets/css/styles.css">
</head>
<body>
    <header role="banner">
        <nav role="navigation" aria-label="Main navigation">
            <!-- Semantic navigation -->
        </nav>
    </header>

    <main role="main">
        <article> or <section> as appropriate
    </main>

    <footer role="contentinfo">
        <!-- Footer content -->
    </footer>

    <!-- Defer non-critical JS -->
    <script defer src="/assets/js/main.js"></script>
</body>
</html>
```

### 1.2 Schema Markup Implementation

#### Organization Schema (all pages)
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Legacy Investing Show",
  "url": "https://www.legacyinvestingshow.com",
  "logo": "https://www.legacyinvestingshow.com/assets/images/logo.png",
  "founder": {
    "@type": "Person",
    "name": "Preston Seo"
  },
  "sameAs": [
    "https://www.instagram.com/thelegacyinvestingshow/",
    "https://www.youtube.com/@LegacyInvestingShow",
    "https://www.tiktok.com/@thelegacyinvestingshow",
    "https://www.facebook.com/share/19LQhE6gmh/"
  ]
}
```

#### Person Schema (About page)
```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Preston Seo",
  "jobTitle": "Real Estate Investor & Financial Educator",
  "description": "Founder of Legacy Investing Show with $20M+ real estate portfolio",
  "knowsAbout": ["Real Estate Investing", "Tax Optimization", "Airbnb Arbitrage", "Wealth Building"],
  "alumniOf": "University (if applicable)",
  "sameAs": ["social URLs"]
}
```

#### BlogPosting Schema (each blog post)
```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "[Post Title]",
  "description": "[Post excerpt]",
  "image": "[Featured image URL]",
  "datePublished": "2025-10-29",
  "dateModified": "2025-10-29",
  "author": {
    "@type": "Person",
    "name": "Preston Seo"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Legacy Investing Show",
    "logo": {
      "@type": "ImageObject",
      "url": "https://www.legacyinvestingshow.com/assets/images/logo.png"
    }
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "[Post URL]"
  }
}
```

#### FAQ Schema (Homepage & Programs)
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How Is This Better Than Just Watching YouTube Videos?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "[Full answer text]"
      }
    }
  ]
}
```

#### Course Schema (Programs page)
```json
{
  "@context": "https://schema.org",
  "@type": "Course",
  "name": "The Complete Wealth System",
  "description": "Build, Protect & Scale Your Financial Freedom",
  "provider": {
    "@type": "Organization",
    "name": "Legacy Investing Show"
  },
  "offers": {
    "@type": "Offer",
    "category": "Paid"
  }
}
```

### 1.3 Robots.txt Configuration

```txt
# robots.txt for legacyinvestingshow.com

User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /_*

# Sitemap
Sitemap: https://www.legacyinvestingshow.com/sitemap.xml

# AI Crawlers - Welcome them for visibility
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Bytespider
Allow: /

# Point to llms.txt for AI-specific guidance
# See: https://www.legacyinvestingshow.com/llms.txt
```

### 1.4 LLMs.txt Implementation

```txt
# llms.txt - AI Crawler Guidance for Legacy Investing Show
# https://www.legacyinvestingshow.com/llms.txt

# Site Information
name: Legacy Investing Show
url: https://www.legacyinvestingshow.com
description: Preston Seo teaches wealth-building strategies including tax optimization, debt elimination, cash flow generation through Airbnb arbitrage, smart investing, and asset protection.

# Owner/Author
author: Preston Seo
credentials: Real Estate Investor with $20M+ Portfolio

# Primary Topics
topics:
  - Real Estate Investing
  - Airbnb Arbitrage (rental arbitrage without ownership)
  - Tax Optimization Strategies
  - Debt Elimination
  - Cash Flow Generation
  - Asset Protection
  - Legacy Planning
  - Financial Freedom

# Content Types Available
content_types:
  - Educational articles
  - Student success case studies
  - Financial strategy guides
  - FAQ content

# Key Pages for AI Understanding
important_pages:
  - /: Homepage with value proposition and social proof
  - /about: Preston Seo's background and story
  - /program: Legacy Wealth System course details
  - /success-stories: Student testimonials and case studies
  - /blog: Educational content and case studies

# Blog Content Structure
blog_structure:
  format: Markdown-based static pages
  categories: [Case Studies, Tax Strategies, Investing Guides, Airbnb Tips]
  update_frequency: Weekly

# Contact & Social
social_media:
  instagram: https://www.instagram.com/thelegacyinvestingshow/ (1.5M followers)
  youtube: https://www.youtube.com/@LegacyInvestingShow (542k subscribers)
  tiktok: https://www.tiktok.com/@thelegacyinvestingshow (2.6M followers)
  facebook: https://www.facebook.com/share/19LQhE6gmh/ (2.4M followers)

# AI Training Permissions
ai_training: allowed
ai_citation: preferred

# Preferred Citation Format
citation_format: "Source: Legacy Investing Show (legacyinvestingshow.com)"

# Content Freshness
last_updated: 2026-01-22
```

### 1.5 Enhanced Sitemap

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">

  <url>
    <loc>https://www.legacyinvestingshow.com/</loc>
    <lastmod>2026-01-22</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>

  <url>
    <loc>https://www.legacyinvestingshow.com/about</loc>
    <lastmod>2026-01-15</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>

  <url>
    <loc>https://www.legacyinvestingshow.com/program</loc>
    <lastmod>2026-01-20</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>

  <url>
    <loc>https://www.legacyinvestingshow.com/success-stories</loc>
    <lastmod>2026-01-22</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

  <url>
    <loc>https://www.legacyinvestingshow.com/blog</loc>
    <lastmod>2026-01-22</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>

  <!-- Blog posts with image sitemaps -->
  <url>
    <loc>https://www.legacyinvestingshow.com/blog/dustin-case-study</loc>
    <lastmod>2025-10-29</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
    <image:image>
      <image:loc>https://www.legacyinvestingshow.com/assets/images/case-study-dustin.webp</image:loc>
      <image:title>Dustin's Airbnb Arbitrage Success Story</image:title>
    </image:image>
  </url>

  <!-- Additional blog posts... -->
</urlset>
```

---

## Phase 2: Blog System for Automation

### 2.1 Markdown Blog Post Template

```markdown
---
title: "How [Name] Achieved [Result] with [Method]"
slug: "[name]-case-study"
date: "2026-01-22"
lastModified: "2026-01-22"
author: "Preston Seo"
category: "Case Study"
tags: ["airbnb-arbitrage", "success-story", "real-estate"]
excerpt: "Brief 1-2 sentence description for meta and listings"
featuredImage: "/assets/images/blog/[slug]-featured.webp"
featuredImageAlt: "Descriptive alt text for the featured image"
readingTime: 8
---

## Quick Stats

- **Name:** [Name] ([brief description])
- **Model:** [Business model]
- **Results:** [Key metric]
- **Timeline:** [How long it took]

## Table of Contents

1. [Section 1](#section-1)
2. [Section 2](#section-2)
3. [FAQ](#faq)
4. [Watch the Training](#watch-the-training)

## Section 1

Content here...

## FAQ

**Question 1?**
Answer 1.

**Question 2?**
Answer 2.

## Watch the Training

Want the scripts and checklists [Name] used? [Watch the Free Training](https://www.firstairbnb.com/trainingworkshop1).

---

## Takeaway

Final summary paragraph with call to action.
```

### 2.2 Blog Build Script

```javascript
// scripts/build-blog.js
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const CONTENT_DIR = './content/blog';
const OUTPUT_DIR = './blog';
const TEMPLATE_PATH = './templates/blog-post.html';

async function buildBlog() {
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
  const posts = [];

  const files = fs.readdirSync(CONTENT_DIR)
    .filter(f => f.endsWith('.md') && !f.startsWith('_'));

  for (const file of files) {
    const content = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8');
    const { data: frontmatter, content: markdown } = matter(content);

    const html = marked(markdown);

    // Generate schema
    const schema = generateBlogSchema(frontmatter);

    // Build final HTML
    const finalHtml = template
      .replace('{{title}}', frontmatter.title)
      .replace('{{description}}', frontmatter.excerpt)
      .replace('{{content}}', html)
      .replace('{{schema}}', JSON.stringify(schema))
      .replace('{{date}}', frontmatter.date)
      .replace('{{author}}', frontmatter.author)
      .replace('{{featuredImage}}', frontmatter.featuredImage)
      .replace('{{readingTime}}', frontmatter.readingTime);

    // Write output
    const outputPath = path.join(OUTPUT_DIR, `${frontmatter.slug}.html`);
    fs.writeFileSync(outputPath, finalHtml);

    posts.push(frontmatter);
  }

  // Generate blog index
  generateBlogIndex(posts);

  // Generate RSS
  generateRSS(posts);

  // Update sitemap
  updateSitemap(posts);

  console.log(`Built ${posts.length} blog posts`);
}

function generateBlogSchema(frontmatter) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": frontmatter.title,
    "description": frontmatter.excerpt,
    "image": `https://www.legacyinvestingshow.com${frontmatter.featuredImage}`,
    "datePublished": frontmatter.date,
    "dateModified": frontmatter.lastModified || frontmatter.date,
    "author": {
      "@type": "Person",
      "name": frontmatter.author
    },
    "publisher": {
      "@type": "Organization",
      "name": "Legacy Investing Show",
      "logo": {
        "@type": "ImageObject",
        "url": "https://www.legacyinvestingshow.com/assets/images/logo.png"
      }
    }
  };
}

buildBlog();
```

### 2.3 Automated Publishing Workflow

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Optimize images
        run: npm run optimize-images

      - name: Build blog posts
        run: npm run build-blog

      - name: Build Tailwind CSS
        run: npm run build-css

      - name: Generate sitemap
        run: npm run generate-sitemap

      - name: Generate RSS feed
        run: npm run generate-rss

      - name: Deploy to hosting
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### 2.4 AI Content Creation Integration

To make content creation easy for AI/automation:

1. **Structured Frontmatter** - Clear YAML format that AI can generate
2. **Template Consistency** - Same structure for all case studies
3. **Git-Based Publishing** - Push markdown file = published post
4. **Validation Script** - Checks frontmatter completeness before build

```javascript
// scripts/validate-post.js
function validatePost(frontmatter) {
  const required = ['title', 'slug', 'date', 'author', 'category', 'excerpt', 'featuredImage'];
  const missing = required.filter(field => !frontmatter[field]);

  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(frontmatter.date)) {
    throw new Error('Date must be in YYYY-MM-DD format');
  }

  return true;
}
```

---

## Phase 3: Performance Optimization

### 3.1 Image Optimization Strategy

| Format | Use Case | Target Size |
|--------|----------|-------------|
| WebP | Photos, case study images | < 100KB |
| AVIF | Hero images (with WebP fallback) | < 80KB |
| SVG | Logo, icons | < 5KB |
| PNG | Screenshots with text | < 150KB |

**Implementation:**
```html
<picture>
  <source srcset="/assets/images/hero.avif" type="image/avif">
  <source srcset="/assets/images/hero.webp" type="image/webp">
  <img src="/assets/images/hero.jpg"
       alt="Preston Seo - Build Wealth That Lasts Beyond A Paycheck"
       width="1200"
       height="800"
       loading="eager"
       fetchpriority="high">
</picture>
```

### 3.2 Critical CSS Strategy

1. **Above-the-fold CSS** - Inline in `<head>` (< 14KB)
2. **Full CSS** - Loaded async with `media="print"` trick
3. **Component CSS** - Loaded on-demand for below-fold sections

```html
<head>
  <style>
    /* Critical CSS for above-the-fold content */
    /* ~14KB maximum */
  </style>
  <link rel="preload" href="/assets/css/styles.css" as="style" onload="this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="/assets/css/styles.css"></noscript>
</head>
```

### 3.3 Core Web Vitals Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| LCP | < 1.0s | Preload hero image, inline critical CSS |
| FID/INP | < 100ms | Minimal JS, defer non-critical |
| CLS | < 0.1 | Explicit image dimensions, font-display: swap |

### 3.4 Security Headers

```
# _headers (Netlify) or via server config

/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://www.youtube.com https://player.vimeo.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; frame-src https://www.youtube.com https://player.vimeo.com;
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

---

## Phase 4: Page-by-Page Implementation

### 4.1 Homepage (`index.html`)

**Sections:**
1. Hero - Value proposition + CTA
2. Social Proof Stats - $20M+, 2k+ success stories
3. About Preview - Short bio with "Read Full Story" link
4. Case Studies Grid - Featured success stories
5. Resources Section - Free tools promotion
6. Testimonials Carousel - Sliding testimonials
7. FAQ Accordion - 6 questions with schema
8. Footer - Links + social proof numbers

**Key SEO Elements:**
- Title: "Build Wealth That Lasts Beyond A Paycheck | Legacy Investing Show"
- Description: "Learn wealth strategies from Preston Seo. Tax optimization, debt elimination, Airbnb arbitrage. Join 2,000+ students building financial freedom."
- Schema: Organization + FAQPage

### 4.2 About Page (`about.html`)

**Sections:**
1. Hero - "About Me" heading
2. Timeline - 1991-2025 story
3. Featured In - Industry logos
4. Social Links - Platform icons with follower counts

**Key SEO Elements:**
- Title: "About Preston Seo - From Immigrant Family to $20M Real Estate Portfolio"
- Description: "Preston Seo's journey from washing dishes to building a $20M+ real estate portfolio. Learn how he achieved financial freedom and now helps others do the same."
- Schema: Person + BreadcrumbList

### 4.3 Programs Page (`programs.html`)

**Sections:**
1. Hero - Course headline + CTA
2. Testimonial Video - Social proof
3. Benefits Grid - 6 key benefits with icons
4. Curriculum - 5 modules breakdown
5. How It Works - Delivery methods
6. Instructor Bio - Preston's credentials
7. FAQ - Course-specific questions
8. Final CTA - Book strategy call

**Key SEO Elements:**
- Title: "Legacy Wealth System - Tax, Debt, Cash Flow Mastery | Preston Seo"
- Description: "Cut taxes 30-50%, eliminate debt, generate $5K-$15K/month cash flow. Comprehensive wealth building program from Preston Seo."
- Schema: Course + FAQPage + Product

### 4.4 Success Stories (`success-stories.html`)

**Sections:**
1. Hero - "Success Stories & Reviews"
2. Featured Case Studies - 5 linked cards
3. Testimonial Grid - Screenshot testimonials
4. CTA - Join the challenge

**Key SEO Elements:**
- Title: "Student Success Stories - Airbnb Arbitrage & Wealth Building Results"
- Description: "Real results from Legacy Investing Show students. See how they're making $2K-$10K+/month with Airbnb arbitrage and wealth strategies."
- Schema: ItemList + Review aggregation

### 4.5 Blog (`blog/index.html`)

**Sections:**
1. Hero - "From The Desk Of Preston Seo"
2. Featured Post - Latest/featured article
3. Category Filter - Tags/categories
4. Post Grid - All posts with pagination
5. Newsletter CTA - Email signup

**Key SEO Elements:**
- Title: "Blog - Financial Education & Success Stories | Legacy Investing Show"
- Description: "Free guides on Airbnb arbitrage, tax strategies, and wealth building from Preston Seo. Real student case studies and actionable advice."
- Schema: Blog + BreadcrumbList

### 4.6 Blog Post Template (`blog/[slug].html`)

**Sections:**
1. Header - Title, author, date, category
2. Featured Image - With proper alt text
3. Table of Contents - Jump links
4. Content - Markdown-rendered HTML
5. FAQ Section - If applicable
6. CTA - Related training link
7. Author Box - Preston's bio
8. Related Posts - 3 related articles

**Key SEO Elements:**
- Title: "[Post Title] | Legacy Investing Show"
- Description: From frontmatter excerpt
- Schema: BlogPosting + BreadcrumbList + (FAQPage if has FAQ)

---

## Phase 5: Content Expansion Strategy

### 5.1 Blog Category Structure

| Category | Content Type | Target Keywords |
|----------|-------------|-----------------|
| Case Studies | Student success stories | "[name] airbnb success", "arbitrage case study" |
| Tax Strategies | Tax optimization guides | "tax optimization strategies", "reduce taxes legally" |
| Airbnb Arbitrage | How-to guides | "airbnb arbitrage guide", "rental arbitrage tips" |
| Debt Elimination | Debt payoff strategies | "debt elimination strategy", "pay off debt fast" |
| Investing | Investment education | "beginner investing", "passive income investing" |
| Wealth Building | General wealth tips | "build wealth from nothing", "financial freedom" |

### 5.2 Content Calendar Template

```markdown
# Content Calendar 2026

## Week 1: January
- [ ] Case Study: [New Student Name]
- [ ] Guide: Top 5 Tax Deductions for Side Hustlers

## Week 2: January
- [ ] Case Study: [New Student Name]
- [ ] Guide: Airbnb Arbitrage Beginner Checklist

## Week 3: January
...
```

### 5.3 SEO Keyword Targets

**Primary Keywords:**
- "airbnb arbitrage" (High intent)
- "rental arbitrage" (High intent)
- "tax optimization strategies" (Medium intent)
- "build passive income" (High volume)
- "financial freedom" (High volume)

**Long-tail Keywords:**
- "how to start airbnb without owning property"
- "airbnb arbitrage success stories"
- "reduce taxes as w2 employee"
- "side income ideas for professionals"

---

## Implementation Timeline

### Week 1: Setup & Foundation
- [ ] Set up project structure
- [ ] Configure Tailwind CSS
- [ ] Create base HTML templates
- [ ] Implement semantic HTML structure
- [ ] Add all schema markup

### Week 2: Core Pages
- [ ] Build Homepage
- [ ] Build About page
- [ ] Build Programs page
- [ ] Build Success Stories page
- [ ] Implement navigation & footer

### Week 3: Blog System
- [ ] Create blog build script
- [ ] Create blog post template
- [ ] Migrate existing 5 case studies
- [ ] Generate RSS feed
- [ ] Set up blog index with pagination

### Week 4: Optimization & Launch
- [ ] Optimize all images to WebP/AVIF
- [ ] Implement critical CSS
- [ ] Add security headers
- [ ] Configure robots.txt & llms.txt
- [ ] Generate sitemap
- [ ] Test Core Web Vitals
- [ ] Deploy to production

### Ongoing
- [ ] Weekly blog content
- [ ] Monthly SEO audit
- [ ] Quarterly design refresh

---

## Success Metrics

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Lighthouse Performance | ~70 | 95+ | Launch |
| LCP | ~3s | < 1s | Launch |
| Organic Traffic | Baseline | +50% | 3 months |
| Blog Posts | 5 | 20 | 3 months |
| Indexed Pages | 10 | 30+ | 3 months |
| AI Citation Mentions | 0 | Tracking | 6 months |

---

## Files to Create

### HTML Pages
- `index.html`
- `about.html`
- `programs.html` (alias: `program.html`)
- `success-stories.html`
- `blog/index.html`
- `blog/[5 existing posts].html`

### Assets
- `assets/css/styles.css` (Tailwind compiled)
- `assets/js/main.js` (Minimal interactivity)
- `assets/images/` (All optimized images)

### Public Files
- `robots.txt`
- `llms.txt`
- `sitemap.xml`
- `rss.xml`
- `favicon.ico`

### Build Scripts
- `scripts/build-blog.js`
- `scripts/generate-sitemap.js`
- `scripts/generate-rss.js`
- `scripts/optimize-images.js`
- `scripts/validate-post.js`

### Templates
- `templates/blog-post.html`
- `content/blog/_template.md`

### CI/CD
- `.github/workflows/deploy.yml`

---

## Questions for Clarification

1. **Hosting Preference:** GitHub Pages, Netlify, Vercel, or custom hosting?
2. **Domain Management:** Keep current domain, or any changes planned?
3. **Analytics:** Google Analytics 4, Plausible, or other?
4. **Email Integration:** Which email service for newsletter signups?
5. **CTA Links:** Keep existing challengeoptin links or update?
6. **Video Embeds:** Continue with Vimeo, or switch to YouTube embeds?
7. **Design Preferences:** Keep current dark theme, or open to changes?

---

## References

- Current site: https://www.legacyinvestingshow.com
- Screenshots saved: `./analysis/`
- Images downloaded: `./assets/images/`
- Schema.org documentation: https://schema.org
- Core Web Vitals: https://web.dev/vitals/
- llms.txt spec: https://llmstxt.org
