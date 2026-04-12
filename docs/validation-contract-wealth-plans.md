# Wealth Plan Conversion — Validation Contract

> **Mission scope:** M-Fix (fix 1 broken post + expand 18 skeletons), M-Next20 (20 new conversions), M-Final (~37 remaining + polish). This contract covers behavioral assertions for all three milestones, NOT re-validating M1/M2 artifacts already passed.

---

## Area 1: Content Quality (Skeleton Expansion)

### VAL-CONTENT-001 — No Placeholder Text Remains in Any Wealth Plan Post

| Field | Value |
|---|---|
| **Title** | Zero `[Perspective content based on extracted plan data]` placeholders |
| **Behavior** | Every `.md` file whose slug ends in `-wealth-plan` or `-wealth-strategy-snapshot` must contain zero occurrences of the literal string `[Perspective content based on extracted plan data]`. |
| **Pass condition** | `grep -r '\[Perspective content based on extracted plan data\]' content/blog/*-wealth-plan.md content/blog/*-wealth-strategy-snapshot.md` returns exit code 1 (no matches). |
| **Fail condition** | Any file returns a match line. |
| **Tool** | Shell `grep` or `rg` in `content/blog/` |
| **Evidence** | Screenshot/terminal output of the grep command showing exit code 1, plus a count of 0 matches. |

---

### VAL-CONTENT-002 — Expanded Posts Meet Minimum Word Count (3000 Words)

| Field | Value |
|---|---|
| **Title** | Every wealth plan markdown file contains ≥ 3000 words |
| **Behavior** | After M-Fix and M-Next20, each `*-wealth-plan.md` and `*-wealth-strategy-snapshot.md` file must have a word count ≥ 3000. The frontmatter (content between `---` delimiters) is excluded from word count. |
| **Pass condition** | A shell loop counting words in the body of each file (after stripping frontmatter) reports ≥ 3000 for every file. Edge: posts with 2800-2999 words fail. |
| **Fail condition** | Any file below 3000 words. |
| **Tool** | Shell command: `for f in content/blog/*-wealth-plan.md content/blog/*-wealth-strategy-snapshot.md; do body=$(sed -n '2,/^---$/p' "$f" \| tail -n +2 \| wc -w); echo "$f: $body words"; done` — all values ≥ 3000. |
| **Evidence** | Full word-count listing pasted as proof; any under-threshold files flagged. |

---

### VAL-CONTENT-003 — No Maximum Word Count Exceeded (5000 Words)

| Field | Value |
|---|---|
| **Title** | No wealth plan post exceeds 5000 words |
| **Behavior** | The body word count of every `*-wealth-plan.md` and `*-wealth-strategy-snapshot.md` must not exceed 5000 words (excluding frontmatter). |
| **Pass condition** | All files report ≤ 5000 body words. |
| **Fail condition** | Any file exceeds 5000 body words. |
| **Tool** | Same word-count loop as VAL-CONTENT-002. |
| **Evidence** | Same listing; confirm no value > 5000. |

---

### VAL-CONTENT-004 — Malformed Section Headings Replaced with Proper H2 Headings

| Field | Value |
|---|---|
| **Title** | No broken, fragment, or non-semantic `##` headings |
| **Behavior** | Every `##` heading in every `*-wealth-plan.md` must be a well-formed, grammatically complete heading — not a fragment, number-only line, or raw data dump. Specifically forbidden patterns observed in skeleton posts: `## Planned)`, `## 4. Bitcoin plan (no cap)…`, `## available, you're positioned to…`, `## With $250K projected annual income…`, multiline headings, headings containing raw dollar amounts or parenthetical fragments from the original PDF layout, and `## TOTAL INCOME`/`## W-2 INCOME` style data-label headings. Each heading must use title case or sentence case, be a complete phrase, and be ≤ 80 characters. |
| **Pass condition** | No `##` line in any wealth plan markdown matches the known broken patterns (parenthetical fragments, raw data labels, numeric-prefixed action items, continuation sentences). Manual spot-check confirms every heading reads as a proper section title. |
| **Fail condition** | Any `##` line contains: a closing parenthesis without an opening one, starts with a numeric digit followed by a period (unless it's a proper numbered strategy heading like `Strategy 1:`), is a continuation sentence fragment, or is an all-caps data label. |
| **Tool** | Shell `grep '^## ' content/blog/*-wealth-plan.md` piped through a review checklist. |
| **Evidence** | Complete list of all `##` headings across all wealth plan files, with any violations highlighted. |

---

### VAL-CONTENT-005 — All Expanded Posts Contain Disclaimer Block

| Field | Value |
|---|---|
| **Title** | Every wealth plan post opens with the standard disclaimer |
| **Behavior** | The first block-level content after the frontmatter closing `---` must be the standard disclaimer blockquote starting with `> **Disclaimer:** This content is for educational and informational purposes only…`. This must appear verbatim (character-for-character match) in every `*-wealth-plan.md` and `*-wealth-strategy-snapshot.md`. |
| **Pass condition** | Every file's body begins with the exact disclaimer string. |
| **Fail condition** | Any file missing the disclaimer or using a non-matching variant. |
| **Tool** | Shell `grep '^> \*\*Disclaimer:\*\* This content is for educational' content/blog/*-wealth-plan.md content/blog/*-wealth-strategy-snapshot.md` — count must equal total number of wealth plan files. |
| **Evidence** | Grep output showing every file matches, plus count equals total wealth plan file count. |

---

### VAL-CONTENT-006 — All Expanded Posts Contain FAQ Section

| Field | Value |
|---|---|
| **Title** | Every wealth plan post has an FAQ section with ≥ 3 question-answer pairs |
| **Behavior** | Each `*-wealth-plan.md` and `*-wealth-strategy-snapshot.md` must contain an `## Frequently Asked Questions` or `## FAQ` section with at least 3 question-answer pairs formatted as `**Q: …**` / `**A: …**` or `### …?` heading with answer paragraph. |
| **Pass condition** | Every file has at least one `## Frequently Asked Questions` or `## FAQ` heading AND at least 3 question entries below it. |
| **Fail condition** | Any file missing the FAQ section entirely or containing fewer than 3 Q&A pairs. |
| **Tool** | Shell grep for `^##.*Frequently Asked` or `^##.*FAQ` per file, then count Q/A pairs. |
| **Evidence** | List of all wealth plan files with FAQ heading presence confirmed and minimum Q count noted. |

---

### VAL-CONTENT-007 — All Expanded Posts Contain Statistics Cards in Frontmatter

| Field | Value |
|---|---|
| **Title** | Every wealth plan post has statistics cards defined in frontmatter |
| **Behavior** | Each `*-wealth-plan.md` and `*-wealth-strategy-snapshot.md` YAML frontmatter must include a `statistics:` key with at least 3 entries, each containing `label`, `value`, and `icon` fields. |
| **Pass condition** | Every file's frontmatter contains `statistics:` with ≥ 3 entries that each have label/value/icon. |
| **Fail condition** | Any file missing `statistics:` entirely or having fewer than 3 stat entries. |
| **Tool** | Shell `grep '^statistics:' content/blog/*-wealth-plan.md content/blog/*-wealth-strategy-snapshot.md \| wc -l` must equal total wealth plan file count. Spot-check 5 random files for ≥ 3 stat entries. |
| **Evidence** | Shell count output; spot-check detail for 5 random files. |

---

## Area 2: Broken Post Recovery

### VAL-FIX-001 — ian-wealth-plan.md No Longer Contains Error String

| Field | Value |
|---|---|
| **Title** | ian-wealth-plan.md contains valid content, not an error message |
| **Behavior** | The file `content/blog/ian-wealth-plan.md` must NOT contain the string `Error: File not found` anywhere in its content. Instead it must contain valid YAML frontmatter and real blog post content matching the structure of other M2-quality posts. |
| **Pass condition** | `grep -c 'Error: File not found' content/blog/ian-wealth-plan.md` returns 0. |
| **Fail condition** | The string is found at all, OR the file is absent. |
| **Tool** | Shell `grep` on `content/blog/ian-wealth-plan.md`. |
| **Evidence** | Terminal output showing 0 matches for error string, plus `wc -w` showing ≥ 3000 words. |

---

### VAL-FIX-002 — ian-wealth-plan.md Has Complete Valid Frontmatter

| Field | Value |
|---|---|
| **Title** | Regenerated ian-wealth-plan.md has all required frontmatter fields |
| **Behavior** | The regenerated `content/blog/ian-wealth-plan.md` must have YAML frontmatter with the following fields: `title`, `description` (150-160 chars), `date`, `author: Preston Seo`, `category: Wealth Plan`, `slug: ian-wealth-plan`, `canonical`, `image`, `disclaimer: true`. The `description` must be 150-160 characters long. |
| **Pass condition** | All listed fields exist and have non-empty values; description length is 150-160 characters. |
| **Fail condition** | Any required field is missing, empty, or description length is outside 150-160 range. |
| **Tool** | Shell: `head -30 content/blog/ian-wealth-plan.md` visual inspection + `yq` or manual YAML parse if available. |
| **Evidence** | Full frontmatter block pasted; character count of description field noted. |

---

### VAL-FIX-003 — Build Succeeds After ian Fix

| Field | Value |
|---|---|
| **Title** | `npm run build:blog` completes with exit code 0 after regenerating ian |
| **Behavior** | Running `npm run build:blog` in the project root must complete with exit code 0 and produce valid HTML at `blog/ian-wealth-plan.html`. No YAML parse errors or missing-template errors in build output. |
| **Pass condition** | `npm run build:blog` exits 0; `blog/ian-wealth-plan.html` exists and is non-empty. |
| **Fail condition** | Build fails, OR the generated HTML file is missing/empty. |
| **Tool** | Shell: `npm run build:blog 2>&1 && ls -la blog/ian-wealth-plan.html`. |
| **Evidence** | Build output; `ls -la` output for the HTML file. |

---

### VAL-FIX-004 — ian Post Word Count Meets Threshold

| Field | Value |
|---|---|
| **Title** | Regenerated ian-wealth-plan.md body has ≥ 3000 words |
| **Behavior** | The regenerated post must meet the same 3000-word minimum as all other expanded wealth plan posts. |
| **Pass condition** | Body word count ≥ 3000 (frontmatter excluded). |
| **Fail condition** | Body word count < 3000. |
| **Tool** | Shell: strip frontmatter, `wc -w` on body. |
| **Evidence** | Word count value. |

---

## Area 3: New Conversions (M-Next20 + M-Final)

### VAL-NEW-001 — New Posts Follow 3000-5000 Word Range

| Field | Value |
|---|---|
| **Title** | Each newly converted wealth plan post has 3000-5000 body words |
| **Behavior** | Any post created during M-Next20 or M-Final must have a body word count (excluding frontmatter) between 3000 and 5000. |
| **Pass condition** | Every new `*-wealth-plan.md` or `*-wealth-strategy-snapshot.md` file creates during these milestones reports 3000-5000 body words. |
| **Fail condition** | Any new file is below 3000 or above 5000. |
| **Tool** | Shell word-count loop identical to VAL-CONTENT-002, scoped to newly created files only. |
| **Evidence** | Word count listing for each new file. |

---

### VAL-NEW-002 — Anonymization — First Names Only

| Field | Value |
|---|---|
| **Title** | No last names appear in any wealth plan post content |
| **Behavior** | Every wealth plan markdown and generated HTML file must use only the client's first name. No full names (first + last name together), standalone last names in identifying context, email addresses, phone numbers, SSNs, or physical addresses may appear. The PII scanner (`python3 scripts/wealth-plan-pipeline/run.py scan-pii content/blog/`) must return 0 real findings. Known safe false positives (e.g., "Personalized Wealth", "Preston Seo", "Legacy Investing Show", "Short Term Rental") are explicitly allowed. |
| **Pass condition** | `python3 scripts/wealth-plan-pipeline/run.py scan-pii content/blog/` exits 0 (prints "✅ No PII found"). OR: any findings are only items in the `safe_phrases` set from `anonymizer.py`. |
| **Fail condition** | Any finding NOT in the safe-phrases set. |
| **Tool** | Shell: `python3 scripts/wealth-plan-pipeline/run.py scan-pii content/blog/`. |
| **Evidence** | Full scanner output; manual review of any flagged items. |

---

### VAL-NEW-003 — Frontmatter Description Is 150-160 Characters

| Field | Value |
|---|---|
| **Title** | Every new wealth plan post has a description meta of 150-160 characters |
| **Behavior** | The `description` field in YAML frontmatter for each new post must be between 150 and 160 characters (inclusive). This is the SEO meta description that appears in search results. |
| **Pass condition** | For each new file, `description` string length is ≥ 150 AND ≤ 160. |
| **Fail condition** | Any description outside that range. |
| **Tool** | Shell: extract `description` line from frontmatter, count characters. |
| **Evidence** | List of each new file with description character count. |

---

### VAL-NEW-004 — Required Frontmatter Fields Present

| Field | Value |
|---|---|
| **Title** | Every new wealth plan post has all mandatory frontmatter fields |
| **Behavior** | Each new `*-wealth-plan.md` and `*-wealth-strategy-snapshot.md` must contain YAML frontmatter with these fields present and non-empty: `title`, `description`, `date`, `author` (must be "Preston Seo"), `category` (must be "Wealth Plan"), `slug`, `canonical`, `seo.primaryKeyword`, `seo.secondaryKeywords`, `seo.longTailKeywords`, `seo.searchIntent`, `tags` (≥ 3 items), `image`, `imageAlt`, `disclaimer: true`, `keywords`. |
| **Pass condition** | Every required field is present and non-empty in every new file. |
| **Fail condition** | Any field is missing, empty, or set to incorrect value. |
| **Tool** | Spot-check 5 random new files by reading frontmatter. Shell: `grep '^$field:' content/blog/FILE.md` for each required field. |
| **Evidence** | Frontmatter blocks of 5 randomly sampled new files. |

---

### VAL-NEW-005 — Standard Disclaimer Appears in Body

| Field | Value |
|---|---|
| **Title** | Every new wealth plan post body starts with the standard disclaimer |
| **Behavior** | Identical to VAL-CONTENT-005 but scoped to newly created posts. The disclaimer must be the first block-level content after frontmatter. |
| **Pass condition** | New files match the exact disclaimer text. |
| **Fail condition** | Any new file missing or altering the disclaimer. |
| **Tool** | Shell grep on new files. |
| **Evidence** | Output confirming disclaimer match for each new file. |

---

### VAL-NEW-006 — New Posts Have Distinct, Non-Duplicate Content

| Field | Value |
|---|---|
| **Title** | No two wealth plan posts share ≥ 50% identical body content |
| **Behavior** | Each wealth plan post must be substantively unique. The content body (after frontmatter) of any two posts must not share ≥ 50% identical sentences or paragraphs. |
| **Pass condition** | Pairwise content overlap check using `diff` or similarity metric shows < 50% overlap for all pairs. |
| **Fail condition** | Any pair of posts has ≥ 50% identical content lines (excluding the standard disclaimer, CTA, and FAQ structural boilerplate). |
| **Tool** | Shell: Sample 5 random pairs of wealth plan post bodies, run `comm` or `diff` analysis, compute overlap ratio. |
| **Evidence** | Similarity ratios for 5 sampled pairs, all < 50%. |

---

## Area 4: Cross-Linking

### VAL-CROSS-001 — Wealth Plan Posts Render "Related Articles" Section

| Field | Value |
|---|---|
| **Title** | Every wealth plan HTML page has a Related Articles section |
| **Behavior** | After building, each generated `blog/*-wealth-plan.html` and `blog/*-wealth-strategy-snapshot.html` must contain a section (identified by heading, class, or ID) labeled "Related Articles" or "Related Posts" that contains links to other blog posts. |
| **Pass condition** | `grep -l 'Related' blog/*-wealth-plan.html blog/*-wealth-strategy-snapshot.html` returns all wealth plan HTML files. |
| **Fail condition** | Any wealth plan HTML file lacks a "Related" section. |
| **Tool** | Shell `grep` on generated HTML files in `blog/`. |
| **Evidence** | List of wealth plan HTML files showing "Related" section presence. |

---

### VAL-CROSS-002 — Internal Links Within Wealth Plan Posts Resolve

| Field | Value |
|---|---|
| **Title** | All internal links in wealth plan posts point to existing pages |
| **Behavior** | Every `<a href="/blog/...">` or `<a href="https://www.legacyinvestingshow.com/blog/...">` link inside a wealth plan HTML page must reference an HTML file that actually exists in the `blog/` directory. |
| **Pass condition** | For each internal `/blog/` link found in wealth plan HTML files, running `ls blog/<slug>.html` succeeds. |
| **Fail condition** | Any internal link points to a non-existent HTML file. |
| **Tool** | Shell: extract all `/blog/*` hrefs from wealth plan HTML, check each target exists. |
| **Evidence** | List of all internal links checked, all marked as valid. |

---

### VAL-CROSS-003 — Cross-Links Between Wealth Plan and Tax Strategy Pages

| Field | Value |
|---|---|
| **Title** | Each wealth plan post links to at least one tax strategy page |
| **Behavior** | Because wealth plans inherently discuss tax strategies, each expanded wealth plan post should contain at least one internal link to a tax strategy page (`/tax-strategies/...` or related). |
| **Pass condition** | Each `*-wealth-plan.md` or `*-wealth-strategy-snapshot.md` content body contains at least one link whose href starts with `/tax-strategies/` or mentions a tax strategy by name with an internal link. |
| **Fail condition** | Any wealth plan post body contains zero links to any tax strategy page. |
| **Tool** | Shell: `grep -c 'tax-strategies' content/blog/*-wealth-plan.md content/blog/*-wealth-strategy-snapshot.md` — count must be ≥ 1 per file. |
| **Evidence** | Per-file link count showing all files have ≥ 1 tax strategy link. |

---

## Area 5: Build & SEO

### VAL-BUILD-001 — Full Build Completes with Zero Errors

| Field | Value |
|---|---|
| **Title** | `npm run build` exits 0 with no errors |
| **Behavior** | Running `npm run build` (which chains build:css → build:blog → build:tax-strategies → build:sitemap → build:rss) must complete successfully with exit code 0 and no stderr error lines. |
| **Pass condition** | `npm run build 2>&1; echo "EXIT: $?"` shows exit code 0 and no error lines containing "Error" or "ERROR". |
| **Fail condition** | Exit code != 0, OR any "Error"/"ERROR" lines in output. |
| **Tool** | Shell: `npm run build 2>&1`. |
| **Evidence** | Full build output captured; exit code confirmed 0. |

---

### VAL-BUILD-002 — Sitemap Includes All Wealth Plan Posts

| Field | Value |
|---|---|
| **Title** | `sitemap.xml` contains entries for every `*-wealth-plan` and `*-wealth-strategy-snapshot` slug |
| **Behavior** | After `npm run build:sitemap`, the `sitemap.xml` file must contain `<loc>` entries for each wealth plan blog post URL in the form `https://www.legacyinvestingshow.com/blog/<slug>`. |
| **Pass condition** | For every `*-wealth-plan.md` and `*-wealth-strategy-snapshot.md` file in `content/blog/`, there exists a corresponding `<loc>https://www.legacyinvestingshow.com/blog/<slug></loc>` entry in `sitemap.xml`. |
| **Fail condition** | Any wealth plan slug is missing from `sitemap.xml`. |
| **Tool** | Shell: iterate slugs from filenames, grep each in `sitemap.xml`. |
| **Evidence** | List of all wealth plan slugs, each confirmed present in `sitemap.xml`. |

---

### VAL-BUILD-003 — RSS Feed Includes All Wealth Plan Posts

| Field | Value |
|---|---|
| **Title** | `feed.xml` contains entries for every wealth plan blog post |
| **Behavior** | After `npm run build:rss`, the `feed.xml` file must contain `<item>` or `<entry>` elements for each wealth plan blog post. |
| **Pass condition** | Every wealth plan slug appears in `feed.xml` as a linked blog entry. |
| **Fail condition** | Any wealth plan slug is missing from the RSS feed. |
| **Tool** | Shell: grep each wealth plan slug in `feed.xml`. |
| **Evidence** | Count of wealth plan entries in `feed.xml` matching total wealth plan `.md` file count. |

---

### VAL-BUILD-004 — Blog Index Shows "Wealth Plan" Category Filter

| Field | Value |
|---|---|
| **Title** | `blog/index.html` provides a category filter for "Wealth Plan" |
| **Behavior** | The generated blog index page (`blog/index.html`) must include a UI element (button, link, or filter) labeled "Wealth Plan" that allows visitors to filter posts by that category. |
| **Pass condition** | `grep -c 'Wealth Plan' blog/index.html` returns ≥ 1. |
| **Fail condition** | No "Wealth Plan" category filter is present. |
| **Tool** | Shell `grep` on `blog/index.html`. |
| **Evidence** | Line(s) from `blog/index.html` containing "Wealth Plan" category UI. |

---

### VAL-BUILD-005 — No Degradation of Existing Site Content

| Field | Value |
|---|---|
| **Title** | Previously existing non-wealth-plan pages remain unchanged |
| **Behavior** | HTML files for existing (pre-M-Fix) blog posts, tax strategy pages, retirement pages, topic pages, and static pages (`index.html`, `about.html`, etc.) must not be corrupted, truncated, or overwritten with incorrect content during any milestone. |
| **Pass condition** | After each build, spot-check 5 random pre-existing HTML files (not wealth-plan posts) still render valid HTML with their original `<title>` and `<h1>` content. |
| **Fail condition** | Any pre-existing page has lost content, shows empty title, or fails to render proper HTML structure. |
| **Tool** | Shell: `grep '<title>' blog/<random-existing-post>.html` for 5 random files. |
| **Evidence** | Title tags of 5 randomly selected pre-existing pages, all confirmed intact. |

---

## Area 6: PII & Privacy

### VAL-PII-001 — PII Sweep Returns Zero Real Findings

| Field | Value |
|---|---|
| **Title** | Pipeline PII scanner finds no real PII across all wealth plan files |
| **Behavior** | Running the pipeline's PII scanner on all wealth plan markdown files must exit 0 (prints "✅ No PII found") or only flag items in the known safe-phrases set (`Preston Seo`, `Legacy Investing Show`, `Short Term`, `Long Term`, `Real Estate`, `Tax Strategy`, `Wealth Plan`, `Financial Freedom`, `Airbnb Arbitrage`, `Net Worth`, `Tax Deduction`, `Cost Segregation`, `Personalized Wealth`). |
| **Pass condition** | All findings (if any) are exclusively from the safe-phrases set; no actual PII (emails, phone numbers, SSNs, full names, street addresses) is flagged. |
| **Fail condition** | Any finding includes an email, phone, SSN, full name not in safe phrases, or physical address. |
| **Tool** | Shell: `python3 scripts/wealth-plan-pipeline/run.py scan-pii content/blog/`. |
| **Evidence** | Full scanner output; manual review of any flagged items. |

---

### VAL-PII-002 — No Last Names in Any Content (Markdown and HTML)

| Field | Value |
|---|---|
| **Title** | Full name patterns (first + last) do not appear in wealth plan content |
| **Behavior** | No wealth plan file (`.md` or generated `.html`) should contain any occurrence of a client's full name (first name + last name pair). Client content must use first names only. |
| **Pass condition** | Manual review and regex scan of all wealth plan files for known last names from source PDF names (e.g., "Braunschneider", "Chen", "Afutiti", etc.) returns zero hits. |
| **Fail condition** | Any last name from source filenames appears in any generated content file. |
| **Tool** | Shell: `grep -i 'braunschneider\|chen\|afutiti\|kovacich\|michalik' content/blog/*-wealth-plan.md blog/*-wealth-plan.html`. |
| **Evidence** | Grep output showing 0 matches for known last names. |

---

### VAL-PII-003 — Consistent Disclaimer Across All Posts

| Field | Value |
|---|---|
| **Title** | Every wealth plan post uses the identical disclaimer text |
| **Behavior** | All wealth plan posts (`.md` and `.html`) must use the exact same disclaimer blockquote text, character-for-character. |
| **Pass condition** | `grep -c '> \*\*Disclaimer:\*\* This content is for educational and informational purposes only' content/blog/*-wealth-plan.md content/blog/*-wealth-strategy-snapshot.md` returns a count equal to the total number of wealth plan files. AND: `grep -c 'This content is for educational and informational purposes only' blog/*-wealth-plan.html blog/*-wealth-strategy-snapshot.html` returns a count equal to total wealth plan HTML files. |
| **Fail condition** | Any file uses a different or missing disclaimer. |
| **Tool** | Shell `grep` counting matches. |
| **Evidence** | Match counts for both `.md` and `.html` files. |

---

## Area 7: Cross-Area Flows

### VAL-FLOW-001 — End-to-End: Extract → Generate → Build → Verify on Localhost

| Field | Value |
|---|---|
| **Title** | Full pipeline produces a valid, renderable page viewable on localhost |
| **Behavior** | After performing extract → generate → build:blog on a test wealth plan file, the resulting page must be accessible at `http://localhost:3000/blog/<slug>` and display valid HTML with title, disclaimer, content sections, and no broken layout. |
| **Pass condition** | `npm run start` serves the site; the test page loads with HTTP 200; the page `<title>` matches the frontmatter title; the page contains the disclaimer text; all `<h2>` headings are properly formed. |
| **Fail condition** | Any of: server fails to start, page returns 404/500, title missing, disclaimer missing, broken headings. |
| **Tool** | Shell: `npm run start` (background); `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/blog/<test-slug>`. |
| **Evidence** | HTTP response code; `<title>` content from curl output; disclaimer presence check. |

---

### VAL-FLOW-002 — Batch Completeness: Correct Cumulative Post Count at Each Milestone

| Field | Value |
|---|---|
| **Title** | The number of wealth plan `.md` files matches expected count per milestone |
| **Behavior** | After M-Fix, there must be 20 wealth plan markdown files that are "complete" (≥ 3000 words, no placeholders). After M-Next20, there must be 40 complete files. After M-Final, there must be ~77 complete files (all wealth plan + wealth strategy snapshot files). The current total file count (including skeleton and broken posts) is 39 (`*-wealth-plan.md` files) + 3 (`*-wealth-strategy-snapshot.md` files) = 42. |
| **Pass condition** | Post-M-Fix: `ls content/blog/*-wealth-plan.md content/blog/*-wealth-strategy-snapshot.md \| wc -l` = 42, and all 19 fixed files (1 broken + 18 skeletons) now have ≥ 3000 words with no placeholders. Post-M-Next20: 42 + 20 new files = 62 total. Post-M-Final: all wealth plan files complete. |
| **Fail condition** | File count doesn't match expected total, or any file still has placeholders or < 3000 words at its milestone. |
| **Tool** | Shell: `ls content/blog/*-wealth-plan.md content/blog/*-wealth-strategy-snapshot.md \| wc -l` + word count validation per milestone. |
| **Evidence** | File count and word count summary at each milestone checkpoint. |

---

### VAL-FLOW-003 — No Broken Internal Links After Build

| Field | Value |
|---|---|
| **Title** | All internal links in wealth plan HTML resolve to existing files |
| **Behavior** | After building, every `href` attribute in wealth plan HTML files that starts with `/blog/`, `/tax-strategies/`, or `/retirement/` must point to a file that exists on disk. |
| **Pass condition** | For each extracted internal link, the corresponding `.html` file exists in the appropriate directory. |
| **Fail condition** | Any internal link points to a file that doesn't exist. |
| **Tool** | Shell: `grep -oh 'href="[^"]*"' blog/*-wealth-plan.html \| grep -E '/blog/|/tax-strategies/|/retirement/' \| sort -u` then check each target. |
| **Evidence** | List of all internal links validated, all marked as resolving. |

---

### VAL-FLOW-004 — Schema.org JSON-LD Present in All Wealth Plan HTML Pages

| Field | Value |
|---|---|
| **Title** | Every wealth plan HTML page includes Schema.org Article JSON-LD |
| **Behavior** | Each generated `blog/*-wealth-plan.html` and `blog/*-wealth-strategy-snapshot.html` must contain a `<script type="application/ld+json">` block with `@type": "Article"` (or `"BlogPosting"`) that includes `headline`, `author`, `datePublished`, and `publisher`. |
| **Pass condition** | Each wealth plan HTML file contains valid JSON-LD with the required fields. JSON parses without error. |
| **Fail condition** | Any file missing JSON-LD entirely, or JSON-LD is malformed (fails `python3 -c "import json; json.loads(...)"`). |
| **Tool** | Shell: extract JSON-LD blocks from each wealth plan HTML, validate JSON structure. |
| **Evidence** | List of files with JSON-LD presence confirmed; 5 random samples showing valid parsed structure. |

---

### VAL-FLOW-005 — Canonical URL Matches Expected Pattern

| Field | Value |
|---|---|
| **Title** | Every wealth plan post has a canonical URL matching `https://www.legacyinvestingshow.com/blog/<slug>` |
| **Behavior** | Each `*-wealth-plan.md` and `*-wealth-strategy-snapshot.md` must have a `canonical:` field in frontmatter matching the pattern `https://www.legacyinvestingshow.com/blog/<slug>` where `<slug>` matches the filename (without `.md`). |
| **Pass condition** | For every wealth plan file, `canonical` in frontmatter equals `https://www.legacyinvestingshow.com/blog/` + slug derived from filename. |
| **Fail condition** | Any canonical URL doesn't match the expected pattern, or is missing. |
| **Tool** | Shell: for each file, extract canonical line and compare to expected URL. |
| **Evidence** | List of all canonical URLs vs expected values for wealth plan files. |

---

## Summary Table

| Area | Assertion IDs | Count |
|---|---|---|
| 1. Content Quality (Skeleton Expansion) | VAL-CONTENT-001 through VAL-CONTENT-007 | 7 |
| 2. Broken Post Recovery | VAL-FIX-001 through VAL-FIX-004 | 4 |
| 3. New Conversions | VAL-NEW-001 through VAL-NEW-006 | 6 |
| 4. Cross-Linking | VAL-CROSS-001 through VAL-CROSS-003 | 3 |
| 5. Build & SEO | VAL-BUILD-001 through VAL-BUILD-005 | 5 |
| 6. PII & Privacy | VAL-PII-001 through VAL-PII-003 | 3 |
| 7. Cross-Area Flows | VAL-FLOW-001 through VAL-FLOW-005 | 5 |
| **Total** | | **33** |

---

## Appendix: Current State Baseline (as of contract creation)

| Metric | Value |
|---|---|
| Total `*-wealth-plan.md` files | 36 |
| Total `*-wealth-strategy-snapshot.md` files | 3 |
| Total wealth plan files | **39** |
| Broken posts (error content only) | 1 (`ian-wealth-plan.md`) |
| Skeleton posts (contain `[Perspective content…]` placeholders) | 17 wealth-plan + 3 snapshots = **20** |
| Fully fleshed posts (≥ 2800 words, no placeholders) | 18 |
| Posts with FAQ section | 18 |
| Posts with statistics cards | 18 |
| Posts with disclaimer | 36 |
| Known malformed headings | `## Planned)`, `## 4. Bitcoin plan (no cap)…`, `## available, you're positioned to…`, `## With $250K projected…`, `## Pagosa Springs, Colorado…`, `## TOTAL INCOME`, `## W-2 INCOME` |
| Pipeline scripts | `scripts/wealth-plan-pipeline/{extractor,generator,anonymizer,run}.py` |
| PII scanner command | `python3 scripts/wealth-plan-pipeline/run.py scan-pii content/blog/` |
| Build commands | `npm run build` (full), `npm run build:blog` (blog only) |
