/**
 * Blog renderer parity.
 *
 * A post can be rendered two ways:
 *   1. scripts/build-blog.js + templates/blog-post.html  (static generator)
 *   2. cms/_includes/layouts/blog-post.njk               (Eleventy, canonical)
 *
 * Eleventy output overwrites the generator output during `npm run build`, so
 * the two must produce the same document. Both consume
 * scripts/lib/blog-render.js; this test proves they have not drifted by
 * comparing the class-name sequence of the shipped page with a fresh render
 * through the template path. The rest of the file holds the field guide
 * structure in place: one column, inset tables, no cards, no CTA on a post.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BLOG_DIR = path.join(ROOT, 'blog');
const TEMPLATE_PATH = path.join(ROOT, 'templates', 'blog-post.html');

const { applyTemplate } = require('../scripts/build-blog.js');
const blogRender = require('../scripts/lib/blog-render.js');

/** Ordered list of every class attribute value in the document. */
function classSequence(html) {
    return [...html.matchAll(/\sclass="([^"]*)"/g)].map((match) => match[1].trim().replace(/\s+/g, ' '));
}

function builtPosts() {
    return fs.readdirSync(BLOG_DIR).filter((name) => name.endsWith('.html') && name !== 'index.html');
}

/**
 * The published page is picked from posts that exercise the optional blocks:
 * contents list, inset tables, FAQ and related list.
 */
function pickSample() {
    const preferred = [
        '2026-mileage-reimbursement-rates',
        '212k-year-10-minutes-week',
        '401k-strategy-for-beginners',
    ];
    const posts = blogRender.loadAllPosts();
    for (const slug of preferred) {
        const post = posts.find((entry) => entry.slug === slug);
        if (post && fs.existsSync(path.join(BLOG_DIR, `${slug}.html`))) return post;
    }
    return posts.find((post) => fs.existsSync(path.join(BLOG_DIR, `${post.slug}.html`)));
}

test('blog post template and Eleventy layout emit the same class sequence', () => {
    const post = pickSample();
    assert.ok(post, 'expected at least one built blog post');

    const published = fs.readFileSync(path.join(BLOG_DIR, `${post.slug}.html`), 'utf8');
    const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    const rendered = applyTemplate(template, post, blogRender.loadAllPosts());

    assert.deepStrictEqual(
        classSequence(rendered),
        classSequence(published),
        `Class sequence drifted for ${post.slug}. Re-run: npm run build:blog`
    );
});

test('every built post keeps the field guide shell and drops the retired chrome', () => {
    const files = builtPosts();
    assert.ok(files.length > 100, 'expected the blog directory to hold the built posts');

    const banned = [
        'article-eyebrow',
        'article-intro-card',
        'article-rail',
        'stat-card',
        'reading-progress',
        'minimal-content',
        'header-glass',
        'fonts.googleapis.com',
        // retired in this pass: the sheet, the margin column, the bands,
        // the gold figure panels and the contents rail
        'marginalia',
        'sheet post-prose',
        'post-facts',
        'figure--gold',
        'band--cream-dark',
        'post-contents',
        'data-table',
    ];

    for (const name of files.slice(0, 40)) {
        const html = fs.readFileSync(path.join(BLOG_DIR, name), 'utf8');
        assert.match(html, /<article class="post">/, `${name} is missing the shared article shell`);
        assert.match(html, /assets\/css\/blog\.css/, `${name} does not link blog.css`);
        assert.doesNotMatch(html, / min read min read/, `${name} has a duplicated read-time suffix`);
        for (const needle of banned) {
            assert.ok(!html.includes(needle), `${name} still contains "${needle}"`);
        }
    }
});

test('a post is one 68ch column: plain meta line, no CTA block', () => {
    for (const name of builtPosts().slice(0, 40)) {
        const html = fs.readFileSync(path.join(BLOG_DIR, name), 'utf8');
        assert.match(html, /<div class="post-wrap/, `${name} lost the reading column`);
        assert.match(html, /<h1 class="post-title">/, `${name} lost .post-title`);
        assert.match(html, /<p class="meta post-meta">/, `${name} lost the plain meta line`);
        assert.match(html, /<div class="prose post-prose">/, `${name} lost .post-prose`);
        // meta is "author, date, read time" — never "A · B · C"
        const meta = html.match(/<p class="meta post-meta">([\s\S]*?)<\/p>/);
        assert.ok(meta && !meta[1].includes('·'), `${name} renders a middle-dot meta string`);
        // posts end without a closing CTA block
        const article = html.slice(html.indexOf('<article class="post">'), html.indexOf('</article>'));
        assert.ok(!/class="cta[ "]/.test(article), `${name} ships a CTA block`);
    }
});

test('optional post blocks use the shared kit objects', () => {
    const files = builtPosts();

    const withToc = files.find((name) =>
        fs.readFileSync(path.join(BLOG_DIR, name), 'utf8').includes('<details class="toc post-toc">')
    );
    assert.ok(withToc, 'expected at least one long post to carry an "On this page" list');
    const toc = fs.readFileSync(path.join(BLOG_DIR, withToc), 'utf8');
    assert.match(toc, /<summary class="toc__title">On this page<\/summary>/);

    const withTable = files.find((name) =>
        fs.readFileSync(path.join(BLOG_DIR, name), 'utf8').includes('<div class="table-inset">')
    );
    assert.ok(withTable, 'expected at least one post with an inset table');

    const withFaq = files.find((name) =>
        fs.readFileSync(path.join(BLOG_DIR, name), 'utf8').includes('<div class="faq post-faq-list">')
    );
    assert.ok(withFaq, 'expected at least one post with FAQ rows');

    const sample = fs.readFileSync(path.join(BLOG_DIR, files[0]), 'utf8');
    assert.match(sample, /<ul class="list-rows post-related-list">/, 'related posts must be list rows');
    assert.match(sample, /<ul class="post-sources-list">/, 'sources must be a plain list');

    // markdown blockquotes become pull-quotes; a worked example becomes a callout
    assert.match(
        blogRender.stylePullQuotes('<blockquote><p>x</p></blockquote>'),
        /<blockquote class="pull-quote">/
    );
    assert.match(
        blogRender.stylePullQuotes('<blockquote><p>Worked example: one house.</p></blockquote>'),
        /<div class="callout"><p class="callout__label">Worked example<\/p>/
    );
});

test('every table in a post is inset and its figures are right-aligned', () => {
    const html = fs.readFileSync(path.join(BLOG_DIR, '212k-year-10-minutes-week.html'), 'utf8');
    const tables = html.match(/<table(?:\s[^>]*)?>/g) || [];
    const insets = html.match(/<div class="table-inset">/g) || [];
    assert.ok(tables.length >= 2, 'expected the case study to keep its tables');
    assert.strictEqual(insets.length, tables.length, 'every table must sit inside .table-inset');
    assert.match(html, /<td class="num">/, 'numeric columns must be right-aligned');

    // a statistic never becomes a figure panel; it is at most a big sentence
    assert.ok(!html.includes('post-fact'), 'stat panels are retired');
});

test('a hero figure is only emitted for a real photograph, at its real size', () => {
    const posts = blogRender.loadAllPosts();

    const ogCardPost = posts.find(
        (post) => (post.frontmatter.image || '') === blogRender.FALLBACK_OG_IMAGE
    );
    if (ogCardPost) {
        const hero = blogRender.resolveHero(ogCardPost);
        assert.strictEqual(hero.exists, false, 'the shared OG card must not render as a hero figure');
        assert.match(hero.ogImage, /og-blog\.jpg$/);
    }

    const withHero = posts.find((post) => {
        const candidate = blogRender.resolveHero(post);
        return candidate.exists && candidate.figure !== false;
    });
    assert.ok(withHero, 'expected at least one post with a hero photograph');
    const hero = blogRender.resolveHero(withHero);
    assert.ok(hero.width > 0 && hero.height > 0, 'hero dimensions must be measured');

    const html = fs.readFileSync(path.join(BLOG_DIR, `${withHero.slug}.html`), 'utf8');
    assert.match(html, /<figure class="post-figure">/);
    assert.match(html, new RegExp(`width="${hero.width}" height="${hero.height}"`));
});

test('blog listing pages paginate and stay self-canonical', () => {
    const index = fs.readFileSync(path.join(BLOG_DIR, 'index.html'), 'utf8');
    assert.match(index, /<link rel="canonical" href="https:\/\/www\.legacyinvestingshow\.com\/blog">/);

    const listing = index.slice(index.indexOf('<main id="main">'), index.indexOf('</main>'));
    assert.ok(!listing.includes('<img'), 'blog index rows must not render thumbnails');
    assert.ok(!listing.includes('onerror'), 'the blog index must not ship image error handlers');

    const page2Path = path.join(BLOG_DIR, 'page', '2.html');
    assert.ok(fs.existsSync(page2Path), 'expected blog/page/2.html');
    const page2 = fs.readFileSync(page2Path, 'utf8');
    assert.match(page2, /<link rel="canonical" href="https:\/\/www\.legacyinvestingshow\.com\/blog\/page\/2">/);
    assert.match(page2, /<meta name="robots" content="index, follow">/);
    // every page number is a crawlable link, so no post is more than one hop away
    assert.match(page2, /<a class="blog-page-num" href="\/blog">1<\/a>/);
    assert.match(page2, /<span class="blog-page-num blog-page-num--current" aria-current="page">2<\/span>/);
});

test('listing pages are a heading, a lede, category links and list rows', () => {
    const index = fs.readFileSync(path.join(BLOG_DIR, 'index.html'), 'utf8');

    assert.match(index, /<h1 class="blog-title">Blog<\/h1>/);
    assert.match(index, /<p class="lede blog-lede">/);
    assert.match(index, /<nav class="blog-cats" aria-label="Browse by category">/);
    assert.match(index, /<ul class="list-rows blog-entries">/);
    for (const needle of ['blog-featured', 'sheet blog-sheet', 'blog-cat-count', 'figure--gold', 'band--cream-dark']) {
        assert.ok(!index.includes(needle), `the blog index still contains "${needle}"`);
    }

    const category = fs.readFileSync(path.join(BLOG_DIR, 'category', 'success-story.html'), 'utf8');
    assert.match(category, /<nav class="blog-cats" aria-label="Browse by category">/);
    assert.match(category, /<ul class="list-rows blog-entries">/);
    assert.match(category, /aria-current="page"/);
});
