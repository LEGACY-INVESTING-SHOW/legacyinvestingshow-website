# Legacy Investing Show

Build Wealth That Lasts Beyond A Paycheck - Official website for the Legacy Investing Show, featuring financial education programs, success stories, and resources for building generational wealth through Airbnb arbitrage and real estate investing.

## Tech Stack

- **HTML5** - Semantic markup with accessibility best practices
- **Tailwind CSS v3** - Utility-first CSS framework
- **Node.js** - Build scripts for blog generation, sitemap, and RSS feeds
- **Sharp** - Image optimization
- **Marked** - Markdown parsing for blog posts
- **Gray Matter** - YAML frontmatter parsing

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd legacyinvestingshow-website

# Install dependencies
npm install
```

### Development

```bash
# Start Tailwind CSS in watch mode
npm run dev

# Serve the site locally (in a separate terminal)
npm run start
```

The site will be available at `http://localhost:3000`.

### Build for Production

```bash
# Build all assets (CSS, blog, sitemap, RSS)
npm run build

# Or run individual build steps:
npm run build:css      # Minify Tailwind CSS
npm run build:blog     # Generate blog HTML from markdown
npm run build:sitemap  # Generate sitemap.xml
npm run build:rss      # Generate RSS feed (feed.xml)
npm run build:images   # Optimize images with Sharp
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Watch mode for Tailwind CSS development |
| `npm run build` | Build all assets for production |
| `npm run build:css` | Minify Tailwind CSS |
| `npm run build:blog` | Generate blog pages from markdown |
| `npm run build:sitemap` | Generate sitemap.xml |
| `npm run build:rss` | Generate RSS feed |
| `npm run build:images` | Optimize images |
| `npm run cms:sync:blog` | Sync canonical markdown into CMS `cms/src/blog` |
| `npm run cms:check:parity` | Byte-compare canonical and CMS markdown |
| `npm run cms:build` | Build Eleventy CMS site from `cms/` |
| `npm run cms:smoke` | Run CMS smoke checks on built Eleventy output |
| `npm run cms:publish:posts` | Publish CMS-rendered posts into `blog/*.html` |
| `npm run cms:verify` | Run full CMS sync + parity + build + smoke chain |
| `npm run start` | Start local development server |

## Deployment

### Vercel (Recommended)

This project is configured for Vercel deployment with `vercel.json`.

1. **Connect Repository**: Link your GitHub/GitLab repository to Vercel
2. **Configure Build Settings**:
   - Framework Preset: `Other`
   - Build Command: `npm run build`
   - Output Directory: `.` (root)
   - Install Command: `npm install`
3. **Deploy**: Vercel will automatically deploy on push to main

**Manual Deployment:**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Vercel Configuration Features

The `vercel.json` includes:
- Clean URLs (removes .html extensions)
- No trailing slashes
- Permanent redirects for .html URLs
- Optimized caching headers:
  - HTML: No cache (always fresh)
  - CSS/JS: 1 year with immutable
  - Images/Fonts: 1 year cache
- Security headers (X-Content-Type-Options, X-Frame-Options, etc.)

## Project Structure

```
legacyinvestingshow-website/
├── index.html              # Homepage
├── about.html              # About Preston Spratt
├── programs.html           # Training programs
├── success-stories.html    # Student success stories
├── blog/
│   ├── index.html          # Blog listing page
│   └── *.html              # Individual blog posts
├── assets/
│   ├── css/
│   │   ├── input.css       # Tailwind input file
│   │   └── styles.css      # Compiled CSS
│   └── images/             # Image assets
├── templates/
│   └── blog-post.html      # Blog post template
├── scripts/
│   ├── build-blog.js       # Blog generator
│   ├── generate-sitemap.js # Sitemap generator
│   └── generate-rss.js     # RSS feed generator
├── cms/                    # Eleventy CMS workspace (templates + src + build)
├── sitemap.xml             # Generated sitemap
├── feed.xml                # RSS feed
├── robots.txt              # Crawler directives
├── llms.txt                # LLM context file
├── vercel.json             # Vercel configuration
├── tailwind.config.js      # Tailwind configuration
└── package.json            # Project dependencies
```

## SEO Features

- **Schema Markup**: JSON-LD structured data for Organization, Person, and Course types
- **llms.txt**: Context file for AI language models
- **sitemap.xml**: Auto-generated XML sitemap
- **feed.xml**: RSS feed for blog syndication
- **robots.txt**: Search engine crawler directives
- **Meta Tags**: Open Graph and Twitter Card support
- **Semantic HTML**: Proper heading hierarchy and ARIA labels

## Blog System

The blog uses a markdown-based system with YAML frontmatter.

### Creating a New Blog Post

1. Create a new `.md` file in the blog content directory
2. Add frontmatter at the top:

```yaml
---
title: "Your Blog Post Title"
description: "A brief description for SEO"
date: "2025-01-23"
author: "Preston Spratt"
image: "/assets/images/blog-image.jpg"
tags: ["investing", "airbnb", "wealth"]
---
```

3. Write your content in Markdown below the frontmatter
4. Run `npm run build:blog` to generate the HTML

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary and unlicensed for public use. All rights reserved by Legacy Investing Show.
