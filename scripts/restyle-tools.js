#!/usr/bin/env node
'use strict';

/**
 * Restyle imported /tools pages so they share the Legacy Investing Show
 * header, footer, type, and palette. First-party calculator templates
 * already emit that chrome; this pass is idempotent for those files.
 */

const fs = require('fs');
const path = require('path');
const {
    restyleToolsHtml,
    renderShellRuntimeScript,
} = require('./lib/tools-shell');

const ROOT_DIR = path.join(__dirname, '..');
const TOOLS_DIR = path.join(ROOT_DIR, 'tools');
const SHELL_JS = path.join(ROOT_DIR, 'assets', 'js', 'tools-site-shell.js');

function walkHtmlFiles(dir, files = []) {
    if (!fs.existsSync(dir)) return files;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === '_next') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walkHtmlFiles(full, files);
            continue;
        }
        if (entry.isFile() && entry.name.endsWith('.html')) files.push(full);
    }
    return files;
}

function main() {
    fs.mkdirSync(path.dirname(SHELL_JS), { recursive: true });
    fs.writeFileSync(SHELL_JS, renderShellRuntimeScript());

    const files = walkHtmlFiles(TOOLS_DIR);
    let changed = 0;
    for (const filePath of files) {
        const relativePath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
        const before = fs.readFileSync(filePath, 'utf8');
        const after = restyleToolsHtml(before, relativePath);
        if (after !== before) {
            fs.writeFileSync(filePath, after);
            changed += 1;
        }
    }
    console.log(`restyle-tools: wrote ${path.relative(ROOT_DIR, SHELL_JS)}; updated ${changed}/${files.length} HTML files.`);
}

if (require.main === module) {
    try {
        main();
    } catch (error) {
        console.error(`restyle-tools failed: ${error.message}`);
        process.exit(1);
    }
}

module.exports = { main, walkHtmlFiles };
