#!/usr/bin/env node
'use strict';

/**
 * Inject a "How this works" block (method, assumptions, limitations, optional
 * sources, short FAQ) into vendored /tools pages, driven by
 * data/tool-methodology.json. Only slugs listed there are touched.
 *
 * Idempotent: the block is wrapped in marker comments, so re-running replaces
 * it instead of duplicating it. Run it after build:tools / restyle-tools and
 * before build:indexation and the sitemap.
 *
 * The tools tree is a minified Next.js export that hydrates on the client.
 * The static markup is what crawlers and no-JS readers get. Because React can
 * drop nodes it did not render when it reconciles the body, the same section
 * HTML is also embedded in a JSON payload and a small runtime script
 * (assets/js/tool-methodology.js) re-inserts it if it goes missing, mirroring
 * how tools-site-shell.js keeps the shared header and footer in place.
 *
 * FAQPage JSON-LD is emitted only when the page does not already carry an
 * FAQPage node, so a page never ends up with two competing FAQ schemas.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const TOOLS_DIR = path.join(ROOT_DIR, 'tools');
const DATA_PATH = path.join(ROOT_DIR, 'data', 'tool-methodology.json');
const RUNTIME_PATH = path.join(ROOT_DIR, 'assets', 'js', 'tool-methodology.js');
const RUNTIME_SRC = '/assets/js/tool-methodology.js';
const SITE_URL = process.env.SITE_URL || 'https://www.legacyinvestingshow.com';
const SECTION_ID = 'tool-methodology';

const MARK = {
    sectionStart: '<!-- tool-methodology:section:start -->',
    sectionEnd: '<!-- tool-methodology:section:end -->',
    scriptsStart: '<!-- tool-methodology:scripts:start -->',
    scriptsEnd: '<!-- tool-methodology:scripts:end -->',
};

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Safe to embed inside <script>: no "<" survives, and it stays valid JSON. */
function scriptJson(value) {
    return JSON.stringify(value).replace(/</g, '\\u003c');
}

function formatDate(iso) {
    const date = new Date(`${iso}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

function listHtml(items) {
    return `<ul class="mt-2 list-disc space-y-1.5 pl-5 text-[14px] leading-6 text-ink-muted">${
        items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
    }</ul>`;
}

function paragraphsHtml(items) {
    return items.map((item) => `<p class="mt-2 text-[15px] leading-7 text-ink-muted">${escapeHtml(item)}</p>`).join('');
}

function faqHtml(faqs) {
    return faqs.map((faq) => (
        `<details class="group border-b border-line py-3"><summary class="cursor-pointer list-none rounded-[4px] text-[15px] font-medium text-ink marker:content-none [&::-webkit-details-marker]:hidden"><span class="flex items-start justify-between gap-4">${escapeHtml(faq.q)}<span aria-hidden="true" class="text-ink-faint transition group-open:rotate-45">+</span></span></summary><p class="mt-2 max-w-3xl text-[14px] leading-6 text-ink-muted">${escapeHtml(faq.a)}</p></details>`
    )).join('');
}

function sourcesHtml(sources) {
    if (!Array.isArray(sources) || sources.length === 0) return '';
    const items = sources.map((source) => (
        `<li><a class="underline underline-offset-2" href="${escapeHtml(source.href)}" rel="noopener">${escapeHtml(source.label)}</a></li>`
    )).join('');
    return `<div><h3 class="text-[15px] font-semibold text-ink">Sources</h3><ul class="mt-2 space-y-1 text-[14px] leading-6 text-ink-muted">${items}</ul></div>`;
}

function renderSection(slug, entry, updated) {
    const heading = entry.heading || 'How this calculator works';
    const faqHeading = entry.faqHeading || 'Frequently asked questions';
    return `<section id="${SECTION_ID}" data-tool-methodology="${escapeHtml(slug)}" aria-labelledby="${SECTION_ID}-heading" class="mt-14 border-t border-line pt-10">`
        + `<h2 id="${SECTION_ID}-heading" class="text-[18px] font-semibold tracking-tight text-ink">${escapeHtml(heading)}</h2>`
        + (entry.intro ? `<p class="mt-1 max-w-3xl text-[14px] text-ink-muted">${escapeHtml(entry.intro)}</p>` : '')
        + '<div class="mt-6 grid gap-10 lg:grid-cols-2">'
        + '<div class="space-y-6">'
        + `<div><h3 class="text-[15px] font-semibold text-ink">Method</h3>${paragraphsHtml(entry.method || [])}</div>`
        + `<div><h3 class="text-[15px] font-semibold text-ink">Assumptions</h3>${listHtml(entry.assumptions || [])}</div>`
        + '</div>'
        + '<div class="space-y-6">'
        + `<div><h3 class="text-[15px] font-semibold text-ink">Limitations</h3>${listHtml(entry.limitations || [])}</div>`
        + sourcesHtml(entry.sources)
        + '</div>'
        + '</div>'
        + `<div class="mt-8"><h3 id="${SECTION_ID}-faq-heading" class="text-[15px] font-semibold text-ink">${escapeHtml(faqHeading)}</h3><div class="mt-3">${faqHtml(entry.faqs || [])}</div></div>`
        + `<p class="mt-6 text-[12px] leading-5 text-ink-faint">Last updated ${escapeHtml(formatDate(updated))}. Educational estimates only, not individual tax, legal, insurance, or investment advice.</p>`
        + '</section>';
}

function faqSchema(slug, faqs) {
    const url = `${SITE_URL}/tools/${slug}`;
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        '@id': `${url}#methodology-faq`,
        mainEntity: faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.q,
            acceptedAnswer: { '@type': 'Answer', text: faq.a },
        })),
    };
}

function stripBlocks(html) {
    return html
        .replace(new RegExp(`${MARK.sectionStart}[\\s\\S]*?${MARK.sectionEnd}`, 'g'), '')
        .replace(new RegExp(`${MARK.scriptsStart}[\\s\\S]*?${MARK.scriptsEnd}`, 'g'), '');
}

function hasExistingFaqSchema(html) {
    return /"@type"\s*:\s*"FAQPage"/.test(html);
}

function insertSection(html, block) {
    const related = html.search(/<section\b[^>]*aria-labelledby="related-heading"/);
    if (related !== -1) {
        return { html: html.slice(0, related) + block + html.slice(related), where: 'before related calculators' };
    }
    const mainClose = html.lastIndexOf('</main>');
    if (mainClose !== -1) {
        const wrapped = `<div class="mx-auto max-w-5xl px-5">${block}</div>`;
        return { html: html.slice(0, mainClose) + wrapped + html.slice(mainClose), where: 'end of main' };
    }
    return { html, where: null };
}

function insertScripts(html, block) {
    const bodyClose = html.lastIndexOf('</body>');
    if (bodyClose === -1) return html;
    return html.slice(0, bodyClose) + block + html.slice(bodyClose);
}

function renderRuntimeScript() {
    return `/*! tool methodology */
(function () {
  var dataEl = document.getElementById('tool-methodology-data');
  if (!dataEl) return;
  var payload;
  try { payload = JSON.parse(dataEl.textContent || '{}'); } catch (error) { return; }
  if (!payload || !payload.html) return;

  function ensure() {
    if (document.getElementById(${JSON.stringify(SECTION_ID)})) return;
    var main = document.querySelector('main');
    if (!main) return;
    var tmp = document.createElement('div');
    tmp.innerHTML = payload.html;
    var section = tmp.firstElementChild;
    if (!section) return;
    var related = main.querySelector('section[aria-labelledby="related-heading"]');
    if (related && related.parentNode) {
      related.parentNode.insertBefore(section, related);
      return;
    }
    var host = main.firstElementChild && main.firstElementChild.tagName === 'DIV' ? main.firstElementChild : main;
    host.appendChild(section);
  }

  ensure();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensure);
  }
  var queued = null;
  var observer = new MutationObserver(function () {
    if (queued) return;
    queued = setTimeout(function () {
      queued = null;
      ensure();
    }, 80);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
`;
}

function applyToPage(slug, entry, updated) {
    const filePath = path.join(TOOLS_DIR, `${slug}.html`);
    if (!fs.existsSync(filePath)) {
        console.warn(`add-tool-methodology: no HTML for slug "${slug}" (expected ${path.relative(ROOT_DIR, filePath)}); skipped.`);
        return false;
    }
    const original = fs.readFileSync(filePath, 'utf8');
    const base = stripBlocks(original);

    const section = renderSection(slug, entry, updated);
    const inserted = insertSection(base, `${MARK.sectionStart}${section}${MARK.sectionEnd}`);
    if (!inserted.where) {
        console.warn(`add-tool-methodology: could not find an insertion point in ${slug}.html; skipped.`);
        return false;
    }

    const scripts = [
        `<script type="application/json" id="tool-methodology-data">${scriptJson({ slug, html: section })}</script>`,
    ];
    let schemaNote = 'FAQPage JSON-LD added';
    if (hasExistingFaqSchema(base)) {
        schemaNote = 'page already has FAQPage JSON-LD; not adding a second one';
    } else if (Array.isArray(entry.faqs) && entry.faqs.length > 0) {
        scripts.push(`<script type="application/ld+json" id="tool-methodology-faq">${scriptJson(faqSchema(slug, entry.faqs))}</script>`);
    } else {
        schemaNote = 'no FAQs in data; no FAQPage JSON-LD';
    }
    scripts.push(`<script src="${RUNTIME_SRC}" defer></script>`);

    const next = insertScripts(inserted.html, `${MARK.scriptsStart}${scripts.join('')}${MARK.scriptsEnd}`);
    const changed = next !== original;
    if (changed) fs.writeFileSync(filePath, next, 'utf8');
    console.log(`add-tool-methodology: ${slug} -> section ${inserted.where}; ${schemaNote}; ${changed ? 'written' : 'unchanged'}.`);
    return changed;
}

function main() {
    if (!fs.existsSync(DATA_PATH)) {
        console.log('add-tool-methodology: data/tool-methodology.json missing; nothing to do.');
        return;
    }
    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    const tools = data.tools || {};
    const updated = data.updated || new Date().toISOString().slice(0, 10);

    fs.mkdirSync(path.dirname(RUNTIME_PATH), { recursive: true });
    const runtime = renderRuntimeScript();
    if (!fs.existsSync(RUNTIME_PATH) || fs.readFileSync(RUNTIME_PATH, 'utf8') !== runtime) {
        fs.writeFileSync(RUNTIME_PATH, runtime, 'utf8');
    }

    let changed = 0;
    const slugs = Object.keys(tools);
    for (const slug of slugs) {
        if (applyToPage(slug, tools[slug], tools[slug].updated || updated)) changed += 1;
    }
    console.log(`add-tool-methodology: ${changed} of ${slugs.length} tool page(s) updated; runtime at ${path.relative(ROOT_DIR, RUNTIME_PATH)}.`);
}

if (require.main === module) {
    try {
        main();
    } catch (error) {
        console.error(`add-tool-methodology failed: ${error.message}`);
        process.exit(1);
    }
}

module.exports = { main, renderSection, faqSchema, stripBlocks };
