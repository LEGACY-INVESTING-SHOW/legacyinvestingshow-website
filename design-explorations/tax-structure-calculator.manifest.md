# Data manifest: Tax Structure Calculator exploration

Fixture: $150,000, single, 2026 tables, original carousel rental preset. All values come from `assets/js/tax-structure-model.js` with `data/calculators/tax-structure.json`, so every element is computed, not stored.

| Element | Field path | Class | Notes |
| --- | --- | --- | --- |
| Amount, filing status | inputs | ✅ Real | user input, defaults from JSON |
| W-2 income tax, SS, Medicare, total, rate, kept | `wages.*` | ✅ Real | computed every render |
| Gains tax, NIIT, total, rate, kept | `gains.*` | ✅ Real | computed |
| Rent, expenses, depreciation lines, taxable result, tax, cash left | `rental.*` | ✅ Real | computed |
| Split mode totals | `calculateSplit()` | ✅ Real | already in the model |
| "Swipe" teaser line (D) | derived from other paths | ✅ Real | derive from the same result |
| Slider (C) | `amount` | ✅ Real | already built |

No aspirational elements. Nothing in any variant depends on data the tool does not have.
