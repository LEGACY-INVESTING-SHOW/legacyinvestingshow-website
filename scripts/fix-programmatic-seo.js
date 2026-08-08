#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
    CURRENT_YEAR,
    renderAnalyticsBody,
    renderAnalyticsHead,
    renderFooterLinks,
    renderPrimaryNavLinks,
} = require('./lib/site-shell');

const ROOT_DIR = path.join(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'programmatic-pages');
const CITIES_PATH = path.join(ROOT_DIR, 'data', 'cities.json');
const TAX_STRATEGIES_PATH = path.join(ROOT_DIR, 'data', 'tax-strategies.json');
const INSURANCE_PATH = path.join(ROOT_DIR, 'data', 'renters-insurance-by-state.json');
const GA_TRACKING_ID = process.env.GA_TRACKING_ID || 'G-2578PT1WSS';
const GTM_CONTAINER_ID = process.env.GTM_CONTAINER_ID || 'GTM-KQ4R2LKP';
const GOOGLE_SITE_VERIFICATIONS = [
    'Kec6RfGhFL-qG_8zKxCqt7yxjgy65WeDAftCBm90G2s',
    '92MoCnkdQOj_ey1lEafT5Mz-znCcCQ3UABZlI-JG_nM',
];

const STATE_CONTEXT = {
    TX: {
        taxLens: 'Texas operators usually care more about margin discipline, property taxes, hotel taxes, and entity setup than about a state income-tax bill.',
        executionFocus: 'Underwrite for permit friction, cleaning labor, and event-driven demand instead of assuming every busy month repeats forever.',
        checklist: [
            'Map city-level short-term-rental rules before you sign a lease or contract.',
            'Separate property-level bookkeeping from personal spending on day one.',
            'Model property tax, insurance, and cleaning volatility before you count on tax savings.',
        ],
    },
    TN: {
        taxLens: 'Tennessee planning tends to revolve around local occupancy taxes, permit discipline, and business systems rather than a complex state income-tax overlay.',
        executionFocus: 'Music and event demand can make revenue spikes look permanent, so use trailing data and conservative occupancy assumptions.',
        checklist: [
            'Pressure-test shoulder season numbers against your peak event assumptions.',
            'Document cleaning, guest communication, and vendor workflows before adding units.',
            'Review local permitting changes every quarter instead of only at acquisition.',
        ],
    },
    FL: {
        taxLens: 'Florida operators usually win or lose on pricing discipline, county-level taxes, and compliance with local short-term-rental rules.',
        executionFocus: 'Tourism can cover weak operations for a while, but storm risk, insurance costs, and seasonality still need to be underwritten explicitly.',
        checklist: [
            'Budget for insurance swings, vacancy spikes, and weather-related disruption.',
            'Track county-level taxes and filing deadlines separately from federal strategy work.',
            'Use documentation that will still make sense in an audit file six months later.',
        ],
    },
    AZ: {
        taxLens: 'Arizona planning is often about seasonal cash flow, desert-market maintenance, and matching depreciation strategies to realistic hold periods.',
        executionFocus: 'Do not let spring demand hide weak summer assumptions or soft weekday occupancy.',
        checklist: [
            'Model high and low season separately before you size any deduction strategy.',
            'Pair depreciation planning with a realistic reserve policy for turns and repairs.',
            'Keep city compliance, cleaner coverage, and pricing reviews on one calendar.',
        ],
    },
    CO: {
        taxLens: 'Colorado investors usually need a tighter view of permit limits, mountain or event seasonality, and whether the property is actually built for year-round use.',
        executionFocus: 'Tax strategy only works when operational capacity keeps up with seasonal spikes and guest expectations.',
        checklist: [
            'Tie your tax plan to the actual hold period and renovation budget.',
            'Avoid using peak ski or convention months as your default baseline.',
            'Document any mixed personal and rental use clearly before filing.',
        ],
    },
    GA: {
        taxLens: 'Georgia planning often centers on entity hygiene, business-travel demand, and whether the property can support repeatable weekday occupancy.',
        executionFocus: 'Airport and convention demand can be strong, but only if operations are consistent enough to protect reviews and pricing power.',
        checklist: [
            'Separate business-travel assumptions from leisure assumptions in underwriting.',
            'Track contractor payments and reimbursements cleanly if you run multiple units.',
            'Use quarterly reviews to decide whether the current entity structure still fits.',
        ],
    },
    CA: {
        taxLens: 'California operators usually need stronger documentation, tighter entity planning, and more caution around local regulation than a simple deduction checklist provides.',
        executionFocus: 'High demand does not remove the need for conservative compliance and expense control.',
        checklist: [
            'Read local permit rules before relying on any short-term-rental tax thesis.',
            'Build a documentation file that can support your deductions without guesswork.',
            'Stress-test whether the project still works if your expected usage is restricted.',
        ],
    },
    NC: {
        taxLens: 'North Carolina planning usually comes down to operational consistency, financing discipline, and whether local demand is broad enough beyond peak events.',
        executionFocus: 'The right tax strategy should protect cash flow, not only create a paper deduction.',
        checklist: [
            'Make sure your bookkeeping shows property-by-property performance.',
            'Review reimbursement, mileage, and home-office records before year-end.',
            'Use a conservative occupancy range if your thesis depends on event traffic.',
        ],
    },
    NV: {
        taxLens: 'Nevada planning is often about regulatory discipline, convention demand, and not confusing gross booking volume with durable profitability.',
        executionFocus: 'In markets with heavy event traffic, risk control matters as much as revenue upside.',
        checklist: [
            'Check permit rules and neighborhood restrictions before acquisition.',
            'Model quiet periods separately from convention or event peaks.',
            'Keep guest logs, pricing changes, and vendor records in one operating file.',
        ],
    },
    WA: {
        taxLens: 'Washington operators usually need a practical system for business records, local compliance, and handling a mix of tech, cruise, and seasonal demand.',
        executionFocus: 'Stable tax planning starts with stable operating systems and realistic labor assumptions.',
        checklist: [
            'Review city rules before adding capacity in dense neighborhoods.',
            'Do not assume cruise or summer demand solves a weak winter model.',
            'Match any entity or deduction move to actual recordkeeping capacity.',
        ],
    },
    OR: {
        taxLens: 'Oregon planning usually rewards careful documentation, conservative occupancy assumptions, and a clear operating cadence rather than aggressive tax positioning.',
        executionFocus: 'Food, event, and outdoor demand can work well, but only if the property survives shoulder seasons cleanly.',
        checklist: [
            'Separate event-driven occupancy from base demand in your model.',
            'Use consistent reimbursement and mileage logs if you self-manage.',
            'Keep reserve planning tied to the same facts you use for tax planning.',
        ],
    },
};

const CITY_CONTEXT = {
    'austin-tx': {
        summary: 'Austin works best for operators who understand how event spikes, neighborhood rules, and cleaner capacity interact with underwriting.',
        demandDrivers: ['SXSW and ACL can create outsized peak pricing windows.', 'Tech relocations and business travel can support midweek demand.', 'Neighborhood-level enforcement and operator saturation can compress margins quickly.'],
        bestFit: 'Best for disciplined hosts or investors who can combine event revenue with a repeatable non-event base case.',
        watchouts: ['Do not annualize festival pricing across the rest of the year.', 'Budget for higher service expectations in premium neighborhoods.', 'Review permit and HOA constraints before you count on short-term-rental status.'],
    },
    'nashville-tn': {
        summary: 'Nashville rewards operators who underwrite party demand carefully and still protect the asset during quieter stretches.',
        demandDrivers: ['Music tourism creates strong leisure demand.', 'Bachelor and bachelorette traffic can lift ADR but also operational wear.', 'New supply can make rankings and reviews matter more than headline demand.'],
        bestFit: 'Best for hosts with strong guest rules, cleaner oversight, and pricing discipline.',
        watchouts: ['Do not let group-travel demand hide turnover costs.', 'Protect reviews with tighter guest communication and house rules.', 'Use reserve planning for furnishing refreshes and frequent turns.'],
    },
    'miami-fl': {
        summary: 'Miami can support premium pricing, but the tax win only holds if the operation survives insurance pressure, regulation, and seasonality.',
        demandDrivers: ['Beach, nightlife, and international travel support strong leisure demand.', 'Conferences and luxury travel can widen top-end pricing.', 'Insurance, building rules, and local compliance can erase a weak margin model.'],
        bestFit: 'Best for experienced operators who can manage compliance and premium-service expectations.',
        watchouts: ['Do not underwrite with peak season occupancy alone.', 'Keep insurance and reserve assumptions conservative.', 'Verify building-level rental rules before signing or acquiring.'],
    },
    'phoenix-az': {
        summary: 'Phoenix is a good fit when you plan around snowbird demand, spring events, and long hot shoulder seasons instead of only peak months.',
        demandDrivers: ['Spring training and event traffic can create strong short bursts.', 'Seasonal relocations support longer booking windows.', 'Summer softness can expose thin underwriting fast.'],
        bestFit: 'Best for investors who can match pricing strategy to a sharply seasonal calendar.',
        watchouts: ['Model summer and spring separately.', 'Use real reserve assumptions for wear, pool service, and utilities.', 'Avoid forcing an aggressive tax plan onto a weak hold-period thesis.'],
    },
    'denver-co': {
        summary: 'Denver works better as a tax strategy market when you tie deductions to a realistic usage pattern and a conservative seasonal model.',
        demandDrivers: ['Mountain access and outdoor travel support broad appeal.', 'Convention and event traffic can help weekdays.', 'Seasonality and local rules can narrow the workable rental model.'],
        bestFit: 'Best for operators with a clear plan for both leisure and business demand.',
        watchouts: ['Do not rely on ski-adjacent demand if the location does not truly benefit from it.', 'Document mixed personal and rental use carefully.', 'Pair depreciation moves with a real exit or hold strategy.'],
    },
    'atlanta-ga': {
        summary: 'Atlanta is more of an operations-and-entity market than a pure tourism market, so stable systems matter.',
        demandDrivers: ['Airport and convention traffic can support weekday stays.', 'Film, business, and event traffic can diversify demand.', 'Supply competition can punish weak reviews or pricing laziness.'],
        bestFit: 'Best for hosts who can run a repeatable operating system instead of chasing one-off event spikes.',
        watchouts: ['Separate business and leisure assumptions in your reporting.', 'Track vendor payments and reimbursements carefully if you scale.', 'Use entity strategy to support operations, not to paper over weak margins.'],
    },
    'san-diego-ca': {
        summary: 'San Diego can be attractive, but regulatory discipline and premium-service execution matter as much as tax strategy.',
        demandDrivers: ['Beach demand supports leisure travel.', 'Military and conference demand can add stability.', 'Local rules and high carrying costs can limit room for mistakes.'],
        bestFit: 'Best for operators who can manage premium expectations and compliance simultaneously.',
        watchouts: ['Do not build the tax plan before confirming local STR rules.', 'Use conservative pricing for non-peak periods.', 'Treat documentation as part of risk control, not admin overhead.'],
    },
    'tampa-fl': {
        summary: 'Tampa works when you combine leisure demand with a realistic cost structure and strong tax documentation.',
        demandDrivers: ['Beach access and cruise traffic support traveler volume.', 'Compared with some Florida peers, entry can look easier.', 'Seasonality and weather still matter more than optimistic gross revenue projections.'],
        bestFit: 'Best for operators who want Florida demand without assuming every submarket behaves like Miami or Orlando.',
        watchouts: ['Stress-test the property outside of cruise and winter peaks.', 'Track county and city taxes separately.', 'Do not overbuild staffing or furniture around peak occupancy only.'],
    },
    'charlotte-nc': {
        summary: 'Charlotte is most useful for operators who want a business-travel-heavy market with less reliance on pure vacation demand.',
        demandDrivers: ['Banking and corporate activity can support weekdays.', 'NASCAR and event traffic can add revenue bursts.', 'Tech and population growth can make submarket selection matter more than metro-level averages.'],
        bestFit: 'Best for hosts focused on cleaner operations, midweek demand, and practical tax documentation.',
        watchouts: ['Do not ignore neighborhood-level demand variation.', 'Protect margins with disciplined vendor and cleaning controls.', 'Keep entity and reimbursement records ready before year-end.'],
    },
    'las-vegas-nv': {
        summary: 'Las Vegas can create big gross numbers, but it is unforgiving if you ignore regulation or assume every event month repeats.',
        demandDrivers: ['Convention demand can create premium weekdays.', 'Leisure and event traffic can widen ADR bands.', 'Regulatory pressure can be the deciding factor, not demand.'],
        bestFit: 'Best for experienced operators who treat compliance as part of underwriting.',
        watchouts: ['Confirm the asset is actually workable under current local rules.', 'Do not rely on conference weeks to justify the whole year.', 'Keep guest controls, cleaning standards, and cash reserves tighter than average.'],
    },
    'orlando-fl': {
        summary: 'Orlando is strongest when family-travel demand, property layout, and seasonality all align with the tax strategy you want to use.',
        demandDrivers: ['Theme parks create year-round booking volume.', 'Family travel can lengthen planning windows.', 'Heavy competition means weak operations show up fast in reviews and price pressure.'],
        bestFit: 'Best for operators who can manage family-focused guest expectations and turnover quality.',
        watchouts: ['Model cleaning and maintenance at family-travel intensity.', 'Do not assume occupancy alone will rescue a bad pricing strategy.', 'Pair deductions with documentation that is clean enough for audit review.'],
    },
    'dallas-tx': {
        summary: 'Dallas is more about business-travel systems, event overlays, and entity hygiene than about headline tourism.',
        demandDrivers: ['Corporate travel can support weekday stays.', 'Sports and convention traffic add peaks.', 'Submarket differences can make or break the model.'],
        bestFit: 'Best for operators who want a business-travel profile and clean operating controls.',
        watchouts: ['Do not underwrite every suburb the same way.', 'Track reimbursements, mileage, and admin expenses carefully if you self-manage.', 'Use pricing reviews to protect margins instead of reacting late.'],
    },
    'houston-tx': {
        summary: 'Houston favors operators who understand medical, energy, and project-based travel patterns rather than simple vacation-market assumptions.',
        demandDrivers: ['Medical and project travel can support non-weekend demand.', 'Energy and business activity can diversify guest sources.', 'Different submarkets can behave very differently by stay length and season.'],
        bestFit: 'Best for investors who want a broader demand base and can run property-by-property reporting.',
        watchouts: ['Do not copy an Austin or Orlando underwriting model into Houston.', 'Track stay-length mix and cleaning cadence carefully.', 'Use the tax plan to support a disciplined operation, not as the entire thesis.'],
    },
    'seattle-wa': {
        summary: 'Seattle can work well for operators who align compliance, labor, and seasonal demand instead of treating the market as permanently premium.',
        demandDrivers: ['Tech and corporate traffic can support weekday demand.', 'Cruise and summer travel can widen strong periods.', 'Neighborhood rules and operating costs can compress margins quickly.'],
        bestFit: 'Best for hosts who can balance premium service with conservative cost assumptions.',
        watchouts: ['Do not assume summer pricing will carry the full year.', 'Review labor and cleaner coverage before adding units.', 'Keep documentation ready if you mix personal travel with business travel.'],
    },
    'portland-or': {
        summary: 'Portland is best approached as a discipline market: good records, realistic seasonality, and clear operator positioning matter more than flashy projections.',
        demandDrivers: ['Food, event, and outdoor travel create mixed demand pockets.', 'Shorter peak windows can still be lucrative if cost control is strong.', 'Demand can soften fast when the listing or operating experience slips.'],
        bestFit: 'Best for hosts who value consistent operations and conservative planning over aggressive scaling.',
        watchouts: ['Use base-case occupancy that still works outside event periods.', 'Keep reimbursement and home-office documentation clean if you self-manage.', 'Pair every tax move with a written execution process.'],
    },
};

const PERSONAS = [
    {
        slug: 'real-estate-investors',
        title: 'Real Estate Investor Tax Planning Workflow',
        description: 'A decision-first playbook for investors who need to connect acquisition, hold period, documentation, and exit timing before they chase deductions.',
        authorityHref: '/tax-strategies/for/real-estate-investors',
        authorityLabel: 'Core strategy page for real estate investors',
        pressurePoints: [
            'Choosing a property structure that supports the actual hold period.',
            'Matching depreciation strategy to cash flow instead of chasing paper losses alone.',
            'Keeping time logs, capex records, and entity records tight enough for review.',
        ],
        workflow: [
            'Define whether the next move is acquisition, optimization, refinance, or sale.',
            'Choose the deduction stack only after the hold period and operator role are clear.',
            'Build one audit folder per property with purchase documents, capex, mileage, and time logs.',
            'Review depreciation, exit timing, and entity structure before year-end instead of after closing.',
        ],
        mistakes: [
            'Ordering a cost segregation study before confirming the property is still a good hold.',
            'Claiming participation or status rules without a recordkeeping system.',
            'Letting bookkeeping lag until the CPA has to reconstruct the year from bank statements.',
        ],
        resources: [
            'cost-segregation',
            'real-estate-professional-status',
            'short-term-rental-loophole',
            '1031-exchange',
            'bonus-depreciation',
        ],
    },
    {
        slug: 'small-business-owners',
        title: 'Small Business Owner Tax Operations Playbook',
        description: 'A practical framework for owners who need entity discipline, reimbursement systems, payroll judgment, and deduction hygiene to work together.',
        authorityHref: '/tax-strategies/for/business-owners',
        authorityLabel: 'Core strategy page for business owners',
        pressurePoints: [
            'Choosing an entity structure that matches real payroll and admin capacity.',
            'Separating business reimbursements from personal spending before year-end.',
            'Using deductions to improve owner cash flow without creating messy records.',
        ],
        workflow: [
            'Review entity fit, payroll reality, and reimbursement policy together.',
            'Tighten bookkeeping, accountable-plan, and receipt discipline before hunting for more deductions.',
            'Decide which one or two strategy changes matter most this year and ignore the rest.',
            'Build a recurring quarterly review for payroll, estimates, and documentation gaps.',
        ],
        mistakes: [
            'Electing S-corp treatment without consistent payroll execution.',
            'Treating every personal expense as a business write-off candidate.',
            'Adding multiple strategies at once without assigning who maintains the records.',
        ],
        resources: [
            's-corp-strategy',
            'qualified-business-income-deduction',
            'home-office-deduction',
            'business-vehicle-deduction',
            'section-179',
        ],
    },
    {
        slug: 'high-income-earners',
        title: 'High-Income Earner Tax Planning Sequence',
        description: 'A sequencing page for W-2-heavy households that need to decide what to do first, what requires a business or real estate vehicle, and what is just noise.',
        authorityHref: '/tax-strategies/for/high-income-earners',
        authorityLabel: 'Core strategy page for high-income earners',
        pressurePoints: [
            'Filtering strategies that sound advanced but do not fit a W-2-heavy income mix.',
            'Balancing charitable, retirement, and real estate moves without losing documentation quality.',
            'Reducing tax drag while protecting liquidity and household flexibility.',
        ],
        workflow: [
            'Start with payroll withholding, retirement contribution space, and cash reserve targets.',
            'Decide whether this year is better suited for deduction, deferral, or asset-location moves.',
            'Use real estate or business strategies only if the operating system already exists.',
            'Review which moves belong this year and which should wait for a cleaner setup.',
        ],
        mistakes: [
            'Buying complexity before building the operating capacity to support it.',
            'Confusing a large deduction with a good long-term investment decision.',
            'Letting charitable or retirement planning drift without a bracket-aware sequence.',
        ],
        resources: [
            'backdoor-roth-ira',
            'hsa-strategy',
            'bunching-deductions',
            'donor-advised-fund',
            'short-term-rental-loophole',
        ],
    },
    {
        slug: 'self-employed',
        title: 'Self-Employed Tax System for 1099 Operators',
        description: 'A field guide for consultants, freelancers, and solo operators who need cleaner records, smarter estimate planning, and the right retirement setup.',
        authorityHref: '/tax-strategies/for/self-employed',
        authorityLabel: 'Core strategy page for self-employed professionals',
        pressurePoints: [
            'Managing irregular cash flow and estimated tax pressure.',
            'Choosing between solo-owner retirement options without overcomplicating operations.',
            'Creating records that make deductions defendable instead of debatable.',
        ],
        workflow: [
            'Stabilize bookkeeping, estimate cadence, and reimbursement records first.',
            'Choose the retirement vehicle that matches revenue consistency and admin tolerance.',
            'Only consider S-corp treatment after payroll, profit level, and owner workload are clear.',
            'Use quarterly reviews to update estimates instead of back-solving in March.',
        ],
        mistakes: [
            'Mixing personal and business accounts for most of the year.',
            'Ignoring estimated tax adjustments until the cash crunch appears.',
            'Building a complex entity stack before revenue is stable enough to justify it.',
        ],
        resources: [
            'solo-401k',
            'qualified-business-income-deduction',
            'hsa-strategy',
            'home-office-deduction',
            's-corp-strategy',
        ],
    },
    {
        slug: 'retirement-savers',
        title: 'Retirement Saver Tax Sequencing Guide',
        description: 'A sequencing page for savers deciding how to split dollars between tax-deferred, tax-free, and flexible accounts without chasing every acronym at once.',
        authorityHref: '/retirement/traditional-vs-roth-401k',
        authorityLabel: 'Core retirement contribution guide',
        pressurePoints: [
            'Choosing the next best account rather than funding everything halfway.',
            'Keeping retirement contributions aligned with current bracket and future flexibility.',
            'Avoiding tax moves that weaken near-term liquidity or documentation quality.',
        ],
        workflow: [
            'Start with employer-match capture or the highest-value contribution bucket available.',
            'Decide whether this year favors tax deduction, tax diversification, or conversion capacity.',
            'Use HSAs and Roth-oriented moves only when cash flow and recordkeeping support them.',
            'Review contribution sequencing before year-end, not after filing season starts.',
        ],
        mistakes: [
            'Treating every retirement account as interchangeable.',
            'Overfunding retirement while underfunding reserves or near-term tax obligations.',
            'Ignoring the interaction between account type, bracket, and future flexibility.',
        ],
        resources: [
            { href: '/retirement/traditional-vs-roth-401k', title: 'Traditional vs Roth 401(k)', description: 'Use current-vs-future tax rate logic before choosing contribution direction.' },
            { href: '/retirement/401k-contribution-strategies', title: '401(k) Contribution Strategies', description: 'See how contribution sequencing changes when cash flow or match rules differ.' },
            'backdoor-roth-ira',
            'hsa-strategy',
            { href: '/retirement/sep-ira-guide', title: 'SEP IRA Guide', description: 'Review when SEP IRA simplicity is a strength and when it becomes a constraint.' },
        ],
    },
    {
        slug: 'airbnb-hosts',
        title: 'Airbnb Host Tax Operations Playbook',
        description: 'A process-first page for hosts who need to align permits, stay-length rules, depreciation choices, and bookkeeping before they file.',
        authorityHref: '/tax-strategies/for/airbnb-hosts',
        authorityLabel: 'Core strategy page for Airbnb and STR hosts',
        pressurePoints: [
            'Knowing whether the property is really short-term-rental friendly under local rules.',
            'Matching depreciation and participation strategy to the actual operating model.',
            'Keeping guest, cleaner, and expense records organized enough to support the return.',
        ],
        workflow: [
            'Confirm regulation and average-stay assumptions before deciding on the tax angle.',
            'Choose the property-level deduction stack only after the operating model is clear.',
            'Track nights, expenses, vendor payments, and material-participation records in one system.',
            'Review the file with your CPA before year-end if you expect a large deduction swing.',
        ],
        mistakes: [
            'Assuming the STR loophole applies because the property is on Airbnb.',
            'Ordering cost segregation without a documented participation story.',
            'Treating operational chaos as a bookkeeping problem instead of a business problem.',
        ],
        resources: [
            'short-term-rental-loophole',
            'cost-segregation',
            'bonus-depreciation',
            'real-estate-professional-status',
            'home-office-deduction',
        ],
    },
];

const COMPARISONS = [
    {
        slug: 'cost-segregation-vs-bonus-depreciation',
        title: 'Cost Segregation vs Bonus Depreciation',
        description: 'Use this decision guide when you need to know whether the study itself is the value driver or whether the property already qualifies for a cleaner first-year deduction approach.',
        s1: 'cost-segregation',
        s2: 'bonus-depreciation',
        quickTake: 'Cost segregation is a study-driven acceleration tool. Bonus depreciation is a timing rule. They often work together, but the sequencing and economics still matter.',
    },
    {
        slug: '1031-exchange-vs-opportunity-zones',
        title: '1031 Exchange vs Opportunity Zones',
        description: 'A choice framework for investors deciding whether to preserve flexibility through like-kind exchange rules or accept a more constrained structure for a different deferral profile.',
        s1: '1031-exchange',
        s2: 'opportunity-zones',
        quickTake: 'A 1031 exchange usually wins when you want continuity inside active real estate. Opportunity Zones can fit when deferral is only one part of a longer-term redevelopment or fund thesis.',
    },
    {
        slug: 'real-estate-professional-vs-str-loophole',
        title: 'Real Estate Professional Status vs STR Loophole',
        description: 'Use this page when you are trying to decide whether your hours, stay lengths, and operating role support a status-based approach or a short-term-rental participation strategy.',
        s1: 'real-estate-professional-status',
        s2: 'short-term-rental-loophole',
        quickTake: 'REPS is a broad status with strict hour tests. The STR loophole is narrower but can be more practical for owners whose average stays and participation records already fit.',
    },
    {
        slug: 's-corp-vs-qbi-deduction',
        title: 'S-Corp vs QBI Deduction',
        description: 'A decision page for owners who need to separate payroll and entity choices from the deduction rules that may apply after the entity choice is already made.',
        s1: 's-corp-strategy',
        s2: 'qualified-business-income-deduction',
        quickTake: 'An S-corp is an operating structure. QBI is a deduction framework. The right decision depends on payroll reality, profit level, and what administrative burden you can actually sustain.',
    },
    {
        slug: 'donor-advised-fund-vs-charitable-trust',
        title: 'Donor-Advised Fund vs Charitable Trust',
        description: 'A choice framework for households deciding whether simple donation batching is enough or whether they need a more complex charitable structure tied to larger appreciated assets.',
        s1: 'donor-advised-fund',
        s2: 'charitable-remainder-trust',
        quickTake: 'A donor-advised fund is usually the simpler execution path. A charitable trust can make sense when asset size, income objectives, and estate planning complexity justify it.',
    },
];

// Renters insurance by state (NAIC 2021 baseline via Insurance Information Institute).
// Nearby states used for side-by-side comparison on each state page.
const RENTERS_NEIGHBORS = {
    AL: ['GA', 'MS', 'TN'],
    AK: ['WA', 'OR', 'ID'],
    AZ: ['CA', 'NM', 'NV'],
    AR: ['TX', 'OK', 'MO'],
    CA: ['OR', 'NV', 'AZ'],
    CO: ['WY', 'NM', 'UT'],
    CT: ['NY', 'MA', 'RI'],
    DE: ['MD', 'PA', 'NJ'],
    DC: ['MD', 'VA', 'DE'],
    FL: ['GA', 'AL', 'SC'],
    GA: ['AL', 'FL', 'SC'],
    HI: ['CA', 'OR', 'WA'],
    ID: ['MT', 'WY', 'NV'],
    IL: ['WI', 'IN', 'MO'],
    IN: ['IL', 'OH', 'KY'],
    IA: ['MN', 'WI', 'IL'],
    KS: ['MO', 'OK', 'NE'],
    KY: ['TN', 'IN', 'OH'],
    LA: ['TX', 'MS', 'AL'],
    ME: ['NH', 'VT', 'MA'],
    MD: ['VA', 'DE', 'PA'],
    MA: ['CT', 'RI', 'NH'],
    MI: ['OH', 'IN', 'WI'],
    MN: ['WI', 'IA', 'SD'],
    MS: ['AL', 'LA', 'TN'],
    MO: ['KS', 'IL', 'AR'],
    MT: ['WY', 'ND', 'ID'],
    NE: ['SD', 'IA', 'KS'],
    NV: ['CA', 'AZ', 'UT'],
    NH: ['VT', 'ME', 'MA'],
    NJ: ['NY', 'PA', 'DE'],
    NM: ['TX', 'AZ', 'CO'],
    NY: ['NJ', 'PA', 'CT'],
    NC: ['VA', 'SC', 'TN'],
    ND: ['MN', 'SD', 'MT'],
    OH: ['PA', 'IN', 'KY'],
    OK: ['TX', 'AR', 'KS'],
    OR: ['WA', 'CA', 'ID'],
    PA: ['NY', 'NJ', 'MD'],
    RI: ['MA', 'CT', 'NH'],
    SC: ['GA', 'NC', 'FL'],
    SD: ['ND', 'MN', 'NE'],
    TN: ['KY', 'GA', 'AL'],
    TX: ['OK', 'LA', 'NM'],
    UT: ['ID', 'NV', 'CO'],
    VT: ['NH', 'NY', 'MA'],
    VA: ['MD', 'NC', 'WV'],
    WA: ['OR', 'ID', 'MT'],
    WV: ['VA', 'MD', 'OH'],
    WI: ['MN', 'IL', 'MI'],
    WY: ['CO', 'MT', 'SD'],
};

// General-context notes for the four factors that drive renters insurance pricing.
// These are qualitative descriptions, not fabricated statistics.
const RENTERS_STATE_CONTEXT = {
    AL: { weather: 'severe storms and tornadoes drive more frequent claims', claims: 'weather-driven claims dominate and disputes are uncommon', replacement: 'replacement costs are moderate', competition: 'a solid mix of national carriers keeps pricing competitive' },
    AK: { weather: 'extreme cold and remote locations make any claim more expensive to handle', claims: 'claim frequency is low because few renters policies are written', replacement: 'shipping and labor costs push replacement values up', competition: 'fewer carriers write coverage in the state, which limits price pressure' },
    AZ: { weather: 'summer monsoon storms and heat-related wear shape loss patterns', claims: 'claim frequency is moderate and litigation is not a dominant driver', replacement: 'replacement costs in Phoenix and Tucson run above the state norm', competition: 'a healthy number of national carriers compete for renters business' },
    AR: { weather: 'tornado and severe-storm exposure runs across much of the state', claims: 'claims are mostly weather-driven, with litigation less of a factor', replacement: 'replacement costs are modest', competition: 'plenty of national insurers compete, keeping quotes near the national average' },
    CA: { weather: 'wildfire risk is a growing concern, while flood and earthquake damage sit outside standard policies', claims: 'claim frequency is relatively low and litigation is a smaller factor than in many states', replacement: 'replacement costs are among the highest in the country, especially in coastal metros', competition: 'a deep, competitive carrier market keeps pricing in check' },
    CO: { weather: 'hail, wildfires, and winter storms all contribute to loss patterns', claims: 'claim frequency runs moderate, with hailstorms the most common trigger', replacement: 'replacement values along the Front Range are above the national norm', competition: 'many carriers compete, especially in the Denver market' },
    CT: { weather: 'winter storms and coastal nor\'easters create seasonal claim risk', claims: 'claim frequency is low and the litigation climate is comparatively mild', replacement: 'replacement costs run above average in the New York metro orbit', competition: 'a competitive regional and national carrier market keeps rates near the national average' },
    DE: { weather: 'coastal storms and nor\'easters are the main weather exposure', claims: 'claim frequency is low', replacement: 'replacement costs sit close to the mid-Atlantic norm', competition: 'the small market size means a handful of carriers dominate pricing' },
    DC: { weather: 'winter storms and occasional coastal weather events shape claim patterns', claims: 'claim frequency is low and disputes are uncommon', replacement: 'replacement costs are high because the metro is one of the most expensive in the country', competition: 'a competitive carrier market keeps prices below what the high cost of living might suggest' },
    FL: { weather: 'hurricane exposure is the defining risk, and storm claims can be severe when they occur', claims: 'the state has a reputation for higher claim frequency and litigation, which raises costs for everyone', replacement: 'replacement costs in coastal metros are elevated', competition: 'a crowded carrier market competes hard, but weather and legal costs push the average up' },
    GA: { weather: 'severe storms and hurricane spillover from the coast shape claim patterns', claims: 'claim frequency is moderate, with litigation a modest factor', replacement: 'replacement costs are moderate, with Atlanta above the state norm', competition: 'many carriers compete for Atlanta-area renters' },
    HI: { weather: 'hurricane and volcanic hazards are the state\'s headline exposures', claims: 'claim frequency is low given the limited number of renters policies', replacement: 'replacement costs are among the highest in the country because most goods are shipped in', competition: 'a thin carrier market with limited competition keeps the average below the national baseline' },
    ID: { weather: 'wildfire season and winter storms are the main concerns', claims: 'claim frequency is low and litigation is rare', replacement: 'replacement costs are modest outside the Boise metro', competition: 'limited carrier competition in a smaller market keeps quotes low' },
    IL: { weather: 'severe storms, hail, and winter weather drive claims', claims: 'claim frequency runs moderate, with litigation concentrated in the Chicago area', replacement: 'replacement costs in Chicago are above the state average', competition: 'a large competitive market with many national and regional carriers' },
    IN: { weather: 'tornado and severe-storm exposure is present across the state', claims: 'claim frequency is moderate and litigation is not a major driver', replacement: 'replacement costs are moderate', competition: 'steady carrier competition keeps prices near the national average' },
    IA: { weather: 'tornadoes, hail, and severe storms are the main claim triggers', claims: 'claim frequency is moderate, mostly weather-driven', replacement: 'replacement costs are modest', competition: 'a competitive regional carrier market keeps rates below average' },
    KS: { weather: 'the state sits in severe-weather territory, with hail and tornadoes common', claims: 'weather claims dominate and litigation is a smaller factor', replacement: 'replacement costs are moderate', competition: 'many carriers compete, keeping the average close to the national figure' },
    KY: { weather: 'severe storms and flooding are the main weather exposures', claims: 'claim frequency is moderate', replacement: 'replacement costs are modest', competition: 'good carrier competition keeps rates below the national average' },
    LA: { weather: 'hurricane and flood exposure is among the highest in the country', claims: 'the state is known for higher claim frequency and litigation, which pushes premiums up', replacement: 'replacement costs in New Orleans and the coastal market are elevated', competition: 'some carriers limit exposure in the state, which reduces competition and raises prices' },
    ME: { weather: 'winter storms and cold are the main claim drivers', claims: 'claim frequency is low', replacement: 'replacement costs are moderate', competition: 'a small but stable carrier market keeps the average among the lowest in the country' },
    MD: { weather: 'coastal storms, nor\'easters, and winter weather shape claims', claims: 'claim frequency is low to moderate', replacement: 'replacement costs near Washington, DC and Baltimore are above the state norm', competition: 'a competitive mid-Atlantic carrier market keeps prices below the national average' },
    MA: { weather: 'winter storms and nor\'easters are the primary weather risk', claims: 'claim frequency is low', replacement: 'replacement costs are among the highest in the country, especially around Boston', competition: 'strong carrier competition keeps the average close to the national figure despite high costs' },
    MI: { weather: 'winter weather and severe storms are the main claim triggers', claims: 'claim frequency is moderate', replacement: 'replacement costs are moderate', competition: 'a competitive carrier market keeps rates below the national average' },
    MN: { weather: 'hail, winter storms, and severe weather drive claims', claims: 'claim frequency is moderate and litigation is less of a factor', replacement: 'replacement costs in the Twin Cities run above the state norm', competition: 'many carriers compete in the upper Midwest market' },
    MS: { weather: 'hurricanes, tornadoes, and severe storms are all part of the risk profile', claims: 'higher claim frequency and a more active litigation climate push costs up', replacement: 'replacement costs are low, which offsets some of the pressure', competition: 'some carriers limit Gulf exposure, which reduces competition and helps explain one of the highest averages in the country' },
    MO: { weather: 'tornadoes, hail, and severe storms are common', claims: 'weather-driven claims dominate', replacement: 'replacement costs are moderate', competition: 'solid carrier competition keeps rates close to the national average' },
    MT: { weather: 'winter storms and wildfire season are the main concerns', claims: 'claim frequency is low', replacement: 'replacement costs are moderate', competition: 'a thin carrier market keeps the average below the national figure' },
    NE: { weather: 'severe storms, hail, and winter weather are common', claims: 'claim frequency is moderate, mostly weather-driven', replacement: 'replacement costs are modest', competition: 'a competitive carrier market keeps rates near the national average' },
    NV: { weather: 'wildfire risk near the urban fringe and occasional winter storms shape losses', claims: 'claim frequency is moderate, with litigation concentrated in the Las Vegas area', replacement: 'replacement costs in Las Vegas and Reno run above the state norm', competition: 'many national carriers compete in the state' },
    NH: { weather: 'winter storms are the main weather exposure', claims: 'claim frequency is low and litigation is rare', replacement: 'replacement costs are moderate', competition: 'a small, stable carrier market keeps the average among the lowest in the country' },
    NJ: { weather: 'coastal storms and nor\'easters are the headline weather risk', claims: 'claim frequency is moderate, with litigation more common in the metro counties', replacement: 'replacement costs in the New York metro are high', competition: 'a deep competitive carrier market keeps the average below the national figure' },
    NM: { weather: 'wildfire and severe-weather events shape the claim profile', claims: 'claim frequency is low to moderate', replacement: 'replacement costs are moderate', competition: 'a modest carrier market with moderate competition keeps rates near the national average' },
    NY: { weather: 'winter storms and coastal weather are the main exposures', claims: 'claim frequency is moderate, and litigation is more common in New York City', replacement: 'replacement costs in the city and surrounding metro are among the highest in the country', competition: 'a very competitive carrier market moderates the average' },
    NC: { weather: 'hurricane and severe-storm risk increases toward the coast', claims: 'claim frequency is moderate', replacement: 'replacement costs are moderate, with the metro areas above the state norm', competition: 'a growing, competitive insurance market keeps the average below the national figure' },
    ND: { weather: 'severe winter weather and occasional hail shape claims', claims: 'claim frequency is low', replacement: 'replacement costs are moderate', competition: 'a thin carrier market keeps the average below the national baseline' },
    OH: { weather: 'severe storms and winter weather are the main triggers', claims: 'claim frequency is moderate', replacement: 'replacement costs are moderate', competition: 'a highly competitive carrier market keeps the average well below the national figure' },
    OK: { weather: 'the state is among the most severe-weather exposed in the country, with tornadoes and hail common', claims: 'weather claims and a more active litigation climate push costs up', replacement: 'replacement costs are moderate', competition: 'competition softens some of the weather-driven pressure, but the average still runs high' },
    OR: { weather: 'wildfire risk, winter storms, and coastal weather all play a role', claims: 'claim frequency is low', replacement: 'replacement costs in the Portland metro are above the state norm', competition: 'a competitive west-coast carrier market keeps the average below the national figure' },
    PA: { weather: 'winter storms and severe weather are the main exposures', claims: 'claim frequency is moderate, with litigation a factor in the Philadelphia metro', replacement: 'replacement costs are moderate overall, and higher in the metros', competition: 'many carriers compete, keeping the average below the national figure' },
    RI: { weather: 'nor\'easters and winter storms are the primary weather risk', claims: 'claim frequency is low', replacement: 'replacement costs are moderate to high', competition: 'a small carrier market keeps the average right at the national figure' },
    SC: { weather: 'hurricane and severe-storm exposure is significant, especially near the coast', claims: 'claim frequency is moderate', replacement: 'replacement costs are moderate', competition: 'a competitive southeast carrier market keeps the average below the national figure' },
    SD: { weather: 'severe storms, hail, and winter weather are common', claims: 'claim frequency is moderate, mostly weather-driven', replacement: 'replacement costs are modest', competition: 'a thin carrier market keeps the average near the national figure' },
    TN: { weather: 'severe storms and tornadoes are the main claim triggers', claims: 'claim frequency is moderate', replacement: 'replacement costs are moderate, and higher in Nashville', competition: 'steady carrier competition keeps the average below the national figure' },
    TX: { weather: 'the state\'s size means hail, tornadoes, hurricanes, and winter freezes all drive claims', claims: 'claim frequency and litigation are both elevated, which pushes costs up across the board', replacement: 'replacement costs vary widely but run high in the major metros', competition: 'a huge carrier market competes hard, yet the average is the highest in the country' },
    UT: { weather: 'winter storms and wildfire risk near the Wasatch Front shape losses', claims: 'claim frequency is low', replacement: 'replacement costs are moderate', competition: 'a growing carrier market keeps the average well below the national figure' },
    VT: { weather: 'winter storms and cold are the main exposures', claims: 'claim frequency is low', replacement: 'replacement costs are moderate', competition: 'a small carrier market keeps the average among the lowest in the country' },
    VA: { weather: 'hurricane spillover, coastal storms, and winter weather all contribute', claims: 'claim frequency is moderate', replacement: 'replacement costs near Washington, DC are elevated', competition: 'a competitive mid-Atlantic market keeps the average near the national figure' },
    WA: { weather: 'wildfire season, winter storms, and coastal weather shape claims', claims: 'claim frequency is low', replacement: 'replacement costs in the Seattle metro run above the state norm', competition: 'many carriers compete, keeping the average below the national figure' },
    WV: { weather: 'flooding and severe storms are the main weather exposures', claims: 'claim frequency is moderate', replacement: 'replacement costs are modest', competition: 'a limited carrier market keeps the average below the national figure' },
    WI: { weather: 'winter storms, hail, and severe weather drive claims', claims: 'claim frequency is moderate', replacement: 'replacement costs are modest to moderate', competition: 'a strong regional carrier market keeps the average well below the national figure' },
    WY: { weather: 'winter storms and wildfire risk are the main exposures', claims: 'claim frequency is low', replacement: 'replacement costs are moderate', competition: 'a thin carrier market keeps the average among the lowest in the country' },
};

function esc(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function humanizeSlug(slug) {
    return String(slug || '')
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function loadJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function slugForCity(city, state) {
    return `${city.toLowerCase().replace(/\s+/g, '-')}-${state.toLowerCase()}`;
}

function programmaticUrl(section, slug) {
    if (!section) {
        return 'https://www.legacyinvestingshow.com/programmatic-pages';
    }
    return `https://www.legacyinvestingshow.com/programmatic-pages/${section}/${slug}`;
}

function renderHeader(activeHref) {
    return `<header class="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
    <nav class="container-custom" aria-label="Main navigation">
        <div class="flex items-center justify-between gap-4 min-h-[4rem] py-3">
            <a href="/" class="flex items-center gap-2 font-medium text-gray-900 hover:text-gray-700 transition-colors">
                <img src="/assets/images/logo.png" alt="Legacy Investing Show logo" width="28" height="28" class="w-7 h-7">
                <span>Legacy Investing Show</span>
            </a>
            <div class="hidden lg:flex items-center gap-4">
                ${renderPrimaryNavLinks(activeHref)}
            </div>
        </div>
        <div class="lg:hidden flex flex-wrap gap-3 pb-3 text-sm">
            ${renderPrimaryNavLinks(activeHref)}
        </div>
    </nav>
</header>`;
}

function renderFooter() {
    return `<footer class="bg-gray-900 text-white py-12">
    <div class="container-custom grid gap-10 md:grid-cols-3">
        <div>
            <h2 class="text-lg font-semibold mb-3">Legacy Investing Show</h2>
            <p class="text-gray-400 text-sm leading-7">Educational planning frameworks for tax, real estate, retirement, and wealth decisions.</p>
        </div>
        <div>
            <h2 class="text-lg font-semibold mb-3">Resources</h2>
            <div class="grid gap-2 text-sm text-gray-300">
                ${renderFooterLinks()}
            </div>
        </div>
        <div>
            <h2 class="text-lg font-semibold mb-3">Next Steps</h2>
            <div class="grid gap-2 text-sm text-gray-300">
                <a href="/programs">Programs</a>
                <a href="/success-stories">Success Stories</a>
                <a href="/about">About Preston Seo</a>
            </div>
        </div>
    </div>
    <div class="container-custom border-t border-gray-800 mt-8 pt-8 text-sm text-gray-400">
        <p>&copy; ${CURRENT_YEAR} Legacy Investing Show. Educational content only. Verify tax decisions with a qualified advisor.</p>
    </div>
</footer>`;
}

function renderStyles() {
    return `<style>
        .programmatic-main {
            padding-top: 5rem;
        }
        .programmatic-hero {
            padding: 4.5rem 0 3rem;
            background:
                radial-gradient(circle at top right, rgba(5, 150, 105, 0.18), transparent 28%),
                linear-gradient(180deg, #ecfdf5 0%, #ffffff 100%);
        }
        .eyebrow {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.4rem 0.8rem;
            border-radius: 999px;
            background: rgba(5, 150, 105, 0.08);
            color: #047857;
            font-size: 0.75rem;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }
        .eyebrow::before {
            content: "";
            width: 0.5rem;
            height: 0.5rem;
            border-radius: 999px;
            background: #10b981;
        }
        .hero-title {
            margin-top: 1rem;
            font-size: clamp(2.1rem, 5vw, 4rem);
            line-height: 1.02;
            letter-spacing: -0.04em;
            color: #111827;
            max-width: 14ch;
        }
        .hero-copy {
            margin-top: 1rem;
            max-width: 48rem;
            color: #4b5563;
            font-size: 1.05rem;
            line-height: 1.75;
        }
        .hero-grid,
        .section-grid,
        .card-grid,
        .faq-grid {
            display: grid;
            gap: 1.5rem;
        }
        .hero-grid {
            grid-template-columns: 1.8fr 1fr;
            align-items: start;
        }
        .section-grid {
            grid-template-columns: 1.35fr 1fr;
            align-items: start;
        }
        .surface,
        .info-card,
        .stack-card,
        .faq-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 1rem;
            box-shadow: 0 12px 30px rgba(15, 23, 42, 0.04);
        }
        .surface {
            padding: 1.5rem;
        }
        .hero-panel {
            padding: 1.4rem;
            background: rgba(255, 255, 255, 0.84);
            border: 1px solid rgba(16, 185, 129, 0.18);
            border-radius: 1rem;
            box-shadow: 0 12px 30px rgba(16, 185, 129, 0.08);
        }
        .hero-panel h2 {
            font-size: 0.95rem;
            font-weight: 700;
            color: #111827;
            margin-bottom: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.06em;
        }
        .hero-panel p,
        .hero-panel li {
            color: #4b5563;
            line-height: 1.7;
            font-size: 0.95rem;
        }
        .hero-panel ul,
        .checklist,
        .bullet-list {
            margin: 0;
            padding-left: 1.1rem;
        }
        .section {
            padding: 3.5rem 0;
        }
        .section--alt {
            background: #f8fafc;
        }
        .section-title {
            font-size: clamp(1.6rem, 3vw, 2.25rem);
            line-height: 1.1;
            color: #111827;
            letter-spacing: -0.03em;
            margin-bottom: 1rem;
        }
        .section-copy,
        .surface p,
        .info-card p,
        .stack-card p,
        .faq-card p {
            color: #4b5563;
            line-height: 1.8;
        }
        .meta-strip {
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem;
            margin-top: 1.5rem;
        }
        .meta-pill {
            padding: 0.6rem 0.85rem;
            border-radius: 999px;
            background: #f3f4f6;
            color: #374151;
            font-size: 0.875rem;
            font-weight: 600;
        }
        .card-grid {
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        }
        .info-card,
        .stack-card,
        .faq-card {
            padding: 1.25rem;
        }
        .info-card h3,
        .stack-card h3,
        .faq-card h3 {
            font-size: 1.05rem;
            color: #111827;
            margin-bottom: 0.65rem;
        }
        .stack-card__index {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 2rem;
            height: 2rem;
            border-radius: 999px;
            background: #dcfce7;
            color: #047857;
            font-size: 0.85rem;
            font-weight: 700;
            margin-bottom: 0.85rem;
        }
        .stack-card__link,
        .inline-link {
            color: #047857;
            font-weight: 700;
            text-decoration: none;
        }
        .stack-card__link:hover,
        .inline-link:hover {
            text-decoration: underline;
        }
        .comparison-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 1rem;
            overflow: hidden;
            border: 1px solid #e5e7eb;
        }
        .comparison-table th,
        .comparison-table td {
            padding: 1rem;
            text-align: left;
            vertical-align: top;
            border-bottom: 1px solid #e5e7eb;
        }
        .comparison-table th {
            background: #111827;
            color: white;
            font-size: 0.875rem;
            letter-spacing: 0.03em;
            text-transform: uppercase;
        }
        .comparison-table tr:nth-child(even) td {
            background: #f8fafc;
        }
        .cta-box {
            padding: 2rem;
            border-radius: 1.25rem;
            background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
            color: white;
        }
        .cta-box p {
            color: #d1d5db;
            line-height: 1.8;
        }
        .cta-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 0.85rem;
            margin-top: 1.25rem;
        }
        .cta-button,
        .ghost-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0.9rem 1.25rem;
            border-radius: 999px;
            text-decoration: none;
            font-weight: 700;
        }
        .cta-button {
            background: #10b981;
            color: white;
        }
        .ghost-button {
            background: rgba(255, 255, 255, 0.08);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.18);
        }
        .resource-list,
        .hub-list {
            display: grid;
            gap: 0.9rem;
            margin-top: 1.25rem;
        }
        .resource-list a,
        .hub-list a {
            display: block;
            padding: 1rem 1.1rem;
            border-radius: 0.9rem;
            border: 1px solid #e5e7eb;
            background: white;
            color: #111827;
            text-decoration: none;
            box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
        }
        .resource-list strong,
        .hub-list strong {
            display: block;
            margin-bottom: 0.3rem;
        }
        .resource-list span,
        .hub-list span {
            color: #4b5563;
            font-size: 0.95rem;
            line-height: 1.65;
        }
        .hub-list {
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        }
        @media (max-width: 1024px) {
            .hero-grid,
            .section-grid {
                grid-template-columns: 1fr;
            }
            .hero-title {
                max-width: none;
            }
        }
    </style>`;
}

function renderHead(config) {
    const {
        title,
        description,
        canonical,
        keywords,
        schemaBlocks,
        image = 'https://www.legacyinvestingshow.com/assets/images/logo.png',
        type = 'article',
    } = config;

    return `<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(title)} | Legacy Investing Show</title>
    <meta name="description" content="${esc(description)}">
    <meta name="keywords" content="${esc(keywords)}">
    <meta name="author" content="Preston Seo">
    <meta name="robots" content="index, follow">
${GOOGLE_SITE_VERIFICATIONS.map((code) => `    <meta name="google-site-verification" content="${code}">`).join('\n')}
    <link rel="canonical" href="${esc(canonical)}">

    <meta property="og:type" content="${esc(type)}">
    <meta property="og:url" content="${esc(canonical)}">
    <meta property="og:title" content="${esc(title)} | Legacy Investing Show">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:image" content="${esc(image)}">
    <meta property="og:site_name" content="Legacy Investing Show">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(title)} | Legacy Investing Show">
    <meta name="twitter:description" content="${esc(description)}">
    <meta name="twitter:image" content="${esc(image)}">

    <meta name="theme-color" content="#ffffff">
    <link rel="icon" type="image/png" href="/assets/images/logo.png">
    <link rel="stylesheet" href="/assets/css/styles.css">
    ${renderAnalyticsHead({ gaTrackingId: GA_TRACKING_ID, gtmContainerId: GTM_CONTAINER_ID })}
    ${renderStyles()}
${schemaBlocks.map((schema) => `    <script type="application/ld+json">${JSON.stringify(schema)}</script>`).join('\n')}
</head>`;
}

function renderLayout(page) {
    return `<!DOCTYPE html>
<html lang="en">
${renderHead(page)}
<body class="bg-white text-gray-900" data-page-type="${esc(page.pageType)}" data-page-title="${esc(page.title)}">
    ${renderAnalyticsBody({ gtmContainerId: GTM_CONTAINER_ID })}
    <a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-gray-900 text-white px-4 py-2 z-50">Skip to main content</a>
    ${renderHeader(page.activeHref || '/tax-strategies')}
    <main id="main" class="programmatic-main">
        ${page.body}
    </main>
    ${renderFooter()}
</body>
</html>`;
}

function breadcrumbSchema(items) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: item.item,
        })),
    };
}

function articleSchema(title, description, canonical, keywords) {
    return {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: title,
        description,
        datePublished: new Date().toISOString().split('T')[0],
        dateModified: new Date().toISOString().split('T')[0],
        isAccessibleForFree: true,
        mainEntityOfPage: canonical,
        author: {
            '@type': 'Person',
            name: 'Preston Seo',
            url: 'https://www.legacyinvestingshow.com/about',
        },
        publisher: {
            '@type': 'Organization',
            name: 'Legacy Investing Show',
            url: 'https://www.legacyinvestingshow.com',
        },
        keywords,
    };
}

function faqSchema(items) {
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: items.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: item.answer,
            },
        })),
    };
}

function collectionSchema(name, description, canonical, entries) {
    return {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name,
        description,
        url: canonical,
        mainEntity: {
            '@type': 'ItemList',
            itemListElement: entries.map((entry, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: entry.name,
                url: entry.url,
            })),
        },
    };
}

function normalizeStrategySlug(slug) {
    if (slug === 'health-savings-account-strategy') {
        return 'hsa-strategy';
    }
    return slug;
}

function buildStrategyMap() {
    const data = loadJson(TAX_STRATEGIES_PATH).strategies;
    return new Map(
        data.map((strategy) => [
            strategy.slug,
            {
                href: `/tax-strategies/${strategy.slug}`,
                title: strategy.title,
                description: strategy.shortDescription,
                benefitsFor: strategy.benefitsFor || [],
                bestFor: strategy.bestFor || '',
                potentialSavings: strategy.potentialSavings || '',
                complexity: strategy.complexity || '',
            },
        ])
    );
}

function resolveResource(resource, strategyMap) {
    if (typeof resource === 'object' && resource && resource.href) {
        return resource;
    }

    const slug = normalizeStrategySlug(resource);
    const existing = strategyMap.get(slug);
    if (existing) {
        return existing;
    }

    return {
        href: `/tax-strategies/${slug}`,
        title: humanizeSlug(slug),
        description: 'Explore the core planning considerations, tradeoffs, and implementation questions for this strategy.',
    };
}

function cityResourcePlan(cityContext) {
    const base = ['cost-segregation', 'bonus-depreciation', '1031-exchange'];
    const tourismBlend = ['short-term-rental-loophole', 'real-estate-professional-status'];
    const businessBlend = ['s-corp-strategy', 'qualified-business-income-deduction'];

    if (/theme parks|beach|nightlife|music|tourism|cruise|event/i.test(cityContext.summary + ' ' + cityContext.demandDrivers.join(' '))) {
        return [...tourismBlend, ...base];
    }

    if (/business|medical|tech|banking|airport|corporate/i.test(cityContext.summary + ' ' + cityContext.demandDrivers.join(' '))) {
        return [...base, ...businessBlend];
    }

    return [...base, 'short-term-rental-loophole', 's-corp-strategy'];
}

function renderResourceCards(resources, strategyMap, reasons) {
    return resources
        .map((resource, index) => {
            const resolved = resolveResource(resource, strategyMap);
            const reason = reasons[index] || resolved.description;
            return `<article class="stack-card">
                <div class="stack-card__index">0${index + 1}</div>
                <h3>${esc(resolved.title)}</h3>
                <p>${esc(reason)}</p>
                <a class="stack-card__link" href="${esc(resolved.href)}">Open resource</a>
            </article>`;
        })
        .join('');
}

function renderList(items, className) {
    return `<ul class="${className}">${items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`;
}

function buildCityFaqs(cityData, cityContext) {
    return [
        {
            question: `What usually matters more in ${cityData.city}: tax strategy or operations?`,
            answer: `${cityData.city} usually rewards operators who get both right. A deduction can improve after-tax results, but weak underwriting, loose recordkeeping, or ignoring local rules can erase the benefit quickly.`,
        },
        {
            question: `How should investors think about ${cityData.city} demand in a tax plan?`,
            answer: `Treat demand as a volatility input, not as a guarantee. Use peak periods to understand upside, but build the tax plan around a base case you can still defend if occupancy softens.`,
        },
        {
            question: `What records should a ${cityData.city} operator keep before filing?`,
            answer: `Keep a property-level file with purchase documents, repair records, cleaner and vendor invoices, stay-length data, mileage or time logs where relevant, and any local compliance documents that support the operating model.`,
        },
    ];
}

function renderCityPage(cityData, strategyMap) {
    const slug = slugForCity(cityData.city, cityData.state);
    const cityContext = CITY_CONTEXT[slug];
    const stateContext = STATE_CONTEXT[cityData.state];
    if (!cityContext || !stateContext) {
        throw new Error(`Missing city or state context for ${slug}`);
    }

    const title = `${cityData.city}, ${cityData.state} Tax Strategy Guide for Investors and Operators`;
    const description = `A practical tax-planning guide for ${cityData.city} operators: market context, deduction priorities, documentation habits, and the mistakes that usually break the model.`;
    const canonical = programmaticUrl('cities', slug);
    const resources = cityResourcePlan(cityContext);
    const resourceReasons = [
        `Use ${resolveResource(resources[0], strategyMap).title.toLowerCase()} when the property profile and hold period actually support it in ${cityData.city}.`,
        `Use ${resolveResource(resources[1], strategyMap).title.toLowerCase()} only after you understand what qualifies and how the deduction changes real cash flow.`,
        `Keep ${resolveResource(resources[2], strategyMap).title.toLowerCase()} in view if your exit plan matters as much as your current-year deduction.`,
        `In ${cityData.city}, this strategy matters when the operating model fits the stay-length and participation facts, not just the platform you use.`,
        `This becomes useful if your day-to-day role, documentation, and long-term operating plan can actually support it.`,
    ];
    const nearbyCities = loadJson(CITIES_PATH).cities
        .filter((entry) => entry.region === cityData.region && entry.city !== cityData.city)
        .map((entry) => ({
            name: `${entry.city}, ${entry.state}`,
            href: `/programmatic-pages/cities/${slugForCity(entry.city, entry.state)}`,
            description: `See how the planning lens shifts in ${entry.city} with a different demand mix and operator profile.`,
        }));
    const faqItems = buildCityFaqs(cityData, cityContext);
    const body = `<section class="programmatic-hero">
    <div class="container-custom hero-grid">
        <div>
            <span class="eyebrow">${esc(cityData.region)} market guide</span>
            <h1 class="hero-title">${esc(title)}</h1>
            <p class="hero-copy">${esc(cityContext.summary)} ${esc(cityContext.bestFit)}</p>
            <div class="meta-strip">
                <span class="meta-pill">${esc(cityData.notes)}</span>
                <span class="meta-pill">Priority market ${esc(cityData.priority)}</span>
                <span class="meta-pill">Operator lens: tax + execution</span>
            </div>
        </div>
        <aside class="hero-panel">
            <h2>What this page helps you decide</h2>
            <p>${esc(stateContext.taxLens)}</p>
            ${renderList(cityContext.demandDrivers, 'bullet-list')}
        </aside>
    </div>
</section>

<section class="section">
    <div class="container-custom section-grid">
        <div class="surface">
            <h2 class="section-title">What makes ${esc(cityData.city)} different</h2>
            <p>${esc(cityContext.summary)}</p>
            <p>${esc(stateContext.executionFocus)}</p>
            <p>Use this page as a market-specific filter: decide whether the demand drivers, local friction, and documentation burden fit the strategy stack you want to use.</p>
        </div>
        <div class="surface">
            <h2 class="section-title">Execution checklist</h2>
            ${renderList(stateContext.checklist, 'checklist')}
        </div>
    </div>
</section>

<section class="section section--alt">
    <div class="container-custom">
        <h2 class="section-title">Recommended strategy stack for ${esc(cityData.city)}</h2>
        <p class="section-copy">These are not ranked by hype. They are ranked by how often they matter once you combine the market profile, the likely operator type, and the amount of documentation required to defend the move.</p>
        <div class="card-grid">
            ${renderResourceCards(resources, strategyMap, resourceReasons)}
        </div>
    </div>
</section>

<section class="section">
    <div class="container-custom section-grid">
        <div class="surface">
            <h2 class="section-title">Where investors usually get hurt</h2>
            ${renderList(cityContext.watchouts, 'bullet-list')}
            <p style="margin-top:1rem;">The goal is not to avoid tax strategy. The goal is to avoid using tax strategy as a substitute for underwriting, local rule review, or operator discipline.</p>
        </div>
        <div class="surface">
            <h2 class="section-title">What to do in the next 90 days</h2>
            <ol class="checklist">
                <li>Write the base-case occupancy and rate assumptions for ${esc(cityData.city)} without using peak periods as the baseline.</li>
                <li>Choose the one deduction or entity question that actually changes your next decision.</li>
                <li>Build the audit file now: receipts, vendor records, local compliance notes, and property-level bookkeeping.</li>
                <li>Review the plan with a CPA only after the operating facts are assembled cleanly.</li>
            </ol>
        </div>
    </div>
</section>

<section class="section section--alt">
    <div class="container-custom">
        <h2 class="section-title">Related city and strategy resources</h2>
        <div class="hub-list">
            ${nearbyCities.map((entry) => `<a href="${esc(entry.href)}"><strong>${esc(entry.name)}</strong><span>${esc(entry.description)}</span></a>`).join('')}
            <a href="/tax-strategies"><strong>Tax Strategies Hub</strong><span>Review the main strategy library before you choose a city-specific angle.</span></a>
            <a href="/blog"><strong>Blog and case studies</strong><span>See how operators and investors apply these decisions in real scenarios.</span></a>
        </div>
    </div>
</section>

<section class="section">
    <div class="container-custom">
        <h2 class="section-title">Questions people ask before filing</h2>
        <div class="faq-grid">
            ${faqItems.map((item) => `<article class="faq-card"><h3>${esc(item.question)}</h3><p>${esc(item.answer)}</p></article>`).join('')}
        </div>
    </div>
</section>

<section class="section">
    <div class="container-custom">
        <div class="cta-box">
            <h2 class="section-title" style="color:white;">Need a city-specific second opinion?</h2>
            <p>Use this market lens to narrow the real questions first, then take the final structure, participation, and filing questions to an advisor who can review your facts.</p>
            <div class="cta-actions">
                <a class="cta-button" href="/programs">See programs</a>
                <a class="ghost-button" href="/tax-strategies">Open tax strategy hub</a>
            </div>
        </div>
    </div>
</section>`;

    const page = renderLayout({
        title,
        description,
        canonical,
        keywords: `${cityData.city} tax strategy, ${cityData.state} investors, ${cityData.city} short-term rental taxes, ${cityData.city} real estate tax planning`,
        schemaBlocks: [
            articleSchema(title, description, canonical, `${cityData.city}, ${cityData.state}, tax planning, real estate, operators`),
            breadcrumbSchema([
                { name: 'Home', item: 'https://www.legacyinvestingshow.com/' },
                { name: 'Programmatic Pages', item: programmaticUrl('', '') },
                { name: `${cityData.city}, ${cityData.state}`, item: canonical },
            ]),
            faqSchema(faqItems),
        ],
        pageType: 'programmatic_city',
        body,
    });

    fs.writeFileSync(path.join(OUTPUT_DIR, 'cities', `${slug}.html`), page);
}

function renderPersonaPage(persona, strategyMap) {
    const title = persona.title;
    const description = persona.description;
    const canonical = programmaticUrl('personas', persona.slug);
    const faqItems = [
        {
            question: `How is this page different from the core ${persona.slug.replace(/-/g, ' ')} strategy page?`,
            answer: 'This page is a sequencing and execution lens. It helps you decide what to do first, what to ignore, and what records need to exist before the higher-level strategy list becomes useful.',
        },
        {
            question: 'Should you use every strategy shown here in the same year?',
            answer: 'No. The point is to narrow the next one or two decisions that materially change your position. More strategies do not automatically mean a better return or a cleaner filing.',
        },
        {
            question: 'What is the fastest way to improve the quality of a tax plan?',
            answer: 'Tighten the facts first: bookkeeping, reimbursement records, hold period assumptions, payroll reality, and clean supporting documents. Most bad tax plans fail there before they fail on the statute.',
        },
    ];
    const body = `<section class="programmatic-hero">
    <div class="container-custom hero-grid">
        <div>
            <span class="eyebrow">Decision workflow</span>
            <h1 class="hero-title">${esc(title)}</h1>
            <p class="hero-copy">${esc(description)}</p>
        </div>
        <aside class="hero-panel">
            <h2>Where this page fits</h2>
            <p>Use this page when the problem is sequencing, not awareness. You already know there are strategies available. The real question is what belongs first, what requires setup, and what will only create noise right now.</p>
        </aside>
    </div>
</section>

<section class="section">
    <div class="container-custom section-grid">
        <div class="surface">
            <h2 class="section-title">Pressure points for this persona</h2>
            ${renderList(persona.pressurePoints, 'bullet-list')}
        </div>
        <div class="surface">
            <h2 class="section-title">The authority page to keep nearby</h2>
            <p>This page is the workflow layer. For the authoritative strategy list and main category framing, keep the core page open too.</p>
            <p><a class="inline-link" href="${esc(persona.authorityHref)}">${esc(persona.authorityLabel)}</a></p>
        </div>
    </div>
</section>

<section class="section section--alt">
    <div class="container-custom">
        <h2 class="section-title">Recommended resource stack</h2>
        <p class="section-copy">The stack below is intentionally small. The goal is to reduce decision clutter and push you toward the resources that usually change the next move for this persona.</p>
        <div class="card-grid">
            ${renderResourceCards(persona.resources, strategyMap, persona.pressurePoints)}
        </div>
    </div>
</section>

<section class="section">
    <div class="container-custom section-grid">
        <div class="surface">
            <h2 class="section-title">30-day workflow</h2>
            <ol class="checklist">
                ${persona.workflow.map((item) => `<li>${esc(item)}</li>`).join('')}
            </ol>
        </div>
        <div class="surface">
            <h2 class="section-title">What usually goes wrong</h2>
            ${renderList(persona.mistakes, 'bullet-list')}
        </div>
    </div>
</section>

<section class="section section--alt">
    <div class="container-custom">
        <h2 class="section-title">Questions to ask before you escalate complexity</h2>
        <div class="faq-grid">
            ${faqItems.map((item) => `<article class="faq-card"><h3>${esc(item.question)}</h3><p>${esc(item.answer)}</p></article>`).join('')}
        </div>
    </div>
</section>

<section class="section">
    <div class="container-custom">
        <div class="cta-box">
            <h2 class="section-title" style="color:white;">Use this like an operator, not a collector</h2>
            <p>Pick the next move that changes your tax position cleanly, then ignore the rest until your records, cash flow, and advisor bandwidth can support another layer.</p>
            <div class="cta-actions">
                <a class="cta-button" href="${esc(persona.authorityHref)}">Open the core page</a>
                <a class="ghost-button" href="/blog">Read case studies</a>
            </div>
        </div>
    </div>
</section>`;

    const page = renderLayout({
        title,
        description,
        canonical,
        keywords: `${persona.slug.replace(/-/g, ' ')}, tax planning workflow, decision framework, deductions, execution`,
        schemaBlocks: [
            articleSchema(title, description, canonical, `${persona.slug}, tax workflow, decision framework`),
            breadcrumbSchema([
                { name: 'Home', item: 'https://www.legacyinvestingshow.com/' },
                { name: 'Programmatic Pages', item: programmaticUrl('', '') },
                { name: title, item: canonical },
            ]),
            faqSchema(faqItems),
        ],
        pageType: 'programmatic_persona',
        body,
    });

    fs.writeFileSync(path.join(OUTPUT_DIR, 'personas', `${persona.slug}.html`), page);
}

function comparisonRows(a, b) {
    return [
        ['Best when', a.bestFor || 'The asset or operating model clearly matches the rule set.', b.bestFor || 'The structure fits the objective and the paperwork burden is justified.'],
        ['Potential upside', a.potentialSavings || 'Meaningful tax leverage when facts line up.', b.potentialSavings || 'Meaningful tax leverage when facts line up.'],
        ['Complexity', a.complexity || 'Varies by facts and documentation quality.', b.complexity || 'Varies by facts and documentation quality.'],
        ['Execution risk', 'Usually comes from bad assumptions or weak records.', 'Usually comes from bad assumptions or weak records.'],
        ['Professional help', 'Useful when the move changes filing posture or documentation burden materially.', 'Useful when the move changes filing posture or documentation burden materially.'],
    ];
}

function renderComparisonPage(config, strategyMap) {
    const left = resolveResource(config.s1, strategyMap);
    const right = resolveResource(config.s2, strategyMap);
    const canonical = programmaticUrl('comparisons', config.slug);
    const faqItems = [
        {
            question: `Can ${left.title} and ${right.title} ever work together?`,
            answer: 'Sometimes yes, but only when the sequencing is clean and the paperwork burden is manageable. A combination is not automatically better than a cleaner single-path decision.',
        },
        {
            question: 'What should decide the choice first?',
            answer: 'Start with the real-world objective: current-year deduction, exit flexibility, documentation capacity, and hold period. Strategy labels are secondary to those constraints.',
        },
        {
            question: 'What is the most common mistake in comparison pages like this?',
            answer: 'People compare the headlines and skip the operating facts. The right answer usually depends on timing, records, and what you are actually trying to optimize.',
        },
    ];
    const body = `<section class="programmatic-hero">
    <div class="container-custom hero-grid">
        <div>
            <span class="eyebrow">Decision comparison</span>
            <h1 class="hero-title">${esc(config.title)}</h1>
            <p class="hero-copy">${esc(config.description)}</p>
        </div>
        <aside class="hero-panel">
            <h2>Quick take</h2>
            <p>${esc(config.quickTake)}</p>
        </aside>
    </div>
</section>

<section class="section">
    <div class="container-custom">
        <h2 class="section-title">Side-by-side decision frame</h2>
        <div class="surface" style="overflow-x:auto;">
            <table class="comparison-table">
                <thead>
                    <tr>
                        <th>Question</th>
                        <th>${esc(left.title)}</th>
                        <th>${esc(right.title)}</th>
                    </tr>
                </thead>
                <tbody>
                    ${comparisonRows(left, right).map((row) => `<tr><td>${esc(row[0])}</td><td>${esc(row[1])}</td><td>${esc(row[2])}</td></tr>`).join('')}
                </tbody>
            </table>
        </div>
    </div>
</section>

<section class="section section--alt">
    <div class="container-custom section-grid">
        <div class="surface">
            <h2 class="section-title">When ${esc(left.title)} tends to win</h2>
            <p>${esc(left.description || 'It usually wins when the facts directly fit the rules and the strategy supports the underlying business or investment objective.')}</p>
            <p>Use the structure when the operating facts, timeline, and documentation burden all reinforce the decision instead of fighting it.</p>
            <p><a class="inline-link" href="${esc(left.href)}">Open ${esc(left.title)}</a></p>
        </div>
        <div class="surface">
            <h2 class="section-title">When ${esc(right.title)} tends to win</h2>
            <p>${esc(right.description || 'It usually wins when the investor or operator needs a cleaner fit for the actual goal, timing, or recordkeeping capacity.')}</p>
            <p>Use the structure when it solves the real constraint rather than just sounding more advanced.</p>
            <p><a class="inline-link" href="${esc(right.href)}">Open ${esc(right.title)}</a></p>
        </div>
    </div>
</section>

<section class="section">
    <div class="container-custom section-grid">
        <div class="surface">
            <h2 class="section-title">Questions to answer before choosing</h2>
            ${renderList([
                'What is the actual objective: current-year deduction, exit flexibility, audit defensibility, or long-term compounding?',
                'Can the records, advisors, and operator behavior support the more complex option?',
                'Will the strategy still make sense if the market or hold period changes?',
            ], 'bullet-list')}
        </div>
        <div class="surface">
            <h2 class="section-title">Mistakes that create regret</h2>
            ${renderList([
                'Choosing the more complicated option because it sounds more powerful.',
                'Ignoring the time and paperwork needed to defend the choice later.',
                'Letting a tax headline override a weak investment or business thesis.',
            ], 'bullet-list')}
        </div>
    </div>
</section>

<section class="section section--alt">
    <div class="container-custom">
        <h2 class="section-title">FAQ</h2>
        <div class="faq-grid">
            ${faqItems.map((item) => `<article class="faq-card"><h3>${esc(item.question)}</h3><p>${esc(item.answer)}</p></article>`).join('')}
        </div>
    </div>
</section>

<section class="section">
    <div class="container-custom">
        <div class="cta-box">
            <h2 class="section-title" style="color:white;">Still split between the two?</h2>
            <p>Write down the decision objective, the record burden, and the realistic exit or hold period before you ask a CPA to model the numbers. That will usually cut the answer time in half.</p>
            <div class="cta-actions">
                <a class="cta-button" href="${esc(left.href)}">Review ${esc(left.title)}</a>
                <a class="ghost-button" href="${esc(right.href)}">Review ${esc(right.title)}</a>
            </div>
        </div>
    </div>
</section>`;

    const page = renderLayout({
        title: config.title,
        description: config.description,
        canonical,
        keywords: `${config.title}, comparison, tax strategy, decision guide`,
        schemaBlocks: [
            articleSchema(config.title, config.description, canonical, `${config.slug}, comparison, tax planning`),
            breadcrumbSchema([
                { name: 'Home', item: 'https://www.legacyinvestingshow.com/' },
                { name: 'Programmatic Pages', item: programmaticUrl('', '') },
                { name: config.title, item: canonical },
            ]),
            faqSchema(faqItems),
        ],
        pageType: 'programmatic_comparison',
        body,
    });

    fs.writeFileSync(path.join(OUTPUT_DIR, 'comparisons', `${config.slug}.html`), page);
}

function renderIndexPage(cities, personas, comparisons) {
    const canonical = programmaticUrl('', '');
    const title = 'Tax Strategy Resource Maps by City, Persona, and Comparison';
    const description = 'Browse city guides, persona workflows, and side-by-side strategy comparisons to find the next best tax-planning decision without wading through generic boilerplate.';
    const cityEntries = cities.map((city) => ({
        name: `${city.city}, ${city.state}`,
        url: programmaticUrl('cities', slugForCity(city.city, city.state)),
        summary: CITY_CONTEXT[slugForCity(city.city, city.state)].summary,
    }));
    const personaEntries = personas.map((persona) => ({
        name: persona.title,
        url: programmaticUrl('personas', persona.slug),
        summary: persona.description,
    }));
    const comparisonEntries = comparisons.map((comparison) => ({
        name: comparison.title,
        url: programmaticUrl('comparisons', comparison.slug),
        summary: comparison.quickTake,
    }));
    const body = `<section class="programmatic-hero">
    <div class="container-custom hero-grid">
        <div>
            <span class="eyebrow">Resource hub</span>
            <h1 class="hero-title">${esc(title)}</h1>
            <p class="hero-copy">${esc(description)}</p>
        </div>
        <aside class="hero-panel">
            <h2>How to use this hub</h2>
            <p>Start with the filter that matches the decision in front of you:</p>
            ${renderList([
                'Use city guides when market context changes the execution risk.',
                'Use persona pages when the issue is sequencing and fit.',
                'Use comparison pages when two strategies seem plausible and you need a decision frame.',
            ], 'bullet-list')}
        </aside>
    </div>
</section>

<section class="section">
    <div class="container-custom">
        <h2 class="section-title">City guides</h2>
        <div class="hub-list">
            ${cityEntries.map((entry) => `<a href="${esc(entry.url)}"><strong>${esc(entry.name)}</strong><span>${esc(entry.summary)}</span></a>`).join('')}
        </div>
    </div>
</section>

<section class="section section--alt">
    <div class="container-custom">
        <h2 class="section-title">Persona workflows</h2>
        <div class="hub-list">
            ${personaEntries.map((entry) => `<a href="${esc(entry.url)}"><strong>${esc(entry.name)}</strong><span>${esc(entry.summary)}</span></a>`).join('')}
        </div>
    </div>
</section>

<section class="section">
    <div class="container-custom">
        <h2 class="section-title">Comparison pages</h2>
        <div class="hub-list">
            ${comparisonEntries.map((entry) => `<a href="${esc(entry.url)}"><strong>${esc(entry.name)}</strong><span>${esc(entry.summary)}</span></a>`).join('')}
        </div>
    </div>
</section>

<section class="section">
    <div class="container-custom">
        <div class="cta-box">
            <h2 class="section-title" style="color:white;">Want the full core library?</h2>
            <p>This hub narrows decisions. The main strategy library holds the core pages, deeper explanations, and broader category coverage.</p>
            <div class="cta-actions">
                <a class="cta-button" href="/tax-strategies">Open tax strategy hub</a>
                <a class="ghost-button" href="/blog">Open blog</a>
            </div>
        </div>
    </div>
</section>`;

    const page = renderLayout({
        title,
        description,
        canonical,
        keywords: 'tax strategy hub, city tax guides, persona tax planning, strategy comparisons',
        type: 'website',
        schemaBlocks: [
            collectionSchema(title, description, canonical, [...cityEntries, ...personaEntries, ...comparisonEntries]),
            breadcrumbSchema([
                { name: 'Home', item: 'https://www.legacyinvestingshow.com/' },
                { name: 'Programmatic Pages', item: canonical },
            ]),
        ],
        pageType: 'programmatic_hub',
        body,
    });

    fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), page);
}

function slugForStateName(name) {
    return String(name || '').toLowerCase().replace(/\s+/g, '-');
}

function rentersInsuranceUrl(slug) {
    return `https://www.legacyinvestingshow.com/programmatic-pages/insurance/${slug}`;
}

function premiumVsUs(premium, usAverage) {
    const diff = premium - usAverage;
    if (diff === 0) return '$0 (at average)';
    return diff > 0 ? `+$${diff}` : `−$${Math.abs(diff)}`;
}

function premiumProse(premium, usAverage) {
    const diff = premium - usAverage;
    if (diff === 0) return 'at the US average';
    return diff > 0 ? `$${diff} above the US average` : `$${Math.abs(diff)} below the US average`;
}

function renderPremiumTable(rows, usAverage) {
    return `<table class="comparison-table">
        <thead>
            <tr>
                <th>Location</th>
                <th>Average annual premium</th>
                <th>vs US average ($${usAverage})</th>
            </tr>
        </thead>
        <tbody>
            ${rows.map((row) => `<tr${row.highlight ? ' style="background: #ecfdf5;"' : ''}>
                <td>${row.href ? `<a class="inline-link" href="${esc(row.href)}">${esc(row.name)}</a>` : esc(row.name)}</td>
                <td>$${row.premium}</td>
                <td>${esc(row.vs)}</td>
            </tr>`).join('\n            ')}
        </tbody>
    </table>`;
}

function renderInsuranceHubPage(stateEntries, usEntry) {
    const usAverage = usEntry.averageAnnualPremium;
    const canonical = rentersInsuranceUrl('renters-by-state');
    const title = 'Average Renters Insurance Cost by State (2026)';
    const description = 'Compare average renters insurance costs in all 50 states and Washington, DC, against the $170 US average (NAIC 2021 baseline from the Insurance Information Institute).';
    const body = `<section class="programmatic-hero">
    <div class="container-custom hero-grid">
        <div>
            <span class="eyebrow">Insurance research</span>
            <h1 class="hero-title">${esc(title)}</h1>
            <p class="hero-copy">Renters insurance protects your personal property, your liability, and your additional living costs when you rent. The average annual premium in the United States is about $${usAverage}. This page compares every state's average against that baseline so you can see where coverage tends to cost more and where it tends to cost less.</p>
        </div>
        <aside class="hero-panel">
            <h2>How to use this table</h2>
            <p>The figures are state averages, not quotes. Your premium depends on your city, coverage limits, deductible, and claims history.</p>
            ${renderList([
                'Find your state in the table and read its average annual premium.',
                'Check the column that compares each state with the $' + usAverage + ' US average.',
                'Open your state page to see how nearby states compare.',
            ], 'bullet-list')}
        </aside>
    </div>
</section>

<section class="section">
    <div class="container-custom">
        <h2 class="section-title">Average renters insurance cost by state</h2>
        <p class="section-copy">Sorted alphabetically. A minus sign means the state's average is below the US average; a plus sign means it is above.</p>
        <div style="margin-top: 1.5rem;">
            ${renderPremiumTable([
                { name: 'United States (national average)', premium: usAverage, vs: 'baseline' },
                ...stateEntries.map((entry) => ({
                    name: entry.state,
                    premium: entry.averageAnnualPremium,
                    vs: premiumVsUs(entry.averageAnnualPremium, usAverage),
                    href: `/programmatic-pages/insurance/renters-${slugForStateName(entry.state)}`,
                })),
            ], usAverage)}
        </div>
        <p style="margin-top: 1rem; color: #4b5563; line-height: 1.7;">These are the NAIC 2021 baseline averages published by the Insurance Information Institute. Inflation has pushed 2026 quotes higher, so treat the table as a comparison tool rather than a quote.</p>
    </div>
</section>

<section class="section section--alt">
    <div class="container-custom">
        <h2 class="section-title">What drives renters insurance prices</h2>
        <div class="card-grid">
            <article class="info-card"><h3>Claim frequency and litigation</h3><p>States with more claims, or with a more active litigation climate, tend to have higher average premiums.</p></article>
            <article class="info-card"><h3>Replacement costs</h3><p>Where it costs more to replace your belongings, insurers charge more for the same coverage.</p></article>
            <article class="info-card"><h3>Weather exposure</h3><p>Hurricanes, tornadoes, hail, wildfires, and winter storms all shape loss patterns and pricing.</p></article>
            <article class="info-card"><h3>Carrier competition</h3><p>States with more competing insurers usually see lower prices; thin markets tend to run higher.</p></article>
        </div>
    </div>
</section>

<section class="section">
    <div class="container-custom">
        <h2 class="section-title">Next steps</h2>
        <div class="hub-list">
            <a href="/tools/renters-insurance-cost"><strong>Renters insurance cost calculator</strong><span>Estimate your own annual premium with your coverage limits, deductible, and location.</span></a>
            <a href="/blog/how-much-is-renters-insurance-cost-guide"><strong>How much is renters insurance?</strong><span>Read the full guide to what renters insurance covers and how premiums are set.</span></a>
            <a href="/tools/categories/insurance-protection"><strong>Insurance and protection tools</strong><span>Browse the rest of the insurance calculator library.</span></a>
        </div>
    </div>
</section>

<section class="section">
    <div class="container-custom">
        <div class="cta-box">
            <h2 class="section-title" style="color:white;">Get a personal estimate</h2>
            <p>State averages are a starting point. Your real quote depends on your address, the coverage you choose, and your claims history.</p>
            <div class="cta-actions">
                <a class="cta-button" href="/tools/renters-insurance-cost">Open the renters insurance calculator</a>
                <a class="ghost-button" href="/blog/how-much-is-renters-insurance-cost-guide">Read the cost guide</a>
            </div>
        </div>
    </div>
</section>`;

    const page = renderLayout({
        title,
        description,
        canonical,
        keywords: 'renters insurance cost by state, average renters insurance by state, renters insurance rates by state, renters insurance comparison',
        type: 'website',
        schemaBlocks: [
            collectionSchema(title, description, canonical, stateEntries.map((entry) => ({
                name: entry.state,
                url: rentersInsuranceUrl(`renters-${slugForStateName(entry.state)}`),
            }))),
            breadcrumbSchema([
                { name: 'Home', item: 'https://www.legacyinvestingshow.com/' },
                { name: 'Renters insurance cost by state', item: canonical },
            ]),
        ],
        pageType: 'programmatic_renters_hub',
        activeHref: '/tools',
        body,
    });

    fs.writeFileSync(path.join(OUTPUT_DIR, 'insurance', 'renters-by-state.html'), page);
}

function renderRentersStatePage(entry, entriesByAbbr, usEntry) {
    const usAverage = usEntry.averageAnnualPremium;
    const name = entry.state;
    const slug = `renters-${slugForStateName(name)}`;
    const title = `Renters Insurance Cost in ${name} (2026 Average)`;
    const canonical = rentersInsuranceUrl(slug);
    const context = RENTERS_STATE_CONTEXT[entry.abbreviation];
    const neighbors = (RENTERS_NEIGHBORS[entry.abbreviation] || [])
        .map((abbr) => entriesByAbbr.get(abbr))
        .filter(Boolean);
    const diff = entry.averageAnnualPremium - usAverage;
    const diffPhrase = diff === 0
        ? 'equal to'
        : diff > 0
            ? `about $${diff} more than`
            : `about $${Math.abs(diff)} less than`;
    const description = `${name} renters insurance averages about $${entry.averageAnnualPremium} a year (NAIC 2021) — ${premiumProse(entry.averageAnnualPremium, usAverage)}. Estimate your own quote.`;
    const intro = `${name} renters paid about $${entry.averageAnnualPremium} a year on average in the NAIC 2021 baseline, ${diffPhrase} the $${usAverage} US average.`;
    const body = `<section class="programmatic-hero">
    <div class="container-custom hero-grid">
        <div>
            <span class="eyebrow">Renters insurance by state</span>
            <h1 class="hero-title">${esc(title)}</h1>
            <p class="hero-copy">${esc(intro)} The state average is a useful baseline, but your quote will depend on your city, coverage limits, deductible, and claims history.</p>
            <div class="meta-strip">
                <span class="meta-pill">State average: $${entry.averageAnnualPremium}/year</span>
                <span class="meta-pill">US average: $${usAverage}/year</span>
                <span class="meta-pill">NAIC 2021 baseline</span>
            </div>
        </div>
        <aside class="hero-panel">
            <h2>What this page helps you decide</h2>
            <p>Use the comparison to see where ${esc(name)} sits relative to the national average and to nearby states before you shop for coverage.</p>
        </aside>
    </div>
</section>

<section class="section">
    <div class="container-custom section-grid">
        <div class="surface">
            <h2 class="section-title">What drives ${esc(name)} renters insurance costs</h2>
            <p>${esc(intro)}</p>
            <p>Weather exposure is a major driver here: ${esc(context.weather)}.</p>
            <p>Claim frequency and litigation also matter: ${esc(context.claims)}.</p>
            <p>Replacement costs and carrier competition round out the picture: ${esc(context.replacement)}, and ${esc(context.competition)}.</p>
        </div>
        <div class="surface">
            <h2 class="section-title">How ${esc(name)} compares</h2>
            ${renderPremiumTable([
                { name: name, premium: entry.averageAnnualPremium, vs: premiumVsUs(entry.averageAnnualPremium, usAverage), highlight: true },
                { name: 'United States (national average)', premium: usAverage, vs: 'baseline' },
                ...neighbors.map((neighbor) => ({
                    name: neighbor.state,
                    premium: neighbor.averageAnnualPremium,
                    vs: premiumVsUs(neighbor.averageAnnualPremium, usAverage),
                    href: `/programmatic-pages/insurance/renters-${slugForStateName(neighbor.state)}`,
                })),
            ], usAverage)}
            <p style="margin-top: 0.9rem; color: #4b5563; line-height: 1.7;">A minus sign means the average is below the US average. Figures are the NAIC 2021 baseline; 2026 quotes run higher after inflation.</p>
        </div>
    </div>
</section>

<section class="section section--alt">
    <div class="container-custom">
        <h2 class="section-title">Next steps</h2>
        <div class="hub-list">
            <a href="/programmatic-pages/insurance/renters-by-state"><strong>Renters insurance cost by state</strong><span>See how ${esc(name)} compares with every other state.</span></a>
            <a href="/tools/renters-insurance-cost"><strong>Renters insurance cost calculator</strong><span>Estimate your own premium with your coverage limits, deductible, and location.</span></a>
            <a href="/blog/how-much-is-renters-insurance-cost-guide"><strong>How much is renters insurance?</strong><span>Read the full guide to what renters insurance covers and how premiums are set.</span></a>
        </div>
    </div>
</section>

<section class="section">
    <div class="container-custom">
        <div class="cta-box">
            <h2 class="section-title" style="color:white;">Estimate your own premium</h2>
            <p>State averages only get you part of the way. Your real quote depends on your address, the coverage you choose, and your claims history.</p>
            <div class="cta-actions">
                <a class="cta-button" href="/tools/renters-insurance-cost">Open the renters insurance calculator</a>
                <a class="ghost-button" href="/programmatic-pages/insurance/renters-by-state">Back to the state hub</a>
            </div>
        </div>
    </div>
</section>`;

    const page = renderLayout({
        title,
        description,
        canonical,
        keywords: `${name} renters insurance cost, renters insurance in ${name}, average renters insurance ${name}, ${entry.abbreviation} renters insurance rates`,
        schemaBlocks: [
            articleSchema(title, description, canonical, `${name}, renters insurance, insurance cost, state comparison`),
            breadcrumbSchema([
                { name: 'Home', item: 'https://www.legacyinvestingshow.com/' },
                { name: 'Renters insurance cost by state', item: rentersInsuranceUrl('renters-by-state') },
                { name: name, item: canonical },
            ]),
        ],
        pageType: 'programmatic_renters_state',
        activeHref: '/tools',
        body,
    });

    fs.writeFileSync(path.join(OUTPUT_DIR, 'insurance', `${slug}.html`), page);
}

function main() {
    const cities = loadJson(CITIES_PATH).cities;
    const strategyMap = buildStrategyMap();
    const insuranceEntries = loadJson(INSURANCE_PATH);
    const usEntry = insuranceEntries.find((entry) => entry.abbreviation === 'US');
    const stateEntries = insuranceEntries.filter((entry) => entry.abbreviation !== 'US');
    const entriesByAbbr = new Map(insuranceEntries.map((entry) => [entry.abbreviation, entry]));

    ensureDir(OUTPUT_DIR);
    ensureDir(path.join(OUTPUT_DIR, 'cities'));
    ensureDir(path.join(OUTPUT_DIR, 'comparisons'));
    ensureDir(path.join(OUTPUT_DIR, 'personas'));
    ensureDir(path.join(OUTPUT_DIR, 'insurance'));

    cities.forEach((city) => renderCityPage(city, strategyMap));
    PERSONAS.forEach((persona) => renderPersonaPage(persona, strategyMap));
    COMPARISONS.forEach((comparison) => renderComparisonPage(comparison, strategyMap));
    renderIndexPage(cities, PERSONAS, COMPARISONS);
    stateEntries.forEach((entry) => renderRentersStatePage(entry, entriesByAbbr, usEntry));
    renderInsuranceHubPage(stateEntries, usEntry);

    console.log(`Generated ${cities.length} city pages, ${PERSONAS.length} persona pages, ${COMPARISONS.length} comparison pages, and the programmatic hub.`);
    console.log(`Generated ${stateEntries.length} renters insurance state pages and the renters insurance hub.`);
}

main();
