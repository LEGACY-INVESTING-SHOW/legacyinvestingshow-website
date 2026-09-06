'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT_DIR, SITE_URL } = require('./paths');
const { writeText } = require('./fs');

function pickRepresentatives(catalog, scored) {
    const byClicks = (scored || [])
        .filter((page) => page.indexable && page.gsc && page.gsc.clicks > 0)
        .sort((a, b) => b.gsc.clicks - a.gsc.clicks);
    const hubs = (catalog.pages || []).filter((page) => (
        page.indexable && ['hub', 'tax-hub', 'home', 'topic', 'tax-strategy', 'tool', 'compare'].includes(page.pageType)
    ));
    const seen = new Set();
    const out = [];
    for (const page of [...byClicks, ...hubs]) {
        if (!page.path || seen.has(page.path)) continue;
        seen.add(page.path);
        out.push(page);
        if (out.length >= 24) break;
    }
    return out;
}

function buildLlmsMarkdown(catalog, scored) {
    const lines = [
        '# Legacy Investing Show',
        '',
        '> Tax strategy, wealth-building systems, and decision tools from Preston Seo.',
        '',
        'This file is regenerated from the BlogEO catalog. Do not hand-edit the resource list.',
        '',
        '## Representative resources',
        '',
    ];
    for (const page of pickRepresentatives(catalog, scored)) {
        const url = page.url || `${SITE_URL}${page.path}`;
        lines.push(`- [${page.title || page.path}](${url})`);
    }
    lines.push(
        '',
        '## Citation format',
        '',
        'Legacy Investing Show. "[Title]." legacyinvestingshow.com, [Date], [URL]',
        ''
    );
    return lines.join('\n');
}

function generatedSection(catalog, scored) {
    const lines = [
        '<!-- blogeo-resources:start -->',
        '## Catalog representatives (generated)',
        '',
        'Regenerated from the BlogEO catalog. Hand-edit the intro above this marker, not this list.',
        '',
    ];
    for (const page of pickRepresentatives(catalog, scored)) {
        const url = page.url || `${SITE_URL}${page.path}`;
        lines.push(`- [${page.title || page.path}](${url})`);
    }
    lines.push('', '<!-- blogeo-resources:end -->');
    return lines.join('\n');
}

function writeLlmsTxt(catalog, scored, root = ROOT_DIR) {
    const section = generatedSection(catalog, scored);
    const outPath = path.join(root, 'llms.txt');
    if (fs.existsSync(outPath)) {
        const existing = fs.readFileSync(outPath, 'utf8');
        if (existing.includes('<!-- blogeo-resources:start -->')) {
            const injected = existing.replace(
                /<!-- blogeo-resources:start -->[\s\S]*?<!-- blogeo-resources:end -->/,
                section
            );
            writeText(outPath, injected);
            return { outPath, markdown: injected };
        }
        const anchor = existing.includes('## Citation Format')
            ? '## Citation Format'
            : (existing.includes('## Positioning Notes') ? '## Positioning Notes' : null);
        if (anchor) {
            const injected = existing.replace(anchor, `${section}\n\n${anchor}`);
            writeText(outPath, injected);
            return { outPath, markdown: injected };
        }
        writeText(outPath, `${existing.trim()}\n\n${section}\n`);
        return { outPath, markdown: `${existing.trim()}\n\n${section}\n` };
    }
    const markdown = buildLlmsMarkdown(catalog, scored);
    writeText(outPath, markdown);
    return { outPath, markdown };
}

module.exports = { pickRepresentatives, buildLlmsMarkdown, writeLlmsTxt };
