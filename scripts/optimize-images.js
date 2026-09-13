#!/usr/bin/env node

/**
 * Generate responsive WebP variants for the photos the site actually renders.
 *
 * The originals are kept untouched; each variant is written next to its source
 * as `<basename>-<width>.webp`, so a page can serve
 * `preston-main-600.webp 600w, preston-main-1200.webp 1200w` instead of a
 * single 3000px master.
 *
 * Sizing follows the rendered width, not the intrinsic one:
 * - hero and about photos cap at 1200px
 * - thumbnails (logo, case-study strip) cap at 480px
 * Widths larger than the source are dropped; nothing is ever upscaled.
 *
 * Idempotent: a variant is rebuilt only when it is missing or older than its
 * source, so repeat runs finish in milliseconds and produce no diff.
 *
 * Usage: node scripts/optimize-images.js [--force] [--dry-run] [--map <path>]
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const IMAGE_DIR = path.join(ROOT_DIR, 'assets', 'images');
const MANIFEST_PATH = path.join(IMAGE_DIR, 'manifest.json');
const WEBP_QUALITY = 78;

// Rendered-width budgets. Sources are matched by basename (extension aside).
const LARGE_WIDTHS = [1200, 800, 600, 400];
const THUMB_WIDTHS = [480, 240];

const LARGE_IMAGES = [
  'hero-image',
  'preston-main',
  'about-childhood',
  'about-family-1',
  'about-family-2',
  'about-family-3',
  'about-header',
  'about-mission',
  'about-work-1',
  'about-work-2',
];

const THUMB_IMAGES = [
  'logo',
  'case-study-dustin',
  'case-study-fischers',
  'case-study-kiana',
  'case-study-kirk',
];

// Prefer a lossless/large master over an already-compressed WebP.
const SOURCE_PRIORITY = ['.png', '.jpg', '.jpeg', '.webp'];

const args = process.argv.slice(2);
const options = {
  force: args.includes('--force'),
  dryRun: args.includes('--dry-run'),
  mapPath: (() => {
    const i = args.indexOf('--map');
    return i !== -1 && args[i + 1] ? path.resolve(args[i + 1]) : null;
  })(),
};

function findSource(basename) {
  for (const ext of SOURCE_PRIORITY) {
    const candidate = path.join(IMAGE_DIR, `${basename}${ext}`);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function isStale(outputPath, sourcePath) {
  if (options.force) return true;
  if (!fs.existsSync(outputPath)) return true;
  return fs.statSync(outputPath).mtimeMs < fs.statSync(sourcePath).mtimeMs;
}

/**
 * Widths to emit: only those strictly smaller than the source, largest first.
 * A variant at (or above) the source width would just be a re-encode of an
 * image the page can already use, so it is skipped.
 */
function plannedWidths(budget, sourceWidth) {
  return [...new Set(budget.filter(w => w < sourceWidth))].sort((a, b) => b - a);
}

async function buildVariants(basename, budget) {
  const sourcePath = findSource(basename);
  if (!sourcePath) {
    console.warn(`  skip ${basename}: no source image on disk`);
    return null;
  }

  const metadata = await sharp(sourcePath).metadata();
  const sourceBytes = fs.statSync(sourcePath).size;
  const widths = plannedWidths(budget, metadata.width);
  const variants = [];

  for (const width of widths) {
    const outputName = `${basename}-${width}.webp`;
    const outputPath = path.join(IMAGE_DIR, outputName);

    if (isStale(outputPath, sourcePath)) {
      const encoded = await sharp(sourcePath)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();

      // A "variant" heavier than the master is not an optimization. Flat
      // artwork (the logo, the banner) compresses better as the original.
      if (encoded.length >= sourceBytes) {
        console.log(`  skip ${outputName}: ${(encoded.length / 1024) | 0}KB >= source`);
        continue;
      }
      if (!options.dryRun) fs.writeFileSync(outputPath, encoded);
    }

    const height = Math.round((metadata.height / metadata.width) * width);
    variants.push({
      url: `/assets/images/${outputName}`,
      width,
      height,
      bytes: fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0,
    });
  }

  const siblingWebp = path.join(IMAGE_DIR, `${basename}.webp`);

  return {
    original: `/assets/images/${path.basename(sourcePath)}`,
    fullSizeWebp: fs.existsSync(siblingWebp) ? `/assets/images/${basename}.webp` : null,
    originalWidth: metadata.width,
    originalHeight: metadata.height,
    originalBytes: fs.statSync(sourcePath).size,
    variants,
  };
}

async function main() {
  const started = Date.now();
  const map = {};

  for (const [names, budget, label] of [
    [LARGE_IMAGES, LARGE_WIDTHS, 'hero/about'],
    [THUMB_IMAGES, THUMB_WIDTHS, 'thumbnail'],
  ]) {
    console.log(`Building ${label} variants...`);
    for (const basename of names) {
      const entry = await buildVariants(basename, budget);
      if (entry) {
        map[entry.original] = { role: label, ...entry };
      }
    }
  }

  const manifest = {
    generatedBy: 'scripts/optimize-images.js',
    webpQuality: WEBP_QUALITY,
    images: map,
  };

  if (!options.dryRun) {
    fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    if (options.mapPath) {
      fs.mkdirSync(path.dirname(options.mapPath), { recursive: true });
      fs.writeFileSync(options.mapPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    }
  }

  const count = Object.values(map).reduce((n, e) => n + e.variants.length, 0);
  console.log(
    `${count} variant(s) for ${Object.keys(map).length} image(s) in ${Date.now() - started}ms.`
  );
}

if (require.main === module) {
  main().catch(error => {
    console.error('Image optimization failed:', error.message);
    process.exit(1);
  });
}

module.exports = { plannedWidths, findSource, LARGE_WIDTHS, THUMB_WIDTHS };
