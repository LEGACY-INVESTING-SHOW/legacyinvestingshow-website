#!/usr/bin/env node
/**
 * Writes the structured data block of reviews.html:
 *
 *   <!-- reviews:schema:start --> ... <!-- reviews:schema:end -->
 *
 * One <script type="application/ld+json"> holding a single @graph:
 * Organization, Person, Course, CollectionPage, BreadcrumbList, one
 * VideoObject per record in data/reviews-videos.json, an ItemList of the four
 * Legacy Wealth Blueprint case studies, the Trustpilot citation and an
 * FAQPage.
 *
 * Two things are deliberately absent. There is no AggregateRating and there
 * are no Review nodes about the site's own programs: a review about entity A
 * published on entity A's own site is self-serving under Google's review
 * snippet policy, so the Trustpilot score is published as page text plus a
 * rating-free citation of the profile instead.
 *
 * Everything outside the markers is left alone, and the block is rewritten
 * whole on every run, so the script is idempotent.
 *
 * Usage:
 *   node scripts/build-reviews-schema.js               # writes reviews.html
 *   node scripts/build-reviews-schema.js --file PATH   # writes another copy
 *   node scripts/build-reviews-schema.js --stdout      # prints, writes nothing
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE_URL = process.env.SITE_URL || 'https://www.legacyinvestingshow.com';
const PAGE_URL = SITE_URL + '/reviews';
const TRUSTPILOT_URL = 'https://www.trustpilot.com/review/firstairbnb.com';

const ORG_ID = SITE_URL + '/#organization';
const PERSON_ID = SITE_URL + '/about/preston-seo#person';
const COURSE_ID = SITE_URL + '/legacy-wealth-blueprint#course';
const WEBPAGE_ID = PAGE_URL + '#webpage';

/* -------------------------------------------------------------- page copy */

// SPEC-copy C.0 and C.1. The schema name is the <title> and the og:title,
// which are the same string; the description is the meta description. The h1
// is a second phrasing of the same thing and is not repeated here.
const PAGE_NAME = 'Preston Seo reviews and Legacy Investing Show client results';
const PAGE_DESCRIPTION =
    'Preston Seo reviews for Legacy Investing Show: Legacy Wealth Blueprint client case studies, '
    + 'written client results, and 4.2 on Trustpilot across 66 reviews.';

// The day reviews.html was first committed:
//   git log --diff-filter=A --format=%cs -- reviews.html | tail -1
const PAGE_PUBLISHED = '2026-09-14';

// The opener line and every FAQ answer, which is the part of the page an
// assistant should read aloud when it answers a question about the brand.
const SPEAKABLE_SELECTORS = ['.opener__key', '.faq__answer'];

/* ------------------------------------------------------------------ input */

function readJson(relative) {
    const file = path.join(ROOT, relative);
    if (!fs.existsSync(file)) {
        throw new Error('build-reviews-schema: missing ' + relative);
    }
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
        throw new Error('build-reviews-schema: could not parse ' + relative + ': ' + error.message);
    }
}

function asReviewArray(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.reviews)) return data.reviews;
    return [];
}

/* ---------------------------------------------------------------- helpers */

/**
 * Seconds to an ISO 8601 duration, the form VideoObject.duration takes.
 * @param {number|null} seconds
 * @returns {string|null}
 */
function isoDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return null;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const rest = Math.floor(seconds % 60);
    let value = 'PT';
    if (hours) value += hours + 'H';
    if (minutes) value += minutes + 'M';
    if (rest || (!hours && !minutes)) value += rest + 'S';
    return value;
}

function contentUrlFor(record) {
    return record.provider === 'vimeo'
        ? 'https://vimeo.com/' + record.id
        : 'https://www.youtube.com/watch?v=' + record.id;
}

/**
 * The embed URL the page's click-to-play facade actually inserts. Google
 * treats a mismatch between markup and player as a video it cannot verify.
 */
function embedUrlFor(record) {
    return record.provider === 'vimeo'
        ? 'https://player.vimeo.com/video/' + record.id
        : 'https://www.youtube-nocookie.com/embed/' + record.id;
}

function thumbnailUrlFor(record) {
    const thumbnail = String(record.thumbnail || '');
    return thumbnail.startsWith('/') ? SITE_URL + thumbnail : thumbnail;
}

/**
 * The first one or two sentences of the summary, which is what a description
 * wants. Never longer than the summary itself and never reworded.
 */
function shortDescription(summary) {
    const sentences = String(summary).match(/[^.!?]+[.!?]+(\s|$)/g) || [];
    if (!sentences.length) return String(summary).trim();
    let text = sentences[0].trim();
    if (text.length < 160 && sentences[1]) text += ' ' + sentences[1].trim();
    return text;
}

function videoNodeId(record) {
    return PAGE_URL + '#video-' + record.id;
}

/* ------------------------------------------------------------------ nodes */

function buildVideoNodes(videos) {
    return videos.map(function (record) {
        const node = {
            '@type': 'VideoObject',
            '@id': videoNodeId(record),
            name: record.headlineOutcome,
            description: shortDescription(record.summary),
            thumbnailUrl: thumbnailUrlFor(record),
            contentUrl: contentUrlFor(record),
            embedUrl: embedUrlFor(record),
            inLanguage: 'en-US',
            isFamilyFriendly: true,
            publisher: { '@id': ORG_ID },
            subjectOf: { '@id': record.postUrl + '#article' },
        };

        // uploadDate, duration and transcript are emitted only where the repo
        // holds a real value. Nothing here is derived from a blog post date.
        const duration = isoDuration(record.durationSeconds);
        if (duration) node.duration = duration;
        if (record.uploadDate) node.uploadDate = record.uploadDate;
        // transcript takes Text, so an array of paragraphs is joined rather
        // than passed through as a list.
        if (record.transcript) {
            node.transcript = Array.isArray(record.transcript)
                ? record.transcript.join('\n\n')
                : String(record.transcript);
        }
        if (record.program === 'Legacy Wealth Blueprint') node.about = { '@id': COURSE_ID };

        return node;
    });
}

function buildCaseStudyList(manifest, videos) {
    const byVimeoId = new Map(videos.map(function (record) {
        return [record.id, record];
    }));

    return {
        '@type': 'ItemList',
        '@id': PAGE_URL + '#case-studies',
        name: 'Legacy Wealth Blueprint client case studies',
        description: 'Recorded interviews with named Legacy Wealth Blueprint clients, each with a written case study.',
        numberOfItems: manifest.length,
        itemListOrder: 'https://schema.org/ItemListUnordered',
        itemListElement: manifest.map(function (entry, index) {
            const video = byVimeoId.get(entry.vimeoId);
            const item = {
                '@type': 'ListItem',
                position: index + 1,
                name: video ? video.headlineOutcome : entry.headlineResult,
                url: entry.url,
            };
            if (video) item.item = { '@id': videoNodeId(video) };
            return item;
        }),
    };
}

/**
 * The Trustpilot profile is cited, not claimed. No rating travels with it.
 */
function buildTrustpilotCitation() {
    return {
        '@type': 'WebPage',
        '@id': PAGE_URL + '#trustpilot-citation',
        name: 'Trustpilot profile cited on this page',
        isPartOf: { '@id': WEBPAGE_ID },
        citation: {
            '@type': 'WebPage',
            name: 'Legacy Investing Show By Preston Seo on Trustpilot',
            url: TRUSTPILOT_URL,
            publisher: {
                '@type': 'Organization',
                name: 'Trustpilot',
                url: 'https://www.trustpilot.com',
            },
        },
    };
}

/**
 * SPEC-copy C.9, plus the four-and-five-star question from SPEC-seo 2.6. The
 * Trustpilot figures are read from the data files so the answers cannot drift
 * away from the block the page renders.
 */
function buildFaq(summary, reviewCount) {
    const stars = summary.starDistribution;
    const fourAndFive = (stars.five.count || 0) + (stars.four.count || 0);

    const questions = [
        [
            'Is Legacy Investing Show legit?',
            'Yes. Legacy Investing Show, LLC is a registered company based in Herriman, Utah that sells paid courses '
            + 'and coaching. The Better Business Bureau lists it under Real Estate School, and the company is not BBB '
            + 'accredited. Its main Trustpilot profile, ' + summary.businessDisplayName + ', carries a '
            + summary.trustScore + ' score across ' + summary.totalReviews + ' reviews.',
        ],
        [
            'What do Legacy Investing Show reviews say?',
            'On Trustpilot, ' + stars.five.percentDisplayed + '% of the ' + summary.totalReviews + ' reviews are five '
            + 'star, ' + stars.four.percentDisplayed + '% four star, ' + stars.three.percentDisplayed + '% three star '
            + 'and ' + stars.one.percentDisplayed + '% one star. The positive reviews name the tax strategies, the '
            + 'community and the step-by-step plan. The one-star reviews repeat four things: refunds, slow replies, a '
            + 'price that moved during the sales call, and the fact that most video testimonials are interviews '
            + 'Preston Seo records himself.',
        ],
        [
            'Why are the Trustpilot reviews shown on this page all four and five stars?',
            'Because the ' + reviewCount + ' reviews reproduced here are the four and five star ones. The full '
            + 'Trustpilot profile holds ' + summary.totalReviews + ' reviews: ' + stars.five.percentDisplayed
            + ' percent five star, ' + stars.four.percentDisplayed + ' percent four star, '
            + stars.three.percentDisplayed + ' percent three star, ' + stars.two.percentDisplayed
            + ' percent two star and ' + stars.one.percentDisplayed + ' percent one star. The one and three star '
            + 'reviews are on Trustpilot and the link to them is next to the score.',
        ],
        [
            // The page prints this one too; the markup has to cover every
            // question the section shows, in the order it shows them.
            'What do the programs cost?',
            'The Legacy Wealth Blueprint is $9,800 paid by cash or card and $10,800 through Splitit financing. '
            + 'LWB Course + AI is $1,500. Airbnb Ascension is $9,800, Airbnb Ascension Scale $18,000, STR '
            + 'Concierge $16,000 and STR Concierge Portfolio $30,000. Bundles run from $17,000 to $34,000.',
        ],
        [
            'How much did clients save with the Legacy Wealth Blueprint?',
            'The figures clients state in their own interviews are over $20,000 in first-year tax savings for '
            + 'Stephanie Dailey, just under $100,000 in first-year ROI calculated by Abigail, and 25% net worth growth '
            + 'for Albert. One published case study covers $88,000 found for a $300,000 W-2 earner after a CPA missed '
            + 'it. Wealth plans written for individual clients carry first-year targets from $36,726 to $385,000 '
            + 'depending on the household.',
        ],
        [
            'Who is Preston Seo?',
            'Preston Seo is the founder of Legacy Investing Show and the author of the Legacy Wealth Blueprint. He is '
            + '34, a first-generation Korean-American, and he started investing at 24 with a house-hacked duplex while '
            + 'working a corporate sales job. He left that job at 28 and now holds 47 rental units across 12 '
            + 'properties. He started publishing on YouTube in 2019.',
        ],
        [
            'What is in a Legacy Wealth Blueprint wealth plan?',
            'A wealth plan is written for one client and runs to about 31 pages. It opens with an executive summary '
            + 'that states the first-year value range, then sets out each strategy in turn with what it is worth and '
            + 'when to do it. Typical entries include an S-Corp election, a maximum Solo 401(k) contribution, a '
            + 'backdoor Roth IRA for both spouses, cost segregation on a short-term rental, and a debt payoff '
            + 'sequence. Seventy-six pages from real client plans are published on this page with the names blacked '
            + 'out.',
        ],
        [
            'Where are the Trustpilot and BBB pages?',
            'The main Trustpilot profile is ' + summary.businessDisplayName + ' at trustpilot.com/review/'
            + summary.identifyingName + ', with ' + summary.totalReviews + ' reviews and a ' + summary.trustScore
            + ' score. The Better '
            + 'Business Bureau profile is for Legacy Investing Show, LLC in Herriman, Utah, listed under Real Estate '
            + 'School. Preston Seo does not control either page.',
        ],
        [
            'Are these results typical?',
            'No. Every figure on this page belongs to one named client and comes either from what they said in a '
            + 'recorded interview or from the plan written for them. Income, family size, state, business activity '
            + 'and how much of the plan a client actually implements all change the outcome. Shawn’s interview is '
            + 'the clearest example: he states no figures at all, because he is at the start of his plan rather than '
            + 'the end of it.',
        ],
    ];

    if (fourAndFive !== reviewCount) {
        console.warn(
            'build-reviews-schema: Trustpilot four and five star count is ' + fourAndFive
            + ' but ' + reviewCount + ' reviews are captured. Check the four-and-five-star answer.'
        );
    }

    return {
        '@type': 'FAQPage',
        '@id': PAGE_URL + '#faq',
        name: 'Legacy Investing Show reviews: common questions',
        mainEntity: questions.map(function (pair) {
            return {
                '@type': 'Question',
                name: pair[0],
                acceptedAnswer: { '@type': 'Answer', text: pair[1] },
            };
        }),
    };
}

function buildGraph() {
    const videos = readJson('data/reviews-videos.json');
    const manifest = readJson('data/case-study-manifest.json');
    const trustpilotSummary = readJson('data/trustpilot-summary.json');
    const trustpilotReviews = asReviewArray(readJson('data/trustpilot-reviews.json'));

    if (!Array.isArray(videos) || !videos.length) {
        throw new Error('build-reviews-schema: data/reviews-videos.json holds no records');
    }

    const videoNodes = buildVideoNodes(videos);
    const caseStudies = buildCaseStudyList(manifest, videos);
    const faq = buildFaq(trustpilotSummary, trustpilotReviews.length);

    const collectionPage = {
        '@type': 'CollectionPage',
        '@id': WEBPAGE_ID,
        url: PAGE_URL,
        name: PAGE_NAME,
        description: PAGE_DESCRIPTION,
        isPartOf: { '@id': SITE_URL + '/#website' },
        // The three entities the page is about: the company, the person and
        // the program every client result on it comes from.
        about: [{ '@id': ORG_ID }, { '@id': PERSON_ID }, { '@id': COURSE_ID }],
        mentions: [{ '@id': ORG_ID }, { '@id': PERSON_ID }],
        hasPart: [{ '@id': caseStudies['@id'] }, { '@id': faq['@id'] }],
        primaryImageOfPage: { '@id': videoNodes[0]['@id'] },
        speakable: {
            '@type': 'SpeakableSpecification',
            cssSelector: SPEAKABLE_SELECTORS,
        },
        datePublished: PAGE_PUBLISHED,
        dateModified: pageLastModified(),
    };

    const breadcrumbs = {
        '@type': 'BreadcrumbList',
        '@id': PAGE_URL + '#breadcrumbs',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL + '/' },
            { '@type': 'ListItem', position: 2, name: 'Reviews and client results', item: PAGE_URL },
        ],
    };

    const organization = {
        '@type': 'Organization',
        '@id': ORG_ID,
        name: 'Legacy Investing Show',
        url: SITE_URL,
        logo: SITE_URL + '/assets/images/logo.png',
        founder: { '@id': PERSON_ID },
        sameAs: [
            'https://www.youtube.com/@LegacyInvestingShow',
            'https://www.instagram.com/thelegacyinvestingshow',
            'https://www.tiktok.com/@thelegacyinvestingshow',
            TRUSTPILOT_URL,
        ],
    };

    const person = {
        '@type': 'Person',
        '@id': PERSON_ID,
        name: 'Preston Seo',
        url: SITE_URL + '/about/preston-seo',
        jobTitle: 'Founder',
        worksFor: { '@id': ORG_ID },
        knowsAbout: ['tax strategy', 'short-term rentals', 'wealth planning', 'business structure'],
        // Only profiles the repo already links to, from about.html and
        // about/preston-seo.html. Nothing here is guessed.
        sameAs: [
            'https://www.youtube.com/@LegacyInvestingShow',
            'https://www.instagram.com/thelegacyinvestingshow/',
            'https://www.tiktok.com/@thelegacyinvestingshow',
            'https://www.linkedin.com/in/preston-seo/',
        ],
    };

    const course = {
        '@type': 'Course',
        '@id': COURSE_ID,
        name: 'Legacy Wealth Blueprint',
        url: SITE_URL + '/legacy-wealth-blueprint',
        description: 'A tax, wealth and entity-structure education program from Preston Seo, delivered with a '
            + '12-month written wealth plan built for each client.',
        provider: { '@id': ORG_ID },
    };

    return {
        '@context': 'https://schema.org',
        '@graph': [organization, person, course, collectionPage, breadcrumbs]
            .concat(videoNodes)
            .concat([caseStudies, buildTrustpilotCitation(), faq]),
    };
}

/**
 * The page's own modification date, so dateModified is never a guess.
 */
function pageLastModified() {
    const file = path.join(ROOT, 'reviews.html');
    const when = fs.existsSync(file) ? fs.statSync(file).mtime : new Date();
    return when.toISOString().split('T')[0];
}

/* ------------------------------------------------------------- validation */

function collectUrls(value, found) {
    if (typeof value === 'string') {
        if (/^https?:\/\//i.test(value)) found.push(value);
        return found;
    }
    if (Array.isArray(value)) {
        value.forEach(function (entry) { collectUrls(entry, found); });
        return found;
    }
    if (value && typeof value === 'object') {
        Object.keys(value).forEach(function (key) { collectUrls(value[key], found); });
    }
    return found;
}

const ALLOWED_HOSTS = [
    'www.legacyinvestingshow.com',
    'schema.org',
    'vimeo.com',
    'player.vimeo.com',
    'www.youtube.com',
    'www.youtube-nocookie.com',
    'i.ytimg.com',
    'www.trustpilot.com',
    'www.instagram.com',
    'www.tiktok.com',
    'www.linkedin.com',
];

function validate(graph) {
    const problems = [];
    const json = JSON.stringify(graph);

    JSON.parse(json); // the block must round-trip

    if (/aggregateRating/i.test(json)) problems.push('an AggregateRating node is present');
    if (/"@type"\s*:\s*"Review"/.test(json)) problems.push('a Review node is present');

    for (const url of collectUrls(graph, [])) {
        let host;
        try {
            host = new URL(url).host;
        } catch (error) {
            problems.push('not a URL: ' + url);
            continue;
        }
        if (!url.startsWith('https://')) problems.push('not https: ' + url);
        if (!ALLOWED_HOSTS.includes(host)) problems.push('unexpected host: ' + url);
    }

    const videoCount = graph['@graph'].filter(function (node) {
        return node['@type'] === 'VideoObject';
    }).length;
    if (!videoCount) problems.push('no VideoObject nodes');

    if (problems.length) {
        throw new Error('build-reviews-schema: ' + problems.join('; '));
    }

    return videoCount;
}

/* ---------------------------------------------------------------- writing */

function replaceBlock(html, body) {
    const start = '<!-- reviews:schema:start -->';
    const end = '<!-- reviews:schema:end -->';
    const from = html.indexOf(start);
    const to = html.indexOf(end);
    if (from === -1 || to === -1 || to < from) {
        throw new Error('build-reviews-schema: the target file is missing the reviews:schema markers');
    }
    return html.slice(0, from + start.length) + body + html.slice(to);
}

/**
 * The block is the page's machine-readable head: the JSON-LD graph, and the
 * link to the plain-text mirror scripts/build-reviews-text.js writes. Both
 * belong in <head> and both are generated, so they live between the same
 * markers.
 */
function renderBlock(graph) {
    const json = JSON.stringify(graph, null, 4)
        .split('\n')
        .map(function (line) { return line ? '    ' + line : line; })
        .join('\n');

    return '\n    <link rel="alternate" type="text/plain" href="' + SITE_URL + '/llms/reviews.txt"'
        + ' title="Plain text version of this page">\n'
        + '\n    <script type="application/ld+json">\n' + json + '\n    </script>\n    ';
}

function parseArgs(argv) {
    const options = { file: path.join(ROOT, 'reviews.html'), stdout: false };
    for (let i = 0; i < argv.length; i += 1) {
        if (argv[i] === '--file' && argv[i + 1]) {
            options.file = path.resolve(argv[i + 1]);
            i += 1;
        } else if (argv[i].startsWith('--file=')) {
            options.file = path.resolve(argv[i].slice('--file='.length));
        } else if (argv[i] === '--stdout') {
            options.stdout = true;
        }
    }
    return options;
}

function main() {
    const options = parseArgs(process.argv.slice(2));

    let graph;
    let videoCount;
    try {
        graph = buildGraph();
        videoCount = validate(graph);
    } catch (error) {
        console.error(error.message);
        process.exit(1);
        return;
    }

    if (options.stdout) {
        process.stdout.write(JSON.stringify(graph, null, 4) + '\n');
        return;
    }

    if (!fs.existsSync(options.file)) {
        console.error('build-reviews-schema: no such file: ' + options.file);
        process.exit(1);
        return;
    }

    const html = fs.readFileSync(options.file, 'utf8');
    let updated;
    try {
        updated = replaceBlock(html, renderBlock(graph));
    } catch (error) {
        console.error(error.message);
        process.exit(1);
        return;
    }

    if (updated === html) {
        console.log('Reviews schema already current in ' + path.relative(ROOT, options.file));
        return;
    }

    fs.writeFileSync(options.file, updated, 'utf8');
    console.log(
        'Reviews schema written to ' + path.relative(ROOT, options.file)
        + ': ' + graph['@graph'].length + ' nodes, ' + videoCount + ' VideoObject.'
    );
}

if (require.main === module) main();

module.exports = { buildGraph, validate, renderBlock, replaceBlock, isoDuration };
