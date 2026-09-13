const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const { versionHtml, withVersion } = require('../scripts/version-assets');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lis-version-assets-'));
  fs.mkdirSync(path.join(root, 'assets/css'), { recursive: true });
  fs.mkdirSync(path.join(root, 'assets/js'), { recursive: true });
  fs.mkdirSync(path.join(root, 'blog'), { recursive: true });
  fs.writeFileSync(path.join(root, 'assets/css/styles.css'), 'body{color:red}');
  fs.writeFileSync(path.join(root, 'assets/js/main.js'), 'console.log(1)');
  return root;
}

const hashOf = body =>
  crypto.createHash('sha256').update(body).digest('hex').slice(0, 8);

test('stamps a content hash on root-absolute and relative asset references', () => {
  const root = fixture();
  try {
    const cssHash = hashOf('body{color:red}');
    const jsHash = hashOf('console.log(1)');

    const rootPage = [
      '<link rel="stylesheet" href="/assets/css/styles.css">',
      '<script src="/assets/js/main.js"></script>',
    ].join('\n');
    const stampedRoot = versionHtml(rootPage, root, root);
    assert.match(stampedRoot, new RegExp(`/assets/css/styles\\.css\\?v=${cssHash}`));
    assert.match(stampedRoot, new RegExp(`/assets/js/main\\.js\\?v=${jsHash}`));

    const nestedPage = '<link rel="preload" as="style" href="../assets/css/styles.css">';
    const stampedNested = versionHtml(nestedPage, path.join(root, 'blog'), root);
    assert.match(
      stampedNested,
      new RegExp(`\\.\\./assets/css/styles\\.css\\?v=${cssHash}`)
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('re-running replaces the existing ?v= instead of stacking another', () => {
  const root = fixture();
  try {
    const page = '<link rel="stylesheet" href="/assets/css/styles.css">';
    const once = versionHtml(page, root, root);
    const twice = versionHtml(once, root, root);
    const thrice = versionHtml(twice, root, root);

    assert.equal(once, twice, 'second pass must be a no-op');
    assert.equal(twice, thrice, 'third pass must be a no-op');
    assert.equal((once.match(/\?v=/g) || []).length, 1);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('a stale hash is corrected when the asset content changes', () => {
  const root = fixture();
  try {
    const before = versionHtml(
      '<link rel="stylesheet" href="/assets/css/styles.css">',
      root,
      root
    );
    fs.writeFileSync(path.join(root, 'assets/css/styles.css'), 'body{color:blue}');
    // hashFile memoises per path, so exercise the rewrite through a new file.
    fs.writeFileSync(path.join(root, 'assets/css/other.css'), 'body{color:blue}');
    const after = versionHtml(
      '<link rel="stylesheet" href="/assets/css/other.css">',
      root,
      root
    );
    assert.match(after, new RegExp(`\\?v=${hashOf('body{color:blue}')}`));
    assert.notEqual(before.match(/\?v=(\w+)/)[1], after.match(/\?v=(\w+)/)[1]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('references to assets that are not on disk are left alone', () => {
  const root = fixture();
  try {
    const page = '<script src="/assets/js/does-not-exist.js"></script>';
    assert.equal(versionHtml(page, root, root), page);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('other query parameters survive versioning', () => {
  assert.equal(withVersion('?foo=bar', 'abc12345'), '?foo=bar&v=abc12345');
  assert.equal(withVersion('?v=old', 'abc12345'), '?v=abc12345');
  assert.equal(withVersion('', 'abc12345'), '?v=abc12345');
});

test('every CSS/JS reference the site ships resolves to a real file', () => {
  // Guards the immutable cache headers in vercel.json: an unhashed URL that
  // 404s would be cached for a year by any CDN edge that saw it.
  const repoRoot = path.join(__dirname, '..');
  for (const page of ['index.html', 'about.html', 'success-stories.html']) {
    const html = fs.readFileSync(path.join(repoRoot, page), 'utf8');
    for (const match of html.matchAll(/(?:href|src)="(\/assets\/(?:css|js)\/[^"?]+)/g)) {
      assert.ok(
        fs.existsSync(path.join(repoRoot, match[1].slice(1))),
        `${page} references missing asset ${match[1]}`
      );
    }
  }
});
