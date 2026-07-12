# Deuceline v0.11.2 Design QA

## v0.11.2 installed-iPhone correction pass

### Evidence

- Real installed Chrome Web App references supplied by Alan:
  - `/var/folders/sg/0y0lnk6d1v76f7kxdlp2q7sh0000gn/T/TemporaryItems/NSIRD_screencaptureui_VdT5wT/截屏2026-07-12 23.45.06.png`
  - `/var/folders/sg/0y0lnk6d1v76f7kxdlp2q7sh0000gn/T/TemporaryItems/NSIRD_screencaptureui_DDZDvE/截屏2026-07-12 23.45.27.png`
  - `/var/folders/sg/0y0lnk6d1v76f7kxdlp2q7sh0000gn/T/TemporaryItems/NSIRD_screencaptureui_oPBPjz/截屏2026-07-12 23.45.40.png`
- Local Matches evidence:
  - `/private/tmp/deuceline-v0.11.2-matches-390-reference.png` (390 × 844 CSS pixels at 2×;
    captured before the final 6px leather seam mask, whose active computed style was then checked)
  - desktop DOM measurement at a 1280 × 720 canvas: centred journal width 760px; cover and opaque
    archive paper meet at 130px, matching Overview's visible leather-to-paper seam

### Diagnosis and corrections

- The old Matches masthead sat in the unsafe top region and the page allowed Overview's full book
  plate, including its baked bookmark, to remain visible behind archive content. Matches therefore
  looked like archive controls pasted on top of the Overview art rather than another page in the
  same product system.
- Matches now composes its own semantic leather cover and an opaque paper archive. Only the leather
  crop is reused; its ribbon is kept outside the clipped cover edge. The paper heading, surface
  filters and ruled match rows are live components, not another baked screenshot.
- `viewport-fit=cover` remains enabled, but cover height, content padding and the underlying book
  position share `safe-area-inset-top`. Installed standalone navigation switches from a detached
  bottom offset to edge-owned glass whose padding includes `safe-area-inset-bottom`.
- Normal 390px layout has no horizontal overflow; all four filters remain horizontally scrollable,
  archive fidelity/location/date/result information remains visible, and desktop keeps one centred
  760px paper archive. Overview content was intentionally unchanged.

### Verification boundary

- The in-app browser verifies the 390px and desktop responsive layouts but cannot supply a positive
  iPhone safe-area inset or emulate an installed Chrome Web App's `display-mode: standalone`.
  Those platform branches were checked structurally against the captured failure states and need
  one final installed-device refresh after the v9 service-worker cache takes control.

final result: browser pass; installed-iPhone confirmation pending

## Evidence

- Source visual truth: `/private/tmp/deuceline-system-audit/01-overview.png`
- Primary implementation screenshot: `/private/tmp/deuceline-system-qa/png/overview-390-final.png`
- Focused implementation screenshots:
  - `/private/tmp/deuceline-system-qa/png/matches-390-final.png`
  - `/private/tmp/deuceline-system-qa/png/detail-390-final.png`
  - `/private/tmp/deuceline-system-qa/png/add-390-final.png`
  - `/private/tmp/deuceline-system-qa/png/analysis-390-final.png`
  - `/private/tmp/deuceline-system-qa/png/overview-desktop-final.png`
  - `/private/tmp/deuceline-system-qa/png/matches-desktop-final.png`
- Viewports: 390 × 844 CSS pixels; 1280 × 720 desktop canvas with one centred 760px
  journal page. The in-app browser clamps its narrowest override to 390px, so the 320px
  boundary was checked from the final CSS constraints and DOM sizing rather than claimed as
  a second browser screenshot.
- State: real repo dataset; Overview count-up settled; archive unfiltered; latest match detail;
  blank Add form; Set record analysis; no publish side effect.

## Comparison method

- Full-view evidence: the source Overview and final 390px Overview were opened together in one
  image-comparison input at original resolution. The comparison covered composition, hierarchy,
  typography, palette, assets, copy and above-the-fold density.
- Focused evidence: Matches, detail, Add and analysis captures were opened together in one
  focused comparison input because their small labels, controls and data density were not
  readable enough in the Overview frame alone.
- Intentional differences from the source are product corrections, not fidelity drift: chapter
  circles use real `seq` values (8/7/6), the latest chapter says `Full set scores` instead of the
  unsupported `Best of 3 sets`, Overview stops after two compact recent chapters, and the glass
  navigation is detached from the paper edge.

## Findings and comparison history

### Pass 1 — blocked

- **[P2] Analysis labels collided with their bars.** In the first 390px Set record capture,
  `Known games` and `Biggest set margin` occupied a fixed label track and visibly ran into the
  chart column.
  - Fix: changed evidence rows to a two-line grid: label/value on the first row and the full-width
    bar on the second. Absence of a bar no longer dims meaningful non-chart facts; only explicitly
    empty rows are subdued.
- **[P2] Desktop archive summary crossed the leather/paper seam.** The first desktop archive
  placed `8 recorded / 8 finished` in the uncovered strip below the masthead because the book
  plate scales taller than the mobile header.
  - Fix: aligned the desktop archive masthead to the 130px leather region. The final desktop
    capture places summary, filters and table-like archive rows entirely on paper.
- **[P2] Programmatic page focus looked like a boxed title treatment.** Navigating to Matches
  correctly focused its heading, but the generic outline resembled an unintended gold border.
  - Fix: retained visible focus with an editorial accent underline, preserving keyboard/screen-
    reader orientation without introducing a new title component.
- **[P2] Add's disclosure and segmented selection needed stronger control semantics.** `Add
  details` was visually compact but below the touch target contract, while pressed buttons did
  not express the mutually exclusive Surface/Result model precisely.
  - Fix: disclosure summaries now have 44px targets and focus rings; Surface/Result use complete
    radiogroups with roving tab stops plus Arrow/Home/End keyboard selection. The H2H button also
    gained a quiet visible `Open rivalry story` affordance to match its accessible action.

### Pass 2 — passed

- Post-fix mobile analysis has no label/bar overlap or horizontal overflow; played surfaces and
  evidence facts remain full contrast while the empty Grass row is visibly secondary.
- Post-fix desktop Matches uses one scan-friendly three-column archive row for date/surface,
  result/score and location/fidelity; its summary starts beyond the bookmark and below the
  leather masthead. Overview remains one centred physical page rather than reverting to
  dashboard columns.
- The final 390px full-view comparison preserves the source book, crest, ribbon, ruled paper,
  score hierarchy, handwriting, ledger, chapter density and player/surface palette while making
  the requested information boundary explicit.
- Post-fix Add exposes 44px inputs, segments and disclosure; Arrow Left/Right moved Surface focus
  and selection together, then restored Astro without leaving a dirty draft.

## Required fidelity surfaces

- **Fonts and typography:** journal serif, system UI and handwritten fallbacks retain the source
  hierarchy and weights. Long archive and analysis labels wrap or truncate deliberately; there
  is no collision in the final captures. The system script font remains a P3 approximation of
  the concept lettering.
- **Spacing and layout rhythm:** 390px has `scrollWidth = 390`; modal panels are 366px wide with
  safe-area clearance and no horizontal rubber-banding. Controls and fields measure 44px or
  larger. Tablet/desktop keeps one 760px book page and a 520px glass navigation bar.
- **Colors and visual tokens:** player colours continue to come from the dataset; surface colours
  remain classification tokens; paper/leather stay opaque; Liquid Glass tokens are confined to
  bottom navigation, Add and the shared overlay shell. Reduced-transparency and unsupported-
  blur paths resolve to solid tokenized materials.
- **Image quality and asset fidelity:** the repo's book plate, crest, ribbon/stamp art and local
  icon assets are reused without CSS/emoji substitutes, stretching or new placeholder art.
- **Copy and content:** Overview now answers current state; Matches is explicitly `Match archive`;
  status, unknown dates/locations, score fidelity, evidence coverage and set-score orientation are
  stated instead of inferred.

## Primary interactions and accessibility

- Exercised Overview → Matches, archive → match detail, detail close, Add open/close, ledger →
  Set record, Surfaces → Astro breakdown, and surface recent-form semantics.
- Confirmed the latest detail exposes the Alan—Andy set legend and previous/next controls; Add
  exposes roving radio semantics, 44px fields and a 44px details disclosure; surface rows expose
  match-detail drill-downs. Loading announces status and disables Add until the dataset validates.
- Paging from match 7 to the last match makes Next disabled and deliberately moves focus to the
  still-enabled Previous control; the updated dialog title is also a polite live region.
- Modal focus trap/return, Escape/backdrop dismissal, body scroll lock, sticky sheet header,
  reduced motion, reduced transparency and no-blur fallbacks reuse the shared system layer.
- Browser console errors and warnings: none.

## Residual P3 polish

- The available system handwriting face is not the exact concept-render lettering.
- A physical 320px browser capture remains useful on the next real-device pass even though the
  final narrow CSS uses a two-by-two ledger, smaller cover grid and single-column sheet facts.

final result: passed
