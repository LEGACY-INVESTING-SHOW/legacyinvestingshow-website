'use strict';

const path = require('path');

const ROOT_DIR = process.env.BLOGEO_ROOT
    ? path.resolve(process.env.BLOGEO_ROOT)
    : path.join(__dirname, '..', '..', '..');

const SITE_URL = (process.env.SITE_URL || 'https://www.legacyinvestingshow.com').replace(/\/$/, '');
const BLOGEO_DIR = path.join(ROOT_DIR, 'data', 'blogeo');

module.exports = {
    ROOT_DIR,
    SITE_URL,
    BLOGEO_DIR,
    CATALOG_PATH: path.join(BLOGEO_DIR, 'catalog.json'),
    OWNERSHIP_PATH: path.join(BLOGEO_DIR, 'keyword-ownership.json'),
    SOURCE_PACK_DIR: path.join(BLOGEO_DIR, 'source-pack'),
    GSC_IMPORTS_DIR: path.join(BLOGEO_DIR, 'gsc-imports'),
    GSC_SNAPSHOTS_DIR: path.join(BLOGEO_DIR, 'gsc', 'snapshots'),
    GSC_LATEST_PATH: path.join(BLOGEO_DIR, 'gsc', 'latest.json'),
    RUNS_DIR: path.join(BLOGEO_DIR, 'runs'),
    SUGGESTIONS_DIR: path.join(BLOGEO_DIR, 'suggestions'),
    EDITS_DIR: path.join(BLOGEO_DIR, 'edits'),
    LOCKS_DIR: path.join(BLOGEO_DIR, 'locks'),
    GENERATED_DIR: path.join(BLOGEO_DIR, 'generated'),
    AEO_DIR: path.join(BLOGEO_DIR, 'aeo'),
    AEO_IMPORTS_DIR: path.join(BLOGEO_DIR, 'aeo-imports'),
    ANALYSIS_DIR: path.join(ROOT_DIR, 'analysis'),
};
