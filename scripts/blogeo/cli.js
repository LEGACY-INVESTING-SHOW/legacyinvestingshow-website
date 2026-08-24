#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT_DIR } = require('./lib/paths');
const { writeJson, readJson } = require('./lib/fs');
const { writeCatalog, buildCatalog, loadCatalog } = require('./lib/catalog');
const { ingestGscCsv, loadLatestGsc } = require('./lib/gsc');
const { scoreCatalog, powerLaw, nearMissQueries, runHygiene } = require('./lib/score');
const { seedKeywordOwnership } = require('./lib/ownership');
const { buildAuditTickets, persistTickets } = require('./lib/tickets');
const { writeGithubIssue } = require('./lib/github');
const { writeBaseline } = require('./lib/report');
const { generateNearMiss } = require('./lib/generate');
const { applyEdit, skipTicket, applyAutoTickets } = require('./lib/apply-edit');
const { fillWindows } = require('./lib/fill');
const { pickIsoWeek } = require('./lib/opportunity');
const { readPolicy } = require('./lib/indexation');
const { loadSourcePack, factCheckTopPages } = require('./lib/factcheck');
const { ingestAeoCsv } = require('./lib/aeo-csv');
const { proposeTitle, proposeDescription } = require('./lib/draft-edit');
const { writeLlmsTxt } = require('./lib/llms-from-catalog');

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

function latestDir(baseName, root = ROOT_DIR) {
    const base = path.join(root, 'data', 'blogeo', baseName);
    if (!fs.existsSync(base)) return null;
    const dirs = fs.readdirSync(base, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();
    return dirs.length ? path.join(base, dirs[dirs.length - 1]) : null;
}

function latestImportDir(root = ROOT_DIR) {
    return process.env.BLOGEO_GSC_DIR || latestDir('gsc-imports', root);
}

function cmdCatalog() {
    const catalog = writeCatalog(ROOT_DIR);
    const ownership = seedKeywordOwnership(catalog, {
        forceIndexSlugs: (readPolicy().forceIndexBlogSlugs || []),
    }, ROOT_DIR);
    const snapshot = loadLatestGsc(ROOT_DIR);
    const scored = snapshot ? scoreCatalog(catalog, snapshot) : catalog.pages;
    writeLlmsTxt(catalog, scored, ROOT_DIR);
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

function normalizePagePath(value) {
    if (!value || value === true) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    try {
        if (/^https?:\/\//i.test(raw)) {
            const pathname = new URL(raw).pathname;
            return pathname.replace(/\/$/, '') || '/';
        }
    } catch (error) {
        // fall through to path-style handling
    }
    const withSlash = raw.startsWith('/') ? raw : `/${raw}`;
    return withSlash.replace(/\/$/, '') || '/';
}

function runAudit(args = {}) {
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
    const hygiene = runHygiene(catalog, snapshot, ROOT_DIR);
    const pack = loadSourcePack(ROOT_DIR);
    const fact = factCheckTopPages(scored, pack, ROOT_DIR);
    const flags = hygiene.concat(fact.flags || []);
    const queries = nearMissQueries(snapshot, ownership);
    const tickets = persistTickets(buildAuditTickets(scored, flags, snapshot), ROOT_DIR);
    const week = snapshot.week || pickIsoWeek();
    const aeo = readJson(path.join(ROOT_DIR, 'data', 'blogeo', 'aeo', 'latest.json'), null);
    writeLlmsTxt(catalog, scored, ROOT_DIR);
    const run = {
        week,
        generatedAt: new Date().toISOString(),
        windowNote: snapshot.windowNote,
        catalog: { pageCount: catalog.pageCount, indexableCount: catalog.indexableCount },
        sitewide: snapshot.sitewide,
        power,
        factcheck: { checkedCount: fact.checkedCount, flagCount: (fact.flags || []).length },
        aeo: aeo ? { citedUrlCount: aeo.citedUrlCount, rowCount: aeo.rowCount } : null,
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
    const urlFilter = normalizePagePath(args.url || args.path);
    let issueTickets = tickets;
    let issueScored = scored;
    let issueFlags = flags;
    if (urlFilter) {
        issueTickets = tickets.filter((ticket) => normalizePagePath(ticket.path) === urlFilter);
        issueScored = scored.filter((page) => normalizePagePath(page.path) === urlFilter);
        issueFlags = flags.filter((flag) => normalizePagePath(flag.path) === urlFilter);
    }
    writeJson(path.join(ROOT_DIR, 'data', 'blogeo', 'runs', `${week}.json`), run);
    writeGithubIssue({ week, snapshot, power, scored: issueScored, flags: issueFlags, tickets: issueTickets, queries }, ROOT_DIR);
    writeBaseline({ catalog, snapshot, power, scored: issueScored, flags: issueFlags, queries, ownership, aeo }, ROOT_DIR);
    console.log(`Audit ${week}: ${issueTickets.length} tickets, ${issueFlags.length} hygiene flags, fact-check ${fact.checkedCount} pages${urlFilter ? ` (filtered to ${urlFilter})` : ''}.`);
    console.log('Wrote analysis/blogeo-baseline.md and analysis/blogeo-audit-latest.md');
    return run;
}

function cmdApply(args) {
    const actor = process.env.USER || 'cli';
    if (args.auto) {
        const result = applyAutoTickets(actor, ROOT_DIR);
        console.log(JSON.stringify(result, null, 2));
        return result;
    }
    const ticketId = args.ticket;
    if (!ticketId) throw new Error('Pass --ticket <id> or --auto');
    if (args.skip) {
        const skipped = skipTicket(ticketId, actor, ROOT_DIR);
        console.log(`Skipped ${skipped.id}`);
        return skipped;
    }
    const edit = applyEdit(ticketId, actor, ROOT_DIR);
    console.log(`Applied ${edit.id} to ${edit.sourcePath}`);
    return edit;
}

function cmdFactcheck() {
    const catalog = loadCatalog(ROOT_DIR);
    const snapshot = loadLatestGsc(ROOT_DIR);
    const scored = snapshot ? scoreCatalog(catalog, snapshot) : catalog.pages;
    const result = factCheckTopPages(scored, loadSourcePack(ROOT_DIR), ROOT_DIR);
    console.log(JSON.stringify(result, null, 2));
    return result;
}

function cmdAeo(args) {
    const dir = args.dir || latestDir('aeo-imports');
    if (!dir) throw new Error('No AEO import directory. Pass --dir path/to/csv-folder');
    const snapshot = ingestAeoCsv(dir, ROOT_DIR);
    console.log(`AEO ingest: ${snapshot.rowCount} rows, ${snapshot.citedUrlCount} cited URLs.`);
    return snapshot;
}

function cmdReport(args) {
    const week = args.week;
    if (week) {
        const dated = path.join(ROOT_DIR, 'analysis', `blogeo-audit-${week}.md`);
        const latest = path.join(ROOT_DIR, 'analysis', 'blogeo-audit-latest.md');
        const target = fs.existsSync(dated) ? dated : latest;
        if (fs.existsSync(target)) {
            console.log(fs.readFileSync(target, 'utf8'));
            console.log(`Read ${path.relative(ROOT_DIR, target)}`);
            return target;
        }
    }
    return runAudit(args);
}

function cmdTitle(args) {
    const pagePath = normalizePagePath(args.path || args.url);
    const query = args.query;
    if (!pagePath) throw new Error('Pass --path /blog/slug or --url /blog/slug');
    const catalog = loadCatalog(ROOT_DIR);
    const page = (catalog.pages || []).find((item) => item.path === pagePath);
    if (!page) throw new Error(`Unknown path: ${pagePath}`);
    const result = {
        path: page.path,
        currentTitle: page.title,
        currentDescription: page.description,
        proposedTitle: proposeTitle(page, query),
        proposedDescription: proposeDescription(page, query),
        query: query || page.primaryKeyword || null,
    };
    console.log(JSON.stringify(result, null, 2));
    return result;
}

function cmdLlms() {
    const catalog = loadCatalog(ROOT_DIR);
    const snapshot = loadLatestGsc(ROOT_DIR);
    const scored = snapshot ? scoreCatalog(catalog, snapshot) : catalog.pages;
    const result = writeLlmsTxt(catalog, scored, ROOT_DIR);
    console.log(`Updated ${result.outPath}`);
    return result;
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
            return runAudit(args);
        case 'report':
            return cmdReport(args);
        case 'generate':
            console.log(JSON.stringify(generateNearMiss(ROOT_DIR, { query: args.query }), null, 2));
            return null;
        case 'apply':
            return cmdApply(args);
        case 'fill':
            console.log(JSON.stringify(fillWindows(ROOT_DIR), null, 2));
            return null;
        case 'factcheck':
            return cmdFactcheck();
        case 'aeo':
            return cmdAeo(args);
        case 'title':
            return cmdTitle(args);
        case 'llms':
            return cmdLlms();
        default:
            console.log(`BlogEO CLI

Usage:
  node scripts/blogeo/cli.js catalog
  node scripts/blogeo/cli.js ingest [--dir data/blogeo/gsc-imports/2026-08-24]
  node scripts/blogeo/cli.js audit [--url /blog/slug]
  node scripts/blogeo/cli.js generate [--query "near miss query"]
  node scripts/blogeo/cli.js report [--week 2026-W35]
  node scripts/blogeo/cli.js apply --ticket <id> [--skip]
  node scripts/blogeo/cli.js apply --auto
  node scripts/blogeo/cli.js apply --auto
  node scripts/blogeo/cli.js fill
  node scripts/blogeo/cli.js factcheck
  node scripts/blogeo/cli.js aeo [--dir data/blogeo/aeo-imports/2026-08-24]
  node scripts/blogeo/cli.js title --path /blog/slug [--url /blog/slug] [--query "head term"]
  node scripts/blogeo/cli.js llms
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
