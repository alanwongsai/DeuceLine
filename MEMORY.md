# MEMORY.md

Persistent project memory for future AI sessions.

## Identity

- App name: Deuceline
- Package/repo-friendly name: deuceline
- Product: mobile-first tennis rivalry tracker
- Tagline: Track the rivalry. Set by set.

## Current Target

V1 is a single-rivalry tracker for Alan vs one regular tennis partner.

The app should answer:

- What is the current head-to-head?
- Who is leading?
- What is the recent form?
- How do results split by surface?
- What happened in past matches?

## Layout

Mobile-first bottom navigation:

```text
[ Overview ] [ + ] [ Matches ]
```

Overview is the default landing screen. The center plus button is primary, but currently opens a placeholder explaining the v1 data workflow.

## Data

V1 canonical source:

```text
public/data/deuceline-data.json
```

Schema version 2. Each match has a unique `seq` (chronological order) and an optional `date`.
Each player carries identity config: `displayName`, `color` (hex), and `abbr`.

Do not use `localStorage` as canonical storage.

Do not hardcode match data inside React components.

## Core Rule

Store only raw match input, at one of two fidelity levels: per-set scores (`fidelity: "sets"`)
or a set tally (`fidelity: "matchScore"`). Derive everything else — winner, set record, match
record, recent form, current streak, surface split, decider record.

## Visual Direction

- Clean
- Sporty
- Slightly competitive
- Long-term rivalry notebook
- Deep ink / off-white base
- Tennis yellow accent
- Surface-specific colors
- Player-identity colors (not win/loss): Alan = terracotta `#b85c3d`, Andy = grass `#2d7c46`

Avoid childish tennis styling and avoid an all-green UI.

## Current Implementation Status

- Vite + React + TypeScript scaffold exists.
- Real rivalry data loaded: 7 Bishop matches (Alan vs Andy); 6 are score-only, today's is set-by-set.
- Dataset validation exists (schema v2, fidelity union). A shape-only JSON Schema lives at
  `public/data/deuceline.schema.json`; `validateDataset.ts` is the runtime gate for business rules.
- Domain-derived stats exist; covered by Vitest tests (`npm test`).
- Overview and Matches pages exist. Identity-color refresh applied: recent form shows winner
  initials in player color, match cards stripe by winner identity, surface bars use identity
  colors, and the old "Deciders" card was replaced by "Win rate". (`deciderRecord` is still
  derived in the domain layer, just no longer surfaced.)
- Overview hero uses a `CourtBackdrop` SVG (top-down court, net under the score divider, halves
  tinted in each player's color).
- Match cards are buttons; tapping opens a `MatchDetail` modal (per-set scores colored by set
  winner, tiebreaks, and "rivalry impact" from `deriveMatchContext` — H2H before/after, streak
  extended, streak snapped).
- Multi-size PWA icons live in `public/assets/` (icon.svg + favicon-32 / apple-touch-icon /
  icon-192 / icon-512 / icon-maskable-512 PNGs), rasterised from icon*.svg via `qlmanage`.
  Service worker precaches them (cache bumped to v3).
- Add match flow is intentionally a placeholder (Esc / focus / scroll handled).
- PWA manifest and service worker exist.
- GitHub Pages deploy workflow exists (`.github/workflows/deploy-pages.yml`).

## Resolved

- Opponent display name is Andy.
- Real historical matches replaced the sample data.
- Deployment is via GitHub Actions on push to main.
- Identity colors confirmed: Alan = terracotta `#b85c3d`, Andy = grass `#2d7c46`; abbreviations Al / An.

## Open Questions

- Shared data update workflow beyond manual JSON editing: a script, PR-based, or in-app?
- Service worker may serve stale data after a JSON update — needs a cache-busting strategy.
- The published site is fully public; revisit if any data should be private.
- When does multi-rivalry / multi-player come into scope (it would replace the alan/opponent keys)?
