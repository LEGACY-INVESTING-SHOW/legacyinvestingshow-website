#!/usr/bin/env node
/**
 * Phase 4: User Experience Enhancement Script
 * Adds breadcrumbs and related content sections to all pages
 */

const fs = require('fs');
const path = require('path');

// Configuration
const WEBSITE_DIR = '/home/clawd/legacyinvestingshow-website';

// Breadcrumb templates for different page types
const breadcrumbTemplates = {
  main: (pageName) => `
    <!-- Breadcrumb Navigation -->
    <nav aria-label="Breadcrumb" class="container-custom pt-24 pb-4">
        <ol class="breadcrumb" itemscope itemtype="https://schema.org/BreadcrumbList">
            <li class="breadcrumb__item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                <a href="/" class="breadcrumb__link" itemprop="item"><span itemprop="name">Home</span></a>
                <meta itemprop="position" content="1" />
            </li>
            <li class="breadcrumb__item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                <span class="breadcrumb__current" itemprop="name">${pageName}</span>
                <meta itemprop="position" content="2" />
            </li>
        </ol>
    </nav>`,

  taxStrategy: (strategyName) => `
    <!-- Breadcrumb Navigation -->
    <nav aria-label="Breadcrumb" class="container-custom pt-24 pb-4">
        <ol class="breadcrumb" itemscope itemtype="https://schema.org/BreadcrumbList">
            <li class="breadcrumb__item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                <a href="/" class="breadcrumb__link" itemprop="item"><span itemprop="name">Home</span></a>
                <meta itemprop="position" content="1" />
            </li>
            <li class="breadcrumb__item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                <a href="/tax-strategies/" class="breadcrumb__link" itemprop="item"><span itemprop="name">Tax Strategies</span></a>
                <meta itemprop="position" content="2" />
            </li>
            <li class="breadcrumb__item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                <span class="breadcrumb__current" itemprop="name">${strategyName}</span>
                <meta itemprop="position" content="3" />
            </li>
        </ol>
    </nav>`,

  retirement: (pageName) => `
    <!-- Breadcrumb Navigation -->
    <nav aria-label="Breadcrumb" class="container-custom pt-24 pb-4">
        <ol class="breadcrumb" itemscope itemtype="https://schema.org/BreadcrumbList">
            <li class="breadcrumb__item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                <a href="/" class="breadcrumb__link" itemprop="item"><span itemprop="name">Home</span></a>
                <meta itemprop="position" content="1" />
            </li>
            <li class="breadcrumb__item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                <a href="/retirement/" class="breadcrumb__link" itemprop="item"><span itemprop="name">Retirement</span></a>
                <meta itemprop="position" content="2" />
            </li>
            <li class="breadcrumb__item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                <span class="breadcrumb__current" itemprop="name">${pageName}</span>
                <meta itemprop="position" content="3" />
            </li>
        </ol>
    </nav>`,

  blog: (postTitle) => `
    <!-- Breadcrumb Navigation -->
    <nav aria-label="Breadcrumb" class="container-custom pt-24 pb-4">
        <ol class="breadcrumb" itemscope itemtype="https://schema.org/BreadcrumbList">
            <li class="breadcrumb__item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                <a href="/" class="breadcrumb__link" itemprop="item"><span itemprop="name">Home</span></a>
                <meta itemprop="position" content="1" />
            </li>
            <li class="breadcrumb__item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                <a href="/blog/" class="breadcrumb__link" itemprop="item"><span itemprop="name">Blog</span></a>
                <meta itemprop="position" content="2" />
            </li>
            <li class="breadcrumb__item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                <span class="breadcrumb__current" itemprop="name">${postTitle}</span>
                <meta itemprop="position" content="3" />
            </li>
        </ol>
    </nav>`,

  persona: (personaName) => `
    <!-- Breadcrumb Navigation -->
    <nav aria-label="Breadcrumb" class="container-custom pt-24 pb-4">
        <ol class="breadcrumb" itemscope itemtype="https://schema.org/BreadcrumbList">
            <li class="breadcrumb__item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                <a href="/" class="breadcrumb__link" itemprop="item"><span itemprop="name">Home</span></a>
                <meta itemprop="position" content="1" />
            </li>
            <li class="breadcrumb__item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                <a href="/tax-strategies/" class="breadcrumb__link" itemprop="item"><span itemprop="name">Tax Strategies</span></a>
                <meta itemprop="position" content="2" />
            </li>
            <li class="breadcrumb__item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                <span class="breadcrumb__current" itemprop="name">For ${personaName}</span>
                <meta itemprop="position" content="3" />
            </li>
        </ol>
    </nav>`,

  topic: (topicName) => `
    <!-- Breadcrumb Navigation -->
    <nav aria-label="Breadcrumb" class="container-custom pt-24 pb-4">
        <ol class="breadcrumb" itemscope itemtype="https://schema.org/BreadcrumbList">
            <li class="breadcrumb__item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                <a href="/" class="breadcrumb__link" itemprop="item"><span itemprop="name">Home</span></a>
                <meta itemprop="position" content="1" />
            </li>
            <li class="breadcrumb__item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                <span class="breadcrumb__current" itemprop="name">${topicName}</span>
                <meta itemprop="position" content="2" />
            </li>
        </ol>
    </nav>`,

  index: (sectionName, sectionUrl) => `
    <!-- Breadcrumb Navigation -->
    <nav aria-label="Breadcrumb" class="container-custom pt-24 pb-4">
        <ol class="breadcrumb" itemscope itemtype="https://schema.org/BreadcrumbList">
            <li class="breadcrumb__item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                <a href="/" class="breadcrumb__link" itemprop="item"><span itemprop="name">Home</span></a>
                <meta itemprop="position" content="1" />
            </li>
            <li class="breadcrumb__item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                <span class="breadcrumb__current" itemprop="name">${sectionName}</span>
                <meta itemprop="position" content="2" />
            </li>
        </ol>
    </nav>`
};

// Schema templates
const schemaTemplates = {
  breadcrumbList: (items) => {
    const itemListElement = items.map((item, index) => {
      const base = {
        "@type": "ListItem",
        "position": index + 1,
        "name": item.name
      };
      if (item.url) base.item = item.url;
      return base;
    });
    
    return `
    <!-- BreadcrumbList Schema -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": ${JSON.stringify(itemListElement, null, 8)}
    }
    </script>`;
  }
};

// Related content templates
const relatedContentTemplates = {
  taxStrategy: (relatedStrategies) => `
    <!-- Related Strategies Section -->
    <section class="section bg-gray-50">
        <div class="container-custom">
            <h2 class="text-2xl font-bold text-gray-900 mb-8">Related Tax Strategies</h2>
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${relatedStrategies.map(s => `
                <a href="${s.url}" class="card p-6 hover:shadow-lg transition-all">
                    <h3 class="font-semibold text-gray-900 mb-2">${s.title}</h3>
                    <p class="text-sm text-gray-600">${s.description}</p>
                </a>
                `).join('')}
            </div>
            <div class="mt-8 text-center">
                <a href="/tax-strategies/" class="btn-secondary">← Back to All Tax Strategies</a>
            </div>
        </div>
    </section>`,

  retirement: (relatedGuides) => `
    <!-- Related Retirement Guides Section -->
    <section class="section bg-gray-50">
        <div class="container-custom">
            <h2 class="text-2xl font-bold text-gray-900 mb-8">Related Retirement Guides</h2>
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${relatedGuides.map(g => `
                <a href="${g.url}" class="card p-6 hover:shadow-lg transition-all">
                    <h3 class="font-semibold text-gray-900 mb-2">${g.title}</h3>
                    <p class="text-sm text-gray-600">${g.description}</p>
                </a>
                `).join('')}
            </div>
            <div class="mt-8 text-center">
                <a href="/topics/retirement.html" class="btn-secondary">← Back to Retirement Topic</a>
            </div>
        </div>
    </section>`,

  blog: (relatedPosts) => `
    <!-- Related Posts Section -->
    <section class="related-posts">
        <h2 class="related-posts-title">You Might Also Like</h2>
        <div class="related-posts-grid">
            ${relatedPosts.map(p => `
            <a href="${p.url}" class="related-post-item">
                <div class="related-post-image">
                    <img src="${p.image}" alt="${p.title}" loading="lazy">
                </div>
                <h3 class="related-post-title">${p.title}</h3>
                <div class="related-post-meta">${p.date}</div>
            </a>
            `).join('')}
        </div>
    </section>`,

  topic: (relatedStrategies) => `
    <!-- Related Strategies Section -->
    <section class="section bg-gray-50">
        <div class="container-custom">
            <h2 class="text-2xl font-bold text-gray-900 mb-8">Related Strategies</h2>
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${relatedStrategies.map(s => `
                <a href="${s.url}" class="card p-6 hover:shadow-lg transition-all">
                    <h3 class="font-semibold text-gray-900 mb-2">${s.title}</h3>
                    <p class="text-sm text-gray-600">${s.description}</p>
                </a>
                `).join('')}
            </div>
        </div>
    </section>`
};

// Strategy data for related content
const taxStrategies = [
  { title: "Cost Segregation", url: "/tax-strategies/cost-segregation.html", description: "Accelerate depreciation deductions on rental properties" },
  { title: "Bonus Depreciation", url: "/tax-strategies/bonus-depreciation.html", description: "Take immediate deductions on qualified property" },
  { title: "1031 Exchange", url: "/tax-strategies/1031-exchange.html", description: "Defer capital gains when selling investment property" },
  { title: "Solo 401(k)", url: "/tax-strategies/solo-401k.html", description: "Maximize retirement contributions for self-employed" },
  { title: "HSA Strategy", url: "/tax-strategies/hsa-strategy.html", description: "Triple tax advantage health savings account" },
  { title: "Backdoor Roth IRA", url: "/tax-strategies/backdoor-roth-ira.html", description: "Tax-free growth for high-income earners" }
];

const retirementGuides = [
  { title: "SEP IRA Guide", url: "/retirement/sep-ira-guide.html", description: "Complete guide for self-employed retirement savings" },
  { title: "401(k) Strategies", url: "/retirement/401k-contribution-strategies.html", description: "Maximize your 401(k) contributions" },
  { title: "Traditional vs Roth 401(k)", url: "/retirement/traditional-vs-roth-401k.html", description: "Choose the right option for your situation" },
  { title: "Defined Benefit Plan", url: "/retirement/defined-benefit-plan.html", description: "High-contribution retirement for business owners" },
  { title: "SIMPLE IRA Guide", url: "/retirement/simple-ira-guide.html", description: "Retirement savings for small businesses" }
];

// Helper functions
function getPageTitle(content) {
  const match = content.match(/<title>([^<]+)<\/title>/);
  return match ? match[1].replace(' | Legacy Investing Show', '').trim() : '';
}

function hasBreadcrumbSchema(content) {
  return content.includes('BreadcrumbList');
}

function hasVisibleBreadcrumbs(content) {
  return content.includes('class="breadcrumb"') || content.includes("class='breadcrumb'");
}

function insertAfterHeader(content, breadcrumbHtml) {
  // Try to find the header closing tag and insert after it
  const patterns = [
    /(<\/header>)(?!.*<\/header>)/s,
    /(<header[^>]*>.*?<\/header>)(?!.*<\/header>)/s,
    /(<main[^>]*>)/,
    /(<body[^>]*>)/
  ];
  
  for (const pattern of patterns) {
    if (pattern.test(content)) {
      return content.replace(pattern, `$1\n${breadcrumbHtml}`);
    }
  }
  return content;
}

function insertBeforeClosingMain(content, relatedContentHtml) {
  // Insert before closing main tag or closing body
  const patterns = [
    /(<\/main>)(?!.*<\/main>)/s,
    /(<\/body>)/
  ];
  
  for (const pattern of patterns) {
    if (pattern.test(content)) {
      return content.replace(pattern, `${relatedContentHtml}\n$1`);
    }
  }
  return content;
}

function insertSchemaBeforeClosingHead(content, schemaHtml) {
  const pattern = /(<\/head>)/;
  return content.replace(pattern, `${schemaHtml}\n$1`);
}

// Get random items from array
function getRandomItems(arr, count) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Process a single file
function processFile(filePath, type, options = {}) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Skip templates
  if (filePath.includes('/templates/')) return { modified: false };
  
  const title = getPageTitle(content);
  
  // Add breadcrumb schema if missing
  if (!hasBreadcrumbSchema(content) && options.schema) {
    const schema = schemaTemplates.breadcrumbList(options.schema);
    content = insertSchemaBeforeClosingHead(content, schema);
    modified = true;
  }
  
  // Add visible breadcrumbs if missing
  if (!hasVisibleBreadcrumbs(content) && options.breadcrumb) {
    const breadcrumbHtml = options.breadcrumb;
    content = insertAfterHeader(content, breadcrumbHtml);
    modified = true;
  }
  
  // Add related content if specified and not already present
  if (options.relatedContent && !content.includes('Related')) {
    content = insertBeforeClosingMain(content, options.relatedContent);
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    return { modified: true, title };
  }
  
  return { modified: false };
}

// Main processing function
function processAllPages() {
  const results = {
    modified: [],
    skipped: []
  };
  
  // Process main pages
  const mainPages = [
    { file: 'about.html', name: 'About' },
    { file: 'programs.html', name: 'Programs' },
    { file: 'success-stories.html', name: 'Success Stories' }
  ];
  
  for (const page of mainPages) {
    const filePath = path.join(WEBSITE_DIR, page.file);
    if (fs.existsSync(filePath)) {
      const result = processFile(filePath, 'main', {
        schema: [
          { name: 'Home', url: 'https://legacyinvestingshow.com/' },
          { name: page.name }
        ],
        breadcrumb: breadcrumbTemplates.main(page.name)
      });
      if (result.modified) results.modified.push(page.file);
      else results.skipped.push(page.file);
    }
  }
  
  // Process tax strategies
  const taxStrategyFiles = fs.readdirSync(path.join(WEBSITE_DIR, 'tax-strategies'))
    .filter(f => f.endsWith('.html') && !f.includes('index') && !f.startsWith('for/'));
  
  for (const file of taxStrategyFiles) {
    const filePath = path.join(WEBSITE_DIR, 'tax-strategies', file);
    const content = fs.readFileSync(filePath, 'utf8');
    const title = getPageTitle(content) || file.replace('.html', '').replace(/-/g, ' ');
    const strategyName = title.split(':')[0].trim();
    
    const related = getRandomItems(taxStrategies.filter(s => !file.includes(s.url)), 3);
    
    const result = processFile(filePath, 'taxStrategy', {
      schema: [
        { name: 'Home', url: 'https://legacyinvestingshow.com/' },
        { name: 'Tax Strategies', url: 'https://legacyinvestingshow.com/tax-strategies/' },
        { name: strategyName }
      ],
      breadcrumb: breadcrumbTemplates.taxStrategy(strategyName),
      relatedContent: relatedContentTemplates.taxStrategy(related)
    });
    if (result.modified) results.modified.push(`tax-strategies/${file}`);
  }
  
  // Process tax strategy index
  const taxIndexPath = path.join(WEBSITE_DIR, 'tax-strategies', 'index.html');
  if (fs.existsSync(taxIndexPath)) {
    const result = processFile(taxIndexPath, 'index', {
      schema: [
        { name: 'Home', url: 'https://legacyinvestingshow.com/' },
        { name: 'Tax Strategies' }
      ],
      breadcrumb: breadcrumbTemplates.index('Tax Strategies', '/tax-strategies/')
    });
    if (result.modified) results.modified.push('tax-strategies/index.html');
  }
  
  // Process persona pages
  const personaFiles = fs.readdirSync(path.join(WEBSITE_DIR, 'tax-strategies', 'for'))
    .filter(f => f.endsWith('.html'));
  
  const personaNames = {
    'self-employed.html': 'Self-Employed',
    'airbnb-hosts.html': 'Airbnb Hosts',
    'business-owners.html': 'Business Owners',
    'high-income-earners.html': 'High Income Earners',
    'w2-employees.html': 'W-2 Employees',
    'real-estate-investors.html': 'Real Estate Investors'
  };
  
  for (const file of personaFiles) {
    const filePath = path.join(WEBSITE_DIR, 'tax-strategies', 'for', file);
    const personaName = personaNames[file] || file.replace('.html', '').replace(/-/g, ' ');
    const related = getRandomItems(taxStrategies, 3);
    
    const result = processFile(filePath, 'persona', {
      schema: [
        { name: 'Home', url: 'https://legacyinvestingshow.com/' },
        { name: 'Tax Strategies', url: 'https://legacyinvestingshow.com/tax-strategies/' },
        { name: personaName }
      ],
      breadcrumb: breadcrumbTemplates.persona(personaName),
      relatedContent: relatedContentTemplates.taxStrategy(related)
    });
    if (result.modified) results.modified.push(`tax-strategies/for/${file}`);
  }
  
  // Process retirement pages
  const retirementFiles = fs.readdirSync(path.join(WEBSITE_DIR, 'retirement'))
    .filter(f => f.endsWith('.html'));
  
  for (const file of retirementFiles) {
    const filePath = path.join(WEBSITE_DIR, 'retirement', file);
    const content = fs.readFileSync(filePath, 'utf8');
    const title = getPageTitle(content) || file.replace('.html', '').replace(/-/g, ' ');
    const pageName = title.split(':')[0].trim();
    
    const related = getRandomItems(retirementGuides.filter(g => !file.includes(g.url)), 3);
    
    const result = processFile(filePath, 'retirement', {
      schema: [
        { name: 'Home', url: 'https://legacyinvestingshow.com/' },
        { name: 'Retirement', url: 'https://legacyinvestingshow.com/retirement/' },
        { name: pageName }
      ],
      breadcrumb: breadcrumbTemplates.retirement(pageName),
      relatedContent: relatedContentTemplates.retirement(related)
    });
    if (result.modified) results.modified.push(`retirement/${file}`);
  }
  
  // Process topic pages
  const topicFiles = fs.readdirSync(path.join(WEBSITE_DIR, 'topics'))
    .filter(f => f.endsWith('.html'));
  
  for (const file of topicFiles) {
    const filePath = path.join(WEBSITE_DIR, 'topics', file);
    const content = fs.readFileSync(filePath, 'utf8');
    const title = getPageTitle(content) || file.replace('.html', '').replace(/-/g, ' ');
    const topicName = title.split('|')[0].trim();
    
    const related = getRandomItems(taxStrategies, 3);
    
    const result = processFile(filePath, 'topic', {
      schema: [
        { name: 'Home', url: 'https://legacyinvestingshow.com/' },
        { name: topicName }
      ],
      breadcrumb: breadcrumbTemplates.topic(topicName),
      relatedContent: relatedContentTemplates.topic(related)
    });
    if (result.modified) results.modified.push(`topics/${file}`);
  }
  
  // Process blog index
  const blogIndexPath = path.join(WEBSITE_DIR, 'blog', 'index.html');
  if (fs.existsSync(blogIndexPath)) {
    const result = processFile(blogIndexPath, 'index', {
      schema: [
        { name: 'Home', url: 'https://legacyinvestingshow.com/' },
        { name: 'Blog' }
      ],
      breadcrumb: breadcrumbTemplates.index('Blog', '/blog/')
    });
    if (result.modified) results.modified.push('blog/index.html');
  }
  
  return results;
}

// Run the script
console.log('Starting Phase 4: User Experience Enhancement...\n');
const results = processAllPages();

console.log('=== RESULTS ===');
console.log(`Modified ${results.modified.length} files:`);
results.modified.forEach(f => console.log(`  ✓ ${f}`));

if (results.skipped.length > 0) {
  console.log(`\nSkipped ${results.skipped.length} files (already have breadcrumbs):`);
  results.skipped.forEach(f => console.log(`  - ${f}`));
}

console.log('\nPhase 4 processing complete!');
