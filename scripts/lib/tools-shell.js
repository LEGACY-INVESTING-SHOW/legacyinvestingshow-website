'use strict';

const { renderHeadAssets, renderSiteHeader, renderSiteFooter } = require('./site-shell');

const TOOLS_CATEGORIES = [
    { href: '/tools', label: 'All' },
    { href: '/tools/categories/money', label: 'Money' },
    { href: '/tools/categories/banking-borrowing', label: 'Banking' },
    { href: '/tools/categories/taxes-payroll', label: 'Taxes' },
    { href: '/tools/categories/housing-moving', label: 'Housing' },
];

const BRIDGE_HREF = '/assets/css/tools-bridge.css';
const SHELL_SCRIPT_SRC = '/assets/js/tools-site-shell.js';
const PUBLIC_SANS_PRELOAD =
    '<link rel="preload" href="/assets/fonts/public-sans-variable-latin.woff2" as="font" type="font/woff2" crossorigin>';

function renderSkipLink() {
    return '<a href="#main" class="guide-skip">Skip to main content</a>';
}

function isSubnavActive(activeHref, href) {
    const current = String(activeHref || '').replace(/\/$/, '') || '/tools';
    if (href === '/tools') return current === '/tools';
    return current === href || current.startsWith(`${href}/`);
}

function renderToolsSubnav(activeHref = '/tools') {
    const links = TOOLS_CATEGORIES.map((item) => {
        const current = isSubnavActive(activeHref, item.href);
        const aria = current ? ' aria-current="page"' : '';
        return `<a href="${item.href}"${aria}>${item.label}</a>`;
    }).join('\n            ');
    return `<nav class="tools-subnav" aria-label="Calculator categories">
        <div class="container-custom tools-subnav-inner">
            ${links}
        </div>
    </nav>`;
}

function renderToolsChrome(activeHref = '/tools') {
    return [
        renderSkipLink(),
        renderSiteHeader('/tools'),
        renderToolsSubnav(activeHref),
    ].join('\n    ');
}

function renderToolsHeadLinks() {
    return [
        renderHeadAssets(),
        '<meta name="theme-color" content="#FBF8F1">',
    ].join('\n    ');
}

function rewriteToolsBrand(html, relativePath) {
    let next = html;
    next = next.replace(
        /(<title>)Legacy Investing Calculators(\s*\|\s*Legacy Investing Show)?(<\/title>)/g,
        '$1Free calculators | Legacy Investing Show$3'
    );
    next = next.replace(/ · Legacy Investing Calculators/g, ' | Legacy Investing Show');
    next = next.replace(/content="Legacy Investing Calculators"/g, 'content="Legacy Investing Show"');
    next = next.replace(/Legacy Investing Calculators/g, 'Legacy Investing Show');
    next = next.replace(/Legacy Investing Show \| Legacy Investing Show/g, 'Legacy Investing Show');
    if (relativePath === 'tools/index.html') {
        next = next.replace(
            /property="og:title" content="Legacy Investing Show"/,
            'property="og:title" content="Free calculators | Legacy Investing Show"'
        );
        next = next.replace(
            /name="twitter:title" content="Legacy Investing Show"/,
            'name="twitter:title" content="Free calculators | Legacy Investing Show"'
        );
        next = next.replace(
            '\\"title\\",\\"0\\",{\\"children\\":\\"Legacy Investing Show\\"}',
            '\\"title\\",\\"0\\",{\\"children\\":\\"Free calculators | Legacy Investing Show\\"}'
        );
        next = next.replace(
            '\\"og:title\\",\\"content\\":\\"Legacy Investing Show\\"}',
            '\\"og:title\\",\\"content\\":\\"Free calculators | Legacy Investing Show\\"}'
        );
        next = next.replace(
            '\\"twitter:title\\",\\"content\\":\\"Legacy Investing Show\\"}',
            '\\"twitter:title\\",\\"content\\":\\"Free calculators | Legacy Investing Show\\"}'
        );
    }
    return next;
}

function ensureBodyClass(html) {
    if (/\btools-surface\b/.test(html)) return html;
    if (/<body\b[^>]*class="/i.test(html)) {
        return html.replace(/<body(\b[^>]*class=")/i, '<body$1tools-surface ');
    }
    return html.replace(/<body(\b[^>]*)>/i, '<body$1 class="tools-surface">');
}

function ensureMainId(html) {
    if (/<main\b[^>]*\bid="/i.test(html)) return html;
    if (/<main class="flex-1">/.test(html)) {
        return html.replace('<main class="flex-1">', '<main id="main" class="flex-1">');
    }
    return html.replace(/<main\b/i, '<main id="main"');
}

function ensureHeadAssets(html) {
    let next = html.replace(
        /<link rel="preload" href="\/tools\/_next\/static\/media\/[^"]+\.woff2"[^>]*>/g,
        ''
    );
    if (!next.includes('/assets/fonts/public-sans-variable-latin.woff2')) {
        next = next.replace(/<\/head>/i, `    ${PUBLIC_SANS_PRELOAD}\n</head>`);
    }
    if (!next.includes('/assets/css/styles.css')) {
        next = next.replace(/<\/head>/i, '    <link rel="stylesheet" href="/assets/css/styles.css">\n</head>');
    }
    if (!next.includes(BRIDGE_HREF)) {
        next = next.replace(/<\/head>/i, `    <link rel="stylesheet" href="${BRIDGE_HREF}">\n</head>`);
    }
    if (!next.includes('name="theme-color"')) {
        next = next.replace(/<\/head>/i, '    <meta name="theme-color" content="#FBF8F1">\n</head>');
    }
    return next;
}

function ensureChrome(html, activeHref) {
    let next = html;
    if (!next.includes('class="site-header"')) {
        const chrome = renderToolsChrome(activeHref);
        next = next.replace(/<body\b[^>]*>/i, (open) => `${open}\n    ${chrome}`);
    } else if (!next.includes('class="tools-subnav"')) {
        next = next.replace(
            /(<header class="site-header">[\s\S]*?<\/header>)/,
            `$1\n    ${renderToolsSubnav(activeHref)}`
        );
    }
    if (!next.includes('class="guide-skip"')) {
        next = next.replace(/<body\b[^>]*>/i, (open) => `${open}\n    ${renderSkipLink()}`);
    }
    if (!next.includes('class="site-footer"')) {
        next = next.replace(/<\/body>/i, `    ${renderSiteFooter()}\n</body>`);
    }
    return next;
}

function ensureShellScript(html) {
    if (html.includes(SHELL_SCRIPT_SRC)) return html;
    return html.replace(/<\/body>/i, `    <script src="${SHELL_SCRIPT_SRC}" defer></script>\n</body>`);
}

function activeHrefFromRelativePath(relativePath) {
    const normalized = String(relativePath || '').replace(/\\/g, '/');
    if (normalized === 'tools/index.html') return '/tools';
    const category = normalized.match(/^tools\/categories\/([^/]+)\.html$/);
    if (category) return `/tools/categories/${category[1]}`;
    return '/tools';
}

/**
 * Wrap a tools HTML document in the shared site shell. Idempotent.
 * @param {string} html
 * @param {string} relativePath path from repo root, e.g. tools/cap-rate.html
 * @returns {string}
 */
function restyleToolsHtml(html, relativePath) {
    let next = html;
    next = rewriteToolsBrand(next, relativePath);
    next = ensureBodyClass(next);
    next = ensureMainId(next);
    next = ensureHeadAssets(next);
    next = ensureChrome(next, activeHrefFromRelativePath(relativePath));
    next = ensureShellScript(next);
    return next;
}

function renderShellRuntimeScript() {
    const header = renderToolsChrome('/tools');
    const footer = renderSiteFooter();
    return `/*! tools site shell */
(function () {
  var HEADER = ${JSON.stringify(header)};
  var FOOTER = ${JSON.stringify(footer)};

  function hideCalcs2() {
    var headers = document.querySelectorAll('header');
    for (var i = 0; i < headers.length; i++) {
      if (headers[i].classList.contains('site-header')) continue;
      headers[i].setAttribute('hidden', '');
      headers[i].setAttribute('aria-hidden', 'true');
    }
    var footers = document.querySelectorAll('footer');
    for (var j = 0; j < footers.length; j++) {
      if (footers[j].classList.contains('site-footer')) continue;
      footers[j].setAttribute('hidden', '');
      footers[j].setAttribute('aria-hidden', 'true');
    }
  }

  function bindMobile() {
    var btn = document.getElementById('mobile-menu-btn');
    var menu = document.getElementById('mobile-menu');
    if (!btn || !menu || btn.getAttribute('data-tools-bound') === '1') return;
    btn.setAttribute('data-tools-bound', '1');
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      menu.classList.toggle('hidden');
    });
    document.addEventListener('click', function (event) {
      if (menu.classList.contains('hidden')) return;
      if (menu.contains(event.target) || btn.contains(event.target)) return;
      menu.classList.add('hidden');
      btn.setAttribute('aria-expanded', 'false');
    });
  }

  function insertHtml(html, atStart) {
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    var body = document.body;
    if (atStart) {
      var first = body.firstChild;
      while (tmp.firstChild) body.insertBefore(tmp.firstChild, first);
      return;
    }
    while (tmp.firstChild) body.appendChild(tmp.firstChild);
  }

  function ensure() {
    hideCalcs2();
    if (!document.querySelector('.site-header')) insertHtml(HEADER, true);
    if (!document.querySelector('.site-footer')) insertHtml(FOOTER, false);
    var main = document.querySelector('main');
    if (main && !main.id) main.id = 'main';
    document.body.classList.add('tools-surface');
    bindMobile();
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

module.exports = {
    TOOLS_CATEGORIES,
    BRIDGE_HREF,
    SHELL_SCRIPT_SRC,
    activeHrefFromRelativePath,
    renderSkipLink,
    renderToolsChrome,
    renderToolsHeadLinks,
    renderToolsSubnav,
    renderShellRuntimeScript,
    restyleToolsHtml,
    rewriteToolsBrand,
};
