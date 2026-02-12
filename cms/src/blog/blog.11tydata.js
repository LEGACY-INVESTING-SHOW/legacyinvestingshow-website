const fs = require('fs');

const DEFAULT_KEYWORDS = ['wealth building', 'investing', 'financial freedom'];
const CATEGORY_KEYWORDS = {
    'Airbnb Arbitrage': ['airbnb', 'arbitrage', 'short-term rental', 'passive income', 'rental property'],
    'Real Estate': ['real estate', 'property investment', 'rental income', 'property management'],
    'Tax Strategies': ['tax strategy', 'tax planning', 'tax savings', 'irs rules'],
    'Investing': ['investment strategy', 'portfolio', 'returns', 'cash flow']
};

function removeFrontmatter(markdown) {
    if (!markdown.startsWith('---\n')) {
        return markdown;
    }

    const end = markdown.indexOf('\n---\n', 4);
    if (end === -1) {
        return markdown;
    }

    return markdown.slice(end + 5);
}

function countWords(text) {
    return (text || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .filter(Boolean)
        .length;
}

function toKeywordString(data) {
    if (typeof data.keywords === 'string') {
        const value = data.keywords.trim();
        if (value) {
            return value;
        }
    }

    if (Array.isArray(data.keywords)) {
        const values = data.keywords
            .map((value) => String(value || '').trim())
            .filter(Boolean);
        if (values.length > 0) {
            return values.join(', ');
        }
    }

    if (data.seo && typeof data.seo === 'object') {
        const values = [];

        if (data.seo.primaryKeyword) {
            values.push(data.seo.primaryKeyword);
        }

        if (Array.isArray(data.seo.secondaryKeywords)) {
            values.push(...data.seo.secondaryKeywords);
        }

        if (Array.isArray(data.seo.longTailKeywords)) {
            values.push(...data.seo.longTailKeywords.slice(0, 4));
        }

        if (values.length > 0) {
            return values.join(', ');
        }
    }

    if (Array.isArray(data.tags)) {
        const values = data.tags
            .map((value) => String(value || '').trim())
            .filter(Boolean)
            .filter((value) => value.toLowerCase() !== 'blog');
        if (values.length > 0) {
            return values.join(', ');
        }
    }

    const category = data.category || '';
    const categoryKeywords = CATEGORY_KEYWORDS[category] || [];
    const combined = [category, ...categoryKeywords, ...DEFAULT_KEYWORDS]
        .filter(Boolean)
        .map((value) => String(value).trim())
        .filter(Boolean);

    return [...new Set(combined)].join(', ');
}

function toWebpPath(imagePath) {
    if (!imagePath || typeof imagePath !== 'string') {
        return '/assets/images/og-blog.webp';
    }

    return imagePath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
}

function getRawContent(data) {
    const inputPath = data.page && data.page.inputPath ? data.page.inputPath : null;
    if (!inputPath || !fs.existsSync(inputPath)) {
        return '';
    }

    return removeFrontmatter(fs.readFileSync(inputPath, 'utf8'));
}

module.exports = {
    layout: 'layouts/blog-post.njk',
    tags: ['blog'],
    eleventyComputed: {
        permalink: (data) => `blog/${data.page.fileSlug}/index.html`,
        heroImage: (data) => data.heroImage || data.image || '/assets/images/og-blog.jpg',
        imageWebp: (data) => toWebpPath(data.heroImage || data.image || '/assets/images/og-blog.jpg'),
        canonicalUrl: (data) => data.canonical || data.canonicalUrl || '',
        readTime: (data) => {
            if (data.readTime) return data.readTime;
            if (data.readingTime) return data.readingTime;
            if (data.wordCount) return Math.max(1, Math.ceil(Number(data.wordCount) / 200));

            const words = countWords(getRawContent(data));
            return Math.max(1, Math.ceil(words / 200));
        },
        stats: (data) => data.stats || data.statistics || [],
        faqs: (data) => data.faqs || data.faq || [],
        wordCount: (data) => {
            if (data.wordCount) return data.wordCount;
            return countWords(getRawContent(data));
        },
        keywords: (data) => toKeywordString(data),
        dateModified: (data) => data.modifiedDate || data.updatedAt || data.date
    }
};
