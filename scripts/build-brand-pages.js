#!/usr/bin/env node

/**
 * Build the brand-intent "convert cluster": five root-level pages for the
 * queries Search Console already sends clicks to (preston seo reviews,
 * is preston seo legit, legacy wealth blueprint reviews, legacy wealth
 * blueprint cost, manage money 101 reviews).
 *
 * Source: data/brand-pages.json. Numbers are pulled live from
 * data/trustpilot-summary.json, data/reviews-videos.json,
 * data/case-study-manifest.json and data/trustpilot-reviews.json so the
 * pages never drift from /reviews.
 *
 * Hard rules enforced here:
 *   - no program price anywhere (a guard scans the output);
 *   - every internal href must resolve to a file in the repo;
 *   - never link /success-stories, /pricing, /programs (301s to /reviews).
 *
 * Usage: node scripts/build-brand-pages.js
 */

const fs = require('fs');
const path = require('path');
const {
  renderAnalyticsBody,
  renderAnalyticsHead,
  renderHeadAssets,
  renderSiteFooter,
  renderSiteHeader,
} = require('./lib/site-shell');

const ROOT_DIR = path.join(__dirname, '..');
const DATA_PATH = path.join(ROOT_DIR, 'data', 'brand-pages.json');
const TRUSTPILOT_SUMMARY_PATH = path.join(ROOT_DIR, 'data', 'trustpilot-summary.json');
const TRUSTPILOT_REVIEWS_PATH = path.join(ROOT_DIR, 'data', 'trustpilot-reviews.json');
const VIDEOS_PATH = path.join(ROOT_DIR, 'data', 'reviews-videos.json');
const CASE_STUDIES_PATH = path.join(ROOT_DIR, 'data', 'case-study-manifest.json');
const OUTPUT_DIR = ROOT_DIR;

const SITE_URL = 'https://www.legacyinvestingshow.com';
const OG_IMAGE = `${SITE_URL}/assets/images/og-image.jpg`;
const PERSON_ID = `${SITE_URL}/about/preston-seo#person`;
const ORG_ID = `${SITE_URL}/#organization`;

const GA_TRACKING_ID = process.env.GA_TRACKING_ID || 'G-2578PT1WSS';
const GTM_CONTAINER_ID = process.env.GTM_CONTAINER_ID || 'GTM-KQ4R2LKP';
const GOOGLE_SITE_VERIFICATIONS = [
  'Kec6RfGhFL-qG_8zKxCqt7yxjgy65WeDAftCBm90G2s',
  '92MoCnkdQOj_ey1lEafT5Mz-znCcCQ3UABZlI-JG_nM',
];

// Paths that 301 elsewhere or were retired. Linking them is a build error.
const FORBIDDEN_LINK_PATTERNS = [
  /^\/success-stories/,
  /^\/pricing/,
  /^\/programs/,
  /^\/markets\//,
  /^\/renters-insurance\//,
  /^\/home$/,
  /\.html$/,
];

// ---------------------------------------------------------------- helpers

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Missing data file: ${filePath}`);
    process.exit(1);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Could not parse ${filePath}: ${error.message}`);
    process.exit(1);
  }
}

function esc(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Escape, then turn [text](href) into links. */
function inline(str = '') {
  return esc(str).replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, text, href) => {
    const external = /^https?:\/\//.test(href);
    const rel = external ? ' rel="noopener noreferrer" target="_blank"' : '';
    return `<a href="${href}"${rel}>${text}</a>`;
  });
}

/** Plain text for JSON-LD and meta: links reduced to their text. */
function plain(str = '') {
  return String(str).replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1');
}

function buildSEOTitle(rawTitle) {
  const suffix = ' | Legacy Investing Show';
  const title = String(rawTitle || '').replace(/\s+/g, ' ').trim();
  return title.endsWith(suffix) ? title : title + suffix;
}

function longDate(isoDate) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function truncateAtSentence(text, maxChars) {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  if (!maxChars || clean.length <= maxChars) return clean;
  const cut = clean.slice(0, maxChars);
  const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  return (lastStop > 40 ? cut.slice(0, lastStop + 1) : cut.trim()) + ' …';
}

// ------------------------------------------------------------- live facts

function loadFacts(shared) {
  const summary = readJson(TRUSTPILOT_SUMMARY_PATH);
  const reviewsFile = readJson(TRUSTPILOT_REVIEWS_PATH);
  const videos = readJson(VIDEOS_PATH);
  const caseStudies = readJson(CASE_STUDIES_PATH);

  const lwbVideos = videos.filter((v) => v.program === 'Legacy Wealth Blueprint');
  const stars = summary.starDistribution;

  return {
    summary,
    reviews: reviewsFile.reviews || [],
    videos,
    caseStudies,
    placeholders: {
      trustScore: String(summary.trustScore),
      totalReviews: String(summary.totalReviews),
      fivePct: String(stars.five.percentDisplayed),
      fourPct: String(stars.four.percentDisplayed),
      threePct: String(stars.three.percentDisplayed),
      twoPct: String(stars.two.percentDisplayed),
      onePct: String(stars.one.percentDisplayed),
      capturedDate: longDate(summary.capturedAt.slice(0, 10)),
      trustpilotUrl: summary.sourceUrl,
      videoCount: String(videos.length),
      lwbVideoCount: String(lwbVideos.length),
      airbnbVideoCount: String(videos.length - lwbVideos.length),
      caseStudyCount: String(caseStudies.length),
      writtenClientResults: String(shared.reviewsPageCounts.writtenClientResults),
      trustpilotReviewsReproduced: String(shared.reviewsPageCounts.trustpilotReviewsReproduced),
      wealthPlanPages: String(shared.reviewsPageCounts.wealthPlanPages),
      ctaHref: shared.ctaHref,
      lastUpdated: longDate(shared.lastUpdated),
    },
  };
}

function fill(str, placeholders) {
  return String(str).replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (!(key in placeholders)) {
      throw new Error(`Unknown placeholder {{${key}}}`);
    }
    return placeholders[key];
  });
}

// --------------------------------------------------------------- renderers

function renderParagraphs(items = [], ph) {
  return items.map((p) => `<p>${inline(fill(p, ph))}</p>`).join('\n');
}

function renderBullets(items = [], ph) {
  return items.map((item) => `<li>${inline(fill(item, ph))}</li>`).join('\n');
}

function renderSteps(items = [], ph) {
  return `<ol class="steps">
${items.map((item) => `                        <li><p>${inline(fill(item, ph))}</p></li>`).join('\n')}
                    </ol>`;
}

function renderTable(table, ph, wide = true) {
  const head = table.columns.map((c) => `<th scope="col">${esc(c)}</th>`).join('\n                                    ');
  const body = table.rows
    .map((row) => `<tr>
${row.map((cell) => `                                        <td>${inline(fill(cell, ph))}</td>`).join('\n')}
                                    </tr>`)
    .join('\n');
  const caption = table.caption ? `<caption>${inline(fill(table.caption, ph))}</caption>` : '';
  return `<div class="table-inset${wide ? ' table-inset--wide' : ''}">
                        <table class="table--zebra">
                            ${caption}
                            <thead>
                                <tr>
                                    ${head}
                                </tr>
                            </thead>
                            <tbody>
                                    ${body}
                            </tbody>
                        </table>
                    </div>`;
}

function renderCallout(callout, ph) {
  return `<div class="callout">
                        <p class="callout__label">${inline(fill(callout.label, ph))}</p>
                        <p>${inline(fill(callout.text, ph))}</p>
                    </div>`;
}

function renderTrustpilotQuotes(shared, facts) {
  const items = shared.trustpilotQuotes
    .map((pick) => {
      const review = facts.reviews.find((r) => r.reviewId === pick.reviewId);
      if (!review) {
        throw new Error(`Trustpilot review ${pick.reviewId} not found in data/trustpilot-reviews.json`);
      }
      const when = longDate(review.publishedDate.slice(0, 10)).replace(/^\d+ /, '');
      return `<li>
                            <blockquote>
                                <p>${esc(truncateAtSentence(review.text, pick.maxChars))}</p>
                                <footer>${esc(review.name)}, ${review.rating} stars, ${esc(when)}. <a href="${esc(review.reviewUrl)}" rel="noopener noreferrer" target="_blank">Read on Trustpilot</a></footer>
                            </blockquote>
                        </li>`;
    })
    .join('\n');
  return `<ul class="list-rows">
${items}
                    </ul>
                    <p class="guide-note">${inline(fill(shared.trustpilotQuotesNote, facts.placeholders))} Source: <a href="${esc(facts.summary.sourceUrl)}" rel="noopener noreferrer" target="_blank">${esc(facts.summary.businessDisplayName)} on Trustpilot</a>, captured ${esc(facts.placeholders.capturedDate)}.</p>`;
}

function renderLwbPageQuotes(shared, ph) {
  const items = shared.lwbPageQuotes
    .map((q) => `<li>
                            <blockquote>
                                <p>${esc(q.text)}</p>
                                <footer>${esc(q.name)}, ${esc(q.date)}</footer>
                            </blockquote>
                        </li>`)
    .join('\n');
  return `<ul class="list-rows">
${items}
                    </ul>
                    <p class="guide-note">Published on <a href="${esc(shared.lwbPageQuotesSource.href)}">${esc(shared.lwbPageQuotesSource.label)}</a>. Individual experiences, not a promise of results.</p>`;
}

function renderCustomSection(section, shared, facts) {
  const ph = facts.placeholders;
  const parts = [`<div class="prose">
                        <h2 id="${esc(section.id)}">${inline(fill(section.heading, ph))}</h2>
                        ${renderParagraphs(section.paragraphs || [], ph)}
                        ${section.bullets ? `<ul>\n${renderBullets(section.bullets, ph)}\n</ul>` : ''}
                    </div>`];
  if (section.table) parts.push(renderTable(section.table, ph));
  if (section.steps) parts.push(renderSteps(section.steps, ph));
  if (section.quotes === 'trustpilot') parts.push(renderTrustpilotQuotes(shared, facts));
  if (section.quotes === 'lwbPage') parts.push(renderLwbPageQuotes(shared, ph));
  if (section.callout) parts.push(renderCallout(section.callout, ph));
  return parts.join('\n                    ');
}

function renderEvidence(shared, facts) {
  const ph = facts.placeholders;
  const s = facts.summary;
  const stars = s.starDistribution;
  const incentivised = s.hasCollectedIncentivisedReviews
    ? 'Trustpilot records that incentivised reviews have been collected.'
    : 'Trustpilot records no incentivised reviews collected.';

  const rows = [
    [
      'Trustpilot rating',
      `TrustScore ${s.trustScore} from ${s.totalReviews} reviews: ${stars.five.percentDisplayed}% five star, ${stars.four.percentDisplayed}% four star, ${stars.three.percentDisplayed}% three star, ${stars.two.percentDisplayed}% two star, ${stars.one.percentDisplayed}% one star. Profile ${s.profileClaimed ? 'claimed' : 'not claimed'}. ${incentivised}`,
      `<a href="${esc(s.sourceUrl)}" rel="noopener noreferrer" target="_blank">${esc(s.sourceUrl.replace(/^https?:\/\/(www\.)?/, ''))}</a>, captured ${esc(ph.capturedDate)}`,
    ],
    [
      'Better Business Bureau',
      esc(shared.bbb.text),
      `<a href="${esc(shared.bbb.sourceHref)}">${esc(shared.bbb.sourceLabel)}</a>`,
    ],
    [
      'Named Legacy Wealth Blueprint case studies',
      `${facts.caseStudies.length} clients interviewed on video, each with a written case study and the figures they state themselves. Listed in the table below.`,
      '<a href="/reviews">Reviews and client results</a>',
    ],
    [
      'Recorded client interviews',
      `${facts.videos.length} interviews published in full: ${ph.lwbVideoCount} Legacy Wealth Blueprint, ${ph.airbnbVideoCount} Airbnb Arbitrage. All are conversations recorded by Preston Seo.`,
      '<a href="/reviews">Reviews page</a> and the <a href="/sitemap-video.xml">video sitemap</a>',
    ],
    [
      'Written client results',
      `${ph.writtenClientResults} written client results from the Legacy Wealth Blueprint community, ${ph.trustpilotReviewsReproduced} four and five star Trustpilot reviews reproduced as text, and ${ph.wealthPlanPages} pages from real client wealth plans with names blacked out.`,
      '<a href="/reviews">Reviews page</a> and its <a href="/llms/reviews.txt">plain-text mirror</a>',
    ],
    [
      'Preston Seo, the person',
      `<ul>${shared.bio.facts.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>`,
      `<a href="${esc(shared.bio.sourceHref)}">${esc(shared.bio.sourceLabel)}</a> and <a href="${esc(shared.bio.secondSourceHref)}">${esc(shared.bio.secondSourceLabel)}</a>`,
    ],
    [
      'Public profiles',
      shared.personSameAs
        .map((u) => `<a href="${esc(u)}" rel="noopener noreferrer" target="_blank">${esc(u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</a>`)
        .join('<br>'),
      'Listed on <a href="/about/preston-seo">the author page</a>',
    ],
  ];

  const caseRows = facts.caseStudies
    .map((c) => {
      const situation = shared.caseStudySituations[c.slug] || '';
      return `<tr>
                                        <td><a href="/blog/${esc(c.slug)}">${esc(c.name)}</a></td>
                                        <td>${esc(situation)}</td>
                                        <td>${esc(c.headlineResult)}</td>
                                        <td><a href="/blog/${esc(c.slug)}">Case study</a></td>
                                    </tr>`;
    })
    .join('\n');

  return `<div class="prose">
                        <h2 id="evidence">What the evidence shows</h2>
                        <p>Every row cites a source you can open. Independent sources (Trustpilot, the BBB) are listed first; first-party sources (interviews Preston records, the program page) are marked as such.</p>
                    </div>
                    <div class="table-inset table-inset--wide">
                        <table class="table--zebra">
                            <caption>Evidence on Preston Seo and Legacy Investing Show, with sources. Captured ${esc(ph.capturedDate)} for Trustpilot; other rows as published on this site.</caption>
                            <thead>
                                <tr>
                                    <th scope="col">Evidence</th>
                                    <th scope="col">What it shows</th>
                                    <th scope="col">Source</th>
                                </tr>
                            </thead>
                            <tbody>
${rows.map((r) => `                                    <tr>
                                        <td>${r[0]}</td>
                                        <td>${r[1]}</td>
                                        <td>${r[2]}</td>
                                    </tr>`).join('\n')}
                            </tbody>
                        </table>
                    </div>
                    <div class="prose">
                        <h3>The ${facts.caseStudies.length} named Legacy Wealth Blueprint case studies</h3>
                        <p>Each client was interviewed on video and each has a written case study. The result column is the figure the client gives, in their words.</p>
                    </div>
                    <div class="table-inset table-inset--wide">
                        <table class="table--zebra">
                            <thead>
                                <tr>
                                    <th scope="col">Client</th>
                                    <th scope="col">Situation</th>
                                    <th scope="col">Headline result, as stated by the client</th>
                                    <th scope="col">Read</th>
                                </tr>
                            </thead>
                            <tbody>
${caseRows}
                            </tbody>
                        </table>
                    </div>
                    <div class="callout">
                        <p class="callout__label">Read the results with this attached</p>
                        <p>${esc(shared.resultsDisclaimer)} ${esc(shared.caseStudyNote)}</p>
                    </div>`;
}

function renderFit(shared, ph) {
  return `<div class="prose">
                        <h2 id="fit">Who the Legacy Wealth Blueprint is for, and who it is not for</h2>
                        <h3>It is built for you if</h3>
                        <ul>
${renderBullets(shared.fitFor, ph)}
                        </ul>
                        <h3>It is not for you if</h3>
                        <ul>
${renderBullets(shared.fitNot, ph)}
                        </ul>
                    </div>`;
}

function renderIncluded(shared, ph) {
  return `<div class="prose">
                        <h2 id="included">What the Legacy Wealth Blueprint includes</h2>
                        <p>${esc(shared.includedTerm)} The list below is taken from the <a href="${esc(shared.programHref)}">program page</a>.</p>
                        <ul>
${renderBullets(shared.included, ph)}
                        </ul>
                        <h3>The five curriculum pillars</h3>
                        <ol>
${renderBullets(shared.pillars, ph)}
                        </ol>
                    </div>`;
}

function renderPricing(shared, page, ph) {
  const lead = page.pricingLead ? `<p>${inline(fill(page.pricingLead, ph))}</p>` : '';
  return `<div class="prose">
                        <h2 id="pricing">Pricing</h2>
                        ${lead}
                        ${renderParagraphs(shared.pricing, ph)}
                    </div>`;
}

function renderRefund(shared, ph) {
  return `<div class="prose">
                        <h2 id="refund">Refund terms</h2>
                        ${renderParagraphs(shared.refund, ph)}
                        <p>Source: <a href="/terms">the terms of service</a> and <a href="${esc(shared.programHref)}">the program page</a>.</p>
                    </div>`;
}

function renderCriticisms(shared, ph) {
  const rows = shared.criticisms
    .map((item) => `<tr>
                                        <td>${inline(fill(item.c, ph))}</td>
                                        <td>${inline(fill(item.a, ph))}</td>
                                    </tr>`)
    .join('\n');
  return `<div class="prose">
                        <h2 id="criticisms">Common criticisms and honest answers</h2>
                        <p>These are the objections that come up in one-star reviews and in any sensible buyer's head. None of them is dodged.</p>
                    </div>
                    <div class="table-inset table-inset--wide">
                        <table class="table--zebra">
                            <thead>
                                <tr>
                                    <th scope="col">Criticism</th>
                                    <th scope="col">Honest answer</th>
                                </tr>
                            </thead>
                            <tbody>
${rows}
                            </tbody>
                        </table>
                    </div>`;
}

function renderComparison(shared, ph) {
  const table = {
    caption: shared.comparison.caption,
    columns: shared.comparison.columns,
    rows: shared.comparison.rows.map((r) => [r.factor, r.lwb, r.cpa, r.diy]),
  };
  return `<div class="prose">
                        <h2 id="comparison">Legacy Wealth Blueprint vs a CPA vs DIY</h2>
                        <p>Most people choosing the program are really choosing between three ways of getting decisions made. This table is about scope and who does the work, not price.</p>
                    </div>
                    ${renderTable(table, ph)}`;
}

function renderFaq(faq, ph) {
  const items = faq
    .map((item) => `<details class="faq__item">
                            <summary>${esc(fill(item.q, ph))}</summary>
                            <div class="faq__answer">
                                <p>${inline(fill(item.a, ph))}</p>
                            </div>
                        </details>`)
    .join('\n');
  return `<div class="prose">
                        <h2 id="faq">Questions people ask</h2>
                    </div>
                    <div class="faq">
                        ${items}
                    </div>`;
}

function renderRelated(shared, page) {
  const cluster = shared.clusterLinks.filter((l) => l.href !== `/${page.slug}`);
  const li = (l) => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`;
  return `<div class="cta">
                        <h2 id="related">Related pages</h2>
                        <h3>The rest of this cluster</h3>
                        <ul>
                            ${cluster.map(li).join('\n                            ')}
                        </ul>
                        <h3>On this site</h3>
                        <ul>
                            ${shared.siteLinks.map(li).join('\n                            ')}
                            ${(page.pageLinks || []).map(li).join('\n                            ')}
                        </ul>
                        <p class="cta__actions">
                            <a href="${esc(shared.ctaHref)}" class="btn-primary" data-track-event="cta_clicked" data-track-label="Free Tax Strategy Masterclass" data-track-location="brand_page_${esc(page.slug)}" data-track-destination="${esc(shared.ctaHref)}">${esc(shared.ctaLabel)}</a>
                            <a href="${esc(shared.programHref)}" class="btn-secondary" data-track-event="cta_clicked" data-track-label="Legacy Wealth Blueprint" data-track-location="brand_page_${esc(page.slug)}" data-track-destination="${esc(shared.programHref)}">See the program page</a>
                        </p>
                    </div>`;
}

// ------------------------------------------------------------------ schema

function schemaGraph(page, shared, facts) {
  const canonical = `${SITE_URL}/${page.slug}`;
  const ph = facts.placeholders;
  const description = plain(fill(page.description, ph));

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${canonical}#webpage`,
        url: canonical,
        name: buildSEOTitle(page.title),
        headline: plain(fill(page.h1, ph)),
        description,
        inLanguage: 'en-US',
        datePublished: shared.lastUpdated,
        dateModified: shared.lastUpdated,
        isPartOf: { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, url: `${SITE_URL}/`, name: 'Legacy Investing Show' },
        about: [{ '@id': PERSON_ID }, { '@id': ORG_ID }],
        author: { '@id': ORG_ID },
        publisher: { '@id': ORG_ID },
        breadcrumb: { '@id': `${canonical}#breadcrumb` },
        mainEntity: { '@id': `${canonical}#faq` },
        citation: {
          '@type': 'WebPage',
          name: `${facts.summary.businessDisplayName} on Trustpilot`,
          url: facts.summary.sourceUrl,
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonical}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Reviews', item: `${SITE_URL}/reviews` },
          { '@type': 'ListItem', position: 3, name: plain(fill(page.h1, ph)), item: canonical },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': `${canonical}#faq`,
        mainEntity: page.faq.map((item) => ({
          '@type': 'Question',
          name: plain(fill(item.q, ph)),
          acceptedAnswer: { '@type': 'Answer', text: plain(fill(item.a, ph)) },
        })),
      },
      {
        '@type': 'Person',
        '@id': PERSON_ID,
        name: 'Preston Seo',
        url: `${SITE_URL}/about/preston-seo`,
        image: `${SITE_URL}/assets/images/preston-main.jpg`,
        jobTitle: 'Founder, Legacy Investing Show',
        description: 'Preston Seo founded Legacy Investing Show in 2020. He teaches tax strategy, investment planning, business structures, and retirement accounts to professionals, investors, and founders.',
        worksFor: { '@id': ORG_ID },
        sameAs: shared.personSameAs,
      },
      {
        '@type': 'Organization',
        '@id': ORG_ID,
        name: 'Legacy Investing Show',
        legalName: 'Legacy Investing Show, LLC',
        url: `${SITE_URL}/`,
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/assets/images/logo.png`, width: 2836, height: 1290 },
        founder: { '@id': PERSON_ID },
        address: { '@type': 'PostalAddress', addressLocality: 'Herriman', addressRegion: 'UT', addressCountry: 'US' },
        sameAs: shared.organizationSameAs,
      },
    ],
  };
}

// -------------------------------------------------------------------- page

function buildOutline(page, sections) {
  const customAt = (pos) => (page.customSections || []).filter((s) => s.position === pos).map((s) => [s.id, plain(s.heading)]);
  const outline = [['verdict', 'The short answer']];
  outline.push(...customAt('afterVerdict'));
  if (sections.evidence) outline.push(['evidence', 'What the evidence shows']);
  outline.push(...customAt('afterEvidence'));
  if (sections.fit) outline.push(['fit', 'Who it is for, and not for']);
  if (sections.included) outline.push(['included', 'What is included']);
  if (sections.pricing) outline.push(['pricing', 'Pricing']);
  if (sections.refund) outline.push(['refund', 'Refund terms']);
  if (sections.criticisms) outline.push(['criticisms', 'Criticisms and answers']);
  if (sections.comparison) outline.push(['comparison', 'Blueprint vs CPA vs DIY']);
  outline.push(...customAt('beforeFaq'));
  outline.push(['faq', 'Questions']);
  outline.push(['related', 'Related pages']);
  return outline;
}

function renderPage(page, shared, facts) {
  const ph = facts.placeholders;
  const canonical = `${SITE_URL}/${page.slug}`;
  const title = buildSEOTitle(plain(fill(page.title, ph)));
  const description = plain(fill(page.description, ph));
  const h1 = plain(fill(page.h1, ph));
  const sections = page.sections || {};
  const outline = buildOutline(page, sections);
  const custom = (pos) => (page.customSections || [])
    .filter((s) => s.position === pos)
    .map((s) => renderCustomSection(s, shared, facts))
    .join('\n\n                    ');

  const body = [
    `<div class="prose">
                        <h2 id="verdict">The short answer</h2>
                        ${renderParagraphs(page.verdict, ph)}
                    </div>`,
    custom('afterVerdict'),
    sections.evidence ? renderEvidence(shared, facts) : '',
    custom('afterEvidence'),
    sections.fit ? renderFit(shared, ph) : '',
    sections.included ? renderIncluded(shared, ph) : '',
    sections.pricing ? renderPricing(shared, page, ph) : '',
    sections.refund ? renderRefund(shared, ph) : '',
    sections.criticisms ? renderCriticisms(shared, ph) : '',
    sections.comparison ? renderComparison(shared, ph) : '',
    custom('beforeFaq'),
    renderFaq(page.faq, ph),
    renderRelated(shared, page),
  ].filter(Boolean).join('\n\n                    ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}">
    <meta name="robots" content="index, follow">
${GOOGLE_SITE_VERIFICATIONS.map((code) => `    <meta name="google-site-verification" content="${code}">`).join('\n')}
    <link rel="canonical" href="${canonical}">

    <meta property="og:type" content="article">
    <meta property="og:url" content="${canonical}">
    <meta property="og:title" content="${esc(h1)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:image" content="${OG_IMAGE}">
    <meta property="og:site_name" content="Legacy Investing Show">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(h1)}">
    <meta name="twitter:description" content="${esc(description)}">
    <meta name="twitter:image" content="${OG_IMAGE}">

    <meta name="theme-color" content="#FBF8F1">
    <link rel="icon" href="/favicon.ico" sizes="32x32">
    ${renderHeadAssets()}
    <link rel="stylesheet" href="/assets/css/guides.css">

    <script type="application/ld+json">${JSON.stringify(schemaGraph(page, shared, facts))}</script>

    ${renderAnalyticsHead({ gaTrackingId: GA_TRACKING_ID, gtmContainerId: GTM_CONTAINER_ID })}
</head>
<body class="guide-page" data-page-type="brand" data-page-slug="${esc(page.slug)}" data-page-title="${esc(h1)}">
    ${renderAnalyticsBody({ gtmContainerId: GTM_CONTAINER_ID })}
    <a href="#main" class="guide-skip">Skip to main content</a>

    ${renderSiteHeader('/reviews')}

    <main id="main">
        <section class="opener">
            <div class="container-custom">
                <div class="col">
                    <nav aria-label="Breadcrumb">
                        <ol class="breadcrumb">
                            <li class="breadcrumb__item"><a href="/" class="breadcrumb__link">Home</a></li>
                            <li class="breadcrumb__item"><a href="/reviews" class="breadcrumb__link">Reviews</a></li>
                            <li class="breadcrumb__item"><span class="breadcrumb__current">${esc(h1)}</span></li>
                        </ol>
                    </nav>
                    <h1 class="opener__title">${esc(h1)}</h1>
                    <p class="opener__key">${inline(fill(page.verdict[0], ph))}</p>
                    <p class="opener__lede">${inline(fill(page.lede, ph))}</p>
                    <p class="guide-opener__meta">Published by Legacy Investing Show. Last updated ${esc(ph.lastUpdated)}. Trustpilot figures captured ${esc(ph.capturedDate)}. ${esc(shared.resultsDisclaimer)}</p>
                </div>
            </div>
        </section>

        <section class="section section--rule">
            <div class="container-custom">
                <div class="col">
                    <details class="toc" open>
                        <summary>On this page</summary>
                        <ul>
${outline.map(([id, label]) => `                            <li><a href="#${id}">${esc(label)}</a></li>`).join('\n')}
                        </ul>
                    </details>

                    ${body}

                    <p class="guide-note">${esc(shared.resultsDisclaimer)} ${esc(shared.educationalDisclaimer)} Pricing for any Legacy Investing Show program is not published; it is discussed on the strategy call.</p>
                </div>
            </div>
        </section>
    </main>

    ${renderSiteFooter()}

    <script defer src="/assets/js/main.js"></script>
</body>
</html>`;
}

// ------------------------------------------------------------------ checks

function resolveInternalHref(href) {
  const clean = href.split('#')[0].split('?')[0];
  if (!clean || clean === '/') return path.join(ROOT_DIR, 'index.html');
  const rel = clean.replace(/^\//, '');
  const candidates = [
    path.join(ROOT_DIR, `${rel}.html`),
    path.join(ROOT_DIR, rel, 'index.html'),
    path.join(ROOT_DIR, rel),
  ];
  return candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile()) || null;
}

function checkLinks(html, slug, builtSlugs) {
  const hrefs = new Set();
  const re = /href="([^"]+)"/g;
  let m;
  while ((m = re.exec(html))) hrefs.add(m[1]);

  const problems = [];
  hrefs.forEach((href) => {
    if (/^(https?:|mailto:|tel:|#)/.test(href)) return;
    if (!href.startsWith('/')) {
      problems.push(`relative href "${href}"`);
      return;
    }
    if (FORBIDDEN_LINK_PATTERNS.some((p) => p.test(href.split('#')[0]))) {
      problems.push(`forbidden href "${href}"`);
      return;
    }
    const bare = href.split('#')[0].replace(/^\//, '');
    if (builtSlugs.includes(bare)) return; // sibling page built in this run
    if (!resolveInternalHref(href)) problems.push(`unresolved href "${href}"`);
  });
  if (problems.length) {
    console.error(`Link check failed for ${slug}.html:\n  ${problems.join('\n  ')}`);
    process.exit(1);
  }
}

function checkNoProgramPrice(html, slug) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/g, (s) => (s.includes('ld+json') ? s : ''))
    .replace(/<[^>]+>/g, ' ');
  const priceWords = /\b(price|priced|pricing|(?<!startup )costs?(?! deduction| segregation| basis)|tuition|enrol+ment|fee|fees|payment plan|financing|investment of)\b[^.]{0,80}\$\s?\d/gi;
  const hit = text.match(priceWords);
  if (hit) {
    console.error(`Possible program price wording in ${slug}.html:\n  ${hit.join('\n  ')}`);
    process.exit(1);
  }
  const cheap = /\b(five|four|low|mid|high)[- ]figures?\b|(?<!just )\bunder \$|\baround \$|\bstarting at\b|\bper month\b.*\bprogram\b/i;
  const cheapHit = text.match(cheap);
  if (cheapHit) {
    console.error(`Possible price hint in ${slug}.html: "${cheapHit[0]}"`);
    process.exit(1);
  }
}

function checkMeta(page, facts) {
  const ph = facts.placeholders;
  const rawTitle = plain(fill(page.title, ph));
  const description = plain(fill(page.description, ph));
  if (rawTitle.length > 60) console.warn(`  warn: title ${rawTitle.length} chars (>60) for ${page.slug}`);
  if (description.length < 150 || description.length > 160) {
    console.warn(`  warn: description ${description.length} chars (want 150-160) for ${page.slug}`);
  }
  if (page.faq.length < 6 || page.faq.length > 8) console.warn(`  warn: ${page.faq.length} FAQs for ${page.slug} (want 6-8)`);
}

// -------------------------------------------------------------------- main

function main() {
  const data = readJson(DATA_PATH);
  const shared = data.shared;
  const facts = loadFacts(shared);
  const builtSlugs = data.pages.map((p) => p.slug);

  data.pages.forEach((page) => {
    const html = renderPage(page, shared, facts);
    checkLinks(html, page.slug, builtSlugs);
    checkNoProgramPrice(html, page.slug);
    checkMeta(page, facts);
    const outPath = path.join(OUTPUT_DIR, `${page.slug}.html`);
    fs.writeFileSync(outPath, html, 'utf8');
    console.log(`Built ${page.slug}.html (${(html.length / 1024).toFixed(0)} KB)`);
  });
}

main();
