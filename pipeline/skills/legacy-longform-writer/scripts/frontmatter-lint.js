#!/usr/bin/env node

const fs = require('fs');
const matter = require('gray-matter');

const required = ['title', 'description', 'date', 'author', 'category', 'image'];

function usage() {
    console.log('Usage: node frontmatter-lint.js <draft.md>');
}

const file = process.argv[2];
if (!file) {
    usage();
    process.exit(1);
}

const parsed = matter(fs.readFileSync(file, 'utf8'));
const missing = required.filter((k) => !parsed.data[k]);

if (missing.length) {
    console.error('Missing frontmatter keys:');
    missing.forEach((k) => console.error(`- ${k}`));
    process.exit(1);
}

console.log('Frontmatter lint passed.');
