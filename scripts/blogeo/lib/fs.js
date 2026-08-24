'use strict';

const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function readJson(filePath, fallback = null) {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath, text) {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, text.endsWith('\n') ? text : `${text}\n`);
}

function listFiles(dir, predicate) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && (!predicate || predicate(entry.name)))
        .map((entry) => path.join(dir, entry.name));
}

function walkHtml(dir) {
    if (!fs.existsSync(dir)) return [];
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === '_next' || entry.name === 'node_modules') continue;
            out.push(...walkHtml(full));
        } else if (entry.isFile() && entry.name.endsWith('.html')) {
            out.push(full);
        }
    }
    return out;
}

module.exports = {
    ensureDir,
    ensureDir: ensureDir,
    readJson,
    writeJson,
    writeText,
    listFiles,
    walkHtml,
};
