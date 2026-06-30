# CLAUDE.md

This project uses **[AGENTS.md](AGENTS.md)** as its primary instruction file for all AI
coding agents (Claude, Codex, Kimi, …), so everyone works from one source of truth.

**Read [AGENTS.md](AGENTS.md) before making any changes to this repository.**

`CLAUDE.md` is only a pointer — do not treat it as a project-state source. AGENTS.md
carries the startup core, scope and hard rules, architecture boundaries, the Working
Agreement, the Current State pointer block, the Documentation Sync Rules (which one doc
owns each kind of fact — point, don't copy), and the close-out contract.

## Working alongside other agents

More than one agent may share this working tree. Commit only the files you changed (use
explicit `git add <paths>`, not `git add -A`) so you don't sweep up another agent's
in-progress work.
