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
