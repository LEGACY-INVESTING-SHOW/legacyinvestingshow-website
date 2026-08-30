#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PUBLIC_SKIP_DIRS = new Set([
  '.git',
  '.vercel',
  'analysis',
  'backups',
  'cms',
  'content',
  'docs',
  'lx',
  'node_modules',
  'plans',
  'screenshots',
  'templates',
  'tests',
  'todos',
]);

const GENERIC_MARKERS = [
  'Core Framework: Design, Deploy, Defend',
  'A workable first version is usually possible in 2 to 6 weeks',
  'Pause scaling, review assumptions, reduce exposure',
  'documented rules, measurable checkpoints, and risk controls',
];

function walkHtmlFiles(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!PUBLIC_SKIP_DIRS.has(entry.name)) {
        walkHtmlFiles(fullPath, results);
      }
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.html')) {
      results.push(fullPath);
    }
  }
  return results;
}

function walkMarkdownFiles(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkMarkdownFiles(fullPath, results);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(fullPath);
    }
  }
  return results;
}

function extract(html, regex) {
  const match = html.match(regex);
  return match ? match[1].trim() : '';
}

function collectPublicHtmlChecks() {
  const htmlFiles = walkHtmlFiles(ROOT);
  const summary = {
    pageCount: htmlFiles.length,
    invalidJsonLdBlocks: 0,
    titleEllipsisCount: 0,
    descriptionEllipsisCount: 0,
    sampleInvalidJsonLd: [],
    sampleTitleEllipsis: [],
    sampleDescriptionEllipsis: [],
  };

  for (const file of htmlFiles) {
    const rel = path.relative(ROOT, file);
    const html = fs.readFileSync(file, 'utf8');

    const title = extract(html, /<title>([\s\S]*?)<\/title>/i);
    const description = extract(html, /<meta\s+name="description"\s+content="([\s\S]*?)"/i);

    if (title.includes('…')) {
      summary.titleEllipsisCount += 1;
      if (summary.sampleTitleEllipsis.length < 10) {
        summary.sampleTitleEllipsis.push({ file: rel, title });
      }
    }

    if (description.includes('…')) {
      summary.descriptionEllipsisCount += 1;
      if (summary.sampleDescriptionEllipsis.length < 10) {
        summary.sampleDescriptionEllipsis.push({ file: rel, description });
      }
    }

    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)]
      .map((match) => match[1].trim());

    blocks.forEach((block, index) => {
      try {
        JSON.parse(block);
      } catch (error) {
        summary.invalidJsonLdBlocks += 1;
        if (summary.sampleInvalidJsonLd.length < 10) {
          summary.sampleInvalidJsonLd.push({
            file: rel,
            block: index + 1,
            error: error.message.split('\n')[0],
          });
        }
      }
    });
  }

  return summary;
}

function collectMarkdownChecks() {
  const contentDir = path.join(ROOT, 'content', 'blog');
  const markdownFiles = walkMarkdownFiles(contentDir);
  const summary = {
    fileCount: markdownFiles.length,
    genericMarkerHits: [],
    nonWwwCanonicalCount: 0,
    sampleNonWwwCanonical: [],
  };

  for (const file of markdownFiles) {
    const rel = path.relative(ROOT, file);
    const text = fs.readFileSync(file, 'utf8');

    if (GENERIC_MARKERS.some((marker) => text.includes(marker))) {
      summary.genericMarkerHits.push(rel);
    }

    const canonical = extract(text, /^canonical:\s+["']?(https?:\/\/[^\s"']+)["']?/m);
    if (canonical && canonical.startsWith('https://legacyinvestingshow.com/')) {
      summary.nonWwwCanonicalCount += 1;
      if (summary.sampleNonWwwCanonical.length < 10) {
        summary.sampleNonWwwCanonical.push({ file: rel, canonical });
      }
    }
  }

  return summary;
}

function main() {
  const report = {
    publicHtml: collectPublicHtmlChecks(),
    markdown: collectMarkdownChecks(),
  };

  console.log(JSON.stringify(report, null, 2));
}

main();
