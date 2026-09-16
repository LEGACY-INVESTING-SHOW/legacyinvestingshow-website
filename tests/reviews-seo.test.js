const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');

function read(relative) {
    return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

// --- data/reviews-videos.json --------------------------------------------

test('every published client interview has a record with a summary and quotes', () => {
    const records = JSON.parse(read('data/reviews-videos.json'));

    assert.equal(records.length, 19, '19 videos are published on /reviews');

    const ids = new Set();
    for (const record of records) {
        assert.ok(!ids.has(record.id), `duplicate video id: ${record.id}`);
        ids.add(record.id);

        assert.ok(['youtube', 'vimeo'].includes(record.provider), `bad provider on ${record.id}`);
        assert.ok(record.summary && record.summary.trim().length > 60, `thin summary on ${record.id}`);
        assert.ok(
            Array.isArray(record.keyQuotes) && record.keyQuotes.length >= 2 && record.keyQuotes.length <= 4,
            `${record.id} must carry 2 to 4 key quotes, has ${record.keyQuotes && record.keyQuotes.length}`
        );
        for (const quote of record.keyQuotes) {
            assert.ok(quote.trim().length > 0, `empty quote on ${record.id}`);
        }

        // Nothing is invented: a transcript stays null until one is fetched off
        // a real caption track, and one that is present has to say where it
        // came from and when. An upload date is only present where a real one
        // was found in the repo.
        if (record.transcript === null) {
            assert.equal(record.transcriptSource, undefined, `${record.id} has a source but no transcript`);
        } else {
            const text = Array.isArray(record.transcript) ? record.transcript.join(' ') : record.transcript;
            assert.ok(typeof text === 'string' && text.trim().length > 0, `empty transcript on ${record.id}`);
            assert.ok(record.transcriptSource, `${record.id} must record where its transcript came from`);
            assert.match(record.transcriptFetchedAt || '', /^\d{4}-\d{2}-\d{2}T/, `bad transcriptFetchedAt on ${record.id}`);
        }
        if (record.uploadDate !== null) {
            assert.match(record.uploadDate, /^\d{4}-\d{2}-\d{2}$/, `bad uploadDate on ${record.id}`);
        }
        assert.ok(
            record.postUrl.startsWith('https://www.legacyinvestingshow.com/blog/'),
            `postUrl must be absolute on ${record.id}`
        );
    }
});

// --- sitemap-video.xml ----------------------------------------------------

test('sitemap-video.xml carries one entry per video under the reviews page', () => {
    const xml = read('sitemap-video.xml');

    assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    assert.match(xml, /xmlns:video="http:\/\/www\.google\.com\/schemas\/sitemap-video\/1\.1"/);

    const videos = xml.match(/<video:video>/g) || [];
    assert.equal(videos.length, 19, '19 <video:video> entries');
    assert.equal((xml.match(/<\/video:video>/g) || []).length, 19, 'every entry is closed');

    const locations = xml.match(/<loc>[^<]*<\/loc>/g) || [];
    assert.deepEqual(locations, ['<loc>https://www.legacyinvestingshow.com/reviews</loc>'],
        'one host page, with every video nested inside it');

    for (const title of xml.match(/<video:title>([\s\S]*?)<\/video:title>/g) || []) {
        const text = title.replace(/<[^>]+>/g, '');
        assert.ok(text.length > 0 && text.length <= 100, `title out of range: ${text}`);
    }

    for (const duration of xml.match(/<video:duration>(\d+)<\/video:duration>/g) || []) {
        const seconds = Number(duration.replace(/\D/g, ''));
        assert.ok(seconds >= 1 && seconds <= 28800, `duration out of range: ${seconds}`);
    }

    // The index has to point at it or nothing fetches it.
    assert.match(read('sitemap.xml'), /sitemap-video\.xml/);
});

// --- llms/reviews.txt -----------------------------------------------------

test('the plain-text mirror of the reviews page is published and complete', () => {
    const text = read('llms/reviews.txt');

    assert.ok(text.includes('Legacy Wealth Blueprint client case studies'));
    assert.ok(text.includes('Text of this page'), 'image text is published and labelled');
    assert.ok(text.includes('Summary:'), 'video text is labelled a summary');
    // Only a fetched caption track may be called a transcript. While every
    // record holds transcript: null, the word must not appear at all.
    const videos = JSON.parse(read('data/reviews-videos.json'));
    if (videos.every((record) => record.transcript === null)) {
        assert.ok(!/transcript/i.test(text), 'nothing in the mirror may be called a transcript');
    }
    assert.ok(text.includes('https://www.trustpilot.com/review/firstairbnb.com'));

    // robots.txt must not block it, or no crawler ever reads it.
    const robots = read('robots.txt');
    assert.ok(!/^Disallow:\s*\/llms\//m.test(robots), 'robots.txt must not disallow /llms/');
    assert.ok(!/^Disallow:\s*\/\*\.txt\$/m.test(robots), 'robots.txt must not disallow .txt');
    assert.ok(robots.includes('/llms/reviews.txt'), 'robots.txt points at the mirror');
});

// --- the JSON-LD graph ----------------------------------------------------

test('the reviews schema builder emits 19 VideoObject nodes and no self-serving rating', () => {
    const target = path.join(os.tmpdir(), `reviews-schema-${process.pid}.html`);
    fs.writeFileSync(
        target,
        '<!DOCTYPE html>\n<html lang="en">\n<head>\n<!-- reviews:schema:start -->\n'
        + '<!-- reviews:schema:end -->\n</head>\n<body></body>\n</html>\n',
        'utf8'
    );

    try {
        execFileSync('node', [path.join(ROOT, 'scripts', 'build-reviews-schema.js'), '--file', target], {
            cwd: ROOT,
            encoding: 'utf8',
        });

        const html = fs.readFileSync(target, 'utf8');
        const block = html.match(
            /<!-- reviews:schema:start -->([\s\S]*?)<!-- reviews:schema:end -->/
        );
        assert.ok(block, 'the schema markers survive the write');

        const json = block[1].match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
        assert.ok(json, 'one ld+json script is written');

        const graph = JSON.parse(json[1]);
        assert.equal(graph['@context'], 'https://schema.org');

        const nodes = graph['@graph'];
        const videos = nodes.filter((node) => node['@type'] === 'VideoObject');
        assert.equal(videos.length, 19, 'exactly 19 VideoObject nodes');

        const serialized = JSON.stringify(graph);
        assert.ok(!/aggregateRating/i.test(serialized), 'no AggregateRating on the brand’s own page');
        assert.ok(!/"@type":"Review"/.test(serialized), 'no self-serving Review nodes');

        for (const node of videos) {
            assert.ok(node.name && node.description, `${node['@id']} needs a name and a description`);
            assert.match(node.thumbnailUrl, /^https:\/\//);
            assert.match(node.embedUrl, /^https:\/\/(player\.vimeo\.com|www\.youtube-nocookie\.com)\//);
            if ('transcript' in node) {
                assert.equal(typeof node.transcript, 'string', 'transcript takes Text');
                assert.ok(node.transcript.trim().length > 0, 'an empty transcript is worse than none');
            }
        }

        const types = new Set(nodes.map((node) => node['@type']));
        for (const expected of ['CollectionPage', 'BreadcrumbList', 'ItemList', 'FAQPage']) {
            assert.ok(types.has(expected), `the graph is missing ${expected}`);
        }

        // Running it twice must not change the page.
        const before = fs.readFileSync(target, 'utf8');
        execFileSync('node', [path.join(ROOT, 'scripts', 'build-reviews-schema.js'), '--file', target], {
            cwd: ROOT,
            encoding: 'utf8',
        });
        assert.equal(fs.readFileSync(target, 'utf8'), before, 'the builder is idempotent');
    } finally {
        fs.rmSync(target, { force: true });
    }
});

// --- transcript markers on the page ---------------------------------------

test('every video item carries a transcript marker that renders only real text', () => {
    const { fillTranscripts, videoTranscriptBlock } = require('../scripts/build-reviews-sections');
    const page = read('reviews.html');
    const records = JSON.parse(read('data/reviews-videos.json'));

    const ids = [...page.matchAll(/<!-- reviews:transcript:([A-Za-z0-9_-]+):start -->/g)].map((m) => m[1]);
    assert.equal(ids.length, records.length, 'one marker per video record');
    assert.deepEqual([...ids].sort(), records.map((r) => r.id).sort(), 'the markers name the 19 video ids');
    for (const id of ids) {
        assert.ok(page.includes(`<!-- reviews:transcript:${id}:end -->`), `${id} has no closing marker`);
    }

    // A record with no transcript leaves its block empty, so the page never
    // shows the word "Transcript" for a video that has none.
    for (const record of records.filter((r) => !r.transcript)) {
        const block = page.match(
            new RegExp(`<!-- reviews:transcript:${record.id}:start -->([\\s\\S]*?)<!-- reviews:transcript:${record.id}:end -->`)
        );
        assert.ok(block, `${record.id} block not found`);
        assert.equal(block[1].trim(), '', `${record.id} renders text it does not have`);
    }

    assert.equal(videoTranscriptBlock(null, '    '), '', 'no transcript renders nothing');

    // A record with one renders a closed disclosure with escaped paragraphs.
    const source = '    <!-- reviews:transcript:abc123:start -->\n    <!-- reviews:transcript:abc123:end -->';
    const filled = fillTranscripts(source, [{ id: 'abc123', transcript: 'One & two.\n\nThree <four>.' }]);
    assert.equal(filled.markers, 1);
    assert.equal(filled.filled, 1);
    assert.match(filled.html, /<details class="rv-text">/);
    assert.match(filled.html, /<summary>Transcript<\/summary>/);
    assert.match(filled.html, /<p>One &amp; two\.<\/p>/);
    assert.match(filled.html, /<p>Three &lt;four&gt;\.<\/p>/);

    // Filling an already filled block must not double it up.
    assert.equal(
        fillTranscripts(filled.html, [{ id: 'abc123', transcript: 'One & two.\n\nThree <four>.' }]).html,
        filled.html,
        'the transcript fill is idempotent'
    );
});

// --- sitemap-images.xml ---------------------------------------------------

test('the image sitemap lists every local image on the reviews page and nothing else', () => {
    const { collectImages } = require('../scripts/generate-image-sitemap');
    const xml = read('sitemap-images.xml');

    assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    assert.match(xml, /xmlns:image="http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1"/);
    assert.deepEqual(
        xml.match(/<loc>[^<]*<\/loc>/g),
        ['<loc>https://www.legacyinvestingshow.com/reviews</loc>'],
        'one host page, every image nested inside it'
    );

    const expected = collectImages(read('reviews.html'));
    const locations = [...xml.matchAll(/<image:loc>([^<]+)<\/image:loc>/g)].map((m) => m[1]);
    assert.equal(locations.length, expected.length, 'one entry per local image');
    assert.ok(locations.length > 100, 'the proof images are all there');

    for (const location of locations) {
        assert.match(location, /^https:\/\/www\.legacyinvestingshow\.com\//, `not absolute: ${location}`);
        // A sitemap may only list images on a host the site is verified for,
        // so the 15 YouTube posters on i.ytimg.com must stay out.
        assert.ok(!location.includes('ytimg.com'), `off-site image listed: ${location}`);
        const onDisk = path.join(ROOT, location.replace('https://www.legacyinvestingshow.com/', ''));
        assert.ok(fs.existsSync(onDisk), `image is not on disk: ${location}`);
    }

    assert.ok(new Set(locations).size === locations.length, 'no image is listed twice');
    assert.ok((xml.match(/<image:title>/g) || []).length > 0, 'alt text travels as image:title');

    // It has to be reachable, or nothing fetches it.
    assert.match(read('sitemap.xml'), /sitemap-images\.xml/);
    assert.match(read('robots.txt'), /^Sitemap: https:\/\/www\.legacyinvestingshow\.com\/sitemap-images\.xml$/m);
});

// --- robots.txt -----------------------------------------------------------

test('every AI crawler has its own group with the same rules as the default one', () => {
    const robots = read('robots.txt');

    // A named group replaces `User-agent: *` entirely for that agent, so each
    // one has to repeat the whole rule set rather than inherit it.
    const groups = robots
        .split(/\n(?=User-agent:)/)
        .filter((chunk) => chunk.startsWith('User-agent:'))
        .map((chunk) => {
            const lines = chunk.split('\n').map((line) => line.trim()).filter(Boolean);
            const agent = lines[0].slice('User-agent:'.length).trim();
            return {
                agent,
                rules: lines.slice(1).filter((line) => /^(Allow|Disallow):/.test(line)),
            };
        });

    const byAgent = new Map(groups.map((group) => [group.agent, group]));
    const fallback = byAgent.get('*');
    assert.ok(fallback, 'the default group is still there');
    assert.ok(fallback.rules.includes('Allow: /'));

    const BOTS = [
        'GPTBot', 'OAI-SearchBot', 'ClaudeBot', 'Claude-Web', 'anthropic-ai', 'PerplexityBot',
        'Google-Extended', 'Applebot-Extended', 'CCBot', 'Bytespider', 'Amazonbot',
        'meta-externalagent',
    ];

    for (const bot of BOTS) {
        const group = byAgent.get(bot);
        assert.ok(group, `robots.txt has no group for ${bot}`);
        assert.ok(group.rules.includes('Allow: /'), `${bot} is not allowed`);
        assert.deepEqual(group.rules, fallback.rules, `${bot} has drifted from the default group`);
    }

    // Nothing here may block the surfaces these agents are named for.
    for (const bot of BOTS.concat(['*'])) {
        for (const rule of byAgent.get(bot).rules) {
            assert.ok(!/^Disallow: \/(reviews|llms)/.test(rule), `${bot} is blocked from ${rule}`);
        }
    }
});

// --- what the SEO build wrote ---------------------------------------------

test('every JSON-LD block parses and every sitemap URL resolves', () => {
    const { run } = require('../scripts/check-seo-output');
    const result = run();
    assert.deepEqual(result.problems, []);
    assert.ok(result.blocks > 0, 'there is JSON-LD to check');
    assert.ok(result.urls > 100, 'the sitemaps are populated');
});

test('the reviews page keeps one H1, named proof, and contextual number headlines', () => {
    const page = read('reviews.html');

    assert.equal((page.match(/<h1\b/g) || []).length, 1, 'one H1');
    assert.ok(!page.includes('class="opener__key"'), 'the Trustpilot opener line is gone');
    assert.ok(!page.includes('Rated 4.2 on Trustpilot across 66 reviews. Everything below'),
        'the rating sentence is not the opener');
    assert.match(page, /class="opener__lede"/);
    assert.ok(!page.includes('class="rv-proof"'), 'opener chips are gone');
    assert.ok(!page.includes('Watch client case studies'), 'opener CTAs are gone');
    assert.match(page, /<ul class="rv-jump__list">/);
    assert.match(page, /\$20,000 in taxes saved/);
    assert.match(page, /\$90,000 in cash flow/);
    assert.match(page, /Stephanie Dailey/);
    assert.match(page, /66 reviews on Trustpilot/);
    assert.match(page, /application\/ld\+json/);
    assert.match(page, /"@type": "FAQPage"/);
    assert.match(page, /cssSelector": \[\s*"\.opener__lede"/);
});
