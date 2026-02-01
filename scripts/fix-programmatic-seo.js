#!/usr/bin/env node

/**
 * FIXED Programmatic SEO Page Generator
 * Uses proper CSS classes matching the existing website
 */

const fs = require('fs');
const path = require('path');

// Load data
const citiesData = JSON.parse(fs.readFileSync('./data/cities.json', 'utf8'));
const taxStrategiesDir = './tax-strategies';
const outputDir = './programmatic-pages';

// Ensure output directories exist
const dirs = ['cities', 'comparisons', 'personas'].map(d => path.join(outputDir, d));
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Get all tax strategy files
const getTaxStrategies = () => {
  const files = fs.readdirSync(taxStrategiesDir)
    .filter(f => f.endsWith('.html') && f !== 'index.html')
    .filter(f => !f.startsWith('for/'));
  
  return files.map(file => {
    const slug = file.replace('.html', '');
    const title = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return { slug, title, file };
  });
};

// Standard head template
const getHead = (title, description, slug, type = 'cities') => `
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} | Legacy Investing Show</title>
    <meta name="description" content="${description}">
    <meta name="keywords" content="tax strategies, real estate investing, wealth building, Preston Seo">
    <meta name="author" content="Preston Seo">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://legacyinvestingshow-website.vercel.app/programmatic-pages/${type}/${slug}">
    
    <meta property="og:type" content="article">
    <meta property="og:url" content="https://legacyinvestingshow-website.vercel.app/programmatic-pages/${type}/${slug}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:site_name" content="Legacy Investing Show">
    
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    
    <meta name="theme-color" content="#059669">
    <link rel="icon" type="image/png" href="/assets/images/logo.png">
    <link rel="stylesheet" href="/assets/css/styles.css">
    
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "${title}",
        "description": "${description}",
        "author": {"@type": "Person", "name": "Preston Seo"},
        "publisher": {"@type": "Organization", "name": "Legacy Investing Show"},
        "datePublished": "${new Date().toISOString().split('T')[0]}"
    }
    </script>
</head>`;

// Standard header/navigation
const getHeader = () => `
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
                <a href="/tax-strategies/" class="nav-link nav-link-active">Tax Strategies</a>
                <a href="/blog/" class="nav-link">Blog</a>
            </div>
            <button id="mobile-menu-btn" class="md:hidden p-2 text-gray-700" aria-label="Open menu">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
            </button>
        </div>
    </nav>
</header>`;

// Standard footer
const getFooter = () => `
<footer class="bg-gray-900 text-white py-12">
    <div class="container-custom">
        <div class="grid md:grid-cols-4 gap-8">
            <div>
                <h3 class="font-semibold text-lg mb-4">Legacy Investing Show</h3>
                <p class="text-gray-400 text-sm">Building wealth that lasts beyond a paycheck.</p>
            </div>
            <div>
                <h4 class="font-medium mb-4">Quick Links</h4>
                <ul class="space-y-2 text-sm text-gray-400">
                    <li><a href="/about.html" class="hover:text-white">About</a></li>
                    <li><a href="/programs.html" class="hover:text-white">Programs</a></li>
                    <li><a href="/success-stories.html" class="hover:text-white">Success Stories</a></li>
                </ul>
            </div>
            <div>
                <h4 class="font-medium mb-4">Resources</h4>
                <ul class="space-y-2 text-sm text-gray-400">
                    <li><a href="/tax-strategies/" class="hover:text-white">Tax Strategies</a></li>
                    <li><a href="/blog/" class="hover:text-white">Blog</a></li>
                    <li><a href="/topics/airbnb-arbitrage.html" class="hover:text-white">Airbnb Arbitrage</a></li>
                </ul>
            </div>
            <div>
                <h4 class="font-medium mb-4">Legal</h4>
                <ul class="space-y-2 text-sm text-gray-400">
                    <li><a href="#" class="hover:text-white">Privacy Policy</a></li>
                    <li><a href="#" class="hover:text-white">Terms of Service</a></li>
                </ul>
            </div>
        </div>
        <div class="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; ${new Date().getFullYear()} Legacy Investing Show. All rights reserved.</p>
        </div>
    </div>
</footer>`;

// Generate city pages
const generateCityPages = () => {
  const taxStrategies = getTaxStrategies();
  const cities = citiesData.cities;
  
  console.log(`Generating ${cities.length} city pages...`);
  
  cities.forEach(cityData => {
    const { city, state, region, notes } = cityData;
    const slug = `${city.toLowerCase().replace(/\s+/g, '-')}-${state.toLowerCase()}`;
    const title = `Tax Strategies in ${city}, ${state}`;
    const description = `Discover the best tax strategies for ${city}, ${state} residents. Learn how to minimize taxes on real estate, business income, and investments with location-specific advice.`;
    
    const relevantStrategies = taxStrategies.slice(0, 9);
    
    const html = `<!DOCTYPE html>
<html lang="en">
${getHead(title, description, `${slug}.html`, 'cities')}
<body class="bg-white text-gray-900">
    ${getHeader()}

    <main id="main" class="pt-16">
        <!-- Hero Section -->
        <section style="padding: 6rem 0 4rem; background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); text-align: center;">
            <div class="container-custom">
                <h1 style="font-size: 2.5rem; font-weight: 700; color: #111827; margin-bottom: 1rem;">${title}</h1>
                <p style="font-size: 1.25rem; color: #4b5563; max-width: 40rem; margin: 0 auto;">${description}</p>
            </div>
        </section>

        <!-- Why This City Section -->
        <section style="padding: 4rem 0; background: white;">
            <div class="container-custom">
                <div style="max-width: 48rem; margin: 0 auto;">
                    <h2 style="font-size: 1.875rem; font-weight: 700; color: #111827; margin-bottom: 1.5rem;">Why ${city} Investors Need Specialized Tax Strategies</h2>
                    <p style="color: #4b5563; line-height: 1.75; margin-bottom: 1.5rem;">${city}, ${state} offers unique opportunities for real estate investors and business owners. Located in the ${region} region, ${city} has specific market conditions that create distinct tax optimization opportunities.</p>
                    <p style="color: #4b5563; line-height: 1.75; margin-bottom: 2rem;"><strong>Key factors:</strong> ${notes}</p>
                    
                    <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 1.5rem;">
                        <p style="color: #065f46; font-weight: 500; margin: 0;">Understanding ${state}'s specific tax laws and local regulations is crucial for implementing effective tax strategies in ${city}.</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- Top Strategies Section -->
        <section style="padding: 4rem 0; background: #f9fafb;">
            <div class="container-custom">
                <h2 style="font-size: 1.875rem; font-weight: 700; color: #111827; margin-bottom: 1rem; text-align: center;">Top Tax Strategies for ${city} Residents</h2>
                <p style="color: #6b7280; text-align: center; max-width: 36rem; margin: 0 auto 3rem;">These proven strategies work especially well for investors and business owners in ${city}, ${state}</p>
                
                <div style="display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));">
                    ${relevantStrategies.map((strategy, index) => `
                    <a href="/tax-strategies/${strategy.slug}.html" style="background: white; border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 1.5rem; text-decoration: none; transition: all 0.2s; display: block;" onmouseover="this.style.borderColor='#10b981';this.style.boxShadow='0 4px 12px rgba(16, 185, 129, 0.15)'" onmouseout="this.style.borderColor='#e5e7eb';this.style.boxShadow='none'">
                        <div style="display: inline-block; font-size: 0.625rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; padding: 0.25rem 0.5rem; border-radius: 9999px; background: #d1fae5; color: #065f46; margin-bottom: 0.75rem;">Strategy ${index + 1}</div>
                        <h3 style="font-size: 1.125rem; font-weight: 600; color: #111827; margin-bottom: 0.5rem;">${strategy.title}</h3>
                        <p style="font-size: 0.875rem; color: #6b7280; line-height: 1.5;">Learn how ${strategy.title.toLowerCase()} can reduce your tax burden in ${city} and throughout ${state}.</p>
                    </a>
                    `).join('')}
                </div>
            </div>
        </section>

        <!-- State Considerations -->
        <section style="padding: 4rem 0; background: white;">
            <div class="container-custom">
                <h2 style="font-size: 1.875rem; font-weight: 700; color: #111827; margin-bottom: 2rem; text-align: center;">${state}-Specific Tax Considerations</h2>
                <div style="display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));">
                    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 1.5rem; border-left: 4px solid #10b981;">
                        <h3 style="font-weight: 600; color: #111827; margin-bottom: 0.75rem;">State Income Tax</h3>
                        <p style="color: #6b7280; font-size: 0.875rem; line-height: 1.6;">Understanding ${state}'s income tax structure is crucial for implementing effective tax strategies. Some strategies work better in high-tax states than others.</p>
                    </div>
                    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 1.5rem; border-left: 4px solid #10b981;">
                        <h3 style="font-weight: 600; color: #111827; margin-bottom: 0.75rem;">Property Tax Benefits</h3>
                        <p style="color: #6b7280; font-size: 0.875rem; line-height: 1.6;">${state} property tax laws can impact your real estate investment strategy. Learn about exemptions, appeals, and optimization opportunities.</p>
                    </div>
                    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 1.5rem; border-left: 4px solid #10b981;">
                        <h3 style="font-weight: 600; color: #111827; margin-bottom: 0.75rem;">Business Entity Selection</h3>
                        <p style="color: #6b7280; font-size: 0.875rem; line-height: 1.6;">The right business structure for ${state} can provide significant tax advantages. Consider LLCs, S-Corps, and other entities based on state law.</p>
                    </div>
                    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 1.5rem; border-left: 4px solid #10b981;">
                        <h3 style="font-weight: 600; color: #111827; margin-bottom: 0.75rem;">Local Incentives</h3>
                        <p style="color: #6b7280; font-size: 0.875rem; line-height: 1.6;">${city} and ${state} may offer specific tax incentives for real estate development, business formation, or investment in certain areas.</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- Related Cities -->
        <section style="padding: 4rem 0; background: #f9fafb;">
            <div class="container-custom">
                <h2 style="font-size: 1.5rem; font-weight: 700; color: #111827; margin-bottom: 1.5rem; text-align: center;">Other Cities in ${region}</h2>
                <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; justify-content: center;">
                    ${citiesData.cities
                      .filter(c => c.region === region && c.city !== city)
                      .map(c => `<a href="/programmatic-pages/cities/${c.city.toLowerCase().replace(/\s+/g, '-')}-${c.state.toLowerCase()}.html" style="padding: 0.5rem 1rem; background: white; border-radius: 9999px; text-decoration: none; color: #059669; font-size: 0.875rem; border: 1px solid #d1fae5;" onmouseover="this.style.background='#ecfdf5'" onmouseout="this.style.background='white'">${c.city}, ${c.state}</a>`)
                      .join('')}
                </div>
            </div>
        </section>

        <!-- CTA Section -->
        <section style="padding: 4rem 0; text-align: center;">
            <div class="container-custom">
                <div style="background: linear-gradient(135deg, #1f2937 0%, #111827 100%); border-radius: 1rem; padding: 3rem 2rem; color: white;">
                    <h2 style="font-size: 1.75rem; font-weight: 700; margin-bottom: 1rem;">Ready to Optimize Your Taxes in ${city}?</h2>
                    <p style="color: #d1d5db; margin-bottom: 1.5rem; max-width: 32rem; margin-left: auto; margin-right: auto;">Get personalized guidance and expert advice tailored to your specific situation in ${city}, ${state}.</p>
                    <a href="/programs.html" style="display: inline-flex; align-items-center: center; gap: 0.5rem; padding: 1rem 2rem; background: #10b981; color: white; font-weight: 600; border-radius: 0.5rem; text-decoration: none; transition: background 0.2s;" onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">Get Personalized Tax Guidance</a>
                </div>
            </div>
        </section>
    </main>

    ${getFooter()}
</body>
</html>`;

    fs.writeFileSync(path.join(outputDir, 'cities', `${slug}.html`), html);
    console.log(`✓ Created: cities/${slug}.html`);
  });
};

// Generate comparison pages
const generateComparisonPages = () => {
  const taxStrategies = getTaxStrategies();
  
  const comparisonPairs = [
    { slug: 'cost-segregation-vs-bonus-depreciation', title: 'Cost Segregation vs Bonus Depreciation', s1: 'cost-segregation', s2: 'bonus-depreciation' },
    { slug: '1031-exchange-vs-opportunity-zones', title: '1031 Exchange vs Opportunity Zones', s1: '1031-exchange', s2: 'opportunity-zones' },
    { slug: 'real-estate-professional-vs-str-loophole', title: 'Real Estate Professional vs STR Loophole', s1: 'real-estate-professional-status', s2: 'short-term-rental-loophole' },
    { slug: 's-corp-vs-qbi-deduction', title: 'S-Corp vs QBI Deduction', s1: 's-corp-strategy', s2: 'qualified-business-income-deduction' },
    { slug: 'donor-advised-fund-vs-charitable-trust', title: 'Donor-Advised Fund vs Charitable Trust', s1: 'donor-advised-fund', s2: 'charitable-remainder-trust' },
  ];
  
  console.log(`\nGenerating ${comparisonPairs.length} comparison pages...`);
  
  comparisonPairs.forEach(comp => {
    const strategy1 = taxStrategies.find(s => s.slug === comp.s1) || { slug: comp.s1, title: comp.s1.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') };
    const strategy2 = taxStrategies.find(s => s.slug === comp.s2) || { slug: comp.s2, title: comp.s2.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') };
    
    const description = `Compare ${strategy1.title} vs ${strategy2.title}. Learn which tax strategy is right for your situation with detailed pros, cons, and recommendations.`;
    
    const html = `<!DOCTYPE html>
<html lang="en">
${getHead(comp.title, description, `${comp.slug}.html`, 'comparisons')}
<body class="bg-white text-gray-900">
    ${getHeader()}

    <main id="main" class="pt-16">
        <!-- Hero Section -->
        <section style="padding: 6rem 0 4rem; background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); text-align: center;">
            <div class="container-custom">
                <h1 style="font-size: 2.5rem; font-weight: 700; color: #111827; margin-bottom: 1rem;">${comp.title}</h1>
                <p style="font-size: 1.25rem; color: #4b5563; max-width: 40rem; margin: 0 auto;">${description}</p>
            </div>
        </section>

        <!-- Comparison Table -->
        <section style="padding: 4rem 0; background: white;">
            <div class="container-custom">
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #059669; color: white;">
                                <th style="padding: 1rem; text-align: left; font-weight: 600;">Feature</th>
                                <th style="padding: 1rem; text-align: left; font-weight: 600;">${strategy1.title}</th>
                                <th style="padding: 1rem; text-align: left; font-weight: 600;">${strategy2.title}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 1rem; font-weight: 600;">Best For</td>
                                <td style="padding: 1rem; color: #4b5563;">Real estate investors with depreciable property</td>
                                <td style="padding: 1rem; color: #4b5563;">Business owners seeking immediate deductions</td>
                            </tr>
                            <tr style="background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 1rem; font-weight: 600;">Tax Benefit</td>
                                <td style="padding: 1rem; color: #4b5563;">Accelerated depreciation over 5-15 years</td>
                                <td style="padding: 1rem; color: #4b5563;">Immediate expensing in year of purchase</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 1rem; font-weight: 600;">Cost</td>
                                <td style="padding: 1rem; color: #4b5563;">$5,000 - $15,000 for professional study</td>
                                <td style="padding: 1rem; color: #4b5563;">$0 - $500 documentation</td>
                            </tr>
                            <tr style="background: #f9fafb;">
                                <td style="padding: 1rem; font-weight: 600;">Complexity</td>
                                <td style="padding: 1rem; color: #4b5563;">High - requires engineering study</td>
                                <td style="padding: 1rem; color: #4b5563;">Medium - proper documentation needed</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </section>

        <!-- Strategy 1 Details -->
        <section style="padding: 4rem 0; background: #f9fafb;">
            <div class="container-custom">
                <div style="max-width: 48rem; margin: 0 auto;">
                    <h2 style="font-size: 1.875rem; font-weight: 700; color: #111827; margin-bottom: 1.5rem;">When to Choose ${strategy1.title}</h2>
                    <ul style="list-style: none; padding: 0; margin-bottom: 2rem;">
                        <li style="padding: 0.5rem 0; padding-left: 1.5rem; position: relative; color: #4b5563;"><span style="position: absolute; left: 0; color: #10b981; font-weight: bold;">✓</span> You own commercial or residential rental property</li>
                        <li style="padding: 0.5rem 0; padding-left: 1.5rem; position: relative; color: #4b5563;"><span style="position: absolute; left: 0; color: #10b981; font-weight: bold;">✓</span> You want long-term depreciation benefits</li>
                        <li style="padding: 0.5rem 0; padding-left: 1.5rem; position: relative; color: #4b5563;"><span style="position: absolute; left: 0; color: #10b981; font-weight: bold;">✓</span> You have high taxable income to offset</li>
                    </ul>
                    <a href="/tax-strategies/${strategy1.slug}.html" style="display: inline-block; padding: 0.75rem 1.5rem; background: transparent; color: #059669; border: 2px solid #059669; text-decoration: none; border-radius: 0.5rem; font-weight: 600;" onmouseover="this.style.background='#059669';this.style.color='white'" onmouseout="this.style.background='transparent';this.style.color='#059669'">Learn More About ${strategy1.title}</a>
                </div>
            </div>
        </section>

        <!-- Strategy 2 Details -->
        <section style="padding: 4rem 0; background: white;">
            <div class="container-custom">
                <div style="max-width: 48rem; margin: 0 auto;">
                    <h2 style="font-size: 1.875rem; font-weight: 700; color: #111827; margin-bottom: 1.5rem;">When to Choose ${strategy2.title}</h2>
                    <ul style="list-style: none; padding: 0; margin-bottom: 2rem;">
                        <li style="padding: 0.5rem 0; padding-left: 1.5rem; position: relative; color: #4b5563;"><span style="position: absolute; left: 0; color: #10b981; font-weight: bold;">✓</span> You need immediate tax relief this year</li>
                        <li style="padding: 0.5rem 0; padding-left: 1.5rem; position: relative; color: #4b5563;"><span style="position: absolute; left: 0; color: #10b981; font-weight: bold;">✓</span> You want simpler implementation</li>
                        <li style="padding: 0.5rem 0; padding-left: 1.5rem; position: relative; color: #4b5563;"><span style="position: absolute; left: 0; color: #10b981; font-weight: bold;">✓</span> You have qualifying property purchases</li>
                    </ul>
                    <a href="/tax-strategies/${strategy2.slug}.html" style="display: inline-block; padding: 0.75rem 1.5rem; background: transparent; color: #059669; border: 2px solid #059669; text-decoration: none; border-radius: 0.5rem; font-weight: 600;" onmouseover="this.style.background='#059669';this.style.color='white'" onmouseout="this.style.background='transparent';this.style.color='#059669'">Learn More About ${strategy2.title}</a>
                </div>
            </div>
        </section>

        <!-- CTA -->
        <section style="padding: 4rem 0; text-align: center;">
            <div class="container-custom">
                <div style="background: linear-gradient(135deg, #1f2937 0%, #111827 100%); border-radius: 1rem; padding: 3rem 2rem; color: white;">
                    <h2 style="font-size: 1.75rem; font-weight: 700; margin-bottom: 1rem;">Still Not Sure Which is Right for You?</h2>
                    <p style="color: #d1d5db; margin-bottom: 1.5rem;">Get personalized advice from tax experts who can analyze your specific situation.</p>
                    <a href="/programs.html" style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 1rem 2rem; background: #10b981; color: white; font-weight: 600; border-radius: 0.5rem; text-decoration: none;" onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">Get Expert Guidance</a>
                </div>
            </div>
        </section>
    </main>

    ${getFooter()}
</body>
</html>`;

    fs.writeFileSync(path.join(outputDir, 'comparisons', `${comp.slug}.html`), html);
    console.log(`✓ Created: comparisons/${comp.slug}.html`);
  });
};

// Generate persona pages
const generatePersonaPages = () => {
  const taxStrategies = getTaxStrategies();
  
  const personas = [
    { slug: 'real-estate-investors', title: 'Real Estate Investors', desc: 'Property owners and real estate professionals seeking to maximize deductions.', strategies: ['cost-segregation', 'real-estate-professional-status', 'short-term-rental-loophole', '1031-exchange', 'bonus-depreciation'] },
    { slug: 'small-business-owners', title: 'Small Business Owners', desc: 'Entrepreneurs looking to optimize tax structure and maximize deductions.', strategies: ['s-corp-strategy', 'qualified-business-income-deduction', 'home-office-deduction', 'business-vehicle-deduction', 'section-179'] },
    { slug: 'high-income-earners', title: 'High Income Earners', desc: 'Professionals with W-2 income over $200K seeking advanced tax strategies.', strategies: ['backdoor-roth-ira', 'donor-advised-fund', 'bunching-deductions', 'health-savings-account-strategy', 'charitable-remainder-trust'] },
    { slug: 'self-employed', title: 'Self-Employed Professionals', desc: 'Freelancers and contractors optimizing taxes for 1099 income.', strategies: ['solo-401k', 'qualified-business-income-deduction', 'health-savings-account-strategy', 'home-office-deduction', 's-corp-strategy'] },
    { slug: 'retirement-savers', title: 'Retirement Savers', desc: 'Individuals focused on maximizing retirement contributions.', strategies: ['backdoor-roth-ira', 'solo-401k', 'sep-ira', 'health-savings-account-strategy', 'mega-backdoor-roth'] },
    { slug: 'airbnb-hosts', title: 'Airbnb & Short-Term Rental Hosts', desc: 'STR operators maximizing tax benefits.', strategies: ['short-term-rental-loophole', 'bonus-depreciation', 'cost-segregation', 'real-estate-professional-status', 'home-office-deduction'] },
  ];
  
  console.log(`\nGenerating ${personas.length} persona pages...`);
  
  personas.forEach(persona => {
    const relevantStrategies = persona.strategies
      .map(slug => taxStrategies.find(s => s.slug === slug))
      .filter(Boolean)
      .slice(0, 6);
    
    const html = `<!DOCTYPE html>
<html lang="en">
${getHead(`Tax Strategies for ${persona.title}`, persona.desc, `${persona.slug}.html`, 'personas')}
<body class="bg-white text-gray-900">
    ${getHeader()}

    <main id="main" class="pt-16">
        <!-- Hero Section -->
        <section style="padding: 6rem 0 4rem; background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); text-align: center;">
            <div class="container-custom">
                <h1 style="font-size: 2.5rem; font-weight: 700; color: #111827; margin-bottom: 1rem;">Tax Strategies for ${persona.title}</h1>
                <p style="font-size: 1.25rem; color: #4b5563; max-width: 40rem; margin: 0 auto;">${persona.desc}</p>
            </div>
        </section>

        <!-- Strategies Grid -->
        <section style="padding: 4rem 0; background: #f9fafb;">
            <div class="container-custom">
                <h2 style="font-size: 1.875rem; font-weight: 700; color: #111827; margin-bottom: 1rem; text-align: center;">Top Strategies for ${persona.title}</h2>
                <p style="color: #6b7280; text-align: center; max-width: 36rem; margin: 0 auto 3rem;">These strategies are specifically chosen for ${persona.title.toLowerCase()}</p>
                
                <div style="display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));">
                    ${relevantStrategies.map((strategy, index) => `
                    <a href="/tax-strategies/${strategy.slug}.html" style="background: white; border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 1.5rem; text-decoration: none; transition: all 0.2s; display: block;" onmouseover="this.style.borderColor='#10b981';this.style.boxShadow='0 4px 12px rgba(16, 185, 129, 0.15)'" onmouseout="this.style.borderColor='#e5e7eb';this.style.boxShadow='none'">
                        <div style="display: inline-block; font-size: 0.625rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; padding: 0.25rem 0.5rem; border-radius: 9999px; background: #d1fae5; color: #065f46; margin-bottom: 0.75rem;">Top ${index + 1}</div>
                        <h3 style="font-size: 1.125rem; font-weight: 600; color: #111827; margin-bottom: 0.5rem;">${strategy.title}</h3>
                        <p style="font-size: 0.875rem; color: #6b7280; line-height: 1.5;">Essential strategy for ${persona.title.toLowerCase()} to minimize tax burden.</p>
                    </a>
                    `).join('')}
                </div>
            </div>
        </section>

        <!-- CTA -->
        <section style="padding: 4rem 0; text-align: center;">
            <div class="container-custom">
                <div style="background: linear-gradient(135deg, #1f2937 0%, #111827 100%); border-radius: 1rem; padding: 3rem 2rem; color: white;">
                    <h2 style="font-size: 1.75rem; font-weight: 700; margin-bottom: 1rem;">Get Expert Tax Guidance</h2>
                    <p style="color: #d1d5db; margin-bottom: 1.5rem;">Every ${persona.title.toLowerCase()} situation is unique. Get personalized strategies tailored to you.</p>
                    <a href="/programs.html" style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 1rem 2rem; background: #10b981; color: white; font-weight: 600; border-radius: 0.5rem; text-decoration: none;" onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">Start Optimizing Your Taxes</a>
                </div>
            </div>
        </section>
    </main>

    ${getFooter()}
</body>
</html>`;

    fs.writeFileSync(path.join(outputDir, 'personas', `${persona.slug}.html`), html);
    console.log(`✓ Created: personas/${persona.slug}.html`);
  });
};

// Generate index page
const generateIndexPage = () => {
  const cities = citiesData.cities;
  
  const html = `<!DOCTYPE html>
<html lang="en">
${getHead('Tax Strategy Resources', 'Browse all location-specific, comparison, and persona-based tax strategy pages.', 'index.html', '')}
<body class="bg-white text-gray-900">
    ${getHeader()}

    <main id="main" class="pt-16">
        <section style="padding: 6rem 0 4rem; background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); text-align: center;">
            <div class="container-custom">
                <h1 style="font-size: 2.5rem; font-weight: 700; color: #111827; margin-bottom: 1rem;">Tax Strategy Resources</h1>
                <p style="font-size: 1.25rem; color: #4b5563; max-width: 40rem; margin: 0 auto;">Browse all location-specific, comparison, and persona-based tax strategy pages</p>
            </div>
        </section>

        <section style="padding: 4rem 0; background: white;">
            <div class="container-custom">
                <h2 style="font-size: 1.875rem; font-weight: 700; color: #111827; margin-bottom: 2rem;">City-Specific Tax Guides</h2>
                <div style="display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));">
                    ${cities.map(c => `<a href="/programmatic-pages/cities/${c.city.toLowerCase().replace(/\s+/g, '-')}-${c.state.toLowerCase()}.html" style="padding: 1rem; background: #f9fafb; border-radius: 0.5rem; text-decoration: none; color: #059669; text-align: center;" onmouseover="this.style.background='#ecfdf5'" onmouseout="this.style.background='#f9fafb'">${c.city}, ${c.state}</a>`).join('')}
                </div>
            </div>
        </section>
    </main>

    ${getFooter()}
</body>
</html>`;

  fs.writeFileSync(path.join(outputDir, 'index.html'), html);
  console.log(`\n✓ Created: index.html`);
};

// Main execution
console.log('🔧 FIXING Programmatic SEO Pages\n');

generateCityPages();
generateComparisonPages();
generatePersonaPages();
generateIndexPage();

console.log('\n✅ All pages regenerated with proper styling!');
console.log('\nTotal pages created:');
console.log(`- ${citiesData.cities.length} city pages`);
console.log(`- 5 comparison pages`);
console.log(`- 6 persona pages`);
console.log(`- 1 index page`);
