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

## Future Phases

- Multi-rivalry support.
- Import/export as a non-canonical helper.
- Admin editor.
- GitHub API sync with protected token strategy.
- Firebase or Supabase.
- Native iOS app.
