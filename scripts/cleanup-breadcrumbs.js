#!/usr/bin/env node
/**
 * Clean up duplicate/old breadcrumbs from tax strategy pages
 */

const fs = require('fs');
const path = require('path');

const WEBSITE_DIR = '/home/clawd/legacyinvestingshow-website';

// Pattern to match old inline breadcrumbs
const oldBreadcrumbPattern = /<!-- Breadcrumb -->\s*<div class="breadcrumb container-custom"[^>]*>.*?<\/div>\s*/s;

function cleanFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  // Remove old inline breadcrumb pattern
  content = content.replace(oldBreadcrumbPattern, '');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  return false;
}

// Clean up tax strategy files
const taxStrategyDir = path.join(WEBSITE_DIR, 'tax-strategies');
const files = fs.readdirSync(taxStrategyDir).filter(f => f.endsWith('.html'));

let cleaned = 0;
for (const file of files) {
  const filePath = path.join(taxStrategyDir, file);
  if (cleanFile(filePath)) {
    console.log(`✓ Cleaned: tax-strategies/${file}`);
    cleaned++;
  }
}

console.log(`\nCleaned ${cleaned} files`);
