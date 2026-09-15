'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
    restyleToolsHtml,
    renderToolsChrome,
    renderShellRuntimeScript,
    rewriteToolsBrand,
} = require('../scripts/lib/tools-shell');

const ROOT = path.join(__dirname, '..');

const FIXTURE = `<!DOCTYPE html><html lang="en" class="inter_7b064e0d-module__MOT0tq__variable h-full antialiased"><head><meta charSet="utf-8"/><link rel="preload" href="/tools/_next/static/media/font.woff2" as="font" crossorigin="" type="font/woff2"/><link rel="stylesheet" href="/tools/_next/static/chunks/app.css"/><title>Mortgage payment calculator · Legacy Investing Calculators</title><meta property="og:site_name" content="Legacy Investing Calculators"/></head><body class="flex min-h-full flex-col font-sans"><header class="sticky top-0 z-40 border-b border-line bg-paper-raised/95 backdrop-blur-sm"><a href="/tools">Legacy Investing Calculators</a><a href="https://www.legacyinvestingshow.com" target="_blank">Show</a></header><main class="flex-1"><h1>Mortgage payment</h1></main><footer class="mt-auto border-t border-line"><a href="https://www.legacyinvestingshow.com" target="_blank">Visit the show</a><p>Legacy Investing Calculators. Not financial advice.</p></footer></body></html>`;

test('restyle wraps a calcs2 page in the site header, footer, and Public Sans', () => {
    const html = restyleToolsHtml(FIXTURE, 'tools/mortgage-payment.html');
    assert.match(html, /class="site-header"/);
    assert.match(html, /class="site-footer"/);
    assert.match(html, /class="tools-subnav"/);
    assert.match(html, /class="guide-skip"/);
    assert.match(html, /id="main"/);
    assert.match(html, /\btools-surface\b/);
    assert.match(html, /\/assets\/css\/styles\.css/);
    assert.match(html, /\/assets\/css\/tools-bridge\.css/);
    assert.match(html, /\/assets\/fonts\/public-sans-variable-latin\.woff2/);
    assert.match(html, /\/assets\/js\/tools-site-shell\.js/);
    assert.doesNotMatch(html, /\/tools\/_next\/static\/media\/font\.woff2/);
    assert.match(html, /<title>Mortgage payment calculator \| Legacy Investing Show<\/title>/);
    assert.match(html, /og:site_name" content="Legacy Investing Show"/);
    assert.match(html, /Legacy Investing Show<\/a>/);
    assert.match(html, /href="\/tax-strategies"/);
    assert.match(html, /href="\/tools"/);
    assert.equal(html.split('class="site-header"').length - 1, 1);
    assert.equal(html.split('class="site-footer"').length - 1, 1);
});

test('restyle is idempotent', () => {
    const once = restyleToolsHtml(FIXTURE, 'tools/mortgage-payment.html');
    const twice = restyleToolsHtml(once, 'tools/mortgage-payment.html');
    assert.equal(twice, once);
});

test('catalog home title becomes Free calculators, not a doubled brand', () => {
    const source = '<title>Legacy Investing Calculators | Legacy Investing Show</title><meta property="og:title" content="Legacy Investing Calculators"/><script>self.__next_f.push([1,"15:[[\\"$\\",\\"title\\",\\"0\\",{\\"children\\":\\"Legacy Investing Calculators\\"}]]"])</script>';
    const html = rewriteToolsBrand(source, 'tools/index.html');
    assert.equal(
        html.includes('<title>Free calculators | Legacy Investing Show</title>'),
        true
    );
    assert.doesNotMatch(html, /Legacy Investing Show \| Legacy Investing Show/);
    assert.match(html, /og:title" content="Free calculators \| Legacy Investing Show"/);
    assert.match(html, /children\\":\\"Free calculators \| Legacy Investing Show\\"/);
});

test('runtime shell script re-injects the shared chrome after hydration', () => {
    const script = renderShellRuntimeScript();
    assert.match(script, /site-header/);
    assert.match(script, /site-footer/);
    assert.match(script, /mobile-menu-btn/);
    assert.match(script, /MutationObserver/);
    assert.doesNotMatch(script, /Visit the show/);
    assert.doesNotMatch(script, /Legacy Investing Calculators/);
});

test('tools chrome includes the site nav, not a Show escape hatch', () => {
    const chrome = renderToolsChrome('/tools/categories/housing-moving');
    assert.match(chrome, /site-brand">Legacy Investing Show/);
    assert.match(chrome, /nav-link-active">Tools/);
    assert.match(chrome, /aria-current="page">Housing/);
    assert.doesNotMatch(chrome, />Show</);
    assert.doesNotMatch(chrome, /target="_blank"/);
});

test('operator and tax-structure templates no longer ship calcs2 chrome', () => {
    const operator = fs.readFileSync(path.join(ROOT, 'templates/operator-calculator.html'), 'utf8');
    assert.match(operator, /\{\{SITE_HEADER\}\}/);
    assert.match(operator, /\{\{SITE_FOOTER\}\}/);
    assert.match(operator, /tools-bridge\.css/);
    assert.match(operator, /og:site_name" content="Legacy Investing Show"/);
    assert.doesNotMatch(operator, /Legacy Investing Calculators/);
    assert.doesNotMatch(operator, /Visit the show/);

    const tax = fs.readFileSync(path.join(ROOT, 'templates/tax-structure-calculator.html'), 'utf8');
    assert.match(tax, /\{\{SITE_HEADER\}\}/);
    assert.match(tax, /\{\{SITE_FOOTER\}\}/);
    assert.doesNotMatch(tax, /plus-jakarta/);
    assert.doesNotMatch(tax, /dm-serif/);
    assert.doesNotMatch(tax, /class="top"/);
    assert.match(tax, /class="calc-notes"/);
});
