# Deuceline

Deuceline is a mobile-first tennis head-to-head tracker for one fixed rivalry: Alan vs one regular tennis partner.

Tagline: **Track the rivalry. Set by set.**

## V1 Scope

- Shows the shared head-to-head record.
- Shows recent form, match record, set record, decider record, current streak, and surface split.
- Shows match history newest first.
- Tracks match score down to set-score level when those details are known.
- Reads data from `public/data/deuceline-data.json`.
- Runs as a static PWA, deployed on Cloudflare Pages (live at `deuceline.meltcado.com`).

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

The canonical data always lives in `public/data/deuceline-data.json`; every update is a
commit to that file.

- **In-app (primary):** the center add button opens a form → review → **Submit & publish**,
  which POSTs the new match to a Cloudflare Pages Function (`functions/api/add-match.ts`)
  that commits it for you (password-gated, append-only). Pushing to `main` redeploys the site.
- **Fallback / manual:** edit `public/data/deuceline-data.json` directly and commit. The
  in-app form also falls back to opening the GitHub web editor if the publish endpoint is
  unavailable.

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

## Deploy (Cloudflare Pages)

The site is hosted on **Cloudflare Pages**, built from this repo: build command
`npm run build`, output directory `dist`. Pushing to `main` triggers a rebuild and deploy,
and the write path (`functions/api/add-match.ts`) runs as a Cloudflare Pages Function using
two secrets set in the dashboard: `GITHUB_TOKEN` (a repo-scoped, Contents-only fine-grained
PAT) and `ADD_MATCH_PASSWORD`. Live at the custom domain `deuceline.meltcado.com`.

The Vite config uses `base: "./"`, so nothing is hardcoded to a host — the app runs
correctly on the `*.pages.dev` URL, the custom domain, or a GitHub Pages project path.

`.github/workflows/deploy-pages.yml` (GitHub Pages) is being retired in favour of Cloudflare
Pages; only the Cloudflare host runs the one-tap publish Function. Do not commit `dist/`.

## Current Limitations

- Single fixed rivalry; no multi-rivalry support yet.
- The only backend is a thin, stateless commit-proxy Function — no database, no live sync.
  The repo JSON stays the single source of truth, and every change is a git commit.
- Auth is a single shared publish password (Cloudflare Access is a parked upgrade).
