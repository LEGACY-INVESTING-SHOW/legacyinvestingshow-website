---
name: content-conversion-worker
description: Converts batches of wealth plan PDFs/DOCXs into SEO-optimized blog posts, expands skeleton posts, and performs final polish on the Legacy Investing Show website.
---

# Content Conversion Worker

Handles three types of work: (1) expanding skeleton/broken posts to full content, (2) converting new wealth plan PDFs/DOCXs into blog posts, and (3) final polish across all posts. Uses the pipeline infrastructure from `scripts/wealth-plan-pipeline/`.

## When to Use This Skill

Invoke this skill when:
- You need to expand skeleton/broken wealth plan posts from placeholder content to full 3,000-5,000 word posts
- You need to convert new wealth plan PDFs/DOCXs into blog posts
- You need to run final polish (PII sweep, sitemap, cross-links, build verification)
- You need to verify generated blog posts render correctly and contain no PII

## Required Skills

- **Python 3.11+** — for running extraction and anonymization scripts
- **Node.js 18+** — for `npm run build:blog` and `npm run build`
- **agent-browser** — for spot-checking random posts on localhost:3000

## Context

**Pipeline scripts** (already functional):
```
scripts/wealth-plan-pipeline/
  ├── extractor.py          # PDF/DOCX extraction
  ├── generator.py           # Markdown generation  
  ├── anonymizer.py          # PII scrubbing + scanning
  └── run.py                 # CLI runner
```

**Source files:** ~129 wealth plan files in:
```
"Wealth Plans /Personalized Plans/"   # per-client PDFs (~101) + subfolder for H1B
"Wealth Plans /"                       # top-level .docx files (~28)
```

**Current state:** 37 wealth plan `.md` files exist. 1 broken (ian), 17 skeletons (placeholder text), 1 thin (trent), 19 expanded.

**TARGET:** 3,000-5,000 words per post, first names only, standardized disclaimer, proper frontmatter.

## Three Types of Work

### Type A: Expand Skeleton/Broken Posts

For posts that currently have placeholder content (`[Perspective content based on extracted plan data]`) or are broken (ian-wealth-plan.md has error string only):

1. **Identify the source file** — match the first name in the filename to the corresponding source PDF or DOCX
2. **Extract text from the source** — use `python3 scripts/wealth-plan-pipeline/run.py extract "Wealth Plans /Personalized Plans/<filename>"`
3. **Regenerate the markdown** — write full 3,000-5,000 word content based on extracted plan data
4. **Replace the skeleton content** — overwrite the existing `.md` file with the new content
5. **Fix malformed headings** — replace fragment headings like `## Planned)`, `## 4. Bitcoin plan (no cap)...` with proper H2 titles
6. **Verify anonymization** — run PII sweep

For ian-wealth-plan.md specifically:
- Delete the current file (it contains an error string)
- Extract from `Ian Braunschneider - WP.pdf`
- Generate a new post with full content
- If extraction from this specific PDF fails, extract Ian Whiteley's plan as an alternative

### Type B: Convert New Wealth Plans

For wealth plans that don't have corresponding blog posts yet:

1. **Identify unconverted files** — compare source filenames against existing `content/blog/*-wealth-plan.md` files
2. **Skip files that should not be converted** — templates, prompts, addenda, intake forms, temp files
3. **For duplicate clients** — use the latest/most complete version (.docx preferred over .pdf)
4. **Extract → Anonymize → Generate** — use the pipeline scripts
5. **Expand content to 3,000-5,000 words** — the generator produces a skeleton; you must expand it with real, detailed content derived from the extracted plan data
6. **Add cross-links** to related tax strategy pages and other blog posts
7. **Build and verify**

### Type C: Final Polish

For the final milestone:
1. **Convert all remaining plans** using Type B process
2. **Run comprehensive PII sweep** across ALL `.md` and `.html` files
3. **Verify sitemap.xml** includes all wealth plan slugs
4. **Verify feed.xml** includes all wealth plan posts
5. **Verify internal links** all resolve
6. **Verify Schema.org JSON-LD** in all wealth plan HTML pages
7. **Verify canonical URLs** match expected pattern
8. **Full build verification** — `npm run build` succeeds with 0 errors
9. **Spot-check on localhost:3000** — 5 random posts render correctly

## Work Procedure

### Step 1: Setup and Batch Identification

```bash
cd "/Users/deveshdhardubey/Downloads/Legacy Investing Show/Website"
npm install
python3 -c "import fitz" 2>/dev/null || python3 -m pip install PyMuPDF --quiet
```

For Type A work: list all skeleton/broken posts
```bash
for f in content/blog/*wealth-plan*.md; do
    words=$(sed '1,/^---$/d' "$f" | sed '1,/^---$/d' | wc -w)
    if [ "$words" -lt 500 ]; then
        echo "SKELETON: $f ($words words)"
    fi
done
```

For Type B work: identify unconverted source files
```bash
python3 scripts/wealth-plan-pipeline/run.py batch-extract "Wealth Plans /Personalized Plans"
```

### Step 2: Extract Text from Source

```bash
# Extract a single file
python3 scripts/wealth-plan-pipeline/run.py extract "Wealth Plans /Personalized Plans/Qu Chen WP.pdf"

# Batch extract all files in a directory
python3 scripts/wealth-plan-pipeline/run.py batch-extract "Wealth Plans /Personalized Plans"
```

**Quality check each extraction:**
- Verify `extraction_status` is "success"
- Verify `word_count` is reasonable (2,000+ words for real plans)
- Verify `first_name` looks correct
- If extraction fails or text is garbled, note the file and skip

### Step 3: Generate and Expand Content

The `generator.py` script produces a structural skeleton. For each post, you must expand it to **3,000-5,000 words** of high-quality, SEO-optimized content by:

1. **Using the extracted wealth plan data** as the factual basis
2. **Rewriting in third-person educational tone** — position it as an educational analysis, NOT financial advice
3. **Replacing ALL `[Perspective content based on extracted plan data]` placeholders** with real content
4. **Fixing ALL malformed section headings** — replace fragment headings with proper H2 titles
5. **Adding 3-5 statistics cards** in frontmatter from plan data
6. **Adding 5-8 FAQ questions** that someone searching for this topic might ask
7. **Adding at least 1 internal link** to a tax strategy page (`/tax-strategies/...`)

**Required sections for every post:**
1. Disclaimer (auto-generated, must appear at top)
2. Introduction / Financial Overview
3. Current Financial Snapshot (anonymized)
4. Tax Strategy Recommendations
5. Investment & Wealth-Building Strategies
6. Retirement Planning Considerations
7. Action Items & Implementation Timeline
8. Key Takeaways
9. FAQ (5-8 questions)
10. CTA — Link to Legacy Investing Show programs

### Step 4: Verify Anonymization — No Full Names

```bash
python3 scripts/wealth-plan-pipeline/run.py scan-pii content/blog/
```

If any real PII is found (not just false positives like "Personalized Wealth"), fix the specific files.

Also check for known last names:
```bash
grep -ri 'braunschneider\|kovacich\|michalik\|afutiti' content/blog/*-wealth-plan*.md
```

### Step 5: Check Word Count

```bash
for f in content/blog/*wealth-plan*.md; do
    body=$(sed '1,/^---$/d' "$f" | sed '1,/^---$/d' | wc -w)
    echo "$(basename $f): $body words"
done
```

Each post must be 3,000-5,000 words. If under 3,000, expand. If over 5,000, trim.

### Step 6: Verify Frontmatter

Each post must have ALL required fields:
- `title`, `description` (150-160 chars), `date`, `author: Preston Seo`, `category: "Wealth Plan"`
- `slug`, `canonical`, `image`, `imageAlt`
- `seo.primaryKeyword`, `seo.secondaryKeywords`, `seo.longTailKeywords`, `seo.searchIntent`
- `tags` (≥3 items), `keywords`, `disclaimer: true`
- `statistics` (≥3 items with label/value/icon)
- `faq` (≥3 items with question/answer)

Spot-check 5 random files per batch.

### Step 7: Build the Blog

```bash
cd "/Users/deveshdhardubey/Downloads/Legacy Investing Show/Website"
npm run build:blog
npm run build:sitemap
```

If build fails, check the error output for the specific file and fix its frontmatter.

### Step 8: Visual Spot-Check with agent-browser

```bash
cd "/Users/deveshdhardubey/Downloads/Legacy Investing Show/Website"
npm run start
```

Use agent-browser to spot-check 3-5 random posts:
1. Navigate to `http://localhost:3000/blog` — click on a wealth plan post
2. Verify: title renders, disclaimer visible, no full names, category tag shows "Wealth Plan", FAQ section renders, statistics cards render
3. View page source: Schema.org JSON-LD present, canonical URL correct, OG tags present

### Step 9: Verify Sitemap and RSS

```bash
grep -c "wealth-plan" sitemap.xml
grep -c "wealth-plan" feed.xml
```

Counts should match the number of wealth plan blog posts.

### Step 10: Final PII Sweep

After all posts in a batch are built and verified:
```bash
cd "/Users/deveshdhardubey/Downloads/Legacy Investing Show/Website"
python3 scripts/wealth-plan-pipeline/run.py scan-pii content/blog/
```

Also scan HTML:
```bash
grep -rn '[a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]*\.[a-zA-Z]*' blog/*wealth-plan*.html || echo "No emails found"
grep -rn '[0-9]\{3\}[-.][0-9]\{2\}[-.][0-9]\{4\}' blog/*wealth-plan*.html || echo "No SSN patterns found"
```

---

## Filename and Slug Conventions

| Source File | First Name | Slug | Markdown File |
|------------|-----------|------|---------------|
| `Qu Chen WP.pdf` | Qu | `qu-wealth-plan` | `content/blog/qu-wealth-plan.md` |
| `Trent Hanson WP.docx` | Trent | `trent-wealth-plan` | `content/blog/trent-wealth-plan.md` |
| `victoria_west_-_wss.pdf` | Victoria | `victoria-wealth-strategy-snapshot` | `content/blog/victoria-wealth-strategy-snapshot.md` |
| `Kris Kouzougian WP .docx` | Kris | `kris-wealth-plan` | `content/blog/kris-wealth-plan.md` |

**Rules:** First name only in slug (no last names), append plan type, strip trailing spaces.

## Edge Cases

| Situation | Action |
|-----------|--------|
| PDF extraction returns empty/blank text | Skip the file, note it in the handoff |
| Filename has special characters | Strip to alphanumeric + hyphens for slug |
| Duplicate client (multiple versions) | Process latest/most complete version only |
| File not a client plan (prompt, intake form) | Skip entirely |
| Extracted word count < 1,000 | Expand content to 3,000+ using educational context |
| Couple/family plan (e.g., "Hang & Antonio") | Use first names in content, slug based on primary first name |
| H1B Visa plan | Use slug suffix `-h1b-wealth-plan` |

## When to Return to Orchestrator

Return when:
1. All posts in the assigned batch have been converted/expanded
2. Every post passes the PII sweep (zero real findings)
3. Every post has the disclaimer at the top
4. Every post meets the 3,000-5,000 word count target
5. `npm run build:blog` succeeds with no errors
6. Spot-checks on localhost:3000 confirm correct rendering

If blockers are encountered (corrupted PDFs, persistent build errors), report the specific files and errors.

## Example Handoff

```json
{
  "salientSummary": "Expanded 18 skeleton posts and fixed 1 broken post. All posts now have 3,000-5,000 words of real content, no placeholders, proper headings, and valid frontmatter. Build succeeds with 0 errors.",
  "whatWasImplemented": [
    "content/blog/ian-wealth-plan.md — Regenerated from source (was broken, now 3,450 words)",
    "content/blog/trent-wealth-plan.md — Expanded from 85 words to 3,200 words",
    "content/blog/abel-wealth-plan.md — Expanded from 125 words to 3,500 words",
    "... (15 more expanded posts)"
  ],
  "whatWasLeftUndone": [
    "57 remaining wealth plans still need conversion",
    "No images created for blog posts (using placeholder paths)"
  ],
  "verification": {
    "commandsRun": [
      "npm run build:blog — SUCCESS (0 errors)",
      "npm run build:sitemap — SUCCESS",
      "python3 scripts/wealth-plan-pipeline/run.py scan-pii content/blog/ — ZERO real PII findings",
      "Word count check — all posts 3000-5000 words"
    ],
    "interactiveChecks": [
      "localhost:3000/blog — Wealth Plan category filter shows correct count",
      "localhost:3000/blog/ian-wealth-plan — renders correctly, disclaimer visible",
      "localhost:3000/blog/abel-wealth-plan — renders correctly, FAQ section present"
    ]
  },
  "tests": {
    "added": []
  },
  "discoveredIssues": []
}
```
