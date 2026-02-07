# Quickstart

## 1) Dry run first

```bash
npm run pipeline -- --topic "airbnb setup checklist" --dry-run
```

This creates a run folder in `pipeline/runs/<timestamp-topic>/`.

## 2) Configure live providers

Set keys:

- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`
- `TAVILY_API_KEY` or `SERPAPI_API_KEY`

## 3) Run live

```bash
npm run pipeline -- --topic "tax strategies for nurses"
```

## 4) Review outputs

Open:

- `01-ideation.md`
- `02-research.md`
- `03-brief.md`
- `04-draft.md`
- `05-review.md`
- `RUN-SUMMARY.md`

## 5) Publish (optional)

```bash
npm run pipeline -- --topic "tax strategies for nurses" --publish
```

Publishing only proceeds when reviewer verdict is PASS.
