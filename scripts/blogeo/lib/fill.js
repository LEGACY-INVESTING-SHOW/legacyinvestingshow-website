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

function snapshotPoint(snapshot, gscMap, urlPath) {
    const endDate = snapshot.sitewide && snapshot.sitewide.endDate;
    const current = urlPath ? gscMap.get(urlPath) : null;
    if (!current) return null;
    return {
        clicks: current.clicks,
        impressions: current.impressions,
        position: current.position,
        ctr: current.ctr,
        asOf: endDate,
        window: snapshot.windowNote,
    };
}

function fillRecord(record, snapshot, point, age, startKey) {
    let changed = false;
    if (age >= 28 && !record.gsc28d && point) {
        record.gsc28d = point;
        record.sitewide28d = snapshot.sitewide;
        changed = true;
    }
    if (age >= 56 && !record.gsc56d && point) {
        record.gsc56d = point;
        record.sitewide56d = snapshot.sitewide;
        changed = true;
    }
    if (!record[startKey] && snapshot.sitewide) {
        record[startKey] = snapshot.sitewide;
        changed = true;
    }
    return changed;
}

function fillWindows(root = ROOT_DIR) {
    const snapshot = loadLatestGsc(root);
    if (!snapshot) return { filled: 0, reason: 'No GSC snapshot' };
    const gscMap = gscByPath(snapshot);
    const endDate = snapshot.sitewide && snapshot.sitewide.endDate;
    let filled = 0;
    let checked = 0;

    const editFiles = listFiles(path.join(root, 'data', 'blogeo', 'edits'), (name) => name.endsWith('.json'));
    for (const filePath of editFiles) {
        checked += 1;
        const edit = readJson(filePath);
        if (!edit || !edit.appliedAt) continue;
        const age = daysBetween(endDate, edit.appliedAt);
        if (age == null) continue;
        const urlPath = edit.path || (edit.url ? normalizePath(edit.url) : null);
        const point = snapshotPoint(snapshot, gscMap, urlPath);
        if (fillRecord(edit, snapshot, point, age, 'sitewideDay0')) {
            writeJson(filePath, edit);
            filled += 1;
        }
    }

    const genFiles = listFiles(path.join(root, 'data', 'blogeo', 'generated-posts'), (name) => name.endsWith('.json'));
    for (const filePath of genFiles) {
        checked += 1;
        const post = readJson(filePath);
        if (!post || !post.enrolledAt) continue;
        const age = daysBetween(endDate, post.enrolledAt);
        if (age == null) continue;
        const urlPath = post.path || (post.url ? normalizePath(post.url) : null);
        const point = snapshotPoint(snapshot, gscMap, urlPath);
        if (fillRecord(post, snapshot, point, age, 'sitewideDay0')) {
            writeJson(filePath, post);
            filled += 1;
        }
    }

    return { filled, checked, window: snapshot.windowNote };
}

module.exports = { fillWindows, fillWindows: fillWindows, daysBetween };
