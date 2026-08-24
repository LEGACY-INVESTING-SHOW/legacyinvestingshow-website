'use strict';

const matter = require('gray-matter');

function countWords(text) {
    const clean = String(text || '')
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/[#>*_`]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return clean ? clean.split(' ').filter(Boolean).length : 0;
}

function extractMarkdownLinks(body) {
    const links = [];
    const md = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match = md.exec(body);
    while (match) {
        links.push(match[2].trim());
        match = md.exec(body);
    }
    const href = /href=["']([^"']+)["']/gi;
    match = href.exec(body);
    while (match) {
        links.push(match[1].trim());
        match = href.exec(body);
    }
    return links;
}

function hasQuickTake(body) {
    return /^##\s+(Quick Take|TL;DR|TLDR)\b/im.test(body || '');
}

function replaceYamlField(raw, key, value) {
    const escaped = JSON.stringify(String(value));
    const blockRe = new RegExp(`^${key}:\\s*(?:>-?|\\|)?\\s*\\n(?:[ \\t]{2,}.+\\n)*`, 'm');
    const lineRe = new RegExp(`^${key}:\\s*.+$`, 'm');
    if (blockRe.test(raw)) return raw.replace(blockRe, `${key}: ${escaped}\n`);
    if (lineRe.test(raw)) return raw.replace(lineRe, `${key}: ${escaped}`);
    return raw.replace(/^---\n/, `---\n${key}: ${escaped}\n`);
}

function patchFrontmatter(raw, fields) {
    let next = raw;
    if (fields.title != null) next = replaceYamlField(next, 'title', fields.title);
    if (fields.description != null) next = replaceYamlField(next, 'description', fields.description);
    matter(next);
    return next;
}

function parseMarkdownPost(raw, filePath) {
    const parsed = matter(raw);
    const data = parsed.data || {};
    const seo = data.seo || {};
    const faq = Array.isArray(data.faq) ? data.faq : [];
    return {
        filePath,
        title: data.title || '',
        description: data.description || '',
        date: data.date || null,
        modifiedDate: data.modifiedDate || data.date || null,
        category: data.category || '',
        image: data.image || '',
        featured: Boolean(data.featured),
        primaryKeyword: seo.primaryKeyword || seo.primary_keyword || '',
        faqCount: faq.length,
        hasQuickTake: hasQuickTake(parsed.content || ''),
        wordCount: typeof data.wordCount === 'number' ? data.wordCount : countWords(parsed.content || ''),
        links: extractMarkdownLinks(parsed.content || ''),
        body: parsed.content || '',
        data,
    };
}

module.exports = {
    countWords,
    extractMarkdownLinks,
    extractMarkdownLinks: extractMarkdownLinks,
    hasQuickTake,
    patchFrontmatter,
    parseMarkdownPost,
    parseMarkdownPost: parseMarkdownPost,
    replaceYamlField,
};
