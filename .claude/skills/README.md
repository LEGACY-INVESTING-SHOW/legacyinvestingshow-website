# Legacy Investing Show - Claude Code Skills

This directory contains custom Claude Code skills for automating SEO content generation.

## Available Skills

| Skill | Command | Description |
|-------|---------|-------------|
| YouTube to Blog | `/youtube-to-blog` | Convert YouTube testimonials into case study blog posts |
| Generate City Page | `/generate-city-page` | Create city-specific Airbnb arbitrage landing pages |
| Batch Content | `/batch-content` | Generate multiple posts efficiently |
| SEO Review | `/seo-review` | Review posts for SEO/GEO optimization before publishing |

## Quick Start

### 1. Convert a YouTube Testimonial to Blog Post

```bash
# In Claude Code, run:
/youtube-to-blog https://youtube.com/watch?v=VIDEO_ID "Student Name"
```

This will:
- Extract the video transcript
- Structure it as a case study
- Generate proper frontmatter with FAQ and statistics
- Save to `content/blog/success-stories/[student-slug].md`

### 2. Generate a City Landing Page

```bash
/generate-city-page Austin TX
```

This will:
- Research current Airbnb market data for Austin
- Find local regulations and permit requirements
- Generate a comprehensive landing page
- Save to `content/cities/airbnb-arbitrage-austin.md`

### 3. Batch Generate Content

```bash
# Generate 5 case studies from YouTube
/batch-content youtube 5

# Generate 5 educational guides from topic list
/batch-content topics 5

# Generate 5 city pages
/batch-content cities 5
```

### 4. Review Content Before Publishing

```bash
/seo-review content/blog/success-stories/sarah-johnson.md
```

This will check:
- Frontmatter completeness
- GEO optimization (answer-first, statistics)
- Traditional SEO (title, meta, headings)
- E-E-A-T signals
- Schema readiness

## Workflow: Daily Content Generation

### Morning Session (30-45 min)

1. **Pick a video** from the Success Stories playlist
2. **Run** `/youtube-to-blog [URL] "[Name]"`
3. **Review** the generated content in `content/blog/success-stories/`
4. **Run** `/seo-review [file-path]` to verify quality
5. **Build and deploy**:
   ```bash
   npm run build:blog
   git add content/blog/
   git commit -m "Add: [Student Name] success story"
   git push
   ```

### Weekly Schedule

| Day | Content Type | Skill to Use |
|-----|--------------|--------------|
| Monday | Case Study | `/youtube-to-blog` |
| Tuesday | Educational Guide | `/batch-content topics 1` |
| Wednesday | Case Study | `/youtube-to-blog` |
| Thursday | City Page | `/generate-city-page` |
| Friday | Case Study | `/youtube-to-blog` |

This pace produces **15-20 posts per month**, reaching 45-60 posts in 90 days.

## Data Files

The skills use these data files:

| File | Purpose |
|------|---------|
| `data/topics.json` | Educational content topic list with keywords |
| `data/cities.json` | City list for landing pages |
| `data/youtube-queue.json` | YouTube videos to process |

## Content Directories

Generated content goes to:

| Directory | Content Type |
|-----------|--------------|
| `content/blog/success-stories/` | Case studies from YouTube |
| `content/blog/guides/` | Educational content |
| `content/cities/` | City landing pages |

## Build Commands

```bash
# Build blog HTML from markdown
npm run build:blog

# Build everything (CSS, blog, sitemap, RSS)
npm run build

# Start local server to preview
npm run start
```

## Tips for Best Results

1. **Always review AI-generated content** before publishing (E-E-A-T requirement)
2. **Verify statistics** - make sure numbers match the source
3. **Check FAQ questions** match what people actually search for
4. **Run `/seo-review`** before every publish
5. **Process in batches** of 3-5 to maintain quality

## Troubleshooting

### Skill not found
Make sure you're in the project directory:
```bash
cd "/Users/deveshdhardubey/legacyinvestingshow website"
```

### Build fails
Check that frontmatter is valid YAML:
- No tabs (use spaces)
- Quotes around strings with special characters
- Valid date format (YYYY-MM-DD)

### Content not appearing
1. Check file is in correct directory
2. Verify frontmatter has all required fields
3. Run `npm run build:blog` to regenerate

## Resources

- [90-Day SEO Plan](../plans/seo-automation-implementation-plan.md)
- [Original SEO Strategy](../plans/legacy-investing-show-90-day-seo-reputation-plan.md)
- [Claude Code Skills Docs](https://code.claude.com/docs/en/skills)
