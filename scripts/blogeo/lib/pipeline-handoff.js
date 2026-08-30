'use strict';

const path = require('path');
const { ROOT_DIR } = require('./paths');
const { saveSuggestion } = require('./apply-edit');
const { pickIsoWeek } = require('./opportunity');

function shouldBlockDirectPublish() {
    return process.env.BLOGEO_ALLOW_DIRECT_PUBLISH !== '1';
}

function writePublishBlockedTicket({ draftPath, slug, reason, query }, root = ROOT_DIR) {
    const week = pickIsoWeek();
    const id = `be-${week.replace('-', '')}-pub-${Date.now().toString(36)}`;
    const rel = draftPath ? path.relative(root, draftPath).replace(/\\/g, '/') : '';
    const ticket = {
        id,
        status: 'open',
        kind: 'near-miss-draft',
        lever: 'generate',
        autoApply: false,
        sourcePath: rel,
        path: slug ? `/blog/${slug}` : null,
        targetQuery: query || null,
        reason: reason || 'Pipeline --publish was blocked. Human must copy the draft after review.',
        suggestedAction: 'Review the draft, then copy to content/blog on a branch. Do not set BLOGEO_ALLOW_DIRECT_PUBLISH=1 from an agent.',
        createdAt: new Date().toISOString(),
        week,
    };
    saveSuggestion(ticket, root);
    return ticket;
}

module.exports = { writePublishBlockedTicket, shouldBlockDirectPublish };
