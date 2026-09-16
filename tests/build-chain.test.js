const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const tailwind = require('../tailwind.config.js');

test('production build ships blog HTML from the markdown generator, not Eleventy', () => {
    assert.match(pkg.scripts.build, /build:blog/);
    assert.doesNotMatch(pkg.scripts.build, /cms:verify/);
    assert.doesNotMatch(pkg.scripts.build, /cms:publish/);
    assert.ok(pkg.scripts['cms:verify'], 'cms:verify stays available as an optional check');
    assert.ok(
        pkg.scripts.build.trimEnd().endsWith('npm run build:assets'),
        'build:assets must still run last'
    );
});

test('production dependencies do not include unused install-time bulk', () => {
    const deps = Object.keys(pkg.dependencies || {});
    assert.ok(!deps.includes('@playwright/test'));
    assert.ok(!deps.includes('axios'));
    assert.ok(!deps.includes('dotenv'));
    assert.ok(deps.includes('sharp'));
    assert.ok(deps.includes('marked'));
    assert.ok(deps.includes('gray-matter'));
});

test('Tailwind does not scan generated blog HTML', () => {
    const content = tailwind.content || [];
    assert.ok(content.includes('./templates/**/*.html'));
    assert.ok(content.includes('./scripts/**/*.js'));
    assert.ok(!content.includes('./blog/**/*.html'));
    assert.ok(!content.includes('./blog/page/*.html'));
});

test('vercelignore does not strip files the production build reads', () => {
    const ignorePath = path.join(ROOT, '.vercelignore');
    assert.ok(fs.existsSync(ignorePath), '.vercelignore should exist');
    const lines = fs
        .readFileSync(ignorePath, 'utf8')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'));
    for (const required of ['scripts', 'content', 'data', 'templates', '*.md']) {
        assert.ok(
            !lines.includes(required),
            `.vercelignore must not ignore ${required}; Vercel omits ignored paths from the build file set`
        );
    }
});
