'use strict';

const path = require('path');
const { ROOT_DIR } = require('./paths');
const { writeText } = require('./fs');
const { pickIsoWeek } = require('./opportunity');

function pct(value) {
    return `${((Number(value) || 0) * 100).toFixed(1)}%`;
}

function num(value) {
    return Number(value || 0).toLocaleString('en-US');
}

function buildBaselineMarkdown(payload) {
    const catalog = payload.catalog || {};
    const snapshot = payload.snapshot || {};
    const power = payload.power || {};
    const scored = payload.scored || [];
    const flags = payload.flags || [];
    const queries = payload.queries || [];
    const ownership = payload.ownership || {};
    const aeo = payload.aeo || null;
    const week = snapshot.week || pickIsoWeek();
    const topScored = scored.filter((page) => page.gsc && page.gsc.impressions > 0).slice(0, 20);
    const brandedClicks = (snapshot.queries || [])
        .filter((row) => /preston seo|legacy investing show|legacyinvestingshow|legacy wealth blueprint/i.test(row.query))
        .reduce((sum, row) => sum + row.clicks, 0);
    const nearMisses = queries.filter((row) => row.nearMiss);
    const watch = queries.filter((row) => row.watchlist);
    const byType = {};
    for (const flag of flags) byType[flag.type] = (byType[flag.type] || 0) + 1;

    const lines = [
        '# BlogEO baseline',
        '',
        `Week: **${week}**  `,
        snapshot.windowNote ? `GSC export: **${snapshot.windowNote}**  ` : '',
        snapshot.sitewide ? `Chart range: **${snapshot.sitewide.startDate} → ${snapshot.sitewide.endDate}**  ` : '',
        `Catalog: **${catalog.pageCount}** URLs, **${catalog.indexableCount}** indexable, **${catalog.noindexCount}** noindex  `,
        `Keyword ownership keys: **${Object.keys(ownership.ownership || {}).length}**`,
        '',
        '## What this snapshot can and cannot say',
        '',
        '- This is a **Search Console UI export**, not the API. Pages and queries are truncated to what GSC put in the CSV.',
        '- The date filter is **Last 3 months**, not two consecutive 28-day windows. The **recover** lever is zero until a second comparable snapshot exists.',
        '- `expectedCtr(position)` is a ranking heuristic. GSC positions are query-blended, so CTR headroom is a **soft** number.',
        '',
        '## Sitewide',
        '',
        '| Metric | Value |',
        '|---|---:|',
        `| Clicks | ${num(snapshot.sitewide && snapshot.sitewide.clicks)} |`,
        `| Impressions | ${num(snapshot.sitewide && snapshot.sitewide.impressions)} |`,
        `| CTR | ${pct(snapshot.sitewide && snapshot.sitewide.ctr)} |`,
        `| Avg position (impression-weighted daily) | ${((snapshot.sitewide && snapshot.sitewide.position) || 0).toFixed(1)} |`,
        `| Branded query clicks (approx.) | ${num(brandedClicks)} |`,
        '',
        '## Power law',
        '',
        'Clicks on this property are extremely concentrated. Homepage plus one review URL already dominate the exported page table.',
        '',
        '| Cut | Share of clicks |',
        '|---|---:|',
        `| Top 1 URL | ${pct(power.top1Share)} |`,
        `| Top 5 URLs | ${pct(power.top5Share)} |`,
        `| Top 14 URLs | ${pct(power.top14Share)} |`,
        `| URLs with any clicks in the export | ${power.urlsWithClicks} |`,
        '',
        '### Top URLs by clicks',
        '',
        '| URL | Clicks | Impr | Pos | CTR | Share |',
        '|---|---:|---:|---:|---:|---:|',
    ];
    for (const row of power.topUrls || []) {
        lines.push(`| \`${row.path}\` | ${row.clicks} | ${row.impressions} | ${row.position} | ${pct(row.ctr)} | ${pct(row.share)} |`);
    }
    lines.push(
        '',
        '## Opportunity queue (first look)',
        '',
        'Sitelink-suspect rows (identical impression/position signatures across hub URLs) are scored but should not get title tickets.',
        '',
        '| URL | Lever | Score | Clicks | Impr | Pos | CTR | Expected | Notes |',
        '|---|---|---:|---:|---:|---:|---:|---:|---|',
    );
    for (const page of topScored) {
        const notes = [];
        if (page.sitelinkSuspect) notes.push('sitelink-suspect');
        if (!page.indexable) notes.push('noindex');
        if (page.opportunity && page.opportunity.lowVisibility) notes.push('low-visibility');
        const opp = page.opportunity || {};
        const gsc = page.gsc || {};
        lines.push(`| \`${page.path}\` | ${opp.lever} | ${(opp.score || 0).toFixed(1)} | ${gsc.clicks} | ${gsc.impressions} | ${gsc.position} | ${pct(gsc.ctr)} | ${pct(opp.expectedCtr)} | ${notes.join(', ') || '—'} |`);
    }
    lines.push(
        '',
        '## Near-miss generator input',
        '',
        nearMisses.length === 0
            ? '**Zero** non-branded queries currently clear impressions ≥ 150 and position 5–20. The weekly generator should stay quiet rather than invent topics.'
            : `Near-miss candidates: **${nearMisses.length}**. Cap remains 1 post/week.`,
        '',
        watch.length
            ? `Watchlist (30–149 impressions, pos 5–20): ${watch.slice(0, 8).map((row) => `\`${row.query}\` (${row.impressions} impr, pos ${row.position})`).join('; ')}.`
            : 'Watchlist is empty in this export.',
        '',
        '## Hygiene counts',
        '',
        '| Flag | Count |',
        '|---|---:|',
    );
    for (const type of Object.keys(byType).sort()) lines.push(`| ${type} | ${byType[type]} |`);
    const aeoBlock = aeo || { rowCount: 0, citedUrlCount: 0 };
    lines.push(
        '',
        '## AEO citations',
        '',
        `Citation CSV rows: **${aeoBlock.rowCount || 0}**. Cited URLs: **${aeoBlock.citedUrlCount || 0}**. Google winners and cited URLs will diverge; that is expected.`,
        aeoBlock.citedUrlCount
            ? 'Drop the next SEMrush/Ahrefs/Peec CSV into `data/blogeo/aeo-imports/<date>/` and run `node scripts/blogeo/cli.js aeo`.'
            : 'No citation CSV loaded yet. Phase 4 stays CSV-manual until a vendor export exists.',
    );
    lines.push(
        '',
        '## What to do next',
        '',
        '1. Keep dropping GSC CSVs into `data/blogeo/gsc-imports/<date>/` until API credentials exist. Prefer **Last 28 days** plus the previous 28 days as two folders.',
        '2. Review `analysis/blogeo-audit-latest.md` tickets. Apply only through `node scripts/blogeo/cli.js apply --ticket <id>`.',
        '3. Do not un-noindex persona farms. Do not resume `seo-topics-1000.json`.',
        '4. The homepage masterclass CTA and dual GTM/gtag audit are **not** this engine. Separate PRs.',
        ''
    );
    return lines.join('\n');
}

function writeBaseline(payload, root = ROOT_DIR) {
    const markdown = buildBaselineMarkdown(payload);
    const outPath = path.join(root, 'analysis', 'blogeo-baseline.md');
    writeText(outPath, markdown);
    return { markdown, outPath };
}

module.exports = { buildBaselineMarkdown, writeBaseline };
