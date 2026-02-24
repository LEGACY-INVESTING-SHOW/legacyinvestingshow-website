#!/usr/bin/env node

/**
 * Programmatic SEO Page Generator
 * Generates city pages, comparison pages, and persona pages
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

// Get all tax strategy files (excluding index.html and for/ subdirectory)
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

// City-specific content templates
const cityContentTemplates = {
  intro: (city, state) => `${city}, ${state} offers unique opportunities for real estate investors and business owners to minimize their tax burden. With specific state tax laws, local regulations, and market conditions, implementing the right tax strategies can save you thousands annually.`,
  
  stateConsiderations: (state) => `When implementing tax strategies in ${state}, it's important to consider state-specific regulations, local tax incentives, and how federal strategies interact with state tax laws.`,
  
  cta: () => `Ready to implement these tax strategies? Join the Legacy Investing Show community to get personalized guidance and expert advice tailored to your specific situation.`,
  
  localFactors: (city, state, region) => `${city}'s position in the ${region} region creates specific opportunities for tax optimization. Local market conditions, property values, and business environment all play a role in strategy selection.`
};

// Generate city pages
const generateCityPages = () => {
  const taxStrategies = getTaxStrategies();
  const cities = citiesData.cities;
  
  console.log(`Generating ${cities.length} city pages...`);
  
  cities.forEach(cityData => {
    const { city, state, region, notes } = cityData;
    const slug = `${city.toLowerCase().replace(/\s+/g, '-')}-${state.toLowerCase()}`;
    
    const relevantStrategies = taxStrategies.slice(0, 12); // Top 12 strategies
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tax Strategies in ${city}, ${state} | Legacy Investing Show</title>
    <meta name="description" content="Discover the best tax strategies for ${city}, ${state} residents. Learn how to minimize taxes on real estate, business income, and investments with location-specific advice.">
    <meta name="keywords" content="tax strategies ${city} ${state}, ${city} tax planning, ${state} tax optimization, real estate tax ${city}">
    <link rel="canonical" href="https://www.legacyinvestingshow.com/programmatic-pages/cities/${slug}">
    
    <!-- Open Graph -->
    <meta property="og:title" content="Tax Strategies in ${city}, ${state}">
    <meta property="og:description" content="Maximize your tax savings in ${city} with proven strategies for real estate investors and business owners.">
    <meta property="og:type" content="article">
    <meta property="og:url" content="https://www.legacyinvestingshow.com/programmatic-pages/cities/${slug}">
    
    <link rel="stylesheet" href="/assets/css/styles.css">
    
    <!-- Schema Markup -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Tax Strategies in ${city}, ${state}: Complete Guide",
        "description": "Comprehensive tax strategy guide for ${city}, ${state} residents and investors",
        "author": {"@type": "Person", "name": "Preston Seo"},
        "publisher": {"@type": "Organization", "name": "Legacy Investing Show"},
        "datePublished": "${new Date().toISOString().split('T')[0]}"
    }
    </script>
</head>
<body>
    <!-- Navigation -->
    <nav class="nav">
        <div class="nav-container">
            <a href="/" class="logo">Legacy Investing Show</a>
            <div class="nav-links">
                <a href="/tax-strategies">Tax Strategies</a>
                <a href="/about">About</a>
                <a href="/blog">Blog</a>
                <a href="/blog/" class="btn-primary">Get Started</a>
            </div>
        </div>
    </nav>

    <main>
        <!-- Hero Section -->
        <section class="hero">
            <div class="container">
                <h1>Tax Strategies in <span class="highlight">${city}, ${state}</span></h1>
                <p class="hero-subtitle">${cityContentTemplates.intro(city, state)}</p>
            </div>
        </section>

        <!-- Why ${city} Section -->
        <section class="content-section">
            <div class="container">
                <h2>Why ${city} Investors Need Specialized Tax Strategies</h2>
                <p>${cityContentTemplates.localFactors(city, state, region)}</p>
                <p>${notes}</p>
            </div>
        </section>

        <!-- Top Strategies for ${city} -->
        <section class="content-section bg-light">
            <div class="container">
                <h2>Top Tax Strategies for ${city} Residents</h2>
                <p>${cityContentTemplates.stateConsiderations(state)}</p>
                
                <div class="strategy-grid">
                    ${relevantStrategies.map((strategy, index) => `
                    <article class="strategy-card">
                        <div class="strategy-number">${String(index + 1).padStart(2, '0')}</div>
                        <h3><a href="/tax-strategies/${strategy.slug}">${strategy.title}</a></h3>
                        <p>Learn how ${strategy.title.toLowerCase()} can reduce your tax burden in ${city} and throughout ${state}.</p>
                        <a href="/tax-strategies/${strategy.slug}" class="strategy-link">Read More →</a>
                    </article>
                    `).join('')}
                </div>
            </div>
        </section>

        <!-- State-Specific Considerations -->
        <section class="content-section">
            <div class="container">
                <h2>${state}-Specific Tax Considerations</h2>
                <div class="considerations-grid">
                    <div class="consideration-card">
                        <h3>State Income Tax</h3>
                        <p>Understanding ${state}'s income tax structure is crucial for implementing effective tax strategies. Some strategies work better in high-tax states than others.</p>
                    </div>
                    <div class="consideration-card">
                        <h3>Property Tax Benefits</h3>
                        <p>${state} property tax laws can impact your real estate investment strategy. Learn about exemptions, appeals, and optimization opportunities.</p>
                    </div>
                    <div class="consideration-card">
                        <h3>Business Entity Selection</h3>
                        <p>The right business structure for ${state} can provide significant tax advantages. Consider LLCs, S-Corps, and other entities based on state law.</p>
                    </div>
                    <div class="consideration-card">
                        <h3>Local Incentives</h3>
                        <p>${city} and ${state} may offer specific tax incentives for real estate development, business formation, or investment in certain areas.</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- Related Cities -->
        <section class="content-section bg-light">
            <div class="container">
                <h2>Other Cities in ${region}</h2>
                <div class="related-cities">
                    ${citiesData.cities
                      .filter(c => c.region === region && c.city !== city)
                      .slice(0, 4)
                      .map(c => `<a href="/programmatic-pages/cities/${c.city.toLowerCase().replace(/\s+/g, '-')}-${c.state.toLowerCase()}" class="city-link">${c.city}, ${c.state}</a>`)
                      .join(' • ')}
                </div>
            </div>
        </section>

        <!-- CTA Section -->
        <section class="cta-section">
            <div class="container">
                <h2>Ready to Optimize Your Taxes in ${city}?</h2>
                <p>${cityContentTemplates.cta()}</p>
                <a href="/blog/" class="btn-primary btn-large">Get Personalized Tax Guidance</a>
            </div>
        </section>
    </main>

    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <p>&copy; ${new Date().getFullYear()} Legacy Investing Show. All rights reserved.</p>
            <p>Educational content only. Consult a tax professional for personalized advice.</p>
        </div>
    </footer>

    <style>
        .highlight { color: #d4af37; }
        .content-section { padding: 4rem 0; }
        .bg-light { background: #f8f9fa; }
        .strategy-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; margin-top: 2rem; }
        .strategy-card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .strategy-number { font-size: 2rem; font-weight: bold; color: #d4af37; margin-bottom: 0.5rem; }
        .strategy-link { color: #1a7a5e; text-decoration: none; font-weight: 600; }
        .strategy-link:hover { text-decoration: underline; }
        .considerations-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-top: 2rem; }
        .consideration-card { background: white; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #d4af37; }
        .related-cities { margin-top: 1.5rem; }
        .city-link { color: #1a7a5e; text-decoration: none; font-weight: 500; }
        .city-link:hover { text-decoration: underline; }
        .cta-section { background: #0f4c3a; color: white; padding: 4rem 0; text-align: center; }
        .btn-large { padding: 1rem 2rem; font-size: 1.2rem; margin-top: 1rem; display: inline-block; }
    </style>
</body>
</html>`;

    fs.writeFileSync(path.join(outputDir, 'cities', `${slug}.html`), html);
    console.log(`✓ Created: cities/${slug}.html`);
  });
};

// Generate comparison pages
const generateComparisonPages = () => {
  const taxStrategies = getTaxStrategies();
  const comparisons = [];
  
  // Create strategic comparisons
  const comparisonPairs = [
    ['cost-segregation', 'bonus-depreciation', 'Cost Segregation vs Bonus Depreciation'],
    ['1031-exchange', 'opportunity-zones', '1031 Exchange vs Opportunity Zones'],
    ['traditional-vs-roth-401k', 'backdoor-roth-ira', '401(k) vs Roth IRA: Which is Better?'],
    ['sep-ira', 'solo-401k', 'SEP IRA vs Solo 401(k) for Self-Employed'],
    ['real-estate-professional-status', 'short-term-rental-loophole', 'Real Estate Professional vs STR Loophole'],
    ['s-corp-strategy', 'qualified-business-income-deduction', 'S-Corp vs QBI Deduction'],
    ['donor-advised-fund', 'charitable-remainder-trust', 'Donor-Advised Fund vs Charitable Trust'],
    ['hsa-strategy', 'health-savings-account-strategy', 'HSA vs FSA: Healthcare Tax Strategies'],
  ];
  
  console.log(`\nGenerating ${comparisonPairs.length} comparison pages...`);
  
  comparisonPairs.forEach(([slug1, slug2, title]) => {
    const strategy1 = taxStrategies.find(s => s.slug === slug1);
    const strategy2 = taxStrategies.find(s => s.slug === slug2);
    
    if (!strategy1 || !strategy2) {
      console.log(`⚠ Skipping comparison: ${title} (one or both strategies not found)`);
      return;
    }
    
    const slug = `${slug1}-vs-${slug2}`;
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} | Legacy Investing Show</title>
    <meta name="description" content="Compare ${strategy1.title} vs ${strategy2.title}. Learn which tax strategy is right for your situation with detailed pros, cons, and recommendations.">
    <meta name="keywords" content="${strategy1.title.toLowerCase()} vs ${strategy2.title.toLowerCase()}, compare tax strategies, which is better">
    <link rel="canonical" href="https://www.legacyinvestingshow.com/programmatic-pages/comparisons/${slug}">
    
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="Side-by-side comparison of ${strategy1.title} and ${strategy2.title}">
    
    <link rel="stylesheet" href="/assets/css/styles.css">
    
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "${title}: Complete Comparison",
        "author": {"@type": "Person", "name": "Preston Seo"},
        "publisher": {"@type": "Organization", "name": "Legacy Investing Show"},
        "datePublished": "${new Date().toISOString().split('T')[0]}"
    }
    </script>
</head>
<body>
    <nav class="nav">
        <div class="nav-container">
            <a href="/" class="logo">Legacy Investing Show</a>
            <div class="nav-links">
                <a href="/tax-strategies">Tax Strategies</a>
                <a href="/about">About</a>
                <a href="/blog">Blog</a>
                <a href="/blog/" class="btn-primary">Get Started</a>
            </div>
        </div>
    </nav>

    <main>
        <section class="hero">
            <div class="container">
                <h1>${title}</h1>
                <p class="hero-subtitle">Detailed comparison to help you choose the right tax strategy for your situation</p>
            </div>
        </section>

        <section class="content-section">
            <div class="container">
                <div class="comparison-table-wrapper">
                    <table class="comparison-table">
                        <thead>
                            <tr>
                                <th>Feature</th>
                                <th><a href="/tax-strategies/${strategy1.slug}">${strategy1.title}</a></th>
                                <th><a href="/tax-strategies/${strategy2.slug}">${strategy2.title}</a></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>Best For</strong></td>
                                <td>Real estate investors with depreciable property</td>
                                <td>Business owners seeking immediate deductions</td>
                            </tr>
                            <tr>
                                <td><strong>Tax Benefit Type</strong></td>
                                <td>Accelerated depreciation</td>
                                <td>Immediate expense deduction</td>
                            </tr>
                            <tr>
                                <td><strong>Implementation Cost</strong></td>
                                <td>$5,000 - $15,000</td>
                                <td>$0 - $500 (documentation)</td>
                            </tr>
                            <tr>
                                <td><strong>Timeline</strong></td>
                                <td>5-15 year depreciation schedule</td>
                                <td>Immediate (year of purchase)</td>
                            </tr>
                            <tr>
                                <td><strong>Complexity</strong></td>
                                <td>High - requires professional study</td>
                                <td>Medium - requires proper documentation</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </section>

        <section class="content-section bg-light">
            <div class="container">
                <h2>When to Choose ${strategy1.title}</h2>
                <ul class="feature-list">
                    <li>You own commercial or residential rental property</li>
                    <li>You want long-term depreciation benefits</li>
                    <li>You have high taxable income to offset</li>
                    <li>You're planning to hold property for multiple years</li>
                </ul>
                <a href="/tax-strategies/${strategy1.slug}" class="btn-secondary">Learn More About ${strategy1.title}</a>
            </div>
        </section>

        <section class="content-section">
            <div class="container">
                <h2>When to Choose ${strategy2.title}</h2>
                <ul class="feature-list">
                    <li>You have business equipment or property purchases</li>
                    <li>You need immediate tax relief this year</li>
                    <li>You want simpler implementation</li>
                    <li>You have Section 179 qualifying property</li>
                </ul>
                <a href="/tax-strategies/${strategy2.slug}" class="btn-secondary">Learn More About ${strategy2.title}</a>
            </div>
        </section>

        <section class="cta-section">
            <div class="container">
                <h2>Still Not Sure Which Strategy is Right for You?</h2>
                <p>Get personalized advice from tax experts who can analyze your specific situation.</p>
                <a href="/blog/" class="btn-primary btn-large">Get Expert Guidance</a>
            </div>
        </section>
    </main>

    <footer class="footer">
        <div class="container">
            <p>&copy; ${new Date().getFullYear()} Legacy Investing Show. All rights reserved.</p>
        </div>
    </footer>

    <style>
        .comparison-table-wrapper { overflow-x: auto; margin-top: 2rem; }
        .comparison-table { width: 100%; border-collapse: collapse; }
        .comparison-table th { background: #0f4c3a; color: white; padding: 1rem; text-align: left; }
        .comparison-table td { padding: 1rem; border-bottom: 1px solid #ddd; }
        .comparison-table tr:nth-child(even) { background: #f8f9fa; }
        .comparison-table a { color: #1a7a5e; text-decoration: none; }
        .feature-list { list-style: none; padding: 0; }
        .feature-list li { padding: 0.5rem 0; padding-left: 1.5rem; position: relative; }
        .feature-list li::before { content: "✓"; position: absolute; left: 0; color: #1a7a5e; font-weight: bold; }
        .btn-secondary { display: inline-block; margin-top: 1rem; padding: 0.75rem 1.5rem; background: transparent; color: #1a7a5e; border: 2px solid #1a7a5e; text-decoration: none; border-radius: 4px; }
        .btn-secondary:hover { background: #1a7a5e; color: white; }
    </style>
</body>
</html>`;

    fs.writeFileSync(path.join(outputDir, 'comparisons', `${slug}.html`), html);
    console.log(`✓ Created: comparisons/${slug}.html`);
  });
};

// Generate persona pages
const generatePersonaPages = () => {
  const taxStrategies = getTaxStrategies();
  
  const personas = [
    {
      slug: 'real-estate-investors',
      title: 'Real Estate Investors',
      description: 'Property owners and real estate professionals seeking to maximize deductions and minimize tax liability on rental income.',
      topStrategies: ['cost-segregation', 'real-estate-professional-status', 'short-term-rental-loophole', '1031-exchange', 'bonus-depreciation'],
      painPoints: ['High taxable income from rentals', 'Depreciation recapture concerns', 'Passive activity loss limitations', 'Capital gains on property sales']
    },
    {
      slug: 'small-business-owners',
      title: 'Small Business Owners',
      description: 'Entrepreneurs and business owners looking to optimize their tax structure and maximize legitimate deductions.',
      topStrategies: ['s-corp-strategy', 'qualified-business-income-deduction', 'home-office-deduction', 'business-vehicle-deduction', 'section-179'],
      painPoints: ['Self-employment tax burden', 'Quarterly estimated payments', 'Business structure optimization', 'Employee vs contractor classification']
    },
    {
      slug: 'high-income-earners',
      title: 'High Income Earners',
      description: 'Professionals and executives with W-2 income over $200K seeking advanced tax reduction strategies.',
      topStrategies: ['backdoor-roth-ira', 'mega-backdoor-roth', 'donor-advised-fund', 'bunching-deductions', 'health-savings-account-strategy'],
      painPoints: ['High marginal tax rates', 'Phase-out of deductions', 'Alternative minimum tax', 'Investment income taxation']
    },
    {
      slug: 'self-employed',
      title: 'Self-Employed Professionals',
      description: 'Freelancers, consultants, and independent contractors optimizing taxes for 1099 income.',
      topStrategies: ['solo-401k', 'sep-ira', 'qualified-business-income-deduction', 'health-savings-account-strategy', 'home-office-deduction'],
      painPoints: ['15.3% self-employment tax', 'No employer benefits', 'Income volatility', 'Retirement planning responsibility']
    },
    {
      slug: 'retirement-savers',
      title: 'Retirement Savers',
      description: 'Individuals focused on maximizing retirement account contributions and tax-advantaged growth.',
      topStrategies: ['traditional-vs-roth-401k', 'backdoor-roth-ira', 'mega-backdoor-roth', 'sep-ira', 'solo-401k'],
      painPoints: ['Contribution limit optimization', 'Roth vs Traditional decisions', 'RMD planning', 'Tax bracket management']
    },
    {
      slug: 'airbnb-hosts',
      title: 'Airbnb & Short-Term Rental Hosts',
      description: 'Short-term rental operators maximizing tax benefits while staying compliant with STR regulations.',
      topStrategies: ['short-term-rental-loophole', 'bonus-depreciation', 'cost-segregation', 'real-estate-professional-status', 'home-office-deduction'],
      painPoints: ['Active vs passive income classification', 'Material participation requirements', 'Local STR regulations', 'Furnishing depreciation']
    }
  ];
  
  console.log(`\nGenerating ${personas.length} persona pages...`);
  
  personas.forEach(persona => {
    const relevantStrategies = persona.topStrategies
      .map(slug => taxStrategies.find(s => s.slug === slug))
      .filter(Boolean);
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tax Strategies for ${persona.title} | Legacy Investing Show</title>
    <meta name="description" content="${persona.description} Discover the best tax strategies specifically for ${persona.title.toLowerCase()}.">
    <meta name="keywords" content="tax strategies ${persona.slug.replace(/-/g, ' ')}, ${persona.title.toLowerCase()} tax tips, tax deductions ${persona.slug.replace(/-/g, ' ')}">
    <link rel="canonical" href="https://www.legacyinvestingshow.com/programmatic-pages/personas/${persona.slug}">
    
    <meta property="og:title" content="Tax Strategies for ${persona.title}">
    <meta property="og:description" content="${persona.description}">
    
    <link rel="stylesheet" href="/assets/css/styles.css">
    
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Tax Strategies for ${persona.title}: Complete Guide",
        "author": {"@type": "Person", "name": "Preston Seo"},
        "publisher": {"@type": "Organization", "name": "Legacy Investing Show"},
        "datePublished": "${new Date().toISOString().split('T')[0]}"
    }
    </script>
</head>
<body>
    <nav class="nav">
        <div class="nav-container">
            <a href="/" class="logo">Legacy Investing Show</a>
            <div class="nav-links">
                <a href="/tax-strategies">Tax Strategies</a>
                <a href="/about">About</a>
                <a href="/blog">Blog</a>
                <a href="/blog/" class="btn-primary">Get Started</a>
            </div>
        </div>
    </nav>

    <main>
        <section class="hero">
            <div class="container">
                <h1>Tax Strategies for <span class="highlight">${persona.title}</span></h1>
                <p class="hero-subtitle">${persona.description}</p>
            </div>
        </section>

        <section class="content-section">
            <div class="container">
                <h2>Common Tax Challenges for ${persona.title}</h2>
                <div class="pain-points">
                    ${persona.painPoints.map(point => `
                    <div class="pain-point">
                        <span class="icon">⚠</span>
                        <p>${point}</p>
                    </div>
                    `).join('')}
                </div>
            </div>
        </section>

        <section class="content-section bg-light">
            <div class="container">
                <h2>Top Tax Strategies for ${persona.title}</h2>
                <div class="strategy-list">
                    ${relevantStrategies.map((strategy, index) => `
                    <article class="strategy-item">
                        <div class="strategy-rank">${index + 1}</div>
                        <div class="strategy-content">
                            <h3><a href="/tax-strategies/${strategy.slug}">${strategy.title}</a></h3>
                            <p>Essential strategy for ${persona.title.toLowerCase()} to minimize tax burden and maximize deductions.</p>
                            <a href="/tax-strategies/${strategy.slug}" class="learn-more">Learn Implementation →</a>
                        </div>
                    </article>
                    `).join('')}
                </div>
            </div>
        </section>

        <section class="content-section">
            <div class="container">
                <h2>How These Strategies Work Together</h2>
                <p>Combining multiple tax strategies creates a comprehensive tax reduction plan. For ${persona.title.toLowerCase()}, the key is implementing strategies that address your specific income sources and business structure.</p>
                
                <div class="integration-grid">
                    <div class="integration-card">
                        <h3>Immediate Impact</h3>
                        <p>Strategies you can implement today for this tax year</p>
                    </div>
                    <div class="integration-card">
                        <h3>Long-term Benefits</h3>
                        <p>Strategies that provide ongoing tax savings year after year</p>
                    </div>
                    <div class="integration-card">
                        <h3>Compliance Focus</h3>
                        <p>Stay compliant while maximizing every legitimate deduction</p>
                    </div>
                </div>
            </div>
        </section>

        <section class="content-section bg-light">
            <div class="container">
                <h2>Related Resources</h2>
                <div class="resource-links">
                    <a href="/tax-strategies" class="resource-card">All Tax Strategies →</a>
                    <a href="/blog" class="resource-card">Success Stories →</a>
                    <a href="/blog/" class="resource-card">Get Personalized Help →</a>
                </div>
            </div>
        </section>

        <section class="cta-section">
            <div class="container">
                <h2>Get Expert Tax Guidance for Your Situation</h2>
                <p>Every ${persona.title.toLowerCase()} situation is unique. Get personalized strategies tailored to your specific circumstances.</p>
                <a href="/blog/" class="btn-primary btn-large">Start Optimizing Your Taxes</a>
            </div>
        </section>
    </main>

    <footer class="footer">
        <div class="container">
            <p>&copy; ${new Date().getFullYear()} Legacy Investing Show. All rights reserved.</p>
        </div>
    </footer>

    <style>
        .highlight { color: #d4af37; }
        .pain-points { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-top: 2rem; }
        .pain-point { display: flex; align-items: flex-start; gap: 1rem; background: #fff3cd; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #ffc107; }
        .pain-point .icon { font-size: 1.5rem; }
        .strategy-list { margin-top: 2rem; }
        .strategy-item { display: flex; gap: 1.5rem; padding: 1.5rem; background: white; margin-bottom: 1rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .strategy-rank { font-size: 2rem; font-weight: bold; color: #d4af37; min-width: 50px; }
        .strategy-content { flex: 1; }
        .strategy-content h3 { margin-bottom: 0.5rem; }
        .strategy-content h3 a { color: #0f4c3a; text-decoration: none; }
        .strategy-content h3 a:hover { text-decoration: underline; }
        .learn-more { color: #1a7a5e; text-decoration: none; font-weight: 600; }
        .integration-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-top: 2rem; }
        .integration-card { background: white; padding: 1.5rem; border-radius: 8px; border-top: 4px solid #d4af37; }
        .resource-links { display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 2rem; }
        .resource-card { padding: 1rem 2rem; background: white; border: 2px solid #1a7a5e; color: #1a7a5e; text-decoration: none; border-radius: 4px; font-weight: 600; }
        .resource-card:hover { background: #1a7a5e; color: white; }
    </style>
</body>
</html>`;

    fs.writeFileSync(path.join(outputDir, 'personas', `${persona.slug}.html`), html);
    console.log(`✓ Created: personas/${persona.slug}.html`);
  });
};

// Generate index page for all programmatic pages
const generateIndexPage = () => {
  const cities = citiesData.cities;
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Programmatic SEO Pages | Legacy Investing Show</title>
    <meta name="description" content="Browse all location-specific, comparison, and persona-based tax strategy pages.">
    <link rel="stylesheet" href="/assets/css/styles.css">
</head>
<body>
    <nav class="nav">
        <div class="nav-container">
            <a href="/" class="logo">Legacy Investing Show</a>
            <div class="nav-links">
                <a href="/tax-strategies">Tax Strategies</a>
                <a href="/about">About</a>
                <a href="/blog">Blog</a>
            </div>
        </div>
    </nav>

    <main class="container" style="padding: 4rem 0;">
        <h1>Tax Strategy Resources</h1>
        
        <section style="margin: 3rem 0;">
            <h2>City-Specific Tax Guides</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem;">
                ${cities.map(c => `
                <a href="/programmatic-pages/cities/${c.city.toLowerCase().replace(/\s+/g, '-')}-${c.state.toLowerCase()}.html" 
                   style="padding: 1rem; background: #f8f9fa; border-radius: 4px; text-decoration: none; color: #1a7a5e;">
                    ${c.city}, ${c.state}
                </a>
                `).join('')}
            </div>
        </section>

        <section style="margin: 3rem 0;">
            <h2>Tax Strategy Comparisons</h2>
            <p>Side-by-side comparisons of popular tax strategies</p>
            <a href="/programmatic-pages/comparisons/" style="color: #1a7a5e;">Browse all comparisons →</a>
        </section>

        <section style="margin: 3rem 0;">
            <h2>Tax Strategies by Persona</h2>
            <p>Curated strategies for your specific situation</p>
            <a href="/programmatic-pages/personas/" style="color: #1a7a5e;">Browse by persona →</a>
        </section>
    </main>

    <footer class="footer">
        <div class="container">
            <p>&copy; ${new Date().getFullYear()} Legacy Investing Show</p>
        </div>
    </footer>
</body>
</html>`;

  fs.writeFileSync(path.join(outputDir, 'index.html'), html);
  console.log(`\n✓ Created: index.html (programmatic pages directory)`);
};

// Main execution
console.log('🚀 Starting Programmatic SEO Page Generation\n');

generateCityPages();
generateComparisonPages();
generatePersonaPages();
generateIndexPage();

console.log('\n✅ All programmatic SEO pages generated successfully!');
console.log(`\nSummary:
- ${citiesData.cities.length} city pages
- 8 comparison pages  
- 6 persona pages
- 1 index page
\nLocation: ${outputDir}/`);
