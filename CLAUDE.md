# Agent Instructions

## Scope

- Root instructions apply repository-wide.
- Nested `CLAUDE.md` files (`src/CLAUDE.md`, `src/chrome/CLAUDE.md`, `src/css/CLAUDE.md`, `src/js/CLAUDE.md`) supplement these root instructions when working in their directory — Claude Code loads them automatically, no manual dispatch needed.
- Preserve unrelated working-tree changes.

## Git & Remote Workflow Invariants

- Never push or modify remote branches without explicit, prior user approval in chat. Local commits and branch checkouts are fine; remote push operations wait for authorization.
- Never delete, prune, or force-reset local topic or scratch branches (`fix/...`, `feat/...`) without explicit, prior user confirmation.

## Package Manager

- Use npm 12 with Node.js 24+: `npm install`, `npm run dev`, `npm run build`.
- Treat `package-lock.json` as authoritative; do not add another lockfile.

## File-Scoped Commands

| Task             | Command                                   |
| ---------------- | ----------------------------------------- |
| Check formatting | `npx --yes prettier@3.9.6 --check <file>` |
| Format           | `npx --yes prettier@3.9.6 --write <file>` |

- Run `npm run build` after source, manifest, dependency, or Webpack changes.

## Key Conventions

- Use Graphify before broad codebase searches when `graphify-out/graph.json` exists.
- Run `graphify update .` after code changes; treat `graphify-out/` as generated.
- See `README.md` for setup and `docs/knowledgebase/audit-summary.md` for known risk areas.

## Commit Attribution

- AI commits MUST include:

```text
Co-Authored-By: (the agent model's name and attribution byline)
```
