#!/usr/bin/env node

/**
 * Blog build for Legacy Investing Show.
 *
 * Writes:
 *   blog/<slug>.html        one page per markdown post (templates/blog-post.html)
 *   blog/index.html         page 1 of the index
 *   blog/page/<n>.html      pages 2..N of the index (24 posts per page)
 *   blog/category/<s>.html  one archive per category
 *
 * The post DOM comes from scripts/lib/blog-render.js, which the Eleventy layout
 * also uses, so the two renderers cannot drift. Eleventy output overwrites
 * blog/<slug>.html later in the build chain (npm run cms:publish:posts).
 */

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const {
    CURRENT_YEAR,
    renderAnalyticsBody,
    renderAnalyticsHead,
    renderHeadAssets,
    renderSiteFooter,
    renderSiteHeader,
} = require('./lib/site-shell');
const blogRender = require('./lib/blog-render');

const {
    POSTS_PER_PAGE,
    SITE_DOMAIN,
    esc,
    formatDate,
    formatISODate,
    getBlogIndexation,
    isIndexableBlogPost,
    loadAllPosts,
    normalizeCategoryForArchives,
    normalizeReadTime,
    renderArticleBody,
    resolveHero,
    slugifyCategory,
} = blogRender;

marked.setOptions({ gfm: true, breaks: true, mangle: false });

const ROOT_DIR = path.join(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'blog');
const PAGE_DIR = path.join(OUTPUT_DIR, 'page');
const TEMPLATE_PATH = path.join(ROOT_DIR, 'templates', 'blog-post.html');
const GA_TRACKING_ID = process.env.GA_TRACKING_ID || 'G-2578PT1WSS';
const GTM_CONTAINER_ID = process.env.GTM_CONTAINER_ID || 'GTM-KQ4R2LKP';
const GOOGLE_SITE_VERIFICATIONS = [
    'Kec6RfGhFL-qG_8zKxCqt7yxjgy65WeDAftCBm90G2s',
    '92MoCnkdQOj_ey1lEafT5Mz-znCcCQ3UABZlI-JG_nM',
];

const BLOG_DESCRIPTION =
    'Tax strategy, real estate, retirement, and business-structure guides, plus case studies from operators who ran them.';

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function buildSEOTitle(rawTitle) {
    const title = (rawTitle || 'Legacy Investing Show')
        .replace(/\s+/g, ' ')
        .replace(/\s+\([^)]*\)\s*$/g, '')
        .trim() || 'Legacy Investing Show';
    const suffix = ' | Legacy Investing Show';
    return title.endsWith(suffix) ? title : `${title}${suffix}`;
}

const DEFAULT_KEYWORDS = ['wealth building', 'investing', 'financial freedom'];
const CATEGORY_KEYWORDS = {
    'Airbnb Arbitrage': ['airbnb', 'arbitrage', 'short-term rental', 'passive income', 'rental property'],
    'Real Estate': ['real estate', 'property investment', 'rental income', 'property management'],
    'Tax Strategies': ['tax strategy', 'tax planning', 'tax savings', 'irs rules'],
    Investing: ['investment strategy', 'portfolio', 'returns', 'cash flow'],
};

/** Mirrors cms/src/blog/blog.11tydata.js so both renderers emit the same keywords. */
function buildKeywords(frontmatter) {
    if (typeof frontmatter.keywords === 'string' && frontmatter.keywords.trim()) {
        return frontmatter.keywords.trim();
    }
    if (Array.isArray(frontmatter.keywords)) {
        const values = frontmatter.keywords.map((v) => String(v || '').trim()).filter(Boolean);
        if (values.length) return values.join(', ');
    }
    if (frontmatter.seo && typeof frontmatter.seo === 'object') {
        const values = [];
        if (frontmatter.seo.primaryKeyword) values.push(frontmatter.seo.primaryKeyword);
        if (Array.isArray(frontmatter.seo.secondaryKeywords)) values.push(...frontmatter.seo.secondaryKeywords);
        if (Array.isArray(frontmatter.seo.longTailKeywords)) values.push(...frontmatter.seo.longTailKeywords.slice(0, 4));
        if (values.length) return values.join(', ');
    }
    if (Array.isArray(frontmatter.tags)) {
        const values = frontmatter.tags
            .map((v) => String(v || '').trim())
            .filter(Boolean)
            .filter((v) => v.toLowerCase() !== 'blog');
        if (values.length) return values.join(', ');
    }
    const category = frontmatter.category || '';
    const combined = [category, ...(CATEGORY_KEYWORDS[category] || []), ...DEFAULT_KEYWORDS]
        .filter(Boolean)
        .map((v) => String(v).trim())
        .filter(Boolean);
    return [...new Set(combined)].join(', ');
}

function generateFAQSchema(faq) {
    if (!Array.isArray(faq) || faq.length === 0) return '';
    const entries = faq
        .filter((item) => item && item.question && item.answer)
        .map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: { '@type': 'Answer', text: item.answer },
        }));
    if (entries.length === 0) return '';
    return `<script type="application/ld+json">
    ${JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: entries }, null, 4)}
    </script>`;
}

/**
 * Apply templates/blog-post.html. The article markup itself comes from
 * blog-render so this path and the Eleventy layout stay byte-comparable.
 */
function applyTemplate(template, post, allPosts) {
    const fm = post.frontmatter;
    const contentHtml = marked(post.content);
    const wordCount = fm.wordCount ? Number(fm.wordCount) : blogRender.countWords(post.content);
    const hero = resolveHero(post);
    const indexation = getBlogIndexation(post);
    const category = normalizeCategoryForArchives(fm.category || 'Investing');

    const heroPreload = hero.exists
        ? `<link rel="preload" as="image" href="${esc(hero.webp || hero.src)}"${hero.webp ? ' type="image/webp"' : ''} fetchpriority="high">`
        : '';

    const modifiedDate = fm.modifiedDate || fm.updatedAt || fm.date;

    return template
        .replace(/\{\{seoTitle\}\}/g, esc(buildSEOTitle(fm.title)))
        .replace(/\{\{title\}\}/g, esc(fm.title || 'Untitled'))
        .replace(/\{\{description\}\}/g, esc(fm.description || ''))
        .replace(/\{\{keywords\}\}/g, esc(buildKeywords(fm)))
        .replace(/\{\{author\}\}/g, esc(fm.author || 'Preston Seo'))
        .replace(/\{\{robots\}\}/g, esc(indexation.robots))
        .replace(/\{\{canonicalUrl\}\}/g, esc(indexation.canonicalUrl))
        .replace(/\{\{ogImage\}\}/g, esc(hero.ogImage))
        .replace(/\{\{heroPreload\}\}/g, heroPreload)
        .replace(/\{\{isoDate\}\}/g, formatISODate(fm.date))
        .replace(/\{\{modifiedDate\}\}/g, formatISODate(modifiedDate))
        .replace(/\{\{category\}\}/g, esc(category))
        .replace(/\{\{wordCount\}\}/g, String(wordCount))
        .replace(/\{\{faqSchema\}\}/g, generateFAQSchema(fm.faq || fm.faqs))
        .replace(/\{\{headAssets\}\}/g, renderHeadAssets())
        .replace(/\{\{siteHeader\}\}/g, renderSiteHeader('/blog'))
        .replace(/\{\{siteFooter\}\}/g, renderSiteFooter())
        .replace(/\{\{analyticsHead\}\}/g, renderAnalyticsHead({ gaTrackingId: GA_TRACKING_ID, gtmContainerId: GTM_CONTAINER_ID }))
        .replace(/\{\{analyticsBody\}\}/g, renderAnalyticsBody({ gtmContainerId: GTM_CONTAINER_ID }))
        .replace(/\{\{articleBody\}\}/g, renderArticleBody({ post, contentHtml, allPosts }));
}

// -------------------------------------------------------------- listing pages

function categoryDescription(category) {
    const descriptions = {
        'Airbnb Arbitrage': 'Lease-first short-term rental strategy, landlord conversations, setup budgets, pricing, operations, and real student case studies.',
        'Business Structures': 'LLC, S-corp, C-corp, veil protection, operating agreement, registered agent, and entity-choice guides for operators and investors.',
        'Debt Management': 'Debt payoff, consolidation, student-loan strategy, budgeting, and credit decision guides for building cleaner cash flow.',
        Investing: 'Portfolio construction, real estate, alternative assets, asset allocation, tax-aware investing, and wealth-building decisions.',
        'Passive Income': 'Income-stream ideas, business models, and practical execution guides for building income beyond a paycheck.',
        'Real Estate': 'Rental property, short-term rental, depreciation, house hacking, and investor decision guides.',
        Retirement: '401(k), IRA, Roth, pension, withdrawal, income, and tax-sequencing guides for retirement planning.',
        'Success Story': 'Student case studies showing how real operators built cash flow, negotiated leases, and changed their financial trajectory.',
        'Tax Strategies': 'Tax planning guides for real estate investors, business owners, high-income earners, and self-employed professionals.',
        'Wealth Plan': 'Scenario-based wealth plans connecting income, tax, debt, real estate, retirement, and execution priorities.',
    };
    return descriptions[category] || `Guides, examples, and execution notes for ${category.toLowerCase()} from Legacy Investing Show.`;
}

/** Sentence case for the category link row; proper nouns stay capitalised. */
function categoryLinkLabel(category) {
    const keepCaps = /^(LLC|S-corp|C-corp|IRA|401\(k\))/i;
    if (keepCaps.test(category)) return category;
    return category.charAt(0) + category.slice(1).toLowerCase();
}

/**
 * The category list is the blog's table of contents: a two-column nav on the
 * cream-dark band, each row carrying the number of articles behind it.
 */
function renderCategoryNav(categories, counts, currentSlug) {
    if (categories.length === 0) return '';
    const items = categories
        .map((category) => {
            const slug = slugifyCategory(category);
            const current = slug === currentSlug ? ' blog-cat-item--current' : '';
            const aria = slug === currentSlug ? ' aria-current="page"' : '';
            const count = counts.get(category) || 0;
            return `<li class="blog-cat-item${current}">
                                <a class="blog-cat-link" href="/blog/category/${slug}"${aria}>
                                    <span class="blog-cat-name">${esc(categoryLinkLabel(category))}</span>
                                    <span class="blog-cat-count">${count}</span>
                                </a>
                            </li>`;
        })
        .join('\n                            ');
    return `<section class="band band--cream-dark blog-cats" aria-label="Browse by category">
                <div class="blog-wrap">
                    <nav class="blog-cats-nav">
                        <ul class="blog-cat-list">
                            ${items}
                        </ul>
                    </nav>
                </div>
            </section>`;
}

/** Date and read time as a small definition list — never a middle-dot string. */
function renderEntryMeta(post, extraRows = '') {
    const fm = post.frontmatter;
    return `<dl class="blog-meta">
                                <div class="blog-meta-row">
                                    <dt class="blog-meta-term">Published</dt>
                                    <dd class="blog-meta-value"><time datetime="${formatISODate(fm.date)}">${esc(formatDate(fm.date))}</time></dd>
                                </div>
                                <div class="blog-meta-row">
                                    <dt class="blog-meta-term">Read time</dt>
                                    <dd class="blog-meta-value">${normalizeReadTime(post)} min</dd>
                                </div>${extraRows}
                            </dl>`;
}

/**
 * The newest post leads the page on the navy band, with its photograph when
 * one was actually produced for it.
 */
function renderFeatured(post) {
    if (!post) return '';
    const fm = post.frontmatter;
    const hero = resolveHero(post);
    const category = normalizeCategoryForArchives(fm.category || 'Investing');

    const media = hero.exists
        ? `<div class="blog-featured-media">
                            <figure class="photo blog-featured-photo"><img src="${esc(hero.src)}" alt="${esc(hero.alt)}"${hero.width && hero.height ? ` width="${hero.width}" height="${hero.height}"` : ''} loading="lazy" decoding="async"></figure>
                        </div>`
        : '';

    const description = fm.description
        ? `\n                            <p class="blog-featured-desc">${esc(fm.description)}</p>`
        : '';

    const extra = `
                                <div class="blog-meta-row">
                                    <dt class="blog-meta-term">Category</dt>
                                    <dd class="blog-meta-value">${esc(category)}</dd>
                                </div>`;

    return `<section class="band blog-featured" aria-label="Latest article">
                <div class="blog-wrap">
                    <div class="blog-featured-grid${hero.exists ? '' : ' blog-featured-grid--text'}">
                        ${media}
                        <div class="blog-featured-text">
                            <h2 class="blog-featured-title"><a href="/blog/${post.slug}">${esc(fm.title || post.slug)}</a></h2>${description}
                            ${renderEntryMeta(post, extra)}
                        </div>
                    </div>
                </div>
            </section>`;
}

function renderEntries(posts) {
    if (posts.length === 0) {
        return '<p class="blog-empty">No posts yet.</p>';
    }
    const items = posts
        .map((post) => {
            const fm = post.frontmatter;
            const description = fm.description
                ? `\n                            <p class="blog-entry-desc">${esc(fm.description)}</p>`
                : '';
            return `<li class="blog-entry">
                            <h2 class="blog-entry-title"><a href="/blog/${post.slug}">${esc(fm.title || post.slug)}</a></h2>${description}
                            ${renderEntryMeta(post)}
                        </li>`;
        })
        .join('\n                        ');
    return `<ul class="blog-entries">
                        ${items}
                    </ul>`;
}

/** Pagination reads as a row of numerals, with the page range spelled out. */
function renderPagination(pageNum, totalPages) {
    if (totalPages <= 1) return '';
    const href = (n) => (n === 1 ? '/blog' : `/blog/page/${n}`);

    const numbers = [];
    for (let n = 1; n <= totalPages; n += 1) {
        if (n === pageNum) {
            numbers.push(
                `<li class="blog-page-item"><span class="blog-page-num blog-page-num--current" aria-current="page">${n}</span></li>`
            );
        } else {
            numbers.push(
                `<li class="blog-page-item"><a class="blog-page-num" href="${href(n)}">${n}</a></li>`
            );
        }
    }

    const prev =
        pageNum > 1
            ? `<a class="blog-pagination-prev" href="${href(pageNum - 1)}">Newer posts</a>`
            : '<span class="blog-pagination-edge">Newest posts</span>';
    const next =
        pageNum < totalPages
            ? `<a class="blog-pagination-next" href="${href(pageNum + 1)}">Older posts</a>`
            : '<span class="blog-pagination-edge">Oldest posts</span>';

    return `<nav class="blog-pagination" aria-label="Pagination">
                        <ol class="blog-page-list">
                            ${numbers.join('\n                            ')}
                        </ol>
                        <div class="blog-pagination-ends">
                            ${prev}
                            ${next}
                        </div>
                    </nav>`;
}

function listingDocument({
    metaTitle,
    description,
    canonicalPath,
    robots,
    bodyType,
    bodyTitle,
    heading,
    intro,
    figureValue,
    figureLabel,
    categoriesNav,
    featuredHTML,
    entriesHTML,
    paginationHTML,
    schema,
}) {
    const canonical = `${SITE_DOMAIN}${canonicalPath}`;
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">

    <title>${esc(metaTitle)}</title>
    <meta name="title" content="${esc(metaTitle)}">
    <meta name="description" content="${esc(description)}">
    <meta name="author" content="Preston Seo">
    <meta name="robots" content="${esc(robots)}">
    <meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATIONS[0]}">
    <meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATIONS[1]}">
    <link rel="canonical" href="${canonical}">

    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonical}">
    <meta property="og:title" content="${esc(metaTitle)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:image" content="${SITE_DOMAIN}/assets/images/og-blog.jpg">
    <meta property="og:site_name" content="Legacy Investing Show">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@thelegacyshow">
    <meta name="twitter:title" content="${esc(metaTitle)}">
    <meta name="twitter:description" content="${esc(description)}">
    <meta name="twitter:image" content="${SITE_DOMAIN}/assets/images/og-blog.jpg">

    <meta name="theme-color" content="#FAF7F2">
    <link rel="icon" type="image/png" href="/assets/images/logo.png">
    <link rel="apple-touch-icon" href="/assets/images/logo.png">

    ${renderHeadAssets()}
    <link rel="stylesheet" href="/assets/css/blog.css">

    <script type="application/ld+json">
    ${JSON.stringify(schema, null, 4)}
    </script>

    ${renderAnalyticsHead({ gaTrackingId: GA_TRACKING_ID, gtmContainerId: GTM_CONTAINER_ID })}
</head>
<body data-page-type="${esc(bodyType)}" data-page-title="${esc(bodyTitle)}">
    ${renderAnalyticsBody({ gtmContainerId: GTM_CONTAINER_ID })}
    <a href="#main" class="skip-link">Skip to main content</a>

    ${renderSiteHeader('/blog')}

    <main id="main">
        <div class="blog-page">
            <div class="blog-head">
                <div class="blog-wrap">
                    <header class="opener blog-opener">
                        <div class="opener__main">
                            <h1 class="opener__title blog-listing-title">${esc(heading)}</h1>
                            <p class="opener__lede blog-listing-intro">${esc(intro)}</p>
                        </div>
                        <div class="opener__aside blog-opener-aside">
                            <p class="figure figure--gold blog-count">
                                <span class="figure__value blog-count-value">${esc(String(figureValue))}</span>
                                <span class="figure__label blog-count-label">${esc(figureLabel)}</span>
                            </p>
                        </div>
                    </header>
                </div>
            </div>

            ${categoriesNav}
${featuredHTML ? `\n            ${featuredHTML}\n` : ''}
            <div class="blog-list">
                <div class="blog-wrap">
                    <div class="sheet blog-sheet">
                        ${entriesHTML}
                    </div>

                    ${paginationHTML}
                </div>
            </div>
        </div>
    </main>

    ${renderSiteFooter()}

    <script defer src="/assets/js/main.js"></script>
</body>
</html>`;
}

function listSchema(name, description, url, posts) {
    return {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name,
        description,
        url,
        isPartOf: {
            '@type': 'Blog',
            name: 'Legacy Investing Show Blog',
            url: `${SITE_DOMAIN}/blog`,
        },
        mainEntity: {
            '@type': 'ItemList',
            numberOfItems: posts.length,
            itemListElement: posts.slice(0, 50).map((post, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                url: `${SITE_DOMAIN}/blog/${post.slug}`,
                name: post.frontmatter.title,
            })),
        },
    };
}

function countByCategory(posts) {
    const counts = new Map();
    for (const post of posts) {
        const category = normalizeCategoryForArchives(post.frontmatter.category || 'Investing');
        counts.set(category, (counts.get(category) || 0) + 1);
    }
    return counts;
}

function generateBlogIndexPages(posts) {
    const sorted = posts
        .filter(isIndexableBlogPost)
        .sort((a, b) => new Date(b.frontmatter.date) - new Date(a.frontmatter.date));

    const counts = countByCategory(sorted);
    const categories = [...counts.keys()].sort((a, b) => a.localeCompare(b));

    const totalPages = Math.max(1, Math.ceil(sorted.length / POSTS_PER_PAGE));
    const written = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum += 1) {
        const slice = sorted.slice((pageNum - 1) * POSTS_PER_PAGE, pageNum * POSTS_PER_PAGE);
        const featured = pageNum === 1 ? slice[0] : null;
        const rest = featured ? slice.slice(1) : slice;
        const canonicalPath = pageNum === 1 ? '/blog' : `/blog/page/${pageNum}`;
        const metaTitle =
            pageNum === 1
                ? 'Blog | Legacy Investing Show'
                : `Blog, page ${pageNum} | Legacy Investing Show`;

        const html = listingDocument({
            metaTitle,
            description: BLOG_DESCRIPTION,
            canonicalPath,
            robots: 'index, follow',
            bodyType: 'blog_index',
            bodyTitle: pageNum === 1 ? 'Blog' : `Blog page ${pageNum}`,
            heading: 'Blog',
            intro: BLOG_DESCRIPTION,
            figureValue: sorted.length,
            figureLabel: 'articles published',
            categoriesNav: renderCategoryNav(categories, counts, ''),
            featuredHTML: renderFeatured(featured),
            entriesHTML: renderEntries(rest),
            paginationHTML: renderPagination(pageNum, totalPages),
            schema: listSchema(
                pageNum === 1 ? 'Legacy Investing Show Blog' : `Legacy Investing Show Blog, page ${pageNum}`,
                BLOG_DESCRIPTION,
                `${SITE_DOMAIN}${canonicalPath}`,
                slice
            ),
        });

        if (pageNum === 1) {
            fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), html);
            written.push('blog/index.html');
        } else {
            ensureDir(PAGE_DIR);
            fs.writeFileSync(path.join(PAGE_DIR, `${pageNum}.html`), html);
            written.push(`blog/page/${pageNum}.html`);
        }
    }

    // Drop pages left behind by an earlier, longer run.
    if (fs.existsSync(PAGE_DIR)) {
        for (const entry of fs.readdirSync(PAGE_DIR)) {
            if (!entry.endsWith('.html')) continue;
            const num = parseInt(entry.replace('.html', ''), 10);
            if (!Number.isFinite(num) || num < 2 || num > totalPages) {
                fs.unlinkSync(path.join(PAGE_DIR, entry));
            }
        }
    }

    return { written, totalPages, postCount: sorted.length };
}

function generateCategoryArchives(posts) {
    const sorted = posts
        .filter(isIndexableBlogPost)
        .sort((a, b) => new Date(b.frontmatter.date) - new Date(a.frontmatter.date));

    const archiveDir = path.join(OUTPUT_DIR, 'category');
    ensureDir(archiveDir);
    for (const entry of fs.readdirSync(archiveDir, { withFileTypes: true })) {
        if (entry.isFile() && entry.name.endsWith('.html')) {
            fs.unlinkSync(path.join(archiveDir, entry.name));
        }
    }

    const byCategory = new Map();
    for (const post of sorted) {
        const category = normalizeCategoryForArchives(post.frontmatter.category || 'Investing');
        if (!byCategory.has(category)) byCategory.set(category, []);
        byCategory.get(category).push(post);
    }

    const counts = countByCategory(sorted);
    const categories = [...byCategory.keys()].sort((a, b) => a.localeCompare(b));

    for (const category of categories) {
        const categoryPosts = byCategory.get(category);
        const slug = slugifyCategory(category);
        const description = categoryDescription(category);
        const canonicalPath = `/blog/category/${slug}`;
        const featured = categoryPosts[0];

        const html = listingDocument({
            metaTitle: `${category} articles | Legacy Investing Show`,
            description,
            canonicalPath,
            robots: 'index, follow',
            bodyType: 'blog_category',
            bodyTitle: category,
            heading: category,
            intro: description,
            figureValue: categoryPosts.length,
            figureLabel: 'articles in this category',
            categoriesNav: renderCategoryNav(categories, counts, slug),
            featuredHTML: renderFeatured(featured),
            entriesHTML: renderEntries(categoryPosts.slice(1)),
            paginationHTML: '',
            schema: listSchema(
                `${category} articles`,
                description,
                `${SITE_DOMAIN}${canonicalPath}`,
                categoryPosts
            ),
        });

        fs.writeFileSync(path.join(archiveDir, `${slug}.html`), html);
    }

    return categories.length;
}

// --------------------------------------------------------------------- build

function build() {
    console.log('Starting blog build...\n');
    ensureDir(OUTPUT_DIR);

    let template;
    try {
        template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
    } catch (error) {
        console.error(`Error reading template: ${error.message}`);
        process.exit(1);
    }

    const posts = loadAllPosts();
    console.log(`Found ${posts.length} markdown file(s)\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const post of posts) {
        try {
            fs.writeFileSync(path.join(OUTPUT_DIR, `${post.slug}.html`), applyTemplate(template, post, posts));
            successCount += 1;
        } catch (error) {
            console.error(`Error building ${post.slug}: ${error.message}`);
            errorCount += 1;
        }
    }

    const index = generateBlogIndexPages(posts);
    console.log(`Built: ${index.written.length} index page(s) for ${index.postCount} indexable posts`);
    console.log(`       ${index.written.join(', ')}`);

    const categoryCount = generateCategoryArchives(posts);
    console.log(`Built: ${categoryCount} blog category archive(s)`);

    console.log('\n-------------------');
    console.log('Build complete!');
    console.log(`Successfully built: ${successCount} post(s)`);
    if (errorCount > 0) console.log(`Errors: ${errorCount}`);
    console.log('-------------------\n');
}

if (require.main === module) {
    build();
}

module.exports = {
    applyTemplate,
    build,
    buildKeywords,
    buildSEOTitle,
    categoryLinkLabel,
    generateBlogIndexPages,
    generateCategoryArchives,
    generateFAQSchema,
    renderEntries,
    renderPagination,
};
