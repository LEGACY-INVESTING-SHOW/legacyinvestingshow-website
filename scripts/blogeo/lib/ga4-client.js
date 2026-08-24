'use strict';

/**
 * GA4 Data API is a human prerequisite. v0 does not pull AI-referrer sessions
 * until GA4_PROPERTY_ID and a service account are granted.
 */
function assertGa4Ready() {
    const propertyId = process.env.GA4_PROPERTY_ID || process.env.GA4_PROPERTY_ID;
    const creds = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (propertyId && creds) {
        throw new Error('GA4 credentials are present but the Data API client is not wired yet. Keep using GSC CSV + optional AEO citation CSV until fetchAiReferrals is implemented.');
    }
    throw new Error('No GA4 credentials. Set GA4_PROPERTY_ID and GOOGLE_APPLICATION_CREDENTIALS, or skip AEO click measurement until those exist.');
}

async function fetchAiReferrals() {
    return assertGa4Ready();
}

module.exports = { assertGa4Ready, fetchAiReferrals };
