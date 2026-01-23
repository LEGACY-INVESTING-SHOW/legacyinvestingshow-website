---
name: youtube-to-blog
description: Convert a YouTube video into an SEO-optimized, Hampton-style blog post with structured data. Use this skill when you need to turn a YouTube testimonial, interview, or educational video into a case study or blog article. Triggers on "convert video", "youtube to blog", "case study from video", "testimonial to blog".
argument-hint: <youtube-url> <student-name>
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Grep, Glob, Bash, WebFetch
---

# YouTube to Blog Post Conversion (Enhanced Hampton-Style)

Convert a YouTube video into an SEO-optimized, GEO-compliant blog post following Hampton blog patterns with structured data for AI crawlers.

## Arguments

$ARGUMENTS should contain:
- YouTube URL (required)
- Student/Subject Name (required for testimonials)

## Step 1: Extract Video Information

### Method A: TranscriptAPI (Primary - Use This First)

The API key is stored in `.env` file as `TRANSCRIPT_API_KEY`. Use this curl command:

```bash
# Extract video ID from URL (handles both youtube.com and youtu.be formats)
VIDEO_ID=$(echo "$YOUTUBE_URL" | grep -oE '([a-zA-Z0-9_-]{11})' | head -1)

# Fetch transcript with metadata
curl -s -X GET "https://transcriptapi.com/api/v2/youtube/transcript?video_url=${VIDEO_ID}&format=text&include_timestamp=false&send_metadata=true" \
  -H "Authorization: Bearer $(grep TRANSCRIPT_API_KEY .env | cut -d'=' -f2)"
```

The response includes:
- `video_id`: The YouTube video ID
- `language`: Transcript language
- `transcript`: Full text transcript
- `metadata`: Title, author, thumbnail URL

### Method B: yt-dlp Subtitles (Fallback)
```bash
yt-dlp --write-auto-sub --sub-lang en --skip-download --output "%(id)s" "$YOUTUBE_URL"
```

### Method C: Manual Extraction (Last Resort)
If APIs fail, instruct the user:
"Please copy the transcript from the YouTube video:
1. Open the video in YouTube
2. Click the '...' menu below the video
3. Select 'Open transcript'
4. Copy all text and paste it here"

## Step 2: Structured Data Extraction

Extract information into this JSON template for consistent content generation:

```json
{
  "subject": {
    "name": "",
    "background": "",
    "location": "",
    "previousExperience": ""
  },
  "metrics": {
    "monthlyRevenue": "",
    "monthlyCashFlow": "",
    "properties": "",
    "profitMargin": "",
    "revenuePerProperty": "",
    "netPerProperty": "",
    "timeToFirstProperty": "",
    "market": ""
  },
  "timeline": [
    {"year": "", "event": "", "details": ""}
  ],
  "strategies": [
    {"name": "", "description": "", "implementation": [], "quote": ""}
  ],
  "tools": [
    {"name": "", "purpose": "", "whyChosen": ""}
  ],
  "lessons": [
    {"title": "", "explanation": "", "actionSteps": []}
  ],
  "quotes": [
    {"text": "", "context": ""}
  ],
  "faq": [
    {"question": "", "answer": ""}
  ]
}
```

From the transcript, extract:
- **Key metrics** (revenue, timeline, property count, ROI, profit margins) - aim for 10+ specific numbers
- **Story arc** (before -> challenge -> journey -> results)
- **Memorable quotes** (direct quotes from the speaker - minimum 5)
- **Lessons learned** (actionable advice shared - aim for 5+)
- **Tools/Systems mentioned** (software, processes, strategies with "why chosen")
- **Timeline events** (key milestones with dates/timeframes - minimum 4)
- **Specific strategies** (unique approaches they used - minimum 3)

## Step 3: Generate Blog Post

Create a markdown file with enhanced structure following Hampton-style patterns.

### Enhanced Frontmatter (YAML)

```yaml
---
title: "How [Name] Built a $[Amount]/Month Airbnb Business: [Key Strategy]"
description: "[Name]'s journey from [starting point] to $[amount]/month passive income through Legacy Investing Show's Airbnb arbitrage program—including the exact strategies, tools, and lessons learned."
date: [TODAY'S DATE - YYYY-MM-DD format]
modifiedDate: [TODAY'S DATE]
author: Preston Seo
category: Success Story
tags:
  - student success
  - airbnb arbitrage
  - passive income
  - case study
  - [student first name lowercase]
  - [market lowercase]
image: /assets/images/blog/success-stories/[student-slug].jpg
imageAlt: "[Name]'s Airbnb arbitrage success story"
featured: false
youtubeId: "[VIDEO_ID from URL]"
schema:
  type: Article

# Statistics rendered as cards at top of article (AI-crawler accessible)
statistics:
  - value: "$[AMOUNT]"
    label: "Monthly Cash Flow"
    icon: "dollar"
    context: "After all expenses"
    source: "Student Interview, [Month Year]"
  - value: "[NUMBER]"
    label: "Properties"
    icon: "home"
    context: "[Market] market"
  - value: "[TIMEFRAME]"
    label: "Time to First Deal"
    icon: "clock"
    context: "From joining program"
  - value: "[PERCENTAGE]%"
    label: "Profit Margin"
    icon: "percent"
    context: "Net after expenses"

# FAQ section rendered with accordion and FAQPage schema
faq:
  - question: "Is Legacy Investing Show worth the investment?"
    answer: "Based on [Name]'s experience, [he/she] achieved $[amount]/month within [timeframe], demonstrating significant ROI on the program investment. The program provided [specific value: mentorship, community, systems, scripts]."
  - question: "How long does it take to see results with Airbnb arbitrage?"
    answer: "[Name] secured [his/her] first property within [X] days/weeks and achieved positive cash flow by [timeframe]. Results vary based on market and effort level."
  - question: "Do you need real estate experience to start Airbnb arbitrage?"
    answer: "[Name] started with [background description] and built a successful business using the Legacy Investing Show system. The program provides complete training from zero experience."
  - question: "How much does [Name] make per property?"
    answer: "[Name] targets $[X] gross per property, netting approximately $[Y] after expenses—a [Z]% profit margin on each unit."
  - question: "What market is best for Airbnb arbitrage?"
    answer: "[Name] chose [market] because of [specific reasons: demand drivers, cost arbitrage, demographics]. The best market depends on your location, capital, and target guests."
  - question: "How much capital do you need to start?"
    answer: "[Name] recommends having $[amount] for your first property, covering [breakdown: first month rent, security deposit, furniture, supplies]."
---
```

### Content Structure (Hampton-Style, 3,000+ words)

```markdown
**[Name] went from [starting situation] to earning $[amount]/month in passive income through Airbnb arbitrage.** After joining Legacy Investing Show, [he/she] secured [his/her] first property in [timeframe] and has since scaled to [X] properties generating consistent monthly revenue in [market].

## Quick Facts

- **Monthly Cash Flow**: $[amount] after all expenses
- **Properties**: [number] managed in [market]
- **Profit Margin**: [percentage]% net
- **Time to First Property**: [timeframe]
- **Key Strategy**: [primary differentiator]
- **Background**: [brief description]

## The Background

[4-5 paragraphs about their situation before joining, including:]
- Professional background and career history
- Financial situation and goals
- How they discovered real estate/Airbnb
- Initial skepticism or concerns
- What motivated them to take action

> "[Direct quote about their starting point or motivation]"

## The Journey Timeline

### [Year]: [Starting Point]
[2-3 paragraphs about where they began, their first exposure to the concept]

### [Year]: Discovery Phase
[2-3 paragraphs about research, finding Legacy Investing Show, decision to join]

### [Year]: First Property
[2-3 paragraphs about their first deal, challenges faced, lessons learned]

### [Year]: Scaling Up
[2-3 paragraphs about growth, systems developed, current state]

## Why [Market] Was the Perfect Choice

[3-4 paragraphs about market selection with specific data:]
- Demand drivers (tourism, business travel, events, tech companies)
- Cost arbitrage opportunities (rent vs. nightly rates)
- Competition analysis (how they differentiate)
- Personal connection to the area
- Specific neighborhoods or property types that work

> "[Quote about market selection or insight about their area]"

## The Strategies That Set [Name] Apart

### Strategy 1: [Name - e.g., "Pool Requirement"]

[4-5 paragraphs explaining this strategy in depth:]
- What the strategy is
- Why it works in their market
- Specific implementation details
- Results/data from using this approach
- How beginners can apply it

**Key Insight**: "[Direct quote about this strategy]"

**Implementation Steps**:
1. [Specific action item]
2. [Specific action item]
3. [Specific action item]

### Strategy 2: [Name - e.g., "Demographic Targeting"]

[4-5 paragraphs with same structure as above]

**Key Insight**: "[Direct quote]"

**Implementation Steps**:
1. [Specific action item]
2. [Specific action item]
3. [Specific action item]

### Strategy 3: [Name - e.g., "Premium Amenities"]

[4-5 paragraphs with same structure as above]

**Key Insight**: "[Direct quote]"

**Implementation Steps**:
1. [Specific action item]
2. [Specific action item]
3. [Specific action item]

## The Results

### By the Numbers

| Metric | Before | After |
|--------|--------|-------|
| Monthly Income | $[amount] | $[amount] |
| Properties | 0 | [number] |
| Cash Flow Per Property | N/A | $[amount] |
| Profit Margin | N/A | [percentage]% |
| Time Freedom | [description] | [description] |

### Financial Breakdown

| Property Type | Gross Revenue | Expenses | Net Profit |
|---------------|---------------|----------|------------|
| [Type 1] | $[amount] | $[amount] | $[amount] |
| [Type 2] | $[amount] | $[amount] | $[amount] |
| Average | $[amount] | $[amount] | $[amount] |

### Key Achievements
- [Achievement 1 with specific numbers and context]
- [Achievement 2 with specific numbers and context]
- [Achievement 3 with specific numbers and context]
- [Achievement 4 with specific numbers and context]
- [Achievement 5 with specific numbers and context]

## Key Lessons from [Name]'s Journey

> "[Impactful quote about the overall experience]"

### 1. [Lesson Title - e.g., "Start Before You're Ready"]

[3-4 paragraphs explaining this lesson:]
- What they learned
- How they learned it (specific story/example)
- Why it matters for beginners
- How to apply it

**Action Steps**:
- [Specific thing readers can do]
- [Specific thing readers can do]

### 2. [Lesson Title]

[3-4 paragraphs with same structure]

**Action Steps**:
- [Specific thing readers can do]
- [Specific thing readers can do]

### 3. [Lesson Title]

[3-4 paragraphs with same structure]

**Action Steps**:
- [Specific thing readers can do]
- [Specific thing readers can do]

### 4. [Lesson Title]

[3-4 paragraphs with same structure]

**Action Steps**:
- [Specific thing readers can do]
- [Specific thing readers can do]

### 5. [Lesson Title]

[3-4 paragraphs with same structure]

**Action Steps**:
- [Specific thing readers can do]
- [Specific thing readers can do]

## Tools & Systems [Name] Uses

| Tool | Purpose | Why Chosen |
|------|---------|------------|
| [Tool 1] | [What it does] | [Specific reason/benefit] |
| [Tool 2] | [What it does] | [Specific reason/benefit] |
| [Tool 3] | [What it does] | [Specific reason/benefit] |
| [Tool 4] | [What it does] | [Specific reason/benefit] |
| [Tool 5] | [What it does] | [Specific reason/benefit] |

### Detailed Tool Breakdown

**[Tool 1 Name]**: [2-3 sentences explaining how they use it, specific features they rely on, and any tips]

**[Tool 2 Name]**: [2-3 sentences with same structure]

**[Tool 3 Name]**: [2-3 sentences with same structure]

## [Name]'s Advice for Beginners

> "[Inspirational or practical quote from the video]"

[4-5 paragraphs of actionable advice organized by theme:]

### Getting Started
[Advice for people just beginning]

### Finding Properties
[Advice on property selection and negotiation]

### Building Systems
[Advice on automation and scaling]

### Mindset
[Advice on mental approach and persistence]

## Watch [Name]'s Full Interview

<iframe width="560" height="315" src="https://www.youtube.com/embed/[VIDEO_ID]" title="[Name]'s Legacy Investing Show Success Story" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

## About Legacy Investing Show

Legacy Investing Show is Preston Seo's comprehensive training program that has helped over 2,000 students build profitable Airbnb businesses. The program teaches the complete system for finding, analyzing, and managing short-term rental properties to generate passive income—whether through arbitrage, ownership, or co-hosting.

[Learn more about the Legacy Investing Show program →](/programs.html)

---

*This case study is based on [Name]'s interview conducted in [Month Year]. Results may vary based on individual effort, market conditions, and investment capital.*
```

## Step 4: Save Blog Post

Save markdown to: `content/blog/[student-slug].md`
- Note: Save directly in content/blog/, NOT in a subdirectory

## Step 5: Verify Output

After generating, verify:
- [ ] Frontmatter is valid YAML
- [ ] All statistics have real values (no placeholders like [AMOUNT])
- [ ] Statistics include icon field (dollar, home, clock, percent, chart, location)
- [ ] Statistics include context field for meaning
- [ ] FAQ section has 6+ questions with detailed answers
- [ ] Answer-first format (first paragraph contains key result)
- [ ] YouTube video ID is correct
- [ ] Word count is 3,000+ words (use `wc -w`)
- [ ] At least 5 direct quotes from the video
- [ ] At least 10 specific data points (numbers, percentages)
- [ ] All 5 lessons have action steps
- [ ] Tools table includes "Why Chosen" column
- [ ] Timeline has at least 4 milestones
- [ ] Tables are properly formatted markdown
- [ ] No SVG image references (use tables and stat cards instead)

## Step 6: Build and Deploy

```bash
# Build the blog (compiles markdown to HTML)
npm run build:blog

# Build CSS (if needed)
npm run build:css

# Preview locally
npm run start
# Preview at http://localhost:3000/blog/[student-slug]

# Verify statistics render as cards
# Verify FAQ section renders with accordions
# Verify FAQPage schema in page source

# Commit and push for Vercel deployment
git add content/blog/[slug].md blog/
git commit -m "Add [Name]'s success story blog post"
git push origin main
```

## Quality Standards

### Content Requirements
- **Minimum 3,000 words** for comprehensive coverage
- **At least 6 major sections** with 2-3 subsections each
- **5+ direct quotes** from the video with context
- **10+ specific data points** (numbers, percentages, timeframes)
- **Before/After comparison** in results section
- **Implementation steps** for each strategy (actionable)
- **Full tools breakdown** with "why chosen" rationale
- **4+ timeline milestones** showing progression

### SEO & AI Requirements
- **E-E-A-T Compliance**: All facts must come from the video transcript
- **GEO Optimization**: First paragraph must directly answer "what results did they achieve?"
- **Statistics in frontmatter**: Rendered as HTML cards (AI-crawler accessible)
- **FAQ in frontmatter**: Rendered with FAQPage JSON-LD schema
- **No SVG diagrams**: Use tables and structured HTML instead
- **Mobile-responsive**: All content works on small screens

### What NOT to Include
- SVG diagram references (replaced by stat cards and tables)
- Placeholder text like [AMOUNT] or [NAME]
- Fabricated information not from the video
- Generic advice not specific to this person's story
- External links to competitor programs

## Example Statistics Frontmatter

```yaml
statistics:
  - value: "$35,000"
    label: "Monthly Cash Flow"
    icon: "dollar"
    context: "After all expenses"
    source: "Interview, January 2025"
  - value: "7"
    label: "Properties"
    icon: "home"
    context: "Austin, Texas market"
  - value: "6 weeks"
    label: "Time to First Deal"
    icon: "clock"
    context: "From joining program"
  - value: "50%"
    label: "Profit Margin"
    icon: "percent"
    context: "$5-6K net per property"
```

## Example FAQ Frontmatter

```yaml
faq:
  - question: "How much does Gary make from Airbnb arbitrage?"
    answer: "Gary generates approximately $35,000 per month in cash flow from 7 properties in Austin, Texas. Each property brings in $7,000-10,000 gross, with a 50% profit margin after all expenses."
  - question: "What makes Gary's Airbnb strategy different?"
    answer: "Gary requires every property to have a pool—non-negotiable in Austin's 110-degree summers. This single filter narrows competition from 8,000+ listings to under 500, commanding premium rates."
  - question: "How long did it take Gary to reach $35K/month?"
    answer: "Gary secured his first property within 6 weeks of joining Legacy Investing Show and scaled to 7 properties over 3 years. His systematic approach to market research and amenity requirements accelerated his growth."
```
