#!/usr/bin/env node

/**
 * Replace internal links to permanent redirect sources with their final paths.
 *
 * This keeps generated pages from linking to URLs that Search Console reports as
 * "Page with redirect" when a canonical destination is already known.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const VERCEL_CONFIG = path.join(ROOT_DIR, 'vercel.json');
const SKIP_DIRS = new Set(['.git', 'node_modules', 'backups', 'cms', 'analysis', 'lx']);
const CANONICAL_ALIASES = {
    '/blog/2026-tax-changes': '/blog/2026-tax-changes-you-need-to-know',
    '/blog/airbnb-furnishing-budget-guide': '/blog/airbnb-furniture-budget-checklist',
    '/blog/best-tax-deduction-vs-retirement-contributions': '/blog/tax-deduction-vs-retirement-contributions',
    '/blog/crypto-retirement': '/topics/retirement',
    '/blog/facebook-marketplace-landlord-scripts': '/blog/how-to-convince-landlords-for-airbnb-arbitrage',
    '/blog/financial-modeling': '/tools',
    '/blog/house-hacking': '/blog/house-hacking-guide',
    '/blog/micah-facebook-message-5k-month-houston': '/blog/micah-facebook-message-airbnb',
    '/blog/monte-carlo': '/tools',
    '/blog/savings-rate': '/topics/wealth-building',
    '/blog/side-income': '/topics/wealth-building',
    '/blog/wealth-building-basics': '/topics/wealth-building',
    '/retirement': '/topics/retirement',
    '/retirement-planning': '/topics/retirement',
    '/retirement-planning/social-security-tax-planning': '/blog/social-security-optimization',
    '/retirement/401k-contribution-limits': '/blog/401k-strategy-for-small-business-owners',
    '/retirement/backdoor-roth-strategy': '/tax-strategies/backdoor-roth-ira',
    '/retirement/contribution-limits': '/blog/401k-strategy-for-small-business-owners',
    '/retirement/early-retirement-plan': '/blog/retirement-income-plan-for-early-retirees',
    '/retirement/early-retirement-withdrawal-strategies': '/blog/early-retirement-withdrawal',
    '/retirement/medicare': '/blog/retirement-healthcare-planning',
    '/retirement/required-minimum-distributions': '/blog/best-tax-strategy-for-retirement',
    '/retirement/retirement-income-planning': '/blog/retirement-income-strategies',
    '/retirement/retirement-tax-planning': '/blog/best-tax-strategy-for-retirement',
    '/retirement/roth-conversion-strategy': '/tax-strategies/roth-conversion-ladder',
    '/retirement/roth-ira-strategies': '/blog/how-roth-ira-is-taxed',
    '/retirement/roth-ira-vs-traditional-ira': '/retirement/traditional-vs-roth-401k',
    '/retirement/social-security': '/blog/social-security-optimization',
    '/retirement/solo-401k-guide': '/tax-strategies/solo-401k',
    '/tax-strategies/1031-exchange-guide': '/tax-strategies/1031-exchange',
    '/tax-strategies/529-plan': '/tax-strategies',
    '/tax-strategies/bitcoin': '/topics/tax-strategies',
    '/tax-strategies/business-deductions': '/blog/best-tax-deductions-for-small-business',
    '/tax-strategies/business-entities': '/topics/business-structures',
    '/tax-strategies/capital-gains-planning': '/blog/capital-gains-tax-best-strategy',
    '/tax-strategies/capital-gains-tax-rates-2026': '/blog/capital-gains-tax-rate-2026',
    '/tax-strategies/charitable-bunching': '/tax-strategies/bunching-deductions',
    '/tax-strategies/charitable-deductions': '/tax-strategies/bunching-deductions',
    '/tax-strategies/charitable-giving': '/tax-strategies/donor-advised-fund',
    '/tax-strategies/child-tax-credit': '/tax-strategies/dependent-care-fsa',
    '/tax-strategies/cost-basis-step-up': '/blog/estate-tax-planning-guide',
    '/tax-strategies/dependent-care-credit': '/tax-strategies/dependent-care-fsa',
    '/tax-strategies/depreciation-recapture': '/blog/rental-property-depreciation-deduction-guide',
    '/tax-strategies/estimated-quarterly-taxes': '/tax-strategies/estimated-tax-payments',
    '/tax-strategies/for/married-couples': '/topics/tax-strategies',
    '/tax-strategies/health-fsa': '/tax-strategies/dependent-care-fsa',
    '/tax-strategies/pass-through-entity-taxation': '/tax-strategies/pass-through-entity-tax',
    '/tax-strategies/qualified-charitable-distribution': '/blog/best-tax-strategy-for-inherited-ira',
    '/tax-strategies/real-estate': '/topics/investing',
    '/tax-strategies/real-estate-investing': '/topics/investing',
    '/tax-strategies/rental-property-taxes': '/blog/what-tax-deductions-for-rental-property',
    '/tax-strategies/roth-vs-traditional': '/retirement/traditional-vs-roth-401k',
    '/tax-strategies/s-corp-election': '/tax-strategies/s-corp-strategy',
    '/tax-strategies/section-179-deduction': '/tax-strategies/section-179',
    '/tax-strategies/marriage-tax-planning': '/topics/tax-strategies',
    '/tax-strategies/self-directed-ira-real-estate': '/tax-strategies/self-directed-ira',
    '/tax-strategies/self-employed': '/tax-strategies/for/self-employed',
    '/tax-strategies/spousal-ira': '/blog/spousal-ira',
    '/tax-strategies/state/north-carolina': '/topics/tax-strategies',
    '/tax-strategies/state/texas': '/topics/tax-strategies',
    '/tax-strategies/state/virginia': '/topics/tax-strategies',
    '/topics/business-strategies': '/topics/business-structures',
    '/topics/retirement-planning': '/topics/retirement',
    '/topics/small-business': '/topics/business-structures',
    '/topics/tax-optimization': '/topics/tax-strategies',
    '/tools/compounding': '/tools',
    '/tools/fire': '/tools',
    '/tools/retirement': '/tools',
    '/tools/roth-analyzer': '/tools',
    '/tools/tax-calculator': '/tools/capital-gains-tax-estimate',
};

function walkHtmlFiles(dir, files = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (SKIP_DIRS.has(entry.name)) continue;

        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walkHtmlFiles(fullPath, files);
        } else if (entry.isFile() && entry.name.endsWith('.html')) {
            files.push(fullPath);
        }
    }

    return files;
}

function normalizePathname(value) {
    if (!value || !value.startsWith('/')) return value;
    if (value === '/') return value;
    return value.replace(/\/+$/, '');
}

function buildRedirectMap() {
    const config = JSON.parse(fs.readFileSync(VERCEL_CONFIG, 'utf8'));
    const map = new Map();

    for (const [source, destination] of Object.entries(CANONICAL_ALIASES)) {
        map.set(source, destination);
        map.set(`${source}/`, destination);
        map.set(`${source}.html`, destination);
    }

    for (const redirect of config.redirects || []) {
        if (!redirect.permanent) continue;
        if (!redirect.source || !redirect.destination) continue;
        if (!redirect.source.startsWith('/') || !redirect.destination.startsWith('/')) continue;
        if (redirect.source.includes(':') || redirect.source.includes('*')) continue;

        const source = normalizePathname(redirect.source);
        const destination = normalizePathname(redirect.destination);
        if (!source || !destination || source === destination) continue;

        map.set(source, destination);
        map.set(`${source}/`, destination);
        map.set(`${source}.html`, destination);
    }

    return map;
}

function rewriteHref(match, quote, rawHref, redirectMap) {
    const urlMatch = rawHref.match(/^([^?#]+)([?#].*)?$/);
    if (!urlMatch) return match;

    const pathname = urlMatch[1];
    const suffix = urlMatch[2] || '';
    const normalized = normalizePathname(pathname);
    let destination = redirectMap.get(pathname) || redirectMap.get(normalized);

    if (!destination && pathname.endsWith('/')) {
        const cleanPath = pathname.replace(/\/+$/, '');
        const htmlTarget = path.join(ROOT_DIR, `${cleanPath.replace(/^\//, '')}.html`);
        if (fs.existsSync(htmlTarget)) {
            destination = cleanPath;
        }
    }

    if (!destination && pathname.endsWith('.html')) {
        const htmlTarget = path.join(ROOT_DIR, pathname.replace(/^\//, ''));
        if (fs.existsSync(htmlTarget)) {
            destination = pathname.replace(/\.html$/, '');
        }
    }

    if (!destination) return match;
    return `href=${quote}${destination}${suffix}${quote}`;
}

function main() {
    const redirectMap = buildRedirectMap();
    const htmlFiles = walkHtmlFiles(ROOT_DIR);
    let updatedFiles = 0;
    let replacements = 0;

    for (const filePath of htmlFiles) {
        const original = fs.readFileSync(filePath, 'utf8');
        let fileReplacements = 0;
        const updated = original.replace(/href=(["'])(\/[^"']+)\1/g, (match, quote, href) => {
            const rewritten = rewriteHref(match, quote, href, redirectMap);
            if (rewritten !== match) fileReplacements += 1;
            return rewritten;
        });

        if (updated !== original) {
            fs.writeFileSync(filePath, updated, 'utf8');
            updatedFiles += 1;
            replacements += fileReplacements;
        }
    }

    console.log(`Normalized ${replacements} internal redirect link(s) across ${updatedFiles} HTML file(s).`);
}

main();
