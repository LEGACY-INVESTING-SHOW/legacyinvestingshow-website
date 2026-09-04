#!/usr/bin/env node
// Reuse generated site files only when every non-funnel input is unchanged.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const SKIP = new Set(['.git', '.vercel', 'node_modules', '.cache', '.DS_Store']);
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
function funnel(file) {
  return file === 'str-opportunity.html' || /^str-opportunity\/assets\/member-stories\/[^/]+\.(png|jpe?g|webp|gif|svg|json)$/.test(file);
}
function scan(root, dir = '') {
  const files = {};
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.posix.join(dir, entry.name);
    if (SKIP.has(entry.name) || rel === 'cms/_site') continue;
    if (entry.isDirectory()) Object.assign(files, scan(root, rel));
    else if (entry.isFile()) files[rel] = digest(fs.readFileSync(path.join(root, rel)));
    else throw new Error(`Unsupported source entry: ${rel}`);
  }
  return files;
}
function fingerprint(files, env) {
  const inputs = Object.entries(files).filter(([file]) => !funnel(file)).sort(([a], [b]) => a.localeCompare(b));
  const settings = ['SITE_URL', 'GA_TRACKING_ID', 'GTM_CONTAINER_ID', 'CALC2_SRC', 'NODE_ENV', 'VERCEL_ENV'].map(key => [key, env[key] || '']);
  return digest(JSON.stringify({ version: 1, node: process.versions.node, platform: process.platform, inputs, settings }));
}
function safeFile(file) {
  return typeof file === 'string' && file && !path.isAbsolute(file) && !file.split('/').some(p => p === '..' || SKIP.has(p)) && !funnel(file);
}
function run(root = ROOT, env = process.env, build = name => execFileSync('npm', ['run', name], { cwd: root, env, stdio: 'inherit' })) {
  // Cache use is restricted to Vercel, where each deployment has fresh source.
  if (env.VERCEL !== '1') return build('build');
  const before = scan(root);
  const key = fingerprint(before, env);
  const cache = path.join(root, 'node_modules/.cache/lis-generated-site');
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(cache, 'manifest.json'), 'utf8'));
    if (manifest.key !== key || env.LIS_FORCE_FULL_BUILD === '1') manifest = null;
    if (manifest) {
      // Check the whole cache before writing anything into this deployment.
      for (const [file, hash] of Object.entries(manifest.files)) {
        if (!safeFile(file) || digest(fs.readFileSync(path.join(cache, 'files', file))) !== hash) throw new Error('Invalid cached output');
      }
      if (!manifest.deleted.every(safeFile)) throw new Error('Invalid deleted paths');
    }
  } catch { manifest = null; }
  // External local calculator sources are not captured by the repository hash.
  if (fs.existsSync(env.CALC2_SRC || '/Users/deveshdhardubey/calcs2')) manifest = null;
  if (manifest) {
    for (const file of Object.keys(manifest.files)) {
      fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      fs.copyFileSync(path.join(cache, 'files', file), path.join(root, file));
    }
    for (const file of manifest.deleted) fs.rmSync(path.join(root, file), { force: true });
    console.log(`[site-build] FAST: restored ${Object.keys(manifest.files).length} generated files. Shared inputs unchanged.`);
    // Apply existing metadata/tracking rules to freshly changed funnel HTML.
    build('build:tracking');
    build('build:seo-titles');
    build('build:links');
    return 'fast';
  }
  console.log('[site-build] FULL: shared inputs changed or no verified cache.');
  build('build'); // Failures propagate; never cache a failed build.
  const after = scan(root);
  const files = Object.fromEntries(Object.entries(after).filter(([file, hash]) => !funnel(file) && before[file] !== hash));
  const deleted = Object.keys(before).filter(file => !funnel(file) && !after[file]);
  fs.rmSync(cache, { recursive: true, force: true });
  for (const file of Object.keys(files)) {
    fs.mkdirSync(path.dirname(path.join(cache, 'files', file)), { recursive: true });
    fs.copyFileSync(path.join(root, file), path.join(cache, 'files', file));
  }
  fs.mkdirSync(cache, { recursive: true });
  fs.writeFileSync(path.join(cache, 'manifest.json'), JSON.stringify({ key, files, deleted }));
  console.log(`[site-build] Cached ${Object.keys(files).length} generated files for future funnel-only updates.`);
  return 'full';
}
if (require.main === module) run();
module.exports = { run };
