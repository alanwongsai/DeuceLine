# Maintenance Log — v0.x

> The running changelog for Deuceline. Single owner of "what shipped, when, and what
> version is running." One file per major version line; when a v1.0 line begins, start
> a new file and seal this one as history. Forward bets and "not built yet" live in
> [PROJECT_PLAN.md](PROJECT_PLAN.md), not here.

## Versioning (semver, pre-1.0)

`MAJOR.MINOR.PATCH` — while on the `0.x` line:
- **PATCH** (`0.3.0 → 0.3.1`) — bug fixes, robustness, tuning, data/content tweaks.
- **MINOR** (`0.4.0`) — a new feature or surface within the current direction.
- **MAJOR** (`1.0.0`) — the first stable release / a direction change. Record it in
  [PROJECT_PLAN.md](PROJECT_PLAN.md) first and start a new log file.

## What goes here / what doesn't

- **In**: changes to the running product / existing functionality — code, behavior,
  config, and doc fixes describing existing functionality. These bump the version.
- **Not in**: planning, forward bets, "not built yet" deliberations → those live in
  [PROJECT_PLAN.md](PROJECT_PLAN.md), their single owner.

## Entry format

```
### v0.X.Y — YYYY-MM-DD
- what changed / why (one or more bullets)
```

## Backlog (deferred maintenance)

- **Tighten detailed set-score validation before expanding score tracking.** Runtime
  validation rejects tied sets and tied match outcomes, but does not enforce full
  tennis scoring rules. Still worth catching later: impossible set scores, inconsistent
  tiebreak winners, and tiebreak details on non-`7-6` sets. **Trigger:** when detailed
  per-set scoring becomes a primary entry workflow (it isn't in v1 — most matches are
  finished-match summaries).

## Log

### v0.9.0 — 2026-07-07
- **Wide-screen adaptation for iPad and desktop.** Below 768px the phone layout is unchanged
  (mobile-first preserved); at ≥768px the shell widens to 900px and Overview reflows into two
  columns, with the Matches list going to a 2-column grid. At ≥1128px the shell reaches 1080px
  and Matches becomes a 3-column grid. The bottom nav stays a centered floating pill at every
  width — no desktop sidebar.
- **Two independent columns that keep mobile reading order.** Overview's sections are wrapped
  in `overview-main` (hero + Recent form) and `overview-rail` (stat grid + By surface). This
  pairing is deliberate: the DOM stays in the canonical mobile reading order (hero → recent
  form → stats → by surface), so on phones — where both wrappers are `display: contents` —
  source, tab, and visual order all agree with **no CSS `order` reshuffling** (an earlier draft
  used `order` and was rejected as a screen-reader/keyboard regression). At ≥768px the wrappers
  become real column stacks; the pairing also balances the two columns' heights, so neither
  inherits the other's height as a mid-column gap.
- **Modals float centered on wide screens** (requested by Alan alongside the layout work, so a
  deliberate extension of the original layout-only plan). `.modal-backdrop` switches from
  bottom-anchored (`align-items: end`, the phone bottom-sheet affordance) to `align-items:
  center` at ≥768px; mobile keeps the bottom sheet.
- **Implementation is CSS-only plus className hooks.** Layers added to `src/styles/global.css`;
  no domain logic, data, or dependencies changed. Overview's two same-classed panels gained
  `panel-form` / `panel-surface` modifiers, the two column wrappers were added, and each
  page's `<main>` gained a `screen-overview` / `screen-matches` class so the breakpoints can
  target them. Verified in-browser at 375 / 768 / 1280 (mobile DOM = tab = visual order and
  bottom-sheet unchanged, no horizontal overflow, desktop columns balanced and modal centered);
  typecheck, 57 tests, and build all pass.

### v0.8.1 — 2026-07-05
- **Retired the old GitHub Pages workflow without deleting its history.** The former
  `.github/workflows/deploy-pages.yml` now lives at
  `.github/retired-workflows/deploy-pages.yml`, outside GitHub Actions' auto-discovery path,
  so pushes to `main` no longer trigger a stale GitHub Pages deploy that can fail after the
  Cloudflare Pages migration. Docs now state that Cloudflare Pages is the only active deploy
  target, with the retired workflow kept as an inert archive.

### v0.8.0 — 2026-07-05
- **Record and later complete an unfinished match.** A match can now be saved with no
  winner yet — the add-match form has a **Result: Finished / Unfinished** toggle, and an
  unfinished match may carry a tied score (e.g. today's Alan–Andy suspended at 1–1, sets
  6-4 / 3-6). Stored as raw input `status: "unfinished"` on the match (schema still v2);
  absent means finished, so every existing match is untouched.
- **Unfinished matches count toward nothing until finished** — excluded from match
  record, set record, streaks, deciders, H2H and surface splits (and from Overview's
  "matches played"). They still appear in the Matches list with a split identity stripe
  (Alan colour / Andy colour) and an "In progress" tag, since there is no winner to
  colour by.
- **One-tap update to finish it.** Match detail on an unfinished match shows **Update
  result**, which reopens the form pre-filled and **defaults the Result toggle to Finished**
  (the intent is to complete it — you must consciously keep it unfinished); publishing hits a
  new `POST /api/update-match` Function that replaces the match by id **only while it is still
  unfinished** — decided history (original or just-completed) stays immutable, preserving
  the append-only guarantee for everything with a result.
- **Publish now refreshes local state.** Both write endpoints return the full updated
  dataset and the app applies it immediately, so a completed match flips from "In
  progress" to its final result without waiting for the redeploy. Concurrent-write
  conflicts (GitHub `409`) surface a "reload and try again" message instead of a false
  "Published ✓". Shared GitHub plumbing extracted to `functions/api/_github.ts`.

### v0.7.5 — 2026-07-04
- **Sheet backdrop is frosted glass again, not a solid scrim** (Alan: v0.7.4's near-opaque
  field felt 割裂 — the sheet should open naturally, just blur what's behind). The backdrop
  now covers with heavy blur instead of alpha: `blur(28px) saturate(1.3)` under a light
  `rgba(10,24,18,0.45)` tint. The page's dark-masthead/cream split still reads through, but
  at this blur it's a soft gradient — the accepted trade for the glass look, distinct from
  the hard dark-vs-milky band of the 0.72 era. The `html:has(body.modal-open)` safe-area
  canvas keeps its job but now matches the glass composite over cream (`rgb(138,144,135)`)
  instead of near-black, so an uncovered iOS fringe blends in rather than flipping dark.

### v0.7.4 — 2026-07-04
- **Add-match sheet backdrop is now one even dark field, top to bottom** (Alan: after v0.7.3
  the dim still looked dark up top and milky at the bottom — the three circled spots on his
  screenshot). Real root cause, reproduced in a desktop browser too: any *translucent* dim
  (v0.7.3 used 0.72 alpha) lets the page's own split — dark masthead above, cream content
  below — show through, so the backdrop can never look uniform. Fix: near-opaque scrim
  (`rgba(8,20,15,0.96)` + `blur(16px)`). Also darkened the root canvas via
  `html:has(body.modal-open)` so iOS safe-area fringes (home-indicator strip) can't paint
  cream under the sheet, and gave the sheet 10px breathing room below the status bar.
- **Date field no longer pokes past the sheet's right edge on iPhones.** The v0.7.3 font
  clamp didn't help because iOS sizes the native date control from its own intrinsic
  layout, ignoring `width: 100%`. Shipped the real cure: `-webkit-appearance: none` (the
  field stays tappable and still opens the system picker) with the value left-aligned via
  `::-webkit-date-and-time-value` to line up with Location. NOTE: this fix was written
  during the v0.7.3 session but never committed — Alan re-tested live v0.7.3 and correctly
  reported it unfixed.
- Dev tooling: `vite.config.ts` now honors a harness-assigned `PORT` in dev (no effect on
  builds); `.claude/launch.json` gained `autoPort` so previews work when 5173 is busy.

### v0.7.3 — 2026-07-04
- **Add-match sheet: killed the milky slab under the floating panel** (Alan: on his iPhone a
  cream band showed below the sheet, and the dim looked dark up top but light at the bottom —
  "上下对不齐"). Root cause: the bottom nav is its own `backdrop-filter` glass bar, and on iOS
  Safari a `backdrop-filter` element is *not* darkened by the dim painted above it, so the
  white nav bled through under the panel. Fix: `Modal.tsx` now adds `body.modal-open` while any
  sheet is open and CSS hides `.bottom-nav`, leaving one even dim around the floating glass;
  bumped the backdrop dim to `0.72` + `blur(12px)` so the page's own light/dark structure no
  longer shows through top-vs-bottom. Kept the floating rounded glass block (an earlier
  full-bleed attempt was reverted — not what was wanted).
- **Date field no longer clips its value on narrow iPhones.** The native date control can't
  ellipsize, so at 1rem bold "4 Jul 2026" could run into the picker icon; made it width-
  adaptive with `clamp(0.88rem, 3.7vw, 1rem)` (vw scales with width, never with the
  chrome-cropped height).

### v0.7.2 — 2026-07-04
- **Add-match sheet no longer wobbles sideways** (Alan: the modal content could be dragged
  left/right on his phone — ugly). Root cause: `.modal-panel` set only `overflow-y: auto`,
  which makes the browser compute `overflow-x` to `auto` too, turning the sheet into a
  horizontal scroll container that touch rubber-bands. Added `overflow-x: hidden` so it
  scrolls vertically only. Verified nothing overflows horizontally at 375px and down to
  320px (default, tiebreak, and tally states), so hiding overflow-x clips nothing.

### v0.7.1 — 2026-07-04
- **Hosting moved to Cloudflare Pages; docs synced.** The site now builds/deploys on
  Cloudflare Pages (which runs the v0.7.0 one-tap publish Function), reachable at the custom
  domain `deuceline.meltcado.com` (a Cloudflare-managed CNAME → `deuceline.pages.dev`). No
  code changes were needed — `base: "./"`, the manifest `start_url`/`scope`, and the
  `/api/add-match` fetch are all relative, so the app runs on any host. Updated README
  (deploy section, data-update flow, stale limitations), AGENTS.md scope line, and the
  ENGINE.md hosting-constraints heading to match. The `deploy-pages.yml` GitHub Pages
  workflow is being retired but is left in place until the custom domain is confirmed live.

### v0.7.0 — 2026-07-03
- **One-tap publish for adding a match** (Alan: on his phone, fill → review → one tap →
  saved, without the copy-paste-to-GitHub dance). The review screen now POSTs the new match
  to a Cloudflare Pages Function (`functions/api/add-match.ts`) that commits it to the
  canonical JSON; pushing to `main` redeploys the site. The domain flow (appendMatch →
  validateDataset → review) is unchanged — only the final hand-off moved from "copy JSON +
  open the GitHub editor" to the API call. That editor path stays as an automatic fallback
  (and covers local dev, where `/api/add-match` 404s — verified: submit surfaces the error
  and auto-opens the fallback).
- **Security — only Alan can write, and even he can't delete history through it.**
  (1) Password gate: the Function checks a shared password (Cloudflare secret
  `ADD_MATCH_PASSWORD`); the app stores it on-device only (localStorage), never in the
  bundle, so a visitor with just the link can't call it. (2) Append-only: the client sends
  only a new match; the Function re-appends + re-validates server-side, so it can add one
  match but never delete or rewrite existing ones. (3) Least privilege: the token
  (`GITHUB_TOKEN`) is a fine-grained PAT scoped to this repo, Contents-only; every write is a
  commit, so bad writes are git-revertible.
- **Cloudflare-ready** (`wrangler.toml`, `.dev.vars.example`, `@cloudflare/workers-types`
  dev dep, `typecheck:functions` script). Moving hosting to Cloudflare Pages + setting the two
  secrets are one-time owner steps; until then the site stays on GitHub Pages and the app uses
  the editor fallback. See ENGINE.md (Data Update Flow) and PROJECT_PLAN.md (Phase 5).

### v0.6.4 — 2026-07-03
- **Sheets are floating Liquid Glass again, done right — the bottom colour seam is gone**
  (Alan: v0.6.3 only *attached* the flush sheet to the bottom colour block; a colour
  difference remained). The flush bottom sheet was the cause: a translucent panel welded
  to the screen edge sampled a lighter backdrop up top and a darker one at the safe-area
  strip, reading as a vertical colour shift with a distinct block where it met the edge.
  Following Apple's Liquid Glass guidance (a modal is a *detached* glass surface floating
  over a dimming layer, fully rounded), `.modal-panel` now floats free of every edge:
  the `.modal-backdrop` padding is the margin it floats inside (`shell-pad` sides/top +
  `safe-area-inset-bottom`), all four corners rounded (`--radius-lg`), lifted off the
  backdrop by a hairline edge + drop shadow. The dim layer was strengthened to a uniform
  `rgba(8,20,15,0.58)` so the whole glass samples one even backdrop — no gradient, no
  seam. `max-height: 100%` (the backdrop padding now defines the gaps).

### v0.6.3 — 2026-07-03
- **Modals are now bottom sheets, not floating cards** (Alan: the gap below an open
  sheet looked unstable, and tall forms crammed the top). `.modal-panel` sits flush to
  the screen's bottom edge with only the top corners rounded; `env(safe-area-inset-bottom)`
  became the sheet's own bottom padding (no floating gap, no bottom corners clipping the
  device corner — retires the v0.5.3 backdrop-padding workaround); `max-height` capped at
  `100svh - 40px - safe-area-top` so it never crams the status bar and leaves a tappable
  backdrop strip at the top. Shadow flipped to cast upward.

### v0.6.2 — 2026-07-03
- **Fixed chrome drifting / page scrolling under sheets on a real phone** (Alan's
  device screenshots, mobile Chrome on iPhone — same WebKit engine as Safari).
  Two causes, both device-only (the preview browser can't reproduce touch scroll):
  - Mobile WebKit ignores `overflow: hidden` on body, so open sheets didn't lock the
    page behind them. `Modal` now pins the body with `position: fixed` + a remembered
    scroll offset, restored exactly on close.
  - `.bottom-nav` was centred with `transform: translateX(-50%)`; mobile browsers
    repaint transformed fixed elements late during scroll, making the bar drift.
    Now centred with `left/right: 0` + auto margins — no transform.
- `overscroll-behavior: contain` on the sheet and backdrop stops sheet scrolling from
  chaining into the page.

### v0.6.1 — 2026-07-03
- **The add button is real: standardized add-match form** (`AddMatchSheet`, replaces
  the placeholder). Date (defaults today) / surface segmented control (defaults to the
  last match's surface) / location (defaults likewise) / full-set-scores vs sets-tally
  toggle / per-set inputs with automatic tiebreak fields on 7-6 / optional notes.
- **The form cannot produce bad data**: it builds the candidate dataset via new domain
  helpers `appendMatch` + `serializeDataset` (`src/domain/addMatch.ts`, tested) and runs
  the same `validateDataset` the loader uses; issues render in-sheet. Empty numeric
  fields map to NaN, not 0, so half-filled sets fail loudly.
- **Review step before hand-off**: winner scoreline, surface/location/date, and "H2H
  becomes X—Y" so a mis-entry is caught by eye. Then one tap copies the full updated
  JSON and opens the GitHub web editor (`DATASET_EDIT_URL`) — paste over the file,
  commit, Pages redeploys. Clipboard-blocked browsers get a select-all textarea.
- Modal panels now cap their height and scroll, so long sheets fit small screens.

### v0.6.0 — 2026-07-03
- **Wimbledon skin retuned to the Championships look** (Alan: the cream/ivory base
  didn't read as Wimbledon — go by the official app). Background is now a cool
  near-white, panels pure white, and both pages open with a deep-green **masthead**
  band (gold eyebrow, white type) that bleeds to the shell edges. Gold accent
  desaturated; `theme-color` meta matches the masthead.
- **Liquid-Glass-style material layer**, restrained per Apple's guidance: glass only on
  the floating chrome (bottom nav, modal sheets, FAB specular highlight), never on
  content. New `--material-*` skin tokens + structural `--material-blur` / `--shell-pad`;
  solid-panel fallbacks for `prefers-reduced-transparency` and no-`backdrop-filter`
  browsers. This is the seam a future native app swaps for real platform materials.
- **Scorelines now read winner-first** (tennis convention): new tested domain helper
  `formatWinnerScoreline` — match cards and the detail title show "Andy won 2—1" with
  set lines flipped to match; fixed Alan-left layouts (detail set list, H2H) unchanged.
- Polish: "Astro · 2" no longer wraps in By surface; "Set scores not recorded" is
  smaller and quieter (and shows the winner-first final in the detail view); stat-card
  spacing tightened; remaining hardcoded chrome colours (surface track, match-card
  hover, shadows) moved onto tokens.

### v0.5.3 — 2026-06-30
- **Surface breakdown sheet grew two more rows**: Deciders (close-match record, per
  surface — `surfaceSplit[surface].decidersAlan/decidersOpponent`) and Current run
  (the win streak within just that surface — `OverviewStats.surfaceStreak`, reuses the
  existing streak algorithm filtered to one surface). Both still derived, nothing new
  stored.
- **Fixed modal sheets clipping into the device's rounded screen corners.** Alan
  flagged via screenshot that on a real iPhone, the sheet's bottom corners sat right in
  the curved safe-area zone. `.modal-backdrop` now reserves `env(safe-area-inset-bottom)`
  at the bottom, same pattern `.bottom-nav` / `.app-shell` already used.

### v0.5.2 — 2026-06-30
- **Tap-to-expand stat cards.** Match record / Set record / Win rate / Current streak
  and each By-surface row are now tappable, opening a shared `StatDetailSheet` (built
  on a new `Modal` component extracted from `MatchDetail`). Stat cards expand into a
  by-surface breakdown of that metric; a surface row expands into a by-metric
  breakdown of that surface; Current streak opens a newest-first streak-history list.
  All of it reuses existing derived stats plus two small additions: per-surface set
  tally (`surfaceSplit[surface].setsAlan/setsOpponent`) and `streakHistory` — both
  still derived from raw match scores, nothing new stored.
- **Corner radius unified** to an iOS-style two-tier scale (`--radius-lg` 22px for
  big cards/panels/modals, `--radius-md` 14px for buttons/badges/list chrome), tokens
  in `global.css` `:root`. Pills and circles untouched.
- **FAB centering bug fixed**: the add button had no flex/grid centering, so the "+"
  glyph sat off-center under default button box metrics. Now `display:grid;
  place-items:center`.
- **Accent gold cleaned up**: `--accent` `#c69b48` (read as muddy/brown) → `#d9ad53`
  (cleaner trophy gold), per Alan's call.

### v0.5.1 — 2026-06-30
- Slimmed the bottom nav bar: tighter padding, shorter nav-item min-height, and a
  smaller FAB (62px → 52px) so it takes up noticeably less of the screen on small
  devices. `.app-shell` bottom clearance reduced to match (96px → 78px).

### v0.5.0 — 2026-06-30
- Introduced a **skin token layer** (`src/styles/skins.css`): all chrome colour is now
  CSS custom properties under `[data-skin="…"]`, selected via `data-skin` on `<html>`.
  `global.css` consumes the vars and hardcodes no chrome colour, so future Grand Slam
  skins (Roland-Garros / US Open / Australian Open) are one new block + `data-skin`
  value, zero component changes.
- Shipped the **Wimbledon skin** (default): cream ground, ivy-green ink, gold accent
  (FAB / count pill / streak dot) replacing the old lime `--accent`.
- New **player identity colours** in the dataset: Alan purple `#57298a`, Andy grass
  green `#1e7a45` (was terracotta / grass). Identity colours stay in the dataset, not
  the skin.
- Rebuilt the hero into a **full split court** (`CourtBackdrop`): solid per-player
  halves, full white chalk lines, centre net as the divider, dark "pockets" + heavier
  text shadow behind each score for readability.
- New **liquid-glass app icon** (green→purple glass squircle, glossy tennis-ball orb,
  gold seam); all PNGs re-rasterised from `public/assets/icon*.svg`; service worker
  cache bumped to v4.

### v0.4.0 — 2026-06-29
- V-next redesign: shift from win/loss coloring to player-identity coloring (Alan
  terracotta, Andy grass) across recent form, match cards, and surface bars.
- Court-style hero score background (`CourtBackdrop`); tap-to-open `MatchDetail` modal
  with per-set scores, tiebreaks, and H2H/streak impact (`deriveMatchContext`).
- Replaced the low-signal "Deciders" card with "Win rate" (`deciderRecord` still
  derived, just no longer surfaced).
- Multi-size PWA icons rasterised from `public/assets/icon*.svg`; service worker cache
  bumped to v3.

### v0.3.1 — 2026-06-29
- Fix dataset freshness and validation guardrails.

### v0.3.0 — 2026-06-28
- Surface chart became a two-sided rivalry bar; scoreboard alignment fixes.

### v0.2.1 — 2026-06-28
- Fix GitHub Pages deploy: configure + auto-enable Pages.

### v0.2.0 — 2026-06-28
- Reconcile agent docs with schema v2; route `CLAUDE.md` to `AGENTS.md`.

### v0.1.0 — 2026-06-28
- Initial scaffold: Vite + React + TypeScript tennis head-to-head tracker.
- Added the match fidelity model, real rivalry data (7 Bishop matches, Alan vs Andy),
  renamed opponent to Andy, and domain tests (P1–P3).
