#!/usr/bin/env node
'use strict';

/**
 * Inject a "How this calculator works" block (method, assumptions,
 * limitations, related links) plus extra FAQ items into tools/<slug>.html and
 * merge those FAQ items into the page's existing FAQPage JSON-LD node.
 *
 * Content comes from data/tool-methodology.json, keyed by tool slug:
 *   {
 *     "<slug>": {
 *       "title": "…",              // optional, used in log output only
 *       "intro": "…",              // optional one-sentence summary
 *       "method": ["step", …],
 *       "assumptions": ["…", …],
 *       "limitations": ["…", …],
 *       "faqs": [{ "q": "…", "a": "…" }, …],
 *       "related": [{ "label": "…", "href": "/tax-strategies/…", "note": "…" }, …]
 *     }
 *   }
 *
 * Idempotent: everything this script writes sits between
 * <!-- tool-methodology:start --> … <!-- tool-methodology:end --> markers and is
 * replaced on every run. The FAQPage node is rebuilt from the page's original
 * questions plus this script's questions, so re-running never duplicates.
 *
 * Works on both page kinds found in tools/:
 *   - first-party operator calculators (templates/operator-calculator.html)
 *   - the vendored Next.js export (minified single-line HTML)
 * Both have <section aria-labelledby="related-heading"> before </main>; the
 * methodology block goes right before it. Pages with a visible FAQ section
 * (aria-labelledby="faq-heading") get the new questions appended inside it;
 * pages without one get a full FAQ section that also renders the questions the
 * page's JSON-LD already declared, so the FAQPage markup is backed by visible
 * content.
 *
 * Survives scripts/restyle-tools.js (only edits head/header/footer chrome) and
 * scripts/apply-indexation-policy.js (only edits <head> tags on tool pages).
 * Run after build:tools and build:shell, before build:indexation:
 *   node scripts/add-tool-methodology.js            # all slugs in the data file
 *   node scripts/add-tool-methodology.js cap-rate   # one or more slugs
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const TOOLS_DIR = path.join(ROOT_DIR, 'tools');
const DATA_PATH = path.join(ROOT_DIR, 'data', 'tool-methodology.json');
const SITE_URL = process.env.SITE_URL || 'https://www.legacyinvestingshow.com';
const CTA_HREF = 'https://join.managemoney101.com/tax-strategies';
const CTA_LABEL = 'Join the free tax masterclass';
const LAST_REVIEWED = '2026-09-17';

const START = '<!-- tool-methodology:start -->';
const END = '<!-- tool-methodology:end -->';
const NAMES_TAG = 'tool-methodology:faq-names';

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function ldJson(value) {
    return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

function asList(value) {
    return Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()) : [];
}

function internalHrefResolves(href) {
    if (!href.startsWith('/')) return true; // external links are not checked
    const clean = href.split('#')[0].split('?')[0].replace(/\/$/, '');
    if (clean === '') return true;
    const rel = clean.slice(1);
    return fs.existsSync(path.join(ROOT_DIR, `${rel}.html`)) ||
        fs.existsSync(path.join(ROOT_DIR, rel, 'index.html'));
}

// ---------------------------------------------------------------------------
// Markers and previous-run bookkeeping
// ---------------------------------------------------------------------------

function stripInjected(html) {
    const pattern = new RegExp(`${START}[\\s\\S]*?${END}`, 'g');
    return html.replace(pattern, '');
}

function previousFaqNames(html) {
    const match = html.match(new RegExp(`<!-- ${NAMES_TAG} (\\{[\\s\\S]*?\\}) -->`));
    if (!match) return [];
    try {
        const parsed = JSON.parse(match[1]);
        return Array.isArray(parsed.names) ? parsed.names : [];
    } catch (error) {
        return [];
    }
}

function namesComment(names) {
    // "--" is not allowed inside an HTML comment; JSON escapes keep it out.
    const json = JSON.stringify({ names }).replace(/--/g, '\\u002d\\u002d');
    return `<!-- ${NAMES_TAG} ${json} -->`;
}

// ---------------------------------------------------------------------------
// JSON-LD FAQPage merge
// ---------------------------------------------------------------------------

const LD_SCRIPT = /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;

function findFaqNode(json) {
    const nodes = Array.isArray(json) ? json : (Array.isArray(json['@graph']) ? json['@graph'] : [json]);
    return nodes.find((node) => node && node['@type'] === 'FAQPage') || null;
}

function toQuestion(faq) {
    return {
        '@type': 'Question',
        name: faq.q,
        acceptedAnswer: { '@type': 'Answer', text: faq.a }
    };
}

/**
 * Rebuild the page's FAQPage node as (original questions) + (our questions).
 * Returns { html, inherited, created } where inherited is the list of
 * {q, a} pairs already declared by the page (minus ours).
 */
function mergeFaqPage(html, slug, ownFaqs, dropNames) {
    const drop = new Set(dropNames);
    let inherited = [];
    let merged = false;
    let created = false;

    const next = html.replace(LD_SCRIPT, (whole, body) => {
        if (merged) return whole;
        let json;
        try {
            json = JSON.parse(body);
        } catch (error) {
            return whole;
        }
        const faqNode = findFaqNode(json);
        if (!faqNode) return whole;
        const existing = Array.isArray(faqNode.mainEntity) ? faqNode.mainEntity : [];
        const kept = existing.filter((item) => item && !drop.has(String(item.name || '')));
        inherited = kept.map((item) => ({
            q: String(item.name || ''),
            a: String((item.acceptedAnswer && item.acceptedAnswer.text) || '')
        })).filter((item) => item.q && item.a);
        faqNode.mainEntity = kept.concat(ownFaqs.map(toQuestion));
        merged = true;
        return whole.replace(body, ldJson(json));
    });

    if (merged) return { html: next, inherited, created };

    // No FAQPage on the page: the caller adds a standalone one inside the block.
    created = true;
    return { html, inherited, created };
}

function standaloneFaqScript(slug, faqs) {
    const url = `${SITE_URL}/tools/${slug}`;
    return `<script type="application/ld+json">${ldJson({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        mainEntity: faqs.map(toQuestion)
    })}</script>`;
}

// ---------------------------------------------------------------------------
// Markup
// ---------------------------------------------------------------------------

function faqItems(faqs) {
    return faqs.map((faq) => (
        `<details class="group border-b border-line py-3"><summary class="cursor-pointer list-none rounded-[4px] text-[15px] font-medium text-ink marker:content-none [&amp;::-webkit-details-marker]:hidden"><span class="flex items-start justify-between gap-4">${escapeHtml(faq.q)}<span aria-hidden="true" class="text-ink-faint transition group-open:rotate-45">+</span></span></summary><p class="mt-2 max-w-3xl text-[14px] leading-6 text-ink-muted">${escapeHtml(faq.a)}</p></details>`
    )).join('');
}

function listHtml(items, tag) {
    const cls = tag === 'ol'
        ? 'mt-2 list-decimal space-y-1.5 pl-5 text-[14px] leading-6 text-ink-muted'
        : 'mt-2 list-disc space-y-1.5 pl-5 text-[14px] leading-6 text-ink-muted';
    return `<${tag} class="${cls}">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</${tag}>`;
}

function relatedHtml(related, slug) {
    const items = related.filter((item) => {
        if (!item || !item.href || !item.label) return false;
        if (!internalHrefResolves(item.href)) {
            console.warn(`  ${slug}: dropping related link ${item.href} (no matching file)`);
            return false;
        }
        return true;
    });
    if (!items.length) return '';
    const rows = items.map((item) => {
        const note = item.note ? ` <span class="text-ink-muted">${escapeHtml(item.note)}</span>` : '';
        return `<li><a class="font-medium text-accent underline-offset-2 hover:underline" href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>${note}</li>`;
    }).join('');
    return `<div><h3 class="text-[15px] font-semibold text-ink">Go deeper</h3><ul class="mt-2 space-y-1.5 text-[14px] leading-6 text-ink">${rows}</ul></div>`;
}

function methodologySection(slug, entry, sectionClass, faqSection) {
    const intro = entry.intro
        ? `<p class="mt-1 max-w-3xl text-[14px] leading-6 text-ink-muted">${escapeHtml(entry.intro)}</p>`
        : '';
    const columns = [
        `<div><h3 class="text-[15px] font-semibold text-ink">Method</h3>${listHtml(asList(entry.method), 'ol')}</div>`,
        `<div><h3 class="text-[15px] font-semibold text-ink">Assumptions</h3>${listHtml(asList(entry.assumptions), 'ul')}</div>`,
        `<div><h3 class="text-[15px] font-semibold text-ink">Limitations</h3>${listHtml(asList(entry.limitations), 'ul')}</div>`
    ].join('');
    const note = `<div class="rounded-[8px] border border-line bg-paper-raised px-4 py-3 text-[13px] leading-5 text-ink-muted"><p><span class="font-medium text-ink">Educational estimate. </span>Not tax, legal, or investment advice. Federal rules only unless an input says otherwise. Confirm your own numbers with a licensed professional before acting. Last reviewed ${LAST_REVIEWED}.</p><p class="mt-2"><a class="font-medium text-accent underline-offset-2 hover:underline" href="${CTA_HREF}" data-track-event="cta_clicked" data-track-label="Free Tax Strategy Masterclass" data-track-location="tool_methodology" data-track-destination="${CTA_HREF}">${CTA_LABEL}</a> to see how this number fits a full plan.</p></div>`;
    return [
        `<section aria-labelledby="methodology-heading" class="${escapeHtml(sectionClass)}" data-tool-methodology="section">`,
        '<p class="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint">Methodology</p>',
        '<h2 id="methodology-heading" class="mt-1 text-[18px] font-semibold tracking-tight text-ink">How this calculator works</h2>',
        intro,
        `<div class="mt-6 grid gap-8 lg:grid-cols-3">${columns}</div>`,
        `<div class="mt-6 grid gap-8 lg:grid-cols-2">${relatedHtml(entry.related || [], slug)}${note}</div>`,
        '</section>',
        faqSection
    ].join('');
}

// ---------------------------------------------------------------------------
// Insertion points
// ---------------------------------------------------------------------------

function relatedSection(html) {
    const match = html.match(/<section\b[^>]*aria-labelledby="related-heading"[^>]*>/);
    if (!match) return null;
    const cls = (match[0].match(/class="([^"]*)"/) || [])[1] || '';
    return { index: match.index, className: cls };
}

function faqSectionInsertPoint(html) {
    const open = html.match(/<section\b[^>]*aria-labelledby="faq-heading"[^>]*>/);
    if (!open) return -1;
    const close = html.indexOf('</section>', open.index);
    if (close === -1) return -1;
    const lastDiv = html.lastIndexOf('</div>', close);
    return lastDiv > open.index ? lastDiv : close;
}

function insertAt(html, index, insertion) {
    return html.slice(0, index) + insertion + html.slice(index);
}

// ---------------------------------------------------------------------------
// Per-page injection
// ---------------------------------------------------------------------------

function injectOne(slug, entry) {
    const filePath = path.join(TOOLS_DIR, `${slug}.html`);
    if (!fs.existsSync(filePath)) {
        console.warn(`  ${slug}: tools/${slug}.html not found, skipped`);
        return 'missing';
    }
    const original = fs.readFileSync(filePath, 'utf8');
    const ownFaqs = (entry.faqs || []).filter((faq) => faq && faq.q && faq.a).map((faq) => ({ q: String(faq.q).trim(), a: String(faq.a).trim() }));
    const ownNames = ownFaqs.map((faq) => faq.q);
    if (!ownFaqs.length || !asList(entry.method).length) {
        console.warn(`  ${slug}: entry needs at least one method step and one FAQ, skipped`);
        return 'invalid';
    }

    const dropNames = previousFaqNames(original).concat(ownNames);
    let html = stripInjected(original);

    const merge = mergeFaqPage(html, slug, ownFaqs, dropNames);
    html = merge.html;

    const hasFaqSection = faqSectionInsertPoint(html) !== -1;
    const visibleFaqs = hasFaqSection ? ownFaqs : merge.inherited.concat(ownFaqs);
    const related = relatedSection(html);
    const sectionClass = related && related.className ? related.className : 'border-t border-line pt-10';

    let faqSection = '';
    if (!hasFaqSection) {
        faqSection = `<section aria-labelledby="faq-heading" class="${escapeHtml(sectionClass)}" data-tool-methodology="faq"><h2 id="faq-heading" class="text-[18px] font-semibold tracking-tight text-ink">FAQ</h2><div class="mt-3">${faqItems(visibleFaqs)}</div></section>`;
    }
    const standalone = merge.created ? standaloneFaqScript(slug, visibleFaqs) : '';

    const block = `${START}${namesComment(ownNames)}${methodologySection(slug, entry, sectionClass, faqSection)}${standalone}${END}`;

    if (related) {
        html = insertAt(html, related.index, block);
    } else if (html.includes('</main>')) {
        html = html.replace('</main>', `${block}</main>`);
    } else if (/<footer\b/.test(html)) {
        html = html.replace(/<footer\b/, `${block}<footer`);
    } else {
        html = html.replace('</body>', `${block}</body>`);
    }

    if (hasFaqSection) {
        const at = faqSectionInsertPoint(html);
        html = insertAt(html, at, `${START}${faqItems(ownFaqs)}${END}`);
    }

    // Sanity checks before writing.
    const h1Count = (html.match(/<h1\b/gi) || []).length;
    if (h1Count !== 1) console.warn(`  ${slug}: page has ${h1Count} <h1> tags`);
    for (const match of html.matchAll(LD_SCRIPT)) {
        JSON.parse(match[1]); // throws if the injected/merged JSON-LD is broken
    }
    const mainClose = html.indexOf('</main>');
    if (mainClose !== -1 && html.indexOf(START) > mainClose) {
        throw new Error(`${slug}: methodology block landed outside <main>`);
    }

    if (html === original) return 'unchanged';
    fs.writeFileSync(filePath, html);
    return 'written';
}

function main() {
    if (!fs.existsSync(DATA_PATH)) {
        console.error(`add-tool-methodology: ${path.relative(ROOT_DIR, DATA_PATH)} not found.`);
        process.exit(1);
    }
    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    const requested = process.argv.slice(2).filter((arg) => !arg.startsWith('-'));
    const slugs = requested.length ? requested : Object.keys(data);
    const counts = { written: 0, unchanged: 0, missing: 0, invalid: 0 };

    for (const slug of slugs) {
        const entry = data[slug];
        if (!entry) {
            console.warn(`  ${slug}: no entry in data/tool-methodology.json, skipped`);
            counts.missing += 1;
            continue;
        }
        const result = injectOne(slug, entry);
        counts[result] += 1;
    }

    console.log(`add-tool-methodology: ${counts.written} written, ${counts.unchanged} unchanged, ${counts.missing} missing, ${counts.invalid} invalid (of ${slugs.length}).`);
}

if (require.main === module) {
    try {
        main();
    } catch (error) {
        console.error(`add-tool-methodology failed: ${error.message}`);
        process.exit(1);
    }
}

module.exports = { injectOne, stripInjected, mergeFaqPage };
