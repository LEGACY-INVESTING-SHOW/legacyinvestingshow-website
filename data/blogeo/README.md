# BlogEO data

Measurement loop for Legacy Investing Show search/AEO. Git is the CMS. The agent does not write production files; `scripts/blogeo/cli.js apply` is the only writer.

## Drop a Search Console export

1. In Google Search Console, open the property for `https://www.legacyinvestingshow.com`.
2. Search type **Web**. Prefer **Last 28 days**, then a second export for the previous 28 days.
3. Export the table as CSV (Pages, Queries, Chart, Filters, plus any extras).
4. Put the files in `data/blogeo/gsc-imports/<YYYY-MM-DD>/`.
5. Run:

```bash
npm run blogeo:ingest -- --dir data/blogeo/gsc-imports/<YYYY-MM-DD>
npm run blogeo:audit
```

The 2026-08-24 drop is **Last 3 months**, not 28 days. Recover scoring stays at zero until a second comparable window exists.

## Commands

```bash
npm run blogeo:catalog
npm run blogeo:ingest
npm run blogeo:audit
npm run blogeo:generate
npm run blogeo:report
npm run blogeo:fill
npm run blogeo:factcheck
npm run blogeo:aeo -- --dir data/blogeo/aeo-imports/<date>
npm run blogeo:llms
node scripts/blogeo/cli.js title --path /blog/preston-seo-review --query "preston seo"
node scripts/blogeo/cli.js apply --ticket <id>
node scripts/blogeo/cli.js apply --ticket <id> --skip
```

Cap: at most one near-miss draft ticket per week, and only for GSC queries with ≥150 impressions, position 5–20, and no owner in `keyword-ownership.json`. Do not resume `seo-topics-1000.json`.

Generated posts enroll in `data/blogeo/generated-posts/` with day-0 GSC zeros. `blogeo:fill` writes +28 / +56 windows onto both edits and generated posts.

`data/blogeo/youtube-queue.json` is a manual seed list when GSC near-misses are thin. It still goes through the same gates. Do not patch `tools/*.html`; calculator copy lives in calcs2.
