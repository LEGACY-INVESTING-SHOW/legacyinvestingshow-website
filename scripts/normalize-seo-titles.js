#!/usr/bin/env node

/**
 * Normalize HTML <title> tags to a SERP-safe length.
 *
 * Rules:
 * - Collapse duplicated `| Legacy Investing Show` suffixes.
 * - Keep the brand suffix only when the base title is short enough that the
 *   whole title still fits in 60 characters (base <= 36).
 * - Otherwise drop the brand and keep the base title whole: search engines
 *   truncate long titles with an ellipsis, which reads better than a title
 *   cut short in the markup. Only dangling separators are tidied.
 * - `<meta name="title">` mirrors `<title>`.
 * - `og:title` keeps the full, untruncated title (social cards have room);
 *   one is added from the pre-trim title if a page has none.
 * - Frozen surfaces (funnels, unlisted libraries, the imported `tools/`
 *   export) are never touched.
 *
 * Re-running is a no-op: a title already at or under the cap is left alone.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BRAND_SUFFIX = ' | Legacy Investing Show';
const MAX_TITLE_LENGTH = 60;
// 36 + ' | Legacy Investing Show'.length (24) === 60.
const MAX_BASE_WITH_BRAND = MAX_TITLE_LENGTH - BRAND_SUFFIX.length;

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.vercel',
  '.claude',
  '.agents',
  '.factory',
  '.opencode',
  '.playwright-mcp',
  'analysis',
  'backups',
  'cms',
  'content',
  'docs',
  'plans',
  'screenshots',
  'scripts',
  'templates',
  'tests',
  'todos',
  // build:blog already emits normalized <title> tags.
  'blog',
  // Frozen: sales funnels, unlisted client libraries, imported Next export.
  'lx',
  'funnels',
  'gettaxreport',
  'stacking-presentation',
  'tools',
]);

// Frozen funnel pages and their per-page directories at the repo root.
const SKIP_PATH_PREFIXES = [
  'legacy-wealth-blueprint',
  'str-opportunity',
  'strconcierge',
  'lwbprogram',
  'airbnbascension',
  'programroi',
  'renewals',
  'stay',
];

function isFrozen(relativePath) {
  const normalized = relativePath.replace(/\\/g, '/');
  const [head] = normalized.split('/');
  if (SKIP_DIRS.has(head)) return true;
  return SKIP_PATH_PREFIXES.some(
    prefix => head === prefix || head.startsWith(prefix)
  );
}

/** Strip the brand suffix (however many times it was appended). */
function baseTitle(title) {
  return title
    .split(BRAND_SUFFIX)
    .map(part => part.trim())
    .filter(Boolean)
    .join(' ')
    .trim();
}

// Entities are decoded before measuring so `&#39;` costs one character in the
// SERP, not five; only the three characters that must be escaped go back in.
function decodeEntities(text) {
  // Looped: some generators double-encoded, so `&amp;amp;` must reach `&`.
  let out = String(text);
  for (let pass = 0; pass < 3; pass += 1) {
    const next = decodeEntitiesOnce(out);
    if (next === out) break;
    out = next;
  }
  return out;
}

function decodeEntitiesOnce(text) {
  return String(text)
    .replace(/&#(\d+);/g, (m, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (m, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function encodeMarkup(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Words that read as an unfinished sentence when a title is cut after them.
const TRAILING_STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'can', 'do', 'does',
  'for', 'from', 'has', 'have', 'heres', 'how', 'hows', 'if', 'in', 'into',
  'is', 'it', 'its', 'my', 'of', 'on', 'or', 'our', 'per', 'plus', 'so',
  'than', 'that', 'thats', 'the', 'their', 'then', 'theres', 'these', 'they',
  'this', 'to', 'up', 'via', 'vs', 'was', 'were', 'what', 'whats', 'when',
  'where', 'which', 'who', 'why', 'will', 'with', 'without', 'you', 'your',
]);

/** After a cut, drop dangling prepositions/articles left at the end. */
function dropTrailingStopwords(text) {
  const words = text.split(' ');
  while (
    words.length > 3 &&
    TRAILING_STOPWORDS.has(words[words.length - 1].toLowerCase().replace(/[^a-z]/g, ''))
  ) {
    words.pop();
  }
  return words.join(' ');
}

/** Remove trailing separators and any dangling unclosed bracket fragment. */
function tidyTail(text) {
  const stripSeparators = value => value.replace(/[\s\-–—:,|/&+·•]+$/u, '');
  let out = stripSeparators(text);

  const open = out.lastIndexOf('(');
  if (open !== -1 && out.indexOf(')', open) === -1) {
    const withoutFragment = stripSeparators(out.slice(0, open));
    // Dropping the fragment is right unless it leaves almost nothing, in
    // which case closing the bracket keeps the title readable.
    out = withoutFragment.split(' ').filter(Boolean).length >= 3
      ? withoutFragment
      : `${stripSeparators(out)})`;
  }
  return out.trim();
}

/** Trim to `max` characters without breaking a word. */
function trimToWidth(text, max) {
  if (text.length <= max) return tidyTail(text);
  // One extra character tells us whether the cut lands on a word boundary.
  const head = text.slice(0, max + 1);
  const lastSpace = head.lastIndexOf(' ');
  const clipped = lastSpace > 0 ? head.slice(0, lastSpace) : text.slice(0, max);
  return tidyTail(dropTrailingStopwords(tidyTail(clipped)));
}

function normalizeTitle(raw) {
  const title = decodeEntities((raw || '').replace(/\s+/g, ' ')).trim();
  if (!title) return '';

  // Trim first, then decide about the brand, so the decision is made on the
  // title that actually ships. That is what makes a second run a no-op.
  const base = tidyTail(baseTitle(title) || title);
  if (base.length <= MAX_BASE_WITH_BRAND) {
    return encodeMarkup(`${base}${BRAND_SUFFIX}`);
  }
  return encodeMarkup(base);
}

function walk(dir, files = [], relative = '') {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const relativePath = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || isFrozen(relativePath)) continue;
      walk(path.join(dir, entry.name), files, relativePath);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.html') && !isFrozen(relativePath)) {
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

  // The social title keeps the full form; add one if the page has none.
  if (next.length < current.length && !/<meta\s+property=["']og:title["']/i.test(html)) {
    html = html.replace(
      titleMatch[0],
      () => `${titleMatch[0]}\n    <meta property="og:title" content="${current}">`
    );
  }

  html = html.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${next}</title>`);
  html = html.replace(
    /(<meta\s+name="title"\s+content=")[^"]*(")/i,
    (m, open, close) => `${open}${next}${close}`
  );

  fs.writeFileSync(filePath, html, 'utf8');
  return true;
}

function main() {
  const htmlFiles = walk(ROOT);
  let updated = 0;

  for (const file of htmlFiles) {
    if (normalizeFile(file)) updated += 1;
  }

  console.log(`Normalized SEO titles in ${updated} of ${htmlFiles.length} file(s).`);
}

if (require.main === module) main();

module.exports = {
  normalizeTitle,
  trimToWidth,
  tidyTail,
  dropTrailingStopwords,
  decodeEntities,
  MAX_TITLE_LENGTH,
};
