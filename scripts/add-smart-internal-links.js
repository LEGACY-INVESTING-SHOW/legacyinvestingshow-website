#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BLOG_DIR = path.join(ROOT, 'blog');
const TAX_DIR = path.join(ROOT, 'tax-strategies');
const ANALYSIS_DIR = path.join(ROOT, 'analysis');
const BACKUP_ROOT = path.join(ROOT, 'backups', `smart-links-${new Date().toISOString().replace(/[:.]/g, '-')}`);

const args = process.argv.slice(2);
const targetPathArg = args.find((a) => !a.startsWith('--'));
const dryRun = args.includes('--dry-run');
const testMode = args.includes('--test');
const fullMode = args.includes('--full');
const limitArg = args.find((a) => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : (testMode ? 5 : undefined);

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'your', 'you', 'are', 'was', 'were', 'have', 'has',
  'had', 'how', 'what', 'why', 'when', 'where', 'which', 'into', 'about', 'over', 'under', 'then', 'than',
  'just', 'more', 'most', 'less', 'very', 'can', 'will', 'would', 'should', 'could', 'our', 'their', 'they',
  'them', 'his', 'her', 'him', 'she', 'its', 'it', 'a', 'an', 'of', 'to', 'in', 'on', 'at', 'by', 'as', 'or',
  'be', 'is', 'if', 'not', 'but', 'we', 'do', 'does', 'did', 'up', 'out', 'all', 'any', 'may', 'also', 'than',
  'using', 'use', 'used', 'guide', 'strategy', 'strategies', 'legacy', 'investing', 'show'
]);

const THEME_RULES = [
  {
    theme: 'airbnb-short-term-rentals',
    keywords: ['airbnb', 'short-term rental', 'str', 'vacation rental', 'vrbo', 'booking', 'dynamic pricing', 'occupancy'],
    taxSlugs: ['short-term-rental-loophole', 'cost-segregation', 'bonus-depreciation', 'real-estate-professional-status']
  },
  {
    theme: 'real-estate-investing',
    keywords: ['real estate', 'rental property', 'multifamily', 'syndication', 'landlord', 'property', 'depreciation', 'cash flow'],
    taxSlugs: ['1031-exchange', 'cost-segregation', 'bonus-depreciation', 'rental-property-depreciation', 'real-estate-professional-status']
  },
  {
    theme: 'business-entities',
    keywords: ['llc', 's-corp', 's corp', 'sole proprietor', 'entity', 'incorporation', 'payroll', 'business owner'],
    taxSlugs: ['s-corp-strategy', 'qualified-business-income-deduction', 'business-vehicle-deduction', 'home-office-deduction']
  },
  {
    theme: 'retirement-planning',
    keywords: ['retirement', '401k', 'ira', 'roth', 'rollover', 'pre-retire', 'early retire', 'nest egg', 'pension'],
    taxSlugs: ['backdoor-roth-ira', 'mega-backdoor-roth', 'solo-401k', 'self-directed-ira', 'roth-conversion-ladder', 'net-unrealized-appreciation']
  },
  {
    theme: 'healthcare-benefits',
    keywords: ['hsa', 'health savings account', 'healthcare', 'medical expense', 'fsa', 'dependent care'],
    taxSlugs: ['hsa-strategy', 'health-savings-account-strategy', 'dependent-care-fsa']
  },
  {
    theme: 'capital-gains-investments',
    keywords: ['capital gains', 'stock sale', 'exit', 'liquidity event', 'tax gain', 'tax loss', 'harvesting'],
    taxSlugs: ['capital-gains-exclusion', 'tax-gain-harvesting', 'tax-loss-harvesting', 'installment-sale', 'qualified-small-business-stock']
  },
  {
    theme: 'charitable-estate-planning',
    keywords: ['charitable', 'donation', 'donor advised', 'trust', 'estate', 'legacy planning', 'philanthropy'],
    taxSlugs: ['donor-advised-fund', 'charitable-remainder-trust', 'bunching-deductions']
  },
  {
    theme: 'state-local-tax',
    keywords: ['state tax', 'residency', 'salt', 'pass-through entity tax', 'state filing', 'move states'],
    taxSlugs: ['state-tax-residency', 'pass-through-entity-tax']
  },
  {
    theme: 'opportunity-zones-1031',
    keywords: ['opportunity zone', 'oz fund', '1031', 'like-kind exchange', 'defer gains'],
    taxSlugs: ['1031-exchange', 'opportunity-zones', 'qualified-opportunity-zone-fund', '1031-exchange-vs-opportunity-zones']
  }
];

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function listHtmlFiles(dirPath) {
  return fs.readdirSync(dirPath)
    .filter((f) => f.endsWith('.html'))
    .map((f) => path.join(dirPath, f));
}

function extractFirst(html, regex, fallback = '') {
  const m = html.match(regex);
  return m ? decodeEntities(stripTags(m[1]).trim()) : fallback;
}

function stripTags(str) {
  return str
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeEntities(str) {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function normalizeSpace(s) {
  return s.replace(/\s+/g, ' ').trim();
}

function tokenize(text) {
  return normalizeSpace(text.toLowerCase())
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t && t.length > 2 && !STOPWORDS.has(t));
}

function countKeywordMatches(text, keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
  const m = text.match(regex);
  return m ? m.length : 0;
}

function parseTaxStrategies() {
  const files = listHtmlFiles(TAX_DIR).filter((p) => !p.endsWith('index.html'));
  const items = files.map((filePath) => {
    const html = fs.readFileSync(filePath, 'utf8');
    const slug = path.basename(filePath, '.html');
    const title = extractFirst(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i, extractFirst(html, /<title>([\s\S]*?)<\/title>/i, slug));
    const metaDesc = extractFirst(html, /<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["'][^>]*>/i, '');
    const text = stripTags(html).toLowerCase();

    const keywords = new Set([...tokenize(title), ...tokenize(metaDesc), ...slug.split('-')]);
    const candidateTokens = ['airbnb', 'rental', 'depreciation', 'retirement', 'roth', '401k', 'hsa', 'fsa', 'business', 'llc', 's-corp', 'charitable', 'estate', 'gains', 'loss', 'residency', 'opportunity', '1031', 'real-estate'];
    for (const token of candidateTokens) {
      if (text.includes(token.replace('-', ' ')) || text.includes(token)) keywords.add(token);
    }

    return {
      slug,
      title,
      url: `/tax-strategies/${slug}`,
      keywords: Array.from(keywords)
    };
  });

  const bySlug = new Map(items.map((i) => [i.slug, i]));
  return { items, bySlug };
}

function parseBlogPosts() {
  const files = listHtmlFiles(BLOG_DIR);
  return files.map((filePath) => {
    const html = fs.readFileSync(filePath, 'utf8');
    const slug = path.basename(filePath, '.html');
    const title = extractFirst(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i, extractFirst(html, /<title>([\s\S]*?)<\/title>/i, slug));
    const section = extractFirst(html, /<meta[^>]*property=["']article:section["'][^>]*content=["']([\s\S]*?)["'][^>]*>/i, 'General');
    const bodyMatch = html.match(/<div class="minimal-content[^>]*">([\s\S]*?)<\/div>\s*<!-- FAQ Section -->/i);
    const bodyHtml = bodyMatch ? bodyMatch[1] : html;
    const bodyText = stripTags(bodyHtml);
    const fullText = `${title} ${section} ${bodyText}`.toLowerCase();

    const termCounts = new Map();
    for (const tok of tokenize(fullText)) {
      termCounts.set(tok, (termCounts.get(tok) || 0) + 1);
    }

    return {
      filePath,
      slug,
      title,
      url: `/blog/${slug}`,
      section,
      html,
      bodyText,
      fullText,
      termCounts
    };
  });
}

function scoreThemes(post) {
  const scored = [];
  for (const rule of THEME_RULES) {
    let score = 0;
    for (const kw of rule.keywords) score += countKeywordMatches(post.fullText, kw.toLowerCase());
    if (score > 0) scored.push({ theme: rule.theme, score, taxSlugs: rule.taxSlugs });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

function pickTaxStrategies(post, taxBySlug) {
  const themeScores = scoreThemes(post);
  const scoreMap = new Map();

  for (const t of themeScores) {
    for (const slug of t.taxSlugs) {
      if (taxBySlug.has(slug)) {
        scoreMap.set(slug, (scoreMap.get(slug) || 0) + t.score * 2);
      }
    }
  }

  for (const [slug, tax] of taxBySlug.entries()) {
    let overlap = 0;
    for (const kw of tax.keywords) {
      if (kw.length < 3) continue;
      overlap += countKeywordMatches(post.fullText, kw.replace('-', ' '));
    }
    if (overlap > 0) scoreMap.set(slug, (scoreMap.get(slug) || 0) + overlap);
  }

  const fallbackByTheme = {
    retirement: ['backdoor-roth-ira', 'solo-401k', 'self-directed-ira'],
    realestate: ['1031-exchange', 'cost-segregation', 'rental-property-depreciation'],
    business: ['s-corp-strategy', 'qualified-business-income-deduction', 'home-office-deduction']
  };

  if (scoreMap.size === 0) {
    const t = post.fullText;
    const fallback = t.includes('401k') || t.includes('retire') || t.includes('ira')
      ? fallbackByTheme.retirement
      : (t.includes('llc') || t.includes('business') ? fallbackByTheme.business : fallbackByTheme.realestate);
    fallback.forEach((slug, i) => {
      if (taxBySlug.has(slug)) scoreMap.set(slug, 10 - i);
    });
  }

  const picked = Array.from(scoreMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([slug, score]) => ({ ...taxBySlug.get(slug), score }));

  return { picked, themeScores };
}

function similarityScore(postA, postB) {
  if (postA.slug === postB.slug) return -1;
  let score = 0;

  const keysA = Array.from(postA.termCounts.entries()).filter(([, c]) => c >= 2).map(([k]) => k);
  for (const key of keysA) {
    const bCount = postB.termCounts.get(key) || 0;
    if (bCount > 0) score += Math.min(postA.termCounts.get(key), bCount);
  }

  if (postA.section && postA.section === postB.section) score += 8;
  if (postA.slug.split('-')[0] === postB.slug.split('-')[0]) score += 3;

  return score;
}

function pickRelatedArticles(post, allPosts) {
  return allPosts
    .map((p) => ({ post: p, score: similarityScore(post, p) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((x) => x.post);
}

function buildRelatedSection(taxLinks, blogLinks) {
  const taxItems = taxLinks.map((t) => `\n            <li class="border-b border-gray-100 pb-3 last:border-0 last:pb-0">\n                <a href="${t.url}" class="text-gold hover:text-yellow-700 font-semibold underline">${t.title}</a>\n                <p class="text-sm text-gray-600 mt-1">Use this strategy to strengthen your tax plan around this topic.</p>\n            </li>`).join('');

  const blogItems = blogLinks.map((b) => `\n            <li class="border-b border-gray-100 pb-3 last:border-0 last:pb-0">\n                <a href="${b.url}" class="text-gold hover:text-yellow-700 font-semibold underline">${b.title}</a>\n            </li>`).join('');

  return `\n\n<section class="mt-12 bg-white rounded-xl shadow-lg p-8" data-smart-related="true">\n    <h2 class="text-3xl font-bold text-navy mb-6">Related Tax Strategies</h2>\n    <ul class="space-y-3 text-gray-700">${taxItems}\n    </ul>\n</section>\n\n<section class="mt-10 bg-white rounded-xl shadow-lg p-8" data-smart-related="true">\n    <h2 class="text-3xl font-bold text-navy mb-6">Related Articles</h2>\n    <ul class="space-y-3 text-gray-700">${blogItems}\n    </ul>\n</section>\n`;
}

function upsertRelatedSections(html, sectionHtml) {
  const markerRegex = /\s*<section class="mt-12 bg-white rounded-xl shadow-lg p-8" data-smart-related="true">[\s\S]*?<\/section>\s*<section class="mt-10 bg-white rounded-xl shadow-lg p-8" data-smart-related="true">[\s\S]*?<\/section>\s*/i;
  const cleaned = html.replace(markerRegex, '\n');
  const containerRegex = /(<div class="minimal-content[^>]*">)([\s\S]*?)(<\/div>\s*<!-- FAQ Section -->)/i;
  const match = cleaned.match(containerRegex);
  if (!match) return { updatedHtml: html, changed: false };

  const before = match[1];
  let content = match[2];
  const after = match[3];

  content = content.replace(/\s*<section[^>]*data-smart-related="true"[\s\S]*?<\/section>\s*/gi, '\n');
  const updated = `${before}${content}${sectionHtml}\n\n            ${after}`;
  const updatedHtml = cleaned.replace(containerRegex, updated);

  return { updatedHtml, changed: updatedHtml !== html };
}

function backupFile(filePath) {
  const rel = path.relative(ROOT, filePath);
  const backupPath = path.join(BACKUP_ROOT, rel);
  ensureDir(path.dirname(backupPath));
  fs.copyFileSync(filePath, backupPath);
}

function fixHsaTaxPage(blogPosts) {
  const hsaPath = path.join(TAX_DIR, 'health-savings-account-strategy.html');
  if (!fs.existsSync(hsaPath)) return { fixed: false, reason: 'missing file' };

  const html = fs.readFileSync(hsaPath, 'utf8');
  const hsaBlogs = blogPosts
    .filter((p) => /\bhsa\b|health savings|healthcare|medical|fsa/i.test(`${p.title} ${p.bodyText}`))
    .slice(0, 5);

  if (hsaBlogs.length === 0) return { fixed: false, reason: 'no matching blog posts found' };

  const listItems = hsaBlogs.map((p) => `<li><a href="${p.url}">${p.title}</a></li>`).join('\n');
  const block = `\n<section class="bg-white rounded-xl shadow-lg p-8 mt-12" data-smart-tax-related="true">\n    <h2 class="text-3xl font-bold text-navy mb-4">Related Blog Articles</h2>\n    <p class="text-gray-700 mb-4">Learn how to apply HSA and healthcare tax planning in real-world scenarios:</p>\n    <ul class="space-y-2 text-gray-700">\n${listItems}\n    </ul>\n</section>\n`;

  let updated = html.replace(/\s*<section[^>]*data-smart-tax-related="true"[\s\S]*?<\/section>\s*/gi, '\n');
  const articleInsertRegex = /(<\/article>)/i;
  const bodyInsertRegex = /(<\/body>)/i;

  if (articleInsertRegex.test(updated)) {
    updated = updated.replace(articleInsertRegex, `${block}\n$1`);
  } else if (bodyInsertRegex.test(updated)) {
    updated = updated.replace(bodyInsertRegex, `${block}\n$1`);
  } else {
    return { fixed: false, reason: 'could not find insertion point' };
  }

  if (updated !== html && !dryRun) {
    backupFile(hsaPath);
    fs.writeFileSync(hsaPath, updated, 'utf8');
  }

  return { fixed: updated !== html, linksAdded: hsaBlogs.length, file: hsaPath };
}

function createTaxonomyReport(taxStrategies, blogPosts) {
  ensureDir(ANALYSIS_DIR);

  const sampled = [];
  const step = Math.max(1, Math.floor(blogPosts.length / 50));
  for (let i = 0; i < blogPosts.length && sampled.length < 50; i += step) sampled.push(blogPosts[i]);

  const themeSummary = THEME_RULES.map((rule) => ({
    theme: rule.theme,
    keywords: rule.keywords,
    taxStrategies: rule.taxSlugs.filter((slug) => taxStrategies.bySlug.has(slug))
  }));

  const report = {
    generatedAt: new Date().toISOString(),
    taxStrategyCount: taxStrategies.items.length,
    blogPostCount: blogPosts.length,
    sampledBlogCount: sampled.length,
    themeSummary,
    taxStrategies: taxStrategies.items.map((t) => ({ slug: t.slug, title: t.title, keywords: t.keywords.slice(0, 20) })),
    sampledBlogTitles: sampled.map((p) => ({ slug: p.slug, title: p.title, section: p.section }))
  };

  fs.writeFileSync(path.join(ANALYSIS_DIR, 'smart-crosslinking-taxonomy.json'), JSON.stringify(report, null, 2));
  return report;
}

function run() {
  const taxStrategies = parseTaxStrategies();
  const blogPosts = parseBlogPosts();

  const taxonomyReport = createTaxonomyReport(taxStrategies, blogPosts);

  let targetPosts = blogPosts;
  if (targetPathArg) {
    const resolved = path.resolve(process.cwd(), targetPathArg);
    const one = blogPosts.find((p) => path.resolve(p.filePath) === resolved || p.slug === targetPathArg.replace(/\.html$/, ''));
    if (!one) throw new Error(`Target post not found: ${targetPathArg}`);
    targetPosts = [one];
  }

  if (typeof limit === 'number' && Number.isFinite(limit) && limit > 0) {
    targetPosts = targetPosts.slice(0, limit);
  }

  if (!dryRun) ensureDir(BACKUP_ROOT);

  const updatedPosts = [];
  const unmatchedPosts = [];
  const sampleMatchings = [];

  for (const post of targetPosts) {
    const { picked: taxLinks, themeScores } = pickTaxStrategies(post, taxStrategies.bySlug);
    const relatedBlogs = pickRelatedArticles(post, blogPosts);

    if (taxLinks.length < 3) unmatchedPosts.push({ slug: post.slug, title: post.title, foundTaxLinks: taxLinks.length });

    const sectionHtml = buildRelatedSection(taxLinks.slice(0, 5), relatedBlogs.slice(0, 5));
    const { updatedHtml, changed } = upsertRelatedSections(post.html, sectionHtml);

    if (changed && !dryRun) {
      backupFile(post.filePath);
      fs.writeFileSync(post.filePath, updatedHtml, 'utf8');
    }

    if (changed) {
      updatedPosts.push(post.filePath);
      if (sampleMatchings.length < 12) {
        sampleMatchings.push({
          postTitle: post.title,
          postSlug: post.slug,
          themes: themeScores.slice(0, 3),
          taxStrategies: taxLinks.slice(0, 5).map((t) => ({ slug: t.slug, title: t.title }))
        });
      }
    }
  }

  const hsaFix = fullMode || !targetPathArg ? fixHsaTaxPage(blogPosts) : { fixed: false, reason: 'not run in single-target mode' };

  const output = {
    mode: dryRun ? 'dry-run' : (fullMode ? 'full' : (testMode ? 'test' : 'default')),
    targetPosts: targetPosts.length,
    updatedPostCount: updatedPosts.length,
    updatedPosts,
    backupDir: dryRun ? null : BACKUP_ROOT,
    taxonomyReportPath: path.join(ANALYSIS_DIR, 'smart-crosslinking-taxonomy.json'),
    sampledBlogCount: taxonomyReport.sampledBlogCount,
    sampleMatchings,
    unmatchedPosts,
    hsaFix
  };

  ensureDir(ANALYSIS_DIR);
  fs.writeFileSync(path.join(ANALYSIS_DIR, 'smart-crosslinking-run-report.json'), JSON.stringify(output, null, 2));
  console.log(JSON.stringify(output, null, 2));
}

try {
  run();
} catch (err) {
  console.error(err.stack || err.message || String(err));
  process.exit(1);
}
