#!/usr/bin/env node

/**
 * Ensure analytics/search-verification tags are present across HTML files.
 *
 * Rules:
 * - If a page has GA gtag snippet but no GTM loader, inject GTM script.
 * - If a page has GTM loader but no noscript iframe, inject noscript after <body>.
 * - If a page has robots meta but no google-site-verification meta, inject both codes.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const GA_TRACKING_ID = process.env.GA_TRACKING_ID || 'G-2578PT1WSS';
const GTM_CONTAINER_ID = process.env.GTM_CONTAINER_ID || 'GTM-KQ4R2LKP';
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

function injectVerificationMeta(content) {
  if (content.includes('google-site-verification')) return content;
  const snippet =
    `    <meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATIONS[0]}">\n` +
    `    <meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATIONS[1]}">\n`;

  return content.replace(
    /(<meta name="robots" content="index, follow">\n)/i,
    `$1${snippet}`
  );
}

function injectGtmScript(content) {
  if (content.includes('googletagmanager.com/gtm.js?id')) return content;
  if (!content.includes(`gtag/js?id=${GA_TRACKING_ID}`) && !content.includes('gtag/js?id=')) {
    return content;
  }

  const gtmSnippet =
    `    <!-- Google Tag Manager -->\n` +
    `    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_CONTAINER_ID}');</script>\n\n`;

  if (content.includes('<!-- Google Analytics -->')) {
    return content.replace('<!-- Google Analytics -->', `${gtmSnippet}    <!-- Google Analytics -->`);
  }

  return content.replace(
    /(<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=[^"]+"><\/script>\n)/i,
    `${gtmSnippet}$1`
  );
}

function injectGtmNoScript(content) {
  if (content.includes('ns.html?id=GTM-')) return content;
  if (!content.includes('googletagmanager.com/gtm.js?id')) return content;

  const noscript =
    `    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_CONTAINER_ID}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>\n`;

  return content.replace(/(<body[^>]*>\n)/i, `$1${noscript}`);
}

function processFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  let next = original;
  next = injectVerificationMeta(next);
  next = injectGtmScript(next);
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
