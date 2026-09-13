#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
    renderAnalyticsBody,
    renderAnalyticsHead,
    renderHeadAssets,
    renderSiteFooter,
    renderSiteHeader,
} = require('./lib/site-shell');
const {
    siteUrl,
    rentersInsurancePath,
    marketPath,
} = require('./lib/public-urls');

const ROOT_DIR = path.join(__dirname, '..');
const MARKETS_DIR = path.join(ROOT_DIR, 'markets');
const RENTERS_DIR = path.join(ROOT_DIR, 'renters-insurance');
const LEGACY_PROGRAMMATIC_DIR = path.join(ROOT_DIR, 'programmatic-pages');
const RENTERS_GUIDES_PATH = path.join(ROOT_DIR, 'data', 'renters-insurance-guides.json');
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

const CITY_LOCAL = {
    'austin-tx': {
        taxReality: 'Texas has no state income tax, so Austin underwriting lives or dies on property tax, hotel tax, insurance, and whether the neighborhood still allows the stay lengths you modeled.',
        operatorDay: 'A realistic Austin week mixes a SXSW or ACL spike with quieter midweeks. If the listing only works when downtown is packed, the tax stack is sitting on a fragile base case.',
        faqs: [
            { question: 'Does Austin have a state income tax that STR operators can plan around?', answer: 'No. Texas does not levy a personal income tax. The local fight is property tax, occupancy tax, permits, and whether the property can legally run as a short-term rental in that ZIP.' },
            { question: 'Should I annualize SXSW rates in an Austin tax model?', answer: 'No. Festival weeks are a stress test, not a baseline. Build occupancy and ADR from trailing non-event months, then treat events as upside.' },
            { question: 'What records matter most for an Austin host before filing?', answer: 'Stay-length logs, cleaner invoices, permit or HOA documents, and a property-level P&L that does not mix personal travel with guest stays.' },
            { question: 'When does cost segregation make sense in Austin?', answer: 'After the hold period and operating model are real. A study on a property you cannot keep filled, or cannot legally rent short-term, is a fee for a deduction you may not get to use cleanly.' },
        ],
    },
    'nashville-tn': {
        taxReality: 'Tennessee planning here is local occupancy tax, permit discipline, and whether bachelor-party demand is covering wear that the depreciation schedule cannot see.',
        operatorDay: 'Music City weekends can look like a money printer until you price in furniture refresh, noise complaints, and the shoulder-season weekday that does not book.',
        faqs: [
            { question: 'Is Nashville STR income taxed at the state level like W-2 wages?', answer: 'Tennessee does not tax most wage income the way a high-income-tax state does. You still have federal tax, local occupancy tax, and entity questions that do not disappear because Music City is busy on Saturday.' },
            { question: 'Why do Nashville listings fail after a strong first summer?', answer: 'Group travel raises ADR and also raises turnover cost. If house rules, cleaner coverage, and reserves were built for a quiet one-bedroom, bachelorette volume will chew the asset.' },
            { question: 'What should a Nashville operator document for the STR loophole?', answer: 'Average stay length, material participation hours, and a calendar that matches what Airbnb actually booked, not what you hoped the listing would do.' },
            { question: 'Does new supply in Nashville change the tax plan?', answer: 'It changes the operating plan first. Rankings and reviews move faster than your depreciation schedule. Fix occupancy math before you order a cost segregation study.' },
        ],
    },
    'miami-fl': {
        taxReality: 'Florida has no state income tax, but Miami still extracts its pound through insurance, condo rules, and county tourist taxes. The federal stack only matters if the unit survives those costs.',
        operatorDay: 'Peak season can hide a listing that loses money from June through October. Underwrite the insurance renewal, not the New Year’s Eve ADR.',
        faqs: [
            { question: 'Is Miami a no-income-tax shortcut for STR operators?', answer: 'Florida skips a state wage tax. It does not skip insurance spikes, building rental rules, or federal tax on the activity. Model those first.' },
            { question: 'What breaks Miami deals more often than a bad CPA?', answer: 'A board that bans short stays, an insurance quote that doubles, or a seasonality assumption copied from January occupancy.' },
            { question: 'Should hurricane risk change the tax file?', answer: 'It should change reserves and insurance. Keep repair invoices, loss documentation, and a clear split between personal use and rental use if you ever occupy the unit yourself.' },
            { question: 'When is bonus depreciation useful in Miami?', answer: 'When the property is in service, the stay-length facts support the activity, and you can still fund operations after the deduction. Paper losses do not pay the condo assessment.' },
        ],
    },
    'phoenix-az': {
        taxReality: 'Arizona state tax exists, so Phoenix operators cannot pretend the only bill is federal. Snowbird season also creates a cash-flow shape that a straight-line tax plan will miss.',
        operatorDay: 'Spring training weeks are not a year. Pool service, electricity, and empty July nights are the actual business.',
        faqs: [
            { question: 'How should Phoenix seasonality show up in a tax plan?', answer: 'Split the year. High season can fund reserves. Low season should still cover debt, utilities, and cleaner retainers before you count on a depreciation win.' },
            { question: 'Does Arizona state tax change entity choice for a Phoenix rental?', answer: 'It can. Run federal and Arizona together. A structure that looks elegant on a federal projector can still create state-level friction you did not budget.' },
            { question: 'What records should a Phoenix host keep in summer?', answer: 'Utility bills, vacancy logs, and vendor invoices. Those months are where people invent occupancy they did not actually have.' },
            { question: 'Is snowbird demand a substitute for short-term-rental status?', answer: 'No. Longer winter stays can push you out of STR treatment. Track average stay length on purpose, not as an afterthought in March.' },
        ],
    },
    'denver-co': {
        taxReality: 'Colorado tax and mountain-adjacent permit rules matter as much as federal depreciation. A Denver listing that is also a personal ski condo needs mixed-use documentation from day one.',
        operatorDay: 'Convention weekdays and weekend mountain overflow are different products. If the unit sits in a neighborhood with tight STR caps, the tax thesis may be illegal before it is inefficient.',
        faqs: [
            { question: 'Can I treat a Denver condo I ski from as a pure rental for tax purposes?', answer: 'Only if personal use stays inside the rules and you document it. Mixed personal and rental use is the usual Denver audit story, not a clever loophole.' },
            { question: 'Do Front Range hail and wildfire costs belong in the tax model?', answer: 'They belong in underwriting. Insurance deductibles and repair years change cash flow. Save every restoration invoice against the same property file as your depreciation schedule.' },
            { question: 'Is REPS easier in Denver because of outdoor tourism?', answer: 'No. REPS is about hours and a real estate trade, not about how pretty the Rockies are. Count hours you actually work.' },
            { question: 'What should I verify before a cost segregation study in Denver?', answer: 'Permit status, personal-use days, and a hold period that still makes sense if the HOA tightens rentals next year.' },
        ],
    },
    'atlanta-ga': {
        taxReality: 'Atlanta is a weekday market dressed up as a tourism story. Georgia tax, entity hygiene, and airport-driven stays should drive the file more than Peachtree festival weekends.',
        operatorDay: 'A Hartsfield connection and a downtown conference can fill Tuesday. If your model needs Saturday party groups to work, you picked the wrong city story.',
        faqs: [
            { question: 'Is Atlanta better for business-travel STRs than leisure STRs?', answer: 'Often yes. Airport and convention traffic can support midweek occupancy that a pure vacation market does not. Track stay purpose in your notes so pricing and cleaning cadence match reality.' },
            { question: 'How should a Georgia S-corp and an Atlanta rental interact?', answer: 'Keep the rental on its own books. Mixing consulting income, reimbursements, and a Midtown listing in one checking account is how the year becomes un-filable.' },
            { question: 'What local tax should Atlanta operators budget besides federal?', answer: 'Georgia income tax plus local occupancy and hotel taxes where they apply. Put filing dates on the same calendar as federal estimates.' },
            { question: 'When does the STR loophole fail in Atlanta?', answer: 'When average stays drift longer, participation hours are fictional, or the property is really a mid-term corporate housing product you never measured.' },
        ],
    },
    'san-diego-ca': {
        taxReality: 'California tax, local STR rules, and coastal insurance are the operating system. Federal depreciation is a module you add after those three are honest.',
        operatorDay: 'Beach demand does not repeal a city permit cap. Comic-Con week is a bonus. Year-round parking, HOA fines, and cleaner wages are the job.',
        faqs: [
            { question: 'Should I start a San Diego tax plan with bonus depreciation?', answer: 'No. Start with whether the unit can legally operate, what California tax does to the leftover, and whether insurance is still writable. Then talk depreciation.' },
            { question: 'How do California rules change STR recordkeeping?', answer: 'You need a file that would survive a city audit and a tax audit. Permits, occupancy reports, and property-level books belong together.' },
            { question: 'Is military and conference demand enough to ignore seasonality?', answer: 'It helps the base case. It does not let you skip a conservative off-peak occupancy number.' },
            { question: 'What mixed-use trap is common in San Diego?', answer: 'Owners who stay for summer weeks and still want full STR treatment. Count personal days before you count deductions.' },
        ],
    },
    'tampa-fl': {
        taxReality: 'Tampa looks cheaper than Miami until you model insurance, flood, and county tourist tax. Florida’s lack of a wage tax does not make a weak listing a good federal tax shelter.',
        operatorDay: 'Cruise weeks and winter visitors are real. So is a humid August with a tired sofa and a higher insurance bill than last year.',
        faqs: [
            { question: 'Is Tampa a cheaper Florida STR tax market than Miami?', answer: 'Entry prices can look easier. Insurance, flood exposure, and seasonality still set the after-tax result. Compare those line items, not just purchase price.' },
            { question: 'Does flood insurance change the Tampa tax file?', answer: 'Flood is usually a separate policy and a reserve issue. Keep premiums and claims with the property file so you are not reconstructing a storm year from memory.' },
            { question: 'What stay-length pattern should Tampa operators watch?', answer: 'Snowbird months can lengthen averages. If you need STR treatment, measure the average stay instead of assuming every booking is a long weekend.' },
            { question: 'When should a Tampa host talk to a CPA about cost segregation?', answer: 'After the unit is in service, the hold period is clear, and the insurance and occupancy model still works without the deduction.' },
        ],
    },
    'charlotte-nc': {
        taxReality: 'Charlotte is a banking-and-event overlay, not a beach town. North Carolina tax and neighborhood-level demand matter more than a NASCAR weekend you cannot repeat 52 times.',
        operatorDay: 'Uptown weekdays can carry a listing that South End Saturdays cannot. Submarket choice is the strategy.',
        faqs: [
            { question: 'Is Charlotte demand more corporate than leisure?', answer: 'Often. Banking, airport, and conference traffic can fill weekdays. Price and clean for that guest, then treat race weekends as overlay, not the whole thesis.' },
            { question: 'How does North Carolina tax change the entity conversation?', answer: 'State tax is part of the model. Do not copy a Texas entity memo onto a Charlotte property and call it done.' },
            { question: 'What documentation helps a Charlotte operator at filing time?', answer: 'Property-level books, vendor 1099s if you scale, and a stay-length export that matches the tax treatment you want to claim.' },
            { question: 'Should I use the STR loophole because Charlotte has lots of Airbnbs?', answer: 'No. The loophole cares about average stay and participation, not about how many listings are on the map.' },
        ],
    },
    'las-vegas-nv': {
        taxReality: 'Nevada has no state income tax, which is not the same as “Vegas is easy.” Permit status and event-week concentration decide whether any federal strategy is even reachable.',
        operatorDay: 'Convention midweeks can print. Neighborhood enforcement can shut the printer off. Underwrite the rulebook before the Strip ADR.',
        faqs: [
            { question: 'Is Las Vegas a no-tax STR market?', answer: 'Nevada skips a state income tax. Local licensing, room tax, and HOA or city rules can still end the business. Confirm the asset is allowed to operate.' },
            { question: 'Should I underwrite CES week as my base occupancy?', answer: 'No. Treat mega-events as upside. The listing has to survive the quiet week after the convention center empties.' },
            { question: 'What records are uniquely important in Las Vegas?', answer: 'License and permit documents, guest incident logs, and a calendar that shows you did not confuse a party house with a lodging business.' },
            { question: 'When does depreciation become a distraction in Vegas?', answer: 'When the unit cannot legally operate, or when event-month revenue is the only reason the debt service clears.' },
        ],
    },
    'orlando-fl': {
        taxReality: 'Orlando’s tax story is family-travel volume, turnover cost, and Florida’s insurance market. Theme-park occupancy does not automatically create STR tax treatment.',
        operatorDay: 'A seven-bedroom near the parks is a cleaning company with a house attached. Model labor before bonus depreciation.',
        faqs: [
            { question: 'Does year-round theme-park demand make Orlando occupancy a given?', answer: 'Volume is real. Competition is also real. Weak reviews and slow turns show up faster here than in a sleepy beach town.' },
            { question: 'Why do Orlando tax plans blow up after a cost segregation study?', answer: 'Because the study assumed a hold and an operating cadence the owner could not staff. Family-travel wear is a cash cost, not just a depreciation input.' },
            { question: 'What should an Orlando operator track besides ADR?', answer: 'Turn time, linen replacement, and average stay length. Those three numbers tell you whether the tax treatment you want is even available.' },
            { question: 'Is Florida’s lack of income tax enough reason to buy in Orlando?', answer: 'No. It is one input. Insurance, HOA, and whether you can actually run a large-home listing are the others.' },
        ],
    },
    'dallas-tx': {
        taxReality: 'Dallas is Texas, so skip the state wage-tax fantasy and look at property tax, hotel tax, and which suburb you actually bought. Plano is not Deep Ellum.',
        operatorDay: 'Corporate travel can fill a weekday. A sports overlay can fill a weekend. Neither forgives a cleaning vendor who no-shows in Frisco.',
        faqs: [
            { question: 'Do all Dallas-Fort Worth suburbs underwrite the same way?', answer: 'No. Stay mix, HOA culture, and commute patterns change by city. Build the tax file on the property you own, not on a metro average.' },
            { question: 'How should a Dallas operator think about Texas property tax?', answer: 'It is a carrying cost that can move. Protest, budget, and do not treat a first-year assessment as the forever number in your depreciation model.' },
            { question: 'When is an S-corp relevant to a Dallas STR?', answer: 'When there is a real operating business with payroll capacity. A single listing does not become an S-corp problem just because you watched a YouTube video.' },
            { question: 'What records matter if I self-manage in Dallas?', answer: 'Mileage, reimbursements, vendor payments, and a property P&L. Those are the documents a CPA can use. Group chat screenshots are not.' },
        ],
    },
    'houston-tx': {
        taxReality: 'Houston’s medical and project travel can support longer stays than an Austin festival model. That is a tax fact: average stay length may knock you out of STR treatment if you never measure it.',
        operatorDay: 'A Medical Center listing behaves unlike a beach house. Build the file around stay mix, not around a Texas slogan.',
        faqs: [
            { question: 'Why shouldn’t I copy an Austin underwriting model into Houston?', answer: 'Demand sources differ. Medical, energy, and corporate project stays can lengthen averages and change cleaning cadence. Austin event math will lie to you here.' },
            { question: 'How could longer Houston stays affect the STR loophole?', answer: 'If average stays exceed the short-term threshold, the loophole is not a loophole. Export the stay report before you claim the treatment.' },
            { question: 'What local costs should Houston operators stress-test?', answer: 'Insurance, flooding exposure, and summer utilities. Those lines move. Keep invoices with the property, not in a personal inbox.' },
            { question: 'Is Texas franchise or margin tax part of a Houston rental conversation?', answer: 'Entity choice can drag state-level filings into the year. Ask the CPA which forms the structure actually creates before you file an election to look busy.' },
        ],
    },
    'seattle-wa': {
        taxReality: 'Washington has no wage income tax in the classic sense, but Seattle operators still live with B&O, city rules, and labor costs that eat the federal deduction if you ignore them.',
        operatorDay: 'Cruise summer and tech weekdays are different seasons. A Capitol Hill permit problem is not solved by a cost segregation PDF.',
        faqs: [
            { question: 'Does Washington’s tax system make Seattle STRs “tax free”?', answer: 'No. You still have federal tax, local licensing, and business-and-occupation type friction depending on how you operate. Model the city rules with the CPA, not from a slogan.' },
            { question: 'Why do Seattle margins compress even when ADR looks high?', answer: 'Labor, cleaner coverage, and neighborhood rules. Premium guests still need a premium operation. Budget people, not just furniture.' },
            { question: 'What mixed-use issue shows up in Seattle?', answer: 'Owners who use the unit during cruise season and still want a full-year rental story. Log personal days.' },
            { question: 'When should a Seattle host delay depreciation planning?', answer: 'When the listing cannot staff winters, or when the city rule set is still unresolved. Unstable operations make a beautiful tax memo into fiction.' },
        ],
    },
    'portland-or': {
        taxReality: 'Oregon tax plus conservative occupancy is the Portland file. Flashy national STR tactics usually fail here because the peak window is shorter than the Instagram caption.',
        operatorDay: 'Food and event weekends help. Shoulder months decide whether you keep the cleaner. Document that cadence before you talk QBI or cost seg.',
        faqs: [
            { question: 'Why is Portland called a discipline market in this guide?', answer: 'Because demand pockets are real and also easy to overstate. Records, reserves, and a base occupancy that works off-peak matter more than a peak-weekend ADR screenshot.' },
            { question: 'How does Oregon state tax change the plan?', answer: 'It is part of the after-tax yield. Do not import a no-income-tax-state memo. Run Oregon and federal together.' },
            { question: 'What should a Portland operator put in the 90-day file?', answer: 'A written occupancy base case, vendor contracts, and a reimbursement log if you self-manage. Those three items make the CPA conversation useful.' },
            { question: 'Is aggressive scaling a good tax strategy in Portland?', answer: 'Usually not. Adding units before the first listing has clean books just multiplies a process problem. Get one file right.' },
        ],
    },
};

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

function loadRentersGuides() {
    if (!fs.existsSync(RENTERS_GUIDES_PATH)) {
        return {};
    }
    return loadJson(RENTERS_GUIDES_PATH);
}

function renderHeader(activeHref) {
    return renderSiteHeader(activeHref);
}

function indefiniteArticle(word) {
    const first = String(word || '').trim().charAt(0).toLowerCase();
    return 'aeiou'.includes(first) ? 'an' : 'a';
}

function renderFooter() {
    return renderSiteFooter();
}

function renderStyles() {
    return '<link rel="stylesheet" href="/assets/css/guides.css">';
}

function renderHead(config) {
    const {
        title,
        description,
        canonical,
        keywords,
        schemaBlocks,
        image = 'https://www.legacyinvestingshow.com/assets/images/og-image.jpg',
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

    <meta name="theme-color" content="#FAF7F2">
    <link rel="icon" type="image/png" href="/assets/images/logo.png">
    ${renderHeadAssets()}
    ${renderStyles()}
    ${renderAnalyticsHead({ gaTrackingId: GA_TRACKING_ID, gtmContainerId: GTM_CONTAINER_ID })}
${schemaBlocks.map((schema) => `    <script type="application/ld+json">${JSON.stringify(schema)}</script>`).join('\n')}
</head>`;
}

function renderBreadcrumbNav(trail) {
    const items = trail.map((item, index) => {
        const isLast = index === trail.length - 1;
        if (isLast || !item.href) {
            return `                <li class="breadcrumb__item"><span class="breadcrumb__current">${esc(item.name)}</span></li>`;
        }
        return `                <li class="breadcrumb__item"><a href="${esc(item.href)}" class="breadcrumb__link">${esc(item.name)}</a></li>`;
    }).join('\n');

    return `    <div class="container-custom">
        <nav aria-label="Breadcrumb">
            <ol class="breadcrumb">
${items}
            </ol>
        </nav>
    </div>`;
}

function renderLayout(page) {
    const disclaimer = page.disclaimer
        || 'Educational content only. Verify tax decisions with a qualified advisor.';

    return `<!DOCTYPE html>
<html lang="en">
${renderHead(page)}
<body class="guide-page" data-page-type="${esc(page.pageType)}" data-page-title="${esc(page.title)}">
    ${renderAnalyticsBody({ gtmContainerId: GTM_CONTAINER_ID })}
    <a href="#main" class="guide-skip">Skip to main content</a>
    ${renderHeader(page.activeHref || '/tax-strategies')}
${page.breadcrumbNav || ''}
    <main id="main">
        ${page.body}
        <section class="guide-section--tight">
            <div class="container-custom">
                <p class="guide-row__note">${esc(disclaimer)}</p>
            </div>
        </section>
    </main>
    ${renderFooter()}
    <script defer src="/assets/js/main.js"></script>
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

function renderResourceRows(resources, strategyMap, reasons) {
    return resources
        .map((resource, index) => {
            const resolved = resolveResource(resource, strategyMap);
            const reason = reasons[index] || resolved.description;
            return `        <article class="guide-entry">
            <div>
                <p class="guide-entry__meta">Priority ${index + 1}</p>
            </div>
            <div>
                <h3><a href="${esc(resolved.href)}">${esc(resolved.title)}</a></h3>
                <p>${esc(reason)}</p>
            </div>
        </article>`;
        })
        .join('\n');
}

function renderList(items, className) {
    return `<ul class="${className}">${items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`;
}

function buildCityFaqs(cityData, cityContext, cityLocal) {
    if (cityLocal && Array.isArray(cityLocal.faqs) && cityLocal.faqs.length > 0) {
        return cityLocal.faqs;
    }
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
            question: `What records should ${indefiniteArticle(cityData.city)} ${cityData.city} operator keep before filing?`,
            answer: `Keep a property-level file with purchase documents, repair records, cleaner and vendor invoices, stay-length data, mileage or time logs where relevant, and any local compliance documents that support the operating model.`,
        },
        {
            question: `Is ${cityData.city} a better tax market than a better operating market?`,
            answer: `Lead with operations. ${cityData.notes} That profile has to work before depreciation or entity choices change the outcome.`,
        },
    ];
}

function renderCityPage(cityData, strategyMap) {
    const slug = slugForCity(cityData.city, cityData.state);
    const cityContext = CITY_CONTEXT[slug];
    const cityLocal = CITY_LOCAL[slug] || {};
    const stateContext = STATE_CONTEXT[cityData.state];
    if (!cityContext || !stateContext) {
        throw new Error(`Missing city or state context for ${slug}`);
    }

    const title = `${cityData.city}, ${cityData.state} Tax Strategy Guide for Investors and Operators`;
    const description = `A practical tax-planning guide for ${cityData.city} operators: market context, deduction priorities, documentation habits, and the mistakes that usually break the model.`;
    const canonical = siteUrl(marketPath(slug));
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
            href: marketPath(slugForCity(entry.city, entry.state)),
            description: (CITY_CONTEXT[slugForCity(entry.city, entry.state)] || {}).bestFit
                || `${entry.city} runs on a different demand mix and operator profile.`,
        }));
    const faqItems = buildCityFaqs(cityData, cityContext, cityLocal);
    const breadcrumbNav = renderBreadcrumbNav([
        { name: 'Home', href: '/' },
        { name: 'Market guides', href: marketPath() },
        { name: `${cityData.city}, ${cityData.state}` },
    ]);
    const body = `<section class="guide-opener">
    <div class="container-custom">
        ${breadcrumbNav}
        <div class="opener">
            <div>
                <h1 class="opener__title">${esc(cityData.city)}, ${esc(cityData.state)} tax strategy guide</h1>
                <p class="opener__lede">${esc(cityContext.summary)} ${esc(cityContext.bestFit)}</p>
                <p class="guide-opener__meta">${esc(stateContext.taxLens)}</p>
            </div>
            <aside class="opener__aside">
                <div class="figure figure--gold">
                    <span class="figure__value">${resources.length}</span>
                    <span class="figure__label">strategies ranked for this market</span>
                </div>
            </aside>
        </div>
    </div>
</section>

<section class="section">
    <div class="container-custom">
        <div class="marginalia">
            <div class="marginalia__main sheet guide-sheet">
                <div class="guide-prose">
                    <h2>What makes ${esc(cityData.city)} different</h2>
                    <p>${esc(stateContext.executionFocus)}</p>
                    ${cityLocal.taxReality ? `<p>${esc(cityLocal.taxReality)}</p>` : ''}
                    ${cityLocal.operatorDay ? `<p>${esc(cityLocal.operatorDay)}</p>` : ''}

                    <h3>Where investors usually get hurt</h3>
                    ${renderList(cityContext.watchouts, 'bullet-list')}
                    <p>The goal is not to avoid tax strategy. It is to avoid using tax strategy as a substitute for underwriting, local rule review, or operator discipline.</p>
                </div>
            </div>
            <aside class="marginalia__aside guide-aside">
                <div>
                    <p class="guide-aside__title">What drives demand here</p>
                    ${renderList(cityContext.demandDrivers, 'bullet-list')}
                </div>
                <div>
                    <p class="guide-aside__title">Execution checklist</p>
                    ${renderList(stateContext.checklist, 'bullet-list')}
                </div>
            </aside>
        </div>
    </div>
</section>

<section class="band">
    <div class="container-custom">
        <figure class="pull-quote">
            <blockquote><p>${esc(cityContext.bestFit)}</p></blockquote>
            <figcaption>${esc(cityData.city)} in one line<span>${esc(cityData.notes)}</span></figcaption>
        </figure>
    </div>
</section>

<section class="section band--cream-dark">
    <div class="container-custom">
        <div class="section__head">
            <h2>Strategy stack for ${esc(cityData.city)}</h2>
            <p>Ranked by how often each one matters once you combine the market profile, the likely operator type, and the documentation required to defend the move.</p>
        </div>
${renderResourceRows(resources, strategyMap, resourceReasons)}
    </div>
</section>

<section class="section">
    <div class="container-custom">
        <div class="marginalia">
            <div class="marginalia__main">
                <div class="section__head">
                    <h2>What to do in the next 90 days</h2>
                    <p>Assemble the operating facts before you take the tax question to anyone.</p>
                </div>
                <ol class="steps">
                    <li><div><p>Write the base-case occupancy and rate assumptions for ${esc(cityData.city)} without using peak periods as the baseline.</p></div></li>
                    <li><div><p>Choose the one deduction or entity question that actually changes your next decision.</p></div></li>
                    <li><div><p>Build the audit file now: receipts, vendor records, local compliance notes, and property-level bookkeeping.</p></div></li>
                    <li><div><p>Review the plan with a CPA once the operating facts are assembled cleanly.</p></div></li>
                </ol>

                <div class="guide-prose">
                    <h2>Questions people ask before filing</h2>
                    <dl class="guide-faq">
${faqItems.map((item) => `                        <dt>${esc(item.question)}</dt>
                        <dd>${esc(item.answer)}</dd>`).join('\n')}
                    </dl>
                </div>
            </div>
            <aside class="marginalia__aside guide-aside">
                <div>
                    <p class="guide-aside__title">Nearby markets</p>
                    <dl class="dl-terms">
${nearbyCities.map((entry) => `                        <dt><a href="${esc(entry.href)}">${esc(entry.name)}</a></dt>
                        <dd>${esc(entry.description)}</dd>`).join('\n')}
                    </dl>
                </div>
                <div>
                    <p class="guide-aside__title">Keep reading</p>
                    <dl class="dl-terms">
                        <dt><a href="/tax-strategies">Tax strategy library</a></dt>
                        <dd>Every strategy guide in one table.</dd>
                        <dt><a href="/markets">All city guides</a></dt>
                        <dd>The rest of the market pages.</dd>
                    </dl>
                </div>
            </aside>
        </div>
    </div>
</section>

<section class="cta-band">
    <div class="container-custom">
        <h2>Take the narrowed question to an advisor</h2>
        <p>A market guide should shrink the question, not answer it. Bring the property-level file and the one structure or participation question that is still open.</p>
        <div class="cta-band-actions">
            <a href="/tax-strategies" class="btn-primary">Open the tax strategy library</a>
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
                { name: 'Market guides', item: siteUrl(marketPath()) },
                { name: `${cityData.city}, ${cityData.state}`, item: canonical },
            ]),
            faqSchema(faqItems),
        ],
        pageType: 'market_city',
        body,
    });

    fs.writeFileSync(path.join(MARKETS_DIR, `${slug}.html`), page);
}

function renderMarketsHub(cities) {
    const canonical = siteUrl(marketPath());
    const title = 'City Tax Strategy Guides for Investors and Operators';
    const description = 'Market-by-market tax and operating guides for Austin, Nashville, Miami, and other high-intent short-term rental cities, written as decision pages rather than cloned templates.';
    const cityEntries = cities.map((city) => ({
        name: `${city.city}, ${city.state}`,
        url: marketPath(slugForCity(city.city, city.state)),
        summary: CITY_CONTEXT[slugForCity(city.city, city.state)].summary,
    }));
    const body = `<section class="guide-opener">
    <div class="container-custom">
        ${renderBreadcrumbNav([{ name: 'Home', href: '/' }, { name: 'Market guides' }])}
        <div class="opener">
            <div>
                <h1 class="opener__title">City tax strategy guides</h1>
                <p class="opener__lede">A deduction stack that works in Austin can fail in Miami. Local rules, insurance, seasonality, and stay-length mix change the operating facts before they change the tax return.</p>
                <p class="guide-opener__meta">Pick the city you are actually underwriting and read the operating facts before you open a strategy page.</p>
            </div>
            <aside class="opener__aside">
                <div class="figure figure--gold">
                    <span class="figure__value">${cityEntries.length}</span>
                    <span class="figure__label">markets, each written around its own demand and rules</span>
                </div>
            </aside>
        </div>
    </div>
</section>

<section class="section band--cream-dark">
    <div class="container-custom">
        <div class="section__head">
            <h2>City guides</h2>
            <p>Start with demand and local rules rather than the largest deduction name.</p>
        </div>
        <dl class="dl-terms dl-terms--cols">
${cityEntries.map((entry) => `            <dt><a href="${esc(entry.url)}">${esc(entry.name)}</a></dt>
            <dd>${esc(entry.summary)}</dd>`).join('\n')}
        </dl>
    </div>
</section>

<section class="section">
    <div class="container-custom">
        <div class="marginalia">
            <div class="marginalia__main sheet guide-sheet">
                <div class="guide-prose">
                    <h2>How to use these guides</h2>
                    <p>Treat the strategy stack on each page as a filter, not a shopping list. The market decides which moves are even available: stay-length rules decide whether the short-term rental route exists, property tax and insurance decide whether the underwriting survives a soft quarter, and the operator profile decides whether you can document participation at all.</p>
                    <p>Compare a neighbouring city only after your base-case occupancy is written down. Two markets that look similar on a revenue chart often differ entirely on enforcement and cleaning cost.</p>
                </div>
            </div>
            <aside class="marginalia__aside guide-aside">
                <div>
                    <p class="guide-aside__title">Related decision pages</p>
                    <dl class="dl-terms">
                        <dt><a href="/tax-strategies">Tax strategy library</a></dt>
                        <dd>Core deduction, entity, and real estate tax pages.</dd>
                        <dt><a href="/tax-strategies/for/airbnb-hosts">Strategies for Airbnb hosts</a></dt>
                        <dd>Host-specific sequencing rather than a market template.</dd>
                        <dt><a href="/compare">Compare guides</a></dt>
                        <dd>Head-to-head when two strategies both sound plausible.</dd>
                        <dt><a href="/renters-insurance">Renters insurance by state</a></dt>
                        <dd>State premium baselines and coverage notes.</dd>
                    </dl>
                </div>
            </aside>
        </div>
    </div>
</section>`;

    const page = renderLayout({
        title,
        description,
        canonical,
        keywords: 'city tax guides, short-term rental markets, Austin tax strategy, Miami STR taxes, real estate market guides',
        type: 'website',
        schemaBlocks: [
            collectionSchema(title, description, canonical, cityEntries),
            breadcrumbSchema([
                { name: 'Home', item: 'https://www.legacyinvestingshow.com/' },
                { name: 'Market guides', item: canonical },
            ]),
        ],
        pageType: 'markets_hub',
        body,
    });

    fs.writeFileSync(path.join(MARKETS_DIR, 'index.html'), page);
}

function slugForStateName(name) {
    return String(name || '').toLowerCase().replace(/\s+/g, '-');
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
    return `<div class="table-scroll"><table class="guide-table">
        <thead>
            <tr>
                <th scope="col">Location</th>
                <th scope="col">Average annual premium</th>
                <th scope="col">vs US average ($${usAverage})</th>
            </tr>
        </thead>
        <tbody>
            ${rows.map((row) => `<tr>
                <th scope="row">${row.href ? `<a class="inline-link" href="${esc(row.href)}">${esc(row.name)}</a>` : esc(row.name)}${row.highlight ? ' <span class="guide-row__note">(this page)</span>' : ''}</th>
                <td>$${row.premium}</td>
                <td>${esc(row.vs)}</td>
            </tr>`).join('\n            ')}
        </tbody>
    </table></div>`;
}

function rentersGuide(abbreviation, guides) {
    return guides[abbreviation] || null;
}

function renderFaqList(items) {
    return `<dl class="guide-faq">
${items.map((item) => `                <dt>${esc(item.question || item.q)}</dt>
                <dd>${esc(item.answer || item.a)}</dd>`).join('\n')}
            </dl>`;
}

function normalizeFaqs(rawFaqs, fallback) {
    const items = Array.isArray(rawFaqs) ? rawFaqs : [];
    const mapped = items.map((item) => ({
        question: item.question || item.q,
        answer: item.answer || item.a,
    })).filter((item) => item.question && item.answer);
    return mapped.length > 0 ? mapped : fallback;
}

function renderInsuranceHubPage(stateEntries, usEntry) {
    const usAverage = usEntry.averageAnnualPremium;
    const canonical = siteUrl(rentersInsurancePath());
    const title = 'Average Renters Insurance Cost by State (2026)';
    const description = 'Compare average renters insurance costs in all 50 states and Washington, DC, against the $170 US average (NAIC 2021 baseline from the Insurance Information Institute).';
    const body = `<section class="guide-opener">
    <div class="container-custom">
        ${renderBreadcrumbNav([{ name: 'Home', href: '/' }, { name: 'Renters insurance by state' }])}
        <div class="opener">
            <div>
                <h1 class="opener__title">Average renters insurance cost by state</h1>
                <p class="opener__lede">Renters insurance covers your belongings, your liability, and a hotel bill if a fire or burst pipe puts you out of the apartment. These are state averages, not quotes: your number moves with ZIP code, contents limit, deductible, and claims history.</p>
                <p class="guide-opener__meta">NAIC 2021 baseline, published by the Insurance Information Institute. Inflation has pushed 2026 quotes higher.</p>
            </div>
            <aside class="opener__aside">
                <div class="figure figure--gold">
                    <span class="figure__value">$${usAverage}</span>
                    <span class="figure__label">US average a year</span>
                </div>
            </aside>
        </div>
    </div>
</section>

<section class="section band--cream-dark">
    <div class="container-custom">
        <div class="section__head">
            <h2>Average cost by state</h2>
            <p>A minus sign means the state average sits below the US average. The spread is mostly weather, claims, and replacement cost.</p>
        </div>
        ${renderPremiumTable([
            { name: 'United States (national average)', premium: usAverage, vs: 'baseline' },
            ...stateEntries.map((entry) => ({
                name: entry.state,
                premium: entry.averageAnnualPremium,
                vs: premiumVsUs(entry.averageAnnualPremium, usAverage),
                href: rentersInsurancePath(slugForStateName(entry.state)),
            })),
        ], usAverage)}
    </div>
</section>

<section class="section">
    <div class="container-custom">
        <div class="marginalia">
            <div class="marginalia__main sheet guide-sheet">
                <div class="guide-prose">
                    <h2>What drives renters insurance prices</h2>
                    <h3>Claim frequency and litigation</h3>
                    <p>States with more theft, fire, and lawsuit activity price the same $20,000 contents limit higher because the pool loses more money.</p>
                    <h3>Replacement costs</h3>
                    <p>If it costs more to replace a sofa in Boston than in Boise, the premium follows. Shipping-heavy states show the same pattern.</p>
                    <h3>Weather exposure</h3>
                    <p>Hail, wind, freeze bursts, and wildfire smoke claims all show up in renters books. Flood and earthquake usually do not, which is why those need separate decisions.</p>
                    <h3>Carrier competition</h3>
                    <p>A crowded market can hold prices down. A thin market, or one where carriers have pulled back, does the opposite.</p>
                </div>
            </div>
            <aside class="marginalia__aside guide-aside">
                <div>
                    <p class="guide-aside__title">How to use the table</p>
                    <p>Find your state, note the gap against the $${usAverage} US average, then open the state page for weather, landlord norms, and a worked example.</p>
                </div>
                <div>
                    <p class="guide-aside__title">Next steps</p>
                    <dl class="dl-terms">
                        <dt><a href="/tools/renters-insurance-cost">Cost calculator</a></dt>
                        <dd>Estimate your own premium from your coverage limits, deductible, and location.</dd>
                        <dt><a href="/blog/how-much-is-renters-insurance-cost-guide">How much is renters insurance?</a></dt>
                        <dd>What the policy covers and how premiums are set.</dd>
                        <dt><a href="/tools/categories/insurance-protection">Insurance tools</a></dt>
                        <dd>The rest of the calculator library.</dd>
                    </dl>
                </div>
            </aside>
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
                url: siteUrl(rentersInsurancePath(slugForStateName(entry.state))),
            }))),
            breadcrumbSchema([
                { name: 'Home', item: 'https://www.legacyinvestingshow.com/' },
                { name: 'Renters insurance cost by state', item: canonical },
            ]),
        ],
        pageType: 'renters_hub',
        activeHref: '/tools',
        disclaimer: 'Educational content only. A statewide average is not a quote. Confirm coverage with a licensed agent.',
        body,
    });

    fs.writeFileSync(path.join(RENTERS_DIR, 'index.html'), page);
}

function renderRentersStatePage(entry, entriesByAbbr, usEntry, guides) {
    const usAverage = usEntry.averageAnnualPremium;
    const name = entry.state;
    const stateSlug = slugForStateName(name);
    const title = `Renters Insurance Cost in ${name} (2026 Average)`;
    const canonical = siteUrl(rentersInsurancePath(stateSlug));
    const context = RENTERS_STATE_CONTEXT[entry.abbreviation];
    const guide = rentersGuide(entry.abbreviation, guides);
    const neighbors = (RENTERS_NEIGHBORS[entry.abbreviation] || [])
        .map((abbr) => entriesByAbbr.get(abbr))
        .filter(Boolean);
    const diff = entry.averageAnnualPremium - usAverage;
    const diffPhrase = diff === 0
        ? 'equal to'
        : diff > 0
            ? `about $${diff} more than`
            : `about $${Math.abs(diff)} less than`;
    const description = `${name} renters insurance averages about $${entry.averageAnnualPremium} a year (NAIC 2021), ${premiumProse(entry.averageAnnualPremium, usAverage)}. Local context, a worked example, and what the average misses.`;
    const intro = `${name} renters paid about $${entry.averageAnnualPremium} a year on average in the NAIC 2021 baseline, ${diffPhrase} the $${usAverage} US average.`;
    const cities = (guide && guide.cities) || [];
    const topCities = cities.slice(0, 3);
    const cityList = topCities.length > 1
        ? `${topCities.slice(0, -1).join(', ')} and ${topCities[topCities.length - 1]}`
        : topCities.join('');
    const cityLine = cities.length
        ? `Most shopping conversations in ${name} start in ${cityList}.`
        : `Quotes inside ${name} still split by city even when the statewide average looks simple.`;
    const fallbackFaqs = [
        {
            question: `How much is renters insurance in ${name}?`,
            answer: `${intro} Treat that as a comparison band. A downtown ZIP with higher theft or replacement costs can price above the average even when the state overall sits ${premiumProse(entry.averageAnnualPremium, usAverage)}.`,
        },
        {
            question: `Does ${indefiniteArticle(name)} ${name} landlord usually require renters insurance?`,
            answer: guide && guide.leaseNorm
                ? guide.leaseNorm
                : `Many leases ask for liability coverage and to be listed as an interested party. Read the lease. The state average does not waive a landlord's requirement.`,
        },
        {
            question: `Does ${name} renters insurance cover flood or earthquake?`,
            answer: `Standard renters policies are built around fire, theft, some weather, and liability. Flood is a separate conversation. Earthquake usually needs a rider. Buy the policy for the perils that actually hit ${name}, then fill gaps on purpose.`,
        },
        {
            question: `How should I use the $${entry.averageAnnualPremium} ${name} average?`,
            answer: `Use it to spot a quote that is wildly off-market. Then price your own contents inventory, pick a deductible you can pay tomorrow, and run the calculator instead of rounding to the state mean.`,
        },
    ];
    const faqItems = normalizeFaqs(guide && guide.faqs, fallbackFaqs);
    const uniqueBlocks = [];
    if (guide && guide.localAngle) {
        uniqueBlocks.push(`<h2>What is different about ${esc(name)}</h2><p>${esc(guide.localAngle)}</p><p>${esc(cityLine)}</p>`);
    } else {
        uniqueBlocks.push(`<h2>What is different about ${esc(name)}</h2><p>${esc(intro)} ${esc(cityLine)}</p>`);
    }
    if (guide && guide.leaseNorm) {
        uniqueBlocks.push(`<h2>Leases and landlord rules in ${esc(name)}</h2><p>${esc(guide.leaseNorm)}</p>`);
    }
    if (guide && guide.contentsNote) {
        uniqueBlocks.push(`<h2>What to actually schedule</h2><p>${esc(guide.contentsNote)}</p>`);
    }
    if (guide && guide.scenarioStory) {
        uniqueBlocks.push(`<h2>A ${esc(guide.scenarioCity || name)} example</h2><p>${esc(guide.scenarioStory)}</p>`);
    }
    const regulator = (guide && guide.regulatorName)
        ? `<p>Questions about carriers or complaints go to the ${esc(guide.regulatorName)}${guide.regulatorUrl ? ` (<a class="inline-link" href="${esc(guide.regulatorUrl)}">${esc(guide.regulatorUrl.replace(/^https?:\/\//, ''))}</a>)` : ''}.</p>`
        : '';

    const body = `<section class="guide-opener">
    <div class="container-custom">
        ${renderBreadcrumbNav([
            { name: 'Home', href: '/' },
            { name: 'Renters insurance by state', href: rentersInsurancePath() },
            { name },
        ])}
        <div class="opener">
            <div>
                <h1 class="opener__title">Renters insurance cost in ${esc(name)}</h1>
                <p class="opener__lede">${esc(intro)} The state average is a baseline; your quote depends on your city, coverage limits, deductible, and claims history.</p>
                <p class="guide-opener__meta">US average: $${usAverage} a year, on the same NAIC 2021 baseline.</p>
            </div>
            <aside class="opener__aside">
                <div class="figure figure--gold">
                    <span class="figure__value">$${entry.averageAnnualPremium}</span>
                    <span class="figure__label">${esc(name)} average a year, ${esc(premiumProse(entry.averageAnnualPremium, usAverage))}</span>
                </div>
            </aside>
        </div>
    </div>
</section>

<section class="section">
    <div class="container-custom">
        <div class="marginalia">
            <div class="marginalia__main sheet guide-sheet">
                <div class="guide-prose">
                    ${uniqueBlocks.join('')}

                    <h2>What drives ${esc(name)} renters insurance costs</h2>
                    <p>Weather exposure is a major driver here: ${esc(context.weather)}.</p>
                    <p>Claim frequency and litigation also matter: ${esc(context.claims)}.</p>
                    <p>Replacement costs and carrier competition round out the picture: ${esc(context.replacement)}, and ${esc(context.competition)}.</p>
                    ${regulator}
                </div>
            </div>
            <aside class="marginalia__aside guide-aside">
                <div>
                    <p class="guide-aside__title">Next steps</p>
                    <dl class="dl-terms">
                        <dt><a href="${esc(rentersInsurancePath())}">All states</a></dt>
                        <dd>See how ${esc(name)} compares with every other state.</dd>
                        <dt><a href="/tools/renters-insurance-cost">Cost calculator</a></dt>
                        <dd>Estimate your own premium.</dd>
                        <dt><a href="/blog/how-much-is-renters-insurance-cost-guide">How much is renters insurance?</a></dt>
                        <dd>What the policy covers and how premiums are set.</dd>
                    </dl>
                </div>
            </aside>
        </div>
    </div>
</section>

<section class="section band--cream-dark">
    <div class="container-custom">
        <div class="section__head">
            <h2>How ${esc(name)} compares</h2>
            <p>Against the national average and its neighbours, on the same NAIC baseline.</p>
        </div>
        ${renderPremiumTable([
            { name: name, premium: entry.averageAnnualPremium, vs: premiumVsUs(entry.averageAnnualPremium, usAverage), highlight: true },
            { name: 'United States (national average)', premium: usAverage, vs: 'baseline' },
            ...neighbors.map((neighbor) => ({
                name: neighbor.state,
                premium: neighbor.averageAnnualPremium,
                vs: premiumVsUs(neighbor.averageAnnualPremium, usAverage),
                href: rentersInsurancePath(slugForStateName(neighbor.state)),
            })),
        ], usAverage)}
        <p class="guide-row__note">A minus sign means the average is below the US average. Figures are the NAIC 2021 baseline; 2026 quotes run higher after inflation.</p>
    </div>
</section>

<section class="section">
    <div class="container-custom">
        <div class="section__head">
            <h2>Questions people ask about ${esc(name)} renters insurance</h2>
            <p>What the state average does and does not tell you.</p>
        </div>
        <div class="guide-prose">
            ${renderFaqList(faqItems)}
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
                { name: 'Renters insurance cost by state', item: siteUrl(rentersInsurancePath()) },
                { name: name, item: canonical },
            ]),
            faqSchema(faqItems),
        ],
        pageType: 'renters_state',
        activeHref: '/tools',
        disclaimer: 'Educational content only. A statewide average is not a quote. Confirm coverage with a licensed agent.',
        body,
    });

    fs.writeFileSync(path.join(RENTERS_DIR, `${stateSlug}.html`), page);
}

function removeLegacyProgrammaticTree() {
    if (fs.existsSync(LEGACY_PROGRAMMATIC_DIR)) {
        fs.rmSync(LEGACY_PROGRAMMATIC_DIR, { recursive: true, force: true });
    }
}

function main() {
    const cities = loadJson(CITIES_PATH).cities;
    const strategyMap = buildStrategyMap();
    const insuranceEntries = loadJson(INSURANCE_PATH);
    const usEntry = insuranceEntries.find((entry) => entry.abbreviation === 'US');
    const stateEntries = insuranceEntries.filter((entry) => entry.abbreviation !== 'US');
    const entriesByAbbr = new Map(insuranceEntries.map((entry) => [entry.abbreviation, entry]));
    const guides = loadRentersGuides();

    ensureDir(MARKETS_DIR);
    ensureDir(RENTERS_DIR);

    cities.forEach((city) => renderCityPage(city, strategyMap));
    renderMarketsHub(cities);
    stateEntries.forEach((entry) => renderRentersStatePage(entry, entriesByAbbr, usEntry, guides));
    renderInsuranceHubPage(stateEntries, usEntry);
    removeLegacyProgrammaticTree();

    console.log(`Generated ${cities.length} market guides and the markets hub.`);
    console.log(`Generated ${stateEntries.length} renters insurance state pages and the renters insurance hub.`);
}

main();
