---
name: youtube-to-blog
description: Convert a YouTube video into an SEO-optimized blog post with visuals. Use this skill when you need to turn a YouTube testimonial, interview, or educational video into a case study or blog article. Triggers on "convert video", "youtube to blog", "case study from video", "testimonial to blog".
argument-hint: <youtube-url> <student-name>
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Grep, Glob, Bash, WebFetch
---

# YouTube to Blog Post Conversion

Convert a YouTube video into an SEO-optimized, GEO-compliant blog post with visual diagrams.

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

## Step 2: Analyze Content

From the transcript, extract:
- **Key metrics** (revenue, timeline, property count, ROI, profit margins)
- **Story arc** (before → challenge → journey → results)
- **Memorable quotes** (direct quotes from the speaker - at least 3-5)
- **Lessons learned** (actionable advice shared - aim for 5+)
- **Tools/Systems mentioned** (software, processes, strategies)
- **Timeline events** (key milestones with dates/timeframes)
- **Specific strategies** (unique approaches they used)

## Step 3: Generate Visual Assets

Create SVG diagrams to enhance the blog post. Save these in `/assets/images/blog/diagrams/`.

### 3.1 Journey Timeline Diagram

Create an SVG timeline showing the subject's progression:

```svg
<!-- Save as: /assets/images/blog/diagrams/[slug]-timeline.svg -->
<svg viewBox="0 0 800 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#6366f1"/>
      <stop offset="100%" style="stop-color:#22c55e"/>
    </linearGradient>
  </defs>

  <!-- Timeline line -->
  <line x1="50" y1="100" x2="750" y2="100" stroke="url(#lineGradient)" stroke-width="4" stroke-linecap="round"/>

  <!-- Milestone circles and labels -->
  <circle cx="50" cy="100" r="12" fill="#6366f1"/>
  <text x="50" y="140" text-anchor="middle" font-family="system-ui" font-size="12" fill="#374151">Starting Point</text>
  <text x="50" y="70" text-anchor="middle" font-family="system-ui" font-size="11" font-weight="600" fill="#1f2937">[Date/Status]</text>

  <!-- Add more milestones as needed -->
</svg>
```

### 3.2 Results Comparison Chart

Create a before/after comparison:

```svg
<!-- Save as: /assets/images/blog/diagrams/[slug]-results.svg -->
<svg viewBox="0 0 600 300" xmlns="http://www.w3.org/2000/svg">
  <style>
    .title { font: bold 16px system-ui; fill: #1f2937; }
    .label { font: 12px system-ui; fill: #6b7280; }
    .value { font: bold 24px system-ui; fill: #1f2937; }
    .bar-before { fill: #e5e7eb; }
    .bar-after { fill: #22c55e; }
  </style>

  <text x="300" y="30" text-anchor="middle" class="title">Results Transformation</text>

  <!-- Before/After bars for each metric -->
  <g transform="translate(50, 60)">
    <text x="0" y="15" class="label">Monthly Income</text>
    <rect x="120" y="0" width="50" height="25" class="bar-before" rx="4"/>
    <rect x="120" y="30" width="200" height="25" class="bar-after" rx="4"/>
    <text x="180" y="17" class="label">Before: $0</text>
    <text x="330" y="47" class="value">$35,000</text>
  </g>
</svg>
```

### 3.3 Strategy Framework Diagram

Create a visual representation of their key strategies:

```svg
<!-- Save as: /assets/images/blog/diagrams/[slug]-strategy.svg -->
<svg viewBox="0 0 700 400" xmlns="http://www.w3.org/2000/svg">
  <style>
    .box { fill: #f8fafc; stroke: #e2e8f0; stroke-width: 2; rx: 8; }
    .box-title { font: bold 14px system-ui; fill: #1f2937; }
    .box-text { font: 12px system-ui; fill: #6b7280; }
    .center-box { fill: #6366f1; rx: 50; }
    .center-text { font: bold 16px system-ui; fill: white; }
    .connector { stroke: #cbd5e1; stroke-width: 2; fill: none; }
  </style>

  <!-- Central concept -->
  <ellipse cx="350" cy="200" rx="80" ry="40" class="center-box"/>
  <text x="350" y="205" text-anchor="middle" class="center-text">Core Strategy</text>

  <!-- Surrounding strategy boxes -->
  <!-- Add boxes connected to center -->
</svg>
```

### 3.4 Tools & Tech Stack Diagram

```svg
<!-- Save as: /assets/images/blog/diagrams/[slug]-tools.svg -->
<svg viewBox="0 0 600 250" xmlns="http://www.w3.org/2000/svg">
  <style>
    .tool-box { fill: white; stroke: #e5e7eb; stroke-width: 2; rx: 8; }
    .tool-name { font: bold 13px system-ui; fill: #1f2937; }
    .tool-purpose { font: 11px system-ui; fill: #6b7280; }
    .category { font: bold 14px system-ui; fill: #6366f1; }
  </style>

  <text x="300" y="25" text-anchor="middle" font-size="18" font-weight="bold" fill="#1f2937">Tech Stack & Tools</text>

  <!-- Tool cards in grid -->
</svg>
```

### 3.5 Key Metrics Infographic

```svg
<!-- Save as: /assets/images/blog/diagrams/[slug]-metrics.svg -->
<svg viewBox="0 0 800 200" xmlns="http://www.w3.org/2000/svg">
  <style>
    .metric-box { fill: #f8fafc; stroke: #e2e8f0; stroke-width: 1; rx: 12; }
    .metric-value { font: bold 32px system-ui; fill: #6366f1; }
    .metric-label { font: 13px system-ui; fill: #6b7280; }
    .metric-icon { fill: #6366f1; }
  </style>

  <!-- Metric cards -->
  <g transform="translate(20, 20)">
    <rect width="180" height="160" class="metric-box"/>
    <text x="90" y="80" text-anchor="middle" class="metric-value">$35K</text>
    <text x="90" y="110" text-anchor="middle" class="metric-label">Monthly Cash Flow</text>
  </g>

  <!-- Add more metric cards -->
</svg>
```

## Step 4: Generate Blog Post

Create a markdown file with this structure:

### Frontmatter (YAML)

```yaml
---
title: "How [Name] Made $[Amount]/Month with Airbnb Arbitrage"
description: "[Name]'s journey from [starting point] to $[amount]/month passive income through Legacy Investing Show's Airbnb arbitrage program."
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
image: /assets/images/blog/success-stories/[student-slug].jpg
imageAlt: "[Name]'s Airbnb arbitrage success story"
featured: false
youtubeId: "[VIDEO_ID from URL]"
schema:
  type: Article
faq:
  - question: "Is Legacy Investing Show worth it?"
    answer: "Based on [Name]'s experience, [he/she] achieved [specific result] within [timeframe], demonstrating a strong ROI on the program investment."
  - question: "How long does it take to see results with Airbnb arbitrage?"
    answer: "[Name] secured [his/her] first property within [X] days/weeks and achieved positive cash flow by [timeframe]."
  - question: "Do you need experience to start Airbnb arbitrage?"
    answer: "[Name] started with [background - e.g., 'no real estate experience'] and was able to build a successful business using the Legacy Investing Show system."
  - question: "How much does [Name] make per property?"
    answer: "[Name] targets $[X] gross per property, netting approximately $[Y] after expenses - a [Z]% profit margin."
statistics:
  - value: "$[AMOUNT]"
    label: "Monthly Revenue"
    source: "Student Interview, [Month Year]"
  - value: "[NUMBER]"
    label: "Properties Managed"
  - value: "[TIMEFRAME]"
    label: "Time to First Property"
  - value: "[PERCENTAGE]%"
    label: "Profit Margin"
---
```

### Content Structure (Enhanced)

```markdown
**[Name] went from [starting situation] to earning $[amount]/month in passive income through Airbnb arbitrage.** After joining Legacy Investing Show, [he/she] secured [his/her] first property in [timeframe] and has since scaled to [X] properties generating consistent monthly revenue.

![Key metrics showing [Name]'s results](/assets/images/blog/diagrams/[slug]-metrics.svg)

## The Background

[3-4 paragraphs about their situation before - be detailed]
- Professional background and career history
- How they first discovered real estate/Airbnb
- Initial experiences and experiments
- What was missing or what they were looking for

## Why [Market] Was the Perfect Choice

[2-3 paragraphs about market selection with specific reasoning]
- Data-driven reasons for choosing the market
- Demand drivers (tourism, business travel, events, tech companies)
- Cost arbitrage opportunities
- Personal connection to the area

![Timeline of [Name]'s journey](/assets/images/blog/diagrams/[slug]-timeline.svg)

## The Strategy That Sets [Name] Apart

### [Strategy 1 Name]

[Detailed explanation with specific examples - 2-3 paragraphs]

### [Strategy 2 Name]

[Detailed explanation with specific examples - 2-3 paragraphs]

### [Strategy 3 Name]

[Detailed explanation with specific examples - 2-3 paragraphs]

![Strategy framework diagram](/assets/images/blog/diagrams/[slug]-strategy.svg)

## The Results

### By the Numbers

| Metric | Result |
|--------|--------|
| Monthly Cash Flow | $[Amount] |
| Gross Revenue Per Property | $[Amount] |
| Net Profit Per Property | $[Amount] |
| Properties Managed | [Number] |
| Profit Margin | [Percentage]% |
| Time to First Property | [Timeframe] |
| Market | [Location] |

![Results comparison](/assets/images/blog/diagrams/[slug]-results.svg)

### Key Achievements
- [Achievement 1 with specific detail and context]
- [Achievement 2 with specific detail and context]
- [Achievement 3 with specific detail and context]
- [Achievement 4 with specific detail and context]

## Key Lessons from [Name]'s Journey

> "[Direct quote from video about a key insight]"

### 1. [Lesson Title]

[2-3 paragraphs explaining this lesson with specific examples from their story]

### 2. [Lesson Title]

[2-3 paragraphs explaining this lesson with specific examples]

### 3. [Lesson Title]

[2-3 paragraphs explaining this lesson with specific examples]

### 4. [Lesson Title]

[2-3 paragraphs explaining this lesson with specific examples]

### 5. [Lesson Title]

[2-3 paragraphs explaining this lesson with specific examples]

## Tools & Systems [Name] Uses

![Tools and tech stack](/assets/images/blog/diagrams/[slug]-tools.svg)

| Tool | Purpose |
|------|---------|
| [Tool 1] | [What it's used for] |
| [Tool 2] | [What it's used for] |
| [Tool 3] | [What it's used for] |
| [Tool 4] | [What it's used for] |

## [Name]'s Advice for Beginners

> "[Inspirational quote from the video]"

[3-4 paragraphs of detailed advice they shared, organized by theme]

## Frequently Asked Questions

### Is Legacy Investing Show worth the investment?
Based on [Name]'s experience, [he/she] invested in the program and achieved $[amount]/month within [timeframe]. The program provided [specific value: mentorship, community, systems, etc.] that accelerated [his/her] success.

### How much money do you need to start Airbnb investing?
[Name] recommends having $[amount] for your first property, covering [detailed breakdown of costs].

### Can you do this while working a full-time job?
[Detailed answer based on their experience]

### What markets are best for Airbnb investing?
[Name] chose [market] because of [specific reasons]. Key factors to consider include [list factors].

### How do you find properties with pools and premium amenities?
[Detailed answer if applicable]

### What's the biggest mistake beginners make?
[Answer based on their insights]

## Watch [Name]'s Full Interview

<iframe width="560" height="315" src="https://www.youtube.com/embed/[VIDEO_ID]" title="[Name]'s Legacy Investing Show Success Story" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

## About Legacy Investing Show

Legacy Investing Show is Preston Seo's comprehensive training program that has helped over 2,000 students build profitable Airbnb businesses. The program teaches the complete system for finding, analyzing, and managing short-term rental properties to generate passive income—whether through arbitrage, ownership, or co-hosting.

[Learn more about the Legacy Investing Show program →](/programs)

---

*This case study is based on [Name]'s interview conducted in [Month Year]. Results may vary based on individual effort, market conditions, and investment capital.*
```

## Step 5: Save Files

1. Save markdown to: `content/blog/[student-slug].md`
   - Note: Save directly in content/blog/, NOT in a subdirectory (build script limitation)

2. Save SVG diagrams to: `assets/images/blog/diagrams/`
   - `[slug]-timeline.svg`
   - `[slug]-results.svg`
   - `[slug]-strategy.svg`
   - `[slug]-tools.svg`
   - `[slug]-metrics.svg`

3. Ensure the diagrams directory exists:
```bash
mkdir -p assets/images/blog/diagrams
```

## Step 6: Verify Output

After generating, verify:
- [ ] Frontmatter is valid YAML
- [ ] All statistics have values (no placeholders like [AMOUNT])
- [ ] FAQ section has 5-6 questions
- [ ] Answer-first format (first paragraph contains key result)
- [ ] YouTube video ID is correct
- [ ] Word count is 2,000+ words (enhanced requirement)
- [ ] All SVG files are valid and saved
- [ ] SVG paths in markdown match actual file locations

## Step 7: Build and Deploy

```bash
# Build the blog
npm run build:blog

# Preview locally
npm run start
# Preview at http://localhost:3000/blog/[student-slug]

# Commit and push for Vercel deployment
git add content/blog/[slug].md assets/images/blog/diagrams/[slug]-*.svg blog/
git commit -m "Add [Name]'s success story with visual diagrams"
git push origin main
```

## Quality Standards

- **E-E-A-T Compliance**: All facts must come from the video transcript
- **GEO Optimization**: First paragraph must directly answer "what results did they achieve?"
- **Statistics**: Include 5+ specific numbers with context
- **Visual Content**: Include 3-5 custom SVG diagrams
- **FAQ Schema**: Questions should be what users actually search for (6+ questions)
- **No Fabrication**: Only include information from the actual video
- **Word Count**: Minimum 2,000 words for comprehensive coverage
- **Quotes**: Include at least 3 direct quotes from the interview
