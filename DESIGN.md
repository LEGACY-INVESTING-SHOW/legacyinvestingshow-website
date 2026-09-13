# DESIGN.md — Legacy Investing Show

The visual system for legacyinvestingshow.com. Read this before touching any page, template, or stylesheet.

## Identity

Money decisions for high earners: tax law, worked examples, dollar figures, IRS rules, real people's results. The vernacular is the ledger and the worked calculation, so **numbers are the identity**: the memorable device on every page is a display figure taken from the page's own content (a rate, a deduction, a student's monthly income), set in the display face at 3–5rem with tabular numerals. One per section at most; never invented.

## Palette

| Token | Value | Role |
| --- | --- | --- |
| Navy | `#0F172A` | Text; full-bleed section surface used once or twice per page (opener band, key figure, CTA) |
| Navy light | `#1E293B` | Secondary dark surface |
| Gold | `#C9A961` | Block color for the single most important figure or the primary button; thin rules under section titles. Never body text. |
| Gold text | `#8A6F35` | Gold as text on light surfaces (≥ 4.5:1) |
| Cream | `#FAF7F2` | Page ground |
| Cream dark | `#F5F0E8` | Alternate section surface, zebra table rows |
| White | `#FFFFFF` | The reading "sheet" for prose and tables |
| Text secondary | `#334155` | Supporting copy |
| Text muted | `#5B6B84` | Meta lines at 0.875rem or larger |
| Border | `#E2E8F0` | 1px hairlines |

Text on navy is tinted from navy (`#F5F0E8`, `#CBD5E1`), never neutral gray.

## Type

- Display: **DM Serif Display** 400 (italic 400) — page openers at clamp(2.75rem, 6vw, 5rem), section titles at clamp(2rem, 3.5vw, 2.75rem), display figures, pull-quotes, the wordmark. Self-hosted from `assets/fonts/`.
- Text: **Plus Jakarta Sans** variable 400–600 — everything else. Lede 1.25–1.375rem / 1.5, body 1.0625rem / 1.7, measure 60–70ch. Self-hosted.
- No italic or colored single-word accents inside headings. No all-caps labels. Sentence case.
- Tables and figures use `font-variant-numeric: tabular-nums`. Headings use `text-wrap: balance`.

## Surfaces and rhythm

Every page alternates at least three surfaces so nothing reads as one wall: cream opener → white sheet with marginalia → navy band (a key figure, a pull-quote, or the CTA) → cream-dark data section. Full-bleed navy bands break long reads every three or four sections.

Layout is an asymmetric 12-column editorial grid: prose in 7–8 columns, marginalia (a figure, a definition list, a source, a photo) beside it, stacking under the prose on mobile. Long guides carry a sticky in-page contents rail on desktop that collapses to `<details>` on mobile.

Photography is real (Preston, family, students) at generous sizes with a 2px gold hairline offset frame and an optional navy caption bar. No drop shadows.

## Component kit (`assets/css/input.css`, block marked `/* KIT v2 */`, outside `@layer`)

`.section` / `.section__head` / `.section__summary` · `.opener` (+ `__title`, `__lede`, `__actions`, `__aside`) · `.figure` (+ `__value`, `__label`, `__note`, `--gold`, `--navy`, `--sm`, `.figure-row`) · `.band` (+ `--cream-dark`, `--white`, `--pad`) · `.sheet` · `.marginalia` (+ `__main`, `__aside`) · `.contents-rail` · `.dl-terms` (+ `--cols`) · `.data-table` (navy header row, zebra rows, inside `.table-scroll`) · `.steps` (serif counters; only for real sequences) · `.pull-quote` · `.photo` (+ `--pair`, `__caption`) · `.btn-primary` / `.btn-secondary` / `.btn--on-navy` · `.cta-band` · `.rule-list` · `.facts`.

Guide pages add `assets/css/guides.css`; blog pages add `assets/css/blog.css`. Both consume the kit and only add what is specific to their surface.

## Rules

1. Cards are not layout. A bordered or tinted panel is a distinct object: a sheet, a table, a figure, a CTA band. Never a card inside a card, never a grid of same-size cards.
2. No eyebrow or kicker labels, no numbered markers on non-sequences, no icon tiles, no emoji as icons, no pill chips as decoration, no gradient text, no glow shadows, no colored side-stripe borders, no middle-dot meta strings, no arrows appended to link text.
3. Copy says each thing once. Cut intros that restate the heading and unverifiable claims. Keep facts, worked examples, tables, FAQs, and internal links.
4. One motion moment per page at most (the primary button's fill on hover); exponential ease-out; nothing on scroll; `prefers-reduced-motion` respected.
5. Browser surfaces are themed: selection, focus ring (2px gold, 3px offset), scrollbar, underline offset.
6. Mobile: 16px minimum gutter, no horizontal scroll, tables inside `.table-scroll`.
7. One H1 per page. Heading levels never skip.

## Shared shell

`scripts/lib/site-shell.js` renders the head assets (font preloads + stylesheet), the header (typographic wordmark, primary nav: Home · About · Tax Strategies · Compare · Tools · Blog) and the footer (brand line, three link groups, legal). Generators call it; `scripts/sync-static-shell.js` rewrites the hand-written pages from it on every build so the shell never drifts. There is no logo image: the committed `logo.png` is corrupt, so the brand is set in type.
