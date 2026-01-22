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
 * Convert markdown content to HTML
 */
function markdownToHTML(content) {
    return marked(content);
}

/**
 * Apply template to post data
 */
function applyTemplate(template, post) {
    const htmlContent = markdownToHTML(post.content);
    const readTime = calculateReadTime(post.content);
    const wordCount = post.content.trim().split(/\s+/).length;

    // Set default values for optional fields
    const image = post.frontmatter.image || '/assets/images/blog-default.jpg';
    const author = post.frontmatter.author || 'Preston Seo';
    const category = post.frontmatter.category || 'Investing';

    // Replace all placeholders
    let html = template
        .replace(/\{\{title\}\}/g, post.frontmatter.title || 'Untitled')
        .replace(/\{\{description\}\}/g, post.frontmatter.description || '')
        .replace(/\{\{content\}\}/g, htmlContent)
        .replace(/\{\{date\}\}/g, formatDate(post.frontmatter.date))
        .replace(/\{\{isoDate\}\}/g, formatISODate(post.frontmatter.date))
        .replace(/\{\{author\}\}/g, author)
        .replace(/\{\{category\}\}/g, category)
        .replace(/\{\{image\}\}/g, image)
        .replace(/\{\{readTime\}\}/g, readTime)
        .replace(/\{\{slug\}\}/g, post.slug)
        .replace(/\{\{wordCount\}\}/g, wordCount)
        .replace(/\{\{relatedPosts\}\}/g, '<!-- Related posts will be added here -->');

    return html;
}

/**
 * Generate the blog index page
 */
function generateBlogIndex(posts) {
    // Sort posts by date (newest first)
    const sortedPosts = posts.sort((a, b) => {
        return new Date(b.frontmatter.date) - new Date(a.frontmatter.date);
    });

    // Generate post cards HTML
    const postCardsHTML = sortedPosts.map(post => {
        const image = post.frontmatter.image || '/assets/images/blog-default.jpg';
        const readTime = calculateReadTime(post.content);
        const category = post.frontmatter.category || 'Investing';
        const date = formatDate(post.frontmatter.date);

        return `
                    <a href="/blog/${post.slug}.html" class="blog-card-minimal">
                        <div class="overflow-hidden">
                            <img src="${image}"
                                 alt="${post.frontmatter.title}"
                                 class="blog-card-minimal-image"
                                 loading="lazy">
                        </div>
                        <div class="p-5">
                            <div class="flex items-center gap-2 mb-2">
                                <span class="category-label">${category}</span>
                            </div>
                            <h2 class="text-base font-semibold mb-2 text-gray-900 group-hover:text-brand-primary transition-colors">
                                ${post.frontmatter.title}
                            </h2>
                            <div class="meta-simple">
                                <time datetime="${formatISODate(post.frontmatter.date)}">${date}</time>
                                <span class="mx-1">·</span>
                                <span>${readTime} min read</span>
                            </div>
                        </div>
                    </a>`;
    }).join('\n');

    // Featured posts (first 3 or those marked as featured)
    const featuredPosts = sortedPosts.filter(p => p.frontmatter.featured).slice(0, 3);
    const displayFeatured = featuredPosts.length > 0 ? featuredPosts : sortedPosts.slice(0, 1);

    const featuredHTML = displayFeatured.map(post => {
        const image = post.frontmatter.image || '/assets/images/blog-default.jpg';
        const readTime = calculateReadTime(post.content);

        return `
                    <a href="/blog/${post.slug}.html" class="block group">
                        <div class="relative overflow-hidden rounded-sm">
                            <img src="${image}"
                                 alt="${post.frontmatter.title}"
                                 class="w-full aspect-[4/3] object-cover"
                                 loading="eager">
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
    <title>Blog | Legacy Investing Show</title>
    <meta name="title" content="Blog | Legacy Investing Show">
    <meta name="description" content="Learn wealth-building strategies, Airbnb arbitrage tips, tax optimization, and real estate investing insights from Preston Seo and the Legacy Investing Show team.">
    <meta name="keywords" content="wealth building blog, airbnb arbitrage tips, real estate investing, tax optimization, financial freedom, Preston Seo">
    <meta name="author" content="Preston Seo">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://legacyinvestingshow.com/blog/">

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://legacyinvestingshow.com/blog/">
    <meta property="og:title" content="Blog | Legacy Investing Show">
    <meta property="og:description" content="Learn wealth-building strategies, Airbnb arbitrage tips, and real estate investing insights.">
    <meta property="og:image" content="https://legacyinvestingshow.com/assets/images/og-blog.jpg">
    <meta property="og:site_name" content="Legacy Investing Show">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@thelegacyshow">
    <meta name="twitter:title" content="Blog | Legacy Investing Show">
    <meta name="twitter:description" content="Learn wealth-building strategies, Airbnb arbitrage tips, and real estate investing insights.">
    <meta name="twitter:image" content="https://legacyinvestingshow.com/assets/images/og-blog.jpg">

    <!-- Theme Color -->
    <meta name="theme-color" content="#0a0a0a">

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
        "description": "Wealth-building strategies, Airbnb arbitrage tips, and real estate investing insights",
        "url": "https://legacyinvestingshow.com/blog/",
        "publisher": {
            "@type": "Organization",
            "name": "Legacy Investing Show",
            "logo": {
                "@type": "ImageObject",
                "url": "https://legacyinvestingshow.com/assets/images/logo.png"
            }
        }
    }
    </script>

    <!-- Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'GA_MEASUREMENT_ID');
    </script>
</head>
<body class="bg-white text-gray-900">
    <!-- Skip to main content for accessibility -->
    <a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-brand-primary text-white px-4 py-2 rounded-lg z-50">
        Skip to main content
    </a>

    <!-- Header / Navigation -->
    <header class="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-brand-border">
        <nav class="container-custom" aria-label="Main navigation">
            <div class="flex items-center justify-between h-16 md:h-20">
                <!-- Logo -->
                <a href="/" class="flex items-center gap-2 text-gray-900 font-bold text-lg hover:text-brand-primary transition-colors">
                    <img src="/assets/images/logo.png" alt="Legacy Investing Show Logo" width="32" height="32" class="w-8 h-8">
                    <span>Preston Seo | Legacy Investing Show</span>
                </a>

                <!-- Desktop Navigation -->
                <div class="hidden md:flex items-center gap-8">
                    <a href="/" class="nav-link">Home</a>
                    <a href="/about.html" class="nav-link">About</a>
                    <a href="/programs.html" class="nav-link">Programs</a>
                    <a href="/success-stories.html" class="nav-link">Student Results</a>
                    <a href="/blog/" class="nav-link nav-link-active">Blog</a>
                </div>

                <!-- Mobile Menu Button -->
                <button id="mobile-menu-btn" class="md:hidden p-2 text-gray-900" aria-label="Open menu" aria-expanded="false">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                </button>
            </div>

            <!-- Mobile Navigation -->
            <div id="mobile-menu" class="hidden md:hidden pb-4">
                <div class="flex flex-col gap-4">
                    <a href="/" class="nav-link">Home</a>
                    <a href="/about.html" class="nav-link">About</a>
                    <a href="/programs.html" class="nav-link">Programs</a>
                    <a href="/success-stories.html" class="nav-link">Student Results</a>
                    <a href="/blog/" class="nav-link nav-link-active">Blog</a>
                </div>
            </div>
        </nav>
    </header>

    <main id="main" role="main">
        <!-- Hero Section - Minimal -->
        <section class="pt-28 md:pt-32 pb-12 md:pb-16">
            <div class="container-custom">
                <div class="text-center max-w-2xl mx-auto">
                    <h1 class="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
                        Blog
                    </h1>
                    <p class="text-base text-brand-text-muted">
                        Wealth building strategies, Airbnb arbitrage tips, and real estate investing insights.
                    </p>
                </div>
            </div>
        </section>

        ${displayFeatured.length > 0 ? `
        <!-- Featured Post -->
        <section class="pb-12 md:pb-16">
            <div class="container-custom">
                ${featuredHTML}
            </div>
        </section>
        ` : ''}

        <!-- All Posts -->
        <section class="section">
            <div class="container-custom">
                <h2 class="text-lg font-semibold mb-8 text-gray-900">Latest Articles</h2>

                <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    ${postCardsHTML}
                </div>

                ${sortedPosts.length === 0 ? `
                <div class="text-center py-12">
                    <p class="text-brand-text-muted text-lg">
                        No blog posts yet. Check back soon for new content!
                    </p>
                </div>
                ` : ''}
            </div>
        </section>

        <!-- CTA Section - Minimal -->
        <section class="cta-minimal">
            <div class="container-custom">
                <h2 class="text-lg font-semibold mb-2 text-gray-900">
                    Want to learn more?
                </h2>
                <p class="text-sm text-brand-text-muted mb-4 max-w-xl mx-auto">
                    Join my 3-Day Challenge and learn strategies that helped me build a $20M+ portfolio.
                </p>
                <a href="https://www.managemoney101.com/challengeoptin" class="btn-outline-minimal">
                    Join 3-Day Challenge
                </a>
            </div>
        </section>
    </main>

    <!-- Footer -->
    <footer class="bg-gray-50 border-t border-brand-border py-12" role="contentinfo">
        <div class="container-custom">
            <div class="grid md:grid-cols-3 gap-8 mb-8">
                <!-- Brand -->
                <div>
                    <h4 class="text-xl font-bold mb-4 text-gray-900">Preston Seo | Legacy Investing Show</h4>
                    <p class="text-brand-text-muted text-sm">Building generational wealth through smart investing strategies.</p>
                </div>

                <!-- Navigation -->
                <div>
                    <h5 class="font-semibold mb-4 text-gray-900">Information</h5>
                    <nav aria-label="Footer navigation">
                        <ul class="space-y-2 text-brand-text-muted">
                            <li><a href="/programs.html" class="hover:text-gray-900 transition-colors">Programs</a></li>
                            <li><a href="/success-stories.html" class="hover:text-gray-900 transition-colors">Student Results</a></li>
                            <li><a href="/#faq" class="hover:text-gray-900 transition-colors">FAQ's</a></li>
                            <li><a href="/blog/" class="hover:text-gray-900 transition-colors">Blog</a></li>
                        </ul>
                    </nav>
                </div>

                <!-- Social -->
                <div>
                    <h5 class="font-semibold mb-4 text-gray-900">Socials</h5>
                    <ul class="space-y-2 text-brand-text-muted">
                        <li>
                            <a href="https://www.instagram.com/thelegacyinvestingshow/" target="_blank" rel="noopener" class="hover:text-gray-900 transition-colors">
                                Instagram - 1.5M Followers
                            </a>
                        </li>
                        <li>
                            <a href="https://www.youtube.com/@LegacyInvestingShow" target="_blank" rel="noopener" class="hover:text-gray-900 transition-colors">
                                YouTube - 542k Subscribers
                            </a>
                        </li>
                        <li>
                            <a href="https://www.tiktok.com/@thelegacyinvestingshow" target="_blank" rel="noopener" class="hover:text-gray-900 transition-colors">
                                TikTok - 2.6M Followers
                            </a>
                        </li>
                        <li>
                            <a href="https://www.facebook.com/share/19LQhE6gmh/" target="_blank" rel="noopener" class="hover:text-gray-900 transition-colors">
                                Facebook - 2.4M Followers
                            </a>
                        </li>
                    </ul>
                </div>
            </div>

            <div class="border-t border-brand-border pt-8 text-center text-brand-text-muted text-sm">
                <p>Copyright &copy; 2025 - All Rights Reserved</p>
            </div>
        </div>
    </footer>

    <!-- Minimal JavaScript -->
    <script defer src="/assets/js/main.js"></script>
</body>
</html>`;

    return indexHTML;
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

    // Parse all posts
    const posts = markdownFiles
        .map(file => parseMarkdownFile(file))
        .filter(post => post !== null);

    // Build individual post pages
    let successCount = 0;
    let errorCount = 0;

    for (const post of posts) {
        try {
            const html = applyTemplate(template, post);
            const outputPath = path.join(OUTPUT_DIR, `${post.slug}.html`);

            fs.writeFileSync(outputPath, html);
            console.log(`Built: ${post.slug}.html`);
            successCount++;
        } catch (error) {
            console.error(`Error building ${post.slug}: ${error.message}`);
            errorCount++;
        }
    }

    // Generate blog index
    try {
        const indexHTML = generateBlogIndex(posts);
        const indexPath = path.join(OUTPUT_DIR, 'index.html');
        fs.writeFileSync(indexPath, indexHTML);
        console.log('\nBuilt: blog/index.html');
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
    console.log('-------------------\n');
}

// Run build
build();
