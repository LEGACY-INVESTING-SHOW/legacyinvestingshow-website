#!/usr/bin/env node

const fs = require('fs');

function usage() {
    console.log('Usage: node rubric-score.js <review.json>');
}

const file = process.argv[2];
if (!file) {
    usage();
    process.exit(1);
}

const report = JSON.parse(fs.readFileSync(file, 'utf8'));

if (report.pass) {
    console.log(`PASS (${report.score}/100)`);
    process.exit(0);
}

console.error(`FAIL (${report.score}/100)`);
process.exit(1);
