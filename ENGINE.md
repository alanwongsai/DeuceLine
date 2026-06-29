# ENGINE.md

Durable engineering manual for Deuceline.

## Architecture Principles

Deuceline v1 is static-first and reads from `public/data/deuceline-data.json`.

The app has three clear layers:

- Data loading: fetch the repo-hosted JSON dataset.
- Domain logic: validate and derive records from set scores.
- UI: render mobile-first Overview and Matches screens.

Do not mix domain calculations into React components when they can live in pure functions.

## Static GitHub Pages Constraints

GitHub Pages has no app backend in v1. Everyone opening the published link should see the same record. That means browser-local writes are not the source of truth.

Use this v1 flow:

```text
GitHub Pages static page
  -> fetch public/data/deuceline-data.json
  -> validate dataset
  -> derive stats
  -> render UI
```

## Data Source Strategy

Canonical data file:

```text
public/data/deuceline-data.json
```

Optional schema:

```text
public/data/deuceline.schema.json
```

Store only raw match input. Each match records either per-set scores (`fidelity: "sets"`) or,
for partially-remembered matches, just the set tally (`fidelity: "matchScore"`). Do not store
derived values such as winner, set record, match record, current streak, decider record, or
surface split — derive them from the recorded score.

## Domain Model Rules

Supported surfaces:

- hard
- clay
- grass
- astro

Supported players:

- alan
- opponent

Each player is identity config in the dataset: `displayName`, `color` (a `#rrggbb` hex), and a
short `abbr` (1–3 chars). These are not derived; they drive every identity cue in the UI.
Current identity: Alan = terracotta `#b85c3d`, Andy = grass `#2d7c46`. `abbr` exists because
both names start with "A" (Al / An).

Per-set scores are the deepest score level in v1. Matches that predate detailed records may
store only a set tally via `fidelity: "matchScore"`. Do not track point-by-point data, winners,
unforced errors, serve stats, or training data.

## Dataset Validation Strategy

`src/domain/validateDataset.ts` checks:

- supported schema version (2)
- rivalry and players (each player needs `displayName`, a hex `color`, and an `abbr`)
- unique match IDs
- unique, positive `seq` ordering
- optional `date`, but a real `YYYY-MM-DD` when present
- supported surfaces
- a valid `fidelity` ("sets" or "matchScore")
- for "sets": non-empty, non-negative set scores, no tied set, no tied match score
- for "matchScore": non-negative integers, not tied, at least one set recorded

Validation is pragmatic. Historical tennis data may be imperfect, but obviously broken data should fail loudly.

## UI Principles

- Mobile-first for iPhone-style 20:9 screens.
- Overview is the default screen.
- Bottom navigation uses Overview / center Add / Matches.
- The large head-to-head score is the visual anchor.
- Surface badges use distinct colors.
- Results are colored by **player identity**, not win/loss: recent form shows the winner's
  `abbr` in their color, and match cards take the winner's stripe color.
- Overview stat cards: Match record, Set record, Win rate, Current streak.
- Avoid making everything bright green.
- Keep cards readable on a phone.

## Testing And Build Expectations

Run:

```bash
npm run typecheck
npm test
npm run build
```

Domain logic is covered by Vitest tests in `src/domain/*.test.ts`. Add focused tests around
domain logic before adding complex UI behavior.

## Future Migration Path

Possible future phases:

- Multi-rivalry model.
- Admin/editor UI.
- Manual JSON update script.
- PR-based data update flow.
- GitHub API commit flow with a protected token strategy.
- Firebase or Supabase backend.
- iOS wrapper or native app.

Do not implement these in v1 unless Alan explicitly changes scope.
