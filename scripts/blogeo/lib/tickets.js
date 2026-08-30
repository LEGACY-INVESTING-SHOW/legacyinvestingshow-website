'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT_DIR } = require('./paths');
const { sha256 } = require('./hash');
const { saveSuggestion } = require('./apply-edit');
const { pickIsoWeek } = require('./opportunity');
const { loadOwnership, findOwner } = require('./ownership');
const { isBrandedQuery, isInClusterQuery } = require('./queries');
const { proposeTitle, proposeDescription } = require('./draft-edit');

function pad(num) {
    return String(num).padStart(3, '0');
}

function countOccurrences(haystack, needle) {
    if (!needle) return 0;
    return String(haystack).split(needle).length - 1;
}

function makeTicket(partial, index, week) {
    return {
        id: `be-${week.replace('-', '')}-${pad(index)}`,
        status: 'open',
        createdAt: new Date().toISOString(),
        week,
        ...partial,
    };
}

function uniqueTitleYearSwap(page, root) {
    const sourcePath = page.sourcePath;
    if (!sourcePath || !sourcePath.endsWith('.md')) return null;
    const abs = path.join(root, sourcePath);
    if (!fs.existsSync(abs)) return null;
    const live = fs.readFileSync(abs, 'utf8');
    const titleLine = live.match(/^title:\s*(.+)$/m);
    if (!titleLine || !/\b2025\b/.test(titleLine[1])) return null;
    if (countOccurrences(live, '2025') !== 1) return null;
    return { phraseFrom: '2025', phraseTo: '2026' };
}

function buildAuditTickets(scored, flags, snapshot, root = ROOT_DIR) {
    const week = (snapshot && snapshot.week) || pickIsoWeek();
    const tickets = [];
    let n = 1;

    const seen = new Set();
    for (const flag of flags.filter((item) => item.autoApply && item.kind === 'dead-link')) {
        const key = `${flag.path}|${flag.hrefFrom}|${flag.hrefTo}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const page = scored.find((item) => item.path === flag.path);
        if (!page || !page.sourcePath) continue;
        tickets.push(makeTicket({
            kind: 'dead-link',
            lever: 'hygiene',
            autoApply: true,
            url: page.url,
            path: page.path,
            sourcePath: page.sourcePath,
            hrefFrom: flag.hrefFrom,
            hrefTo: flag.hrefTo,
            reason: flag.detail,
            gscBefore: page.gsc || null,
            gscSitewideBefore: snapshot ? snapshot.sitewide : null,
        }, n, week));
        n += 1;
    }

    const ctrLeaks = scored.filter((page) => (
        page.indexable
        && !page.sitelinkSuspect
        && page.opportunity.lever === 'ctr'
        && page.opportunity.score > 0
        && page.sourcePath
        && page.sourcePath.endsWith('.md')
    )).slice(0, 10);

    for (const page of ctrLeaks) {
        tickets.push(makeTicket({
            kind: 'seo-fields',
            lever: 'ctr',
            autoApply: false,
            url: page.url,
            path: page.path,
            sourcePath: page.sourcePath,
            beforeTitle: page.title,
            afterTitle: proposeTitle(page, page.primaryKeyword) || null,
            beforeDescription: page.description,
            afterDescription: proposeDescription(page, page.primaryKeyword) || null,
            reason: `CTR ${((page.gsc.ctr || 0) * 100).toFixed(2)}% vs expected ${((page.opportunity.expectedCtr || 0) * 100).toFixed(1)}% at position ${page.gsc.position}`,
            suggestedAction: 'Rewrite title/description to match the head query. Do not change body copy.',
            gscBefore: page.gsc,
            gscSitewideBefore: snapshot ? snapshot.sitewide : null,
        }, n, week));
        n += 1;
    }

    const htmlCtr = scored.filter((page) => (
        page.indexable
        && !page.sitelinkSuspect
        && page.opportunity.lever === 'ctr'
        && page.opportunity.score > 0
        && page.sourcePath
        && !page.sourcePath.endsWith('.md')
    )).slice(0, 5);
    for (const page of htmlCtr) {
        const toolsExport = String(page.sourcePath).replace(/\\/g, '/').startsWith('tools/');
        tickets.push(makeTicket({
            kind: 'content-push',
            lever: 'ctr',
            autoApply: false,
            url: page.url,
            path: page.path,
            sourcePath: page.sourcePath,
            reason: `CTR leak on a non-markdown surface (${page.sourcePath}).`,
            suggestedAction: toolsExport
                ? 'Edit the calcs2 repo. Do not patch tools/*.html as source of truth.'
                : 'Edit the JSON/HTML source of truth. apply-edit will not rewrite this surface.',
            gscBefore: page.gsc,
            gscSitewideBefore: snapshot ? snapshot.sitewide : null,
        }, n, week));
        n += 1;
    }

    const rankPages = scored.filter((page) => (
        page.indexable && page.opportunity.lever === 'rank' && page.opportunity.score > 0
    )).slice(0, 5);
    for (const page of rankPages) {
        tickets.push(makeTicket({
            kind: 'content-push',
            lever: 'rank',
            autoApply: false,
            url: page.url,
            path: page.path,
            sourcePath: page.sourcePath,
            reason: `Position ${page.gsc.position} with ${page.gsc.impressions} impressions. Title-only will not close this.`,
            suggestedAction: 'Human Edit only. Content push, not an Approve card.',
            gscBefore: page.gsc,
            gscSitewideBefore: snapshot ? snapshot.sitewide : null,
        }, n, week));
        n += 1;
    }

    const factFlags = flags.filter((item) => item.type === 'staleTaxYear' || item.type === 'bannedTerm');
    const seenFact = new Set();
    for (const flag of factFlags.slice(0, 8)) {
        const key = `${flag.path}|${flag.type}|${flag.detail}`;
        if (seenFact.has(key)) continue;
        seenFact.add(key);
        const page = scored.find((item) => item.path === flag.path) || {};
        const swap = flag.type === 'staleTaxYear' ? uniqueTitleYearSwap(page, root) : null;
        if (swap) {
            tickets.push(makeTicket({
                kind: 'phrase-swap',
                lever: 'hygiene',
                autoApply: false,
                url: page.url,
                path: flag.path,
                sourcePath: flag.sourcePath || page.sourcePath,
                phraseFrom: swap.phraseFrom,
                phraseTo: swap.phraseTo,
                reason: flag.detail,
                suggestedAction: 'Unique title-year token. Apply only if the year is the planning year, not a historical cite.',
                gscBefore: page.gsc || null,
                gscSitewideBefore: snapshot ? snapshot.sitewide : null,
            }, n, week));
        } else {
            tickets.push(makeTicket({
                kind: 'content-push',
                lever: 'hygiene',
                autoApply: false,
                url: page.url,
                path: flag.path,
                sourcePath: flag.sourcePath || page.sourcePath,
                reason: flag.detail,
                suggestedAction: 'Human Edit only. Quote the source pack; do not auto-rewrite YMYL body copy.',
                gscBefore: page.gsc || null,
                gscSitewideBefore: snapshot ? snapshot.sitewide : null,
            }, n, week));
        }
        n += 1;
    }

    return tickets;
}

function buildNearMissTickets(queries, root = ROOT_DIR) {
    const week = pickIsoWeek();
    const ownership = loadOwnership(root);
    const candidates = (queries || [])
        .filter((row) => row.nearMiss && isInClusterQuery(row.query) && !isBrandedQuery(row.query))
        .filter((row) => !findOwner(row.query, ownership))
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 1);

    return candidates.map((row, index) => makeTicket({
        kind: 'near-miss-draft',
        lever: 'generate',
        autoApply: false,
        targetQuery: row.query,
        impressions: row.impressions,
        position: row.position,
        clicks: row.clicks,
        reason: 'GSC near-miss with no canonical owner. Hand off to the existing writer pipeline. Cap 1/week.',
        suggestedAction: 'Run researcher → brief → writer → reviewer. Do not use seo-topics-1000.json.',
    }, index + 1, week));
}

function persistTickets(tickets, root = ROOT_DIR) {
    return tickets.map((ticket) => {
        let next = ticket;
        if (ticket.sourcePath) {
            const abs = path.join(root, ticket.sourcePath);
            if (fs.existsSync(abs)) next = { ...ticket, contentHash: sha256(fs.readFileSync(abs, 'utf8')) };
        }
        saveSuggestion(next, root);
        return next;
    });
}

module.exports = {
    buildAuditTickets,
    buildNearMissTickets,
    persistTickets,
    makeTicket,
    uniqueTitleYearSwap,
};
