#!/usr/bin/env node

const fs = require('fs');

function usage() {
    console.log('Usage: node source-extractor.js <search-results.json> <sources.md>');
}

const input = process.argv[2];
const output = process.argv[3];

if (!input || !output) {
    usage();
    process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(input, 'utf8'));
const rows = payload.results || [];

let md = '# Sources\n\n';
for (const row of rows) {
    md += `- [${row.title || 'Untitled'}](${row.url || '#'})\n`;
}

fs.writeFileSync(output, md, 'utf8');
console.log(`Wrote ${rows.length} sources to ${output}`);
