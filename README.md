# Deuceline

Deuceline is a mobile-first tennis head-to-head tracker for one fixed rivalry: Alan vs one regular tennis partner.

Tagline: **Track the rivalry. Set by set.**

## V1 Scope

- Shows the shared head-to-head record.
- Shows recent form, match record, set record, decider record, current streak, and surface split.
- Shows match history newest first.
- Tracks match score down to set-score level when those details are known.
- Reads data from `public/data/deuceline-data.json`.
- Runs as a static GitHub Pages-friendly PWA.

V1 is not a tournament app, coaching analytics app, social network, live scoring app, or multi-player product.

## Data Model

The JSON dataset is the v1 source of truth:

```text
public/data/deuceline-data.json
```

Derived values (winners, records, streaks, surface splits) are never stored — they are
calculated from each match's recorded score.

Matches support two fidelity levels so partially-remembered history can still be tracked:

- `fidelity: "sets"` — full per-set game scores in `sets` (e.g. `6-3`, `7-5`). Enables the
  per-set line on the match card.
- `fidelity: "matchScore"` — only the set tally in `matchScore` (e.g. won 2 sets to 1).
  Still feeds match record, set record, decider record, streaks and surface splits.

## Update Data

For v1, update matches manually by editing `public/data/deuceline-data.json`.

Each match should include:

- `id` (unique)
- `seq` (unique chronological order; 1 = oldest)
- `surface` (`hard`, `clay`, `grass`, `astro`)
- `fidelity` plus either `sets` or `matchScore`
- optional `date` (`YYYY-MM-DD`; sorting uses `seq`, so this is display-only)
- optional `location`
- optional `notes`

Do not add stored winner fields — winners are always derived.

## Install

```bash
npm install
```

## Run Locally

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Deploy To GitHub Pages

The Vite config uses `base: "./"` so the built app can run under a GitHub Pages project path.

This repo includes `.github/workflows/deploy-pages.yml`. Push to `main`, then configure GitHub Pages source to **GitHub Actions** in the repository settings.

Build output is generated in `dist/` during the workflow. Do not commit `dist/`.

## Current Limitations

- The center add button is a placeholder.
- Browser edits are intentionally not persisted.
- No authentication or backend.
- No cloud sync.
- No multi-rivalry support yet.
