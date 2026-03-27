#!/usr/bin/env node

/**
 * Tax Strategies Page Generator for Legacy Investing Show
 *
 * This script generates SEO-optimized tax strategy pages from data:
 * 1. Individual strategy pages (/tax-strategies/[slug].html)
 * 2. Persona-based pages (/tax-strategies/for/[persona].html)
 * 3. Main index page (/tax-strategies/index)
 */

const fs = require('fs');
const path = require('path');
const {
    CURRENT_YEAR,
    renderAnalyticsBody,
    renderAnalyticsHead,
    renderFooterLinks,
    renderPageCtaSection,
    renderPrimaryNavLinks,
    renderSourceBlock,
} = require('./lib/site-shell');

// Paths
const ROOT_DIR = path.join(__dirname, '..');
const DATA_PATH = path.join(ROOT_DIR, 'data', 'tax-strategies.json');
const TEMPLATE_PATH = path.join(ROOT_DIR, 'templates', 'tax-strategy.html');
const OUTPUT_DIR = path.join(ROOT_DIR, 'tax-strategies');
const GA_TRACKING_ID = process.env.GA_TRACKING_ID || 'G-2578PT1WSS';
const GTM_CONTAINER_ID = process.env.GTM_CONTAINER_ID || 'GTM-KQ4R2LKP';
const GOOGLE_SITE_VERIFICATIONS = [
    'Kec6RfGhFL-qG_8zKxCqt7yxjgy65WeDAftCBm90G2s',
    '92MoCnkdQOj_ey1lEafT5Mz-znCcCQ3UABZlI-JG_nM'
];

/**
 * Ensure directory exists
 */
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`Created directory: ${dirPath}`);
    }
}

/**
 * Load JSON data
 */
function loadData() {
    try {
        const data = fs.readFileSync(DATA_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error loading data: ${error.message}`);
        process.exit(1);
    }
}

/**
 * Load template
 */
function loadTemplate() {
    try {
        return fs.readFileSync(TEMPLATE_PATH, 'utf-8');
    } catch (error) {
        console.error(`Error loading template: ${error.message}`);
        process.exit(1);
    }
}

/**
 * Format strategy title for display
 */
function formatTitle(slug) {
    return slug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Build a normalized <title> string without forced length truncation.
 */
function buildSEOTitle(rawTitle) {
    const title = (rawTitle || 'Tax Strategy').replace(/\s+/g, ' ').trim() || 'Tax Strategy';
    const suffix = ' | Legacy Investing Show';
    return title.endsWith(suffix) ? title : `${title}${suffix}`;
}

/**
 * Generate FAQ HTML items
 */
function generateFaqItems(faqs) {
    if (!faqs || faqs.length === 0) return '';

    return faqs.map((faq, index) => `
                    <div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
                        <button class="faq-question" aria-expanded="${index === 0 ? 'true' : 'false'}" aria-controls="faq-answer-${index}">
                            <span itemprop="name">${faq.question}</span>
                            <svg class="faq-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6 9 12 15 18 9"/>
                            </svg>
                        </button>
                        <div class="faq-answer ${index === 0 ? 'faq-answer--open' : ''}" id="faq-answer-${index}" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
                            <p itemprop="text">${faq.answer}</p>
                        </div>
                    </div>`).join('\n');
}

/**
 * Generate FAQ Schema JSON-LD
 */
function generateFaqSchema(faqs) {
    if (!faqs || faqs.length === 0) return '';

    const schema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map(faq => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer
            }
        }))
    };

    return `<script type="application/ld+json">
    ${JSON.stringify(schema, null, 4)}
    </script>`;
}

/**
 * Generate benefits list HTML
 */
function generateBenefitsList(benefits) {
    return benefits.map(b => `<li>${b}</li>`).join('\n                            ');
}

/**
 * Generate benefits list with icons
 */
function generateBenefitsListWithIcons(benefits) {
    return benefits.map(b => `
                                <li>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                    ${b}
                                </li>`).join('');
}

/**
 * Generate related strategies list
 */
function generateRelatedStrategiesList(relatedSlugs, allStrategies) {
    if (!relatedSlugs || relatedSlugs.length === 0) return '';

    return relatedSlugs.map(slug => {
        const strategy = allStrategies.find(s => s.slug === slug);
        const title = strategy ? strategy.title : formatTitle(slug);
        return `
                                <li>
                                    <a href="/tax-strategies/${slug}">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M9 18l6-6-6-6"/>
                                        </svg>
                                        ${title}
                                    </a>
                                </li>`;
    }).join('');
}

/**
 * Check if a file exists and is comprehensive (has substantial content)
 * Returns true if file should be skipped (already comprehensive)
 */
function shouldSkipFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return false;
    }
    
    const stats = fs.statSync(filePath);
    const lineCount = fs.readFileSync(filePath, 'utf-8').split('\n').length;
    
    // Skip if file is > 500 lines (comprehensive content)
    if (lineCount > 500) {
        return true;
    }
    
    return false;
}

/**
 * Build individual strategy page
 */
function buildStrategyPage(strategy, template, allStrategies) {
    const today = new Date().toISOString().split('T')[0];

    let html = template
        .replace(/\{\{title\}\}/g, strategy.title)
        .replace(/\{\{seoTitle\}\}/g, buildSEOTitle(strategy.title))
        .replace(/\{\{slug\}\}/g, strategy.slug)
        .replace(/\{\{shortDescription\}\}/g, strategy.shortDescription)
        .replace(/\{\{fullDescription\}\}/g, strategy.fullDescription)
        .replace(/\{\{keywords\}\}/g, strategy.keywords.join(', '))
        .replace(/\{\{potentialSavings\}\}/g, strategy.potentialSavings)
        .replace(/\{\{complexity\}\}/g, strategy.complexity)
        .replace(/\{\{professionalRequired\}\}/g, strategy.professionalRequired ? 'Yes' : 'No')
        .replace(/\{\{typicalCost\}\}/g, strategy.typicalCost)
        .replace(/\{\{irsReference\}\}/g, strategy.irsReference)
        .replace(/\{\{bestFor\}\}/g, strategy.bestFor)
        .replace(/\{\{datePublished\}\}/g, today)
        .replace(/\{\{dateModified\}\}/g, today)
        .replace(/\{\{analyticsHead\}\}/g, renderAnalyticsHead({ gaTrackingId: GA_TRACKING_ID, gtmContainerId: GTM_CONTAINER_ID }))
        .replace(/\{\{tagManagerBody\}\}/g, renderAnalyticsBody({ gtmContainerId: GTM_CONTAINER_ID }))
        .replace(/\{\{primaryNavLinks\}\}/g, renderPrimaryNavLinks('/tax-strategies'))
        .replace(/\{\{footerLinks\}\}/g, renderFooterLinks())
        .replace(/\{\{footerYear\}\}/g, String(CURRENT_YEAR))
        .replace(/\{\{benefitsForList\}\}/g, generateBenefitsList(strategy.benefitsFor))
        .replace(/\{\{benefitsForListWithIcons\}\}/g, generateBenefitsListWithIcons(strategy.benefitsFor))
        .replace(/\{\{relatedStrategiesList\}\}/g, generateRelatedStrategiesList(strategy.relatedStrategies, allStrategies))
        .replace(/\{\{faqItems\}\}/g, generateFaqItems(strategy.faqs))
        .replace(/\{\{faqSchema\}\}/g, generateFaqSchema(strategy.faqs));

    // Handle minimum property value section
    if (strategy.minimumPropertyValue && strategy.minimumPropertyValue !== 'No minimum') {
        html = html.replace(/\{\{minimumPropertyValueSection\}\}/g, `
                        <h3>Minimum Requirements</h3>
                        <p>This strategy typically requires a minimum property value of <strong>${strategy.minimumPropertyValue}</strong> to be cost-effective.</p>`);
    } else {
        html = html.replace(/\{\{minimumPropertyValueSection\}\}/g, '');
    }

    return html;
}

/**
 * Generate the tax strategies index page
 */
function generateIndexPage(strategies, personas) {
    const strategyCards = strategies.map(s => `
                    <a href="/tax-strategies/${s.slug}" class="strategy-card">
                        <div class="strategy-card__complexity strategy-card__complexity--${s.complexity.toLowerCase()}">${s.complexity}</div>
                        <h3 class="strategy-card__title">${s.title}</h3>
                        <p class="strategy-card__desc">${s.shortDescription}</p>
                        <div class="strategy-card__savings">
                            <span class="strategy-card__savings-label">Potential Savings:</span>
                            <span class="strategy-card__savings-value">${s.potentialSavings}</span>
                        </div>
                    </a>`).join('\n');

    const personaCards = personas.map(p => `
                    <a href="/tax-strategies/for/${p.slug}" class="persona-card">
                        <h3 class="persona-card__title">${p.title}</h3>
                        <p class="persona-card__desc">${p.description}</p>
                        <span class="persona-card__count">${p.topStrategies.length} strategies</span>
                    </a>`).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">

    <title>Tax Strategies for Investors | Legacy Investing Show</title>
    <meta name="description" content="Discover powerful tax strategies for real estate investors, business owners, and high-income earners. Learn about cost segregation, 1031 exchanges, REPS, and more.">
    <meta name="keywords" content="tax strategies, real estate tax benefits, cost segregation, 1031 exchange, tax deductions, wealth building">
    <meta name="author" content="Preston Seo">
    <meta name="robots" content="index, follow">
    <meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATIONS[0]}">
    <meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATIONS[1]}">
    <link rel="canonical" href="https://www.legacyinvestingshow.com/tax-strategies">

    <meta property="og:type" content="website">
    <meta property="og:url" content="https://www.legacyinvestingshow.com/tax-strategies">
    <meta property="og:title" content="Tax Strategies for Investors | Legacy Investing Show">
    <meta property="og:description" content="Discover powerful tax strategies for real estate investors, business owners, and high-income earners.">
    <meta property="og:site_name" content="Legacy Investing Show">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Tax Strategies for Investors">
    <meta name="twitter:description" content="Discover powerful tax strategies for real estate investors, business owners, and high-income earners.">

    <meta name="theme-color" content="#ffffff">
    <link rel="icon" type="image/png" href="/assets/images/logo.png">
    <link rel="apple-touch-icon" href="/assets/images/logo.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="/assets/css/styles.css">

    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Tax Strategies for Investors",
        "description": "Comprehensive guide to tax strategies for real estate investors, business owners, and high-income earners",
        "url": "https://www.legacyinvestingshow.com/tax-strategies",
        "publisher": {
            "@type": "Organization",
            "name": "Legacy Investing Show"
        }
    }
    </script>

    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://www.legacyinvestingshow.com/"
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": "Tax Strategies"
            }
        ]
    }
    </script>

    ${renderAnalyticsHead({ gaTrackingId: GA_TRACKING_ID, gtmContainerId: GTM_CONTAINER_ID })}

    <style>
        .tax-hero {
            padding: 8rem 0 4rem;
            background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
            text-align: center;
        }
        .tax-hero__title {
            font-size: 2.5rem;
            font-weight: 700;
            color: #111827;
            margin-bottom: 1rem;
        }
        @media (min-width: 768px) {
            .tax-hero__title { font-size: 3.5rem; }
        }
        .tax-hero__subtitle {
            font-size: 1.25rem;
            color: #4b5563;
            max-width: 40rem;
            margin: 0 auto;
        }
        .strategies-section {
            padding: 4rem 0;
        }
        .section-title {
            font-size: 1.75rem;
            font-weight: 700;
            color: #111827;
            margin-bottom: 2rem;
        }
        .strategies-grid {
            display: grid;
            gap: 1.5rem;
        }
        @media (min-width: 768px) {
            .strategies-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 1024px) {
            .strategies-grid { grid-template-columns: repeat(3, 1fr); }
        }
        .strategy-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 0.75rem;
            padding: 1.5rem;
            text-decoration: none;
            transition: all 0.2s;
        }
        .strategy-card:hover {
            border-color: #10b981;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
            transform: translateY(-2px);
        }
        .strategy-card__complexity {
            display: inline-block;
            font-size: 0.625rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 0.25rem 0.5rem;
            border-radius: 9999px;
            margin-bottom: 0.75rem;
        }
        .strategy-card__complexity--beginner { background: #d1fae5; color: #065f46; }
        .strategy-card__complexity--intermediate { background: #fef3c7; color: #92400e; }
        .strategy-card__complexity--advanced { background: #fee2e2; color: #991b1b; }
        .strategy-card__title {
            font-size: 1.125rem;
            font-weight: 600;
            color: #111827;
            margin-bottom: 0.5rem;
        }
        .strategy-card__desc {
            font-size: 0.875rem;
            color: #6b7280;
            margin-bottom: 1rem;
            line-height: 1.5;
        }
        .strategy-card__savings {
            display: flex;
            flex-direction: column;
            gap: 0.125rem;
            padding-top: 1rem;
            border-top: 1px solid #f3f4f6;
        }
        .strategy-card__savings-label {
            font-size: 0.75rem;
            color: #9ca3af;
        }
        .strategy-card__savings-value {
            font-size: 0.875rem;
            font-weight: 600;
            color: #10b981;
        }
        .personas-section {
            padding: 4rem 0;
            background: #f9fafb;
        }
        .personas-grid {
            display: grid;
            gap: 1rem;
        }
        @media (min-width: 768px) {
            .personas-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 1024px) {
            .personas-grid { grid-template-columns: repeat(3, 1fr); }
        }
        .persona-card {
            background: white;
            border-radius: 0.75rem;
            padding: 1.5rem;
            text-decoration: none;
            transition: all 0.2s;
            border: 1px solid #e5e7eb;
        }
        .persona-card:hover {
            border-color: #10b981;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .persona-card__title {
            font-size: 1.125rem;
            font-weight: 600;
            color: #111827;
            margin-bottom: 0.5rem;
        }
        .persona-card__desc {
            font-size: 0.875rem;
            color: #6b7280;
            margin-bottom: 0.75rem;
        }
        .persona-card__count {
            font-size: 0.75rem;
            color: #10b981;
            font-weight: 500;
        }
        .cta-section {
            padding: 4rem 0;
            text-align: center;
        }
        .cta-card {
            background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
            border-radius: 1rem;
            padding: 3rem 2rem;
            color: white;
        }
        .cta-card__title {
            font-size: 1.75rem;
            font-weight: 700;
            margin-bottom: 1rem;
        }
        .cta-card__text {
            color: #d1d5db;
            margin-bottom: 1.5rem;
            max-width: 32rem;
            margin-left: auto;
            margin-right: auto;
        }
        .cta-card__button {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 1rem 2rem;
            background: #10b981;
            color: white;
            font-weight: 600;
            border-radius: 0.5rem;
            text-decoration: none;
            transition: background 0.2s;
        }
        .cta-card__button:hover {
            background: #059669;
        }
    </style>
</head>
<body class="bg-white text-gray-900" data-page-type="tax_strategies_hub" data-page-title="Tax Strategies">
    ${renderAnalyticsBody({ gtmContainerId: GTM_CONTAINER_ID })}
    <a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-gray-900 text-white px-4 py-2 z-50">
        Skip to main content
    </a>

    <header class="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <nav class="container-custom" aria-label="Main navigation">
            <div class="flex items-center justify-between h-16">
                <a href="/" class="flex items-center gap-2 font-medium text-gray-900 hover:text-gray-700 transition-colors">
                    <img src="/assets/images/logo.png" alt="Legacy Investing Show Logo" width="28" height="28" class="w-7 h-7">
                    <span>Legacy Investing Show</span>
                </a>
                <div class="hidden md:flex items-center gap-4">
                    ${renderPrimaryNavLinks('/tax-strategies')}
                </div>
                <button id="mobile-menu-btn" class="md:hidden p-2 text-gray-700" aria-label="Open menu">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                </button>
            </div>
            <div id="mobile-menu" class="hidden md:hidden pb-4">
                <div class="flex flex-col gap-3">
                    ${renderPrimaryNavLinks('/tax-strategies')}
                </div>
            </div>
        </nav>
    </header>

    <!-- Breadcrumb Navigation -->
    <nav aria-label="Breadcrumb" class="container-custom pt-24 pb-4">
        <ol class="breadcrumb" itemscope itemtype="https://schema.org/BreadcrumbList">
            <li class="breadcrumb__item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                <a href="/" class="breadcrumb__link" itemprop="item"><span itemprop="name">Home</span></a>
                <meta itemprop="position" content="1" />
            </li>
            <li class="breadcrumb__item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                <span class="breadcrumb__current" itemprop="name">Tax Strategies</span>
                <meta itemprop="position" content="2" />
            </li>
        </ol>
    </nav>

    <main id="main">
        <section class="tax-hero">
            <div class="container-custom">
                <h1 class="tax-hero__title">Tax Strategies for Investors</h1>
                <p class="tax-hero__subtitle">Discover proven tax strategies used by real estate investors, business owners, and high-income earners to legally minimize their tax burden.</p>
            </div>
        </section>

        <section class="intro-section" style="padding: 4rem 0; background: white;">
            <div class="container-custom">
                <div style="max-width: 48rem; margin: 0 auto;">
                    <h2 style="font-size: 1.875rem; font-weight: 700; color: #111827; margin-bottom: 1.5rem;">Why Tax Strategy Matters for Building Wealth</h2>
                    <p style="color: #4b5563; line-height: 1.75; margin-bottom: 1.5rem;">The difference between wealthy investors and average earners often comes down to one thing: tax strategy. While most people focus on increasing income, the truly wealthy focus on keeping more of what they earn. According to IRS data, real estate investors who implement strategic tax planning can reduce their effective tax rate by 15-35% annually.</p>
                    <p style="color: #4b5563; line-height: 1.75; margin-bottom: 1.5rem;">Whether you're a W-2 employee looking for your first deduction, a real estate investor with multiple properties, or a business owner trying to optimize your tax position, the strategies on this page can save you tens of thousands of dollars—potentially hundreds of thousands over a lifetime.</p>
                    
                    <h3 style="font-size: 1.25rem; font-weight: 600; color: #111827; margin: 2rem 0 1rem;">Key Categories of Tax Strategies</h3>
                    
                    <div style="margin-bottom: 1.5rem;">
                        <h4 style="font-weight: 600; color: #111827; margin-bottom: 0.5rem;">1. Real Estate Tax Strategies</h4>
                        <p style="color: #4b5563; line-height: 1.75;">Real estate offers some of the most powerful tax advantages available. From <a href="/tax-strategies/cost-segregation" style="color: #059669; text-decoration: underline;">cost segregation</a> that accelerates depreciation to the <a href="/tax-strategies/short-term-rental-loophole" style="color: #059669; text-decoration: underline;">short-term rental loophole</a> that allows W-2 employees to deduct losses against ordinary income, these strategies can transform your tax bill. Real estate professional status (REPS) can unlock unlimited passive loss deductions, potentially eliminating your entire tax liability.</p>
                    </div>
                    
                    <div style="margin-bottom: 1.5rem;">
                        <h4 style="font-weight: 600; color: #111827; margin-bottom: 0.5rem;">2. Business Tax Optimization</h4>
                        <p style="color: #4b5563; line-height: 1.75;">Business owners have access to deductions that employees simply don't. <a href="/tax-strategies/section-179" style="color: #059669; text-decoration: underline;">Section 179</a> allows immediate expensing of up to $1.16 million in equipment. <a href="/tax-strategies/s-corp-strategy" style="color: #059669; text-decoration: underline;">S-Corp elections</a> can reduce self-employment tax by thousands. The Augusta Rule lets you rent your home to your business for up to 14 days tax-free. These strategies work together to minimize your business tax burden.</p>
                    </div>
                    
                    <div style="margin-bottom: 1.5rem;">
                        <h4 style="font-weight: 600; color: #111827; margin-bottom: 0.5rem;">3. Retirement & Investment Accounts</h4>
                        <p style="color: #4b5563; line-height: 1.75;">Self-directed IRAs and Solo 401(k)s allow you to invest retirement funds in real estate and alternative assets while enjoying tax-deferred or tax-free growth. <a href="/tax-strategies/hsa-strategy" style="color: #059669; text-decoration: underline;">Health Savings Accounts</a> offer triple tax advantages: deductible contributions, tax-free growth, and tax-free withdrawals for medical expenses. These accounts are powerful wealth-building tools when used strategically.</p>
                    </div>
                    
                    <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 1.5rem; margin: 2rem 0;">
                        <p style="color: #065f46; font-weight: 500; margin: 0;"><strong>Key Insight:</strong> The average high-income earner who implements just 3-4 of these strategies saves $25,000-$50,000 annually in taxes. Over 10 years, that's $250,000-$500,000 kept in your pocket instead of sent to the IRS.</p>
                    </div>
                </div>
            </div>
        </section>

        <section class="personas-section">
            <div class="container-custom">
                <h2 class="section-title">Find Strategies for Your Situation</h2>
                <div class="personas-grid">
                    ${personaCards}
                </div>
            </div>
        </section>

        <section class="strategies-section">
            <div class="container-custom">
                <h2 class="section-title">All Tax Strategies</h2>
                <div class="strategies-grid">
                    ${strategyCards}
                </div>
            </div>
        </section>

        <section class="faq-section" style="padding: 4rem 0; background: #f9fafb;">
            <div class="container-custom">
                <h2 style="font-size: 1.875rem; font-weight: 700; color: #111827; margin-bottom: 2rem; text-align: center;">Frequently Asked Questions About Tax Strategies</h2>
                <div style="max-width: 48rem; margin: 0 auto;">
                    <div class="faq-item" style="background: white; border-radius: 0.75rem; padding: 1.5rem; margin-bottom: 1rem; border: 1px solid #e5e7eb;">
                        <h3 style="font-weight: 600; color: #111827; margin-bottom: 0.75rem;">Which tax strategy should I implement first?</h3>
                        <p style="color: #4b5563; line-height: 1.75; margin: 0;">Start with the strategy that offers the highest return for your specific situation. For most investors with rental properties, cost segregation combined with bonus depreciation provides the biggest immediate impact—potentially $20,000-$100,000 in first-year deductions. For W-2 employees, the short-term rental loophole or HSA strategy are excellent starting points that don't require major lifestyle changes.</p>
                    </div>
                    <div class="faq-item" style="background: white; border-radius: 0.75rem; padding: 1.5rem; margin-bottom: 1rem; border: 1px solid #e5e7eb;">
                        <h3 style="font-weight: 600; color: #111827; margin-bottom: 0.75rem;">Do I need a CPA to implement these strategies?</h3>
                        <p style="color: #4b5563; line-height: 1.75; margin: 0;">While some strategies like basic HSA contributions can be done yourself, most advanced strategies require professional guidance. Cost segregation studies must be performed by qualified engineers or tax professionals. 1031 exchanges require a qualified intermediary. Real estate professional status requires careful documentation that a CPA can help establish. The cost of professional help is usually 1-5% of the tax savings generated.</p>
                    </div>
                    <div class="faq-item" style="background: white; border-radius: 0.75rem; padding: 1.5rem; margin-bottom: 1rem; border: 1px solid #e5e7eb;">
                        <h3 style="font-weight: 600; color: #111827; margin-bottom: 0.75rem;">Can I use multiple tax strategies together?</h3>
                        <p style="color: #4b5563; line-height: 1.75; margin: 0;">Absolutely—and you should. The most successful investors stack multiple strategies. For example, you might combine cost segregation with bonus depreciation on a rental property, contribute to a self-directed IRA, maximize your HSA, and implement an S-Corp strategy for your business income. The key is ensuring the strategies complement rather than conflict with each other. Always consult a tax professional when combining multiple advanced strategies.</p>
                    </div>
                    <div class="faq-item" style="background: white; border-radius: 0.75rem; padding: 1.5rem; margin-bottom: 1rem; border: 1px solid #e5e7eb;">
                        <h3 style="font-weight: 600; color: #111827; margin-bottom: 0.75rem;">What's the difference between a tax deduction and a tax credit?</h3>
                        <p style="color: #4b5563; line-height: 1.75; margin: 0;">A tax deduction reduces your taxable income, while a tax credit directly reduces your tax bill dollar-for-dollar. For someone in the 24% tax bracket, a $10,000 deduction saves $2,400 in taxes. A $10,000 credit saves the full $10,000. Most strategies on this page are deductions (like depreciation), but some credits exist—particularly for opportunity zone investments and certain energy-efficient improvements. Deductions are more common in real estate investing.</p>
                    </div>
                    <div class="faq-item" style="background: white; border-radius: 0.75rem; padding: 1.5rem; margin-bottom: 1rem; border: 1px solid #e5e7eb;">
                        <h3 style="font-weight: 600; color: #111827; margin-bottom: 0.75rem;">How much can I realistically save with these strategies?</h3>
                        <p style="color: #4b5563; line-height: 1.75; margin: 0;">Savings vary dramatically based on your income, investments, and which strategies you implement. A W-2 employee might save $5,000-$15,000 annually with HSA and basic deductions. A real estate investor with multiple properties using cost segregation, REPS, and the short-term rental loophole could save $50,000-$150,000+ per year. Business owners often fall in the middle, saving $15,000-$50,000 through entity structuring and expense optimization. The key is starting with the highest-impact strategies for your situation.</p>
                    </div>
                </div>
            </div>
        </section>

        <section style="padding: 0 0 4rem;">
            <div class="container-custom" style="max-width: 56rem;">
                ${renderSourceBlock({ title: 'Tax Strategies Hub', slug: 'tax-strategies', type: 'tax_hub' })}
            </div>
        </section>

        <section class="cta-section">
            <div class="container-custom">
                ${renderPageCtaSection({
                    variant: 'tax_masterclass',
                    title: 'See The Full Strategy Stack In Before You File',
                    text: 'Join the live challenge on April 17-19, 2026, from 10 AM to 4 PM Eastern. Preston uses Day 1 to read the return, Day 2 to build the strategy stack, and Day 3 to lock the 12-month execution plan.',
                    trackLocation: 'tax_hub_cta',
                })}
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
    <script>
        document.getElementById('mobile-menu-btn')?.addEventListener('click', function() {
            document.getElementById('mobile-menu').classList.toggle('hidden');
        });
    </script>
</body>
</html>`;
}

/**
 * Generate BreadcrumbList schema for persona pages
 */
function generatePersonaBreadcrumbSchema(persona) {
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://www.legacyinvestingshow.com/"
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": "Tax Strategies",
                "item": "https://www.legacyinvestingshow.com/tax-strategies"
            },
            {
                "@type": "ListItem",
                "position": 3,
                "name": persona.title,
                "item": `https://www.legacyinvestingshow.com/tax-strategies/for/${persona.slug}`
            }
        ]
    };
}

/**
 * Generate CollectionPage schema for persona pages
 */
function generatePersonaCollectionSchema(persona) {
    return {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": `Tax Strategies for ${persona.title}`,
        "description": persona.description,
        "url": `https://www.legacyinvestingshow.com/tax-strategies/for/${persona.slug}`,
        "isPartOf": {
            "@type": "WebSite",
            "name": "Legacy Investing Show",
            "url": "https://www.legacyinvestingshow.com"
        },
        "about": {
            "@type": "Thing",
            "name": persona.title,
            "description": persona.description
        }
    };
}

/**
 * Generate FAQ schema for persona pages
 */
function generatePersonaFaqSchema(persona) {
    const faqs = {
        'airbnb-hosts': [
            {
                question: "What are the best tax strategies for Airbnb hosts?",
                answer: "The Short-Term Rental Loophole allows Airbnb hosts to deduct rental losses against W-2 income. The Augusta Rule lets you rent your home to your business for up to 14 days tax-free. Cost segregation accelerates depreciation on furnished rental properties."
            },
            {
                question: "Can Airbnb hosts qualify for Real Estate Professional Status?",
                answer: "Yes, if you spend more than 750 hours per year and over 50% of your working time in real property trades or businesses. This unlocks unlimited passive loss deductions against ordinary income."
            }
        ],
        'business-owners': [
            {
                question: "What is the best business structure for tax savings?",
                answer: "An S-Corporation election can save thousands in self-employment taxes by splitting income between salary and distributions. The optimal structure depends on your income level and business type."
            },
            {
                question: "How can business owners deduct equipment purchases?",
                answer: "Section 179 allows immediate expensing of up to $1.16 million in qualifying equipment. Bonus depreciation offers additional first-year deductions on new and used property."
            }
        ],
        'high-income-earners': [
            {
                question: "How can high-income earners reduce their tax burden?",
                answer: "Backdoor Roth IRAs allow tax-free growth regardless of income limits. Donor-Advised Funds provide immediate charitable deductions. Qualified Opportunity Zone investments defer and reduce capital gains taxes."
            },
            {
                question: "What is the maximum tax rate for high earners?",
                answer: "The top federal income tax rate is 37%, but with the 3.8% Net Investment Income Tax and state taxes, some taxpayers face rates exceeding 50% in high-tax states."
            }
        ],
        'real-estate-investors': [
            {
                question: "What is cost segregation and how does it work?",
                answer: "Cost segregation accelerates depreciation by reclassifying building components into shorter recovery periods (5, 7, or 15 years instead of 27.5 or 39 years), creating larger early-year deductions."
            },
            {
                question: "Can I defer capital gains when selling investment property?",
                answer: "Yes, a 1031 Exchange allows you to defer capital gains taxes by reinvesting proceeds into like-kind property. This strategy can be repeated indefinitely to build wealth tax-deferred."
            }
        ],
        'self-employed': [
            {
                question: "What retirement accounts are available for the self-employed?",
                answer: "Solo 401(k)s and SEP IRAs both offer high annual contribution ceilings that are updated by the IRS. Check the current-year limits before you implement the strategy."
            },
            {
                question: "Can self-employed individuals deduct health insurance premiums?",
                answer: "Yes, self-employed health insurance premiums are 100% deductible as an adjustment to income. Health Savings Accounts (HSAs) offer additional triple tax advantages."
            }
        ],
        'w2-employees': [
            {
                question: "What tax strategies are available for W-2 employees?",
                answer: "W-2 employees can use Backdoor Roth IRAs, Health Savings Accounts, bunching deductions to exceed standard deduction thresholds, and the Short-Term Rental Loophole if they have Airbnb properties."
            },
            {
                question: "How can W-2 employees deduct rental property losses?",
                answer: "The Short-Term Rental Loophole allows W-2 employees to deduct rental losses if they average less than 7 days per stay and materially participate, bypassing passive activity loss limitations."
            }
        ]
    };
    
    const personaFaqs = faqs[persona.slug] || faqs['high-income-earners'];
    
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": personaFaqs.map(faq => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer
            }
        }))
    };
}

/**
 * Generate persona page
 */
function generatePersonaPage(persona, strategies) {
    const relevantStrategies = strategies.filter(s => persona.topStrategies.includes(s.slug));

    const strategyCards = relevantStrategies.map(s => `
                    <a href="/tax-strategies/${s.slug}" class="strategy-card">
                        <div class="strategy-card__complexity strategy-card__complexity--${s.complexity.toLowerCase()}">${s.complexity}</div>
                        <h3 class="strategy-card__title">${s.title}</h3>
                        <p class="strategy-card__desc">${s.shortDescription}</p>
                        <div class="strategy-card__savings">
                            <span class="strategy-card__savings-label">Potential Savings:</span>
                            <span class="strategy-card__savings-value">${s.potentialSavings}</span>
                        </div>
                    </a>`).join('\n');

    // Generate schema markup
    const breadcrumbSchema = generatePersonaBreadcrumbSchema(persona);
    const collectionSchema = generatePersonaCollectionSchema(persona);
    const faqSchema = generatePersonaFaqSchema(persona);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">

    <title>Tax Strategies for ${persona.title} | Legacy Investing Show</title>
    <meta name="description" content="${persona.description}. Discover the best tax strategies tailored for ${persona.title.toLowerCase()}.">
    <meta name="keywords" content="tax strategies ${persona.title.toLowerCase()}, ${persona.topStrategies.join(', ')}">
    <meta name="author" content="Preston Seo">
    <meta name="robots" content="index, follow">
    <meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATIONS[0]}">
    <meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATIONS[1]}">
    <link rel="canonical" href="https://www.legacyinvestingshow.com/tax-strategies/for/${persona.slug}">

    <!-- Schema Markup -->
    <script type="application/ld+json">
    ${JSON.stringify(breadcrumbSchema, null, 4)}
    </script>

    <script type="application/ld+json">
    ${JSON.stringify(collectionSchema, null, 4)}
    </script>

    <script type="application/ld+json">
    ${JSON.stringify(faqSchema, null, 4)}
    </script>

    <meta property="og:type" content="website">
    <meta property="og:url" content="https://www.legacyinvestingshow.com/tax-strategies/for/${persona.slug}">
    <meta property="og:title" content="Tax Strategies for ${persona.title}">
    <meta property="og:description" content="${persona.description}">
    <meta property="og:site_name" content="Legacy Investing Show">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Tax Strategies for ${persona.title}">
    <meta name="twitter:description" content="${persona.description}">

    <meta name="theme-color" content="#ffffff">
    <link rel="icon" type="image/png" href="/assets/images/logo.png">
    <link rel="apple-touch-icon" href="/assets/images/logo.png">
    <link rel="stylesheet" href="/assets/css/styles.css">

    ${renderAnalyticsHead({ gaTrackingId: GA_TRACKING_ID, gtmContainerId: GTM_CONTAINER_ID })}

    <style>
        .persona-hero {
            padding: 8rem 0 4rem;
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
        }
        .persona-hero__badge {
            display: inline-block;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #10b981;
            margin-bottom: 1rem;
        }
        .persona-hero__title {
            font-size: 2.5rem;
            font-weight: 700;
            color: #111827;
            margin-bottom: 1rem;
        }
        @media (min-width: 768px) {
            .persona-hero__title { font-size: 3rem; }
        }
        .persona-hero__subtitle {
            font-size: 1.25rem;
            color: #4b5563;
            max-width: 40rem;
        }
        .strategies-section {
            padding: 4rem 0;
        }
        .section-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: #111827;
            margin-bottom: 2rem;
        }
        .strategies-grid {
            display: grid;
            gap: 1.5rem;
        }
        @media (min-width: 768px) {
            .strategies-grid { grid-template-columns: repeat(2, 1fr); }
        }
        .strategy-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 0.75rem;
            padding: 1.5rem;
            text-decoration: none;
            transition: all 0.2s;
        }
        .strategy-card:hover {
            border-color: #10b981;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
            transform: translateY(-2px);
        }
        .strategy-card__complexity {
            display: inline-block;
            font-size: 0.625rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 0.25rem 0.5rem;
            border-radius: 9999px;
            margin-bottom: 0.75rem;
        }
        .strategy-card__complexity--beginner { background: #d1fae5; color: #065f46; }
        .strategy-card__complexity--intermediate { background: #fef3c7; color: #92400e; }
        .strategy-card__complexity--advanced { background: #fee2e2; color: #991b1b; }
        .strategy-card__title {
            font-size: 1.125rem;
            font-weight: 600;
            color: #111827;
            margin-bottom: 0.5rem;
        }
        .strategy-card__desc {
            font-size: 0.875rem;
            color: #6b7280;
            margin-bottom: 1rem;
            line-height: 1.5;
        }
        .strategy-card__savings {
            display: flex;
            flex-direction: column;
            gap: 0.125rem;
            padding-top: 1rem;
            border-top: 1px solid #f3f4f6;
        }
        .strategy-card__savings-label {
            font-size: 0.75rem;
            color: #9ca3af;
        }
        .strategy-card__savings-value {
            font-size: 0.875rem;
            font-weight: 600;
            color: #10b981;
        }
        .breadcrumb {
            padding: 1rem 0;
            font-size: 0.875rem;
        }
        .breadcrumb a {
            color: #6b7280;
            text-decoration: none;
        }
        .breadcrumb a:hover {
            color: #111827;
        }
        .breadcrumb span {
            color: #9ca3af;
            margin: 0 0.5rem;
        }
        .cta-section {
            padding: 4rem 0;
            text-align: center;
        }
        .cta-card {
            background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
            border-radius: 1rem;
            padding: 3rem 2rem;
            color: white;
        }
        .cta-card__title {
            font-size: 1.75rem;
            font-weight: 700;
            margin-bottom: 1rem;
        }
        .cta-card__text {
            color: #d1d5db;
            margin-bottom: 1.5rem;
            max-width: 32rem;
            margin-left: auto;
            margin-right: auto;
        }
        .cta-card__button {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 1rem 2rem;
            background: #10b981;
            color: white;
            font-weight: 600;
            border-radius: 0.5rem;
            text-decoration: none;
            transition: background 0.2s;
        }
        .cta-card__button:hover {
            background: #059669;
        }
    </style>
</head>
<body class="bg-white text-gray-900" data-page-type="tax_persona" data-page-slug="${persona.slug}" data-page-title="${persona.title}">
    ${renderAnalyticsBody({ gtmContainerId: GTM_CONTAINER_ID })}
    <a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-gray-900 text-white px-4 py-2 z-50">
        Skip to main content
    </a>

    <header class="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <nav class="container-custom" aria-label="Main navigation">
            <div class="flex items-center justify-between h-16">
                <a href="/" class="flex items-center gap-2 font-medium text-gray-900 hover:text-gray-700 transition-colors">
                    <img src="/assets/images/logo.png" alt="Legacy Investing Show Logo" width="28" height="28" class="w-7 h-7">
                    <span>Legacy Investing Show</span>
                </a>
                <div class="hidden md:flex items-center gap-4">
                    ${renderPrimaryNavLinks('/tax-strategies')}
                </div>
                <button id="mobile-menu-btn" class="md:hidden p-2 text-gray-700" aria-label="Open menu">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                </button>
            </div>
            <div id="mobile-menu" class="hidden md:hidden pb-4">
                <div class="flex flex-col gap-3">
                    ${renderPrimaryNavLinks('/tax-strategies')}
                </div>
            </div>
        </nav>
    </header>

    <!-- Breadcrumb Navigation -->
    <nav aria-label="Breadcrumb" class="container-custom pt-24 pb-4">
        <ol class="breadcrumb" itemscope itemtype="https://schema.org/BreadcrumbList">
            <li class="breadcrumb__item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                <a href="/" class="breadcrumb__link" itemprop="item"><span itemprop="name">Home</span></a>
                <meta itemprop="position" content="1" />
            </li>
            <li class="breadcrumb__item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                <a href="/tax-strategies" class="breadcrumb__link" itemprop="item"><span itemprop="name">Tax Strategies</span></a>
                <meta itemprop="position" content="2" />
            </li>
            <li class="breadcrumb__item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                <span class="breadcrumb__current" itemprop="name">For ${persona.title}</span>
                <meta itemprop="position" content="3" />
            </li>
        </ol>
    </nav>

    <main id="main">

        <section class="persona-hero">
            <div class="container-custom">
                <span class="persona-hero__badge">Tax Strategies For</span>
                <h1 class="persona-hero__title">${persona.title}</h1>
                <p class="persona-hero__subtitle">${persona.description}</p>
            </div>
        </section>

        <section class="strategies-section">
            <div class="container-custom">
                <h2 class="section-title">Recommended Strategies for ${persona.title}</h2>
                <div class="strategies-grid">
                    ${strategyCards}
                </div>
            </div>
        </section>

        <section style="padding: 0 0 3rem;">
            <div class="container-custom" style="max-width: 56rem;">
                ${renderSourceBlock({ title: persona.title, slug: persona.slug, type: 'persona' })}
            </div>
        </section>

        <section class="cta-section">
            <div class="container-custom">
                ${renderPageCtaSection({
                    variant: 'tax_masterclass',
                    title: `Map The Right Moves For ${persona.title} In Before You File`,
                    text: 'The challenge runs live April 17-19, 2026, from 10 AM to 4 PM Eastern each day. It covers how to read your 2025 return, choose the right strategies for your situation, and turn them into a dated 2026 action plan.',
                    trackLocation: 'tax_persona_cta',
                })}
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
    <script>
        document.getElementById('mobile-menu-btn')?.addEventListener('click', function() {
            document.getElementById('mobile-menu').classList.toggle('hidden');
        });
    </script>
</body>
</html>`;
}

/**
 * Main build function
 */
function build() {
    console.log('Starting tax strategies build...\n');

    // Load data and template
    const data = loadData();
    const template = loadTemplate();
    const strategies = data.strategies;
    const personas = data.personas;

    console.log(`Found ${strategies.length} strategies`);
    console.log(`Found ${personas.length} personas\n`);

    // Ensure output directories exist
    ensureDir(OUTPUT_DIR);
    ensureDir(path.join(OUTPUT_DIR, 'for'));

    let successCount = 0;
    let errorCount = 0;

    // Build individual strategy pages
    console.log('Building strategy pages...');
    let skippedCount = 0;
    for (const strategy of strategies) {
        try {
            const outputPath = path.join(OUTPUT_DIR, `${strategy.slug}.html`);
            
            // Skip if file already exists and is comprehensive
            if (shouldSkipFile(outputPath)) {
                console.log(`  Skipped: ${strategy.slug}.html (comprehensive content exists)`);
                skippedCount++;
                continue;
            }
            
            const html = buildStrategyPage(strategy, template, strategies);
            fs.writeFileSync(outputPath, html);
            console.log(`  Built: ${strategy.slug}.html`);
            successCount++;
        } catch (error) {
            console.error(`  Error building ${strategy.slug}: ${error.message}`);
            errorCount++;
        }
    }

    // Build persona pages
    console.log('\nBuilding persona pages...');
    for (const persona of personas) {
        try {
            const html = generatePersonaPage(persona, strategies);
            const outputPath = path.join(OUTPUT_DIR, 'for', `${persona.slug}.html`);
            fs.writeFileSync(outputPath, html);
            console.log(`  Built: for/${persona.slug}.html`);
            successCount++;
        } catch (error) {
            console.error(`  Error building ${persona.slug}: ${error.message}`);
            errorCount++;
        }
    }

    // Build index page
    console.log('\nBuilding index page...');
    try {
        const indexHtml = generateIndexPage(strategies, personas);
        const indexPath = path.join(OUTPUT_DIR, 'index.html');
        fs.writeFileSync(indexPath, indexHtml);
        console.log('  Built: index.html');
        successCount++;
    } catch (error) {
        console.error(`  Error building index: ${error.message}`);
        errorCount++;
    }

    // Summary
    console.log('\n-------------------');
    console.log('Build complete!');
    console.log(`Successfully built: ${successCount} page(s)`);
    console.log(`Skipped (comprehensive): ${skippedCount} page(s)`);
    if (errorCount > 0) {
        console.log(`Errors: ${errorCount}`);
    }
    console.log(`Total pages: ${strategies.length} strategies + ${personas.length} personas + 1 index = ${strategies.length + personas.length + 1}`);
    console.log('-------------------\n');
}

// Run build
build();
