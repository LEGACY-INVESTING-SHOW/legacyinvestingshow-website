---
name: legacy-ideation-engine
description: Discover and prioritize SEO and AEO topic opportunities using live web search, trend signals, and keyword clustering. Use when planning content calendars, generating large topic sets (50-500 ideas), identifying emerging user questions, or deciding what to write next.
---

# Legacy Ideation Engine

Build a ranked topic pipeline from real search behavior and current web evidence.

## Workflow

1. Collect seeds.
2. Expand seeds into query permutations.
3. Run web-search collection.
4. Cluster and score opportunities.
5. Output priority queues and content angles.

## Step 1: Collect Seeds

Use one or more of:

- personas (`nurses`, `W-2 employees`, `first-time Airbnb operators`)
- business outcomes (`cash flow`, `tax savings`, `portfolio growth`)
- content types (`how-to`, `comparison`, `case study`, `checklist`)

If seeds are broad, split into subthemes before searching.

## Step 2: Expand Search Queries

Generate query variants for each seed:

- informational: `how`, `what`, `guide`, `mistakes`
- comparative: `vs`, `best`, `alternative`
- transactional intent: `template`, `calculator`, `tool`, `service`
- geo modifiers: `near me`, city/state, US national
- year modifier: include current year

## Step 3: Collect Evidence with Web Search

Web search is required for this skill.

Run at least 8 searches per seed set:

- query + year
- query + "reddit"
- query + "youtube"
- query + "case study"
- query + "statistics"
- query + "FAQ"
- query + "mistakes"
- query + "for beginners"

Capture:

- repeated user questions
- SERP pattern type (guide/list/comparison/forum/video)
- freshness signals (new pages/topics)
- weak/underserved angles from current results

Use `references/query-patterns.md` and `references/output-spec.md`.

## Step 4: Cluster and Score

Cluster topics by shared intent and entity overlap.

Score each topic from 1-5 on:

- relevance to Legacy Investing Show offers
- intent clarity
- freshness/trend momentum
- difficulty/competition estimate
- conversion potential

Mark quick wins separately.

## Step 5: Output

Produce:

- `ideation-priority.md` with top opportunities, rationale, and recommended format
- `ideation-backlog.csv` with 100-500 rows depending on run size

Required columns in backlog:

- topic
- primary keyword
- intent
- persona
- format
- priority
- rationale
- suggested next skill (`legacy-topic-researcher`)

## References

- Read `references/query-patterns.md` for query generation rules.
- Read `references/output-spec.md` for output format.
