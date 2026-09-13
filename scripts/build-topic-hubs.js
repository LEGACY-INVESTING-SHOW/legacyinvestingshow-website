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
        intro: 'This hub is for people who pay a lot of tax and want to know which part of it they can change. That includes W-2 earners on a high salary, self-employed people, and owners who run a business through an LLC or an S corporation. The guides follow the order a real plan follows: read the return, fix the withholding, claim the deductions the work already earns, then look at the bigger moves like entity choice, real estate losses, and retirement accounts. Most guides show the math with a worked example and say what proof the IRS expects. Start with the rate and withholding guides if you are not sure what you owe today. Move to the deduction and strategy guides once those numbers are clear. Nothing here is advice for your return. It is background, so the conversation with your CPA starts further along.',
        startHere: [
            { slug: 'marginal-vs-effective-tax-rate', note: 'What the brackets actually take, and why the two rates differ.' },
            { slug: 'how-to-fix-w2-withholding-mid-year', note: 'The fastest fix if last April was a surprise.' },
            { slug: 'home-office-deduction-2026-guide', note: 'Both methods, who qualifies, and the records to keep.' },
            { slug: 'capital-gains-tax-what-you-owe-when-you-sell', note: 'What a sale costs before you agree to it.' },
            { slug: 'augusta-rule-280a-business-use', note: 'A 14-day rule owners often hear about and rarely document.' },
        ],
        categoryMatches: ['Tax Strategies'],
        keywordMatches: ['tax', 'qbi', 'deduction', 'roth', 'hsa', '1031', 'cost-segregation', 's-corp', 'estate-tax', 'capital-gains'],
    },
    {
        slug: 'business-structures',
        title: 'Business Structures',
        description: 'Entity planning guides for LLCs, S corporations, registered agents, operating agreements, business credit, and legal structure decisions.',
        intro: 'This hub is for owners who need to pick an entity, and for owners who already have one and want it to hold up. That means sole proprietors deciding whether an S corporation election pays for itself, LLC owners who need a real operating agreement, and investors running more than one property or business. The guides compare the cost and the paperwork of each structure, not only the tax line. They cover reasonable salary, payroll, registered agents, state filings, bank accounts, and the record keeping that keeps the liability shield intact. Read the Schedule C and S corp comparison first, so the tax difference is clear. Then check the break-even guide to see whether your profit is high enough yet. After that, the salary, amendment, and corporate veil guides cover what has to stay true every year. Structure is a yearly job, not a one-time filing.',
        startHere: [
            { slug: 'schedule-c-vs-s-corp-tax-guide', note: 'The tax difference between the two, side by side.' },
            { slug: 's-corp-election-break-even-guide', note: 'The profit level where the election starts paying for itself.' },
            { slug: 'how-much-is-reasonable-salary-for-s-corp', note: 'The number the IRS looks at first.' },
            { slug: 'operating-agreement-amendment-guide', note: 'How to change the agreement without losing the paper trail.' },
            { slug: 'how-is-corporate-veil-pierced', note: 'What breaks the liability shield in practice.' },
        ],
        categoryMatches: ['Business Structures'],
        keywordMatches: ['llc', 's-corp', 'registered-agent', 'operating-agreement', 'corporate-veil', 'business-credit', 'entity'],
    },
    {
        slug: 'retirement',
        title: 'Retirement',
        description: 'Retirement planning guides covering 401(k)s, IRAs, withdrawal sequencing, Roth conversions, annuities, and tax-aware income planning.',
        intro: 'This hub is for people inside twenty years of retiring, and for high earners filling accounts now who want the tax order right. The guides treat contributions, conversions, withdrawals, and allocation as one sequence rather than four separate choices. You will find the annual limits, how a Roth conversion is taxed in the year you do it, how to pull from taxable, tax-deferred, and Roth money in an order that lowers the lifetime bill, and how long a balance lasts at a given spending rate. Each guide shows the math with real numbers, so the tradeoff is visible. Start with the conversion and withdrawal guides if you are close to retiring. Start with the mega backdoor Roth guide if you are still saving and your plan allows after-tax contributions. Then use the allocation guides to match risk to the years you have left.',
        startHere: [
            { slug: 'how-roth-conversions-are-taxed', note: 'What a conversion costs in the year you do it.' },
            { slug: 'best-ira-withdrawal-strategy', note: 'Which account to draw from first, and why the order matters.' },
            { slug: 'retirement-runway-how-long-will-your-savings-last', note: 'How many years a balance covers at your spending rate.' },
            { slug: 'mega-backdoor-roth-2026', note: 'The after-tax route into a Roth, and the plan rules it needs.' },
            { slug: 'best-asset-allocation-for-retirement', note: 'Matching risk to the years you have left.' },
        ],
        categoryMatches: ['Retirement'],
        keywordMatches: ['retirement', '401k', '401-k', 'ira', 'roth', 'annuity', 'withdrawal', 'pension'],
    },
    {
        slug: 'investing',
        title: 'Investing',
        description: 'Investing education on asset allocation, rental property, ETFs, bonds, income streams, BRRRR, notes investing, and portfolio tax implications.',
        intro: 'This hub is for people with money to put to work each month who want to compare the options on the same terms: what it returns, what it costs, how liquid it is, and how much time it takes. The guides start with net worth and cash flow, then cover index funds, fees, rental property, home equity, and the rent versus buy decision. Real estate sits here too, because a rental is an investment with a job attached. Every guide shows the arithmetic rather than a rule of thumb, so you can put your own numbers in. Start with the net worth and compound interest guides to set a baseline. Read the fee drag guide before you pick a fund or an advisor. Read the rental cash flow and rent versus buy guides before any property decision. The tax side of each choice lives in the tax strategies library.',
        startHere: [
            { slug: 'how-to-calculate-net-worth', note: 'The balance sheet every other decision is measured against.' },
            { slug: 'compound-interest-savings-guide', note: 'What a steady monthly amount turns into over time.' },
            { slug: 'investment-fee-drag-guide', note: 'What a one percent fee costs across a working life.' },
            { slug: 'rental-property-cash-flow-guide', note: 'Real monthly math, not the gross rent.' },
            { slug: 'rent-vs-buy-which-is-better', note: 'The full cost on both sides of the decision.' },
        ],
        categoryMatches: ['Investing', 'Passive Income', 'Real Estate', 'Wealth Building', 'Real Estate Investing', 'Real Estate Strategy', 'Investing Strategy'],
        keywordMatches: ['investing', 'asset-allocation', 'rental-property', 'brrrr', 'cash-flow', 'portfolio', 'etf', 'mutual-fund', 'bonds', 'reits'],
    },
    {
        slug: 'debt-management',
        title: 'Debt Management',
        description: 'Debt payoff frameworks, student loan strategies, DTI planning, debt avalanche guides, consolidation decisions, and cash-flow tradeoffs.',
        intro: 'This hub is for people carrying credit card balances, student loans, a car loan, or a mortgage, who want to know which balance to attack first and what it costs to wait. The guides cover the two payoff methods, the debt-to-income ratio a lender actually calculates, consolidation, amortization, early payoff math, and the student loan rules for federal and private borrowers. Each one shows the interest saved and the months removed, so the choice is a number rather than a feeling. Start with the debt-to-income guide to see how a lender reads your file. Read the snowball versus avalanche comparison to pick a method you will stay with. Check the credit card payoff guide if a high rate is the real problem, and the amortization guide if you want to see where each payment goes. Consolidation comes last, once the cost of the current debt is clear.',
        startHere: [
            { slug: 'debt-to-income-ratio-guide', note: 'How a lender reads your file before you apply.' },
            { slug: 'debt-snowball-vs-avalanche', note: 'Which payoff order costs less, and which one people finish.' },
            { slug: 'credit-card-payoff-strategy-guide', note: 'The plan for the balance charging the highest rate.' },
            { slug: 'loan-amortization-schedule-explained', note: 'Where each payment goes, month by month.' },
            { slug: 'debt-consolidation-guide', note: 'When one new loan helps, and when it only moves the problem.' },
        ],
        categoryMatches: ['Debt Management'],
        keywordMatches: ['debt', 'student-loan', 'dti', 'consolidation', 'avalanche', 'snowball', 'payoff', 'heloc'],
    },
    {
        slug: 'airbnb-arbitrage',
        title: 'Airbnb Arbitrage',
        description: 'Airbnb arbitrage guides, startup cost breakdowns, pricing systems, occupancy strategy, tax implications, and student success stories.',
        intro: 'This hub is for people who want to run short-term rentals without buying property. That means renting a unit, getting written permission to sublet, furnishing it, and operating it well enough to keep the reviews high. The guides cover the startup budget, how to judge a city before you commit, the landlord conversation, pricing, guest messaging, automation, and the mistakes that quietly remove the profit. Student stories sit here too, so you can see what the first twelve months really look like. Start with the startup cost guide, so the budget is honest before anything else. Read the market guide before you sign a lease. Read the landlord guide so the first call does not sound risky to them. Then use the mistakes and scaling guides once a unit is live. The tax treatment of short-term rentals is covered in the tax strategies library.',
        startHere: [
            { slug: 'how-much-does-it-cost-to-start-an-airbnb', note: 'The real first-unit budget, line by line.' },
            { slug: 'best-airbnb-markets-2026-how-to-evaluate-a-city', note: 'How to judge a city before you sign a lease.' },
            { slug: 'how-to-convince-landlords-for-airbnb-arbitrage', note: 'The conversation that gets written permission to sublet.' },
            { slug: 'airbnb-arbitrage-mistakes-that-kill-profit', note: 'What quietly removes the margin on a live unit.' },
            { slug: 'how-to-scale-an-airbnb-arbitrage-business', note: 'Adding units without breaking operations.' },
        ],
        categoryMatches: ['Airbnb Arbitrage', 'Success Story', 'Success Stories', 'How-To Guide', 'Getting Started', 'Strategy', 'Case Study', 'Side Hustles'],
        keywordMatches: ['airbnb', 'short-term-rental', 'occupancy', 'pricing-strategy', 'startup-cost', 'guest', 'landlord'],
    },
    {
        slug: 'wealth-building',
        title: 'Wealth Building',
        description: 'Wealth-building articles on income streams, tax strategy, asset acquisition, and long-term financial independence planning.',
        intro: 'This hub is for people who already earn well and want the pieces to work as one system: income, taxes, debt, entity, and the assets that pay them later. Most of the pages are anonymized wealth plans. Each one is built for a single household and shows the numbers and the order the moves were made in. Reading a few of them is the fastest way to see how the parts connect, because a plan shows tradeoffs a single guide cannot. The rest of the hub covers the building blocks: house hacking, index funds, rental cash flow, and allocation for people with business income. Start with the ten year guide for the shape of a long plan. Read the rental cash flow and house hacking guides for the asset side. Read the index fund and entrepreneur allocation guides for the paper side. The plans are education, not advice for your situation.',
        startHere: [
            { slug: 'build-10-million-10-years', note: 'What a long plan looks like when the pieces line up.' },
            { slug: 'rental-property-cash-flow-guide', note: 'The asset side, with real monthly math.' },
            { slug: 'house-hacking-guide', note: 'Using the home you live in to carry part of the cost.' },
            { slug: 'index-fund-investing', note: 'The paper side, kept simple and cheap.' },
            { slug: 'asset-allocation-for-entrepreneurs', note: 'Allocation when your income is already tied to one business.' },
        ],
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

/**
 * The hand-picked "read these first" rows for a hub. Titles come from the
 * markdown frontmatter so a renamed post never leaves a stale label behind;
 * a slug the hub no longer carries is skipped with a warning rather than
 * silently linking to a page that is not in this hub.
 */
function renderStartHere(topic, posts) {
    const bySlug = new Map(posts.map((post) => [post.slug, post]));
    const rows = [];

    for (const entry of topic.startHere || []) {
        const post = bySlug.get(entry.slug);
        if (!post) {
            console.warn(`  start-here slug not in /topics/${topic.slug}: ${entry.slug}`);
            continue;
        }
        rows.push(`                            <li>
                                <p class="list-rows__title"><a href="/blog/${esc(post.slug)}">${esc(post.frontmatter.title)}</a></p>
                                <p class="list-rows__desc">${esc(entry.note)}</p>
                            </li>`);
    }

    if (rows.length === 0) return '';

    return `
                    <h2 id="start-here">Start here</h2>
                    <p class="section__summary">${rows.length} pages that cover most of what people come to this hub for.</p>
                    <ul class="list-rows">
${rows.join('\n')}
                    </ul>
`;
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
${renderStartHere(topic, topPosts)}
                    <h2 id="articles">Articles in this hub</h2>
                    <ul class="list-rows">
${topPosts.map((post) => renderPostRow(post)).join('\n')}
                    </ul>

                    <div class="cta">
                        <h2>The rest of the site</h2>
                        <ul>
                            <li><a href="/tax-strategies">Tax strategies</a>. Every strategy guide in one table.</li>
                            <li><a href="/compare">Compare guides</a>. Two strategies head to head, with a scorecard.</li>
                            <li><a href="/tools">Free calculators</a>. Run your own numbers.</li>
                            <li><a href="/blog">The full archive</a>. Everything, newest first.</li>
                        </ul>
                    </div>

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
                            <li><a href="/tools">Free calculators</a>. Run your own numbers.</li>
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
