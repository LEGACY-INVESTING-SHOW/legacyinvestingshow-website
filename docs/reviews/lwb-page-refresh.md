# Legacy Wealth Blueprint page refresh

The page keeps its pre-call purpose and puts the existing walkthrough beside a clearer introduction. It now shows a named interview library, redacted plan images with enlargement controls, the existing plan videos, specific membership deliverables, and preparation questions.

## Sources

- Target: https://www.legacyinvestingshow.com/legacy-wealth-blueprint
- Proof: https://www.lwblive.com/successstories
- Proof repository: https://github.com/LEGACY-INVESTING-SHOW/str-webinar
- Offer: `Legacy Investing Show Offers.md`, current canonical business document dated August 10, 2026.
- Full asset provenance and original provider titles: `data/lwb-success-stories.json`.

The four success-stories videos are included once each. The existing Abigail ID was reused. The newer Shawn upload replaces the older 83-second upload with the same title and interview visuals. The two distinct existing Shawn clips and the original walkthrough remain. Three selected plan screenshots are copied locally; the three original motion previews remain available with playback controls.

The copy distinguishes projected plan figures from realized results and retains Stephanie's qualification that the program was not solely responsible for her refund. The current offer document does not specify guarantee terms, so the FAQ directs readers to confirm the current written terms instead of repeating an unqualified return promise.

## Design (Sep 7, 2026 pass)

The page uses the forest green and gold from the walkthrough video, with ivory and paper sections between the green ones. Type is Literata for headings and Hanken Grotesk for body copy. Colors are OKLCH tokens at the top of the CSS. The plan section leads with one full-width snapshot and two smaller ones. The client section renders every quote in the JSON, with the first quote set large. Copy was rewritten so each heading carries a claim and the one action on the page is to watch the walkthrough before the call.

## Maintenance

Edit `templates/legacy-wealth-blueprint.html` for page copy and structure and `data/lwb-success-stories.json` for videos and snapshots. `npm run build:lwb` generates the root HTML. The full build runs this step before tracking and metadata normalization. Page CSS and behavior are in `assets/css/legacy-wealth-blueprint.css` and `assets/js/legacy-wealth-blueprint.js`.

## Verification

- Full production build passed.
- Focused builder tests cover all source videos, duplicate exclusion, and invalid IDs.
- All seven Vimeo players started and could be paused in the real browser.
- Reviewed desktop and 390-pixel mobile layouts; the 320-pixel layout has no horizontal overflow.
- Checked image dialog opening, Escape dismissal, full-size image link, FAQ expansion, and preserved motion-preview controls.
- All 18 local page asset URLs returned HTTP 200.
