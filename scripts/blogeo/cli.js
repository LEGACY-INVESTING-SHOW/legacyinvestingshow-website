#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT_DIR } = require('./lib/paths');
const { writeJson } = require('./lib/fs');
const { writeCatalog, buildCatalog } = require('./lib/catalog');
const { ingestGscCsv, loadLatestGsc } = require('./lib/gsc');
const { scoreCatalog, powerLaw, nearMissQueries, runHygiene } = require('./lib/score');
const { seedKeywordOwnership } = require('./lib/ownership');
const { buildAuditTickets, persistTickets } = require('./lib/tickets');
const { writeGithubIssue } = require('./lib/github');
const { writeBaseline } = require('./lib/report');
const { generateNearMiss } = require('./lib/generate');
const { applyEdit, skipTicket } = require('./lib/apply-edit');
const { fillWindows } = require('./lib/fill');
const { pickIsoWeek } = require('./lib/opportunity');
const { readPolicy } = require('./lib/indexation');

function parseArgs(argv) {
    const args = { _: [] };
    for (let i = 2; i < argv.length; i += 1) {
        const token = argv[i];
        if (token.startsWith('--')) {
            const key = token.slice(2);
            const next = argv[i + 1];
            if (!next || next.startsWith('--')) args[key] = true;
            else {
                args[key] = next;
                i += 1;
            }
        } else args._.push(token);
    }
    return args;
}

function latestImportDir(root = ROOT_DIR) {
    if (process.env.BLOGEO_GSC_DIR) return process.env.BLOGEO_GSC_DIR;
    const base = path.join(root, 'data', 'blogeo', 'gsc-imports');
    if (!fs.existsSync(base)) return null;
    const dirs = fs.readdirSync(base, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();
    return dirs.length ? path.join(base, dirs[dirs.length - 1]) : null;
}

function cmdCatalog() {
    const catalog = writeCatalog(ROOT_DIR);
    const ownership = seedKeywordOwnership(catalog, {
        forceIndexSlugs: (readPolicy().forceIndexBlogSlugs || []),
    }, ROOT_DIR);
    console.log(`Catalog: ${catalog.pageCount} pages (${catalog.indexableCount} indexable).`);
    console.log(`Ownership keys: ${Object.keys(ownership.ownership).length}.`);
    return { catalog, ownership };
}

function cmdIngest(args) {
    const dir = args.dir || latestImportDir();
    if (!dir) throw new Error('No GSC import directory. Pass --dir path/to/csv-folder');
    const snapshot = ingestGscCsv(dir, ROOT_DIR);
    console.log(`Ingested ${snapshot.pages.length} pages, ${snapshot.queries.length} queries (${snapshot.windowNote}).`);
    console.log(`Sitewide clicks=${snapshot.sitewide.clicks} impressions=${snapshot.sitewide.impressions}.`);
    return snapshot;
}

function runAudit() {
    const catalog = buildCatalog(ROOT_DIR);
    writeCatalog(ROOT_DIR);
    const ownership = seedKeywordOwnership(catalog, {
        forceIndexSlugs: (readPolicy().forceIndexBlogSlugs || []),
    }, ROOT_DIR);
    let snapshot = loadLatestGsc(ROOT_DIR);
    if (!snapshot) {
        const dir = latestImportDir();
        if (dir) snapshot = ingestGscCsv(dir, ROOT_DIR);
    }
    if (!snapshot) throw new Error('No GSC snapshot. Drop CSVs into data/blogeo/gsc-imports/<date>/ first.');

    const scored = scoreCatalog(catalog, snapshot);
    const power = powerLaw(scored, snapshot.sitewide.clicks);
    const flags = runHygiene(catalog, snapshot, ROOT_DIR);
    const queries = nearMissQueries(snapshot, ownership);
    const tickets = persistTickets(buildAuditTickets(scored, flags, snapshot), ROOT_DIR);
    const week = snapshot.week || pickIsoWeek();
    const run = {
        week,
        generatedAt: new Date().toISOString(),
        windowNote: snapshot.windowNote,
        catalog: { pageCount: catalog.pageCount, indexableCount: catalog.indexableCount },
        sitewide: snapshot.sitewide,
        power,
        flagCounts: flags.reduce((acc, flag) => {
            acc[flag.type] = (acc[flag.type] || 0) + 1;
            return acc;
        }, {}),
        ticketIds: tickets.map((ticket) => ticket.id),
        topOpportunities: scored.slice(0, 25).map((page) => ({
            path: page.path,
            lever: page.opportunity.lever,
            score: page.opportunity.score,
            clicks: page.gsc.clicks,
            impressions: page.gsc.impressions,
            position: page.gsc.position,
            sitelinkSuspect: page.sitelinkSuspect,
        })),
    };
    writeJson(path.join(ROOT_DIR, 'data', 'blogeo', 'runs', `${week}.json`), run);
    writeGithubIssue({ week, snapshot, power, scored, flags, tickets, queries }, ROOT_DIR);
    writeBaseline({ catalog, snapshot, power, scored, flags, queries, ownership }, ROOT_DIR);
    console.log(`Audit ${week}: ${tickets.length} tickets, ${flags.length} hygiene flags.`);
    console.log('Wrote analysis/blogeo-baseline.md and analysis/blogeo-audit-latest.md');
    return run;
}

function cmdApply(args) {
    const ticketId = args.ticket;
    if (!ticketId) throw new Error('Pass --ticket <id>');
    if (args.skip) {
        const skipped = skipTicket(ticketId, process.env.USER || 'cli', ROOT_DIR);
        console.log(`Skipped ${skipped.id}`);
        return skipped;
    }
    const edit = applyEdit(ticketId, process.env.USER || 'cli', ROOT_DIR);
    console.log(`Applied ${edit.id} to ${edit.sourcePath}`);
    return edit;
}

function main() {
    const args = parseArgs(process.argv);
    const command = args._[0] || 'help';
    switch (command) {
        case 'catalog':
            return cmdCatalog();
        case 'ingest':
            return cmdIngest(args);
        case 'audit':
        case 'report':
            return runAudit();
        case 'generate':
            console.log(JSON.stringify(generateNearMiss(ROOT_DIR), null, 2));
            return null;
        case 'apply':
            return cmdApply(args);
        case 'fill':
            console.log(JSON.stringify(fillWindows(ROOT_DIR), null, 2));
            return null;
        default:
            console.log(`BlogEO CLI

Usage:
  node scripts/blogeo/cli.js catalog
  node scripts/blogeo/cli.js ingest [--dir data/blogeo/gsc-imports/2026-08-24]
  node scripts/blogeo/cli.js audit
  node scripts/blogeo/cli.js generate
  node scripts/blogeo/cli.js report
  node scripts/blogeo/cli.js apply --ticket <id> [--skip]
  node scripts/blogeo/cli.js fill
`);
            return null;
    }
}

if (require.main === module) {
    try {
        main();
    } catch (error) {
        console.error(error.stack || error.message || error);
        process.exit(1);
    }
}

module.exports = { main, parseArgs, runAudit };
