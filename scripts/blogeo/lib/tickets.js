'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT_DIR } = require('./paths');
const { sha256 } = require('./hash');
const { saveSuggestion } = require('./apply-edit');
const { pickIsoWeek } = require('./opportunity');
const { loadOwnership, findOwner } = require('./ownership');
const { isBrandedQuery, isInClusterQuery } = require('./queries');

function pad(num) {
    return String(num).padStart(3, '0');
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

function buildAuditTickets(scored, flags, snapshot) {
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
            afterTitle: null,
            beforeDescription: page.description,
            afterDescription: null,
            reason: `CTR ${((page.gsc.ctr || 0) * 100).toFixed(2)}% vs expected ${((page.opportunity.expectedCtr || 0) * 100).toFixed(1)}% at position ${page.gsc.position}`,
            suggestedAction: 'Rewrite title/description to match the head query. Do not change body copy.',
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
    persistTickets: persistTickets,
    makeTicket,
};
