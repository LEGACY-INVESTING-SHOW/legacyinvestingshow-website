'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT_DIR } = require('./paths');
const { writeJson, ensureDir } = require('./fs');
const { readCsv, parseNumber } = require('./csv');
const { normalizePath } = require('./urls');

function findAeoFiles(dir) {
    if (!dir || !fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
        .filter((name) => name.toLowerCase().endsWith('.csv'))
        .map((name) => path.join(dir, name));
}

function parseAeoRow(row) {
    const url = row.url || row.URL || row.page || row.Page || row.cited_url || '';
    const engine = row.engine || row.Engine || row.source || row.Source || row.platform || 'unknown';
    const cited = row.cited || row.Cited || row.citations || row.Citations || row.count || '0';
    const query = row.query || row.Query || row.prompt || '';
    return {
        url,
        path: url ? normalizePath(url) : '',
        engine: String(engine).toLowerCase(),
        cited: parseNumber(cited) || (String(cited).toLowerCase() === 'true' ? 1 : 0),
        query,
    };
}

function ingestAeoCsv(dir, root = ROOT_DIR) {
    const files = findAeoFiles(dir);
    const rows = [];
    for (const filePath of files) {
        for (const row of readCsv(filePath)) {
            const parsed = parseAeoRow(row);
            if (parsed.path || parsed.query) rows.push(parsed);
        }
    }
    const byPath = {};
    for (const row of rows) {
        if (!row.path) continue;
        if (!byPath[row.path]) byPath[row.path] = { path: row.path, citations: 0, engines: {} };
        byPath[row.path].citations += row.cited;
        byPath[row.path].engines[row.engine] = (byPath[row.path].engines[row.engine] || 0) + row.cited;
    }
    const snapshot = {
        ingestedAt: new Date().toISOString(),
        sourceDir: path.relative(root, dir).replace(/\\/g, '/'),
        rowCount: rows.length,
        citedUrlCount: Object.keys(byPath).length,
        rows,
        byPath,
    };
    const outDir = path.join(root, 'data', 'blogeo', 'aeo');
    ensureDir(outDir);
    writeJson(path.join(outDir, 'latest.json'), snapshot);
    return snapshot;
}

module.exports = {
    parseAeoRow,
    ingestAeoCsv,
    findAeoFiles,
};
