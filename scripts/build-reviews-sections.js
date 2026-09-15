#!/usr/bin/env node
/**
 * Writes the two generated blocks of reviews.html:
 *
 *   <!-- reviews:wealth-plans:start --> ... <!-- reviews:wealth-plans:end -->
 *   <!-- reviews:trustpilot:start -->   ... <!-- reviews:trustpilot:end -->
 *
 * Wealth plan pages come from data/lwb-proof-images.json (image, caption and
 * the figures that are legible on it) and data/lwb-proof-images-text.json (the
 * text transcribed off each page, published next to the image so the page is
 * readable as text and not only as a picture).
 *
 * Trustpilot comes from data/trustpilot-reviews.json and
 * data/trustpilot-summary.json, rendered as real text. If either Trustpilot
 * file is missing the block is written empty and the section renders nothing.
 *
 * Both blocks are deterministic: running this twice produces the same file.
 * Everything outside the markers is hand-written source and is left alone.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PAGE = path.join(ROOT, 'reviews.html');
const TRUSTPILOT_URL = 'https://www.trustpilot.com/review/firstairbnb.com';

/* How many items each section shows before the reveal. */
const PLANS_VISIBLE = 8;
const REVIEWS_VISIBLE = 6;

function readJson(relative) {
    const file = path.join(ROOT, relative);
    if (!fs.existsSync(file)) return null;
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
        console.warn('build-reviews-sections: could not parse ' + relative + ': ' + error.message);
        return null;
    }
}

function esc(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/* The search reads each item's own visible text, so data-rv only carries the
   few words that are true of an item but are not printed on it. */
const K_PLAN = 'wealth plan page lwb legacy wealth blueprint client document';
const K_REVIEW = 'trustpilot review rating star';

function replaceBlock(html, name, body) {
    const start = '<!-- reviews:' + name + ':start -->';
    const end = '<!-- reviews:' + name + ':end -->';
    const from = html.indexOf(start);
    const to = html.indexOf(end);
    if (from === -1 || to === -1 || to < from) {
        throw new Error('reviews.html is missing the ' + name + ' markers');
    }
    return html.slice(0, from + start.length) + body + html.slice(to);
}

function pick(source, keys) {
    for (let i = 0; i < keys.length; i += 1) {
        const value = source[keys[i]];
        if (value !== undefined && value !== null && value !== '') return value;
    }
    return null;
}

function asArray(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    const keys = ['reviews', 'items', 'results', 'data'];
    for (let i = 0; i < keys.length; i += 1) {
        if (Array.isArray(data[keys[i]])) return data[keys[i]];
    }
    return [];
}

/* One reveal, used by both sections. `body` is already indented HTML. */
function reveal(showLabel, body, gridClass) {
    return ''
        + '\n                    <details class="rv-reveal">'
        + '\n                        <summary>'
        + '\n                            <span class="rv-reveal__show">' + esc(showLabel) + '</span>'
        + '\n                            <span class="rv-reveal__hide">Show fewer</span>'
        + '\n                        </summary>'
        + '\n                        <div>'
        + '\n                            <div class="' + (gridClass || 'rv-grid rv-grid--3') + '">' + body + '\n                            </div>'
        + '\n                        </div>'
        + '\n                    </details>';
}

/* --------------------------------------------------- wealth plan captions */

/**
 * The captions in the data say what a figure is worth AND how sure the writer
 * was of it: "showing modeled first-year value from A to B". The page states
 * the figure and leaves the epistemic hedging to the one disclaimer at the
 * bottom, so these words come out and the caption becomes two plain sentences.
 */
const HEDGE = /\b(?:modeled|modelled|potential|projected|estimated)\s+/gi;
const SPLIT = /,?\s+(?:showing|stating|indicating)\s+/i;

/* The captions borrow the plan's own Title Case headings. The page is sentence
   case, so the document's section names come down to sentence case with them. */
const TITLE_CASE = [
    [/Executive Summary/g, 'executive summary'],
    [/Year-One Value/g, 'year-one value'],
    [/Year-One Financial Impact/g, 'year-one financial impact'],
    [/Core Planning Thesis/g, 'core planning thesis'],
    [/Married Filing Separately/g, 'married filing separately'],
    [/Married Filing Jointly/g, 'married filing jointly'],
    [/Head of Household/g, 'head of household'],
    [/Conservative scenario/g, 'conservative scenario'],
    [/Aggressive scenario/g, 'aggressive scenario']
];

function tidy(text) {
    let out = String(text);
    TITLE_CASE.forEach(function (pair) { out = out.replace(pair[0], pair[1]); });
    return out
        .replace(HEDGE, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/\s+([,.;])/g, '$1')
        .trim();
}

function sentence(text) {
    let out = tidy(text).replace(/[.\s]+$/, '');
    if (!out) return '';
    out = out.charAt(0).toUpperCase() + out.slice(1);
    return out + '.';
}

/**
 * The half of the caption after "showing"/"stating", turned into its own
 * sentence. The source writes these in a handful of shapes; each one gets a
 * plain verb rather than a label.
 */
function figureSentence(rest) {
    const text = tidy(rest).replace(/[.\s]+$/, '');
    const verb = function (value) { return /\bto\b|[-\u2013]\$/.test(value) ? ' runs from ' : ' is '; };
    let match;

    match = text.match(/^(?:an?\s+)?(conservative\s+|aggressive\s+)?(?:first-year|year-one)\s+(value|impact|savings)\s+(?:from|of)\s+(.+)$/i);
    if (match) {
        return sentence('The ' + (match[1] || '') + 'first-year ' + match[2] + verb(match[3]) + match[3]);
    }
    match = text.match(/^(?:an?\s+)?(?:(\d{4})\s+)?(?:first-year\s+|year-one\s+)?(value|impact|financial impact)\s+range\s+of\s+(.+)$/i);
    if (match) {
        return sentence('The ' + (match[1] ? match[1] + ' ' : 'first-year ') + match[2]
            + ' range' + verb(match[3]) + match[3]);
    }
    match = text.match(/^(?:an?\s+)?(?:total\s+)?(?:first-year|year-one)\s+(?:financial\s+)?impact\s+of\s+(.+)$/i);
    if (match) {
        return sentence('The first-year impact' + verb(match[1]) + match[1]);
    }
    match = text.match(/^(?:an?\s+)?first-year\s+tax\s+savings\s+of\s+(.+)$/i);
    if (match) {
        return sentence('The first-year tax savings' + (/\bto\b/.test(match[1]) ? ' run from ' : ' are ') + match[1]);
    }
    match = text.match(/^(?:an?\s+)?(?:roughly\s+)?([\d.]+%\s+(?:combined\s+|blended\s+)?marginal rate)\s+and\s+(?:an?\s+)?first-year\s+value\s+(?:from|of)\s+(.+)$/i);
    if (match) {
        return sentence('The plan works off a ' + match[1] + ', and the first-year value' + verb(match[2]) + match[2]);
    }
    if (text.charAt(0) === '$') return sentence('The page states ' + text);
    return sentence('The page sets out ' + text);
}

/** Two sentences at most, no hedging, no ellipsis, never truncated. */
function normalizeCaption(raw) {
    const text = String(raw || '').trim();
    if (!text) return 'Page from a Legacy Wealth Blueprint client wealth plan.';
    const at = text.search(SPLIT);
    if (at === -1) return sentence(text);
    const head = text.slice(0, at);
    const rest = text.slice(at).replace(SPLIT, '');
    const first = sentence(head);
    const second = figureSentence(rest);
    if (!second || second === '.') return first;
    return first + ' ' + second;
}

/** The subject of the page, for the alt text and the enlarge label. */
function firstClause(caption) {
    return caption.split(/[,:.]/)[0].trim();
}

/**
 * Wrap each legible figure in <mark class="fig">. The caption is escaped
 * first so the tags are the only markup in it. Longest figure first, so
 * "$300-399K" is matched before "$300".
 */
function markFigures(caption, figures, limit) {
    let out = esc(caption);
    let placed = 0;
    const cap = limit || Infinity;
    const wanted = (figures || [])
        .filter(Boolean)
        .slice()
        .sort(function (a, b) { return String(b).length - String(a).length; });
    const taken = [];
    wanted.forEach(function (figure) {
        if (placed >= cap) return;
        const needle = esc(figure);
        let from = 0;
        for (;;) {
            const at = out.indexOf(needle, from);
            if (at === -1) return;
            const clash = taken.some(function (span) { return at < span[1] && at + needle.length > span[0]; });
            if (!clash) {
                const open = '<mark class="fig">';
                out = out.slice(0, at) + open + needle + '</mark>' + out.slice(at + needle.length);
                const shift = open.length + 7;
                taken.forEach(function (span) {
                    if (span[0] > at) { span[0] += shift; span[1] += shift; }
                });
                taken.push([at, at + open.length + needle.length + 7]);
                placed += 1;
                return;
            }
            from = at + 1;
        }
    });
    // A range reads as one figure, so two marks either side of "-" or "to" join.
    return out.replace(/<\/mark>(\s*(?:-|to)\s*)<mark class="fig">/g, '$1');
}

/* ------------------------------------------------------ wealth plan pages */

/**
 * A page links to a wealth plan post only when the caption names a person who
 * has one. Nearly every page has the client name blacked out, so most of them
 * carry no link. That is deliberate: no guessing.
 */
function matchWealthPlanPost(caption, plans) {
    const text = ' ' + caption.toLowerCase() + ' ';
    let best = null;
    plans.forEach(function (plan) {
        if (!plan.name) return;
        const parts = plan.name.split(/\s*&\s*|\s+and\s+/i).map(function (part) {
            return part.trim().split(/\s+/)[0];
        }).filter(function (part) {
            return part.length > 2;
        });
        if (!parts.length) return;
        const everyPartNamed = parts.every(function (part) {
            return text.indexOf(' ' + part.toLowerCase() + ' ') !== -1
                || text.indexOf(' ' + part.toLowerCase() + "'s ") !== -1;
        });
        if (everyPartNamed && (!best || plan.name.length > best.name.length)) best = plan;
    });
    return best;
}

/** The transcript of one page, keyed by image file name. */
function transcriptIndex() {
    const data = readJson('data/lwb-proof-images-text.json');
    const index = {};
    ((data && data.images) || []).forEach(function (record) {
        if (record && record.file) index[record.file] = record;
    });
    return index;
}

/**
 * The text that is printed on the page itself, published verbatim. It is in
 * the HTML at load inside a closed <details>, so it costs no height and every
 * crawler and screen reader can reach it.
 */
function transcriptBlock(record, indent, lead) {
    if (!record) return '';
    const parts = [];
    /* The tail of the caption, so the gallery can show one sentence under the
       image without any of the caption being lost. */
    if (lead) parts.push('\n' + indent + '        <p>' + lead + '</p>');
    if (record.heading) {
        parts.push('\n' + indent + '        <p class="rv-text__h">' + esc(record.heading) + '</p>');
    }
    (record.paragraphs || []).forEach(function (paragraph) {
        if (!paragraph) return;
        parts.push('\n' + indent + '        <p>' + markFigures(paragraph, record.figures, 2) + '</p>');
    });
    if (!parts.length) return '';
    return ''
        + '\n' + indent + '<details class="rv-text">'
        + '\n' + indent + '    <summary>Text of this page</summary>'
        + '\n' + indent + '    <div class="rv-text__body">' + parts.join('') + '\n' + indent + '    </div>'
        + '\n' + indent + '</details>';
}

/* The four curated sample sections. Their captions are written by hand;
   their printed text comes from data/lwb-proof-images-text.json like every
   other page. */
const SAMPLE_CAPTIONS = {
    'section-executive-summary.webp': {
        caption: 'Executive summary from a client wealth plan: $40,400 to $53,800 in first-year tax savings across eight strategies, plus $7,200 in cash flow. The S-Corp election is the single highest-value move in the plan.',
        figures: ['$40,400', '$53,800', '$7,200']
    },
    'section-year-one-results.webp': {
        caption: 'Year-one result cards from a client wealth plan: $47,600 in tax savings, a $7,200 cash flow increase and a 1.0 BTC three-year target.',
        figures: ['$47,600', '$7,200', '1.0 BTC']
    },
    'section-solo-401k.webp': {
        caption: 'Strategy 2 in a client wealth plan is a maximum Solo 401(k) contribution, worth $20,500 to $24,500 a year, with the mechanics set out underneath.',
        figures: ['$20,500', '$24,500']
    },
    'section-backdoor-roth.webp': {
        caption: 'Strategy 7 in a client wealth plan is a backdoor Roth IRA for both spouses, at $14,000 a year in contributions, with the mechanics set out underneath.',
        figures: ['$14,000']
    }
};

/* The four sample pages run two up and carry their whole caption. The 72
   crops run four up: the caption's first sentence sits under the image and the
   rest of it opens with the page's own text, so nothing is cut. */
const LEAD_SIZES = '(min-width: 1040px) 33rem, (min-width: 760px) 45vw, 92vw';
const GALLERY_SIZES = '(min-width: 1040px) 16rem, (min-width: 760px) 30vw, 45vw';

/** Everything up to and including the first full stop, and what is left. */
function splitCaption(caption) {
    const at = String(caption).search(/\.\s+/);
    if (at === -1) return { head: caption, tail: '' };
    return { head: caption.slice(0, at + 1), tail: caption.slice(at + 1).trim() };
}

function planFigure(options) {
    const indent = options.indent;
    const caption = options.caption;
    const figures = options.figures;
    const clause = firstClause(caption);
    const alt = 'Page from a Legacy Wealth Blueprint client wealth plan, name blacked out, headed ' + clause;
    // A page cropped into a wide strip loses its heading under a cover crop, so
    // anything wider than 2:1 is shown whole on the ivory ground instead.
    const wide = Number(options.width) / Number(options.height) > 2;
    const gallery = options.gallery === true;
    const cut = gallery && options.transcript ? splitCaption(caption) : { head: caption, tail: '' };
    return ''
        + '\n' + indent + '<figure class="rv-plan' + (wide ? ' rv-plan--wide' : '') + '" data-rv="' + K_PLAN + '">'
        + '\n' + indent + '    <button type="button" class="rv-plan__open" data-full="' + esc(options.path)
        + '" data-caption="' + esc(caption) + '" data-w="' + esc(options.width) + '" data-h="' + esc(options.height) + '">'
        + '\n' + indent + '        <img src="' + esc(options.path) + '" alt="' + esc(alt) + '" width="' + esc(options.width)
        + '" height="' + esc(options.height) + '" loading="lazy" decoding="async" sizes="'
        + (gallery ? GALLERY_SIZES : LEAD_SIZES) + '">'
        + '\n' + indent + '        <span class="rv-vh">Enlarge this page</span>'
        + '\n' + indent + '    </button>'
        + '\n' + indent + '    <figcaption class="rv-plan__cap">' + markFigures(cut.head, figures) + '</figcaption>'
        + (options.link || '')
        + transcriptBlock(options.transcript, indent + '    ',
            cut.tail ? markFigures(cut.tail, figures) : '')
        + '\n' + indent + '</figure>';
}

function buildWealthPlans() {
    const images = readJson('data/lwb-proof-images.json');
    const inventory = readJson('data/wealth-plan-inventory.json');
    const plans = (inventory && inventory.wealthPlans) || [];
    const transcripts = transcriptIndex();

    const samples = ((images && images.samplePages) || []).filter(function (page) {
        return page && page.path && SAMPLE_CAPTIONS[page.file];
    }).map(function (page) {
        const written = SAMPLE_CAPTIONS[page.file];
        return {
            path: page.path,
            width: page.width || 1210,
            height: page.height || 700,
            caption: written.caption,
            figures: written.figures,
            transcript: transcripts[page.file] || null,
            link: ''
        };
    });

    const pages = ((images && images.images) || []).filter(function (image) {
        return image.kind === 'wealth-plan' && image.path;
    }).map(function (image) {
        const caption = normalizeCaption(image.caption);
        const post = matchWealthPlanPost(caption, plans);
        return {
            path: image.path,
            width: image.width || 920,
            height: image.height || 550,
            caption: caption,
            figures: image.legibleFigures || [],
            transcript: transcripts[image.file] || null,
            link: post
                ? '\n                            <p class="rv-link"><a href="/blog/' + esc(post.slug) + '">Read '
                    + esc(post.name) + '&rsquo;s wealth plan</a></p>'
                : ''
        };
    });

    if (!samples.length && !pages.length) return '\n';

    function render(list, indent, gallery) {
        return list.map(function (item) {
            return planFigure({
                indent: indent,
                path: item.path,
                width: item.width,
                height: item.height,
                caption: item.caption,
                figures: item.figures,
                transcript: item.transcript,
                link: item.link,
                gallery: gallery
            });
        }).join('');
    }

    /* The four sample pages lead, two up, because they are 1210px wide and
       legible at that size. The 72 crops follow in a compact four-up gallery. */
    let out = '';
    if (samples.length) {
        out += '\n                    <div class="rv-grid rv-grid--2 rv-plans__lead">'
            + render(samples, '                        ', false)
            + '\n                    </div>';
    }
    const head = render(pages.slice(0, PLANS_VISIBLE), '                        ', true);
    const rest = pages.slice(PLANS_VISIBLE);
    if (head) {
        out += '\n                    <div class="rv-grid rv-grid--4">' + head + '\n                    </div>';
    }
    if (rest.length) {
        out += reveal('Show the other ' + rest.length + ' wealth plan pages',
            render(rest, '                                ', true), 'rv-grid rv-grid--4');
    }
    return out + '\n                ';
}

/* ------------------------------------------------------------- trustpilot */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LONG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];

function shortDate(value) {
    const date = new Date(value);
    if (isNaN(date.getTime())) return { iso: '', label: '' };
    return {
        iso: date.toISOString().slice(0, 10),
        label: MONTHS[date.getUTCMonth()] + ' ' + date.getUTCDate() + ', ' + date.getUTCFullYear()
    };
}

function longDate(value) {
    const date = new Date(value);
    if (isNaN(date.getTime())) return '';
    return date.getUTCDate() + ' ' + LONG_MONTHS[date.getUTCMonth()] + ' ' + date.getUTCFullYear();
}

/** Five authored stars, filled to the rating. No brand green, no glyphs. */
function stars(rating, extraClass) {
    const value = Number(rating);
    if (!value) return '';
    const whole = Math.floor(value);
    const part = value - whole;
    let svg = '';
    for (let i = 1; i <= 5; i += 1) {
        let cls = 'off';
        if (i <= whole) cls = 'on';
        else if (i === whole + 1 && part > 0.02) cls = 'part';
        svg += '<svg class="' + cls + '" aria-hidden="true" focusable="false"><use href="#rv-star"></use></svg>';
    }
    return '<span class="rv-stars' + (extraClass ? ' ' + extraClass : '')
        + '" role="img" aria-label="' + value + ' out of 5 stars">' + svg + '</span>';
}

/**
 * The gradient that fills the last star to the fraction of the score. It has
 * to sit in the document, so it is written with the block that uses it.
 */
function partStop(rating) {
    const value = Number(rating);
    const at = Math.round((value - Math.floor(value)) * 100) + '%';
    return '<svg aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0">'
        + '<defs><linearGradient id="rv-star-part" x1="0" y1="0" x2="1" y2="0">'
        + '<stop offset="' + at + '" style="stop-color:var(--gold)"></stop>'
        + '<stop offset="' + at + '" style="stop-color:var(--line)"></stop>'
        + '</linearGradient></defs></svg>';
}

/** True when the review title is only the opening words of the review body. */
function titleRepeatsBody(title, body) {
    const flatten = function (text) {
        return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    };
    const head = flatten(title);
    if (!head) return true;
    return flatten(body).indexOf(head) === 0;
}

function buildTrustpilot() {
    const summary = readJson('data/trustpilot-summary.json');
    const reviews = asArray(readJson('data/trustpilot-reviews.json'));
    if (!summary || !reviews.length) return '\n';

    const score = pick(summary, ['trustScore', 'ratingValue', 'rating', 'score']);
    const count = pick(summary, ['totalReviews', 'reviewCount', 'count', 'total']);
    const profile = pick(summary, ['sourceUrl', 'url', 'profileUrl', 'link']) || TRUSTPILOT_URL;
    const name = pick(summary, ['businessDisplayName', 'name']) || 'Legacy Investing Show By Preston Seo';
    const split = summary.starDistribution || {};
    const captured = longDate(summary.capturedAt);

    let out = '';

    if (score && count) {
        /* The score, read as one mark: the number, the stars it earns, and the
           way out to the profile Preston Seo does not control. */
        out += '\n                    ' + partStop(score)
            + '\n                    <div class="rv-score">'
            + '\n                        <p class="rv-score__val">' + esc(score) + '</p>'
            + '\n                        <div class="rv-score__of">'
            + '\n                            ' + stars(score, 'rv-stars--lg')
            + '\n                            <p class="rv-score__n">' + esc(count) + ' reviews on Trustpilot</p>'
            + '\n                        </div>'
            + '\n                        <p class="rv-link rv-score__link"><a href="' + esc(profile)
            + '" rel="nofollow noopener" target="_blank">See all ' + esc(count) + ' on Trustpilot</a></p>'
            + '\n                    </div>';
        out += '\n                    <p class="rv-tp-summary">Trustpilot rates ' + esc(name) + ' ' + esc(score)
            + ' out of 5 across ' + esc(count) + ' reviews, ' + esc((split.five || {}).percentDisplayed)
            + '% of them five star and ' + esc((split.one || {}).percentDisplayed) + '% one star. The '
            + reviews.length + ' below are the ones captured on ' + esc(captured)
            + '. Preston Seo does not control that page.</p>';
    }

    const order = [['five', 'Five star'], ['four', 'Four star'], ['three', 'Three star'],
        ['two', 'Two star'], ['one', 'One star']];
    const rows = order.map(function (pair) {
        const bucket = split[pair[0]];
        if (!bucket) return '';
        const share = Number(bucket.percentDisplayed) || 0;
        return '\n                        <li>'
            + '<span class="rv-bars__lab">' + pair[1] + '</span>'
            + '<span class="rv-bars__track" aria-hidden="true">'
            + (share > 0 ? '<span class="rv-bars__fill" style="width:' + share + '%"></span>' : '')
            + '</span>'
            + '<span class="rv-bars__n">' + esc(bucket.count) + '</span>'
            + '<span class="rv-bars__p">' + esc(bucket.percentDisplayed) + '%</span>'
            + '</li>';
    }).join('');
    if (rows) {
        out += '\n                    <ul class="rv-bars">' + rows + '\n                    </ul>'
            + '\n                    <p class="rv-bars__cap">The ' + esc(count)
            + ' reviews on the Trustpilot profile, by rating.</p>';
    }

    const cards = reviews.map(function (review) {
        const title = pick(review, ['title', 'heading', 'headline']) || '';
        const body = pick(review, ['text', 'body', 'review', 'content']) || '';
        const author = pick(review, ['name', 'author', 'reviewer', 'consumer']) || 'Trustpilot reviewer';
        const authorName = typeof author === 'object' ? (author.name || 'Trustpilot reviewer') : author;
        const rating = pick(review, ['rating', 'stars', 'ratingValue', 'score']);
        const when = shortDate(pick(review, ['publishedDate', 'date', 'datePublished', 'published']));
        const permalink = pick(review, ['reviewUrl', 'url', 'permalink', 'link', 'href']) || profile;
        const quote = body || title;
        if (!quote) return '';
        const showTitle = title && body && !titleRepeatsBody(title, body);
        return function (indent) {
            return ''
                + '\n' + indent + '<article class="rv-review" data-rv="' + K_REVIEW + '">'
                + (rating ? '\n' + indent + '    <p class="rv-review__rating">' + stars(rating) + '</p>' : '')
                + (showTitle ? '\n' + indent + '    <h3>' + esc(title.trim()) + '</h3>' : '')
                + '\n' + indent + '    <blockquote><p>' + esc(quote.trim()) + '</p></blockquote>'
                + '\n' + indent + '    <p class="rv-review__by"><span class="rv-name">' + esc(authorName) + '</span>'
                + (when.label ? '<time datetime="' + esc(when.iso) + '">' + esc(when.label) + '</time>' : '')
                + '</p>'
                + '\n' + indent + '    <p class="rv-link"><a href="' + esc(permalink)
                + '" rel="nofollow noopener" target="_blank">Read on Trustpilot</a></p>'
                + '\n' + indent + '</article>';
        };
    }).filter(Boolean);

    const head = cards.slice(0, REVIEWS_VISIBLE).map(function (card) {
        return card('                        ');
    }).join('');
    out += '\n                    <div class="rv-cols">' + head + '\n                    </div>';

    const rest = cards.slice(REVIEWS_VISIBLE);
    if (rest.length) {
        out += reveal('Show the other ' + rest.length + ' Trustpilot reviews',
            rest.map(function (card) { return card('                                '); }).join(''),
            'rv-cols');
    }

    return out + '\n                ';
}

/* ------------------------------------------------------------------- main */

function main() {
    if (!fs.existsSync(PAGE)) {
        console.warn('build-reviews-sections: reviews.html not found, nothing to do');
        return;
    }
    let html = fs.readFileSync(PAGE, 'utf8');
    const wealthPlans = buildWealthPlans();
    const trustpilot = buildTrustpilot();
    html = replaceBlock(html, 'wealth-plans', wealthPlans);
    html = replaceBlock(html, 'trustpilot', trustpilot);
    fs.writeFileSync(PAGE, html);

    const planCount = (wealthPlans.match(/class="rv-plan[ "]/g) || []).length;
    const textCount = (wealthPlans.match(/class="rv-text"/g) || []).length;
    const reviewCount = (trustpilot.match(/class="rv-review"/g) || []).length;
    console.log('build-reviews-sections: ' + planCount + ' wealth plan pages ('
        + textCount + ' with their text), ' + reviewCount + ' Trustpilot reviews');
}

main();

module.exports = { normalizeCaption, markFigures, titleRepeatsBody };
