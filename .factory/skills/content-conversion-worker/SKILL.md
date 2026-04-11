---
name: content-conversion-worker
description: Converts batches of wealth plan PDFs/DOCXs into SEO-optimized blog posts on the Legacy Investing Show website. Handles extraction, anonymization, markdown generation, building, and verification for each assigned batch.
---

# Content Conversion Worker

Converts batches of wealth plan files into published, SEO-optimized blog posts. This worker owns Milestones 2-5 of the wealth-plan-to-blog mission and relies on the pipeline infrastructure set up by `pipeline-setup-worker`.

## When to Use This Skill

Invoke this skill when:
- The extraction pipeline (from `pipeline-setup-worker`) is already in place and tested
- You need to convert a batch of wealth plan PDFs/DOCXs into blog posts
- You need to verify generated blog posts render correctly and contain no PII
- You need to update the sitemap after adding new posts

Do NOT invoke for:
- Initial pipeline setup (use `pipeline-setup-worker`)
- Modifying the build system or templates (use `pipeline-setup-worker`)
- SEO audits unrelated to wealth plan content

## Required Skills

- **Python 3.11+** — for running extraction and anonymization scripts (`PyMuPDF`, `zipfile`, `re`)
- **Node.js 18+** — for `npm run build:blog` and `npm run build`
- **agent-browser** — for spot-checking random posts on localhost:3000

## Context

**Source files:** ~129 wealth plan PDFs and DOCXs in:
```
Wealth Plans/                          # top-level .docx files
Wealth Plans/Personalized Plans/       # per-client PDFs (~110+)
Wealth Plans/Personalized Plans/H1B Visa WP/  # H1B sub-folder
```

**Pipeline scripts** (installed by `pipeline-setup-worker`):
```
scripts/wealth-plan-pipeline/
  ├── extractor.py          # PDF/DOCX extraction
  ├── extractor.test.py     # Extraction tests
  ├── generator.py           # Markdown generation
  ├── generator.test.py     # Generator tests
  ├── anonymizer.py          # PII scrubbing + scanning
  ├── run.py                 # CLI runner
  └── __init__.py
```

**Build system:**
- Blog source: `content/blog/*.md` → built HTML in `blog/*.html`
- Build: `npm run build:blog` then `npm run build:sitemap`
- Category: "Wealth Plan" (added to `extractKeywords()` by pipeline-setup-worker)

**Wealth plan documents contain highly sensitive PII** — full names, addresses, phone numbers, SSNs, financial details. The anonymization module MUST be applied to every post, and a PII sweep must be run before any content is considered complete.

**Target word count:** 3,000-5,000 words per blog post.

## Batch Processing Strategy

With ~129 wealth plan files, process in batches of **10-15 files** per session:

| Batch | Files | Notes |
|-------|-------|-------|
| 1 | Top-level .docx files (7) + first 5 PDFs | Start with easier DOCX files |
| 2-8 | Remaining PDFs in Personalized Plans/ | 12-15 per batch |
| Last | H1B Visa WP subfolder (3 PDFs) | Special category — H1B visa plans |

**Skip these files** (not client plans):
- `prompt.pdf` / `Design Prompt.docx` — template/prompt files, not plans
- `Coaching Call Prep Intake form .docx` — intake form
- `~$sign Prompt.docx` — temp file (Microsoft lock)
- Any file starting with `~$` — temp/lock files
- Addenda files (e.g., `Shayne Huffman - addendum.pdf`, `Paul Ryan - Updated Wealth Plan Addendum.pdf`) — process the main plan only, skip the addendum

**Duplicate handling:**
- Some clients have both .docx and .pdf versions (e.g. `Trent Hanson WP.docx` appears in both top-level and Personalized Plans/)
- Use the `.docx` version when available (better text extraction quality)
- Skip duplicates — process each unique client once

## Work Procedure

### Step 1: Extract Text from Batch

For each wealth plan file in the current batch:

```bash
cd /Users/deveshdhardubey/Downloads/Legacy\ Investing\ Show/Website

# Example: Extract one file to JSON for review
python3 scripts/wealth-plan-pipeline/run.py extract "Wealth Plans/Personalized Plans/Qu Chen WP.pdf"

# Batch extract: process all files in a directory
for f in "Wealth Plans/Personalized Plans/"*.pdf; do
    echo "Extracting: $f"
    python3 scripts/wealth-plan-pipeline/run.py extract "$f" > /tmp/wealth-plan-extracts/$(basename "$f" .pdf).json
done
```

**Quality check each extraction:**
- Verify `extraction_status` is "success"
- Verify `word_count` is reasonable (real plans should be 2,000+ words of extracted text)
- Verify `first_name` looks like a real first name (not "Client" unless genuinely unparseable)
- If extraction fails or text is garbled, note the file and skip it

### Step 2: Generate Anonymized Markdown

For each extracted wealth plan, generate the blog post markdown:

```bash
# Generate markdown from a single wealth plan
python3 scripts/wealth-plan-pipeline/run.py generate "Wealth Plans/Personalized Plans/Qu Chen WP.pdf"

# Or use the extractor output directly:
python3 scripts/wealth-plan-pipeline/run.py generate "Wealth Plans/Trent Hanson WP.docx" > content/blog/trent-wealth-plan.md
```

**CRITICAL: Content generation guidelines**

The `generator.py` script produces a structural skeleton. For each post, you must expand it to **3,000-5,000 words** of high-quality, SEO-optimized content by:

1. **Using the extracted wealth plan data** as the factual basis for the blog post
2. **Rewriting in third-person educational tone** — position it as an educational analysis of the strategies, NOT as financial advice
3. **Expanding each section** with:
   - Detailed explanations of what each strategy means
   - Why it matters for someone in a similar situation
   - Specific numbers and calculations from the plan (anonymized — first name only)
   - Comparisons to common alternatives
   - Actionable takeaways readers can apply
4. **Adding 3-5 statistics cards** in frontmatter when relevant (e.g., tax savings amount, projected income, etc.)
5. **Adding 5-8 FAQ questions** that someone searching for this topic might ask

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

### Step 3: Verify Anonymization — No Full Names

Before writing any markdown to `content/blog/`, verify:

1. **First names only** in all content, filenames, slugs, and frontmatter
2. **No email addresses** anywhere in the markdown
3. **No phone numbers** anywhere in the markdown
4. **No SSNs** anywhere in the markdown
5. **No physical addresses** anywhere in the markdown

Run the PII scanner:

```bash
python3 scripts/wealth-plan-pipeline/run.py scan-pii content/blog/
```

If any findings are returned, fix the specific files before proceeding.

### Step 4: Ensure Disclaimer Appears

Every wealth plan blog post MUST include this disclaimer at the top of the content body (right after frontmatter):

```
> **Disclaimer:** This content is for educational and informational purposes only. It does not constitute financial, tax, or legal advice. Every individual's financial situation is unique — consult a qualified professional before making any financial decisions. The strategies discussed are based on a personalized plan and may not be suitable for everyone.
```

Verify this appears in every generated `.md` file.

### Step 5: Verify Word Count

Each post should be **3,000-5,000 words**. Check with:

```bash
for f in content/blog/*wealth-plan*.md; do
    words=$(wc -w < "$f")
    echo "$f: $words words"
done
```

If a post is under 3,000 words, expand the content sections. If over 5,000, trim redundancies.

### Step 6: Build the Blog

```bash
cd /Users/deveshdhardubey/Downloads/Legacy\ Investing\ Show/Website
npm run build:blog
npm run build:sitemap
```

If the build fails:
1. Check the error output for the specific file causing the issue
2. Verify the frontmatter YAML is valid (no unescaped quotes, proper indentation)
3. Fix and re-run

### Step 7: Visual Spot-Check with agent-browser

Start the local server:
```bash
cd /Users/deveshdhardubey/Downloads/Legacy\ Investing\ Show/Website
npm run start
```

Use agent-browser to spot-check **3-5 random posts** from the batch:

1. Navigate to `http://localhost:3000/blog` — click on a wealth plan post
2. Verify:
   - Title renders correctly
   - Disclaimer is visible at the top of the content
   - No full names are visible anywhere on the page
   - Category tag shows "Wealth Plan"
   - CTA section appears at the bottom
   - FAQ section renders properly
   - Statistics cards render if present
3. View page source and verify:
   - Schema.org JSON-LD is present and valid
   - Canonical URL is correct
   - Open Graph tags are present
   - No PII in meta tags

### Step 8: Verify Sitemap

```bash
# Check that sitemap.xml includes the new posts
grep -c "wealth-plan" /Users/deveshdhardubey/Downloads/Legacy\ Investing\ Show/Website/sitemap.xml
```

The count should match the number of wealth plan blog posts you've added.

### Step 9: Final PII Sweep

After all batch posts are built and verified, run a comprehensive PII scan:

```bash
cd /Users/deveshdhardubey/Downloads/Legacy\ Investing\ Show/Website
python3 scripts/wealth-plan-pipeline/run.py scan-pii content/blog/
```

Also scan the generated HTML files:

```bash
# Quick grep for common PII patterns in generated HTML
grep -rn "[a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]*\.[a-zA-Z]*" blog/*wealth-plan*.html || echo "No emails found"
grep -rn "[0-9]\{3\}[-.][0-9]\{2\}[-.][0-9]\{4\}" blog/*wealth-plan*.html || echo "No SSN patterns found"
```

If any PII is found:
1. Fix the source markdown in `content/blog/`
2. Re-run `npm run build:blog`
3. Re-verify

---

## Filename and Slug Conventions

| Source File | First Name | Slug | Markdown File |
|------------|-----------|------|---------------|
| `Qu Chen WP.pdf` | Qu | `qu-wealth-plan` | `content/blog/qu-wealth-plan.md` |
| `Trent Hanson WP.docx` | Trent | `trent-wealth-plan` | `content/blog/trent-wealth-plan.md` |
| `victoria_west_-_wss.pdf` | Victoria | `victoria-wealth-strategy-snapshot` | `content/blog/victoria-wealth-strategy-snapshot.md` |
| `Kris Kouzougian WP .docx` | Kris | `kris-wealth-plan` | `content/blog/kris-wealth-plan.md` |
| `H1B Visa WP/Priya Sharma - WP H1B Visa.pdf` | Priya | `priya-h1b-wealth-plan` | `content/blog/priya-h1b-wealth-plan.md` |

**Rules:**
- Use first name only in slug (no last names)
- Append plan type: `-wealth-plan`, `-wealth-strategy-snapshot`, or `-h1b-wealth-plan`
- For WSS files (Wealth Strategy Snapshot), use `-wealth-strategy-snapshot` in the slug
- Strip trailing spaces from filenames before processing

## Example Handoff

When completing a batch and handing back to the orchestrator:

```json
{
  "salientSummary": "Batch 3 complete: Converted 12 wealth plans into blog posts, all anonymized, built, and verified. Total wealth plan posts published: 29 of 82.",
  "whatWasImplemented": [
    "content/blog/abel-wealth-plan.md — Anonymized, 3,450 words",
    "content/blog/cristiana-wealth-plan.md — Anonymized, 3,200 words",
    "content/blog/dan-wealth-plan.md — Anonymized, 4,100 words",
    "... (9 more posts)"
  ],
  "whatWasLeftUndone": [
    "Batches 4-8 still need processing (~53 remaining wealth plans)",
    "Sitemap verified for current batch but not rebuilt for final deployment",
    "No images created for blog posts (using placeholder paths)"
  ],
  "verification": {
    "commandsRun": [
      "npm run build:blog — SUCCESS",
      "npm run build:sitemap — SUCCESS",
      "python3 scripts/wealth-plan-pipeline/run.py scan-pii content/blog/ — ZERO findings",
      "wc -w content/blog/*wealth-plan*.md — all between 3000-5000 words"
    ],
    "interactiveChecks": [
      "localhost:3000/blog — 'Wealth Plan' category filter shows correct count",
      "localhost:3000/blog/abel-wealth-plan — renders correctly, disclaimer visible, no PII",
      "localhost:3000/blog/cristiana-wealth-plan — renders correctly, FAQ section present",
      "localhost:3000/blog/dan-wealth-plan — renders correctly, statistics cards display"
    ]
  },
  "tests": {
    "added": []
  },
  "discoveredIssues": [
    "Two PDF files returned empty text (possibly scanned/image-based PDFs): 'Joyce WSS.pdf', 'Richard Harris WSS.pdf'. These need OCR processing or manual data entry.",
    "Cristiana Ferraz has two versions (WP.pdf and WP 2.0.pdf) — used the 2.0 version, skipped the original.",
    "Hang and Antonio Sanchez have 3 versions (WP.docx, WP 2.0.pdf, Debt Recovery Plan 3.0.pdf) — used 3.0 version, skipped others."
  ]
}
```

## When to Return to Orchestrator

Return to the orchestrator when:
1. All files in the assigned batch have been converted to markdown
2. Every post passes the PII sweep (zero findings)
3. Every post has the disclaimer at the top
4. Every post meets the 3,000-5,000 word count target
5. `npm run build:blog` and `npm run build:sitemap` succeed
6. Spot-checks on localhost:3000 confirm correct rendering
7. Sitemap includes all new posts

If a batch encounters blockers (e.g., corrupted PDFs, empty extractions, build errors), report the specific files and errors to the orchestrator rather than attempting to proceed.

## Edge Cases to Handle

| Situation | Action |
|-----------|--------|
| PDF extraction returns empty/blank text | Skip the file, note it in the handoff. May need OCR. |
| Filename has special characters (parentheses, hyphens) | Strip to alphanumeric + hyphens for slug |
| Duplicate client (multiple plan versions) | Process the latest/most complete version only |
| File is not a wealth plan (e.g., prompt.pdf, intake form) | Skip it entirely |
| Extracted word count < 1,000 | The source may be too short — note it, expand content to 3,000+ using educational context |
| Couple/family plan (e.g., "Jeanette & Ryan Bozek") | Use "Jeanette and Ryan" in content but slug based on primary first name only |
| H1B Visa plan | Use plan_type "H1B Visa Wealth Plan" and slug suffix "-h1b-wealth-plan" |
