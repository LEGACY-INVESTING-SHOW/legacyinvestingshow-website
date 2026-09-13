#!/usr/bin/env node
// Keep the hand-written pages' header and footer identical to the shared
// shell in scripts/lib/site-shell.js. Idempotent; safe to run at any time.
const fs = require('fs');
const path = require('path');
const { renderSiteHeader, renderSiteFooter } = require('./lib/site-shell');

const ROOT = path.resolve(__dirname, '..');
const PAGES = {
  'index.html': '/',
  'about.html': '/about',
  'about/preston-seo.html': '/about',
  'success-stories.html': '/success-stories',
  'tax-strategies-101.html': '/tax-strategies',
  'privacy.html': '',
  'terms.html': '',
  '404.html': '',
};

const HEADER_RE = /<header class="site-header">[\s\S]*?<\/header>/;
const FOOTER_RE = /<footer class="site-footer"[^>]*>[\s\S]*?<\/footer>/;

let changed = 0;
for (const [file, active] of Object.entries(process.argv[2] ? { [process.argv[2]]: PAGES[process.argv[2]] || '' } : PAGES)) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) continue;
  const before = fs.readFileSync(full, 'utf8');
  if (!HEADER_RE.test(before) || !FOOTER_RE.test(before)) {
    console.warn(`sync-static-shell: ${file} has no shared shell markup; skipped`);
    continue;
  }
  const after = before.replace(HEADER_RE, renderSiteHeader(active)).replace(FOOTER_RE, renderSiteFooter());
  if (after !== before) {
    fs.writeFileSync(full, after);
    changed += 1;
    console.log(`sync-static-shell: updated ${file}`);
  }
}
console.log(`sync-static-shell: ${changed} file(s) changed`);
