const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeTitle,
  dropTrailingStopwords,
  decodeEntities,
  MAX_TITLE_LENGTH,
} = require('../scripts/normalize-seo-titles');

const {
  repairSocialImages,
  dropBrokenImagePreloads,
  dropGoogleFontsPreconnect,
} = require('../scripts/ensure-tracking-and-verification');

const BRAND = ' | Legacy Investing Show';

// --- <title> normalization ------------------------------------------------

test('a short base title keeps the brand suffix and stays within 60 chars', () => {
  const title = normalizeTitle(`About Preston Seo${BRAND}`);
  assert.equal(title, `About Preston Seo${BRAND}`);
  assert.ok(decodeEntities(title).length <= MAX_TITLE_LENGTH);
});

test('a long base title drops the brand rather than overflowing', () => {
  const title = normalizeTitle(
    `Cost Segregation Study Guide for Short Term Rental Owners in 2026${BRAND}`
  );
  assert.ok(!title.includes(BRAND), `brand should be dropped, got: ${title}`);
  assert.ok(decodeEntities(title).length <= MAX_TITLE_LENGTH);
});

test('trimming never cuts mid-word', () => {
  const source = `Depreciation Recapture Explained for Rental Property Investors Selling Now${BRAND}`;
  const title = normalizeTitle(source);
  assert.ok(source.includes(title.split(' ').pop()), 'last word must be whole');
});

test('trimming leaves no dangling separator or preposition', () => {
  const title = normalizeTitle(
    `401k Strategy Tax Implications: Complete 2026 Guide to Retirement Savings${BRAND}`
  );
  assert.doesNotMatch(title, /[\s:;,\-–—|/&]$/);
  assert.doesNotMatch(title, /\b(to|for|and|with|the|of|in)$/i);
});

test('an unclosed bracket fragment is not left hanging', () => {
  const title = normalizeTitle(
    `Section 179 Deduction (2026 Limits and Rules for Business Owners)${BRAND}`
  );
  assert.ok(
    !title.includes('(') || title.includes(')'),
    `unbalanced bracket in: ${title}`
  );
});

test('duplicated brand suffixes collapse to one', () => {
  const title = normalizeTitle(`Blog${BRAND}${BRAND}`);
  assert.equal(title, `Blog${BRAND}`);
});

test('normalization is idempotent', () => {
  const samples = [
    `Blog${BRAND}`,
    `Build Wealth Beyond A Paycheck${BRAND}`,
    `Section 179 Deduction (2026 Limits and Rules for Business Owners)${BRAND}`,
    `Hang &amp; Antonio's Wealth Plan: Debt Elimination &amp; Side Hustle Income${BRAND}`,
    `How to Stand Out in a Saturated Airbnb Market: Marchia &amp;amp; Tyler's Story${BRAND}`,
    `SEP IRA Complete Guide: Retirement Savings for Self-Employed People${BRAND}`,
  ];
  for (const sample of samples) {
    const once = normalizeTitle(sample);
    assert.equal(normalizeTitle(once), once, `not stable: ${sample}`);
    assert.equal(normalizeTitle(normalizeTitle(once)), once);
  }
});

test('length is measured on the rendered title, not the entity-encoded one', () => {
  const title = normalizeTitle(`Student Success Stories &amp; Results${BRAND}`);
  assert.ok(decodeEntities(title).length <= MAX_TITLE_LENGTH);
  assert.ok(title.includes('&amp;'), 'ampersand stays escaped in markup');
});

test('dropTrailingStopwords keeps at least a few words', () => {
  assert.equal(dropTrailingStopwords('Guide to the'), 'Guide to the');
  assert.equal(dropTrailingStopwords('A Complete Guide to the'), 'A Complete Guide');
});

// --- broken-asset backstops ----------------------------------------------

const HOST = 'https://www.legacyinvestingshow.com';

test('og:image and twitter:image fall back to a real file when the target is missing', () => {
  const html = [
    `<meta property="og:image" content="${HOST}/assets/images/blog/no-such-post.jpg">`,
    '<meta name="twitter:image" content="/assets/images/blog/no-such-post.jpg">',
  ].join('\n');

  const blog = repairSocialImages(html, 'blog/no-such-post.html');
  assert.equal(blog.match(/no-such-post/g), null);
  assert.equal((blog.match(/og-blog\.jpg/g) || []).length, 2);

  const page = repairSocialImages(html, 'tax-strategies/hsa-strategy.html');
  assert.match(page, /og-home\.jpg/);
});

test('a social image that exists on disk is left alone', () => {
  const html = `<meta property="og:image" content="${HOST}/assets/images/og-blog.jpg">`;
  assert.equal(repairSocialImages(html, 'blog/post.html'), html);
});

test('off-site social images are not touched', () => {
  const html = '<meta property="og:image" content="https://i.ytimg.com/vi/abc/hq.jpg">';
  assert.equal(repairSocialImages(html, 'blog/post.html'), html);
});

test('image preloads pointing at missing files are removed', () => {
  const html = [
    '<head>',
    '    <link rel="preload" as="image" href="../assets/images/blog/missing.jpg" fetchpriority="high">',
    '    <link rel="preload" as="image" href="/assets/images/og-blog.jpg" fetchpriority="high">',
    '    <link rel="stylesheet" href="/assets/css/styles.css">',
    '</head>',
  ].join('\n');

  const out = dropBrokenImagePreloads(html, 'blog/post.html');
  assert.doesNotMatch(out, /missing\.jpg/);
  assert.match(out, /og-blog\.jpg/, 'a valid preload must survive');
  assert.match(out, /styles\.css/, 'non-preload links must survive');
  assert.equal(dropBrokenImagePreloads(out, 'blog/post.html'), out);
});

test('dangling Google Fonts preconnects are removed, self-hosted links are not', () => {
  const html = [
    '<head>',
    '    <link rel="preconnect" href="https://fonts.googleapis.com">',
    '    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '    <link rel="preconnect" href="https://player.vimeo.com">',
    '    <link rel="preload" href="/assets/fonts/dm-serif-display-400.woff2" as="font" type="font/woff2" crossorigin>',
    '</head>',
  ].join('\n');

  const out = dropGoogleFontsPreconnect(html);
  assert.doesNotMatch(out, /fonts\.googleapis\.com/);
  assert.doesNotMatch(out, /fonts\.gstatic\.com/);
  assert.match(out, /player\.vimeo\.com/);
  assert.match(out, /assets\/fonts\/dm-serif-display-400\.woff2/);
  assert.equal(dropGoogleFontsPreconnect(out), out);
});
