---
name: programmatic-seo
description: Generate deep, comprehensive, SEO-optimized programmatic pages for tax strategies, investment topics, and personal finance concepts. Creates 3,000-5,000 word pages that rank well and provide real value. Use this for batch generation of topic pages.
argument-hint: <topic-slug> <topic-title>
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Grep, Glob, Bash, WebFetch, WebSearch
---

# Programmatic SEO Page Generator (Deep Content)

Generate comprehensive, SEO-optimized pages that are 3,000-5,000 words with real depth and value. These are NOT thin content pages - they should be the definitive resource on each topic.

## Philosophy

**The Problem with Thin Programmatic SEO:**
- Google penalizes thin, templated content
- Users bounce quickly from surface-level pages
- No featured snippets or PAA captures
- Hurts overall site authority

**Our Approach:**
- Each page is a comprehensive guide (3,000-5,000 words)
- Deep, actionable content with real examples
- Structured for featured snippets
- Internal linking strategy built-in
- Unique insights, not just definitions

## Content Depth Requirements

Each page MUST include:

### 1. Hook & Quick Summary (200 words)
- Attention-grabbing statistic or scenario
- Quick bullet summary of key takeaways
- "Bottom line" box for skimmers

### 2. Comprehensive Definition (300 words)
- What it is (detailed explanation)
- How it works (mechanism)
- Historical context/origin
- Legal/regulatory framework

### 3. Who Benefits Analysis (400 words)
- Detailed persona breakdowns (3-5 personas)
- Income level considerations
- Career stage relevance
- Risk tolerance matching
- Real scenarios for each persona

### 4. Step-by-Step Implementation (800 words)
- Numbered steps with sub-steps
- Timeline expectations
- Required documents/prerequisites
- Common pitfalls at each step
- Pro tips for each step

### 5. Real Numbers & Calculations (500 words)
- Example scenarios with actual numbers
- Before/after comparisons
- Tax savings calculations
- ROI projections
- Interactive elements (if possible)

### 6. Expert Strategies (600 words)
- 3-5 advanced strategies
- Each with:
  - Strategy name
  - How it works
  - Who it's best for
  - Potential savings
  - Implementation steps

### 7. Common Mistakes & How to Avoid (400 words)
- 5-7 common mistakes
- Why people make them
- How to avoid each
- Recovery strategies if already made

### 8. Comparison Section (300 words)
- This strategy vs. alternatives
- Comparison table
- When to choose this vs. others
- Combining strategies

### 9. Tools & Resources (200 words)
- Recommended tools
- Professional services
- Books/courses
- Government resources

### 10. FAQ Section (400 words)
- 10-15 questions from "People Also Ask"
- Detailed answers (not one-liners)
- Schema markup for FAQ

### 11. Related Topics & Internal Links (100 words)
- 5-8 related strategy pages
- Contextual internal links throughout

### 12. CTA Section (100 words)
- Clear next step
- Consultation offer
- Resource download

## Target Metrics

- **Word count:** 3,000-5,000 words
- **Reading time:** 12-20 minutes
- **H2 headings:** 10-15
- **H3 headings:** 20-30
- **Internal links:** 8-12
- **External links:** 3-5 (authoritative sources)
- **Images/diagrams:** 3-5 placeholder locations

## SEO Requirements

### On-Page SEO
- Primary keyword in:
  - Title (front-loaded)
  - H1
  - First 100 words
  - URL slug
  - Meta description
  - 2-3 H2 headings
- Secondary keywords naturally distributed
- LSI keywords throughout

### Schema Markup
- Article schema
- FAQ schema
- HowTo schema (for implementation section)
- BreadcrumbList schema

### Featured Snippet Optimization
- Definition paragraph (40-60 words) after H2
- Numbered lists for "how to" queries
- Tables for comparison queries
- Bullet lists for "types of" queries

## Template Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{TITLE}} | Legacy Investing Show</title>
    <meta name="description" content="{{META_DESCRIPTION}}">
    <link rel="canonical" href="https://legacyinvestingshow.com/{{CATEGORY}}/{{SLUG}}">
    
    <!-- Schema Markup -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "{{TITLE}}",
        "description": "{{META_DESCRIPTION}}",
        "author": {
            "@type": "Person",
            "name": "Preston Seo"
        },
        ...
    }
    </script>
</head>
<body>
    <!-- Navigation -->
    
    <!-- Breadcrumbs -->
    
    <!-- Hero/Header -->
    <header class="page-hero">
        <h1>{{TITLE}}</h1>
        <p class="hero-subtitle">{{SUBTITLE}}</p>
        <div class="quick-stats">
            <!-- Key statistics -->
        </div>
    </header>
    
    <!-- Table of Contents -->
    <nav class="toc">
        <h2>Table of Contents</h2>
        <!-- Auto-generated TOC -->
    </nav>
    
    <!-- Main Content -->
    <main class="content-wrapper">
        <article class="main-content">
            
            <!-- Quick Summary Box -->
            <div class="summary-box">
                <h2>Key Takeaways</h2>
                <ul>
                    <!-- 5-7 bullet points -->
                </ul>
            </div>
            
            <!-- Section 1: What Is -->
            <section id="what-is">
                <h2>What is {{TOPIC}}?</h2>
                <!-- 300 words, definition paragraph optimized for featured snippet -->
            </section>
            
            <!-- Section 2: How It Works -->
            <section id="how-it-works">
                <h2>How {{TOPIC}} Works</h2>
                <!-- Detailed mechanism explanation -->
            </section>
            
            <!-- Section 3: Who Benefits -->
            <section id="who-benefits">
                <h2>Who Benefits Most from {{TOPIC}}</h2>
                <!-- Persona breakdowns -->
            </section>
            
            <!-- Section 4: Step by Step -->
            <section id="how-to">
                <h2>How to {{ACTION}}: Step-by-Step Guide</h2>
                <!-- Numbered steps with HowTo schema -->
            </section>
            
            <!-- Section 5: Real Numbers -->
            <section id="calculations">
                <h2>{{TOPIC}} Calculations & Examples</h2>
                <!-- Real scenarios with numbers -->
            </section>
            
            <!-- Section 6: Expert Strategies -->
            <section id="strategies">
                <h2>Advanced {{TOPIC}} Strategies</h2>
                <!-- 3-5 detailed strategies -->
            </section>
            
            <!-- Section 7: Common Mistakes -->
            <section id="mistakes">
                <h2>Common {{TOPIC}} Mistakes to Avoid</h2>
                <!-- 5-7 mistakes with solutions -->
            </section>
            
            <!-- Section 8: Comparison -->
            <section id="comparison">
                <h2>{{TOPIC}} vs. Other Options</h2>
                <!-- Comparison table -->
            </section>
            
            <!-- Section 9: Tools -->
            <section id="tools">
                <h2>Best Tools & Resources for {{TOPIC}}</h2>
                <!-- Recommended resources -->
            </section>
            
            <!-- Section 10: FAQ -->
            <section id="faq">
                <h2>Frequently Asked Questions</h2>
                <!-- 10-15 FAQ items with schema -->
            </section>
            
        </article>
        
        <!-- Sidebar -->
        <aside class="sidebar">
            <!-- Related strategies -->
            <!-- CTA card -->
            <!-- Newsletter signup -->
        </aside>
    </main>
    
    <!-- CTA Section -->
    <section class="cta-section">
        <!-- Final CTA -->
    </section>
    
    <!-- Footer -->
</body>
</html>
```

## Generation Process

### Phase 1: Research (use Opus)
1. WebSearch for "{{topic}}" to find:
   - People Also Ask questions
   - Top ranking content structure
   - Key statistics
   - Common questions

2. Identify:
   - Primary keyword
   - Secondary keywords (5-10)
   - LSI keywords (10-15)
   - Featured snippet opportunities

### Phase 2: Outline Creation (use Opus)
1. Create detailed outline with all sections
2. Assign word counts to each section
3. Identify internal linking opportunities
4. Note statistics/examples needed

### Phase 3: Content Generation (use Haiku 4.5)
1. Generate each section following the outline
2. Ensure depth and specificity
3. Include real calculations/examples
4. Add internal links contextually

### Phase 4: Assembly & Polish (use Haiku)
1. Combine sections into full HTML
2. Add schema markup
3. Verify word count (3,000-5,000)
4. Check all links work
5. Add image placeholders

## Quality Checklist

Before publishing, verify:
- [ ] Word count: 3,000-5,000 words
- [ ] All 12 required sections present
- [ ] At least 10 H2 headings
- [ ] At least 20 H3 headings
- [ ] 10-15 FAQ questions
- [ ] Real calculations/examples included
- [ ] 8-12 internal links
- [ ] Schema markup complete
- [ ] Meta description optimized
- [ ] Title tag optimized
- [ ] Featured snippet paragraphs formatted
- [ ] Mobile-friendly structure

## Category-Specific Guidelines

### Tax Strategies
- Include IRS code references
- Add tax bracket scenarios
- Note state-specific variations
- Include deadline reminders

### Investment Topics
- Include risk disclaimers
- Add historical performance context
- Note minimum investment amounts
- Compare with similar investments

### Business Structures
- Include state filing requirements
- Add cost comparisons
- Note ongoing compliance
- Include liability scenarios

### Retirement Planning
- Include contribution limits (current year)
- Add catch-up contribution info
- Note income phase-outs
- Include RMD considerations

## Execution Command

To generate a page:

```bash
# Generate single page
claude -m haiku "Generate a comprehensive programmatic SEO page for [TOPIC] following the programmatic-seo skill. Target 4,000 words."

# Batch generate (use script)
node scripts/generate-seo-pages.js --topics data/seo-topics.json --model haiku
```

## Related Skills
- youtube-to-blog (for case study content)
- seo-review (for auditing generated pages)
- batch-content (for managing generation queue)
