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
