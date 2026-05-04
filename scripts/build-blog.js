#!/usr/bin/env node

/**
 * Blog Build Script for Legacy Investing Show
 *
 * This script:
 * 1. Reads markdown files from content/blog/
 * 2. Parses frontmatter with gray-matter
 * 3. Converts markdown to HTML with marked
 * 4. Applies the blog post template
 * 5. Generates individual blog post HTML files to blog/
 * 6. Generates a blog index page
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');
const {
    CURRENT_YEAR,
    renderAnalyticsBody,
    renderAnalyticsHead,
    renderFooterLinks,
    renderPrimaryNavLinks,
    renderSourceBlock,
} = require('./lib/site-shell');

// Configure marked for better output
marked.setOptions({
    gfm: true,
    breaks: true,
    headerIds: true,
    mangle: false
});

// Paths
const ROOT_DIR = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT_DIR, 'content', 'blog');
const OUTPUT_DIR = path.join(ROOT_DIR, 'blog');
const TEMPLATE_PATH = path.join(ROOT_DIR, 'templates', 'blog-post.html');
const GA_TRACKING_ID = process.env.GA_TRACKING_ID || 'G-2578PT1WSS';
const GTM_CONTAINER_ID = process.env.GTM_CONTAINER_ID || 'GTM-KQ4R2LKP';
const GOOGLE_SITE_VERIFICATIONS = [
    'Kec6RfGhFL-qG_8zKxCqt7yxjgy65WeDAftCBm90G2s',
    '92MoCnkdQOj_ey1lEafT5Mz-znCcCQ3UABZlI-JG_nM'
];

/**
 * Calculate read time based on word count
 * Average reading speed: 200 words per minute
 */
function calculateReadTime(content) {
    const words = content.trim().split(/\s+/).length;
    const readTime = Math.ceil(words / 200);
    return Math.max(1, readTime); // Minimum 1 minute
}

/**
 * Build a branded <title> string for generated blog pages.
 */
function buildSEOTitle(rawTitle) {
    const title = (rawTitle || 'Legacy Investing Show')
        .replace(/\s+/g, ' ')
        .replace(/\s+\([^)]*\)\s*$/g, '')
        .trim() || 'Legacy Investing Show';
    const suffix = ' | Legacy Investing Show';
    return title.endsWith(suffix) ? title : `${title}${suffix}`;
}

/**
 * Generate slug from filename
 */
function generateSlug(filename) {
    return filename.replace(/\.md$/, '');
}

/**
 * Format date for display
 */
function formatDate(date) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(date).toLocaleDateString('en-US', options);
}

/**
 * Format date as ISO string for schema markup
 */
function formatISODate(date) {
    return new Date(date).toISOString();
}

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
 * Read all markdown files from content directory
 */
function getMarkdownFiles() {
    ensureDir(CONTENT_DIR);

    try {
        const files = fs.readdirSync(CONTENT_DIR);
        return files.filter(file => file.endsWith('.md'));
    } catch (error) {
        console.error(`Error reading content directory: ${error.message}`);
        return [];
    }
}

/**
 * NOTE: Previous version had logic to preserve existing HTML files.
 * This has been removed since all posts now have markdown sources.
 * The build script now always builds from markdown, overwriting HTML files.
 */

/**
 * Parse a markdown file and extract frontmatter and content
 */
function parseMarkdownFile(filename) {
    const filePath = path.join(CONTENT_DIR, filename);

    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const { data, content } = matter(fileContent);

        // Validate required frontmatter fields
        const required = ['title', 'description', 'date', 'author', 'category'];
        const missing = required.filter(field => !data[field]);

        if (missing.length > 0) {
            console.warn(`Warning: ${filename} is missing required fields: ${missing.join(', ')}`);
        }

        return {
            frontmatter: data,
            content: content,
            slug: generateSlug(filename),
            filename: filename
        };
    } catch (error) {
        console.error(`Error parsing ${filename}: ${error.message}`);
        return null;
    }
}

/**
 * Generate slug from heading text for anchor links
 */
function slugifyHeading(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

/**
 * Generate Table of Contents from HTML content
 * Only generates TOC for articles > 1500 words with at least 3 headings
 */
function generateTOC(htmlContent, wordCount) {
    if (wordCount < 1500) return { toc: '', content: htmlContent };

    const headingRegex = /<h([23])>([^<]+)<\/h[23]>/gi;
    const headings = [];
    let match;

    while ((match = headingRegex.exec(htmlContent)) !== null) {
        headings.push({
            level: parseInt(match[1]),
            text: match[2],
            slug: slugifyHeading(match[2])
        });
    }

    if (headings.length < 3) return { toc: '', content: htmlContent };

    // Add IDs to headings in content
    let modifiedContent = htmlContent;
    headings.forEach(heading => {
        const regex = new RegExp(`<h${heading.level}>${heading.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<\\/h${heading.level}>`, 'i');
        modifiedContent = modifiedContent.replace(
            regex,
            `<h${heading.level} id="${heading.slug}">${heading.text}</h${heading.level}>`
        );
    });

    // Generate TOC HTML
    const tocItems = headings.map(h => {
        const indent = h.level === 3 ? ' toc__item--h3' : '';
        return `<li class="toc__item${indent}"><a href="#${h.slug}" class="toc__link">${h.text}</a></li>`;
    }).join('\n                ');

    const tocHtml = `
        <nav class="toc" aria-label="Table of contents">
            <p class="toc__title">Contents</p>
            <ul class="toc__list">
                ${tocItems}
            </ul>
        </nav>`;

    return { toc: tocHtml, content: modifiedContent };
}

/**
 * Convert markdown content to HTML
 */
function markdownToHTML(content) {
    return marked(content);
}

/**
 * Extract keywords from content (simple extraction based on category and common terms)
 */
function extractKeywords(content, category) {
    const baseKeywords = ['investing', 'wealth building', 'financial freedom'];
    const categoryKeywords = {
        'Airbnb Arbitrage': ['airbnb', 'arbitrage', 'short-term rental', 'passive income', 'rental property'],
        'Real Estate': ['real estate', 'property investment', 'rental income', 'property management'],
        'Investing': ['investment strategy', 'portfolio', 'returns', 'cash flow'],
        'Wealth Plan': ['wealth plan', 'personalized strategy', 'tax optimization', 'financial planning', 'retirement strategy', 'wealth building strategy']
    };

    const keywords = [...baseKeywords, ...(categoryKeywords[category] || [])];
    return keywords.join(', ');
}

/**
 * Icon SVGs for statistics cards
 */
const STAT_ICONS = {
    dollar: `<svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
    home: `<svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    chart: `<svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    clock: `<svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    percent: `<svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>`,
    location: `<svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    users: `<svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    star: `<svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    default: `<svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>`
};

/**
 * Generate statistics HTML cards from frontmatter
 */
function generateStatisticsHTML(statistics) {
    if (!statistics || !Array.isArray(statistics) || statistics.length === 0) {
        return '';
    }

    const statsCards = statistics.map((stat, index) => {
        const icon = STAT_ICONS[stat.icon] || STAT_ICONS.default;
        const context = stat.context ? `<span class="stat-context">${stat.context}</span>` : '';
        const source = stat.source ? `<span class="stat-source">${stat.source}</span>` : '';

        return `
            <div class="stat-card" data-stat-index="${index}">
                <div class="stat-icon-wrapper">
                    ${icon}
                </div>
                <div class="stat-value">${stat.value}</div>
                <div class="stat-label">${stat.label}</div>
                ${context}
                ${source}
            </div>`;
    }).join('\n');

    return `
        <section class="statistics-section" aria-label="Key statistics">
            <div class="statistics-grid">
                ${statsCards}
            </div>
        </section>`;
}

/**
 * Generate FAQ HTML with expandable accordions
 */
function generateFAQHTML(faq) {
    if (!faq || !Array.isArray(faq) || faq.length === 0) {
        return '';
    }

    const faqItems = faq.map((item, index) => {
        const isFirst = index === 0;
        return `
            <div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
                <button class="faq-question" aria-expanded="${isFirst ? 'true' : 'false'}" aria-controls="faq-answer-${index}">
                    <span itemprop="name">${item.question}</span>
                    <svg class="faq-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"/>
                    </svg>
                </button>
                <div class="faq-answer ${isFirst ? 'faq-answer--open' : ''}" id="faq-answer-${index}" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
                    <div itemprop="text">
                        <p>${item.answer}</p>
                    </div>
                </div>
            </div>`;
    }).join('\n');

    return `
        <section class="faq-section" aria-label="Frequently asked questions">
            <h2 class="faq-title">Frequently Asked Questions</h2>
            <div class="faq-list" itemscope itemtype="https://schema.org/FAQPage">
                ${faqItems}
            </div>
        </section>
        <script>
            document.querySelectorAll('.faq-question').forEach(button => {
                button.addEventListener('click', () => {
                    const expanded = button.getAttribute('aria-expanded') === 'true';
                    button.setAttribute('aria-expanded', !expanded);
                    button.nextElementSibling.classList.toggle('faq-answer--open');
                });
            });
        </script>`;
}

/**
 * Generate FAQPage JSON-LD schema
 */
function generateFAQSchema(faq) {
    if (!faq || !Array.isArray(faq) || faq.length === 0) {
        return '';
    }

    const faqEntries = faq.map(item => ({
        "@type": "Question",
        "name": item.question,
        "acceptedAnswer": {
            "@type": "Answer",
            "text": item.answer
        }
    }));

    const schema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqEntries
    };

    return `<script type="application/ld+json">
    ${JSON.stringify(schema, null, 4)}
    </script>`;
}

/**
 * Apply template to post data
 */
function applyTemplate(template, post, allPosts = []) {
    const rawHtmlContent = markdownToHTML(post.content);
    const readTime = calculateReadTime(post.content);
    const wordCount = post.content.trim().split(/\s+/).length;

    // Generate TOC for longer articles
    const { toc, content: htmlContent } = generateTOC(rawHtmlContent, wordCount);

    // Set default values for optional fields
    const rawImage = post.frontmatter.image || '/assets/images/og-blog.jpg';
    // For local images, prepend domain for OG/twitter; for external URLs, use as-is
    const SITE_DOMAIN = 'https://www.legacyinvestingshow.com';
    const ogImage = rawImage.startsWith('http') 
        ? rawImage 
        : SITE_DOMAIN + rawImage;
    // Use rawImage for content display (relative paths work fine)
    const image = rawImage;
    const imageAlt = post.frontmatter.imageAlt || post.frontmatter.title || 'Legacy Investing Show article image';
    // Generate WebP version path
    const imageWebp = rawImage.startsWith('http') 
        ? rawImage.replace(/\.(jpg|jpeg|png)$/i, '.webp') 
        : rawImage.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    const author = post.frontmatter.author || 'Preston Seo';
    const authorTitle = post.frontmatter.authorTitle || 'Real Estate Investor & Educator';
    const authorCredentials = post.frontmatter.authorCredentials || '';
    const category = post.frontmatter.category || 'Investing';

    // Handle modified date (use frontmatter if provided, otherwise use published date)
    const modifiedDate = post.frontmatter.modifiedDate
        ? formatISODate(post.frontmatter.modifiedDate)
        : formatISODate(post.frontmatter.date);

    // Generate keywords
    const keywords = post.frontmatter.keywords || extractKeywords(post.content, category);

    // Generate related posts HTML
    const relatedPostsHtml = generateRelatedPosts(post, allPosts);

    // Generate statistics cards HTML from frontmatter
    const statisticsHtml = generateStatisticsHTML(post.frontmatter.statistics);

    // Generate FAQ HTML and schema from frontmatter
    const faqHtml = generateFAQHTML(post.frontmatter.faq);
    const faqSchemaHtml = generateFAQSchema(post.frontmatter.faq);
    const sourceBlockHtml = renderSourceBlock({
        title: post.frontmatter.title,
        slug: post.slug,
        type: category,
        heading: 'Sources To Check Before You Act',
    });

    // Replace all placeholders
    let html = template
        .replace(/\{\{title\}\}/g, post.frontmatter.title || 'Untitled')
        .replace(/\{\{seoTitle\}\}/g, buildSEOTitle(post.frontmatter.title))
        .replace(/\{\{description\}\}/g, post.frontmatter.description || '')
        .replace(/\{\{toc\}\}/g, toc)
        .replace(/\{\{content\}\}/g, htmlContent)
        .replace(/\{\{date\}\}/g, formatDate(post.frontmatter.date))
        .replace(/\{\{isoDate\}\}/g, formatISODate(post.frontmatter.date))
        .replace(/\{\{modifiedDate\}\}/g, modifiedDate)
        .replace(/\{\{author\}\}/g, author)
        .replace(/\{\{authorTitle\}\}/g, authorTitle)
        .replace(/\{\{authorCredentials\}\}/g, authorCredentials)
        .replace(/\{\{category\}\}/g, category)
        .replace(/\{\{image\}\}/g, image)
        .replace(/\{\{imageAlt\}\}/g, imageAlt)
        .replace(/\{\{ogImage\}\}/g, ogImage)
        .replace(/\{\{imageWebp\}\}/g, imageWebp)
        .replace(/\{\{readTime\}\}/g, readTime)
        .replace(/\{\{slug\}\}/g, post.slug)
        .replace(/\{\{wordCount\}\}/g, wordCount)
        .replace(/\{\{keywords\}\}/g, keywords)
        .replace(/\{\{relatedPosts\}\}/g, relatedPostsHtml)
        .replace(/\{\{statistics\}\}/g, statisticsHtml)
        .replace(/\{\{faq\}\}/g, faqHtml)
        .replace(/\{\{sourceBlock\}\}/g, sourceBlockHtml)
        .replace(/\{\{faqSchema\}\}/g, faqSchemaHtml);

    return html;
}

/**
 * Generate related posts HTML based on category matching
 */
function generateRelatedPosts(currentPost, allPosts, limit = 3) {
    const relatedPosts = allPosts
        .filter(post =>
            post.slug !== currentPost.slug &&
            post.frontmatter.category === currentPost.frontmatter.category
        )
        .slice(0, limit);

    if (relatedPosts.length === 0) {
        // Fallback to any other posts if no category match
        const fallbackPosts = allPosts
            .filter(post => post.slug !== currentPost.slug)
            .slice(0, limit);

        if (fallbackPosts.length === 0) return '';
        return generateRelatedPostsMarkup(fallbackPosts);
    }

    return generateRelatedPostsMarkup(relatedPosts);
}

/**
 * Generate the HTML markup for related posts
 */
function generateRelatedPostsMarkup(posts) {
    if (posts.length === 0) return '';

    const postsHtml = posts.map(post => {
        const image = post.frontmatter.image || '/assets/images/og-blog.jpg';
        const readTime = calculateReadTime(post.content);

        return `
            <a href="/blog/${post.slug}" class="related-post-item">
                <div class="related-post-image">
                    <img src="${image}" alt="${post.frontmatter.title}" loading="lazy" onerror="this.onerror=null;this.src='/assets/images/og-blog.jpg';">
                </div>
                <div class="related-post-content">
                    <h4 class="related-post-title">${post.frontmatter.title}</h4>
                    <span class="related-post-meta">${readTime} min read</span>
                </div>
            </a>`;
    }).join('\n');

    return `
        <aside class="related-posts" aria-label="Related articles">
            <h3 class="related-posts-title">Related Articles</h3>
            <div class="related-posts-grid">
                ${postsHtml}
            </div>
        </aside>`;
}

/**
 * Convert category name to slug
 */
function slugifyCategory(category) {
    return category.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function categoryDescription(category) {
    const descriptions = {
        'Airbnb Arbitrage': 'Lease-first short-term rental strategy, landlord conversations, setup budgets, pricing, operations, and real student case studies.',
        'Business Structures': 'LLC, S-corp, C-corp, veil protection, operating agreement, registered agent, and entity-choice guides for operators and investors.',
        'Debt Management': 'Debt payoff, consolidation, student-loan strategy, budgeting, and credit decision guides for building cleaner cash flow.',
        'Investing': 'Portfolio construction, real estate, alternative assets, asset allocation, tax-aware investing, and wealth-building decisions.',
        'Passive Income': 'Income-stream ideas, business models, and practical execution guides for building income beyond a paycheck.',
        'Real Estate': 'Rental property, short-term rental, depreciation, house hacking, and investor decision guides.',
        'Retirement': '401(k), IRA, Roth, pension, withdrawal, income, and tax-sequencing guides for retirement planning.',
        'Success Story': 'Student case studies showing how real operators built cash flow, negotiated leases, and changed their financial trajectory.',
        'Success Stories': 'Student case studies showing how real operators built cash flow, negotiated leases, and changed their financial trajectory.',
        'Tax Strategies': 'Tax planning guides for real estate investors, business owners, high-income earners, and self-employed professionals.',
        'Wealth Plan': 'Scenario-based wealth plans connecting income, tax, debt, real estate, retirement, and execution priorities.',
    };

    return descriptions[category] || `Guides, examples, and execution notes for ${category.toLowerCase()} from Legacy Investing Show.`;
}

function normalizeCategoryForArchives(category) {
    if (category === 'Success Stories') return 'Success Story';
    if (category === 'Real Estate Investing' || category === 'Real Estate Strategy') return 'Real Estate';
    if (category === 'Investing Strategy' || category === 'Strategy') return 'Investing';
    if (category === 'How-To Guide' || category === 'Getting Started') return 'Airbnb Arbitrage';
    return category || 'Investing';
}

/**
 * Generate the blog index page
 */
function generateBlogIndex(posts) {
    // Sort posts by date (newest first)
    const sortedPosts = posts.sort((a, b) => {
        return new Date(b.frontmatter.date) - new Date(a.frontmatter.date);
    });

    // Extract unique categories
    const categories = [...new Set(sortedPosts.map(p => normalizeCategoryForArchives(p.frontmatter.category || 'Investing')))];

    // Generate category filter HTML
    const categoryFilterHTML = categories.length > 1 ? `
                <nav class="category-filter" aria-label="Filter by category">
                    <button class="category-filter__btn active" data-category="all">All</button>
                    ${categories.map(cat => `<a class="category-filter__btn" href="/blog/category/${slugifyCategory(cat)}">${cat}</a>`).join('\n                    ')}
                </nav>` : '';

    const postCardsHTML = sortedPosts.map(post => {
        const image = post.frontmatter.image || '/assets/images/og-blog.jpg';
        const readTime = calculateReadTime(post.content);
        const category = post.frontmatter.category || 'Investing';
        const categorySlug = slugifyCategory(category);
        const date = formatDate(post.frontmatter.date);

        return `
            <a href="/blog/${post.slug}" class="minimal-post-item" data-category="${categorySlug}">
                <div class="minimal-post-image">
                    <img src="${image}" alt="${post.frontmatter.title}" loading="lazy" onerror="this.onerror=null;this.src='/assets/images/og-blog.jpg';">
                </div>
                <div class="minimal-post-content">
                    <div class="minimal-post-meta">
                        <span class="minimal-post-category">${category}</span>
                        <span class="meta-sep">·</span>
                        <time>${date}</time>
                        <span class="meta-sep">·</span>
                        <span>${readTime} min</span>
                    </div>
                    <h2 class="minimal-post-title">${post.frontmatter.title}</h2>
                    <p class="minimal-post-desc">${post.frontmatter.description || ''}</p>
                </div>
            </a>`;
    }).join('\n');

    // Featured posts (first 3 or those marked as featured)
    const featuredPosts = sortedPosts.filter(p => p.frontmatter.featured).slice(0, 3);
    const displayFeatured = featuredPosts.length > 0 ? featuredPosts : sortedPosts.slice(0, 1);

    const featuredHTML = displayFeatured.map(post => {
        const image = post.frontmatter.image || '/assets/images/og-blog.jpg';
        const readTime = calculateReadTime(post.content);

        return `
                    <a href="/blog/${post.slug}" class="block group">
                        <div class="relative overflow-hidden rounded-sm">
                            <img src="${image}"
                                 alt="${post.frontmatter.title}"
                                 class="w-full aspect-[4/3] object-cover"
                                 loading="eager"
                                 onerror="this.onerror=null;this.src='/assets/images/og-blog.jpg';">
                        </div>
                        <div class="pt-4">
                            <span class="category-label mb-2 block">Featured</span>
                            <h2 class="text-xl md:text-2xl font-semibold mb-2 text-gray-900 group-hover:text-brand-primary transition-colors">
                                ${post.frontmatter.title}
                            </h2>
                            <p class="text-sm text-brand-text-muted mb-3 line-clamp-2 max-w-2xl">
                                ${post.frontmatter.description || ''}
                            </p>
                            <div class="meta-simple">
                                <time datetime="${formatISODate(post.frontmatter.date)}">${formatDate(post.frontmatter.date)}</time>
                                <span class="mx-2">·</span>
                                <span>${readTime} min read</span>
                            </div>
                        </div>
                    </a>`;
    }).join('\n');

    const indexHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">

    <!-- Primary Meta Tags -->
    <title>Investing Blog & Case Studies | Legacy Investing Show</title>
    <meta name="title" content="Investing Blog & Case Studies | Legacy Investing Show">
    <meta name="description" content="Wealth-building strategies, investing insights, and financial freedom tips.">
    <meta name="keywords" content="wealth building, investing, real estate, financial freedom">
    <meta name="author" content="Preston Seo">
    <meta name="robots" content="index, follow">
    <meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATIONS[0]}">
    <meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATIONS[1]}">
    <link rel="canonical" href="https://www.legacyinvestingshow.com/blog">

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://www.legacyinvestingshow.com/blog">
    <meta property="og:title" content="Investing Blog & Case Studies | Legacy Investing Show">
    <meta property="og:description" content="Wealth-building strategies, investing insights, and financial freedom tips.">
    <meta property="og:image" content="https://www.legacyinvestingshow.com/assets/images/og-blog.jpg">
    <meta property="og:site_name" content="Legacy Investing Show">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@thelegacyshow">
    <meta name="twitter:title" content="Investing Blog & Case Studies | Legacy Investing Show">
    <meta name="twitter:description" content="Wealth-building strategies, investing insights, and financial freedom tips.">
    <meta name="twitter:image" content="https://www.legacyinvestingshow.com/assets/images/og-blog.jpg">

    <!-- Theme Color -->
    <meta name="theme-color" content="#ffffff">

    <!-- Favicon -->
    <link rel="icon" type="image/png" href="/assets/images/logo.png">
    <link rel="apple-touch-icon" href="/assets/images/logo.png">

    <!-- Preconnect for performance -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

    <!-- Stylesheet -->
    <link rel="stylesheet" href="/assets/css/styles.css">

    <!-- Blog Schema -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "Blog",
        "name": "Legacy Investing Show Blog",
        "description": "Wealth-building strategies and investing insights",
        "url": "https://www.legacyinvestingshow.com/blog",
        "publisher": {
            "@type": "Organization",
            "name": "Legacy Investing Show",
            "logo": {
                "@type": "ImageObject",
                "url": "https://www.legacyinvestingshow.com/assets/images/logo.png"
            }
        }
    }
    </script>

    ${renderAnalyticsHead({ gaTrackingId: GA_TRACKING_ID, gtmContainerId: GTM_CONTAINER_ID })}
</head>
<body class="bg-white text-gray-900" data-page-type="blog_index" data-page-title="Blog">
    ${renderAnalyticsBody({ gtmContainerId: GTM_CONTAINER_ID })}
    <!-- Skip to main content -->
    <a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-gray-900 text-white px-4 py-2 z-50">
        Skip to main content
    </a>

    <!-- Header -->
    <header class="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <nav class="container-custom" aria-label="Main navigation">
            <div class="flex items-center justify-between h-16">
                <a href="/" class="flex items-center gap-2 font-medium text-gray-900 hover:text-gray-700 transition-colors">
                    <img src="/assets/images/logo.png" alt="Legacy Investing Show Logo" width="28" height="28" class="w-7 h-7">
                    <span>Legacy Investing Show</span>
                </a>

                <div class="hidden md:flex items-center gap-4">
                    ${renderPrimaryNavLinks('/blog')}
                </div>

                <button id="mobile-menu-btn" class="md:hidden p-2 text-gray-700" aria-label="Open menu">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                </button>
            </div>

            <div id="mobile-menu" class="hidden md:hidden pb-4">
                <div class="flex flex-col gap-3">
                    ${renderPrimaryNavLinks('/blog')}
                </div>
            </div>
        </nav>
    </header>

    <main id="main">
        <!-- Blog Header -->
        <section class="minimal-blog-header">
            <h1 class="minimal-blog-title">Blog</h1>
            <p class="minimal-blog-subtitle">Thoughts on building wealth and financial freedom.</p>
        </section>

        <!-- Posts List -->
        <section class="minimal-posts-section">
            <div class="container-custom">
                ${categoryFilterHTML}

                <div class="minimal-posts-list">
                    ${postCardsHTML}
                </div>

                ${sortedPosts.length === 0 ? `
                <div class="minimal-empty">
                    <p>No posts yet. Check back soon.</p>
                </div>
                ` : ''}
            </div>
        </section>

        <!-- CTA -->
        <section class="minimal-cta">
            <div class="minimal-cta-content">
                <h2 class="minimal-cta-title">Turn Reading Into A Before You File Plan</h2>
                <p class="minimal-cta-text">Join Preston live on Zoom from April 17-19, 2026, 10 AM-4 PM Eastern each day. You will read the return, build the strategy stack, and leave with a dated 12-month plan for 2026.</p>
                <a href="https://go.managemoney101.com/challenge2" class="minimal-cta-button" data-track-event="cta_clicked" data-track-label="Get Your Seat Before You File" data-track-location="blog_index_cta" data-track-destination="https://go.managemoney101.com/challenge2">Get Your Seat Before You File</a>
            </div>
        </section>
    </main>

    <!-- Footer -->
    <footer class="minimal-footer">
        <div class="container-custom">
            <div class="minimal-footer-content">
                <div class="footer-brand">
                    <img src="/assets/images/logo.png" alt="Legacy Investing Show" width="32" height="32">
                    <span>Legacy Investing Show</span>
                </div>
                <div class="footer-links">
                    ${renderFooterLinks()}
                </div>
            </div>
            <div class="footer-copyright">Copyright ${CURRENT_YEAR}</div>
        </div>
    </footer>

    <script defer src="/assets/js/main.js"></script>
    <script>
        // Category filter functionality
        document.addEventListener('DOMContentLoaded', function() {
            const filterButtons = document.querySelectorAll('[data-category]');
            const postItems = document.querySelectorAll('.minimal-post-item[data-category]');

            filterButtons.forEach(btn => {
                if (btn.classList.contains('category-filter__btn')) {
                    btn.addEventListener('click', () => {
                        const category = btn.dataset.category;

                        // Update active state
                        document.querySelectorAll('.category-filter__btn').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');

                        // Filter posts
                        postItems.forEach(item => {
                            const itemCategory = item.dataset.category;
                            if (category === 'all' || itemCategory === category) {
                                item.style.display = '';
                            } else {
                                item.style.display = 'none';
                            }
                        });
                    });
                }
            });
        });
    </script>
</body>
</html>`;

    return indexHTML;
}

/**
 * Generate crawlable category archive pages so category hubs exist without JS.
 */
function generateCategoryArchives(posts) {
    const sortedPosts = posts.sort((a, b) => {
        return new Date(b.frontmatter.date) - new Date(a.frontmatter.date);
    });
    const archiveDir = path.join(OUTPUT_DIR, 'category');
    ensureDir(archiveDir);
    for (const entry of fs.readdirSync(archiveDir, { withFileTypes: true })) {
        if (entry.isFile() && entry.name.endsWith('.html')) {
            fs.unlinkSync(path.join(archiveDir, entry.name));
        }
    }

    const postsByCategory = new Map();
    for (const post of sortedPosts) {
        const category = normalizeCategoryForArchives(post.frontmatter.category || 'Investing');
        if (!postsByCategory.has(category)) {
            postsByCategory.set(category, []);
        }
        postsByCategory.get(category).push(post);
    }

    for (const [category, categoryPosts] of postsByCategory.entries()) {
        const categorySlug = slugifyCategory(category);
        const description = categoryDescription(category);
        const postCardsHTML = categoryPosts.map(post => {
            const image = post.frontmatter.image || '/assets/images/og-blog.jpg';
            const readTime = calculateReadTime(post.content);
            const date = formatDate(post.frontmatter.date);

            return `
            <a href="/blog/${post.slug}" class="minimal-post-item" data-category="${categorySlug}">
                <div class="minimal-post-image">
                    <img src="${image}" alt="${post.frontmatter.title}" loading="lazy" width="320" height="180" onerror="this.onerror=null;this.src='/assets/images/og-blog.jpg';">
                </div>
                <div class="minimal-post-content">
                    <div class="minimal-post-meta">
                        <span class="minimal-post-category">${category}</span>
                        <span class="meta-sep">·</span>
                        <time datetime="${formatISODate(post.frontmatter.date)}">${date}</time>
                        <span class="meta-sep">·</span>
                        <span>${readTime} min</span>
                    </div>
                    <h2 class="minimal-post-title">${post.frontmatter.title}</h2>
                    <p class="minimal-post-desc">${post.frontmatter.description || ''}</p>
                </div>
            </a>`;
        }).join('\n');

        const archiveHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${category} Articles | Legacy Investing Show</title>
    <meta name="title" content="${category} Articles | Legacy Investing Show">
    <meta name="description" content="${description}">
    <meta name="robots" content="index, follow">
    <meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATIONS[0]}">
    <meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATIONS[1]}">
    <link rel="canonical" href="https://www.legacyinvestingshow.com/blog/category/${categorySlug}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://www.legacyinvestingshow.com/blog/category/${categorySlug}">
    <meta property="og:title" content="${category} Articles | Legacy Investing Show">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="https://www.legacyinvestingshow.com/assets/images/og-blog.jpg">
    <meta property="og:site_name" content="Legacy Investing Show">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@thelegacyshow">
    <meta name="twitter:title" content="${category} Articles | Legacy Investing Show">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="https://www.legacyinvestingshow.com/assets/images/og-blog.jpg">
    <meta name="theme-color" content="#ffffff">
    <link rel="icon" type="image/png" href="/assets/images/logo.png">
    <link rel="apple-touch-icon" href="/assets/images/logo.png">
    <link rel="stylesheet" href="/assets/css/styles.css">
    <script type="application/ld+json">
    ${JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `${category} Articles`,
        description,
        url: `https://www.legacyinvestingshow.com/blog/category/${categorySlug}`,
        isPartOf: {
            '@type': 'Blog',
            name: 'Legacy Investing Show Blog',
            url: 'https://www.legacyinvestingshow.com/blog',
        },
        mainEntity: {
            '@type': 'ItemList',
            numberOfItems: categoryPosts.length,
            itemListElement: categoryPosts.slice(0, 50).map((post, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                url: `https://www.legacyinvestingshow.com/blog/${post.slug}`,
                name: post.frontmatter.title,
            })),
        },
    }, null, 4)}
    </script>
    ${renderAnalyticsHead({ gaTrackingId: GA_TRACKING_ID, gtmContainerId: GTM_CONTAINER_ID })}
</head>
<body class="bg-white text-gray-900" data-page-type="blog_category" data-page-title="${category}">
    ${renderAnalyticsBody({ gtmContainerId: GTM_CONTAINER_ID })}
    <a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-gray-900 text-white px-4 py-2 z-50">Skip to main content</a>
    <header class="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <nav class="container-custom" aria-label="Main navigation">
            <div class="flex items-center justify-between h-16">
                <a href="/" class="flex items-center gap-2 font-medium text-gray-900 hover:text-gray-700 transition-colors">
                    <img src="/assets/images/logo.png" alt="Legacy Investing Show Logo" width="28" height="28" class="w-7 h-7">
                    <span>Legacy Investing Show</span>
                </a>
                <div class="hidden md:flex items-center gap-4">
                    ${renderPrimaryNavLinks('/blog')}
                </div>
                <button id="mobile-menu-btn" class="md:hidden p-2 text-gray-700" aria-label="Open menu">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                </button>
            </div>
            <div id="mobile-menu" class="hidden md:hidden pb-4">
                <div class="flex flex-col gap-3">
                    ${renderPrimaryNavLinks('/blog')}
                </div>
            </div>
        </nav>
    </header>
    <main id="main">
        <section class="minimal-blog-header">
            <p class="minimal-blog-subtitle"><a href="/blog">Blog</a> / Category</p>
            <h1 class="minimal-blog-title">${category}</h1>
            <p class="minimal-blog-subtitle">${description}</p>
        </section>
        <section class="minimal-posts-section">
            <div class="container-custom">
                <div class="minimal-posts-list">
                    ${postCardsHTML}
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
                    ${renderFooterLinks()}
                </div>
            </div>
            <div class="footer-copyright">Copyright ${CURRENT_YEAR}</div>
        </div>
    </footer>
    <script defer src="/assets/js/main.js"></script>
</body>
</html>`;

        fs.writeFileSync(path.join(archiveDir, `${categorySlug}.html`), archiveHTML);
    }

    return postsByCategory.size;
}

/**
 * Main build function
 */
function build() {
    console.log('Starting blog build...\n');

    // Ensure output directory exists
    ensureDir(OUTPUT_DIR);

    // Read template
    let template;
    try {
        template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
        console.log('Template loaded successfully');
    } catch (error) {
        console.error(`Error reading template: ${error.message}`);
        console.error('Please ensure templates/blog-post.html exists');
        process.exit(1);
    }

    // Get all markdown files
    const markdownFiles = getMarkdownFiles();
    console.log(`Found ${markdownFiles.length} markdown file(s)\n`);

    if (markdownFiles.length === 0) {
        console.log('No markdown files found in content/blog/');
        console.log('Creating empty blog index...\n');
    }

    // Parse all markdown posts
    const markdownPosts = markdownFiles
        .map(file => parseMarkdownFile(file))
        .filter(post => post !== null);

    // Build individual post pages from markdown
    let successCount = 0;
    let errorCount = 0;

    for (const post of markdownPosts) {
        try {
            const html = applyTemplate(template, post, markdownPosts);
            const outputPath = path.join(OUTPUT_DIR, `${post.slug}.html`);

            fs.writeFileSync(outputPath, html);
            console.log(`Built: ${post.slug}.html`);
            successCount++;
        } catch (error) {
            console.error(`Error building ${post.slug}: ${error.message}`);
            errorCount++;
        }
    }

    // Generate blog index with all posts
    try {
        const indexHTML = generateBlogIndex(markdownPosts);
        const indexPath = path.join(OUTPUT_DIR, 'index.html');
        fs.writeFileSync(indexPath, indexHTML);
        console.log(`\nBuilt: blog/index.html (${markdownPosts.length} posts)`);
        const categoryCount = generateCategoryArchives(markdownPosts);
        console.log(`Built: ${categoryCount} blog category archive(s)`);
    } catch (error) {
        console.error(`Error generating blog index: ${error.message}`);
        errorCount++;
    }

    // Summary
    console.log('\n-------------------');
    console.log('Build complete!');
    console.log(`Successfully built: ${successCount} post(s)`);
    if (errorCount > 0) {
        console.log(`Errors: ${errorCount}`);
    }
    console.log(`Total posts in index: ${markdownPosts.length}`);
    console.log('-------------------\n');
}

// Run build
build();
