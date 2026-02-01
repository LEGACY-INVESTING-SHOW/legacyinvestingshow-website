#!/usr/bin/env node

/**
 * Phase 1 Technical SEO Fixes for Legacy Investing Show
 * Fixes:
 * 1. Canonical URL standardization (remove .html extensions)
 * 2. Add schema markup to persona pages (BreadcrumbList, FAQPage, CollectionPage)
 * 3. Verify image alt tags and lazy loading
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');

// Files with incorrect canonical URLs (having .html extension)
const filesToFix = [
    'tax-strategies/capital-gains-exclusion.html',
    'tax-strategies/hsa-strategy.html',
    'retirement/401k-contribution-strategies.html',
    'retirement/defined-benefit-plan.html',
    'retirement/sep-ira-guide.html',
    'retirement/simple-ira-guide.html',
    'retirement/traditional-vs-roth-401k.html'
];

// Persona pages that need schema markup
const personaPages = [
    'tax-strategies/for/airbnb-hosts.html',
    'tax-strategies/for/business-owners.html',
    'tax-strategies/for/high-income-earners.html',
    'tax-strategies/for/real-estate-investors.html',
    'tax-strategies/for/self-employed.html',
    'tax-strategies/for/w2-employees.html'
];

// Persona data for schema
const personaData = {
    'airbnb-hosts': {
        title: 'Airbnb Hosts',
        description: 'Specific tax benefits for short-term rental operators',
        strategies: ['short-term-rental-loophole', 'augusta-rule', 'cost-segregation', 'real-estate-professional-status']
    },
    'business-owners': {
        title: 'Business Owners',
        description: 'Tax optimization for entrepreneurs and company owners',
        strategies: ['s-corp-strategy', 'section-179', 'charitable-remainder-trust', 'captive-insurance']
    },
    'high-income-earners': {
        title: 'High-Income Earners',
        description: 'Strategies for those in the highest tax brackets',
        strategies: ['backdoor-roth-ira', 'donor-advised-fund', 'qualified-opportunity-zone-fund', 'tax-loss-harvesting']
    },
    'real-estate-investors': {
        title: 'Real Estate Investors',
        description: 'Advanced strategies for rental property owners and flippers',
        strategies: ['cost-segregation', '1031-exchange', 'bonus-depreciation', 'real-estate-professional-status']
    },
    'self-employed': {
        title: 'Self-Employed',
        description: 'Maximize deductions and retirement savings for independent workers',
        strategies: ['solo-401k', 'sep-ira-guide', 'home-office-deduction', 'health-savings-account-strategy']
    },
    'w2-employees': {
        title: 'W-2 Employees',
        description: 'Tax strategies for salaried workers looking to reduce their tax burden',
        strategies: ['backdoor-roth-ira', 'hsa-strategy', 'bunching-deductions', 'dependent-care-fsa']
    }
};

/**
 * Fix canonical URLs - remove .html extension
 */
function fixCanonicalUrls() {
    console.log('\n=== Fixing Canonical URLs ===\n');
    
    let fixedCount = 0;
    
    for (const filePath of filesToFix) {
        const fullPath = path.join(ROOT_DIR, filePath);
        
        if (!fs.existsSync(fullPath)) {
            console.log(`⚠️  File not found: ${filePath}`);
            continue;
        }
        
        let content = fs.readFileSync(fullPath, 'utf-8');
        const originalContent = content;
        
        // Fix canonical URL - remove .html from the URL
        content = content.replace(
            /link rel="canonical" href="([^"]+)\.html"/g,
            'link rel="canonical" href="$1"'
        );
        
        if (content !== originalContent) {
            fs.writeFileSync(fullPath, content);
            console.log(`✅ Fixed canonical URL in: ${filePath}`);
            fixedCount++;
        } else {
            console.log(`ℹ️  No changes needed: ${filePath}`);
        }
    }
    
    console.log(`\nFixed ${fixedCount} files with canonical URL issues`);
    return fixedCount;
}

/**
 * Generate BreadcrumbList schema
 */
function generateBreadcrumbSchema(personaSlug, personaTitle) {
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://legacyinvestingshow.com/"
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": "Tax Strategies",
                "item": "https://legacyinvestingshow.com/tax-strategies/"
            },
            {
                "@type": "ListItem",
                "position": 3,
                "name": personaTitle,
                "item": `https://legacyinvestingshow.com/tax-strategies/for/${personaSlug}`
            }
        ]
    };
}

/**
 * Generate CollectionPage schema for persona pages
 */
function generateCollectionPageSchema(personaSlug, personaTitle, personaDescription) {
    return {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": `Tax Strategies for ${personaTitle}`,
        "description": personaDescription,
        "url": `https://legacyinvestingshow.com/tax-strategies/for/${personaSlug}`,
        "isPartOf": {
            "@type": "WebSite",
            "name": "Legacy Investing Show",
            "url": "https://legacyinvestingshow.com"
        },
        "about": {
            "@type": "Thing",
            "name": personaTitle,
            "description": personaDescription
        }
    };
}

/**
 * Generate FAQ schema for persona pages
 */
function generatePersonaFaqSchema(personaSlug) {
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
                answer: "Solo 401(k)s allow contributions up to $76,500 (2025). SEP IRAs offer up to $70,000. Both offer tax-deductible contributions and tax-deferred growth."
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
    
    const personaFaqs = faqs[personaSlug] || faqs['high-income-earners'];
    
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
 * Add schema markup to persona pages
 */
function addSchemaToPersonaPages() {
    console.log('\n=== Adding Schema Markup to Persona Pages ===\n');
    
    let fixedCount = 0;
    
    for (const filePath of personaPages) {
        const fullPath = path.join(ROOT_DIR, filePath);
        
        if (!fs.existsSync(fullPath)) {
            console.log(`⚠️  File not found: ${filePath}`);
            continue;
        }
        
        let content = fs.readFileSync(fullPath, 'utf-8');
        const originalContent = content;
        
        // Extract persona slug from filename
        const personaSlug = path.basename(filePath, '.html');
        const persona = personaData[personaSlug];
        
        if (!persona) {
            console.log(`⚠️  No data found for persona: ${personaSlug}`);
            continue;
        }
        
        // Check if schema already exists
        if (content.includes('application/ld+json')) {
            console.log(`ℹ️  Schema already exists in: ${filePath}`);
            continue;
        }
        
        // Generate schemas
        const breadcrumbSchema = generateBreadcrumbSchema(personaSlug, persona.title);
        const collectionSchema = generateCollectionPageSchema(personaSlug, persona.title, persona.description);
        const faqSchema = generatePersonaFaqSchema(personaSlug);
        
        const schemaScripts = `
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
`;
        
        // Insert schema before the closing </head> tag
        content = content.replace('</head>', `${schemaScripts}</head>`);
        
        if (content !== originalContent) {
            fs.writeFileSync(fullPath, content);
            console.log(`✅ Added schema markup to: ${filePath}`);
            fixedCount++;
        }
    }
    
    console.log(`\nAdded schema markup to ${fixedCount} persona pages`);
    return fixedCount;
}

/**
 * Check and report image alt tags
 */
function checkImageAltTags() {
    console.log('\n=== Checking Image Alt Tags ===\n');
    
    const allPages = [
        ...fs.readdirSync(path.join(ROOT_DIR, 'tax-strategies')).filter(f => f.endsWith('.html')).map(f => `tax-strategies/${f}`),
        ...fs.readdirSync(path.join(ROOT_DIR, 'retirement')).filter(f => f.endsWith('.html')).map(f => `retirement/${f}`),
        ...fs.readdirSync(path.join(ROOT_DIR, 'tax-strategies/for')).filter(f => f.endsWith('.html')).map(f => `tax-strategies/for/${f}`)
    ];
    
    let totalImages = 0;
    let imagesWithAlt = 0;
    let imagesWithoutAlt = 0;
    let imagesWithLazy = 0;
    
    for (const filePath of allPages) {
        const fullPath = path.join(ROOT_DIR, filePath);
        
        if (!fs.existsSync(fullPath)) continue;
        
        const content = fs.readFileSync(fullPath, 'utf-8');
        
        // Find all img tags
        const imgMatches = content.match(/<img[^>]*>/g) || [];
        
        for (const imgTag of imgMatches) {
            totalImages++;
            
            if (imgTag.includes('alt="') || imgTag.includes("alt='")) {
                const altMatch = imgTag.match(/alt=["']([^"']*)["']/);
                if (altMatch && altMatch[1].trim() !== '') {
                    imagesWithAlt++;
                } else {
                    imagesWithoutAlt++;
                    console.log(`⚠️  Empty alt tag in ${filePath}: ${imgTag.substring(0, 80)}...`);
                }
            } else {
                imagesWithoutAlt++;
                console.log(`⚠️  Missing alt tag in ${filePath}: ${imgTag.substring(0, 80)}...`);
            }
            
            if (imgTag.includes('loading="lazy"')) {
                imagesWithLazy++;
            }
        }
    }
    
    console.log(`\nImage Analysis Summary:`);
    console.log(`  Total images: ${totalImages}`);
    console.log(`  Images with alt text: ${imagesWithAlt}`);
    console.log(`  Images without proper alt: ${imagesWithoutAlt}`);
    console.log(`  Images with lazy loading: ${imagesWithLazy}`);
    
    return { totalImages, imagesWithAlt, imagesWithoutAlt, imagesWithLazy };
}

/**
 * Main function
 */
function main() {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║   Phase 1 Technical SEO Fixes                          ║');
    console.log('║   Legacy Investing Show                                ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    
    const canonicalFixed = fixCanonicalUrls();
    const schemaAdded = addSchemaToPersonaPages();
    const imageStats = checkImageAltTags();
    
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║   SUMMARY                                              ║');
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log(`║  Canonical URLs fixed: ${canonicalFixed.toString().padEnd(37)}║`);
    console.log(`║  Schema markup added:  ${schemaAdded.toString().padEnd(37)}║`);
    console.log(`║  Images with alt:      ${imageStats.imagesWithAlt.toString().padEnd(37)}║`);
    console.log(`║  Images needing alt:   ${imageStats.imagesWithoutAlt.toString().padEnd(37)}║`);
    console.log(`║  Images lazy loaded:   ${imageStats.imagesWithLazy.toString().padEnd(37)}║`);
    console.log('╚════════════════════════════════════════════════════════╝');
}

main();
