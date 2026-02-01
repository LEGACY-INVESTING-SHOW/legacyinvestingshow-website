---
name: generate-city-page
description: Generate an SEO-optimized city landing page for Airbnb arbitrage. Use when creating location-specific content like "Airbnb Arbitrage in Austin" or "Best markets for short-term rentals". Triggers on "city page", "location page", "market page", "airbnb in [city]".
argument-hint: <city> <state>
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Grep, Glob, WebSearch, WebFetch
---

# Generate City Landing Page

Create a programmatic SEO landing page for Airbnb arbitrage in a specific city.

## Arguments

$ARGUMENTS should contain:
- City name (required)
- State abbreviation (required)

Example: `/generate-city-page Austin TX`

## Step 1: Research City Data

Use web search to gather current data about the city:

### Data Points to Research
1. **Market Statistics**
   - Average daily rate (ADR) for Airbnb in the city
   - Occupancy rates
   - Number of active listings
   - Revenue potential

2. **Regulations**
   - STR permit requirements
   - Zoning restrictions
   - Tax requirements (TOT/occupancy tax)
   - Any recent regulation changes

3. **Market Context**
   - Population and tourism stats
   - Major attractions/events
   - Seasonal patterns
   - Economic factors

4. **Neighborhoods**
   - Best areas for Airbnb arbitrage
   - Neighborhood characteristics
   - Price ranges by area

### Research Commands
```
WebSearch: "Airbnb regulations [CITY] [STATE] 2026"
WebSearch: "average Airbnb revenue [CITY] 2025 2026"
WebSearch: "best neighborhoods airbnb [CITY]"
WebSearch: "[CITY] short term rental permit requirements"
```

## Step 2: Generate Content

Create a markdown file with this structure:

### Frontmatter

```yaml
---
title: "Airbnb Arbitrage in [City], [State]: Complete 2026 Guide"
description: "Learn how to start Airbnb arbitrage in [City], [State]. Discover the best neighborhoods, revenue potential, and local regulations for short-term rentals."
date: [TODAY'S DATE]
modifiedDate: [TODAY'S DATE]
author: Preston Seo
category: City Guides
tags:
  - airbnb arbitrage
  - [city lowercase]
  - [state lowercase]
  - short-term rentals
  - passive income
image: /assets/images/cities/[city-slug].jpg
imageAlt: "Airbnb arbitrage opportunities in [City], [State]"
featured: false
schema:
  type: Article
location:
  city: "[City]"
  state: "[State]"
  region: "[Region - e.g., Southwest, Southeast]"
marketData:
  averageDailyRate: [NUMBER]
  occupancyRate: [PERCENTAGE]
  averageMonthlyRevenue: [NUMBER]
  activeListings: [NUMBER]
faq:
  - question: "Is Airbnb arbitrage legal in [City]?"
    answer: "[City] [allows/regulates] short-term rentals with [specific requirements]. Hosts must [key requirement]."
  - question: "How much can you make with Airbnb arbitrage in [City]?"
    answer: "The average Airbnb in [City] generates $[amount]/month with an [X]% occupancy rate. Top performers earn $[higher amount]/month."
  - question: "What neighborhoods are best for Airbnb in [City]?"
    answer: "The top neighborhoods for Airbnb arbitrage in [City] include [Neighborhood 1], [Neighborhood 2], and [Neighborhood 3], each offering [key benefit]."
  - question: "Do you need a permit for Airbnb in [City]?"
    answer: "[Yes/No], [City] requires [specific permit/license type] for short-term rentals. The permit costs approximately $[amount] and requires [key requirements]."
statistics:
  - value: "$[ADR]"
    label: "Average Daily Rate"
    source: "AirDNA, [Month] 2026"
  - value: "[X]%"
    label: "Average Occupancy"
    source: "AirDNA, [Month] 2026"
  - value: "$[MONTHLY]"
    label: "Average Monthly Revenue"
    source: "Calculated from ADR × Occupancy × 30"
---
```

### Content Structure

```markdown
**Airbnb arbitrage in [City], [State] offers strong income potential with average properties generating $[X,XXX]-$[X,XXX] per month.** With [X]% occupancy rates and an average daily rate of $[XXX], [City] ranks among the [top X / promising / growing] markets for short-term rental arbitrage in 2026.

## Quick Overview: [City] Airbnb Market

| Metric | Value |
|--------|-------|
| Average Daily Rate | $[XXX] |
| Occupancy Rate | [XX]% |
| Average Monthly Revenue | $[X,XXX] |
| Active Listings | [X,XXX]+ |
| Permit Required | [Yes/No] |

## Why [City] is Great for Airbnb Arbitrage

[City] offers several advantages for Airbnb arbitrage investors:

### 1. Strong Tourism Market
[2-3 sentences about tourism - visitors per year, major attractions, events]

### 2. Favorable Economics
[2-3 sentences about rent prices, revenue potential, margins]

### 3. [Third Unique Advantage]
[2-3 sentences about something specific to this city]

## Revenue Potential by Property Type

| Property Type | Avg. Monthly Rent | Avg. Airbnb Revenue | Est. Monthly Profit |
|--------------|-------------------|---------------------|---------------------|
| 1BR Apartment | $[X,XXX] | $[X,XXX] | $[X,XXX] |
| 2BR Apartment | $[X,XXX] | $[X,XXX] | $[X,XXX] |
| 3BR House | $[X,XXX] | $[X,XXX] | $[X,XXX] |

*Note: Actual results vary based on location, amenities, and management quality.*

## Best Neighborhoods for Airbnb Arbitrage in [City]

### 1. [Neighborhood 1]
**Why it works:** [Key reason - tourism, walkability, attractions]
- Average rent: $[X,XXX]/month
- Airbnb potential: $[X,XXX]/month
- Best for: [Guest type - tourists, business travelers, families]

### 2. [Neighborhood 2]
**Why it works:** [Key reason]
- Average rent: $[X,XXX]/month
- Airbnb potential: $[X,XXX]/month
- Best for: [Guest type]

### 3. [Neighborhood 3]
**Why it works:** [Key reason]
- Average rent: $[X,XXX]/month
- Airbnb potential: $[X,XXX]/month
- Best for: [Guest type]

### Neighborhoods to Avoid
[Mention any areas with strict regulations, low demand, or poor ROI]

## [City] Short-Term Rental Regulations

> **Important:** Regulations change frequently. Always verify current requirements with the [City] [relevant department] before starting.

### Permit Requirements
[Detailed information about permit process]

### Key Regulations
- **Registration**: [Required/Not required] - [Details]
- **Occupancy Tax**: [X]% collected and remitted to [entity]
- **Zoning Restrictions**: [Any zoning limitations]
- **Owner Occupancy**: [Required/Not required]
- **Maximum Nights**: [Any annual limits]

### How to Get Your STR Permit
1. [Step 1 with specific detail]
2. [Step 2]
3. [Step 3]
4. [Step 4]

**Cost**: Approximately $[XXX] for initial permit
**Timeline**: [X] weeks for approval

## Seasonal Trends in [City]

### Peak Season
**[Months]**: [High/Low] season due to [reason - weather, events, tourism]
- Occupancy: [XX]%
- Rates: [XX]% above average

### Shoulder Season
**[Months]**: [Description]
- Occupancy: [XX]%
- Rates: Near average

### Off-Peak Season
**[Months]**: [Description]
- Occupancy: [XX]%
- Rates: [XX]% below average

**Pro Tip:** [Specific advice for maximizing revenue year-round in this market]

## Getting Started with Airbnb Arbitrage in [City]

### Step 1: Research Your Target Neighborhood
Focus on [recommended neighborhoods] and analyze comparable listings.

### Step 2: Find Arbitrage-Friendly Landlords
Look for properties where landlords are open to subletting. [Any city-specific tips]

### Step 3: Set Up Your Business
Register your business, obtain necessary permits, and set up proper insurance.

### Step 4: Furnish and List
Design your space for [City]'s target guests. [City-specific design tips if applicable]

### Step 5: Optimize and Scale
Once your first property is profitable, repeat the process in other neighborhoods.

## Success Story: Legacy Investing Show Student in [City]

[If there's a student case study in this market, include a brief summary with link]

> "Quote from student about their success in this market"
> — [Student Name], Legacy Investing Show Student

[Or if no specific student in this market:]

Many Legacy Investing Show students have found success in markets similar to [City]. [Link to relevant success story or general success stories page]

## Frequently Asked Questions

### Is Airbnb arbitrage legal in [City], [State]?
[Comprehensive answer about legality and regulations]

### How much does it cost to start Airbnb arbitrage in [City]?
The typical startup cost for an Airbnb arbitrage property in [City] is $[X,XXX]-$[X,XXX], which includes:
- First month's rent: $[X,XXX]
- Security deposit: $[X,XXX]
- Furnishing: $[X,XXX]-$[X,XXX]
- Permits and fees: $[XXX]
- Initial supplies: $[XXX]

### What is the average ROI for Airbnb arbitrage in [City]?
With average monthly revenue of $[X,XXX] and typical rent of $[X,XXX], investors can expect a monthly profit of $[X,XXX]-$[X,XXX], representing [XX]%+ cash-on-cash return on initial investment.

### Do I need to live in [City] to do Airbnb arbitrage there?
[Answer about remote management possibilities]

### What's the best property size for [City]?
Based on market data, [2BR apartments / 3BR houses / etc.] tend to perform best in [City] due to [reason - family tourism, business travel, etc.].

## Nearby Markets to Consider

Also explore Airbnb arbitrage opportunities in:
- [[Nearby City 1], [State]](/airbnb-arbitrage-[nearby-city-1])
- [[Nearby City 2], [State]](/airbnb-arbitrage-[nearby-city-2])
- [[Nearby City 3], [State]](/airbnb-arbitrage-[nearby-city-3])

## Start Your [City] Airbnb Arbitrage Business

Ready to launch your Airbnb arbitrage business in [City]? Legacy Investing Show provides the complete system, mentorship, and community to help you succeed.

[Learn How Legacy Investing Show Can Help You →](/programs)

---

*Data sources: AirDNA, [City] [Department], U.S. Census Bureau. Last updated: [Month] 2026. Market conditions change—always conduct your own research before investing.*
```

## Step 3: Save the File

Save to: `content/cities/airbnb-arbitrage-[city-slug].md`

Where `[city-slug]` is the city name in lowercase with hyphens (e.g., "austin", "los-angeles").

## Step 4: Differentiation Check

Verify the content meets the 30% differentiation requirement:
- [ ] City-specific statistics (unique ADR, occupancy, revenue)
- [ ] Local regulations (unique to this city)
- [ ] Specific neighborhoods (3+ unique recommendations)
- [ ] Local market context (tourism, events, economy)
- [ ] Custom FAQ answers

## Step 5: Verify Output

After generating, verify:
- [ ] All statistics have real values researched from web
- [ ] Regulations are current (2025-2026)
- [ ] Neighborhoods are accurate for this city
- [ ] No placeholder text remains
- [ ] Word count is 1,500+ words
- [ ] Internal links to other city pages work

## Step 6: Build Command

```bash
npm run build:blog
npm run start
# Preview at http://localhost:3000/airbnb-arbitrage-[city-slug]
```

## Quality Standards

- **Unique Content**: Minimum 30% different from other city pages
- **Current Data**: All statistics from 2025-2026 sources
- **Verified Regulations**: Link to official city sources
- **GEO Optimized**: Answer-first format with statistics in first paragraph
- **FAQ Schema Ready**: 4-5 questions that match search intent
