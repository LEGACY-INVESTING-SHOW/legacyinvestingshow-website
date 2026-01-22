#!/usr/bin/env node

/**
 * Image Optimization Script for Legacy Investing Show
 *
 * This script optimizes images by creating WebP and AVIF versions,
 * optionally resizing large images, and generating a manifest file.
 *
 * Usage: node scripts/optimize-images.js [options]
 *
 * Options:
 *   --thumbnails    Process images as thumbnails (max 800px width)
 *   --dry-run       Show what would be done without actually processing
 *   --force         Overwrite existing optimized images
 */

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  inputDir: path.join(__dirname, '..', 'assets', 'images'),
  outputDir: path.join(__dirname, '..', 'assets', 'images', 'optimized'),
  manifestPath: path.join(__dirname, '..', 'assets', 'images', 'manifest.json'),
  supportedExtensions: ['.jpg', '.jpeg', '.png'],
  // Responsive image sizes for srcset
  responsiveSizes: [400, 800, 1200],
  maxWidth: {
    regular: 1920,
    thumbnail: 800
  },
  quality: {
    webp: 80,
    avif: 60,
    jpg: 80
  }
};

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  thumbnails: args.includes('--thumbnails'),
  dryRun: args.includes('--dry-run'),
  force: args.includes('--force')
};

// Utility functions
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function calculateSavings(original, optimized) {
  const savings = original - optimized;
  const percentage = ((savings / original) * 100).toFixed(1);
  return { savings, percentage };
}

async function ensureDirectoryExists(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

async function getFileSize(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all image files from the input directory recursively
 */
async function getImageFiles(dir, baseDir = dir) {
  const images = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip the optimized directory to avoid processing already optimized images
      if (entry.isDirectory()) {
        if (entry.name === 'optimized') continue;
        const subImages = await getImageFiles(fullPath, baseDir);
        images.push(...subImages);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (CONFIG.supportedExtensions.includes(ext)) {
          const relativePath = path.relative(baseDir, fullPath);
          images.push({
            absolutePath: fullPath,
            relativePath: relativePath,
            filename: entry.name,
            extension: ext
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }

  return images;
}

/**
 * Process a single image file - generates multiple sizes in WebP, AVIF, and JPG formats
 */
async function processImage(imageInfo, manifest) {
  const { absolutePath, relativePath, filename } = imageInfo;
  const baseName = path.basename(filename, imageInfo.extension);
  const relativeDir = path.dirname(relativePath);

  // Determine output directory (preserve subdirectory structure)
  const outputSubDir = relativeDir === '.'
    ? CONFIG.outputDir
    : path.join(CONFIG.outputDir, relativeDir);

  await ensureDirectoryExists(outputSubDir);

  // Check if we should generate responsive sizes
  const generateResponsive = args.includes('--responsive');

  if (options.dryRun) {
    console.log(`  [DRY RUN] Would process: ${filename}`);
    if (generateResponsive) {
      CONFIG.responsiveSizes.forEach(size => {
        console.log(`    -> ${baseName}-${size}.webp, .avif, .jpg`);
      });
    }
    return { dryRun: true };
  }

  const originalSize = await getFileSize(absolutePath);
  const maxWidth = options.thumbnails ? CONFIG.maxWidth.thumbnail : CONFIG.maxWidth.regular;

  console.log(`\n  Processing: ${filename}`);
  console.log(`    Original size: ${formatBytes(originalSize)}`);

  try {
    // Load the image and get metadata
    const image = sharp(absolutePath);
    const metadata = await image.metadata();

    let totalWebpSize = 0;
    let totalAvifSize = 0;
    const generatedFiles = {};

    if (generateResponsive) {
      // Generate responsive sizes
      for (const width of CONFIG.responsiveSizes) {
        // Skip sizes larger than the original image
        if (width > metadata.width) continue;

        const resizeOptions = { width, withoutEnlargement: true };

        // WebP
        const webpPath = path.join(outputSubDir, `${baseName}-${width}.webp`);
        await sharp(absolutePath)
          .resize(resizeOptions)
          .webp({ quality: CONFIG.quality.webp })
          .toFile(webpPath);
        const webpSize = await getFileSize(webpPath);
        totalWebpSize += webpSize;

        // AVIF
        const avifPath = path.join(outputSubDir, `${baseName}-${width}.avif`);
        await sharp(absolutePath)
          .resize(resizeOptions)
          .avif({ quality: CONFIG.quality.avif })
          .toFile(avifPath);
        const avifSize = await getFileSize(avifPath);
        totalAvifSize += avifSize;

        // JPG fallback
        const jpgPath = path.join(outputSubDir, `${baseName}-${width}.jpg`);
        await sharp(absolutePath)
          .resize(resizeOptions)
          .jpeg({ quality: CONFIG.quality.jpg })
          .toFile(jpgPath);

        generatedFiles[width] = {
          webp: path.relative(CONFIG.inputDir, webpPath),
          avif: path.relative(CONFIG.inputDir, avifPath),
          jpg: path.relative(CONFIG.inputDir, jpgPath)
        };

        console.log(`    ${width}px: WebP ${formatBytes(webpSize)}, AVIF ${formatBytes(avifSize)}`);
      }

      // Add to manifest with responsive info
      manifest[relativePath] = {
        original: relativePath,
        responsive: generatedFiles,
        dimensions: {
          original: { width: metadata.width, height: metadata.height }
        },
        sizes: {
          original: originalSize,
          totalWebp: totalWebpSize,
          totalAvif: totalAvifSize
        }
      };

    } else {
      // Standard single-size optimization (original behavior)
      const outputPaths = {
        webp: path.join(outputSubDir, `${baseName}.webp`),
        avif: path.join(outputSubDir, `${baseName}.avif`)
      };

      // Check if files already exist and skip if not forcing
      if (!options.force) {
        const webpExists = await fileExists(outputPaths.webp);
        const avifExists = await fileExists(outputPaths.avif);

        if (webpExists && avifExists) {
          console.log(`  Skipping ${filename} (already optimized, use --force to regenerate)`);

          const webpSize = await getFileSize(outputPaths.webp);
          const avifSize = await getFileSize(outputPaths.avif);

          manifest[relativePath] = {
            original: relativePath,
            webp: path.relative(CONFIG.inputDir, outputPaths.webp),
            avif: path.relative(CONFIG.inputDir, outputPaths.avif),
            sizes: {
              original: originalSize,
              webp: webpSize,
              avif: avifSize
            }
          };

          return { skipped: true };
        }
      }

      const needsResize = metadata.width > maxWidth;
      const resizeOptions = needsResize ? { width: maxWidth, withoutEnlargement: true } : null;

      if (needsResize) {
        console.log(`    Resizing from ${metadata.width}px to ${maxWidth}px width`);
      }

      // Create WebP version
      let webpPipeline = sharp(absolutePath);
      if (resizeOptions) {
        webpPipeline = webpPipeline.resize(resizeOptions);
      }
      await webpPipeline
        .webp({ quality: CONFIG.quality.webp })
        .toFile(outputPaths.webp);

      const webpSize = await getFileSize(outputPaths.webp);
      const webpSavings = calculateSavings(originalSize, webpSize);
      console.log(`    WebP: ${formatBytes(webpSize)} (${webpSavings.percentage}% savings)`);

      // Create AVIF version
      let avifPipeline = sharp(absolutePath);
      if (resizeOptions) {
        avifPipeline = avifPipeline.resize(resizeOptions);
      }
      await avifPipeline
        .avif({ quality: CONFIG.quality.avif })
        .toFile(outputPaths.avif);

      const avifSize = await getFileSize(outputPaths.avif);
      const avifSavings = calculateSavings(originalSize, avifSize);
      console.log(`    AVIF: ${formatBytes(avifSize)} (${avifSavings.percentage}% savings)`);

      totalWebpSize = webpSize;
      totalAvifSize = avifSize;

      // Add to manifest
      manifest[relativePath] = {
        original: relativePath,
        webp: path.relative(CONFIG.inputDir, outputPaths.webp),
        avif: path.relative(CONFIG.inputDir, outputPaths.avif),
        dimensions: {
          original: { width: metadata.width, height: metadata.height },
          optimized: needsResize
            ? { width: maxWidth, height: Math.round(metadata.height * (maxWidth / metadata.width)) }
            : { width: metadata.width, height: metadata.height }
        },
        sizes: {
          original: originalSize,
          webp: webpSize,
          avif: avifSize
        },
        savings: {
          webp: { bytes: webpSavings.savings, percentage: webpSavings.percentage },
          avif: { bytes: avifSavings.savings, percentage: avifSavings.percentage }
        }
      };
    }

    return {
      success: true,
      originalSize,
      webpSize: totalWebpSize,
      avifSize: totalAvifSize
    };

  } catch (error) {
    console.error(`    ERROR: ${error.message}`);
    manifest[relativePath] = {
      original: relativePath,
      error: error.message
    };
    return { error: error.message };
  }
}

/**
 * Main function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Legacy Investing Show - Image Optimization Script');
  console.log('='.repeat(60));

  if (options.dryRun) {
    console.log('\n[DRY RUN MODE - No files will be created]\n');
  }

  if (options.thumbnails) {
    console.log(`Mode: Thumbnails (max width: ${CONFIG.maxWidth.thumbnail}px)`);
  } else {
    console.log(`Mode: Regular (max width: ${CONFIG.maxWidth.regular}px)`);
  }

  console.log(`WebP quality: ${CONFIG.quality.webp}`);
  console.log(`AVIF quality: ${CONFIG.quality.avif}`);
  console.log(`Input directory: ${CONFIG.inputDir}`);
  console.log(`Output directory: ${CONFIG.outputDir}`);

  // Ensure input directory exists
  try {
    await fs.access(CONFIG.inputDir);
  } catch {
    console.error(`\nError: Input directory does not exist: ${CONFIG.inputDir}`);
    console.log('Please create the directory and add images to optimize.');
    process.exit(1);
  }

  // Ensure output directory exists
  await ensureDirectoryExists(CONFIG.outputDir);

  // Get all image files
  console.log('\nScanning for images...');
  const images = await getImageFiles(CONFIG.inputDir);

  if (images.length === 0) {
    console.log('\nNo images found to optimize.');
    console.log(`Supported formats: ${CONFIG.supportedExtensions.join(', ')}`);
    process.exit(0);
  }

  console.log(`Found ${images.length} image(s) to process.`);

  // Process images and build manifest
  const manifest = {
    generated: new Date().toISOString(),
    config: {
      webpQuality: CONFIG.quality.webp,
      avifQuality: CONFIG.quality.avif,
      maxWidth: options.thumbnails ? CONFIG.maxWidth.thumbnail : CONFIG.maxWidth.regular
    },
    images: {}
  };

  let totalOriginal = 0;
  let totalWebp = 0;
  let totalAvif = 0;
  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const imageInfo of images) {
    const result = await processImage(imageInfo, manifest.images);

    if (result.skipped) {
      skipped++;
      totalOriginal += manifest.images[imageInfo.relativePath].sizes.original;
      totalWebp += manifest.images[imageInfo.relativePath].sizes.webp;
      totalAvif += manifest.images[imageInfo.relativePath].sizes.avif;
    } else if (result.success) {
      processed++;
      totalOriginal += result.originalSize;
      totalWebp += result.webpSize;
      totalAvif += result.avifSize;
    } else if (result.error) {
      errors++;
    }
  }

  // Save manifest
  if (!options.dryRun) {
    manifest.summary = {
      totalImages: images.length,
      processed,
      skipped,
      errors,
      totalSizes: {
        original: totalOriginal,
        webp: totalWebp,
        avif: totalAvif
      },
      totalSavings: {
        webp: {
          bytes: totalOriginal - totalWebp,
          percentage: totalOriginal > 0 ? ((totalOriginal - totalWebp) / totalOriginal * 100).toFixed(1) : 0
        },
        avif: {
          bytes: totalOriginal - totalAvif,
          percentage: totalOriginal > 0 ? ((totalOriginal - totalAvif) / totalOriginal * 100).toFixed(1) : 0
        }
      }
    };

    await fs.writeFile(CONFIG.manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`\nManifest saved to: ${CONFIG.manifestPath}`);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total images found: ${images.length}`);
  console.log(`  Processed: ${processed}`);
  console.log(`  Skipped (already optimized): ${skipped}`);
  console.log(`  Errors: ${errors}`);

  if (totalOriginal > 0) {
    console.log('\nSize Comparison:');
    console.log(`  Original total: ${formatBytes(totalOriginal)}`);
    console.log(`  WebP total:     ${formatBytes(totalWebp)} (${((totalOriginal - totalWebp) / totalOriginal * 100).toFixed(1)}% savings)`);
    console.log(`  AVIF total:     ${formatBytes(totalAvif)} (${((totalOriginal - totalAvif) / totalOriginal * 100).toFixed(1)}% savings)`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Done!');

  if (errors > 0) {
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
