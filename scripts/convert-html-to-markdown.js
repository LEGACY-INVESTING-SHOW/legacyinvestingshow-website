/**
 * HTML to Markdown Converter for Blog Posts
 *
 * Converts standalone HTML blog posts to markdown format with comprehensive
 * frontmatter for better SEO and maintainability.
 *
 * Usage: node scripts/convert-html-to-markdown.js
 */

const fs = require('fs');
const path = require('path');

// Directories
const BLOG_DIR = path.join(__dirname, '..', 'blog');
const CONTENT_DIR = path.join(__dirname, '..', 'content', 'blog');

// List of HTML files that were built from markdown (don't convert these)
// These files already have markdown sources and don't need conversion
const SKIP_FILES = [
    'index.html',
    'gary-marketing-executive-35k-month.html',
    'getting-started-airbnb-arbitrage.html'
];

// Icon mapping (SVG path hints to icon names)
const ICON_MAP = {
    'M12 1v22M17 5H9.5': 'dollar',
    'M3 9l9-7 9 7v11': 'home',
    'circle cx="12" cy="12" r="10': 'clock',
    'line x1="18" y1="20': 'chart',
    'M22 11.08V12': 'check',
    'M17 21v-2a4': 'users',
    'M9 19v-6': 'percent',
    'M12 22s8-4 8-10': 'location'
};

/**
 * Extract content between patterns
 */
function extractBetween(html, startPattern, endPattern) {
    const startMatch = html.match(startPattern);
    if (!startMatch) return null;

    const startIdx = startMatch.index + startMatch[0].length;
    const endMatch = html.slice(startIdx).match(endPattern);
    if (!endMatch) return null;

    return html.slice(startIdx, startIdx + endMatch.index).trim();
}

/**
 * Extract meta tag content
 */
function extractMeta(html, name, property = false) {
    const attr = property ? 'property' : 'name';
    const patterns = [
        new RegExp(`<meta\\s+${attr}=["']${name}["']\\s+content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta\\s+content=["']([^"']+)["']\\s+${attr}=["']${name}["']`, 'i')
    ];

    for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) return match[1];
    }
    return null;
}

/**
 * Extract YouTube video ID from HTML
 */
function extractYouTubeId(html) {
    const patterns = [
        /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
        /youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) return match[1];
    }
    return null;
}

/**
 * Determine icon type from SVG content
 */
function getIconType(svgContent) {
    for (const [hint, icon] of Object.entries(ICON_MAP)) {
        if (svgContent.includes(hint)) return icon;
    }
    return 'star';
}

/**
 * Extract statistics from HTML
 */
function extractStatistics(html) {
    const stats = [];

    // Find the statistics section
    const sectionMatch = html.match(/<section class="statistics-section"[^>]*>([\s\S]*?)<\/section>/);
    if (!sectionMatch) return stats;

    const sectionHtml = sectionMatch[1];

    // Split by stat-card divs and process each
    const cardMatches = sectionHtml.split(/<div class="stat-card"/);

    for (let i = 1; i < cardMatches.length; i++) {
        const cardHtml = cardMatches[i];

        // Extract SVG for icon type
        const svgMatch = cardHtml.match(/<svg[^>]*>([\s\S]*?)<\/svg>/);
        const icon = svgMatch ? getIconType(svgMatch[0]) : 'star';

        // Extract value
        const valueMatch = cardHtml.match(/<div class="stat-value">([^<]+)<\/div>/);
        const value = valueMatch ? valueMatch[1].trim() : '';

        // Extract label
        const labelMatch = cardHtml.match(/<div class="stat-label">([^<]+)<\/div>/);
        const label = labelMatch ? labelMatch[1].trim() : '';

        // Extract context
        const contextMatch = cardHtml.match(/<span class="stat-context">([^<]+)<\/span>/);
        const context = contextMatch ? contextMatch[1].trim() : '';

        // Extract source
        const sourceMatch = cardHtml.match(/<span class="stat-source">([^<]+)<\/span>/);
        const source = sourceMatch ? sourceMatch[1].trim() : '';

        if (value && label) {
            const stat = { value, label, icon };
            if (context) stat.context = context;
            if (source) stat.source = source;
            stats.push(stat);
        }
    }

    return stats;
}

/**
 * Extract FAQ items from HTML
 */
function extractFAQ(html) {
    const faq = [];

    // Try JSON-LD schema first (more reliable)
    const schemaMatch = html.match(/<script type="application\/ld\+json">\s*\{[\s\S]*?"@type":\s*"FAQPage"[\s\S]*?<\/script>/);
    if (schemaMatch) {
        try {
            const schemaText = schemaMatch[0]
                .replace(/<script[^>]*>/, '')
                .replace(/<\/script>/, '')
                .trim();
            const schema = JSON.parse(schemaText);

            if (schema.mainEntity) {
                for (const item of schema.mainEntity) {
                    faq.push({
                        question: item.name,
                        answer: item.acceptedAnswer?.text || ''
                    });
                }
                return faq;
            }
        } catch (e) {
            // Fall through to HTML parsing
        }
    }

    // Parse from HTML structure
    const faqItemPattern = /<div class="faq-item"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
    let match;

    while ((match = faqItemPattern.exec(html)) !== null) {
        const itemHtml = match[1];

        const questionMatch = itemHtml.match(/<span itemprop="name">([^<]+)<\/span>/);
        const answerMatch = itemHtml.match(/<div itemprop="text">\s*<p>([^<]+)<\/p>/);

        if (questionMatch && answerMatch) {
            faq.push({
                question: questionMatch[1].trim(),
                answer: answerMatch[1].trim()
            });
        }
    }

    return faq;
}

/**
 * Clean HTML and convert to markdown-like content
 */
function htmlToMarkdown(html) {
    // Remove scripts and styles
    let content = html.replace(/<script[\s\S]*?<\/script>/gi, '');
    content = content.replace(/<style[\s\S]*?<\/style>/gi, '');

    // Convert headings
    content = content.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n');
    content = content.replace(/<h2[^>]*id="([^"]*)"[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $2 {#$1}\n');
    content = content.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n');
    content = content.replace(/<h3[^>]*id="([^"]*)"[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $2 {#$1}\n');
    content = content.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n');

    // Convert bold and italic
    content = content.replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**');
    content = content.replace(/<b>([\s\S]*?)<\/b>/gi, '**$1**');
    content = content.replace(/<em>([\s\S]*?)<\/em>/gi, '*$1*');
    content = content.replace(/<i>([\s\S]*?)<\/i>/gi, '*$1*');

    // Convert links
    content = content.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');

    // Convert blockquotes
    content = content.replace(/<blockquote[^>]*>\s*<p>([\s\S]*?)<\/p>\s*<\/blockquote>/gi, '\n> $1\n');
    content = content.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '\n> $1\n');

    // Convert lists
    content = content.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, listContent) => {
        return listContent.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');
    });
    content = content.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, listContent) => {
        let counter = 1;
        return listContent.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, () => `${counter++}. $1\n`);
    });

    // Convert tables
    content = content.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (match, tableContent) => {
        let markdown = '\n';

        // Extract headers
        const headerMatch = tableContent.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i);
        if (headerMatch) {
            const headers = [];
            const headerCells = headerMatch[1].match(/<th[^>]*>([\s\S]*?)<\/th>/gi) || [];
            headerCells.forEach(cell => {
                const text = cell.replace(/<[^>]+>/g, '').trim();
                headers.push(text);
            });
            if (headers.length) {
                markdown += '| ' + headers.join(' | ') + ' |\n';
                markdown += '|' + headers.map(() => '------').join('|') + '|\n';
            }
        }

        // Extract body rows
        const bodyMatch = tableContent.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
        if (bodyMatch) {
            const rows = bodyMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
            rows.forEach(row => {
                const cells = [];
                const tdMatches = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
                tdMatches.forEach(cell => {
                    const text = cell.replace(/<[^>]+>/g, '').trim();
                    cells.push(text);
                });
                if (cells.length) {
                    markdown += '| ' + cells.join(' | ') + ' |\n';
                }
            });
        }

        return markdown + '\n';
    });

    // Convert paragraphs
    content = content.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n');

    // Convert horizontal rules
    content = content.replace(/<hr[^>]*>/gi, '\n---\n');

    // Remove remaining HTML tags
    content = content.replace(/<[^>]+>/g, '');

    // Clean up entities
    content = content.replace(/&nbsp;/g, ' ');
    content = content.replace(/&amp;/g, '&');
    content = content.replace(/&lt;/g, '<');
    content = content.replace(/&gt;/g, '>');
    content = content.replace(/&quot;/g, '"');
    content = content.replace(/&#39;/g, "'");

    // Clean up whitespace
    content = content.replace(/\n{3,}/g, '\n\n');
    content = content.trim();

    return content;
}

/**
 * Extract main article content
 */
function extractArticleContent(html) {
    // Find the minimal-content section
    const contentMatch = html.match(/<div class="minimal-content">([\s\S]*?)<section class="faq-section"/);
    if (!contentMatch) {
        // Try alternative pattern
        const altMatch = html.match(/<div class="prose-minimal">([\s\S]*?)<\/div>\s*<\/div>\s*<\/article>/);
        if (altMatch) {
            return htmlToMarkdown(altMatch[1]);
        }
        return '';
    }

    return htmlToMarkdown(contentMatch[1]);
}

/**
 * Generate SEO keywords from title and description
 */
function generateKeywords(title, description) {
    const text = (title + ' ' + description).toLowerCase();

    const primaryKeywords = [];
    const secondaryKeywords = [];
    const longTailKeywords = [];

    // Common patterns
    if (text.includes('airbnb')) primaryKeywords.push('airbnb success story');
    if (text.includes('arbitrage')) primaryKeywords.push('airbnb arbitrage');
    if (text.includes('cash flow') || text.includes('month')) primaryKeywords.push('airbnb cash flow');
    if (text.includes('passive income')) secondaryKeywords.push('passive income real estate');
    if (text.includes('short-term rental') || text.includes('str')) secondaryKeywords.push('short-term rental business');

    // Location-based
    const locations = ['austin', 'texas', 'poconos', 'florida', 'california', 'mexico', 'hamptons'];
    for (const loc of locations) {
        if (text.includes(loc)) {
            secondaryKeywords.push(`${loc} airbnb`);
        }
    }

    // Long-tail based on content
    if (text.includes('working full') || text.includes('full-time')) {
        longTailKeywords.push('how to start airbnb while working full time');
    }
    if (text.includes('no experience') || text.includes('beginner')) {
        longTailKeywords.push('how to start airbnb with no experience');
    }
    if (text.includes('first property') || text.includes('first airbnb')) {
        longTailKeywords.push('first airbnb property tips');
    }

    // Default keywords if needed
    if (primaryKeywords.length === 0) primaryKeywords.push('airbnb success story');
    if (secondaryKeywords.length === 0) {
        secondaryKeywords.push('rental arbitrage', 'short-term rental investing');
    }
    if (longTailKeywords.length === 0) {
        longTailKeywords.push('how much can you make with airbnb', 'is airbnb arbitrage worth it');
    }

    return {
        primaryKeyword: primaryKeywords[0],
        secondaryKeywords: secondaryKeywords.slice(0, 5),
        longTailKeywords: longTailKeywords.slice(0, 4)
    };
}

/**
 * Generate frontmatter YAML
 */
function generateFrontmatter(data) {
    const yaml = [];
    yaml.push('---');
    yaml.push('# Core SEO Fields');
    yaml.push(`title: "${data.title.replace(/"/g, '\\"')}"`);
    yaml.push('titleTemplate: "%s | Legacy Investing Show Success Stories"');
    yaml.push(`description: "${data.description.replace(/"/g, '\\"')}"`);
    yaml.push(`date: ${data.date}`);
    yaml.push(`modifiedDate: ${new Date().toISOString().split('T')[0]}`);
    yaml.push('author: Preston Seo');
    yaml.push('authorTitle: "Founder, Legacy Investing Show"');
    yaml.push('authorCredentials: "2,000+ students trained, $10M+ student revenue generated"');
    yaml.push(`category: ${data.category}`);
    yaml.push(`canonical: "https://www.legacyinvestingshow.com/blog/${data.slug}"`);
    yaml.push('');

    // SEO keyword targeting
    const keywords = generateKeywords(data.title, data.description);
    yaml.push('# SEO Keyword Targeting');
    yaml.push('seo:');
    yaml.push(`  primaryKeyword: "${keywords.primaryKeyword}"`);
    yaml.push('  secondaryKeywords:');
    for (const kw of keywords.secondaryKeywords) {
        yaml.push(`    - "${kw}"`);
    }
    yaml.push('  longTailKeywords:');
    for (const kw of keywords.longTailKeywords) {
        yaml.push(`    - "${kw}"`);
    }
    yaml.push('  searchIntent: "informational"');
    yaml.push('');

    // Tags
    yaml.push('# Tags');
    yaml.push('tags:');
    yaml.push('  - airbnb arbitrage');
    yaml.push('  - rental arbitrage');
    yaml.push('  - passive income');
    yaml.push('  - case study');
    yaml.push('  - success story');
    yaml.push('  - short-term rental');
    yaml.push('');

    // Open Graph & Social
    yaml.push('# Open Graph & Social');
    yaml.push(`image: ${data.image}`);
    yaml.push(`imageAlt: "${data.title.replace(/"/g, '\\"')} - Legacy Investing Show"`);
    yaml.push('imageWidth: 1200');
    yaml.push('imageHeight: 630');
    yaml.push('twitterCard: summary_large_image');
    yaml.push('featured: false');
    yaml.push('');

    // Video integration
    if (data.youtubeId) {
        yaml.push('# Video Integration');
        yaml.push(`youtubeId: "${data.youtubeId}"`);
        yaml.push('');
    }

    // Schema types
    yaml.push('# Multiple Schema Types for Rich Results');
    yaml.push('schema:');
    yaml.push('  - type: Article');
    yaml.push(`    headline: "${data.title.replace(/"/g, '\\"')}"`);
    yaml.push(`    datePublished: "${data.date}T00:00:00Z"`);
    yaml.push(`    dateModified: "${new Date().toISOString().split('T')[0]}T00:00:00Z"`);
    if (data.youtubeId) {
        yaml.push('  - type: VideoObject');
        yaml.push(`    name: "${data.title.replace(/"/g, '\\"')} - Full Interview"`);
        yaml.push(`    thumbnailUrl: "https://img.youtube.com/vi/${data.youtubeId}/maxresdefault.jpg"`);
        yaml.push(`    embedUrl: "https://www.youtube.com/embed/${data.youtubeId}"`);
    }
    yaml.push('  - type: HowTo');
    yaml.push(`    name: "How to Build an Airbnb Business Like This Success Story"`);
    yaml.push('');

    // Breadcrumbs
    yaml.push('# Breadcrumbs');
    yaml.push('breadcrumbs:');
    yaml.push('  - name: "Home"');
    yaml.push('    url: "/"');
    yaml.push('  - name: "Blog"');
    yaml.push('    url: "/blog"');
    yaml.push('  - name: "Success Stories"');
    yaml.push('    url: "/blog/category/success-stories"');
    yaml.push('');

    // Statistics
    if (data.statistics && data.statistics.length > 0) {
        yaml.push('# Statistics (AI-crawler accessible, renders as stat cards)');
        yaml.push('statistics:');
        for (const stat of data.statistics) {
            yaml.push(`  - value: "${stat.value}"`);
            yaml.push(`    label: "${stat.label}"`);
            yaml.push(`    icon: "${stat.icon}"`);
            if (stat.context) yaml.push(`    context: "${stat.context.replace(/"/g, '\\"')}"`);
            if (stat.source) yaml.push(`    source: "${stat.source.replace(/"/g, '\\"')}"`);
        }
        yaml.push('');
    }

    // FAQ
    if (data.faq && data.faq.length > 0) {
        yaml.push('# FAQ (FAQPage schema + accordion rendering)');
        yaml.push('faq:');
        for (const item of data.faq) {
            yaml.push(`  - question: "${item.question.replace(/"/g, '\\"')}"`);
            yaml.push(`    answer: "${item.answer.replace(/"/g, '\\"')}"`);
        }
        yaml.push('');
    }

    // Table of contents
    yaml.push('# Table of Contents');
    yaml.push('toc: true');
    yaml.push('tocDepth: 3');
    yaml.push('');

    // Reading time estimate
    const wordCount = data.content ? data.content.split(/\s+/).length : 3500;
    const readingTime = Math.ceil(wordCount / 200);
    yaml.push('# Reading Time');
    yaml.push(`readingTime: "${readingTime} min read"`);
    yaml.push(`wordCount: "${wordCount}"`);
    yaml.push('---');

    return yaml.join('\n');
}

/**
 * Convert a single HTML file to markdown
 */
function convertFile(filename) {
    const htmlPath = path.join(BLOG_DIR, filename);
    const html = fs.readFileSync(htmlPath, 'utf-8');

    // Extract metadata
    const title = extractMeta(html, 'title') ||
                  (html.match(/<title>([^<|]+)/)?.[1] || '').trim();
    const cleanTitle = title.replace(' | Legacy Investing Show', '').trim();

    const description = extractMeta(html, 'description') || '';
    const dateStr = extractMeta(html, 'article:published_time', true) || new Date().toISOString();
    const date = dateStr.split('T')[0];
    const category = extractMeta(html, 'article:section', true) || 'Success Story';
    const image = extractMeta(html, 'og:image', true) || '/assets/images/blog/success-stories/airbnb-success.jpg';
    const imagePath = image.replace('https://www.legacyinvestingshow.com', '');

    // Generate slug from filename
    const slug = filename.replace('.html', '').replace(/^\d+-/, '');

    // Extract YouTube ID
    const youtubeId = extractYouTubeId(html);

    // Extract statistics
    const statistics = extractStatistics(html);

    // Extract FAQ
    const faq = extractFAQ(html);

    // Extract main content
    const content = extractArticleContent(html);

    // Generate frontmatter
    const frontmatter = generateFrontmatter({
        title: cleanTitle,
        description,
        date,
        category,
        image: imagePath,
        slug,
        youtubeId,
        statistics,
        faq,
        content
    });

    // Create final markdown
    const markdown = frontmatter + '\n\n' + content;

    // Determine output filename
    const mdFilename = slug + '.md';
    const mdPath = path.join(CONTENT_DIR, mdFilename);

    // Write file
    fs.writeFileSync(mdPath, markdown, 'utf-8');

    return {
        filename: mdFilename,
        title: cleanTitle,
        wordCount: content.split(/\s+/).length,
        statsCount: statistics.length,
        faqCount: faq.length,
        hasVideo: !!youtubeId
    };
}

/**
 * Main conversion function
 */
function main() {
    console.log('HTML to Markdown Blog Post Converter');
    console.log('====================================\n');

    // Ensure content directory exists
    if (!fs.existsSync(CONTENT_DIR)) {
        fs.mkdirSync(CONTENT_DIR, { recursive: true });
    }

    // Get all HTML files
    const htmlFiles = fs.readdirSync(BLOG_DIR)
        .filter(f => f.endsWith('.html') && !SKIP_FILES.includes(f));

    console.log(`Found ${htmlFiles.length} HTML files to convert\n`);

    const results = [];
    const errors = [];

    for (const file of htmlFiles) {
        try {
            console.log(`Converting: ${file}`);
            const result = convertFile(file);
            results.push(result);
            console.log(`  → ${result.filename} (${result.wordCount} words, ${result.statsCount} stats, ${result.faqCount} FAQs)`);
        } catch (error) {
            console.error(`  ✗ Error: ${error.message}`);
            errors.push({ file, error: error.message });
        }
    }

    // Summary
    console.log('\n====================================');
    console.log('Conversion Summary');
    console.log('====================================');
    console.log(`✓ Successfully converted: ${results.length} files`);
    console.log(`✗ Errors: ${errors.length} files`);

    if (results.length > 0) {
        const totalWords = results.reduce((sum, r) => sum + r.wordCount, 0);
        const avgWords = Math.round(totalWords / results.length);
        console.log(`\nTotal words: ${totalWords.toLocaleString()}`);
        console.log(`Average words per post: ${avgWords.toLocaleString()}`);
    }

    if (errors.length > 0) {
        console.log('\nErrors:');
        for (const err of errors) {
            console.log(`  - ${err.file}: ${err.error}`);
        }
    }

    console.log('\nDone! Markdown files saved to: content/blog/');
}

// Run the conversion
main();
