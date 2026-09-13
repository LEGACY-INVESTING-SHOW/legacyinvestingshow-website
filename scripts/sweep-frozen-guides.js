#!/usr/bin/env node

/**
 * Sweep the frozen long-form guides.
 *
 * tax-strategies/*.html and retirement/*.html are hand-written pages of 900-1700
 * lines each. They are never regenerated from a template (see shouldSkipFile in
 * build-tax-strategies.js) because the prose, worked examples and tables are the
 * ranking content. This script only replaces their shared chrome:
 *
 *   - shared header / footer from scripts/lib/site-shell.js
 *   - per-page inline <style> blocks -> /assets/css/guides.css
 *   - badge pills, hero stat rails, side-stripe callout boxes
 *   - duplicated prose FAQ where an accordion already exists
 *   - mangled hero subtitles spliced out of the meta description
 *   - skipped heading levels (h2 -> h4)
 *
 * It is idempotent: running it twice changes nothing the second time.
 */

const fs = require('fs');
const path = require('path');
const {
    renderHeadAssets,
    renderSiteFooter,
    renderSiteHeader,
} = require('./lib/site-shell');

const ROOT_DIR = path.join(__dirname, '..');
const TARGETS = [
    { dir: 'tax-strategies', activeHref: '/tax-strategies', skip: new Set(['index.html']) },
    { dir: 'retirement', activeHref: '', skip: new Set(['index.html']) },
];

const STYLESHEET_LINKS = `${renderHeadAssets()}
    <link rel="stylesheet" href="/assets/css/guides.css">`;

const FAQ_SCRIPT = `    <script>
        document.querySelectorAll('.faq-toggle').forEach(function (button) {
            button.addEventListener('click', function () {
                var expanded = button.getAttribute('aria-expanded') === 'true';
                button.setAttribute('aria-expanded', String(!expanded));
                if (button.nextElementSibling) {
                    button.nextElementSibling.classList.toggle('faq-answer--open');
                }
            });
        });
    </script>`;

function esc(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function stripTags(value = '') {
    return String(value).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Find the end index of the element that opens at `start` (an index pointing at
 * "<div" or similar), counting nested opening tags of the same name.
 */
function findBalancedEnd(html, start, tagName) {
    const open = new RegExp(`<${tagName}\\b`, 'gi');
    const close = new RegExp(`</${tagName}>`, 'gi');
    let depth = 0;
    let index = start;

    while (index < html.length) {
        open.lastIndex = index;
        close.lastIndex = index;
        const nextOpen = open.exec(html);
        const nextClose = close.exec(html);

        if (!nextClose) return -1;

        if (nextOpen && nextOpen.index < nextClose.index) {
            depth += 1;
            index = nextOpen.index + 1;
            continue;
        }

        depth -= 1;
        index = nextClose.index + nextClose[0].length;
        if (depth === 0) return index;
    }

    return -1;
}

/**
 * Replace every element whose opening tag matches `openPattern` with the result
 * of `transform(innerHtml, openTag)`. Returns the new html.
 */
function replaceElements(html, openPattern, tagName, transform) {
    let result = html;
    let guard = 0;

    for (;;) {
        openPattern.lastIndex = 0;
        const match = openPattern.exec(result);
        if (!match || guard > 200) break;
        guard += 1;

        const start = match.index;
        const end = findBalancedEnd(result, start, tagName);
        if (end === -1) break;

        const whole = result.slice(start, end);
        const inner = whole.slice(match[0].length, whole.length - (`</${tagName}>`).length);
        const replacement = transform(inner, match[0]);
        result = result.slice(0, start) + replacement + result.slice(end);
    }

    return result;
}

/* ------------------------------------------------------------------ head --- */

function sweepHead(html) {
    let out = html;

    // Dangling preconnects to Google Fonts: the faces are self-hosted now.
    out = out.replace(/\s*<!--\s*Preconnect[^>]*-->/gi, '');
    out = out.replace(/\s*<!--\s*Preconnect for performance\s*-->/gi, '');
    out = out.replace(/[ \t]*<link rel="preconnect" href="https:\/\/fonts\.(googleapis|gstatic)\.com"[^>]*>\n?/g, '');

    // Font preloads + shared stylesheet + guides stylesheet.
    if (!out.includes('/assets/css/guides.css')) {
        out = out.replace(
            /[ \t]*<link rel="stylesheet" href="\/assets\/css\/styles\.css">/,
            `    ${STYLESHEET_LINKS}`
        );
    }

    // Per-page chrome stylesheets move to guides.css.
    out = out.replace(/[ \t]*<style>[\s\S]*?<\/style>\n?/g, '');

    return out;
}

/* ------------------------------------------------------------------ body --- */

function swapHeader(html, activeHref) {
    const header = renderSiteHeader(activeHref);

    // Re-render an already-swapped header so site-shell changes propagate.
    const sharedHeader = /<header class="site-header">[\s\S]*?<\/header>/;
    if (sharedHeader.test(html)) {
        return html.replace(sharedHeader, header);
    }

    const pageHeader = /<header class="fixed[\s\S]*?<\/header>/;
    if (pageHeader.test(html)) {
        return html.replace(pageHeader, header);
    }

    // A couple of pages never had a header at all.
    const anchor = html.indexOf('</head>');
    if (anchor === -1) return html;
    const insertAt = html.indexOf('\n', anchor) + 1;
    return html.slice(0, insertAt) + `\n${header}\n` + html.slice(insertAt);
}

function swapFooter(html) {
    const footer = /<footer[\s\S]*?<\/footer>/;
    if (!footer.test(html)) return html;
    return html.replace(footer, renderSiteFooter());
}

function removeWorksheetLinks(html) {
    return html
        .replace(/[ \t]*<a [^>]*href="\/worksheets[^"]*"[^>]*>[\s\S]*?<\/a>\n?/g, '')
        .replace(/[ \t]*<li>\s*<\/li>\n?/g, '');
}

function removeFixedHeaderPadding(html) {
    return html
        .replace(/class="container-custom pt-24 pb-4"/g, 'class="container-custom"')
        .replace(/<main id="main" class="pt-20">/g, '<main id="main">')
        .replace(/class="pt-32 pb-16 md:pt-40 md:pb-24([^"]*)"/g, 'class="pt-8 pb-12 md:pt-10 md:pb-16$1"')
        .replace(/<div class="breadcrumb container-custom" style="padding-top: 5rem;">/g, '<div class="breadcrumb container-custom">');
}

function removeBadges(html) {
    return html
        .replace(/[ \t]*<span class="strategy-badge">[\s\S]*?<\/span>\n?/g, '')
        .replace(/[ \t]*<span class="badge[^"]*">[\s\S]*?<\/span>\n?/g, '')
        .replace(/[ \t]*<span class="persona-hero__badge">[\s\S]*?<\/span>\n?/g, '');
}

/** Hero stat rail -> "At a glance" definition list. */
function convertStatsGrid(html) {
    return replaceElements(html, /<div class="stats-grid">/g, 'div', (inner) => {
        const pairs = [];
        const pattern = /stat-box__label[^>]*>([\s\S]*?)<\/div>\s*<div class="stat-box__value[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
        let match;
        while ((match = pattern.exec(inner)) !== null) {
            const label = stripTags(match[1]);
            const value = stripTags(match[2]);
            if (label && value) pairs.push([label, value]);
        }
        if (!pairs.length) return '';

        return `<dl class="guide-dl">
${pairs.map(([label, value]) => `                        <div>
                            <dt>${esc(label)}</dt>
                            <dd>${esc(value)}</dd>
                        </div>`).join('\n')}
                    </dl>`;
    });
}

/** Big-number + tiny-label pairs -> one labelled figure line. */
function convertFigureStacks(html) {
    return html.replace(
        /<div class="text-sm[^"]*">([^<]{2,80})<\/div>\s*<div class="text-(?:lg|xl|2xl|3xl|4xl) font-(?:bold|semibold)[^"]*">([\s\S]{1,120}?)<\/div>/g,
        (whole, label, value) => `<p class="guide-figure"><span>${esc(stripTags(label))}</span> <strong>${esc(stripTags(value))}</strong></p>`
    );
}

/** Side-stripe callouts become plain prose. */
function unwrapCallouts(html) {
    const boxes = ['highlight-box', 'bottom-line-box', 'callout-box', 'info-box', 'pro-tip', 'warning-box', 'expert-strategy-box'];
    let out = html;

    for (const box of boxes) {
        out = replaceElements(out, new RegExp(`<div class="${box}"[^>]*>`, 'g'), 'div', (inner) => {
            const trimmed = inner.trim();
            if (!trimmed) return '';
            if (/<(p|ul|ol|table|h[1-6]|div|blockquote)\b/i.test(trimmed)) {
                return trimmed
                    .replace(new RegExp(`<h4 class="${box}__title">([\\s\\S]*?)</h4>`, 'g'), '<h3>$1</h3>')
                    .replace(new RegExp(`<p class="${box}__text">`, 'g'), '<p>');
            }
            return `<p>${trimmed}</p>`;
        });
    }

    return out;
}

/** "Key Insight: x" / "Bottom Line: x" headings lose the label. */
function cleanHeadingLabels(html) {
    return html.replace(
        /(<h[2-4][^>]*>)\s*(?:Key Insight|Key Takeaway|Bottom Line|Pro Tip)\s*[:—-]\s*/gi,
        '$1'
    );
}

/**
 * Several frozen pages preload and render images that were never produced.
 * Drop the dead preloads, the empty <picture> blocks, and repoint the author
 * avatar at a file that exists.
 */
function assetExists(url) {
    if (!url || !url.startsWith('/assets/')) return true;
    return fs.existsSync(path.join(ROOT_DIR, url.replace(/^\//, '').split('?')[0]));
}

function removeMissingImages(html) {
    let out = html;

    out = out.replace(/[ \t]*<link rel="preload" as="image" href="([^"]+)"[^>]*>\n?/g, (whole, href) => (
        assetExists(href) ? whole : ''
    ));

    out = replaceElements(out, /<picture>/g, 'picture', (inner, openTag) => {
        const img = inner.match(/<img[^>]*src="([^"]+)"/);
        if (img && !assetExists(img[1])) return '';
        return `${openTag}${inner}</picture>`;
    });

    out = out.replace(/<img([^>]*?)src="([^"]+)"([^>]*)>/g, (whole, before, src, after) => {
        if (assetExists(src)) return whole;
        const fallback = whole.match(/onerror="this\.src='([^']+)'"/);
        if (fallback && assetExists(fallback[1])) {
            return whole.replace(`src="${src}"`, `src="${fallback[1]}"`).replace(/ onerror="[^"]*"/, '');
        }
        return '';
    });

    // Empty wrappers left behind by a removed illustration.
    out = out.replace(/[ \t]*<div class="minimal-featured-image">\s*<\/div>\n?/g, '');

    return out;
}

/** Two-tone headings: gold on cream does not clear 3:1 at display sizes. */
function unwrapAccentSpans(html) {
    return html.replace(
        /(<h[1-4][^>]*>[\s\S]*?<\/h[1-4]>)/g,
        (heading) => heading.replace(/<span class="text-gold[^"]*">([\s\S]*?)<\/span>/g, '$1')
    );
}

/** Unicode check glyphs standing in for an icon system. */
function removeGlyphIcons(html) {
    const chevron = '<svg class="faq-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';
    return html
        .replace(/<span class="text-gold">▼<\/span>/g, chevron)
        .replace(/<span class="text-gold font-bold">✓<\/span>\s*/g, '')
        .replace(/(<li[^>]*>)\s*✓\s*/g, '$1')
        .replace(/(<li[^>]*>)\s*[✔✅]\s*/g, '$1');
}

/** White on emerald-600 is 3.8:1; the navy surface is the palette answer. */
function repaintAccentSurfaces(html) {
    return html
        .replace(/\bbg-emerald-600\b/g, 'bg-navy')
        .replace(/\bbg-emerald-700\b/g, 'bg-navy')
        .replace(/<body class="bg-cream([^"]*)"/, '<body class="guide-page$1"');
}

/** Decorative gradients and colored side stripes, inside class attributes only. */
function removeDecorativeClasses(html) {
    const drop = /^(bg-gradient-hero|bg-gradient-to-(?:br|b|r|tr|l)|from-[a-z]+-\d{2,3}|to-[a-z]+-\d{2,3}|via-[a-z]+-\d{2,3}|border-l-4|shadow-soft|shadow-sm|shadow-md|shadow-lg|shadow-xl|hover:shadow-md|hover:shadow-lg|transition-shadow)$/;

    return html.replace(/ class="([^"]*)"/g, (whole, value) => {
        const kept = value.split(/\s+/).filter((name) => name && !drop.test(name));
        if (!kept.length) return '';
        return ` class="${kept.join(' ')}"`;
    });
}

/**
 * Inline styles carry most of the remaining chrome: mint buttons, 4px side
 * stripes, halo shadows. Drop the declarations, keep the layout ones, and move
 * the colours onto the palette.
 */
function scrubInlineStyles(html) {
    return html.replace(/ style="([^"]*)"/g, (whole, value) => {
        const declarations = value.split(';').map((part) => part.trim()).filter(Boolean);
        const hasAccentBackground = declarations.some((d) => /^background(-color)?\s*:\s*#(10b981|059669|047857)/i.test(d));

        const kept = declarations
            .filter((d) => !/^box-shadow\s*:/i.test(d))
            .filter((d) => !/^border-left\s*:\s*(?:[2-9]|\d\d)px/i.test(d))
            .filter((d) => !/^transform\s*:/i.test(d))
            .filter((d) => !/^transition\s*:/i.test(d))
            .filter((d) => !/(linear|radial)-gradient/i.test(d))
            .map((d) => {
                let out = d
                    .replace(/#(ecfdf5|f0fdf4|d1fae5|dcfce7|f0fdfa)\b/gi, 'var(--cream-dark)')
                    .replace(/#(f9fafb|f8fafc|f3f4f6|fafafa|f1f5f9)\b/gi, 'var(--cream)');
                if (hasAccentBackground) {
                    out = out
                        .replace(/^(background(?:-color)?\s*:\s*)#(?:10b981|059669|047857)\b/i, '$1var(--gold)')
                        .replace(/^(color\s*:\s*)(?:white|#fff(?:fff)?)\b/i, '$1var(--navy)');
                }
                return out.replace(/^(color\s*:\s*)#(?:10b981|059669|047857|065f46|0f766e)\b/i, '$1var(--navy)');
            });

        if (!kept.length) return '';
        return ` style="${kept.join('; ')}"`;
    });
}

/** Wide tables need a scroll container at 390px. */
function wrapTables(html) {
    let out = html;
    let cursor = 0;

    for (;;) {
        const index = out.indexOf('<table', cursor);
        if (index === -1) break;

        const before = out.slice(Math.max(0, index - 120), index);
        if (/table-scroll|table-wrap|table-wrapper/.test(before)) {
            cursor = index + 6;
            continue;
        }

        const end = findBalancedEnd(out, index, 'table');
        if (end === -1) break;

        out = `${out.slice(0, index)}<div class="table-scroll">${out.slice(index, end)}</div>${out.slice(end)}`;
        cursor = end + 40;
    }

    return out;
}

/** The prose Q:/A: block duplicates the accordion below it. */
function removeDuplicateProseFaq(html) {
    if (!/class="faq-list"/.test(html)) return html;

    const start = html.search(/<h2[^>]*>\s*Frequently Asked Questions/i);
    if (start === -1) return html;

    const rest = html.slice(start);
    const nextHeading = rest.slice(1).search(/<h2\b/i);
    const end = nextHeading === -1 ? rest.length : nextHeading + 1;
    const block = rest.slice(0, end);

    // Only drop it when it really is the duplicated prose list.
    if (!/<strong>\s*Q:/i.test(block)) return html;

    return html.slice(0, start) + html.slice(start + end);
}

/** main.js already binds .faq-question; rename so the two do not cancel out. */
function renameFaqToggles(html) {
    return html.replace(/faq-question/g, 'faq-toggle');
}

function cleanIrsReference(html) {
    return replaceElements(html, /<div class="irs-reference">/g, 'div', (inner) => {
        const text = stripTags(inner.replace(/<svg[\s\S]*?<\/svg>/g, ''));
        if (!text) return '';
        return `<p class="guide-hero__meta">${esc(text)}</p>`;
    });
}

function cleanSidebarCards(html) {
    return html
        .replace(/<div class="sidebar-card" style="[^"]*">/g, '<div class="sidebar-card">')
        .replace(/<aside class="sidebar">/g, '<aside class="guide-rail">');
}

/** Hero subtitles built by splicing the meta description are unreadable. */
function fixHeroSubtitle(html) {
    const descMatch = html.match(/<meta name="description" content="([^"]+)"/);
    if (!descMatch) return html;

    const description = descMatch[1];
    const firstSentence = (description.split(/(?<=[.!?])\s+/)[0] || description).trim();

    return html.replace(/<p class="strategy-subtitle">([\s\S]*?)<\/p>/, (whole, body) => {
        const text = stripTags(body);
        const mangled = /(now!|today!|guide now)\s+(by|with|for|and|to)\b/i.test(text)
            || /!\s+[a-z]/.test(text)
            || text.length > 220;
        if (!mangled) return `<p class="guide-deck">${text}</p>`;
        return `<p class="guide-deck">${esc(firstSentence)}</p>`;
    });
}

/** h2 -> h4 skips a level. Promote the orphan h4s to h3. */
function fixHeadingSkips(html) {
    let last = 1;
    return html.replace(/<h([234])([^>]*)>([\s\S]*?)<\/h\1>/g, (whole, level, attrs, body) => {
        const numeric = Number(level);
        if (numeric === 4 && last < 3) {
            last = 3;
            return `<h3${attrs}>${body}</h3>`;
        }
        last = numeric;
        return whole;
    });
}

function normaliseScripts(html) {
    let out = html;

    // Drop inline handlers that now duplicate assets/js/main.js.
    out = out.replace(/[ \t]*<script>(?:(?!<\/script>)[\s\S])*?mobile-menu-btn[\s\S]*?<\/script>\n?/g, '');
    out = out.replace(/[ \t]*<script>(?:(?!<\/script>)[\s\S])*?mobileMenuBtn[\s\S]*?<\/script>\n?/g, '');
    out = out.replace(/[ \t]*<script>(?:(?!<\/script>)[\s\S])*?faq-toggle[\s\S]*?<\/script>\n?/g, '');

    const tail = [];
    if (!out.includes('/assets/js/main.js')) {
        tail.push('    <script defer src="/assets/js/main.js"></script>');
    }
    if (out.includes('class="faq-toggle"')) {
        tail.push(FAQ_SCRIPT);
    }

    if (tail.length) {
        if (out.includes('</body>')) {
            out = out.replace('</body>', `${tail.join('\n')}\n</body>`);
        } else {
            out = `${out.trimEnd()}\n${tail.join('\n')}\n`;
        }
    }

    return out;
}

/* ----------------------------------------------------------- elevation --- */

function slugifyHeading(text, used) {
    const base = String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'section';
    let id = base;
    let n = 2;
    while (used.has(id)) {
        id = `${base}-${n}`;
        n += 1;
    }
    used.add(id);
    return id;
}

/**
 * The hero becomes an opener: title and lede on the left, the strategy's own
 * headline number as a gold figure on the right, the remaining facts beneath.
 */
function elevateHero(html) {
    const pattern = /<section class="strategy-hero">\s*<div class="container-custom">([\s\S]*?)<\/div>\s*<\/section>/;
    const match = pattern.exec(html);
    if (!match) return html;

    const inner = match[1];
    const title = (inner.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '';
    const deck = (inner.match(/<p class="guide-deck">([\s\S]*?)<\/p>/) || [])[1] || '';
    const meta = (inner.match(/<p class="guide-hero__meta">([\s\S]*?)<\/p>/) || [])[1] || '';
    const dl = (inner.match(/<dl class="guide-dl">([\s\S]*?)<\/dl>/) || [])[1] || '';

    const rows = [...dl.matchAll(/<div>\s*<dt>([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>\s*<\/div>/g)]
        .map((row) => ({ label: stripTags(row[1]), value: stripTags(row[2]) }));

    const lead = rows.shift();
    const figure = lead
        ? `<div class="figure figure--gold${lead.value.length > 10 ? ' figure--long' : ''}">
                            <span class="figure__value">${esc(lead.value)}</span>
                            <span class="figure__label">${esc(lead.label.toLowerCase())}</span>
                        </div>`
        : '';

    const restDl = rows.length
        ? `
                        <dl class="guide-dl">
${rows.map((row) => `                            <div>
                                <dt>${esc(row.label)}</dt>
                                <dd>${esc(row.value)}</dd>
                            </div>`).join('\n')}
                        </dl>`
        : '';

    const replacement = `<section class="guide-opener">
            <div class="container-custom">
                <div class="opener">
                    <div>
                        <h1 class="opener__title">${title.trim()}</h1>
                        ${deck ? `<p class="opener__lede">${deck.trim()}</p>` : ''}
                        ${meta ? `<p class="guide-opener__meta">${meta.trim()}</p>` : ''}
                    </div>
                    <aside class="opener__aside">
                        ${figure}${restDl}
                    </aside>
                </div>
            </div>
        </section>`;

    return html.slice(0, match.index) + replacement + html.slice(match.index + match[0].length);
}

/**
 * A sticky contents rail built from the guide's own H2s, so a 20,000px page
 * always shows where the reader is and what else is on it.
 */
function addContentsRail(html) {
    if (html.includes('class="contents guide-contents"')) return html;

    const gridPattern = /<div class="content-grid">/;
    if (!gridPattern.test(html)) return html;

    const used = new Set();
    const entries = [];

    let out = html.replace(/<h2(?![^>]*\bid=)([^>]*)>([\s\S]*?)<\/h2>/g, (whole, attrs, body) => {
        const text = stripTags(body);
        if (!text) return whole;
        const id = slugifyHeading(text, used);
        entries.push({ id, text });
        return `<h2 id="${id}"${attrs}>${body}</h2>`;
    });

    if (entries.length < 4) return out;

    const rail = `<details class="contents guide-contents" open>
                        <summary>On this page</summary>
                        <ol>
${entries.slice(0, 14).map((entry) => `                            <li><a href="#${entry.id}">${esc(entry.text)}</a></li>`).join('\n')}
                        </ol>
                    </details>`;

    const open = '<div class="content-grid">';
    const index = out.indexOf(open);
    if (index === -1) return out;
    const end = findBalancedEnd(out, index, 'div');
    if (end === -1) return out;

    const inner = out.slice(index + open.length, end - '</div>'.length);
    const rebuilt = `<div class="guide-layout">
                    ${rail}
                    <div class="guide-column">${inner}</div>
                </div>`;

    return out.slice(0, index) + rebuilt + out.slice(end);
}

/** Every data table in a guide takes the shared navy-header treatment. */
function elevateTables(html) {
    return html
        .replace(/class="comparison-table"/g, 'class="data-table"')
        .replace(/<table(?![^>]*class=)([^>]*)>/g, '<table class="data-table"$1>');
}

/**
 * Money expressions in a sentence, as written. A range is kept whole: showing
 * only its maximum would misstate the guide's own number.
 */
const MONEY_SOURCE = String.raw`\$\s?\d[\d,]*(?:\.\d+)?(?:\s*(?:million|billion|thousand|[KkMmBb])(?![A-Za-z]))?\+?`;
const RANGE_RE = new RegExp(`(${MONEY_SOURCE})\\s*(-|–|—|to)\\s*(${MONEY_SOURCE})`, 'g');
const MONEY_RE = new RegExp(MONEY_SOURCE, 'g');
const RESULT_CUE_RE = /\b(saves?|saved|saving|savings|benefit|benefits|deduction|deductions|deducts?|refund|impact|generates?|generated|nets?|netted|worth|reduces?|reduced|shelters?|contributes?|contribution|credit)\b/gi;

function moneyValue(token) {
    const digits = Number(String(token).replace(/[^\d.]/g, ''));
    if (!Number.isFinite(digits)) return 0;
    if (/billion|\bb\b/i.test(token)) return digits * 1e9;
    if (/million|\bm\b/i.test(token)) return digits * 1e6;
    if (/thousand|\bk\b/i.test(token)) return digits * 1e3;
    return digits;
}

function findMoneyExpressions(text) {
    const expressions = [];
    const covered = [];

    RANGE_RE.lastIndex = 0;
    let match;
    while ((match = RANGE_RE.exec(text)) !== null) {
        const [whole, from, separator, to] = match;
        const display = separator.toLowerCase() === 'to'
            ? `${from.trim()} to ${to.trim()}`
            : `${from.trim()}–${to.trim()}`;
        expressions.push({ start: match.index, display, value: Math.max(moneyValue(from), moneyValue(to)) });
        covered.push([match.index, match.index + whole.length]);
    }

    MONEY_RE.lastIndex = 0;
    while ((match = MONEY_RE.exec(text)) !== null) {
        const inside = covered.some(([from, to]) => match.index >= from && match.index < to);
        if (inside) continue;
        expressions.push({ start: match.index, display: match[0].trim(), value: moneyValue(match[0]) });
    }

    return expressions.sort((a, b) => a.start - b.start);
}

/**
 * The figure a result sentence is actually stating: the first money expression
 * that follows a result word ("saves", "deduction", "refund"). When the sentence
 * carries exactly one expression that is the figure. Anything looser is dropped
 * rather than guessed at.
 */
function resultFigure(text) {
    // A worked calculation ("$30,000 × 15% = $4,500", "vs. $2,564") states
    // several numbers on the way to an answer; none of them is the figure.
    if (/[×x]\s*\d|=\s*\$|\bvs\.?\s*\$/i.test(text)) return null;

    const expressions = findMoneyExpressions(text);
    if (!expressions.length) return null;

    const cues = [];
    RESULT_CUE_RE.lastIndex = 0;
    let cue;
    while ((cue = RESULT_CUE_RE.exec(text)) !== null) {
        cues.push(cue.index + cue[0].length);
    }

    // The figure has to be governed by the result word: only filler may sit
    // between them, so "creating deductions … on a $1 million property" does
    // not hand back the property price.
    const filler = /^[\s,:;–—-]*(?:of|up to|about|roughly|approximately|around|more than|over|another|an additional|additional|an|a|the|in|by|to|you|your)?[\s,:;–—-]*$/i;

    const anchored = [];
    for (const cueEnd of cues) {
        const candidate = expressions.find((item) => item.start >= cueEnd && item.start - cueEnd <= 25);
        if (candidate && filler.test(text.slice(cueEnd, candidate.start))) {
            anchored.push(candidate.display);
        }
    }

    // Every result word in the sentence has to point at the same figure. When a
    // sentence states several different numbers, none of them is "the" figure.
    const distinct = [...new Set(anchored)];
    if (distinct.length === 1) return distinct[0];
    if (distinct.length > 1) return null;

    if (expressions.length === 1) return expressions[0].display;
    return null;
}

/**
 * Re-run safety: unwrap any takeaway this sweep produced before, so the figure
 * is re-derived from the sentence rather than frozen at an older reading.
 */
function restoreTakeaways(html) {
    return html.replace(
        /<aside class="guide-takeaway">\s*<div class="figure[^"]*">\s*<span class="figure__value">[\s\S]*?<\/span>\s*<span class="figure__label">([\s\S]*?)<\/span>\s*<\/div>\s*<p>([\s\S]*?)<\/p>\s*<\/aside>/g,
        (whole, label, body) => `<p><strong>${label.trim()}:</strong> ${body.trim()}</p>`
    );
}

/**
 * A guide's "bottom line" paragraph carries the number the whole section was
 * working towards. Pull that number out as a display figure and keep the
 * sentence beside it.
 */
function elevateTakeaways(html) {
    if (html.includes('class="guide-takeaway"')) return html;

    let used = 0;
    const seen = new Set();

    return html.replace(
        /<p><strong>((?:Bottom Line|Tax Impact|Tax Savings|Potential Savings|Expected savings|Result|Net Result|Wealth Impact[^<]*|Total tax benefit)[^<]{0,30}?)[::]?\s*<\/strong>\s*([\s\S]*?)<\/p>/gi,
        (whole, label, body) => {
            if (used >= 2) return whole;
            const text = stripTags(body).trim();
            const figure = resultFigure(text);
            if (!figure) return whole;
            if (seen.has(figure)) return whole;
            seen.add(figure);
            used += 1;

            const heading = label.replace(/[::]\s*$/, '').trim();
            const sentence = heading
                .toLowerCase()
                .replace(/^(.)/, (c) => c.toUpperCase())
                .replace(/(\$[\d.,]+)([kmb])\b/g, (match, amount, unit) => `${amount}${unit.toUpperCase()}`)
                .replace(/\birs\b/g, 'IRS');

            return `<aside class="guide-takeaway">
                            <div class="figure figure--long">
                                <span class="figure__value">${esc(figure)}</span>
                                <span class="figure__label">${esc(sentence)}</span>
                            </div>
                            <p>${body.trim()}</p>
                        </aside>`;
        }
    );
}

/**
 * One pull-quote, taken from the guide's own words, to break the longest run
 * of prose. Placed before the H2 nearest the middle of the article.
 */
function addPullQuote(html) {
    if (html.includes('class="guide-inset"')) return html;

    const headings = [...html.matchAll(/<h2[^>]*>[\s\S]*?<\/h2>/g)];
    if (headings.length < 6) return html;

    const target = headings[Math.floor(headings.length / 2)];
    const before = html.slice(0, target.index);
    const paragraphs = [...before.matchAll(/<p>([\s\S]*?)<\/p>/g)].slice(-8);
    if (!paragraphs.length) return html;

    const sentences = [];
    for (const paragraph of paragraphs.reverse()) {
        for (const part of stripTags(paragraph[1]).split(/(?<=[.!?])\s+/)) {
            sentences.push(part.trim());
        }
    }

    const sentence = sentences.find((part) => (
        part.length > 60
        && part.length < 190
        && !/^[A-Z][A-Za-z ]{2,24}:/.test(part)
        && !/^(Example|Note|Tip|Step|Year)\b/i.test(part)
    ));
    if (!sentence) return html;

    const quote = `<aside class="guide-inset">
                            <figure class="pull-quote">
                                <blockquote><p>${esc(sentence)}</p></blockquote>
                            </figure>
                        </aside>

                        `;

    return html.slice(0, target.index) + quote + html.slice(target.index);
}

function tidyWhitespace(html) {
    return html.replace(/\n{3,}/g, '\n\n');
}

function sweepFile(filePath, activeHref) {
    const original = fs.readFileSync(filePath, 'utf8');
    let html = original;

    html = sweepHead(html);
    html = swapHeader(html, activeHref);
    html = swapFooter(html);
    html = removeWorksheetLinks(html);
    html = removeFixedHeaderPadding(html);
    html = removeBadges(html);
    html = convertStatsGrid(html);
    html = convertFigureStacks(html);
    html = unwrapCallouts(html);
    html = cleanHeadingLabels(html);
    html = removeMissingImages(html);
    html = unwrapAccentSpans(html);
    html = removeGlyphIcons(html);
    html = repaintAccentSurfaces(html);
    html = removeDecorativeClasses(html);
    html = scrubInlineStyles(html);
    html = wrapTables(html);
    html = removeDuplicateProseFaq(html);
    html = renameFaqToggles(html);
    html = cleanIrsReference(html);
    html = cleanSidebarCards(html);
    html = fixHeroSubtitle(html);
    html = fixHeadingSkips(html);
    html = elevateHero(html);
    html = elevateTables(html);
    html = restoreTakeaways(html);
    html = elevateTakeaways(html);
    html = addContentsRail(html);
    html = addPullQuote(html);
    html = normaliseScripts(html);
    html = tidyWhitespace(html);

    if (html !== original) {
        fs.writeFileSync(filePath, html);
        return true;
    }
    return false;
}

function main() {
    let changed = 0;
    let scanned = 0;

    for (const target of TARGETS) {
        const dir = path.join(ROOT_DIR, target.dir);
        if (!fs.existsSync(dir)) continue;

        for (const name of fs.readdirSync(dir).sort()) {
            if (!name.endsWith('.html') || target.skip.has(name)) continue;
            const filePath = path.join(dir, name);
            if (!fs.statSync(filePath).isFile()) continue;
            scanned += 1;
            if (sweepFile(filePath, target.activeHref)) {
                changed += 1;
                console.log(`  Swept: ${target.dir}/${name}`);
            }
        }
    }

    console.log(`\nSwept ${changed} of ${scanned} frozen guide pages.`);
}

main();
