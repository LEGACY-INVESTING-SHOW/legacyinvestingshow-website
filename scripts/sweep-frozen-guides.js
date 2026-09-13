#!/usr/bin/env node

/**
 * Sweep the frozen long-form guides.
 *
 * tax-strategies/*.html and retirement/*.html are hand-written pages of 900-1700
 * lines each. They are never regenerated from a template (see shouldSkipFile in
 * build-tax-strategies.js) because the prose, worked examples and tables are the
 * ranking content. This script only rewrites their shared chrome so they read as
 * field guide pages:
 *
 *   opener (h1, key line, "At a glance" words list)
 *   -> "On this page" list
 *   -> one prose column with inset tables and tinted callouts
 *   -> FAQ rows
 *   -> sources
 *   -> "Do this next"
 *   -> one closing block
 *
 * It also removes the KIT v2 structures an earlier pass introduced: display
 * figures, gold figure panels, contents rails, margin asides and pull quotes.
 *
 * It is idempotent: running it twice changes nothing the second time.
 */

const fs = require('fs');
const path = require('path');
const {
    renderHeadAssets,
    renderSiteFooter,
    renderSiteHeader,
    renderSourceBlock,
} = require('./lib/site-shell');

const ROOT_DIR = path.join(__dirname, '..');
const TARGETS = [
    { dir: 'tax-strategies', activeHref: '/tax-strategies', skip: new Set(['index.html']) },
    { dir: 'retirement', activeHref: '', skip: new Set(['index.html']) },
];

const STYLESHEET_LINKS = `${renderHeadAssets()}
    <link rel="stylesheet" href="/assets/css/guides.css">`;

function esc(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Plain text from a fragment. Entities are decoded so the caller can re-escape
 * once; without this the sweep would double-escape on every run.
 */
function stripTags(value = '') {
    return String(value)
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();
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
 * of `transform(innerHtml, openTag)`. Scanning restarts after the replacement,
 * so a transform may legitimately re-emit the same class name.
 */
function replaceElements(html, openPattern, tagName, transform) {
    let result = html;
    let cursor = 0;
    let guard = 0;

    for (;;) {
        openPattern.lastIndex = cursor;
        const match = openPattern.exec(result);
        if (!match || guard > 600) break;
        guard += 1;

        const start = match.index;
        const end = findBalancedEnd(result, start, tagName);
        if (end === -1) break;

        const whole = result.slice(start, end);
        const inner = whole.slice(match[0].length, whole.length - (`</${tagName}>`).length);
        const replacement = transform(inner, match[0]);
        result = result.slice(0, start) + replacement + result.slice(end);
        cursor = start + replacement.length;
    }

    return result;
}

/** Drop the wrapper element, keep its children. */
function unwrapElements(html, openPattern, tagName) {
    return replaceElements(html, openPattern, tagName, (inner) => inner);
}

/** Remove the element and everything inside it. */
function dropElements(html, openPattern, tagName) {
    return replaceElements(html, openPattern, tagName, () => '');
}

/**
 * Remove the element together with the indentation in front of it and the blank
 * line behind it, so a block this sweep re-emits lands in the same place every
 * run.
 */
function cutElements(html, openPattern, tagName) {
    let result = html;

    for (;;) {
        openPattern.lastIndex = 0;
        const match = openPattern.exec(result);
        if (!match) break;

        let start = match.index;
        while (start > 0 && /[ \t]/.test(result[start - 1])) start -= 1;

        const end = findBalancedEnd(result, match.index, tagName);
        if (end === -1) break;

        const after = result.slice(end).match(/^[ \t]*\n(?:[ \t]*\n)*/);
        const stop = end + (after ? after[0].length : 0);
        result = result.slice(0, start) + result.slice(stop);
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

    // Font preloads and stylesheet links are re-emitted from the shared shell,
    // so a face that is no longer used stops being preloaded everywhere.
    out = out.replace(/[ \t]*<link rel="preload"[^>]*as="font"[^>]*>\n?/g, '');
    out = out.replace(/[ \t]*<link rel="stylesheet" href="\/assets\/css\/guides\.css[^"]*">\n?/g, '');

    if (/<link rel="stylesheet" href="\/assets\/css\/styles\.css[^"]*">/.test(out)) {
        out = out.replace(
            /[ \t]*<link rel="stylesheet" href="\/assets\/css\/styles\.css[^"]*">/,
            `    ${STYLESHEET_LINKS}`
        );
    } else if (out.includes('</head>')) {
        out = out.replace('</head>', `    ${STYLESHEET_LINKS}\n</head>`);
    }

    out = out.replace(/<meta name="theme-color" content="#FAF7F2">/g, '<meta name="theme-color" content="#FBF8F1">');

    // Per-page chrome stylesheets move to guides.css.
    out = out.replace(/[ \t]*<style>[\s\S]*?<\/style>\n?/g, '');

    return out;
}

/* ------------------------------------------------------------------ body --- */

/**
 * Most of these guides lost their opening <body> tag years ago, so the page
 * class never reached the stylesheet. Put it back and keep it on the palette.
 */
function ensureBodyElement(html) {
    if (/<body\b/.test(html)) {
        return html.replace(/<body\b([^>]*)>/, (whole, attrs) => {
            const cls = (attrs.match(/class="([^"]*)"/) || [])[1] || '';
            if (/\bguide-page\b/.test(cls)) return whole;
            const next = `guide-page${cls ? ` ${cls}` : ''}`;
            return cls
                ? whole.replace(/class="[^"]*"/, `class="${next}"`)
                : `<body class="guide-page"${attrs}>`;
        });
    }

    if (!html.includes('</head>')) return html;
    return html.replace('</head>', '</head>\n<body class="guide-page">');
}

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

/** Two-tone headings: a colour change inside a heading is decoration. */
function unwrapAccentSpans(html) {
    return html.replace(
        /(<h[1-4][^>]*>[\s\S]*?<\/h[1-4]>)/g,
        (heading) => heading.replace(/<span class="text-gold[^"]*">([\s\S]*?)<\/span>/g, '$1')
    );
}

/**
 * One guide lost the closing quote on a decorative span years ago, which
 * swallowed the rest of its FAQ row. Repair it before anything reads the markup.
 */
function repairBrokenMarkup(html) {
    return html
        .replace(/<div class="container">/g, '<div class="container-custom">')
        .replace(/<span class="group-open:rotate-pointer[^<]*?span>\s*<\/summary>/g, '</summary>')
        .replace(/<span[^>]*>\s*[\u25bc\u25be\u25b8]\s*<\/span>\s*/g, '')
        .replace(/<span class="irs-reference">([\s\S]*?)<\/span>/g, '$1');
}

/** Unicode check glyphs standing in for an icon system. */
function removeGlyphIcons(html) {
    return html
        .replace(/<svg class="faq-chevron"[\s\S]*?<\/svg>\s*/g, '')
        .replace(/<span class="text-gold">▼<\/span>/g, '')
        .replace(/<span class="text-gold font-bold">✓<\/span>\s*/g, '')
        .replace(/(<li[^>]*>)\s*✓\s*/g, '$1')
        .replace(/(<li[^>]*>)\s*[✔✅]\s*/g, '$1')
        // Decorative tick / chevron SVGs at the head of a list row.
        .replace(/(<li[^>]*>\s*(?:<a[^>]*>\s*)?)<svg[\s\S]*?<\/svg>\s*/g, '$1')
        .replace(/<svg viewBox="0 0 24 24"[^>]*>\s*<(?:polyline|path)[^>]*\/>\s*<\/svg>\s*/g, '');
}

/**
 * Decorative utility classes. The page directories are inside the Tailwind
 * content globs, so a leftover `bg-white rounded-lg border p-6` really does
 * paint a card. Strip the whole card vocabulary; the kit carries the surface.
 */
const DROP_CLASS = new RegExp('^(' + [
    'bg-gradient-hero', 'bg-gradient-to-(?:br|b|r|tr|l)',
    '(?:from|to|via)-[a-z]+-\\d{2,3}',
    'border-l-4', 'border(?:-[trbl])?(?:-\\d)?', 'border-[a-z]+(?:-\\d{2,3})?',
    'shadow(?:-(?:soft|sm|md|lg|xl|2xl|none))?', 'hover:shadow-[a-z]+', 'transition-shadow',
    'rounded(?:-(?:sm|md|lg|xl|2xl|3xl|full))?',
    'bg-white', 'bg-cream(?:-dark)?', 'bg-navy', 'bg-gold(?:-muted)?', 'bg-[a-z]+-\\d{2,3}',
    'text-white', 'text-cream(?:-dark)?', 'text-gold', 'text-navy', 'text-[a-z]+-\\d{2,3}',
    'text-secondary', 'text-muted', 'text-(?:xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)',
    'p-\\d+', 'px-\\d+', 'py-\\d+', 'pt-\\d+', 'pb-\\d+', 'pl-\\d+', 'pr-\\d+',
    'card', 'group', 'stat-card', 'stat-icon-wrapper', 'stat-icon',
    // Layout utilities that rebuild the card grids the kit replaced.
    'flex', 'inline-flex', 'grid', 'grid-cols-\\d+', 'flex-col', 'flex-row', 'flex-wrap', 'flex-shrink-0', 'flex-1',
    'items-(?:center|start|end|baseline)', 'justify-(?:between|center|start|end|around)',
    'gap-\\d+', 'space-[xy]-\\d+', 'mx-auto', 'max-w-[a-z0-9]+', 'w-\\d+', 'h-\\d+', 'w-full',
    'm[btlrxy]?-\\d+', 'cursor-pointer', 'transition(?:-[a-z]+)?', 'leading-[a-z]+', 'overflow-[a-z]+',
    // Every responsive, hover and state variant: all of them are decoration here.
    '(?:sm|md|lg|xl|2xl|hover|focus|focus-visible|active|group-hover|group-open):.*',
].join('|') + ')$');

function removeDecorativeClasses(html) {
    return html.replace(/ class="([^"]*)"/g, (whole, value) => {
        const kept = value.split(/\s+/).filter((name) => name && !DROP_CLASS.test(name));
        if (!kept.length) return '';
        return ` class="${kept.join(' ')}"`;
    });
}

/**
 * Inline styles carry the rest of the chrome: mint buttons, side stripes, halo
 * shadows, gradients. Drop the decoration and keep nothing but layout.
 */
function scrubInlineStyles(html) {
    return html.replace(/ style="([^"]*)"/g, (whole, value) => {
        const kept = value.split(';').map((part) => part.trim()).filter(Boolean)
            .filter((d) => !/^box-shadow\s*:/i.test(d))
            .filter((d) => !/^border/i.test(d))
            .filter((d) => !/^background/i.test(d))
            .filter((d) => !/^color\s*:/i.test(d))
            .filter((d) => !/^font-/i.test(d))
            .filter((d) => !/^transform\s*:/i.test(d))
            .filter((d) => !/^transition\s*:/i.test(d))
            .filter((d) => !/^(padding|margin|display|min-width|width)\s*:/i.test(d))
            .filter((d) => !/(linear|radial)-gradient/i.test(d));

        if (!kept.length) return '';
        return ` style="${kept.join('; ')}"`;
    });
}

/* ------------------------------------------------- KIT v2 structures out --- */

/** The inserted pull quote repeated a sentence that is already in the prose. */
function removePullQuotes(html) {
    let out = dropElements(html, /<aside class="guide-inset">/g, 'aside');
    out = dropElements(out, /<figure class="pull-quote">/g, 'figure');
    return out;
}

/** Display figures go back to the sentence they were lifted out of. */
function restoreTakeaways(html) {
    return html.replace(
        /<aside class="guide-takeaway">\s*<div class="figure[^"]*">\s*<span class="figure__value">[\s\S]*?<\/span>\s*<span class="figure__label">([\s\S]*?)<\/span>\s*<\/div>\s*<p>([\s\S]*?)<\/p>\s*<\/aside>/g,
        (whole, label, body) => `<p><strong>${label.trim()}:</strong> ${body.trim()}</p>`
    );
}

/** Any remaining gold or navy figure panel becomes a labelled line of text. */
function flattenFigures(html) {
    return replaceElements(html, /<div class="figure(?:[^"]*)">/g, 'div', (inner) => {
        const value = stripTags((inner.match(/<span class="figure__value">([\s\S]*?)<\/span>/) || [])[1] || '');
        const label = stripTags((inner.match(/<span class="figure__label">([\s\S]*?)<\/span>/) || [])[1] || '');
        const note = stripTags((inner.match(/<span class="figure__note">([\s\S]*?)<\/span>/) || [])[1] || '');
        if (!value) return '';
        const lead = label ? `${esc(label.replace(/^./, (c) => c.toUpperCase()))}: ` : '';
        return `<p>${lead}<strong>${esc(value)}</strong>${note ? ` ${esc(note)}` : ''}</p>`;
    });
}

/** Hero stat rail and old definition lists become the plain-words list. */
function convertDefinitionLists(html) {
    let out = replaceElements(html, /<div class="stats-grid">/g, 'div', (inner) => {
        const pairs = [];
        const pattern = /stat-box__label[^>]*>([\s\S]*?)<\/div>\s*<div class="stat-box__value[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
        let match;
        while ((match = pattern.exec(inner)) !== null) {
            const label = labelCase(stripTags(match[1]));
            const value = stripTags(match[2]);
            if (label && value) pairs.push([label, value]);
        }
        if (!pairs.length) return '';
        return renderWords('At a glance', pairs);
    });

    out = replaceElements(out, /<section class="statistics-section"[^>]*>/g, 'section', (inner) => {
        const pairs = [...inner.matchAll(/<div class="stat-value">([\s\S]*?)<\/div>\s*<div class="stat-label">([\s\S]*?)<\/div>(?:\s*<span class="stat-context">([\s\S]*?)<\/span>)?/g)]
            .map((row) => [
                labelCase(stripTags(row[2])),
                [stripTags(row[1]), stripTags(row[3] || '')].filter(Boolean).join('. '),
            ])
            .filter(([label, value]) => label && value);
        if (!pairs.length) return '';
        return `<div class="container-custom">
                ${renderWords('Key numbers', pairs)}
            </div>`;
    });

    out = replaceElements(out, /<dl class="guide-dl">/g, 'dl', (inner) => {
        const pairs = [...inner.matchAll(/<dt>([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/g)]
            .map((row) => [labelCase(stripTags(row[1])), stripTags(row[2])])
            .filter(([label, value]) => label && value);
        if (!pairs.length) return '';
        return renderWords('', pairs);
    });

    return out;
}

function renderWords(label, pairs, pad = '                    ') {
    return `${label ? `<p class="words__label">${esc(label)}</p>\n${pad}` : ''}<dl class="words">
${pairs.map(([term, value]) => `${pad}    <dt>${esc(term)}</dt>
${pad}    <dd>${esc(value)}</dd>`).join('\n')}
${pad}</dl>`;
}

/** Unwrap the two-column shells so the prose runs in one column. */
function flattenColumns(html) {
    let out = html;
    for (const cls of ['guide-layout', 'guide-column', 'content-grid', 'marginalia', 'marginalia__main', 'sheet guide-sheet', 'guide-sheet']) {
        out = unwrapElements(out, new RegExp(`<div class="${cls}">`, 'g'), 'div');
    }
    return out;
}

/* ----------------------------------------------------------- components --- */

const CALLOUT_KINDS = [
    { cls: 'calculation-box', label: 'Worked example', variant: '' },
    { cls: 'real-numbers-box', label: 'Worked example', variant: '' },
    { cls: 'example-box', label: 'Worked example', variant: '' },
    { cls: 'warning-box', label: 'Watch out', variant: ' callout--warn' },
    { cls: 'quick-summary', label: 'In short', variant: ' callout--gold' },
];

const PLAIN_BOXES = [
    'highlight-box', 'bottom-line-box', 'callout-box', 'info-box', 'pro-tip',
    'expert-strategy-box', 'step-box', 'mistake-card', 'comparison-box',
    'tool-item', 'tax-state-card', 'timeline-step', 'sidebar-card__body',
];

/** Tinted callouts for worked examples and warnings; everything else is prose. */
function convertCallouts(html) {
    let out = html;

    for (const kind of CALLOUT_KINDS) {
        out = replaceElements(out, new RegExp(`<div class="${kind.cls}"[^>]*>`, 'g'), 'div', (inner) => {
            let body = inner.trim();
            if (!body) return '';
            const titleMatch = body.match(new RegExp(`<div class="${kind.cls}__title">([\\s\\S]*?)</div>`));
            const label = titleMatch ? stripTags(titleMatch[1]) : kind.label;
            if (titleMatch) body = body.replace(titleMatch[0], '');
            body = normaliseBoxBody(body, kind.cls);
            return `<div class="callout${kind.variant}">
                            <p class="callout__label">${esc(label)}</p>
                            ${body.trim()}
                        </div>`;
        });
    }

    for (const box of PLAIN_BOXES) {
        out = replaceElements(out, new RegExp(`<div class="${box}"[^>]*>`, 'g'), 'div', (inner) => {
            const trimmed = normaliseBoxBody(inner.trim(), box);
            if (!trimmed) return '';
            if (/<(p|ul|ol|table|h[1-6]|div|blockquote)\b/i.test(trimmed)) return trimmed;
            return `<p>${trimmed}</p>`;
        });
    }

    // Ledger rows inside a worked example read as a two-column line.
    out = out.replace(
        /<div class="calculation-line(?:[^"]*)">\s*<span>([\s\S]*?)<\/span>\s*<span>([\s\S]*?)<\/span>\s*<\/div>/g,
        (whole, term, value) => `<p class="ledger"><span>${term.trim()}</span> <span>${value.trim()}</span></p>`
    );

    return out;
}

function normaliseBoxBody(body, cls) {
    return body
        .replace(new RegExp(`<div class="${cls}__title">([\\s\\S]*?)</div>`, 'g'), '<h3>$1</h3>')
        .replace(new RegExp(`<div class="${cls}__(?:text|solution|info|name|number)">([\\s\\S]*?)</div>`, 'g'), '<p>$1</p>')
        .replace(new RegExp(`<h4 class="${cls}__title">([\\s\\S]*?)</h4>`, 'g'), '<h3>$1</h3>')
        .replace(new RegExp(`<p class="${cls}__text">`, 'g'), '<p>');
}

/**
 * A few guides lost their box wrapper long ago and left the title and text divs
 * behind. Set them as the paragraph they were always meant to be.
 */
function normaliseOrphanBoxParts(html) {
    return html
        .replace(
            /<div class="([a-z-]+)__title">([\s\S]*?)<\/div>\s*<div class="\1__text">([\s\S]*?)<\/div>/g,
            (whole, cls, title, body) => `<p><strong>${esc(stripTags(title))}:</strong> ${body.trim()}</p>`
        )
        .replace(/<div class="[a-z-]+__title">([\s\S]*?)<\/div>/g, '<h3>$1</h3>')
        .replace(/<div class="[a-z-]+__(?:text|solution|info)">([\s\S]*?)<\/div>/g, '<p>$1</p>');
}

/** "Key Insight: x" / "Bottom Line: x" headings lose the label. */
function cleanHeadingLabels(html) {
    return html.replace(
        /(<h[2-4][^>]*>)\s*(?:Key Insight|Key Takeaway|Bottom Line|Pro Tip)\s*[:—-]\s*/gi,
        '$1'
    );
}

/**
 * The sentence a section was working towards, set large. The number stays
 * inside the sentence exactly as the guide wrote it.
 */
const BIG_LABELS = /^(Bottom Line|Tax Impact|Tax Savings|Potential Savings|Expected savings|Result|Net Result|Total tax benefit|Wealth Impact)/i;

function addBigStatements(html) {
    if (html.includes('class="big"')) return html;

    let used = 0;
    return html.replace(
        /<p><strong>([^<]{3,40}?)[::]?\s*<\/strong>\s*([\s\S]*?)<\/p>/g,
        (whole, label, body) => {
            if (used >= 2) return whole;
            if (!BIG_LABELS.test(label.trim())) return whole;
            const text = stripTags(body).trim();
            if (!text) return whole;
            const sentences = text.split(/(?<=[.!?])\s+/);
            // The sentence worth setting large is the one carrying the figure.
            let pick = sentences.findIndex((part) => /\$\s?\d/.test(part) && part.length >= 40 && part.length <= 220);
            if (pick === -1) pick = sentences.findIndex((part) => part.length >= 40 && part.length <= 220);
            if (pick === -1) return whole;
            used += 1;

            const before = sentences.slice(0, pick).join(' ').trim();
            const after = sentences.slice(pick + 1).join(' ').trim();
            return [
                before ? `<p>${esc(before)}</p>\n                        ` : '',
`<div class="big"><p>${esc(sentences[pick])}</p></div>`,
                after ? `\n                        <p>${esc(after)}</p>` : '',
            ].join('');
        }
    );
}

/** Every table sits inside the reading column, never across it. */
function convertTables(html) {
    let out = html;

    // Re-wrap: drop the old scroll shells first so the sweep stays idempotent.
    for (const cls of ['table-scroll', 'table-wrap', 'table-wrapper', 'table-inset', 'data-table']) {
        out = unwrapElements(out, new RegExp(`<div class="${cls}">`, 'g'), 'div');
    }

    out = out.replace(/<table[^>]*>/g, (openTag) => {
        const cls = (openTag.match(/class="([^"]*)"/) || [])[1] || '';
        const zebra = /data-table|comparison-table|compare-table|table--zebra/.test(cls) ? ' class="table--zebra"' : '';
        return `<table${zebra}>`;
    });

    let cursor = 0;
    for (;;) {
        const index = out.indexOf('<table', cursor);
        if (index === -1) break;
        const end = findBalancedEnd(out, index, 'table');
        if (end === -1) break;
        out = `${out.slice(0, index)}<div class="table-inset">${out.slice(index, end)}</div>${out.slice(end)}`;
        cursor = end + 40;
    }

    return out;
}

/** Button accordions become <details> rows; the schema markup rides along. */
function convertFaq(html) {
    let out = html.replace(/<div class="faq-list"/g, '<div class="faq"');

    out = replaceElements(out, /<div class="faq-item"[^>]*>/g, 'div', (inner, openTag) => {
        const attrs = openTag.replace(/^<div class="faq-item"\s*/, '').replace(/>$/, '').trim();
        const question = (inner.match(/<span itemprop="name">([\s\S]*?)<\/span>/)
            || inner.match(/<button[^>]*>([\s\S]*?)<\/button>/) || [])[1];
        if (!question) {
            // A few pages reuse .faq-item for a plain line of text.
            return inner.trim();
        }
        const answerOpen = inner.search(/<div class="faq-answer/);
        let answer = '';
        let answerAttrs = 'itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer"';
        if (answerOpen !== -1) {
            const answerEnd = findBalancedEnd(inner, answerOpen, 'div');
            const whole = inner.slice(answerOpen, answerEnd === -1 ? inner.length : answerEnd);
            const openEnd = whole.indexOf('>') + 1;
            const openTagText = whole.slice(0, openEnd);
            const found = openTagText.match(/itemscope[^>]*/);
            if (found) answerAttrs = found[0].replace(/>$/, '').trim();
            answer = whole.slice(openEnd, whole.length - '</div>'.length).trim();
        }

        return `<details class="faq__item" ${attrs}>
                        <summary itemprop="name">${esc(stripTags(question))}</summary>
                        <div class="faq__answer" ${answerAttrs}>
                            ${answer}
                        </div>
                    </details>`;
    });

    // Native <details> FAQ rows on a few guides: same hairline treatment.
    out = out.replace(/<details(?![^>]*class=)>/g, '<details class="faq__item">');

    return out
        .replace(/<h2([^>]*) class="faq-section__title"/g, '<h2$1')
        .replace(/<h2 class="faq-section__title"([^>]*)/g, '<h2$1')
        .replace(/[ \t]*<h3>Advanced FAQ Section Below in Accordion<\/h3>\n?/g, '');
}

/** The prose Q:/A: block duplicates the accordion below it. */
function removeDuplicateProseFaq(html) {
    if (!/class="faq"/.test(html)) return html;

    const start = html.search(/<h2[^>]*>\s*Frequently Asked Questions/i);
    if (start === -1) return html;

    const rest = html.slice(start);
    const nextHeading = rest.slice(1).search(/<h2\b/i);
    const end = nextHeading === -1 ? rest.length : nextHeading + 1;
    const block = rest.slice(0, end);

    if (!/<strong>\s*Q:/i.test(block)) return html;

    return html.slice(0, start) + html.slice(start + end);
}

/**
 * The old right-hand rail: keep the facts, drop the promotional card, and set
 * the rest at the end of the prose where it reads in order.
 */
const RAIL_PROMO = /^(ready to|need expert|master tax|get (started|expert))/i;

function foldSidebar(html) {
    let out = replaceElements(html, /<div class="sidebar">/g, 'div', (inner) => `<aside class="guide-rail">${inner}</aside>`);

    out = replaceElements(out, /<aside class="(?:guide-rail|sidebar)">/g, 'aside', (inner) => {
        const blocks = [];
        replaceElements(inner, /<div class="sidebar-card">/g, 'div', (cardInner) => {
            const titleMatch = cardInner.match(/<h3 class="sidebar-card__title">([\s\S]*?)<\/h3>/);
            const title = titleMatch ? stripTags(titleMatch[1]) : '';
            if (!title || RAIL_PROMO.test(title)) return '';
            let body = cardInner.replace(titleMatch[0], '').trim();
            body = body
                .replace(/<ul class="(?:benefits-list|related-strategies|sidebar-list)">/g, '<ul>')
                .replace(/<a href="\/blog\/"[^>]*>[\s\S]*?<\/a>/g, '');
            if (!stripTags(body)) return '';
            blocks.push(`<h3>${esc(sentenceCase(title))}</h3>\n                        ${body}`);
            return '';
        });
        if (!blocks.length) return '';
        return `<div class="guide-extras">
                        ${blocks.join('\n                        ')}
                    </div>`;
    });

    // A few guides drop a lone .sidebar-card into the prose. Unwrap it.
    return replaceElements(out, /<div class="sidebar-card">/g, 'div', (inner) => {
        const titleMatch = inner.match(/<h3 class="sidebar-card__title">([\s\S]*?)<\/h3>/);
        const title = titleMatch ? stripTags(titleMatch[1]) : '';
        if (title && RAIL_PROMO.test(title)) return '';
        let body = inner;
        if (titleMatch) body = body.replace(titleMatch[0], `<h3>${esc(labelCase(title))}</h3>`);
        return body
            .replace(/<ul class="(?:benefits-list|related-strategies|sidebar-list)">/g, '<ul>')
            .trim();
    });
}

/* -------------------------------------------------------------- the page --- */

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

const KEEP_CAPS = new Set([
    'form', 'schedule', 'section', 'publication', 'roth', 'augusta', 'medicare',
    'social', 'security', 'treasury', 'january', 'february', 'march', 'april',
    'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
]);

/** Title case to sentence case, leaving acronyms, numbers and names alone. */
function sentenceCase(text) {
    const words = String(text).trim().split(/\s+/);
    return words.map((word, index) => {
        if (index === 0) return word;
        const bare = word.match(/^([A-Z][a-z]+(?:-[A-Za-z][a-z]+)*)([,.;:)?!]*)$/);
        if (!bare) return word;
        if (KEEP_CAPS.has(bare[1].split('-')[0].toLowerCase())) return word;
        return bare[1].toLowerCase() + bare[2];
    }).join(' ');
}

/** A words-list term: sentence case, first letter up. */
function labelCase(text) {
    return sentenceCase(String(text).trim()).replace(/^./, (c) => c.toUpperCase());
}

/**
 * The opener: title, the key line the page already carried, and the facts as a
 * plain-words list. No panel, no display figure.
 */
function rebuildOpener(html) {
    const pattern = /<section class="(?:guide-opener|strategy-hero)">\s*<div class="container-custom">([\s\S]*?)<\/div>\s*<\/section>/;
    const match = pattern.exec(html);
    if (!match) return html;

    const inner = match[1];
    const title = stripTags((inner.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '');
    if (!title) return html;

    const key = stripTags((inner.match(/<p class="(?:opener__lede|opener__key|guide-deck|strategy-subtitle)">([\s\S]*?)<\/p>/) || [])[1] || '');
    const meta = stripTags((inner.match(/<p class="guide-opener__meta">([\s\S]*?)<\/p>/) || [])[1] || '');
    const breadcrumb = (inner.match(/<nav aria-label="Breadcrumb">[\s\S]*?<\/nav>/) || [])[0] || '';

    const pairs = [...inner.matchAll(/<dt>([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/g)]
        .map((row) => [labelCase(stripTags(row[1])), stripTags(row[2])])
        .filter(([label, value]) => label && value);

    const figure = inner.match(/<span class="figure__value">([\s\S]*?)<\/span>\s*<span class="figure__label">([\s\S]*?)<\/span>/);
    if (figure) {
        pairs.unshift([labelCase(stripTags(figure[2])), stripTags(figure[1])]);
    }
    if (meta && !pairs.some(([label]) => /irs/i.test(label))) {
        const irs = meta.match(/IRS Reference:\s*(.+?)(?:\.|$)/i);
        if (irs) pairs.push(['IRS reference', irs[1].trim()]);
    }

    const keyLine = key ? `\n                    <p class="opener__key">${esc(key.replace(/\s*\.?$/, '.'))}</p>` : '';
    const words = pairs.length ? `\n                    ${renderWords('At a glance', pairs.slice(0, 5))}` : '';
    const crumbs = breadcrumb ? `${breadcrumb}\n                ` : '';

    const replacement = `<section class="guide-opener">
            <div class="container-custom">
                ${crumbs}<div class="opener">
                    <h1>${esc(title)}</h1>${keyLine}${words}
                </div>
            </div>
        </section>`;

    return html.slice(0, match.index) + replacement + html.slice(match.index + match[0].length);
}

/** "On this page": a plain list of the guide's own H2s. */
function addToc(html) {
    const used = new Set();

    let out = cutElements(html, /<details class="(?:contents guide-contents|toc)"[^>]*>/g, 'details');
    // In-page contents blocks written by hand: the generated list replaces them.
    out = cutElements(out, /<div class="(?:toc-section|toc-nav|table-of-contents|toc)">/g, 'div');

    out = out.replace(/<h2(?![^>]*\bid=)([^>]*)>([\s\S]*?)<\/h2>/g, (whole, attrs, body) => {
        const text = stripTags(body);
        if (!text) return whole;
        return `<h2 id="${slugifyHeading(text, used)}"${attrs}>${body}</h2>`;
    });

    // Only the article's own sections belong in the list, not the closing block.
    const closing = out.indexOf('<section class="guide-close">');
    const scope = closing === -1 ? out : out.slice(0, closing);

    const entries = [];
    for (const match of scope.matchAll(/<h2 id="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/g)) {
        const text = stripTags(match[2]);
        if (text) entries.push({ id: match[1], text });
    }
    if (entries.length < 4) return out;

    const anchor = /^([ \t]*)<div class="prose(?:-content)?">/m.exec(out);
    if (!anchor) return out;
    const pad = anchor[1];

    const toc = `${pad}<details class="toc" open>
${pad}    <summary>On this page</summary>
${pad}    <ul>
${entries.slice(0, 14).map((entry) => `${pad}        <li><a href="#${entry.id}">${esc(entry.text)}</a></li>`).join('\n')}
${pad}    </ul>
${pad}</details>

`;

    return out.slice(0, anchor.index) + toc + out.slice(anchor.index);
}

/**
 * "Do this next": three or four actions taken from the guide's own
 * implementation section. Nothing is invented; if the guide has no steps the
 * block is left off.
 */
const STEP_SECTION = /implementation|step-by-step|step by step|how to (?:use|claim|set up|implement)|getting started|the process/i;

function cleanAction(text) {
    const cleaned = stripTags(text)
        .replace(/^(?:Step|Phase|Stage)\s*\d+\s*[:.)-]\s*/i, '')
        .replace(/\s*\((?:Timeline|Days?|Month|Week)[^)]*\)\s*$/i, '')
        .replace(/\s*\(\d[^)]*\)\s*$/, '')
        .trim();
    if (cleaned.length < 8 || cleaned.length > 90) return '';
    if (/^(timeline|key dates|overview|summary|scenario|persona|example)/i.test(cleaned)) return '';
    return sentenceCase(cleaned);
}

function collectActions(html) {
    const heads = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)];

    for (let i = 0; i < heads.length; i += 1) {
        if (!STEP_SECTION.test(stripTags(heads[i][1]))) continue;

        const start = heads[i].index + heads[i][0].length;
        const end = i + 1 < heads.length ? heads[i + 1].index : html.length;
        const section = html.slice(start, end);

        let raw = [...section.matchAll(/<h[34][^>]*>([\s\S]*?)<\/h[34]>/g)].map((m) => m[1]);
        if (raw.length < 3) {
            raw = [...section.matchAll(/<strong>\s*((?:Step|Phase|Stage)\s*\d+[^<]*)<\/strong>/gi)].map((m) => m[1]);
        }

        const actions = [];
        for (const item of raw) {
            const action = cleanAction(item);
            if (action) actions.push(action);
            if (actions.length >= 4) break;
        }
        if (actions.length >= 3) return actions;
    }

    return [];
}

function renderDoBlock(actions) {
    if (!actions.length) return '';
    return `<div class="do">
                    <p class="do__label">Do this next</p>
                    <ul>
${actions.map((action) => `                        <li>${esc(action)}</li>`).join('\n')}
                    </ul>
                </div>`;
}

function renderCta() {
    return `<div class="cta">
                    <h2>Where to go next</h2>
                    <p>The library lists every strategy in one table. The compare guides put two of them side by side and show which facts decide it.</p>
                    <p class="cta__actions">
                        <a class="btn-primary" href="/tax-strategies">Open the strategy library</a>
                        <a class="btn-secondary" href="/compare">Compare two strategies</a>
                    </p>
                </div>`;
}

function sourceType(dir, title) {
    return `${dir} ${title}`;
}

/** Sources, then the actions, then one closing block. Rebuilt on every run. */
function addClosing(html, filePath, dir) {
    let out = cutElements(html, /<section class="guide-close">/g, 'section');
    out = cutElements(out, /<section class="cta-section">/g, 'section');
    out = cutElements(out, /<div class="cta-card">/g, 'div');
    out = cutElements(out, /<section class="source-note"[^>]*>/g, 'section');

    const slug = path.basename(filePath, '.html');
    const title = stripTags((out.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || slug);
    const sources = renderSourceBlock({
        title,
        slug,
        type: sourceType(dir, title),
        heading: 'Sources to check',
    }).replace(/ style="[^"]*"/g, '').replace(/<h2>/, '<h2 id="sources">');

    const block = `        <section class="guide-close">
            <div class="container-custom">
                ${sources}
                ${renderDoBlock(collectActions(out))}
                ${renderCta()}
                <p class="guide-note">Educational content only. It is not individual tax, legal, or investment advice. Confirm your own facts with a qualified professional before you file.</p>
            </div>
        </section>
`;

    if (out.includes('</main>')) {
        return out.replace('</main>', `${block}    </main>`);
    }
    // A couple of guides never had a <main>; close them before the footer.
    if (out.includes('<footer')) {
        return out.replace('<footer', `${block}\n    <footer`);
    }
    return out;
}

function cleanIrsReference(html) {
    return replaceElements(html, /<div class="irs-reference">/g, 'div', (inner) => {
        const text = stripTags(inner.replace(/<svg[\s\S]*?<\/svg>/g, ''));
        if (!text) return '';
        return `<p class="guide-opener__meta">${esc(text)}</p>`;
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

/** An em dash is always a period or a comma in this voice. */
function removeEmDashes(html) {
    return html.replace(/>([^<]+)</g, (whole, text) => {
        if (!text.includes('—') && !text.includes('&mdash;')) return whole;
        const fixed = text
            .replace(/&mdash;/g, '—')
            .replace(/(\d)\s*—\s*(\d)/g, '$1 to $2')
            .replace(/\s*—\s*/g, ', ')
            .replace(/,\s*,/g, ',')
            .replace(/\s+,/g, ',')
            .replace(/,\s*([.!?])/g, '$1');
        return `>${fixed}<`;
    });
}

function normaliseScripts(html) {
    let out = html;

    // Drop inline handlers that now duplicate assets/js/main.js, and the FAQ
    // accordion script the <details> rows made redundant.
    out = out.replace(/[ \t]*<script>(?:(?!<\/script>)[\s\S])*?mobile-menu-btn[\s\S]*?<\/script>\n?/g, '');
    out = out.replace(/[ \t]*<script>(?:(?!<\/script>)[\s\S])*?mobileMenuBtn[\s\S]*?<\/script>\n?/g, '');
    out = out.replace(/[ \t]*<script>(?:(?!<\/script>)[\s\S])*?faq-(?:toggle|question)[\s\S]*?<\/script>\n?/g, '');

    if (!out.includes('/assets/js/main.js')) {
        const tail = '    <script defer src="/assets/js/main.js"></script>';
        out = out.includes('</body>')
            ? out.replace('</body>', `${tail}\n</body>`)
            : `${out.trimEnd()}\n${tail}\n`;
    }

    return out;
}

/** The kit styles .prose; the frozen guides still call it .prose-content. */
function renameProse(html) {
    return html
        .replace(/<div class="prose-content">/g, '<div class="prose">')
        .replace(/<div class="guide-prose">/g, '<div class="prose">');
}

function tidyWhitespace(html) {
    return html.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n');
}

function sweepFile(filePath, activeHref, dir) {
    const original = fs.readFileSync(filePath, 'utf8');
    let html = original;

    html = sweepHead(html);
    html = ensureBodyElement(html);
    html = swapHeader(html, activeHref);
    html = swapFooter(html);
    html = removeWorksheetLinks(html);
    html = removeFixedHeaderPadding(html);
    html = repairBrokenMarkup(html);
    html = removeBadges(html);
    html = removeEmDashes(html);
    html = removeMissingImages(html);
    html = unwrapAccentSpans(html);
    html = removeGlyphIcons(html);
    html = removeDecorativeClasses(html);
    html = scrubInlineStyles(html);
    html = cleanIrsReference(html);

    html = removePullQuotes(html);
    html = restoreTakeaways(html);
    html = convertCallouts(html);
    html = normaliseOrphanBoxParts(html);
    html = cleanHeadingLabels(html);
    html = foldSidebar(html);
    html = flattenColumns(html);
    html = convertFaq(html);
    html = removeDuplicateProseFaq(html);
    html = fixHeadingSkips(html);
    html = rebuildOpener(html);
    html = flattenFigures(html);
    html = convertDefinitionLists(html);
    html = addBigStatements(html);
    html = convertTables(html);
    html = addClosing(html, filePath, dir);
    html = addToc(html);
    html = renameProse(html);
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
            // Template output already ships the field guide structure; the
            // sweep only rewrites the hand-written long-form pages.
            if (fs.readFileSync(filePath, 'utf8').includes('data-page-type="tax_strategy"')) continue;

            scanned += 1;
            if (sweepFile(filePath, target.activeHref, target.dir)) {
                changed += 1;
                console.log(`  Swept: ${target.dir}/${name}`);
            }
        }
    }

    console.log(`\nSwept ${changed} of ${scanned} frozen guide pages.`);
}

main();
