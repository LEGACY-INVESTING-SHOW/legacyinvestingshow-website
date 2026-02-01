#!/usr/bin/env node

/**
 * Programmatic SEO Page Generator
 * 
 * Generates deep, comprehensive SEO pages using the programmatic-seo skill.
 * Uses Claude Haiku 4.5 for cost-effective content generation.
 * 
 * Usage:
 *   node scripts/generate-seo-pages.js [options]
 * 
 * Options:
 *   --topics <file>     JSON file with topics (default: data/seo-topics-100.json)
 *   --output <dir>      Output directory (default: based on category_path)
 *   --limit <n>         Generate only first n pages
 *   --category <name>   Generate only specific category
 *   --dry-run           Show what would be generated without creating files
 *   --model <model>     Model to use (default: haiku)
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

// Configuration
const CONFIG = {
  topicsFile: process.argv.includes('--topics') 
    ? process.argv[process.argv.indexOf('--topics') + 1]
    : 'data/seo-topics-100.json',
  outputBase: process.cwd(),
  limit: process.argv.includes('--limit')
    ? parseInt(process.argv[process.argv.indexOf('--limit') + 1])
    : null,
  category: process.argv.includes('--category')
    ? process.argv[process.argv.indexOf('--category') + 1]
    : null,
  dryRun: process.argv.includes('--dry-run'),
  model: process.argv.includes('--model')
    ? process.argv[process.argv.indexOf('--model') + 1]
    : 'haiku'
};

// Model mapping
const MODELS = {
  'haiku': 'claude-3-5-haiku-latest',
  'sonnet': 'claude-sonnet-4-5',
  'opus': 'claude-opus-4-5'
};

async function loadTopics() {
  const topicsPath = path.join(CONFIG.outputBase, CONFIG.topicsFile);
  const data = JSON.parse(fs.readFileSync(topicsPath, 'utf-8'));
  
  let allTopics = [];
  
  for (const [categoryKey, category] of Object.entries(data.categories)) {
    if (CONFIG.category && categoryKey !== CONFIG.category) continue;
    
    for (const topic of category.topics) {
      allTopics.push({
        ...topic,
        categoryKey,
        categoryDescription: category.description
      });
    }
  }
  
  if (CONFIG.limit) {
    allTopics = allTopics.slice(0, CONFIG.limit);
  }
  
  return allTopics;
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function generatePage(topic) {
  const outputDir = path.join(CONFIG.outputBase, topic.category_path);
  const outputFile = path.join(outputDir, `${topic.slug}.html`);
  
  console.log(`\n📝 Generating: ${topic.title}`);
  console.log(`   Category: ${topic.category_path}`);
  console.log(`   Slug: ${topic.slug}`);
  console.log(`   Output: ${outputFile}`);
  
  if (CONFIG.dryRun) {
    console.log(`   [DRY RUN] Would generate page`);
    return { success: true, dryRun: true };
  }
  
  ensureDir(outputDir);
  
  // Read the skill template
  const skillPath = path.join(CONFIG.outputBase, '.claude/skills/programmatic-seo/SKILL.md');
  const skillContent = fs.readFileSync(skillPath, 'utf-8');
  
  // Build the prompt
  const prompt = `
You are generating a comprehensive, SEO-optimized page for "${topic.title}".

Follow the programmatic-seo skill guidelines to create a page that is:
- 3,000-5,000 words
- Deep and comprehensive (not thin content)
- Structured with proper H2/H3 headings
- Optimized for the keyword: "${topic.primary_keyword}"
- Includes all required sections (definition, who benefits, step-by-step, calculations, strategies, mistakes, FAQ, etc.)

Category: ${topic.category_path}
URL Slug: ${topic.slug}

Generate the complete HTML page following the template structure from the skill.
Include:
- Full meta tags and schema markup
- Table of contents
- All 12 content sections
- 10-15 FAQ questions
- Internal links to related pages

Output ONLY the complete HTML code, no explanations.
`;

  try {
    // Use Claude CLI with specified model
    const modelId = MODELS[CONFIG.model] || CONFIG.model;
    const result = execSync(
      `claude --model ${modelId} --print "${prompt.replace(/"/g, '\\"')}"`,
      {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
        timeout: 300000 // 5 minute timeout
      }
    );
    
    let html = result.toString();
    
    // Extract HTML if wrapped in code blocks
    const htmlMatch = html.match(/```html\n([\s\S]*?)```/);
    if (htmlMatch) {
      html = htmlMatch[1];
    }
    
    // Write the file
    fs.writeFileSync(outputFile, html);
    
    // Get word count
    const textContent = html.replace(/<[^>]*>/g, '');
    const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length;
    
    console.log(`   ✅ Generated: ${wordCount} words`);
    
    return { success: true, wordCount, outputFile };
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Programmatic SEO Page Generator');
  console.log('================================');
  console.log(`Topics file: ${CONFIG.topicsFile}`);
  console.log(`Model: ${CONFIG.model} (${MODELS[CONFIG.model] || CONFIG.model})`);
  console.log(`Dry run: ${CONFIG.dryRun}`);
  console.log(`Limit: ${CONFIG.limit || 'none'}`);
  console.log(`Category: ${CONFIG.category || 'all'}`);
  
  const topics = await loadTopics();
  console.log(`\nFound ${topics.length} topics to generate\n`);
  
  const results = {
    total: topics.length,
    success: 0,
    failed: 0,
    skipped: 0,
    totalWords: 0
  };
  
  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    console.log(`\n[${i + 1}/${topics.length}] Processing...`);
    
    // Check if file already exists
    const outputFile = path.join(CONFIG.outputBase, topic.category_path, `${topic.slug}.html`);
    if (fs.existsSync(outputFile) && !process.argv.includes('--overwrite')) {
      console.log(`   ⏭️ Skipping (already exists): ${topic.slug}`);
      results.skipped++;
      continue;
    }
    
    const result = await generatePage(topic);
    
    if (result.success) {
      results.success++;
      if (result.wordCount) {
        results.totalWords += result.wordCount;
      }
    } else {
      results.failed++;
    }
    
    // Small delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n================================');
  console.log('📊 Generation Complete');
  console.log(`   Total: ${results.total}`);
  console.log(`   Success: ${results.success}`);
  console.log(`   Failed: ${results.failed}`);
  console.log(`   Skipped: ${results.skipped}`);
  console.log(`   Total words: ${results.totalWords.toLocaleString()}`);
  console.log('================================\n');
}

main().catch(console.error);
