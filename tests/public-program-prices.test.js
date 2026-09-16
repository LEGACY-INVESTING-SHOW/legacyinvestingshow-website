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
];

const PUBLIC_FILES = [
    'index.html',
    'reviews.html',
    'llms.txt',
    'llms-full.txt',
    'scripts/build-reviews-schema.js',
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
