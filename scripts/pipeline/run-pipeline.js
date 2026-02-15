#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { spawnSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..', '..');
const PIPELINE_DIR = path.join(ROOT_DIR, 'pipeline');
const RUNS_DIR = path.join(PIPELINE_DIR, 'runs');
const CONTENT_BLOG_DIR = path.join(ROOT_DIR, 'content', 'blog');

const REQUIRED_FRONTMATTER = ['title', 'description', 'date', 'author', 'category', 'image'];
const STOPWORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'for', 'to', 'of', 'in', 'on', 'with', 'from', 'by', 'how', 'what', 'when', 'why', 'is', 'are'
]);

function parseArgs(argv) {
    const args = {};

    for (let i = 2; i < argv.length; i++) {
        const token = argv[i];

        if (token === '--topic') {
            args.topic = argv[i + 1];
            i++;
            continue;
        }

        if (token === '--persona') {
            args.persona = argv[i + 1];
            i++;
            continue;
        }

        if (token === '--publish') {
            args.publish = true;
            continue;
        }
    }

    return args;
}

function slugify(input) {
    return String(input || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 80);
}

function nowStamp() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

function dateISO() {
    return new Date().toISOString().split('T')[0];
}

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function writeJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4) + '\n', 'utf8');
}

function countWords(text) {
    return String(text || '')
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .filter(Boolean)
        .length;
}

function getKeywordCandidates(topic) {
    const words = String(topic || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
        .filter((word) => word.length > 2 && !STOPWORDS.has(word));

    return [...new Set(words)].slice(0, 6);
}

function detectIntent(topic) {
    const t = topic.toLowerCase();

    if (t.includes('vs') || t.includes('compare')) {
        return 'comparison';
    }

    if (t.includes('how') || t.includes('guide') || t.includes('steps')) {
        return 'informational';
    }

    if (t.includes('best') || t.includes('top') || t.includes('tools')) {
        return 'commercial';
    }

    return 'informational';
}

function detectCategory(topic) {
    const t = topic.toLowerCase();

    if (t.includes('tax')) return 'Tax Strategies';
    if (t.includes('airbnb') || t.includes('short-term rental')) return 'Airbnb Arbitrage';
    if (t.includes('retirement') || t.includes('401')) return 'Retirement';
    if (t.includes('story') || t.includes('case study')) return 'Success Story';

    return 'Investing';
}

function loadTopicIdeas() {
    const filePath = path.join(ROOT_DIR, 'data', 'topics.json');

    if (!fs.existsSync(filePath)) {
        return [];
    }

    try {
        const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const buckets = Object.values(payload || {});
        return buckets.flatMap((bucket) => (Array.isArray(bucket) ? bucket : []));
    } catch (error) {
        return [];
    }
}

function buildResearch(args) {
    const primaryKeyword = args.topic.toLowerCase().trim();
    const candidates = getKeywordCandidates(args.topic);
    const intent = detectIntent(args.topic);
    const topicIdeas = loadTopicIdeas();

    const relatedInternalTopics = topicIdeas
        .slice(0, 100)
        .filter((item) => {
            const title = (item.title || '').toLowerCase();
            return candidates.some((kw) => title.includes(kw));
        })
        .slice(0, 6)
        .map((item) => item.title);

    return {
        topic: args.topic,
        primaryKeyword,
        secondaryKeywords: candidates.slice(0, 4).map((kw) => `${kw} strategy`),
        longTailKeywords: [
            `best ${primaryKeyword} for beginners`,
            `how to use ${primaryKeyword} step by step`,
            `${primaryKeyword} mistakes to avoid`,
            `${primaryKeyword} checklist`
        ],
        searchIntent: intent,
        persona: args.persona || 'Beginner investors and operators',
        painPoints: [
            'Too much conflicting advice online',
            'Unclear first steps and execution plan',
            'Fear of costly mistakes in first 90 days'
        ],
        questions: [
            `What is the fastest way to start with ${primaryKeyword}?`,
            `How much money and time does ${primaryKeyword} require?`,
            `What are the biggest mistakes beginners make with ${primaryKeyword}?`,
            `Which tools make ${primaryKeyword} easier to execute?`
        ],
        relatedInternalTopics,
        generatedAt: new Date().toISOString()
    };
}

function buildBrief(research) {
    const topicSlug = slugify(research.topic);
    const category = detectCategory(research.topic);

    return {
        title: toTitleCase(research.topic),
        description: `Actionable ${research.topic.toLowerCase()} guide with frameworks, checklist, and mistakes to avoid for beginners.`,
        slug: topicSlug,
        category,
        targetWordCount: 1800,
        requiredSections: [
            'Hook & context',
            'Definition and quick framework',
            'Who this is for',
            'Step-by-step process',
            'Numbers and planning assumptions',
            'Common mistakes',
            'Tools and execution stack',
            'FAQ',
            'Call to action'
        ],
        outline: [
            'Quick answer',
            'Why this matters in 2026',
            'Step-by-step action plan',
            'Budget and timeline breakdown',
            'Mistakes to avoid',
            'Tools, templates, and checklist',
            'FAQ',
            'Next step CTA'
        ],
        entities: [
            'Legacy Investing Show',
            'Preston Seo',
            'Airbnb Arbitrage',
            'Tax Strategy',
            'Cash Flow'
        ],
        faqTargets: research.questions,
        internalLinks: [
            '/blog/',
            '/topics/airbnb-arbitrage',
            '/topics/tax-strategies',
            '/programs'
        ],
        cta: 'Join the 3-Day Wealth Challenge and apply the framework with guided support.',
        sourceResearch: research
    };
}

function toTitleCase(str) {
    return String(str || '')
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
        .trim();
}

function buildDraftMarkdown(brief) {
    const today = dateISO();
    const image = '/assets/images/blog/placeholder.jpg';

    const faqs = brief.faqTargets.slice(0, 4).map((question) => ({
        question,
        answer: `Start with a simple plan, define your budget and timeline, and execute one step at a time while tracking results weekly.`
    }));

    const statistics = [
        { value: '90 Days', label: 'Starter Timeline', context: 'Typical first execution window' },
        { value: '$5K-$15K', label: 'Starter Capital Range', context: 'Depends on market and model' },
        { value: '3-5 Hours', label: 'Weekly Operator Time', context: 'After systems are in place' }
    ];

    const frontmatter = {
        title: `${brief.title}: Practical 2026 Playbook`,
        description: brief.description,
        date: today,
        author: 'Preston Seo',
        category: brief.category,
        image,
        keywords: [brief.sourceResearch.primaryKeyword, ...brief.sourceResearch.secondaryKeywords.slice(0, 3)],
        seo: {
            primaryKeyword: brief.sourceResearch.primaryKeyword,
            secondaryKeywords: brief.sourceResearch.secondaryKeywords,
            longTailKeywords: brief.sourceResearch.longTailKeywords,
            searchIntent: brief.sourceResearch.searchIntent
        },
        statistics,
        faq: faqs
    };

    const body = `# ${frontmatter.title}

## Quick Answer

If you are starting with **${brief.sourceResearch.primaryKeyword}**, focus on a 90-day execution cycle: validate the market, set clear numbers, deploy one repeatable process, and review performance weekly. This avoids random action and protects your capital.

## Why This Matters in 2026

Most beginners fail because they consume too much advice and execute too little. The market rewards operators who run simple systems consistently. In 2026, speed of execution and quality of operations matter more than perfect theory.

For Legacy Investing Show readers, the practical edge is combining education with an execution checklist. You do not need a perfect plan. You need a plan that survives contact with reality and improves every week.

## Who This Is For

This framework is built for:

- Beginners who want structure and fewer mistakes.
- W-2 professionals building a side cash-flow channel.
- Operators who want a repeatable process instead of guesswork.

If your goal is to reduce trial-and-error and move from learning to implementation, this approach is the right fit.

## Step-by-Step Action Plan

### Step 1: Define Your Operating Model

Choose one clear model for the next 90 days. Keep the scope narrow so your execution is measurable. Document what success means and how you will track it.

### Step 2: Set Non-Negotiable Numbers

Create a simple scorecard with budget, minimum return target, and time commitment. If your numbers do not work on paper, do not force execution.

### Step 3: Build the First Execution Checklist

List every task from setup to ongoing management. The checklist is your anti-chaos system. Anything repeated more than once should be documented.

### Step 4: Launch Small and Measure Weekly

Ship one version quickly. Collect data weekly and improve one bottleneck at a time. Weekly feedback loops create faster growth than waiting for a perfect launch.

## Budget and Timeline Breakdown

| Phase | Time | Key Cost Buckets | Decision Gate |
| --- | --- | --- | --- |
| Planning | Week 1-2 | Research tools, setup costs | Continue only if assumptions hold |
| Setup | Week 3-6 | Core operating expenses | Continue only if process is stable |
| Optimization | Week 7-12 | Tool upgrades, process improvements | Scale only if unit economics are healthy |

Use this table as a practical planning framework. Adjust the numbers to your market and risk tolerance, but keep the decision gates strict.

## Common Mistakes to Avoid

### Mistake 1: Starting Without a Scorecard

If you do not define success metrics early, decisions become emotional. A simple scorecard prevents reactionary choices.

### Mistake 2: Overbuilding Before Validation

Beginners often over-invest in tools and complexity too soon. Validate the core workflow first, then improve.

### Mistake 3: Inconsistent Weekly Review

Without weekly review, small problems become expensive problems. A 30-minute review can save weeks of recovery work.

## Tools, Templates, and Checklist

Use a lightweight stack:

- One project tracker for tasks.
- One financial tracker for weekly metrics.
- One SOP document for repeated operations.

Suggested internal reading:

- [Blog library](${brief.internalLinks[0]})
- [Airbnb topic hub](${brief.internalLinks[1]})
- [Tax strategies topic hub](${brief.internalLinks[2]})

## 90-Day Implementation Calendar

### Days 1-15: Research and Setup

Use the first two weeks to choose one market, one operating model, and one measurable goal. Do not over-optimize branding at this stage. Focus on clarity of assumptions and speed of first execution.

Write down your weekly review schedule before you launch. If the review cadence is not scheduled now, it usually never happens later.

### Days 16-45: First Execution Cycle

Run one complete cycle end-to-end. Capture bottlenecks in your checklist and document fixes immediately. This is where most beginners discover operational blind spots: communication gaps, timing issues, and hidden costs.

When something breaks, update the process before repeating the task. The goal is not perfection, the goal is reducing repeated errors.

### Days 46-90: Optimization and Scale Readiness

By this point, you should have enough data for basic trend analysis. Track what actually improved results and what only felt productive. Keep only changes that clearly move your core metrics.

At the end of day 90, decide whether to scale, hold, or redesign the model. This decision should come from data, not emotion.

## Weekly KPI Dashboard

Track a small set of metrics every week:

- Revenue and net cash flow.
- Core cost buckets and variance against plan.
- Time spent by the operator.
- Conversion or occupancy drivers (depending on model).

These metrics protect you from making decisions based on isolated events. A single bad week is noise; repeated trends are signals.

Use a simple scorecard format:

| Metric | Target | Actual | Action |
| --- | --- | --- | --- |
| Net Cash Flow | Positive trend | Weekly tracked | Cut low-value costs and improve conversion bottlenecks |
| Operator Time | <=5 hrs/week | Weekly tracked | Automate repetitive steps and document SOP updates |
| Process Reliability | High consistency | Weekly tracked | Add backup workflows where failure risk is high |

## FAQ

### Q1: ${faqs[0].question}
${faqs[0].answer}

### Q2: ${faqs[1].question}
${faqs[1].answer}

### Q3: ${faqs[2].question}
${faqs[2].answer}

### Q4: ${faqs[3].question}
${faqs[3].answer}

## Next Step

${brief.cta}

For implementation support and structured accountability, continue to [Programs](${brief.internalLinks[3]}).
`;

    return matter.stringify(body, frontmatter);
}

function reviewDraft(draftMarkdown, brief) {
    const parsed = matter(draftMarkdown);
    const data = parsed.data || {};
    const content = parsed.content || '';
    const findings = [];
    let score = 100;

    REQUIRED_FRONTMATTER.forEach((field) => {
        if (!data[field]) {
            findings.push({
                severity: 'high',
                rule: 'frontmatter.required',
                message: `Missing required frontmatter field: ${field}`
            });
            score -= 15;
        }
    });

    const h1Count = (content.match(/^#\s+/gm) || []).length;
    if (h1Count !== 1) {
        findings.push({
            severity: 'high',
            rule: 'headings.h1',
            message: `Expected exactly one H1, found ${h1Count}`
        });
        score -= 20;
    }

    const h2Count = (content.match(/^##\s+/gm) || []).length;
    if (h2Count < 6) {
        findings.push({
            severity: 'medium',
            rule: 'headings.h2',
            message: `Expected at least 6 H2 sections, found ${h2Count}`
        });
        score -= 10;
    }

    const faqCount = (content.match(/^###\s+Q[0-9]+:/gm) || []).length;
    if (faqCount < 4) {
        findings.push({
            severity: 'medium',
            rule: 'faq.minimum',
            message: `Expected at least 4 FAQ items, found ${faqCount}`
        });
        score -= 10;
    }

    const words = countWords(content);
    const minWords = Math.max(900, Math.floor(brief.targetWordCount * 0.55));
    if (words < minWords) {
        findings.push({
            severity: 'high',
            rule: 'content.word_count',
            message: `Word count ${words} is below minimum ${minWords}`
        });
        score -= 20;
    }

    const primaryKeyword = brief.sourceResearch.primaryKeyword.toLowerCase();
    const hasPrimaryInBody = content.toLowerCase().includes(primaryKeyword);
    if (!hasPrimaryInBody) {
        findings.push({
            severity: 'medium',
            rule: 'seo.primary_keyword',
            message: 'Primary keyword not found in article body'
        });
        score -= 10;
    }

    score = Math.max(0, score);
    const pass = score >= 80 && !findings.some((f) => f.severity === 'high');

    return {
        pass,
        score,
        wordCount: words,
        targetWordCount: brief.targetWordCount,
        findings
    };
}

function writeReviewMarkdown(review) {
    const lines = [];

    lines.push('# Review Report');
    lines.push('');
    lines.push(`- Pass: **${review.pass ? 'YES' : 'NO'}**`);
    lines.push(`- Score: **${review.score}/100**`);
    lines.push(`- Word Count: **${review.wordCount}**`);
    lines.push('');

    if (review.findings.length === 0) {
        lines.push('No findings. Draft is publish-ready.');
        lines.push('');
        return lines.join('\n');
    }

    lines.push('## Findings');
    lines.push('');

    review.findings.forEach((finding, idx) => {
        lines.push(`${idx + 1}. [${finding.severity.toUpperCase()}] ${finding.message} (${finding.rule})`);
    });

    lines.push('');
    return lines.join('\n');
}

function runBuild(cmd) {
    const parts = cmd.split(' ');
    const proc = spawnSync(parts[0], parts.slice(1), {
        cwd: ROOT_DIR,
        stdio: 'pipe',
        encoding: 'utf8'
    });

    return {
        command: cmd,
        exitCode: proc.status,
        stdout: proc.stdout || '',
        stderr: proc.stderr || ''
    };
}

function publishDraft(draftPath, slug, review) {
    const targetPath = path.join(CONTENT_BLOG_DIR, `${slug}.md`);
    const exists = fs.existsSync(targetPath);

    if (!review.pass) {
        return {
            published: false,
            reason: 'Review did not pass quality gates',
            targetPath,
            build: [],
            reverted: false
        };
    }

    if (exists) {
        return {
            published: false,
            reason: 'Target file already exists. Manual merge required.',
            targetPath,
            build: [],
            reverted: false
        };
    }

    fs.copyFileSync(draftPath, targetPath);

    const build = [
        runBuild('npm run build:blog'),
        runBuild('npm run build:sitemap'),
        runBuild('npm run cms:verify')
    ];
    const failed = build.filter((step) => step.exitCode !== 0);

    if (failed.length > 0) {
        if (fs.existsSync(targetPath)) {
            fs.unlinkSync(targetPath);
        }

        return {
            published: false,
            reason: `Publish gates failed: ${failed.map((step) => step.command).join(', ')}. Draft copy reverted.`,
            targetPath,
            build,
            reverted: true
        };
    }

    return {
        published: true,
        reason: 'Draft copied and publish gates passed.',
        targetPath,
        build,
        reverted: false
    };
}

function writeRunSummary(runDir, args, files) {
    const summary = [
        '# Pipeline Run Summary',
        '',
        `- Topic: ${args.topic}`,
        `- Persona: ${args.persona || 'auto-detected'}`,
        `- Publish mode: ${args.publish ? 'enabled' : 'disabled'}`,
        '',
        '## Artifacts',
        '',
        `- research: ${files.researchPath}`,
        `- brief: ${files.briefPath}`,
        `- draft: ${files.draftPath}`,
        `- review: ${files.reviewPath}`,
        `- review markdown: ${files.reviewMdPath}`,
        files.publishPath ? `- publish report: ${files.publishPath}` : '- publish report: not generated'
    ].join('\n');

    fs.writeFileSync(path.join(runDir, 'RUN-SUMMARY.md'), summary + '\n', 'utf8');
}

function main() {
    const args = parseArgs(process.argv);

    if (!args.topic) {
        console.error('Usage: npm run pipeline -- --topic "your topic" [--persona "..." ] [--publish]');
        process.exit(1);
    }

    ensureDir(RUNS_DIR);

    const runId = `${nowStamp()}-${slugify(args.topic)}`;
    const runDir = path.join(RUNS_DIR, runId);
    ensureDir(runDir);

    console.log('[Agent 1: Research] building research.json');
    const research = buildResearch(args);
    const researchPath = path.join(runDir, 'research.json');
    writeJson(researchPath, research);

    console.log('[Agent 2: Brief Builder] building brief.json');
    const brief = buildBrief(research);
    const briefPath = path.join(runDir, 'brief.json');
    writeJson(briefPath, brief);

    console.log('[Agent 3: Writer] building draft.md');
    const draftMarkdown = buildDraftMarkdown(brief);
    const draftPath = path.join(runDir, 'draft.md');
    fs.writeFileSync(draftPath, draftMarkdown, 'utf8');

    console.log('[Agent 4: Reviewer] validating draft.md');
    const review = reviewDraft(draftMarkdown, brief);
    const reviewPath = path.join(runDir, 'review.json');
    const reviewMdPath = path.join(runDir, 'REVIEW_ME.md');
    writeJson(reviewPath, review);
    fs.writeFileSync(reviewMdPath, writeReviewMarkdown(review), 'utf8');

    let publishPath = null;
    if (args.publish) {
        console.log('[Agent 5: Publisher] attempting publish');
        const publishResult = publishDraft(draftPath, brief.slug, review);
        publishPath = path.join(runDir, 'publish-report.json');
        writeJson(publishPath, publishResult);
    }

    writeRunSummary(runDir, args, {
        researchPath: path.relative(ROOT_DIR, researchPath),
        briefPath: path.relative(ROOT_DIR, briefPath),
        draftPath: path.relative(ROOT_DIR, draftPath),
        reviewPath: path.relative(ROOT_DIR, reviewPath),
        reviewMdPath: path.relative(ROOT_DIR, reviewMdPath),
        publishPath: publishPath ? path.relative(ROOT_DIR, publishPath) : null
    });

    console.log('');
    console.log(`Pipeline completed: ${path.relative(ROOT_DIR, runDir)}`);
    console.log(`Review pass: ${review.pass ? 'YES' : 'NO'} | Score: ${review.score}/100 | Words: ${review.wordCount}`);
    if (args.publish) {
        console.log('Check publish-report.json for publish result.');
    }
}

main();
