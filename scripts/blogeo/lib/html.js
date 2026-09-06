'use strict';

function decodeEntities(text) {
    return String(text || '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');
}

function metaContent(html, name) {
    const named = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["'][^>]*>`, 'i');
    const reversed = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["'][^>]*>`, 'i');
    const match = html.match(named) || html.match(reversed);
    return match ? decodeEntities(match[1].trim()) : '';
}

function extractHtmlMeta(html) {
    const titleMatch = String(html || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const canonicalMatch = String(html || '').match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)
        || String(html || '').match(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
    return {
        title: titleMatch ? decodeEntities(titleMatch[1].replace(/\s+/g, ' ').trim()) : metaContent(html, 'og:title'),
        description: metaContent(html, 'description'),
        robots: metaContent(html, 'robots') || 'index, follow',
        canonical: canonicalMatch ? canonicalMatch[1].trim() : '',
        hasFaqSchema: /FAQPage/i.test(html),
        hasQuickTake: /Quick Take|TL;DR|tldr/i.test(html),
    };
}

function htmlWordCount(html) {
    const without = String(html || '')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return without ? without.split(' ').filter(Boolean).length : 0;
}

function extractHtmlHrefs(html) {
    const hrefs = [];
    const re = /href=["']([^"']+)["']/gi;
    let match = re.exec(html);
    while (match) {
        hrefs.push(match[1]);
        match = re.exec(html);
    }
    return hrefs;
}

module.exports = {
    extractHtmlMeta,
    extractHtmlMeta: extractHtmlMeta,
    htmlWordCount,
    extractHtmlHrefs,
};
