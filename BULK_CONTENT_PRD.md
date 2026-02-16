# Bulk Content Generation PRD

## Objective
Generate 100+ high-quality blog posts and programmatic SEO pages for Legacy Investing Show website to dominate search rankings for wealth-building, real estate investing, and tax optimization keywords.

## Tasks

### Phase 1: Blog Posts (Target: 100 posts)
Generate blog posts in `/content/blog/` following the existing format:

#### Content Categories to Cover:
1. **Success Stories** (25 posts) - Real student case studies with numbers
2. **How-To Guides** (25 posts) - Step-by-step tutorials
3. **Strategy Deep-Dives** (20 posts) - Detailed tax/real estate strategies
4. **Mindset/Psychology** (15 posts) - Wealth mindset, habits, discipline
5. **Market Analysis** (15 posts) - Location-specific opportunities, trends

#### Each Blog Post Must Include:
- Full frontmatter (title, description, date, author, SEO keywords, schema)
- 2,000-4,000 words of high-quality content
- Proper markdown formatting (H2, H3, lists, tables)
- Internal links to existing content
- Call-to-action at the end
- Real, specific examples and numbers (not generic fluff)

#### Target Keywords:
- "airbnb arbitrage [city/state]"
- "how to make $X/month with [strategy]"
- "tax strategies for [profession/persona]"
- "real estate investing for beginners"
- "passive income ideas [year]"
- "wealth building strategies"
- "short term rental [topic]"

### Phase 2: Programmatic SEO Pages (Target: 50 pages)

#### City Pages (20 more cities)
Location: `/programmatic-pages/cities/[city-slug].html`
Target: "tax strategies in [city]", "real estate investing [city]"
Cities to add: Boston, Chicago, NYC, Philadelphia, San Francisco, San Jose, Austin suburbs, etc.

#### Comparison Pages (15 more)
Location: `/programmatic-pages/comparisons/[comparison-slug].html`
Examples:
- Airbnb Arbitrage vs Traditional Rental
- Active vs Passive Real Estate Investing
- Short-Term Rental vs Long-Term Rental
- Self-Directed IRA vs Solo 401k
- Cash vs Financing for Investment Properties
- REITs vs Direct Real Estate Ownership

#### Persona Pages (10 more)
Location: `/programmatic-pages/personas/[persona-slug].html`
Examples:
- Physicians & High-Income Medical Professionals
- Tech Workers & Software Engineers
- Teachers & Education Professionals
- Sales Professionals (Commission-Based)
- Attorneys & Legal Professionals
- Engineers & Technical Professionals
- First-Time Real Estate Investors
- Busy Parents with Full-Time Jobs
- Recent College Graduates
- People with Bad Credit/Rebuilding

#### Strategy-Location Combo Pages (5 pages)
Examples:
- "Cost Segregation for Airbnb Hosts in Texas"
- "Augusta Rule in Vacation Destinations"
- "Real Estate Professional Status in California"

## Content Quality Standards

### Must Follow:
1. **E-E-A-T Principles**: Demonstrate Experience, Expertise, Authoritativeness, Trustworthiness
2. **Real Data**: Use specific numbers, percentages, dollar amounts
3. **Actionable**: Every post must have takeaways readers can implement
4. **Unique**: No duplicate content, each page must add unique value
5. **SEO-Optimized**: Target keywords in title, H1, first 100 words, throughout content
6. **Schema Markup**: Include proper JSON-LD schema for rich snippets

### Tone & Style:
- Professional but approachable
- Data-driven with real examples
- Confidence without arrogance
- Educational, not salesy
- Match Preston Seo's voice from existing content

## Technical Requirements

### Blog Post Structure:
```markdown
---
title: "[Compelling Title with Numbers/Benefit]"
description: "[150-160 char meta description with CTA]"
date: 2026-02-XX
author: Preston Seo
authorTitle: "Founder, Legacy Investing Show"
authorCredentials: "2,000+ students trained, $10M+ student revenue generated"
category: [Success Story|How-To Guide|Strategy|Mindset|Market Analysis]
canonical: "https://www.legacyinvestingshow.com/blog/[slug]"
seo:
  primaryKeyword: "[main keyword]"
  secondaryKeywords:
    - "[keyword 2]"
    - "[keyword 3]"
  searchIntent: "[informational|transactional|commercial]"
tags:
  - [tag1]
  - [tag2]
image: /assets/images/blog/[slug].webp
---

# [H1 - Main Title]

[Intro paragraph with hook, problem statement, and promise]

## [H2 - Section 1]

[Content with specific examples, numbers, actionable advice]

## [H2 - Section 2]

[More detailed content]

### [H3 - Subsection]

[Deep dive]

## Key Takeaways

- [Actionable point 1]
- [Actionable point 2]
- [Actionable point 3]

## Next Steps

[Call to action with link to relevant program/resource]
```

### Programmatic Page Structure:
- Unique title tag (<60 chars)
- Meta description (150-160 chars)
- H1 with target keyword
- 800-1,500 words of unique content
- Internal links to related strategies
- Schema markup (Article, FAQPage if applicable)
- Mobile-responsive template

## Batch Processing Strategy

Work in batches of 10 to maintain quality:
1. Generate 10 blog posts
2. Verify quality and format
3. Commit to git
4. Move to next batch
5. After 50 blogs, switch to programmatic pages

## Success Criteria

- [ ] 100 blog posts generated in `/content/blog/`
- [ ] 50 programmatic pages generated
- [ ] All content follows frontmatter format
- [ ] All content meets quality standards
- [ ] All files properly named with SEO slugs
- [ ] Internal linking strategy implemented
- [ ] Content committed to git

## Notes

- Use existing blog posts as templates for structure and tone
- Reference `/PROGRAMMATIC_SEO_REPORT.md` for examples of programmatic pages
- Ensure all content is factually accurate for tax/real estate advice
- Include disclaimers where appropriate (not financial advice)
- Use real student success metrics where possible
