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

        // Nothing is invented: a transcript stays null and an upload date is
        // only present where a real one was found in the repo.
        assert.equal(record.transcript, null, `${record.id} must not claim a transcript`);
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
    assert.ok(!/transcript/i.test(text), 'nothing in the mirror may be called a transcript');
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
            assert.ok(!('transcript' in node), 'no transcript is claimed');
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
