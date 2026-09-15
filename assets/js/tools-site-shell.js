/*! tools site shell */
(function () {
  var HEADER = "<a href=\"#main\" class=\"guide-skip\">Skip to main content</a>\n    <header class=\"site-header\">\n        <nav class=\"container-custom site-nav\" aria-label=\"Main navigation\">\n            <a href=\"/\" class=\"site-brand\">Legacy Investing Show</a>\n            <div class=\"site-nav-links\">\n                <a href=\"/\" class=\"nav-link\">Home</a>\n                    <a href=\"/about\" class=\"nav-link\">About</a>\n                    <a href=\"/tax-strategies\" class=\"nav-link\">Tax Strategies</a>\n                    <a href=\"/compare\" class=\"nav-link\">Compare</a>\n                    <a href=\"/tools\" class=\"nav-link nav-link-active\">Tools</a>\n                    <a href=\"/blog\" class=\"nav-link\">Blog</a>\n            </div>\n            <button id=\"mobile-menu-btn\" class=\"site-nav-toggle\" aria-label=\"Open menu\" aria-expanded=\"false\" aria-controls=\"mobile-menu\">\n                <svg width=\"22\" height=\"22\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" aria-hidden=\"true\"><path d=\"M4 7h16M4 12h16M4 17h16\"/></svg>\n            </button>\n            <div id=\"mobile-menu\" class=\"site-nav-mobile hidden\">\n                <a href=\"/\" class=\"nav-link\">Home</a>\n                    <a href=\"/about\" class=\"nav-link\">About</a>\n                    <a href=\"/tax-strategies\" class=\"nav-link\">Tax Strategies</a>\n                    <a href=\"/compare\" class=\"nav-link\">Compare</a>\n                    <a href=\"/tools\" class=\"nav-link nav-link-active\">Tools</a>\n                    <a href=\"/blog\" class=\"nav-link\">Blog</a>\n            </div>\n        </nav>\n    </header>\n    <nav class=\"tools-subnav\" aria-label=\"Calculator categories\">\n        <div class=\"container-custom tools-subnav-inner\">\n            <a href=\"/tools\" aria-current=\"page\">All</a>\n            <a href=\"/tools/categories/money\">Money</a>\n            <a href=\"/tools/categories/banking-borrowing\">Banking</a>\n            <a href=\"/tools/categories/taxes-payroll\">Taxes</a>\n            <a href=\"/tools/categories/housing-moving\">Housing</a>\n            <a href=\"/tools/categories/insurance-protection\">Insurance</a>\n        </div>\n    </nav>";
  var FOOTER = "<footer class=\"site-footer\" role=\"contentinfo\">\n        <div class=\"container-custom\">\n            <div class=\"site-footer-grid\">\n                <div class=\"site-footer-brand\">\n                    <a href=\"/\" class=\"site-brand\">Legacy Investing Show</a>\n                    <p>Tax strategy, wealth systems, and practical decision tools for professionals, investors, and founders.</p>\n                </div>\n                <div class=\"site-footer-group\">\n                    <p class=\"site-footer-title\">Guides</p>\n                    <ul>\n                        <li><a href=\"/tax-strategies\">Tax strategies</a></li>\n                        <li><a href=\"/compare\">Compare guides</a></li>\n                        <li><a href=\"/topics\">Topics</a></li>\n                    </ul>\n                </div>\n                <div class=\"site-footer-group\">\n                    <p class=\"site-footer-title\">Tools</p>\n                    <ul>\n                        <li><a href=\"/tools\">Free calculators</a></li>\n                        <li><a href=\"/blog\">Blog</a></li>\n                    </ul>\n                </div>\n                <div class=\"site-footer-group\">\n                    <p class=\"site-footer-title\">Company</p>\n                    <ul>\n                        <li><a href=\"/about\">About Preston Seo</a></li>\n                        <li><a href=\"/success-stories\">Student results</a></li>\n                        <li><a href=\"/reviews\">Reviews</a></li>\n                        <li><a href=\"/privacy\">Privacy</a></li>\n                        <li><a href=\"/terms\">Terms</a></li>\n                    </ul>\n                </div>\n            </div>\n            <p class=\"site-footer-legal\">&copy; 2026 Legacy Investing Show. Educational content, not individual tax, legal, or investment advice.</p>\n        </div>\n    </footer>";

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

  function syncSubnav() {
    var path = (window.location.pathname || '').replace(/\/$/, '') || '/tools';
    var nav = document.querySelector('.tools-subnav');
    if (!nav) return;
    var links = nav.querySelectorAll('a[href]');
    for (var k = 0; k < links.length; k++) {
      var href = (links[k].getAttribute('href') || '').replace(/\/$/, '');
      var current = href === '/tools'
        ? path === '/tools'
        : path === href || path.indexOf(href + '/') === 0;
      if (current) links[k].setAttribute('aria-current', 'page');
      else links[k].removeAttribute('aria-current');
    }
  }

  function ensure() {
    hideCalcs2();
    if (!document.querySelector('.site-header')) insertHtml(HEADER, true);
    if (!document.querySelector('.site-footer')) insertHtml(FOOTER, false);
    var main = document.querySelector('main');
    if (main && !main.id) main.id = 'main';
    document.body.classList.add('tools-surface');
    bindMobile();
    syncSubnav();
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
