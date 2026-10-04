# Visual migration acceptance

## Stage 1

- Source: `/Users/meltcado/.codex/visualizations/2026/10/04/01a107ab-c182-7270-bb43-8a7e8f05f02c/deuceline-glass/preview-desktop.png`
- Implementation: `/Users/meltcado/.codex/visualizations/2026/10/04/01a107c4-e75c-7be1-ae59-d1cda9c31346/deuceline-stage1-desktop.jpg`
- Mobile evidence: same directory, `deuceline-stage1-mobile.jpg`.
- Source and implementation: 1280 × 900 pixels, CSS viewport 1280 × 900, DPR 1.
  Mobile: CSS viewport 390 × 844, DPR 1; full-page capture includes scrollable content.
- State: Overview, Wimbledon day, same canonical 14-match input, settled 8–6 count-up.
- Full-view comparison: source and implementation opened together in one comparison input;
  subsequent final capture confirms the corrected chapter structure and card proportions.
- Focused region: main hero/chapter card reviewed at full resolution; no raster artwork remains.

### Findings and comparison history

1. Initial browser capture exposed a missing ambient wash, four identical theme swatches,
   and a duplicated large chapter number. Fixed the background stacking order, token-owned
   swatches and chapter eyebrow. Recaptured at the same desktop viewport.
2. Second comparison found the surface badge consuming an extra grid row and the hero
   action adding excess height. Positioned the badge in the existing card and reduced
   action height. Restored data-owned identity dots in chapter titles. Final capture passes.
3. Night mobile comparison found poor contrast in the unchanged identity text. Added
   identityTextStyle: neutral night foreground plus original-colour underline. Rechecked
   theme selection/persistence; schema/player colours are unchanged.

### Required surfaces

- Typography: Georgia serif hierarchy, large tabular scores, italic sidelines narrative,
  system UI labels, responsive wrapping; matches the reference direction.
- Layout: 900px shell, two desktop columns, single phone source order, 28px hero,
  detached pill navigation and safe-area clearance. No 390px horizontal overflow.
- Colour/material: all four skin palettes and evening overrides use common tokens;
  ambient washes, content/rim/shadow and control glass match the reference.
- Assets: existing licensed icon files retained; physical book, crest and stamp removed
  from the main-page DOM/styles. Files/cache cleanup belongs to stage 3.
- Content: real React/domain output retained. Intentional differences from the simplified
  study: visible package version, win-rate evidence, third narrative lean, and three live
  Form/Surfaces/Timeline entry points. These preserve production information and behavior.
- Interactions: theme switching and reload persistence, Overview/Matches navigation,
  Clay filter returns 3 matches, existing complete archive includes 14 records.
- Console: no errors from production preview at port 5284. Earlier port 5173 exposed an
  unrelated/stale dev server; acceptance uses the independently served production build.

### Remaining acceptance scope

Stage 2 must verify all sheets/charts/detail and complete draft/review/publish/fallback
states. Stage 3 must verify offline/PWA resources, the mini skeleton and full theme/width
matrix. No deployment is authorized before these staged acceptance checks are complete.

final result: passed
