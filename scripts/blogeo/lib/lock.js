'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT_DIR } = require('./paths');
const { ensureDir } = require('./fs');

function lockPath(ticketId, root = ROOT_DIR) {
    return path.join(root, 'data', 'blogeo', 'locks', `${ticketId}.json`);
}

function acquireLock(ticketId, actor, root = ROOT_DIR) {
    const filePath = lockPath(ticketId, root);
    ensureDir(path.dirname(filePath));
    try {
        fs.writeFileSync(filePath, `${JSON.stringify({ ticketId, actor, lockedAt: new Date().toISOString() }, null, 2)}\n`, { flag: 'wx' });
        return true;
    } catch (error) {
        if (error.code === 'EEXIST') return false;
        throw error;
    }
}

function releaseLock(ticketId, root = ROOT_DIR) {
    const filePath = lockPath(ticketId, root);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

module.exports = { acquireLock, releaseLock, lockPath };
