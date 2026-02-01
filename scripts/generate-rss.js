#!/usr/bin/env node

/**
 * RSS Feed Generator for Legacy Investing Show
 *
 * Generates an RSS 2.0 feed for blog posts.
 * Run with: node scripts/generate-rss.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SITE_URL = process.env.SITE_URL || 'https://legacyinvestingshow-website.vercel.app';
const ROOT_DIR = path.join(__dirname, '..');
const BLOG_DIR = path.join(ROOT_DIR, 'blog');
const OUTPUT_FILE = path.join(ROOT_DIR, 'feed.xml');

// Feed metadata
const FEED_TITLE = 'Legacy Investing Show Blog';
const FEED_DESCRIPTION = 'Learn Airbnb arbitrage, short-term rental investing, and passive income strategies from Legacy Investing Show.';
const FEED_LANGUAGE = 'en-us';
const FEED_CATEGORY = 'Business/Investing';
const FEED_MANAGING_EDITOR = 'info@legacyinvestingshow.com (Preston Seo)';
const FEED_WEBMASTER = 'info@legacyinvestingshow.com (Legacy Investing Show)';

/**
 * Get RFC 822 formatted date
 */
function getRFC822Date(date = new Date()) {
  return date.toUTCString();
}

/**
 * Escape XML special characters
 */
function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Extract metadata from HTML file
 */
function extractPostMetadata(filePath, fileName) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const stats = fs.statSync(filePath);

    // Extract title from <title> tag or <h1>
    let title = fileName.replace('.html', '').replace(/-/g, ' ');
    const titleMatch = content.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
      title = titleMatch[1].replace(' | Legacy Investing Show', '').trim();
    }

    // Extract description from meta description
    let description = '';
    const descMatch = content.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    if (descMatch) {
      description = descMatch[1];
    }

    // Extract publication date from meta tag or use file modification date
    let pubDate = stats.mtime;
    const dateMatch = content.match(/<meta\s+name=["']date["']\s+content=["']([^"']+)["']/i) ||
                      content.match(/<meta\s+property=["']article:published_time["']\s+content=["']([^"']+)["']/i);
    if (dateMatch) {
      pubDate = new Date(dateMatch[1]);
    }

    // Extract author
    let author = 'Preston Seo';
    const authorMatch = content.match(/<meta\s+name=["']author["']\s+content=["']([^"']+)["']/i);
    if (authorMatch) {
      author = authorMatch[1];
    }

    return {
      title,
      description,
      pubDate,
      author,
      link: `${SITE_URL}/blog/${fileName}`,
      guid: `${SITE_URL}/blog/${fileName}`,
    };
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Scan blog directory for posts
 */
function scanBlogPosts() {
  const posts = [];

  if (!fs.existsSync(BLOG_DIR)) {
    console.log('Blog directory not found. Creating empty RSS feed.');
    return posts;
  }

  const entries = fs.readdirSync(BLOG_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.html') && entry.name !== 'index.html') {
      const fullPath = path.join(BLOG_DIR, entry.name);
      const metadata = extractPostMetadata(fullPath, entry.name);
      if (metadata) {
        posts.push(metadata);
      }
    }
  }

  // Sort by publication date (newest first)
  posts.sort((a, b) => b.pubDate - a.pubDate);

  return posts;
}

/**
 * Generate RSS 2.0 feed
 */
function generateRSSFeed() {
  const posts = scanBlogPosts();
  const buildDate = getRFC822Date();

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n';
  xml += '  <channel>\n';

  // Channel metadata
  xml += `    <title>${escapeXml(FEED_TITLE)}</title>\n`;
  xml += `    <link>${SITE_URL}</link>\n`;
  xml += `    <description>${escapeXml(FEED_DESCRIPTION)}</description>\n`;
  xml += `    <language>${FEED_LANGUAGE}</language>\n`;
  xml += `    <category>${escapeXml(FEED_CATEGORY)}</category>\n`;
  xml += `    <managingEditor>${escapeXml(FEED_MANAGING_EDITOR)}</managingEditor>\n`;
  xml += `    <webMaster>${escapeXml(FEED_WEBMASTER)}</webMaster>\n`;
  xml += `    <lastBuildDate>${buildDate}</lastBuildDate>\n`;
  xml += `    <generator>Legacy Investing Show RSS Generator</generator>\n`;
  xml += `    <docs>https://www.rssboard.org/rss-specification</docs>\n`;
  xml += `    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>\n`;

  // Image (logo)
  xml += '    <image>\n';
  xml += `      <url>${SITE_URL}/assets/images/logo.png</url>\n`;
  xml += `      <title>${escapeXml(FEED_TITLE)}</title>\n`;
  xml += `      <link>${SITE_URL}</link>\n`;
  xml += '    </image>\n';

  // Blog post items
  for (const post of posts) {
    xml += '    <item>\n';
    xml += `      <title>${escapeXml(post.title)}</title>\n`;
    xml += `      <link>${post.link}</link>\n`;
    xml += `      <description>${escapeXml(post.description)}</description>\n`;
    xml += `      <author>${escapeXml(post.author)}</author>\n`;
    xml += `      <pubDate>${getRFC822Date(post.pubDate)}</pubDate>\n`;
    xml += `      <guid isPermaLink="true">${post.guid}</guid>\n`;
    xml += '    </item>\n';
  }

  // If no posts, add a placeholder item
  if (posts.length === 0) {
    xml += '    <!-- No blog posts found. Add HTML files to the /blog directory. -->\n';
  }

  xml += '  </channel>\n';
  xml += '</rss>\n';

  return xml;
}

/**
 * Main function
 */
function main() {
  console.log('Generating RSS feed for Legacy Investing Show...');
  console.log(`Site URL: ${SITE_URL}`);
  console.log(`Blog directory: ${BLOG_DIR}`);
  console.log(`Output: ${OUTPUT_FILE}`);

  try {
    const feed = generateRSSFeed();
    fs.writeFileSync(OUTPUT_FILE, feed, 'utf8');
    console.log('RSS feed generated successfully!');

    // Count items
    const itemCount = (feed.match(/<item>/g) || []).length;
    console.log(`Total items in feed: ${itemCount}`);
  } catch (error) {
    console.error('Error generating RSS feed:', error.message);
    process.exit(1);
  }
}

main();
