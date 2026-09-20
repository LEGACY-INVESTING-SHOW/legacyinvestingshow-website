/**
 * Branded 1200x630 cards for wealth-plan posts.
 *
 * The markdown still points at /assets/images/blog/wealth-plan-<slug>.jpg
 * files that were never created. This writer fills
 * /assets/images/blog/plan-covers/<slug>.jpg (and .webp) from the same
 * statistics the post already publishes, so OG cards and in-page figures
 * are real files without dumping client PDF pages.
 *
 * Called from build:blog (and Eleventy before-build) before resolveHero runs.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const {
    PLAN_COVER_DIR,
    headlineStat,
    isPlanPost,
    planStatistics,
    planSubject,
} = require('./blog-render');

const ROOT_DIR = path.join(__dirname, '..', '..');
const ABS_COVER_DIR = path.join(ROOT_DIR, PLAN_COVER_DIR.replace(/^\//, ''));

const PAPER = '#FBF8F1';
const FOREST = '#16352A';
const EMERALD = '#2F7D5B';
const GOLD = '#D9A93D';
const INK_SOFT = '#4A5850';
const IVORY = '#F3EDDF';

function xml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function wrapLine(text, maxChars) {
    const words = String(text || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    const lines = [];
    let current = '';
    for (const word of words) {
        const next = current ? `${current} ${word}` : word;
        if (next.length > maxChars && current) {
            lines.push(current);
            current = word;
        } else {
            current = next;
        }
    }
    if (current) lines.push(current);
    return lines.slice(0, 2);
}

function sideStats(post, lead) {
    return planStatistics(post)
        .filter((stat) => !lead || stat.label !== lead.label || stat.value !== lead.value)
        .slice(0, 4);
}

function coverSvg(post) {
    const stats = planStatistics(post);
    const lead = headlineStat(post) || stats[0] || { value: '', label: 'Personalized plan' };
    const subject = planSubject(post);
    const nameLines = wrapLine(subject, 22);
    const chips = sideStats(post, lead);
    const value = lead ? lead.value : '';
    const label = lead ? lead.label : '';

    const nameText = nameLines
        .map(
            (line, index) =>
                `<text x="72" y="${210 + index * 58}" fill="${FOREST}" font-size="46" font-family="DejaVu Sans, Liberation Sans, sans-serif" font-weight="700">${xml(line)}</text>`
        )
        .join('\n  ');

    const chipBlock = chips
        .map((stat, index) => {
            const top = 150 + index * 100;
            return `<rect x="720" y="${top}" width="408" height="84" rx="16" fill="${IVORY}"/>
  <text x="744" y="${top + 34}" fill="${INK_SOFT}" font-size="16" font-family="DejaVu Sans, Liberation Sans, sans-serif">${xml(stat.label)}</text>
  <text x="744" y="${top + 66}" fill="${FOREST}" font-size="26" font-family="DejaVu Sans, Liberation Sans, sans-serif" font-weight="700">${xml(stat.value)}</text>`;
        })
        .join('\n  ');

    return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="${PAPER}"/>
  <rect width="1200" height="14" fill="${GOLD}"/>
  <text x="72" y="86" fill="${EMERALD}" font-size="18" font-family="DejaVu Sans, Liberation Sans, sans-serif" font-weight="700" letter-spacing="3.2">WEALTH PLAN</text>
  ${nameText}
  <text x="72" y="430" fill="${FOREST}" font-size="${value.length > 14 ? 52 : 68}" font-family="DejaVu Sans, Liberation Sans, sans-serif" font-weight="700">${xml(value)}</text>
  <text x="72" y="478" fill="${INK_SOFT}" font-size="22" font-family="DejaVu Sans, Liberation Sans, sans-serif">${xml(label)}</text>
  ${chipBlock}
</svg>`;
}

/**
 * Write jpg + webp for every wealth-plan post that does not already have a
 * real photograph. Existing files with the same byte length are left alone
 * so rebuilds stay cheap.
 * @param {object[]} posts
 * @returns {Promise<number>} number of posts whose covers were written
 */
async function ensurePlanCovers(posts) {
    const targets = (posts || []).filter(isPlanPost);
    if (targets.length === 0) return 0;

    fs.mkdirSync(ABS_COVER_DIR, { recursive: true });

    let written = 0;
    for (const post of targets) {
        const jpgPath = path.join(ABS_COVER_DIR, `${post.slug}.jpg`);
        const webpPath = path.join(ABS_COVER_DIR, `${post.slug}.webp`);
        const svg = Buffer.from(coverSvg(post));

        const jpg = await sharp(svg).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
        const webp = await sharp(svg).webp({ quality: 78 }).toBuffer();

        const jpgSame = fs.existsSync(jpgPath) && fs.readFileSync(jpgPath).length === jpg.length;
        const webpSame = fs.existsSync(webpPath) && fs.readFileSync(webpPath).length === webp.length;
        if (jpgSame && webpSame) continue;

        fs.writeFileSync(jpgPath, jpg);
        fs.writeFileSync(webpPath, webp);
        written += 1;
    }

    return written;
}

module.exports = {
    ABS_COVER_DIR,
    coverSvg,
    ensurePlanCovers,
};
