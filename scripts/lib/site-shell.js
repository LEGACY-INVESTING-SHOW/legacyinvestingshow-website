const DEFAULT_GA_TRACKING_ID = 'G-2578PT1WSS';
const DEFAULT_GTM_CONTAINER_ID = 'GTM-KQ4R2LKP';
const CURRENT_YEAR = new Date().getFullYear();

const PRIMARY_NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/tax-strategies', label: 'Tax Strategies' },
  { href: '/compare', label: 'Compare' },
  { href: '/tools', label: 'Tools' },
  { href: '/blog', label: 'Blog' },
];

const FOOTER_NAV_ITEMS = [
  { href: '/tax-strategies', label: 'Tax Strategies' },
  { href: '/compare', label: 'Compare' },
  { href: '/markets', label: 'Markets' },
  { href: '/renters-insurance', label: 'Renters insurance' },
  { href: '/tools', label: 'Tools' },
  { href: '/success-stories', label: 'Results' },
  { href: '/blog', label: 'Blog' },
];

function esc(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isPlaceholderAnalyticsId(id) {
  const value = String(id || '').trim();
  return !value || value === 'G-XXXXXXXXXX' || value.includes('XXXX');
}

function isPlaceholderTagManagerId(id) {
  const value = String(id || '').trim();
  return !value || value === 'GTM-XXXXXXX' || value.includes('XXXXXXX');
}

function isActiveLink(activeHref, href) {
  const current = String(activeHref || '').trim() || '/';
  if (href === '/') return current === '/';
  return current === href || current.startsWith(href);
}

function renderPrimaryNavLinks(activeHref = '') {
  return PRIMARY_NAV_ITEMS.map((item) => {
    const activeClass = isActiveLink(activeHref, item.href) ? ' nav-link-active' : '';
    return `<a href="${item.href}" class="nav-link${activeClass}">${item.label}</a>`;
  }).join('\n                    ');
}

function renderFooterLinks() {
  return FOOTER_NAV_ITEMS.map((item) => `<a href="${item.href}">${item.label}</a>`).join('\n                    ');
}

function renderAnalyticsHead({
  gaTrackingId = process.env.GA_TRACKING_ID || '',
  gtmContainerId = process.env.GTM_CONTAINER_ID || DEFAULT_GTM_CONTAINER_ID,
} = {}) {
  const chunks = [];

  if (!isPlaceholderTagManagerId(gtmContainerId)) {
    chunks.push(
      `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${esc(gtmContainerId)}');</script>`
    );
  }

  if (!isPlaceholderAnalyticsId(gaTrackingId)) {
    chunks.push(
      `<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(gaTrackingId)}"></script>\n` +
      `<script>\n` +
      `    window.dataLayer = window.dataLayer || [];\n` +
      `    function gtag(){dataLayer.push(arguments);}\n` +
      `    gtag('js', new Date());\n` +
      `    gtag('config', '${esc(gaTrackingId)}');\n` +
      `</script>`
    );
  }

  return chunks.join('\n    ');
}

function renderAnalyticsBody({
  gtmContainerId = process.env.GTM_CONTAINER_ID || DEFAULT_GTM_CONTAINER_ID,
} = {}) {
  if (isPlaceholderTagManagerId(gtmContainerId)) {
    return '';
  }

  return `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${esc(gtmContainerId)}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`;
}

function buildReferenceSources({ title = '', slug = '', type = '' } = {}) {
  const text = `${title} ${slug} ${type}`.toLowerCase();

  const shared = [
    {
      label: 'Current IRS forms, instructions, and publications for the relevant tax year',
      href: 'https://www.irs.gov/forms-instructions',
    },
    {
      label: 'Your actual account statements, payroll reports, entity records, and advisor memos',
    },
  ];

  if (/estimated|safe-harbor|annualized|withholding/.test(text)) {
    return [
      {
        label: 'IRS Publication 505: Tax Withholding and Estimated Tax',
        href: 'https://www.irs.gov/forms-pubs/about-publication-505',
      },
      {
        label: 'IRS Form 1040-ES and instructions',
        href: 'https://www.irs.gov/forms-pubs/about-form-1040-es',
      },
      ...shared,
    ];
  }

  if (/roth|ira|401\(k\)|401k|qcd|irmaa/.test(text)) {
    return [
      {
        label: 'IRS retirement plan guidance and IRA rules',
        href: 'https://www.irs.gov/retirement-plans',
      },
      {
        label: 'Medicare premium and IRMAA guidance',
        href: 'https://www.medicare.gov',
      },
      ...shared,
    ];
  }

  if (/student-loan|student loan|mfs|mfj/.test(text)) {
    return [
      {
        label: 'Federal Student Aid repayment and IDR guidance',
        href: 'https://studentaid.gov',
      },
      {
        label: 'IRS filing status rules and current-year thresholds',
        href: 'https://www.irs.gov/filing',
      },
      ...shared,
    ];
  }

  if (/qbi/.test(text)) {
    return [
      {
        label: 'IRS Qualified Business Income deduction guidance',
        href: 'https://www.irs.gov/newsroom/qualified-business-income-deduction',
      },
      ...shared,
    ];
  }

  if (/s-corp|s corp|accountable|home-office|home office|augusta/.test(text)) {
    return [
      {
        label: 'IRS business-use-of-home and reimbursement guidance',
        href: 'https://www.irs.gov/publications/p587',
      },
      {
        label: 'IRS S corporation election resources',
        href: 'https://www.irs.gov/businesses/small-businesses-self-employed/s-corporations',
      },
      ...shared,
    ];
  }

  if (/cost segregation|bonus depreciation|reps|real estate|short-term rental|str/.test(text)) {
    return [
      {
        label: 'IRS Publication 946 and depreciation guidance',
        href: 'https://www.irs.gov/forms-pubs/about-publication-946',
      },
      {
        label: 'IRS passive activity rules (Publication 925)',
        href: 'https://www.irs.gov/forms-pubs/about-publication-925',
      },
      ...shared,
    ];
  }

  if (/installment|deferred sales trust|upreit|dst|1031/.test(text)) {
    return [
      {
        label: 'IRS installment sale guidance (Publication 537)',
        href: 'https://www.irs.gov/forms-pubs/about-publication-537',
      },
      {
        label: 'Offering documents, sponsor fee schedules, and transaction counsel memos',
      },
      {
        label: 'SEC filings or private placement materials where applicable',
        href: 'https://www.sec.gov',
      },
      ...shared,
    ];
  }

  if (/pricelabs|pricing|pms/.test(text)) {
    return [
      {
        label: 'Your actual ADR, occupancy, and revenue exports for the last 90 days',
      },
      {
        label: 'PriceLabs rules, PMS pricing settings, and override logs',
      },
      {
        label: 'Market seasonality and event calendars for your target market',
      },
    ];
  }

  return shared;
}

function renderSourceBlock({
  title = '',
  slug = '',
  type = '',
  heading = 'Primary Sources To Verify Before You Act',
} = {}) {
  const items = buildReferenceSources({ title, slug, type });

  const rows = items.map((item) => {
    const label = esc(item.label);
    if (item.href) {
      return `<li style="margin-bottom: 0.55rem;"><a href="${esc(item.href)}" rel="noopener noreferrer" target="_blank" style="color: #0f766e; text-decoration: underline;">${label}</a></li>`;
    }

    return `<li style="margin-bottom: 0.55rem;">${label}</li>`;
  }).join('\n');

  return `<section class="source-note" aria-label="Primary sources" style="margin: 2rem 0 0; padding: 1.25rem; border: 1px solid #e5e7eb; border-radius: 1rem; background: #f8fafc;">
            <h2 style="margin: 0 0 0.75rem; font-size: 1.2rem; color: #111827;">${esc(heading)}</h2>
            <p style="margin: 0 0 0.85rem; color: #4b5563; line-height: 1.7;">Use primary guidance and your own records before you treat any page like a final answer. These are the source layers that should drive the decision.</p>
            <ul style="margin: 0; padding-left: 1.1rem; list-style: disc; color: #374151;">
              ${rows}
            </ul>
          </section>`;
}

// ---- Shared site shell (header / footer / head assets) ------------------
// Every generated page and every static page mirrors this markup exactly.

const FOOTER_GROUPS = [
  {
    title: 'Guides',
    items: [
      { href: '/tax-strategies', label: 'Tax strategies' },
      { href: '/compare', label: 'Compare guides' },
      { href: '/topics', label: 'Topics' },
      { href: '/markets', label: 'City market guides' },
      { href: '/renters-insurance', label: 'Renters insurance by state' },
    ],
  },
  {
    title: 'Tools',
    items: [
      { href: '/tools', label: 'Free calculators' },
      { href: '/blog', label: 'Blog' },
    ],
  },
  {
    title: 'Company',
    items: [
      { href: '/about', label: 'About Preston Seo' },
      { href: '/success-stories', label: 'Student results' },
      { href: '/privacy', label: 'Privacy' },
      { href: '/terms', label: 'Terms' },
    ],
  },
];

function renderHeadAssets() {
  return [
    '<link rel="preload" href="/assets/fonts/dm-serif-display-400-latin.woff2" as="font" type="font/woff2" crossorigin>',
    '<link rel="preload" href="/assets/fonts/plus-jakarta-sans-variable-latin.woff2" as="font" type="font/woff2" crossorigin>',
    '<link rel="stylesheet" href="/assets/css/styles.css">',
  ].join('\n    ');
}

function renderSiteHeader(activeHref = '') {
  const links = renderPrimaryNavLinks(activeHref);
  return `<header class="site-header">
        <nav class="container-custom site-nav" aria-label="Main navigation">
            <a href="/" class="site-brand">
                <img src="/assets/images/logo.png" alt="" width="28" height="28">
                <span>Legacy Investing Show</span>
            </a>
            <div class="site-nav-links">
                ${links}
            </div>
            <button id="mobile-menu-btn" class="site-nav-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-menu">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
            </button>
            <div id="mobile-menu" class="site-nav-mobile hidden">
                ${links}
            </div>
        </nav>
    </header>`;
}

function renderSiteFooter() {
  const groups = FOOTER_GROUPS.map(
    (g) => `<div class="site-footer-group">
                    <h2>${esc(g.title)}</h2>
                    <ul>
                        ${g.items.map((i) => `<li><a href="${i.href}">${esc(i.label)}</a></li>`).join('\n                        ')}
                    </ul>
                </div>`
  ).join('\n                ');
  return `<footer class="site-footer" role="contentinfo">
        <div class="container-custom">
            <div class="site-footer-grid">
                <div class="site-footer-brand">
                    <a href="/" class="site-brand"><img src="/assets/images/logo.png" alt="" width="28" height="28"><span>Legacy Investing Show</span></a>
                    <p>Tax strategy, wealth systems, and practical decision tools for professionals, investors, and founders.</p>
                </div>
                ${groups}
            </div>
            <p class="site-footer-legal">&copy; ${CURRENT_YEAR} Legacy Investing Show. Educational content, not individual tax, legal, or investment advice.</p>
        </div>
    </footer>`;
}

module.exports = {
  renderHeadAssets,
  renderSiteHeader,
  renderSiteFooter,
  FOOTER_GROUPS,
  CURRENT_YEAR,
  DEFAULT_GA_TRACKING_ID,
  DEFAULT_GTM_CONTAINER_ID,
  renderAnalyticsBody,
  renderAnalyticsHead,
  renderFooterLinks,
  renderPrimaryNavLinks,
  renderSourceBlock,
};
