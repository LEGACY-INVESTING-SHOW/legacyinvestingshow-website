'use strict';

const path = require('path');
const { ROOT_DIR } = require('./paths');
const { listFiles, readJson, writeJson } = require('./fs');
const { loadLatestGsc } = require('./gsc');
const { gscByPath } = require('./score');
const { normalizePath } = require('./urls');

function daysBetween(isoDate, appliedAt) {
    if (!isoDate || !appliedAt) return null;
    const a = new Date(appliedAt);
    const b = new Date(`${isoDate}T00:00:00Z`);
    return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

function fillWindows(root = ROOT_DIR) {
    const snapshot = loadLatestGsc(root);
    if (!snapshot) return { filled: 0, reason: 'No GSC snapshot' };
    const gscMap = gscByPath(snapshot);
    const files = listFiles(path.join(root, 'data', 'blogeo', 'edits'), (name) => name.endsWith('.json'));
    let filled = 0;
    for (const filePath of files) {
        const edit = readJson(filePath);
        if (!edit || !edit.appliedAt) continue;
        const endDate = snapshot.sitewide && snapshot.sitewide.endDate;
        const age = daysBetween(endDate, edit.appliedAt);
        if (age == null) continue;
        const urlPath = edit.path || (edit.url ? normalizePath(edit.url) : null);
        const current = urlPath ? gscMap.get(urlPath) : null;
        const point = current ? {
            clicks: current.clicks,
            impressions: current.impressions,
            position: current.position,
            ctr: current.ctr,
            asOf: endDate,
            window: snapshot.windowNote,
        } : null;
        let changed = false;
        if (age >= 28 && !edit.gsc28d && point) {
            edit.gsc28d = point;
            edit.sitewide28d = snapshot.sitewide;
            changed = true;
        }
        if (age >= 56 && !edit.gsc56d && point) {
            edit.gsc56d = point;
            edit.sitewide56d = snapshot.sitewide;
            changed = true;
        }
        if (changed) {
            writeJson(filePath, edit);
            filled += 1;
        }
    }
    return { filled, checked: files.length, window: snapshot.windowNote };
}

module.exports = { fillWindows, fillWindows: fillWindows, daysBetween };
