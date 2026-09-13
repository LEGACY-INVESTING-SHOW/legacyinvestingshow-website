/**
 * Shared blog rendering helpers.
 *
 * Both blog renderers consume this module so the two paths cannot drift:
 *   - scripts/build-blog.js      (templates/blog-post.html + listing pages)
 *   - cms/.eleventy.js           (cms/_includes/layouts/blog-post.njk)
 *
 * `renderArticleBody()` is the single source of truth for post DOM. The layout
 * files only supply <head>, the shared site shell, and the rendered markdown.
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { renderSourceBlock } = require('./site-shell');

const ROOT_DIR = path.join(__dirname, '..', '..');
const CONTENT_DIR = path.join(ROOT_DIR, 'content', 'blog');
const INDEXATION_POLICY_PATH = path.join(ROOT_DIR, 'data', 'indexation-policy.json');

const SITE_DOMAIN = 'https://www.legacyinvestingshow.com';
const FALLBACK_OG_IMAGE = '/assets/images/og-blog.jpg';
const TOC_MIN_WORDS = 1200;
const RELATED_LIMIT = 6;
const POSTS_PER_PAGE = 24;

const DISCLAIMER =
    'Educational only. Results vary. Tax, legal, and investment decisions should be reviewed with a qualified professional who can see your full situation.';

// ---------------------------------------------------------------- utilities

function esc(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function stripTags(html = '') {
    return String(html).replace(/<[^>]+>/g, '');
}

function decodeEntities(text = '') {
    return String(text)
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

function countWords(text = '') {
    return stripTags(text).replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length;
}

function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

function formatISODate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString();
}

function slugifyHeading(text) {
    return stripTags(decodeEntities(text))
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

function slugifyCategory(category) {
    return String(category || '')
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
}

function normalizeCategoryForArchives(category) {
    if (category === 'Success Stories') return 'Success Story';
    if (category === 'Real Estate Investing' || category === 'Real Estate Strategy') return 'Real Estate';
    if (category === 'Investing Strategy' || category === 'Strategy') return 'Investing';
    if (category === 'How-To Guide' || category === 'Getting Started') return 'Airbnb Arbitrage';
    return category || 'Investing';
}

/** Read time always renders as "<n> min read"; frontmatter may already carry the suffix. */
function normalizeReadTime(post) {
    const raw = post.frontmatter.readTime || post.frontmatter.readingTime;
    if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
        const parsed = parseInt(String(raw).replace(/[^0-9]/g, ''), 10);
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    const words = post.frontmatter.wordCount
        ? Number(post.frontmatter.wordCount)
        : countWords(post.content || '');
    return Math.max(1, Math.ceil((Number.isFinite(words) ? words : 0) / 200));
}

// -------------------------------------------------------- indexation policy

function loadIndexationPolicy() {
    if (!fs.existsSync(INDEXATION_POLICY_PATH)) {
        return {
            blogCategoryArchivesRobots: 'noindex, follow',
            blogRedirects: [],
            forceIndexBlogSlugs: [],
            noindexBlogSlugPatterns: [],
        };
    }
    return JSON.parse(fs.readFileSync(INDEXATION_POLICY_PATH, 'utf8'));
}

const INDEXATION_POLICY = loadIndexationPolicy();
const FORCE_INDEX_BLOG_SLUGS = new Set(INDEXATION_POLICY.forceIndexBlogSlugs || []);
const BLOG_REDIRECTS = new Map(
    (INDEXATION_POLICY.blogRedirects || [])
        .filter((entry) => entry.source && entry.destination)
        .map((entry) => [entry.source.replace(/^\/blog\//, ''), entry])
);
const NOINDEX_BLOG_PATTERNS = (INDEXATION_POLICY.noindexBlogSlugPatterns || []).map((entry) => ({
    regex: new RegExp(entry.pattern),
    reason: entry.reason || 'Matched indexation policy',
}));

function getBlogIndexation(post) {
    const explicitRobots = post.frontmatter.robots || post.frontmatter.metaRobots;
    const redirect = BLOG_REDIRECTS.get(post.slug);
    const canonicalUrl = redirect
        ? `${SITE_DOMAIN}${redirect.destination}`
        : `${SITE_DOMAIN}/blog/${post.slug}`;

    if (redirect) {
        return { robots: 'noindex, follow', canonicalUrl, reason: redirect.reason || 'Redirected duplicate' };
    }
    if (explicitRobots) {
        return { robots: explicitRobots, canonicalUrl, reason: 'Frontmatter robots override' };
    }
    if (FORCE_INDEX_BLOG_SLUGS.has(post.slug)) {
        return { robots: 'index, follow', canonicalUrl, reason: 'Force-indexed in indexation policy' };
    }
    const matched = NOINDEX_BLOG_PATTERNS.find((entry) => entry.regex.test(post.slug));
    if (matched) {
        return { robots: 'noindex, follow', canonicalUrl, reason: matched.reason };
    }
    return { robots: 'index, follow', canonicalUrl, reason: 'Default indexable blog URL' };
}

function isIndexableBlogPost(post) {
    return !/noindex/i.test(getBlogIndexation(post).robots);
}

// ------------------------------------------------------------- post loading

function parseMarkdownFile(filename, dir = CONTENT_DIR) {
    const filePath = path.join(dir, filename);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(fileContent);
    return { frontmatter: data, content, slug: filename.replace(/\.md$/, ''), filename };
}

let cachedPosts = null;

/** Every canonical post, newest first. Cached: called once per build per renderer. */
function loadAllPosts() {
    if (cachedPosts) return cachedPosts;
    if (!fs.existsSync(CONTENT_DIR)) return (cachedPosts = []);
    cachedPosts = fs
        .readdirSync(CONTENT_DIR)
        .filter((file) => file.endsWith('.md'))
        .map((file) => parseMarkdownFile(file))
        .sort((a, b) => new Date(b.frontmatter.date) - new Date(a.frontmatter.date));
    return cachedPosts;
}

// --------------------------------------------------------------- hero image

function fileExistsInRepo(relativePath) {
    if (!relativePath || typeof relativePath !== 'string') return false;
    if (/^https?:/i.test(relativePath)) return false;
    return fs.existsSync(path.join(ROOT_DIR, relativePath.replace(/^\//, '')));
}

/**
 * A hero <figure> is emitted only when the asset can actually be served.
 * 551 posts pointed at files that were never created; they now render no figure,
 * no preload, and fall back to the shared OG card for social previews.
 */
function resolveHero(post) {
    const raw = post.frontmatter.heroImage || post.frontmatter.image || '';
    if (!raw) {
        return { exists: false, src: '', webp: '', alt: '', ogImage: SITE_DOMAIN + FALLBACK_OG_IMAGE };
    }
    if (/^https?:/i.test(raw)) {
        return {
            exists: true,
            src: raw,
            webp: '',
            alt: post.frontmatter.imageAlt || post.frontmatter.title || '',
            ogImage: raw,
        };
    }
    if (!fileExistsInRepo(raw)) {
        return { exists: false, src: '', webp: '', alt: '', ogImage: SITE_DOMAIN + FALLBACK_OG_IMAGE };
    }
    const webpCandidate = raw.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    const webp = webpCandidate !== raw && fileExistsInRepo(webpCandidate) ? webpCandidate : '';
    return {
        exists: true,
        src: raw,
        webp,
        alt: post.frontmatter.imageAlt || post.frontmatter.title || '',
        ogImage: SITE_DOMAIN + raw,
    };
}

// ------------------------------------------------------------ article parts

function renderCrumbs(title) {
    return `<nav class="post-crumbs" aria-label="Breadcrumb">
                <ol class="post-crumbs-list">
                    <li class="post-crumbs-item"><a href="/">Home</a></li>
                    <li class="post-crumbs-item"><a href="/blog">Blog</a></li>
                    <li class="post-crumbs-item post-crumbs-current">${esc(title)}</li>
                </ol>
            </nav>`;
}

function renderHeader(post) {
    const fm = post.frontmatter;
    const category = normalizeCategoryForArchives(fm.category || 'Investing');
    const readTime = normalizeReadTime(post);
    const description = fm.description ? `\n                <p class="post-standfirst">${esc(fm.description)}</p>` : '';

    return `<header class="post-header">
                <h1 class="post-title">${esc(fm.title || 'Untitled')}</h1>${description}
                <p class="post-meta">
                    <a class="post-meta-category" href="/blog/category/${slugifyCategory(category)}">${esc(category)}</a>
                    <span class="post-meta-sep" aria-hidden="true">·</span>
                    <time datetime="${formatISODate(fm.date)}">${esc(formatDate(fm.date))}</time>
                    <span class="post-meta-sep" aria-hidden="true">·</span>
                    <span>${readTime} min read</span>
                    <span class="post-meta-sep" aria-hidden="true">·</span>
                    <span>${esc(fm.author || 'Preston Seo')}</span>
                </p>
            </header>`;
}

function renderFigure(hero) {
    if (!hero.exists) return '';
    const img = `<img src="${esc(hero.src)}" alt="${esc(hero.alt)}" width="1200" height="630" loading="eager" fetchpriority="high" decoding="async">`;
    const picture = hero.webp
        ? `<picture><source srcset="${esc(hero.webp)}" type="image/webp">${img}</picture>`
        : img;
    return `<figure class="post-figure">${picture}</figure>`;
}

/**
 * Heading anchors + a plain nested contents list for long reads only.
 * Returns the content with ids injected so in-page links resolve.
 */
function buildTOC(contentHtml, wordCount) {
    const headingRegex = /<h([23])(\s[^>]*)?>([\s\S]*?)<\/h\1>/gi;
    const headings = [];
    let content = String(contentHtml).replace(headingRegex, (match, level, attrs, inner) => {
        const slug = slugifyHeading(inner);
        if (!slug) return match;
        headings.push({ level: Number(level), slug, label: stripTags(inner).trim() });
        if (attrs && /\sid=/.test(attrs)) return match;
        return `<h${level}${attrs || ''} id="${slug}">${inner}</h${level}>`;
    });

    if (wordCount < TOC_MIN_WORDS || headings.filter((h) => h.level === 2).length < 3) {
        return { toc: '', content };
    }

    // Some posts ship their own "In this article" anchor list. Do not print a
    // second one underneath it.
    const inlineAnchors = (String(contentHtml).match(/href="#[a-z0-9-]+"/gi) || []).length;
    if (inlineAnchors >= 4) {
        return { toc: '', content };
    }

    // A contents list is a map, not a transcript: past 20 headings the
    // subsections stop helping and only the top level is listed.
    const includeSubheadings = headings.length <= 20;

    const items = [];
    for (const heading of headings) {
        if (heading.level === 2) {
            items.push({ ...heading, children: [] });
        } else if (includeSubheadings && items.length > 0) {
            items[items.length - 1].children.push(heading);
        }
    }

    const list = items
        .map((item) => {
            const children = item.children.length
                ? `\n                            <ol class="post-toc-sublist">${item.children
                      .map(
                          (child) =>
                              `\n                                <li class="post-toc-item"><a href="#${child.slug}">${esc(child.label)}</a></li>`
                      )
                      .join('')}\n                            </ol>\n                        `
                : '';
            return `\n                        <li class="post-toc-item"><a href="#${item.slug}">${esc(item.label)}</a>${children}</li>`;
        })
        .join('');

    const toc = `<nav class="post-toc" aria-labelledby="post-toc-title">
                <h2 class="post-toc-title" id="post-toc-title">Contents</h2>
                <ol class="post-toc-list">${list}
                </ol>
            </nav>`;

    return { toc, content };
}

/**
 * Statistics become one definition list of sourced facts. A stat without a
 * source, or one whose note merely repeats a sentence already in the body,
 * is dropped rather than re-dressed as a card.
 */
function renderFacts(statistics, proseText) {
    if (!Array.isArray(statistics) || statistics.length === 0) return '';
    const haystack = String(proseText || '').toLowerCase().replace(/\s+/g, ' ');

    const kept = statistics.filter((stat) => {
        if (!stat || !stat.source || !String(stat.source).trim()) return false;
        if (!stat.value || !stat.label) return false;
        const note = String(stat.context || '').toLowerCase().replace(/\s+/g, ' ').trim();
        if (note.length > 30 && haystack.includes(note.slice(0, 80))) return false;
        return true;
    });

    if (kept.length === 0) return '';

    const rows = kept
        .map((stat) => {
            const note = stat.context
                ? `\n                        <p class="post-fact-note">${esc(stat.context)}</p>`
                : '';
            return `\n                    <div class="post-fact">
                        <dt class="post-fact-label">${esc(stat.label)}</dt>
                        <dd class="post-fact-body">
                            <span class="post-fact-value">${esc(stat.value)}</span>${note}
                            <p class="post-fact-source">Source: ${esc(stat.source)}</p>
                        </dd>
                    </div>`;
        })
        .join('');

    return `<dl class="post-facts">${rows}
                </dl>`;
}

/** Markdown tables get their own horizontal scroller so narrow screens never pan the page. */
function wrapTables(contentHtml) {
    return String(contentHtml).replace(
        /<table(\s[^>]*)?>([\s\S]*?)<\/table>/gi,
        (match) => `<div class="post-table">${match}</div>`
    );
}

/** Insert the fact list after the article's first section. */
function insertFacts(contentHtml, factsHtml) {
    if (!factsHtml) return contentHtml;
    const second = [...String(contentHtml).matchAll(/<h2[\s>]/gi)][1];
    if (!second) return `${contentHtml}\n            ${factsHtml}`;
    const at = second.index;
    return `${contentHtml.slice(0, at)}${factsHtml}\n            ${contentHtml.slice(at)}`;
}

/**
 * The shared source block carries hard-coded inline styles for the legacy card
 * look. Blog posts drop the chrome and take their styling from blog.css.
 */
function renderSources(post) {
    const category = normalizeCategoryForArchives(post.frontmatter.category || 'Investing');
    const raw = renderSourceBlock({
        title: post.frontmatter.title,
        slug: post.slug,
        type: category,
        heading: 'Sources to check before you act',
    });

    const stripped = raw
        .replace(/\s+style="[^"]*"/g, '')
        .replace('class="source-note"', 'class="post-sources"')
        .replace('<h2>', '<h2 class="post-sources-title">')
        .replace('<ul>', '<ul class="post-sources-list">')
        .replace(/<li>/g, '<li class="post-sources-item">')
        .replace(/\s+$/, '');

    return stripped.replace(
        '</section>',
        `  <p class="post-sources-disclaimer">${DISCLAIMER}</p>\n            </section>`
    );
}

function renderFAQ(faqs) {
    if (!Array.isArray(faqs) || faqs.length === 0) return '';
    const rows = faqs
        .filter((item) => item && item.question && item.answer)
        .map(
            (item) => `\n                    <dt class="post-faq-question">${esc(item.question)}</dt>
                    <dd class="post-faq-answer">${esc(item.answer)}</dd>`
        )
        .join('');
    if (!rows) return '';

    return `<section class="post-faq" aria-labelledby="post-faq-title">
                <h2 class="post-faq-title" id="post-faq-title">Frequently asked questions</h2>
                <dl class="post-faq-list">${rows}
                </dl>
            </section>`;
}

/** Text-only "More in <category>" list. Same category first, then any other post. */
function renderRelated(post, allPosts, limit = RELATED_LIMIT) {
    const category = normalizeCategoryForArchives(post.frontmatter.category || 'Investing');
    const pool = allPosts.filter((candidate) => candidate.slug !== post.slug && isIndexableBlogPost(candidate));

    const sameCategory = pool.filter(
        (candidate) => normalizeCategoryForArchives(candidate.frontmatter.category || 'Investing') === category
    );
    const picks = sameCategory.slice(0, limit);
    if (picks.length < limit) {
        const seen = new Set(picks.map((p) => p.slug));
        for (const candidate of pool) {
            if (picks.length >= limit) break;
            if (seen.has(candidate.slug)) continue;
            picks.push(candidate);
            seen.add(candidate.slug);
        }
    }
    if (picks.length === 0) return '';

    const items = picks
        .map(
            (item) =>
                `\n                    <li class="post-related-item"><a href="/blog/${item.slug}">${esc(item.frontmatter.title || item.slug)}</a></li>`
        )
        .join('');

    return `<nav class="post-related" aria-labelledby="post-related-title">
                <h2 class="post-related-title" id="post-related-title">More in ${esc(category)}</h2>
                <ul class="post-related-list">${items}
                    <li class="post-related-item post-related-all"><a href="/blog/category/${slugifyCategory(category)}">All ${esc(category)} articles</a></li>
                </ul>
            </nav>`;
}

/**
 * The complete <article> markup for a post. Both renderers call this, so the
 * static template and the Eleventy layout cannot produce different DOM.
 */
function renderArticleBody({ post, contentHtml, allPosts }) {
    const fm = post.frontmatter;
    const wordCount = fm.wordCount ? Number(fm.wordCount) : countWords(post.content || '');
    const { toc, content } = buildTOC(contentHtml, wordCount);
    const facts = renderFacts(fm.statistics || fm.stats, stripTags(content));
    const prose = insertFacts(wrapTables(content), facts);
    const hero = resolveHero(post);

    const parts = [
        renderCrumbs(fm.title || 'Untitled'),
        renderHeader(post),
        renderFigure(hero),
        toc,
        `<div class="post-prose">\n${prose}\n            </div>`,
        renderSources(post),
        renderFAQ(fm.faq || fm.faqs),
        renderRelated(post, allPosts || loadAllPosts()),
    ].filter(Boolean);

    return `<article class="post">\n            ${parts.join('\n\n            ')}\n        </article>`;
}

// ------------------------------------------------------------------ exports

module.exports = {
    CONTENT_DIR,
    DISCLAIMER,
    FALLBACK_OG_IMAGE,
    POSTS_PER_PAGE,
    ROOT_DIR,
    SITE_DOMAIN,
    buildTOC,
    countWords,
    esc,
    fileExistsInRepo,
    formatDate,
    formatISODate,
    getBlogIndexation,
    isIndexableBlogPost,
    loadAllPosts,
    normalizeCategoryForArchives,
    normalizeReadTime,
    parseMarkdownFile,
    renderArticleBody,
    renderFacts,
    renderFAQ,
    renderRelated,
    renderSources,
    resolveHero,
    slugifyCategory,
    slugifyHeading,
    stripTags,
    wrapTables,
};
