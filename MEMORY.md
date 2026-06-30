# Deuceline — Project Memory (router + decision ledger)

> For fast context recovery in a new session. **This is a router + durable-decision
> ledger, not a status mirror**: current status, version, what shipped, and progress
> are NOT written here — they live in their owner docs and this file only points at
> them. (Copying volatile facts into memory is exactly what makes a memory rot.)

## What this is (one line)

Deuceline is a mobile-first tennis rivalry tracker for one fixed rivalry — Alan vs
his regular partner Andy — deployed static-first to GitHub Pages.

## Navigation (to know X → read Y)

| To know… | Read |
|---|---|
| scope, hard rules, how to work here | [AGENTS.md](AGENTS.md) |
| what shipped / current version | [MAINTENANCE_LOG.md](MAINTENANCE_LOG.md) |
| what's next / parked decisions / future phases | [PROJECT_PLAN.md](PROJECT_PLAN.md) |
| architecture, data flow, validation strategy | [ENGINE.md](ENGINE.md) |
| commands (typecheck/test/build) | [AGENTS.md](AGENTS.md) → Verification |
| deferred maintenance | [MAINTENANCE_LOG.md](MAINTENANCE_LOG.md) → Backlog |

## File / module map

| Module | Does | Path |
|---|---|---|
| schema | Dataset types (schema v2, fidelity union, player identity) | `src/domain/schema.ts` |
| validateDataset | Runtime gate for dataset shape + business rules | `src/domain/validateDataset.ts` |
| deriveStats | Derives H2H, records, form, streak, surface split | `src/domain/deriveStats.ts` |
| loadDataset | Fetches + validates the repo-hosted JSON | `src/data/loadDataset.ts` |
| pages | Overview + Matches screens | `src/pages/` |
| components | Reusable UI (CourtBackdrop, MatchCard, MatchDetail, …) | `src/components/` |
| dataset | Canonical match data (schema v2) | `public/data/deuceline-data.json` |

## Durable decisions & boundaries

> Each is a settled decision + WHY + what it deliberately rules out. These are
> stable facts, safe to keep here; volatile status is not.

- **Store only raw match input; derive everything else.** Each match records its score
  at one of two fidelity levels — `fidelity: "sets"` (per-set) or
  `fidelity: "matchScore"` (set tally only, for partially-remembered matches).
  **Why:** derived values (winner, records, streaks, surface splits) drift the moment
  raw and derived disagree. **Boundary:** never persist winner/records/streaks; no
  point-by-point, serve, or training data.

- **Static-first; repo-hosted JSON is the v1 source of truth.** The app fetches
  `public/data/deuceline-data.json`, validates, derives, renders. **Why:** GitHub
  Pages has no backend; everyone opening the link must see the same record.
  **Boundary:** `localStorage` is never canonical; no in-browser writes pretending to
  be canonical; the center "+" stays a placeholder until a real shared-update workflow
  exists.

- **UI is colored by player identity, not win/loss.** Each player carries
  `displayName`, `color` (hex), `abbr` in the dataset; the dataset is the canonical
  source of those values. Current identity: Alan = purple `#57298a` / `Al`, Andy =
  grass green `#1e7a45` / `An`. **Why:** identity coloring reads as a long-term rivalry
  notebook, not a generic green dashboard. **Boundary:** read colors from the dataset;
  don't hardcode them in CSS; identity colours are NOT skin tokens (see next).

- **Chrome colour is a swappable skin; identity colour is not.** All non-identity
  colour lives in `src/styles/skins.css` as CSS vars under `[data-skin="…"]` (default
  Wimbledon = cream / ivy-green / gold); `global.css` consumes the vars and hardcodes no
  chrome colour. **Why:** the owner wants per-Grand-Slam skins (Wimbledon now;
  Roland-Garros / US Open / Australian Open later) without touching components.
  **Boundary:** a new skin is one `[data-skin]` block + the `data-skin` attribute on
  `<html>`; player identity colours stay in the dataset (a skin may only *suggest* a
  palette via `--skin-player-*`). No skin-switcher UI yet; surface `--grass`/`--clay`
  vs identity-colour clash is deferred — see [PROJECT_PLAN.md](PROJECT_PLAN.md).

- **Single fixed rivalry in v1.** Alan vs Andy only. **Why:** keeps the model and UI
  honest to the one real use case. **Boundary:** multi-rivalry / multi-player is a
  deliberate future expansion (would replace the alan/opponent keys) — see
  [PROJECT_PLAN.md](PROJECT_PLAN.md), don't slide into it.

- **Validation fails loudly, pragmatically.** `validateDataset.ts` is the runtime gate;
  `public/data/deuceline.schema.json` is a shape-only JSON Schema. **Why:** historical
  tennis data is imperfect, but obviously broken data must not render silently.
  **Boundary:** full tennis-scoring-rule enforcement is deferred — see
  [MAINTENANCE_LOG.md](MAINTENANCE_LOG.md) → Backlog.
