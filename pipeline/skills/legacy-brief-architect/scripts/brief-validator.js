#!/usr/bin/env node

const fs = require('fs');

const requiredHeadings = [
    '## Topic Summary',
    '## Reader Profile',
    '## Section Plan',
    '## Acceptance Criteria'
];

function usage() {
    console.log('Usage: node brief-validator.js <brief.md>');
}

const file = process.argv[2];
if (!file) {
    usage();
    process.exit(1);
}

const text = fs.readFileSync(file, 'utf8');
const missing = requiredHeadings.filter((h) => !text.includes(h));

if (missing.length > 0) {
    console.error('Missing required sections:');
    missing.forEach((item) => console.error(`- ${item}`));
    process.exit(1);
}

console.log('Brief validation passed.');
