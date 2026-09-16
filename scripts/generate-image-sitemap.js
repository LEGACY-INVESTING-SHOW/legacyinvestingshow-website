#!/usr/bin/env node

/**
 * Image sitemap generator for Legacy Investing Show.
 *
 * Writes sitemap-images.xml: one <url> block for /reviews holding one
 * <image:image> for every image the page serves from this site. That is the
 * four Legacy Wealth Blueprint video posters, the four wealth plan sample
 * pages, the wealth plan crops and the Trustpilot screenshots.
 *
 * Images hosted elsewhere are left out on purpose. The fifteen Airbnb posters
 * come from i.ytimg.com, and a sitemap may only list images on a host the
 * site is verified for.
 *
 * Every entry carries <image:loc>. <image:title> is the image's own alt text
 * and <image:caption> is the figcaption printed under it, or the heading of
 * the review the screenshot belongs to. Google reads only <image:loc> today,
 * but both fields are still valid sitemap markup and other crawlers read
 * them, so they are written where the page actually holds the text.
 *
 * Run with: node scripts/generate-image-sitemap.js
 */

const fs = require('fs');
const path = require('path');

const SITE_URL = process.env.SITE_URL || 'https://www.legacyinvestingshow.com';
const ROOT_DIR = path.join(__dirname, '..');
const PAGE_FILE = path.join(ROOT_DIR, 'reviews.html');
const OUTPUT_FILE = path.join(ROOT_DIR, 'sitemap-images.xml');
const PAGE_URL = `${SITE_URL}/reviews`;

// Google's ceiling for one <url> block in an image sitemap.
const MAX_IMAGES_PER_URL = 1000;

const ENTITIES = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&rsquo;': '’',
    '&lsquo;': '‘',
    '&ldquo;': '“',
    '&rdquo;': '”',
};

function escapeXml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * A fragment of page HTML as the text a reader would see.
 * @param {string} html
 * @returns {string}
 */
function toText(html) {
    return String(html == null ? '' : html)
        .replace(/<[^>]+>/g, ' ')
        .replace(/&[a-z#0-9]+;/gi, (entity) => (entity in ENTITIES ? ENTITIES[entity] : entity))
        .replace(/\s+/g, ' ')
        .replace(/\s+([,.!?;:)\]])/g, '$1')
        .trim();
}

function attribute(tag, name) {
    const found = tag.match(new RegExp(`\\s${name}="([^"]*)"`, 'i'));
    return found ? found[1] : '';
}

/**
 * The text printed with an image: the figcaption of the figure it sits in, or
 * the heading of the review its screenshot belongs to. Only the enclosing
 * item is searched, so an image never borrows the next item's words.
 * @param {string} html the whole page
 * @param {number} from the index just past the <img> tag
 * @returns {string}
 */
function captionAfter(html, from) {
    const close = [html.indexOf('</figure>', from), html.indexOf('</article>', from)]
        .filter((at) => at !== -1);
    const end = close.length ? Math.min.apply(null, close) : html.length;
    const scope = html.slice(from, end);

    const figcaption = scope.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i);
    if (figcaption) return toText(figcaption[1]);

    const heading = scope.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
    if (heading) return toText(heading[1]);

    return '';
}

/**
 * Every image reviews.html serves from this site, in page order, deduplicated
 * on the image URL.
 * @param {string} html
 * @returns {Array<{loc: string, title: string, caption: string}>}
 */
function collectImages(html) {
    const images = [];
    const seen = new Set();
    const pattern = /<img\b[^>]*>/gi;
    let tag = pattern.exec(html);

    while (tag) {
        const src = attribute(tag[0], 'src');
        // Local files only: a site can only be verified for its own host.
        if (src.startsWith('/') && !src.startsWith('//') && !seen.has(src)) {
            seen.add(src);
            images.push({
                loc: SITE_URL + src,
                title: toText(attribute(tag[0], 'alt')),
                caption: captionAfter(html, pattern.lastIndex),
            });
        }
        tag = pattern.exec(html);
    }

    return images;
}

/**
 * Warn about anything the sitemap would advertise that is not on disk.
 * @param {Array<{loc: string}>} images
 * @returns {string[]}
 */
function missingFiles(images) {
    return images
        .map((image) => image.loc.slice(SITE_URL.length))
        .filter((relative) => !fs.existsSync(path.join(ROOT_DIR, relative.replace(/^\/+/, ''))));
}

function buildImageSitemap(images) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
    xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';
    xml += '  <url>\n';
    xml += `    <loc>${escapeXml(PAGE_URL)}</loc>\n`;
    for (const image of images.slice(0, MAX_IMAGES_PER_URL)) {
        xml += '    <image:image>\n';
        xml += `      <image:loc>${escapeXml(image.loc)}</image:loc>\n`;
        if (image.title) xml += `      <image:title>${escapeXml(image.title)}</image:title>\n`;
        if (image.caption) xml += `      <image:caption>${escapeXml(image.caption)}</image:caption>\n`;
        xml += '    </image:image>\n';
    }
    xml += '  </url>\n';
    xml += '</urlset>\n';
    return xml;
}

function main() {
    console.log('Generating image sitemap for Legacy Investing Show...');

    try {
        if (!fs.existsSync(PAGE_FILE)) {
            throw new Error('reviews.html not found');
        }
        const images = collectImages(fs.readFileSync(PAGE_FILE, 'utf8'));
        if (!images.length) {
            throw new Error('reviews.html holds no local images');
        }
        if (images.length > MAX_IMAGES_PER_URL) {
            console.warn(`  ${images.length} images found, only the first ${MAX_IMAGES_PER_URL} are listed`);
        }

        const missing = missingFiles(images);
        for (const relative of missing) {
            console.warn(`  image is not on disk: ${relative}`);
        }

        fs.writeFileSync(OUTPUT_FILE, buildImageSitemap(images), 'utf8');
        console.log(`Image sitemap entries: ${Math.min(images.length, MAX_IMAGES_PER_URL)}`);
        console.log(`  with a title: ${images.filter((image) => image.title).length}`);
        console.log(`  with a caption: ${images.filter((image) => image.caption).length}`);
    } catch (error) {
        console.error('Error generating image sitemap:', error.message);
        process.exit(1);
    }
}

if (require.main === module) main();

module.exports = { buildImageSitemap, collectImages, captionAfter, missingFiles };
