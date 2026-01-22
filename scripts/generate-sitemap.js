#!/usr/bin/env node

/**
 * Sitemap Generator for Legacy Investing Show
 *
 * Generates an XML sitemap with all pages including blog posts.
 * Run with: node scripts/generate-sitemap.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SITE_URL = process.env.SITE_URL || 'https://legacyinvestingshow.com';
const ROOT_DIR = path.join(__dirname, '..');
const OUTPUT_FILE = path.join(ROOT_DIR, 'sitemap.xml');

// Static pages with their priorities and change frequencies
// Note: Removed duplicate entries (/index.html and /blog/index.html) to prevent crawler confusion
const staticPages = [
  { url: '/', priority: '1.0', changefreq: 'weekly' },
  { url: '/about.html', priority: '0.8', changefreq: 'monthly' },
  { url: '/programs.html', priority: '0.9', changefreq: 'weekly' },
  { url: '/success-stories.html', priority: '0.8', changefreq: 'weekly' },
  { url: '/blog/', priority: '0.8', changefreq: 'daily' },
];

/**
 * Get current date in W3C format (YYYY-MM-DD)
 */
function getW3CDate(date = new Date()) {
  return date.toISOString().split('T')[0];
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

  if (!fs.existsSync(blogDir)) {
    console.log('Blog directory not found, creating empty blog sitemap entries');
    return posts;
  }

  const entries = fs.readdirSync(blogDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.html') && entry.name !== 'index.html') {
      const fullPath = path.join(blogDir, entry.name);
      const stats = fs.statSync(fullPath);
      const imageUrl = extractImageFromHtml(fullPath);
      posts.push({
        url: `/blog/${entry.name}`,
        priority: '0.7',
        changefreq: 'monthly',
        lastmod: getW3CDate(stats.mtime),
        image: imageUrl,
      });
    }
  }

  return posts;
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
      loc: `${SITE_URL}${page.url}`,
      lastmod: today,
      changefreq: page.changefreq,
      priority: page.priority,
    });
  }

  // Add blog posts
  const blogPosts = scanBlogPosts();
  for (const post of blogPosts) {
    urls.push({
      loc: `${SITE_URL}${post.url}`,
      lastmod: post.lastmod,
      changefreq: post.changefreq,
      priority: post.priority,
      image: post.image,
    });
  }

  // Generate XML with image namespace for enhanced SEO
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
  xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

  for (const url of urls) {
    xml += '  <url>\n';
    xml += `    <loc>${url.loc}</loc>\n`;
    xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
    xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
    xml += `    <priority>${url.priority}</priority>\n`;
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
