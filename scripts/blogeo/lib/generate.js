'use strict';

const path = require('path');
const { ROOT_DIR } = require('./paths');
const { writeJson } = require('./fs');
const { loadLatestGsc } = require('./gsc');
const { loadOwnership } = require('./ownership');
const { nearMissQueries } = require('./score');
const { buildNearMissTickets, persistTickets } = require('./tickets');
const { pickIsoWeek } = require('./opportunity');

function generateNearMiss(root = ROOT_DIR) {
    const snapshot = loadLatestGsc(root);
    if (!snapshot) return { tickets: [], reason: 'No GSC snapshot. Run ingest first.' };
    const ownership = loadOwnership(root);
    const queries = nearMissQueries(snapshot, ownership);
    const tickets = persistTickets(buildNearMissTickets(queries, root), root);
    const payload = {
        week: snapshot.week || pickIsoWeek(),
        generatedAt: new Date().toISOString(),
        count: tickets.length,
        tickets,
    };
    writeJson(path.join(root, 'data', 'blogeo', 'generated', `${payload.week}.json`), payload);
    return payload;
}

module.exports = { generateNearMiss, generateNearMiss: generateNearMiss };
