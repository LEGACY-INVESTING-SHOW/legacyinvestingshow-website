#!/usr/bin/env node

/**
 * Import the Legacy Investing Calculators app (calcs2) into tools/.
 *
 * Builds the Next.js app with static export, then merges the export into the
 * static site so /tools/<slug> serves each calculator page.
 *
 * The calculator app source lives outside this repo. When it is not present
 * (for example on CI), the script skips and the committed artifacts in tools/
 * are retained.
 *
 * Run with: node scripts/import-calculators.js
 * Override the app path with: CALC2_SRC=/path/to/calcs2 node scripts/import-calculators.js
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..');
const TOOLS_DIR = path.join(ROOT_DIR, 'tools');
const CALC2_DIR = process.env.CALC2_SRC || path.join('/Users/deveshdhardubey', 'calcs2');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

function main() {
  if (!fs.existsSync(path.join(CALC2_DIR, 'package.json'))) {
    console.log(`import-calculators: calculator app not found at ${CALC2_DIR}; keeping committed tools/ artifacts.`);
    return;
  }

  console.log(`import-calculators: building calculator app at ${CALC2_DIR}...`);
  const build = spawnSync('npm', ['run', 'build'], {
    cwd: CALC2_DIR,
    stdio: 'inherit',
  });
  if (build.status !== 0) {
    console.error('import-calculators: calculator app build failed; tools/ left untouched.');
    process.exit(1);
  }

  const outDir = path.join(CALC2_DIR, 'out');
  const homeExport = path.join(outDir, 'tools.html');
  if (!fs.existsSync(homeExport)) {
    console.error('import-calculators: expected export file tools.html is missing.');
    process.exit(1);
  }

  fs.rmSync(TOOLS_DIR, { recursive: true, force: true });
  fs.mkdirSync(TOOLS_DIR, { recursive: true });

  // Catalog home: /tools (exported as tools.html) becomes tools/index.html.
  fs.copyFileSync(homeExport, path.join(TOOLS_DIR, 'index.html'));

  // Calculator pages, category pages, and RSC payloads.
  copyDir(path.join(outDir, 'tools'), TOOLS_DIR);

  // Home page RSC payload for client-side navigation.
  fs.copyFileSync(path.join(outDir, 'tools.txt'), path.join(TOOLS_DIR, 'tools.txt'));

  // Next.js static assets (CSS, JS, fonts) referenced as /tools/_next/...
  copyDir(path.join(outDir, '_next'), path.join(TOOLS_DIR, '_next'));

  const htmlCount = fs
    .readdirSync(TOOLS_DIR, { recursive: true })
    .filter((name) => name.endsWith('.html')).length;
  console.log(`import-calculators: merged ${htmlCount} HTML files into tools/.`);
}

main();
