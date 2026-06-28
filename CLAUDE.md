# CLAUDE.md

The canonical agent instructions for this project live in **[AGENTS.md](AGENTS.md)**, so that
every coding agent (Claude, Codex, Kimi, …) works from one source of truth. Read it before
making changes.

Supporting docs:

- **[ENGINE.md](ENGINE.md)** — durable engineering manual: architecture, data strategy, validation.
- **[MEMORY.md](MEMORY.md)** — project state, what's done, and open questions across sessions.
- **[PROJECT_PLAN.md](PROJECT_PLAN.md)** — phased plan and progress.

## Keep the boundaries truthful

These docs are only useful while they match the code. When you change the data model
(`src/domain/schema.ts`), validation, or the build/deploy setup, update AGENTS.md, ENGINE.md,
and MEMORY.md in the **same change** so they don't drift.

## Working alongside other agents

More than one agent may share this working tree. Commit only the files you changed (use explicit
`git add <paths>`, not `git add -A`) so you don't sweep up another agent's in-progress work.

## Before finishing

```bash
npm run typecheck
npm test
npm run build
```
