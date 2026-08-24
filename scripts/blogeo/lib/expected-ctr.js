'use strict';

function expectedCtr(position) {
    const pos = Number(position);
    if (!Number.isFinite(pos) || pos <= 0) return 0;
    if (pos <= 1) return 0.28;
    if (pos <= 2) return 0.15;
    if (pos <= 3) return 0.10;
    if (pos <= 5) return 0.06;
    if (pos <= 7) return 0.04;
    if (pos <= 10) return 0.025;
    return 0.01;
}

module.exports = { expectedCtr };
