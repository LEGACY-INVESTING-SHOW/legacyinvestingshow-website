#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
try {
    const tables = JSON.parse(fs.readFileSync(path.join(root, 'data/calculators/tax-structure.json'), 'utf8'));
    const templatePath = path.join(root, 'templates/tax-structure-calculator.html');
    const template = fs.readFileSync(templatePath, 'utf8');
    if (!template.includes('{{TAX_TABLES}}')) throw new Error(`Missing TAX_TABLES placeholder in ${templatePath}`);
    const output = template.replace('{{TAX_TABLES}}', JSON.stringify(tables).replace(/</g, '\\u003c'));
    const destination = path.join(root, 'tools/tax-structure-calculator.html');
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, output);
    console.log('Built tools/tax-structure-calculator.html from template and 2026 tax tables.');
} catch (error) {
    console.error(`Tax Structure Calculator build failed: ${error.message}`);
    process.exit(1);
}
