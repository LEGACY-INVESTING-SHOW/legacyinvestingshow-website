# User Testing

Testing surface, required testing skills/tools, and resource cost classification.

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

## Required Testing Skills/Tools

- **agent-browser** — Primary validation tool for rendering, SEO, and interactive checks
- **Shell commands** — `npm run build`, `grep` for PII sweep, word count checks
- **Python scripts** — For batch PII verification across all generated files

## Resource Cost Classification

**Surface: Browser (localhost:3000)**

- The site is lightweight static HTML
- Dev server (`npm run start`) uses ~50-100 MB RAM
- Each agent-browser instance uses ~300 MB
- Machine has adequate resources for 5 concurrent validators

**Max concurrent validators: 5** (lightweight app, minimal per-instance overhead)

**Surface: Filesystem commands**

- Negligible resource cost
- Max concurrent: 5 (no meaningful resource constraints)

## Testing Notes

- Start dev server with `npm run start` before browser testing
- Build must be run first: `npm run build`
- Wealth plan posts are in the "Wealth Plan" category on the blog index
- The disclaimer should appear as a styled callout box at the top of each post
- Statistics cards should render with icons and values
- FAQ accordion should expand/collapse on click
