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
const PAGE_SITEMAP_FILE = path.join(ROOT_DIR, 'sitemap-pages.xml');
const BLOG_SITEMAP_FILE = path.join(ROOT_DIR, 'sitemap-blog.xml');
const BLOG_CONTENT_DIR = path.join(ROOT_DIR, 'content', 'blog');

// Static pages
// Note: Removed duplicate entries (/index.html and /blog/index) to prevent crawler confusion
// Note: changefreq and priority are ignored by Google, so we only use lastmod
const staticPages = [
  { url: '/', file: 'index.html' },
  { url: '/about', file: 'about.html' },
  { url: '/about/preston-seo', file: 'about/preston-seo.html' },
  { url: '/success-stories', file: 'success-stories.html' },
  { url: '/reviews', file: 'reviews.html' },
  { url: '/blog/', file: 'blog/index.html' },
  { url: '/tax-strategies-101', file: 'tax-strategies-101.html' },
];

const resourceDirs = [
  'tax-strategies',
  'retirement',
  'compare',
  'topics',
  'tools',
];

/**
 * Get current date in W3C format (YYYY-MM-DD)
 */
function getW3CDate(date = new Date()) {
  return date.toISOString().split('T')[0];
}

/**
 * Get a file-backed lastmod date when the page exists locally.
 */
function getFileLastmod(relativePath) {
  if (!relativePath) return getW3CDate();

  const filePath = path.join(ROOT_DIR, relativePath);
  if (!fs.existsSync(filePath)) return getW3CDate();

  return getW3CDate(fs.statSync(filePath).mtime);
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
 * Every clean URL that vercel.json permanently redirects away.
 *
 * A sitemap must never advertise a redirect source (removed worksheets, the
 * duplicate /tax-strategies/1031-exchange-vs-opportunity-zones, the
 * health-savings-account-strategy stub). If the stale HTML file is still on
 * disk when the sitemap is built, this is what keeps it out.
 */
function getRedirectSources() {
  const sources = new Set();
  try {
    const config = JSON.parse(
      fs.readFileSync(path.join(ROOT_DIR, 'vercel.json'), 'utf8')
    );
    for (const redirect of config.redirects || []) {
      const source = String(redirect.source || '');
      // Parameterised sources (/worksheets/:slug*) cover a whole subtree.
      if (source.includes(':') || source.includes('(')) {
        const prefix = source.split(/[:(]/)[0].replace(/\/+$/, '');
        if (prefix.length > 1) sources.add(`${prefix}/*`);
        continue;
      }
      sources.add(normalizePath(source));
    }
  } catch (error) {
    console.warn(`Could not read redirects from vercel.json: ${error.message}`);
  }
  return sources;
}

const REDIRECT_SOURCES = getRedirectSources();

function isRedirected(cleanUrl) {
  if (REDIRECT_SOURCES.has(cleanUrl)) return true;
  for (const source of REDIRECT_SOURCES) {
    if (source.endsWith('/*') && cleanUrl.startsWith(source.slice(0, -1))) {
      return true;
    }
  }
  return false;
}

/**
 * A redirect wins over a static file on Vercel, so any page still sitting at a
 * redirect source is unreachable. Name them: either the file should go, or the
 * redirect should.
 */
function warnAboutShadowedPages(cleanUrls) {
  const shadowed = cleanUrls.filter(isRedirected);
  if (!shadowed.length) return;
  console.warn(
    `${shadowed.length} page(s) excluded because vercel.json redirects their URL:`
  );
  for (const url of shadowed) console.warn(`  ${url}`);
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
          entry.name !== 'lx' &&
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
 * Scan generated crawlable blog archive pages such as /blog/category/tax-strategies.
 */
function scanBlogArchivePages() {
  const archivePages = [];
  const categoryDir = path.join(ROOT_DIR, 'blog', 'category');

  if (!fs.existsSync(categoryDir)) {
    return archivePages;
  }

  const entries = fs.readdirSync(categoryDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.html')) continue;

    const fullPath = path.join(categoryDir, entry.name);
    if (!isIndexableHtml(fullPath)) continue;

    archivePages.push({
      url: `/blog/category/${entry.name}`,
      lastmod: getW3CDate(fs.statSync(fullPath).mtime),
    });
  }

  return archivePages;
}

/**
 * Scan generated blog pagination pages (/blog/page/2, /blog/page/3, ...).
 */
function scanBlogPaginationPages() {
  const pages = [];
  const pageDir = path.join(ROOT_DIR, 'blog', 'page');

  if (!fs.existsSync(pageDir)) {
    return pages;
  }

  const entries = fs.readdirSync(pageDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.html')) continue;

    const fullPath = path.join(pageDir, entry.name);
    if (!isIndexableHtml(fullPath)) continue;

    pages.push({
      url: `/blog/page/${entry.name}`,
      lastmod: getW3CDate(fs.statSync(fullPath).mtime),
    });
  }

  // /blog/page/2 before /blog/page/10.
  pages.sort((a, b) => {
    const num = url => Number((url.match(/\/(\d+)\.html$/) || [])[1] || 0);
    return num(a.url) - num(b.url);
  });

  return pages;
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
      const data = matter(raw).data;
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

function scanResourcePages() {
  const pages = [];

  for (const dirName of resourceDirs) {
    const dir = path.join(ROOT_DIR, dirName);

    if (!fs.existsSync(dir)) {
      console.log(`Directory ${dirName} not found, skipping`);
      continue;
    }

    // Add index page
    const indexPath = path.join(dir, 'index.html');
    if (fs.existsSync(indexPath) && isIndexableHtml(indexPath)) {
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
function buildSitemapUrlSet(urls) {
  // De-duplicate entries in case multiple sources resolve to same clean URL.
  const deduped = Array.from(
    new Map(urls.map((entry) => [entry.loc, entry])).values()
  );

  const cleanUrls = deduped.map((entry) => entry.loc.replace(SITE_URL, '') || '/');
  warnAboutShadowedPages(cleanUrls);
  const included = deduped.filter(
    (entry, index) => !isRedirected(cleanUrls[index])
  );

  // Generate XML with image namespace for enhanced SEO
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
  xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

  for (const url of included) {
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
 * Generate a sitemap index that points crawlers to section-level sitemaps.
 */
function buildSitemapIndex(sitemaps) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const sitemap of sitemaps) {
    xml += '  <sitemap>\n';
    xml += `    <loc>${sitemap.loc}</loc>\n`;
    xml += `    <lastmod>${sitemap.lastmod}</lastmod>\n`;
    xml += '  </sitemap>\n';
  }

  xml += '</sitemapindex>\n';

  return xml;
}

function getLatestLastmod(urls) {
  return urls.reduce((latest, url) => {
    if (!url.lastmod) return latest;
    return url.lastmod > latest ? url.lastmod : latest;
  }, '1970-01-01');
}

/**
 * Generate XML sitemaps.
 */
function generateSitemaps() {
  const pageUrls = [];
  const blogUrls = [];

  // Add static pages to the page sitemap.
  for (const page of staticPages) {
    // Skip duplicate index entries
    if (page.url === '/index.html') continue;

    pageUrls.push({
      loc: `${SITE_URL}${normalizePath(page.url)}`,
      lastmod: getFileLastmod(page.file),
    });
  }

  // Add blog posts to the blog sitemap.
  const blogArchivePages = scanBlogArchivePages();
  for (const page of blogArchivePages) {
    blogUrls.push({
      loc: `${SITE_URL}${normalizePath(page.url)}`,
      lastmod: page.lastmod,
    });
  }

  const blogPaginationPages = scanBlogPaginationPages();
  for (const page of blogPaginationPages) {
    blogUrls.push({
      loc: `${SITE_URL}${normalizePath(page.url)}`,
      lastmod: page.lastmod,
    });
  }

  const blogPosts = scanBlogPosts();
  for (const post of blogPosts) {
    blogUrls.push({
      loc: `${SITE_URL}${normalizePath(post.url)}`,
      lastmod: post.lastmod,
      image: post.image,
    });
  }

  const resourcePages = scanResourcePages();
  for (const page of resourcePages) {
    pageUrls.push({
      loc: `${SITE_URL}${normalizePath(page.url)}`,
      lastmod: page.lastmod,
    });
  }

  const sitemapIndex = buildSitemapIndex([
    {
      loc: `${SITE_URL}/sitemap-pages.xml`,
      lastmod: getLatestLastmod(pageUrls),
    },
    {
      loc: `${SITE_URL}/sitemap-blog.xml`,
      lastmod: getLatestLastmod(blogUrls),
    },
  ]);

  return {
    index: sitemapIndex,
    pages: buildSitemapUrlSet(pageUrls),
    blog: buildSitemapUrlSet(blogUrls),
  };
}

/**
 * Main function
 */
function main() {
  console.log('Generating sitemap for Legacy Investing Show...');
  console.log(`Site URL: ${SITE_URL}`);
  console.log(`Output: ${OUTPUT_FILE}`);

  try {
    const sitemaps = generateSitemaps();
    fs.writeFileSync(OUTPUT_FILE, sitemaps.index, 'utf8');
    fs.writeFileSync(PAGE_SITEMAP_FILE, sitemaps.pages, 'utf8');
    fs.writeFileSync(BLOG_SITEMAP_FILE, sitemaps.blog, 'utf8');
    console.log('Sitemap generated successfully!');

    // Count URLs
    const pageUrlCount = (sitemaps.pages.match(/<url>/g) || []).length;
    const blogUrlCount = (sitemaps.blog.match(/<url>/g) || []).length;
    console.log(`Page sitemap URLs: ${pageUrlCount}`);
    console.log(`Blog sitemap URLs: ${blogUrlCount}`);
  } catch (error) {
    console.error('Error generating sitemap:', error.message);
    process.exit(1);
  }
}

if (require.main === module) main();
