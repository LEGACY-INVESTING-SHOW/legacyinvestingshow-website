'use strict';

const path = require('path');
const { ROOT_DIR } = require('./paths');
const { writeJson, readJson } = require('./fs');
const { loadLatestGsc } = require('./gsc');
const { loadOwnership, findOwner } = require('./ownership');
const { nearMissQueries } = require('./score');
const { buildNearMissTickets, persistTickets, makeTicket } = require('./tickets');
const { pickIsoWeek } = require('./opportunity');
const { isBrandedQuery, isInClusterQuery, normalizeQuery } = require('./queries');

function capPath(week, root) {
    return path.join(root, 'data', 'blogeo', 'generated', `${week}.json`);
}

function enrollGeneratedPost(ticket, snapshot, root) {
    if (!ticket) return null;
    const week = snapshot.week || pickIsoWeek();
    const record = {
        week,
        ticketId: ticket.id,
        targetQuery: ticket.targetQuery,
        enrolledAt: new Date().toISOString(),
        path: ticket.path || null,
        url: ticket.url || null,
        gscDay0: { clicks: 0, impressions: 0, position: 0, ctr: 0 },
        sitewideDay0: snapshot.sitewide || null,
        gsc28d: null,
        gsc56d: null,
    };
    writeJson(path.join(root, 'data', 'blogeo', 'generated-posts', `${week}.json`), record);
    return record;
}

function loadCap(week, root) {
    return readJson(capPath(week, root), null);
}

function capUsed(existing) {
    return Boolean(existing && existing.count > 0);
}

function writeCap(payload, root) {
    writeJson(capPath(payload.week, root), payload);
    return payload;
}

function requestTicketId(week, query, suffix) {
    const slug = normalizeQuery(query).replace(/\s+/g, '-').slice(0, 40) || 'query';
    return `be-${week.replace('-', '')}-${suffix}-${slug}`;
}

function auditOwnedQuery(query, owner, week, root) {
    const tickets = persistTickets([makeTicket({
        id: requestTicketId(week, query, 'owned'),
        kind: 'content-push',
        lever: 'rank',
        autoApply: false,
        targetQuery: query,
        path: owner.canonical,
        url: owner.canonical,
        reason: `Query already owned by ${owner.canonical}. Do not draft a second URL.`,
        suggestedAction: 'Audit the owner. Refresh title, Quick Take, or FAQ. Do not generate a new post.',
    }, 1, week)], root);
    return {
        week,
        generatedAt: new Date().toISOString(),
        count: 0,
        tickets,
        cap: 1,
        enrolled: null,
        skipped: false,
        owner: owner.canonical,
        reason: `Query owned by ${owner.canonical}; wrote an audit ticket instead of a draft.`,
        pipelineHandoff: null,
    };
}

function generateNearMiss(root = ROOT_DIR, options = {}) {
    const requestedQuery = options.query ? String(options.query).trim() : '';
    const snapshot = loadLatestGsc(root);
    if (!snapshot && !requestedQuery) {
        return { tickets: [], count: 0, reason: 'No GSC snapshot. Run ingest first.' };
    }
    const week = (snapshot && snapshot.week) || pickIsoWeek();
    const existing = loadCap(week, root);
    const ownership = loadOwnership(root);

    if (requestedQuery) {
        if (isBrandedQuery(requestedQuery)) {
            return {
                week,
                count: 0,
                tickets: [],
                cap: 1,
                skipped: false,
                reason: 'Branded query. Do not generate a new post; use the brand URL.',
            };
        }
        if (!isInClusterQuery(requestedQuery)) {
            return {
                week,
                count: 0,
                tickets: [],
                cap: 1,
                skipped: false,
                reason: 'Query is outside the allowed cluster. Refuse.',
            };
        }
        const owner = findOwner(requestedQuery, ownership);
        if (owner && owner.canonical) {
            return auditOwnedQuery(requestedQuery, owner, week, root);
        }
        if (capUsed(existing)) {
            return { ...existing, skipped: true, reason: 'Weekly generate cap already used.' };
        }
        const tickets = persistTickets([makeTicket({
            id: requestTicketId(week, requestedQuery, 'req'),
            kind: 'near-miss-draft',
            lever: 'generate',
            autoApply: false,
            targetQuery: requestedQuery,
            impressions: null,
            position: null,
            clicks: null,
            reason: 'Human-requested query with no canonical owner. Cap 1/week. Hand off to the existing writer pipeline.',
            suggestedAction: 'Run researcher → brief → writer → reviewer. Do not use seo-topics-1000.json.',
        }, 1, week)], root);
        const enrolled = tickets[0] && snapshot ? enrollGeneratedPost(tickets[0], snapshot, root) : null;
        return writeCap({
            week,
            generatedAt: new Date().toISOString(),
            count: tickets.length,
            tickets,
            cap: 1,
            enrolled,
            pipelineHandoff: tickets.length
                ? 'Run researcher → brief → writer → reviewer. Do not use seo-topics-1000.json. Do not --publish unless BLOGEO_ALLOW_DIRECT_PUBLISH=1.'
                : null,
        }, root);
    }

    if (!snapshot) return { tickets: [], count: 0, reason: 'No GSC snapshot. Run ingest first.' };
    if (capUsed(existing)) {
        return { ...existing, skipped: true, reason: 'Weekly generate cap already used.' };
    }
    const queries = nearMissQueries(snapshot, ownership);
    const tickets = persistTickets(buildNearMissTickets(queries, root), root);
    const enrolled = tickets[0] ? enrollGeneratedPost(tickets[0], snapshot, root) : null;
    return writeCap({
        week,
        generatedAt: new Date().toISOString(),
        count: tickets.length,
        tickets,
        cap: 1,
        enrolled,
        pipelineHandoff: tickets.length
            ? 'Run researcher → brief → writer → reviewer. Do not use seo-topics-1000.json. Do not --publish unless BLOGEO_ALLOW_DIRECT_PUBLISH=1.'
            : null,
    }, root);
}

module.exports = { generateNearMiss, enrollGeneratedPost };
