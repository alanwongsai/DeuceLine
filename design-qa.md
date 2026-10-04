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

## Stage 2

Same selected reference supplies the shared typography, material and token direction;
production evidence/form states intentionally extend its simplified dialogs.

- Evidence: `deuceline-stage2-detail.jpg` (1280 × 900, DPR 1) and
  `deuceline-stage2-conflict.jpg` (320 × 740, DPR 1), in the stage-1 evidence directory.
- Analysis: all eight top-level kinds (story, sets, deciders, conversion, streak, form,
  surfaces, timeline), Hard drill-down and return, last-five match links, score details
  and previous/next paging retain their original information and no-sample statements.
- Keyboard/mobile: chart ArrowLeft changes M14 to M13; close Shift+Tab reaches the final
  form control; Escape returns to the trigger; body stays fixed while open and restores
  after closing; navigation is display:none while open. 320px form has no panel overflow.
- Local fixture server at port 5286: Avery/Blake only, in-memory DatasetStore using the
  existing domain/publish bundles. No external calls, credentials, Git writes or canonical
  dataset writes. Update a one-set-all unfinished match with [10–8], rejected password,
  success/instant refresh, optional set TB, third set, details/weather/temperature/notes,
  dirty close → keep editing and discard, review/back, 409/503 with expanded fallback,
  tally-only unfinished add, unchanged finished H2H and Record another reset all passed.
- GitHub fallback button/JSON serialization path remains unchanged and was verified
  reachable after failure. The final Copy JSON & open GitHub action was intentionally not
  executed with fixture data, avoiding a fixture handoff into the real GitHub editor.
- Corrected review headline selector specificity so the sheet paragraph style cannot
  flatten its serif score hierarchy. Existing source logic changed only identity styling.
- Day/night detail/form/chart material reviewed. Fonts, spacing, readable token colours,
  licensed icon assets and production copy remain consistent with the selected direction.
- No remaining P0/P1/P2 issues in stage-2 surfaces. Full skin/width/PWA matrix is stage 3.

final result: passed

## Stage 3

- Final evidence: `deuceline-final-desktop.jpg` (1280 × 900),
  `deuceline-final-mobile.jpg` and `deuceline-final-night.jpg` (390 × 844, DPR 1),
  in the same evidence directory. Serif hierarchy, large settled H2H, narrative,
  chapter card, ledger and glass controls were inspected at their actual viewport.
- 64 combinations: 320/390/760/1280px × four skins × day/evening × Overview/Matches.
  Actual innerWidth was asserted for each case; no horizontal document overflow.
  The same canonical 14-match data stays visible in every appearance.
- Offline: stop the dedicated production preview server, reload the controlled page,
  then navigate to Matches. The v0.14.2 shell, derived 8–6 record and all 14 cached
  records remain available. Restart the server afterwards. The isolated worker check
  also verifies all precache paths exist, old-cache deletion, dataset/navigation
  network-first fallback and no POST interception.
- PWA: cache v13 drops all retired journal image entries. Manifest and HTML launch
  colour align with Wimbledon day; tennis install icons are retained. No code/data/API
  contract change; all five engineering checks pass, including 124 tests and generated
  core copies. No live test match or canonical fixture was written.
- Native skeleton: remove unused crest/stamp and hardcoded leather/paper colours;
  use the generated Wimbledon default tokens. Component isolation is accounted for
  by owning badge material/type in component WXSS. This remains a shell, with no new
  data views or publishing flow. WeChat DevTools/device acceptance and the full client/
  体验版 are explicitly separate work.
- Reduced transparency/motion and missing-blur CSS fallbacks were source-reviewed.
  Installed iOS/Android safe areas and OS preference behavior were not device-tested.
  No remaining web P0/P1/P2 findings; deployment readback belongs to stage 4.

final result: passed (web); native/device checks bounded as above
