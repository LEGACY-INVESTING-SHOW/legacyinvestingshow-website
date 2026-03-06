#!/usr/bin/env node

/**
 * Ensure analytics/search-verification tags and baseline SEO meta are present.
 *
 * Rules:
 * - If a page has GA gtag snippet but no GTM loader, inject GTM script.
 * - If a page has GTM loader but no noscript iframe, inject noscript after <body>.
 * - Ensure viewport, robots, canonical, and verification meta exist.
 * - Normalize meta description whitespace and demote extra <h1> tags to <h2>.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const GA_TRACKING_ID = process.env.GA_TRACKING_ID || 'G-2578PT1WSS';
const GTM_CONTAINER_ID = process.env.GTM_CONTAINER_ID || 'GTM-KQ4R2LKP';
const SITE_URL = process.env.SITE_URL || 'https://www.legacyinvestingshow.com';
const GOOGLE_SITE_VERIFICATIONS = [
  'Kec6RfGhFL-qG_8zKxCqt7yxjgy65WeDAftCBm90G2s',
  '92MoCnkdQOj_ey1lEafT5Mz-znCcCQ3UABZlI-JG_nM',
];

const SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  '.vercel',
  '.checkpoints',
  '.claude',
  'analysis',
  'backups',
  'cms',
  'docs',
  'plans',
  'screenshots',
  'todos',
]);

function walkHtmlFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        files.push(...walkHtmlFiles(fullPath));
      }
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }
  return files;
}

function normalizeMetaText(text) {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
}

function getTitle(content) {
  const match = content.match(/<title>([^<]*)<\/title>/i);
  return match ? match[1].replace(/\s+/g, ' ').trim() : '';
}

function getMetaContent(content, name, attr = 'name') {
  const regex = new RegExp(
    `<meta\\s+${attr}=["']${name}["']\\s+content=["']([^"']*)["'][^>]*>`,
    'i'
  );
  const match = content.match(regex);
  return match ? match[1].replace(/\s+/g, ' ').trim() : '';
}

function ensureTitleLength(content) {
  const match = content.match(/<title>([^<]*)<\/title>/i);
  if (!match) return content;

  const currentTitle = match[1].replace(/\s+/g, ' ').trim();
  if (!currentTitle || currentTitle.length >= 30) return content;
  const baseTitle = currentTitle.replace(/\s*\|\s*Legacy Investing Show/i, '').trim() || 'Legacy Investing';
  const fallbackPrefix = baseTitle.toLowerCase() === 'blog' ? 'Investing Blog' : baseTitle;
  const nextTitle = `${fallbackPrefix} | Legacy Investing Show`;
  return content.replace(match[0], `<title>${nextTitle}</title>`);
}

function expandTitleFromOg(content) {
  const titleMatch = content.match(/<title>([^<]*)<\/title>/i);
  if (!titleMatch) return content;

  const currentTitle = titleMatch[1].replace(/\s+/g, ' ').trim();
  const ogTitle = getMetaContent(content, 'og:title', 'property');
  if (!currentTitle.includes('…') || !ogTitle || ogTitle.includes('…')) {
    return content;
  }

  const normalizedOgTitle = /\|\s*Legacy Investing Show/i.test(ogTitle)
    ? ogTitle
    : `${ogTitle} | Legacy Investing Show`;

  content = content.replace(titleMatch[0], `<title>${normalizedOgTitle}</title>`);
  content = content.replace(
    /(<meta\s+name="title"\s+content=")[^"]*(")/i,
    `$1${normalizedOgTitle}$2`
  );
  return content;
}

function ensureViewportMeta(content) {
  if (/<meta\s+name=["']viewport["']/i.test(content)) return content;
  return content.replace(
    /(<meta\s+charset=["'][^"']+["']>\n)/i,
    `$1    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n`
  );
}

function hasMetaRefresh(content) {
  return /<meta\s+http-equiv=["']refresh["']/i.test(content);
}

function ensureRobotsMeta(content) {
  if (/<meta\s+name=["']robots["']/i.test(content)) return content;

  const robotsValue = hasMetaRefresh(content) ? 'noindex, follow' : 'index, follow';
  return content.replace(
    /(<meta\s+name=["']description["'][^>]*>\n)/i,
    `$1    <meta name="robots" content="${robotsValue}">\n`
  );
}

function buildCanonicalForPath(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  if (normalized === 'index.html') return `${SITE_URL}/`;
  if (normalized.endsWith('/index.html')) {
    const dir = normalized.replace(/\/index\.html$/, '');
    return `${SITE_URL}/${dir}`;
  }
  if (normalized.endsWith('.html')) {
    const page = normalized.replace(/\.html$/, '');
    return `${SITE_URL}/${page}`;
  }
  return `${SITE_URL}/${normalized}`;
}

function ensureCanonical(content, relativePath) {
  if (/<link\s+rel=["']canonical["']/i.test(content)) return content;
  const canonical = buildCanonicalForPath(relativePath);
  return content.replace(
    /(<meta\s+name=["']robots["'][^>]*>\n)/i,
    `$1    <link rel="canonical" href="${canonical}">\n`
  );
}

function ensureMetaDescription(content) {
  const descriptionMatch = content.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["'][^>]*>/i);
  if (!descriptionMatch) {
    const title = getTitle(content) || 'Legacy Investing Show';
    const generated = normalizeMetaText(`${title} insights and strategies from Legacy Investing Show.`);
    return content.replace(
      /(<meta\s+name=["']viewport["'][^>]*>\n)/i,
      `$1    <meta name="description" content="${generated}">\n`
    );
  }

  const current = descriptionMatch[1].replace(/\s+/g, ' ').trim();
  const normalized = normalizeMetaText(current);
  if (normalized === current) return content;
  const replacement = descriptionMatch[0].replace(descriptionMatch[1], normalized);
  return content.replace(descriptionMatch[0], replacement);
}

function expandDescriptionFromOg(content) {
  const descriptionMatch = content.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["'][^>]*>/i);
  if (!descriptionMatch) return content;

  const currentDescription = descriptionMatch[1].replace(/\s+/g, ' ').trim();
  const ogDescription = getMetaContent(content, 'og:description', 'property');
  if (!currentDescription.includes('…') || !ogDescription || ogDescription.includes('…')) {
    return content;
  }

  const replacement = descriptionMatch[0].replace(descriptionMatch[1], ogDescription);
  return content.replace(descriptionMatch[0], replacement);
}

function injectVerificationMeta(content) {
  if (content.includes('google-site-verification')) return content;
  const snippet =
    `    <meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATIONS[0]}">\n` +
    `    <meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATIONS[1]}">\n`;

  const robotsTag = content.match(/<meta\s+name=["']robots["'][^>]*>\n/i);
  if (!robotsTag) return content;
  return content.replace(robotsTag[0], `${robotsTag[0]}${snippet}`);
}

function normalizeExtraH1(content) {
  let h1Count = 0;
  return content.replace(/<\/?h1\b[^>]*>/gi, (tag) => {
    const isClosing = /^<\//.test(tag);
    if (!isClosing) h1Count += 1;
    if (h1Count <= 1) return tag;
    return tag.replace(/h1/gi, 'h2');
  });
}

function injectGtmScript(content) {
  if (content.includes('googletagmanager.com/gtm.js?id')) return content;

  const gtmSnippet =
    `    <!-- Google Tag Manager -->\n` +
    `    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_CONTAINER_ID}');</script>\n\n`;

  if (/<\/head>/i.test(content)) {
    return content.replace(/<\/head>/i, `${gtmSnippet}</head>`);
  }

  return content;
}

function injectGaScript(content) {
  if (content.includes('googletagmanager.com/gtag/js?id=')) return content;

  const gaSnippet =
    `    <!-- Google Analytics -->\n` +
    `    <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}"></script>\n` +
    `    <script>\n` +
    `        window.dataLayer = window.dataLayer || [];\n` +
    `        function gtag(){dataLayer.push(arguments);}\n` +
    `        gtag('js', new Date());\n` +
    `        gtag('config', '${GA_TRACKING_ID}');\n` +
    `    </script>\n\n`;

  if (/<\/head>/i.test(content)) {
    return content.replace(/<\/head>/i, `${gaSnippet}</head>`);
  }

  return content;
}

function injectGtmNoScript(content) {
  if (content.includes('ns.html?id=GTM-')) return content;
  if (!content.includes('googletagmanager.com/gtm.js?id')) return content;

  const noscript =
    `    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_CONTAINER_ID}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>\n`;

  return content.replace(/(<body[^>]*>\n)/i, `$1${noscript}`);
}

function processFile(filePath) {
  const relativePath = path.relative(ROOT_DIR, filePath);
  const original = fs.readFileSync(filePath, 'utf8');
  let next = original;
  next = ensureViewportMeta(next);
  next = ensureMetaDescription(next);
  next = expandDescriptionFromOg(next);
  next = ensureRobotsMeta(next);
  next = ensureCanonical(next, relativePath);
  next = injectVerificationMeta(next);
  next = ensureTitleLength(next);
  next = expandTitleFromOg(next);
  next = normalizeExtraH1(next);
  next = injectGtmScript(next);
  next = injectGaScript(next);
  next = injectGtmNoScript(next);

  if (next !== original) {
    fs.writeFileSync(filePath, next, 'utf8');
    return true;
  }
  return false;
}

function main() {
  const htmlFiles = walkHtmlFiles(ROOT_DIR);
  let changed = 0;
  for (const filePath of htmlFiles) {
    if (processFile(filePath)) changed += 1;
  }
  console.log(`Processed ${htmlFiles.length} HTML files; updated ${changed}.`);
}

main();
