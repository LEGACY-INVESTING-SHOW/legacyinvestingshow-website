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

function buildGithubIssue({ week, snapshot, power, scored, flags, tickets, queries }) {
    const currentWeek = week || pickIsoWeek();
    const top = (scored || []).filter((page) => page.opportunity && page.opportunity.score > 0).slice(0, 15);
    const nearMisses = (queries || []).filter((row) => row.nearMiss).slice(0, 10);
    const watch = (queries || []).filter((row) => row.watchlist).slice(0, 10);
    const lines = [
        `# BlogEO audit — ${currentWeek}`,
        '',
        snapshot && snapshot.windowNote
            ? `GSC window: **${snapshot.windowNote}**. Recover lever is unavailable until a second comparable snapshot exists.`
            : 'No GSC snapshot loaded.',
        '',
        '## Sitewide',
        '',
        `- Clicks: **${num(snapshot && snapshot.sitewide && snapshot.sitewide.clicks)}**`,
        `- Impressions: **${num(snapshot && snapshot.sitewide && snapshot.sitewide.impressions)}**`,
        `- CTR: **${pct(snapshot && snapshot.sitewide && snapshot.sitewide.ctr)}**`,
        power ? `- Top 5 URL share of clicks: **${pct(power.top5Share)}**` : '',
        power ? `- Top 14 URL share of clicks: **${pct(power.top14Share)}**` : '',
        '',
        '## Ranked opportunities',
        '',
        '| # | URL | Lever | Score | Clicks | Impr | Pos | CTR | Expected |',
        '|---|---|---|---:|---:|---:|---:|---:|---:|',
    ];
    top.forEach((page, index) => {
        lines.push(`| ${index + 1} | \`${page.path}\` | ${page.opportunity.lever} | ${page.opportunity.score.toFixed(1)} | ${page.gsc.clicks} | ${page.gsc.impressions} | ${page.gsc.position} | ${pct(page.gsc.ctr)} | ${pct(page.opportunity.expectedCtr)} |`);
    });
    lines.push('', '## Tickets', '');
    if (!tickets || tickets.length === 0) lines.push('No tickets this run.');
    else {
        for (const ticket of tickets) {
            lines.push(`- \`${ticket.id}\` · **${ticket.kind}** · ${ticket.lever} · ${ticket.autoApply ? 'auto-apply candidate' : 'Approve / Edit / Skip'} · ${ticket.path || ticket.targetQuery || ''} — ${ticket.reason}`);
        }
    }
    lines.push('', '## Hygiene flags', '');
    const byType = {};
    for (const flag of flags || []) byType[flag.type] = (byType[flag.type] || 0) + 1;
    const types = Object.keys(byType);
    if (types.length === 0) lines.push('No hygiene flags.');
    for (const type of types.sort()) lines.push(`- ${type}: ${byType[type]}`);
    lines.push('', '## Near-miss queries', '');
    if (nearMisses.length === 0) lines.push('No non-branded queries currently meet the 150-impression / position 5–20 gate.');
    else nearMisses.forEach((row) => lines.push(`- \`${row.query}\` · ${row.impressions} impr · pos ${row.position} · ${row.clicks} clicks`));
    lines.push('', '## Watchlist (< 150 impressions)', '');
    if (watch.length === 0) lines.push('Empty.');
    else watch.forEach((row) => lines.push(`- \`${row.query}\` · ${row.impressions} impr · pos ${row.position}`));
    lines.push('', '## How to act', '', '```bash', 'node scripts/blogeo/cli.js apply --ticket <id>', 'node scripts/blogeo/cli.js apply --ticket <id> --skip', '```', '');
    return lines.filter((line, index, arr) => !(line === '' && arr[index - 1] === '')).join('\n');
}

function writeGithubIssue(payload, root = ROOT_DIR) {
    const week = payload.week || pickIsoWeek();
    const markdown = buildGithubIssue(payload);
    const outPath = path.join(root, 'analysis', `blogeo-audit-${week}.md`);
    writeText(outPath, markdown);
    writeText(path.join(root, 'analysis', 'blogeo-audit-latest.md'), markdown);
    return { markdown, outPath };
}

module.exports = {
    buildGithubIssue,
    writeGithubIssue,
    writeGithubIssue: writeGithubIssue,
};
