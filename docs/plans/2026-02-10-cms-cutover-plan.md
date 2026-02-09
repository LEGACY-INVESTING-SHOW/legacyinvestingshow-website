# CMS Cutover Execution Plan (2026-02-10)

## Goal

Migrate to a CMS-oriented workflow while preserving rollback safety:

- Canonical source of truth remains markdown in `content/blog/`.
- Eleventy CMS workspace consumes that content and renders templates.
- LLM content generation outputs markdown/frontmatter only.

## Safety Baseline (Completed)

- Checkpoint tags and backup branches created in both repos.
- Portable `git bundle` snapshots created in both repos.
- Isolated worktree created: `.worktrees/cms-cutover-20260210`.

## Phase 1: Authority Lock

1. Keep canonical repo as content authority.
2. Treat CMS workspace as rendering layer until full cutover.
3. Disallow direct hand-editing generated HTML in both repos.

Acceptance criteria:

- `content/blog/*.md` is the only editorial source.
- All publishing docs reference markdown-first flow.

## Phase 2: Sync Bridge

1. Sync canonical markdown to CMS `src/blog/`.
2. Verify file-level parity.
3. Build Eleventy and verify output count.

Acceptance criteria:

- Slug parity is exact between repos.
- Byte parity is exact for blog markdown files.
- Eleventy build succeeds without template/runtime errors.

## Phase 3: Template Parity

1. Confirm CMS templates include critical SEO fields from canonical output:
   - title/meta/canonical
   - Open Graph/Twitter
   - JSON-LD where required
2. Validate read time/stats/faq mapping.

Acceptance criteria:

- Core SEO tags present on sample pages.
- Schema output validates for sample pages.

## Phase 4: LLM Content Pipeline Integration

1. Pipeline writes markdown drafts only.
2. Reviewer gate must pass before publish.
3. Publisher copies approved markdown to canonical `content/blog/`.
4. Build step runs in canonical repo and CMS repo.

Acceptance criteria:

- No pipeline stage writes standalone production HTML.
- Published draft appears in canonical + CMS builds.

## Phase 5: Cutover

1. Switch deployment source (if desired) to CMS output.
2. Run smoke checks for:
   - homepage links
   - blog index
   - article pages
   - sitemap/feed
3. Keep rollback references active for 30 days.

Acceptance criteria:

- Production deploy from CMS path succeeds.
- SEO and internal links unchanged or improved.

## Rollback

Rollback anchors created:

- canonical tag: `checkpoint/pre-cms-cutover-20260210-031052`
- canonical backup branch: `backup/pre-cms-cutover-20260210-031052`
- cms tag: `checkpoint/pre-cms-cutover-20260210-031052`
- cms backup branch: `backup/pre-cms-cutover-20260210-031052`

Bundle backups:

- canonical: `.checkpoints/pre-cms-cutover-20260210-031052/repo.bundle`
- cms: `.checkpoints/pre-cms-cutover-20260210-031052/repo.bundle`
