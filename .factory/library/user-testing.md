# User Testing

Testing surface, required testing skills/tools, and resource cost classification per surface.

## Validation Surface

**Primary surface: Browser (web application)**

The Legacy Investing Show website is a static site served at `http://localhost:3000`. Validation involves:

1. **Blog Index Page** (`/blog`) — Verify category filter shows "Wealth Plan", posts appear in grid
2. **Individual Blog Posts** (`/blog/{slug}`) — Verify rendering, formatting, disclaimer, statistics cards, FAQ accordion, related posts, author bio
3. **SEO Meta Tags** — Verify `<title>`, `<meta name="description">`, canonical, Open Graph, Twitter Card, Schema.org JSON-LD
4. **Sitemap** (`/sitemap.xml`) — Verify new posts are included
5. **RSS Feed** (`/feed.xml`) — Verify new posts are included
6. **Build Process** — Verify `npm run build` completes without errors

**Secondary surface: Filesystem**

- Verify markdown files in `content/blog/` have correct frontmatter
- Verify no PII (full names) in generated content
- Verify word count (3,000-5,000 words)
- Verify disclaimer is present in every post

**Tertiary surface: Shell commands**

- `python3 scripts/wealth-plan-pipeline/run.py scan-pii content/blog/` — PII scanner
- `npm run build:blog` — Blog build
- `npm run build:sitemap` — Sitemap generation
- `npm run build:rss` — RSS feed generation
- Word count checks via shell scripts

## Required Testing Skills/Tools

- **agent-browser** — Primary validation tool for rendering, SEO, and interactive checks on localhost:3000
- **Shell commands** — `npm run build`, `grep` for PII sweep, word count checks, frontmatter validation
- **Python scripts** — `scripts/wealth-plan-pipeline/run.py scan-pii` for batch PII verification

## Resource Cost Classification

**Surface: Browser (localhost:3000)**

- The site is lightweight static HTML
- Dev server (`npm run start`) uses ~50-100 MB RAM
- Each agent-browser instance uses ~300 MB
- Machine has 16 GB total RAM, 8 CPUs
- Available headroom: ~8 GB (after system + dev server)
- **Max concurrent validators: 5** (lightweight app, minimal per-instance overhead)

**Surface: Filesystem commands**

- Negligible resource cost
- **Max concurrent: 5** (no meaningful resource constraints)

**Surface: Shell commands (build, PII scan)**

- `npm run build` uses moderate CPU for ~30 seconds
- PII scan is lightweight
- **Max concurrent: 3** for build operations (CPU-bound)

## Testing Notes

- Start dev server with `npm run start` before browser testing
- Build must be run first: `npm run build`
- Wealth plan posts are in the "Wealth Plan" category on the blog index
- The disclaimer should appear as a styled callout box at the top of each post
- Statistics cards should render with icons and values
- FAQ accordion should expand/collapse on click
- Currently 1 build error exists (ian-wealth-plan.md) — this will be fixed in M-Fix
- Known safe PII false positives: "Personalized Wealth", "Financial Independence", "Preston Seo", "Legacy Investing Show", etc.
