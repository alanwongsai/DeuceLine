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

Do not use `localStorage` as canonical storage.

Do not hardcode match data inside React components.

## Core Rule

Derive match winner, match score, set record, match record, recent form, current streak, surface split, and decider record from `match.sets`.

## Visual Direction

- Clean
- Sporty
- Slightly competitive
- Long-term rivalry notebook
- Deep ink / off-white base
- Tennis yellow accent
- Surface-specific colors

Avoid childish tennis styling and avoid an all-green UI.

## Current Implementation Status

- Vite + React + TypeScript scaffold exists.
- Shared sample dataset exists.
- Dataset validation exists.
- Domain-derived stats exist.
- Overview and Matches pages exist.
- Add match flow is intentionally a placeholder.
- PWA manifest and service worker placeholder exist.

## Open Questions

- What is the real opponent display name?
- Should the initial dataset be replaced with real historical matches?
- Should v1 deploy from `dist/` manually or through GitHub Actions?
- Should the next shared data update workflow be manual JSON editing, a script, or PR-based?
