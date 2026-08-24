'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT_DIR, SITE_URL } = require('./paths');
const { listFiles, walkHtml, writeJson } = require('./fs');
const { normalizePath, toAbsUrl, pathToId } = require('./urls');
const { getBlogIndexation } = require('./indexation');
const { parseMarkdownPost } = require('./frontmatter');
const { extractHtmlMeta, htmlWordCount, extractHtmlHrefs } = require('./html');
const { loadRedirectMap } = require('./redirects');

const STATIC_PAGES = [
    { file: 'index.html', url: '/', pageType: 'home' },
    { file: 'about.html', url: '/about', pageType: 'about' },
    { file: 'success-stories.html', url: '/success-stories', pageType: 'success-stories' },
    { file: 'tax-strategies-101.html', url: '/tax-strategies-101', pageType: 'tax-hub' },
    { file: 'privacy.html', url: '/privacy', pageType: 'legal' },
    { file: 'terms.html', url: '/terms', pageType: 'legal' },
];

const HTML_SURFACES = [
    { dir: 'tax-strategies', pageType: 'tax-strategy', skip: new Set(['index.html']) },
    { dir: path.join('tax-strategies', 'for'), pageType: 'tax-persona', skip: new Set() },
    { dir: 'tools', pageType: 'tool', skip: new Set(['index.html']) },
    { dir: 'compare', pageType: 'compare', skip: new Set(['index.html']) },
    { dir: 'worksheets', pageType: 'worksheet', skip: new Set(['index.html']) },
    { dir: 'retirement', pageType: 'retirement', skip: new Set(['index.html']) },
    { dir: 'topics', pageType: 'topic', skip: new Set(['index.html']) },
    { dir: path.join('programmatic-pages', 'cities'), pageType: 'city', skip: new Set() },
    { dir: path.join('programmatic-pages', 'personas'), pageType: 'pseo-persona', skip: new Set() },
    { dir: path.join('programmatic-pages', 'insurance'), pageType: 'insurance-state', skip: new Set() },
    { dir: path.join('programmatic-pages', 'comparisons'), pageType: 'pseo-comparison', skip: new Set() },
];

const HUB_PAGES = [
    { file: path.join('blog', 'index.html'), url: '/blog', pageType: 'hub' },
    { file: path.join('tax-strategies', 'index.html'), url: '/tax-strategies', pageType: 'hub' },
    { file: path.join('tools', 'index.html'), url: '/tools', pageType: 'hub' },
    { file: path.join('compare', 'index.html'), url: '/compare', pageType: 'hub' },
    { file: path.join('worksheets', 'index.html'), url: '/worksheets', pageType: 'hub' },
    { file: path.join('retirement', 'index.html'), url: '/retirement', pageType: 'hub' },
    { file: path.join('topics', 'index.html'), url: '/topics', pageType: 'hub' },
    { file: path.join('programmatic-pages', 'index.html'), url: '/programmatic-pages', pageType: 'hub' },
];

function fileDate(filePath) {
    return fs.statSync(filePath).mtime.toISOString().slice(0, 10);
}

function htmlToUrl(root, filePath) {
    return normalizePath(`/${path.relative(root, filePath).replace(/\\/g, '/')}`);
}

function htmlRecord(root, filePath, pageType, extra = {}) {
    const html = fs.readFileSync(filePath, 'utf8');
    const meta = extractHtmlMeta(html);
    const urlPath = extra.url || htmlToUrl(root, filePath);
    return {
        id: pathToId(pageType, urlPath),
        pageType,
        slug: path.basename(filePath, '.html'),
        url: toAbsUrl(urlPath),
        path: urlPath,
        sourcePath: path.relative(root, filePath).replace(/\\/g, '/'),
        title: meta.title,
        description: meta.description,
        indexable: !/noindex/i.test(meta.robots || ''),
        noindexReason: /noindex/i.test(meta.robots || '') ? 'HTML robots noindex' : null,
        wordCount: htmlWordCount(html),
        lastModified: fileDate(filePath),
        primaryKeyword: extra.primaryKeyword || null,
        hasFaq: meta.hasFaqSchema,
        hasQuickTake: meta.hasQuickTake,
        image: extra.image || null,
        hrefs: extractHtmlHrefs(html),
    };
}

function buildCatalog(root = ROOT_DIR) {
    const pages = [];
    const seen = new Set();
    const add = (record) => {
        if (!record || seen.has(record.path)) return;
        seen.add(record.path);
        pages.push(record);
    };

    for (const page of STATIC_PAGES) {
        const filePath = path.join(root, page.file);
        if (fs.existsSync(filePath)) add(htmlRecord(root, filePath, page.pageType, { url: page.url }));
    }
    for (const hub of HUB_PAGES) {
        const filePath = path.join(root, hub.file);
        if (fs.existsSync(filePath)) add(htmlRecord(root, filePath, hub.pageType, { url: hub.url }));
    }

    const blogDir = path.join(root, 'content', 'blog');
    for (const filePath of listFiles(blogDir, (name) => name.endsWith('.md'))) {
        const slug = path.basename(filePath, '.md');
        const parsed = parseMarkdownPost(fs.readFileSync(filePath, 'utf8'), filePath);
        const indexation = getBlogIndexation(slug);
        const urlPath = `/blog/${slug}`;
        add({
            id: pathToId('blog', urlPath),
            pageType: 'blog',
            slug,
            url: toAbsUrl(urlPath),
            path: urlPath,
            sourcePath: path.relative(root, filePath).replace(/\\/g, '/'),
            title: parsed.title,
            description: parsed.description,
            indexable: indexation.indexable,
            noindexReason: indexation.indexable ? null : indexation.reason,
            wordCount: parsed.wordCount,
            lastModified: parsed.modifiedDate || fileDate(filePath),
            primaryKeyword: parsed.primaryKeyword || null,
            category: parsed.category,
            image: parsed.image || null,
            hasFaq: parsed.faqCount > 0,
            hasQuickTake: parsed.hasQuickTake,
            featured: parsed.featured,
            hrefs: parsed.links,
        });
    }

    for (const surface of HTML_SURFACES) {
        const dir = path.join(root, surface.dir);
        if (!fs.existsSync(dir)) continue;
        const files = surface.dir.includes('programmatic-pages')
            ? walkHtml(dir)
            : listFiles(dir, (name) => name.endsWith('.html'));
        for (const filePath of files) {
            if (surface.skip.has(path.basename(filePath))) continue;
            add(htmlRecord(root, filePath, surface.pageType));
        }
    }

    pages.sort((a, b) => a.path.localeCompare(b.path));
    const indexableCount = pages.filter((page) => page.indexable).length;
    return {
        generatedAt: new Date().toISOString(),
        siteUrl: SITE_URL,
        pageCount: pages.length,
        indexableCount,
        noindexCount: pages.length - indexableCount,
        redirectCount: loadRedirectMap(root).size,
        pages,
    };
}

function writeCatalog(root = ROOT_DIR, outPath) {
    const catalog = buildCatalog(root);
    const target = outPath || path.join(root, 'data', 'blogeo', 'catalog.json');
    writeJson(target, {
        ...catalog,
        pages: catalog.pages.map(({ hrefs, ...rest }) => rest),
    });
    return catalog;
}

function loadCatalog(root = ROOT_DIR) {
    const catalogPath = path.join(root, 'data', 'blogeo', 'catalog.json');
    if (!fs.existsSync(catalogPath)) return buildCatalog(root);
    return JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
}

module.exports = { buildCatalog, writeCatalog, loadCatalog };
