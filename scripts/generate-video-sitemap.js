#!/usr/bin/env node

/**
 * Video sitemap generator for Legacy Investing Show.
 *
 * Writes sitemap-video.xml: one <url> block for /reviews holding one
 * <video:video> for every record in data/reviews-videos.json. The sitemap
 * index written by scripts/generate-sitemap.js links to it.
 *
 * Only fields the repo actually holds are emitted. <video:publication_date>
 * and <video:duration> appear for the videos whose upload date and length are
 * known; for the rest they are left out rather than guessed from a blog post
 * date.
 *
 * Run with: node scripts/generate-video-sitemap.js
 */

const fs = require('fs');
const path = require('path');

const SITE_URL = process.env.SITE_URL || 'https://www.legacyinvestingshow.com';
const ROOT_DIR = path.join(__dirname, '..');
const DATA_FILE = path.join(ROOT_DIR, 'data', 'reviews-videos.json');
const OUTPUT_FILE = path.join(ROOT_DIR, 'sitemap-video.xml');
const PAGE_URL = `${SITE_URL}/reviews`;

// Google's limits for a video sitemap entry.
const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 2048;
const MAX_DURATION_SECONDS = 28800;

/**
 * Escape the five XML entities.
 * @param {string} value
 * @returns {string}
 */
function escapeXml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Keep a title inside Google's 100 character limit by dropping whole trailing
 * clauses, never by cutting a word in half.
 * @param {string} title
 * @returns {string}
 */
function fitTitle(title) {
    const text = String(title).trim();
    if (text.length <= MAX_TITLE_LENGTH) return text;

    const comma = text.lastIndexOf(',', MAX_TITLE_LENGTH);
    if (comma > MAX_TITLE_LENGTH / 2) return text.slice(0, comma).trim();

    const space = text.lastIndexOf(' ', MAX_TITLE_LENGTH);
    return text.slice(0, space > 0 ? space : MAX_TITLE_LENGTH).trim();
}

/**
 * The first one or two sentences of the summary, capped at Google's limit.
 * @param {string} summary
 * @returns {string}
 */
function buildDescription(summary) {
    const sentences = String(summary).match(/[^.!?]+[.!?]+(\s|$)/g) || [];
    let text = sentences.length ? sentences[0].trim() : String(summary).trim();
    if (text.length < 160 && sentences[1]) text += ` ${sentences[1].trim()}`;
    return text.slice(0, MAX_DESCRIPTION_LENGTH);
}

/**
 * The player URL the page's click-to-play facade inserts.
 * @param {object} record
 * @returns {string}
 */
function playerLocation(record) {
    return record.provider === 'vimeo'
        ? `https://player.vimeo.com/video/${record.id}`
        : `https://www.youtube-nocookie.com/embed/${record.id}`;
}

function thumbnailLocation(record) {
    const thumbnail = String(record.thumbnail || '');
    return thumbnail.startsWith('/') ? `${SITE_URL}${thumbnail}` : thumbnail;
}

/**
 * A YYYY-MM-DD upload date as the W3C datetime a video sitemap expects.
 * @param {string|null} uploadDate
 * @returns {string|null}
 */
function publicationDate(uploadDate) {
    if (!uploadDate) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(uploadDate)) return `${uploadDate}T00:00:00+00:00`;
    const parsed = new Date(uploadDate);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().replace(/\.\d{3}Z$/, '+00:00');
}

function readRecords() {
    if (!fs.existsSync(DATA_FILE)) {
        throw new Error(`Missing ${path.relative(ROOT_DIR, DATA_FILE)}`);
    }
    const records = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (!Array.isArray(records) || !records.length) {
        throw new Error('data/reviews-videos.json holds no records');
    }
    return records;
}

function buildVideoEntry(record) {
    const lines = [];
    lines.push('    <video:video>');
    lines.push(`      <video:thumbnail_loc>${escapeXml(thumbnailLocation(record))}</video:thumbnail_loc>`);
    lines.push(`      <video:title>${escapeXml(fitTitle(record.headlineOutcome))}</video:title>`);
    lines.push(`      <video:description>${escapeXml(buildDescription(record.summary))}</video:description>`);
    lines.push(`      <video:player_loc>${escapeXml(playerLocation(record))}</video:player_loc>`);

    const published = publicationDate(record.uploadDate);
    if (published) {
        lines.push(`      <video:publication_date>${published}</video:publication_date>`);
    }

    const duration = Number(record.durationSeconds);
    if (Number.isFinite(duration) && duration > 0 && duration <= MAX_DURATION_SECONDS) {
        lines.push(`      <video:duration>${Math.round(duration)}</video:duration>`);
    }

    lines.push('      <video:family_friendly>yes</video:family_friendly>');
    lines.push('      <video:live>no</video:live>');
    lines.push('      <video:platform relationship="allow">web mobile tv</video:platform>');
    lines.push('    </video:video>');
    return lines.join('\n');
}

/**
 * Build the sitemap XML. One <loc> for the host page, every video nested
 * inside it, which is the shape Google's video sitemap format requires.
 * @param {object[]} records
 * @returns {string}
 */
function buildVideoSitemap(records) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
    xml += '        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n';
    xml += '  <url>\n';
    xml += `    <loc>${escapeXml(PAGE_URL)}</loc>\n`;
    for (const record of records) {
        xml += `${buildVideoEntry(record)}\n`;
    }
    xml += '  </url>\n';
    xml += '</urlset>\n';
    return xml;
}

function main() {
    console.log('Generating video sitemap for Legacy Investing Show...');

    try {
        const records = readRecords();
        const xml = buildVideoSitemap(records);
        fs.writeFileSync(OUTPUT_FILE, xml, 'utf8');
        const withDates = records.filter((record) => record.uploadDate).length;
        const withDurations = records.filter((record) => record.durationSeconds).length;
        console.log(`Video sitemap entries: ${records.length}`);
        console.log(`  with publication_date: ${withDates}`);
        console.log(`  with duration: ${withDurations}`);
    } catch (error) {
        console.error('Error generating video sitemap:', error.message);
        process.exit(1);
    }
}

if (require.main === module) main();

module.exports = { buildVideoSitemap, fitTitle, publicationDate };
