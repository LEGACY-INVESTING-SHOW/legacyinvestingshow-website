'use strict';

/**
 * Search Console API client is a human prerequisite (service account on the
 * www URL-prefix or domain property). v0 reads UI CSV exports instead.
 */
const gsc = require('./gsc');

const ingestCsv = gsc.ingestGscCsv || gsc.ingestGscCsv;
const loadLatest = gsc.loadLatestGsc || gsc.loadLatestGsc;
const previous = gsc.previousSnapshot;

function assertApiReady() {
    const email = process.env.GSC_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
    const key = process.env.GSC_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY;
    const creds = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (creds || (email && key)) {
        throw new Error('GSC API credentials are present but the API client is not wired yet. Keep using CSV ingest (`blogeo:ingest`) until the service account is granted on the Search Console property and fetchSearchAnalytics is implemented.');
    }
    throw new Error('No GSC API credentials. Export Pages/Queries/Chart/Filters CSVs from Search Console and run `node scripts/blogeo/cli.js ingest --dir data/blogeo/gsc-imports/<date>`.');
}

async function fetchSearchAnalytics() {
    return assertApiReady();
}

module.exports = {
    ingestGscCsv: ingestCsv,
    loadLatestGsc: loadLatest,
    previousSnapshot: previous,
    fetchSearchAnalytics,
    assertApiReady,
};
