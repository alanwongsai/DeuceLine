# Deuceline — Project Memory (router + decision ledger)

> For fast context recovery in a new session. **This is a router + durable-decision
> ledger, not a status mirror**: current status, version, what shipped, and progress
> are NOT written here — they live in their owner docs and this file only points at
> them. (Copying volatile facts into memory is exactly what makes a memory rot.)

## What this is (one line)

Deuceline is a mobile-first tennis rivalry tracker for one fixed rivalry — Alan vs
his regular partner Andy — deployed as a static Cloudflare Pages app with a thin
stateless commit proxy for match publishing.

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
| publish core | Write gate + add/update rules, host-agnostic | `functions/api/_publish.ts` (+ `_github.ts` store) |
| build:core | CommonJS bundles + WXSS tokens for the mini program | `scripts/build-core.mjs` |
| mini program brief | Port layout, shared-core contract, design essence | [MINIPROGRAM.md](MINIPROGRAM.md) |

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
  `public/data/deuceline-data.json`, validates, derives and renders; the add/update form
  publishes through the stateless Cloudflare commit proxy. **Why:** everyone opening the
  link must see one shared record while the browser never holds the repo token.
  **Boundary:** `localStorage` is never canonical; do not replace the repo JSON or the
  documented commit-proxy/editor-fallback write path with client-only state.

- **Overview is state; Matches is history; Add is the write action.** Overview keeps the H2H,
  actionable evidence ledger, newest chapter and only two compact recent chapters. Matches
  owns the complete archive, including unfinished matches and score-fidelity labels. **Why:**
  duplicating the archive on Overview makes the third navigation entry meaningless.
  **Boundary:** do not move full history or a second metrics dashboard back onto Overview;
  unfinished rows may display in history but remain excluded from all derived statistics.

- **One CSS material, editorial journal voice.** Serif type, a large head-to-head, chapters
  and a derived narrative carry the journal identity. Physical leather, paper textures,
  ribbons and stamps are retired. **Why:** preserve the sports-notebook voice while giving
  the web and native shell a shared, adaptable material. **Boundary:** skin tokens own
  chrome and display palettes; dataset colours remain default identity; labelled badges own
  surface category.
  Keep reduced-transparency/motion fallbacks and shared Modal behavior.

- **UI is colored by player identity, not win/loss.** The dataset owns player keys,
  names, default colours and abbreviations. **Why:** records need stable ownership even
  when appearance changes. **Boundary:** Alan remains left and Andy right in comparisons;
  winner-first scorelines stay explicitly winner-first. Never rewrite canonical player
  configuration or store derived/display colours in match data.

- **Grand Slam themes may adapt identity presentation.** The shared web identity mapping
  resolves theme display palettes with dataset colours as its fallback; all records, dots,
  text, forms and charts use that mapping. **Why:** switching themes should change the
  whole visual language consistently. **Boundary:** Wimbledon day keeps the dataset palette;
  evening preserves colour families with readable tones. Theme selection is a device
  preference, not the match's actual surface. Court labels and error semantics remain explicit.
  Implementation belongs to ENGINE.md; the default-only mini export seam belongs to
  MINIPROGRAM.md.

- **Two clients, one truth, one rulebook.** The web PWA (Cloudflare) and the WeChat mini
  program (CloudBase, 体验版) run in parallel from this repo; both read and commit the same repo
  JSON, and both run the same domain layer and publish core (the mini program via
  `npm run build:core`). **Why:** Alan wants to keep maintaining one repo while trying the
  WorkBuddy → mini program pipeline, and two copies of the rules would drift. **Boundary:** the
  mini program never re-implements validation/derivation/write rules and never gets its own
  canonical store; the web path is not degraded for the mini program's sake. See
  [MINIPROGRAM.md](MINIPROGRAM.md).

- **Single fixed rivalry in v1.** Alan vs Andy only. **Why:** keeps the model and UI
  honest to the one real use case. **Boundary:** multi-rivalry / multi-player is a
  deliberate future expansion (would replace the alan/opponent keys) — see
  [PROJECT_PLAN.md](PROJECT_PLAN.md), don't slide into it.

- **Validation fails loudly, pragmatically.** `validateDataset.ts` is the runtime gate;
  `public/data/deuceline.schema.json` is a shape-only JSON Schema. **Why:** historical
  tennis data is imperfect, but obviously broken data must not render silently.
  **Boundary:** per-set tennis scoring is enforced for `fidelity: "sets"` (see
  [ENGINE.md](ENGINE.md) → Dataset Validation Strategy); tally-only matches stay loosely
  checked because they are, by definition, partially remembered.

- **Laver Cup match format: one set all → match tiebreak to 10.** Agreed by Alan and Andy
  (2026-09). Stored as raw `matchTiebreak` points beside `sets`, not as a third "set".
  **Why:** points in `sets` would pollute every game-level stat and per-set rule; a separate
  optional field also leaves every earlier match valid without a migration or a
  `schemaVersion` bump. **Boundary:** old full-third-set matches are never rewritten; a
  full third set stays enterable; no date-based "format era" switch — see
  [ENGINE.md](ENGINE.md) → Domain Model Rules.

- **Set record counts full sets only; super tiebreaks are their own tally.** Alan, 2026-10-04.
  **Why:** a ten-point tiebreak is not a set's worth of tennis, so counting it inflated the
  set record. **Boundary:** the match score still reads 2—1 and the match still counts as a
  decider; a tally-only 2—1 stays an "unrecorded decider" (never guessed as either kind).
- **The Overview note and next-match lean are derived, transparent and wordy.** Alan,
  2026-10-04. **Why:** the old note mixed the leader, the streak owner and the last-five
  leader into one sentence and misattributed runs. **Boundary:** the lean is a fixed public
  weighting shown in words with every factor visible — no percentages, no stored predictions,
  no model; tiebreak-in-set ("pressure points") stats are deliberately not built because they
  need point-level recording.
