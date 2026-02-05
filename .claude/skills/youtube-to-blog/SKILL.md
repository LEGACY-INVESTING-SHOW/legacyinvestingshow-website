---
name: youtube-to-blog-enhanced
description: Converts YouTube videos into comprehensive, SEO-optimized blog posts with deep keyword research. Handles videos 30+ seconds, performs SEO analysis on ALL videos, and generates structured, expanded content. Integrates with keyword-research skill.
---

# YouTube to Blog Enhanced (SEO-Optimized)

Converts YouTube videos into comprehensive, deep, structured blog posts with complete SEO optimization. **ALL videos receive full SEO keyword research and content expansion** - no shortcuts based on length.

## Updated Requirements

- **Video Length**: Minimum 30 seconds (not 7 minutes)
- **View Count**: 2,000+ views (recommended but not strict)
- **SEO Treatment**: ALL qualifying videos get full keyword research
- **Content Expansion**: Based on transcript length (not video length)
- **Output**: Complete markdown with full YAML frontmatter

## When to Use

Use this skill when you need to:
- Convert ANY YouTube video (30+ sec) to a comprehensive blog post
- Get full SEO keyword research for every video
- Create deeply expanded content from short videos
- Scale content production with consistent quality
- Build topical authority with structured, SEO-optimized posts

## Integration with keyword-research Skill

This skill automatically invokes the **keyword-research** skill for comprehensive SEO analysis. Combined workflow:

1. **Extract** video metadata & transcript
2. **Analyze** content themes and target audience
3. **Research** keywords using keyword-research skill
4. **Expand** content based on transcript depth
5. **Optimize** for SEO with keyword mapping
6. **Generate** complete markdown with schema markup

## How to Use

### Single Video

```
Convert this YouTube video to a blog: https://youtube.com/watch?v=VIDEO_ID
```

```
Turn this video into an SEO blog: VIDEO_ID
```

### With SEO Focus

```
Create an SEO blog from this video targeting [keyword]: VIDEO_URL
```

```
Convert video to comprehensive blog about [topic]: VIDEO_URL
```

### Batch Processing

```
Process these YouTube videos into blogs: [list of URLs]
```

## Complete Workflow

### Phase 1: Video Discovery & Validation

1. **Extract Video ID**
   - Parse YouTube URL formats (watch?v=, youtu.be, embed)
   - Validate 11-character video ID format
   - Handle URL parameters correctly

2. **Fetch Video Metadata**
   
   Use YouTube Data API v3:
   ```
   GET https://www.googleapis.com/youtube/v3/videos
   Parameters:
   - part: snippet,contentDetails,statistics
   - id: {VIDEO_ID}
   - key: {YOUTUBE_API_KEY}
   ```
   
   Extract fields:
   - Title, description, tags
   - Duration (ISO 8601: PT#M#S)
   - View count, like count, comment count
   - Channel name, publish date
   - Thumbnail URLs (all sizes)

3. **Validate Qualifications**
   
   **New Requirements:**
   - ✅ Duration: ≥30 seconds
   - ✅ Recommended: 2,000+ views
   - ✅ Has transcript/captions available
   - ❌ Skip if: <30 seconds, private/unavailable
   
   **Validation results:**
   - If duration < 30 seconds: SKIP and log
   - If views < 2,000: FLAG but proceed with "low views" note
   - If no transcript: Attempt manual fallback or skip

4. **Fetch Transcript**
   
   **Primary Method** - TranscriptAPI:
   ```bash
   VIDEO_ID=$(echo "$YOUTUBE_URL" | grep -oE '([a-zA-Z0-9_-]{11})' | head -1)
   
   curl -s -X GET "https://transcriptapi.com/api/v2/youtube/transcript?video_url=${VIDEO_ID}&format=text&include_timestamp=false&send_metadata=true" \
     -H "Authorization: Bearer $TRANSCRIPT_API_KEY"
   ```
   
   **Fallback Methods:**
   - yt-dlp with auto-subtitles
   - Manual extraction request
   - Skip and log if unavailable

### Phase 2: Content Analysis

5. **Analyze Content Themes**
   
   Extract from transcript + metadata:
   ```json
   {
     "mainTopic": "Primary subject of video",
     "subtopics": ["Sub-topic 1", "Sub-topic 2", "Sub-topic 3"],
     "targetAudience": "Who should read this",
     "videoType": "tutorial/interview/case-study/educational",
     "keyPoints": ["Point 1", "Point 2", "Point 3"],
     "tone": "conversational/professional/inspirational",
     "uniqueInsights": ["Unique angle 1", "Unique angle 2"]
   }
   ```

6. **Determine Expansion Level**
   
   **Based on transcript word count:**
   
   | Transcript Words | Video Length | Expansion Level | Target Blog |
   |------------------|--------------|-----------------|-------------|
   | <100 (30-60 sec) | Very short | **MASSIVE** | 2,000-2,500 words |
   | 100-300 (1-2 min) | Short | **Heavy** | 1,800-2,200 words |
   | 300-600 (2-4 min) | Medium-short | **Moderate-Heavy** | 1,700-2,000 words |
   | 600-1,000 (4-7 min) | Medium | **Moderate** | 1,600-1,900 words |
   | 1,000-1,500 (7-10 min) | Long | **Light-Moderate** | 1,500-1,800 words |
   | 1,500+ (10+ min) | Very long | **Light** | 1,500-1,700 words |
   
   **Expansion Areas for Short Videos:**
   - Deep dive into main topic beyond video content
   - Add related concepts and background
   - Include examples, case studies, statistics
   - Add practical how-to steps
   - Include industry context and trends
   - Add FAQ section (5-8 questions)

### Phase 3: SEO Keyword Research (AUTOMATIC)

7. **Invoke keyword-research Skill**
   
   Automatically run keyword research:
   ```
   Research keywords for: [Video Title]
   Topic: [Main topic from analysis]
   Target audience: [Audience from analysis]
   Business goal: Educational content, traffic, authority
   ```
   
   **Required outputs:**
   - **Primary keyword**: 1 main keyword (high search volume, achievable)
   - **Secondary keywords**: 5-7 related keywords
   - **Long-tail keywords**: 10-15 question-based and specific phrases
   - **LSI keywords**: 8-10 semantically related terms
   - **Question keywords**: 5-8 "People Also Ask" style queries
   - **Search intent**: Informational/Commercial/Transactional
   - **GEO opportunities**: Keywords for AI citation

8. **Map Keywords to Content Structure**
   
   Create comprehensive outline:
   ```markdown
   ## Content Outline: [Title]
   
   **Primary Keyword**: [main keyword]
   **Target Word Count**: [X] words
   **Expansion Level**: [Massive/Heavy/Moderate/Light]
   
   ### H1: [Optimized Title with Primary Keyword]
   
   ### H2: Introduction (200 words)
   - Hook with problem/opportunity
   - Include primary keyword in first 100 words
   - Preview what reader will learn
   - Mention video embed
   
   ### H2: [Section 1 - Target: secondary keyword 1] (300-400 words)
   - Key points from transcript
   - **Expansion**: Add background/context
   - **Expansion**: Include examples
   - **Expansion**: Add practical tips
   
   ### H2: [Section 2 - Target: secondary keyword 2] (300-400 words)
   - [Same structure]
   
   ### H2: [Section 3 - Target: secondary keyword 3] (300-400 words)
   - [Same structure]
   
   ### H2: [Section 4 - Target: secondary keyword 4] (300-400 words)
   - [Same structure]
   
   ### H2: [Section 5 - Target: secondary keyword 5] (300-400 words)
   - [Same structure]
   
   ### H2: [Section 6 - Target: long-tail keyword] (200-300 words)
   - Additional deep dive
   
   ### H2: Frequently Asked Questions (400-600 words)
   - Q1: [Question keyword 1] (60-80 words)
   - Q2: [Question keyword 2] (60-80 words)
   - Q3: [Question keyword 3] (60-80 words)
   - Q4: [Question keyword 4] (60-80 words)
   - Q5: [Question keyword 5] (60-80 words)
   
   ### H2: Conclusion (150-200 words)
   - Summary of key points
   - Reinforce main takeaway
   - Strong call-to-action
   ```

### Phase 4: Content Generation

9. **Write Comprehensive Blog Post**
   
   **Structure Requirements:**
   
   **H1 Title** (50-60 characters):
   - Include primary keyword
   - Compelling and click-worthy
   - Example: "How to Build Multiple Income Streams: Complete 2024 Guide"
   
   **Introduction** (200 words):
   - Hook with pain point or question
   - State the problem/opportunity
   - Promise the solution
   - **MUST**: Include primary keyword in first 100 words
   - Mention embedded video
   
   **Body Content** (1,200-2,000 words):
   - Minimum 5 H2 sections
   - 2-3 H3 subsections per H2 where appropriate
   - Each H2: 300-400 words minimum
   - **Expansion areas**:
     * Add background and context
     * Include examples and case studies
     * Add statistics and data points
     * Include practical, actionable steps
     * Add industry insights and trends
   
   **FAQ Section** (400-600 words):
   - 5-8 questions minimum
   - Use question keywords
   - Detailed answers (60-80 words each)
   - Schema-ready format
   
   **Conclusion** (150-200 words):
   - Summarize key points
   - Reinforce main takeaway
   - Strong call-to-action
   - Internal link suggestions

10. **Content Quality Standards**
    
    All posts must meet:
    - ✅ **Word count**: Minimum 1,500 words (no exceptions)
    - ✅ **Readability**: Flesch score 50-70
    - ✅ **Originality**: Significantly expands beyond transcript
    - ✅ **Depth**: Covers topic comprehensively
    - ✅ **Actionability**: Practical steps readers can take
    - ✅ **Authority**: Demonstrates expertise

### Phase 5: SEO Optimization

11. **Optimize Content**
    
    **Title Tag** (50-60 characters):
    - Include primary keyword (front-loaded preferred)
    - Make compelling
    - Example: "How to Build Multiple Income Streams: Complete 2024 Guide"
    
    **Meta Description** (150-160 characters):
    - Include primary keyword
    - Add secondary keyword if natural
    - Include call-to-action
    - Example: "Learn how to build 13 income streams by age 30. Discover proven strategies for wealth building, real estate investing, and passive income generation."
    
    **Header Optimization**:
    - H1: Primary keyword (exact or close variation)
    - H2s: Secondary keywords where natural
    - H3s: Long-tail keywords
    - **Keyword density**: 1-2% primary, 0.5-1% secondary
    
    **Content Optimization**:
    - Primary keyword in first 100 words
    - Primary keyword in at least 2 H2s
    - Secondary keywords distributed naturally
    - LSI keywords integrated throughout
    - 3-5 internal links to related content
    - 2-3 external links to authoritative sources

12. **Generate Schema Markup**
    
    **BlogPosting Schema:**
    ```json
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": "{Title}",
      "description": "{Meta description}",
      "image": "{Image URL}",
      "datePublished": "{Date}",
      "dateModified": "{Date}",
      "author": {
        "@type": "Person",
        "name": "Preston Seo",
        "jobTitle": "Founder, Legacy Investing Show"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Legacy Investing Show",
        "logo": {
          "@type": "ImageObject",
          "url": "https://legacyinvestingshow.com/assets/images/logo.png"
        }
      },
      "video": {
        "@type": "VideoObject",
        "name": "{Video Title}",
        "embedUrl": "https://www.youtube.com/embed/{VIDEO_ID}"
      }
    }
    ```
    
    **FAQPage Schema:**
    ```json
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "{Question}",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "{Answer}"
          }
        }
      ]
    }
    ```

### Phase 6: Markdown Generation

13. **Create Complete Frontmatter**
    
    Generate comprehensive YAML:
    ```yaml
    ---
    # Core SEO Fields
    title: "{SEO-optimized title with primary keyword}"
    titleTemplate: "%s | Legacy Investing Show"
    description: "{Meta description with keywords}"
    date: "{YYYY-MM-DD}"
    modifiedDate: "{YYYY-MM-DD}"
    author: "Preston Seo"
    authorTitle: "Founder, Legacy Investing Show"
    authorCredentials: "2,000+ students trained, $10M+ student revenue generated"
    category: "{Auto-detected category}"
    canonical: "https://legacyinvestingshow.com/blog/{slug}"
    
    # SEO Keyword Targeting (from keyword-research skill)
    seo:
      primaryKeyword: "{primary keyword}"
      secondaryKeywords:
        - "{secondary 1}"
        - "{secondary 2}"
        - "{secondary 3}"
        - "{secondary 4}"
        - "{secondary 5}"
        - "{secondary 6}"
        - "{secondary 7}"
      longTailKeywords:
        - "{long-tail 1}"
        - "{long-tail 2}"
        - "{long-tail 3}"
        - "{long-tail 4}"
        - "{long-tail 5}"
        - "{long-tail 6}"
        - "{long-tail 7}"
        - "{long-tail 8}"
        - "{long-tail 9}"
        - "{long-tail 10}"
      searchIntent: "{informational/commercial/transactional}"
      targetSnippet: "{query to target for featured snippet}"
    
    # LSI Keywords for Content
    lsiKeywords:
      - "{lsi 1}"
      - "{lsi 2}"
      - "{lsi 3}"
      - "{lsi 4}"
      - "{lsi 5}"
      - "{lsi 6}"
      - "{lsi 7}"
      - "{lsi 8}"
    
    # Tags (exact match keywords)
    tags:
      - "{tag 1}"
      - "{tag 2}"
      - "{tag 3}"
      - "{tag 4}"
      - "{tag 5}"
      - "{tag 6}"
      - "{tag 7}"
      - "{tag 8}"
    
    # Open Graph & Social
    image: "/assets/images/blog/{slug}.jpg"
    imageAlt: "{Descriptive alt text with keywords}"
    imageWidth: 1200
    imageHeight: 630
    twitterCard: summary_large_image
    featured: false
    
    # Video Integration
    youtubeId: "{VIDEO_ID}"
    videoDuration: "{ISO duration}"
    
    # Content Metadata
    schema:
      type: BlogPosting
      articleSection: "{Category}"
      wordCount: {X}
    
    # Table of Contents
    toc: true
    tocDepth: 3
    
    # FAQ Data
    faq:
      - question: "{Question 1}"
        answer: "{Answer 1}"
      - question: "{Question 2}"
        answer: "{Answer 2}"
      - question: "{Question 3}"
        answer: "{Answer 3}"
      - question: "{Question 4}"
        answer: "{Answer 4}"
      - question: "{Question 5}"
        answer: "{Answer 5}"
      - question: "{Question 6}"
        answer: "{Answer 6}"
      - question: "{Question 7}"
        answer: "{Answer 7}"
      - question: "{Question 8}"
        answer: "{Answer 8}"
    
    # Related Posts (for internal linking)
    relatedPosts:
      - slug: "{related-post-1}"
        title: "{Related Post Title 1}"
      - slug: "{related-post-2}"
        title: "{Related Post Title 2}"
      - slug: "{related-post-3}"
        title: "{Related Post Title 3}"
    ---
    ```

14. **Auto-Assign Category**
    
    Detect category from content:
    ```
    Categories:
    - "Airbnb Arbitrage" - keywords: airbnb, arbitrage, rental, short-term
    - "Investing" - keywords: invest, portfolio, returns, dividend
    - "Tax Strategies" - keywords: tax, deduction, depreciation, 1031
    - "Real Estate" - keywords: real estate, property, landlord, mortgage
    - "Wealth Building" - keywords: wealth, income, financial freedom, passive
    - "Success Stories" - keywords: student, success, case study, results
    ```
    
    Use keyword matching + LLM classification

15. **Generate Complete Markdown**
    
    Structure:
    ```markdown
    {YAML frontmatter}

    # {H1 Title with Primary Keyword}

    ## Introduction

    {Hook + primary keyword in first 100 words}
    
    {Video embed iframe}

    ## {H2 Section 1} [Target: {secondary keyword}]

    {300-400 words with expansion}

    ### {H3 Subsection}

    {Additional detail}

    ## {H2 Section 2} [Target: {secondary keyword}]

    {Continue...}

    ## {H2 Section 3} [Target: {secondary keyword}]

    {Continue...}

    ## {H2 Section 4} [Target: {secondary keyword}]

    {Continue...}

    ## {H2 Section 5} [Target: {secondary keyword}]

    {Continue...}

    ## {H2 Section 6} [Target: {long-tail keyword}]

    {Deep dive section}

    ## Frequently Asked Questions

    ### {Question 1}

    {Detailed answer 60-80 words}

    ### {Question 2}

    {Continue for 5-8 questions...}

    ## Conclusion

    {Summary + CTA}
    ```

### Phase 7: Quality Assurance

16. **Final Review Checklist**
    
    Verify all requirements:
    - [ ] Word count ≥ 1,500 words
    - [ ] Primary keyword in H1
    - [ ] Primary keyword in first 100 words
    - [ ] Primary keyword in 2+ H2 headings
    - [ ] Minimum 5 H2 sections
    - [ ] 3-5 internal links suggested
    - [ ] 2-3 external links included
    - [ ] FAQ section with 5+ questions
    - [ ] Schema markup valid JSON
    - [ ] All frontmatter fields populated
    - [ ] YouTube video ID correct
    - [ ] Category assigned
    - [ ] No placeholders remaining

17. **Save and Build**
    
    Save file: `content/blog/{slug}.md`
    
    Slug generation:
    - Lowercase, hyphen-separated
    - Include primary keyword
    - Keep under 60 characters
    - Example: `how-to-build-multiple-income-streams`

## Example: Complete Workflow

**Input**: "Convert this video to a blog: https://youtube.com/watch?v=ABC123XYZ"

**Video Analysis:**
- Duration: 2 minutes (120 seconds)
- Views: 5,000
- Title: "3 Ways to Find Airbnb Properties"
- Transcript: 280 words
- Expansion Level: Heavy (target 2,000 words)

**keyword-research Skill Output:**
- Primary: "find airbnb properties"
- Secondary: "airbnb property search", "rental arbitrage properties", "short-term rental deals"
- Long-tail: "how to find properties for airbnb arbitrage", "best way to find rental properties"

**Generated Content:**
1. Introduction (200 words) - includes primary keyword
2. Section 1: Understanding Airbnb Property Criteria (350 words)
3. Section 2: Method 1 - MLS and Real Estate Listings (400 words)
4. Section 3: Method 2 - Direct Mail Marketing (400 words)
5. Section 4: Method 3 - Driving for Dollars (400 words)
6. Section 5: Evaluating Properties (350 words)
7. FAQ Section (500 words) - 8 questions
8. Conclusion (150 words)

**Final Output:**
- Word count: 2,000 words
- Full YAML frontmatter with all SEO fields
- Schema markup for BlogPosting and FAQPage
- Saved to: `content/blog/3-ways-find-airbnb-properties.md`

## Integration with Existing System

### Build Process

After markdown generation:

```bash
# 1. Generate HTML from markdown
npm run build:blog

# 2. Update sitemap
npm run build:sitemap

# 3. Update RSS feed
npm run build:rss

# 4. Build CSS
npm run build:css

# 5. Preview locally
npm run start

# 6. Commit and deploy
git add content/blog/{slug}.md blog/
git commit -m "Add: {Title}"
git push origin main
```

### File Structure

```
content/blog/
├── {slug}.md          # Generated markdown
blog/
├── {slug}.html        # Generated HTML (auto-created)
├── index.html         # Blog index (auto-updated)
```

## Tips for Best Results

### Content Expansion Strategies

**For Very Short Videos (<100 words transcript):**
1. Research the broader topic
2. Add industry background
3. Include step-by-step processes
4. Add examples and case studies
5. Include statistics and data
6. Add common mistakes to avoid
7. Include tools and resources

**Keyword Integration:**
- Use keywords naturally (don't stuff)
- Front-load primary keyword in title
- Use variations and synonyms (LSI keywords)
- Include keywords in H2 headings
- Use long-tail keywords in H3 headings

**SEO Best Practices:**
- Write for humans first, search engines second
- Include actionable advice
- Add specific numbers and data
- Use proper heading hierarchy
- Include internal and external links
- Optimize images with alt text

## Troubleshooting

**Transcript Not Available:**
- Check if video has captions
- Try fallback extraction methods
- Skip and log for manual review

**API Rate Limits:**
- YouTube API: 10,000 units/day
- TranscriptAPI: Check rate limits
- Implement exponential backoff

**Content Too Short:**
- Increase expansion level
- Research related topics
- Add industry context
- Include examples and case studies

**Keyword Integration Difficult:**
- Restructure sentences naturally
- Use keyword variations
- Focus on related topics
- Ensure readability

## Success Metrics

### Content Quality
- ✅ Word count: 1,500+ words per post
- ✅ SEO score: 90+ (using standard checkers)
- ✅ Readability: Flesch score 50-70
- ✅ Keyword density: Natural (1-2% primary)

### SEO Performance
- ✅ Indexed by Google within 48 hours
- ✅ Ranks for primary keyword within 30 days
- ✅ Gets organic traffic within 60 days
- ✅ Featured snippet capture rate: 20%+

### Operational
- ✅ Processing time: <3 minutes per video
- ✅ Success rate: >95%
- ✅ API error rate: <5%

## Related Skills

- **keyword-research** - SEO keyword research and analysis
- **competitor-analysis** - Analyze competitor content
- **content-gap-analysis** - Find content opportunities
- **seo-audit** - Audit and optimize existing content

---

## Quick Start

**To convert a YouTube video:**

```
Convert this YouTube video to a comprehensive SEO blog: VIDEO_URL
```

**The skill will:**
1. ✅ Extract video metadata and transcript
2. ✅ Analyze content themes
3. ✅ Invoke keyword-research skill for SEO analysis
4. ✅ Determine expansion level based on transcript length
5. ✅ Generate comprehensive outline
6. ✅ Write 1,500+ word blog post
7. ✅ Optimize for SEO with keyword mapping
8. ✅ Generate complete YAML frontmatter
9. ✅ Create schema markup
10. ✅ Save markdown to content/blog/

**Ready to build!**
