'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT_DIR } = require('./paths');
const { sha256 } = require('./hash');
const { acquireLock, releaseLock } = require('./lock');
const { patchFrontmatter } = require('./frontmatter');
const { writeJson, listFiles, readJson } = require('./fs');
const { findOwner, loadOwnership } = require('./ownership');

const COOLDOWN_DAYS = 28;

function suggestionsDir(root) {
    return path.join(root, 'data', 'blogeo', 'suggestions');
}

function editsDir(root) {
    return path.join(root, 'data', 'blogeo', 'edits');
}

function pick(ticket, keys) {
    for (const key of keys) {
        if (ticket[key] != null && ticket[key] !== '') return ticket[key];
    }
    return undefined;
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

function inCooldown(sourcePath, root) {
    const dir = editsDir(root);
    const files = listFiles(dir, (name) => name.endsWith('.json'));
    const now = Date.now();
    for (const filePath of files) {
        const edit = readJson(filePath);
        if (!edit || edit.sourcePath !== sourcePath) continue;
        if (edit.cooldownUntil && Date.parse(edit.cooldownUntil) > now) return edit;
    }
    return null;
}

function refuseCannibalization(ticket, root) {
    const query = pick(ticket, ['targetQuery', 'query']);
    const pagePath = pick(ticket, ['path']);
    if (!query) return;
    const owner = findOwner(query, loadOwnership(root));
    if (owner && owner.canonical && pagePath && owner.canonical !== pagePath) {
        throw new Error(`query owned by ${owner.canonical}; refusing cannibalization`);
    }
}

function applyEdit(ticketId, actor = 'cli', root = ROOT_DIR) {
    const ticket = loadSuggestion(ticketId, root);
    if (!ticket) throw new Error(`unknown ticket: ${ticketId}`);
    if (['applied', 'skipped'].includes(ticket.status)) throw new Error(`ticket already ${ticket.status}`);
    if (!acquireLock(ticketId, actor, root)) throw new Error('already handled');

    try {
        const sourcePath = pick(ticket, ['sourcePath']);
        const kind = pick(ticket, ['kind']);
        if (!sourcePath) throw new Error('ticket missing sourcePath');
        if (String(sourcePath).replace(/\\/g, '/').startsWith('tools/')) {
            throw new Error('tools/*.html is a calcs2 export; refusing to patch HTML as source of truth');
        }
        refuseCannibalization(ticket, root);

        const absPath = path.join(root, sourcePath);
        if (!fs.existsSync(absPath)) throw new Error(`source missing: ${sourcePath}`);
        const live = fs.readFileSync(absPath, 'utf8');
        const hash = sha256(live);
        const expectedHash = pick(ticket, ['contentHash']);
        if (expectedHash && hash !== expectedHash) {
            throw new Error('source changed since suggestion; refusing to clobber');
        }

        const cooled = inCooldown(sourcePath, root);
        if (cooled) throw new Error(`source in cooldown until ${cooled.cooldownUntil}`);

        let next = live;
        if (kind === 'seo-fields') {
            const beforeTitle = pick(ticket, ['beforeTitle']);
            if (beforeTitle && !live.includes(beforeTitle)) {
                throw new Error('beforeTitle not found in source');
            }
            next = patchFrontmatter(live, {
                title: pick(ticket, ['afterTitle']) || undefined,
                description: pick(ticket, ['afterDescription']) || undefined,
            });
        } else if (kind === 'phrase-swap') {
            const from = pick(ticket, ['phraseFrom']);
            const to = pick(ticket, ['phraseTo']);
            if (countOccurrences(live, from) !== 1) {
                throw new Error('phrase not unique; human Edit required');
            }
            next = live.replace(from, to);
        } else if (kind === 'dead-link') {
            const from = pick(ticket, ['hrefFrom']);
            const to = pick(ticket, ['hrefTo']);
            if (countOccurrences(live, from) < 1) throw new Error('hrefFrom not found');
            next = live.split(from).join(to);
        } else if (kind === 'near-miss-draft' || kind === 'content-push') {
            throw new Error('this ticket is Edit-only; apply-edit will not write a new URL or body rewrite');
        } else {
            throw new Error(`unsupported kind: ${kind}`);
        }

        fs.writeFileSync(absPath, next);
        const cooldownUntil = new Date(Date.now() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString();
        const edit = {
            id: ticket.id,
            ticketId: ticket.id,
            url: ticket.url || ticket.path,
            path: ticket.path,
            kind,
            lever: ticket.lever || 'hygiene',
            sourcePath,
            actor,
            appliedAt: new Date().toISOString(),
            cooldownUntil,
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
        ticket.cooldownUntil = cooldownUntil;
        saveSuggestion(ticket, root);
        return edit;
    } catch (error) {
        releaseLock(ticketId, root);
        throw error;
    }
}

function listAutoApplyTickets(root = ROOT_DIR) {
    const dir = suggestionsDir(root);
    const files = listFiles(dir, (name) => name.endsWith('.json'));
    const tickets = [];
    for (const filePath of files) {
        const ticket = readJson(filePath);
        if (!ticket || ticket.status !== 'open') continue;
        if (ticket.autoApply !== true) continue;
        if (ticket.kind !== 'dead-link') continue;
        tickets.push(ticket);
    }
    return tickets.sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

function applyAutoTickets(actor = 'cli', root = ROOT_DIR) {
    const tickets = listAutoApplyTickets(root);
    const applied = [];
    const failed = [];
    for (const ticket of tickets) {
        try {
            applied.push(applyEdit(ticket.id, actor, root));
        } catch (error) {
            failed.push({ id: ticket.id, error: error.message });
        }
    }
    return { applied, failed, considered: tickets.length };
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
    applyEdit,
    skipTicket,
    applyAutoTickets,
    listAutoApplyTickets,
    countOccurrences,
    COOLDOWN_DAYS,
    refuseCannibalization,
};
