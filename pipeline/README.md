# Skill-Based Agent Pipeline

This is now a **skill-driven** content pipeline.

## Skill packages

Located at `pipeline/skills/`:

1. `legacy-ideation-engine`
2. `legacy-topic-researcher`
3. `legacy-brief-architect`
4. `legacy-longform-writer`
5. `legacy-seo-aeo-reviewer`
6. `legacy-content-publisher`

Each skill includes:

- `SKILL.md`
- `agents/openai.yaml`
- `references/*`
- `scripts/*`

## Orchestrator

- command: `npm run pipeline`
- runner: `scripts/pipeline/run-skill-pipeline.js`

Pipeline stages:

1. ideation (web-search + LLM)
2. deep research (web-search + LLM)
3. brief generation (LLM)
4. draft writing (LLM)
5. SEO/AEO review (LLM)
6. publishing (optional, gated)

## Required environment

At least one LLM provider key:

- `OPENAI_API_KEY` or
- `ANTHROPIC_API_KEY`

At least one search provider key:

- `TAVILY_API_KEY` (default provider), or
- `SERPAPI_API_KEY`

Optional selectors:

- `PIPELINE_LLM_PROVIDER=openai|anthropic`
- `SEARCH_PROVIDER=tavily|serpapi`

## Run examples

Dry run with real workflow, no external API calls:

```bash
npm run pipeline -- --topic "tax strategies for nurses" --dry-run
```

Live run with APIs:

```bash
PIPELINE_LLM_PROVIDER=openai SEARCH_PROVIDER=tavily npm run pipeline -- --topic "tax strategies for nurses"
```

Generate from a seed list:

```bash
npm run pipeline -- --seeds-file data/topic-seeds.txt --topic-count 200
```

Publish if review passes:

```bash
npm run pipeline -- --topic "short-term rental loophole" --publish
```

Publisher gate commands now include:

- `npm run build:blog`
- `npm run build:sitemap`
- `npm run cms:verify`
