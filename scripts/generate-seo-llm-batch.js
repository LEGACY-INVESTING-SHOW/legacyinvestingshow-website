#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content', 'blog');
const DEFAULT_TOPICS_FILE = path.join(ROOT, 'data', 'seo-topics-1000.json');
const REPORT_DIR = path.join(ROOT, 'analysis', 'seo-1000');
const TODAY = new Date().toISOString().slice(0, 10);

const PRIORITY_RANK = { P1: 3, P2: 2, P3: 1 };
const TRUSTED_DOMAINS = [
  'irs.gov',
  'sec.gov',
  'ssa.gov',
  'treasury.gov',
  'investor.gov',
  'vanguard.com',
  'fidelity.com',
  'schwab.com',
  'bankrate.com',
  'nerdwallet.com',
  'investopedia.com'
];

const CATEGORY_LABELS = {
  tax_strategies: 'Tax Strategies',
  retirement: 'Retirement',
  retirement_planning: 'Retirement',
  business_structures: 'Business Structures',
  investing: 'Investing',
  debt_management: 'Debt Management',
  passive_income: 'Passive Income',
  airbnb_arbitrage: 'Airbnb Arbitrage'
};

function parseArgs(argv) {
  const args = {
    topicsFile: DEFAULT_TOPICS_FILE,
    limit: 5,
    minWords: 1500,
    maxAttempts: 3,
    model: process.env.SEO_LLM_MODEL || 'gpt-5.3-codex',
    phase: 'all',
    dryRun: false,
    slug: '',
    force: false
  };

  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--topics-file') args.topicsFile = path.resolve(argv[++i]);
    else if (token === '--limit') args.limit = Number(argv[++i]) || args.limit;
    else if (token === '--min-words') args.minWords = Number(argv[++i]) || args.minWords;
    else if (token === '--max-attempts') args.maxAttempts = Number(argv[++i]) || args.maxAttempts;
    else if (token === '--model') args.model = argv[++i];
    else if (token === '--phase') args.phase = argv[++i];
    else if (token === '--slug') args.slug = argv[++i];
    else if (token === '--force') args.force = true;
    else if (token === '--dry-run') args.dryRun = true;
  }

  return args;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function normalize(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const KEYWORD_STOPWORDS = new Set([
  'what', 'which', 'is', 'are', 'better', 'best', 'for', 'or', 'vs', 'versus',
  'guide', 'complete', 'strategy', 'in', 'the', 'a', 'an', 'to', 'of', 'and', '2025', '2026'
]);

function keywordIntentSet(input) {
  return new Set(
    normalize(input)
      .split(' ')
      .filter(Boolean)
      .filter((t) => !KEYWORD_STOPWORDS.has(t))
  );
}

function keywordIntentJaccard(a, b) {
  const A = keywordIntentSet(a);
  const B = keywordIntentSet(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  return inter / new Set([...A, ...B]).size;
}

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function decodeHtmlEntities(input) {
  return String(input || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripTags(input) {
  return decodeHtmlEntities(String(input || '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function extractDomain(rawUrl) {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function domainScore(domain) {
  if (!domain) return 0;
  if (TRUSTED_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`))) return 5;
  if (domain.includes('.gov')) return 4;
  if (domain.includes('.edu')) return 3;
  return 1;
}

async function fetchWithTimeout(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: controller.signal
    });
    if (!res.ok) return '';
    return await res.text();
  } catch {
    return '';
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchSerpResults(query, maxResults = 8) {
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const html = await fetchWithTimeout(url, 15000);
  if (!html) return [];

  const snippets = [];
  const snippetRegex = /<a rel=\"nofollow\" class=\"result__a\" href=\"([^\"]+)\"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a class=\"result__snippet\"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = snippetRegex.exec(html)) && snippets.length < maxResults * 2) {
    let rawUrl = decodeHtmlEntities(match[1]);
    const uddg = rawUrl.match(/[?&]uddg=([^&]+)/);
    if (uddg) rawUrl = decodeURIComponent(uddg[1]);
    const title = stripTags(match[2]);
    const snippet = stripTags(match[3]);
    if (!rawUrl || !title) continue;
    snippets.push({ title, url: rawUrl, snippet });
  }

  const deduped = [];
  const seen = new Set();
  for (const row of snippets) {
    if (seen.has(row.url)) continue;
    seen.add(row.url);
    const domain = extractDomain(row.url);
    deduped.push({ ...row, domain, score: domainScore(domain) });
  }

  deduped.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.snippet || '').length - (a.snippet || '').length;
  });

  return deduped.slice(0, maxResults);
}

async function fetchResearchContext(keyword) {
  const queries = [keyword, `how ${keyword}`, `${keyword} mistakes`];
  const seen = new Set();
  const pooled = [];

  for (const query of queries) {
    const rows = await fetchSerpResults(query, 6);
    for (const row of rows) {
      if (seen.has(row.url)) continue;
      seen.add(row.url);
      pooled.push(row);
    }
  }

  pooled.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.snippet || '').length - (a.snippet || '').length;
  });

  const selected = pooled.slice(0, 4);
  const sources = [];

  for (const row of selected) {
    const proxied = `https://r.jina.ai/http://${row.url.replace(/^https?:\/\//, '')}`;
    const text = await fetchWithTimeout(proxied, 18000);
    const excerpt = text
      ? text
          .replace(/\s+/g, ' ')
          .slice(0, 900)
          .trim()
      : '';
    sources.push({
      title: row.title,
      url: row.url,
      domain: row.domain,
      snippet: row.snippet,
      excerpt
    });
  }

  return sources;
}

function wordCount(text) {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[[^\]]+\]\([^\)]+\)/g, ' ')
    .replace(/[#>*_`|-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
}

function readingTime(words) {
  const minutes = Math.max(6, Math.round(words / 220));
  return `${minutes} min read`;
}

function sanitizeTitle(rawTitle) {
  const value = String(rawTitle || '').trim();
  if (!value) return value;
  const mostlyLower = value === value.toLowerCase();
  if (!mostlyLower) return value;

  const stopwords = new Set(['a', 'an', 'the', 'and', 'or', 'for', 'to', 'of', 'in', 'on', 'at', 'by', 'with', 'vs']);
  const words = value.split(/\s+/).map((word, idx) => {
    if (!word) return word;
    const clean = word.replace(/[^a-z0-9]/gi, '');
    if (stopwords.has(clean) && idx !== 0) return word.toLowerCase();
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  return words
    .join(' ')
    .replace(/\bLlc\b/g, 'LLC')
    .replace(/\bIra\b/g, 'IRA')
    .replace(/\bRoth\b/g, 'Roth')
    .replace(/\bQbi\b/g, 'QBI')
    .replace(/\bEtf\b/g, 'ETF')
    .replace(/\bReit\b/g, 'REIT')
    .replace(/\bHeloc\b/g, 'HELOC')
    .replace(/\b401k\b/gi, '401(k)')
    .replace(/\b457b\b/gi, '457(b)')
    .replace(/\bRmd\b/g, 'RMD')
    .replace(/\bW2\b/g, 'W-2')
    .replace(/\bS corp\b/gi, 'S Corp');
}

function loadExistingPosts() {
  const files = fs.existsSync(CONTENT_DIR)
    ? fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md'))
    : [];

  const posts = [];
  const bySlug = new Set();
  const byKeyword = new Set();

  for (const file of files) {
    const slug = file.replace(/\.md$/, '');
    bySlug.add(slug);
    const full = path.join(CONTENT_DIR, file);
    let data = {};
    try {
      data = matter(fs.readFileSync(full, 'utf8')).data || {};
    } catch {
      data = {};
    }

    const pk = data?.seo?.primaryKeyword || '';
    if (pk) byKeyword.add(normalize(pk));

    posts.push({
      slug,
      title: data.title || slug,
      category: data.category || '',
      primaryKeyword: pk,
      tokens: new Set(normalize(data.title || '').split(' ').filter(Boolean))
    });
  }

  return { posts, bySlug, byKeyword };
}

function flattenTopics(data) {
  const rows = [];
  for (const [categoryKey, category] of Object.entries(data.categories || {})) {
    for (const topic of category.topics || []) {
      rows.push({ categoryKey, topic });
    }
  }
  return rows;
}

function isPhaseEligible(topic, phase) {
  if (phase === 'all') return true;
  if (phase === '80-20' || phase === 'phase1') {
    return topic.priority === 'P1' || topic.priority === 'P2';
  }
  if (phase === 'p1') return topic.priority === 'P1';
  if (phase === 'p2') return topic.priority === 'P2';
  if (phase === 'p3') return topic.priority === 'P3';
  return true;
}

function selectCandidates(rows, args) {
  if (args.slug) {
    const target = rows.find((r) => r.topic.slug === args.slug);
    return target ? [target] : [];
  }

  const pending = rows.filter((r) => {
    const status = r.topic.status || 'pending';
    if (status === 'completed' || status === 'covered') return false;
    return isPhaseEligible(r.topic, args.phase);
  });

  pending.sort((a, b) => {
    const pr = (PRIORITY_RANK[b.topic.priority] || 0) - (PRIORITY_RANK[a.topic.priority] || 0);
    if (pr !== 0) return pr;
    return (b.topic.score || 0) - (a.topic.score || 0);
  });

  return pending.slice(0, args.limit);
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const token of a) if (b.has(token)) inter += 1;
  const union = new Set([...a, ...b]).size;
  return union ? inter / union : 0;
}

function detectDuplicate(row, existing) {
  const slug = row.topic.slug || slugify(row.topic.primary_keyword || row.topic.title || '');
  if (existing.bySlug.has(slug)) return 'existing_slug';

  const keyword = normalize(row.topic.primary_keyword);
  if (keyword && existing.byKeyword.has(keyword)) return 'existing_primary_keyword';

  if (row.topic.primary_keyword) {
    for (const post of existing.posts) {
      if (!post.primaryKeyword) continue;
      const sim = keywordIntentJaccard(row.topic.primary_keyword, post.primaryKeyword);
      if (sim >= 0.8) return `semantic_keyword_overlap:${post.slug}`;
    }
  }

  const topicTokens = new Set(normalize(row.topic.title || '').split(' ').filter(Boolean));
  for (const post of existing.posts) {
    if (jaccard(topicTokens, post.tokens) >= 0.8) return `title_similarity:${post.slug}`;
  }

  return null;
}

function pickRelatedPosts(existing, categoryLabel, currentSlug, count = 6) {
  const sameCategory = existing.posts.filter((p) => p.category === categoryLabel && p.slug !== currentSlug);
  const fallback = existing.posts.filter((p) => p.slug !== currentSlug);
  const picked = (sameCategory.length ? sameCategory : fallback).slice(0, count);
  return picked.map((p) => ({ slug: p.slug, title: p.title }));
}

function buildInternalLinkTargets(relatedPosts, categoryKey) {
  const hubs = {
    tax_strategies: '/topics/tax-strategies',
    retirement: '/topics/retirement',
    retirement_planning: '/topics/retirement',
    business_structures: '/topics/business-structures',
    investing: '/topics/investing',
    debt_management: '/topics/debt-management',
    passive_income: '/topics/investing',
    airbnb_arbitrage: '/topics/airbnb-arbitrage'
  };

  const links = [
    hubs[categoryKey] || '/blog',
    '/blog',
    '/programs',
    ...relatedPosts.slice(0, 6).map((p) => `/blog/${p.slug}`)
  ];

  return [...new Set(links)].slice(0, 10);
}

function buildPrompt(row, context, targetWords, researchSources) {
  const titleHint = row.topic.title || '';
  const primaryKeyword = row.topic.primary_keyword;
  const categoryLabel = context.categoryLabel;
  const internalLinks = context.internalLinks;
  const researchSection =
    researchSources && researchSources.length
      ? [
          'Research context (use this to increase specificity and practical accuracy):',
          ...researchSources.map(
            (s, i) =>
              `${i + 1}. ${s.title} (${s.domain})\nURL: ${s.url}\nSnippet: ${s.snippet || 'N/A'}\nExtract: ${(s.excerpt || '').slice(0, 500)}`
          ),
          ''
        ].join('\n')
      : 'Research context: none available. Use rigorous, practical reasoning.\n';

  return [
    'You are writing a high-value personal finance article for Legacy Investing Show.',
    'Audience: US readers making real tax, investing, debt, retirement, and business-structure decisions.',
    'Do not write generic filler. Include concrete decision frameworks, numbers, examples, mistakes, and action checklists.',
    '',
    'Return STRICT JSON only with this shape:',
    '{',
    '  "title": "...",',
    '  "description": "...",',
    '  "secondaryKeywords": ["...", "...", "..."],',
    '  "longTailKeywords": ["...", "...", "..."],',
    '  "targetSnippet": "...",',
    '  "statistics": [',
    '    {"value":"...","label":"...","icon":"calendar|chart|list|clock|dollar","context":"..."}',
    '  ],',
    '  "faq": [',
    '    {"question":"...","answer":"..."}',
    '  ],',
    '  "body_markdown": "..."',
    '}',
    '',
    'Hard requirements:',
    `- Primary keyword: "${primaryKeyword}" must appear naturally in title, intro, and at least one H2.`,
    `- Minimum body length: ${targetWords} words (excluding frontmatter/JSON).`,
    '- Include at least 8 H2/H3 sections with substantial content.',
    '- Include at least one scenario table and one step-by-step implementation plan.',
    '- Include at least one fully worked numeric example with explicit assumptions and tradeoffs.',
    '- Include at least one 30-day checklist and one mistakes section.',
    '- Include a section: \"How This Compares To Alternatives\" with explicit pros/cons.',
    '- Include a section: \"When Not To Use This Strategy\".',
    '- Include a section: \"Questions To Ask Your CPA/Advisor\".',
    '- Header examples (use these or very close variants):',
    '  - ## How This Compares to Alternatives',
    '  - ## When Not to Use This Strategy',
    '  - ## Questions to Ask Your CPA/Advisor',
    '- Include at least 3 markdown internal links using ONLY the allowed URLs below.',
    '- Use the research context for concrete details and mention source organizations naturally in the article where useful.',
    '- Keep claims practical and educational. Avoid legal/tax certainty language.',
    '- No code fences. No additional keys. No prose before/after JSON.',
    '',
    `Category: ${categoryLabel}`,
    `Topic title hint: ${titleHint}`,
    `Search intent: ${row.topic.search_intent || 'informational'}`,
    `Priority: ${row.topic.priority || 'P3'} (score ${row.topic.score || 0})`,
    '',
    researchSection,
    '',
    'Allowed internal URLs:',
    ...internalLinks.map((u) => `- ${u}`)
  ].join('\n');
}

function runCodex(prompt, options) {
  const tmpOut = path.join(REPORT_DIR, `.tmp-codex-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
  const args = [
    'exec',
    '-c',
    'mcp_servers={}',
    '-c',
    'model_reasoning_effort="high"',
    '-C',
    ROOT,
    '-o',
    tmpOut,
    '-m',
    options.model,
    prompt
  ];

  if (options.dryRun) {
    return {
      text: JSON.stringify({
        title: options.topicTitle || 'Dry Run Title',
        description: 'Dry run output',
        secondaryKeywords: ['dry run strategy', 'dry run guide', 'dry run checklist'],
        longTailKeywords: ['how to dry run', 'dry run mistakes', 'dry run for beginners'],
        targetSnippet: 'dry run explained',
        statistics: [
          { value: '30 Days', label: 'Starter Sprint', icon: 'calendar', context: 'Initial implementation window' },
          { value: '3', label: 'Core Levers', icon: 'list', context: 'Main decision drivers' },
          { value: '1', label: 'Primary Goal', icon: 'chart', context: 'Main optimization objective' },
          { value: 'Monthly', label: 'Review Cadence', icon: 'clock', context: 'Operational review rhythm' }
        ],
        faq: [
          { question: 'What is this strategy?', answer: 'This is a dry run output.' },
          { question: 'Who is it for?', answer: 'US readers testing pipeline output.' },
          { question: 'How long does setup take?', answer: 'Usually 2 to 4 weeks.' },
          { question: 'What mistakes are common?', answer: 'Skipping measurement and risk controls.' },
          { question: 'Do I need an advisor?', answer: 'Professional review is recommended for legal/tax issues.' },
          { question: 'How often should I review?', answer: 'Monthly and quarterly review cycles are common.' },
          { question: 'What should I track?', answer: 'Track outcome, risk, and execution metrics.' },
          { question: 'Can beginners apply this?', answer: 'Yes, with a simplified plan first.' }
        ],
        body_markdown: [
          '# Dry Run',
          '',
          '## Overview',
          'This dry-run article validates structure, formatting, and publishing flow with practical content blocks.',
          '',
          '## Decision Framework',
          'Use goals, timeline, cash flow constraints, and risk tolerance to decide if the strategy is a fit.',
          '',
          '## Scenario Comparison Table',
          '| Scenario | Starting Capital | Time Commitment | Risk Level |',
          '| --- | --- | --- | --- |',
          '| Conservative | $5,000 | 3 hours/week | Low |',
          '| Balanced | $15,000 | 6 hours/week | Medium |',
          '| Aggressive | $30,000 | 10 hours/week | Higher |',
          '',
          '## Step-by-Step Implementation Plan',
          '1. Define baseline metrics and constraints.',
          '2. Select one strategy variant and test for 30 days.',
          '3. Review outcomes weekly and adjust assumptions.',
          '',
          '## Worked Numeric Example',
          'Assume $10,000 is deployed with an expected monthly return band of 1.0% to 2.0% before taxes and fees.',
          '',
          '## 30-Day Checklist',
          '- Week 1: Setup accounts, tracking sheets, and guardrails.',
          '- Week 2: Execute first cycle and record results.',
          '- Week 3: Compare actuals vs assumptions.',
          '- Week 4: Make one targeted improvement.',
          '',
          '## Common Mistakes',
          '- Taking oversized positions too early.',
          '- Ignoring downside scenarios.',
          '- Skipping monthly reviews.',
          '',
          '## How This Compares to Alternatives',
          'Compared with passive alternatives, this approach can offer more control but requires higher effort and tighter process discipline.',
          '',
          '## When Not to Use This Strategy',
          'Avoid this strategy when liquidity is unstable, risk controls are undefined, or you cannot maintain a regular review cadence.',
          '',
          '## Questions to Ask Your CPA/Advisor',
          '- What tax treatment applies to these outcomes?',
          '- Which records should be retained for compliance?',
          '- Are there entity or election considerations before scaling?',
          '',
          '## Continue Reading',
          '- [Related guide](/blog)',
          '- [Related guide](/programs)',
          '- [Related guide](/topics/investing)',
          '',
          Array.from({ length: 260 }, (_, i) => `Additional dry-run paragraph ${i + 1} for word-count validation.`).join('\n\n')
        ].join('\n')
      })
    };
  }

  const proc = spawnSync('codex', args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20,
    timeout: 1000 * 60 * 12
  });

  if (proc.status !== 0) {
    if (proc.error && proc.error.code === 'ETIMEDOUT') {
      if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
      throw new Error('codex exec timed out after 12 minutes');
    }
    const stderr = (proc.stderr || '').slice(-2000);
    const stdout = (proc.stdout || '').slice(-2000);
    if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
    throw new Error(`codex exec failed (exit ${proc.status}). stdout=${stdout} stderr=${stderr}`);
  }

  if (!fs.existsSync(tmpOut)) {
    throw new Error('codex exec did not produce output file.');
  }

  const text = fs.readFileSync(tmpOut, 'utf8');
  fs.unlinkSync(tmpOut);
  return { text };
}

function parseModelJson(text) {
  const raw = String(text || '').trim();
  try {
    return JSON.parse(raw);
  } catch {
    const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (codeBlock) {
      return JSON.parse(codeBlock[1]);
    }

    const first = raw.indexOf('{');
    const last = raw.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) {
      return JSON.parse(raw.slice(first, last + 1));
    }

    throw new Error('Could not parse model output JSON.');
  }
}

function ensureArray(input, fallback) {
  if (!Array.isArray(input) || !input.length) return fallback;
  return input;
}

function sanitizeFaq(faq, keyword) {
  const fallback = [
    { question: `What is ${keyword}?`, answer: `${keyword} is a practical strategy framework with clear rules, milestones, and risk controls.` },
    { question: `Who benefits from ${keyword}?`, answer: 'People with defined goals and consistent review habits usually benefit most.' },
    { question: `How fast can I implement ${keyword}?`, answer: 'A workable first version is often possible in 2 to 6 weeks.' },
    { question: `What mistakes are common with ${keyword}?`, answer: 'Common mistakes include poor measurement, weak risk limits, and no review cadence.' },
    { question: 'Should I involve an advisor?', answer: 'For legal or tax-sensitive moves, use a qualified professional.' },
    { question: 'How often should I review progress?', answer: 'Monthly and quarterly reviews are common for disciplined execution.' },
    { question: 'What should I track?', answer: 'Track outcomes, downside risk, and execution quality metrics.' },
    { question: 'Can beginners use this?', answer: 'Yes. Start simple and add complexity only after consistency.' }
  ];

  const normalized = ensureArray(faq, fallback)
    .slice(0, 10)
    .map((item) => ({
      question: String(item.question || '').trim(),
      answer: String(item.answer || '').trim()
    }))
    .filter((item) => item.question && item.answer);

  return normalized.length >= 8 ? normalized : fallback;
}

function sanitizeStats(stats) {
  const fallback = [
    { value: '30 Days', label: 'Starter Sprint', icon: 'calendar', context: 'Initial implementation window' },
    { value: '4', label: 'Core Checkpoints', icon: 'list', context: 'Planning, execution, risk, review' },
    { value: '1', label: 'Primary Objective', icon: 'chart', context: 'Keeps strategy focused' },
    { value: 'Monthly', label: 'Review Cadence', icon: 'clock', context: 'Recommended adjustment cycle' }
  ];

  const normalized = ensureArray(stats, fallback)
    .slice(0, 4)
    .map((item) => ({
      value: String(item.value || '').trim() || 'N/A',
      label: String(item.label || '').trim() || 'Metric',
      icon: String(item.icon || '').trim() || 'chart',
      context: String(item.context || '').trim() || 'Key operating metric'
    }));

  return normalized.length === 4 ? normalized : fallback;
}

function ensureInternalLinks(body, links) {
  const matches = String(body || '').match(/\[[^\]]+\]\((\/[^\)]+)\)/g) || [];
  if (matches.length >= 3) return body;

  const supplemental = [
    '',
    '## Continue Reading',
    ...links.slice(0, 4).map((url) => `- [Related guide](${url})`)
  ].join('\n');

  return `${body.trim()}\n${supplemental}\n`;
}

function normalizeModelBody(rawBody) {
  let body = String(rawBody || '').trim();

  // Some model outputs contain double-escaped newlines in JSON string values.
  const literalNewlineTokens = (body.match(/\\n/g) || []).length;
  const realNewlines = (body.match(/\n/g) || []).length;
  if (literalNewlineTokens > 20 && realNewlines < 20) {
    body = body.replace(/\\n/g, '\n');
  }

  body = body.replace(/\\t/g, '  ');
  return body;
}

function validateBodyQuality(body, minWords) {
  const issues = [];
  const words = wordCount(body);
  const h2 = (body.match(/^##\s+/gm) || []).length;
  const h3 = (body.match(/^###\s+/gm) || []).length;
  const hasTable = /^\|.*\|$/m.test(body) && /^\|\s*---/m.test(body);
  const headings = (String(body || '').match(/^#{2,3}\s+.+$/gmi) || [])
    .map((line) =>
      line
        .replace(/^#{2,3}\s+/, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    );

  const hasComparisonSection = headings.some(
    (heading) =>
      heading.includes('compare') &&
      (heading.includes('alternative') || heading.includes('option') || heading.includes('versus') || heading.includes('vs'))
  );
  const hasWhenNotSection = headings.some(
    (heading) =>
      heading.includes('when not to use') ||
      heading.includes('not to use') ||
      (heading.includes('avoid') && heading.includes('strategy'))
  );
  const hasAdvisorQuestionsSection = headings.some(
    (heading) =>
      heading.includes('questions to ask') &&
      (heading.includes('cpa') || heading.includes('advisor') || heading.includes('accountant') || heading.includes('tax pro'))
  );

  if (words < minWords) issues.push(`word_count_below_min:${words}`);
  if (h2 + h3 < 8) issues.push(`insufficient_headings:${h2 + h3}`);
  if (!hasTable) issues.push('missing_table');
  if (!hasComparisonSection) issues.push('missing_comparison_section');
  if (!hasWhenNotSection) issues.push('missing_when_not_section');
  if (!hasAdvisorQuestionsSection) issues.push('missing_advisor_questions');

  return { words, issues };
}

function buildFrontmatter(row, categoryLabel, payload, words, relatedPosts, faq, stats) {
  const title = sanitizeTitle(payload.title || row.topic.title || row.topic.primary_keyword);
  const description = String(payload.description || `Learn ${row.topic.primary_keyword} with practical steps and examples.`).trim();

  const secondaryKeywords = ensureArray(payload.secondaryKeywords, [
    `${row.topic.primary_keyword} strategy`,
    `${row.topic.primary_keyword} guide`,
    `${row.topic.primary_keyword} examples`
  ]).slice(0, 3);

  const longTailKeywords = ensureArray(payload.longTailKeywords, [
    `how to use ${row.topic.primary_keyword}`,
    `${row.topic.primary_keyword} mistakes to avoid`,
    `${row.topic.primary_keyword} for beginners`
  ]).slice(0, 3);

  return {
    title,
    titleTemplate: '%s | Legacy Investing Show',
    description,
    date: TODAY,
    modifiedDate: TODAY,
    author: 'Preston Seo',
    authorTitle: 'Founder, Legacy Investing Show',
    authorCredentials: 'Personal finance educator and strategy coach',
    category: categoryLabel,
    canonical: `https://www.legacyinvestingshow.com/blog/${row.topic.slug}`,
    seo: {
      primaryKeyword: row.topic.primary_keyword,
      secondaryKeywords,
      longTailKeywords,
      searchIntent: row.topic.search_intent || 'informational',
      targetSnippet: String(payload.targetSnippet || `${row.topic.primary_keyword} explained`).trim()
    },
    tags: [
      row.topic.primary_keyword,
      categoryLabel.toLowerCase(),
      'wealth strategy',
      'financial planning'
    ],
    image: '/assets/images/og-blog.jpg',
    imageAlt: `${title} guide`,
    imageWidth: 1200,
    imageHeight: 630,
    twitterCard: 'summary_large_image',
    featured: false,
    schema: [
      {
        type: 'Article',
        headline: title,
        datePublished: `${TODAY}T00:00:00Z`,
        dateModified: `${TODAY}T00:00:00Z`
      },
      {
        type: 'FAQPage',
        mainEntity: faq.map((item) => ({ question: item.question, answer: item.answer }))
      }
    ],
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Blog', url: '/blog' },
      { name: categoryLabel, url: '/blog' },
      { name: title, url: `/blog/${row.topic.slug}` }
    ],
    statistics: stats,
    faq,
    toc: true,
    tocDepth: 3,
    relatedPosts: relatedPosts.slice(0, 3).map((p) => ({ slug: p.slug, title: p.title })),
    readingTime: readingTime(words),
    wordCount: String(words)
  };
}

function writeMarkdown(slug, frontmatter, body) {
  const markdown = matter.stringify(`${body.trim()}\n`, frontmatter);
  const filePath = path.join(CONTENT_DIR, `${slug}.md`);
  fs.writeFileSync(filePath, markdown, 'utf8');
}

function updateMetadata(data) {
  const allTopics = Object.values(data.categories || {}).flatMap((c) => c.topics || []);
  const completed = allTopics.filter((t) => t.status === 'completed').length;
  const covered = allTopics.filter((t) => t.status === 'covered').length;
  const pending = allTopics.filter((t) => t.status !== 'completed' && t.status !== 'covered').length;

  data.metadata = data.metadata || {};
  data.metadata.last_updated = TODAY;
  data.metadata.completed_topics = completed;
  data.metadata.covered_topics = covered;
  data.metadata.pending_topics = pending;
  data.metadata.status = pending === 0 ? 'complete' : 'partially_completed';
}

function writeReport(lines) {
  ensureDir(REPORT_DIR);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(REPORT_DIR, `generation-batch-${stamp}.md`);
  fs.writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8');
  return reportPath;
}

async function main() {
  const args = parseArgs(process.argv);
  ensureDir(REPORT_DIR);

  if (!fs.existsSync(args.topicsFile)) {
    throw new Error(`Topics file not found: ${args.topicsFile}`);
  }

  const topics = readJson(args.topicsFile);
  const rows = flattenTopics(topics);
  const existing = loadExistingPosts();
  const candidates = selectCandidates(rows, args);

  const reportLines = [
    '# SEO LLM Batch Report',
    '',
    `Date: ${TODAY}`,
    `Topics file: ${path.relative(ROOT, args.topicsFile)}`,
    `Phase: ${args.phase}`,
    `Batch limit: ${args.limit}`,
    `Min words: ${args.minWords}`,
    `Model: ${args.model}`,
    ''
  ];

  let created = 0;
  let covered = 0;
  let failed = 0;

  for (const row of candidates) {
    const slug = row.topic.slug || slugify(row.topic.primary_keyword || row.topic.title);
    row.topic.slug = slug;
    console.log(`[topic] ${slug} (${row.topic.priority || 'P3'})`);

    const duplicateReason = detectDuplicate(row, existing);
    if (duplicateReason && !args.force) {
      row.topic.status = 'covered';
      row.topic.completed_date = TODAY;
      row.topic.completion_type = 'existing_coverage';
      row.topic.completion_note = duplicateReason;
      covered += 1;
      console.log(`[topic] covered ${slug} (${duplicateReason})`);
      reportLines.push(`- COVERED ${slug} (${duplicateReason})`);
      continue;
    }

    const categoryLabel = CATEGORY_LABELS[row.categoryKey] || 'Investing';
    const relatedPosts = pickRelatedPosts(existing, categoryLabel, slug);
    const internalLinks = buildInternalLinkTargets(relatedPosts, row.categoryKey);
    const researchSources = await fetchResearchContext(row.topic.primary_keyword);

    let generated = null;
    let lastError = null;

    for (let attempt = 1; attempt <= args.maxAttempts; attempt++) {
      const targetWords = Math.max(args.minWords, args.minWords + (attempt - 1) * 200);
      const prompt = buildPrompt(row, { categoryLabel, internalLinks }, targetWords, researchSources);

      try {
        const result = runCodex(prompt, {
          model: args.model,
          dryRun: args.dryRun,
          topicTitle: row.topic.title
        });

        const payload = parseModelJson(result.text);
        let body = normalizeModelBody(payload.body_markdown || '');
        body = ensureInternalLinks(body, internalLinks);
        const check = validateBodyQuality(body, args.minWords);
        if (check.issues.length) {
          throw new Error(check.issues.join(','));
        }

        const faq = sanitizeFaq(payload.faq, row.topic.primary_keyword);
        const stats = sanitizeStats(payload.statistics);
        const frontmatter = buildFrontmatter(row, categoryLabel, payload, check.words, relatedPosts, faq, stats);

        writeMarkdown(slug, frontmatter, body);

        row.topic.status = 'completed';
        row.topic.completed_date = TODAY;
        row.topic.completion_type = args.dryRun ? 'llm_dry_run' : 'llm_cms_generated';
        row.topic.completion_note = `model=${args.model}; words=${check.words}`;

        existing.bySlug.add(slug);
        existing.byKeyword.add(normalize(row.topic.primary_keyword));
        existing.posts.push({
          slug,
          title: frontmatter.title,
          category: frontmatter.category,
          primaryKeyword: row.topic.primary_keyword,
          tokens: new Set(normalize(frontmatter.title).split(' ').filter(Boolean))
        });

        created += 1;
        generated = { words: check.words };
        console.log(`[topic] created ${slug} (${check.words} words)`);
        reportLines.push(`- CREATED ${slug} (${check.words} words)`);
        break;
      } catch (error) {
        lastError = error;
        console.log(`[topic] retry ${slug} attempt=${attempt} error=${String(error.message)}`);
      }
    }

    if (!generated) {
      failed += 1;
      row.topic.status = 'pending';
      row.topic.completion_note = `failed:${String(lastError?.message || 'unknown')}`;
      reportLines.push(`- FAILED ${slug} (${String(lastError?.message || 'unknown')})`);
    }
  }

  updateMetadata(topics);
  writeJson(args.topicsFile, topics);

  reportLines.push('');
  reportLines.push('## Totals');
  reportLines.push(`- Created: ${created}`);
  reportLines.push(`- Covered: ${covered}`);
  reportLines.push(`- Failed: ${failed}`);
  reportLines.push(`- Remaining pending: ${topics.metadata?.pending_topics || 0}`);

  const reportPath = writeReport(reportLines);

  console.log(`Created: ${created}`);
  console.log(`Covered: ${covered}`);
  console.log(`Failed: ${failed}`);
  console.log(`Pending: ${topics.metadata?.pending_topics || 0}`);
  console.log(`Report: ${path.relative(ROOT, reportPath)}`);
}

main().catch((error) => {
  console.error(`generate-seo-llm-batch failed: ${error.message}`);
  process.exit(1);
});
