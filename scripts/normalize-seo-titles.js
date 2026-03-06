#!/usr/bin/env node

/**
 * Normalize HTML <title> tags without forcing a SERP length cap.
 * Also keeps <meta name="title"> aligned when present.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BRAND_SUFFIX = ' | Legacy Investing Show';
const SKIP_DIRS = new Set(['node_modules', '.git']);

function normalizeTitle(raw) {
  const title = (raw || '').replace(/\s+/g, ' ').trim();
  if (!title) return '';
  if (!title.endsWith(BRAND_SUFFIX)) return title;

  const core = title.slice(0, -BRAND_SUFFIX.length).trimEnd();
  return core ? `${core}${BRAND_SUFFIX}` : title;
}

function walk(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), files);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

function normalizeFile(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');

  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (!titleMatch) return false;

  const current = titleMatch[1].replace(/\s+/g, ' ').trim();
  const next = normalizeTitle(current);
  if (!next || next === current) return false;

  html = html.replace(
    /<title>[\s\S]*?<\/title>/i,
    `<title>${next}</title>`
  );
  html = html.replace(
    /(<meta\s+name="title"\s+content=")[^"]*(")/i,
    `$1${next}$2`
  );

  fs.writeFileSync(filePath, html, 'utf8');
  return true;
}

function main() {
  const htmlFiles = walk(ROOT);
  let updated = 0;

  for (const file of htmlFiles) {
    if (normalizeFile(file)) {
      updated += 1;
    }
  }

  console.log(`Normalized SEO titles in ${updated} file(s).`);
}

main();
