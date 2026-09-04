const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { run } = require('../scripts/build-vercel');
test('funnel-only build restores generated output without restoring old funnel copy', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lis-build-test-'));
  const write = (f, s) => { fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true }); fs.writeFileSync(path.join(root, f), s); };
  const env = { VERCEL: '1', VERCEL_ENV: 'production', CALC2_SRC: path.join(root, 'no-external-calculators') };
  let full = 0;
  const build = name => { if (name === 'build') { full++; write('blog/example.html', 'generated'); write('feed.xml', 'feed'); } };
  try {
    write('content/post.md', 'source'); write('blog/example.html', 'committed'); write('str-opportunity.html', 'old');
    assert.equal(run(root, env, build), 'full');
    const reset = () => { write('blog/example.html', 'committed'); fs.rmSync(path.join(root, 'feed.xml'), { force: true }); };
    reset(); write('str-opportunity.html', 'new');
    assert.equal(run(root, env, build), 'fast');
    assert.equal(fs.readFileSync(path.join(root, 'blog/example.html'), 'utf8'), 'generated');
    assert.equal(fs.readFileSync(path.join(root, 'str-opportunity.html'), 'utf8'), 'new');
    assert.equal(fs.readFileSync(path.join(root, 'feed.xml'), 'utf8'), 'feed');
    reset(); write('content/post.md', 'changed');
    assert.equal(run(root, env, build), 'full');
    reset(); write('node_modules/.cache/lis-generated-site/files/feed.xml', 'corrupt');
    assert.equal(run(root, env, build), 'full');
    assert.equal(full, 3);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
test('failed full build is not cached; local builds use full build', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lis-build-test-'));
  try {
    assert.throws(() => run(root, { VERCEL: '1' }, () => { throw new Error('build failed'); }), /build failed/);
    assert.equal(fs.existsSync(path.join(root, 'node_modules/.cache/lis-generated-site/manifest.json')), false);
    let step; run(root, {}, name => { step = name; }); assert.equal(step, 'build');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
