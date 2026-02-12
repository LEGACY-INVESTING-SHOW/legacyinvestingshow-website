#!/usr/bin/env node
/**
 * Migration Script: Convert HTML Blog Posts to Markdown + YAML
 * 
 * This script converts all HTML blog posts from the legacyinvestingshow website
 * to Markdown format with YAML frontmatter for the Eleventy CMS.
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// Paths
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SOURCE_DIR = path.join(REPO_ROOT, 'blog');
const TARGET_DIR = path.join(REPO_ROOT, 'cms', 'src', 'blog');

// Utility to parse dates
function parseDate(dateStr) {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    try {
        const date = new Date(dateStr);
        return date.toISOString().split('T')[0];
    } catch (e) {
        return new Date().toISOString().split('T')[0];
    }
}

// Extract category from keywords or infer from content
function extractCategory(keywords, title, content) {
    const keywordStr = (keywords || '').toLowerCase();
    const titleLower = (title || '').toLowerCase();
    const contentLower = (content || '').toLowerCase();
    
    if (keywordStr.includes('airbnb') || titleLower.includes('airbnb') || contentLower.includes('airbnb')) {
        return 'Airbnb Arbitrage';
    }
    if (keywordStr.includes('tax') || titleLower.includes('tax') || contentLower.includes('tax strategy')) {
        return 'Tax Strategies';
    }
    if (keywordStr.includes('how-to') || keywordStr.includes('guide') || titleLower.includes('how to') || titleLower.includes('guide')) {
        return 'How-To Guide';
    }
    if (keywordStr.includes('investing') || titleLower.includes('investing')) {
        return 'Investing';
    }
    if (keywordStr.includes('side hustle') || titleLower.includes('side hustle')) {
        return 'Side Hustles';
    }
    
    // Default to Airbnb Arbitrage for success stories
    if (contentLower.includes('student') || contentLower.includes('success story')) {
        return 'Airbnb Arbitrage';
    }
    
    return 'General';
}

// Extract stats from stat cards
function extractStats($) {
    const stats = [];
    $('.stat-card').each((i, elem) => {
        const value = $(elem).find('.stat-value').text().trim();
        const label = $(elem).find('.stat-label').text().trim();
        const context = $(elem).find('.stat-context').text().trim();
        const source = $(elem).find('.stat-source').text().trim();
        
        if (value && label) {
            stats.push({
                value,
                label,
                context: context || undefined,
                source: source || undefined
            });
        }
    });
    return stats;
}

// Extract FAQs from schema markup
function extractFAQs($) {
    const faqs = [];
    
    // Try to get from JSON-LD schema first
    const scriptTags = $('script[type="application/ld+json"]');
    scriptTags.each((i, elem) => {
        try {
            const data = JSON.parse($(elem).html());
            if (data['@type'] === 'FAQPage' && data.mainEntity) {
                data.mainEntity.forEach(qa => {
                    faqs.push({
                        question: qa.name,
                        answer: typeof qa.acceptedAnswer === 'object' ? qa.acceptedAnswer.text : qa.acceptedAnswer
                    });
                });
            }
        } catch (e) {
            // Ignore parse errors
        }
    });
    
    // Fallback: try to find FAQ section in HTML
    if (faqs.length === 0) {
        $('.faq-item, [class*="faq"]').each((i, elem) => {
            const question = $(elem).find('h3, .faq-question, [class*="question"]').first().text().trim();
            const answer = $(elem).find('p, .faq-answer, [class*="answer"]').first().text().trim();
            if (question && answer) {
                faqs.push({ question, answer });
            }
        });
    }
    
    return faqs;
}

// Convert HTML to Markdown
function htmlToMarkdown(html) {
    // Simple HTML to Markdown conversion
    let md = html;
    
    // Headers
    md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
    md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
    md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
    md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
    
    // Paragraphs
    md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
    
    // Bold and italic
    md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
    md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
    md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
    md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
    
    // Links
    md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
    
    // Lists
    md = md.replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, content) => {
        return content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n') + '\n';
    });
    md = md.replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
        let index = 1;
        return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => {
            return `${index++}. $1\n`;
        }) + '\n';
    });
    md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
    
    // Blockquotes
    md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, '> $1\n\n');
    
    // Line breaks
    md = md.replace(/<br\s*\/?>/gi, '\n');
    
    // Tables
    md = md.replace(/<table[^>]*>(.*?)<\/table>/gis, (match, content) => {
        let table = '';
        let inHeader = true;
        
        // Extract rows
        const rows = [];
        content.replace(/<tr[^>]*>(.*?)<\/tr>/gis, (m, rowContent) => {
            const cells = [];
            rowContent.replace(/<t[dh][^>]*>(.*?)<\/t[dh]>/gi, (m2, cell) => {
                cells.push(cell.trim());
            });
            if (cells.length > 0) rows.push(cells);
        });
        
        if (rows.length > 0) {
            // Header row
            table += '| ' + rows[0].join(' | ') + ' |\n';
            table += '|' + rows[0].map(() => ' --- ').join('|') + '|\n';
            
            // Data rows
            for (let i = 1; i < rows.length; i++) {
                table += '| ' + rows[i].join(' | ') + ' |\n';
            }
        }
        
        return '\n' + table + '\n';
    });
    
    // Remove remaining HTML tags
    md = md.replace(/<[^>]+>/g, '');
    
    // Clean up whitespace
    md = md.replace(/\n{3,}/g, '\n\n');
    md = md.trim();
    
    return md;
}

// Process a single HTML file
function processFile(filename) {
    const filepath = path.join(SOURCE_DIR, filename);
    const content = fs.readFileSync(filepath, 'utf-8');
    const $ = cheerio.load(content);
    
    // Extract metadata
    const title = $('title').text().replace(' | Legacy Investing Show', '').trim();
    const description = $('meta[name="description"]').attr('content') || '';
    const keywords = $('meta[name="keywords"]').attr('content') || '';
    const author = $('meta[name="author"]').attr('content') || 'Preston Seo';
    const datePublished = $('meta[property="article:published_time"]').attr('content');
    const ogImage = $('meta[property="og:image"]').attr('content') || '';
    const section = $('meta[property="article:section"]').attr('content');
    
    // Get image path relative to site root
    let image = ogImage.replace('https://legacyinvestingshow-website.vercel.app', '');
    if (!image) {
        // Try to find featured image
        const imgSrc = $('.minimal-featured-image img').attr('src');
        image = imgSrc || '';
    }
    
    // Extract category
    const category = section || extractCategory(keywords, title, content);
    
    // Extract article content
    const proseContent = $('.prose-minimal').html() || '';
    const markdownContent = htmlToMarkdown(proseContent);
    
    // Extract stats and FAQs
    const stats = extractStats($);
    const faqs = extractFAQs($);
    
    // Build YAML frontmatter
    const frontmatter = {
        title,
        description,
        date: parseDate(datePublished),
        author,
        category,
        image: image || undefined,
        keywords: keywords ? keywords.split(',').map(k => k.trim()) : undefined,
        stats: stats.length > 0 ? stats : undefined,
        faqs: faqs.length > 0 ? faqs : undefined
    };
    
    // Remove undefined values
    Object.keys(frontmatter).forEach(key => {
        if (frontmatter[key] === undefined) delete frontmatter[key];
    });
    
    // Generate YAML
    let yaml = '---\n';
    yaml += `title: "${frontmatter.title.replace(/"/g, '\\"')}"\n`;
    yaml += `description: "${frontmatter.description.replace(/"/g, '\\"')}"\n`;
    yaml += `date: "${frontmatter.date}"\n`;
    yaml += `author: "${frontmatter.author}"\n`;
    yaml += `category: "${frontmatter.category}"\n`;
    if (frontmatter.image) yaml += `image: "${frontmatter.image}"\n`;
    if (frontmatter.keywords) yaml += `keywords:\n${frontmatter.keywords.map(k => `  - "${k}"`).join('\n')}\n`;
    
    // Add stats as YAML array
    if (frontmatter.stats && frontmatter.stats.length > 0) {
        yaml += 'stats:\n';
        frontmatter.stats.forEach(stat => {
            yaml += `  - value: "${stat.value}"\n`;
            yaml += `    label: "${stat.label}"\n`;
            if (stat.context) yaml += `    context: "${stat.context}"\n`;
            if (stat.source) yaml += `    source: "${stat.source}"\n`;
        });
    }
    
    // Add FAQs as YAML array
    if (frontmatter.faqs && frontmatter.faqs.length > 0) {
        yaml += 'faqs:\n';
        frontmatter.faqs.forEach(faq => {
            yaml += `  - question: "${faq.question.replace(/"/g, '\\"')}"\n`;
            yaml += `    answer: "${faq.answer.replace(/"/g, '\\"').replace(/\n/g, ' ')}"\n`;
        });
    }
    
    yaml += '---\n\n';
    
    // Generate markdown filename
    const slug = filename.replace('.html', '');
    const mdFilename = `${slug}.md`;
    const mdContent = yaml + markdownContent;
    
    return {
        filename: mdFilename,
        content: mdContent,
        metadata: frontmatter
    };
}

// Main migration function
function migrate() {
    console.log('🚀 Starting migration of HTML blog posts to Eleventy CMS...\n');
    
    // Get all HTML files
    const files = fs.readdirSync(SOURCE_DIR)
        .filter(f => f.endsWith('.html') && f !== 'index.html')
        .sort();
    
    console.log(`Found ${files.length} HTML files to migrate\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    files.forEach((filename, index) => {
        try {
            const result = processFile(filename);
            const outputPath = path.join(TARGET_DIR, result.filename);
            
            // Write markdown file
            fs.writeFileSync(outputPath, result.content, 'utf-8');
            
            console.log(`✅ [${index + 1}/${files.length}] ${filename} → ${result.filename}`);
            console.log(`   Title: ${result.metadata.title.substring(0, 60)}...`);
            console.log(`   Category: ${result.metadata.category}`);
            console.log(`   Stats: ${result.metadata.stats?.length || 0} | FAQs: ${result.metadata.faqs?.length || 0}\n`);
            
            successCount++;
        } catch (error) {
            console.error(`❌ [${index + 1}/${files.length}] Error processing ${filename}:`, error.message);
            errorCount++;
        }
    });
    
    console.log('\n' + '='.repeat(50));
    console.log('Migration Complete!');
    console.log('='.repeat(50));
    console.log(`Total files: ${files.length}`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`\nOutput directory: ${TARGET_DIR}`);
}

// Run migration
migrate();
