#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content', 'blog');
const ANALYSIS_DIR = path.join(ROOT, 'analysis', 'seo-1000');
const OUTPUT_TOPICS = path.join(ROOT, 'data', 'seo-topics-1000.json');
const OUTPUT_REPORT = path.join(ANALYSIS_DIR, 'keyword-research-report.md');
const OUTPUT_BACKLOG = path.join(ANALYSIS_DIR, 'keyword-backlog.csv');
const OUTPUT_PHASE1 = path.join(ROOT, 'data', 'seo-topics-80-20-phase1.json');
const OUTPUT_PHASE1_CSV = path.join(ANALYSIS_DIR, 'keyword-backlog-phase1.csv');

const TARGET = 1000;
const TODAY = new Date().toISOString().slice(0, 10);

const HUBS = {
  tax_strategies: '/topics/tax-strategies',
  retirement: '/topics/retirement',
  business_structures: '/topics/business-structures',
  investing: '/topics/investing',
  debt_management: '/topics/debt-management',
  passive_income: '/topics/investing',
  airbnb_arbitrage: '/topics/airbnb-arbitrage'
};

const CATEGORIES = [
  {
    key: 'tax_strategies',
    target: 220,
    seeds: ['tax strategy', 'tax deduction', 'tax planning', 'roth conversion', 'qbi deduction', 'cost segregation', '1031 exchange', 'hsa strategy', 'estate tax planning', 'capital gains tax'],
    personas: ['high earners', 'small business owners', 'real estate investors', 'self employed professionals', 'physicians', 'consultants'],
    alternatives: ['standard deduction', 'itemized deductions', 'entity restructuring', 'retirement contributions', 'charitable planning']
  },
  {
    key: 'retirement',
    target: 170,
    seeds: ['401k strategy', 'ira strategy', 'roth ira', 'backdoor roth', 'retirement withdrawal strategy', 'required minimum distributions', 'social security claiming', 'sequence of returns risk', 'retirement income plan', 'annuities vs bonds'],
    personas: ['pre retirees', 'early retirees', 'government employees', 'self employed', 'married couples', 'high income families'],
    alternatives: ['taxable brokerage', 'pension options', 'cash bucket strategy', 'bond ladders', 'delayed retirement']
  },
  {
    key: 'business_structures',
    target: 150,
    seeds: ['llc vs s corp', 's corp election', 'reasonable salary', 'holding company', 'series llc', 'operating agreement', 'registered agent', 'business succession planning', 'corporate veil', 'multi state llc'],
    personas: ['freelancers', 'agency owners', 'ecommerce founders', 'real estate operators', 'service businesses', 'consultants'],
    alternatives: ['sole proprietorship', 'partnership', 'c corp', 'professional llc', 'trust structure']
  },
  {
    key: 'investing',
    target: 170,
    seeds: ['index fund investing', 'asset allocation', 'etf vs mutual fund', 'dividend growth investing', 'value investing', 'portfolio rebalancing', 'investment fees', 'international diversification', 'bond ladders', 'tax loss harvesting'],
    personas: ['beginners', 'high earners', 'busy professionals', 'parents', 'late starters', 'entrepreneurs'],
    alternatives: ['target date funds', 'robo advisors', 'active funds', 'real estate syndication', 'private credit']
  },
  {
    key: 'debt_management',
    target: 130,
    seeds: ['debt avalanche', 'debt snowball', 'debt consolidation', 'balance transfer', 'credit score optimization', 'mortgage refinancing', 'heloc strategy', 'student loan payoff', 'debt to income ratio', 'personal loan vs credit card'],
    personas: ['new graduates', 'families', 'small business owners', 'high earners with lifestyle debt', 'w2 professionals', 'self employed'],
    alternatives: ['cash flow budgeting', 'refinance', 'forbearance', 'negotiated settlements', 'bankruptcy planning']
  },
  {
    key: 'passive_income',
    target: 100,
    seeds: ['rental property investing', 'house hacking', 'brrrr method', 'self storage investing', 'laundromat investing', 'atm business', 'royalty income', 'digital products', 'short term rental investing', 'airbnb cash flow'],
    personas: ['w2 professionals', 'new investors', 'families', 'remote workers', 'operators', 'career switchers'],
    alternatives: ['index funds', 'reits', 'small business acquisition', 'notes investing', 'franchise investing']
  },
  {
    key: 'airbnb_arbitrage',
    target: 60,
    seeds: ['airbnb arbitrage', 'short term rental setup', 'airbnb pricing strategy', 'airbnb landlord pitch', 'airbnb automation', 'airbnb taxes', 'airbnb startup costs', 'airbnb market analysis', 'airbnb occupancy strategy', 'airbnb compliance'],
    personas: ['beginners', 'full time employees', 'real estate investors', 'hosts', 'side hustlers', 'operators'],
    alternatives: ['long term rentals', 'mid term rentals', 'co hosting', 'property management', 'direct booking']
  }
];

const QUALIFIERS = [
  'for beginners', 'for high earners', 'for small business owners', 'checklist', 'step by step', 'mistakes to avoid', 'vs', 'calculator', 'template', '2026', 'tax implications', 'best strategy', 'case study', 'examples'
];

const BANNED_PATTERNS = [
  /\breddit\b/i,
  /\byoutube\b/i,
  /\bnear me\b/i,
  /\bpdf\b/i,
  /\btorrent\b/i,
  /\bfree download\b/i,
  /\bjobs?\b/i,
  /\baustralia\b/i,
  /\bcanada\b/i,
  /\buk\b/i,
  /\bindia\b/i
];

const STEM_STOPWORDS = new Set([
  'the', 'a', 'an', 'for', 'of', 'and', 'or', 'to', 'in', 'on', 'with', 'without',
  'best', 'top', 'guide', 'complete', 'checklist', 'template', 'examples', 'example',
  'strategy', 'mistakes', 'avoid', 'step', 'by', 'how', 'what', 'is', 'are', '2025', '2026'
]);

const STEM_CAP_PER_CATEGORY = 4;
const ROOT_CAP_MULTIPLIER = 1.5;

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 90);
}

function normalize(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toTitle(keyword) {
  const cleaned = keyword.replace(/\s+/g, ' ').trim();
  if (/\bvs\b/i.test(cleaned)) {
    const [left, right] = cleaned.split(/\bvs\b/i).map((s) => s.trim());
    return `${left.replace(/\b\w/g, (c) => c.toUpperCase())} vs ${right.replace(/\b\w/g, (c) => c.toUpperCase())}: Which Strategy Works Better in 2026?`;
  }
  if (/^how\s+/i.test(cleaned)) {
    return `${cleaned.replace(/\b\w/g, (c) => c.toUpperCase())}: Complete 2026 Guide`;
  }
  if (/calculator|template|checklist/i.test(cleaned)) {
    return `${cleaned.replace(/\b\w/g, (c) => c.toUpperCase())}: Practical Guide + Examples`;
  }
  return `${cleaned.replace(/\b\w/g, (c) => c.toUpperCase())}: Complete 2026 Guide`;
}

function getExistingMap() {
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md'));
  const slugs = new Set();
  const keywords = new Set();
  const titles = new Set();

  for (const file of files) {
    const slug = file.replace(/\.md$/, '');
    slugs.add(slug);
    const parsed = matter(fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8')).data || {};
    const pk = parsed?.seo?.primaryKeyword;
    if (pk) keywords.add(normalize(pk));
    if (parsed.title) titles.add(normalize(parsed.title));
  }

  return { slugs, keywords, titles };
}

async function fetchGoogleSuggestions(query) {
  const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: controller.signal
    });
    if (!res.ok) return [];
    const payload = await res.json();
    const suggestions = Array.isArray(payload?.[1]) ? payload[1] : [];
    return suggestions.map((s) => String(s).trim()).filter(Boolean);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function runWithConcurrency(items, limit, worker) {
  const out = [];
  let idx = 0;
  let active = 0;

  return new Promise((resolve) => {
    const next = () => {
      if (idx >= items.length && active === 0) {
        resolve(out);
        return;
      }

      while (active < limit && idx < items.length) {
        const item = items[idx++];
        active += 1;
        Promise.resolve(worker(item))
          .then((result) => {
            if (result !== undefined) out.push(result);
          })
          .catch(() => {})
          .finally(() => {
            active -= 1;
            next();
          });
      }
    };

    next();
  });
}

function intentOf(keyword) {
  const k = normalize(keyword);
  if (k.includes('vs')) return 'comparison';
  if (k.includes('calculator') || k.includes('template')) return 'commercial';
  if (k.startsWith('how ') || k.includes('checklist') || k.includes('guide')) return 'informational';
  if (k.includes('best ') || k.includes('top ')) return 'commercial';
  return 'informational';
}

function scoreKeyword(keyword, categoryKey) {
  const k = normalize(keyword);
  let score = 0;

  const highIntentTerms = ['for ', 'vs', 'checklist', 'calculator', 'template', 'strategy', 'tax', 'deduction', 'rollover', 'payoff', 'llc', 's corp', 'withdrawal', 'allocation'];
  const moneyTerms = ['tax', 'deduction', 'llc', 's corp', 'retirement', 'rollover', 'debt', 'payoff', 'investing', 'cash flow', 'yield'];

  for (const term of highIntentTerms) if (k.includes(term)) score += 7;
  for (const term of moneyTerms) if (k.includes(term)) score += 5;

  const words = k.split(' ').filter(Boolean).length;
  if (words >= 4 && words <= 8) score += 10;
  if (words <= 2) score -= 10;

  if (/\b2026\b/.test(k)) score += 3;

  if (categoryKey === 'airbnb_arbitrage') score -= 2;
  if (categoryKey === 'tax_strategies' || categoryKey === 'retirement' || categoryKey === 'business_structures') score += 3;

  return score;
}

function pickPriority(score) {
  if (score >= 42) return 'P1';
  if (score >= 30) return 'P2';
  return 'P3';
}

function buildInternalLinks(categoryKey) {
  const hub = HUBS[categoryKey] || '/blog';
  return [hub, '/blog', '/blog/'];
}

function hasBannedPattern(keyword) {
  return BANNED_PATTERNS.some((re) => re.test(keyword));
}

function stemKey(keyword) {
  const tokens = normalize(keyword)
    .split(' ')
    .filter(Boolean)
    .filter((t) => !STEM_STOPWORDS.has(t))
    .slice(0, 4);
  return tokens.join(' ');
}

function rootKey(sourceQuery) {
  return normalize(sourceQuery || '')
    .replace(/^how\s+/, '')
    .replace(/^best\s+/, '')
    .replace(/\s+for beginners$/, '')
    .trim();
}

async function generateCandidatesForCategory(category) {
  const candidates = [];
  const queryJobs = [];

  for (const seed of category.seeds) {
    const q = [seed, `how ${seed}`, `best ${seed}`, `${seed} for beginners`];
    for (const one of q) {
      queryJobs.push({ seed, query: one });
    }
  }

  const queryResults = await runWithConcurrency(queryJobs, 8, async (job) => {
    const suggestions = await fetchGoogleSuggestions(job.query);
    return { ...job, suggestions };
  });

  for (const row of queryResults) {
    for (const s of row.suggestions) {
      candidates.push({ keyword: s, source: 'google_suggest', source_query: row.query });
    }
  }

  for (const seed of category.seeds) {
    for (const persona of category.personas) {
      candidates.push({ keyword: `${seed} for ${persona}`, source: 'template_persona', source_query: seed });
    }

    for (const alt of category.alternatives) {
      candidates.push({ keyword: `${seed} vs ${alt}`, source: 'template_comparison', source_query: seed });
    }

    for (const qualifier of QUALIFIERS) {
      if (qualifier === 'vs') continue;
      candidates.push({ keyword: `${seed} ${qualifier}`, source: 'template_qualifier', source_query: seed });
    }
  }

  return candidates;
}

async function main() {
  ensureDir(ANALYSIS_DIR);

  const existing = getExistingMap();
  const rows = [];
  const dedupe = new Set();

  for (const category of CATEGORIES) {
    const raw = await generateCandidatesForCategory(category);

    const filtered = [];
    for (const c of raw) {
      const keyword = normalize(c.keyword);
      if (!keyword || keyword.length < 12) continue;
      if (hasBannedPattern(keyword)) continue;
      if (existing.keywords.has(keyword)) continue;
      const slug = slugify(keyword);
      if (!slug || existing.slugs.has(slug)) continue;
      if (dedupe.has(keyword)) continue;
      dedupe.add(keyword);
      filtered.push({ ...c, keyword, slug, root_key: rootKey(c.source_query) || category.key });
    }

    filtered.sort((a, b) => scoreKeyword(b.keyword, category.key) - scoreKeyword(a.keyword, category.key));
    const selected = [];
    const stemCounts = new Map();
    const rootCounts = new Map();
    const rootCap = Math.max(12, Math.ceil((category.target / Math.max(category.seeds.length, 1)) * ROOT_CAP_MULTIPLIER));
    for (const item of filtered) {
      if (selected.length >= category.target) break;
      const stem = stemKey(item.keyword);
      const count = stem ? (stemCounts.get(stem) || 0) : 0;
      if (stem && count >= STEM_CAP_PER_CATEGORY) continue;
      const rootCount = rootCounts.get(item.root_key) || 0;
      if (item.root_key && rootCount >= rootCap) continue;
      selected.push(item);
      if (stem) stemCounts.set(stem, count + 1);
      if (item.root_key) rootCounts.set(item.root_key, rootCount + 1);
    }

    if (selected.length < category.target) {
      for (const item of filtered) {
        if (selected.length >= category.target) break;
        if (selected.includes(item)) continue;
        selected.push(item);
      }
    }

    for (const item of selected) {
      const title = toTitle(item.keyword);
      const score = scoreKeyword(item.keyword, category.key);
      rows.push({
        id: rows.length + 1,
        slug: item.slug,
        title,
        primary_keyword: item.keyword,
        category_key: category.key,
        category_path: 'blog',
        search_intent: intentOf(item.keyword),
        persona: category.personas[rows.length % category.personas.length],
        competition_estimate: item.keyword.split(' ').length <= 3 ? 'high' : item.keyword.split(' ').length <= 5 ? 'medium' : 'low',
        conversion_potential: score >= 42 ? 'high' : score >= 30 ? 'medium' : 'low',
        priority: pickPriority(score),
        score,
        source: item.source,
        source_query: item.source_query,
        internal_links: buildInternalLinks(category.key),
        status: 'pending'
      });
    }

    console.log(`[research] ${category.key}: raw=${raw.length} selected=${selected.length}`);
  }

  rows.sort((a, b) => b.score - a.score);
  const trimmed = rows.slice(0, TARGET).map((row, i) => ({ ...row, id: i + 1 }));

  const byCategory = {};
  for (const row of trimmed) {
    byCategory[row.category_key] = (byCategory[row.category_key] || 0) + 1;
  }

  const p1 = trimmed.filter((r) => r.priority === 'P1').length;
  const p2 = trimmed.filter((r) => r.priority === 'P2').length;
  const p3 = trimmed.filter((r) => r.priority === 'P3').length;

  const payload = {
    metadata: {
      generated: TODAY,
      total_topics: trimmed.length,
      completed_topics: 0,
      covered_topics: 0,
      pending_topics: trimmed.length,
      status: 'pending_generation',
      strategy: '80-20 high-intent keyword prioritization',
      source_mix: ['google_suggest', 'intent templates', 'persona templates', 'comparison templates']
    },
    categories: Object.fromEntries(
      CATEGORIES.map((c) => [
        c.key,
        {
          description: c.key.replace(/_/g, ' '),
          count: byCategory[c.key] || 0,
          completed: 0,
          topics: trimmed.filter((t) => t.category_key === c.key)
        }
      ])
    )
  };

  fs.writeFileSync(OUTPUT_TOPICS, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  const csv = [
    'id,slug,primary_keyword,title,category_key,search_intent,priority,score,competition_estimate,conversion_potential,status',
    ...trimmed.map((t) => [
      t.id,
      `"${t.slug}"`,
      `"${t.primary_keyword.replace(/"/g, '""')}"`,
      `"${t.title.replace(/"/g, '""')}"`,
      t.category_key,
      t.search_intent,
      t.priority,
      t.score,
      t.competition_estimate,
      t.conversion_potential,
      t.status
    ].join(','))
  ].join('\n');
  fs.writeFileSync(OUTPUT_BACKLOG, `${csv}\n`, 'utf8');

  const phase1 = trimmed.filter((t) => t.priority === 'P1' || t.priority === 'P2');
  const phase1Payload = {
    metadata: {
      generated: TODAY,
      strategy: '80-20 execution queue',
      total_topics: phase1.length
    },
    topics: phase1
  };
  fs.writeFileSync(OUTPUT_PHASE1, `${JSON.stringify(phase1Payload, null, 2)}\n`, 'utf8');

  const phase1Csv = [
    'id,slug,primary_keyword,title,category_key,search_intent,priority,score,competition_estimate,conversion_potential,status',
    ...phase1.map((t) => [
      t.id,
      `"${t.slug}"`,
      `"${t.primary_keyword.replace(/"/g, '""')}"`,
      `"${t.title.replace(/"/g, '""')}"`,
      t.category_key,
      t.search_intent,
      t.priority,
      t.score,
      t.competition_estimate,
      t.conversion_potential,
      t.status
    ].join(','))
  ].join('\n');
  fs.writeFileSync(OUTPUT_PHASE1_CSV, `${phase1Csv}\n`, 'utf8');

  const report = [
    '# SEO 1000 Keyword Research Report',
    '',
    `Date: ${TODAY}`,
    `Generated topics: ${trimmed.length}`,
    `Priority split: P1=${p1}, P2=${p2}, P3=${p3}`,
    '',
    '## 80-20 Strategy',
    '- Prioritized high-intent and conversion-linked queries first.',
    '- Biased toward financial outcomes, tax savings, entity structure, retirement, and debt payoff terms.',
    '- De-duplicated against existing published blog slugs and existing primary keywords.',
    '',
    '## Category Distribution',
    ...Object.entries(byCategory).map(([key, count]) => `- ${key}: ${count}`),
    '',
    '## Sample Top P1 Keywords',
    ...trimmed.filter((t) => t.priority === 'P1').slice(0, 30).map((t) => `- ${t.primary_keyword} (${t.category_key}, score ${t.score})`),
    '',
    '## Output Files',
    `- ${path.relative(ROOT, OUTPUT_TOPICS)}`,
    `- ${path.relative(ROOT, OUTPUT_BACKLOG)}`,
    `- ${path.relative(ROOT, OUTPUT_PHASE1)}`,
    `- ${path.relative(ROOT, OUTPUT_PHASE1_CSV)}`
  ].join('\n');

  fs.writeFileSync(OUTPUT_REPORT, `${report}\n`, 'utf8');

  console.log(`Generated ${trimmed.length} topics.`);
  console.log(`Wrote: ${path.relative(ROOT, OUTPUT_TOPICS)}`);
  console.log(`Wrote: ${path.relative(ROOT, OUTPUT_REPORT)}`);
  console.log(`Wrote: ${path.relative(ROOT, OUTPUT_PHASE1)}`);
}

main().catch((error) => {
  console.error('research-seo-1000-topics failed:', error.message);
  process.exit(1);
});
