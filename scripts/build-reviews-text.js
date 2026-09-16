#!/usr/bin/env node

/**
 * Writes llms/reviews.txt: a plain-text mirror of /reviews for answer engines
 * and for anyone who wants the page without the markup.
 *
 * Why a .txt under /llms/ rather than /reviews.md: robots.txt disallows
 * /*.md$, so a Markdown mirror would never be fetched. /llms/ is allowed and
 * sits next to llms.txt and llms-full.txt, which the same crawlers already
 * look for.
 *
 * The file follows the owner's section order:
 *   1. Legacy Wealth Blueprint client case studies
 *   2. Written Legacy Wealth Blueprint client results
 *   3. Client results by the numbers
 *   4. Trustpilot reviews
 *   5. Airbnb client case studies
 *   6. Inside real Legacy Wealth Blueprint wealth plans
 *
 * Two labels matter and are load-bearing. A video's own words are a "Summary"
 * until data/reviews-videos.json holds a real caption track for it, and a
 * "Transcript" only once it does. An image's text is "Text of this page",
 * because it is what the page shows, not a transcript of anything spoken, and
 * is never called a transcript. Every transcript in the data file is null
 * today, so nothing in the mirror is labelled a transcript yet.
 *
 * Run with: node scripts/build-reviews-text.js
 */

const fs = require('fs');
const path = require('path');

const SITE_URL = process.env.SITE_URL || 'https://www.legacyinvestingshow.com';
const ROOT_DIR = path.join(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'llms');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'reviews.txt');
const PAGE_URL = `${SITE_URL}/reviews`;

/* ---------------------------------------------------------------- page copy */

// SPEC-copy C.0, C.1, C.3, C.4, C.5, C.6, C.7 and C.10: the strings the page
// itself publishes, kept here so the mirror and the page read the same.
const PAGE_TITLE = 'Preston Seo reviews and Legacy Investing Show client results';
const PAGE_DESCRIPTION =
    'Preston Seo reviews for Legacy Investing Show: Legacy Wealth Blueprint client case studies, '
    + 'written client results, and 4.2 on Trustpilot across 66 reviews.';
const OPENER_LINE =
    'Everything below comes from the clients themselves: their interviews, their posts, and the plans written for them.';
const WRITTEN_INTRO =
    'Posts clients wrote in the Legacy Wealth Blueprint community, with their own names and the month they posted.';
const AIRBNB_INTRO =
    'Airbnb arbitrage and short-term rental clients, with the figures each of them gives in their own interview.';

// SPEC-copy C.4. Each figure, the sentence that explains it, and the post it
// comes from.
const BY_THE_NUMBERS = [
    {
        figure: '$20,000 in taxes saved',
        sentence: 'Stephanie Dailey saved this much in taxes in her first year in the Legacy Wealth Blueprint.',
        url: `${SITE_URL}/blog/stephanie-dailey-legacy-wealth-blueprint-case-study`,
    },
    {
        figure: 'Just under $100,000 in first-year ROI',
        sentence: 'Abigail ran her own first-year ROI on the strategies she implemented and got this number.',
        url: `${SITE_URL}/blog/abigail-legacy-wealth-blueprint-case-study`,
    },
    {
        figure: '$88,000 in taxes a CPA missed',
        sentence: 'A $300,000 W-2 earner found this much through entity setup, deductions, withholding and '
            + 'retirement account sequencing after a CPA missed it.',
        url: `${SITE_URL}/blog/88k-tax-savings-cpa-missed-case-study`,
    },
    {
        figure: '$90,000 in cash flow',
        sentence: 'Chad grossed about this much in his first year running one short-term rental in North Florida, '
            + 'at about $2,500 a month in cash flow.',
        url: `${SITE_URL}/blog/chad-90k-year-one-property`,
    },
    {
        figure: '$259,700 in year-one cash freed',
        sentence: "Mia and Jay's wealth plan is built to remove $90,000 of annual tax and free this much in year one.",
        url: `${SITE_URL}/blog/mia-jay-wealth-plan`,
    },
    {
        figure: '$385,000 in year-one plan value',
        sentence: "Soojin's 2026 wealth plan runs two scenarios, $101K in the conservative case and this in the "
            + 'aggressive one.',
        url: `${SITE_URL}/blog/soojin-wealth-plan`,
    },
    {
        figure: '$118,500 to $339,760 in year-one range',
        sentence: "Andreea's plan covers a $770K severance year, and this is the year-one range on Path A.",
        url: `${SITE_URL}/blog/andreea-wealth-plan`,
    },
    {
        figure: '$78,400 in year-one ROI',
        sentence: "Josh's plan clears $38K of credit card debt through a HELOC refinance first, then builds this "
            + 'much of year-one ROI.',
        url: `${SITE_URL}/blog/josh-wealth-plan`,
    },
];

// SPEC-copy C.6. Nineteen Airbnb client case studies in page order. Four of
// them have no recorded interview, so they carry a headline and nothing else.
const AIRBNB_ORDER = [
    { videoId: '5h9iwMgZxjk' },
    { videoId: '4uvMd9WRQ_8' },
    { videoId: 'VadGzJOkDjA' },
    { videoId: '3F0fEK-Uavw' },
    { videoId: 'gwXTDLGzlAE' },
    { videoId: '5iadBvQiLKQ' },
    { videoId: 'fNpdiiyr1JU' },
    { headline: 'Alvaro signed his first property in his first week' },
    { videoId: '2T1M3T9YbkM' },
    { videoId: 'RphvRaiELn4' },
    { videoId: '-A4Pe5M0iUU' },
    { videoId: 'aT4TQi04KZQ' },
    { videoId: '9ruvPrKYmnI' },
    { videoId: 'mMihXOaE-7M' },
    { videoId: 'DvTfbzphZjo' },
    { videoId: 'aIR4MtZ3Lms' },
    { headline: 'Tyler and Jenna beat more than 400 proposals to win their lease' },
    { headline: 'Monique makes about $1,800 a month from her first Airbnb' },
    {
        headline: 'Chad grossed about $90,000 in year one from one North Florida property',
        url: `${SITE_URL}/blog/chad-90k-year-one-property`,
    },
];

/* -------------------------------------------------------------------- input */

function readJson(relative, required) {
    const file = path.join(ROOT_DIR, relative);
    if (!fs.existsSync(file)) {
        if (required) throw new Error(`Missing ${relative}`);
        console.warn(`build-reviews-text: ${relative} not found, that section will be short`);
        return null;
    }
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function asReviewArray(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.reviews)) return data.reviews;
    return [];
}

/* ------------------------------------------------------------------ helpers */

const ENTITIES = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
};

/**
 * Turn a fragment of page HTML into the text a reader would see.
 * @param {string} html
 * @returns {string}
 */
function toText(html) {
    return String(html == null ? '' : html)
        .replace(/<[^>]+>/g, ' ')
        .replace(/&[a-z#0-9]+;/gi, (entity) => (entity in ENTITIES ? ENTITIES[entity] : entity))
        .replace(/\s+/g, ' ')
        // Inline tags such as <mark> leave a space before the punctuation that
        // followed them. Close it up again.
        .replace(/\s+([,.!?;:)\]])/g, '$1')
        .replace(/([(\[])\s+/g, '$1')
        .trim();
}

function firstMatch(html, pattern) {
    const found = html.match(pattern);
    return found ? toText(found[1]) : '';
}

/**
 * The written client results are hand-written in reviews.html, so they are
 * read back out of the page rather than duplicated in a data file. If the
 * markup ever stops matching, the section degrades to a pointer instead of
 * printing something wrong.
 * @returns {object[]}
 */
function readWrittenResults() {
    const page = path.join(ROOT_DIR, 'reviews.html');
    if (!fs.existsSync(page)) return [];

    const html = fs.readFileSync(page, 'utf8');

    // Take the section that runs from the written results heading to the next
    // h2, so a change of class names does not break the extraction.
    const heading = html.search(/<h2[^>]*>\s*Written[^<]*client results\s*<\/h2>/i);
    if (heading === -1) return [];
    const after = html.slice(heading);
    const nextHeading = after.slice(1).search(/<h2[^>]*>/i);
    const section = nextHeading === -1 ? after : after.slice(0, nextHeading + 1);

    const articles = section.match(/<article\b[^>]*>[\s\S]*?<\/article>/g) || [];
    const results = [];

    for (const article of articles) {
        const headline = firstMatch(article, /<h3[^>]*>([\s\S]*?)<\/h3>/);
        const body = firstMatch(article, /<blockquote[^>]*>([\s\S]*?)<\/blockquote>/);
        const name = firstMatch(article, /<span class="rv-name"[^>]*>([\s\S]*?)<\/span>/)
            || firstMatch(article, /<cite[^>]*>([\s\S]*?)<\/cite>/);
        const date = firstMatch(article, /<time[^>]*>([\s\S]*?)<\/time>/);

        if (!body) continue;
        results.push({ headline, body, name, date });
    }

    return results;
}

/**
 * The wealth plan figures as the page renders them: image path and the
 * caption printed under it, in page order. Reading them back out of the page
 * keeps this mirror and the page on exactly the same wording.
 * @returns {Array<{file: string, path: string, caption: string}>}
 */
function readPageWealthPlanFigures() {
    const page = path.join(ROOT_DIR, 'reviews.html');
    if (!fs.existsSync(page)) return [];

    const html = fs.readFileSync(page, 'utf8');
    const start = html.indexOf('<!-- reviews:wealth-plans:start -->');
    const end = html.indexOf('<!-- reviews:wealth-plans:end -->');
    if (start === -1 || end === -1 || end < start) return [];

    const block = html.slice(start, end);
    const figures = [];
    const pattern = /data-full="([^"]+)"\s+data-caption="([^"]*)"/g;
    let found = pattern.exec(block);
    while (found) {
        figures.push({
            file: found[1].split('/').pop(),
            path: found[1],
            caption: toText(found[2]),
        });
        found = pattern.exec(block);
    }
    return figures;
}

function formatCapturedDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function watchUrl(record) {
    return record.provider === 'vimeo'
        ? `https://vimeo.com/${record.id}`
        : `https://www.youtube.com/watch?v=${record.id}`;
}

function runtime(record) {
    const seconds = Number(record.durationSeconds);
    if (!Number.isFinite(seconds) || seconds <= 0) return null;
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return `${minutes} min ${rest} sec`;
}

/* ------------------------------------------------------------------ writing */

/**
 * Print an image's visible text. Never called a transcript: it is the text the
 * page shows, transcribed from the image.
 * @param {object|undefined} record
 * @param {string[]} lines
 */
function writeImageText(record, lines) {
    if (!record) return;
    lines.push('Text of this page:');
    if (record.heading) lines.push(record.heading);
    for (const paragraph of record.paragraphs || []) {
        lines.push(paragraph);
    }
    if (record.figures && record.figures.length) {
        lines.push(`Figures on this page: ${record.figures.join(', ')}`);
    }
}

/**
 * The verbatim transcript of one interview, as paragraphs, printed only where
 * a real caption track has been fetched into the data file.
 * @param {object} record
 * @param {string[]} lines
 */
function writeTranscript(record, lines) {
    if (!record.transcript) return;
    const paragraphs = Array.isArray(record.transcript)
        ? record.transcript
        : String(record.transcript).split(/\n\s*\n/);
    const clean = paragraphs
        .map((paragraph) => String(paragraph).replace(/\s+/g, ' ').trim())
        .filter(Boolean);
    if (!clean.length) return;

    lines.push(record.transcriptSource ? `Transcript (${record.transcriptSource}):` : 'Transcript:');
    for (const paragraph of clean) {
        lines.push(paragraph);
        lines.push('');
    }
}

function videoBlock(record, lines) {
    lines.push(record.headlineOutcome);
    lines.push('');
    lines.push(`Summary: ${record.summary}`);
    lines.push('');
    for (const quote of record.keyQuotes) {
        lines.push(`Quote, ${record.person}: "${quote}"`);
    }
    lines.push('');
    writeTranscript(record, lines);
    const length = runtime(record);
    lines.push(`Interview: ${watchUrl(record)}${length ? ` (${length})` : ''}`);
    lines.push(`Written case study: ${record.postUrl}`);
    lines.push('');
}

function buildText() {
    const videos = readJson('data/reviews-videos.json', true);
    const trustpilotSummary = readJson('data/trustpilot-summary.json', true);
    const trustpilotReviews = asReviewArray(readJson('data/trustpilot-reviews.json', true));
    const proofImages = readJson('data/lwb-proof-images.json', true);
    const proofText = readJson('data/lwb-proof-images-text.json', true);

    const byId = new Map(videos.map((record) => [record.id, record]));
    const captions = new Map((proofImages.images || []).map((image) => [image.file, image.caption]));
    const written = readWrittenResults();

    const lines = [];

    lines.push(PAGE_TITLE);
    lines.push('='.repeat(PAGE_TITLE.length));
    lines.push('');
    lines.push(PAGE_DESCRIPTION);
    lines.push('');
    lines.push(`Source page: ${PAGE_URL}`);
    lines.push(OPENER_LINE);
    lines.push('');

    /* 1. Legacy Wealth Blueprint client case studies */
    lines.push('## 1. Legacy Wealth Blueprint client case studies');
    lines.push('');
    const blueprint = videos.filter((record) => record.program === 'Legacy Wealth Blueprint');
    for (const record of blueprint) {
        videoBlock(record, lines);
    }

    /* 2. Written client results */
    lines.push('## 2. Written Legacy Wealth Blueprint client results');
    lines.push('');
    lines.push(WRITTEN_INTRO);
    lines.push('');
    if (written.length) {
        for (const item of written) {
            if (item.headline) lines.push(item.headline);
            lines.push(`"${item.body}"`);
            const byline = [item.name, item.date].filter(Boolean).join(', ');
            if (byline) lines.push(byline);
            lines.push('');
        }
    } else {
        console.warn('build-reviews-text: no written client results found in reviews.html');
        lines.push(`The written client results are published on the page at ${PAGE_URL}`);
        lines.push('');
    }

    /* 3. Client results by the numbers */
    lines.push('## 3. Client results by the numbers');
    lines.push('');
    for (const item of BY_THE_NUMBERS) {
        lines.push(`${item.figure}. ${item.sentence}`);
        lines.push(item.url);
        lines.push('');
    }

    /* 4. Trustpilot */
    const stars = trustpilotSummary.starDistribution;
    lines.push('## 4. Trustpilot reviews of Legacy Investing Show');
    lines.push('');
    lines.push(
        `Trustpilot rates ${trustpilotSummary.businessDisplayName} ${trustpilotSummary.trustScore} out of 5 across `
        + `${trustpilotSummary.totalReviews} reviews, ${stars.five.percentDisplayed}% of them five star and `
        + `${stars.one.percentDisplayed}% one star. The ${trustpilotReviews.length} below are the ones captured on `
        + `${formatCapturedDate(trustpilotSummary.capturedAt)}. Preston Seo does not control that page.`
    );
    lines.push(`All ${trustpilotSummary.totalReviews} reviews: ${trustpilotSummary.sourceUrl}`);
    lines.push('');
    for (const review of trustpilotReviews) {
        if (review.title) lines.push(review.title);
        if (review.text) lines.push(`"${String(review.text).replace(/\s+/g, ' ').trim()}"`);
        const byline = [
            review.name,
            review.rating ? `${review.rating} out of 5 stars` : null,
            review.publishedDate || review.experiencedDate,
        ].filter(Boolean).join(', ');
        if (byline) lines.push(byline);
        if (review.reviewUrl) lines.push(review.reviewUrl);
        lines.push('');
    }

    /* 5. Airbnb client case studies */
    lines.push('## 5. Airbnb client case studies');
    lines.push('');
    lines.push(AIRBNB_INTRO);
    lines.push('');
    for (const entry of AIRBNB_ORDER) {
        if (entry.videoId) {
            const record = byId.get(entry.videoId);
            if (!record) {
                console.warn(`build-reviews-text: no record for video ${entry.videoId}`);
                continue;
            }
            videoBlock(record, lines);
            continue;
        }
        lines.push(entry.headline);
        if (entry.url) lines.push(`Written case study: ${entry.url}`);
        lines.push('');
    }

    /* 6. Wealth plan snapshots */
    lines.push('## 6. Inside real Legacy Wealth Blueprint wealth plans');
    lines.push('');
    lines.push(
        'Pages from wealth plans written for individual Legacy Wealth Blueprint clients, with the names blacked '
        + 'out. The text of every page is printed under it.'
    );
    lines.push('');
    const textRecords = proofText.images || [];
    const textByFile = new Map(textRecords.map((record) => [record.file, record]));
    const pageFigures = readPageWealthPlanFigures();

    // Page order where the page can be read, the data file's order otherwise.
    const figures = pageFigures.length
        ? pageFigures
        : textRecords
            .filter((record) => record.kind === 'wealth-plan')
            .map((record) => ({ file: record.file, path: record.path, caption: captions.get(record.file) || '' }));

    if (!pageFigures.length) {
        console.warn('build-reviews-text: no wealth plan figures found in reviews.html, using the data file order');
    }

    const printed = new Set();
    for (const figure of figures) {
        printed.add(figure.file);
        if (figure.caption) lines.push(figure.caption);
        lines.push(`Image: ${SITE_URL}${figure.path}`);
        writeImageText(textByFile.get(figure.file), lines);
        lines.push('');
    }

    // The remaining records are the video poster frames. Their on-screen text
    // belongs in the page as text too, so it is printed here.
    const posters = textRecords.filter((record) => !printed.has(record.file));
    if (posters.length) {
        lines.push('### Text shown in the video poster images');
        lines.push('');
        for (const poster of posters) {
            const caption = captions.get(poster.file);
            if (caption) lines.push(caption);
            lines.push(`Image: ${SITE_URL}${poster.path}`);
            writeImageText(poster, lines);
            lines.push('');
        }
    }

    /* Closing */

    return {
        text: `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`,
        counts: {
            videos: videos.length,
            written: written.length,
            trustpilot: trustpilotReviews.length,
            images: (proofText.images || []).length,
        },
    };
}

/**
 * The per-video block inside llms-full.txt. One paragraph per video, drawn
 * from the same data the page uses, so the two cannot drift apart.
 * @param {object[]} videos
 * @returns {string}
 */
function buildLlmsFullBlock(videos) {
    const lines = [];

    lines.push('The nineteen recorded client interviews published on that page, with a summary of each:');
    lines.push('');
    for (const record of videos) {
        lines.push(`- ${record.person}, ${record.program}. ${record.headlineOutcome}. ${record.summary} `
            + `Interview: ${watchUrl(record)}. Written case study: ${record.postUrl}`);
    }
    lines.push('');
    lines.push('Headline client result figures:');
    lines.push('');
    for (const item of BY_THE_NUMBERS) {
        lines.push(`- ${item.figure}: ${item.sentence} ${item.url}`);
    }

    return lines.join('\n');
}

/**
 * Rewrite the generated block in llms-full.txt between its markers.
 * @param {object[]} videos
 * @param {object} trustpilotSummary
 * @param {number} reviewCount
 */
function updateLlmsFull(videos, trustpilotSummary, reviewCount) {
    const file = path.join(ROOT_DIR, 'llms-full.txt');
    if (!fs.existsSync(file)) return false;

    const html = fs.readFileSync(file, 'utf8');
    const start = '<!-- reviews:videos:start -->';
    const end = '<!-- reviews:videos:end -->';
    const from = html.indexOf(start);
    const to = html.indexOf(end);
    if (from === -1 || to === -1 || to < from) {
        console.warn('build-reviews-text: llms-full.txt is missing the reviews:videos markers');
        return false;
    }

    const stars = trustpilotSummary.starDistribution;
    const trustpilot = `Trustpilot: TrustScore ${trustpilotSummary.trustScore} from `
        + `${trustpilotSummary.totalReviews} reviews, ${stars.five.percentDisplayed}% five star, `
        + `${stars.four.percentDisplayed}% four star, ${stars.three.percentDisplayed}% three star, `
        + `${stars.two.percentDisplayed}% two star and ${stars.one.percentDisplayed}% one star, at `
        + `${trustpilotSummary.sourceUrl}. The ${reviewCount} four and five star reviews captured on `
        + `${formatCapturedDate(trustpilotSummary.capturedAt)} are published as text on /reviews.`;

    const body = `\n\n${buildLlmsFullBlock(videos)}\n\n${trustpilot}\n\n`;
    const updated = html.slice(0, from + start.length) + body + html.slice(to);
    if (updated === html) return false;

    fs.writeFileSync(file, updated, 'utf8');
    return true;
}

function main() {
    console.log('Generating the plain-text mirror of /reviews...');

    try {
        const built = buildText();
        if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        fs.writeFileSync(OUTPUT_FILE, built.text, 'utf8');
        console.log(`Wrote llms/reviews.txt (${built.text.length} bytes)`);
        console.log(
            `  ${built.counts.videos} video summaries, ${built.counts.written} written client results, `
            + `${built.counts.trustpilot} Trustpilot reviews, ${built.counts.images} wealth plan pages`
        );

        const changed = updateLlmsFull(
            readJson('data/reviews-videos.json', true),
            readJson('data/trustpilot-summary.json', true),
            built.counts.trustpilot
        );
        console.log(changed ? 'Updated the client results block in llms-full.txt' : 'llms-full.txt already current');
    } catch (error) {
        console.error('Error generating llms/reviews.txt:', error.message);
        process.exit(1);
    }
}

if (require.main === module) main();

module.exports = { buildText, toText, readWrittenResults, buildLlmsFullBlock, writeTranscript };
