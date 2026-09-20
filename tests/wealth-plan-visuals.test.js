/**
 * Wealth-plan posts keep the field-guide shell (no retired chrome) but they
 * get the snapshot strip, comparison chart, wider wrap and a real cover card.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const blogRender = require('../scripts/lib/blog-render');
const { ensurePlanCovers } = require('../scripts/lib/plan-covers');
const { applyTemplate, renderEntries } = require('../scripts/build-blog.js');

const ROOT = path.join(__dirname, '..');
const TEMPLATE_PATH = path.join(ROOT, 'templates', 'blog-post.html');

function planPost(slug) {
    const posts = blogRender.loadAllPosts();
    const post = posts.find((entry) => entry.slug === slug);
    assert.ok(post, `expected ${slug}`);
    return { post, posts };
}

test('isPlanPost matches wealth-plan slugs and the Wealth Plan category', () => {
    const { post } = planPost('blake-elisa-wealth-plan');
    assert.strictEqual(blogRender.isPlanPost(post), true);
    assert.ok(blogRender.headlineStat(post));
    assert.match(blogRender.headlineStat(post).value, /\$/);
    assert.ok(blogRender.planStatistics(post).length >= 3);
    assert.match(blogRender.planSubject(post), /Blake/);

    const guide = blogRender.loadAllPosts().find((entry) => entry.slug === '401k-strategy-for-beginners');
    if (guide) assert.strictEqual(blogRender.isPlanPost(guide), false);
});

test('parseMoneyAmount reads ranges, K suffixes and plus signs', () => {
    assert.strictEqual(blogRender.parseMoneyAmount('$15K-$25K'), 25000);
    assert.strictEqual(blogRender.parseMoneyAmount('$78,400'), 78400);
    assert.strictEqual(blogRender.parseMoneyAmount('$200K+'), 200000);
    assert.strictEqual(blogRender.parseMoneyAmount('Maxed 401(k)'), null);
});

test('wealth-plan article body has snapshot, chart, wider wrap and no retired chrome', () => {
    const { post } = planPost('blake-elisa-wealth-plan');
    const html = blogRender.renderArticleBody({
        post,
        contentHtml: marked(post.content),
        allPosts: blogRender.loadAllPosts(),
    });

    assert.match(html, /class="post-wrap post-wrap--plan"/);
    assert.match(html, /class="post-figure"/);
    assert.match(html, /class="plan-score"/);
    assert.ok(
        html.indexOf('class="post-figure"') < html.indexOf('class="plan-score"'),
        'cover figure should lead the snapshot'
    );
    assert.match(html, /Plan snapshot/);
    assert.match(html, /\$15K-\$25K|\$15K–\$25K/);
    assert.match(html, /class="plan-chart"/);
    assert.doesNotMatch(html, /stat-card/);
    assert.doesNotMatch(html, /article-intro-card/);
    assert.doesNotMatch(html, /article-rail/);
});

test('TOC labels decode heading entities once', () => {
    const { toc } = blogRender.buildTOC(
        '<h2>Blake &amp; Elisa&#39;s Plan</h2><h2>Second Section</h2><h2>Third Section</h2>',
        2000
    );
    assert.match(toc, /Blake &amp; Elisa&#39;s Plan/);
    assert.doesNotMatch(toc, /&amp;amp;/);
});

test('plan tables use the wide inset', () => {
    const wrapped = blogRender.wrapTables('<table><tr><td>$10</td></tr></table>', { wide: true });
    assert.match(wrapped, /class="table-inset table-inset--wide"/);
    const narrow = blogRender.wrapTables('<table><tr><td>$10</td></tr></table>');
    assert.match(narrow, /class="table-inset">/);
    assert.doesNotMatch(narrow, /table-inset--wide/);
});

test('wealth-plan category rows wrap a cover thumbnail beside the copy', async () => {
    const { post } = planPost('blake-elisa-wealth-plan');
    await ensurePlanCovers([post]);
    const listing = renderEntries([post], { thumbs: true });
    assert.match(listing, /list-rows--thumbs/);
    assert.match(listing, /list-rows__thumb/);
    assert.match(listing, /list-rows__body/);
    assert.match(listing, /plan-covers\/blake-elisa-wealth-plan/);
});

test('wealth-plan listing rows print the headline figure without thumbnails on the index', () => {
    const { post } = planPost('blake-elisa-wealth-plan');
    const index = renderEntries([post]);
    assert.match(index, /list-rows__hit/);
    assert.match(index, /list-rows__hit-value/);
    assert.doesNotMatch(index, /<img/);
    assert.doesNotMatch(index, /list-rows--thumbs/);
});

test('generated plan covers become the hero and og:image', async () => {
    const { post, posts } = planPost('blake-elisa-wealth-plan');
    await ensurePlanCovers([post]);

    const hero = blogRender.resolveHero(post);
    assert.strictEqual(hero.exists, true);
    assert.match(hero.src, /plan-covers\/blake-elisa-wealth-plan\.jpg$/);
    assert.ok(fs.existsSync(path.join(ROOT, hero.src.replace(/^\//, ''))));
    assert.ok(hero.width > 0 && hero.height > 0);

    const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    const page = applyTemplate(template, post, posts);
    assert.match(page, /<figure class="post-figure">/);
    assert.match(page, /property="og:image" content="https:\/\/www\.legacyinvestingshow\.com\/assets\/images\/blog\/plan-covers\/blake-elisa-wealth-plan\.jpg"/);
    assert.match(page, /class="plan-score"/);
});
