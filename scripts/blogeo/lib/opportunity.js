'use strict';

const { expectedCtr } = require('./expected-ctr');

const IMPRESSION_FLOOR = 150;
const ABSOLUTE_DROP = 20;
const PROPORTIONAL_DROP = 0.25;
const RECOVER_BOOST = 1e6;

function opportunity(row, prev = {}) {
    const impressions = Number(row.impressions) || 0;
    const clicks = Number(row.clicks) || 0;
    const position = Number(row.position) || 0;
    const actualCtr = impressions ? clicks / impressions : 0;
    const prevClicks = Number(prev.clicks) || 0;
    const recover = Math.max(0, prevClicks - clicks);
    const ctrHeadroom = impressions >= IMPRESSION_FLOOR
        ? Math.max(0, expectedCtr(position) - actualCtr) * impressions
        : 0;
    const rankHeadroom = position > 10 && impressions >= IMPRESSION_FLOOR
        ? Math.max(0, (expectedCtr(7) - actualCtr) * impressions)
        : 0;
    const realDrop = prevClicks > 0
        && (prevClicks - clicks) >= ABSOLUTE_DROP
        && (clicks / prevClicks) <= (1 - PROPORTIONAL_DROP);
    const raw = Math.max(recover, ctrHeadroom, rankHeadroom);
    let lever = 'none';
    if (realDrop) lever = 'recover';
    else if (ctrHeadroom >= recover && ctrHeadroom >= rankHeadroom && ctrHeadroom > 0) lever = 'ctr';
    else if (recover >= rankHeadroom && recover > 0) lever = 'recover';
    else if (rankHeadroom > 0) lever = 'rank';

    return {
        score: realDrop ? raw + RECOVER_BOOST : raw,
        lever,
        recover,
        ctrHeadroom,
        rankHeadroom,
        actualCtr,
        expectedCtr: expectedCtr(position),
        lowVisibility: impressions < IMPRESSION_FLOOR,
        lowVisibility: impressions < IMPRESSION_FLOOR,
        realDrop,
    };
}

function pickIsoWeek(date = new Date()) {
    const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = target.getUTCDay() || 7;
    target.setUTCDate(target.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
    return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

module.exports = {
    IMPRESSION_FLOOR,
    ABSOLUTE_DROP,
    PROPORTIONAL_DROP,
    RECOVER_BOOST,
    opportunity,
    pickIsoWeek,
};
