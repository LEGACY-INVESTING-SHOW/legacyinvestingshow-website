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
const schemaOrg = require('./schema-org');

const ROOT_DIR = path.join(__dirname, '..', '..');
const CONTENT_DIR = path.join(ROOT_DIR, 'content', 'blog');
const INDEXATION_POLICY_PATH = path.join(ROOT_DIR, 'data', 'indexation-policy.json');

const SITE_DOMAIN = 'https://www.legacyinvestingshow.com';
const FALLBACK_OG_IMAGE = '/assets/images/og-blog.jpg';
const PLAN_COVER_DIR = '/assets/images/blog/plan-covers';
const TOC_MIN_WORDS = 1200;
const RELATED_LIMIT = 6;
const CURATED_RELATED_LIMIT = 4;
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
 * Wealth-plan case studies (and the older "wealth strategy snapshot" slugs)
 * keep the field-guide reading column for prose, but they get a wider wrap,
 * a number strip, a comparison chart and a generated cover so the designed
 * plan graphics are not lost to the speed/SEO pass.
 */
function isPlanPost(post) {
    const category = String((post && post.frontmatter && post.frontmatter.category) || '');
    const slug = String((post && post.slug) || '');
    return /wealth\s*plan/i.test(category) || /-(wealth-plan|wealth-strategy-snapshot)$/i.test(slug);
}

function planStatistics(post) {
    const raw = (post && post.frontmatter && (post.frontmatter.statistics || post.frontmatter.stats)) || [];
    if (!Array.isArray(raw)) return [];
    return raw
        .map((stat) => ({
            label: String((stat && stat.label) || '').trim(),
            value: String((stat && stat.value) || '').trim(),
        }))
        .filter((stat) => stat.label && stat.value)
        .slice(0, 8);
}

function planSubject(post) {
    const title = String((post && post.frontmatter && post.frontmatter.title) || '');
    const named = title.match(/^(.*?)\s*'s\s+(?:Wealth Plan|Wealth Strategy Snapshot)\b/i);
    if (named) return named[1].trim();
    const beforeColon = title.split(':')[0].replace(/\bWealth Plan\b/i, '').trim();
    return beforeColon || 'Wealth Plan';
}

const OUTCOME_LABEL = /savings|roi|value|year.?one|tax|cash flow|impact|projected/i;

function headlineStat(post) {
    const stats = planStatistics(post);
    if (stats.length === 0) return null;
    const dollar = stats.filter((stat) => /\$/.test(stat.value));
    const outcome = dollar.find((stat) => OUTCOME_LABEL.test(stat.label));
    return outcome || dollar[0] || stats[0];
}

/** Highest dollar figure in a cell like "$15K-$25K" or "$78,400+". */
function parseMoneyAmount(value) {
    if (!/\$/.test(String(value || ''))) return null;
    const chunks = String(value)
        .replace(/,/g, '')
        .split(/[-–—]|to/i);
    let max = null;
    for (const chunk of chunks) {
        const match = chunk.match(/(\d+(?:\.\d+)?)\s*([KMB])?/i);
        if (!match) continue;
        const amount = Number(match[1]);
        if (!Number.isFinite(amount)) continue;
        const suffix = (match[2] || '').toUpperCase();
        const scale = suffix === 'K' ? 1e3 : suffix === 'M' ? 1e6 : suffix === 'B' ? 1e9 : 1;
        const next = amount * scale;
        if (max === null || next > max) max = next;
    }
    return max;
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
        const cover = planCoverHero(post);
        if (cover) return cover;
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

function planCoverHero(post) {
    if (!isPlanPost(post) || !post.slug) return null;
    const jpg = `${PLAN_COVER_DIR}/${post.slug}.jpg`;
    if (!fileExistsInRepo(jpg)) return null;
    const webp = `${PLAN_COVER_DIR}/${post.slug}.webp`;
    const size = readImageSize(path.join(ROOT_DIR, jpg.replace(/^\//, ''))) || { width: 1200, height: 630 };
    const alt =
        (post.frontmatter && post.frontmatter.imageAlt) ||
        `${planSubject(post)} wealth plan snapshot`;
    return {
        exists: true,
        src: jpg,
        webp: fileExistsInRepo(webp) ? webp : '',
        alt,
        width: size.width,
        height: size.height,
        ogImage: SITE_DOMAIN + jpg,
    };
}


// ------------------------------------------------------------ article parts

/** Sentence case for a category shown in prose; initialisms keep their caps. */
function categoryLabel(category) {
    const value = String(category || '').trim();
    if (!value) return '';
    if (/^(LLC|S-corp|C-corp|IRA|401\(k\))/i.test(value)) return value;
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

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
 * Title, lede and one plain meta line. Author, date and read time are
 * separated by commas and spaces: no middle dots, no definition list.
 */
function renderPostHeader(post) {
    const fm = post.frontmatter;
    const readTime = normalizeReadTime(post);
    const published = formatDate(fm.date);
    const lede = fm.description
        ? `\n        <p class="lede post-lede">${esc(fm.description)}</p>`
        : '';

    const modifiedRaw = fm.modifiedDate || fm.updatedAt || '';
    // A "last updated" line older than the publication date is worse than none.
    const isLater = modifiedRaw && new Date(modifiedRaw) > new Date(fm.date);
    const modified = isLater ? formatDate(modifiedRaw) : '';
    const updated =
        modified && modified !== published
            ? `, updated <time datetime="${formatISODate(modifiedRaw)}">${esc(modified)}</time>`
            : '';

    // The byline links to the author page so the Person @id in the Article
    // schema has a crawlable page behind it.
    const byline = `<a href="/about/preston-seo" rel="author">${esc(fm.author || 'Preston Seo')}</a>`;

    return `<h1 class="post-title">${esc(fm.title || 'Untitled')}</h1>${lede}
        <p class="meta post-meta">${byline}, <time datetime="${formatISODate(fm.date)}">${esc(published)}</time>, ${readTime} min read${updated}</p>`;
}

/**
 * The answer-first block. `seo.targetSnippet` is the sentence the post is
 * written to win, so it leads. Posts without one fall back to the description,
 * and the block is skipped when that would just repeat the lede above it.
 */
function renderQuickAnswer(post) {
    const fm = post.frontmatter;
    const snippet = fm.seo && fm.seo.targetSnippet ? String(fm.seo.targetSnippet).trim() : '';
    const answer = snippet || String(fm.description || '').trim();

    if (!answer) return '';
    if (!snippet && answer === String(fm.description || '').trim()) return '';

    return `<section class="post-answer" aria-label="Quick answer">
            <p class="post-answer-eyebrow">Quick answer</p>
            <p class="post-answer-copy">${esc(answer)}</p>
        </section>`;
}

/** The hero photograph, rounded, no frame. Only when the file is really there. */
function renderFigure(hero) {
    if (!hero.exists) return '';
    const dims = hero.width && hero.height ? ` width="${hero.width}" height="${hero.height}"` : '';
    const img = `<img src="${esc(hero.src)}" alt="${esc(hero.alt)}"${dims} loading="eager" fetchpriority="high" decoding="async">`;
    const picture = hero.webp
        ? `<picture><source srcset="${esc(hero.webp)}" type="image/webp">${img}</picture>`
        : img;
    return `<figure class="post-figure">${picture}</figure>`;
}

function renderPlanScore(post) {
    const stats = planStatistics(post);
    if (!isPlanPost(post) || stats.length === 0) return '';

    const items = stats
        .map(
            (stat) =>
                `\n            <div class="plan-score__item">\n                <dt>${esc(stat.label)}</dt>\n                <dd>${esc(stat.value)}</dd>\n            </div>`
        )
        .join('');

    return `<section class="plan-score" aria-label="Plan snapshot">
            <p class="plan-score__kicker">Plan snapshot</p>
            <dl class="plan-score__grid">${items}
            </dl>
        </section>`;
}

function renderPlanChart(post) {
    if (!isPlanPost(post)) return '';
    const rows = planStatistics(post)
        .map((stat) => ({ ...stat, amount: parseMoneyAmount(stat.value) }))
        .filter((stat) => stat.amount && stat.amount > 0);
    if (rows.length < 2) return '';

    const max = Math.max(...rows.map((row) => row.amount));
    const items = rows
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 6)
        .map((row) => {
            const width = Math.max(8, Math.round((row.amount / max) * 100));
            return `\n            <li class="plan-chart__row">
                <span class="plan-chart__label">${esc(row.label)}</span>
                <span class="plan-chart__value">${esc(row.value)}</span>
                <span class="plan-chart__track" aria-hidden="true"><span class="plan-chart__fill" style="width:${width}%"></span></span>
            </li>`;
        })
        .join('');

    return `<section class="plan-chart" aria-label="How the numbers compare">
            <p class="plan-chart__kicker">How the numbers compare</p>
            <ul class="plan-chart__list">${items}
            </ul>
        </section>`;
}

/**
 * Heading anchors plus an "On this page" list for long reads only. It is a
 * plain list, not a rail: a <details> on a phone, forced open from 900px.
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

    const sections = headings.filter((heading) => heading.level === 2);
    if (wordCount < TOC_MIN_WORDS || sections.length < 3) {
        return { toc: '', content };
    }

    // Some posts ship their own "In this article" anchor list. Do not print a
    // second one underneath it.
    const inlineAnchors = (String(contentHtml).match(/href="#[a-z0-9-]+"/gi) || []).length;
    if (inlineAnchors >= 4) {
        return { toc: '', content };
    }

    const items = sections
        .map(
            (item) =>
                `\n                <li class="toc__item"><a href="#${item.slug}">${esc(item.label)}</a></li>`
        )
        .join('');

    const toc = `<details class="toc post-toc">
            <summary class="toc__title">On this page</summary>
            <ol class="toc__list">${items}
            </ol>
        </details>`;

    return { toc, content };
}

// ----------------------------------------------------------------- tables

const CELL_PATTERN = /<(t[hd])(\s[^>]*)?>([\s\S]*?)<\/\1>/gi;

/** A cell is a number when it carries digits and no real word. */
function isNumericCell(html) {
    const value = stripTags(decodeEntities(html)).trim();
    if (!value || !/\d/.test(value)) return false;
    return !/[A-Za-z]{4,}/.test(value);
}

/** Right-align the columns that hold numbers, so figures line up. */
function annotateTable(tableHtml) {
    const rows = (String(tableHtml).match(/<tr(?:\s[^>]*)?>[\s\S]*?<\/tr>/gi) || []);
    const tally = [];
    for (const row of rows) {
        let index = -1;
        for (const cell of row.matchAll(CELL_PATTERN)) {
            index += 1;
            if (cell[1].toLowerCase() !== 'td') continue;
            if (!tally[index]) tally[index] = { total: 0, numeric: 0 };
            tally[index].total += 1;
            if (isNumericCell(cell[3])) tally[index].numeric += 1;
        }
    }
    const numeric = tally.map((column) => Boolean(column && column.total > 0 && column.numeric / column.total >= 0.6));
    if (!numeric.some(Boolean)) return tableHtml;

    return String(tableHtml).replace(/<tr(\s[^>]*)?>([\s\S]*?)<\/tr>/gi, (match, attrs, inner) => {
        let index = -1;
        const next = inner.replace(CELL_PATTERN, (cellMatch, tag, cellAttrs, body) => {
            index += 1;
            if (!numeric[index]) return cellMatch;
            if (cellAttrs && /\sclass="/.test(cellAttrs)) {
                return cellMatch.replace(/\sclass="/, ' class="num ');
            }
            return `<${tag}${cellAttrs || ''} class="num">${body}</${tag}>`;
        });
        return `<tr${attrs || ''}>${next}</tr>`;
    });
}

const TABLE_PATTERN =
    /<table(?:\s[^>]*)?>[\s\S]*?<\/table>(?:\s*<p>(?:<em>)?\s*(?:Sources?|Note)\b[\s\S]*?<\/p>)?/gi;

/**
 * Every table is inset: it sits in its own column, narrower than the text, and
 * keeps its source line with it as a caption.
 */
function wrapTables(contentHtml, options = {}) {
    const wideClass = options.wide ? ' table-inset--wide' : '';
    return String(contentHtml).replace(TABLE_PATTERN, (match) => {
        const end = match.toLowerCase().lastIndexOf('</table>') + '</table>'.length;
        const table = annotateTable(match.slice(0, end));
        const trailing = match.slice(end).trim();
        const caption = trailing
            ? `\n<p class="cap">${trailing
                  .replace(/^<p>/i, '')
                  .replace(/<\/p>$/i, '')
                  .replace(/^<em>/i, '')
                  .replace(/<\/em>$/i, '')
                  .trim()}</p>`
            : '';
        return `<div class="table-inset${wideClass}">${table}${caption}</div>`;
    });
}

// --------------------------------------------------------- quotes and stats

const CALLOUT_LEAD = /^(worked example|example|scenario|how to read this)\b/i;

/**
 * A quotation that opens a worked example becomes a callout; every other
 * blockquote is a plain pull-quote.
 */
function stylePullQuotes(contentHtml) {
    return String(contentHtml).replace(
        /<blockquote(?:\s[^>]*)?>([\s\S]*?)<\/blockquote>/gi,
        (match, inner) => {
            const lead = stripTags(decodeEntities(inner)).trim().match(CALLOUT_LEAD);
            if (lead) {
                const isReading = /how to read this/i.test(lead[1]);
                const label = isReading ? 'How to read this' : 'Worked example';
                const variant = isReading ? ' callout--gold' : '';
                return `<div class="callout${variant}"><p class="callout__label">${label}</p>${inner}</div>`;
            }
            return `<blockquote class="pull-quote">${inner}</blockquote>`;
        }
    );
}

/**
 * Sourced statistics never become a figure panel. When the markdown already
 * states the number inside a sentence, that sentence is promoted to a big
 * statement in place. When it does not, the statistic is dropped.
 */
function promoteBigStatements(contentHtml, statistics) {
    if (!Array.isArray(statistics) || statistics.length === 0) return contentHtml;

    const values = [
        ...new Set(
            statistics
                .filter((stat) => stat && stat.value && stat.source && String(stat.source).trim())
                .map((stat) => String(stat.value).trim())
                .filter((value) => value.length >= 2)
        ),
    ];
    if (values.length === 0) return contentHtml;

    const used = new Set();
    return String(contentHtml).replace(/<p>([\s\S]*?)<\/p>/gi, (match, inner) => {
        if (used.size >= 2) return match;
        const text = stripTags(decodeEntities(inner)).trim();
        if (!text || text.length > 180) return match;
        if ((text.match(/[.!?](?:\s|$)/g) || []).length > 1) return match;
        const hit = values.find((value) => !used.has(value) && text.includes(value));
        if (!hit) return match;
        used.add(hit);
        return `<div class="big"><p>${inner}</p></div>`;
    });
}

// -------------------------------------------------------- sources, faq, more

// --------------------------------------------------------------- video

const YOUTUBE_IFRAME_PATTERN =
    /<iframe\b[^>]*?\bsrc="https?:\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{6,})[^"]*"[^>]*>\s*<\/iframe>/gi;

const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{6,}$/;

const VIMEO_IFRAME_PATTERN =
    /<iframe\b[^>]*?\bsrc="https?:\/\/player\.vimeo\.com\/video\/(\d{6,})[^"]*"[^>]*>\s*<\/iframe>/gi;

const VIMEO_ID_PATTERN = /^\d{6,}$/;

function youtubeThumbnail(videoId) {
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

/** Vimeo gives no public thumbnail URL, so the proof images ship with the site. */
function vimeoThumbnail(videoId) {
    return `/assets/images/lwb-proof/video-${videoId}.jpg`;
}

/**
 * A raw YouTube <iframe> costs about a megabyte and sets cookies before the
 * reader asks for anything. Each one becomes a button showing the video
 * thumbnail; the iframe is injected, with autoplay, only on click.
 */
function youtubeFacades(contentHtml) {
    return String(contentHtml).replace(YOUTUBE_IFRAME_PATTERN, (match, videoId) => {
        const titleMatch = match.match(/\btitle="([^"]*)"/i);
        const videoTitle = titleMatch ? decodeEntities(titleMatch[1]).trim() : '';
        const label = videoTitle ? `Play video: ${videoTitle}` : 'Play video';

        return `<div class="yt-facade" data-youtube-id="${esc(videoId)}"${
            videoTitle ? ` data-youtube-title="${esc(videoTitle)}"` : ''
        }>
            <button type="button" class="yt-facade-btn" aria-label="${esc(label)}">
                <img class="yt-facade-thumb" src="${esc(youtubeThumbnail(videoId))}" alt="" width="480" height="360" loading="lazy" decoding="async">
                <span class="yt-facade-play" aria-hidden="true"></span>
            </button>
        </div>`;
    });
}

/** Same click-to-play facade for the Vimeo interviews, same markup and styles. */
function vimeoFacades(contentHtml) {
    return String(contentHtml).replace(VIMEO_IFRAME_PATTERN, (match, videoId) => {
        const titleMatch = match.match(/\btitle="([^"]*)"/i);
        const videoTitle = titleMatch ? decodeEntities(titleMatch[1]).trim() : '';
        const label = videoTitle ? `Play video: ${videoTitle}` : 'Play video';

        return `<div class="yt-facade" data-vimeo-id="${esc(videoId)}"${
            videoTitle ? ` data-vimeo-title="${esc(videoTitle)}"` : ''
        }>
            <button type="button" class="yt-facade-btn" aria-label="${esc(label)}">
                <img class="yt-facade-thumb" src="${esc(vimeoThumbnail(videoId))}" alt="" width="640" height="360" loading="lazy" decoding="async">
                <span class="yt-facade-play" aria-hidden="true"></span>
            </button>
        </div>`;
    });
}

/**
 * VideoObject for any post that names a `youtubeId` or a `vimeoId`. Video
 * results and AI answers need the thumbnail, the upload date and a publisher,
 * so the node points back at the shared Organization `@id`.
 */
function renderVideoSchema(post) {
    const fm = post.frontmatter || {};
    const youtubeId = String(fm.youtubeId || '').trim();
    const vimeoId = String(fm.vimeoId || '').trim();

    let thumbnailUrl = '';
    let embedUrl = '';
    let contentUrl = '';

    if (youtubeId && YOUTUBE_ID_PATTERN.test(youtubeId)) {
        thumbnailUrl = youtubeThumbnail(youtubeId);
        embedUrl = `https://www.youtube.com/embed/${youtubeId}`;
        contentUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
    } else if (vimeoId && VIMEO_ID_PATTERN.test(vimeoId)) {
        thumbnailUrl = `${SITE_DOMAIN}${vimeoThumbnail(vimeoId)}`;
        embedUrl = `https://player.vimeo.com/video/${vimeoId}`;
        contentUrl = `https://vimeo.com/${vimeoId}`;
    } else {
        return '';
    }

    const uploadDate = formatISODate(fm.date);
    const name = String(fm.videoTitle || fm.title || '').trim();
    const description = String(fm.videoDescription || fm.description || '').trim();
    if (!name || !uploadDate) return '';

    const video = {
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        name,
        description,
        thumbnailUrl,
        uploadDate,
        embedUrl,
        contentUrl,
        publisher: schemaOrg.organization(),
    };

    return schemaOrg.renderJsonLdScript(video, 4);
}

/**
 * The shared source block ships inline styles for the legacy card look. Blog
 * posts drop the chrome: a heading, a hairline list, the disclaimer once.
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
        .replace('<p>', '<p class="post-sources-note">')
        .replace('<ul>', '<ul class="post-sources-list">')
        .replace(/<li>/g, '<li class="post-sources-item">')
        .replace(/\s+$/, '');

    return stripped.replace(
        '</section>',
        `  <p class="post-disclaimer">${DISCLAIMER}</p>\n        </section>`
    );
}

/** Questions as disclosure rows on hairlines. No box, no eyebrow. */
function renderFAQ(faqs) {
    if (!Array.isArray(faqs) || faqs.length === 0) return '';
    const rows = faqs
        .filter((item) => item && item.question && item.answer)
        .map(
            (item) => `\n                <details>
                    <summary>${esc(item.question)}</summary>
                    <p class="faq__answer">${esc(item.answer)}</p>
                </details>`
        )
        .join('');
    if (!rows) return '';

    return `<section class="post-faq" aria-labelledby="post-faq-title">
            <h2 class="post-faq-title" id="post-faq-title">Frequently asked questions</h2>
            <div class="faq post-faq-list">${rows}
            </div>
        </section>`;
}

/** Resolve `relatedPosts` frontmatter (slug strings or {slug} objects). */
function curatedRelated(post, pool, limit = CURATED_RELATED_LIMIT) {
    const raw = post.frontmatter.relatedPosts;
    if (!Array.isArray(raw) || raw.length === 0) return [];

    const bySlug = new Map(pool.map((candidate) => [candidate.slug, candidate]));
    const picks = [];
    const seen = new Set([post.slug]);

    for (const entry of raw) {
        if (picks.length >= limit) break;
        const slug = typeof entry === 'string' ? entry : entry && entry.slug;
        if (!slug || seen.has(slug)) continue;
        const match = bySlug.get(slug);
        if (!match) continue;
        seen.add(slug);
        picks.push(match);
    }

    return picks;
}

function allLinkFor(category, pool) {
    const sameCategory = pool.filter(
        (candidate) => normalizeCategoryForArchives(candidate.frontmatter.category || 'Investing') === category
    );

    return sameCategory.length >= 3
        ? `<p class="post-related-all"><a href="/blog/category/${slugifyCategory(category)}">All ${esc(categoryLabel(category))} articles</a></p>`
        : '<p class="post-related-all"><a href="/blog">All articles</a></p>';
}

function renderRelatedList(heading, picks, allLink) {
    const items = picks
        .map((item) => {
            const fm = item.frontmatter;
            const description = fm.description
                ? `\n                    <p class="list-rows__desc">${esc(fm.description)}</p>`
                : '';
            return `\n                <li class="list-rows__item">
                    <p class="list-rows__title"><a href="/blog/${item.slug}">${esc(fm.title || item.slug)}</a></p>${description}
                    <p class="list-rows__meta">${esc(formatDate(fm.date))}, ${normalizeReadTime(item)} min read</p>
                </li>`;
        })
        .join('');

    return `<nav class="post-related" aria-labelledby="post-related-title">
            <h2 class="post-related-title" id="post-related-title">${esc(heading)}</h2>
            <ul class="list-rows post-related-list">${items}
            </ul>
            ${allLink}
        </nav>`;
}

/** "More in <category>" as editorial list rows. Same category first. */
function renderRelated(post, allPosts, limit = RELATED_LIMIT) {
    const category = normalizeCategoryForArchives(post.frontmatter.category || 'Investing');
    const pool = allPosts.filter((candidate) => candidate.slug !== post.slug && isIndexableBlogPost(candidate));

    // A hand-picked relatedPosts list wins. Slugs that no longer resolve to an
    // indexable post are dropped rather than linked into a noindex URL.
    const curated = curatedRelated(post, pool);
    if (curated.length > 0) {
        return renderRelatedList('Related guides', curated, allLinkFor(category, pool));
    }

    const sameCategory = pool.filter(
        (candidate) => normalizeCategoryForArchives(candidate.frontmatter.category || 'Investing') === category
    );

    // A "More in <category>" heading has to be true. When the category is too
    // thin to fill the list, the list becomes the newest posts instead.
    const inCategory = sameCategory.length >= 3;
    const picks = (inCategory ? sameCategory : pool).slice(0, limit);
    if (picks.length === 0) return '';

    const heading = inCategory ? `More in ${esc(categoryLabel(category))}` : 'More from the blog';

    return renderRelatedList(heading, picks, allLinkFor(category, pool));
}

/**
 * The complete <article> markup for a post. Both renderers call this, so the
 * static template and the Eleventy layout cannot produce different DOM.
 *
 * One column on paper: breadcrumb, title, lede, meta line, optional photograph,
 * "On this page" on long reads, the prose with inset tables, sources, FAQ rows
 * and the related list. Posts end without a CTA block.
 */
function renderArticleBody({ post, contentHtml, allPosts }) {
    const fm = post.frontmatter;
    const plan = isPlanPost(post);
    const wordCount = fm.wordCount ? Number(fm.wordCount) : countWords(post.content || '');
    const { toc, content } = buildTOC(contentHtml, wordCount);
    const prose = vimeoFacades(
        youtubeFacades(
            promoteBigStatements(
                stylePullQuotes(wrapTables(content, { wide: plan })),
                fm.statistics || fm.stats
            )
        )
    );

    const parts = [
        renderCrumbs(fm.title || 'Untitled'),
        renderPostHeader(post),
        renderQuickAnswer(post),
        renderPlanScore(post),
        renderPlanChart(post),
        renderFigure(resolveHero(post)),
        toc,
        `<div class="prose post-prose">\n${prose}\n        </div>`,
        renderSources(post),
        renderFAQ(fm.faq || fm.faqs),
        renderRelated(post, allPosts || loadAllPosts()),
        renderVideoSchema(post),
    ].filter(Boolean);

    const wrapClass = plan ? 'post-wrap post-wrap--plan' : 'post-wrap';

    return `<article class="post">
        <div class="${wrapClass}">
        ${parts.join('\n\n        ')}
        </div>
    </article>`;
}

// ------------------------------------------------------------------ exports

module.exports = {
    CONTENT_DIR,
    DISCLAIMER,
    FALLBACK_OG_IMAGE,
    PLAN_COVER_DIR,
    POSTS_PER_PAGE,
    ROOT_DIR,
    SITE_DOMAIN,
    annotateTable,
    buildTOC,
    categoryLabel,
    countWords,
    esc,
    fileExistsInRepo,
    formatDate,
    formatISODate,
    getBlogIndexation,
    headlineStat,
    isIndexableBlogPost,
    isPlanPost,
    loadAllPosts,
    normalizeCategoryForArchives,
    normalizeReadTime,
    parseMarkdownFile,
    parseMoneyAmount,
    planStatistics,
    planSubject,
    promoteBigStatements,
    readImageSize,
    renderArticleBody,
    renderFAQ,
    renderPlanChart,
    renderPlanScore,
    renderQuickAnswer,
    renderRelated,
    renderSources,
    renderVideoSchema,
    resolveHero,
    slugifyCategory,
    slugifyHeading,
    stripTags,
    stylePullQuotes,
    vimeoFacades,
    wrapTables,
    youtubeFacades,
};
