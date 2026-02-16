const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildDescription,
    flattenTopics,
    generatePosts
} = require('../scripts/generate-seo-blog-markdown');

const topicsData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'seo-topics-100.json'), 'utf-8'));

test('flattenTopics returns all 100 topics', () => {
    const topics = flattenTopics(topicsData);
    assert.equal(topics.length, 100);
});

test('buildDescription stays within 160 characters', () => {
    const topic = {
        primary_keyword: 'extremely long keyword phrase for deterministic SEO checks'
    };
    const description = buildDescription(topic);
    assert.ok(description.length <= 160);
});

test('generatePosts creates markdown files for each topic', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-posts-test-'));
    const result = generatePosts({
        topicsPath: path.join(__dirname, '..', 'data', 'seo-topics-100.json'),
        outputDir: tempDir,
        overwrite: true
    });

    assert.equal(result.totalTopics, 100);
    assert.equal(result.created, 100);
    assert.equal(result.skipped, 0);

    const files = fs.readdirSync(tempDir).filter((file) => file.endsWith('.md'));
    assert.equal(files.length, 100);

    const sample = fs.readFileSync(path.join(tempDir, files[0]), 'utf-8');
    assert.match(sample, /^---\n/);
    assert.match(sample, /title:/);
    assert.match(sample, /description:/);
    assert.match(sample, /## FAQ/);
});
