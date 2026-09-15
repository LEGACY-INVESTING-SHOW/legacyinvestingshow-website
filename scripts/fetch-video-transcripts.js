#!/usr/bin/env node

/**
 * Fills the null `transcript` fields in data/reviews-videos.json from the
 * caption track each platform already publishes.
 *
 * Nothing here writes a word that did not come off a caption track. A video
 * with no caption track keeps `transcript: null`, and the page, the schema
 * and the plain-text mirror all go on saying "Summary" for it.
 *
 * YouTube. There is no public captions endpoint that does not need an OAuth
 * token for the channel owner, so this does what a browser does: fetch the
 * watch page, read the caption track list out of ytInitialPlayerResponse,
 * take the first English track and fetch it as JSON (`fmt=json3`). The
 * `youtube-transcript` npm package does the same thing; it is not used here
 * because it is one more dependency for forty lines of parsing, and because
 * it cannot be exercised from the build sandbox either way.
 *
 * Vimeo. Text tracks need an API token. Set VIMEO_TOKEN (a personal access
 * token with the `private` and `video_files` scopes) and each video's tracks
 * are read from https://api.vimeo.com/videos/<id>/texttracks and the WebVTT
 * file behind the first English one is parsed. Without the token the four
 * Vimeo interviews are skipped and the script says so.
 *
 * Network. This script is the only thing in the repo that talks to YouTube or
 * Vimeo at all, and it was written in a sandbox where both hosts are blocked,
 * so it has never been run against either. Run it where the network is open,
 * read the diff before committing it, and re-run the three reviews builders
 * afterwards:
 *
 *   node scripts/fetch-video-transcripts.js
 *   node scripts/build-reviews-sections.js
 *   node scripts/build-reviews-schema.js
 *   npm run build:reviews-text
 *
 * Usage:
 *   node scripts/fetch-video-transcripts.js               # every null transcript
 *   node scripts/fetch-video-transcripts.js --id VIDEOID  # one video
 *   node scripts/fetch-video-transcripts.js --dry-run     # fetch, write nothing
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_FILE = path.join(ROOT, 'data', 'reviews-videos.json');

/* Paragraphs of about this many words, so the text reads as prose rather than
   as a wall or as one line per caption cue. */
const WORDS_PER_PARAGRAPH = 90;

const USER_AGENT =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) '
    + 'Chrome/124.0.0.0 Safari/537.36';

/* ---------------------------------------------------------------- helpers */

/**
 * Join caption segments into paragraphs of roughly WORDS_PER_PARAGRAPH words,
 * breaking at a sentence end wherever one is near the target.
 * @param {string[]} segments
 * @returns {string} paragraphs separated by a blank line
 */
function toParagraphs(segments) {
    const words = segments
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .filter(Boolean);

    const paragraphs = [];
    let current = [];

    for (const word of words) {
        current.push(word);
        const long = current.length >= WORDS_PER_PARAGRAPH;
        const ended = /[.!?]["')\]]?$/.test(word);
        if ((long && ended) || current.length >= WORDS_PER_PARAGRAPH * 1.6) {
            paragraphs.push(current.join(' '));
            current = [];
        }
    }
    if (current.length) paragraphs.push(current.join(' '));

    return paragraphs.join('\n\n');
}

async function getText(url, headers) {
    const response = await fetch(url, {
        headers: Object.assign({ 'User-Agent': USER_AGENT, 'Accept-Language': 'en-US,en;q=0.9' }, headers || {}),
    });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`);
    }
    return response.text();
}

/* --------------------------------------------------------------- youtube */

/**
 * The captionTracks array out of a watch page's ytInitialPlayerResponse.
 * @param {string} html
 * @returns {object[]}
 */
function parseCaptionTracks(html) {
    const at = html.indexOf('"captionTracks"');
    if (at === -1) return [];

    const open = html.indexOf('[', at);
    if (open === -1) return [];

    // Walk the array to its matching bracket, ignoring brackets inside strings.
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = open; i < html.length; i += 1) {
        const character = html[i];
        if (escaped) {
            escaped = false;
        } else if (character === '\\') {
            escaped = true;
        } else if (character === '"') {
            inString = !inString;
        } else if (!inString && character === '[') {
            depth += 1;
        } else if (!inString && character === ']') {
            depth -= 1;
            if (depth === 0) {
                try {
                    return JSON.parse(html.slice(open, i + 1));
                } catch (error) {
                    return [];
                }
            }
        }
    }
    return [];
}

/**
 * The first English track, preferring a human track over an auto one.
 * @param {object[]} tracks
 * @returns {object|null}
 */
function pickEnglishTrack(tracks) {
    const english = tracks.filter((track) => String(track.languageCode || '').toLowerCase().startsWith('en'));
    if (!english.length) return null;
    const human = english.find((track) => track.kind !== 'asr');
    return human || english[0];
}

/**
 * @param {string} id
 * @returns {Promise<{text: string, source: string}|null>}
 */
async function fetchYouTubeTranscript(id) {
    const html = await getText(`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`);
    const tracks = parseCaptionTracks(html);
    if (!tracks.length) return null;

    const track = pickEnglishTrack(tracks);
    if (!track || !track.baseUrl) return null;

    const url = `${track.baseUrl.replace(/&fmt=[^&]*/g, '')}&fmt=json3`;
    const payload = JSON.parse(await getText(url));
    const segments = (payload.events || [])
        .filter((event) => Array.isArray(event.segs))
        .map((event) => event.segs.map((segment) => segment.utf8 || '').join(''))
        .map((line) => line.replace(/\n/g, ' ').trim())
        .filter(Boolean);

    if (!segments.length) return null;

    return {
        text: toParagraphs(segments),
        source: track.kind === 'asr' ? 'youtube auto captions' : 'youtube captions',
    };
}

/* ----------------------------------------------------------------- vimeo */

/**
 * WebVTT cue text, with the timing lines, cue settings and inline tags gone.
 * @param {string} vtt
 * @returns {string[]}
 */
function parseWebVtt(vtt) {
    const lines = String(vtt).split(/\r?\n/);
    const segments = [];
    let previous = '';

    for (const line of lines) {
        const text = line.trim();
        if (!text) continue;
        if (text === 'WEBVTT' || /^(NOTE|STYLE|REGION)\b/.test(text)) continue;
        if (text.includes('-->')) continue;
        if (/^\d+$/.test(text)) continue;

        const clean = text.replace(/<[^>]+>/g, '').trim();
        // Rolling captions repeat the previous cue's last line.
        if (!clean || clean === previous) continue;
        segments.push(clean);
        previous = clean;
    }

    return segments;
}

/**
 * @param {string} id
 * @param {string} token
 * @returns {Promise<{text: string, source: string}|null>}
 */
async function fetchVimeoTranscript(id, token) {
    const headers = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.vimeo.*+json;version=3.4',
    };
    const listing = JSON.parse(await getText(`https://api.vimeo.com/videos/${encodeURIComponent(id)}/texttracks`, headers));
    const tracks = listing.data || [];
    const track = tracks.find((entry) => String(entry.language || '').toLowerCase().startsWith('en')) || tracks[0];
    if (!track || !track.link) return null;

    const segments = parseWebVtt(await getText(track.link));
    if (!segments.length) return null;

    return { text: toParagraphs(segments), source: 'vimeo text track' };
}

/* ------------------------------------------------------------------ main */

function parseArgs(argv) {
    const options = { id: null, dryRun: false };
    for (let i = 0; i < argv.length; i += 1) {
        if (argv[i] === '--id' && argv[i + 1]) {
            options.id = argv[i + 1];
            i += 1;
        } else if (argv[i].startsWith('--id=')) {
            options.id = argv[i].slice('--id='.length);
        } else if (argv[i] === '--dry-run') {
            options.dryRun = true;
        }
    }
    return options;
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    const records = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const token = process.env.VIMEO_TOKEN || '';

    const wanted = records.filter((record) => {
        if (options.id && record.id !== options.id) return false;
        return !record.transcript;
    });

    if (!wanted.length) {
        console.log('fetch-video-transcripts: every record already has a transcript.');
        return;
    }

    console.log(`fetch-video-transcripts: ${wanted.length} record(s) with no transcript.`);
    if (!token) {
        const vimeo = wanted.filter((record) => record.provider === 'vimeo').length;
        if (vimeo) {
            console.log(
                `  skipping ${vimeo} Vimeo interview(s): set VIMEO_TOKEN to a Vimeo personal access `
                + 'token to read their text tracks.'
            );
        }
    }

    let filled = 0;
    for (const record of wanted) {
        if (record.provider === 'vimeo' && !token) continue;

        try {
            const found = record.provider === 'vimeo'
                ? await fetchVimeoTranscript(record.id, token)
                : await fetchYouTubeTranscript(record.id);

            if (!found) {
                console.log(`  ${record.id} (${record.person}): no caption track, left null.`);
                continue;
            }

            record.transcript = found.text;
            record.transcriptSource = found.source;
            record.transcriptFetchedAt = new Date().toISOString();
            filled += 1;
            const words = found.text.split(/\s+/).filter(Boolean).length;
            console.log(`  ${record.id} (${record.person}): ${words} words from ${found.source}.`);
        } catch (error) {
            console.warn(`  ${record.id} (${record.person}): ${error.message}`);
        }
    }

    if (!filled) {
        console.log('fetch-video-transcripts: nothing fetched, data/reviews-videos.json unchanged.');
        return;
    }

    if (options.dryRun) {
        console.log(`fetch-video-transcripts: --dry-run, ${filled} transcript(s) not written.`);
        return;
    }

    fs.writeFileSync(DATA_FILE, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
    console.log(`fetch-video-transcripts: wrote ${filled} transcript(s) into data/reviews-videos.json.`);
    console.log('Now re-run: build-reviews-sections.js, build-reviews-schema.js, build:reviews-text.');
}

if (require.main === module) {
    main().catch((error) => {
        console.error(`fetch-video-transcripts: ${error.message}`);
        process.exit(1);
    });
}

module.exports = { toParagraphs, parseCaptionTracks, pickEnglishTrack, parseWebVtt };
