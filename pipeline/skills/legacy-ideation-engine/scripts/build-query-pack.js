#!/usr/bin/env node

const fs = require('fs');

function usage() {
    console.log('Usage: node build-query-pack.js <seed-file.txt> <out-file.txt>');
}

const seedFile = process.argv[2];
const outFile = process.argv[3];

if (!seedFile || !outFile) {
    usage();
    process.exit(1);
}

const suffixes = [
    '2026',
    'for beginners',
    'mistakes',
    'vs alternatives',
    'reddit',
    'youtube',
    'faq',
    'checklist'
];

const seeds = fs.readFileSync(seedFile, 'utf8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
const queries = [];

for (const seed of seeds) {
    for (const suffix of suffixes) {
        queries.push(`${seed} ${suffix}`);
    }
}

fs.writeFileSync(outFile, [...new Set(queries)].join('\n') + '\n', 'utf8');
console.log(`Wrote ${queries.length} expanded queries to ${outFile}`);
