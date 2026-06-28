# AGENTS.md

Instructions for Codex, Claude, Kimi, and other AI coding agents working on Deuceline.

## Project Goal

Deuceline is a mobile-first tennis rivalry tracker for one fixed rivalry: Alan vs one regular tennis partner.

The app should feel like a polished mobile sports notebook, not a generic dashboard.

## Current V1 Scope

- Single rivalry only.
- Static GitHub Pages deployment.
- Read the shared dataset from `public/data/deuceline-data.json`.
- Display Overview and Matches pages.
- Keep the center add button as a placeholder until there is a real shared data update workflow.

Do not overbuild this into a tournament, coaching analytics, social, or live scoring platform.

## Hard Rules

- If a value can be derived from `match.sets`, derive it instead of storing it.
- Do not store match winner.
- Do not store match score.
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

## Before Final Response

Run, when dependencies are installed:

```bash
npm run typecheck
npm run build
```

In the final response, summarize:

- Files created or changed.
- Commands run.
- Whether typecheck/build passed.
- What is intentionally left for the next step.
- Architecture risks or decisions Alan should review.
