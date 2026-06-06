#!/usr/bin/env node

/**
 * Build crawlable topic hub pages from the canonical blog markdown corpus.
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const {
    CURRENT_YEAR,
    renderAnalyticsBody,
    renderAnalyticsHead,
    renderFooterLinks,
    renderPrimaryNavLinks,
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
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
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

function renderPostCard(post, topicSlug) {
    const image = post.frontmatter.image || '/assets/images/og-blog.jpg';
    const date = formatDate(post.frontmatter.date);
    const category = post.frontmatter.category || topicSlug.replace(/-/g, ' ');
    const description = post.frontmatter.description || '';

    return `
            <a href="/blog/${esc(post.slug)}" class="minimal-post-item" data-category="${esc(topicSlug)}">
                <div class="minimal-post-image">
                    <img src="${esc(image)}" alt="${esc(post.frontmatter.title)}" loading="lazy" width="320" height="180" onerror="this.onerror=null;this.src='/assets/images/og-blog.jpg';">
                </div>
                <div class="minimal-post-content">
                    <div class="minimal-post-meta">
                        <span class="minimal-post-category">${esc(category)}</span>
                        ${date ? `<span class="meta-sep">·</span><time datetime="${esc(post.frontmatter.date)}">${esc(date)}</time>` : ''}
                    </div>
                    <h2 class="minimal-post-title">${esc(post.frontmatter.title)}</h2>
                    <p class="minimal-post-desc">${esc(description)}</p>
                </div>
            </a>`;
}

function renderTopicNav(currentSlug) {
    return TOPIC_HUBS.map((topic) => {
        const activeClass = topic.slug === currentSlug ? ' active' : '';
        return `<a class="category-filter__btn${activeClass}" href="/topics/${topic.slug}">${esc(topic.title)}</a>`;
    }).join('\n                    ');
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

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${esc(topic.title)} | Legacy Investing Show</title>
    <meta name="title" content="${esc(topic.title)} | Legacy Investing Show">
    <meta name="description" content="${esc(topic.description)}">
    <meta name="robots" content="index, follow">
    <meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATIONS[0]}">
    <meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATIONS[1]}">
    <link rel="canonical" href="${canonical}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonical}">
    <meta property="og:title" content="${esc(topic.title)} | Legacy Investing Show">
    <meta property="og:description" content="${esc(topic.description)}">
    <meta property="og:image" content="${SITE_URL}/assets/images/og-blog.jpg">
    <meta property="og:site_name" content="Legacy Investing Show">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@thelegacyshow">
    <meta name="twitter:title" content="${esc(topic.title)} | Legacy Investing Show">
    <meta name="twitter:description" content="${esc(topic.description)}">
    <meta name="twitter:image" content="${SITE_URL}/assets/images/og-blog.jpg">
    <meta name="theme-color" content="#ffffff">
    <link rel="icon" type="image/png" href="/assets/images/logo.png">
    <link rel="apple-touch-icon" href="/assets/images/logo.png">
    <link rel="stylesheet" href="/assets/css/styles.css">
    <script type="application/ld+json">
    ${JSON.stringify(schema, null, 4)}
    </script>
    ${renderAnalyticsHead({ gaTrackingId: GA_TRACKING_ID, gtmContainerId: GTM_CONTAINER_ID })}
</head>
<body class="bg-white text-gray-900" data-page-type="topic_hub" data-page-title="${esc(topic.title)}">
    ${renderAnalyticsBody({ gtmContainerId: GTM_CONTAINER_ID })}
    <a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-gray-900 text-white px-4 py-2 z-50">Skip to main content</a>
    <header class="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <nav class="container-custom" aria-label="Main navigation">
            <div class="flex items-center justify-between h-16">
                <a href="/" class="flex items-center gap-2 font-medium text-gray-900 hover:text-gray-700 transition-colors">
                    <img src="/assets/images/logo.png" alt="Legacy Investing Show Logo" width="28" height="28" class="w-7 h-7">
                    <span>Legacy Investing Show</span>
                </a>
                <div class="hidden md:flex items-center gap-4">
                    ${renderPrimaryNavLinks('/blog')}
                </div>
                <button id="mobile-menu-btn" class="md:hidden p-2 text-gray-700" aria-label="Open menu">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                </button>
            </div>
            <div id="mobile-menu" class="hidden md:hidden pb-4">
                <div class="flex flex-col gap-3">
                    ${renderPrimaryNavLinks('/blog')}
                </div>
            </div>
        </nav>
    </header>
    <main id="main">
        <section class="minimal-blog-header">
            <p class="minimal-blog-subtitle"><a href="/blog">Blog</a> / Topic Hub</p>
            <h1 class="minimal-blog-title">${esc(topic.title)}</h1>
            <p class="minimal-blog-subtitle">${esc(topic.intro)}</p>
        </section>
        <section class="minimal-posts-section">
            <div class="container-custom">
                <nav class="category-filter" aria-label="Topic hubs">
                    ${renderTopicNav(topic.slug)}
                </nav>
                <div class="minimal-posts-list">
                    ${topPosts.map((post) => renderPostCard(post, topic.slug)).join('\n')}
                </div>
            </div>
        </section>
    </main>
    <footer class="minimal-footer">
        <div class="container-custom">
            <div class="minimal-footer-content">
                <div class="footer-brand">
                    <img src="/assets/images/logo.png" alt="Legacy Investing Show" width="32" height="32">
                    <span>Legacy Investing Show</span>
                </div>
                <div class="footer-links">
                    ${renderFooterLinks()}
                </div>
            </div>
            <div class="footer-copyright">Copyright ${CURRENT_YEAR}</div>
        </div>
    </footer>
    <script defer src="/assets/js/main.js"></script>
</body>
</html>`;
}

function renderTopicsIndex() {
    const canonical = `${SITE_URL}/topics`;
    const description = 'Browse the main Legacy Investing Show topic hubs for tax strategies, business structures, retirement, investing, debt management, Airbnb arbitrage, and wealth building.';
    const topicGuide = TOPIC_HUBS.map((topic) => `
                    <li>
                        <strong>${esc(topic.title)}:</strong> ${esc(topic.intro)}
                    </li>`).join('\n');
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

    const cards = TOPIC_HUBS.map((topic) => `
            <a href="/topics/${esc(topic.slug)}" class="minimal-post-item">
                <div class="minimal-post-content">
                    <div class="minimal-post-meta">
                        <span class="minimal-post-category">Topic Hub</span>
                    </div>
                    <h2 class="minimal-post-title">${esc(topic.title)}</h2>
                    <p class="minimal-post-desc">${esc(topic.description)}</p>
                </div>
            </a>`).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Topic Hubs | Legacy Investing Show</title>
    <meta name="title" content="Topic Hubs | Legacy Investing Show">
    <meta name="description" content="${esc(description)}">
    <meta name="robots" content="index, follow">
    <meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATIONS[0]}">
    <meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATIONS[1]}">
    <link rel="canonical" href="${canonical}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonical}">
    <meta property="og:title" content="Topic Hubs | Legacy Investing Show">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:image" content="${SITE_URL}/assets/images/og-blog.jpg">
    <meta property="og:site_name" content="Legacy Investing Show">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@thelegacyshow">
    <meta name="twitter:title" content="Topic Hubs | Legacy Investing Show">
    <meta name="twitter:description" content="${esc(description)}">
    <meta name="twitter:image" content="${SITE_URL}/assets/images/og-blog.jpg">
    <meta name="theme-color" content="#ffffff">
    <link rel="icon" type="image/png" href="/assets/images/logo.png">
    <link rel="apple-touch-icon" href="/assets/images/logo.png">
    <link rel="stylesheet" href="/assets/css/styles.css">
    <script type="application/ld+json">
    ${JSON.stringify(schema, null, 4)}
    </script>
    ${renderAnalyticsHead({ gaTrackingId: GA_TRACKING_ID, gtmContainerId: GTM_CONTAINER_ID })}
</head>
<body class="bg-white text-gray-900" data-page-type="topic_index" data-page-title="Topic Hubs">
    ${renderAnalyticsBody({ gtmContainerId: GTM_CONTAINER_ID })}
    <a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-gray-900 text-white px-4 py-2 z-50">Skip to main content</a>
    <header class="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <nav class="container-custom" aria-label="Main navigation">
            <div class="flex items-center justify-between h-16">
                <a href="/" class="flex items-center gap-2 font-medium text-gray-900 hover:text-gray-700 transition-colors">
                    <img src="/assets/images/logo.png" alt="Legacy Investing Show Logo" width="28" height="28" class="w-7 h-7">
                    <span>Legacy Investing Show</span>
                </a>
                <div class="hidden md:flex items-center gap-4">
                    ${renderPrimaryNavLinks('/blog')}
                </div>
                <button id="mobile-menu-btn" class="md:hidden p-2 text-gray-700" aria-label="Open menu">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                </button>
            </div>
            <div id="mobile-menu" class="hidden md:hidden pb-4">
                <div class="flex flex-col gap-3">
                    ${renderPrimaryNavLinks('/blog')}
                </div>
            </div>
        </nav>
    </header>
    <main id="main">
        <section class="minimal-blog-header">
            <p class="minimal-blog-subtitle"><a href="/blog">Blog</a> / Topic Hubs</p>
            <h1 class="minimal-blog-title">Topic Hubs</h1>
            <p class="minimal-blog-subtitle">${esc(description)}</p>
        </section>
        <section class="minimal-posts-section" style="padding-top: 0;">
            <div class="container-custom">
                <div class="minimal-content" style="max-width: 56rem; margin: 0 auto 2rem;">
                    <h2>Use These Hubs As The Main Reading Paths</h2>
                    <p>The blog archive is intentionally broad, but Google and readers both need cleaner paths through the best material. These topic hubs group the indexable articles by decision type so someone can move from a broad question into the strongest supporting guides without paging through every post on the site.</p>
                    <p>Start with the hub that matches the decision in front of you, then use the linked articles to compare strategy, documentation, timing, and implementation risk. The hubs also help the site send clearer internal-linking signals around the subjects Legacy Investing Show wants to be known for.</p>
                    <ul>
                        ${topicGuide}
                    </ul>
                </div>
            </div>
        </section>
        <section class="minimal-posts-section">
            <div class="container-custom">
                <div class="minimal-posts-list">
                    ${cards}
                </div>
            </div>
        </section>
    </main>
    <footer class="minimal-footer">
        <div class="container-custom">
            <div class="minimal-footer-content">
                <div class="footer-brand">
                    <img src="/assets/images/logo.png" alt="Legacy Investing Show" width="32" height="32">
                    <span>Legacy Investing Show</span>
                </div>
                <div class="footer-links">
                    ${renderFooterLinks()}
                </div>
            </div>
            <div class="footer-copyright">Copyright ${CURRENT_YEAR}</div>
        </div>
    </footer>
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
    fs.writeFileSync(
        path.join(OUTPUT_DIR, 'index.html'),
        renderTopicsIndex(),
        'utf8'
    );
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
