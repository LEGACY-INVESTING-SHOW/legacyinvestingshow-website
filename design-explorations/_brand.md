# Exploration chrome brand

Captured Sep 8, 2026 by hand (scan script could not be installed in this session).

## Sources

- `tailwind.config.js` `theme.extend.colors.brand`: navy `#0F172A` (ink), gold `#D4A853` (accent), cream `#FAF7F2` and `#F5F0E8` (paper), border `#E2E8F0`, muted text `#64748B`.
- `tailwind.config.js` `fontFamily`: display `DM Serif Display`, sans `Plus Jakarta Sans`.
- `tools/` calculators app (Next.js export): cream paper, dark forest button, Inter-like sans. Treated as a sub-brand; the chrome uses the site brand above.

## Adaptation

- Paper: cream `#FAF7F2`, cards `#FFFFFF`.
- Ink: navy `#0F172A`. Accent: gold `#B8933F` on light paper (darkened for contrast), badges navy.
- Fonts: Plus Jakarta Sans body, DM Serif Display for titles. System fallbacks on every stack.
- Radius small (6 to 10px), spacing generous, no shadows heavier than the template default.

No design-system doc exists in the repo. Say "rebrand the explorations" to adjust the chrome.
