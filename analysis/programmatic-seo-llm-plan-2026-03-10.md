# LLM-Driven SEO Expansion Plan

Date: 2026-03-10

## What this plan is trying to do

Build a scalable SEO system for Legacy Investing Show without filling the site with thin, generic "complete guide" posts.

The goal is:

- use LLMs for scale
- keep pages specific, scenario-based, and useful
- bias toward tax, LLC, entity structure, retirement, investing, and debt
- use Airbnb and STR content only as a secondary cluster, not the center of the plan
- turn the site's best existing assets into repeatable page families

## What the repo already tells us

Current repo signals:

- `content/blog/` has about 562 markdown posts
- tax, business structures, and retirement are already the deepest categories
- `tools/` already has 13 high-value utility pages
- `worksheets/` already has 3 worksheet pages
- `compare/` already has richer, more useful comparison pages than the generic blog generator
- `data/seo-topics-1000.json` already contains a large backlog, but many topics follow repetitive persona / comparison / "tax implications" patterns
- many references point to `/topics/...`, but there is no live `topics/` directory in this repo

Strongest existing assets:

- execution-first tax content
- entity structure and S-corp decision content
- retirement tax sequencing content
- calculators, worksheets, and comparison data structures

Weakest existing patterns:

- too many persona-swapped pages
- too many low-intent `x-vs-y` combinations
- too many generic "tax implications" variants
- too much content that reads like it was generated from a title formula instead of a real use case

## Strategic conclusion

Do not scale the current generic blog pattern.

Instead, scale page families that behave like decision support:

- scenario pages
- comparison pages
- worksheet walkthroughs
- tool-adjacent pages
- checklists and templates
- persona playbooks tied to actual situations
- myth-busting / case-file pages

The best future state is not "publish 300 more blog posts."

The best future state is "publish 300 pages across a handful of formats that all help someone make a real money decision."

## What to stop doing

- stop defaulting to `/blog/<slug>` for everything
- stop publishing low-demand comparisons just because a generator can combine two nouns
- stop using "for beginners", "for high earners", and "tax implications" as the main scaling mechanic
- stop treating every page as a long-form article
- stop generating year-stamped titles unless the page truly changes with the tax year

## What to build instead

Use six primary page types.

### 1. Decision pages

Best for:

- "should I do X or Y?"
- "does this make sense in my situation?"
- "what breaks this strategy?"

Examples:

- S-corp vs sole prop breakeven with real overhead
- Roth conversion vs capital gains harvesting in a low-income year
- paying down 8 percent debt vs investing in taxable brokerage

### 2. Tool scenario pages

Best for:

- supporting current calculators and planners
- owning long-tail intent around real examples

Examples:

- backdoor Roth pro-rata calculator for someone with an old SEP IRA
- safe harbor estimated tax example for a W-2 + 1099 household
- capital gains headroom example before a mutual fund distribution

### 3. Worksheet / checklist pages

Best for:

- process-heavy topics
- compliance-heavy topics
- "what do I need before I talk to my CPA?"

Examples:

- QBI deduction worksheet with source-document checklist
- S-corp election readiness checklist
- year-end tax planning prep packet

### 4. Scenario playbooks

Best for:

- personas with a real situation, not a generic demographic swap

Examples:

- tax plan for a physician couple with RSUs and one rental
- entity plan for a consultant crossing $400k net income
- debt cleanup plan for a dentist buying into a practice

### 5. Case files

Best for:

- "what actually happened in this kind of case?"
- showing where popular advice fails

Examples:

- why an S-corp saved less than expected at $180k net income
- why a backdoor Roth failed because of an old rollover IRA
- why a cost segregation study did not pay off on a mediocre deal

### 6. Comparison pages

Best for:

- high-intent decisions
- pages with a clear framework and a real verdict

Examples:

- Augusta Rule vs accountable plan
- QCD vs Roth conversion
- debt avalanche vs liquidity reserve buildup

## Recommended URL architecture

Do not put all 300 pages in `/blog/`.

Recommended structure:

- `/compare/` for high-intent decision pages
- `/tools/` for calculators and planners
- `/worksheets/` for worksheets and walkthroughs
- `/playbooks/` for scenario-driven tactical pages
- `/checklists/` for operational and compliance checklists
- `/case-files/` for myth-busting and real-world breakdowns
- `/for/` for persona pages, but only when the persona truly changes the answer
- `/learn/` for glossary or foundational pages that deserve evergreen hubs

## The LLM content system

The system should not be "give a model a keyword and ask for a 3,000-word blog post."

It should be a structured pipeline.

### Step 1. Pick only high-value topics

Each candidate topic should be scored on:

- practical search intent
- commercial or advisory intent
- ability to attach to a tool, worksheet, or offer
- uniqueness of answer
- defensibility from first-party expertise or source material
- distance from existing content

Kill topics that are:

- generic beginner explainers already saturated by large publishers
- duplicate intent of an existing page
- impossible to keep accurate
- thin without proprietary context

### Step 2. Build a source packet before drafting

For each topic, assemble a research packet with:

- official sources first for tax and retirement topics
- IRS pages, instructions, FAQs, and publications where relevant
- SEC / Investor.gov / SSA / Medicare sources where relevant
- state agency sources for entity and state tax topics
- first-party notes, calculator assumptions, worksheet logic, and comparison logic from this repo
- competitor notes only for gap analysis, not as source-of-truth

Each draft should know:

- what is rule-based
- what is judgment-based
- what is opinion / strategy
- what changes year to year

### Step 3. Generate a structured page brief

Every topic should first produce a JSON brief like:

```json
{
  "slug": "augusta-rule-vs-accountable-plan-s-corp",
  "pageType": "comparison",
  "primaryKeyword": "augusta rule vs accountable plan",
  "intent": "decision",
  "persona": "s-corp owner working from home",
  "coreQuestion": "Which method is more defensible and easier to maintain?",
  "answerFirstVerdict": "Context dependent, but accountable plans are usually easier to run correctly.",
  "mustCover": [
    "qualification gates",
    "documentation burden",
    "worked example",
    "failure modes",
    "questions to ask a CPA"
  ],
  "sourceRequirements": [
    "irs-first",
    "state-specific-if-needed",
    "repo-tool-or-worksheet-if-available"
  ],
  "relatedAssets": [
    "/tools/",
    "/worksheets/",
    "/compare/"
  ]
}
```

This brief should exist before the prose draft.

### Step 4. Draft by page type, not one giant article template

Each page type needs its own structure.

Comparison page:

- who this decision is for
- fast verdict
- when option A wins
- when option B wins
- worked example
- failure modes
- documentation checklist
- advisor questions
- FAQ

Tool scenario page:

- problem setup
- assumptions table
- example inputs
- what the tool does not solve
- worked example
- edge cases
- next-step CTA

Checklist page:

- what this checklist is for
- when to use it
- required inputs or records
- the checklist itself
- common misses
- handoff to CPA / advisor

Playbook page:

- the situation
- what matters most
- decisions in sequence
- common traps
- example scenario
- recommended next action

### Step 5. Run a critique pass

Use a second model or rule-based checker to grade:

- thinness
- duplication
- unsupported claims
- keyword stuffing
- fake precision
- outdated tax-year references
- whether the answer actually changes for the persona or scenario

### Step 6. Add an editorial pass

Check:

- does the page sound like a real advisor-teacher, not a content mill
- is the page useful in the first two screens
- is the intro answering the question, not stalling
- are we linking to the right tools, worksheets, compare pages, and tax strategy pages

### Step 7. Publish only after cannibalization review

Before publish, compare against:

- existing blog content
- compare pages
- worksheets
- tools
- tax strategy pages
- the 300-page backlog

If two pages target the same decision, merge them.

## Quality bar for every generated page

Every page must have:

- a single clear user situation
- a real decision, workflow, or question
- one answer-first section near the top
- one worked example or scenario
- one "what breaks this" section
- one checklist or next-step section
- real internal links
- no generic filler history section
- no fake topical breadth just to hit word count

## Publishing priorities

This site should prioritize topics in this order:

1. tax + entity + retirement decisions with direct advisory value
2. pages that support existing tools and worksheets
3. pages that strengthen compare / case-file clusters
4. debt and investing pages with real scenario intent
5. real estate pages where tax or structure decisions are still strong
6. Airbnb / STR only as a narrower supporting cluster

## 300-topic backlog

The backlog below is intentionally weighted away from Airbnb and toward broad personal finance, taxes, LLC, entity structure, retirement, investing, and debt.

### Cluster 1: S-Corp and Entity Decision Pages (25)

- Reasonable salary for solo agency owners under $300k profit
- Reasonable salary for consultants crossing $500k net income
- Late S-corp election after missing the March deadline
- When an LLC should not elect S-corp status yet
- Augusta Rule vs accountable plan for remote S-corp owners
- Can spouses both be on payroll in a family S-corp?
- Owner draws vs payroll after electing S-corp
- S-corp home office reimbursements without breaking the accountable plan
- One-owner S-corp health insurance setup and W-2 reporting
- Solo 401(k) contributions when owner salary is too low
- S-corp for real estate agents with seasonal commission income
- S-corp for creators with sponsorship, course, and affiliate revenue
- S-corp for agency owners hiring their first employee
- When reasonable salary should change after adding a second business line
- Should an S-corp own rental property directly?
- Switching from sole prop to S-corp mid-year without messy books
- S-corp accountable plan checklist for mileage, phone, and home office
- How low salary triggers scrutiny in low-margin S-corp businesses
- State franchise tax surprises after electing S-corp status
- S-corp election for husband-wife service businesses
- When S-corp savings disappear after payroll and bookkeeping costs
- Year-end cleanup for sloppy S-corp books before filing
- What to ask a CPA before electing S-corp status
- When to unwind an S-corp that no longer makes sense
- LLC taxed as S-corp vs PLLC for licensed professionals

### Cluster 2: Tax Planning for High Earners and Side Businesses (25)

- Tax plan for a $250k W-2 earner with a new consulting LLC
- Tax plan for a dual-income physician household with one rental
- Safe harbor estimated taxes for W-2 plus K-1 income
- Late-year withholding catch-up for high earners with a bonus
- Restricted stock vesting plus Roth conversion sequencing mistakes
- Large bonus year: accelerate deductions or hold cash?
- Can a high earner open a solo 401(k) with side income under $20k?
- Backdoor Roth after forgetting about rollover IRA balances
- Donor-advised fund bunching in a peak-income year
- Mega backdoor Roth vs taxable brokerage after maxing the employer plan
- HSA strategy when income is high but free cash flow is tight
- QBI deduction when one spouse has W-2 income and the other has a business
- High earner tax prep checklist after changing jobs mid-year
- Estimated taxes after a stock sale and business launch in the same year
- Rental losses vs RSU income: what offsets and what does not
- W-2 withholding vs quarterly estimates for married couples with side income
- Moving from California to Texas mid-year: tax planning traps
- Cash reserve policy before aggressive tax planning
- Open enrollment decisions that affect year-end taxes
- What to clean up before meeting a CPA for the first time
- Tax planning after one spouse leaves work to manage rentals
- Audit file checklist for high-income households
- Year-end tax moves when liquidity is trapped inside the business
- Why "make more so you pay more tax" is the wrong frame
- Charitable giving strategy after a concentrated stock windfall

### Cluster 3: Retirement Tax Sequencing and Roth Strategy (25)

- Roth conversions in the gap years before Social Security
- Roth conversion vs capital gains harvesting in a low-income year
- IRMAA guardrails for retirees planning partial conversions
- QCD vs Roth conversion when RMDs start next year
- What to do with a SEP IRA before a backdoor Roth
- Backdoor Roth cleanup after pre-tax IRA contamination
- 401(k) rollover timing around job exit and final bonus payout
- Traditional vs Roth 401(k) for physicians near peak earning years
- Roth conversion after selling a business: when to wait
- Tax-efficient withdrawal order for retirees with rental income
- Sequence-of-returns risk when most assets are in taxable brokerage
- Bond ladder vs cash bucket for the first five retirement years
- NUA vs rollover for concentrated employer stock
- Social Security timing when one spouse has a pension
- HSA drawdown strategy after age 65
- Delaying Medicare because of active coverage and HSA goals
- Roth conversions for widows before bracket compression hits
- Defined benefit plan exit strategy for late-career professionals
- Partial Roth conversions during market drawdowns
- Retiring abroad while keeping US retirement accounts
- 72(t) distributions vs taxable bridge withdrawals
- Inherited IRA distribution planning after rule changes
- Tax planning between retirement date and first pension payment
- When annuities reduce flexibility instead of risk
- Advisor checklist for a retirement tax sequencing plan

### Cluster 4: QBI, Deductions, and Small-Business Tax Execution (25)

- QBI deduction for consultants with high-income W-2 spouses
- QBI deduction after electing S-corp status mid-year
- SSTB phaseout planning before year-end
- QBI deduction when income comes from multiple LLCs
- Rental real estate safe harbor checklist for QBI
- Home office reimbursements inside an S-corp vs Schedule C
- Augusta Rule qualification checklist for home-based owners
- Accountable plan setup for founders with messy books
- Section 179 vs bonus depreciation for owner-operators
- Vehicle write-off choice: actual expenses vs mileage for service businesses
- Hiring your spouse for legitimate tax planning: what actually matters
- Family management company ideas that create more risk than benefit
- Estimated tax mistakes after switching from employee to owner
- When a C-corp fringe benefit is not worth the structure
- Deducting health insurance as a self-employed owner with mixed income
- Quarter-end bookkeeping checklist for tax-ready businesses
- How to prepare a CPA packet after a chaotic first business year
- Cash vs accrual accounting for smaller service firms
- Tax planning after buying equipment late in the year
- Business meals, travel, and documentation rules owners miss
- Multi-member LLC guaranteed payments and owner tax surprises
- When a business bank account does not fix commingling problems
- Year-end deduction triage when profit is higher than expected
- When aggressive deduction strategies hurt financing or sale plans
- Business tax planning checklist for owners crossing $1M revenue

### Cluster 5: Multi-State, LLC, and Compliance Operations (25)

- Multi-state LLC when you live in one state and operate in three
- Foreign qualification triggers for online service businesses
- Registered agent vs physical office: what actually matters
- Moving an LLC to another state without restarting every contract
- California LLC fees after leaving the state
- Texas franchise tax thresholds for service businesses
- Tennessee franchise and excise tax surprises for remote founders
- Single-member LLC with employees in another state
- State nexus from rental activity in multiple states
- When a holding company adds complexity with no real benefit
- Series LLC vs separate LLCs for small portfolios
- Anonymous LLC expectations vs reality for real estate owners
- Asset protection after personally signing leases and loans
- Operating agreement clauses that matter for 50/50 owners
- Buy-sell planning before adding a second partner
- Insurance stack for owner-operators with rentals and a main business
- EIN, bank account, and bookkeeping order of operations for a new LLC
- Beneficial ownership reporting workflow and annual reminders
- Sales tax registration issues for service businesses
- Winding down an unused LLC without lingering state fees
- Converting from partnership taxation to S-corp taxation cleanly
- One EIN and two brands: when it works and when it causes cleanup
- Bookkeeping boundaries between personal, rental, and operating entities
- Business address choices for privacy-minded founders
- Annual compliance calendar for LLC plus S-corp households

### Cluster 6: Debt, Credit, and Cash-Flow Strategy (25)

- Debt avalanche vs building a bigger liquidity reserve first
- Balance transfer vs personal loan refinance for an 18-month payoff plan
- Credit card payoff order when APRs and utilization point in different directions
- HELOC vs personal loan for consolidating variable-rate debt
- Student loan payoff vs brokerage investing for high earners
- Cash-flow plan after a surprise five-figure tax bill
- Mortgage recast vs extra principal payments after a windfall
- Student loan repayment strategy for new attending physicians
- Debt cleanup plan for dentists with practice buy-in loans
- Credit score optimization before applying for a business line of credit
- When debt consolidation lowers payments but worsens total cost
- RSU holders with high income and lifestyle debt: first moves to make
- Should you pause retirement investing to kill 9 percent debt?
- Personal guarantee risk when using business debt for growth
- Emergency fund targets for variable-income households with debt
- Debt snowball vs avalanche for couples with separate debt psychology
- Paying off a car loan vs maxing a Roth IRA
- When a cash-out refinance is a bad debt strategy
- How to prioritize tax debt, consumer debt, and student loans together
- Credit utilization cleanup before a home purchase
- Debt payoff after divorce when accounts and income changed
- Cash-flow triage for self-employed owners with uneven months
- When a 0 percent promo period creates a false sense of progress
- Building a debt dashboard that actually changes behavior
- What to do first after missing multiple payments

### Cluster 7: Investing and Taxable Brokerage Decision Pages (25)

- Asset allocation for high earners still building outside retirement accounts
- Asset location across taxable, Roth, and pre-tax accounts
- Tax-loss harvesting rules real investors actually trip over
- ETF vs mutual fund tax drag in taxable brokerage
- Dividend fund vs total market fund after-tax comparison
- Rebalancing bands vs calendar rebalancing in taxable accounts
- International diversification for investors who already own a lot of US tech
- Short-term Treasury ladder vs high-yield savings for idle cash
- Municipal bonds vs Treasuries for high-income households
- When target-date funds are too blunt for taxable investing
- Concentrated stock unwind plan after employer stock appreciation
- Investing after a liquidity event: what to do in the first 90 days
- Brokerage account setup for spouses with different risk profiles
- Private credit vs public bond funds for income seekers
- Value tilt vs total market simplicity for busy professionals
- Tax-aware charitable giving with appreciated shares
- Asset allocation after adding rental real estate to the net worth mix
- Sequence-of-returns prep for pre-retirees still in accumulation mode
- Using a taxable account as an early-retirement bridge
- T-bills vs CDs vs money market funds for emergency reserves
- When to stop over-optimizing portfolio slices and simplify
- Brokerage investing for households with big RSU exposure
- Tax drag from bond funds in high-tax states
- Cash allocation after selling a business but before building a long-term plan
- Common investing mistakes high-income beginners make in year one

### Cluster 8: Real Estate Tax and Structure Pages (25)

- Real estate professional status vs short-term rental loophole for dual-income couples
- Cost segregation on a first rental: when the study does not pay off
- Cost segregation after renovation vs before first tenant
- Bonus depreciation after phase-down: when the math still works
- Passive loss limits when W-2 income stays high
- Depreciation recapture after converting a rental strategy
- 1031 exchange after mixed personal and rental use
- Vehicle deductions for landlords with multiple properties
- Separate LLCs vs umbrella insurance for small rental owners
- Holding real estate in an S-corp: when not to do it
- Out-of-state rental ownership and composite return issues
- Partnership vs single-member LLC for a two-friend rental deal
- Bookkeeping chart of accounts for small landlords
- Home equity line vs portfolio loan for a property down payment
- Rental real estate QBI safe harbor documentation pack
- When real estate professional status is not worth chasing
- Exit options after a cost-seg-heavy first year
- Installment sale vs full sale on a low-basis property
- When mid-term rentals beat short-term rentals without the hype
- Insurance layering for owners with rentals in LLCs
- Estate planning basics once rental properties sit inside entities
- Debt service coverage vs cash-on-cash for first-time investors
- Refinancing a rental portfolio in a high-rate environment
- Using a solo 401(k) loan for a real estate move: when it backfires
- What breaks asset protection for small landlords first

### Cluster 9: Tool Scenario Library Pages (25)

- Safe harbor estimated tax planner for a W-2 plus 1099 household
- Annualized income estimated tax example for uneven consulting income
- W-2 withholding catch-up planner for a late-year bonus
- Backdoor Roth pro-rata calculator for someone with an old SEP IRA
- IRMAA headroom planner before a partial Roth conversion
- QCD vs Roth conversion planner for a couple starting RMDs
- Capital gains headroom planner before a mutual fund distribution
- Cost segregation payback model for a single-property owner
- Augusta Rule rent comp worksheet by meeting frequency
- REP status hours tracker for spouses splitting work differently
- Installment sale cash-flow planner before a business exit
- Solo 401(k) loan vs HELOC scenario for short-term liquidity
- S-corp breakeven calculator after payroll, bookkeeping, and state fees
- Home office reimbursement calculator for accountable plans
- Debt payoff timeline calculator for multiple APR tiers
- RSU withholding shortfall calculator after a big vest
- Multi-state estimated tax split worksheet for remote founders
- 1031 exchange boot tax scenario calculator
- Asset allocation drift and rebalance threshold calculator
- Bonus depreciation phase-down impact estimator
- Retirement withdrawal tax drag calculator by account mix
- RMD plus IRMAA interaction calculator
- Capital gains stacking example for early retirees
- Solo 401(k) contribution estimator with multiple income streams
- Cash reserve target calculator for variable-income households

### Cluster 10: Templates, Checklists, and Worksheet Walkthroughs (25)

- S-corp accountable plan template
- Augusta Rule meeting log template
- Reasonable salary documentation checklist
- Rental real estate audit file checklist
- New LLC first 30 days checklist
- Operating agreement checklist for married co-owners
- Multi-state LLC compliance calendar template
- High-earner year-end tax meeting checklist
- Roth conversion decision worksheet
- Retirement withdrawal policy statement template
- QBI deduction source-document checklist
- Cost segregation CPA handoff checklist
- 1031 exchange timeline checklist
- Business exit diligence checklist before LOI
- Personal guarantee risk review checklist for business owners
- CPA onboarding checklist for founders with messy books
- Quarterly tax planning one-page dashboard template
- Estate document review checklist for new business owners
- Household cash reserve policy template
- Side-business bookkeeping setup checklist
- Estimated tax calendar template for owner-operators
- Charitable giving decision worksheet for appreciated assets
- Business expense substantiation checklist
- Mid-year tax review checklist after a compensation change
- First advisory meeting worksheet for high-income households

### Cluster 11: High-Intent Comparison Pages (25)

- Augusta Rule vs home office reimbursement for S-corp owners
- W-2 withholding catch-up vs quarterly estimates for bonus-heavy earners
- Roth conversion vs capital gains harvesting in low-income years
- QCD vs donor-advised fund in RMD years
- Bond ladder vs cash bucket in the first five retirement years
- NUA vs IRA rollover for concentrated employer stock
- Mega backdoor Roth vs taxable brokerage for high-income savers
- Debt avalanche vs liquidity reserve buildup for variable-income earners
- Balance transfer vs personal loan refinance for credit card debt
- Series LLC vs separate LLCs for a four-property portfolio
- LLC taxed as S-corp vs sole proprietorship for solo consultants
- Section 179 vs bonus depreciation for owner-operators
- Installment sale vs deferred-comp style payout thinking in a business exit
- HELOC vs portfolio line of credit for temporary liquidity
- Municipal bonds vs Treasuries for high-tax-state investors
- Solo 401(k) loan vs HELOC for down-payment liquidity
- Backdoor Roth vs deductible traditional IRA for borderline-income households
- Donor-advised fund vs bunching on Schedule A without a DAF
- Paying off a mortgage vs investing excess cash in taxable brokerage
- Term life vs permanent life insurance for business-owner families
- Holding company vs direct ownership for small service businesses
- Direct indexing vs index funds for taxable investors
- Partnership vs S-corp for two-owner service firms
- Cash-out refinance vs securities-backed line for liquidity
- Umbrella policy vs LLC layering for small landlords

### Cluster 12: Persona and Life-Event Playbooks (25)

- Tax plan for physicians buying a first rental
- Tax plan for tech employees with RSUs and one side business
- Entity plan for agency owners crossing $500k profit
- Wealth plan for dual-income couples moving from two W-2 jobs to one-business income
- Retirement tax plan for widows in the two years after a spouse dies
- Backdoor Roth cleanup plan for business owners with old SEP IRAs
- Wealth plan for new parents with high W-2 income and no estate documents
- Tax cleanup plan for freelancers forming a first LLC mid-year
- Retirement withdrawal plan for pre-retirees with pension plus rental income
- Debt cleanup plan for dentists with practice loans
- Asset protection plan for real estate agents signing personal guarantees
- Tax plan for creators with sponsorship, course, and affiliate income
- Wealth plan for consultants relocating states mid-year
- Tax plan for divorced high earners updating filing strategy
- Retirement plan for self-employed couples with uneven income
- Cash-flow plan for founders after a large tax bill surprise
- Business structure plan for spouses running separate service businesses
- Tax plan for first-year six-figure side hustlers
- Estate and entity plan for parents holding rentals in LLCs
- Early-retirement bridge plan for people leaving corporate jobs at 50
- Student loan and investing plan for new attending physicians
- Risk-control plan for owners scaling from one entity to several
- Tax plan for households selling a business in the next 24 months
- Wealth reset plan after a seven-figure liquidity event
- What a first year with a real CPA should look like for a high-income household

## How to publish the 300 topics

Do not publish 300 pages at once.

Use four waves.

### Wave 1: 40 pages

Prioritize:

- tools and worksheet support pages
- comparison pages with direct decision intent
- S-corp, QBI, Roth, IRMAA, and debt topics with strong advisory value

### Wave 2: 80 pages

Prioritize:

- playbooks
- case files
- multi-state and compliance topics
- deeper investing and taxable brokerage topics

### Wave 3: 80 pages

Prioritize:

- real estate tax and entity topics
- more advanced retirement sequencing pages
- higher-complexity comparison pages

### Wave 4: 100 pages

Prioritize:

- remaining long-tail persona pages
- remaining template and checklist pages
- only the topics that prove demand in Search Console and internal engagement data

## Internal linking model

Every new page should link into a cluster, not float on its own.

Recommended hubs:

- tax planning
- retirement planning
- entity structure
- debt and cash flow
- investing
- real estate tax strategy
- tools
- worksheets
- comparisons
- case files

Each spoke page should link to:

- one parent hub
- one sibling comparison page
- one tool or worksheet page if relevant
- one bottom-funnel CTA path

## Measurement

Track these metrics by page family, not just sitewide:

- indexation rate
- impressions
- clicks
- average position
- scroll depth
- CTR from page to tool / worksheet / CTA
- assisted conversions
- pages merged or killed due to cannibalization

## The main implementation rule

If a topic cannot produce:

- a real answer-first takeaway
- a worked example
- a checklist or decision framework
- and a clear internal-link destination

do not publish it.

## Best next move

If you want to execute this plan cleanly, the first production step should be:

1. dedupe the existing `content/blog/` inventory and `data/seo-topics-1000.json`
2. define the canonical page types and URL destinations
3. ship a first batch of 40 pages centered on tools, worksheets, S-corp, QBI, Roth, IRMAA, debt, and entity decisions
4. use those 40 pages to calibrate the prompts, review workflow, and internal linking before scaling further
