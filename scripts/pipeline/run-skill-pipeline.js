#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { spawnSync } = require('child_process');
const { searchWeb } = require('./lib/search-client');
const { runLLM } = require('./lib/llm-client');
const { writePublishBlockedTicket } = require('../blogeo/lib/pipeline-handoff');

const ROOT_DIR = path.join(__dirname, '..', '..');
const PIPELINE_DIR = path.join(ROOT_DIR, 'pipeline');
const SKILLS_DIR = path.join(PIPELINE_DIR, 'skills');
const RUNS_DIR = path.join(PIPELINE_DIR, 'runs');
const CONTENT_DIR = path.join(ROOT_DIR, 'content', 'blog');

function parseArgs(argv) {
    const args = {
        topicCount: 200,
        maxSearchQueries: 12,
        searchResultsPerQuery: 6,
        provider: process.env.PIPELINE_LLM_PROVIDER || 'openai',
        searchProvider: process.env.SEARCH_PROVIDER || 'tavily'
    };

    for (let i = 2; i < argv.length; i++) {
        const t = argv[i];

        if (t === '--topic') args.topic = argv[++i];
        else if (t === '--seeds-file') args.seedsFile = argv[++i];
        else if (t === '--persona') args.persona = argv[++i];
        else if (t === '--topic-count') args.topicCount = Number(argv[++i]) || 200;
        else if (t === '--max-search-queries') args.maxSearchQueries = Number(argv[++i]) || 12;
        else if (t === '--search-results-per-query') args.searchResultsPerQuery = Number(argv[++i]) || 6;
        else if (t === '--provider') args.provider = argv[++i];
        else if (t === '--search-provider') args.searchProvider = argv[++i];
        else if (t === '--model') args.model = argv[++i];
        else if (t === '--publish') args.publish = true;
        else if (t === '--dry-run') args.dryRun = true;
    }

    return args;
}

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readText(filePath) {
    return fs.readFileSync(filePath, 'utf8');
}

function writeText(filePath, text) {
    fs.writeFileSync(filePath, text, 'utf8');
}

function writeJson(filePath, obj) {
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function nowStamp() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

function slugify(input) {
    return String(input || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 80);
}

function loadSeeds(args) {
    if (args.seedsFile) {
        const full = path.isAbsolute(args.seedsFile)
            ? args.seedsFile
            : path.join(ROOT_DIR, args.seedsFile);

        if (!fs.existsSync(full)) {
            throw new Error(`Seeds file not found: ${full}`);
        }

        const rows = readText(full).split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
        if (rows.length === 0) throw new Error('Seeds file has no usable rows.');
        return rows;
    }

    if (args.topic) return [args.topic];

    throw new Error('Provide --topic or --seeds-file.');
}

function loadSkillDocs(skillName) {
    const skillDir = path.join(SKILLS_DIR, skillName);
    const skillDoc = readText(path.join(skillDir, 'SKILL.md'));
    const promptTemplate = readText(path.join(skillDir, 'references', 'prompt-template.md'));
    return { skillDoc, promptTemplate, skillDir };
}

function buildIdeationQueries(seeds) {
    const suffixes = [
        '2026',
        'how to',
        'mistakes',
        'vs alternatives',
        'for beginners',
        'case study',
        'faq',
        'reddit',
        'youtube'
    ];

    const queries = [];
    for (const seed of seeds) {
        for (const suffix of suffixes) {
            queries.push(`${seed} ${suffix}`.trim());
        }
    }

    return [...new Set(queries)];
}

function buildTopicQueries(topic) {
    return [
        `${topic} 2026`,
        `how to ${topic}`,
        `${topic} mistakes`,
        `${topic} faq`,
        `${topic} case study`,
        `${topic} reddit`,
        `${topic} site:youtube.com`
    ];
}

async function collectWebEvidence(queries, args) {
    const selected = queries.slice(0, args.maxSearchQueries);
    const all = [];

    for (const query of selected) {
        const rows = await searchWeb(query, {
            provider: args.searchProvider,
            dryRun: args.dryRun,
            maxResults: args.searchResultsPerQuery
        });

        all.push({ query, results: rows });
    }

    return all;
}

function dedupeResults(collection) {
    const map = new Map();

    for (const bucket of collection) {
        for (const row of bucket.results || []) {
            if (!row.url) continue;
            if (!map.has(row.url)) {
                map.set(row.url, {
                    title: row.title || '',
                    url: row.url,
                    snippet: row.snippet || '',
                    source: row.source || 'unknown'
                });
            }
        }
    }

    return [...map.values()];
}

function toEvidenceMarkdown(collection) {
    let out = '## Web Search Evidence\n\n';

    for (const bucket of collection) {
        out += `### Query: ${bucket.query}\n`;
        for (const row of (bucket.results || []).slice(0, 6)) {
            out += `- [${row.title || 'Untitled'}](${row.url || '#'})\n`;
            if (row.snippet) out += `  - ${row.snippet}\n`;
        }
        out += '\n';
    }

    return out;
}

async function runSkill(skillName, context, args) {
    const { skillDoc, promptTemplate } = loadSkillDocs(skillName);

    const prompt = [
        'Use the following skill instructions and execute the task.',
        '',
        '--- SKILL ---',
        skillDoc,
        '',
        '--- PROMPT TEMPLATE ---',
        promptTemplate,
        '',
        '--- TASK CONTEXT ---',
        context
    ].join('\n');

    return runLLM(prompt, {
        provider: args.provider,
        model: args.model,
        dryRun: args.dryRun,
        skill: skillName,
        temperature: 0.2
    });
}

function pickTopic(ideationText, fallback) {
    if (fallback) return fallback;

    const lines = ideationText.split(/\r?\n/).map((l) => l.trim());

    for (const line of lines) {
        if (/^\d+\./.test(line)) {
            return line.replace(/^\d+\.\s*/, '').replace(/\*\*/g, '').trim();
        }
    }

    for (const line of lines) {
        if (line.startsWith('- ')) return line.replace(/^-\s*/, '').trim();
    }

    return 'legacy investing topic opportunity';
}

function parseReviewVerdict(text) {
    const upper = text.toUpperCase();
    if (upper.includes('VERDICT: FAIL') || /^FAIL$/m.test(upper) || upper.includes('\nFAIL\n')) return 'FAIL';
    if (upper.includes('VERDICT: PASS') || /^PASS$/m.test(upper) || upper.includes('\nPASS\n')) return 'PASS';
    return 'FAIL';
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

function publishDraft(runDir, draftPath, reviewVerdict, args) {
    const report = {
        attempted: args.publish || false,
        verdict: reviewVerdict,
        published: false,
        reason: '',
        target: null,
        build: [],
        reverted: false
    };

    if (!args.publish) {
        report.reason = 'Publish not requested.';
        return report;
    }

    if (process.env.BLOGEO_ALLOW_DIRECT_PUBLISH !== '1') {
        const parsedDraft = matter(readText(draftPath));
        const blockedSlug = parsedDraft.data.slug || slugify(parsedDraft.data.title || path.basename(draftPath, '.md'));
        const ticket = writePublishBlockedTicket({
            draftPath,
            slug: blockedSlug,
            query: parsedDraft.data.seo && parsedDraft.data.seo.primaryKeyword,
            reason: 'Pipeline --publish was blocked. Human copies the draft after review.',
        }, ROOT_DIR);
        report.ticketId = ticket.id;
        report.reason = `Direct publish is disabled. Wrote suggestion ${ticket.id}. Production writes go through \`node scripts/blogeo/cli.js apply --ticket <id>\`. Set BLOGEO_ALLOW_DIRECT_PUBLISH=1 only for an emergency publisher override.`;
        return report;
    }

    if (reviewVerdict !== 'PASS') {
        report.reason = 'Review verdict is not PASS.';
        return report;
    }

    const parsed = matter(readText(draftPath));
    const slug = parsed.data.slug || slugify(parsed.data.title || path.basename(draftPath, '.md'));
    const target = path.join(CONTENT_DIR, `${slug}.md`);
    report.target = target;

    if (args.dryRun) {
        report.published = false;
        report.reason = 'Dry run enabled. Copy/build skipped.';
        return report;
    }

    if (fs.existsSync(target)) {
        report.reason = `Target file already exists: ${target}`;
        return report;
    }

    fs.copyFileSync(draftPath, target);
    report.reason = 'Draft copied to content/blog. Running publish gates.';

    const buildBlog = runBuild('npm run build:blog');
    const buildSitemap = runBuild('npm run build:sitemap');
    const cmsVerify = runBuild('npm run cms:verify');
    report.build.push(buildBlog, buildSitemap, cmsVerify);

    const failed = report.build.filter((step) => step.exitCode !== 0);
    if (failed.length > 0) {
        if (fs.existsSync(target)) {
            fs.unlinkSync(target);
            report.reverted = true;
        }

        const failedCommands = failed.map((step) => step.command).join(', ');
        report.reason = `Publish gates failed: ${failedCommands}. Draft copy reverted.`;
        report.published = false;
        return report;
    }

    report.published = true;
    report.reason = 'Draft copied and publish gates passed.';

    return report;
}

function printStatus(step, msg) {
    console.log(`[${step}] ${msg}`);
}

async function main() {
    const args = parseArgs(process.argv);
    const seeds = loadSeeds(args);

    ensureDir(RUNS_DIR);

    const runId = `${nowStamp()}-${slugify(args.topic || seeds[0])}`;
    const runDir = path.join(RUNS_DIR, runId);
    ensureDir(runDir);

    printStatus('ideation', 'collecting web evidence');
    const ideationQueries = buildIdeationQueries(seeds);
    const ideationEvidence = await collectWebEvidence(ideationQueries, args);
    writeJson(path.join(runDir, '01-ideation-search.json'), ideationEvidence);

    const ideationContext = [
        `Target topic count: ${args.topicCount}`,
        `Persona: ${args.persona || 'not specified'}`,
        `Seeds: ${seeds.join(', ')}`,
        '',
        toEvidenceMarkdown(ideationEvidence)
    ].join('\n');

    printStatus('ideation', 'running legacy-ideation-engine');
    const ideationOutput = await runSkill('legacy-ideation-engine', ideationContext, args);
    writeText(path.join(runDir, '01-ideation.md'), ideationOutput);

    const selectedTopic = pickTopic(ideationOutput, args.topic);

    printStatus('research', `selected topic: ${selectedTopic}`);
    const topicEvidence = await collectWebEvidence(buildTopicQueries(selectedTopic), args);
    writeJson(path.join(runDir, '02-research-search.json'), topicEvidence);

    const researchContext = [
        `Topic: ${selectedTopic}`,
        `Persona: ${args.persona || 'not specified'}`,
        '',
        toEvidenceMarkdown(topicEvidence)
    ].join('\n');

    const researchOutput = await runSkill('legacy-topic-researcher', researchContext, args);
    writeText(path.join(runDir, '02-research.md'), researchOutput);

    printStatus('brief', 'running legacy-brief-architect');
    const briefOutput = await runSkill('legacy-brief-architect', researchOutput, args);
    writeText(path.join(runDir, '03-brief.md'), briefOutput);

    printStatus('writer', 'running legacy-longform-writer');
    const draftOutput = await runSkill('legacy-longform-writer', briefOutput, args);
    const draftPath = path.join(runDir, '04-draft.md');
    writeText(draftPath, draftOutput);

    printStatus('review', 'running legacy-seo-aeo-reviewer');
    const reviewOutput = await runSkill(
        'legacy-seo-aeo-reviewer',
        ['BRIEF:', briefOutput, '', 'DRAFT:', draftOutput].join('\n'),
        args
    );
    writeText(path.join(runDir, '05-review.md'), reviewOutput);

    const verdict = parseReviewVerdict(reviewOutput);
    const publishReport = publishDraft(runDir, draftPath, verdict, args);
    writeJson(path.join(runDir, '06-publish-report.json'), publishReport);

    const summary = [
        '# Skill Pipeline Summary',
        '',
        `- Run ID: ${runId}`,
        `- LLM Provider: ${args.provider}`,
        `- Search Provider: ${args.searchProvider}`,
        `- Dry Run: ${args.dryRun ? 'yes' : 'no'}`,
        `- Selected Topic: ${selectedTopic}`,
        `- Review Verdict: ${verdict}`,
        `- Publish Requested: ${args.publish ? 'yes' : 'no'}`,
        `- Publish Result: ${publishReport.published ? 'published' : 'not published'}`,
        '',
        '## Artifacts',
        '- 01-ideation-search.json',
        '- 01-ideation.md',
        '- 02-research-search.json',
        '- 02-research.md',
        '- 03-brief.md',
        '- 04-draft.md',
        '- 05-review.md',
        '- 06-publish-report.json'
    ].join('\n');

    writeText(path.join(runDir, 'RUN-SUMMARY.md'), summary + '\n');

    console.log('');
    console.log(`Pipeline complete: pipeline/runs/${runId}`);
    console.log(`Topic: ${selectedTopic}`);
    console.log(`Review verdict: ${verdict}`);
    console.log(`Publish: ${publishReport.published ? 'DONE' : publishReport.reason}`);
}

main().catch((error) => {
    console.error('Pipeline failed:', error.message);
    process.exit(1);
});
