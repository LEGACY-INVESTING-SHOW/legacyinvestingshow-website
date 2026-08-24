'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT_DIR } = require('./paths');
const { sha256 } = require('./hash');
const { acquireLock, releaseLock } = require('./lock');
const { patchFrontmatter } = require('./frontmatter');
const { writeJson } = require('./fs');

function suggestionsDir(root) {
    return path.join(root, 'data', 'blogeo', 'suggestions');
}

function editsDir(root) {
    return path.join(root, 'data', 'blogeo', 'edits');
}

function loadSuggestion(ticketId, root = ROOT_DIR) {
    const filePath = path.join(suggestionsDir(root), `${ticketId}.json`);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveSuggestion(ticket, root = ROOT_DIR) {
    const filePath = path.join(suggestionsDir(root), `${ticket.id}.json`);
    writeJson(filePath, ticket);
    return filePath;
}

function countOccurrences(haystack, needle) {
    if (!needle) return 0;
    return haystack.split(needle).length - 1;
}

function applyEdit(ticketId, actor = 'cli', root = ROOT_DIR) {
    const ticket = loadSuggestion(ticketId, root);
    if (!ticket) throw new Error(`unknown ticket: ${ticketId}`);
    if (['applied', 'skipped'].includes(ticket.status)) throw new Error(`ticket already ${ticket.status}`);
    if (!acquireLock(ticketId, actor, root)) throw new Error('already handled');

    try {
        const absPath = path.join(root, ticket.sourcePath);
        if (!fs.existsSync(absPath)) throw new Error(`source missing: ${ticket.sourcePath}`);
        const live = fs.readFileSync(absPath, 'utf8');
        const hash = sha256(live);
        if (ticket.contentHash && hash !== ticket.contentHash) {
            throw new Error('source changed since suggestion; refusing to clobber');
        }

        let next = live;
        if ((ticket.kind === 'seo-fields' || ticket.kind === 'seo-fields')) {
            if (ticket.beforeTitle && !live.includes(ticket.beforeTitle)) {
                throw new Error('beforeTitle not found in source');
            }
            next = patchFrontmatter(live, {
                title: ticket.afterTitle || undefined,
                description: ticket.afterDescription || undefined,
            });
        } else if ((ticket.kind === 'phrase-swap' || ticket.kind === 'phrase-swap')) {
            if (countOccurrences(live, ticket.phraseFrom) !== 1) {
                throw new Error('phrase not unique; human Edit required');
            }
            next = live.replace(ticket.phraseFrom, ticket.phraseTo);
        } else if ((ticket.kind === 'dead-link' || ticket.kind === 'dead-link')) {
            if (countOccurrences(live, ticket.hrefFrom) < 1) throw new Error('hrefFrom not found');
            next = live.split(ticket.hrefFrom).join(ticket.hrefTo);
        } else {
            throw new Error(`unsupported kind: ${ticket.kind}`);
        }

        fs.writeFileSync(absPath, next);
        const edit = {
            id: ticket.id,
            ticketId: ticket.id,
            url: ticket.url || ticket.path,
            path: ticket.path,
            kind: ticket.kind,
            lever: ticket.lever || 'hygiene',
            sourcePath: ticket.sourcePath,
            actor,
            appliedAt: new Date().toISOString(),
            contentHashBefore: hash,
            contentHashAfter: sha256(next),
            gscBefore: ticket.gscBefore || null,
            gscSitewideBefore: ticket.gscSitewideBefore || null,
            status: 'applied',
        };
        writeJson(path.join(editsDir(root), `${ticket.id}.json`), edit);
        ticket.status = 'applied';
        ticket.appliedAt = edit.appliedAt;
        ticket.appliedBy = actor;
        saveSuggestion(ticket, root);
        return edit;
    } catch (error) {
        releaseLock(ticketId, root);
        throw error;
    }
}

function skipTicket(ticketId, actor = 'cli', root = ROOT_DIR) {
    const ticket = loadSuggestion(ticketId, root);
    if (!ticket) throw new Error(`unknown ticket: ${ticketId}`);
    if (!acquireLock(ticketId, actor, root)) throw new Error('already handled');
    ticket.status = 'skipped';
    ticket.skippedAt = new Date().toISOString();
    ticket.skippedBy = actor;
    saveSuggestion(ticket, root);
    return ticket;
}

module.exports = {
    loadSuggestion,
    saveSuggestion,
    saveSuggestion: saveSuggestion,
    applyEdit,
    skipTicket,
    countOccurrences,
};
