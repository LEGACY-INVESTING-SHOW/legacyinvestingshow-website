#!/usr/bin/env node

/**
 * Content-hash cache busting for CSS/JS references in HTML.
 *
 * vercel.json serves /assets/css/*, /assets/js/*, /assets/images/* and
 * /assets/fonts/* with `Cache-Control: public, max-age=31536000, immutable`.
 * That is only safe when the URL changes whenever the bytes change, so this
 * step rewrites every stylesheet/script reference to carry
 * `?v=<first 8 hex of sha256(file contents)>`.
 *
 * Matches href/src on any tag, including `<link rel="preload" as="style">`
 * and `<link rel="modulepreload">`, for both root-absolute (`/assets/...`)
 * and relative (`../assets/...`) paths. Re-running replaces an existing
 * `?v=` rather than stacking a second one, so the script is idempotent.
 *
 * Runs last in the build chain (after every generator has written HTML).
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');

// Same skip list as scripts/ensure-tracking-and-verification.js.
const SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  '.vercel',
  '.checkpoints',
  '.claude',
  'analysis',
  'backups',
  'cms',
  'docs',
  'lx',
  'plans',
  'screenshots',
  'todos',
]);

// Assets whose own generator already stamps a content hash on them.
// Rewriting these here would just churn the diff on every build.
const SKIP_ASSETS = new Set([
  'assets/css/legacy-wealth-blueprint.css',
  'assets/js/legacy-wealth-blueprint.js',
]);

// (href|src)="<prefix>assets/(css|js)/<file>.(css|js)<query>"
const ASSET_REF = /\b(href|src)=("|')((?:\.\.\/)*|\/)(assets\/(?:css|js)\/[A-Za-z0-9._-]+\.(?:css|js))((?:\?[^"'\s]*)?)\2/gi;

function walkHtmlFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walkHtmlFiles(fullPath, files);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.html')) files.push(fullPath);
  }
  return files;
}

const hashCache = new Map();

/** First 8 hex of sha256 of the file, or null when the file is missing. */
function hashFile(absPath) {
  if (hashCache.has(absPath)) return hashCache.get(absPath);
  let hash = null;
  try {
    hash = crypto
      .createHash('sha256')
      .update(fs.readFileSync(absPath))
      .digest('hex')
      .slice(0, 8);
  } catch {
    hash = null;
  }
  hashCache.set(absPath, hash);
  return hash;
}

/**
 * Rebuild the query string, replacing any existing `v` param and keeping
 * every other param intact.
 */
function withVersion(query, version) {
  const params = new URLSearchParams(query.startsWith('?') ? query.slice(1) : query);
  params.set('v', version);
  return `?${params.toString()}`;
}

function versionHtml(html, htmlDir, rootDir = ROOT_DIR) {
  return html.replace(ASSET_REF, (match, attr, quote, prefix, assetPath, query) => {
    if (SKIP_ASSETS.has(assetPath)) return match;

    const absPath = prefix === '/'
      ? path.join(rootDir, assetPath)
      : path.resolve(htmlDir, `${prefix}${assetPath}`);

    const version = hashFile(absPath);
    if (!version) return match; // Unknown file: leave the reference untouched.

    return `${attr}=${quote}${prefix}${assetPath}${withVersion(query, version)}${quote}`;
  });
}

function processFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  const next = versionHtml(original, path.dirname(filePath));
  if (next === original) return false;
  fs.writeFileSync(filePath, next, 'utf8');
  return true;
}

function main() {
  const htmlFiles = walkHtmlFiles(ROOT_DIR);
  let updated = 0;
  for (const filePath of htmlFiles) {
    if (processFile(filePath)) updated += 1;
  }
  console.log(`Versioned CSS/JS references in ${updated} of ${htmlFiles.length} HTML file(s).`);
}

if (require.main === module) main();

module.exports = { versionHtml, withVersion, ROOT_DIR };
