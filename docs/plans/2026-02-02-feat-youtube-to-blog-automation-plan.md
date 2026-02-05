---
title: "YouTube-to-Blog Automation System with SEO Optimization"
type: feat
date: 2026-02-02
priority: high
status: planning
---

# YouTube-to-Blog Automation System

## Overview

Build an automated system that converts qualifying YouTube videos from the @LegacyInvestingShow channel into SEO-optimized blog posts. The system filters videos by duration (≥7 minutes) and view count (≥2,000), extracts transcripts, and generates long-form structured content with keyword research and SEO enhancement.

## Problem Statement

**Current State:**
- YouTube channel has 200+ videos with valuable content
- Blog has 45+ posts but creation is manual and time-consuming  
- Existing `youtube-to-blog.js` script is a placeholder with no actual transcript extraction
- Content team must manually watch videos, write transcripts, and create blog posts
- SEO optimization requires separate research and manual keyword integration

**Desired State:**
- Automated discovery of high-performing videos (7+ min, 2K+ views)
- Automatic transcript extraction and blog generation
- SEO-optimized content with keyword research built-in
- For shorter videos, expand topics with deep research to create comprehensive guides
- Integration with existing markdown-based blog system

**Why This Matters:**
- Scale content production without linear human effort
- Capture SEO value from existing video content
- Repurpose successful video topics into searchable blog format
- Create comprehensive resource library for wealth-building education

## Proposed Solution

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    YouTube-to-Blog Pipeline                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Trigger    │───▶│ Fetch Videos │───▶│    Filter    │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│        │                                           │            │
│        ▼                                           ▼            │
│  ┌──────────────┐                        ┌──────────────┐      │
│  │  Cron Job    │                        │ ≥7min & 2K   │      │
│  │  Manual CLI  │                        │ views?       │      │
│  │  Webhook     │                        └──────────────┘      │
│  └──────────────┘                               │               │
│                                                 ▼               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Content Generation Phase                    │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │   │
│  │  │  Extract    │───▶│   Process   │───▶│    SEO      │  │   │
│  │  │ Transcript  │    │  Content    │    │ Optimize    │  │   │
│  │  └─────────────┘    └─────────────┘    └─────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            │                                    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Output & Integration Phase                  │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │   │
│  │  │   Create    │───▶│    Build    │───▶│   Deploy    │  │   │
│  │  │   Markdown  │    │    Site     │    │   Ready     │  │   │
│  │  └─────────────┘    └─────────────┘    └─────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. Video Discovery & Filtering
- **YouTube Data API v3**: Fetch channel videos with metadata
- **Filters**: Duration ≥7 minutes, Views ≥2,000
- **State Management**: Track processed videos in `.youtube-state.json`
- **Deduplication**: Skip videos already processed

#### 2. Transcript Extraction
- **Primary**: TranscriptAPI (https://transcriptapi.com/)
- **Fallback**: Manual transcription queue for failed extractions
- **Rate Limiting**: Respect API limits with exponential backoff

#### 3. Content Generation
- **Long Videos (≥7 min)**: Structure transcript into blog format
- **Short Videos (<7 min)**: Expand topic with SEO research
- **SEO Enhancement**: Keyword research, internal linking, optimization
- **LLM Integration**: Claude API for content expansion and enhancement

#### 4. Blog Integration
- **Markdown Generation**: Create files in `content/blog/*.md`
- **Frontmatter**: Complete YAML with SEO fields, schema data
- **Build Trigger**: Run `npm run build:blog` automatically
- **Template**: Use existing `templates/blog-post.html`

### Implementation Phases

#### Phase 1: Core Pipeline (MVP)
**Goal**: Basic automated video-to-blog conversion

**Tasks:**
1. Set up YouTube Data API v3 integration
2. Implement video filtering (duration, views)
3. Integrate TranscriptAPI for transcript extraction
4. Create markdown generation with basic frontmatter
5. Build CLI command: `node scripts/youtube-to-blog.js`
6. Manual review workflow (draft mode)

**Deliverables:**
- `scripts/youtube-to-blog.js` (enhanced)
- `.env` updated with API keys
- Basic transcript-to-markdown conversion
- State management for tracking

**Success Criteria:**
- Can process 1 video end-to-end
- Creates valid markdown file
- Proper error handling and logging

#### Phase 2: SEO Enhancement
**Goal**: SEO-optimized content generation

**Tasks:**
1. Implement keyword research workflow
2. Add content expansion for short videos
3. Generate comprehensive frontmatter (SEO fields)
4. Auto-categorize videos based on content
5. Add internal linking suggestions
6. Create FAQ section generation

**Deliverables:**
- SEO research module
- Content expansion prompts
- Category detection logic
- Enhanced frontmatter generation

**Success Criteria:**
- Generated posts rank for target keywords
- Posts include all required SEO fields
- Category assignment is 90%+ accurate

#### Phase 3: Skill Creation & Automation
**Goal**: Claude Skill for reusable workflow

**Tasks:**
1. Design Skill interface (CLI/prompts)
2. Create skill configuration
3. Add batch processing capability
4. Implement auto-publish option
5. Create monitoring dashboard

**Deliverables:**
- `.claude/skills/youtube-to-blog/SKILL.md`
- Batch processing script
- Auto-publish workflow
- Monitoring/alerting setup

**Success Criteria:**
- Skill can be invoked via Claude
- Batch processing works reliably
- Auto-publish option functions correctly

## Technical Considerations

### API Dependencies

| API | Purpose | Rate Limits | Fallback |
|-----|---------|-------------|----------|
| YouTube Data API v3 | Video metadata | 10,000 units/day | RSS feed (limited) |
| TranscriptAPI | Transcript extraction | TBD | Manual queue |
| Claude API | Content expansion | 40K TPM | Template-based |

### Data Flow

```mermaid
flowchart LR
    A[YouTube API] -->|videoId, title, duration, views| B[Filter]
    B -->|qualifying videos| C[TranscriptAPI]
    C -->|transcript text| D[Content Processor]
    D -->|structured content| E[SEO Optimizer]
    E -->|enhanced content| F[Markdown Generator]
    F -->|content/blog/*.md| G[Build System]
    G -->|blog/*.html| H[Deployed Site]
```

### State Management

Enhanced `.youtube-state.json` structure:
```json
{
  "lastChecked": "2026-02-02T10:00:00Z",
  "videos": [
    {
      "id": "video123",
      "title": "Video Title",
      "status": "published",
      "processedAt": "2026-02-01T15:30:00Z",
      "markdownFile": "video-title-blog-post.md",
      "metrics": {
        "duration": 720,
        "views": 5000
      }
    }
  ],
  "queue": [
    {
      "id": "video456",
      "status": "pending_review",
      "submittedAt": "2026-02-02T09:00:00Z"
    }
  ],
  "errors": [
    {
      "id": "video789",
      "error": "TranscriptAPI timeout",
      "retries": 2,
      "lastError": "2026-02-01T20:00:00Z"
    }
  ]
}
```

### Security Considerations

- **API Keys**: Store in `.env` (never commit)
- **YouTube ToS**: Verify transcript extraction compliance
- **Rate Limiting**: Implement respectful API usage
- **Error Logging**: Don't log sensitive data

### Content Quality Gates

1. **Minimum Requirements:**
   - Word count: ≥800 words
   - Headings: At least 3 H2 sections
   - Keywords: Primary + 3+ secondary
   - Readability: Flesch score >50

2. **Duplicate Detection:**
   - Compare transcript hash against existing posts
   - Similarity threshold: <80% to proceed

3. **Validation:**
   - Frontmatter completeness check
   - Schema markup validity
   - Link validation

## Acceptance Criteria

### Functional Requirements

- [ ] Can fetch videos from @LegacyInvestingShow channel
- [ ] Filters videos by duration (≥7 min) and views (≥2,000)
- [ ] Extracts transcripts using TranscriptAPI
- [ ] Generates markdown files in `content/blog/`
- [ ] Includes complete YAML frontmatter (SEO fields)
- [ ] Integrates with existing build system
- [ ] Tracks processed videos in state file
- [ ] Handles API errors gracefully

### Non-Functional Requirements

- [ ] Processing time: <2 min per video
- [ ] API quota: Stays within YouTube Data API limits
- [ ] Error rate: <5% of videos fail processing
- [ ] Duplicate detection: Prevents re-processing
- [ ] State persistence: Survives restarts

### Quality Requirements

- [ ] Generated posts meet SEO standards
- [ ] Frontmatter includes all required fields
- [ ] Content is readable and well-structured
- [ ] Category assignment is accurate
- [ ] Internal links are valid

## Open Questions

### 🔴 Critical (Blocks Implementation)

1. **TranscriptAPI Integration Details**
   - What's the exact REST endpoint format?
   - How to authenticate (Bearer token in header)?
   - What are the rate limits?
   - **Action Required**: Get API documentation

2. **"Go Deeper" Workflow Definition**
   - Is this LLM-based expansion with prompts?
   - Should it fetch related articles and synthesize?
   - What's the target word count for expanded posts?
   - **Action Required**: Define expansion methodology

3. **Publish vs Draft Decision**
   - Should posts auto-publish or require review?
   - If review: what's the approval workflow?
   - **Action Required**: Choose workflow mode

### 🟡 Important (Affects Architecture)

4. **Category Auto-Assignment**
   - How to detect category from video content?
   - Current categories: "Airbnb Arbitrage", "Investing", "Tax Strategies", "Real Estate", "Wealth Building"
   - **Decision Needed**: Keyword matching vs LLM classification

5. **Image Strategy**
   - Use YouTube thumbnail? (default approach)
   - Generate AI images? (enhancement)
   - Leave blank for manual addition?
   - **Decision Needed**: Choose approach

6. **Error Recovery**
   - Retry count for failed API calls?
   - Backoff strategy (exponential)?
   - Alert thresholds?
   - **Decision Needed**: Define retry policy

## References & Research

### Existing Code Patterns

**Blog Build System** (`scripts/build-blog.js:1-807`)
- Uses `gray-matter` for frontmatter parsing
- Uses `marked` for markdown conversion
- Template: `templates/blog-post.html`
- Output: `blog/*.html`

**YouTube Integration** (`scripts/youtube-to-blog.js:1-319`)
- Current placeholder implementation
- Uses RSS feed for basic video list
- Has state management structure
- Configuration via environment variables

**Blog Post Format** (`content/blog/13-income-streams-built-by-30.md`)
- Comprehensive frontmatter with SEO fields
- Schema.org structured data
- Statistics cards, FAQ sections
- YouTube video integration

### API Documentation

- **YouTube Data API v3**: https://developers.google.com/youtube/v3
- **TranscriptAPI**: https://transcriptapi.com/docs/api/
- **Claude API**: https://docs.anthropic.com/

### Similar Implementations

- Existing blog system supports:
  - Markdown with YAML frontmatter
  - Automatic TOC generation for long posts
  - Statistics cards from frontmatter
  - FAQ accordions with Schema markup
  - Related posts (same category)
  - SEO meta tags and Open Graph

## Resource Requirements

### API Keys Needed

```bash
# .env additions required:
YOUTUBE_API_KEY=your_youtube_data_api_key
TRANSCRIPT_API_KEY=sk_4oltHwdDEbomtjwMGq9DM_d9lRvNk8j-CSVID8jccRI
ANTHROPIC_API_KEY=your_claude_api_key  # For content expansion
```

### Dependencies to Add

```json
{
  "dependencies": {
    "axios": "^1.6.0",           // HTTP client for APIs
    "youtube-transcript": "^1.2.0", // Alternative transcript library
    "@anthropic-ai/sdk": "^0.24.0"  // Claude API client
  }
}
```

### Infrastructure

- Cron job capability (for automated runs)
- Log storage for error tracking
- Optional: Slack/Discord webhook for notifications

## Success Metrics

### Primary KPIs

1. **Content Volume**: X blog posts generated per month
2. **SEO Performance**: Y% of generated posts rank in top 10 for target keywords
3. **Time Savings**: Z hours saved vs manual creation per post
4. **Quality Score**: Average content quality rating (manual review)

### Operational KPIs

1. **Success Rate**: % of videos successfully processed
2. **Error Rate**: % of processing attempts that fail
3. **API Efficiency**: Units used within quota limits
4. **Review Time**: Average time from generation to publish

## Future Considerations

### Phase 4 Enhancements (Post-MVP)

1. **Multi-Channel Support**: Process videos from multiple channels
2. **A/B Testing**: Test different content formats
3. **Analytics Integration**: Track post performance automatically
4. **Content Refresh**: Auto-update old posts with new information
5. **Social Media**: Auto-generate social snippets for each post

### Extensibility

- Plugin architecture for custom processors
- Webhook support for external integrations
- GraphQL API for content querying
- Multi-language support

---

## Next Steps

1. **Resolve Critical Questions** (Priority: High)
   - Get TranscriptAPI documentation
   - Define "go deeper" workflow
   - Decide publish vs draft mode

2. **Set Up Development Environment** (Priority: High)
   - Add API keys to `.env`
   - Install new dependencies
   - Create feature branch

3. **Implement Phase 1** (Priority: High)
   - Start with YouTube API integration
   - Add transcript extraction
   - Build basic markdown generation

4. **Create Skill Documentation** (Priority: Medium)
   - Write `.claude/skills/youtube-to-blog/SKILL.md`
   - Include usage examples
   - Document prompts and workflows

5. **Test & Iterate** (Priority: Medium)
   - Process 5-10 test videos
   - Review generated content
   - Refine prompts and templates

---

*Plan created: 2026-02-02*
*Status: Awaiting clarification on critical questions*
