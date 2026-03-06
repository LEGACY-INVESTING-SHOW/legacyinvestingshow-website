#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content', 'blog');

function wordCount(text) {
  const normalized = (text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return 0;
  return normalized.split(' ').length;
}

function readTimeLabel(words) {
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

function updateFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  const parsed = matter(original);
  const words = wordCount(parsed.content);

  parsed.data.wordCount = String(words);
  parsed.data.readingTime = readTimeLabel(words);

  const next = matter.stringify(parsed.content.trimStart(), parsed.data, {
    lineWidth: 0,
  });

  if (next !== original) {
    fs.writeFileSync(filePath, next, 'utf8');
    return true;
  }

  return false;
}

function main() {
  const files = fs.readdirSync(CONTENT_DIR)
    .filter((name) => name.endsWith('.md'))
    .map((name) => path.join(CONTENT_DIR, name));

  let updated = 0;
  for (const filePath of files) {
    if (updateFile(filePath)) {
      updated += 1;
    }
  }

  console.log(`Recalculated reading metrics in ${updated} file(s).`);
}

main();
