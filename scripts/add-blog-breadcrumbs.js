#!/usr/bin/env node
/**
 * Add breadcrumbs to blog posts
 */

const fs = require('fs');
const path = require('path');

const WEBSITE_DIR = '/home/clawd/legacyinvestingshow-website';
const BLOG_DIR = path.join(WEBSITE_DIR, 'blog');

// Breadcrumb HTML template for blog posts
function getBreadcrumbHtml(postTitle) {
  return `
    <!-- Breadcrumb Navigation -->
    <nav aria-label="Breadcrumb" class="container-custom pt-24 pb-4">
        <ol class="breadcrumb" itemscope itemtype="https://schema.org/BreadcrumbList">
            <li class="breadcrumb__item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                <a href="/" class="breadcrumb__link" itemprop="item"><span itemprop="name">Home</span></a>
                <meta itemprop="position" content="1" />
            </li>
            <li class="breadcrumb__item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                <a href="/blog/" class="breadcrumb__link" itemprop="item"><span itemprop="name">Blog</span></a>
                <meta itemprop="position" content="2" />
            </li>
            <li class="breadcrumb__item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                <span class="breadcrumb__current" itemprop="name">${postTitle.substring(0, 50)}${postTitle.length > 50 ? '...' : ''}</span>
                <meta itemprop="position" content="3" />
            </li>
        </ol>
    </nav>`;
}

// Schema template
function getSchemaJson(postTitle, postUrl) {
  return `
    <!-- BreadcrumbList Schema -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://legacyinvestingshow.com/"
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": "Blog",
                "item": "https://legacyinvestingshow.com/blog/"
            },
            {
                "@type": "ListItem",
                "position": 3,
                "name": "${postTitle.replace(/"/g, '\\"')}"
            }
        ]
    }
    </script>`;
}

function getPageTitle(content) {
  const match = content.match(/<title>([^<]+)<\/title>/);
  if (match) {
    return match[1].replace(' | Legacy Investing Show', '').trim();
  }
  return '';
}

function hasVisibleBreadcrumbs(content) {
  return content.includes('class="breadcrumb"') || content.includes("class='breadcrumb'");
}

function hasBreadcrumbSchema(content) {
  return content.includes('BreadcrumbList');
}

function insertAfterHeader(content, html) {
  // Try various patterns to find insertion point
  const patterns = [
    { regex: /(<\/header>)(?!.*<\/header>)/s, replacement: `$1${html}` },
    { regex: /(<main[^>]*>)/, replacement: `${html}$1` },
    { regex: /(<body[^>]*>)/, replacement: `$1${html}` }
  ];
  
  for (const pattern of patterns) {
    if (pattern.regex.test(content)) {
      return content.replace(pattern.regex, pattern.replacement);
    }
  }
  return content;
}

function insertSchemaBeforeHead(content, schema) {
  return content.replace(/(<\/head>)/, `${schema}$1`);
}

function processBlogPost(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  const title = getPageTitle(content);
  if (!title) return { modified: false, reason: 'no title' };
  
  // Add schema if missing
  if (!hasBreadcrumbSchema(content)) {
    const schema = getSchemaJson(title, '');
    content = insertSchemaBeforeHead(content, schema);
    modified = true;
  }
  
  // Add visible breadcrumbs if missing
  if (!hasVisibleBreadcrumbs(content)) {
    const breadcrumbHtml = getBreadcrumbHtml(title);
    content = insertAfterHeader(content, breadcrumbHtml);
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    return { modified: true, title: path.basename(filePath) };
  }
  
  return { modified: false, reason: 'already has breadcrumbs' };
}

// Main
const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.html') && f !== 'index.html');
console.log(`Processing ${files.length} blog posts...\n`);

const results = { modified: [], skipped: [] };

for (const file of files) {
  const filePath = path.join(BLOG_DIR, file);
  const result = processBlogPost(filePath);
  
  if (result.modified) {
    results.modified.push(file);
    console.log(`✓ ${file}`);
  } else {
    results.skipped.push({ file, reason: result.reason });
  }
}

console.log(`\n=== SUMMARY ===`);
console.log(`Modified: ${results.modified.length}`);
console.log(`Skipped: ${results.skipped.length}`);
