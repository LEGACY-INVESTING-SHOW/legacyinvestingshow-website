'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'education-guides');

const ALLOWED_TYPES = new Set([
    'alternatives',
    'vs',
    'best-for',
    'review',
    'checklist',
    'decision',
]);

const REQUIRED_PAGE_FIELDS = [
    'type',
    'slug',
    'title',
    'h1',
    'keyLine',
    'description',
    'query',
    'answer',
    'blocks',
    'whoFits',
    'whoSkips',
    'costIntro',
    'costRows',
    'questionsBeforeBuying',
    'nextSteps',
    'faqs',
    'sources',
    'related',
    'cta',
];

function assertArray(value, label, filePath) {
    if (!Array.isArray(value) || value.length === 0) {
        throw new Error(`${label} must be a non-empty array in ${filePath}`);
    }
}

function validatePage(page, slug, filePath) {
    for (const field of REQUIRED_PAGE_FIELDS) {
        if (page[field] === undefined || page[field] === null || page[field] === '') {
            throw new Error(`Missing ${field} in ${filePath}`);
        }
    }
    if (page.slug !== slug) {
        throw new Error(`Slug mismatch in ${filePath}: expected ${slug}`);
    }
    if (!ALLOWED_TYPES.has(page.type)) {
        throw new Error(`Unknown type "${page.type}" in ${filePath}`);
    }
    assertArray(page.blocks, 'blocks', filePath);
    assertArray(page.whoFits, 'whoFits', filePath);
    assertArray(page.whoSkips, 'whoSkips', filePath);
    assertArray(page.costRows, 'costRows', filePath);
    assertArray(page.questionsBeforeBuying, 'questionsBeforeBuying', filePath);
    assertArray(page.nextSteps, 'nextSteps', filePath);
    assertArray(page.faqs, 'faqs', filePath);
    assertArray(page.sources, 'sources', filePath);
    assertArray(page.related, 'related', filePath);

    page.costRows.forEach((row, index) => {
        if (!row.name || !row.price || !row.asOf || !row.sourceLabel) {
            throw new Error(`Incomplete costRows[${index}] in ${filePath}`);
        }
    });
    page.faqs.forEach((item, index) => {
        if (!item.q || !item.a) {
            throw new Error(`Incomplete faqs[${index}] in ${filePath}`);
        }
    });
    page.sources.forEach((source, index) => {
        if (!source.label) {
            throw new Error(`Incomplete sources[${index}] in ${filePath}`);
        }
    });
    page.related.forEach((item, index) => {
        if (!item.href || !item.label) {
            throw new Error(`Incomplete related[${index}] in ${filePath}`);
        }
    });

    const cta = page.cta;
    if (!cta.title || !cta.body || !cta.primaryHref || !cta.primaryLabel || !cta.secondaryHref || !cta.secondaryLabel) {
        throw new Error(`Incomplete cta in ${filePath}`);
    }
}

function loadEducationGuides() {
    const indexPath = path.join(DATA_DIR, 'index.json');
    if (!fs.existsSync(indexPath)) {
        throw new Error(`Missing education guide index at ${indexPath}`);
    }
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    const slugs = index.slugs || [];
    if (!slugs.length) {
        throw new Error(`Education guide index has no slugs: ${indexPath}`);
    }
    const seen = new Set();
    const pages = slugs.map((slug) => {
        if (seen.has(slug)) {
            throw new Error(`Duplicate slug in education guide index: ${slug}`);
        }
        seen.add(slug);
        const filePath = path.join(DATA_DIR, `${slug}.json`);
        if (!fs.existsSync(filePath)) {
            throw new Error(`Missing education guide ${filePath}`);
        }
        const page = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        validatePage(page, slug, filePath);
        page.published = page.published || index.meta.published;
        page.updated = page.updated || index.meta.updated;
        return page;
    });
    return { meta: index.meta, pages };
}

module.exports = {
    DATA_DIR,
    ALLOWED_TYPES,
    REQUIRED_PAGE_FIELDS,
    loadEducationGuides,
    validatePage,
};
