#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DEFAULT_BRIEFS = path.join(ROOT, 'analysis', 'opencode-batch', 'briefs.json');
const DEFAULT_OUT_DIR = path.join(ROOT, 'analysis', 'opencode-batch');
const DEFAULT_BASE_URL = process.env.OPENCODE_BASE_URL || 'http://127.0.0.1:4096';
const DEFAULT_AGENT = process.env.OPENCODE_AGENT || 'blog-writer';
const DEFAULT_MODEL = process.env.OPENCODE_MODEL || 'opencode-go/minimax-m2.5';
const DEFAULT_PARALLEL = Number(process.env.OPENCODE_PARALLEL || '10');

function parseArgs(argv) {
    const args = {
        briefs: DEFAULT_BRIEFS,
        outDir: DEFAULT_OUT_DIR,
        parallel: DEFAULT_PARALLEL,
        baseUrl: DEFAULT_BASE_URL,
        agent: DEFAULT_AGENT,
        model: DEFAULT_MODEL,
        codexModel: process.env.CODEX_MANAGER_MODEL || '',
        skipCodexReview: false,
        writeExample: false
    };

    for (let i = 2; i < argv.length; i += 1) {
        const token = argv[i];

        if (token === '--briefs') args.briefs = path.resolve(argv[++i]);
        else if (token === '--out-dir') args.outDir = path.resolve(argv[++i]);
        else if (token === '--parallel') args.parallel = Number(argv[++i]) || args.parallel;
        else if (token === '--base-url') args.baseUrl = argv[++i];
        else if (token === '--agent') args.agent = argv[++i];
        else if (token === '--model') args.model = argv[++i];
        else if (token === '--codex-model') args.codexModel = argv[++i];
        else if (token === '--skip-codex-review') args.skipCodexReview = true;
        else if (token === '--write-example') args.writeExample = true;
        else if (token === '--help' || token === '-h') {
            printHelp();
            process.exit(0);
        }
        else {
            throw new Error(`Unknown argument: ${token}`);
        }
    }

    if (!Number.isFinite(args.parallel) || args.parallel < 1) {
        throw new Error('--parallel must be a positive integer.');
    }

    return args;
}

function printHelp() {
    console.log(`
Usage:
  node scripts/run-opencode-blog-batch.js --briefs analysis/opencode-batch/briefs.json

Options:
  --briefs <file>           JSON array of blog briefs.
  --out-dir <dir>           Output directory. Default: analysis/opencode-batch
  --parallel <n>            Concurrent OpenCode workers. Default: 10
  --base-url <url>          OpenCode server URL. Default: http://127.0.0.1:4096
  --agent <name>            OpenCode agent. Default: blog-writer
  --model <provider/model>  OpenCode model. Default: opencode-go/minimax-m2.5
  --codex-model <model>     Optional Codex manager model override.
  --skip-codex-review       Only generate drafts; skip the Codex manager pass.
  --write-example           Write a sample briefs file to the --briefs path and exit.

Expected brief shape:
  [
    {
      "title": "How to Reduce Airbnb Cleaning Turnover Issues",
      "primary_keyword": "airbnb cleaning checklist",
      "audience": "Airbnb hosts scaling to multiple units",
      "goal": "Generate leads for a training program",
      "angle": "Operational fixes that reduce bad reviews",
      "notes": "Keep it practical and avoid invented stats."
    }
  ]
`.trim());
}

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function writeJson(filePath, value) {
    fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function slugify(input) {
    return String(input || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 80) || 'untitled';
}

function splitModel(value) {
    const pieces = String(value || '').split('/');
    if (pieces.length !== 2 || !pieces[0] || !pieces[1]) {
        throw new Error(`Invalid model "${value}". Expected provider/model.`);
    }

    return { providerID: pieces[0], modelID: pieces[1] };
}

function extractText(parts) {
    if (!Array.isArray(parts)) return '';

    const chunks = [];

    for (const part of parts) {
        if (!part || typeof part !== 'object') continue;

        if (typeof part.text === 'string') {
            chunks.push(part.text);
            continue;
        }

        if (typeof part.content === 'string') {
            chunks.push(part.content);
            continue;
        }

        if (Array.isArray(part.content)) {
            for (const item of part.content) {
                if (item && typeof item.text === 'string') {
                    chunks.push(item.text);
                }
            }
        }
    }

    return chunks.join('\n\n').trim();
}

async function api(baseUrl, pathname, method, body) {
    const response = await fetch(`${baseUrl}${pathname}`, {
        method,
        headers: {
            'content-type': 'application/json'
        },
        body: body === undefined ? undefined : JSON.stringify(body)
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`${method} ${pathname} failed with ${response.status} ${response.statusText}\n${text}`);
    }

    if (response.status === 204) return null;

    return response.json();
}

function buildWorkerPrompt(brief, index, total) {
    const sections = [
        `Draft number: ${index + 1} of ${total}`,
        `Working title: ${brief.title}`,
        brief.primary_keyword ? `Primary keyword: ${brief.primary_keyword}` : '',
        brief.audience ? `Audience: ${brief.audience}` : '',
        brief.goal ? `Goal: ${brief.goal}` : '',
        brief.angle ? `Angle: ${brief.angle}` : '',
        brief.notes ? `Notes:\n${brief.notes}` : '',
        'Write one complete publish-ready blog post in markdown.',
        'Return final markdown only.'
    ];

    return sections.filter(Boolean).join('\n\n');
}

async function generateDraft(options, draftDir, rawDir, brief, index, total) {
    const title = String(brief.title || `Draft ${index + 1}`).trim();
    const slug = `${String(index + 1).padStart(2, '0')}-${slugify(title)}`;
    const session = await api(options.baseUrl, '/session', 'POST', { title });
    const message = await api(options.baseUrl, `/session/${session.id}/message`, 'POST', {
        agent: options.agent,
        model: splitModel(options.model),
        parts: [
            {
                type: 'text',
                text: buildWorkerPrompt(brief, index, total)
            }
        ]
    });

    const markdown = extractText(message.parts);
    const draftPath = path.join(draftDir, `${slug}.md`);
    const rawPath = path.join(rawDir, `${slug}.json`);

    if (!markdown) {
        writeJson(rawPath, message);
        throw new Error(`No markdown extracted for "${title}". Raw response: ${rawPath}`);
    }

    fs.writeFileSync(draftPath, `${markdown.trim()}\n`, 'utf8');

    return {
        index: index + 1,
        title,
        slug,
        sessionID: session.id,
        draftFile: path.relative(ROOT, draftPath),
        brief
    };
}

async function runPool(items, limit, worker) {
    const results = new Array(items.length);
    let cursor = 0;

    async function runner() {
        while (true) {
            const current = cursor;
            cursor += 1;

            if (current >= items.length) {
                return;
            }

            results[current] = await worker(items[current], current);
            process.stdout.write(`finished ${current + 1}/${items.length}: ${results[current].slug}\n`);
        }
    }

    const workers = [];

    for (let i = 0; i < Math.min(limit, items.length); i += 1) {
        workers.push(runner());
    }

    await Promise.all(workers);
    return results;
}

function buildManagerPrompt(manifestPath, reviewDir, finalDir) {
    return [
        'You are the Codex manager and reviewer for a blog generation batch.',
        '',
        `Read the batch manifest at ${manifestPath}.`,
        'Read every draft file listed in that manifest.',
        '',
        'Create these files:',
        `- ${path.join(reviewDir, 'ranking.md')}`,
        `- ${path.join(reviewDir, 'scores.json')}`,
        `- ${path.join(finalDir, '01-best.md')}`,
        `- ${path.join(finalDir, '02-second.md')}`,
        `- ${path.join(finalDir, '03-third.md')}`,
        `- ${path.join(finalDir, 'index.md')}`,
        '',
        'Requirements:',
        '- Rank every draft best to worst.',
        '- Score each draft from 1-10 for hook, clarity, seo_fit, originality, coherence, usefulness, and CTA.',
        '- Pick the best 3 drafts and rewrite them into tighter publish-ready versions.',
        '- Do not browse the web.',
        '- Do not invent citations, quotes, laws, or statistics.',
        '- Work only with files in this repository.',
        '- Preserve the strongest ideas and improve clarity, structure, and reader momentum.'
    ].join('\n');
}

function runCodexReview(options, manifestPath, reviewDir, finalDir) {
    const summaryPath = path.join(finalDir, 'manager-summary.md');
    const prompt = buildManagerPrompt(
        path.relative(ROOT, manifestPath),
        path.relative(ROOT, reviewDir),
        path.relative(ROOT, finalDir)
    );
    const args = [
        'exec',
        '--cd',
        ROOT,
        '--full-auto',
        '--output-last-message',
        summaryPath
    ];

    if (options.codexModel) {
        args.push('--model', options.codexModel);
    }

    args.push(prompt);

    const result = spawnSync('codex', args, {
        cwd: ROOT,
        stdio: 'inherit',
        encoding: 'utf8'
    });

    if (result.status !== 0) {
        throw new Error(`codex exec failed with exit code ${result.status}`);
    }
}

function getExampleBriefs() {
    return [
        {
            title: 'How to Reduce Airbnb Cleaning Turnover Issues Without Lowering Standards',
            primary_keyword: 'airbnb cleaning checklist',
            audience: 'Airbnb hosts managing multiple short-term rentals',
            goal: 'Generate leads for a hospitality operations offer',
            angle: 'Operational fixes that reduce complaints and guest friction',
            notes: 'Keep the advice practical. Avoid invented metrics.'
        },
        {
            title: 'What High-Income W-2 Professionals Miss About Short-Term Rental Tax Strategy',
            primary_keyword: 'short term rental tax strategy',
            audience: 'High-income W-2 earners exploring real-estate tax offsets',
            goal: 'Drive webinar registrations',
            angle: 'Educational overview with plain-English framing',
            notes: 'Do not present tax advice as personalized guidance.'
        }
    ];
}

async function main() {
    const options = parseArgs(process.argv);

    if (options.writeExample) {
        ensureDir(path.dirname(options.briefs));
        writeJson(options.briefs, getExampleBriefs());
        process.stdout.write(`Wrote example briefs to ${options.briefs}\n`);
        return;
    }

    const outputRoot = path.resolve(options.outDir);
    const draftDir = path.join(outputRoot, 'drafts');
    const rawDir = path.join(outputRoot, 'raw');
    const reviewDir = path.join(outputRoot, 'review');
    const finalDir = path.join(outputRoot, 'final');
    const manifestPath = path.join(reviewDir, 'manifest.json');
    const health = await api(options.baseUrl, '/global/health', 'GET');

    if (!health || health.healthy !== true) {
        throw new Error(`OpenCode server at ${options.baseUrl} is not healthy.`);
    }

    ensureDir(outputRoot);
    ensureDir(draftDir);
    ensureDir(rawDir);
    ensureDir(reviewDir);
    ensureDir(finalDir);

    if (!fs.existsSync(options.briefs)) {
        throw new Error(`Briefs file not found: ${options.briefs}`);
    }

    const briefs = readJson(options.briefs);

    if (!Array.isArray(briefs) || briefs.length === 0) {
        throw new Error('Briefs file must contain a non-empty JSON array.');
    }

    const manifest = await runPool(
        briefs,
        options.parallel,
        (brief, index) => generateDraft(options, draftDir, rawDir, brief, index, briefs.length)
    );

    writeJson(manifestPath, manifest);
    process.stdout.write(`saved manifest: ${manifestPath}\n`);

    if (options.skipCodexReview) {
        process.stdout.write('skipped Codex review step.\n');
        return;
    }

    runCodexReview(options, manifestPath, reviewDir, finalDir);
    process.stdout.write(`manager outputs saved under ${finalDir}\n`);
}

main().catch((error) => {
    process.stderr.write(`\nBatch failed:\n${error.stack || error.message}\n`);
    process.exit(1);
});
