#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const ROOT = path.join(__dirname, '..');
const TOPICS_FILE = path.join(ROOT, 'data', 'seo-topics-100.json');
const CONTENT_DIR = path.join(ROOT, 'content', 'blog');
const TODAY = new Date().toISOString().slice(0, 10);

const CATEGORY_LABELS = {
  tax_strategies: 'Tax Strategies',
  retirement_planning: 'Retirement',
  business_structures: 'Business Structures',
  investing: 'Investing',
  debt_management: 'Debt Management',
  passive_income: 'Passive Income'
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function normalize(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSet(input) {
  return new Set(
    normalize(input)
      .split(' ')
      .filter(Boolean)
      .filter((t) => !['the', 'a', 'an', 'for', 'and', 'or', 'to', 'of', 'in', 'on', 'how', 'guide', 'complete', '2026'].includes(t))
  );
}

function jaccard(a, b) {
  const inter = [...a].filter((x) => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union ? inter / union : 0;
}

function loadExistingCoverage() {
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md'));
  const posts = files.map((file) => {
    const full = path.join(CONTENT_DIR, file);
    let parsed = {};
    try {
      parsed = matter(fs.readFileSync(full, 'utf8')).data || {};
    } catch (error) {
      // Keep indexing by filename/slug even if frontmatter is malformed.
      parsed = {};
    }
    return {
      file,
      slug: file.replace(/\.md$/, ''),
      title: parsed.title || '',
      primaryKeyword: parsed?.seo?.primaryKeyword || '',
      tokens: tokenSet(parsed.title || '')
    };
  });

  const topLevelDirs = ['tax-strategies', 'retirement', 'business-structures', 'investing', 'debt-management', 'passive-income'];
  const staticCoverage = new Set();
  for (const dir of topLevelDirs) {
    const fullDir = path.join(ROOT, dir);
    if (!fs.existsSync(fullDir)) continue;
    for (const file of fs.readdirSync(fullDir)) {
      if (file.endsWith('.html')) staticCoverage.add(`${dir}/${file.replace(/\.html$/, '')}`);
    }
  }

  return { posts, staticCoverage };
}

function detectDuplicate(topic, existing) {
  const slug = topic.slug;
  const primaryKeyword = normalize(topic.primary_keyword);
  const topicTokens = tokenSet(topic.title);

  if (existing.posts.some((p) => p.slug === slug)) {
    return { reason: 'existing_blog_slug' };
  }

  if (existing.posts.some((p) => normalize(p.primaryKeyword) === primaryKeyword && primaryKeyword)) {
    return { reason: 'existing_primary_keyword' };
  }

  if (existing.staticCoverage.has(`${topic.category_path}/${slug}`)) {
    return { reason: 'existing_static_page' };
  }

  for (const post of existing.posts) {
    if (!post.tokens.size || !topicTokens.size) continue;
    if (jaccard(post.tokens, topicTokens) >= 0.75) {
      return { reason: `title_similarity:${post.file}` };
    }
  }

  return null;
}

function sectionList(topic) {
  const category = topic.category_path;
  const keyword = topic.primary_keyword;
  const title = topic.title;
  const categorySpecific = {
    retirement: {
      framework: ['income floor planning', 'tax-aware withdrawal order', 'sequence-risk controls'],
      metrics: ['safe withdrawal rate', 'tax drag', 'income replacement ratio'],
      tools: ['401(k)/IRA account map', 'RMD calendar', 'beneficiary checklist']
    },
    'business-structures': {
      framework: ['entity selection rubric', 'liability boundary design', 'tax election timing'],
      metrics: ['effective tax rate', 'owner compensation ratio', 'compliance cost'],
      tools: ['operating agreement checklist', 'registered-agent process', 'annual meeting log']
    },
    investing: {
      framework: ['risk-budgeted allocation', 'expected return bands', 'rebalance rules'],
      metrics: ['expense ratio', 'drawdown tolerance', 'after-tax return'],
      tools: ['IPS template', 'rebalancing trigger sheet', 'fee audit tracker']
    },
    'debt-management': {
      framework: ['interest-priority payoff', 'cash buffer policy', 'payment automation'],
      metrics: ['debt-to-income ratio', 'weighted APR', 'payoff velocity'],
      tools: ['debt payoff board', 'autopay map', 'credit utilization tracker']
    },
    'passive-income': {
      framework: ['asset diligence checklist', 'operator/sponsor evaluation', 'cash-flow stabilization'],
      metrics: ['cash-on-cash return', 'occupancy or utilization', 'payback period'],
      tools: ['deal-screen rubric', 'risk register', '90-day launch sprint board']
    }
  }[category] || {
    framework: ['goal clarity', 'execution cadence', 'risk controls'],
    metrics: ['progress velocity', 'cost-to-benefit ratio', 'error rate'],
    tools: ['weekly scorecard', 'checklist system', 'decision log']
  };

  const relatedHub = {
    retirement: '/blog/category/retirement',
    'business-structures': '/blog/category/business-structures',
    investing: '/blog/category/investing',
    'debt-management': '/blog/category/debt-management',
    'passive-income': '/blog/category/passive-income'
  }[category] || '/blog';

  const categoryExamples = {
    retirement: {
      persona: 'a late-career household optimizing withdrawals and tax brackets',
      badDecision: 'drawing from pre-tax accounts first without modeling tax bracket stacking',
      betterDecision: 'sequencing withdrawals across taxable, tax-deferred, and Roth buckets based on annual bracket management'
    },
    'business-structures': {
      persona: 'an owner-operator moving from sole prop to structured entity planning',
      badDecision: 'choosing an entity for hype instead of liability and tax fit',
      betterDecision: 'using an entity decision matrix with legal risk, admin burden, and tax election timing'
    },
    investing: {
      persona: 'an accumulator balancing growth exposure with downside tolerance',
      badDecision: 'chasing recent winners without allocation discipline',
      betterDecision: 'running a written asset-allocation policy with rebalancing thresholds and tax-location rules'
    },
    'debt-management': {
      persona: 'a dual-income family carrying high-interest revolving balances',
      badDecision: 'making minimum payments while investing aggressively',
      betterDecision: 'building a cash buffer, automating payoff priority, and tracking weighted APR decline monthly'
    },
    'passive-income': {
      persona: 'a professional launching a second income engine with limited weekly hours',
      badDecision: 'pursuing yield before validating operator risk and liquidity profile',
      betterDecision: 'using staged capital deployment with diligence checklists and explicit kill criteria'
    }
  }[category] || {
    persona: 'an operator seeking a repeatable financial framework',
    badDecision: 'optimizing one metric while ignoring system fragility',
    betterDecision: 'documenting objectives, constraints, and review cadence before scaling'
  };

  return [
    `## Quick Take`,
    `**${title}** only becomes valuable when execution quality is higher than average. Most people fail because they chase tactics without building a system. This guide gives you a complete system: planning, implementation, measurement, risk controls, and optimization.`,
    ``,
    `If you implement even 60% of this framework with discipline, you should make better decisions than most people who rely on generic checklist content.`,
    ``,
    `## What It Is`,
    `${title} is a decision framework for improving outcomes while controlling downside risk. In practice, it means:`,
    `- Clear operating rules`,
    `- Documented assumptions`,
    `- Repeatable review cycles`,
    `- Explicit risk boundaries`,
    ``,
    `When those four elements are present, performance improves and mistakes become recoverable. When they are missing, results depend on luck and timing.`,
    ``,
    `## What Searchers Actually Need`,
    `People searching **${keyword}** usually need more than a definition. They need:`,
    `- A plain-English explanation`,
    `- A practical implementation sequence they can follow this month`,
    `- Decision criteria for tradeoffs and alternatives`,
    `- Mistake prevention, not just theory`,
    ``,
    `This guide is structured exactly around those outcomes.`,
    ``,
    `## Who This Works For`,
    `- Operators who prefer process over guesswork`,
    `- Professionals balancing growth, taxes, and downside protection`,
    `- Households building a durable long-term wealth plan`,
    `- Anyone willing to run monthly and quarterly reviews`,
    ``,
    `## Before You Start: Readiness Checklist`,
    `Use this checklist before making any major move around ${keyword}:`,
    `- You have a written objective with a 12-month horizon`,
    `- You defined minimum liquidity and emergency buffers`,
    `- You identified legal/tax/compliance boundaries`,
    `- You know what would make you pause or exit`,
    `- You scheduled recurring reviews on your calendar`,
    ``,
    `If any item is missing, fix that first. It is usually the highest-ROI move.`,
    ``,
    `## Core Framework: Design, Deploy, Defend`,
    `### 1. Design`,
    `Define your objective, constraints, and non-negotiables. This prevents emotional decision-making when conditions change.`,
    ``,
    `### 2. Deploy`,
    `Launch a minimum viable version with checkpoints. Keep early scope tight so you can debug without expensive errors.`,
    ``,
    `### 3. Defend`,
    `Use pre-defined risk triggers and review rules. If the system drifts outside your thresholds, you rebalance or pause.`,
    ``,
    `## Step-By-Step Implementation`,
    `### Step 1: Baseline and Constraint Mapping`,
    `Capture cash flow, taxes, liabilities, liquidity runway, and current commitments. A strategy without constraints is fragile by default.`,
    ``,
    `Output for this step: a one-page baseline sheet with numbers you can verify.`,
    ``,
    `### Step 2: Build a One-Page Policy`,
    `Document target outcome, acceptable risk, and non-negotiable rules. This becomes your operating policy for ${keyword}.`,
    ``,
    `Minimum policy fields:`,
    `- Goal and deadline`,
    `- Allowed tools/accounts/entities`,
    `- Max downside tolerated`,
    `- Review cadence`,
    `- Exit criteria`,
    ``,
    `### Step 3: Implement the First 30%`,
    `Start small. Implement the smallest version that can produce real feedback. Automate what is repetitive, and keep judgment calls manual early on.`,
    ``,
    `This prevents early over-optimization and keeps costs controlled.`,
    ``,
    `### Step 4: Instrument the System`,
    `Track decision-grade metrics only: ${categorySpecific.metrics.join(', ')}.`,
    ``,
    `If a metric does not change a decision, it should not be a primary KPI.`,
    ``,
    `### Step 5: Monthly and Quarterly Reviews`,
    `Monthly reviews catch drift and execution gaps. Quarterly reviews handle structural changes, policy updates, and allocation decisions.`,
    ``,
    `Document every major decision and what data justified it.`,
    ``,
    `## Category-Specific Execution Stack`,
    `For ${keyword}, prioritize:`,
    `- **Framework components**: ${categorySpecific.framework.join('; ')}`,
    `- **Key metrics**: ${categorySpecific.metrics.join('; ')}`,
    `- **Tooling**: ${categorySpecific.tools.join('; ')}`,
    ``,
    `## Numbers: Scenario Planning`,
    `Run three scenarios before committing more capital or complexity:`,
    ``,
    `| Scenario | Assumption Quality | Execution Discipline | Expected Outcome Profile |`,
    `|---|---|---|---|`,
    `| Conservative | Average assumptions | Strict controls | Lower upside, stronger protection |`,
    `| Base Case | Good assumptions | Consistent reviews | Balanced upside and resilience |`,
    `| Stretch | Optimistic assumptions | Requires high precision | Higher upside with higher fragility |`,
    ``,
    `## Decision Table`,
    `| Component | Conservative | Base Case | Stretch |`,
    `|---|---:|---:|---:|`,
    `| Time Horizon | 12 months | 24 months | 36 months |`,
    `| Review Cadence | Quarterly | Monthly | Bi-weekly |`,
    `| Capital Allocation | Defensive | Balanced | Aggressive |`,
    `| Risk Buffer | High | Moderate | Targeted |`,
    ``,
    `## Decision Math: Worked Example`,
    `Use simple, explicit math before you change strategy size:`,
    ``,
    `- **Expected value** = (probability of success x upside) - (probability of failure x downside)`,
    `- **Execution-adjusted expected value** = expected value x execution reliability score`,
    `- **Risk-adjusted score** = execution-adjusted expected value / max drawdown tolerance`,
    ``,
    `Example interpretation: if projected upside is high but execution reliability is low, your adjusted score can still be weak. In that case, reduce scope and improve execution before scaling.`,
    ``,
    `| Input | Conservative | Base | Stretch |`,
    `|---|---:|---:|---:|`,
    `| Success Probability | 45% | 60% | 70% |`,
    `| Upside Value (relative) | 1.2x | 1.6x | 2.1x |`,
    `| Failure Cost (relative) | 0.6x | 0.7x | 0.9x |`,
    `| Execution Reliability | 0.80 | 0.70 | 0.55 |`,
    `| Final Score (directional) | Moderate | Strong | Fragile |`,
    ``,
    `## Risk Management Playbook`,
    `Treat risk management as part of the strategy, not a separate task.`,
    ``,
    `### Risk Layer 1: Structural`,
    `Define hard boundaries for leverage, concentration, and liquidity. If boundaries are violated, actions are predefined.`,
    ``,
    `### Risk Layer 2: Operational`,
    `Use checklists and approval gates so one rushed decision cannot break the entire system.`,
    ``,
    `### Risk Layer 3: Behavioral`,
    `Set decision cool-off rules to avoid acting on market noise, social pressure, or recency bias.`,
    ``,
    `### Risk Layer 4: Compliance`,
    `For any legal/tax/entity-sensitive move, require documented review from qualified professionals before execution.`,
    ``,
    `## Tools, Templates, And Documentation`,
    `A strong ${keyword} process usually includes:`,
    `- A one-page operating policy`,
    `- An assumptions register (what must remain true)`,
    `- A monthly review template`,
    `- A post-mortem template for missed outcomes`,
    `- A quarterly rebalance memo`,
    ``,
    `Documentation feels slow early, but it compounds. Most advanced operators win because they reduce repeated mistakes.`,
    ``,
    `## 90-Day Operating Cadence`,
    `### Month 1: Foundation`,
    `- Build policy and baseline`,
    `- Complete first controlled implementation`,
    `- Instrument the dashboard`,
    ``,
    `### Month 2: Stabilization`,
    `- Tighten assumptions`,
    `- Remove low-signal metrics`,
    `- Fix recurring execution bottlenecks`,
    ``,
    `### Month 3: Optimization`,
    `- Compare expected vs actual outcomes`,
    `- Reallocate toward what proved robust`,
    `- Define scale criteria for next quarter`,
    ``,
    `## Governance And Audit Checklist`,
    `Run this checklist every quarter:`,
    `- Are assumptions still valid under current conditions?`,
    `- Did any part of the process drift from policy?`,
    `- Were compliance and tax checks documented?`,
    `- Did downside exposure remain inside thresholds?`,
    `- What one simplification would improve reliability next quarter?`,
    ``,
    `## Advisor Conversation Script`,
    `When you bring ${keyword} to an advisor, ask:`,
    `1. Where is the highest legal or tax risk in this plan?`,
    `2. Which assumption is most likely to break first?`,
    `3. What evidence would justify scaling or reducing exposure?`,
    `4. What documentation is missing for audit defensibility?`,
    ``,
    `## Practical Example`,
    `Consider ${categoryExamples.persona}.`,
    `- Bad decision: ${categoryExamples.badDecision}.`,
    `- Better decision: ${categoryExamples.betterDecision}.`,
    ``,
    `That single change usually improves consistency more than adding new tactics.`,
    ``,
    `## 12-Week Rollout Plan`,
    `### Weeks 1-2`,
    `Baseline, policy draft, and tool setup.`,
    ``,
    `### Weeks 3-4`,
    `Implement first workflow and define metric dashboard.`,
    ``,
    `### Weeks 5-8`,
    `Run controlled execution, log errors, and tighten operating rules.`,
    ``,
    `### Weeks 9-12`,
    `Optimize, remove weak assumptions, and prepare scale plan.`,
    ``,
    `## Common Mistakes`,
    `- Optimizing for headline returns while ignoring fragility`,
    `- Adding complexity before instrumentation is reliable`,
    `- Underestimating tax/legal/compliance constraints`,
    `- Scaling before validating base-case assumptions`,
    `- Running no post-mortem after mistakes`,
    ``,
    `## Red Flags That Should Trigger A Pause`,
    `- Cash-flow assumptions consistently miss by >20%`,
    `- Compliance or documentation is incomplete`,
    `- Team/process capacity is below required execution load`,
    `- Decision-making becomes reactive instead of policy-driven`,
    ``,
    `## Alternatives And Tradeoffs`,
    `Compare ${keyword} against alternatives across four lenses:`,
    `- Implementation time`,
    `- Downside protection`,
    `- After-tax outcome`,
    `- Ongoing maintenance burden`,
    ``,
    `A slightly lower-return approach can be superior if it is easier to execute consistently for years.`,
    ``,
    `## 30-Day Action Checklist`,
    `- Define one primary outcome and two risk thresholds`,
    `- Build your one-page policy document`,
    `- Set up documentation and automation stack`,
    `- Execute first two high-leverage actions`,
    `- Schedule monthly and quarterly review blocks`,
    `- Identify one mentor/advisor checkpoint`,
    ``,
    `## What To Bring To An Advisor Review`,
    `If you review ${keyword} with a CPA/attorney/advisor, bring:`,
    `- One-page policy`,
    `- Baseline financial snapshot`,
    `- Scenario table and assumptions`,
    `- Top three risks and proposed controls`,
    `- 12-week execution plan`,
    ``,
    `## Internal Links To Continue`,
    `- [Browse related guides](${relatedHub})`,
    `- [Programs and implementation support](/programs)`,
    `- [Latest blog posts](/blog)`,
    ``,
    `## Final Word`,
    `${title} becomes valuable when you can execute it repeatedly under uncertainty. Keep the system measurable, documented, and resilient. Depth matters more than speed.`,
  ].join('\n');
}

function buildFaq(topic) {
  const keyword = topic.primary_keyword;
  return [
    {
      question: `What is ${keyword}?`,
      answer: `${keyword} is a structured approach for improving outcomes through documented rules, measurable checkpoints, and risk controls.`
    },
    {
      question: `Who benefits most from ${keyword}?`,
      answer: `People with clear objectives, stable execution habits, and willingness to review assumptions regularly tend to benefit most.`
    },
    {
      question: `How quickly can I implement ${keyword}?`,
      answer: `A workable first version is usually possible in 2 to 6 weeks, followed by a 60 to 90 day refinement cycle.`
    },
    {
      question: `What are the biggest mistakes with ${keyword}?`,
      answer: `The most common mistakes are over-sizing too early, ignoring compliance details, and not running scheduled reviews.`
    },
    {
      question: `Do I need a professional advisor?`,
      answer: `For legal, tax, or entity-sensitive decisions, use qualified professionals to validate assumptions and implementation steps.`
    },
    {
      question: `How does ${keyword} compare to simpler approaches?`,
      answer: `${keyword} can outperform simpler approaches when executed well, but it usually requires more discipline and maintenance.`
    },
    {
      question: `What should I track monthly?`,
      answer: `Track outcome progress, risk signals, implementation drift, and any changes in assumptions that impact your plan.`
    },
    {
      question: `Can beginners use ${keyword}?`,
      answer: `Yes. Start with a simplified baseline version and add complexity only after the fundamentals are stable.`
    },
    {
      question: `How much time should I budget each month?`,
      answer: `Most people need 2 to 6 focused hours per month for review, adjustment, and documentation once implementation is stable.`
    },
    {
      question: `What should I do if results are worse than expected?`,
      answer: `Pause scaling, review assumptions, reduce exposure, and return to your conservative operating policy until metrics stabilize.`
    },
    {
      question: `Which part of the process has the highest leverage?`,
      answer: `The highest leverage is usually a clear one-page policy with strict review cadence, because it improves every later decision.`
    }
  ];
}

function buildFrontmatter(topic, categoryKey) {
  const category = CATEGORY_LABELS[categoryKey] || 'Investing';
  const faq = buildFaq(topic);

  return {
    title: topic.title,
    titleTemplate: '%s | Legacy Investing Show',
    description: `Learn ${topic.primary_keyword} with practical steps, examples, mistakes to avoid, and an execution checklist.`,
    date: TODAY,
    modifiedDate: TODAY,
    author: 'Preston Seo',
    authorTitle: 'Founder, Legacy Investing Show',
    authorCredentials: 'Personal finance educator and strategy coach',
    category,
    canonical: `https://www.legacyinvestingshow.com/blog/${topic.slug}`,
    seo: {
      primaryKeyword: topic.primary_keyword,
      secondaryKeywords: [
        `${topic.primary_keyword} strategy`,
        `${topic.primary_keyword} guide`,
        `${topic.primary_keyword} examples`
      ],
      longTailKeywords: [
        `how to use ${topic.primary_keyword}`,
        `${topic.primary_keyword} mistakes to avoid`,
        `${topic.primary_keyword} for beginners`
      ],
      searchIntent: 'informational',
      targetSnippet: `${topic.primary_keyword} explained`
    },
    tags: [
      topic.primary_keyword,
      topic.category_path.replace(/-/g, ' '),
      'wealth strategy',
      'financial planning'
    ],
    image: '/assets/images/og-blog.jpg',
    imageAlt: `${topic.title} guide`,
    imageWidth: 1200,
    imageHeight: 630,
    twitterCard: 'summary_large_image',
    featured: false,
    schema: [
      {
        type: 'Article',
        headline: topic.title,
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
      { name: category, url: '/blog' },
      { name: topic.title, url: `/blog/${topic.slug}` }
    ],
    statistics: [
      { value: '30 Days', label: 'Starter Sprint', icon: 'calendar', context: 'Initial implementation window' },
      { value: '4', label: 'Core Checkpoints', icon: 'list', context: 'Planning, execution, risk, review' },
      { value: '1', label: 'Primary Objective', icon: 'chart', context: 'Keeps strategy focused' },
      { value: 'Quarterly', label: 'Review Cadence', icon: 'clock', context: 'Recommended adjustment cycle' }
    ],
    faq,
    toc: true,
    tocDepth: 3,
    relatedPosts: [
      { slug: 'start-from-zero-2025-wealth-building-plan', title: 'Start From Zero Wealth Plan' },
      { slug: 'airbnb-arbitrage-84-days-9-steps-guide', title: '84-Day Airbnb Guide' }
    ],
    readingTime: '22 min read',
    wordCount: '4200'
  };
}

function writeMarkdown(topic, categoryKey) {
  const frontmatter = buildFrontmatter(topic, categoryKey);
  const body = sectionList(topic);
  const markdown = matter.stringify(`${body}\n`, frontmatter);
  const file = path.join(CONTENT_DIR, `${topic.slug}.md`);
  fs.writeFileSync(file, markdown, 'utf8');
}

function main() {
  const data = readJson(TOPICS_FILE);
  const existing = loadExistingCoverage();

  let generated = 0;
  let covered = 0;
  const notes = [];

  for (const [categoryKey, category] of Object.entries(data.categories)) {
    for (const topic of category.topics) {
      const isGeneratedEarlier = topic.status === 'completed' && topic.completion_type === 'cms_generated';
      if ((topic.status === 'completed' || topic.status === 'covered') && !isGeneratedEarlier) continue;

      if (isGeneratedEarlier) {
        writeMarkdown(topic, categoryKey);
        notes.push(`REFRESHED  ${topic.slug}`);
        continue;
      }

      const dup = detectDuplicate(topic, existing);
      if (dup) {
        topic.status = 'covered';
        topic.completed_date = TODAY;
        topic.completion_type = 'existing_coverage';
        topic.completion_note = dup.reason;
        covered += 1;
        notes.push(`COVERED  ${topic.slug} (${dup.reason})`);
        continue;
      }

      writeMarkdown(topic, categoryKey);
      topic.status = 'completed';
      topic.completed_date = TODAY;
      topic.completion_type = 'cms_generated';
      generated += 1;
      notes.push(`CREATED  ${topic.slug}`);
      existing.posts.push({
        file: `${topic.slug}.md`,
        slug: topic.slug,
        title: topic.title,
        primaryKeyword: topic.primary_keyword,
        tokens: tokenSet(topic.title)
      });
    }
  }

  const allTopics = Object.values(data.categories).flatMap((c) => c.topics);
  const pending = allTopics.filter((t) => t.status !== 'completed' && t.status !== 'covered').length;
  const completed = allTopics.filter((t) => t.status === 'completed').length;
  const coveredTotal = allTopics.filter((t) => t.status === 'covered').length;

  data.metadata.last_updated = TODAY;
  data.metadata.completed_topics = completed;
  data.metadata.covered_topics = coveredTotal;
  data.metadata.pending_topics = pending;
  data.metadata.status = pending === 0 ? 'complete' : 'partially_completed';

  writeJson(TOPICS_FILE, data);

  const reportPath = path.join(ROOT, 'analysis', 'programmatic-seo-phase2-generation-report.md');
  const report = [
    '# Programmatic SEO Phase 2 Generation Report',
    '',
    `Date: ${TODAY}`,
    '',
    `- Created (CMS markdown): ${generated}`,
    `- Marked covered (already exists): ${covered}`,
    `- Remaining pending: ${pending}`,
    '',
    '## Topic-by-topic results',
    '',
    ...notes.map((line) => `- ${line}`)
  ].join('\n');
  fs.writeFileSync(reportPath, `${report}\n`, 'utf8');

  console.log(`Created: ${generated}`);
  console.log(`Covered: ${covered}`);
  console.log(`Pending: ${pending}`);
  console.log(`Report: ${reportPath}`);
}

main();
