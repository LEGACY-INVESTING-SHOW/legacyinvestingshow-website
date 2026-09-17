const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

// Tuition / SKU copy that must not appear on the public site. Client results,
// tax examples, insurance caps, and competitor prices are out of scope.
const FORBIDDEN = [
    'Programs run from $1,500 to $30,000',
    'The Legacy Wealth Blueprint is $9,800',
    'Legacy Wealth Blueprint is $9,800',
    'LWB Course + AI is $1,500',
    'Airbnb Ascension is $9,800',
    'Airbnb Ascension Scale $18,000',
    'Ascension Scale is $18,000',
    'STR Concierge $16,000',
    'STR Concierge Portfolio $30,000',
    'Bundles run from $17,000 to $34,000',
    '$10,800 through Splitit',
    '$10,800 financed through Splitit',
    'Course plus AI option $1,500',
    'publishes $9,800',
    'at $9,800 for 6 months',
    // Renewal offer amounts that used to print on /renewals and /renewalsSuper.
    '<div class="pricing-amount">$1,000',
    '<div class="pricing-amount">$2,000',
    // Third-party price figures quoted for our program, and a testimonial that
    // implied a ceiling on what the program costs.
    'our program costs about $2,500',
    'price figure of about $2,500',
    'promotions near $1,997',
    'would have paid $25,000 for the program',
    'twenty-five thousand dollars for it',
    'twenty five thousand dollars for it',
];

const PUBLIC_FILES = [
    'index.html',
    'reviews.html',
    'llms.txt',
    'llms-full.txt',
    'llms/reviews.txt',
    'scripts/build-reviews-schema.js',
    'data/reviews-videos.json',
    'renewals.html',
    'renewalsSuper.html',
    'renewals/index.html',
    'renewalsSuper/index.html',
    'legacy-wealth-blueprint.html',
    'legacy-wealth-blueprint-ascension.html',
    'legacy-wealth-blueprint-concierge.html',
    'lwbprogram.html',
    'airbnbascension.html',
    'strconcierge.html',
    'programroi.html',
    'templates/legacy-wealth-blueprint.html',
];

function walk(dir, acc) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === 'lx' || entry.name === '.git') {
            continue;
        }
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(full, acc);
        } else if (/\.(html|md|txt|js)$/.test(entry.name)) {
            acc.push(full);
        }
    }
}

test('public pages do not publish Legacy Investing Show program tuition', () => {
    const files = PUBLIC_FILES.map((relative) => path.join(ROOT, relative));
    walk(path.join(ROOT, 'content', 'blog'), files);
    walk(path.join(ROOT, 'blog'), files);

    const hits = [];
    for (const file of files) {
        const text = fs.readFileSync(file, 'utf8');
        for (const needle of FORBIDDEN) {
            if (text.includes(needle)) {
                hits.push(`${path.relative(ROOT, file)}: ${needle}`);
            }
        }
    }

    assert.deepEqual(hits, [], hits.join('\n'));
});
