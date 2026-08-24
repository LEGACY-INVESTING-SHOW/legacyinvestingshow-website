'use strict';

const fs = require('fs');

function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    const source = String(text || '').replace(/^\uFEFF/, '');

    const pushField = () => {
        row.push(field);
        field = '';
    };
    const pushRow = () => {
        if (!(row.length === 1 && row[0] === '')) rows.push(row);
        row = [];
    };

    for (let i = 0; i < source.length; i += 1) {
        const ch = source[i];
        const next = source[i + 1];
        if (inQuotes) {
            if (ch === '"' && next === '"') {
                field += '"';
                i += 1;
            } else if (ch === '"') inQuotes = false;
            else field += ch;
            continue;
        }
        if (ch === '"') inQuotes = true;
        else if (ch === ',') pushField();
        else if (ch === '\n') {
            pushField();
            pushRow();
        } else if (ch !== '\r') field += ch;
    }
    if (field.length > 0 || row.length > 0) {
        pushField();
        pushRow();
    }
    return rows;
}

function csvToObjects(text) {
    const rows = parseCsv(text);
    if (rows.length === 0) return [];
    const headers = rows[0].map((header) => String(header || '').trim());
    return rows.slice(1)
        .filter((row) => row.some((cell) => String(cell || '').trim() !== ''))
        .map((row) => {
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = row[index] == null ? '' : String(row[index]).trim();
            });
            return obj;
        });
}

function readCsv(filePath) {
    return csvToObjects(fs.readFileSync(filePath, 'utf8'));
}

function parseNumber(value) {
    if (value == null || value === '') return 0;
    const raw = String(value).trim();
    if (raw.endsWith('%')) return Number(raw.replace(/%/g, '').replace(/,/g, '')) / 100;
    return Number(raw.replace(/,/g, '')) || 0;
}

module.exports = { parseCsv, csvToObjects, readCsv, parseNumber };
