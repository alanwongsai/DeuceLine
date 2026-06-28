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

Do not store derived values such as winner, match score, set record, current streak, or surface split.

## Domain Model Rules

Supported surfaces:

- hard
- clay
- grass
- astro

Supported players:

- alan
- opponent

Set scores are the deepest score level in v1. Do not track point-by-point data, winners, unforced errors, serve stats, or training data.

## Dataset Validation Strategy

`src/domain/validateDataset.ts` checks:

- supported schema version
- rivalry and players
- match IDs and duplicate IDs
- ISO dates
- supported surfaces
- non-empty sets
- numeric non-negative set scores
- no tied sets
- no tied match score

Validation is pragmatic. Historical tennis data may be imperfect, but obviously broken data should fail loudly.

## UI Principles

- Mobile-first for iPhone-style 20:9 screens.
- Overview is the default screen.
- Bottom navigation uses Overview / center Add / Matches.
- The large head-to-head score is the visual anchor.
- Surface badges use distinct colors.
- Avoid making everything bright green.
- Keep cards readable on a phone.

## Testing And Build Expectations

Run:

```bash
npm run typecheck
npm run build
```

Future additions should add focused tests around domain logic before adding complex UI behavior.

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
