#!/usr/bin/env node

/**
 * Build crawlable topic hub pages from the canonical blog markdown corpus.
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const {
    renderAnalyticsBody,
    renderAnalyticsHead,
    renderHeadAssets,
    renderSiteFooter,
    renderSiteHeader,
} = require('./lib/site-shell');

const ROOT_DIR = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT_DIR, 'content', 'blog');
const OUTPUT_DIR = path.join(ROOT_DIR, 'topics');
const INDEXATION_POLICY_PATH = path.join(ROOT_DIR, 'data', 'indexation-policy.json');
const SITE_URL = process.env.SITE_URL || 'https://www.legacyinvestingshow.com';
const GA_TRACKING_ID = process.env.GA_TRACKING_ID || 'G-2578PT1WSS';
const GTM_CONTAINER_ID = process.env.GTM_CONTAINER_ID || 'GTM-KQ4R2LKP';
const GOOGLE_SITE_VERIFICATIONS = [
    'Kec6RfGhFL-qG_8zKxCqt7yxjgy65WeDAftCBm90G2s',
    '92MoCnkdQOj_ey1lEafT5Mz-znCcCQ3UABZlI-JG_nM',
];

const TOPIC_HUBS = [
    {
        slug: 'tax-strategies',
        title: 'Tax Strategies',
        description: 'Compare practical tax planning guides, deduction frameworks, entity decisions, and retirement tax moves for high-income earners and business owners.',
        intro: 'Tax strategy works when the pieces are organized before filing season: income timing, entity structure, deductions, retirement accounts, real estate losses, and documentation. This hub groups the most useful Legacy Investing Show tax guides so readers can move from broad planning to specific execution pages without wandering through the full archive.',
        categoryMatches: ['Tax Strategies'],
        keywordMatches: ['tax', 'qbi', 'deduction', 'roth', 'hsa', '1031', 'cost-segregation', 's-corp', 'estate-tax', 'capital-gains'],
    },
    {
        slug: 'business-structures',
        title: 'Business Structures',
        description: 'Entity planning guides for LLCs, S corporations, registered agents, operating agreements, business credit, and legal structure decisions.',
        intro: 'Entity structure should clarify risk, taxes, operations, and banking. This hub collects the business structure articles that help readers compare LLCs, S corporations, registered agents, operating agreements, and related implementation choices.',
        categoryMatches: ['Business Structures'],
        keywordMatches: ['llc', 's-corp', 'registered-agent', 'operating-agreement', 'corporate-veil', 'business-credit', 'entity'],
    },
    {
        slug: 'retirement',
        title: 'Retirement',
        description: 'Retirement planning guides covering 401(k)s, IRAs, withdrawal sequencing, Roth conversions, annuities, and tax-aware income planning.',
        intro: 'Retirement planning is not just an account choice. The useful work is sequencing contributions, conversions, withdrawals, healthcare costs, income floors, and tax brackets over time. This hub organizes the retirement guides into one crawlable path.',
        categoryMatches: ['Retirement'],
        keywordMatches: ['retirement', '401k', '401-k', 'ira', 'roth', 'annuity', 'withdrawal', 'pension'],
    },
    {
        slug: 'investing',
        title: 'Investing',
        description: 'Investing education on asset allocation, rental property, ETFs, bonds, income streams, BRRRR, notes investing, and portfolio tax implications.',
        intro: 'Investing decisions improve when readers can compare cash flow, taxes, liquidity, volatility, and time commitment side by side. This hub gathers the investing guides and related real estate, portfolio, and passive income articles.',
        categoryMatches: ['Investing', 'Passive Income', 'Real Estate', 'Wealth Building', 'Real Estate Investing', 'Real Estate Strategy', 'Investing Strategy'],
        keywordMatches: ['investing', 'asset-allocation', 'rental-property', 'brrrr', 'cash-flow', 'portfolio', 'etf', 'mutual-fund', 'bonds', 'reits'],
    },
    {
        slug: 'debt-management',
        title: 'Debt Management',
        description: 'Debt payoff frameworks, student loan strategies, DTI planning, debt avalanche guides, consolidation decisions, and cash-flow tradeoffs.',
        intro: 'Debt strategy is not only about paying balances faster. The better question is how each move affects cash flow, credit, tax exposure, and the next asset-building step. This hub groups the debt management guides into a practical reading path.',
        categoryMatches: ['Debt Management'],
        keywordMatches: ['debt', 'student-loan', 'dti', 'consolidation', 'avalanche', 'snowball', 'payoff', 'heloc'],
    },
    {
        slug: 'airbnb-arbitrage',
        title: 'Airbnb Arbitrage',
        description: 'Airbnb arbitrage guides, startup cost breakdowns, pricing systems, occupancy strategy, tax implications, and student success stories.',
        intro: 'Airbnb arbitrage content needs both strategy and execution: market selection, landlord conversations, furnishing budgets, pricing, guest operations, taxes, and real examples. This hub connects the core Airbnb guides and success stories.',
        categoryMatches: ['Airbnb Arbitrage', 'Success Story', 'Success Stories', 'How-To Guide', 'Getting Started', 'Strategy', 'Case Study', 'Side Hustles'],
        keywordMatches: ['airbnb', 'short-term-rental', 'occupancy', 'pricing-strategy', 'startup-cost', 'guest', 'landlord'],
    },
    {
        slug: 'wealth-building',
        title: 'Wealth Building',
        description: 'Wealth-building articles on income streams, tax strategy, asset acquisition, and long-term financial independence planning.',
        intro: 'Wealth building is the system that connects income, taxes, cash flow, debt, business structure, and investments. This hub points readers to the highest-signal guides for building durable momentum.',
        categoryMatches: ['Wealth Building', 'Wealth Plan'],
        keywordMatches: ['wealth', 'income-stream', 'financial-independence', 'million', 'cash-flow'],
    },
];

function loadIndexationPolicy() {
    if (!fs.existsSync(INDEXATION_POLICY_PATH)) {
        return {
            blogRedirects: [],
            forceIndexBlogSlugs: [],
            noindexBlogSlugPatterns: [],
        };
    }

    return JSON.parse(fs.readFileSync(INDEXATION_POLICY_PATH, 'utf8'));
}

const INDEXATION_POLICY = loadIndexationPolicy();
const FORCE_INDEX_BLOG_SLUGS = new Set(INDEXATION_POLICY.forceIndexBlogSlugs || []);
const BLOG_REDIRECT_SOURCES = new Set(
    (INDEXATION_POLICY.blogRedirects || [])
        .filter((entry) => entry.source)
        .map((entry) => entry.source.replace(/^\/blog\//, ''))
);
const NOINDEX_BLOG_PATTERNS = (INDEXATION_POLICY.noindexBlogSlugPatterns || [])
    .map((entry) => new RegExp(entry.pattern));

function isIndexableBlogPost(post) {
    const robots = post.frontmatter.robots || post.frontmatter.metaRobots || '';
    if (/noindex/i.test(robots)) return false;
    if (BLOG_REDIRECT_SOURCES.has(post.slug)) return false;
    if (FORCE_INDEX_BLOG_SLUGS.has(post.slug)) return true;
    return !NOINDEX_BLOG_PATTERNS.some((regex) => regex.test(post.slug));
}

function esc(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function getMarkdownPosts() {
    if (!fs.existsSync(CONTENT_DIR)) return [];

    return fs.readdirSync(CONTENT_DIR)
        .filter((filename) => filename.endsWith('.md'))
        .map((filename) => {
            const fullPath = path.join(CONTENT_DIR, filename);
            const raw = fs.readFileSync(fullPath, 'utf8');
            const parsed = matter(raw);
            return {
                slug: filename.replace(/\.md$/i, ''),
                filename,
                frontmatter: parsed.data || {},
                content: parsed.content || '',
            };
        })
        .filter((post) => post.frontmatter.title)
        .sort((a, b) => new Date(b.frontmatter.date || 0) - new Date(a.frontmatter.date || 0));
}

function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
    });
}

// Machine-readable date for <time datetime>. Always YYYY-MM-DD in UTC so the
// generated markup does not depend on the build machine's locale or timezone.
function isoDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
}

function postMatchesTopic(post, topic) {
    const category = String(post.frontmatter.category || '');
    if (topic.categoryMatches.includes(category)) return true;
    if (category === 'Wealth Plan' && topic.slug !== 'wealth-building') return false;

    const haystack = [
        post.slug,
        post.frontmatter.title || '',
        post.frontmatter.description || '',
        category,
    ].join(' ').toLowerCase();

    return topic.keywordMatches.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

function selectTopicPosts(posts, topic) {
    const matches = posts.filter((post) => postMatchesTopic(post, topic));
    const seen = new Set();
    return matches.filter((post) => {
        if (seen.has(post.slug)) return false;
        seen.add(post.slug);
        return true;
    });
}


function renderPostRow(post) {
    const date = formatDate(post.frontmatter.date);
    const description = post.frontmatter.description || '';

    return `                        <li>
                            <p class="list-rows__title"><a href="/blog/${esc(post.slug)}">${esc(post.frontmatter.title)}</a></p>
                            ${description ? `<p class="list-rows__desc">${esc(description)}</p>` : ''}
                            ${date ? `<p class="list-rows__meta"><time datetime="${esc(isoDate(post.frontmatter.date))}">${esc(date)}</time></p>` : ''}
                        </li>`;
}

function renderTopicNav(currentSlug) {
    const links = TOPIC_HUBS
        .filter((topic) => topic.slug !== currentSlug)
        .map((topic) => `<a href="/topics/${topic.slug}">${esc(topic.title)}</a>`);
    return links.join(' · ');
}

function renderHead({ title, description, canonical, extraSchema = [] }) {
    return `    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${esc(title)} | Legacy Investing Show</title>
    <meta name="description" content="${esc(description)}">
    <meta name="robots" content="index, follow">
    <meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATIONS[0]}">
    <meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATIONS[1]}">
    <link rel="canonical" href="${canonical}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonical}">
    <meta property="og:title" content="${esc(title)} | Legacy Investing Show">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:image" content="${SITE_URL}/assets/images/og-blog.jpg">
    <meta property="og:site_name" content="Legacy Investing Show">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@thelegacyshow">
    <meta name="twitter:title" content="${esc(title)} | Legacy Investing Show">
    <meta name="twitter:description" content="${esc(description)}">
    <meta name="twitter:image" content="${SITE_URL}/assets/images/og-blog.jpg">
    <meta name="theme-color" content="#FBF8F1">
    <link rel="icon" href="/favicon.ico" sizes="32x32">
    ${renderHeadAssets()}
    <link rel="stylesheet" href="/assets/css/guides.css">
${extraSchema.map((schema) => `    <script type="application/ld+json">${JSON.stringify(schema)}</script>`).join('\n')}
    ${renderAnalyticsHead({ gaTrackingId: GA_TRACKING_ID, gtmContainerId: GTM_CONTAINER_ID })}`;
}

function renderTopicPage(topic, posts) {
    const canonical = `${SITE_URL}/topics/${topic.slug}`;
    const topPosts = posts.slice(0, 60);
    const schema = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `${topic.title} | Legacy Investing Show`,
        description: topic.description,
        url: canonical,
        isPartOf: {
            '@type': 'WebSite',
            name: 'Legacy Investing Show',
            url: SITE_URL,
        },
        mainEntity: {
            '@type': 'ItemList',
            numberOfItems: topPosts.length,
            itemListElement: topPosts.slice(0, 50).map((post, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                url: `${SITE_URL}/blog/${post.slug}`,
                name: post.frontmatter.title,
            })),
        },
    };

    const breadcrumb = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
            { '@type': 'ListItem', position: 2, name: 'Topics', item: `${SITE_URL}/topics` },
            { '@type': 'ListItem', position: 3, name: topic.title, item: canonical },
        ],
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
${renderHead({ title: topic.title, description: topic.description, canonical, extraSchema: [schema, breadcrumb] })}
</head>
<body class="guide-page" data-page-type="topic_hub" data-page-title="${esc(topic.title)}">
    ${renderAnalyticsBody({ gtmContainerId: GTM_CONTAINER_ID })}
    <a href="#main" class="guide-skip">Skip to main content</a>

    ${renderSiteHeader('/blog')}

    <main id="main">
        <section class="opener">
            <div class="container-custom">
                <div class="col">
                    <nav aria-label="Breadcrumb">
                        <ol class="breadcrumb">
                            <li class="breadcrumb__item"><a href="/" class="breadcrumb__link">Home</a></li>
                            <li class="breadcrumb__item"><a href="/topics" class="breadcrumb__link">Topics</a></li>
                            <li class="breadcrumb__item"><span class="breadcrumb__current">${esc(topic.title)}</span></li>
                        </ol>
                    </nav>
                    <h1 class="opener__title">${esc(topic.title)}</h1>
                    <p class="opener__key">${topPosts.length} articles in this hub, newest first.</p>
                    <p class="opener__lede">${esc(topic.intro)}</p>
                </div>
            </div>
        </section>

        <section class="section section--rule">
            <div class="container-custom">
                <div class="col">
                    <h2 id="articles">Articles in this hub</h2>
                    <ul class="list-rows">
${topPosts.map((post) => renderPostRow(post)).join('\n')}
                    </ul>

                    <div class="cta">
                        <h2>Other topics</h2>
                        <ul>
${TOPIC_HUBS.filter((entry) => entry.slug !== topic.slug).map((entry) => `                            <li><a href="/topics/${esc(entry.slug)}">${esc(entry.title)}</a>. ${esc(entry.description)}</li>`).join('\n')}
                        </ul>
                        <p class="cta__actions">
                            <a href="/blog" class="btn-primary">The full archive</a>
                            <a href="/tax-strategies" class="btn-secondary">Tax strategies</a>
                        </p>
                    </div>
                </div>
            </div>
        </section>
    </main>

    ${renderSiteFooter()}

    <script defer src="/assets/js/main.js"></script>
</body>
</html>`;
}


function renderTopicsIndex() {
    const canonical = `${SITE_URL}/topics`;
    const description = 'The main reading paths through the Legacy Investing Show archive: tax strategies, business structures, retirement, investing, debt, Airbnb arbitrage, and wealth building.';

    const schema = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Topic Hubs | Legacy Investing Show',
        description,
        url: canonical,
        mainEntity: {
            '@type': 'ItemList',
            numberOfItems: TOPIC_HUBS.length,
            itemListElement: TOPIC_HUBS.map((topic, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                url: `${SITE_URL}/topics/${topic.slug}`,
                name: topic.title,
            })),
        },
    };

    const breadcrumb = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
            { '@type': 'ListItem', position: 2, name: 'Topics', item: canonical },
        ],
    };

    const rows = TOPIC_HUBS.map((topic) => `                        <li>
                            <p class="list-rows__title"><a href="/topics/${esc(topic.slug)}">${esc(topic.title)}</a></p>
                            <p class="list-rows__desc">${esc(topic.description)}</p>
                        </li>`).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
${renderHead({ title: 'Topics', description, canonical, extraSchema: [schema, breadcrumb] })}
</head>
<body class="guide-page" data-page-type="topic_index" data-page-title="Topics">
    ${renderAnalyticsBody({ gtmContainerId: GTM_CONTAINER_ID })}
    <a href="#main" class="guide-skip">Skip to main content</a>

    ${renderSiteHeader('/blog')}

    <main id="main">
        <section class="opener">
            <div class="container-custom">
                <div class="col">
                    <nav aria-label="Breadcrumb">
                        <ol class="breadcrumb">
                            <li class="breadcrumb__item"><a href="/" class="breadcrumb__link">Home</a></li>
                            <li class="breadcrumb__item"><span class="breadcrumb__current">Topics</span></li>
                        </ol>
                    </nav>
                    <h1 class="opener__title">Topics</h1>
                    <p class="opener__key">${TOPIC_HUBS.length} reading paths through the archive.</p>
                    <p class="opener__lede">The blog archive is broad. These hubs group the articles by the decision they help with, so a question leads to the strongest guides on it rather than to the newest post.</p>
                </div>
            </div>
        </section>

        <section class="section section--rule">
            <div class="container-custom">
                <div class="col">
                    <h2 id="hubs">The hubs</h2>
                    <p class="section__summary">Start with the one that matches the decision in front of you.</p>
                    <ul class="list-rows">
${rows}
                    </ul>

                    <div class="prose">
                        <h2 id="elsewhere">Elsewhere on the site</h2>
                        <p>The hubs cover the article archive. The decision libraries sit alongside them. The strategy guides state a qualification test and a worked example, and the compare guides take two strategies that both sound right and show where each one wins.</p>
                    </div>

                    <div class="cta">
                        <h2>Decision libraries</h2>
                        <ul>
                            <li><a href="/tax-strategies">Tax strategies</a>. Every strategy guide in one table.</li>
                            <li><a href="/compare">Compare guides</a>. Head-to-head decisions with a scorecard.</li>
                            <li><a href="/blog">The full archive</a>. Everything, newest first.</li>
                        </ul>
                        <p class="cta__actions">
                            <a href="/tax-strategies" class="btn-primary">Open the strategy library</a>
                            <a href="/compare" class="btn-secondary">Compare two strategies</a>
                        </p>
                    </div>
                </div>
            </div>
        </section>
    </main>

    ${renderSiteFooter()}

    <script defer src="/assets/js/main.js"></script>
</body>
</html>`;
}


function build() {
    console.log('Building topic hubs...');
    ensureDir(OUTPUT_DIR);

    for (const entry of fs.readdirSync(OUTPUT_DIR, { withFileTypes: true })) {
        if (entry.isFile() && entry.name.endsWith('.html')) {
            fs.unlinkSync(path.join(OUTPUT_DIR, entry.name));
        }
    }

    const posts = getMarkdownPosts();
    const indexablePosts = posts.filter(isIndexableBlogPost);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), renderTopicsIndex(), 'utf8');
    console.log(`Built /topics (${TOPIC_HUBS.length} topic hubs)`);

    for (const topic of TOPIC_HUBS) {
        const topicPosts = selectTopicPosts(indexablePosts, topic);
        fs.writeFileSync(
            path.join(OUTPUT_DIR, `${topic.slug}.html`),
            renderTopicPage(topic, topicPosts),
            'utf8'
        );
        console.log(`Built /topics/${topic.slug} (${topicPosts.length} matching posts, ${Math.min(topicPosts.length, 60)} shown)`);
    }
}

build();
