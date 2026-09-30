#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const ROOT_DIR = path.join(__dirname, '..');
const SOURCE_FILE = path.join(ROOT_DIR, 'content', 'legal', 'terms.md');
const TEMPLATE_FILE = path.join(ROOT_DIR, 'templates', 'legal-terms.html');
const IMAGE_FILE = path.join(ROOT_DIR, 'assets', 'images', 'legal', 'privacy-policy-data-subjects.avif');

try {
    for (const file of [SOURCE_FILE, TEMPLATE_FILE, IMAGE_FILE]) {
        if (!fs.existsSync(file)) {
            throw new Error(`Missing legal page input: ${file}`);
        }
    }
    const template = fs.readFileSync(TEMPLATE_FILE, 'utf8');
    if (!template.includes('{{LEGAL_CONTENT}}')) {
        throw new Error(`Missing legal content placeholder: ${TEMPLATE_FILE}`);
    }
    const content = marked.parse(fs.readFileSync(SOURCE_FILE, 'utf8'))
        .replace('<h1>', '<h1 class="opener__title">');
    fs.writeFileSync(path.join(ROOT_DIR, 'terms.html'), template.replace('{{LEGAL_CONTENT}}', content));
    console.log('Built terms.html from content/legal/terms.md');
} catch (error) {
    console.error(`Unable to build legal page: ${error.message}`);
    process.exit(1);
}
