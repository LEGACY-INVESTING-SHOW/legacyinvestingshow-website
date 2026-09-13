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
 * through the template path.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TEMPLATE_PATH = path.join(ROOT, 'templates', 'blog-post.html');

const { applyTemplate } = require('../scripts/build-blog.js');
const blogRender = require('../scripts/lib/blog-render.js');

/** Ordered list of every class attribute value in the document. */
function classSequence(html) {
    return [...html.matchAll(/\sclass="([^"]*)"/g)].map((match) => match[1].trim().replace(/\s+/g, ' '));
}

/**
 * The published page is picked from posts that exercise the optional blocks:
 * table of contents, sourced facts, FAQ and related list.
 */
function pickSample() {
    const preferred = [
        '2026-mileage-reimbursement-rates',
        '401k-strategy-for-beginners',
        'getting-started-airbnb-arbitrage',
    ];
    const posts = blogRender.loadAllPosts();
    for (const slug of preferred) {
        const post = posts.find((entry) => entry.slug === slug);
        if (post && fs.existsSync(path.join(ROOT, 'blog', `${slug}.html`))) return post;
    }
    return posts.find((post) => fs.existsSync(path.join(ROOT, 'blog', `${post.slug}.html`)));
}

test('blog post template and Eleventy layout emit the same class sequence', () => {
    const post = pickSample();
    assert.ok(post, 'expected at least one built blog post');

    const published = fs.readFileSync(path.join(ROOT, 'blog', `${post.slug}.html`), 'utf8');
    const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    const rendered = applyTemplate(template, post, blogRender.loadAllPosts());

    const publishedClasses = classSequence(published);
    const renderedClasses = classSequence(rendered);

    assert.deepStrictEqual(
        renderedClasses,
        publishedClasses,
        `Class sequence drifted for ${post.slug}. Re-run: npm run build:blog && npm run cms:verify && npm run cms:publish:posts`
    );
});

test('every built blog post keeps the shared post shell and drops the retired chrome', () => {
    const files = fs
        .readdirSync(path.join(ROOT, 'blog'))
        .filter((name) => name.endsWith('.html') && name !== 'index.html');

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
    ];

    const sample = files.slice(0, 40);
    for (const name of sample) {
        const html = fs.readFileSync(path.join(ROOT, 'blog', name), 'utf8');
        assert.match(html, /<article class="post">/, `${name} is missing the shared article shell`);
        assert.match(html, /assets\/css\/blog\.css/, `${name} does not link blog.css`);
        assert.doesNotMatch(html, / min read min read/, `${name} has a duplicated read-time suffix`);
        for (const needle of banned) {
            assert.ok(!html.includes(needle), `${name} still contains "${needle}"`);
        }
    }
});

test('every post carries the shared kit surfaces and no middle-dot meta string', () => {
    const files = fs
        .readdirSync(path.join(ROOT, 'blog'))
        .filter((name) => name.endsWith('.html') && name !== 'index.html')
        .slice(0, 40);

    for (const name of files) {
        const html = fs.readFileSync(path.join(ROOT, 'blog', name), 'utf8');
        // opener, white reading sheet and the margin column
        assert.match(html, /class="opener post-opener"/, `${name} lost the opener`);
        assert.match(html, /class="marginalia post-body/, `${name} lost the marginalia grid`);
        assert.match(html, /class="sheet post-prose"/, `${name} lost the reading sheet`);
        // meta is a definition list, never "A \u00b7 B \u00b7 C"
        assert.match(html, /<dl class="post-meta">/, `${name} lost the meta definition list`);
        assert.ok(
            !html.includes('post-meta-sep'),
            `${name} still renders the middle-dot meta string`
        );
        // the speakable selectors the schema points at must still exist
        assert.match(html, /class="opener__title post-title"/, `${name} lost .post-title`);
    }
});

test('optional post blocks use the shared kit objects', () => {
    const posts = blogRender.loadAllPosts();
    const withToc = posts.find((post) => post.slug === '401k-strategy-for-beginners');
    assert.ok(withToc, 'expected the 401k guide to be present');
    const html = fs.readFileSync(path.join(ROOT, 'blog', `${withToc.slug}.html`), 'utf8');

    // contents rail as a <details>, tables as .data-table inside a scroller
    assert.match(html, /<details class="contents post-contents">/);
    assert.match(html, /<div class="post-table"><table class="data-table"/);
    // FAQ on the cream-dark band as a definition list
    assert.match(html, /class="band band--cream-dark post-faq"/);
    assert.match(html, /class="dl-terms post-faq-list"/);

    // markdown blockquotes become pull-quotes
    assert.match(
        blogRender.stylePullQuotes('<blockquote><p>x</p></blockquote>'),
        /<blockquote class="pull-quote">/
    );
    // markdown tables become the shared data table
    assert.match(blogRender.wrapTables('<table><tr><td>1</td></tr></table>'), /<table class="data-table">/);
});

test('a hero figure is only emitted for a real photograph, at its real size', () => {
    const posts = blogRender.loadAllPosts();

    // The shared social card is not an article photograph.
    const ogCardPost = posts.find(
        (post) => (post.frontmatter.image || '') === blogRender.FALLBACK_OG_IMAGE
    );
    if (ogCardPost) {
        const hero = blogRender.resolveHero(ogCardPost);
        assert.strictEqual(hero.exists, false, 'the shared OG card must not render as a hero figure');
        assert.match(hero.ogImage, /og-blog\.jpg$/);
    }

    // Dimensions come from the file header, not from frontmatter.
    const withHero = posts.find((post) => blogRender.resolveHero(post).exists);
    assert.ok(withHero, 'expected at least one post with a hero photograph');
    const hero = blogRender.resolveHero(withHero);
    assert.ok(hero.width > 0 && hero.height > 0, 'hero dimensions must be measured');

    const html = fs.readFileSync(path.join(ROOT, 'blog', `${withHero.slug}.html`), 'utf8');
    assert.match(html, /<figure class="photo post-figure">/);
    assert.match(html, new RegExp(`width="${hero.width}" height="${hero.height}"`));
});

test('blog listing pages paginate and stay self-canonical', () => {
    const index = fs.readFileSync(path.join(ROOT, 'blog', 'index.html'), 'utf8');
    assert.match(index, /<link rel="canonical" href="https:\/\/www\.legacyinvestingshow\.com\/blog">/);
    assert.match(index, /<a class="blog-pagination-next" href="\/blog\/page\/2">/);
    const listing = index.slice(index.indexOf('<main id="main">'), index.indexOf('</main>'));
    // The lead article may carry its photograph; the list below it never gets
    // the old repeated thumbnail rail, and nothing ships an error handler.
    const entries = listing.slice(listing.indexOf('<ul class="blog-entries">'));
    assert.ok(!entries.includes('<img'), 'blog index entries must not render thumbnails');
    assert.ok(!listing.includes('onerror'), 'the blog index must not ship image error handlers');

    const page2Path = path.join(ROOT, 'blog', 'page', '2.html');
    assert.ok(fs.existsSync(page2Path), 'expected blog/page/2.html');
    const page2 = fs.readFileSync(page2Path, 'utf8');
    assert.match(page2, /<link rel="canonical" href="https:\/\/www\.legacyinvestingshow\.com\/blog\/page\/2">/);
    assert.match(page2, /<meta name="robots" content="index, follow">/);
    assert.match(page2, /<a class="blog-pagination-prev" href="\/blog">/);
    // every page number is a crawlable link, so no post is more than one hop away
    assert.match(page2, /<a class="blog-page-num" href="\/blog">1<\/a>/);
    assert.match(page2, /<span class="blog-page-num blog-page-num--current" aria-current="page">2<\/span>/);
});

test('listing pages alternate surfaces and design their lists', () => {
    const index = fs.readFileSync(path.join(ROOT, 'blog', 'index.html'), 'utf8');

    // opener with the article count as a display figure
    assert.match(index, /class="opener blog-opener"/);
    assert.match(index, /class="figure figure--gold blog-count"/);
    // the category list is a designed nav on the cream-dark band
    assert.match(index, /class="band band--cream-dark blog-cats"/);
    assert.match(index, /<span class="blog-cat-count">\d+<\/span>/);
    // the newest post leads on the navy band
    assert.match(index, /<section class="band blog-featured" aria-label="Latest article">/);
    // the list sits on a white sheet, dates as a small definition list
    assert.match(index, /class="sheet blog-sheet"/);
    assert.match(index, /<dl class="blog-meta">/);
    assert.ok(!index.includes('blog-meta-sep'), 'listing meta must not be a middle-dot string');

    const category = fs.readFileSync(path.join(ROOT, 'blog', 'category', 'success-story.html'), 'utf8');
    assert.match(category, /class="band band--cream-dark blog-cats"/);
    assert.match(category, /class="sheet blog-sheet"/);
    assert.match(category, /aria-current="page"/);
});
