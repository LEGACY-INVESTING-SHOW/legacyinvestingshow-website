# SEO, Blog Design & Technical Improvements Plan

> Comparative analysis of legacyinvestingshow.com vs tomosman.com with actionable improvements

**Date:** 2026-01-23
**Priority:** SEO (robots.txt, llms.txt) > Blog Design > Technical Setup

---

## Executive Summary

After analyzing both websites, your site (Legacy Investing Show) has **excellent technical SEO foundations** but needs improvements in:

1. **robots.txt** - Missing several AI crawler user agents that tomosman.com includes
2. **llms.txt** - Good structure but could be more comprehensive with direct links
3. **Blog Design** - Functional but lacks the visual polish and distinctive formatting of tomosman.com
4. **Content Formatting** - Blog posts have great SEO markup but weak visual hierarchy

**Key Finding:** Tom Osman's site uses a distinctive "tech transmission" aesthetic with strong visual identity. Your site is more generic - the blog feels like "a list of articles" rather than a curated experience.

---

## 1. ROBOTS.TXT Improvements

### Current State (Your Site)
```txt
User-agent: GPTBot
Allow: /blog/
Allow: /about.html
Allow: /llms.txt
```

### Missing AI Crawlers (Found on tomosman.com)

| Crawler | Purpose | Priority |
|---------|---------|----------|
| `OAI-SearchBot` | OpenAI's search bot | HIGH |
| `OAI-ImageBot` | OpenAI image training | MEDIUM |
| `Claude-Web` | Anthropic web access | HIGH |
| `anthropic-ai` | Anthropic training | HIGH |
| `Grok-bot` | X/Twitter's AI | MEDIUM |
| `AI2Bot` | Allen AI Institute | LOW |
| `cohere-ai` | Cohere LLM training | LOW |
| `meta-externalagent` | Meta AI | HIGH |
| `FacebookBot` | Meta crawling | MEDIUM |
| `LinkedInBot` | LinkedIn previews | MEDIUM |
| `Slackbot` | Slack unfurling | MEDIUM |
| `TelegramBot` | Telegram previews | LOW |
| `DiscordBot` | Discord embeds | LOW |
| `DuckDuckBot` | DuckDuckGo search | MEDIUM |
| `YandexBot` | Yandex search | LOW |

### Recommended robots.txt

```txt
# Robots.txt for Legacy Investing Show
# https://legacyinvestingshow.com
# Last updated: 2026-01-23

# Default rules for all crawlers
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /private/

# ===========================================
# SEARCH ENGINE CRAWLERS
# ===========================================

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: DuckDuckBot
Allow: /

User-agent: YandexBot
Allow: /

User-agent: Applebot
Allow: /

# ===========================================
# AI/LLM CRAWLERS
# ===========================================

# OpenAI
User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: OAI-ImageBot
Allow: /

User-agent: ChatGPT-User
Allow: /

# Anthropic (Claude)
User-agent: ClaudeBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: anthropic-ai
Allow: /

# Google AI
User-agent: Google-Extended
Allow: /

# Perplexity
User-agent: PerplexityBot
Allow: /

# X/Twitter
User-agent: Grok-bot
Allow: /

# Meta
User-agent: meta-externalagent
Allow: /

User-agent: FacebookBot
Allow: /

# Other AI
User-agent: cohere-ai
Allow: /

User-agent: AI2Bot
Allow: /

User-agent: Bytespider
Allow: /

# ===========================================
# SOCIAL MEDIA CRAWLERS
# ===========================================

User-agent: LinkedInBot
Allow: /

User-agent: Slackbot
Allow: /

User-agent: TelegramBot
Allow: /

User-agent: DiscordBot
Allow: /

User-agent: Twitterbot
Allow: /

# ===========================================
# SITEMAP & AI CONTEXT
# ===========================================

Sitemap: https://legacyinvestingshow.com/sitemap.xml

# AI agents: See /llms.txt for structured site context
# Full expanded context: /llms-full.txt
```

### Files to Create/Update

- `robots.txt` - Update with comprehensive crawler list
- Verify `llms-full.txt` exists (referenced but may not exist)

---

## 2. LLMS.TXT Improvements

### Current State
Your llms.txt is good but lacks:
- Direct links to success stories (just mentions them)
- Specific statistics about student results
- Clear content categories with URLs

### Recommended llms.txt Structure

```markdown
# Legacy Investing Show

> Empowering entrepreneurs to build wealth through Airbnb arbitrage and short-term rental investing. Over 2,000 students trained with $10M+ collective annual revenue.

Legacy Investing Show is the leading educational platform for Airbnb rental arbitrage. Founded by Preston Seo, we teach entrepreneurs how to build profitable short-term rental businesses without property ownership.

## Core Programs

- [3-Day Wealth Challenge](https://www.managemoney101.com/challengeoptin): Free introduction to Airbnb arbitrage
- [Programs Overview](https://legacyinvestingshow.com/programs.html): Full training and mentorship options

## Success Stories (30+ Documented Cases)

High-Revenue Results:
- [Gary: $35,000/Month with 7 Properties](https://legacyinvestingshow.com/blog/gary-marketing-executive-35k-month.html): Austin, TX - Marketing executive scaled to 7 units
- [Leo: $32,500/Month with 13 Properties](https://legacyinvestingshow.com/blog/2500-per-unit-13-properties.html): Cleveland - $2,500 average per unit
- [Chad: $90,000/Year from One Property](https://legacyinvestingshow.com/blog/chad-90k-year-one-property.html): North Florida single-property success
- [Rob: $27,200 in One Month](https://legacyinvestingshow.com/blog/rob-27200-one-month-2-airbnbs.html): Louisville & St. Simons with 2 properties

Quick-Start Results:
- [Dustin: $6,000/Month with Zero Experience](https://legacyinvestingshow.com/blog/6000-cash-flow-no-experience.html): Texas - Corporate sales to Airbnb in 4 weeks
- [Kayla: First Property in 7 Days](https://legacyinvestingshow.com/blog/dentist-airbnb-7-days-first-pitch.html): Cleveland dentist, $82K first year
- [Lindsay: $17,500 Bookings in Week 1](https://legacyinvestingshow.com/blog/couple-17500-secured-one-week.html): North Carolina cabin

Remote Operations:
- [Andrew: $2,500/Month Operating from US](https://legacyinvestingshow.com/blog/andrew-2500-airbnb-mexico-remote.html): Tulum, Mexico property managed remotely
- [James: $7,000/Month in 57 Days](https://legacyinvestingshow.com/blog/james-7k-month-3-properties-remote.html): 3 properties while working full-time

## Key Statistics

- Average student profit: $2,000-$8,000/month per property
- Average startup cost: $5,000-$15,000
- Time to first property: 2-6 weeks
- ROI timeline: 3-4 months

## About the Founder

- [About Preston Seo](https://legacyinvestingshow.com/about.html): Background, credentials, and story
- Social: @thelegacyshow (Instagram, TikTok), @LegacyInvestingShow (YouTube)

## Contact

- Website: https://legacyinvestingshow.com
- Email: info@legacyinvestingshow.com

## Optional

- [All Blog Posts](https://legacyinvestingshow.com/blog/): 33 success stories and guides
- [RSS Feed](https://legacyinvestingshow.com/feed.xml): Subscribe to updates
- [Full Documentation](https://legacyinvestingshow.com/llms-full.txt): Extended AI context

## Citation Format

Legacy Investing Show. "[Title]." legacyinvestingshow.com, [Date]. [URL]
```

### Create llms-full.txt

A more detailed version with:
- Full descriptions of each blog post
- Complete methodology breakdown
- Detailed student result statistics
- FAQ answers for common questions

---

## 3. BLOG DESIGN IMPROVEMENTS

### Current Problems

| Issue | Your Site | Tom Osman's Site |
|-------|-----------|------------------|
| Visual Identity | Generic, minimal | Strong "tech transmission" theme |
| Typography | Basic sans-serif | Distinctive dual-font (Playfair + Space Mono) |
| Blog Index Layout | Simple list with images | Grid layout with date stamps, hover effects |
| Post Cards | Horizontal image + text | Full-width cards with decorative corners |
| Visual Hierarchy | Flat, all posts look same | Clear date-based chronology |
| Interactive Elements | Category filter only | Hover states, animations, "READ_TRANSMISSION" CTAs |
| Color Accent | Emerald green | Neon cyan accent |

### Tom Osman's Key Design Patterns

1. **Bracketed Navigation**: `[Writing]` `[Tools]` - Reinforces tech identity
2. **Date Stamps**: Prominent `[Jan 23, 2026]` in accent color
3. **Monospace Accents**: Technical feel throughout
4. **Hover Corner Brackets**: Decorative corner appears on hover
5. **"Transmission Log" Framing**: Blog posts as "transmissions"
6. **Generous Whitespace**: Breathable, not cramped

### Recommended Blog Index Improvements

#### Option A: Enhanced Current Style (Simpler)

```css
/* Improved Post Cards */
.minimal-post-item {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 32px;
  padding: 40px 0;
  border-bottom: 1px solid var(--border);
  position: relative;
}

.minimal-post-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 3px;
  height: 0;
  background: var(--brand-primary);
  transition: height 0.3s ease;
}

.minimal-post-item:hover::before {
  height: 100%;
}

/* Add prominent date stamp */
.minimal-post-date {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  color: var(--brand-primary);
  font-weight: 600;
  letter-spacing: 0.05em;
}

/* Larger featured image */
.minimal-post-image {
  width: 280px;
  height: 180px;
  border-radius: 8px;
  overflow: hidden;
}

/* Stronger title hierarchy */
.minimal-post-title {
  font-size: 1.375rem;
  font-weight: 700;
  margin-bottom: 12px;
  line-height: 1.25;
}

/* Reading time badge */
.reading-time-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--muted);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
}
```

#### Option B: Tom Osman-Inspired Grid (More Distinctive)

```css
/* Full-width stacked cards */
.blog-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.blog-card {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 40px;
  padding: 32px;
  border-bottom: 1px solid var(--border);
  position: relative;
  transition: background 0.2s ease;
}

.blog-card:hover {
  background: var(--muted);
}

/* Decorative corner on hover */
.blog-card::after {
  content: '┐';
  position: absolute;
  top: 16px;
  right: 16px;
  font-family: monospace;
  opacity: 0;
  transition: opacity 0.2s ease;
  color: var(--brand-primary);
}

.blog-card:hover::after {
  opacity: 1;
}

/* Date column */
.blog-card-date {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  color: var(--brand-primary);
  font-weight: 500;
}

/* Content column */
.blog-card-title {
  font-size: 1.5rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: -0.02em;
  margin-bottom: 12px;
}

.blog-card-excerpt {
  font-size: 1rem;
  color: var(--text-muted);
  line-height: 1.6;
  margin-bottom: 16px;
}

/* CTA Button */
.blog-card-cta {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text);
  border: 1px solid var(--border);
  padding: 8px 16px;
  display: inline-block;
}
```

### Blog Post Page Improvements

#### Current Issues
- No table of contents for long posts (27+ min read)
- No reading progress indicator
- Statistics cards exist but are generic
- No pull quotes or visual breaks
- Missing estimated reading time in article view

#### Recommended Additions

```html
<!-- Reading Progress Bar -->
<div class="reading-progress">
  <div class="reading-progress-bar"></div>
</div>

<!-- Sticky Table of Contents -->
<aside class="toc-sidebar">
  <nav class="toc">
    <h4>In This Article</h4>
    <ul>
      <li><a href="#section-1">The Background</a></li>
      <li><a href="#section-2">Key Strategies</a></li>
      <li><a href="#section-3">Results Breakdown</a></li>
      <li><a href="#section-4">Lessons Learned</a></li>
    </ul>
  </nav>
</aside>

<!-- Pull Quote Styling -->
<blockquote class="pull-quote">
  <p>"I made 30-40 calls in one weekend and got 5 landlords interested."</p>
  <cite>— Dustin, $6,000/month cash flow</cite>
</blockquote>

<!-- Enhanced Statistics Card -->
<div class="stat-highlight">
  <div class="stat-number">$6,000</div>
  <div class="stat-label">Monthly Cash Flow</div>
  <div class="stat-context">From 2 properties in Texas</div>
</div>
```

#### CSS for New Elements

```css
/* Reading Progress */
.reading-progress {
  position: fixed;
  top: 64px;
  left: 0;
  width: 100%;
  height: 3px;
  background: var(--muted);
  z-index: 100;
}

.reading-progress-bar {
  height: 100%;
  background: var(--brand-primary);
  width: 0%;
  transition: width 0.1s ease;
}

/* Table of Contents */
.toc-sidebar {
  position: sticky;
  top: 100px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}

.toc {
  padding: 20px;
  background: var(--muted);
  border-radius: 8px;
}

.toc h4 {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  margin-bottom: 16px;
}

.toc ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.toc li {
  margin-bottom: 8px;
}

.toc a {
  font-size: 0.875rem;
  color: var(--text-secondary);
  text-decoration: none;
  padding: 4px 0;
  display: block;
  border-left: 2px solid transparent;
  padding-left: 12px;
}

.toc a:hover,
.toc a.active {
  color: var(--text);
  border-left-color: var(--brand-primary);
}

/* Pull Quote */
.pull-quote {
  margin: 48px 0;
  padding: 32px;
  background: var(--muted);
  border-left: 4px solid var(--brand-primary);
  border-radius: 0 8px 8px 0;
}

.pull-quote p {
  font-size: 1.25rem;
  font-weight: 500;
  line-height: 1.5;
  margin-bottom: 12px;
  color: var(--text);
}

.pull-quote cite {
  font-size: 0.875rem;
  color: var(--text-muted);
  font-style: normal;
}

/* Enhanced Stat Card */
.stat-highlight {
  text-align: center;
  padding: 32px;
  background: linear-gradient(135deg, var(--brand-primary-light) 0%, var(--brand-primary) 100%);
  border-radius: 12px;
  color: white;
  margin: 32px 0;
}

.stat-number {
  font-size: 3rem;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 4px;
}

.stat-context {
  font-size: 0.875rem;
  opacity: 0.9;
}
```

---

## 4. SITEMAP.XML Improvements

### Current Issues
- Uses `<changefreq>` and `<priority>` (Google ignores these)
- No sitemap index structure (will matter as blog grows)

### Recommended Changes

1. **Remove ignored tags** - Google doesn't use changefreq/priority
2. **Focus on accurate lastmod** - This is what matters
3. **Add video sitemap** - For YouTube embeds (future)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">

  <!-- Homepage -->
  <url>
    <loc>https://legacyinvestingshow.com/</loc>
    <lastmod>2026-01-23</lastmod>
  </url>

  <!-- Blog Post with Image (simplified) -->
  <url>
    <loc>https://legacyinvestingshow.com/blog/6000-cash-flow-no-experience.html</loc>
    <lastmod>2026-01-23</lastmod>
    <image:image>
      <image:loc>https://legacyinvestingshow.com/assets/images/blog/success-stories/dustin-no-experience.jpg</image:loc>
      <image:title>Dustin's Airbnb Success Story</image:title>
    </image:image>
  </url>

</urlset>
```

---

## 5. TECHNICAL IMPROVEMENTS

### Missing Files

| File | Status | Action |
|------|--------|--------|
| `/llms-full.txt` | Referenced but may not exist | Create comprehensive version |
| `/humans.txt` | Missing | Optional but nice for branding |
| `/security.txt` | Missing | Standard security contact file |

### vercel.json Enhancements

Your current config is solid. Consider adding:

```json
{
  "headers": [
    {
      "source": "/llms.txt",
      "headers": [
        {
          "key": "Content-Type",
          "value": "text/plain; charset=utf-8"
        }
      ]
    },
    {
      "source": "/llms-full.txt",
      "headers": [
        {
          "key": "Content-Type",
          "value": "text/plain; charset=utf-8"
        }
      ]
    }
  ]
}
```

### Schema Markup Improvements

Your current Article schema is excellent. Consider adding:

1. **Speakable schema** - Already present, good!
2. **VideoObject** - For YouTube embeds in posts
3. **HowTo schema** - For tutorial-style content

---

## 6. PRIORITY IMPLEMENTATION ORDER

### Phase 1: SEO Critical (Do First)
1. [ ] Update `robots.txt` with comprehensive AI crawler list
2. [ ] Update `llms.txt` with direct links to success stories
3. [ ] Create `llms-full.txt` with expanded context
4. [ ] Remove `<changefreq>` and `<priority>` from sitemap (script update)

### Phase 2: Blog Design (High Impact)
5. [ ] Add reading progress bar to blog posts
6. [ ] Implement sticky table of contents for long posts
7. [ ] Add pull quote styling for key testimonials
8. [ ] Enhance blog index with larger images and date stamps
9. [ ] Add reading time calculation to blog template

### Phase 3: Visual Polish (Medium Impact)
10. [ ] Consider adding monospace font for accents (optional)
11. [ ] Add hover effects to blog cards
12. [ ] Implement decorative corner brackets on hover (optional)
13. [ ] Add subtle animations to statistics cards

### Phase 4: Future Improvements
14. [ ] Create video sitemap for YouTube content
15. [ ] Add dark mode support
16. [ ] Implement search functionality for blog

---

## 7. FILES TO MODIFY

| File | Changes |
|------|---------|
| `/robots.txt` | Add 15+ new AI crawler user agents |
| `/llms.txt` | Add direct links, statistics, structured categories |
| `/llms-full.txt` | Create new file with comprehensive context |
| `/scripts/generate-sitemap.js` | Remove changefreq/priority tags |
| `/assets/css/input.css` | Add reading progress, TOC, pull quote styles |
| `/scripts/build-blog.js` | Add TOC generation, reading progress JS |
| `/templates/blog-post.html` | Add TOC, reading progress elements |

---

## 8. SUCCESS METRICS

After implementation, track:

1. **AI Citation Rate** - Are AI tools citing your content?
2. **Search Console Crawl Stats** - Are AI bots crawling more?
3. **Blog Engagement** - Time on page, scroll depth
4. **Core Web Vitals** - Ensure changes don't hurt performance

---

## References

### External Sources
- [llmstxt.org - Official Specification](https://llmstxt.org/)
- [Google Search Central - Robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/intro)
- [Search Engine Journal - AI Crawler User Agents](https://www.searchenginejournal.com/ai-crawler-user-agents-list/558130/)
- [Backlinko - GEO Guide](https://backlinko.com/generative-engine-optimization-geo)

### Internal References
- `robots.txt` - Current configuration
- `llms.txt` - Current AI context file
- `/assets/css/input.css:652-949` - Blog styling
- `/scripts/build-blog.js` - Blog generation
- `/scripts/generate-sitemap.js` - Sitemap generation
