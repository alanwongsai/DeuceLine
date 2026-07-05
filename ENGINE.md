# ENGINE.md

Durable engineering manual for Deuceline.

## Architecture Principles

Deuceline v1 is static-first and reads from `public/data/deuceline-data.json`.

The app has three clear layers:

- Data loading: fetch the repo-hosted JSON dataset.
- Domain logic: validate and derive records from set scores.
- UI: render mobile-first Overview and Matches screens.

Do not mix domain calculations into React components when they can live in pure functions.

## Static Hosting Constraints

The read path has no app backend: everyone opening the published link fetches the same repo-hosted JSON, so browser-local writes are never the source of truth. The only server-side piece is a thin, stateless commit-proxy Function (see Data Update Flow) that writes back to that same JSON and stores nothing itself — the repo remains the single source of truth.

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

## Data Update Flow (add-match form)

The center add button opens `AddMatchSheet`, a standardized form. The domain flow is
unchanged; only the final hand-off changed — the app now publishes in one tap through a
Cloudflare Pages Function, and still never holds a GitHub token itself:

```text
form input
  -> appendMatch (src/domain/addMatch.ts: next seq, free id, omit empty optionals)
  -> validateDataset (same validator the loader uses — bad data cannot pass)
  -> review step (winner scoreline + new H2H, so a mis-entry is caught by eye)
  -> POST { match } to /api/add-match (functions/api/add-match.ts)
       -> the Function re-reads the dataset, re-runs appendMatch + validateDataset,
          and commits — pushing to main, which redeploys the site.
```

The write Function (`functions/api/add-match.ts`) is guarded three ways, so a visitor with
only the public link can't write or delete:

- **Password gate** — the caller must send the shared password (a Cloudflare secret,
  `ADD_MATCH_PASSWORD`); the app stores it on-device only, never in the bundle.
- **Append-only** — the client sends only a new match; the Function re-appends server-side,
  so the endpoint can add one match but never delete or rewrite existing ones.
- **Least privilege** — the token (`GITHUB_TOKEN`) is a fine-grained PAT scoped to this repo,
  Contents-only; every write is a commit, so any bad write is git-revertible.

A second Function, `functions/api/update-match.ts` (`POST /api/update-match`), completes or
edits an **unfinished** match. It shares the password gate, least-privilege token, and GitHub
plumbing (`functions/api/_github.ts`). Its append-only equivalent is a strict precondition:

- The **sole** precondition is that the *currently stored* match at `id` has
  `status: "unfinished"`. The submitted match may stay unfinished or become finished (drops
  `status`). Once finished, a later call for the same `id` is rejected — the stored match is
  no longer unfinished. So only a currently-unfinished match is mutable; all decided history
  (original or just-completed) is immutable through this endpoint. `replaceMatch`
  (`src/domain/addMatch.ts`) preserves the match's `id` and `seq`.

Both endpoints return the full updated dataset on success, so the app refreshes in memory
immediately instead of waiting for the redeploy. A concurrent-write conflict (GitHub `409`,
stale `sha`) is surfaced as a "reload and try again" message rather than swallowed.

The Function runs on Cloudflare Pages (`wrangler.toml`; secrets set in the Cloudflare
dashboard, or `.dev.vars` for `wrangler pages dev`). Until hosting moves there,
`/api/add-match` returns 404 and the app falls back to the original hand-off:
`serializeDataset` to the clipboard + open `DATASET_EDIT_URL` (`src/data/datasetSource.ts`)
— paste over the file, commit, Pages redeploys.

Empty numeric fields map to `NaN` (never `0` — `Number("")` is `0`), so a half-filled
set is rejected loudly by the validator instead of silently scoring a bagel.

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
Current identity: Alan = purple `#57298a`, Andy = grass green `#1e7a45`. `abbr` exists because
both names start with "A" (Al / An). Identity colours live in the dataset, **not** the skin
(see Skin / Theme Layer below) — they belong to this rivalry, not to a Grand Slam look.

Per-set scores are the deepest score level in v1. Matches that predate detailed records may
store only a set tally via `fidelity: "matchScore"`. Do not track point-by-point data, winners,
unforced errors, serve stats, or training data.

A match may also carry `status: "unfinished"` (raw input, orthogonal to `fidelity`): a match
suspended before a winner was decided. Absent means finished. An unfinished match has **no
winner** and counts toward nothing derived — it is excluded from match record, set record,
streaks, deciders, H2H and surface splits until it is completed. `deriveMatchResult` returns
`winner: null` for it; `deriveMatchContext` refuses one (there is no rivalry impact yet). It
still appears in the Matches list. Completing it = editing the same match to drop `status`
(see Data Update Flow).

## Dataset Validation Strategy

`src/domain/validateDataset.ts` checks:

- supported schema version (2)
- rivalry and players (each player needs `displayName`, a hex `color`, and an `abbr`)
- unique match IDs
- unique, positive `seq` ordering
- optional `date`, but a real `YYYY-MM-DD` when present
- supported surfaces
- a valid `fidelity` ("sets" or "matchScore")
- an optional `status`, which must be exactly `"unfinished"` when present
- for "sets": non-empty, non-negative set scores, no tied set; no tied match score **unless
  the match is unfinished** (a suspended match may be level, e.g. 1–1)
- for "matchScore": non-negative integers, at least one set recorded; not tied **unless the
  match is unfinished**

Validation is pragmatic. Historical tennis data may be imperfect, but obviously broken data should fail loudly.

## UI Principles

- Mobile-first for iPhone-style 20:9 screens.
- Overview is the default screen.
- Bottom navigation uses Overview / center Add / Matches.
- The large head-to-head score is the visual anchor.
- Surface badges use distinct colors.
- Results are colored by **player identity**, not win/loss: recent form shows the winner's
  `abbr` in their color, and match cards take the winner's stripe color.
- Match scorelines read from the **winner's perspective** (tennis convention):
  `formatWinnerScoreline` in `src/domain/deriveStats.ts` produces "Andy won 2—1" with
  winner-first set lines. Views that lay out Alan-left / Andy-right (the detail set list,
  the H2H impact line) keep the fixed orientation — names and colours make those explicit.
- Both page headers are a **masthead**: a deep-green band that bleeds to the shell edges
  (`--masthead-*` skin tokens), white type, gold eyebrow. The shell gutter it bleeds
  across is the structural token `--shell-pad` in `global.css`.
- Overview stat cards: Match record, Set record, Win rate, Current streak.
- Stat cards and By-surface rows are tappable: each opens a shared detail sheet
  (`StatDetailSheet`) that slices the same derived stats a different way — a stat card
  breaks its metric down by surface, a surface row breaks that surface down by metric,
  and Current streak opens a streak-history list (`OverviewStats.streakHistory`, newest
  run first). No new raw data is stored for this — only new derived views over the
  existing dataset, consistent with the "derive, don't store" rule above.
- `src/components/Modal.tsx` is the single shared overlay shell (backdrop, escape-to-close,
  focus-on-open, body-scroll lock). `MatchDetail`, `StatDetailSheet` and `AddMatchSheet`
  all build on it — new modal-style UI should reuse it rather than re-implementing that
  chrome. The scroll lock pins the body with `position: fixed` + a remembered scroll
  offset, because mobile WebKit (Safari *and* iPhone Chrome) ignores `overflow: hidden`
  on body for touch scrolling.
- `.modal-panel` is a **bottom sheet**: flush to the screen's bottom edge, only the top
  corners rounded, `env(safe-area-inset-bottom)` folded into its own bottom padding (so
  there's no floating gap below it and no bottom corners to clip the device's rounded
  screen corner), and `max-height` capped short of the top so tall forms never cram the
  status bar. Do not restore a floating-card style with a bottom margin — that gap was
  the thing Alan flagged as ugly.
- Fixed chrome must not be positioned with `transform` (mobile browsers repaint it late
  during scroll, so it visibly drifts) — `.bottom-nav` centers with auto margins instead.
- Avoid making everything bright green.
- Keep cards readable on a phone.

## Skin / Theme Layer

Chrome colour (everything that is *not* a player's identity colour) lives in one place:
`src/styles/skins.css`. Each look is a block of CSS custom properties keyed by a
`[data-skin="…"]` attribute on `<html>`; `:root` carries the default (Wimbledon).

- `global.css` `@import`s `skins.css` first, then consumes only the vars (`--bg`, `--ink`,
  `--accent`, `--court-line`, `--hard/clay/grass/astro`, …). It must never hardcode a chrome
  colour — that is what keeps skins swappable.
- **Player identity colours are not skin tokens.** They come from the dataset; a skin only
  *suggests* a palette via `--skin-player-a` / `--skin-player-b` (reference only).
- SVG note: CSS `var()` does not resolve in SVG presentation attributes, so `CourtBackdrop`
  sets skin-driven fills/strokes via inline `style`, and player-half fills via the literal
  hex from the dataset.
- Adding a Grand Slam skin = one new `[data-skin="roland-garros|us-open|australian-open"]`
  block + setting `data-skin` on `<html>`. Zero component changes. There is no skin-switcher
  UI yet (deferred — see [PROJECT_PLAN.md](PROJECT_PLAN.md)).
- Known deferred clash: surface badge `--grass` (green) and `--clay` (terracotta) overlap
  Andy's / a player's identity colour; and Wimbledon is itself a grass event. Left as-is this
  version — see [PROJECT_PLAN.md](PROJECT_PLAN.md).

Corner radius is a separate, non-skin token: a two-tier scale in `global.css` `:root`
(`--radius-lg` for big cards/panels/modals, `--radius-md` for buttons/badges/list chrome).
It lives outside `skins.css` because it is structural consistency, not part of a Grand Slam
look. Pills (`999px`) and circles (`50%`) are unaffected by the scale.

## Material Layer (Liquid-Glass-style)

Floating chrome uses a translucent blurred material, kept deliberately restrained per
Apple's Liquid Glass guidance:

- **Glass is only for the floating layer** — the bottom nav, the modal sheet, and the
  FAB's specular highlight. Content (cards, panels, hero) stays opaque. Never glass on
  glass.
- Colour tokens (`--material-bg`, `--material-bg-strong`, `--material-border`,
  `--material-edge`) live in `skins.css` (they are chrome colour); the blur radius
  (`--material-blur`) is structural and lives in `global.css` `:root`.
- Fallbacks: `@supports not (backdrop-filter…)` and `prefers-reduced-transparency`
  both drop to the solid `--panel` background.
- This is the seam for a future native app: swapping `.bottom-nav` / `.modal-panel`
  materials for platform-native ones touches no component code.

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
