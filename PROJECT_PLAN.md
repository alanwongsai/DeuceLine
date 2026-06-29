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

Status: placeholder complete. Real shared editing is future work.

## Phase 5: Data Update Workflow

- Document manual JSON update.
- Add validation command if practical.
- Consider future script for adding matches safely.

Status: documentation started. Validation command is future work.

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

## Future Phases

- Multi-rivalry support.
- Import/export as a non-canonical helper.
- Admin editor.
- GitHub API sync with protected token strategy.
- Firebase or Supabase.
- Native iOS app.
