---
name: legacy-seo-aeo-reviewer
description: Audit draft quality for SEO, AEO, factual reliability, readability, and internal linking with explicit pass/fail gates. Use before any publish action and during revision loops.
---

# Legacy SEO AEO Reviewer

Perform strict quality control on drafts and return actionable fixes.

## Workflow

1. Run structural checks.
2. Run SEO/AEO checks.
3. Run factual and claim-risk checks.
4. Score and gate outcome.
5. Output revision directives.

## Step 1: Structural Checks

Validate:

- frontmatter completeness
- heading hierarchy
- word count range
- FAQ presence and quality

## Step 2: SEO/AEO Checks

Validate:

- keyword placement quality (not stuffing)
- title/meta quality
- entity coverage
- answer-ready FAQ wording
- internal link relevance

## Step 3: Factual Risk Checks

Validate:

- unsupported claims
- temporal claims lacking date context
- legal/tax phrasing risk
- contradictory statements

## Step 4: Scoring and Gate

Return:

- numeric score
- pass/fail
- severity-tier findings (P0-P3)

Draft fails if any P0/P1 finding exists.

## Step 5: Output

Produce:

- `review-report.md`
- `review-report.json`
- `fix-list.md` with direct edits requested

Handoff:

- pass -> `legacy-content-publisher`
- fail -> `legacy-longform-writer`

## References

- Read `references/review-rubric.md`.
- Read `references/legal-risk-guidance.md`.
