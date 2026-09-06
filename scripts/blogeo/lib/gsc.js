'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT_DIR } = require('./paths');
const { writeJson } = require('./fs');
const { readCsv, parseNumber } = require('./csv');
const { normalizePath } = require('./urls');
const { pickIsoWeek } = require('./opportunity');

function findCsv(dir, names) {
    const files = fs.readdirSync(dir);
    for (const name of names) {
        const match = files.find((file) => file.toLowerCase() === name.toLowerCase());
        if (match) return path.join(dir, match);
    }
    return null;
}

function mapRows(rows, keyName) {
    return rows.map((row) => ({
        key: row[keyName] || row['Top pages'] || row['Top queries'] || row.Date || '',
        clicks: parseNumber(row.Clicks),
        impressions: parseNumber(row.Impressions),
        ctr: parseNumber(row.CTR),
        position: parseNumber(row.Position),
    })).filter((row) => row.key);
}

function ingestGscCsv(dir, root = ROOT_DIR) {
    if (!dir || !fs.existsSync(dir)) throw new Error(`GSC import directory not found: ${dir}`);

    const filtersPath = findCsv(dir, ['Filters.csv']);
    const pagesPath = findCsv(dir, ['Pages.csv']);
    const queriesPath = findCsv(dir, ['Queries.csv']);
    const chartPath = findCsv(dir, ['Chart.csv']);
    const filters = {};
    if (filtersPath) {
        for (const row of readCsv(filtersPath)) {
            if (row.Filter || row.filter) filters[row.Filter || row.filter] = row.Value || row.value;
        }
    }

    const pages = pagesPath ? mapRows(readCsv(pagesPath), 'Top pages').map((row) => ({
        url: row.key,
        path: normalizePath(row.key),
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
    })) : [];
    const queries = queriesPath ? mapRows(readCsv(queriesPath), 'Top queries').map((row) => ({
        query: row.key,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
    })) : [];
    const chart = chartPath ? mapRows(readCsv(chartPath), 'Date').map((row) => ({
        date: row.key,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
    })) : [];

    const sitewide = chart.reduce((acc, day) => {
        acc.clicks += day.clicks;
        acc.impressions += day.impressions;
        return acc;
    }, { clicks: 0, impressions: 0 });
    if (chart.length > 0) {
        sitewide.ctr = sitewide.impressions ? sitewide.clicks / sitewide.impressions : 0;
        sitewide.position = chart.reduce((sum, day) => sum + (day.position * day.impressions), 0)
            / (sitewide.impressions || 1);
        sitewide.startDate = chart[0].date;
        sitewide.endDate = chart[chart.length - 1].date;
    }

    const snapshot = {
        ingestedAt: new Date().toISOString(),
        sourceDir: path.relative(root, dir).replace(/\\/g, '/'),
        week: pickIsoWeek(),
        filters,
        windowNote: filters.Date || filters.date || 'unknown GSC window',
        comparable28d: false,
        sitewide,
        pages,
        queries,
        chart,
    };
    const stamp = (sitewide.endDate || pickIsoWeek()).replace(/[^0-9A-Za-z-]/g, '');
    writeJson(path.join(root, 'data', 'blogeo', 'gsc', 'snapshots', `${stamp}.json`), snapshot);
    writeJson(path.join(root, 'data', 'blogeo', 'gsc', 'latest.json'), snapshot);
    return snapshot;
}

function loadLatestGsc(root = ROOT_DIR) {
    const latestPath = path.join(root, 'data', 'blogeo', 'gsc', 'latest.json');
    return fs.existsSync(latestPath) ? JSON.parse(fs.readFileSync(latestPath, 'utf8')) : null;
}

function previousSnapshot(root = ROOT_DIR, current) {
    const dir = path.join(root, 'data', 'blogeo', 'gsc', 'snapshots');
    if (!fs.existsSync(dir)) return null;
    const files = fs.readdirSync(dir).filter((name) => name.endsWith('.json')).sort();
    if (files.length < 2) return null;
    const snapshot = JSON.parse(fs.readFileSync(path.join(dir, files[files.length - 2]), 'utf8'));
    if (current && snapshot.ingestedAt === current.ingestedAt) return null;
    return snapshot;
}

module.exports = {
    ingestGscCsv,
    ingestGscCsv: ingestGscCsv,
    loadLatestGsc,
    loadLatestGsc: loadLatestGsc,
    previousSnapshot,
    findCsv,
};
