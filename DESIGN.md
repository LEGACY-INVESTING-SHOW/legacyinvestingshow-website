# DESIGN.md — Legacy Investing Show

The visual system for legacyinvestingshow.com. Read this before touching any page, template, or stylesheet.

## Palette

| Token | Value | Use |
| --- | --- | --- |
| Navy | `#0F172A` | Headings, body text, nav, the one dark CTA band per page |
| Navy light | `#1E293B` | Secondary dark surfaces |
| Gold | `#C9A961` | Rules, small accents, hover underline. Never body text on cream. |
| Gold text | `#8A6F35` | Gold as *text* on cream/white (passes 4.5:1) |
| Cream | `#FAF7F2` | Page background |
| Cream dark | `#F5F0E8` | Alternate section background, table stripes |
| White | `#FFFFFF` | Reading surfaces, tables |
| Text secondary | `#334155` | Supporting copy |
| Text muted | `#64748B` | Meta lines (dates, read time) at 0.875rem or larger only |
| Border | `#E2E8F0` | 1px hairlines |

Text on a navy surface is tinted from navy (`#CBD5E1` and lighter), never neutral gray.

## Type

- Display: **DM Serif Display** 400 (italic 400) — headings and pull-quotes. Self-hosted from `assets/fonts/`.
- Text: **Plus Jakarta Sans** variable 400–700 — everything else. Self-hosted.
- Body 1.0625rem / 1.7, measure 65–75ch. Headings tracked −0.02em, balanced (`text-wrap: balance`).
- Figures in tables use `font-variant-numeric: tabular-nums`.
- Scale: h1 clamp(2.5rem, 5vw, 4rem) · h2 clamp(1.875rem, 3.5vw, 2.5rem) · h3 1.375rem · h4 1.125rem. Labels ≥0.75rem; no all-caps body text.

## Registers

- **Read** (default): blog, tax strategies, compare, topics, markets, retirement, renters insurance. Single column, generous whitespace, hairline rules, tables for comparisons, definition lists for facts.
- **Persuade**: homepage hero and CTA band, About CTA, program funnels. Sales funnels under their own directories keep their own systems and are out of scope.

## Structure rules

1. Cards are not layout. Use rules, spacing, columns, lists, and tables. A bordered or tinted panel is allowed only for a distinct object: a table, a form, a pull-quote, a CTA band. Never a card inside a card.
2. No eyebrow/kicker labels above headings. No section numbers. No icon tiles above headings. No emoji as icons.
3. No hero-metric stacks, no pill chips as decoration, no gradient text, no glow or halo shadows, no colored side-stripe borders, no pulsing dots, no bounce easing, no per-section scroll fade-ins.
4. One navy CTA band per page at most, placed after the reader has received value.
5. Copy says each thing once. Cut intros that restate the heading, "in this guide you will", motivational filler, and unverifiable claims. Keep facts, worked examples, tables, FAQs, and internal links.
6. Motion: at most one authored moment per page; `cubic-bezier(0.16, 1, 0.3, 1)` ease-out; respect `prefers-reduced-motion`.
7. Browser surfaces are themed: selection (gold tint), focus ring (2px gold, 3px offset), scrollbar, underline offset 0.15em.
8. Mobile: 16px minimum side gutter, no horizontal scroll, tables inside `overflow-x: auto`.

## Shared shell

Header: wordmark + primary nav (About · Tax Strategies · Compare · Tools · Blog). Footer: brand line, four link groups, legal. Both come from `scripts/lib/site-shell.js` for generated pages and are mirrored verbatim in the static pages.
