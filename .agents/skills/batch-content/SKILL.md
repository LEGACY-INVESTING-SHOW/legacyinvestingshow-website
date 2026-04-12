---
name: batch-content
description: Generate multiple blog posts in batch from a topic list or YouTube playlist. Use for programmatic SEO when you need to create many posts efficiently. Triggers on "batch generate", "multiple posts", "content batch", "scale content".
argument-hint: <type> <count>
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Grep, Glob, Bash, WebSearch, WebFetch
---

# Batch Content Generation

Generate multiple blog posts efficiently for programmatic SEO.

## Arguments

$ARGUMENTS should contain:
- Type: `youtube` | `topics` | `cities`
- Count: Number of posts to generate (recommended: 3-5 per batch)

Example: `/batch-content youtube 5`

## Mode 1: YouTube Playlist Processing

### Step 1: Get Playlist Videos

For the Legacy Investing Show playlists:
- Success Stories: `PLDe1awSN88zj_V-Y-cUuKDTw6N9KWLk7C`
- Main Channel: `@LegacyInvestingShow`

List the videos to process:
```bash
# Option A: If yt-dlp is available
yt-dlp --flat-playlist --print "%(id)s|%(title)s" "https://www.youtube.com/playlist?list=PLDe1awSN88zj_V-Y-cUuKDTw6N9KWLk7C"
```

Or manually list from the playlist page.

### Step 2: Create Processing Queue

Create a file at `data/youtube-queue.json`:
```json
{
  "videos": [
    {
      "id": "VIDEO_ID_1",
      "title": "Video Title 1",
      "studentName": "Student Name",
      "status": "pending"
    },
    {
      "id": "VIDEO_ID_2",
      "title": "Video Title 2",
      "studentName": "Student Name",
      "status": "pending"
    }
  ]
}
```

### Step 3: Process Each Video

For each pending video:
1. Mark status as "processing"
2. Use `/youtube-to-blog` skill to convert
3. Mark status as "completed" when done
4. Continue to next video

### Step 4: Batch Build

After all videos processed:
```bash
npm run build:blog
git add content/blog/success-stories/
git commit -m "Add: Batch case studies - [LIST NAMES]"
```

---

## Mode 2: Topic List Processing

### Step 1: Load Topic List

Read from `data/topics.json` or use this default list:

```json
{
  "guides": [
    {
      "topic": "Complete Guide to Airbnb Arbitrage in 2026",
      "keywords": ["airbnb arbitrage", "airbnb arbitrage guide", "how to start airbnb arbitrage"],
      "type": "pillar",
      "status": "pending"
    },
    {
      "topic": "How to Find Landlords Who Allow Airbnb Arbitrage",
      "keywords": ["airbnb friendly landlords", "convince landlord airbnb"],
      "type": "cluster",
      "status": "pending"
    },
    {
      "topic": "Airbnb Arbitrage Startup Costs Breakdown",
      "keywords": ["airbnb arbitrage costs", "how much to start airbnb arbitrage"],
      "type": "cluster",
      "status": "pending"
    }
  ]
}
```

### Step 2: Generate Each Post

For each pending topic:

#### Research Phase
```
WebSearch: "[TOPIC] 2026"
WebSearch: "[PRIMARY KEYWORD] guide"
```

#### Content Generation
Create markdown following this template:

```yaml
---
title: "[Topic Title] | Legacy Investing Show"
description: "[150-160 char description with primary keyword]"
date: [TODAY]
modifiedDate: [TODAY]
author: Preston Seo
category: [Guides | Tips | Strategy]
tags: [from keywords list]
image: /assets/images/blog/[topic-slug].jpg
schema:
  type: [Article | HowTo]
faq:
  - question: "[FAQ 1 - from People Also Ask]"
    answer: "[Direct answer]"
statistics:
  - value: "[STAT]"
    label: "[LABEL]"
    source: "[SOURCE]"
---

**[Answer-first paragraph with key statistic and direct answer to title question]**

## [Section 1 - Matches search intent]

[Content with statistics and actionable advice]

## [Section 2]

[More content]

## FAQ

### [Question 1]?
[Answer]

### [Question 2]?
[Answer]

## Conclusion

[Summary and CTA to Legacy Investing Show]
```

### Step 3: Quality Check

For each generated post, verify:
- [ ] Title includes primary keyword
- [ ] First paragraph answers the title question
- [ ] 3+ statistics with sources
- [ ] FAQ section with 3-5 questions
- [ ] Word count 1,200+ words
- [ ] Internal links to related content

---

## Mode 3: City Pages Batch

### Step 1: Load City List

From `data/cities.json`:
```json
{
  "cities": [
    {"city": "Austin", "state": "TX", "priority": 1, "status": "pending"},
    {"city": "Nashville", "state": "TN", "priority": 2, "status": "pending"},
    {"city": "Miami", "state": "FL", "priority": 3, "status": "pending"},
    {"city": "Phoenix", "state": "AZ", "priority": 4, "status": "pending"},
    {"city": "Denver", "state": "CO", "priority": 5, "status": "pending"}
  ]
}
```

### Step 2: Process Each City

For each pending city (in priority order):
1. Mark status as "processing"
2. Use `/generate-city-page` skill
3. Verify 30% differentiation from existing city pages
4. Mark status as "completed"

### Step 3: Differentiation Verification

Before finalizing, compare against existing city pages:
- Different statistics (unique to each city)
- Different neighborhoods (city-specific)
- Different regulations (verified from city sources)
- Different seasonal patterns
- Unique local context

---

## Batch Processing Best Practices

### Rate Limiting
- Process 3-5 posts per session
- Take breaks between batches for human review
- Don't generate more than 10 posts without review

### Quality Gates
After each batch:
1. Review all generated content
2. Verify facts and statistics
3. Check for duplicate content
4. Run spell/grammar check
5. Verify internal links

### Progress Tracking
Maintain status in data files:
- `pending` - Not started
- `processing` - Currently being generated
- `review` - Generated, needs human review
- `completed` - Published

### Error Handling
If generation fails:
1. Log the error
2. Mark status as "error"
3. Continue with next item
4. Return to errors at end of batch

---

## Quick Commands

### Generate 5 Case Studies
```
/batch-content youtube 5
```

### Generate 5 Educational Posts
```
/batch-content topics 5
```

### Generate 5 City Pages
```
/batch-content cities 5
```

### Build All Content
```bash
npm run build
git add .
git commit -m "Add: Batch content - [DATE]"
git push
```

---

## Content Calendar Integration

After generating content, update `data/content-calendar.json`:
```json
{
  "schedule": [
    {"date": "2026-01-27", "slug": "sarah-johnson-success-story", "type": "case-study"},
    {"date": "2026-01-29", "slug": "airbnb-arbitrage-startup-costs", "type": "guide"},
    {"date": "2026-01-31", "slug": "airbnb-arbitrage-austin", "type": "city-page"}
  ]
}
```

This allows for staged publishing rather than all at once.
