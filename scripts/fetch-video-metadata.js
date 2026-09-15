#!/usr/bin/env node

/**
 * Fill the missing durationSeconds and uploadDate values in
 * data/reviews-videos.json from the source platforms. One-off, run by hand
 * when the network allows; nothing in the build depends on it.
 *
 * Why it exists: 18 of the 19 videos have no upload date anywhere in this
 * repo, and 14 have no duration. A VideoObject without uploadDate is valid
 * schema but not eligible for a video rich result, so those values are worth
 * fetching once. What must never happen is filling them from the blog post
 * date, which is a different fact about a different thing.
 *
 * Sources:
 *   YouTube  GET https://www.googleapis.com/youtube/v3/videos
 *              ?part=snippet,contentDetails&id=<ids>&key=<YOUTUBE_API_KEY>
 *            snippet.publishedAt is the upload date, contentDetails.duration
 *            is an ISO 8601 duration. One request covers all 15 ids and costs
 *            one quota unit.
 *   Vimeo    GET https://vimeo.com/api/oembed.json?url=https://vimeo.com/<id>
 *            duration in seconds and upload_date as "YYYY-MM-DD HH:MM:SS".
 *            No key needed. This is the endpoint data/lwb-success-stories.json
 *            already names as the source of its durations.
 *
 * Usage:
 *   YOUTUBE_API_KEY=... node scripts/fetch-video-metadata.js
 *   YOUTUBE_API_KEY=... node scripts/fetch-video-metadata.js --dry-run
 *
 * --dry-run prints what would change and writes nothing. Without it the
 * script writes data/reviews-videos.json in place, filling only the fields
 * that are null: a value already in the file is never overwritten, so a
 * hand-verified figure cannot be clobbered by an API answer.
 *
 * After a successful run, rebuild what reads the file:
 *   npm run build:reviews-schema && npm run build:video-sitemap && npm run build:reviews-text
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const DATA_FILE = path.join(ROOT_DIR, 'data', 'reviews-videos.json');
const YOUTUBE_ENDPOINT = 'https://www.googleapis.com/youtube/v3/videos';
const VIMEO_ENDPOINT = 'https://vimeo.com/api/oembed.json';

/**
 * Parse an ISO 8601 duration such as PT32M15S into seconds.
 * @param {string} value
 * @returns {number|null}
 */
function durationToSeconds(value) {
    const parts = String(value || '').match(/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
    if (!parts) return null;
    const days = Number(parts[1] || 0);
    const hours = Number(parts[2] || 0);
    const minutes = Number(parts[3] || 0);
    const seconds = Number(parts[4] || 0);
    const total = (((days * 24) + hours) * 60 + minutes) * 60 + seconds;
    return total > 0 ? total : null;
}

/**
 * Reduce any timestamp to the YYYY-MM-DD the data file stores.
 * @param {string} value
 * @returns {string|null}
 */
function toDateOnly(value) {
    if (!value) return null;
    const normalized = String(value).replace(' ', 'T');
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().split('T')[0];
}

async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText} from ${url.replace(/key=[^&]+/, 'key=***')}`);
    }
    return response.json();
}

/**
 * One request for every YouTube id.
 * @param {string[]} ids
 * @param {string} apiKey
 * @returns {Promise<Map<string, {durationSeconds: number|null, uploadDate: string|null}>>}
 */
async function fetchYouTube(ids, apiKey) {
    const found = new Map();
    if (!ids.length) return found;

    const url = `${YOUTUBE_ENDPOINT}?part=snippet,contentDetails&id=${ids.join(',')}&key=${apiKey}`;
    const payload = await fetchJson(url);

    for (const item of payload.items || []) {
        found.set(item.id, {
            durationSeconds: durationToSeconds(item.contentDetails && item.contentDetails.duration),
            uploadDate: toDateOnly(item.snippet && item.snippet.publishedAt),
        });
    }

    const missing = ids.filter((id) => !found.has(id));
    if (missing.length) {
        console.warn(`YouTube returned nothing for: ${missing.join(', ')}`);
    }

    return found;
}

/**
 * One oEmbed request per Vimeo id.
 * @param {string[]} ids
 * @returns {Promise<Map<string, {durationSeconds: number|null, uploadDate: string|null}>>}
 */
async function fetchVimeo(ids) {
    const found = new Map();

    for (const id of ids) {
        try {
            const payload = await fetchJson(`${VIMEO_ENDPOINT}?url=https://vimeo.com/${id}`);
            found.set(id, {
                durationSeconds: Number(payload.duration) || null,
                uploadDate: toDateOnly(payload.upload_date),
            });
        } catch (error) {
            console.warn(`Vimeo ${id}: ${error.message}`);
        }
    }

    return found;
}

async function main() {
    const dryRun = process.argv.includes('--dry-run');
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!fs.existsSync(DATA_FILE)) {
        console.error(`Missing ${path.relative(ROOT_DIR, DATA_FILE)}`);
        process.exit(1);
    }

    const records = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const youTubeIds = records.filter((r) => r.provider === 'youtube').map((r) => r.id);
    const vimeoIds = records.filter((r) => r.provider === 'vimeo').map((r) => r.id);

    if (!apiKey && youTubeIds.length) {
        console.error('YOUTUBE_API_KEY is not set. Set it, or the 15 YouTube records cannot be filled.');
        process.exit(1);
    }

    let fetched;
    try {
        const [youTube, vimeo] = await Promise.all([
            fetchYouTube(youTubeIds, apiKey),
            fetchVimeo(vimeoIds),
        ]);
        fetched = new Map([...youTube, ...vimeo]);
    } catch (error) {
        console.error(`Could not fetch video metadata: ${error.message}`);
        process.exit(1);
        return;
    }

    let filled = 0;
    for (const record of records) {
        const values = fetched.get(record.id);
        if (!values) continue;

        if (record.durationSeconds == null && values.durationSeconds) {
            console.log(`${record.id}: durationSeconds ${values.durationSeconds}`);
            record.durationSeconds = values.durationSeconds;
            filled += 1;
        }
        if (record.uploadDate == null && values.uploadDate) {
            console.log(`${record.id}: uploadDate ${values.uploadDate}`);
            record.uploadDate = values.uploadDate;
            filled += 1;
        }

        // Report, do not overwrite: a value already in the file was verified
        // by hand and the API answer is only evidence about it.
        if (record.durationSeconds != null && values.durationSeconds
            && record.durationSeconds !== values.durationSeconds) {
            console.warn(
                `${record.id}: file says ${record.durationSeconds}s, the API says ${values.durationSeconds}s. `
                + 'Left as is. Check which is right.'
            );
        }
        if (record.uploadDate != null && values.uploadDate && record.uploadDate !== values.uploadDate) {
            console.warn(
                `${record.id}: file says ${record.uploadDate}, the API says ${values.uploadDate}. `
                + 'Left as is. Check which is right.'
            );
        }
    }

    if (dryRun) {
        console.log(`Dry run: ${filled} field(s) would be filled. Nothing written.`);
        return;
    }

    if (!filled) {
        console.log('Nothing to fill.');
        return;
    }

    fs.writeFileSync(DATA_FILE, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
    console.log(`Filled ${filled} field(s) in data/reviews-videos.json.`);
    console.log('Now run: npm run build:reviews-schema && npm run build:video-sitemap && npm run build:reviews-text');
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error.message);
        process.exit(1);
    });
}

module.exports = { durationToSeconds, toDateOnly };
