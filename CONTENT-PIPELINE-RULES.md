# Content Pipeline Rules

## Canonical Repositories

- Production content authority: `/Users/deveshdhardubey/legacyinvestingshow website`
- CMS migration workspace: `/Users/deveshdhardubey/legacy-content-cms`

## Mandatory Rules

1. Source content must be markdown + frontmatter, not standalone HTML pages.
2. Blog source lives in `content/blog/` (or synchronized copy in CMS `src/blog/`).
3. Rendering must happen through templates/build scripts.
4. No direct hand-authored edits to generated HTML outputs.
5. Every content batch must run validation before publish:
   - build succeeds
   - `npm run cms:verify` succeeds
   - no schema/json-ld parse errors
   - no broken internal links

## Agent Output Contract

- Keyword/topic agents output JSON briefs.
- Writing agents output markdown + frontmatter only.
- SEO/AEO review agents output edits/checklists, not page HTML.
- Publisher agents run builds and stage commits.

## Immediate Recovery State (2026-02-07)

- Previous standalone-HTML batch workflow is deprecated.
- Eleventy repo rebuilt from canonical markdown baseline.
