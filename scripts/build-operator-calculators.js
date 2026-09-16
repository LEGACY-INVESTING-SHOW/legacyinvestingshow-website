#!/usr/bin/env node
'use strict';

/**
 * Build first-party operator calculators into tools/ and list them on the
 * imported /tools catalog without editing the external calcs2 source.
 */

const fs = require('fs');
const path = require('path');
const models = require('../assets/js/operator-calculator-models');
const { renderSiteHeader, renderSiteFooter } = require('./lib/site-shell');
const { renderSkipLink, renderToolsHeadLinks, renderToolsSubnav } = require('./lib/tools-shell');

const ROOT_DIR = path.join(__dirname, '..');
const TOOLS_DIR = path.join(ROOT_DIR, 'tools');
const CATEGORIES_DIR = path.join(TOOLS_DIR, 'categories');
const CATALOG_PATH = path.join(ROOT_DIR, 'data', 'calculators', 'operator-catalog.json');
const TEMPLATE_PATH = path.join(ROOT_DIR, 'templates', 'operator-calculator.html');
const SITE_URL = process.env.SITE_URL || 'https://www.legacyinvestingshow.com';
const SECTION_ID = 'operator-calculators';
const SCRIPT_MARK = 'operator-catalog-embed.js';

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function listItems(items, ordered) {
    return items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
}

function fieldHtml(tool, input) {
    const id = `${tool.slug}-${input.id}`;
    const isPercent = input.type === 'percent';
    const isCurrency = input.type === 'currency';
    const min = input.min !== undefined ? input.min : 0;
    const step = input.step !== undefined ? input.step : (isPercent || isCurrency ? 'any' : 'any');
    const prefix = isCurrency
        ? '<span class="tools-affix tools-affix--prefix pointer-events-none absolute inset-y-0 left-3 flex items-center text-[13px] text-ink-faint" aria-hidden="true">$</span>'
        : '';
    const suffix = isPercent
        ? '<span class="tools-affix tools-affix--suffix pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px] text-ink-faint" aria-hidden="true">%</span>'
        : '';
    const pad = isCurrency ? 'pl-7 pr-3' : (isPercent ? 'px-3 pr-12' : 'px-3');
    const kind = isCurrency ? ' tools-control--prefix' : (isPercent ? ' tools-control--suffix' : '');
    return `<div class="space-y-1.5">
      <label for="${escapeHtml(id)}" class="block text-[13px] font-medium text-ink">${escapeHtml(input.label)}</label>
      <div class="relative">${prefix}<input id="${escapeHtml(id)}" name="${escapeHtml(input.id)}" class="tools-control${kind} w-full rounded-[6px] border bg-paper-raised py-2.5 text-[15px] tabular text-ink placeholder:text-ink-faint border-line ${pad}" inputmode="decimal" value="${escapeHtml(input.default)}" min="${min}" step="${step}" />${suffix}</div>
    </div>`;
}

function resultHtml(result) {
    const rows = (result.rows || []).map((row) => (
        `<div class="flex items-baseline justify-between gap-4 border-t border-line/80 pt-2 text-[14px]"><span class="text-ink-muted">${escapeHtml(row.label)}</span><span class="tabular font-medium text-ink">${escapeHtml(models.formatValue(row.value, row.format))}</span></div>`
    )).join('');
    return `<p class="text-[13px] font-medium text-ink-muted">${escapeHtml(result.headline.label)}</p><p class="mt-1 text-[32px] font-semibold tracking-tight tabular text-ink">${escapeHtml(models.formatValue(result.headline.value, result.headline.format))}</p>${rows ? `<div class="mt-4 space-y-2">${rows}</div>` : ''}`;
}

function examplesHtml(tool) {
    return tool.examples.map((example, index) => {
        const preview = models.compute(tool.slug, example.inputs);
        const selected = index === 0;
        const buttonClass = selected
            ? 'mt-4 self-start rounded-[6px] px-3 py-1.5 text-[13px] font-medium bg-accent text-paper-raised'
            : 'mt-4 self-start rounded-[6px] px-3 py-1.5 text-[13px] font-medium border border-line text-ink hover:border-accent hover:bg-accent-soft';
        const cellClass = selected
            ? 'flex flex-col p-4 sm:p-5 bg-accent-soft'
            : `flex flex-col p-4 sm:p-5 ${index === 0 ? '' : 'border-t border-line sm:border-t-0 sm:border-l '}bg-paper-raised`;
        return `<div class="${cellClass}">
      <p class="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-faint">Example ${index + 1}</p>
      <h3 class="mt-2 text-[14px] font-semibold text-ink">${escapeHtml(example.name)}</h3>
      <p class="mt-1 flex-1 text-[13px] leading-5 text-ink-muted">${escapeHtml(example.description)}</p>
      <p class="mt-4 text-[12px] text-ink-muted">${escapeHtml(preview.headline.label)}</p>
      <p class="text-[22px] font-semibold tracking-tight tabular text-ink">${escapeHtml(models.formatValue(preview.headline.value, preview.headline.format))}</p>
      <button type="button" data-example-index="${index}" aria-pressed="${selected ? 'true' : 'false'}" class="${buttonClass}">${selected ? 'Selected' : 'Use this example'}</button>
    </div>`;
    }).join('');
}

function faqHtml(faqs) {
    return faqs.map((faq) => (
        `<details class="group border-b border-line py-3"><summary class="cursor-pointer list-none rounded-[4px] text-[15px] font-medium text-ink marker:content-none [&::-webkit-details-marker]:hidden"><span class="flex items-start justify-between gap-4">${escapeHtml(faq.q)}<span aria-hidden="true" class="text-ink-faint transition group-open:rotate-45">+</span></span></summary><p class="mt-2 max-w-3xl text-[14px] leading-6 text-ink-muted">${escapeHtml(faq.a)}</p></details>`
    )).join('');
}

function relatedHtml(related) {
    return related.map((item) => (
        `<li><a class="flex items-start justify-between gap-4 px-1 py-3.5 hover:bg-accent-soft/40" href="${escapeHtml(item.href)}"><span><span class="block text-[15px] font-medium text-ink">${escapeHtml(item.label)}</span><span class="mt-0.5 block text-[13px] text-ink-muted">${escapeHtml(item.question)}</span></span><span aria-hidden="true" class="text-ink-faint">→</span></a></li>`
    )).join('');
}

function schemaJson(tool, category) {
    const url = `${SITE_URL}/tools/${tool.slug}`;
    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'WebApplication',
                '@id': `${url}#app`,
                name: `${tool.title} calculator`,
                url,
                applicationCategory: 'FinanceApplication',
                operatingSystem: 'Any',
                description: tool.description,
                isAccessibleForFree: true,
                offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
            },
            {
                '@type': 'FAQPage',
                '@id': `${url}#faq`,
                mainEntity: tool.faqs.map((faq) => ({
                    '@type': 'Question',
                    name: faq.q,
                    acceptedAnswer: { '@type': 'Answer', text: faq.a }
                }))
            },
            {
                '@type': 'BreadcrumbList',
                '@id': `${url}#breadcrumbs`,
                itemListElement: [
                    { '@type': 'ListItem', position: 1, name: 'All calculators', item: `${SITE_URL}/tools` },
                    { '@type': 'ListItem', position: 2, name: category.name, item: `${SITE_URL}/tools/categories/${tool.category}` },
                    { '@type': 'ListItem', position: 3, name: tool.title, item: url }
                ]
            }
        ]
    };
}

function detectAssets() {
    const indexPath = path.join(TOOLS_DIR, 'index.html');
    const fallback = {
        css: '/tools/_next/static/chunks/2tdy5h_g9hs2_.css',
        font: '/tools/_next/static/media/83afe278b6a6bb3c-s.p.2bn3s6zvc0dyp.woff2'
    };
    if (!fs.existsSync(indexPath)) return fallback;
    const html = fs.readFileSync(indexPath, 'utf8');
    const css = (html.match(/href="(\/tools\/_next\/static\/chunks\/[^"]+\.css)"/) || [])[1] || fallback.css;
    const font = (html.match(/href="(\/tools\/_next\/static\/media\/[^"]+\.woff2)"/) || [])[1] || fallback.font;
    return { css, font };
}

function renderPage(tool, template, categories, assets) {
    const defaults = {};
    tool.inputs.forEach((input) => { defaults[input.id] = input.default; });
    const result = models.compute(tool.slug, defaults);
    const category = categories[tool.category];
    const replacements = {
        TITLE: `${tool.title} calculator | Legacy Investing Show`,
        OG_TITLE: `${tool.title} calculator | Legacy Investing Show`,
        DESCRIPTION: tool.description,
        KEYWORDS: escapeHtml(`${tool.title}, ${category.name}, calculator, Legacy Investing Show`),
        CANONICAL: `${SITE_URL}/tools/${tool.slug}`,
        SHORT_TITLE: tool.title,
        QUESTION: tool.question,
        CATEGORY_HREF: `/tools/categories/${tool.category}`,
        CATEGORY_NAME: category.name,
        CSS_HREF: assets.css,
        HEAD_ASSETS: renderToolsHeadLinks(),
        SITE_HEADER: renderSiteHeader('/tools'),
        SITE_SKIP: renderSkipLink(),
        TOOLS_SUBNAV: renderToolsSubnav(`/tools/categories/${tool.category}`),
        SITE_FOOTER: renderSiteFooter(),
        SCHEMA: JSON.stringify(schemaJson(tool, category)).replace(/</g, '\\u003c'),
        FORM_FIELDS: tool.inputs.map((input) => fieldHtml(tool, input)).join('\n'),
        RESULT_HTML: resultHtml(result),
        ASSUMPTIONS: listItems(tool.assumptions),
        HOWTO: listItems(tool.howTo),
        MISTAKES: listItems(tool.mistakes),
        FORMULA: escapeHtml(tool.formula),
        ABOUT: escapeHtml(tool.description),
        FAQ_HTML: faqHtml(tool.faqs),
        RELATED_HTML: relatedHtml(tool.related),
        EXAMPLES: examplesHtml(tool),
        SPEC_JSON: JSON.stringify({
            slug: tool.slug,
            inputs: tool.inputs,
            examples: tool.examples
        }).replace(/</g, '\\u003c')
    };
    let html = template;
    for (const [key, value] of Object.entries(replacements)) {
        html = html.split(`{{${key}}}`).join(value);
    }
    if (html.includes('{{')) throw new Error(`Unreplaced placeholder in ${tool.slug}`);
    return html;
}

function listingCard(tool) {
    return `<a data-operator-tool="${escapeHtml(tool.slug)}" class="flex items-start justify-between gap-4 border-b border-line px-1 py-3.5 transition-colors hover:bg-accent-soft/50" href="/tools/${escapeHtml(tool.slug)}"><div class="min-w-0"><span class="text-[15px] font-medium text-ink">${escapeHtml(tool.title)}</span><p class="mt-0.5 text-[13px] text-ink-muted">${escapeHtml(tool.question)}</p></div><span aria-hidden="true" class="text-ink-faint">→</span></a>`;
}

function sectionHtml(tools, heading) {
    const cards = tools.map(listingCard).join('');
    return `<section id="${SECTION_ID}" class="scroll-mt-24 mb-10" aria-labelledby="cat-operator-calculators"><div class="mb-2 flex items-baseline justify-between gap-4"><h2 id="cat-operator-calculators" class="text-[18px] font-semibold tracking-tight text-ink">${escapeHtml(heading)}<span class="ml-2 text-[13px] font-normal text-ink-faint">${tools.length}</span></h2></div><p class="mb-3 text-[13px] text-ink-muted">Tax, investing, debt, short-term rental, and real-estate calculators mapped to Legacy Investing Show topics.</p><div class="border-t border-line">${cards}</div></section>`;
}

function writeEmbedScript(catalog) {
    const payload = catalog.tools.map((tool) => ({
        slug: tool.slug,
        title: tool.title,
        question: tool.question,
        category: tool.category
    }));
    const source = `/*! operator catalog embed */
(function () {
  var tools = ${JSON.stringify(payload)};
  var SECTION_ID = ${JSON.stringify(SECTION_ID)};

  function card(tool) {
    return '<a data-operator-tool="' + tool.slug + '" class="flex items-start justify-between gap-4 border-b border-line px-1 py-3.5 transition-colors hover:bg-accent-soft/50" href="/tools/' + tool.slug + '"><div class="min-w-0"><span class="text-[15px] font-medium text-ink">' + tool.title + '</span><p class="mt-0.5 text-[13px] text-ink-muted">' + tool.question + '</p></div><span aria-hidden="true" class="text-ink-faint">→</span></a>';
  }

  function section(list, heading) {
    return '<section id="' + SECTION_ID + '" class="scroll-mt-24 mb-10" aria-labelledby="cat-operator-calculators"><div class="mb-2 flex items-baseline justify-between gap-4"><h2 id="cat-operator-calculators" class="text-[18px] font-semibold tracking-tight text-ink">' + heading + '<span class="ml-2 text-[13px] font-normal text-ink-faint">' + list.length + '</span></h2></div><p class="mb-3 text-[13px] text-ink-muted">Tax, investing, debt, short-term rental, and real-estate calculators mapped to Legacy Investing Show topics.</p><div class="border-t border-line">' + list.map(card).join('') + '</div></section>';
  }

  function toolMatches(tool, q) {
    if (!q) return true;
    return (tool.title + ' ' + tool.question).toLowerCase().indexOf(q) !== -1;
  }

  function findEmptyState() {
    var nodes = document.querySelectorAll('p');
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].textContent.indexOf('No calculators match') !== -1) return nodes[i];
    }
    return null;
  }

  function query() {
    var search = document.getElementById('catalog-search');
    return search ? search.value.toLowerCase() : '';
  }

  function applySearch() {
    var q = query();
    var visible = 0;
    document.querySelectorAll('#' + SECTION_ID + ' [data-operator-tool]').forEach(function (row) {
      var hide = Boolean(q) && row.textContent.toLowerCase().indexOf(q) === -1;
      row.hidden = hide;
      if (!hide) visible += 1;
    });
    document.querySelectorAll('.space-y-10 [data-operator-tool]').forEach(function (row) {
      row.hidden = Boolean(q) && row.textContent.toLowerCase().indexOf(q) === -1;
    });
    var sectionEl = document.getElementById(SECTION_ID);
    if (sectionEl) {
      sectionEl.hidden = Boolean(q) && visible === 0;
      var countSpan = sectionEl.querySelector('#cat-operator-calculators span');
      if (countSpan) {
        countSpan.textContent = String(q ? visible : sectionEl.querySelectorAll('[data-operator-tool]').length);
      }
    }
    var empty = findEmptyState();
    if (empty) empty.style.display = (q && visible > 0) ? 'none' : '';
  }

  function ensureIndexSection() {
    if (document.getElementById(SECTION_ID)) return;
    var catalog = document.querySelector('[aria-labelledby="catalog-heading"]');
    if (catalog) catalog.insertAdjacentHTML('beforeend', section(tools, 'Tax, STR, debt & investing'));
  }

  function inject() {
    var path = window.location.pathname.replace(/\\/+$/, '') || '/tools';
    var search = document.getElementById('catalog-search');
    if (search && !search.dataset.operatorBound) {
      search.dataset.operatorBound = '1';
      search.addEventListener('input', applySearch);
    }
    if (path === '/tools' || path === '/tools/index.html') {
      ensureIndexSection();
      applySearch();
      return;
    }
    var match = path.match(/\\/tools\\/categories\\/([a-z0-9-]+)/);
    if (!match) return;
    var list = tools.filter(function (tool) { return tool.category === match[1]; });
    if (!list.length) return;
    var q = query();
    var host = document.querySelector('.space-y-10');
    var native = host && host.querySelector('.border-t.border-line');
    if (native) {
      list.forEach(function (tool) {
        if (!native.querySelector('[href="/tools/' + tool.slug + '"]')) {
          native.insertAdjacentHTML('beforeend', card(tool));
        }
      });
      var leftover = document.getElementById(SECTION_ID);
      if (leftover && !q) leftover.remove();
    } else if (q) {
      var matched = list.filter(function (tool) { return toolMatches(tool, q); });
      var empty = findEmptyState();
      var existing = document.getElementById(SECTION_ID);
      if (matched.length) {
        if (empty) empty.style.display = 'none';
        if (!existing) {
          var html = section(matched, 'Tax, STR, debt & investing');
          if (empty) empty.insertAdjacentHTML('afterend', html);
          else {
            var heading = document.getElementById('catalog-heading');
            if (heading) heading.insertAdjacentHTML('afterend', html);
          }
        }
      } else if (existing) {
        existing.remove();
      }
    }
    applySearch();
  }

  inject();
  setTimeout(inject, 50);
  setTimeout(inject, 400);
  var queued = null;
  var observer = new MutationObserver(function () {
    if (queued) return;
    queued = setTimeout(function () {
      queued = null;
      observer.disconnect();
      inject();
      var path = window.location.pathname.replace(/\\/+$/, '') || '/tools';
      if (path === '/tools' || path === '/tools/index.html') {
        if (document.getElementById(SECTION_ID) && document.getElementById('catalog-search')) return;
      }
      observer.observe(document.body, { childList: true, subtree: true });
    }, 80);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(function () {
    var path = window.location.pathname.replace(/\\/+$/, '') || '/tools';
    if (path === '/tools' || path === '/tools/index.html') observer.disconnect();
  }, 1500);
})();
`;
    const dest = path.join(ROOT_DIR, 'assets', 'js', 'operator-catalog-embed.js');
    fs.writeFileSync(dest, source);
    return '/assets/js/operator-catalog-embed.js';
}

function attachEmbed(filePath, scriptSrc) {
    if (!fs.existsSync(filePath)) return false;
    let html = fs.readFileSync(filePath, 'utf8');
    if (html.includes(SCRIPT_MARK)) return false;
    if (!html.includes('</body>')) return false;
    html = html.replace('</body>', `<script src="${scriptSrc}" defer></script></body>`);
    fs.writeFileSync(filePath, html);
    return true;
}

function insertBeforeMatchingSectionClose(html, marker, insertion) {
    const start = html.indexOf(marker);
    if (start === -1) return html;
    const open = html.lastIndexOf('<section', start);
    if (open === -1) return html;
    let depth = 0;
    let i = open;
    while (i < html.length) {
        const nextOpen = html.indexOf('<section', i);
        const nextClose = html.indexOf('</section>', i);
        if (nextClose === -1) return html;
        if (nextOpen !== -1 && nextOpen < nextClose) {
            depth += 1;
            i = nextOpen + 8;
            continue;
        }
        depth -= 1;
        if (depth === 0) {
            return html.slice(0, nextClose) + insertion + html.slice(nextClose);
        }
        i = nextClose + 10;
    }
    return html;
}

function injectStaticSection(indexPath, tools) {
    if (!fs.existsSync(indexPath)) return;
    let html = fs.readFileSync(indexPath, 'utf8');
    html = html.replace(/<section id="operator-calculators"[\s\S]*?<\/section>/, '');
    const section = sectionHtml(tools, 'Tax, STR, debt & investing');
    if (html.includes('aria-labelledby="catalog-heading"')) {
        html = insertBeforeMatchingSectionClose(html, 'aria-labelledby="catalog-heading"', section);
    } else if (html.includes('class="space-y-10"')) {
        html = html.replace('class="space-y-10">', `class="space-y-10">${section}`);
    }
    fs.writeFileSync(indexPath, html);
}

function injectCategoryCards(categorySlug, tools) {
    const filePath = path.join(CATEGORIES_DIR, `${categorySlug}.html`);
    if (!fs.existsSync(filePath)) return;
    let html = fs.readFileSync(filePath, 'utf8');
    const list = tools.filter((tool) => tool.category === categorySlug);
    let added = 0;
    for (const tool of list) {
        if (html.includes(`href="/tools/${tool.slug}"`)) continue;
        const card = listingCard(tool);
        html = html.replace(
            new RegExp(`(<section id="${categorySlug}"[\\s\\S]*?<div class="border-t border-line">)`),
            `$1${card}`
        );
        added += 1;
    }
    if (added > 0) {
        html = html.replace(
            new RegExp(`(id="cat-${categorySlug}"[^>]*>[^<]*<span[^>]*>)(\\d+)(</span>)`),
            (_, prefix, count, suffix) => `${prefix}${Number(count) + added}${suffix}`
        );
    }
    fs.writeFileSync(filePath, html);
}

function main() {
    const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
    const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    if (catalog.tools.length > 25) {
        throw new Error(`Operator catalog has ${catalog.tools.length} tools; cap is 25.`);
    }
    const missing = catalog.tools.filter((tool) => !models.slugs.includes(tool.slug));
    if (missing.length) {
        throw new Error(`Missing models for ${missing.map((tool) => tool.slug).join(', ')}`);
    }
    fs.mkdirSync(TOOLS_DIR, { recursive: true });
    const assets = detectAssets();
    for (const tool of catalog.tools) {
        models.compute(tool.slug, Object.fromEntries(tool.inputs.map((input) => [input.id, input.default])));
        const html = renderPage(tool, template, catalog.categories, assets);
        fs.writeFileSync(path.join(TOOLS_DIR, `${tool.slug}.html`), html);
    }
    injectStaticSection(path.join(TOOLS_DIR, 'index.html'), catalog.tools);
    Object.keys(catalog.categories).forEach((slug) => injectCategoryCards(slug, catalog.tools));
    const scriptSrc = writeEmbedScript(catalog);
    attachEmbed(path.join(TOOLS_DIR, 'index.html'), scriptSrc);
    if (fs.existsSync(CATEGORIES_DIR)) {
        for (const entry of fs.readdirSync(CATEGORIES_DIR)) {
            if (entry.endsWith('.html')) attachEmbed(path.join(CATEGORIES_DIR, entry), scriptSrc);
        }
    }
    console.log(`Built ${catalog.tools.length} operator calculators into tools/.`);
}

try {
    main();
} catch (error) {
    console.error(`Operator calculators build failed: ${error.message}`);
    process.exit(1);
}
