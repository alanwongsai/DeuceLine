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
Cloudflare Pages static site
  -> fetch public/data/deuceline-data.json
  -> validate dataset
  -> derive stats
  -> render UI
```

The loader asks the browser for a fresh dataset while online (`cache: "no-store"`);
the service worker remains network-first and keeps its same-version cached dataset as
the offline fallback. When a validator or dataset compatibility change ships, bump the
service-worker cache name in the same change. A failed validation is actionable in the
UI: the normal state explains that data could not be refreshed, provides **Reload data**,
and keeps raw technical validation details collapsed for diagnosis.

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

The center add button opens `AddMatchSheet`, a standardized form. Its first layer is
date, surface, result and a set tally; per-set scores are an explicit **Add set scores**
expansion and location/weather/temperature/notes live under **Add details**. This changes
entry ergonomics only — both fidelity levels and all optional raw fields remain exactly
the same. The domain flow is unchanged; only the final hand-off changed — the app now
publishes in one tap through a Cloudflare Pages Function, and still never holds a GitHub
token itself:

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
dashboard, or `.dev.vars` for `wrangler pages dev`). If a local/dev host does not provide the
Function, the app falls back to the original hand-off: `serializeDataset` to the clipboard +
open `DATASET_EDIT_URL` (`src/data/datasetSource.ts`) — paste over the file, commit, and let
Cloudflare Pages redeploy from `main`.

The previous GitHub Pages deployment workflow is intentionally retired: the historical YAML is
kept at `.github/retired-workflows/deploy-pages.yml`, outside `.github/workflows/`, so GitHub
Actions will not auto-run it on pushes. Cloudflare Pages is the only active deploy target.

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

A match may also carry optional **weather** as raw input: `conditions` (a set of felt-condition
tags from `WEATHER_TAGS` in `schema.ts` — `sunny`/`cloudy`/`windy`/`hot`, overlapping allowed)
and `tempC` (a rough temperature in °C). Both are absent by default (early matches have neither),
recorded manually — no weather API. Display labels live in `src/components/weather.tsx`; extend
the vocabulary by adding a tag in `schema.ts` and its label there. These are captured and shown
(add-match form, review, match detail) but not yet sliced analytically — a "By weather" breakdown
is a deferred follow-up (see [PROJECT_PLAN.md](PROJECT_PLAN.md)), meaningful once matches carry it.

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
- optional weather: `conditions` must be an array of known, non-duplicate `WEATHER_TAGS`;
  `tempC` must be a number in −30…55
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
- The three entries have one job each: **Overview** answers “what is this rivalry's state
  now?”, **Add** records or completes one raw match, and **Matches** answers “what happened?”
  with the complete archive. Overview renders the newest raw match plus two compact recent
  matches; Matches renders every raw match, including unfinished ones. Derived figures on both
  routes still use finished matches only.
- The large head-to-head score is the visual anchor inside the **Matchday Journal**: a
  continuous physical book rather than a dashboard-card stack. Overview reads in DOM order
  as leather masthead → rivalry spread → handwritten note → compact Rivalry ledger → expanded
  latest chapter → exploration lenses → two-row recent chapter index → evidence/version footer. The
  ledger is the shallow comparison layer (Set record / Win rate / Deciders / Current run); each
  value opens the existing evidence-aware sheet layer, so the physical-journal treatment does
  not make core rivalry data undiscoverable. Wider screens
  enlarge that page rather than splitting it back into dashboard columns; source and
  keyboard order remain identical at every width.
- Surface badges use distinct colors.
- Results are colored by **player identity**, not win/loss: recent form shows the winner's
  `abbr` in their color, and match cards take the winner's stripe color.
- Match scorelines read from the **winner's perspective** (tennis convention):
  `formatWinnerScoreline` in `src/domain/deriveStats.ts` produces "Andy won 2—1" with
  winner-first set lines. Views that lay out Alan-left / Andy-right (the detail set list,
  the H2H impact line) keep the fixed orientation — names and colours make those explicit.
- Overview and Matches share one **journal cover language** without sharing one page plate.
  Overview keeps the full leather/book/paper composition. Matches clips only the leather
  region into a semantic cover, then owns an opaque textured-paper archive beneath it; the
  baked Overview bookmark never continues through archive rows. Both covers use the same crest,
  gold type and physical seam, while the archive heading, filters and ruled rows remain live UI.
- The Matches archive optimises for scanning and comparison rather than repeating Overview:
  surface filters remain, date/surface/location/status are always explicit, and every row labels
  whether it has full set scores or only a set-tally summary before opening shared match detail.
- Overview carries a **Rivalry timeline** lens and interactive sheet: a cumulative lead
  curve plus date-backed cadence evidence. Recent form supplies the last-five balance
  directly. The curve is indexed
  by match order (`seq`, always present) so it reads correctly even when early matches have
  no `date`; dates only feed the cadence strip. `DataCoverage` makes the supporting raw-data
  counts visible (dated, detailed-score and weather matches), so date-led claims never imply
  full coverage. It stores no new raw data — `deriveTimeline`, `deriveCadence` and
  `deriveDataCoverage` (`src/domain/deriveStats.ts`) derive everything from the existing
  dataset. `deriveCadence` takes an injected `now` to stay pure/testable, and counts only
  dated finished matches (undated ones are tallied separately, never guessed).
- Ledger cells and journal lenses open shared evidence-aware sheets. New pure helpers
  (`deriveGamesTally`, `deriveScorelineDistribution`, `longestRun`, `maxLead`,
  `deriveSurfaceForm`, `matchGamesTally`) deepen those views without changing the dataset.
  `LeadSparkline` uses match order, not guessed dates; its interactive form exposes one
  native range control for touch and keyboard selection and a fixed-height live caption.
  Game totals always travel with detailed/finished match counts so partial evidence cannot
  appear complete.
- `src/components/Modal.tsx` is the single shared overlay shell (backdrop, escape-to-close,
  focus-on-open, focus trap, return-focus, body-scroll lock). `MatchDetail`,
  `StatDetailSheet` and `AddMatchSheet` all build on it — new modal-style UI should reuse it
  rather than re-implementing that chrome. It owns entry/exit motion and delays `onClose`
  until `backdrop-out` completes, with a 300ms fallback and reduced-motion short circuit.
  `dismissRef` lets form success/discard actions use the same exit path. Add form, review
  and discard phases keep distinct React keys so `closing` state cannot leak across a reused
  Modal instance. `AddMatchSheet` can intercept a requested close and show its own discard
  confirmation when a draft exists. The scroll lock pins the body
  with `position: fixed` + a remembered scroll offset, because mobile WebKit (Safari *and*
  iPhone Chrome) ignores `overflow: hidden` on body for touch scrolling.
- `.modal-panel` is a detached journal sheet inside the existing blurred backdrop: fully
  rounded on phones, centered on wider screens, bounded by safe-area-aware backdrop padding,
  and internally scrollable. Exit animation finishes before body scroll/focus cleanup.
- Fixed chrome must not be positioned with `transform` (mobile browsers repaint it late
  during scroll, so it visibly drifts) — `.bottom-nav` centers with auto margins instead.
- `viewport-fit=cover` is intentional. Journal covers extend behind iPhone status chrome, but
  title content and the leather-to-paper seam are offset by `env(safe-area-inset-top)`. In
  installed `display-mode: standalone`, the bottom navigation owns the whole bottom inset:
  controls remain above the Home Indicator while its glass material continues to the physical
  edge. Standalone height uses conservative `100vh` to avoid WebKit's dynamic-viewport gap.
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

- **Glass is only for the floating system layer** — bottom navigation, centre Add, and the
  shared modal shell used by match detail, analysis and add/update flows. Journal pages, archive
  rows, charts, fact blocks and form fields remain opaque paper inside it. Never glass on glass.
- Colour tokens (`--material-bg`, `--material-bg-strong`, `--material-border`,
  `--material-edge`, translucent/solid scrims and the accent material) live in `skins.css`;
  the structural blur radius lives in `global.css` `:root`.
- Fallbacks are final-cascade rules: both standard and prefixed no-`backdrop-filter` support
  tests, plus `prefers-reduced-transparency`, remove blur and use solid panel/scrim/accent
  colours. `prefers-reduced-motion` keeps the same state transitions but makes them effectively
  instantaneous.
- Visual semantics stay separate: journal materials describe content; glass describes system
  controls; dataset player colours describe identity; surface tokens describe court category.
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
