const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

const headerRule = source => config.headers.find(rule => rule.source === source);
const headerValue = (rule, key) =>
  (rule.headers.find(h => h.key.toLowerCase() === key.toLowerCase()) || {}).value;

const ASSET_SOURCES = [
  '/assets/css/(.*)',
  '/assets/js/(.*)',
  '/assets/images/(.*)',
  '/assets/fonts/(.*)',
];

test('every asset path is cached immutably and sent with nosniff', () => {
  for (const source of ASSET_SOURCES) {
    const rule = headerRule(source);
    assert.ok(rule, `missing header rule for ${source}`);
    assert.equal(
      headerValue(rule, 'Cache-Control'),
      'public, max-age=31536000, immutable',
      `wrong Cache-Control for ${source}`
    );
    assert.equal(
      headerValue(rule, 'X-Content-Type-Options'),
      'nosniff',
      `missing nosniff for ${source}`
    );
  }
});

test('immutable CSS/JS caching is paired with the content-hash build step', () => {
  // A year of `immutable` on /assets/css/styles.css is only safe because
  // build:assets rewrites every reference to styles.css?v=<content hash>.
  assert.equal(pkg.scripts['build:assets'], 'node scripts/version-assets.js');
  assert.ok(
    pkg.scripts.build.includes('npm run build:assets'),
    'build:assets must be part of the build chain'
  );
  assert.ok(
    pkg.scripts.build.trimEnd().endsWith('npm run build:assets'),
    'build:assets must run last, after every generator has written HTML'
  );
  assert.ok(
    fs.existsSync(path.join(ROOT, 'scripts/version-assets.js')),
    'scripts/version-assets.js must exist'
  );
});

test('duplicate and removed URLs redirect permanently to their canonical page', () => {
  const expected = {
    '/tax-strategies/1031-exchange-vs-opportunity-zones':
      '/compare/1031-exchange-vs-opportunity-zones',
    '/tax-strategies/health-savings-account-strategy': '/tax-strategies/hsa-strategy',
    '/worksheets': '/tools',
    '/pricing': '/reviews',
    '/blog/preston-seo-review': '/reviews',
    '/blog/legacy-investing-show-review': '/reviews',
    '/blog/legacy-investing-show-reviews': '/reviews',
    '/blog/legacy-investing-show-reviews-complaints': '/reviews',
    '/blog/is-legacy-investing-show-legit': '/reviews',
    '/blog/faq-review': '/reviews',
  };

  for (const [source, destination] of Object.entries(expected)) {
    const rule = config.redirects.find(r => r.source === source);
    assert.ok(rule, `missing redirect for ${source}`);
    assert.equal(rule.destination, destination);
    assert.equal(rule.permanent, true, `${source} must be a 301`);
  }

  assert.ok(
    config.redirects.some(r => r.source === '/worksheets/:slug*'),
    'the removed worksheets subtree must still redirect'
  );
});

test('redirect destinations resolve to a page on disk', () => {
  const resolvable = url => {
    const clean = url.replace(/\/$/, '');
    if (!clean) return true;
    if (clean.includes(':')) return true; // parameterised, checked by the platform
    return (
      fs.existsSync(path.join(ROOT, `${clean}.html`)) ||
      fs.existsSync(path.join(ROOT, clean, 'index.html'))
    );
  };

  for (const source of Object.keys({
    '/tax-strategies/1031-exchange-vs-opportunity-zones': 1,
    '/tax-strategies/health-savings-account-strategy': 1,
  })) {
    const rule = config.redirects.find(r => r.source === source);
    assert.ok(
      resolvable(rule.destination),
      `${source} redirects to a missing page: ${rule.destination}`
    );
  }
});

test('nothing shadows the automatic 404.html', () => {
  // Vercel serves the repo-root 404.html for unmatched paths on a static
  // deployment. That only happens while no rule claims every path first, so
  // any catch-all must stay narrowed by a `has` condition (today: the
  // apex-to-www canonical rewrite).
  const catchAll = /^\/(:path\*|\(\.\*\))$/;

  for (const rewrite of config.rewrites || []) {
    if (catchAll.test(rewrite.source)) {
      assert.ok(
        Array.isArray(rewrite.has) && rewrite.has.length > 0,
        `unconditional catch-all rewrite would swallow 404.html: ${rewrite.source}`
      );
    }
  }

  for (const redirect of config.redirects || []) {
    assert.ok(
      !catchAll.test(redirect.source) || (redirect.has || []).length > 0,
      `unconditional catch-all redirect would swallow 404.html: ${redirect.source}`
    );
  }

  assert.equal(config.cleanUrls, true);
  assert.equal(config.trailingSlash, false);
});
