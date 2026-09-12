# FoE-Info Extension — Agent Coordination Hub

Single entry point for every agent (Antigravity, OpenCode, or any future host)
working in this repository. **Read this file first.** It routes to the current
status, handoff state, plans, specs, and host-specific wiring.

Ground-truth layout:

| Artifact                     | Location                      | What it holds                                                                                                                                                                                                                                                                                                                   |
| :--------------------------- | :---------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Live work & todos**        | `docs/STATUS.md`              | In-progress threads, open todos, recently-completed work. Update this file when something changes.                                                                                                                                                                                                                              |
| **Project handoff**          | `docs/HANDOFF.md`             | Dowser takeover history, verified fixes, decisions/corrections, remaining product work, resume-safely notes. Supersedes stale labels.                                                                                                                                                                                           |
| **Cross-agent rules**        | `docs/COORDINATION.md`        | Roster, standing rules for every agent every session, status-by-thread summaries.                                                                                                                                                                                                                                               |
| **Implementation plans**     | `docs/plans/`                 | `YYYY-MM-DD-<feature>.md` step plans with checkbox tracking.                                                                                                                                                                                                                                                                    |
| **Live HAR captures**        | `../metadata-store/extracts/` | Raw `docs/har/` recordings (2.3 GB) were purged 2026-09-12 to reclaim disk; their extracted ground truth lives in the sibling `../metadata-store/extracts/` (103 RPCs, 27 bundles, 13 cities) indexed into the metadata graph. Re-capture and re-run `npm run metadata:extract-hars` if raw HARs are needed; never commit them. |
| **Design specs**             | `docs/specs/`                 | `YYYY-MM-DD-<topic>-design.md` validated design documents.                                                                                                                                                                                                                                                                      |
| **Host wiring (opencode)**   | `docs/OPENCODE.md`            | opencode ↔ Antigravity coexistence, tool mapping, hook/plugin enforcement limits.                                                                                                                                                                                                                                               |
| **Debugging guide**          | `docs/debugging.md`           | Debug Mode usage and diagnostic conventions.                                                                                                                                                                                                                                                                                    |
| **Graphify local execution** | `docs/graphify-local.md`      | Local graphify launcher, backend env vars, watch/update flows.                                                                                                                                                                                                                                                                  |
| **Knowledge Base**           | `docs/KNOWLEDGEBASE.md`       | End-to-end codebase architecture, 6-stage data pipeline, subsystem catalog, and verified graph invariants.                                                                                                                                                                                                                      |

## Session start protocol (every host)

1. Read `AGENTS.md` (workspace rules) and this hub (`docs/README.md`).
2. Read `docs/STATUS.md` for live work/todos, then `docs/HANDOFF.md` for
   verified state and resume-safely notes.
3. Consult `docs/plans/` for active implementation plans; read the relevant
   plan before executing any step with checkbox tracking.
4. Read `.agents/rules/` marked `always_on` and any scoped rules for the task.
5. Inspect `git status` before editing; do not execute a stale plan.

## Writing convention

- **Plans** and **specs** are shared across hosts: save to `docs/plans/` /
  `docs/specs/` (see the `writing-plans` and `brainstorming` skills).
- **State**: when a thread changes status or a todo completes, update
  `docs/STATUS.md` in the same change, not after the fact.
- `docs/superpowers/` was consolidated into `docs/plans/` + `docs/specs/` on
  2026-09-10, and legacy runtime directories (`.superpowers/`) were removed.
  All active plans and specifications reside exclusively in `docs/plans/` and `docs/specs/`.
