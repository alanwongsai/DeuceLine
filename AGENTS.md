# AGENTS.md

Instructions for Codex, Claude, Kimi, and other AI coding agents working on Deuceline.

## Project Goal

Deuceline is a mobile-first tennis rivalry tracker for one fixed rivalry: Alan vs one regular tennis partner.

The app should feel like a polished mobile sports notebook, not a generic dashboard.

## Current V1 Scope

- Single rivalry only.
- Static Cloudflare Pages deployment (custom domain `deuceline.meltcado.com`), plus a thin
  stateless commit-proxy Function for one-tap match publishing. The GitHub Pages workflow is
  being retired. See ENGINE.md (Data Update Flow) for the write path.
- Read the shared dataset from `public/data/deuceline-data.json`.
- Display Overview and Matches pages.
- The center add button opens the add-match form. The app itself never writes
  anywhere: the form validates, then copies the updated JSON and hands off to the
  GitHub web editor for the actual commit (see ENGINE.md, Data Update Flow).

Do not overbuild this into a tournament, coaching analytics, social, or live scoring platform.

## Hard Rules

- Store only raw match input, never derived values. Each match records its score at one of
  two fidelity levels: `fidelity: "sets"` (per-set scores) or `fidelity: "matchScore"` (set
  tally only, for partially-remembered matches).
- Never store match winner, records, streaks, or surface splits — always derive them.
- Each player carries identity config — `displayName`, `color` (hex), and `abbr` — in the
  dataset. The UI is colored by **player identity** (Alan = terracotta `#b85c3d`, Andy = grass
  `#2d7c46`), not by win/loss. Read those values from the dataset; do not hardcode them in CSS.
- Do not use `localStorage` as canonical storage.
- Do not hardcode match data in React components.
- Use repo-hosted JSON as the v1 source of truth.
- Keep domain logic separate from UI components.
- Preserve mobile-first design.
- Avoid unnecessary dependencies.

## Architecture

- Domain logic lives in `src/domain/`.
- Dataset loading lives in `src/data/`.
- React pages live in `src/pages/`.
- Reusable UI components live in `src/components/`.
- Shared dataset lives in `public/data/deuceline-data.json`.

## Validation

Validate dataset shape and obvious bad data in `src/domain/validateDataset.ts`.

The app must not silently ignore invalid data. It should surface dataset errors clearly.

## Verification

Before declaring a task done, run (when dependencies are installed):

```bash
npm run typecheck
npm test
npm run build
```

Don't report success you haven't verified. If something fails, say so plainly and show
the output — a faithfully reported failure is more useful than a confident "done".

## Required Reading (startup core — minimal)

Read these every new session; they're enough to start almost any task:

1. `AGENTS.md` (this file) — scope, hard rules, how to work here.
2. The latest entry in [MAINTENANCE_LOG.md](MAINTENANCE_LOG.md) — what shipped recently.

Read the rest **only when the task touches that area** — do not pre-read it:

- [ENGINE.md](ENGINE.md) — when touching architecture, data flow, or validation.
- [PROJECT_PLAN.md](PROJECT_PLAN.md) — when touching scope or deciding what's next.
- [MEMORY.md](MEMORY.md) — to recover durable decisions and their boundaries.

## Working Agreement (how to work here)

Standing preferences, so the owner (Alan) doesn't restate them each session:

- **Task and docs change together.** Keep the relevant owner doc in sync *as part of
  the same change*, never deferred — deferred doc updates are how drift starts.
- **Self-verify before claiming done.** Run the Verification commands above; report
  failures honestly with output.
- **Review before a major commit.** For significant or risky changes (new behavior,
  anything touching data integrity / the dataset / deploy, large or cross-cutting
  diffs), do a correctness review pass *before* committing. Small mechanical changes
  don't need it; use judgment.
- **Close out with a commit.** A real change ends with: a dated `MAINTENANCE_LOG.md`
  entry, the affected owner doc updated, verification run, and a commit. Do this
  proactively — don't wait to be reminded.
- **Small, honest, reviewable changes.** Don't bundle unrelated work. Don't present
  assumptions as facts when the docs already define scope. Look before you delete.

## Why these conventions (the discipline)

- **Single owner per fact; point, don't copy.** Each volatile fact (status, version,
  scope) has one owner doc; everywhere else links to it. Copying a volatile fact is the
  root of all drift — see Documentation Sync Rules below.
- **MEMORY.md is a router + durable-decision ledger, not a status mirror.** It points
  at owners; it never holds current status, version, or progress.
- **Startup core is minimal.** Read the small fixed set above every session; everything
  else on demand.

## Current State (pointer block — do not restate status here)

This section is a pointer to the single owner of each kind of fact; keep it free of
dates and version numbers:

- **Latest version & what shipped** → [MAINTENANCE_LOG.md](MAINTENANCE_LOG.md).
- **Scope / parked decisions / future phases** → [PROJECT_PLAN.md](PROJECT_PLAN.md).
- **Architecture / data flow / validation strategy** → [ENGINE.md](ENGINE.md).
- **Durable decisions & boundaries** → [MEMORY.md](MEMORY.md).
- **Commands** → the Verification section above.

## Documentation Sync Rules (one owner per fact)

Point, don't copy. Each kind of change updates exactly one doc:

| If you changed… | Update only… |
|---|---|
| the running product / existing functionality | [MAINTENANCE_LOG.md](MAINTENANCE_LOG.md) |
| architecture / module boundaries / data flow / validation | [ENGINE.md](ENGINE.md) |
| scope / a parked decision / what's next | [PROJECT_PLAN.md](PROJECT_PLAN.md) |
| a settled decision + its boundary | [MEMORY.md](MEMORY.md) |
| agent behavior / these rules / hard rules | `AGENTS.md` |

There is no CI drift-linter yet (deferred — see the keel close-out). Until there is,
these rules are upheld by the review pass, not by automation.

## Close-Out Contract

1. **Read-only analysis / planning only**: no changelog entry, no commit.
2. **Any repo-tracked file change**: add a dated [MAINTENANCE_LOG.md](MAINTENANCE_LOG.md)
   entry, update the single owner doc affected, run verification, then commit.
3. **Major/risky change**: also run the review pass (Working Agreement) before
   committing.

In the final response, summarize: files changed, commands run, whether
typecheck/test/build passed, what is intentionally left for the next step, and any
architecture risks or decisions Alan should review.
