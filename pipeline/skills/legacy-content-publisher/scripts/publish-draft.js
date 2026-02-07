#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function usage() {
    console.log('Usage: node publish-draft.js <draft.md> <slug> <content-blog-dir>');
}

const draftFile = process.argv[2];
const slug = process.argv[3];
const targetDir = process.argv[4];

if (!draftFile || !slug || !targetDir) {
    usage();
    process.exit(1);
}

const target = path.join(targetDir, `${slug}.md`);

if (fs.existsSync(target)) {
    console.error(`Target exists: ${target}`);
    process.exit(1);
}

fs.copyFileSync(draftFile, target);
console.log(`Published: ${target}`);
