# PROJECT_PLAN.md

Implementation plan for Deuceline.

## Phase 0: Project Scaffold

- Inspect repo.
- Create Vite + React + TypeScript project.
- Add baseline scripts.
- Add PWA-ready files.

Status: complete.

## Phase 1: Data Foundation

- Add TypeScript schema.
- Add sample JSON dataset.
- Add dataset loader.
- Add validation.
- Add derived stats functions.

Status: complete.

## Phase 2: Overview UI

- Add large head-to-head score.
- Add match record.
- Add recent form.
- Add stat cards.
- Add surface split.

Status: complete for scaffold.

## Phase 3: Matches UI

- Add match cards.
- Sort newest first.
- Add surface badges.
- Show set scores clearly.

Status: complete for scaffold.

## Phase 4: Add/Edit Design

- Add center plus button.
- Add placeholder modal.
- Define future persistent edit workflow.
- Avoid pretending browser edits are canonical in v1.

Status: complete — the placeholder became the real `AddMatchSheet` form in v0.6.1
(see MAINTENANCE_LOG.md and ENGINE.md, Data Update Flow). Browser edits are still
never canonical: the form hands off to the GitHub editor for the commit.

## Phase 5: Data Update Workflow

- Document manual JSON update.
- Add validation command if practical.
- Consider future script for adding matches safely.

Status: superseded by the add-match form, now upgraded to **one-tap publish** (shipped).
The review screen POSTs the new match to a Cloudflare Pages Function
(`functions/api/add-match.ts`) that commits it, guarded by a password + append-only + a
repo-scoped fine-grained PAT (see ENGINE.md, Data Update Flow). The GitHub-editor
copy/paste flow remains as an automatic fallback. Moving hosting to Cloudflare Pages and
setting the two secrets (`GITHUB_TOKEN`, `ADD_MATCH_PASSWORD`) are one-time owner steps;
until then the app falls back to the editor. See MAINTENANCE_LOG.md.

## Phase 6: PWA And GitHub Pages Polish

- Add manifest.
- Add icon placeholder.
- Add responsive mobile layout.
- Add GitHub Pages deployment notes.

Status: initial scaffold complete.

## Post-Scaffold Progress

- Schema v2: matches carry a `fidelity` ("sets" | "matchScore") and a `seq`; `date` is optional.
- Real data loaded: 7 Bishop matches (Alan vs Andy).
- Domain layer covered by Vitest tests (`npm test`).
- Add-match modal has Escape / focus / scroll handling (still a placeholder for real editing).
- GitHub Pages deploy workflow is in place.

## Phase 7: V-next Visual Refresh

Shift the app from win/loss coloring to player-identity coloring, plus richer presentation.

- Identity colors in schema (`Player.color` + `Player.abbr`); Alan terracotta, Andy grass. — done
- Recent form shows the winner's abbr in their color (no more W/L). — done
- Match-history cards stripe by the winner's identity color. — done
- Surface split bars/legend use identity colors. — done
- Replace the low-signal "Deciders" card with "Win rate". — done
- Multi-size PWA icon (favicon / apple-touch / 192 / 512 / maskable). — done
- Tennis-court-style hero score background (`CourtBackdrop`). — done
- Tap-to-open match detail (per-set, tiebreaks, H2H impact via `deriveMatchContext`). — done

Status: complete. Icons are PNGs rasterised from `public/assets/icon*.svg` (regenerate with
qlmanage if the art changes). Match entry/save deliberately deferred (still a placeholder).

## Phase 8: Wimbledon Skin + Skin Interface

Reskin the app to a Wimbledon palette and lay the interface for future Grand Slam skins.

- Skin token layer (`src/styles/skins.css`); chrome colour selected by `data-skin` on
  `<html>`, consumed by `global.css`. — done
- Wimbledon skin (default): cream / ivy-green / gold accent. — done
- Player identity colours → Alan purple `#57298a`, Andy grass green `#1e7a45` (in the
  dataset, not the skin). — done
- Hero rebuilt as a full split court; readability-tuned scores. — done
- Liquid-glass app icon; PNGs re-rasterised from `public/assets/icon*.svg`. — done

Status: complete. Interface is in place; **no skin-switcher UI yet** (a skin is chosen by
the `data-skin` attribute at build time).

Deferred / parked from this phase:
- **Future Grand Slam skins**: Roland-Garros, US Open, Australian Open. Each is one new
  `[data-skin="…"]` block in `skins.css` + the matching `data-skin` value. Will likely also
  want a runtime skin-switcher and a per-skin suggested player palette.
- **Colour clashes left unresolved this round**: surface `--grass`/`--clay` collide with a
  player's identity colour, and Wimbledon is itself a grass event (theme ↔ surface semantic
  overlap). Revisit when a skin-switcher or surface-colour rework lands.

## Phase 9: Unfinished matches + one-tap update

Support recording a match that was suspended before a winner was decided, and completing it
later — the first workflow that edits an existing match rather than only appending.

- Raw `status: "unfinished"` on a match (absent = finished); validation allows a tied score
  only while unfinished. — done
- Unfinished matches excluded from every derived stat until completed; shown in the Matches
  list with a split identity stripe + "In progress" tag. — done
- Add-match form gains a **Result: Finished / Unfinished** toggle. — done
- **Update result** on an unfinished match reopens the form pre-filled and publishes via a
  new `POST /api/update-match` Function, which replaces the match by id **only while it is
  still unfinished** (decided history stays immutable). — done
- Write endpoints return the full updated dataset so the app refreshes immediately; GitHub
  `409` conflicts surface a reload prompt. — done

Status: complete. Boundary that stays parked: the update endpoint intentionally cannot edit a
*finished* match (no general match-editing / deletion in v1) — a mis-entered finished match is
still corrected via the GitHub-editor hand-off or a manual commit.

## Future Phases

- General match editing / correction of finished matches (beyond completing an unfinished one).
- Future Grand Slam skins (Roland-Garros / US Open / Australian Open) + skin-switcher UI.
- Multi-rivalry support.
- Import/export as a non-canonical helper.
- Admin editor.
- Cloudflare Access (email-login) as a stronger auth upgrade over the shared publish
  password — parked; the shipped one-tap flow uses the password gate.
- Firebase or Supabase.
- Native iOS app.
