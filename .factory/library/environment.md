# Environment

Environment variables, external dependencies, and setup notes.

**What belongs here:** Required env vars, external API keys/services, dependency quirks, platform-specific notes.
**What does NOT belong here:** Service ports/commands (use `.factory/services.yaml`).

---

## Node.js

- Node.js 18+ required
- `npm install` to install dependencies
- Build pipeline: `npm run build` (runs all build steps in sequence)

## Python

- Python 3.11 available at `python3`
- PyMuPDF (`fitz`) installed for PDF text extraction
- No virtual environment needed — system Python has all required packages

## Blog Build Pipeline

- Source files: `content/blog/*.md`
- Template: `templates/blog-post.html`
- Build script: `scripts/build-blog.js`
- Output: `blog/*.html` + `blog/index.html`
- Full build: `npm run build` (builds CSS, blog, tax strategies, sitemap, RSS)

## Wealth Plans Source

- Location: `/Users/deveshdhardubey/Downloads/Legacy Investing Show/Website/Wealth Plans /Personalized Plans/`
- Note: Directory name has a trailing space
- ~82 unique client files after deduplication (PDFs and DOCXs)
- Two format types: WP (Wealth Plan) and WSS (Wealth Strategy Snapshot)

## Site URL

- Production: https://www.legacyinvestingshow.com
- Local dev: http://localhost:3000
