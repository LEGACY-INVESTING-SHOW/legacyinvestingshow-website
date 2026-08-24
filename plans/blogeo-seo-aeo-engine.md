# BlogEO for Legacy Investing Show

**Status:** Planning only. Do not generate more bulk blog HTML from this doc.
**Source essay:** [how i built an SEO/AEO blog engine](https://harsehaj.substack.com/p/how-i-built-an-seoaeo-blog-engine) (Harsehaj, Aug 22 2026)
**Companion:** [what is aeo?](https://harsehaj.substack.com/p/what-is-aeo)
**Canonical content:** `content/blog/*.md` → Eleventy CMS → `blog/*.html`
**Date:** 2026-08-24

---

## 0. The one-sentence decision

Copy BlogEO's **measure → audit by opportunity → surgical human-approved edits → generate only GSC near-misses → re-measure at 28/56 days** loop.

Do **not** copy BlogEO's generation volume. Browserbase had 77 posts and needed more pages. We already have 712 blog posts, ~338 of them `noindex` because they cannibalize each other. Our bottleneck is measurement and maintenance, not more markdown.

---

## 1. Site analysis (current production surface)

### 1.1 What this site actually is

Legacy Investing Show is a tax-and-wealth education site for high earners, business owners, and real estate operators. Conversion is a Free Tax Strategy Masterclass (`managemoney101.com`) plus a tax-report lead magnet (`/gettaxreport`). Airbnb arbitrage is a supporting cluster, not the whole brand.

Public URL count in the live sitemap: **611** (374 blog + 237 other). Filesystem has more pages than Google is allowed to index on purpose.

### 1.2 Public information architecture

```
/                                 Brand + tools + proof
/about                            Preston Seo / E-E-A-T
/success-stories                  Student results hub
/tax-strategies-101               Training / programs redirect target
/gettaxreport                     Lead magnet (microsite)
/privacy  /terms

/tax-strategies/                  38 pillar guides + index
/tax-strategies/for/{persona}     6 audience pages
/retirement/{slug}                5 retirement guides (no index page)
/topics/{slug}                    7 hubs + index
/compare/{slug}                   14 A-vs-B decision pages + index
/tools/{slug}                     71 calculators + index + 5 category hubs
/worksheets/{slug}                3 worksheets + index
/blog/{slug}                      712 posts (374 indexable, ~338 noindex)
/blog/category/{cat}              Category archives (noindex, follow)

/programmatic-pages/cities/       15 city tax pages (thin)
/programmatic-pages/personas/     6 personas (overlap /tax-strategies/for/)
/programmatic-pages/comparisons/  5 extra comparisons (split from /compare/)
/programmatic-pages/insurance/    52 renters-insurance-by-state pages
```

Nav (desktop): Home, About, Tax Strategies, Compare, Tools, Worksheets, Blog.

Missing vs AGENTS.md: `programs.html` is gone. `/programs` and `/free-training` 301 to `/tax-strategies-101`.

### 1.3 Content inventory by type

| Surface | Count | Source of truth | Generator | Index policy |
|---|---|---|---|---|
| Blog markdown | **712** | `content/blog/*.md` | mixed (manual, skill pipeline, templated SEO, calculator companions, YouTube) | `data/indexation-policy.json` |
| Blog HTML | 712 + index | Eleventy publish | `npm run cms:publish:posts` | 374 in `sitemap-blog.xml` |
| Tax strategy pillars | 38 + index | HTML + incomplete JSON (only **12** strategies in `data/tax-strategies.json`) | `scripts/build-tax-strategies.js` | indexed |
| Tax personas | 6 | JSON personas | same | indexed |
| Retirement guides | 5 | static HTML | none | indexed |
| Topic hubs | 7 + index | `scripts/build-topic-hubs.js` | generated | indexed |
| Compare pages | 14 + index | `data/edge-comparison-pages.json` | `scripts/build-compare-pages.js` | indexed |
| Calculators | 71 + 5 cats + hub | **external Next app `calcs2`**, committed export in `tools/` | `scripts/import-calculators.js` | indexed |
| Advanced planners | 13 definitions | `data/tools.json` | older tool system; not the 71-calculator farm | mixed |
| Worksheets | 3 + index | `data/worksheets.json` | `scripts/build-worksheets.js` | indexed |
| City pages | 15 | `data/cities.json` (all still `status: pending`) | programmatic SEO | indexed, thin |
| Programmatic personas | 6 | data | programmatic SEO | indexed, overlaps tax personas |
| Insurance state pages | 52 | `data/renters-insurance-by-state.json` | programmatic | indexed |
| YouTube queue | empty placeholder | `data/youtube-queue.json` | `scripts/youtube-to-blog.js` | unused |
| Success stories on blog | ~41 | markdown + `youtubeId` on ~47 posts | youtube-to-blog skill, mostly manual | mixed |
| Featured posts | 12–15 | frontmatter | editorial | indexed |

### 1.4 Blog corpus shape

Approximate category mix (frontmatter `category`):

| Category | Posts |
|---|---|
| Tax Strategies | 175 |
| Business Structures | 109 |
| Retirement | 85 |
| Wealth Plan | 61 |
| Investing | 61 |
| Debt Management | 57 |
| Airbnb Arbitrage | 45 |
| Passive Income | 38 |
| Success Story / Stories | ~41 |
| Insurance | 10 |
| Other / misc | rest |

Typical post has YAML frontmatter (`title`, `description`, `date`, `author`, `category`, `image`, `seo{}`, `faq[]`, `schema[]`, `statistics`, `relatedPosts`). Templates emit Article + FAQPage + BreadcrumbList + Speakable + Organization JSON-LD.

**Indexation policy is the most important content decision already made.** `data/indexation-policy.json`:

- Force-index allowlist: **36** pillar slugs
- **19** regexes noindex persona/modifier farms: `-for-{persona}`, `-calculator`, `-checklist`, `-template`, `-vs-`, `-tax-implications`, plus cluster-specific patterns for S-corp, series LLC, 401k, student loans, multi-state LLC, etc.
- Result: ~375 indexable / ~337 noindex. Sitemap matches.

That policy is the LIS equivalent of BlogEO's cannibalization gate, applied after the fact instead of before publish.

### 1.5 Calculators (this is a first-class SEO surface, not a sidebar)

71 calculators live under `/tools/` as a Next.js static export (`scripts/import-calculators.js` copies from `~/calcs2` when present, otherwise keeps committed HTML).

Categories:

- Money
- Banking & borrowing
- Taxes & payroll
- Housing & moving
- Insurance & protection

Each page already has ~700–900 visible words, WebApplication + FAQPage + BreadcrumbList + HowTo schema. Companion articles were added Aug 2026 (`plans/calculators-seo-growth.md`): 42 how-to posts that point at tools.

**Audit implication:** BlogEO only scored Sanity blog posts. We must score **tools, tax pillars, compare pages, worksheets, and programmatic pages** in the same opportunity queue. A `/tools/renters-insurance-cost` CTR leak is the same kind of headroom as a blog title leak.

Source-of-truth complication: calculator copy lives in the **external `calcs2` repo**. Surgical title/description edits on `tools/*.html` will be overwritten next import unless the write path also patches `calcs2` or we treat `tools/` as canonical.

### 1.6 Tax pillars vs JSON drift

Filesystem has 38 strategy pages. `data/tax-strategies.json` still lists **12**. That means:

- Some pillars are hand-maintained HTML, not data-driven
- Fact-check "load live docs" has no single docs corpus
- Ground truth for tax claims is scattered across pillars, blog posts, IRS links, and Preston's program materials

For BlogEO's "compare post against docs" step we need an explicit **source pack**, not Sanity + product docs.

### 1.7 Conversion and CRO (affects what "opportunity" means)

Homepage:

- Strong brand + tool library CTAs (`data-track-event`)
- Masterclass section with countdown, **no register button in the block**
- Dual GTM (`GTM-KQ4R2LKP`) + gtag (`G-2578PT1WSS`) — risk of double-counting
- Two Google site-verification tokens

BlogEO scores "clicks we should have gotten." For LIS, a click to a calculator is not the same as a click that starts the masterclass. Opportunity scoring should later split:

1. Organic click headroom (GSC)
2. On-site engagement (GA4: tool_started, worksheet, CTA)
3. Revenue proxy (masterclass / tax report)

v0 uses (1) only, same as BlogEO. Do not pretend GA4 is wired for (2)/(3) until events are audited.

### 1.8 Technical SEO that already works

- HTTPS, HSTS, CSP, `cleanUrls`, no trailing slash
- `robots.txt` allows `/`, disallows source trees, points at sitemap + `llms.txt`
- `vercel.json`: 95 redirects, X-Robots-Tag noindex on `/content`, `/data`, `/scripts`, `/cms`, `*.md`, `*.json`
- Sitemap index: `sitemap-blog.xml` (374) + `sitemap-pages.xml` (237)
- RSS: `feed.xml` (~368 items)
- `llms.txt` / `llms-full.txt` for AEO discovery
- Schema coverage on blogs, tax pages, tools is real, not decorative
- Internal linking scripts exist (`add-smart-internal-links.js`, redirect normalizer)

### 1.9 Technical / content risks

| Risk | Evidence | BlogEO analog |
|---|---|---|
| **Power-law unknown** | No GSC API in repo. Jan 2026 todos claimed GSC was not configured; HTML now has two verification tags. We still cannot compute "top 5 posts = 53% of clicks" for LIS. | Essay chart "five posts carried half the blog" |
| **Over-generation** | 712 posts, 676 of 1000 SEO topics still pending, 338 noindex variants sitting on disk | Opposite of Browserbase's 72/77 dead posts |
| **Thin programmatic** | City pages ~800 tokens; personas overlap `/tax-strategies/for/` | Hygiene + quality, not more pages |
| **Keyword cannibalization** | Same entity across pillar + blog + compare + tool (HSA, S-corp, capital gains, STR loophole) | Cannibalization gate → route to audit |
| **Formulaic SEO content** | `verify-seo-output.js` flags "Design, Deploy, Defend"; `generate-pending-cms-seo.js` is templated | Writing checklist + quality gate |
| **YMYL** | Tax numbers, IRS cites, student revenue stats | Stricter than Browserbase. Almost no auto-publish of body copy |
| **Stale tax year** | Posts still say 2025 in titles (BlogEO flagged "2025 Guide") | Positioning-drift cheap check |
| **Calculator dual-repo** | `tools/` is an export | Write-path must know which repo owns the string |
| **YouTube pipeline idle** | `youtube-queue.json` is an empty stub; ~47 posts have youtubeIds | Generator input, not weekly default |
| **Homepage CTA hole** | Masterclass block has no link | Not an SEO engine issue, but it wastes recovered clicks |

### 1.10 Existing generation pipeline (do not rebuild this)

Already in repo:

```
pipeline/skills/
  legacy-ideation-engine
  legacy-topic-researcher
  legacy-brief-architect
  legacy-longform-writer
  legacy-seo-aeo-reviewer      # pass/fail, score >= 85, P0/P1 fail
  legacy-content-publisher     # copy to content/blog + build gates

npm run pipeline               # scripts/pipeline/run-skill-pipeline.js
npm run pipeline:legacy        # template stub, no LLM
```

Plus overlapping one-off generators:

- `scripts/generate-seo-blog-markdown.js` (thin templates from `seo-topics-100.json`)
- `scripts/generate-pending-cms-seo.js` (long templates + Jaccard cannibalization)
- `scripts/generate-seo-pages.js` (Claude CLI → raw HTML — **violates recovery lock**)
- `scripts/run-opencode-blog-batch.js`
- `scripts/research-seo-1000-topics.js`

Human-in-the-loop today: `--publish` flag, refuse overwrite, revert on build fail, `REVIEW_ME.md`. **No Slack. No GSC. No 28/56-day measurement. No weekly job.**

Older plan `plans/seo-automation-implementation-plan.md` (Jan 2026) is obsolete. It assumed ~1 blog post and "generate 40–50." That generation era is over.

### 1.11 What "essays / articles" maps to on this site

There is no separate essays CMS. Long-form lives in:

1. Blog markdown (canonical)
2. Tax strategy HTML pillars
3. Retirement HTML
4. Topic hubs
5. Compare pages
6. Calculator companion posts
7. Success-story posts (YouTube transcripts expanded)

Treat all of those as **pages** in one opportunity table, with `page_type` enum.

---

## 2. Essay deconstruction (what BlogEO actually is)

Essay: intern project at Browserbase, summer 2026. Product name **blogEO**. Results claimed (writing + engine, not engine alone): search impressions **5.8x**, page-one queries **9.8x**, average blog position **10.9 → 6.6**. Engine output by Aug 21 2026: **18 generated posts, ~74 SEO-field backfills, 53+ edits, 6 weeks of cadence.**

### 2.1 The problem they diagnosed (images 1–4)

1. **Power law.** 77 posts, 17,791 clicks. Top 5 = 53% of clicks. Next 9 = 23%. Remaining 63 = 24%. 14 posts earned 76% of search clicks.
2. **Ranking without clicking.** Example post: 329,454 impressions, avg position 9.4, 857 clicks, **0.26% CTR**. Expected CTR at pos 9.4 ≈ 2.5% → ~7,400 clicks/year of title/description headroom.
3. **Invisible to LLMs.** 17/77 posts ever cited by an AI engine; 3 posts did most of that.
4. **Manual join.** Sanity + GSC + SEMrush + PostHog + last week's run. "~100 posts, pick 5–10, write the fix" = a full day of work that is stale in a week.

LIS is in the same measurement hole. We do not know our power-law yet. We already did the "generate more pages" half without the join.

### 2.2 Product: three jobs, one Slack channel

| Job | Cadence | Output |
|---|---|---|
| **Audit** | Tue 9am PT | Ranked thread: hygiene + 5–10 surgical edits as Approve/Edit/Skip cards |
| **Generator** | Mon 9am PT | One publish-ready draft, unlisted, Approve/Discard |
| **Performance + AEO** | Fri 9am PT | Growth curves, +28d/+56d, citation diagnosis, measurement edits |

On-demand: `@bb run the blog audit`, `@bb draft a blog`, `@bb what's the SEO performance of this blog: ___`, `@bb give me a title`.

### 2.3 Core design (image 5 + image 16) — copy this exactly

```
READ (agent)  →  DECIDE (human click)  →  WRITE (one server handler)
```

- Agent **has no write tool**. Worst case of a bad run = a bad Slack suggestion.
- Judgment lives in **skill files** (cheap to change).
- Write path is **tested code** that re-validates every claim.
- Slack button carries a **ticket id**, not the edit payload (replay cannot smuggle a different edit).
- "The click is the commit."

Dashed edge agent → live CMS is marked **does not exist**.

### 2.4 Audit pipeline (images 0, 6, 9, 10)

One run, then the agent session ends. Clicks are a separate handler.

Steps:

1. Batch-pull 5 sources: CMS, GSC, SEMrush, PostHog, last run
2. Cheap hygiene on **every** post: broken links, dead images/embeds, positioning drift, empty SEO fields, typos
3. Score opportunity on 28-day windows
4. Expensive fact-check only **top 15 + 3 buffer** (load live docs, flag only direct contradictions, quote the source)
5. Draft surgical edits; mark two classes auto-publish
6. Persist suggestion to KV + run snapshot to Postgres
7. Post summary + one threaded card per flagged post

Token rationing diagram ("where the tokens go"):

```
~100 posts   cheap checks, no model vs docs
     ↓
15 + 3       expensive live-docs contradiction check
     ↓
5–10 edits   one surgical suggestion each, Slack card
```

Skip a post next week if it was checked and the text did not change. Buffer of +3 so quiet/low-impression posts still get verified over time.

### 2.5 Scoring by opportunity, not age

Three levers. **Biggest estimate wins** and chooses the fix type.

| Lever | Formula (conceptual) | Fix type |
|---|---|---|
| **recover** | clicks lost vs previous 28d | regression / content refresh |
| **ctr** | `(expectedCtr(position) - actualCtr) * impressions` | title + meta description |
| **rank** | clicks a page-2 URL would gain on page 1 | content push |

CTR curve from the essay (copy as-is for v0):

```js
function expectedCtr(position) {
    if (position <= 0) return 0;
    if (position <= 1) return 0.28;
    if (position <= 2) return 0.15;
    if (position <= 3) return 0.10;
    if (position <= 5) return 0.06;
    if (position <= 7) return 0.04;
    if (position <= 10) return 0.025;
    return 0.01;
}
```

Guardrails:

- Low impressions + low CTR ≠ opportunity. Mark `low-visibility`, drop from queue. Edits cannot create demand.
- Real click loss beats estimates. Material absolute drop **and** proportional drop always surfaces.
- Average position is GSC-blended across queries, so CTR headroom is a **soft** number. Use it to **order** the queue, not to promise 7k clicks.

### 2.6 Surgical edits only (image 10)

A suggestion may change:

- SEO title, or
- SEO description, or
- **one** exact phrase/link swap

If it cannot be one clean swap → card is **Edit + Skip only** (no Approve). Human types the edit.

Auto-apply (bypass human):

1. Dead link with a **known** replacement
2. Empty SEO title/description fill

For LIS YMYL: keep (1). Restrict (2) to non-tax pages or to copying an existing H1/description with a length check. Never auto-write a new tax claim.

### 2.7 Measurement of edits (image 11)

On live edit:

- Snapshot GSC for that URL, last 28 days
- Snapshot **blog-wide** GSC for the same dates (control)
- Re-read at **+28d and +56d**
- Put URL in **cooldown** so next audits do not re-edit it mid-window

Without the control, a 20% lift is meaningless if Google lifted everything.

### 2.8 Generator (images 12–15, 18)

Audit cannot fix a corpus where traffic was never there. Richest new topics = **near-misses**: GSC queries with 150+ impressions, positions 5–20, **no dedicated post**.

Example from the essay: "what is a captcha solver?" 19.7k impressions, pos 10.6, no post.

Flow:

1. Pick topic from GSC or a provided prompt (`seo-strategy` skill)
2. Write draft; code snippets traced to docs (`writing` skill)
3. Agent writing checklist
4. **4 code gates** before save
5. Create unlisted draft
6. Slack Approve / Discard
7. Approve → publish unlisted + enroll growth curve (publish, then enroll, then record — failures must not block the previous step)

Three skills, pipeline owns order only (image 14):

```
generate-blog  (orchestrator: order of operations, nothing else)
    ↓ what to write          ↓ how it reads
seo-strategy skill           writing skill
topic, clusters, personas,   voice, cadence, hard rules,
guardrails, can it ship?     blog checklist

neither skill knows about the pipeline, and the pipeline decides neither
X between the two skills
```

Four automated gates:

| Gate | Fail if |
|---|---|
| **strategy** | banned terms, or no real cluster + persona |
| **structure** | missing labelled TL;DR / Quick Take, heading nits |
| **code provenance** | any snippet without `docsUrl` (our analog: IRS/calculator/stat source URL) |
| **cannibalization** | target query already owned by an existing URL → **do not rewrite a second post**; hand the owner to the audit |

Two redraft attempts, then stop with no draft.

### 2.9 New-post measurement

No "before." Growth curve at 0 / 28 / 56 with blog-wide control. Unlisted so it can accrue GSC data without dominating the listing UI.

### 2.10 AEO tracking

Split "AI referral" into three questions:

1. Does an engine **crawl** the page? (deferred at Browserbase — needed Vercel log drains behind SSO)
2. Does it **cite** us? (SEMrush AI visibility **CSV export**, no API, custom parser → slug)
3. Does anyone **click**? (GSC AI Overviews folded into search; ChatGPT/Claude via referrer)

Finding: **Google winners ≠ AI-cited winners.** Strongest search posts were only cited twice.

### 2.11 Data model (5 tables)

```
blog_audit_runs          scored snapshot of each post
blog_audit_edits         what changed, before snapshot, +28d/+56d, cooldown
blog_generated_posts     quality-gate report + checkpoints
blog_aeo_signals         AI citation counts per post
blog_aeo_domain          domain-wide AI visibility
```

Plus KV for suggestions keyed by ticket id.

### 2.12 Card state machine (image 17)

```
posted → (click) locked → acknowledged (<3s Slack reply) → published (bg) → rewritten (live link)
                ↑________________ fail: return to untouched, never stuck in progress
```

Two clicks at once: lock means one publishes, the other is told it is already handled. Ticket id on the button.

### 2.13 Lessons to keep

- Scope and rescope. Measurement with **controls**.
- UX lives where work already happens. Nobody wants another login.
- Soft opportunity estimate, rationed fact-check, manual citation CSV, deferred crawl logs.

### 2.14 AEO definition they use

From the companion post: crawled → cited → clicked by ChatGPT, Claude, Gemini, AI Overviews. Implementation: TL;DR, FAQ, questions as headers. "AEO is SEO done very well plus structure for LLM parsing."

LIS already has FAQ schema, Speakable, `llms.txt`. We are missing citation **measurement** and answer-first enforcement on older posts.

---

## 3. LIS vs BlogEO gap matrix

| BlogEO piece | LIS today | Action |
|---|---|---|
| Sanity CMS | `content/blog/*.md` + Eleventy + committed HTML | Treat git markdown as CMS. Handler writes markdown, then `npm run build` subset |
| GSC API | Two verification meta tags, no client | **Build this first.** Without it there is no opportunity score |
| SEMrush | none | Optional. v0 skip rank/competitor. Add later or use SerpAPI already in `scripts/pipeline/lib/search-client.js` |
| PostHog | GA4 + GTM | Map pageviews/events from GA4 Data API, or skip until event audit |
| Last week's run | none | JSON run snapshots under `data/blogeo/runs/` |
| Slack cards | none | Slack if the team lives there; otherwise GitHub Issue with `/approve` workflow. Essay's point is **one existing surface**, not Slack specifically |
| Agent with no write tool | `npm run pipeline -- --publish` can write | Split: pipeline/agent never writes production; publisher script is the only writer |
| Opportunity scoring | none | New `scripts/blogeo/score-opportunity.js` |
| Cheap hygiene | link normalizer, indexation policy, `verify-seo-output.js` unused in build | Unify into weekly audit |
| Expensive fact-check vs docs | reviewer skill at **draft time only** | New source pack + top-N live check |
| Surgical edit cards | none | PR diffs or Slack before/after |
| Auto dead-link fix | `vercel.json` redirects + `normalize-internal-redirect-links.js` | Wire known map into auto-apply |
| Cannibalization gate | Jaccard in one generator; indexation regex after the fact | Single ownership map, used **before** generate |
| TL;DR / Quick Take | some CMS-generated posts have `## Quick Take`; not gated | Hard gate on new drafts; audit suggests adding to winners |
| Code provenance | N/A (not a docs product) | **Claim provenance**: IRS URL, IRS year, calculator formula, student stat source |
| 28/56-day measurement | none | Daily cron fill from GSC |
| AEO cite parser | `llms.txt` only | SEMrush CSV or Ahrefs/Peec if available; GA4 chatgpt.com referrer |
| Weekly scheduler | no GitHub Actions | `.github/workflows/blogeo.yml` or Vercel cron |
| Unlisted publish | no Sanity unlisted | Live URL + `listedOnIndex: false` optional; still sitemap (need GSC) |
| 18 new posts/week-scale | 712 already | Cap generator at **1 post/week**, GSC near-miss only |
| Empty SEO backfill | most posts have titles; descriptions exist but length varies | Cheap check, not a 74-post fire drill |

---

## 4. What to implement (architecture for this repo)

### 4.1 Principle: one writer, git is the CMS

```
┌─────────────────────────────────────────────────────────────────┐
│ TRIGGER                                                         │
│  Weekly: Mon generate / Tue audit / Fri report (09:00 PT)       │
│  On demand: Slack @legacy-seo or `node scripts/blogeo/cli.js`   │
└───────────────────────────────┬─────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ READ — agent / Node jobs (no production write)                  │
│  Sources: git pages catalog, GSC, GA4 (optional), last run      │
│  Skills: pipeline/skills/legacy-seo-strategy (new, thin)        │
│          existing legacy-seo-aeo-reviewer + longform-writer     │
│  Output: JSON suggestions in data/blogeo/suggestions/{id}.json  │
└───────────────────────────────┬─────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ DECIDE — human                                                  │
│  Slack Block Kit  OR  GitHub Issue with Approve/Skip            │
│  Click locks ticket id                                          │
└───────────────────────────────┬─────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ WRITE — scripts/blogeo/apply-edit.js ONLY                       │
│  Re-validate: file hash, ticket payload, cannibalization,       │
│               indexation policy, provenance URLs                │
│  Patch content/blog/*.md (or tax JSON / calcs2)                 │
│  Open PR to main  OR  commit on engine branch + CI build        │
│  Record edit + GSC before-snapshot                              │
└─────────────────────────────────────────────────────────────────┘
```

**Do not let Cursor agents, `npm run pipeline -- --publish`, or Claude CLI write production HTML.** Recovery lock stays: markdown/data → templates → build.

### 4.2 Page catalog (all surfaces, not just blog)

`scripts/blogeo/build-catalog.js` emits `data/blogeo/catalog.json`:

```js
{
    id: 'blog:cost-segregation-481-adjustment',
    pageType: 'blog', // blog | tax-strategy | tax-persona | retirement | topic | compare | tool | worksheet | city | pseo-persona | insurance-state
    slug: 'cost-segregation-481-adjustment',
    url: 'https://www.legacyinvestingshow.com/blog/cost-segregation-481-adjustment',
    sourcePath: 'content/blog/cost-segregation-481-adjustment.md',
    indexable: true,
    title: '...',
    description: '...',
    category: 'Tax Strategies',
    wordCount: 2400,
    lastModified: '2026-08-09',
    primaryKeyword: null, // fill from frontmatter seo.primaryKeyword or catalog map
    ownsQueries: [],      // filled after GSC join
    noindexReason: null
}
```

Catalog builders:

| pageType | How to discover |
|---|---|
| blog | gray-matter over `content/blog/*.md` + indexation helper already used in `apply-indexation-policy.js` |
| tax-strategy | `tax-strategies/*.html` slugs minus index |
| tool | `tools/*.html` minus index, categories, `_next` |
| compare | `compare/*.html` |
| worksheet | `worksheets/*.html` |
| retirement / topics / programmatic | glob |

### 4.3 Keyword ownership map (cannibalization source of truth)

New file: `data/blogeo/keyword-ownership.json`

```json
{
  "qbi deduction": {
    "canonical": "/tax-strategies/qualified-business-income-deduction",
    "supporting": ["/blog/qbi-deduction-vs-itemized-deductions", "/worksheets/qbi-deduction-worksheet"]
  },
  "s corp election": {
    "canonical": "/tax-strategies/s-corp-strategy",
    "supporting": ["/blog/s-corp-election-break-even-guide", "/worksheets/s-corp-election-decision-worksheet"]
  },
  "renters insurance cost": {
    "canonical": "/tools/renters-insurance-cost",
    "supporting": ["/blog/how-much-is-renters-insurance-cost-guide"]
  }
}
```

Rules:

- One canonical URL per head query
- Supporting URLs may exist (tool + companion article is **intentional** cluster, not cannibalization)
- Generator fail → pass canonical URL to audit
- Never un-noindex a `-for-` variant to "cover" a query; edit the canonical instead

Seed this map from: force-index slugs, tax-strategy slugs, tool slugs, compare slugs. Do not generate 676 more pending `seo-topics-1000.json` rows until GSC near-misses are empty.

### 4.4 Opportunity math (LIS-sized)

Browserbase scored ~100 posts. We have 611 indexable URLs. Same math, batched GSC.

```js
function opportunity(row, prev) {
    const impressions = row.impressions || 0;
    const clicks = row.clicks || 0;
    const position = row.position || 0;
    const actualCtr = impressions ? clicks / impressions : 0;

    const recover = Math.max(0, (prev.clicks || 0) - clicks);

    const ctrGap = Math.max(0, expectedCtr(position) - actualCtr);
    const ctrHeadroom = impressions >= IMPRESSION_FLOOR ? ctrGap * impressions : 0;

    const rankHeadroom = position > 10 && impressions >= IMPRESSION_FLOOR
        ? Math.max(0, (expectedCtr(7) - actualCtr) * impressions)
        : 0;

    const realDrop = (prev.clicks - clicks) >= ABSOLUTE_DROP
        && prev.clicks > 0
        && (clicks / prev.clicks) <= (1 - PROPORTIONAL_DROP);

    const score = realDrop
        ? Math.max(recover, ctrHeadroom, rankHeadroom) + RECOVER_BOOST
        : Math.max(recover, ctrHeadroom, rankHeadroom);

    const lever = realDrop ? 'recover'
        : (ctrHeadroom >= recover && ctrHeadroom >= rankHeadroom) ? 'ctr'
        : (recover >= rankHeadroom) ? 'recover'
        : 'rank';

    return { score, lever, recover, ctrHeadroom, rankHeadroom, actualCtr, lowVisibility: impressions < IMPRESSION_FLOOR };
}

const IMPRESSION_FLOOR = 150;   // essay near-miss + CTR guardrail
const ABSOLUTE_DROP = 20;       // tune after first real GSC pull
const PROPORTIONAL_DROP = 0.25;
const RECOVER_BOOST = 1e6;      // force real drops to the top without destroying sortability
```

LIS-specific extra flags (cheap, no LLM):

- `taxYearStale`: title/H1/body still says `2025` in a 2026+ post
- `emptyFaq`: indexable URL, no FAQ schema
- `noQuickTake`: blog post missing answer-first block
- `deadInternalLink`: href 404 or hits a known redirect
- `noindexButTraffic`: GSC clicks on a noindex URL (policy bug)
- `thinProgrammatic`: city/persona word count below 1200
- `descriptionLength`: meta description <120 or >165
- `dualCanonicalRisk`: same primary keyword as another indexable URL

### 4.5 Cheap vs expensive checks at LIS scale

Cheap (all 611+ indexable, plus a sample of noindex if they have GSC impressions):

- Age / modifiedDate
- Empty or bad SEO title/description
- Internal link check against catalog + `vercel.json` redirects
- Image 404 on featured image path
- Banned/stale phrases: `2025 Guide`, old masterclass URLs, `programs.html`
- GSC 28d vs previous 28d
- Indexation vs sitemap membership

Expensive (top 15 by opportunity + 3 rotating low-traffic buffer):

- Load live URL
- Compare claims against **source pack** (see 4.6)
- Flag **only quoted contradictions** (tax year, dollar figures, IRS section numbers, student stats, calculator formulas)
- Propose one surgical swap or send to human Edit

Skip next week if `contentHash` unchanged and not in top opportunity.

### 4.6 Source pack (the "docs" analog)

Browserbase compared posts to product docs. We compare to a maintained pack:

`data/blogeo/source-pack/`

| File | Ground truth |
|---|---|
| `irs-anchors.json` | strategy slug → IRC section, IRS page URL, last verified date |
| `tax-year.json` | current planning year, contribution limits we cite |
| `calculator-formulas.json` | tool slug → formula notes + source URL |
| `student-stats.json` | youtubeId / slug → claimed numbers + interview date |
| `banned-terms.json` | phrases we will not ship ("guaranteed returns", "IRS loophole you can hide") |
| `positioning.json` | current brand one-liners (Airbnb is secondary, tax-first) |

Fact-check prompt rule, copied from the essay: **the live page must be loaded, only direct contradictions, source quoted.** No "this feels outdated."

### 4.7 Provenance gate (replace code-docsUrl)

```js
function checkProvenance(blocks) {
    const failures = [];
    const advisories = [];
    for (const [i, block] of blocks.entries()) {
        if (block.type === 'stat' || block.type === 'tax-figure' || block.type === 'formula') {
            if (!block.sourceUrl || !/^https?:\/\//i.test(block.sourceUrl)) {
                failures.push(`claim ${i} has no sourceUrl`);
            }
            if (!block.asOf) advisories.push(`claim ${i} has no asOf date`);
        }
    }
    return { failures, advisories };
}
```

Writer skill must emit claims as structured blocks in frontmatter or a sidecar `claims.json` for new posts. Do not try to regex every existing 712 posts on day one.

### 4.8 Generator: GSC near-misses only

Query GSC Search Analytics, last 28 days, filter:

- `impressions >= 150`
- `position` between 5 and 20
- query not in `keyword-ownership.json`
- query not matching a noindex slug pattern we already decided not to rank
- query intent in-cluster: tax, retirement, entity, investing, insurance, housing, debt, STR/Airbnb
- not branded-only (`legacy investing show`, `preston seo`) unless we want those

Then:

1. `seo-strategy` skill: cluster + persona + "can it ship?"
2. If an existing page owns a close variant → **audit that page**, do not draft
3. Else run existing `legacy-topic-researcher` → `legacy-brief-architect` → `legacy-longform-writer` → `legacy-seo-aeo-reviewer`
4. Code gates: strategy, structure (must open with labelled `## Quick Take`), provenance, cannibalization
5. Write draft to `pipeline/runs/<id>/draft.md` **and** `content/drafts/<slug>.md` (robots already disallows `/content/` but drafts should live outside public HTML)
6. Human approve → publisher copies to `content/blog/<slug>.md`, build, sitemap, enroll growth curve

**Hard cap: 1 generated post per weekly run.** Optional 2nd only if the first failed the gate with no draft.

Do not resume `seo-topics-1000.json` 676 pending template pages. That queue is how we got 338 noindex URLs.

### 4.9 Unlisted / growth curve on a static site

Sanity "unlisted" ≠ GitHub.

On approve:

1. File goes to `content/blog/<slug>.md`
2. `featured: false`
3. Optional frontmatter `hideFromBlogIndex: true` for 7 days (template change in Eleventy listing)
4. **Do include in sitemap** so GSC can measure (otherwise the growth curve is fake)
5. Enroll in `blog_generated_posts` with day0 GSC zeros

### 4.10 AEO for LIS (crawl / cite / click)

**Click (v0)**

- GA4: referrals from `chatgpt.com`, `claude.ai`, `perplexity.ai`, `gemini.google.com`, `copilot.microsoft.com`
- GSC: queries where `searchAppearance` includes AI Overviews if the API exposes it (Google has been folding this into normal performance; treat as best-effort)

**Cite (v1)**

- Weekly SEMrush / Ahrefs / Peec AI visibility CSV drop into `data/blogeo/aeo-imports/`
- Parser maps URL → catalog id, writes `blog_aeo_signals`
- Friday report: cited vs not cited among top GSC URLs (expect mismatch, per the essay)

**Crawl (v2, defer like they did)**

- Vercel log drains or Cloudflare/log-based GPTBot, ClaudeBot, PerplexityBot, Google-Extended
- `robots.txt` already allows AI crawlers; `llms.txt` exists
- Do not block this work on SSO log access

**Content structure (continuous, via audit)**

For top-opportunity indexable URLs missing AEO blocks, surgical suggestions:

- Add `## Quick Take` after the lede (if the post can take one paragraph without a full rewrite → Edit card, not Approve)
- FAQ questions as spoken queries
- Definition sentence in the first 100 words
- Keep `llms.txt` in sync with hubs + tools (already a strength)

### 4.11 Slack vs GitHub (pick one interface)

Essay: "new tools should integrate with existing workflows."

| If the team… | Interface |
|---|---|
| Already uses Slack for content | Slack Block Kit, one `#seo-engine` channel, Mon/Tue/Fri |
| Lives in GitHub/Cursor | GitHub Issue per run + PR per approved edit; `/blogeo approve <ticket>` comment |

Implement Slack **or** GitHub first, not both. Dual surfaces recreate the "5 logins nobody opens" problem.

Recommended default for this repo: **GitHub Issue + PR**, because production writes already go through git/Vercel. Add Slack later as a mirror of the same tickets.

### 4.12 Data store

v0 (fits this repo, no new infra):

```
data/blogeo/
  catalog.json
  keyword-ownership.json
  source-pack/
  runs/YYYY-Www.json          # audit_runs
  suggestions/{ticket}.json   # KV
  edits/{id}.json             # audit_edits
  generated/{slug}.json
  aeo/signals.json
  aeo/domain.json
  aeo-imports/*.csv
```

v1 if Slack buttons need sub-3s locks: Postgres (Neon) with the 5 tables + a `suggestions` table. Daily cron still fills +28/+56 from one GSC query.

SQLite in the repo is a middle path if JSON files get unwieldy.

Schema sketch:

```sql
CREATE TABLE blog_audit_runs (
  id TEXT PRIMARY KEY,
  week TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  posts_scored INTEGER,
  flagged INTEGER,
  auto_fixed INTEGER,
  snapshot_json JSONB NOT NULL
);

CREATE TABLE blog_audit_edits (
  id TEXT PRIMARY KEY,
  ticket_id TEXT UNIQUE NOT NULL,
  url TEXT NOT NULL,
  lever TEXT NOT NULL, -- recover | ctr | rank | hygiene
  before_title TEXT,
  after_title TEXT,
  before_description TEXT,
  after_description TEXT,
  phrase_from TEXT,
  phrase_to TEXT,
  content_hash_before TEXT NOT NULL,
  gsc_before JSONB NOT NULL,
  gsc_sitewide_before JSONB NOT NULL,
  gsc_28d JSONB,
  gsc_56d JSONB,
  sitewide_28d JSONB,
  sitewide_56d JSONB,
  status TEXT NOT NULL, -- posted | locked | published | skipped | failed
  cooldown_until DATE,
  applied_at TIMESTAMPTZ,
  applied_by TEXT
);

CREATE TABLE blog_generated_posts (
  slug TEXT PRIMARY KEY,
  target_query TEXT NOT NULL,
  gate_report JSONB NOT NULL,
  published_at TIMESTAMPTZ,
  gsc_day0 JSONB,
  gsc_28d JSONB,
  gsc_56d JSONB,
  sitewide_28d JSONB,
  sitewide_56d JSONB
);

CREATE TABLE blog_aeo_signals (
  url TEXT NOT NULL,
  engine TEXT NOT NULL, -- chatgpt | claude | gemini | aio | perplexity
  week TEXT NOT NULL,
  cited INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (url, engine, week)
);

CREATE TABLE blog_aeo_domain (
  week TEXT PRIMARY KEY,
  chatgpt INTEGER,
  claude INTEGER,
  gemini INTEGER,
  aio INTEGER,
  notes TEXT
);
```

---

## 5. File-level implementation plan

All new code: CommonJS, 4-space indent, single quotes, semicolons (repo style).

### 5.1 New files

```
scripts/blogeo/
  cli.js                      # node scripts/blogeo/cli.js audit|generate|report|apply
  build-catalog.js
  gsc-client.js               # Search Console API, 28d + previous 28d
  ga4-client.js               # optional pageviews / referral
  score-opportunity.js        # expectedCtr + opportunity()
  hygiene.js                  # cheap checks, link crawl
  factcheck.js                # expensive top-N vs source-pack
  draft-edit.js               # agent/LLM surgical suggestion
  apply-edit.js               # THE ONLY WRITER
  lock.js                     # ticket lock
  generate-near-miss.js       # GSC gap picker + pipeline handoff
  gates.js                    # strategy, structure, provenance, cannibalization
  aeo-csv-parser.js
  slack.js                    # optional
  github-cards.js             # issues + PR body
  fill-windows.js             # daily +28/+56

pipeline/skills/legacy-seo-strategy/
  SKILL.md                    # topic choice, clusters, personas, ship/no-ship
  references/clusters.md
  references/banned-terms.md

data/blogeo/                  # see 4.12
.github/workflows/blogeo.yml  # Mon/Tue/Fri + daily fill-windows

tests/blogeo/
  expected-ctr.test.js
  opportunity.test.js
  gates.test.js
  apply-edit.test.js          # refuses bad ticket, refuses hash mismatch, refuses cannibalization
```

### 5.2 Files to change, not fork

| File | Change |
|---|---|
| `pipeline/skills/legacy-longform-writer/SKILL.md` | Require labelled `## Quick Take`; emit claim source URLs |
| `pipeline/skills/legacy-seo-aeo-reviewer/` | Add AEO structure fails: no Quick Take, FAQ not questions |
| `pipeline/skills/legacy-content-publisher/` | Call `apply-edit` / refuse if review not PASS; never used by the agent directly |
| `scripts/pipeline/run-skill-pipeline.js` | Remove silent production write from agent path; `--publish` becomes "create suggestion ticket" unless `BLOGEO_ALLOW_DIRECT_PUBLISH=1` for emergencies |
| `cms/_includes/layouts/blog-post.njk` | Optional `hideFromBlogIndex`; keep sitemap inclusion |
| `scripts/generate-sitemap.js` | Respect catalog indexable flags only (already mostly true) |
| `data/indexation-policy.json` | Do not expand indexable set because a generator wanted a modifier slug |
| `package.json` | `"blogeo:audit"`, `"blogeo:generate"`, `"blogeo:report"`, `"blogeo:fill"` |
| `.env.example` | `GSC_PROPERTY`, `GOOGLE_APPLICATION_CREDENTIALS` or OAuth, `GA4_PROPERTY_ID`, `SLACK_BOT_TOKEN`, `BLOGEO_INTERFACE=github|slack` |
| `llms.txt` | After tools/hubs change, regenerate from catalog (script) |

### 5.3 Files to stop using for weekly growth

Do not put these on the weekly cron:

- `scripts/generate-seo-pages.js` (raw HTML, recovery-lock violation)
- `scripts/generate-seo-blog-markdown.js` (thin)
- `scripts/generate-pending-cms-seo.js` (formulaic 1000-topic mill)
- Remaining 676 `seo-topics-1000.json` pending rows as a firehose

Keep them as historical. Weekly generator reads **GSC**, not that JSON.

### 5.4 `apply-edit.js` contract (must have tests)

Inputs: `ticketId`.

```js
function applyEdit(ticketId, actor) {
    const ticket = loadSuggestion(ticketId); // from KV/json
    if (!ticket) throw new Error('unknown ticket');
    if (!lockOnce(ticketId)) throw new Error('already handled');

    const live = fs.readFileSync(ticket.sourcePath, 'utf8');
    const hash = sha256(live);
    if (hash !== ticket.contentHash) {
        unlock(ticketId);
        throw new Error('source changed since suggestion; refusing to clobber');
    }

    if (ticket.kind === 'seo-fields') {
        assertExact(ticket.beforeTitle, parseFrontmatter(live).title);
        const next = replaceFrontmatter(live, {
            title: ticket.afterTitle || undefined,
            description: ticket.afterDescription || undefined
        });
        writeMarkdown(ticket.sourcePath, next);
    } else if (ticket.kind === 'phrase-swap') {
        const count = live.split(ticket.phraseFrom).length - 1;
        if (count !== 1) {
            unlock(ticketId);
            throw new Error('phrase not unique; human Edit required');
        }
        writeMarkdown(ticket.sourcePath, live.replace(ticket.phraseFrom, ticket.phraseTo));
    } else if (ticket.kind === 'dead-link') {
        // auto-apply allowed
        writeMarkdown(ticket.sourcePath, live.replace(ticket.hrefFrom, ticket.hrefTo));
    } else {
        unlock(ticketId);
        throw new Error('unsupported kind');
    }

    recordEdit(ticket, actor);
    snapshotGsc(ticket.url);
    // do not run full npm run build in the request path; enqueue CI
}
```

Agent never calls this. Slack/GitHub handler does.

### 5.5 Quality gates (`gates.js`)

```js
function runGates({ draft, ownership, catalog, banned }) {
    const failures = [];
    const advisories = [];

    // strategy
    if (banned.some((t) => draft.body.toLowerCase().includes(t))) {
        failures.push('banned term');
    }
    if (!draft.cluster || !draft.persona) failures.push('missing cluster or persona');

    // structure
    if (!/^## Quick Take/m.test(draft.body)) failures.push('missing Quick Take');
    if ((draft.faq || []).length < 4) failures.push('FAQ < 4');

    // provenance
    const prov = checkProvenance(draft.claims || []);
    failures.push(...prov.failures);
    advisories.push(...prov.advisories);

    // cannibalization
    const owner = ownership[normalize(draft.targetQuery)];
    if (owner && owner.canonical && owner.canonical !== draft.intendedUrl) {
        failures.push(`query owned by ${owner.canonical}; send to audit`);
    }

    return { ok: failures.length === 0, failures, advisories };
}
```

Two LLM redrafts on failure, then stop.

### 5.6 Weekly GitHub Action sketch

```yaml
# .github/workflows/blogeo.yml
on:
  schedule:
    - cron: '0 16 * * 1'  # Mon 9:00 PT generate
    - cron: '0 16 * * 2'  # Tue 9:00 PT audit
    - cron: '0 16 * * 5'  # Fri 9:00 PT report
    - cron: '0 8 * * *'   # daily fill-windows
  workflow_dispatch:
    inputs:
      job: { type: choice, options: [generate, audit, report, fill] }
jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: node scripts/blogeo/cli.js ${{ inputs.job || github.event.schedule }}
```

The Action **must not** push to `main`. It opens issues/PRs. Humans merge. Vercel deploys from `main` as today.

### 5.7 Secrets

| Secret | Why |
|---|---|
| Google service account with Search Console access on `sc-domain:legacyinvestingshow.com` or URL prefix | opportunity scores |
| GA4 Data API (optional v0) | pageviews / AI referrers |
| `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` | already required by pipeline |
| Slack bot (optional) | cards |
| `GH_TOKEN` | issues/PRs from Action |

GSC setup is a **human prerequisite**. Repo todos from Jan 2026 said GSC was missing; verification tags exist now. Confirm which of the two tokens is the live property before coding the client.

---

## 6. Phased rollout (engineering work, not calendar)

### Phase 0 — Freeze the mill, instrument the corpus

**Goal:** stop adding thin pages; know what exists.

- Confirm GSC property + export one 28-day query/page CSV by hand. Compute LIS power-law (top 5 / top 14 share of clicks). Put the chart numbers in `analysis/blogeo-baseline.md`.
- Ship `build-catalog.js` + first `keyword-ownership.json` for tax pillars, tools, force-index blogs, compare, worksheets.
- Audit dual GTM+gtag (measurement integrity). Prefer one path.
- Homepage masterclass CTA is not BlogEO, but recovered clicks currently dump into a block with no button. Fix that in a separate PR.
- Decision: GitHub vs Slack interface.

**Done when:** a checked-in baseline says "N% of clicks from 5 URLs" using real GSC, not vibes.

### Phase 1 — Audit v0 (BlogEO's actual v0)

**Goal:** weekly opportunity queue + surgical SEO-field edits.

- `gsc-client.js` + `score-opportunity.js` + tests
- Hygiene cheap checks on catalog
- Write `data/blogeo/runs/YYYY-Www.json`
- Open one GitHub Issue per week: ranked table, before/after titles for top 5–10 CTR leaks
- `apply-edit.js` for frontmatter title/description only, via PR
- Cooldown + before snapshot (sitewide control)

Auto-apply only: internal links that match `vercel.json` redirects.

**Do not** LLM-rewrite bodies in this phase.

**Done when:** one real title change ships through the handler (not by hand-editing markdown) and is enrolled for +28d.

### Phase 2 — Surgical body swaps + fact-check rationing

- Source pack v1 (IRS anchors, tax year, banned terms, positioning)
- Expensive check on top 15 + 3
- Phrase-swap tickets with uniqueness test
- Stale `2025` titles on indexable posts
- Dead images on featured paths

**Done when:** a contradiction against the source pack produces a quoted Edit card, not a vibe rewrite.

### Phase 3 — Generator from near-misses

- Near-miss picker
- `legacy-seo-strategy` skill (do not put taste into `cli.js`)
- Reuse researcher → brief → writer → reviewer
- `gates.js` hard-fail
- Cap 1 post/week
- Growth curve enrollment
- If query owned → create audit ticket instead

**Done when:** one near-miss post is approved, live, in sitemap, and appears in Friday report as day0.

### Phase 4 — AEO measurement

- GA4 AI referrers
- CSV citation parser
- Friday report section: "Google winners vs cited pages"
- Audit suggestions for Quick Take / FAQ on URLs that rank but are never cited
- Refresh `llms.txt` from catalog

Defer Vercel bot log drains.

### Phase 5 — Expand surfaces in the same engine

Same scorer, different writers:

| Surface | Writer target |
|---|---|
| Blog | `content/blog/*.md` |
| Tax pillars | `data/tax-strategies.json` **after** JSON is synced to all 38 pages |
| Compare | `data/edge-comparison-pages.json` |
| Worksheets | `data/worksheets.json` |
| Tools | **calcs2 repo** (do not patch exported HTML as source of truth) |
| Cities | either deepen with unique local data or noindex; do not generate 50 more cities first |

YouTube: fill `youtube-queue.json` as a **manual seed list** for the generator when GSC is thin, still through the same gates.

---

## 7. Weekly operating cadence (after Phase 3)

| When | Job | Human time |
|---|---|---|
| Mon | 1 near-miss draft card | 10–20 min Approve/Discard; skim Quick Take + claims |
| Tue | Audit: hygiene auto-fixes + 5–10 cards | 15–30 min Approve/Edit/Skip |
| Daily | fill +28/+56 | none |
| Fri | Report: edit lifts vs sitewide, growth curves, AEO, suggested measurement tweaks | 10 min read; retune floors if needed |

On-demand CLI:

```bash
node scripts/blogeo/cli.js audit --url /blog/s-corp-election-deadline
node scripts/blogeo/cli.js generate --query "how much is renters insurance"
node scripts/blogeo/cli.js title --url /tools/capital-gains-tax-estimate
node scripts/blogeo/cli.js report --week 2026-W35
```

Requested topics are **not** pre-approved. Same strategy + cannibalization gates. If it fails, stop and ask which existing URL to edit.

---

## 8. What each essay idea becomes in this codebase

| Essay idea / image | LIS implementation |
|---|---|
| Slack audit summary (img 0) | GitHub Issue "Blog Audit — 2026-Wxx" with scored, flagged, cooldown, auto-fixed, ranked 1–N |
| Power-law chart (img 1) | Phase 0 baseline in `analysis/blogeo-baseline.md`; Friday report repeats it |
| CTR leak 0.26% vs 2.5% (img 2, 7, 8) | `ctr` lever; title/description tickets |
| AI citation skew (img 3) | Phase 4 CSV + referrer |
| Manual join of 5 tools (img 4) | `build-catalog` + GSC + last run; skip SEMrush until needed; GA4 later |
| Agent has no write tool (img 5, 16) | `apply-edit.js` only; pipeline `--publish` demoted |
| Threaded Approve/Edit/Skip (img 6) | Issue comments or Slack; ticket id |
| Token funnel 100 → 15+3 → 5–10 (img 9) | hygiene.js vs factcheck.js |
| One phrase swap (img 10) | `kind: phrase-swap` uniqueness test |
| Sitewide control at 28/56 (img 11) | `fill-windows.js` |
| Near-miss generator (img 12–13, 18) | `generate-near-miss.js`, 1/week |
| Three skills, pipeline owns order (img 14) | new `legacy-seo-strategy`; existing writer/reviewer; `cli.js` orchestrates |
| Unlisted + growth curve (img 15) | live + sitemap + optional hideFromBlogIndex |
| Card lock state machine (img 17) | `lock.js` |
| Results 5.8x impressions | **Do not promise.** Their number includes a summer of writing, not just the bot. Our KPI: page-one queries, CTR vs expected, citation count, **after** baseline |

---

## 9. KPIs (measure like they did, with a control)

Track weekly in `data/blogeo/aeo/domain.json` + Friday issue:

1. Blog+tools+tax **impressions**, **clicks**, **avg position** (GSC, 28d)
2. **Page-one query count** (position < 10)
3. Share of clicks from top 5 URLs (should fall if the tail starts working)
4. Mean CTR vs `expectedCtr(avg position)` for indexable URLs with ≥150 impressions
5. Edit cohort: edited URLs vs sitewide same dates at +28/+56
6. New-post cohort: growth curve vs sitewide
7. AI referrer sessions (GA4)
8. Cited URL count (CSV)
9. Cards: suggested / approved / skipped / failed lock
10. **Do not** use raw post count as a success metric

---

## 10. Risks and non-goals

### Do this

- Treat opportunity as "clicks if we improve this URL," not "this file is old"
- Keep indexation policy as a hard brake
- YMYL: no unsupervised body rewrites; tax phrase swaps need uniqueness + source pack
- One interface for decisions
- Reuse the six pipeline skills instead of a seventh generator mill

### Do not do this

- Auto-publish blog HTML from an agent
- Un-noindex persona farms to chase head terms
- Generate the remaining 676 `seo-topics-1000` templates
- Stand up a new Vercel project or a new CMS
- Build a dashboard website (that is the "another login" anti-pattern)
- Promise BlogEO's 5.8x as a forecast
- Patch `tools/*.html` as if it were source
- Let `generate-seo-pages.js` write production HTML
- Score only blogs and ignore 71 calculators

### Known soft spots (from the essay, still true here)

- `expectedCtr` over-counts because GSC blends queries
- Fact-check rationing means some quiet posts stay wrong longer
- Citation data may stay a CSV
- Crawl-layer AEO stays deferred until log access is easy

---

## 11. Suggested first PR after this plan is accepted

Not the whole engine. A thin vertical slice:

1. `scripts/blogeo/build-catalog.js` + `expectedCtr` + opportunity tests
2. Manual GSC CSV drop → `scripts/blogeo/ingest-gsc-csv.js` (API can wait one PR)
3. Ranked markdown report in `analysis/blogeo-baseline.md`
4. Keyword ownership seed for ~80 head URLs (tax + tools + force-index)

That recreates the essay's first insight ("a handful of URLs carry the blog") on **this** domain, which we currently cannot see.

---

## 12. Sources

- [how i built an SEO/AEO blog engine](https://harsehaj.substack.com/p/how-i-built-an-seoaeo-blog-engine) — architecture, scoring, Slack UX, schema, results
- [what is aeo?](https://harsehaj.substack.com/p/what-is-aeo) — crawled → cited → clicked
- This repo: `content/blog/`, `data/indexation-policy.json`, `pipeline/skills/`, `plans/calculators-seo-growth.md`, `scripts/pipeline/run-skill-pipeline.js`, `llms.txt`, sitemap pair
