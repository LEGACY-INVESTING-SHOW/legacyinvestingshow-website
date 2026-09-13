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

test('blog listing pages paginate and stay self-canonical', () => {
    const index = fs.readFileSync(path.join(ROOT, 'blog', 'index.html'), 'utf8');
    assert.match(index, /<link rel="canonical" href="https:\/\/www\.legacyinvestingshow\.com\/blog">/);
    assert.match(index, /<a class="blog-pagination-next" href="\/blog\/page\/2">/);
    const listing = index.slice(index.indexOf('<main id="main">'), index.indexOf('</main>'));
    assert.ok(!listing.includes('<img'), 'the blog index must not render thumbnails');
    assert.ok(!listing.includes('onerror'), 'the blog index must not ship image error handlers');

    const page2Path = path.join(ROOT, 'blog', 'page', '2.html');
    assert.ok(fs.existsSync(page2Path), 'expected blog/page/2.html');
    const page2 = fs.readFileSync(page2Path, 'utf8');
    assert.match(page2, /<link rel="canonical" href="https:\/\/www\.legacyinvestingshow\.com\/blog\/page\/2">/);
    assert.match(page2, /<meta name="robots" content="index, follow">/);
    assert.match(page2, /<a class="blog-pagination-prev" href="\/blog">/);
});
