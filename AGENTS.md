# AGENTS.md

> Guidelines for AI agents working on the Legacy Investing Show website

## Project Overview

Static website for Legacy Investing Show - financial education programs, Airbnb arbitrage success stories, and wealth-building resources. Built with HTML5, Tailwind CSS v3, and Node.js build scripts. The site features a sophisticated multi-layered SEO architecture with blogs, tax strategies, retirement guides, programmatic city pages, and persona-based content.

## Recovery Workflow Lock (2026-02-07)

- **Canonical source-of-truth repo:** `/Users/deveshdhardubey/legacyinvestingshow website`
- **Canonical blog content source:** `content/blog/*.md`
- **Eleventy CMS workspace:** `cms/` (inside this repository)
- **Do not generate standalone production HTML with ad-hoc prompts/skills.** Generate markdown/data only, then render through templates/build pipeline.
- If content is produced outside this repo, it must be imported as markdown into `content/blog/` (or synchronized into Eleventy `src/blog/`) before publishing.

## Build & Development Commands

```bash
# Development - watch Tailwind CSS (runs in background)
npm run dev

# Serve site locally (separate terminal, starts at http://localhost:3000)
npm run start

# Full production build (runs all build steps in sequence)
npm run build

# Individual build steps
npm run build:css        # Minify Tailwind CSS (NODE_ENV=production)
npm run build:blog       # Generate blog HTML from markdown in content/blog/
npm run build:tax-strategies  # Generate tax strategy pages from data
npm run build:sitemap    # Generate sitemap.xml
npm run build:rss        # Generate RSS feed (feed.xml)
npm run build:images     # Optimize images with Sharp
```

**Important Notes:**
- There is no formal test suite. Test changes manually by running `npm run start` and visiting `http://localhost:3000`
- **Always run `npm run build` after editing templates, markdown, or data files**
- The build system generates HTML from templates - never manually edit generated HTML files

## Tech Stack

- **HTML5** - Semantic markup with accessibility best practices
- **Tailwind CSS v3** - Utility-first CSS framework
- **Node.js 18+** - Build scripts (CommonJS, not ES modules)
- **Sharp** - Image optimization
- **Marked** - Markdown parsing for blog posts
- **Gray Matter** - YAML frontmatter parsing

## Content Architecture Overview

The website uses a multi-layered content strategy with 4 distinct content types:

### 1. Blog Posts (Generated from Markdown)
**Source:** `content/blog/*.md` → **Output:** `blog/*.html`

Blog posts are written in Markdown with YAML frontmatter and processed through templates.

**Example Frontmatter:**
```yaml
---
title: "Getting Started with Airbnb Arbitrage: Complete Beginner's Guide"
description: "Learn how to start an Airbnb arbitrage business with no property ownership required."
date: "2025-01-20"
author: "Preston Seo"
category: "Airbnb Arbitrage"
image: /assets/images/blog/airbnb-arbitrage-guide.jpg
featured: true  # Marks as featured on blog index
slug: "getting-started-airbnb-arbitrage"  # Optional, defaults to filename
---
```

**Blog Categories:**
- Airbnb Arbitrage (success stories, guides, strategies)
- Investing (general wealth-building content)
- Tax Strategies (tax-related content)
- Real Estate (property investment)

**Success Story Blog Format:**
Most blog posts are YouTube success stories converted to written format. Naming convention: `[student-name]-[achievement]-[location].html`
Examples:
- `tom-zero-to-25k-two-weeks.html`
- `kiana-replaced-finance-job-airbnb.html`
- `jeff-8k-month-texas-airbnb.html`

### 2. Tax Strategy Pages (Programmatic SEO - Pillar Pages)
**Source:** `data/tax-strategies.json` → **Output:** `tax-strategies/*.html`

Comprehensive guides on tax reduction strategies. 40+ pages covering:

**Core Tax Strategies:**
- Cost Segregation (`cost-segregation.html`)
- 1031 Exchange (`1031-exchange.html`)
- Short-Term Rental Loophole (`short-term-rental-loophole.html`)
- Bonus Depreciation (`bonus-depreciation.html`)
- Real Estate Professional Status (`real-estate-professional-status.html`)
- Backdoor Roth IRA (`backdoor-roth-ira.html`)
- HSA Triple Tax Advantage (`hsa-strategy.html`)
- Augusta Rule (`augusta-rule.html`)
- S-Corp Strategy (`s-corp-strategy.html`)
- Opportunity Zones (`opportunity-zones.html`)
- Solo 401(k) (`solo-401k.html`)
- And 30+ more...

**Tax Strategy JSON Structure:**
```json
{
  "strategies": [
    {
      "slug": "cost-segregation",
      "title": "Cost Segregation",
      "shortDescription": "Accelerate depreciation on rental properties",
      "fullDescription": "Full explanation of the strategy...",
      "keywords": ["cost segregation", "accelerated depreciation"],
      "benefitsFor": ["Real estate investors", "Airbnb hosts"],
      "potentialSavings": "$20,000 - $100,000+ in year one",
      "complexity": "Advanced",
      "professionalRequired": true,
      "irsReference": "IRC Section 168",
      "relatedStrategies": ["bonus-depreciation", "1031-exchange"],
      "faqs": [...]
    }
  ],
  "personas": [
    {
      "slug": "w2-employees",
      "title": "W-2 Employees",
      "topStrategies": ["short-term-rental-loophole", "hsa-strategy"]
    }
  ]
}
```

**Persona-Specific Pages:**
`tax-strategies/for/*.html` - Targeted advice for:
- Airbnb Hosts (`airbnb-hosts.html`)
- Real Estate Investors (`real-estate-investors.html`)
- W-2 Employees (`w2-employees.html`)
- Self-Employed (`self-employed.html`)
- Business Owners (`business-owners.html`)
- High-Income Earners (`high-income-earners.html`)

### 3. Retirement Pages
**Output:** `retirement/*.html`

Comprehensive retirement planning guides:
- 401(k) Contribution Strategies (`401k-contribution-strategies.html`)
- SEP IRA Guide (`sep-ira-guide.html`)
- SIMPLE IRA Guide (`simple-ira-guide.html`)
- Traditional vs Roth 401(k) (`traditional-vs-roth-401k.html`)
- Defined Benefit Plan (`defined-benefit-plan.html`)

### 4. Topic Hub Pages (SEO Pillar Content)
**Output:** `topics/*.html`

High-level category overview pages:
- Airbnb Arbitrage (`airbnb-arbitrage.html`)
- Tax Strategies (`tax-strategies.html`)
- Investing (`investing.html`)
- Retirement (`retirement.html`)
- Business Structures (`business-structures.html`)
- Debt Management (`debt-management.html`)

### 5. Programmatic SEO Pages (Generated from Data)
**Source:** `data/*.json` → **Output:** `programmatic-pages/**/*.html`

**Three types of programmatic pages:**

**a) City Pages** (`programmatic-pages/cities/*.html`)
Location-specific tax strategies. Generated from `data/cities.json`:
- Austin, TX (`austin-tx.html`)
- Nashville, TN (`nashville-tn.html`)
- Miami, FL (`miami-fl.html`)
- Phoenix, AZ (`phoenix-az.html`)
- Denver, CO (`denver-co.html`)
- And 10+ more major markets

**b) Persona Pages** (`programmatic-pages/personas/*.html`)
Audience-specific guidance:
- Airbnb Hosts (`airbnb-hosts.html`)
- Real Estate Investors (`real-estate-investors.html`)
- Self-Employed (`self-employed.html`)
- High-Income Earners (`high-income-earners.html`)
- Small Business Owners (`small-business-owners.html`)
- Retirement Savers (`retirement-savers.html`)

**c) Comparison Pages** (`programmatic-pages/comparisons/*.html`)
Head-to-head strategy comparisons.

### 6. Static Core Pages
- `index.html` - Homepage
- `about.html` - About Preston Seo
- `programs.html` - Training programs overview
- `success-stories.html` - Student success showcase
- `tax-strategies-101.html` - Tax strategies landing page

## Data Files Reference

### Content Data
- `data/tax-strategies.json` - 40+ tax strategies with metadata, FAQs, personas
- `data/cities.json` - 15 major US markets for programmatic SEO
- `data/topics.json` - 30+ content topic ideas (guides, comparisons, listicles)
- `data/seo-topics-100.json` - 100 topic pipeline with generation status
- `data/youtube-queue.json` - YouTube video automation queue

### Example Cities Data Structure:
```json
{
  "cities": [
    {
      "city": "Austin",
      "state": "TX",
      "region": "Southwest",
      "priority": 1,
      "status": "pending",
      "notes": "Strong tech economy, major events (SXSW, ACL)"
    }
  ]
}
```

## Build Scripts Detailed

### `scripts/build-blog.js`
**Purpose:** Converts markdown blog posts to HTML

**Process:**
1. Reads all `.md` files from `content/blog/`
2. Parses YAML frontmatter with gray-matter
3. Converts markdown to HTML with marked
4. Applies template from `templates/blog-post.html`
5. Generates individual post pages in `blog/`
6. Generates `blog/index.html` with post listings

**Features:**
- Automatic read time calculation (200 words/minute)
- Table of Contents generation for articles >1500 words
- Related posts (same category)
- Statistics cards from frontmatter
- FAQ accordions with Schema markup
- Schema.org JSON-LD (Article, BreadcrumbList, FAQPage)

### `scripts/generate-sitemap.js`
**Purpose:** Generates SEO-optimized sitemap.xml

**Includes:**
- Static pages (index.html, about.html, etc.)
- Topic hub pages (topics/*.html)
- Blog posts with images (blog/*.html)
- Tax strategies (tax-strategies/*.html)
- Retirement guides (retirement/*.html)
- Programmatic pages with lastmod dates

### `scripts/generate-rss.js`
**Purpose:** Generates RSS feed (feed.xml) for blog syndication

### `scripts/build-tax-strategies.js`
**Purpose:** Generates tax strategy HTML pages from `data/tax-strategies.json`

### `scripts/generate-programmatic-seo.js`
**Purpose:** Generates city, persona, and comparison pages from data

### `scripts/youtube-to-blog.js`
**Purpose:** Automated YouTube-to-blog conversion (currently placeholder)

**Process:**
1. Fetches recent videos from YouTube RSS feed
2. Checks against `.youtube-state.json` (tracks processed videos)
3. Gets transcript (requires transcript service integration)
4. Generates blog post from template
5. Saves to `blog/` directory
6. Runs `npm run build` to update sitemap

**Setup Required:**
- Set `YT_CHANNEL_ID` environment variable
- Integrate transcript service (youtube-transcript-api, AssemblyAI, or Whisper)
- Configure cron job to run weekly

### `scripts/build-missing-posts.js`
**Purpose:** One-off script to generate HTML for markdown files missing HTML versions

## YouTube Video Content System

### Video-to-Blog Workflow
1. Videos published on YouTube (Success Stories playlist)
2. `youtube-to-blog.js` detects new videos via RSS feed
3. Transcript is generated (manual or automated)
4. Blog post created in `content/blog/` with frontmatter
5. Run `npm run build:blog` to generate HTML
6. Post appears on blog index with video embed

### Video Playlist Structure (`data/youtube-queue.json`)
```json
{
  "playlists": {
    "successStories": "PLDe1awSN88zj_V-Y-cUuKDTw6N9KWLk7C",
    "mainChannel": "@LegacyInvestingShow"
  },
  "videos": [...]
}
```

## Content Planning & Pipeline

### Topic Research Data
**File:** `data/topics.json`

Contains 30+ content ideas organized by type:
- **Guides:** Pillar content (e.g., "Complete Guide to Airbnb Arbitrage")
- **Comparisons:** vs articles (e.g., "Airbnb Arbitrage vs Buying Rental Property")
- **Listicles:** List format (e.g., "10 Best Cities for Airbnb Arbitrage")

Each topic includes:
- Primary keywords for SEO
- Content type (pillar/cluster/comparison/listicle)
- Priority ranking
- Status (pending/processing/completed)

### 100-Topic SEO Pipeline
**File:** `data/seo-topics-100.json`

Comprehensive content roadmap across 6 categories:
- Tax Strategies (25 topics) ✅ Completed
- Retirement Planning (20 topics)
- Business Structures (15 topics)
- Investing (20 topics)
- Debt Management (10 topics)
- Passive Income (10 topics)

**Target specifications:**
- 3,000-5,000 words per article
- 12 mandatory sections (Hook → Definition → Personas → Step-by-step → Calculations → Strategies → Mistakes → Comparison → Tools → FAQ → CTA)
- Model: Claude Haiku for generation

## SEO Requirements

Every HTML page must include:

### Meta Tags
```html
<title>[Page Title] | Legacy Investing Show</title>
<meta name="description" content="150-160 character description">
<meta name="keywords" content="relevant, keywords">
<link rel="canonical" href="https://site.com/page-path">
```

### Open Graph
```html
<meta property="og:type" content="article">
<meta property="og:title" content="Page Title">
<meta property="og:description" content="Description">
<meta property="og:image" content="/assets/images/og-image.jpg">
<meta property="og:url" content="https://site.com/page-path">
```

### Twitter Cards
```html
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Page Title">
<meta name="twitter:description" content="Description">
<meta name="twitter:image" content="/assets/images/og-image.jpg">
```

### Schema.org JSON-LD
Required schemas:
- **Article** - For blog posts (with author, publisher, datePublished)
- **BreadcrumbList** - Navigation breadcrumbs
- **FAQPage** - For FAQ sections
- **Organization** - Site-wide in footer

### Heading Hierarchy
- Single H1 per page (page title)
- Logical H2 → H3 → H4 progression
- No skipped levels

### Image Requirements
- All images must have descriptive `alt` attributes
- Use `loading="lazy"` for below-fold images
- WebP format preferred
- Include width/height attributes to prevent CLS

### Internal Linking
- Link to related content within articles
- Use descriptive anchor text
- Tax strategy pages link to related strategies
- Persona pages link to relevant strategies

## Code Style Guidelines

### JavaScript (Build Scripts)

**Module System:** CommonJS only (`require`/`module.exports`)

**Indentation:** 4 spaces

**Naming:**
- `camelCase` for variables and functions
- `UPPER_SNAKE_CASE` for true constants
- `kebab-case` for filenames

**Formatting:**
- Semicolons required at end of statements
- Single quotes for strings
- Template literals for multi-line strings

**Example:**
```javascript
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT_DIR, 'content', 'blog');

/**
 * Generate slug from filename
 * @param {string} filename - The markdown filename
 * @returns {string} The URL-friendly slug
 */
function generateSlug(filename) {
    return filename.replace(/\.md$/, '');
}

module.exports = { generateSlug };
```

**Error Handling:**
- Always check if files exist before reading
- Use try-catch with descriptive messages
- Log errors with file paths for debugging
- Use `process.exit(1)` on fatal errors

### HTML

**Indentation:** 2 spaces

**Structure:**
- Semantic HTML5 elements (`<header>`, `<main>`, `<section>`, `<article>`)
- Skip-to-content link for accessibility
- Proper heading hierarchy

**Attributes:**
- Use double quotes for attributes
- Include `alt` on all images
- Use `aria-label` and `role` for accessibility
- Add `loading="lazy"` for below-fold images

### CSS (Tailwind)

**Brand Colors** (defined in `tailwind.config.js`):
- Primary: `#059669` (Emerald 600)
- Accent: `#CA8A04` (Yellow 600)
- Text: `#111827` (Gray 900)
- Use semantic color names, not arbitrary values

**Responsive Design:**
- Mobile-first approach
- Use Tailwind breakpoints (`md:`, `lg:`, `xl:`)
- Test on mobile devices

**Animations:**
- Use predefined keyframes from tailwind.config.js
- Prefer `fade-in`, `slide-up`, `scale-in` animations

### Markdown (Blog Posts)

**Frontmatter:**
```yaml
---
title: "Title in Title Case"
description: "SEO meta description (150-160 chars)"
date: "YYYY-MM-DD"
author: "Preston Seo"
category: "Category Name"
image: /assets/images/blog/image.jpg
featured: true  # Optional - marks as featured
---
```

**Content Format:**
- Use H2 for main sections, H3 for subsections
- Include 3-5 key statistics in frontmatter when available
- Add FAQ section at end (optional)
- Keep paragraphs short (2-3 sentences)
- Use bullet points for lists

## Project Structure

```
legacyinvestingshow-website/
│
├── index.html                    # Homepage
├── about.html                    # About Preston Seo
├── programs.html                 # Training programs
├── success-stories.html          # Student results
├── tax-strategies-101.html       # Tax strategies landing
│
├── blog/                         # Generated blog HTML
│   ├── index.html               # Blog listing page
│   └── *.html                   # Individual blog posts
│
├── content/                      # Source content
│   └── blog/                    # Markdown blog sources (45+ files)
│       └── *.md
│
├── templates/                    # HTML templates
│   ├── blog-post.html           # Blog post template
│   ├── tax-strategy.html        # Tax strategy template
│   └── picture-element.html     # Responsive image template
│
├── scripts/                      # Build scripts
│   ├── build-blog.js            # Main blog generator
│   ├── build-tax-strategies.js  # Tax strategy generator
│   ├── generate-sitemap.js      # Sitemap generator
│   ├── generate-rss.js          # RSS feed generator
│   ├── generate-programmatic-seo.js  # Programmatic pages
│   ├── youtube-to-blog.js       # YouTube automation
│   └── build-missing-posts.js   # One-off blog generator
│
├── assets/
│   ├── css/
│   │   ├── input.css            # Tailwind input file
│   │   └── styles.css           # Compiled output (DO NOT EDIT)
│   ├── images/                  # Image assets
│   └── js/
│       └── main.js              # Site JavaScript
│
├── data/                        # JSON data sources
│   ├── tax-strategies.json      # 40+ tax strategies
│   ├── cities.json              # 15 US markets
│   ├── topics.json              # 30+ content topics
│   ├── seo-topics-100.json      # 100-topic pipeline
│   └── youtube-queue.json       # YouTube automation
│
├── tax-strategies/              # Tax strategy pages (40+ files)
│   ├── index.html              # Category index
│   ├── for/                    # Persona-specific pages
│   │   ├── airbnb-hosts.html
│   │   ├── real-estate-investors.html
│   │   └── ...
│   └── *.html                  # Individual strategies
│
├── retirement/                  # Retirement guides (5 files)
│   ├── 401k-contribution-strategies.html
│   ├── sep-ira-guide.html
│   └── ...
│
├── topics/                      # Topic hub pages (6 files)
│   ├── airbnb-arbitrage.html
│   ├── tax-strategies.html
│   └── ...
│
├── programmatic-pages/          # Generated programmatic SEO
│   ├── cities/                  # 15 city pages
│   ├── personas/                # 6 persona pages
│   └── comparisons/             # Comparison pages
│
├── sitemap.xml                  # Generated sitemap
├── feed.xml                     # Generated RSS feed
├── robots.txt                   # Crawler directives
├── llms.txt                     # LLM context file
├── llms-full.txt                # Full LLM context
├── vercel.json                  # Vercel configuration
├── tailwind.config.js           # Tailwind configuration
└── package.json                 # Dependencies
```

## Environment Variables

Copy `.env.example` to `.env` and set:

```bash
SITE_URL=https://www.legacyinvestingshow.com
YOUTUBE_API_KEY=your_key_here  # For YouTube automation
YT_CHANNEL_ID=your_channel_id  # For YouTube automation
```

## Deployment

**Platform:** Vercel

**Settings:**
- Build Command: `npm run build`
- Output Directory: `.` (root)
- Framework Preset: `Other`

**Manual Deployment:**
```bash
vercel --prod
```

## Important Workflow Notes

### Content Creation Workflow
1. **Write** markdown in `content/blog/`
2. **Run** `npm run build:blog` to generate HTML
3. **Run** `npm run build:sitemap` to update sitemap
4. **Test** locally with `npm run start`
5. **Commit** all changes (including generated files)
6. **Deploy** to Vercel

### Tax Strategy Workflow
1. **Add** strategy to `data/tax-strategies.json`
2. **Run** `npm run build:tax-strategies`
3. **Run** `npm run build`
4. **Test** and deploy

### Programmatic SEO Workflow
1. **Update** data files (cities.json, etc.)
2. **Run** `node scripts/generate-programmatic-seo.js`
3. **Run** `npm run build`
4. **Review** generated pages
5. **Deploy**

## Common Tasks

### Add a New Blog Post
```bash
# 1. Create markdown file
echo "---
title: \"Your Title\"
description: \"SEO description\"
date: \"$(date +%Y-%m-%d)\"
author: \"Preston Seo\"
category: \"Airbnb Arbitrage\"
image: /assets/images/blog/your-image.jpg
---

Your content here." > content/blog/your-post-slug.md

# 2. Build
npm run build:blog
npm run build:sitemap

# 3. Test
npm run start
```

### Add a New Tax Strategy
1. Edit `data/tax-strategies.json`
2. Add entry to `strategies` array
3. Run `npm run build:tax-strategies`
4. Run `npm run build`

### Update Existing Content
1. Edit source file (markdown or JSON)
2. Run appropriate build command
3. Test locally
4. Commit and deploy

## Troubleshooting

### Build Errors
- Check that all dependencies are installed: `npm install`
- Verify Node.js version: `node --version` (should be 18+)
- Check file paths are correct in scripts
- Look for syntax errors in JSON data files

### Missing Blog Posts
- Check `content/blog/` for markdown files
- Run `node scripts/build-missing-posts.js` to find gaps
- Verify frontmatter is valid YAML

### Styling Issues
- Ensure `npm run dev` is running in development
- Check browser console for CSS errors
- Verify Tailwind classes exist in config

### YouTube Automation Not Working
- Verify `YT_CHANNEL_ID` is set correctly
- Check YouTube channel has public videos
- Ensure transcript service is integrated
- Check `.youtube-state.json` for processed videos

## File Naming Conventions

- **Blog posts:** `descriptive-slug.md` → generates `descriptive-slug.html`
- **Tax strategies:** `kebab-case.html` (e.g., `cost-segregation.html`)
- **Images:** `descriptive-kebab-case.webp` or `.jpg`
- **Scripts:** `kebab-case.js` (e.g., `build-blog.js`)
- **Data files:** `kebab-case.json`
- **Templates:** `kebab-case.html`

## Performance Guidelines

- Use WebP images when possible
- Lazy load below-fold images
- Minimize JavaScript on static pages
- Use semantic HTML for better crawling
- Keep DOM depth reasonable
- Preconnect to external domains (fonts, analytics)

## Accessibility Requirements

- Skip-to-content link
- Proper heading hierarchy
- Alt text on all images
- ARIA labels where needed
- Focus indicators on interactive elements
- Color contrast WCAG 2.1 AA compliant
- Keyboard navigation support

## Legal & Compliance

- Include disclaimers on tax content (not financial advice)
- Privacy policy linked in footer
- Terms of service for programs
- Cookie consent if using analytics
- Proper attribution for images

## Repo & Deployment Context

- **Local repo path:** `/Users/deveshdhardubey/legacyinvestingshow-website`
- **Canonical GitHub repo:** `https://github.com/LEGACY-INVESTING-SHOW/legacyinvestingshow-website`
- **Git remote name:** `origin`
- **Default branch:** `main`
- **GitHub profile:** `https://github.com/Deveshwy`
- **Correct Vercel project dashboard:** `https://vercel.com/legacy-investing-show/legacyinvestingshow`
- **Correct production domain:** `https://www.legacyinvestingshow.com`
- **Current linked Vercel project in this repo:** `.vercel/project.json`

### Deployment Rules

- **Do not create a new Vercel project for this repo.**
- Always deploy to the existing Vercel project: `legacyinvestingshow`
- Do not relink this repo to a different Vercel project unless the user explicitly asks.
- Do not run `vercel project add` for this repo.
- If a manual deploy is needed, make sure `.vercel/project.json` still points to the existing `legacyinvestingshow` project before deploying.

### Correct Publish Workflow

1. Make changes in source files, especially `content/blog/*.md` for blog posts.
2. Run the required build steps locally. For full-site changes, use `npm run build`.
3. Verify locally with `npm run start`.
4. Commit only the intended files.
5. Push to `origin main`.
6. Let the existing GitHub-connected Vercel project deploy from `main`, or run a manual production deploy only against the existing `legacyinvestingshow` project.

### Manual Deploy Notes

- Safe manual production deploy command:
  `vercel --prod`
- Run manual deploys only from this repo when `.vercel/project.json` is present and correct.
- After deploy, verify the production URL on `https://www.legacyinvestingshow.com`, not just a preview URL.

### Blog URL Pattern

- Blog source lives in `content/blog/<slug>.md`
- Generated page URL is:
  `https://www.legacyinvestingshow.com/blog/<slug>`
- The site uses clean URLs. Do not hand out `.html` blog URLs unless specifically needed for filesystem debugging.

## Cursor Cloud specific instructions

This is a static site (HTML + Tailwind CSS v3 + Node CommonJS build scripts) plus an Eleventy CMS workspace in `cms/`. There is no application server or database. The startup update script runs `npm install` at the repo root and `npm install --prefix cms`; both are required because `cms/` has its own `package.json` and the full build depends on Eleventy.

Standard commands live in `package.json` scripts and the `## Build & Development Commands` section above. Non-obvious caveats for future agents:

- **Run the site in dev:** start `npm run dev` (Tailwind watch, rebuilds `assets/css/styles.css`) and `npm run start` (`npx serve .`, serves the repo root at `http://localhost:3000`) in two separate long-running terminals. `npm run start` serves whatever static HTML already exists — it does not build; run the relevant `build:*` step first if you changed source.
- **Lint/test are lightweight:** `npm run lint` is just `node --check` syntax checks on a couple of scripts, and `npm run test` runs `node --test tests/*.test.js` (a few unit tests). Neither covers the generated HTML.
- **`npm run build` runs the entire SEO pipeline** (CSS, blog, full `cms:verify` Eleventy chain, tax strategies, programmatic pages, sitemap, RSS, etc.) and rewrites hundreds of generated HTML files plus `sitemap*.xml` and `feed.xml`. Expect a very large `git diff` after a build; only commit generated files intentionally, never as a side effect of unrelated work.
- **Harmless build warning:** `build:tools` (`import-calculators.js`) logs `calculator app not found at /Users/deveshdhardubey/calcs2; keeping committed tools/ artifacts.` This is expected in cloud/CI — that path only exists on the original author's machine. The step keeps the committed `tools/` artifacts and does not fail the build.
- **CMS build wipes and regenerates** `cms/_site/blog` and republishes into `blog/*.html`; `cms:verify` enforces byte-level parity between `content/blog/*.md` (canonical) and `cms/src/blog/*.md`. Edit canonical markdown in `content/blog/`, not the CMS copies.
