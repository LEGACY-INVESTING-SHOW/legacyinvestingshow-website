# DESIGN.md — Legacy Investing Show

The visual system for legacyinvestingshow.com. Read this before touching any page, template, or stylesheet. It matches the Prep Kit PDF guides, adapted for the web and softened.

## The feel in one line

A calm field guide on cream paper. Forest green ink, one thin gold accent, plain sans type, rounded and friendly. Nothing that looks like a card, a dashboard, or a bank brochure.

## Colors

| Token | Hex | Use |
| --- | --- | --- |
| `--paper` | `#FBF8F1` | Page background everywhere |
| `--ivory` | `#F3EDDF` | Zebra rows on long tables, image placeholders |
| `--line` | `#DDD4BE` | Hairlines |
| `--ink` | `#1F2A24` | Body text |
| `--ink-soft` | `#4A5850` | Secondary text, ledes, captions |
| `--ink-faint` | `#7D877F` | Meta lines, footers |
| `--forest` | `#16352A` | Headings, buttons, the homepage opener, "Do this week" and CTA blocks, footer |
| `--emerald` | `#2F7D5B` | Links, key lines, list markers, labels |
| `--emerald-tint` | `#E4EFE5` | Worked-example callouts |
| `--gold` | `#D9A93D` | Rules under h2, table header underline, primary button |
| `--gold-ink` | `#8A6510` | Gold callout label |
| `--gold-tint` | `#F6ECD3` | Reading-instruction and summary callouts |
| `--rose` / `--rose-tint` | `#B0503C` / `#F6E4DD` | Warnings only |

Green is the main color. Gold is an accent. Rose is only for warnings. Text on forest is `#EAF0EA`, bold on forest `#FBF8F1`, labels on forest gold. Never pure black or white. No gradients, glows, or shadows.

## Type

One family: **Public Sans** (variable 400–700, self-hosted in `assets/fonts/`).

- h1: clamp(2rem, 4.5vw, 3rem) / 1.1, weight 600, forest, balanced.
- Key line under an h1: 1.125rem, weight 500, emerald. One sentence.
- h2: clamp(1.5rem, 2.6vw, 1.875rem), weight 600, forest, with a 2.25rem × 2px gold rule below.
- h3: 1.125rem, 600. h4: .9375rem, 700.
- Body: 1.0625rem / 1.65, measure 68ch. Bold in body is weight 600 in forest.
- Labels (DO THIS WEEK, table headers): .75rem, uppercase, letter-spacing .16em, weight 700.
- Tabular numerals in tables. Sentence case everywhere. No em dashes.

## Shape

Buttons are pills. Photos have 16px corners and no frame. The only filled blocks are the homepage opener, the "Do this week" block, the closing CTA block, and the three callout tints, all with 16px corners and no border. Everything else is separated by whitespace and hairlines. No cards, sheets, panels, side stripes, or nested boxes.

## Components (`assets/css/input.css`, block marked `/* FIELD GUIDE v3 */`)

`.opener` (+ `--forest` on the homepage) · `.do` · `.words` · `.callout` (+ `--gold`, `--warn`) · `.big` · `.table-inset` + table rules (+ `.table--zebra`, `.cap`) · `.steps` · `.check` · `.toc` · `.cta` · `.list-rows` · `.faq` · `.pull-quote` · `.btn-primary` / `.btn-secondary`.

Tables never span the full column: they sit inside `.table-inset` at up to 34rem, headers in small caps over a gold underline, hairline rows, numbers right-aligned, a caption below.

## Page grammar

Opener (h1, key line, lede, actions) → "On this page" list on long pages → prose in one column with inset tables, callouts for worked examples, one big statement per section at most → FAQ rows → sources list → "Do this next" block on guides → one CTA block. Blog posts end without a CTA block.

## Writing

Short sentences. Plain words first, then the real term. Keep every number, date, and source exact. No sales language or promised results. Every guide ends in three or four actions that take under an hour.

## Shared shell

`scripts/lib/site-shell.js` renders the head assets, the paper header (wordmark, nav) and the forest footer. Generators call it; `scripts/sync-static-shell.js` rewrites the hand-written pages from it on every build.
