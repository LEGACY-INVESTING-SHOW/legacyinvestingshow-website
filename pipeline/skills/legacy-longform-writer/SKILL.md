---
name: legacy-longform-writer
description: Draft long-form markdown content from approved briefs using source-backed claims, scannable structure, conversion-aware CTAs, and strict frontmatter completeness. Use after brief approval and before quality review.
---

# Legacy Longform Writer

Write production-ready markdown from a locked brief without inventing unsupported claims.

## Workflow

1. Validate brief completeness.
2. Draft structure-first.
3. Fill sections with evidence-backed writing.
4. Add FAQs and CTA.
5. Self-check before handoff.

## Step 1: Validate Inputs

Require:

- approved brief
- citation references
- target word range

If brief lacks evidence anchors, stop and return to `legacy-brief-architect`.

## Step 2: Draft Skeleton

Create markdown with:

- complete frontmatter
- one H1
- ordered H2/H3 hierarchy
- planned FAQ section

## Step 3: Write Content

Apply writing rules:

- concrete and practical, no fluff
- explain tradeoffs and decisions
- use short paragraphs and clear bullets
- only include claims supported by dossier

## Step 4: FAQs and CTA

FAQ answers must be direct and citation-compatible.

CTA must align with program goals and not disrupt reader trust.

## Step 5: Output

Produce `draft.md` and a short `writer-notes.md` listing assumptions.

Then handoff to `legacy-seo-aeo-reviewer`.

## References

- Read `references/writing-standards.md`.
- Read `references/frontmatter-spec.md`.
