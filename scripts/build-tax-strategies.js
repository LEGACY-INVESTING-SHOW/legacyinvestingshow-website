#!/usr/bin/env node

/**
 * Tax Strategies Page Generator for Legacy Investing Show
 *
 * This script generates SEO-optimized tax strategy pages from data:
 * 1. Individual strategy pages (/tax-strategies/[slug].html)
 * 2. Persona-based pages (/tax-strategies/for/[persona].html)
 * 3. Main index page (/tax-strategies/index.html)
 */

const fs = require('fs');
const path = require('path');

// Paths
const ROOT_DIR = path.join(__dirname, '..');
const DATA_PATH = path.join(ROOT_DIR, 'data', 'tax-strategies.json');
const TEMPLATE_PATH = path.join(ROOT_DIR, 'templates', 'tax-strategy.html');
const OUTPUT_DIR = path.join(ROOT_DIR, 'tax-strategies');

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
                                    <a href="/tax-strategies/${slug}.html">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M9 18l6-6-6-6"/>
                                        </svg>
                                        ${title}
                                    </a>
                                </li>`;
    }).join('');
}

/**
 * Build individual strategy page
 */
function buildStrategyPage(strategy, template, allStrategies) {
    const today = new Date().toISOString().split('T')[0];

    let html = template
        .replace(/\{\{title\}\}/g, strategy.title)
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
                    <a href="/tax-strategies/${s.slug}.html" class="strategy-card">
                        <div class="strategy-card__complexity strategy-card__complexity--${s.complexity.toLowerCase()}">${s.complexity}</div>
                        <h3 class="strategy-card__title">${s.title}</h3>
                        <p class="strategy-card__desc">${s.shortDescription}</p>
                        <div class="strategy-card__savings">
                            <span class="strategy-card__savings-label">Potential Savings:</span>
                            <span class="strategy-card__savings-value">${s.potentialSavings}</span>
                        </div>
                    </a>`).join('\n');

    const personaCards = personas.map(p => `
                    <a href="/tax-strategies/for/${p.slug}.html" class="persona-card">
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
    <link rel="canonical" href="https://legacyinvestingshow.com/tax-strategies/">

    <meta property="og:type" content="website">
    <meta property="og:url" content="https://legacyinvestingshow.com/tax-strategies/">
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
        "url": "https://legacyinvestingshow.com/tax-strategies/",
        "publisher": {
            "@type": "Organization",
            "name": "Legacy Investing Show"
        }
    }
    </script>

    <script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'GA_MEASUREMENT_ID');
    </script>

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
<body class="bg-white text-gray-900">
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
                <div class="hidden md:flex items-center gap-6">
                    <a href="/" class="nav-link">Home</a>
                    <a href="/about.html" class="nav-link">About</a>
                    <a href="/programs.html" class="nav-link">Programs</a>
                    <a href="/success-stories.html" class="nav-link">Results</a>
                    <a href="/blog/" class="nav-link">Blog</a>
                </div>
                <button id="mobile-menu-btn" class="md:hidden p-2 text-gray-700" aria-label="Open menu">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                </button>
            </div>
            <div id="mobile-menu" class="hidden md:hidden pb-4">
                <div class="flex flex-col gap-3">
                    <a href="/" class="nav-link">Home</a>
                    <a href="/about.html" class="nav-link">About</a>
                    <a href="/programs.html" class="nav-link">Programs</a>
                    <a href="/success-stories.html" class="nav-link">Results</a>
                    <a href="/blog/" class="nav-link">Blog</a>
                </div>
            </div>
        </nav>
    </header>

    <main id="main">
        <section class="tax-hero">
            <div class="container-custom">
                <h1 class="tax-hero__title">Tax Strategies for Investors</h1>
                <p class="tax-hero__subtitle">Discover proven tax strategies used by real estate investors, business owners, and high-income earners to legally minimize their tax burden.</p>
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

        <section class="cta-section">
            <div class="container-custom">
                <div class="cta-card">
                    <h2 class="cta-card__title">Master These Tax Strategies</h2>
                    <p class="cta-card__text">Join the 3-Day Wealth Challenge to learn how to implement these strategies and build lasting wealth.</p>
                    <a href="https://www.managemoney101.com/challengeoptin" class="cta-card__button">
                        Start the Challenge
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                    </a>
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
                    <a href="/programs.html">Programs</a>
                    <a href="/success-stories.html">Results</a>
                    <a href="/blog/">Blog</a>
                    <a href="/tax-strategies/">Tax Strategies</a>
                </div>
            </div>
            <div class="footer-copyright">Copyright 2025</div>
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
 * Generate persona page
 */
function generatePersonaPage(persona, strategies) {
    const relevantStrategies = strategies.filter(s => persona.topStrategies.includes(s.slug));

    const strategyCards = relevantStrategies.map(s => `
                    <a href="/tax-strategies/${s.slug}.html" class="strategy-card">
                        <div class="strategy-card__complexity strategy-card__complexity--${s.complexity.toLowerCase()}">${s.complexity}</div>
                        <h3 class="strategy-card__title">${s.title}</h3>
                        <p class="strategy-card__desc">${s.shortDescription}</p>
                        <div class="strategy-card__savings">
                            <span class="strategy-card__savings-label">Potential Savings:</span>
                            <span class="strategy-card__savings-value">${s.potentialSavings}</span>
                        </div>
                    </a>`).join('\n');

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
    <link rel="canonical" href="https://legacyinvestingshow.com/tax-strategies/for/${persona.slug}">

    <meta property="og:type" content="website">
    <meta property="og:url" content="https://legacyinvestingshow.com/tax-strategies/for/${persona.slug}">
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

    <script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'GA_MEASUREMENT_ID');
    </script>

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
<body class="bg-white text-gray-900">
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
                <div class="hidden md:flex items-center gap-6">
                    <a href="/" class="nav-link">Home</a>
                    <a href="/about.html" class="nav-link">About</a>
                    <a href="/programs.html" class="nav-link">Programs</a>
                    <a href="/success-stories.html" class="nav-link">Results</a>
                    <a href="/blog/" class="nav-link">Blog</a>
                </div>
                <button id="mobile-menu-btn" class="md:hidden p-2 text-gray-700" aria-label="Open menu">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                </button>
            </div>
            <div id="mobile-menu" class="hidden md:hidden pb-4">
                <div class="flex flex-col gap-3">
                    <a href="/" class="nav-link">Home</a>
                    <a href="/about.html" class="nav-link">About</a>
                    <a href="/programs.html" class="nav-link">Programs</a>
                    <a href="/success-stories.html" class="nav-link">Results</a>
                    <a href="/blog/" class="nav-link">Blog</a>
                </div>
            </div>
        </nav>
    </header>

    <main id="main">
        <div class="breadcrumb container-custom" style="padding-top: 5rem;">
            <a href="/">Home</a>
            <span>/</span>
            <a href="/tax-strategies/">Tax Strategies</a>
            <span>/</span>
            <span class="text-gray-900">${persona.title}</span>
        </div>

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

        <section class="cta-section">
            <div class="container-custom">
                <div class="cta-card">
                    <h2 class="cta-card__title">Learn More Tax Strategies</h2>
                    <p class="cta-card__text">Join the 3-Day Wealth Challenge to learn how to implement these strategies for your specific situation.</p>
                    <a href="https://www.managemoney101.com/challengeoptin" class="cta-card__button">
                        Start the Challenge
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                    </a>
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
                    <a href="/programs.html">Programs</a>
                    <a href="/success-stories.html">Results</a>
                    <a href="/blog/">Blog</a>
                    <a href="/tax-strategies/">Tax Strategies</a>
                </div>
            </div>
            <div class="footer-copyright">Copyright 2025</div>
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
    for (const strategy of strategies) {
        try {
            const html = buildStrategyPage(strategy, template, strategies);
            const outputPath = path.join(OUTPUT_DIR, `${strategy.slug}.html`);
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
    if (errorCount > 0) {
        console.log(`Errors: ${errorCount}`);
    }
    console.log(`Total pages: ${strategies.length} strategies + ${personas.length} personas + 1 index = ${strategies.length + personas.length + 1}`);
    console.log('-------------------\n');
}

// Run build
build();
