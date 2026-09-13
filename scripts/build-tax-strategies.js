#!/usr/bin/env node

/**
 * Tax Strategies Page Generator for Legacy Investing Show
 *
 * Generates:
 * 1. Individual strategy pages (/tax-strategies/[slug]) from templates/tax-strategy.html
 *    — long-form pages already on disk are never regenerated (see shouldSkipFile).
 * 2. Persona pages (/tax-strategies/for/[persona])
 * 3. The hub page (/tax-strategies)
 */

const fs = require('fs');
const path = require('path');
const {
    CURRENT_YEAR,
    renderAnalyticsBody,
    renderAnalyticsHead,
    renderHeadAssets,
    renderSiteFooter,
    renderSiteHeader,
    renderSourceBlock,
} = require('./lib/site-shell');

// Paths
const ROOT_DIR = path.join(__dirname, '..');
const DATA_PATH = path.join(ROOT_DIR, 'data', 'tax-strategies.json');
const TEMPLATE_PATH = path.join(ROOT_DIR, 'templates', 'tax-strategy.html');
const OUTPUT_DIR = path.join(ROOT_DIR, 'tax-strategies');
const GA_TRACKING_ID = process.env.GA_TRACKING_ID || 'G-2578PT1WSS';
const GTM_CONTAINER_ID = process.env.GTM_CONTAINER_ID || 'GTM-KQ4R2LKP';
const SITE_URL = 'https://www.legacyinvestingshow.com';
const OG_IMAGE = `${SITE_URL}/assets/images/og-image.jpg`;
const GOOGLE_SITE_VERIFICATIONS = [
    'Kec6RfGhFL-qG_8zKxCqt7yxjgy65WeDAftCBm90G2s',
    '92MoCnkdQOj_ey1lEafT5Mz-znCcCQ3UABZlI-JG_nM'
];

const HUB_FAQS = [
    {
        question: 'Which strategy should I implement first?',
        answer: 'Start with the one that fits the income you already have. A rental owner usually gets the largest first-year move from cost segregation combined with bonus depreciation. A W-2 employee with no property gets further with an HSA, bunching deductions, or the short-term rental loophole if a property is already in the plan.'
    },
    {
        question: 'Do I need a CPA to implement these strategies?',
        answer: 'Some are self-service: HSA contributions, a solo 401(k), tracking mileage. Others are not. A cost segregation study has to be produced by qualified engineers, a 1031 exchange needs a qualified intermediary before closing, and real estate professional status stands or falls on contemporaneous time logs a CPA should review.'
    },
    {
        question: 'Can I use several strategies at once?',
        answer: 'Yes, and most plans do. Cost segregation and bonus depreciation work on the same property. A solo 401(k) and an HSA sit alongside an S-corp election. The constraint is interaction: a deduction that lowers wages can shrink a retirement contribution limit, and passive losses only help if you clear the participation tests.'
    },
    {
        question: 'What is the difference between a deduction and a credit?',
        answer: 'A deduction reduces taxable income, so its value is the deduction multiplied by your marginal rate. In the 24% bracket a $10,000 deduction saves $2,400. A credit reduces the tax itself, so a $10,000 credit saves $10,000. Almost everything on this page is a deduction or a deferral rather than a credit.'
    },
    {
        question: 'How much can these strategies actually save?',
        answer: 'It depends on your marginal rate, your income type, and whether the facts support the strategy before you file. The savings figures on each page are worked examples with their assumptions written out. Run the same math with your own numbers rather than with the example.'
    }
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

function esc(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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
 * Generate FAQ accordion items.
 * The toggle class is deliberately not `faq-question`: main.js binds a second,
 * incompatible handler to that class and the two would cancel each other out.
 */
function generateFaqItems(faqs) {
    if (!faqs || faqs.length === 0) return '';

    return faqs.map((faq, index) => `
                    <div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
                        <button class="faq-toggle" aria-expanded="${index === 0 ? 'true' : 'false'}" aria-controls="faq-answer-${index}">
                            <span itemprop="name">${faq.question}</span>
                            <svg class="faq-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
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
function faqSchemaObject(faqs) {
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map(faq => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer
            }
        }))
    };
}

function generateFaqSchema(faqs) {
    if (!faqs || faqs.length === 0) return '';
    return `<script type="application/ld+json">
    ${JSON.stringify(faqSchemaObject(faqs), null, 4)}
    </script>`;
}

/**
 * Visible FAQ as a definition list.
 */
function renderFaqList(faqs) {
    return `<dl class="guide-faq">
${faqs.map((faq) => `                        <dt>${esc(faq.question)}</dt>
                        <dd>${esc(faq.answer)}</dd>`).join('\n')}
                    </dl>`;
}

/** renderSourceBlock still ships inline styles; guides.css owns the look. */
function plainSourceBlock(options) {
    return renderSourceBlock({ heading: 'Primary sources to verify before you act', ...options })
        .replace(/ style="[^"]*"/g, '');
}

/**
 * Generate benefits list HTML
 */
function generateBenefitsList(benefits) {
    return benefits.map(b => `<li>${b}</li>`).join('\n                            ');
}

/**
 * Generate related strategies list
 */
function generateRelatedStrategiesList(relatedSlugs, allStrategies, catalogBySlug) {
    if (!relatedSlugs || relatedSlugs.length === 0) return '';

    return relatedSlugs.map(slug => {
        const strategy = allStrategies.find(s => s.slug === slug);
        const catalogEntry = catalogBySlug.get(slug);
        const title = (strategy && strategy.title) || (catalogEntry && catalogEntry.title) || formatTitle(slug);
        return `
                                <li><a href="/tax-strategies/${slug}">${esc(title)}</a></li>`;
    }).join('');
}

/**
 * Check if a file exists and is comprehensive (has substantial content).
 * Returns true if the file should be left alone. The long-form strategy pages
 * are hand-written and must never be replaced by template output.
 */
function shouldSkipFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return false;
    }

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
function buildStrategyPage(strategy, template, allStrategies, catalogBySlug) {
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
        .replace(/\{\{professionalRequired\}\}/g, strategy.professionalRequired ? 'Recommended' : 'Not required')
        .replace(/\{\{typicalCost\}\}/g, strategy.typicalCost)
        .replace(/\{\{irsReference\}\}/g, strategy.irsReference)
        .replace(/\{\{bestFor\}\}/g, strategy.bestFor)
        .replace(/\{\{datePublished\}\}/g, today)
        .replace(/\{\{dateModified\}\}/g, today)
        .replace(/\{\{headAssets\}\}/g, renderHeadAssets())
        .replace(/\{\{analyticsHead\}\}/g, renderAnalyticsHead({ gaTrackingId: GA_TRACKING_ID, gtmContainerId: GTM_CONTAINER_ID }))
        .replace(/\{\{tagManagerBody\}\}/g, renderAnalyticsBody({ gtmContainerId: GTM_CONTAINER_ID }))
        .replace(/\{\{siteHeader\}\}/g, renderSiteHeader('/tax-strategies'))
        .replace(/\{\{siteFooter\}\}/g, renderSiteFooter())
        .replace(/\{\{footerYear\}\}/g, String(CURRENT_YEAR))
        .replace(/\{\{benefitsForList\}\}/g, generateBenefitsList(strategy.benefitsFor))
        .replace(/\{\{relatedStrategiesList\}\}/g, generateRelatedStrategiesList(strategy.relatedStrategies, allStrategies, catalogBySlug))
        .replace(/\{\{faqItems\}\}/g, generateFaqItems(strategy.faqs))
        .replace(/\{\{faqSchema\}\}/g, generateFaqSchema(strategy.faqs));

    // Handle minimum property value section
    if (strategy.minimumPropertyValue && strategy.minimumPropertyValue !== 'No minimum') {
        html = html.replace(/\{\{minimumPropertyValueRow\}\}/g, `
                        <div>
                            <dt>Minimum property value</dt>
                            <dd>${esc(strategy.minimumPropertyValue)}</dd>
                        </div>`);
    } else {
        html = html.replace(/\{\{minimumPropertyValueRow\}\}/g, '');
    }

    return html;
}

/**
 * The hub: one table per category, every strategy on the site in a row.
 */
function renderCatalogTables(categories, catalog) {
    return categories.map((category) => {
        const rows = catalog.filter((entry) => entry.category === category.id);
        if (!rows.length) return '';
        return `
                <h3 id="${esc(category.id)}">${esc(category.title)}</h3>
                <p>${esc(category.lead)}</p>
                <div class="table-scroll">
                    <table class="guide-table">
                        <caption class="sr-only">${esc(category.title)} tax strategies</caption>
                        <thead>
                            <tr>
                                <th scope="col">Strategy</th>
                                <th scope="col">What it does</th>
                                <th scope="col">Level</th>
                            </tr>
                        </thead>
                        <tbody>
${rows.map((row) => `                            <tr>
                                <th scope="row"><a href="/tax-strategies/${esc(row.slug)}">${esc(row.title)}</a></th>
                                <td>${esc(row.summary)}</td>
                                <td>${esc(row.level)}</td>
                            </tr>`).join('\n')}
                        </tbody>
                    </table>
                </div>`;
    }).join('\n');
}

/**
 * Generate the tax strategies index page
 */
function generateIndexPage(data) {
    const { personas, catalog, categories, retirementGuides } = data;

    const personaLinks = personas
        .map((p, index) => {
            const label = p.linkLabel || p.title;
            const link = `<a href="/tax-strategies/for/${esc(p.slug)}">${esc(label)}</a>`;
            if (index === personas.length - 1) return `or ${link}`;
            return link;
        })
        .join(', ');

    const retirementLinks = retirementGuides.map((guide) => `
                        <li><a href="/retirement/${esc(guide.slug)}">${esc(guide.title)}</a> — ${esc(guide.summary)}</li>`).join('');

    const schemaBlocks = [
        {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Tax Strategies for Investors',
            description: 'Every tax strategy guide on Legacy Investing Show, grouped by the kind of income or asset it applies to.',
            url: `${SITE_URL}/tax-strategies`,
            publisher: { '@type': 'Organization', name: 'Legacy Investing Show' },
            mainEntity: {
                '@type': 'ItemList',
                numberOfItems: catalog.length,
                itemListElement: catalog.map((entry, index) => ({
                    '@type': 'ListItem',
                    position: index + 1,
                    url: `${SITE_URL}/tax-strategies/${entry.slug}`,
                    name: entry.title
                }))
            }
        },
        {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
                { '@type': 'ListItem', position: 2, name: 'Tax Strategies', item: `${SITE_URL}/tax-strategies` }
            ]
        },
        faqSchemaObject(HUB_FAQS)
    ];

    const description = `Every tax strategy guide on the site in one table: what each one does, who it fits, and how involved it is. ${catalog.length} strategies across real estate, business entities, retirement accounts, and timing.`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">

    <title>Tax Strategies for Investors | Legacy Investing Show</title>
    <meta name="description" content="${esc(description)}">
    <meta name="keywords" content="tax strategies, real estate tax benefits, cost segregation, 1031 exchange, tax deductions, wealth building">
    <meta name="author" content="Preston Seo">
    <meta name="robots" content="index, follow">
    <meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATIONS[0]}">
    <meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATIONS[1]}">
    <link rel="canonical" href="${SITE_URL}/tax-strategies">

    <meta property="og:type" content="website">
    <meta property="og:url" content="${SITE_URL}/tax-strategies">
    <meta property="og:title" content="Tax Strategies for Investors">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:image" content="${OG_IMAGE}">
    <meta property="og:site_name" content="Legacy Investing Show">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Tax Strategies for Investors">
    <meta name="twitter:description" content="${esc(description)}">
    <meta name="twitter:image" content="${OG_IMAGE}">

    <meta name="theme-color" content="#FAF7F2">
    <link rel="icon" type="image/png" href="/assets/images/logo.png">
    <link rel="apple-touch-icon" href="/assets/images/logo.png">
    ${renderHeadAssets()}
    <link rel="stylesheet" href="/assets/css/guides.css">

${schemaBlocks.map((schema) => `    <script type="application/ld+json">${JSON.stringify(schema)}</script>`).join('\n')}

    ${renderAnalyticsHead({ gaTrackingId: GA_TRACKING_ID, gtmContainerId: GTM_CONTAINER_ID })}
</head>
<body class="guide-page" data-page-type="tax_strategies_hub" data-page-title="Tax Strategies">
    ${renderAnalyticsBody({ gtmContainerId: GTM_CONTAINER_ID })}
    <a href="#main" class="guide-skip">Skip to main content</a>

    ${renderSiteHeader('/tax-strategies')}

    <div class="container-custom">
        <nav aria-label="Breadcrumb">
            <ol class="breadcrumb" itemscope itemtype="https://schema.org/BreadcrumbList">
                <li class="breadcrumb__item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                    <a href="/" class="breadcrumb__link" itemprop="item"><span itemprop="name">Home</span></a>
                    <meta itemprop="position" content="1" />
                </li>
                <li class="breadcrumb__item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                    <span class="breadcrumb__current" itemprop="name">Tax strategies</span>
                    <meta itemprop="position" content="2" />
                </li>
            </ol>
        </nav>
    </div>

    <main id="main">
        <section class="guide-hero">
            <div class="container-custom">
                <h1 class="guide-hero__title">Tax strategies for investors</h1>
                <p class="guide-deck">${catalog.length} strategies, each with its own guide: what it does, who it fits, what it costs to run, and where it breaks. Start from your situation — ${personaLinks} — or read the table below.</p>
            </div>
        </section>

        <section class="guide-section">
            <div class="container-custom">
                <div class="guide-prose">
                    <h2>How to read this library</h2>
                    <p>Tax strategy is less about finding an unknown deduction than about matching a move to the income you already have. A deduction that transforms a rental owner's return does nothing for a salaried employee with no property, and an entity election that saves self-employment tax can cost more in payroll administration than it returns.</p>
                    <p>Each guide states the qualification test first, then the mechanics, then a worked example with its assumptions written out. Three things decide whether a strategy survives contact with your return: whether you meet the test, whether you can document it before you file, and whether the work is worth the money it saves.</p>

                    <h2>Every strategy, by category</h2>
                    <p>Level is about the work and the documentation burden, not the size of the deduction. Beginner strategies you can usually run yourself; advanced ones need a professional and a paper trail built during the year, not after it.</p>
${renderCatalogTables(categories, catalog)}

                    <h3>Retirement plan guides</h3>
                    <p>Plan-level guides that sit alongside the account strategies above.</p>
                    <ul class="guide-linklist">${retirementLinks}
                    </ul>

                    <h2>Common questions</h2>
                    ${renderFaqList(HUB_FAQS)}

                    ${plainSourceBlock({ title: 'Tax Strategies Hub', slug: 'tax-strategies', type: 'tax_hub' })}
                </div>
            </div>
        </section>

        <section class="cta-band">
            <div class="container-custom">
                <h2>Not sure which one applies to you?</h2>
                <p>The persona pages sequence four or five strategies for one kind of earner, in the order they usually pay off. The compare guides take two strategies that both sound right and show where each one wins.</p>
                <div class="cta-band-actions">
                    <a href="/compare" class="btn-primary">Open the compare guides</a>
                    <a href="/tax-strategies/for/w2-employees" class="btn-secondary">Start from a situation</a>
                </div>
            </div>
        </section>
    </main>

    ${renderSiteFooter()}

    <script defer src="/assets/js/main.js"></script>
</body>
</html>`;
}

/**
 * Generate BreadcrumbList schema for persona pages
 */
function generatePersonaBreadcrumbSchema(persona) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
            { '@type': 'ListItem', position: 2, name: 'Tax Strategies', item: `${SITE_URL}/tax-strategies` },
            { '@type': 'ListItem', position: 3, name: persona.title, item: `${SITE_URL}/tax-strategies/for/${persona.slug}` }
        ]
    };
}

/**
 * Generate CollectionPage schema for persona pages
 */
function generatePersonaCollectionSchema(persona) {
    return {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `Tax Strategies for ${persona.title}`,
        description: persona.description,
        url: `${SITE_URL}/tax-strategies/for/${persona.slug}`,
        isPartOf: {
            '@type': 'WebSite',
            name: 'Legacy Investing Show',
            url: SITE_URL
        },
        about: {
            '@type': 'Thing',
            name: persona.title,
            description: persona.description
        }
    };
}

/**
 * Persona FAQs
 */
function getPersonaFaqs(persona) {
    const faqs = {
        'airbnb-hosts': [
            {
                question: 'What are the best tax strategies for Airbnb hosts?',
                answer: 'The short-term rental loophole lets hosts deduct rental losses against W-2 income when the average stay is seven days or less and they materially participate. The Augusta rule covers renting your home to your own business for up to 14 days. Cost segregation accelerates depreciation on a furnished property.'
            },
            {
                question: 'Can Airbnb hosts qualify for real estate professional status?',
                answer: 'Only if you spend more than 750 hours a year and over half your working time in real property trades or businesses. Most hosts with a day job cannot clear that bar, which is why the short-term rental loophole exists as a separate route.'
            }
        ],
        'business-owners': [
            {
                question: 'What is the best business structure for tax savings?',
                answer: 'An S-corporation election can reduce self-employment tax by splitting owner pay between reasonable salary and distributions. Whether it pays depends on profit level, payroll cost, and state treatment, so model it before you elect.'
            },
            {
                question: 'How can business owners deduct equipment purchases?',
                answer: 'Section 179 expenses qualifying equipment in the year it is placed in service, up to the annual cap. Bonus depreciation covers additional first-year deductions on new and used property. The two interact, so check the order they apply in.'
            }
        ],
        'high-income-earners': [
            {
                question: 'How can high-income earners reduce their tax burden?',
                answer: 'The usable moves are a backdoor or mega backdoor Roth for tax-free growth above the income limits, a donor-advised fund for a deduction in a high-income year, and opportunity zone investments to defer capital gains.'
            },
            {
                question: 'What is the top marginal rate for high earners?',
                answer: 'The top federal income tax rate is 37%. Add the 3.8% net investment income tax and a state income tax and the combined marginal rate passes 50% in the highest-tax states.'
            }
        ],
        'real-estate-investors': [
            {
                question: 'What is cost segregation and how does it work?',
                answer: 'It reclassifies building components into 5, 7, and 15-year recovery periods instead of leaving everything in a 27.5 or 39-year building life, which moves deductions into the early years. It takes an engineering-based study to support.'
            },
            {
                question: 'Can I defer capital gains when selling investment property?',
                answer: 'A 1031 exchange defers the gain when the proceeds are reinvested in like-kind property through a qualified intermediary, with a 45-day identification window and a 180-day closing window.'
            }
        ],
        'self-employed': [
            {
                question: 'What retirement accounts are available to the self-employed?',
                answer: 'Solo 401(k)s and SEP IRAs both allow far higher contributions than an IRA. The solo 401(k) usually wins at lower profit levels because it adds an employee deferral on top of the employer contribution. Check the current-year limits before you fund either.'
            },
            {
                question: 'Can self-employed individuals deduct health insurance premiums?',
                answer: 'Self-employed health insurance premiums are deductible as an adjustment to income, subject to the earned income limit. A health savings account adds a second, separate deduction if the plan qualifies.'
            }
        ],
        'w2-employees': [
            {
                question: 'What tax strategies are available to W-2 employees?',
                answer: 'A health savings account, a backdoor Roth IRA above the income limits, bunching itemized deductions into alternate years, and the short-term rental loophole if a rental property is part of the plan.'
            },
            {
                question: 'How can W-2 employees deduct rental property losses?',
                answer: 'The short-term rental loophole treats a rental with an average stay of seven days or less as non-passive when you materially participate, which takes it outside the passive activity loss limits that normally block the deduction.'
            }
        ]
    };

    return faqs[persona.slug] || faqs['high-income-earners'];
}

function generatePersonaFaqSchema(persona) {
    return faqSchemaObject(getPersonaFaqs(persona));
}

/**
 * Persona strategy guidance: one hairline-separated block per strategy.
 */
function renderPersonaStrategies(persona, strategyBySlug, catalogBySlug) {
    return persona.topStrategies.map((slug) => {
        const strategy = strategyBySlug.get(slug);
        const entry = catalogBySlug.get(slug);
        const title = (entry && entry.title) || (strategy && strategy.title) || formatTitle(slug);
        const body = strategy ? strategy.fullDescription : (entry ? entry.summary : '');
        const facts = [];

        if (strategy) {
            facts.push(['Best fit', strategy.bestFor]);
            facts.push(['Potential savings', strategy.potentialSavings]);
            facts.push(['Typical cost', strategy.typicalCost]);
            facts.push(['Level', String(strategy.complexity).toLowerCase()]);
        } else if (entry) {
            facts.push(['Level', entry.level]);
        }

        const dl = facts.length
            ? `
                        <dl class="guide-dl">
${facts.map(([term, value]) => `                            <div>
                                <dt>${esc(term)}</dt>
                                <dd>${esc(value)}</dd>
                            </div>`).join('\n')}
                        </dl>`
            : '';

        return `
                    <section class="persona-strategy">
                        <h3><a href="/tax-strategies/${esc(slug)}">${esc(title)}</a></h3>
                        <p>${esc(body)}</p>${dl}
                    </section>`;
    }).join('\n');
}

/**
 * Generate persona page
 */
function generatePersonaPage(persona, strategyBySlug, catalogBySlug) {
    const breadcrumbSchema = generatePersonaBreadcrumbSchema(persona);
    const collectionSchema = generatePersonaCollectionSchema(persona);
    const faqSchema = generatePersonaFaqSchema(persona);
    const description = `${persona.description}. The strategies that usually matter first, what each one requires, and the questions to settle before you file.`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">

    <title>Tax Strategies for ${esc(persona.title)} | Legacy Investing Show</title>
    <meta name="description" content="${esc(description)}">
    <meta name="keywords" content="tax strategies ${esc(persona.title.toLowerCase())}, ${esc(persona.topStrategies.join(', '))}">
    <meta name="author" content="Preston Seo">
    <meta name="robots" content="index, follow">
    <meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATIONS[0]}">
    <meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATIONS[1]}">
    <link rel="canonical" href="${SITE_URL}/tax-strategies/for/${persona.slug}">

    <script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>
    <script type="application/ld+json">${JSON.stringify(collectionSchema)}</script>
    <script type="application/ld+json">${JSON.stringify(faqSchema)}</script>

    <meta property="og:type" content="website">
    <meta property="og:url" content="${SITE_URL}/tax-strategies/for/${persona.slug}">
    <meta property="og:title" content="Tax Strategies for ${esc(persona.title)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:image" content="${OG_IMAGE}">
    <meta property="og:site_name" content="Legacy Investing Show">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Tax Strategies for ${esc(persona.title)}">
    <meta name="twitter:description" content="${esc(description)}">
    <meta name="twitter:image" content="${OG_IMAGE}">

    <meta name="theme-color" content="#FAF7F2">
    <link rel="icon" type="image/png" href="/assets/images/logo.png">
    <link rel="apple-touch-icon" href="/assets/images/logo.png">
    ${renderHeadAssets()}
    <link rel="stylesheet" href="/assets/css/guides.css">

    ${renderAnalyticsHead({ gaTrackingId: GA_TRACKING_ID, gtmContainerId: GTM_CONTAINER_ID })}
</head>
<body class="guide-page" data-page-type="tax_persona" data-page-slug="${esc(persona.slug)}" data-page-title="${esc(persona.title)}">
    ${renderAnalyticsBody({ gtmContainerId: GTM_CONTAINER_ID })}
    <a href="#main" class="guide-skip">Skip to main content</a>

    ${renderSiteHeader('/tax-strategies')}

    <div class="container-custom">
        <nav aria-label="Breadcrumb">
            <ol class="breadcrumb" itemscope itemtype="https://schema.org/BreadcrumbList">
                <li class="breadcrumb__item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                    <a href="/" class="breadcrumb__link" itemprop="item"><span itemprop="name">Home</span></a>
                    <meta itemprop="position" content="1" />
                </li>
                <li class="breadcrumb__item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                    <a href="/tax-strategies" class="breadcrumb__link" itemprop="item"><span itemprop="name">Tax strategies</span></a>
                    <meta itemprop="position" content="2" />
                </li>
                <li class="breadcrumb__item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                    <span class="breadcrumb__current" itemprop="name">${esc(persona.title)}</span>
                    <meta itemprop="position" content="3" />
                </li>
            </ol>
        </nav>
    </div>

    <main id="main">
        <section class="guide-hero">
            <div class="container-custom">
                <h1 class="guide-hero__title">Tax strategies for ${esc(persona.linkLabel || persona.title)}</h1>
                <p class="guide-deck">${esc(persona.description)}.</p>
            </div>
        </section>

        <section class="guide-section">
            <div class="container-custom">
                <div class="guide-prose">
                    <h2>Where to start</h2>
                    <p>The strategies below are ordered by how often they matter for this group, not by size of deduction. Some can be put in place during the year, some need an account or entity opened before money moves, and some only work if the documentation exists before the deduction is claimed.</p>
${renderPersonaStrategies(persona, strategyBySlug, catalogBySlug)}

                    <h2>Common questions</h2>
                    ${renderFaqList(getPersonaFaqs(persona))}

                    <h2>Related reading</h2>
                    <ul class="guide-linklist">
                        <li><a href="/tax-strategies">Every tax strategy on the site</a> — the full table, grouped by category.</li>
                        <li><a href="/compare">Compare guides</a> — head-to-head when two strategies both look right.</li>
                    </ul>

                    ${plainSourceBlock({ title: persona.title, slug: persona.slug, type: 'persona' })}
                </div>
            </div>
        </section>
    </main>

    ${renderSiteFooter()}

    <script defer src="/assets/js/main.js"></script>
</body>
</html>`;
}

/**
 * Main build function
 */
function build() {
    console.log('Starting tax strategies build...\n');

    const data = loadData();
    const template = loadTemplate();
    const strategies = data.strategies;
    const personas = data.personas;
    const catalog = data.catalog || [];
    const catalogBySlug = new Map(catalog.map((entry) => [entry.slug, entry]));
    const strategyBySlug = new Map(strategies.map((entry) => [entry.slug, entry]));

    console.log(`Found ${strategies.length} templated strategies`);
    console.log(`Found ${catalog.length} catalogued strategy pages`);
    console.log(`Found ${personas.length} personas\n`);

    ensureDir(OUTPUT_DIR);
    ensureDir(path.join(OUTPUT_DIR, 'for'));

    let successCount = 0;
    let errorCount = 0;

    console.log('Building strategy pages...');
    let skippedCount = 0;
    for (const strategy of strategies) {
        try {
            const outputPath = path.join(OUTPUT_DIR, `${strategy.slug}.html`);

            if (shouldSkipFile(outputPath)) {
                console.log(`  Skipped: ${strategy.slug}.html (long-form page on disk)`);
                skippedCount++;
                continue;
            }

            const html = buildStrategyPage(strategy, template, strategies, catalogBySlug);
            fs.writeFileSync(outputPath, html);
            console.log(`  Built: ${strategy.slug}.html`);
            successCount++;
        } catch (error) {
            console.error(`  Error building ${strategy.slug}: ${error.message}`);
            errorCount++;
        }
    }

    console.log('\nBuilding persona pages...');
    for (const persona of personas) {
        try {
            const html = generatePersonaPage(persona, strategyBySlug, catalogBySlug);
            const outputPath = path.join(OUTPUT_DIR, 'for', `${persona.slug}.html`);
            fs.writeFileSync(outputPath, html);
            console.log(`  Built: for/${persona.slug}.html`);
            successCount++;
        } catch (error) {
            console.error(`  Error building ${persona.slug}: ${error.message}`);
            errorCount++;
        }
    }

    console.log('\nBuilding index page...');
    try {
        const indexHtml = generateIndexPage(data);
        fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), indexHtml);
        console.log('  Built: index.html');
        successCount++;
    } catch (error) {
        console.error(`  Error building index: ${error.message}`);
        errorCount++;
    }

    const missing = catalog.filter((entry) => !fs.existsSync(path.join(OUTPUT_DIR, `${entry.slug}.html`)));
    if (missing.length) {
        console.warn(`\nWarning: catalog lists ${missing.length} page(s) with no HTML on disk: ${missing.map((m) => m.slug).join(', ')}`);
    }

    console.log('\n-------------------');
    console.log('Build complete!');
    console.log(`Successfully built: ${successCount} page(s)`);
    console.log(`Skipped (long-form): ${skippedCount} page(s)`);
    if (errorCount > 0) {
        console.log(`Errors: ${errorCount}`);
    }
    console.log('-------------------\n');
}

build();
