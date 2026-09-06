---
name: legacy-seo-strategy
description: Decide whether a proposed Legacy Investing Show page should exist, which URL owns the query, and whether to ship, audit, or refuse. Use before drafting any new SEO post.
---

# Legacy SEO Strategy

Choose topics. Do not write the post. Do not invent a second canonical URL.

## Inputs

- BlogEO catalog + `keyword-ownership.json`
- Latest GSC snapshot (near-miss list)
- Indexation policy
- Source pack (`data/blogeo/source-pack/`)

## Ship only if all of these are true

1. The query has GSC impressions ≥ 150 and average position between 5 and 20, **or** a human named the query in the GitHub ticket.
2. No existing indexable URL already owns that query.
3. The query is in-cluster (tax, entity, retirement, insurance, Airbnb operations, wealth systems). Branded reputational queries go to `/` or `/blog/preston-seo-review`, never a new post.
4. The page can cite IRS / calculator / dated student-stat sources. No unsourced tax figures.
5. Weekly cap is not already used (one generated post per week).

## If the query is already owned

Do **not** draft a second post. Return the owner URL and tell audit to refresh that page.

## Output

```yaml
decision: ship | audit-owner | refuse
query: ""
ownerUrl: ""
cluster: ""
persona: ""
notes: ""
```

Refuse `seo-topics-1000.json` mill topics. Refuse persona-modifier farms that the indexation policy would noindex.
