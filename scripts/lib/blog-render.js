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
 * Intrinsic pixel size straight out of the file header (JPEG, PNG, WebP, GIF).
 * The frontmatter's imageWidth/imageHeight are wrong on a good number of posts,
 * and a wrong width/height pair is worse than none: it reserves the wrong box
 * and the page jumps when the image lands.
 */
const imageSizeCache = new Map();

function readImageSize(absolutePath) {
    if (imageSizeCache.has(absolutePath)) return imageSizeCache.get(absolutePath);
    let size = null;
    try {
        const buf = fs.readFileSync(absolutePath);
        size = parseImageSize(buf);
    } catch (error) {
        size = null;
    }
    imageSizeCache.set(absolutePath, size);
    return size;
}

function parseImageSize(buf) {
    if (buf.length < 24) return null;

    // PNG: IHDR width/height at bytes 16..24.
    if (buf.readUInt32BE(0) === 0x89504e47) {
        return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }

    // GIF: little-endian width/height at bytes 6..10.
    if (buf.toString('ascii', 0, 3) === 'GIF') {
        return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
    }

    // WebP: lossy (VP8 ), lossless (VP8L) and extended (VP8X) all differ.
    if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
        const chunk = buf.toString('ascii', 12, 16);
        if (chunk === 'VP8 ' && buf.length >= 30) {
            return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
        }
        if (chunk === 'VP8L' && buf.length >= 25) {
            const bits = buf.readUInt32LE(21);
            return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
        }
        if (chunk === 'VP8X' && buf.length >= 30) {
            return {
                width: (buf[24] | (buf[25] << 8) | (buf[26] << 16)) + 1,
                height: (buf[27] | (buf[28] << 8) | (buf[29] << 16)) + 1,
            };
        }
        return null;
    }

    // JPEG: walk the marker chain to the start-of-frame segment.
    if (buf[0] === 0xff && buf[1] === 0xd8) {
        let offset = 2;
        while (offset + 9 < buf.length) {
            if (buf[offset] !== 0xff) {
                offset += 1;
                continue;
            }
            const marker = buf[offset + 1];
            if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
                offset += 2;
                continue;
            }
            const length = buf.readUInt16BE(offset + 2);
            const isFrame =
                (marker >= 0xc0 && marker <= 0xc3) ||
                (marker >= 0xc5 && marker <= 0xc7) ||
                (marker >= 0xc9 && marker <= 0xcb) ||
                (marker >= 0xcd && marker <= 0xcf);
            if (isFrame) {
                return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
            }
            offset += 2 + length;
        }
    }

    return null;
}

/**
 * A hero <figure> is emitted only when the asset can actually be served.
 * 551 posts pointed at files that were never created; they now render no figure,
 * no preload, and fall back to the shared OG card for social previews.
 */
function resolveHero(post) {
    const raw = post.frontmatter.heroImage || post.frontmatter.image || '';
    if (!raw) {
        return { exists: false, src: '', webp: '', alt: '', width: 0, height: 0, ogImage: SITE_DOMAIN + FALLBACK_OG_IMAGE };
    }
    if (/^https?:/i.test(raw)) {
        return {
            exists: true,
            src: raw,
            webp: '',
            alt: post.frontmatter.imageAlt || post.frontmatter.title || '',
            width: 0,
            height: 0,
            ogImage: raw,
        };
    }
    if (!fileExistsInRepo(raw)) {
        return { exists: false, src: '', webp: '', alt: '', width: 0, height: 0, ogImage: SITE_DOMAIN + FALLBACK_OG_IMAGE };
    }
    // 54 posts name the shared social card as their image. It is a share
    // thumbnail, not a photograph of anything in the article: keep it for
    // og:image and render no figure.
    if (raw.replace(/^\//, '') === FALLBACK_OG_IMAGE.replace(/^\//, '')) {
        return { exists: false, src: '', webp: '', alt: '', width: 0, height: 0, ogImage: SITE_DOMAIN + FALLBACK_OG_IMAGE };
    }
    const webpCandidate = raw.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    const webp = webpCandidate !== raw && fileExistsInRepo(webpCandidate) ? webpCandidate : '';
    const size = readImageSize(path.join(ROOT_DIR, raw.replace(/^\//, ''))) || { width: 0, height: 0 };
    return {
        exists: true,
        src: raw,
        webp,
        alt: post.frontmatter.imageAlt || post.frontmatter.title || '',
        width: size.width,
        height: size.height,
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

/**
 * The opener: title and lede in the wide column, the article's facts as a
 * definition list in the aside. Meta is never a middle-dot string.
 */
function renderOpener(post) {
    const fm = post.frontmatter;
    const category = normalizeCategoryForArchives(fm.category || 'Investing');
    const readTime = normalizeReadTime(post);
    const lede = fm.description
        ? `\n                        <p class="opener__lede post-standfirst">${esc(fm.description)}</p>`
        : '';

    const published = formatDate(fm.date);
    const modifiedRaw = fm.modifiedDate || fm.updatedAt || '';
    // Some posts carry a modifiedDate that predates the publication date;
    // an "Updated" line older than "Published" is worse than none.
    const isLater = modifiedRaw && new Date(modifiedRaw) > new Date(fm.date);
    const modified = isLater ? formatDate(modifiedRaw) : '';
    const updatedRow =
        modified && modified !== published
            ? `\n                            <div class="post-meta-row">
                                <dt class="post-meta-term">Updated</dt>
                                <dd class="post-meta-value"><time datetime="${formatISODate(modifiedRaw)}">${esc(modified)}</time></dd>
                            </div>`
            : '';

    return `<header class="opener post-opener">
                    <div class="opener__main">
                        <h1 class="opener__title post-title">${esc(fm.title || 'Untitled')}</h1>${lede}
                    </div>
                    <div class="opener__aside post-opener-aside">
                        <dl class="post-meta">
                            <div class="post-meta-row">
                                <dt class="post-meta-term">Category</dt>
                                <dd class="post-meta-value"><a class="post-meta-category" href="/blog/category/${slugifyCategory(category)}">${esc(category)}</a></dd>
                            </div>
                            <div class="post-meta-row">
                                <dt class="post-meta-term">Published</dt>
                                <dd class="post-meta-value"><time datetime="${formatISODate(fm.date)}">${esc(published)}</time></dd>
                            </div>${updatedRow}
                            <div class="post-meta-row">
                                <dt class="post-meta-term">Read time</dt>
                                <dd class="post-meta-value">${readTime} min</dd>
                            </div>
                            <div class="post-meta-row">
                                <dt class="post-meta-term">Written by</dt>
                                <dd class="post-meta-value">${esc(fm.author || 'Preston Seo')}</dd>
                            </div>
                        </dl>
                    </div>
                </header>`;
}

/** The hero photograph, inside the shared gold offset frame. */
function renderFigure(hero) {
    if (!hero.exists) return '';
    const dims = hero.width && hero.height ? ` width="${hero.width}" height="${hero.height}"` : '';
    const img = `<img src="${esc(hero.src)}" alt="${esc(hero.alt)}"${dims} loading="eager" fetchpriority="high" decoding="async">`;
    const picture = hero.webp
        ? `<picture><source srcset="${esc(hero.webp)}" type="image/webp">${img}</picture>`
        : img;
    return `<div class="post-hero">
                <div class="post-wrap">
                    <figure class="photo post-figure">${picture}</figure>
                </div>
            </div>`;
}

/**
 * Heading anchors plus the contents rail for long reads only. The rail ships
 * as a closed <details> — the right default on a phone — and the stylesheet
 * forces it open as a rail from 1024px.
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
                ? `\n                                <ol class="post-toc-sublist">${item.children
                      .map(
                          (child) =>
                              `\n                                    <li class="post-toc-item"><a href="#${child.slug}">${esc(child.label)}</a></li>`
                      )
                      .join('')}\n                                </ol>\n                            `
                : '';
            return `\n                            <li class="post-toc-item"><a href="#${item.slug}">${esc(item.label)}</a>${children}</li>`;
        })
        .join('');

    const toc = `<details class="contents post-contents">
                        <summary class="contents__summary post-toc-title">Contents</summary>
                        <ol class="contents__list post-toc-list">${list}
                        </ol>
                    </details>`;

    return { toc, content };
}

/**
 * Statistics become display figures in the margin. A stat without a source, or
 * one whose note merely repeats a sentence already in the body, is dropped
 * rather than re-dressed as a card.
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
                ? `\n                                <p class="figure__note post-fact-note">${esc(stat.context)}</p>`
                : '';
            return `\n                        <div class="figure post-fact">
                            <dt class="figure__label post-fact-label">${esc(stat.label)}</dt>
                            <dd class="post-fact-body">
                                <span class="figure__value post-fact-value">${esc(stat.value)}</span>${note}
                                <p class="post-fact-source">Source: ${esc(stat.source)}</p>
                            </dd>
                        </div>`;
        })
        .join('');

    return `<section class="post-figures" aria-labelledby="post-figures-title">
                        <h2 class="post-aside-title" id="post-figures-title">Figures in this article</h2>
                        <dl class="post-facts">${rows}
                        </dl>
                    </section>`;
}

/** Markdown tables become the shared data table inside their own scroller. */
function wrapTables(contentHtml) {
    return String(contentHtml).replace(
        /<table(\s[^>]*)?>([\s\S]*?)<\/table>/gi,
        (match, attrs) => {
            const withClass = /\sclass="/.test(attrs || '')
                ? match.replace(/\sclass="/, ' class="data-table ')
                : match.replace(/^<table/, '<table class="data-table"');
            return `<div class="post-table">${withClass}</div>`;
        }
    );
}

/** A quotation in the copy is a pull-quote, not an indented paragraph. */
function stylePullQuotes(contentHtml) {
    return String(contentHtml).replace(/<blockquote(\s[^>]*)?>/gi, (match, attrs) => {
        if (/\sclass="/.test(attrs || '')) return match.replace(/\sclass="/, ' class="pull-quote ');
        return '<blockquote class="pull-quote">';
    });
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
        .replace('<h2>', '<h2 class="post-aside-title post-sources-title">')
        .replace('<ul>', '<ul class="post-sources-list">')
        .replace(/<li>/g, '<li class="post-sources-item">')
        .replace(/\s+$/, '');

    return stripped.replace(
        '</section>',
        `  <p class="post-sources-disclaimer">${DISCLAIMER}</p>\n          </section>`
    );
}

/** Questions and answers as a definition list on the cream-dark band. */
function renderFAQ(faqs) {
    if (!Array.isArray(faqs) || faqs.length === 0) return '';
    const rows = faqs
        .filter((item) => item && item.question && item.answer)
        .map(
            (item) => `\n                        <div class="post-faq-row">
                            <dt class="post-faq-question">${esc(item.question)}</dt>
                            <dd class="post-faq-answer">${esc(item.answer)}</dd>
                        </div>`
        )
        .join('');
    if (!rows) return '';

    return `<section class="band band--cream-dark post-faq" aria-labelledby="post-faq-title">
                <div class="post-wrap">
                    <h2 class="post-faq-title" id="post-faq-title">Frequently asked questions</h2>
                    <dl class="dl-terms post-faq-list">${rows}
                    </dl>
                </div>
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
                `\n                        <li class="post-related-item"><a href="/blog/${item.slug}">${esc(item.frontmatter.title || item.slug)}</a></li>`
        )
        .join('');

    return `<nav class="post-related" aria-labelledby="post-related-title">
                <div class="post-wrap">
                    <h2 class="post-related-title" id="post-related-title">More in ${esc(category)}</h2>
                    <ul class="post-related-list">${items}
                    </ul>
                    <p class="post-related-all"><a href="/blog/category/${slugifyCategory(category)}">All ${esc(category)} articles</a></p>
                </div>
            </nav>`;
}

/**
 * The complete <article> markup for a post. Both renderers call this, so the
 * static template and the Eleventy layout cannot produce different DOM.
 *
 * Surfaces, in order: cream opener, the framed hero photograph, the white
 * reading sheet with its margin column, the cream-dark FAQ band, and the
 * related list back on cream.
 */
function renderArticleBody({ post, contentHtml, allPosts }) {
    const fm = post.frontmatter;
    const wordCount = fm.wordCount ? Number(fm.wordCount) : countWords(post.content || '');
    const { toc, content } = buildTOC(contentHtml, wordCount);
    const facts = renderFacts(fm.statistics || fm.stats, stripTags(content));
    const prose = stylePullQuotes(wrapTables(content));
    const hero = renderFigure(resolveHero(post));

    const asideParts = [facts, renderSources(post)].filter(Boolean);
    const aside = asideParts.length
        ? `<aside class="marginalia__aside post-aside">
                    ${asideParts.join('\n\n                    ')}
                </aside>`
        : '';
    const bodyClasses = ['marginalia', 'post-body'];
    if (!toc) bodyClasses.push('post-body--no-contents');
    if (!aside) bodyClasses.push('post-body--no-aside');

    const bodyInner = [toc, `<div class="marginalia__main post-main">
                        <div class="sheet post-prose">
${prose}
                        </div>
                    </div>`, aside].filter(Boolean);

    const sections = [
        `<div class="post-head">
                <div class="post-wrap">
                    ${renderCrumbs(fm.title || 'Untitled')}

                    ${renderOpener(post)}
                </div>
            </div>`,
        hero,
        `<div class="post-body-outer">
                <div class="post-wrap">
                    <div class="${bodyClasses.join(' ')}">
                        ${bodyInner.join('\n\n                    ')}
                    </div>
                </div>
            </div>`,
        renderFAQ(fm.faq || fm.faqs),
        renderRelated(post, allPosts || loadAllPosts()),
    ].filter(Boolean);

    return `<article class="post">\n            ${sections.join('\n\n            ')}\n        </article>`;
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
    readImageSize,
    renderArticleBody,
    renderFacts,
    renderFAQ,
    renderRelated,
    renderSources,
    resolveHero,
    slugifyCategory,
    slugifyHeading,
    stripTags,
    stylePullQuotes,
    wrapTables,
};
