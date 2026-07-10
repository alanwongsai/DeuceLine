# Deuceline v0.11.0 Design QA

## Evidence

- Source visual truth: `/var/folders/sg/0y0lnk6d1v76f7kxdlp2q7sh0000gn/T/codex-clipboard-deb35171-a28f-4def-b28f-f2d4c49a1701.png`
- Implementation screenshot: `/private/tmp/deuceline-v011-faithful/overview-final-390.png`
- Viewport: 390 × 844 CSS pixels
- State: Overview, count-up settled, no sheet open
- Full-view comparison pass 1: `/private/tmp/deuceline-v011-faithful/comparison-pass1.png`
- Focused evidence: the source and implementation were also opened at original resolution;
  no additional crop was needed because both full phone frames remain legible at 390 × 844.

## Findings and comparison history

### Pass 1 — blocked

- **[P1] Product still read as a reskinned dashboard.** The former implementation used
  rounded dashboard cards, a generic green header and a long scrolling archive instead of
  the selected physical journal composition.
  - Fix: rebuilt Overview around a real blank book plate with leather cover, stitched spine,
    purple ribbon, ivory ruled paper and gold page edge. Replaced the stat-card stack with
    the source's score spread, handwritten rivalry note, expanded latest chapter, three
    analysis lenses, compact chapter index and anchored journal navigation.
- **[P1] Major regions did not share the source proportions.** The H2H, latest match and
  archive occupied materially different vertical positions.
  - Fix: aligned the 390px composition to the source: 67px cover, 187px rivalry spread,
    76px note, 181px expanded chapter, 74px lenses, four 30px chapter rows and 49px nav.
- **[P2] Source assets were approximated.** The book, crest, stamp and navigation marks were
  absent or represented by generic CSS/text.
  - Fix: added project-local raster book/crest/stamp assets and repo-local Heroicons SVGs
    with the MIT license. Text glyph arrows, plus and close marks were replaced with assets.

### Pass 2 — passed

- The 390 × 844 implementation now has `scrollWidth = 390`, `scrollHeight = 844` and matches
  the source's region order, book construction, palette, score hierarchy, chapter density,
  surface badges and fixed navigation.
- 320px verification found no horizontal overflow. Matches, rivalry story, latest chapter,
  range-chart exploration and modal exit paths were exercised. Browser console errors and
  warnings were empty.
- The browser later rejected reopening the temporary local comparison URL. The already
  captured browser-rendered implementation and source image were therefore opened together
  in one local image-inspection input. That final comparison found no remaining actionable
  P0/P1/P2 mismatch. The residual differences are P3: the repo-local analysis icons use the
  closest Heroicons equivalents, and the available system script face is not the exact hand
  drawn lettering used by the concept render.

## Primary interactions and console

- Verified Overview/Matches navigation, surface filters, rivalry story, interactive chart,
  expanded match detail, previous/next browsing and animated Modal dismissal. Add Match's
  existing field/review/publish behavior remains covered by its domain tests and the earlier
  browser pass. Browser console errors and warnings: none.

final result: passed
