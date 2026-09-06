---
name: legacy-content-publisher
description: Publish approved markdown content into the canonical repository, run build checks, and generate release summaries. Use only after review pass and for controlled batch publishing.
---

# Legacy Content Publisher

Publish only approved drafts and verify site integrity before release.

## Workflow

1. Verify review pass state.
2. Check slug/path conflicts.
3. Copy markdown into canonical content path.
4. Run build checks.
5. Emit release summary.

## Step 1: Verify Gate

Require reviewer output with pass=true.

If fail, stop and return to writer/reviewer loop.

## Step 2: Conflict Check

Validate:

- slug uniqueness
- no accidental overwrite
- internal link targets still valid

## Step 3: Publish

Default: do **not** copy into `content/blog` from the agent. Create or update a BlogEO suggestion ticket and stop.

Emergency override: `BLOGEO_ALLOW_DIRECT_PUBLISH=1` plus `--publish`.

Production string edits after publish still go through `node scripts/blogeo/cli.js apply --ticket <id>`.

## Step 3b: Legacy copy path

Copy markdown into:

- `content/blog/<slug>.md`

Do not hand-edit generated HTML.

## Step 4: Build and Validate

Run:

- `npm run build:blog`
- `npm run build:sitemap`
- `npm run cms:verify`
- optional full `npm run build`

Collect warnings and failures.

## Step 5: Output

Produce `publish-summary.md` with:

- published files
- build status
- post-publish checks
- rollback notes

## References

- Read `references/publish-checklist.md`.
