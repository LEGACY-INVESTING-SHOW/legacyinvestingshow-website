#!/usr/bin/env node

/**
 * Sitemap Generator for Legacy Investing Show
 *
 * Generates an XML sitemap with all pages including blog posts.
 * Run with: node scripts/generate-sitemap.js
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

// Configuration
const SITE_URL = process.env.SITE_URL || 'https://www.legacyinvestingshow.com';
const ROOT_DIR = path.join(__dirname, '..');
const OUTPUT_FILE = path.join(ROOT_DIR, 'sitemap.xml');
const BLOG_CONTENT_DIR = path.join(ROOT_DIR, 'content', 'blog');

// Static pages
// Note: Removed duplicate entries (/index.html and /blog/index) to prevent crawler confusion
// Note: changefreq and priority are ignored by Google, so we only use lastmod
const staticPages = [
  { url: '/' },
  { url: '/about' },
  { url: '/success-stories' },
  { url: '/blog/' },
  { url: '/stacking-presentation/' },
];

// Programmatic SEO directories to scan
const programmaticDirs = [
  'tax-strategies',
  'compare',
];

/**
 * Get current date in W3C format (YYYY-MM-DD)
 */
function getW3CDate(date = new Date()) {
  return date.toISOString().split('T')[0];
}

/**
 * Normalize URL paths to final clean URL format used by Vercel:
 * - keep root as "/"
 * - strip trailing "/index.html"
 * - strip ".html" extension
 * - remove trailing slash (except root)
 */
function normalizePath(rawPath) {
  if (!rawPath) return '/';
  let normalized = rawPath.replace(/\\/g, '/');

  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  normalized = normalized.replace(/\/index\.html$/i, '/');
  normalized = normalized.replace(/\.html$/i, '');

  if (normalized.length > 1) {
    normalized = normalized.replace(/\/+$/, '');
  }

  return normalized || '/';
}

/**
 * Determine whether an HTML page should be included in sitemap.
 * Excludes explicit noindex pages and meta-refresh redirect shims.
 */
function isIndexableHtml(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lowered = content.toLowerCase();

    if (/name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(content)) {
      return false;
    }

    if (/<meta[^>]+http-equiv=["']refresh["']/i.test(content)) {
      return false;
    }

    // Guard against accidental empty shell pages.
    if (!lowered.includes('<title>')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Scan directory for HTML files
 */
function scanDirectory(dir, basePath = '') {
  const files = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(basePath, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules, hidden directories, and other non-content directories
      if (!entry.name.startsWith('.') &&
          entry.name !== 'node_modules' &&
          entry.name !== 'scripts' &&
          entry.name !== 'assets' &&
          entry.name !== 'templates' &&
          entry.name !== 'analysis' &&
          entry.name !== 'plans' &&
          entry.name !== 'content' &&
          entry.name !== 'public') {
        files.push(...scanDirectory(fullPath, relativePath));
      }
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      const stats = fs.statSync(fullPath);
      files.push({
        path: '/' + relativePath.replace(/\\/g, '/'),
        lastmod: getW3CDate(stats.mtime),
      });
    }
  }

  return files;
}

/**
 * Extract image URL from HTML file
 */
function extractImageFromHtml(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    // Try to find og:image meta tag
    const ogImageMatch = content.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    if (ogImageMatch) {
      let imageUrl = ogImageMatch[1];
      // If it's a relative URL, make it absolute
      if (imageUrl.startsWith('/')) {
        imageUrl = `${SITE_URL}${imageUrl}`;
      }
      // Keep image URLs on the same canonical host.
      imageUrl = imageUrl.replace(
        'https://legacyinvestingshow.com',
        'https://www.legacyinvestingshow.com'
      );
      return imageUrl;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Scan blog directory for posts
 */
function scanBlogPosts() {
  const blogDir = path.join(ROOT_DIR, 'blog');
  const posts = [];
  const blogLastmodMap = getBlogLastmodMap();

  if (!fs.existsSync(blogDir)) {
    console.log('Blog directory not found, creating empty blog sitemap entries');
    return posts;
  }

  const entries = fs.readdirSync(blogDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.html') && entry.name !== 'index.html') {
      const fullPath = path.join(blogDir, entry.name);
      if (!isIndexableHtml(fullPath)) continue;
      const stats = fs.statSync(fullPath);
      const imageUrl = extractImageFromHtml(fullPath);
      const slug = entry.name.replace(/\.html$/i, '');
      posts.push({
        url: `/blog/${entry.name}`,
        lastmod: blogLastmodMap.get(slug) || getW3CDate(stats.mtime),
        image: imageUrl,
      });
    }
  }

  return posts;
}

/**
 * Parse a date-like value from frontmatter into YYYY-MM-DD.
 */
function parseFrontmatterDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return getW3CDate(date);
}

/**
 * Build a lookup map of blog slug -> lastmod from markdown frontmatter.
 * Prefers `modifiedDate`, then falls back to `date`.
 */
function getBlogLastmodMap() {
  const lastmodMap = new Map();
  if (!fs.existsSync(BLOG_CONTENT_DIR)) return lastmodMap;

  const entries = fs.readdirSync(BLOG_CONTENT_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    const slug = entry.name.replace(/\.md$/i, '');
    const fullPath = path.join(BLOG_CONTENT_DIR, entry.name);

    try {
      const raw = fs.readFileSync(fullPath, 'utf8');
      const { data } = matter(raw);
      const lastmod = parseFrontmatterDate(data.modifiedDate) || parseFrontmatterDate(data.date);
      if (lastmod) {
        lastmodMap.set(slug, lastmod);
      }
    } catch (error) {
      console.warn(`Could not parse frontmatter for ${entry.name}: ${error.message}`);
    }
  }

  return lastmodMap;
}

/**
 * Scan programmatic SEO directories for pages
 */
function scanProgrammaticPages() {
  const pages = [];

  for (const dirName of programmaticDirs) {
    const dir = path.join(ROOT_DIR, dirName);

    if (!fs.existsSync(dir)) {
      console.log(`Directory ${dirName} not found, skipping`);
      continue;
    }

    // Add index page
    const indexPath = path.join(dir, 'index.html');
    if (fs.existsSync(indexPath)) {
      const stats = fs.statSync(indexPath);
      pages.push({
        url: `/${dirName}/`,
        lastmod: getW3CDate(stats.mtime),
      });
    }

    // Scan for HTML files
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.html') && entry.name !== 'index.html') {
        const fullPath = path.join(dir, entry.name);
        if (!isIndexableHtml(fullPath)) continue;
        const stats = fs.statSync(fullPath);
        pages.push({
          url: `/${dirName}/${entry.name}`,
          lastmod: getW3CDate(stats.mtime),
        });
      } else if (entry.isDirectory()) {
        // Scan subdirectories (e.g., /tax-strategies/for/)
        const subDir = path.join(dir, entry.name);
        const subEntries = fs.readdirSync(subDir, { withFileTypes: true });
        for (const subEntry of subEntries) {
          if (subEntry.isFile() && subEntry.name.endsWith('.html')) {
            const fullPath = path.join(subDir, subEntry.name);
            if (!isIndexableHtml(fullPath)) continue;
            const stats = fs.statSync(fullPath);
            pages.push({
              url: `/${dirName}/${entry.name}/${subEntry.name}`,
              lastmod: getW3CDate(stats.mtime),
            });
          }
        }
      }
    }
  }

  return pages;
}

/**
 * Generate XML sitemap
 */
function generateSitemap() {
  const today = getW3CDate();

  // Collect all URLs
  const urls = [];

  // Add static pages
  for (const page of staticPages) {
    // Skip duplicate index entries
    if (page.url === '/index.html') continue;

    urls.push({
      loc: `${SITE_URL}${normalizePath(page.url)}`,
      lastmod: today,
    });
  }

  // Add blog posts
  const blogPosts = scanBlogPosts();
  for (const post of blogPosts) {
    urls.push({
      loc: `${SITE_URL}${normalizePath(post.url)}`,
      lastmod: post.lastmod,
      image: post.image,
    });
  }

  // Add programmatic SEO pages (tax strategies, etc.)
  const programmaticPages = scanProgrammaticPages();
  for (const page of programmaticPages) {
    urls.push({
      loc: `${SITE_URL}${normalizePath(page.url)}`,
      lastmod: page.lastmod,
    });
  }

  // De-duplicate entries in case multiple sources resolve to same clean URL.
  const deduped = Array.from(
    new Map(urls.map((entry) => [entry.loc, entry])).values()
  );

  // Generate XML with image namespace for enhanced SEO
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
  xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

  for (const url of deduped) {
    xml += '  <url>\n';
    xml += `    <loc>${url.loc}</loc>\n`;
    xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
    // Add image element if available
    if (url.image) {
      xml += '    <image:image>\n';
      xml += `      <image:loc>${url.image}</image:loc>\n`;
      xml += '    </image:image>\n';
    }
    xml += '  </url>\n';
  }

  xml += '</urlset>\n';

  return xml;
}

/**
 * Main function
 */
function main() {
  console.log('Generating sitemap for Legacy Investing Show...');
  console.log(`Site URL: ${SITE_URL}`);
  console.log(`Output: ${OUTPUT_FILE}`);

  try {
    const sitemap = generateSitemap();
    fs.writeFileSync(OUTPUT_FILE, sitemap, 'utf8');
    console.log('Sitemap generated successfully!');

    // Count URLs
    const urlCount = (sitemap.match(/<url>/g) || []).length;
    console.log(`Total URLs in sitemap: ${urlCount}`);
  } catch (error) {
    console.error('Error generating sitemap:', error.message);
    process.exit(1);
  }
}

main();
