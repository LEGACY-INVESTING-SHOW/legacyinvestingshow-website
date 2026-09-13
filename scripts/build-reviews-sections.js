#!/usr/bin/env node
/**
 * Writes the two generated blocks of reviews.html:
 *
 *   <!-- reviews:wealth-plans:start --> ... <!-- reviews:wealth-plans:end -->
 *   <!-- reviews:trustpilot:start -->   ... <!-- reviews:trustpilot:end -->
 *
 * Wealth plan snapshots come from data/lwb-proof-images.json.
 * Trustpilot comes from data/trustpilot-reviews.json and
 * data/trustpilot-summary.json. If either Trustpilot file is missing the
 * block is written empty and the section renders nothing.
 *
 * Everything outside the markers is hand-written source and is left alone.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PAGE = path.join(ROOT, 'reviews.html');
const TRUSTPILOT_URL = 'https://www.trustpilot.com/review/firstairbnb.com';

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

function searchable(text) {
    return String(text == null ? '' : text).toLowerCase().replace(/\s+/g, ' ').trim();
}

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

/* ---------------------------------------------------------------- helpers */

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

/* --------------------------------------------------- wealth plan snapshots */

/**
 * A snapshot links to a wealth plan post only when the caption names a person
 * who has a post. Nearly every snapshot has the client name redacted, so most
 * of them carry no link. That is deliberate: no guessing.
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

/**
 * The featured row above the snapshot grid: five full pages from one member
 * wealth plan, cleared for public use. They carry the same data attributes as
 * the snapshots so the filter pills count them and the lightbox opens them.
 */
function buildSamplePages(images) {
    const pages = ((images && images.samplePages) || []).filter(function (page) {
        return page && page.path;
    });
    if (!pages.length) return '';

    const cards = pages.map(function (page, index) {
        const caption = page.caption || 'Sample page from a Legacy Wealth Blueprint wealth plan.';
        const alt = page.alt || ('Legacy Wealth Blueprint wealth plan sample page: ' + caption);
        const search = searchable('wealth plan sample page legacy wealth blueprint ' + caption);
        return ''
            + '\n                            <figure class="rv-snap rv-sample" data-program="lwb" data-type="wealth-plan" data-search="'
            + esc(search) + '">'
            + '\n                                <button type="button" class="rv-snap__open" data-full="' + esc(page.path)
            + '" data-caption="' + esc(caption) + '" data-width="' + esc(page.width || '')
            + '" data-height="' + esc(page.height || '') + '">'
            + '\n                                    <img src="' + esc(page.path) + '" alt="' + esc(alt) + '" width="'
            + esc(page.width || 1408) + '" height="' + esc(page.height || 1822)
            + '" loading="' + (index === 0 ? 'eager' : 'lazy')
            + '" decoding="async" sizes="(min-width: 1100px) 30vw, (min-width: 720px) 45vw, 92vw">'
            + '\n                                    <span class="rv-snap__cue">Enlarge</span>'
            + '\n                                </button>'
            + '\n                                <figcaption class="rv-snap__cap">' + esc(caption) + '</figcaption>'
            + '\n                            </figure>';
    }).join('');

    return ''
        + '\n                    <div class="rv-samples" data-rv-samples>'
        + '\n                        <h3 class="rv-samples__head">Inside a Legacy Wealth Blueprint wealth plan</h3>'
        + '\n                        <p class="rv-samples__note">These five pages come from one member wealth plan, with the name blacked out.</p>'
        + '\n                        <div class="rv-samplegrid">' + cards + '\n                        </div>'
        + '\n                    </div>';
}

function buildWealthPlans() {
    const images = readJson('data/lwb-proof-images.json');
    const inventory = readJson('data/wealth-plan-inventory.json');
    const plans = (inventory && inventory.wealthPlans) || [];
    const samples = buildSamplePages(images);
    const snapshots = ((images && images.images) || []).filter(function (image) {
        return image.kind === 'wealth-plan' && image.path;
    });
    if (!snapshots.length) return samples ? samples + '\n                ' : '\n';

    const cards = snapshots.map(function (image) {
        const caption = image.caption || 'Wealth plan page from a Legacy Wealth Blueprint client plan.';
        const alt = 'Legacy Wealth Blueprint wealth plan snapshot: ' + caption;
        const post = matchWealthPlanPost(caption, plans);
        const figures = (image.legibleFigures || []).join(' ');
        const search = searchable('wealth plan snapshot client result ' + caption + ' ' + figures
            + (post ? ' ' + post.name + ' ' + post.title : ''));
        const link = post
            ? '\n                            <a class="rv-snap__link" href="/blog/' + esc(post.slug) + '">Read '
                + esc(post.name) + '&rsquo;s wealth plan case study</a>'
            : '';
        return ''
            + '\n                        <figure class="rv-snap" data-program="lwb" data-type="wealth-plan" data-search="'
            + esc(search) + '">'
            + '\n                            <button type="button" class="rv-snap__open" data-full="' + esc(image.path)
            + '" data-caption="' + esc(caption) + '" data-width="' + esc(image.width || '')
            + '" data-height="' + esc(image.height || '') + '">'
            + '\n                                <img src="' + esc(image.path) + '" alt="' + esc(alt) + '" width="'
            + esc(image.width || 920) + '" height="' + esc(image.height || 550)
            + '" loading="lazy" decoding="async" sizes="(min-width: 760px) 30vw, 45vw">'
            + '\n                                <span class="rv-snap__cue">Enlarge</span>'
            + '\n                            </button>'
            + '\n                            <figcaption class="rv-snap__cap">' + esc(caption) + '</figcaption>'
            + link
            + '\n                        </figure>';
    }).join('');

    return samples + '\n                    <div class="rv-snapgrid">' + cards + '\n                    </div>\n                ';
}

/* ------------------------------------------------------------- trustpilot */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function shortDate(value) {
    const date = new Date(value);
    if (isNaN(date.getTime())) return { iso: '', label: '' };
    return {
        iso: date.toISOString().slice(0, 10),
        label: MONTHS[date.getUTCMonth()] + ' ' + date.getUTCDate() + ', ' + date.getUTCFullYear()
    };
}

function imageSrc(image) {
    const raw = typeof image === 'string' ? image : (image && (image.path || image.src || image.file));
    if (!raw) return null;
    if (raw.indexOf('http') === 0 || raw.indexOf('/') === 0) return raw;
    if (raw.indexOf('assets/') === 0) return '/' + raw;
    return '/assets/images/reviews/trustpilot/' + raw;
}

function starSplit(distribution) {
    if (!distribution) return '';
    const order = [['five', 'five star'], ['four', 'four star'], ['three', 'three star'],
        ['two', 'two star'], ['one', 'one star']];
    const parts = order.map(function (pair) {
        const bucket = distribution[pair[0]];
        if (!bucket || !bucket.percentDisplayed) return null;
        return bucket.percentDisplayed + '% ' + pair[1];
    }).filter(Boolean);
    return parts.join(', ');
}

function buildTrustpilot() {
    const summary = readJson('data/trustpilot-summary.json');
    const reviews = asArray(readJson('data/trustpilot-reviews.json'));
    if (!summary || !reviews.length) return '\n';

    const score = pick(summary, ['trustScore', 'ratingValue', 'rating', 'score']);
    const count = pick(summary, ['totalReviews', 'reviewCount', 'count', 'total']);
    const profile = pick(summary, ['sourceUrl', 'url', 'profileUrl', 'link']) || TRUSTPILOT_URL;
    const split = starSplit(summary.starDistribution);

    let out = '';

    if (score && count) {
        out += '\n                    <p class="rv-tp-summary">TrustScore <b>' + esc(score) + '</b> out of 5 from '
            + '<a href="' + esc(profile) + '" rel="nofollow noopener" target="_blank">' + esc(count)
            + ' Trustpilot reviews</a>'
            + (split ? ': ' + esc(split) : '') + '. We do not control that page.</p>';
    }

    const cards = reviews.map(function (review) {
        const src = imageSrc(pick(review, ['image', 'screenshot', 'path', 'file', 'src']));
        if (!src) return '';
        const title = pick(review, ['title', 'heading', 'headline']) || '';
        const body = pick(review, ['text', 'body', 'review', 'content']) || '';
        const author = pick(review, ['name', 'author', 'reviewer', 'consumer']) || 'Trustpilot reviewer';
        const authorName = typeof author === 'object' ? (author.name || 'Trustpilot reviewer') : author;
        const rating = pick(review, ['rating', 'stars', 'ratingValue', 'score']);
        const when = shortDate(pick(review, ['publishedDate', 'date', 'datePublished', 'published']));
        const permalink = pick(review, ['reviewUrl', 'url', 'permalink', 'link', 'href']) || profile;
        const image = review.image && typeof review.image === 'object' ? review.image : {};
        const width = image.width || pick(review, ['width', 'imageWidth']);
        const height = image.height || pick(review, ['height', 'imageHeight']);
        const alt = [title, body].filter(Boolean).join(' ').trim() || 'Trustpilot review screenshot';
        const dims = width && height ? ' width="' + esc(width) + '" height="' + esc(height) + '"' : '';
        const search = searchable('trustpilot review ' + authorName + ' ' + title + ' ' + body);

        return ''
            + '\n                        <figure class="rv-tp" data-program="all" data-type="trustpilot" data-search="'
            + esc(search) + '">'
            + '\n                            <img class="rv-tp__shot" src="' + esc(src) + '" alt="' + esc(alt)
            + '"' + dims + ' loading="lazy" decoding="async" sizes="(min-width: 820px) 34rem, 92vw">'
            + '\n                            <figcaption class="rv-tp__cap"><span class="rv-tp__name">'
            + esc(authorName) + '</span>'
            + (rating ? '<span class="rv-tp__stars">' + esc(rating) + ' out of 5 stars</span>' : '')
            + (when.label ? '<time datetime="' + esc(when.iso) + '">' + esc(when.label) + '</time>' : '')
            + '<a href="' + esc(permalink) + '" rel="nofollow noopener" target="_blank">Read it on Trustpilot</a>'
            + '</figcaption>'
            + '\n                        </figure>';
    }).join('');

    out += '\n                    <div class="rv-tpgrid">' + cards + '\n                    </div>';

    if (score && count) {
        const schema = {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Legacy Investing Show By Preston Seo',
            url: profile,
            description: 'Trustpilot profile for the Legacy Investing Show brand.',
            aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: String(score),
                reviewCount: String(count),
                bestRating: '5',
                worstRating: '1',
                author: { '@type': 'Organization', name: 'Trustpilot' }
            }
        };
        out += '\n                    <script type="application/ld+json">\n'
            + JSON.stringify(schema, null, 4).replace(/^/gm, '                    ')
            + '\n                    </script>';
    }

    return out + '\n                ';
}

/* ------------------------------------------- filter counts for JS-off use */

/**
 * The numbers on the filter pills. JavaScript recalculates them on load, so
 * these are the fallback, and they have to be right for the Trustpilot pill,
 * whose card count is only known once this script has run.
 */
function updateCounts(html) {
    const tallies = {};
    const tags = html.match(/<(?:article|figure)[^>]*\sdata-program="[^"]*"[^>]*>/g) || [];
    tags.forEach(function (tag) {
        const program = (tag.match(/data-program="([^"]*)"/) || [])[1];
        const type = (tag.match(/data-type="([^"]*)"/) || [])[1];
        if (program) tallies['program:' + program] = (tallies['program:' + program] || 0) + 1;
        if (type) tallies['type:' + type] = (tallies['type:' + type] || 0) + 1;
    });
    return html.replace(/(<span class="rv-count" data-count-for="([^"]+)">)\d*(<\/span>)/g,
        function (whole, open, key, close) {
            return open + (tallies[key] || 0) + close;
        });
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
    html = updateCounts(html);
    fs.writeFileSync(PAGE, html);

    const snapshotCount = (wealthPlans.match(/class="rv-snap"/g) || []).length;
    const sampleCount = (wealthPlans.match(/class="rv-snap rv-sample"/g) || []).length;
    const reviewCount = (trustpilot.match(/class="rv-tp"/g) || []).length;
    console.log('build-reviews-sections: ' + sampleCount + ' wealth plan sample pages, '
        + snapshotCount + ' wealth plan snapshots, '
        + reviewCount + ' Trustpilot reviews');
}

main();
