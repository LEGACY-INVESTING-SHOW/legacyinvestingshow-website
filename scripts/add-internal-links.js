#!/usr/bin/env node
/**
 * Phase 5: Add Internal Links to Tax Strategy Pages
 * Adds contextual internal links within body content
 */

const fs = require('fs');
const path = require('path');

// Define internal linking opportunities
// Format: [searchTerm, linkText, targetPage, priority]
const internalLinks = [
  // Core strategies
  ['1031 exchange', '1031 exchange', '/tax-strategies/1031-exchange', 'high'],
  ['1031 Exchange', '1031 Exchange', '/tax-strategies/1031-exchange', 'high'],
  ['cost segregation', 'cost segregation study', '/tax-strategies/cost-segregation', 'high'],
  ['Cost Segregation', 'Cost Segregation', '/tax-strategies/cost-segregation', 'high'],
  ['bonus depreciation', 'bonus depreciation', '/tax-strategies/bonus-depreciation', 'high'],
  ['Bonus Depreciation', 'Bonus Depreciation', '/tax-strategies/bonus-depreciation', 'high'],
  ['short-term rental loophole', 'short-term rental loophole', '/tax-strategies/short-term-rental-loophole', 'high'],
  ['Short-Term Rental Loophole', 'Short-Term Rental Loophole', '/tax-strategies/short-term-rental-loophole', 'high'],
  ['real estate professional status', 'real estate professional status', '/tax-strategies/real-estate-professional-status', 'high'],
  ['Real Estate Professional Status', 'Real Estate Professional Status', '/tax-strategies/real-estate-professional-status', 'high'],
  ['opportunity zones', 'Opportunity Zones', '/tax-strategies/opportunity-zones', 'high'],
  ['Opportunity Zones', 'Opportunity Zones', '/tax-strategies/opportunity-zones', 'high'],
  
  // Retirement accounts
  ['solo 401k', 'Solo 401k', '/tax-strategies/solo-401k', 'medium'],
  ['Solo 401k', 'Solo 401k', '/tax-strategies/solo-401k', 'medium'],
  ['self-directed IRA', 'Self-Directed IRA', '/tax-strategies/self-directed-ira', 'medium'],
  ['SEP IRA', 'SEP IRA', '/retirement/sep-ira-guide.html', 'medium'],
  ['Roth conversion', 'Roth conversion ladder', '/tax-strategies/roth-conversion-ladder', 'medium'],
  
  // Other strategies
  ['depreciation', 'rental property depreciation', '/tax-strategies/rental-property-depreciation', 'medium'],
  ['Augusta Rule', 'Augusta Rule', '/tax-strategies/augusta-rule', 'medium'],
  ['HSA', 'Health Savings Account strategy', '/tax-strategies/hsa-strategy', 'medium'],
  ['S-Corp', 'S-Corporation strategy', '/tax-strategies/s-corp-strategy', 'medium'],
];

// Pages to process (priority order)
const pagesToProcess = [
  'cost-segregation.html',
  'short-term-rental-loophole.html',
  '1031-exchange.html',
  'real-estate-professional-status.html',
  'bonus-depreciation.html',
  'opportunity-zones.html',
  'solo-401k.html',
  's-corp-strategy.html',
  'augusta-rule.html',
  'hsa-strategy.html',
];

const taxStrategiesDir = path.join(__dirname, '..', 'tax-strategies');

function addInternalLinks(htmlContent, currentPage) {
  let modified = htmlContent;
  let linksAdded = 0;
  
  // Only process content within <article> or main content div
  // Find the content section - more flexible matching
  const contentMatch = htmlContent.match(/(<div class="prose-content">)([\s\S]*?)(<\/div>\s*<\/div>\s*<\/section>)/);
  if (!contentMatch) {
    console.log(`  Could not find content section in ${currentPage}`);
    return { modified, linksAdded };
  }
  
  let contentSection = contentMatch[2];
  const originalContent = contentSection;
  
  // Track which links we've already added to avoid duplicates
  const addedLinks = new Set();
  
  // Process each internal link opportunity
  for (const [searchTerm, linkText, targetPage, priority] of internalLinks) {
    // Skip if linking to self
    if (targetPage.includes(currentPage)) continue;
    
    // Skip if already added this link
    if (addedLinks.has(targetPage)) continue;
    
    // Create regex to find the term (not already in a link)
    // Look for term that's not inside >...<
    const regex = new RegExp(`(?<![\\w-])${searchTerm}(?![\\w-])(?![^<]*<\\/a>)`, 'i');
    
    // Only add 2-3 links per page to avoid over-optimization
    if (linksAdded >= 3) break;
    
    if (regex.test(contentSection)) {
      // Replace first occurrence with link
      const linkHtml = `<a href="${targetPage}" class="internal-link">${linkText}</a>`;
      contentSection = contentSection.replace(regex, linkHtml);
      addedLinks.add(targetPage);
      linksAdded++;
      console.log(`  Added link: "${linkText}" → ${targetPage}`);
    }
  }
  
  // Replace content in original HTML
  if (linksAdded > 0) {
    modified = htmlContent.replace(originalContent, contentSection);
  }
  
  return { modified, linksAdded };
}

function processPage(filename) {
  const filePath = path.join(taxStrategiesDir, filename);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filename}`);
    return 0;
  }
  
  console.log(`\nProcessing: ${filename}`);
  
  const html = fs.readFileSync(filePath, 'utf8');
  const { modified, linksAdded } = addInternalLinks(html, filename);
  
  if (linksAdded > 0) {
    fs.writeFileSync(filePath, modified);
    console.log(`✅ Added ${linksAdded} internal links`);
  } else {
    console.log(`ℹ️ No suitable link opportunities found`);
  }
  
  return linksAdded;
}

// Main execution
console.log('Phase 5: Internal Linking Enhancement');
console.log('=====================================\n');

let totalLinks = 0;

for (const page of pagesToProcess) {
  totalLinks += processPage(page);
}

console.log('\n=====================================');
console.log(`Total internal links added: ${totalLinks}`);
console.log('Done!');
