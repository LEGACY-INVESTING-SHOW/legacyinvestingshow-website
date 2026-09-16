# DESIGN.md — Legacy Investing Show

The visual system for legacyinvestingshow.com. Read this before touching any page, template, or stylesheet.

## The feel in one line

A quiet editorial house on cool stone paper. Green-black ink, one forest action, gold only as a private mark. Considered, not sparse. Nothing that looks like a course funnel, a bank brochure, or a developer landing page.

## What this is not

Not a cream field-guide PDF. Not gold pills stacked on forest slabs. Not executor.sh: not pure white, not black rectangles, not Inter, not numbered 01/02/03 heroes, not a clone of their wordmark.

## Colors

| Token | Hex | Use |
| --- | --- | --- |
| `--paper` | `#F6F5F0` | Page background everywhere |
| `--ivory` | `#EDECE6` | Alternate table rows, quiet callouts |
| `--line` | `#DDDCD4` | Hairlines |
| `--ink` | `#1A211D` | Body and headings |
| `--ink-soft` | `#4E5752` | Ledes, captions |
| `--ink-faint` | `#6B736E` | Meta, footer titles |
| `--forest` | `#16352A` | Wordmark, primary button, links |
| `--emerald` | `#2A6B4E` | List markers, quiet emphasis |
| `--gold` | `#B8954A` | The 6px square beside the wordmark. Nowhere else as a system accent. |
| `--rose` / `--rose-tint` | `#B0503C` / `#F6E4DD` | Warnings only |

Forest recedes. Gold recedes further. No filled forest hero, no filled forest footer, no gold rule under headings, no gold pill buttons.

## Type

One family: **Public Sans** (variable 400–700, self-hosted in `assets/fonts/`).

- h1: clamp(2.375rem, 5.5vw, 3.75rem) / 1.06, weight 500, ink, tracking -0.03em.
- Key line under an h1: 1.125rem, weight 500, ink-soft. One sentence. Not emerald, not gold.
- h2: clamp(1.5rem, 2.8vw, 2rem) / 1.18, weight 600, ink. No decorative rule.
- h3: 1.125rem, 600. h4: 0.9375rem, 600.
- Body: 1.0625rem / 1.7, measure 68ch.
- Labels: 0.8125rem, sentence case, tracking 0.04em, ink-faint. Not uppercase.

## Shape

Buttons are 6px, not pills. Photos are 8px. Filled blocks are rare. Structure comes from whitespace and hairlines. No cards, sheets, panels, or nested boxes.

## Components (`assets/css/input.css`, block marked `FIELD GUIDE v4`)

`.opener` · `.do` · `.words` · `.callout` (+ `--warn`) · `.big` · `.table-inset` · `.steps` · `.check` · `.toc` · `.cta` · `.list-rows` · `.faq` · `.pull-quote` · `.btn-primary` / `.btn-secondary`.

`.btn-primary` is forest on paper. `.btn-secondary` is a text link, never a second filled button. One primary action per section.

`.cta` and `.do` sit on paper behind a hairline, not inside a forest slab.

## Page grammar

Opener (h1, key line, lede, one action) → optional "On this page" → one-column prose → FAQ → one closing action. Blog posts end without a CTA block.

## Writing

Short sentences. Plain words first. Keep every number, date, and source exact. No sales language.

## Shared shell

`scripts/lib/site-shell.js` renders the head assets, the paper header (gold-tick wordmark, nav) and the paper footer. Generators call it; `scripts/sync-static-shell.js` rewrites the hand-written pages from it on every build. The wordmark is the home link. Nav does not repeat Home.
