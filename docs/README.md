# FoE-Info Extension — Documentation Hub

Central documentation index for developers and agents working on the FoE-Info Chrome extension.

## Documentation Index

| Topic                       | Document                                  | Purpose                                                                      |
| :-------------------------- | :---------------------------------------- | :--------------------------------------------------------------------------- |
| **Live Work & Todos**       | [`docs/STATUS.md`](STATUS.md)             | In-progress threads and open todos. Updated atomically with changes.         |
| **Project Handoff**         | [`docs/HANDOFF.md`](HANDOFF.md)           | Verified state, architecture decisions, and resume-safely notes.             |
| **Software Architecture**   | [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) | Extension runtime architecture, data pipeline, and modular layer invariants. |
| **Commands & Verification** | [`docs/COMMANDS.md`](COMMANDS.md)         | Pipeline stages, test runners, build gates, and graphify commands.           |
| **Debugging Guide**         | [`docs/debugging.md`](debugging.md)       | Runtime Debug Mode, scoped loggers, and diagnostic conventions.              |
| **Knowledge Graph**         | [`docs/GRAPHIFY.md`](GRAPHIFY.md)         | Graph catalog, 3-tier contract, local launcher, and watch flows.             |
| **Implementation Plans**    | [`docs/plans/`](plans/)                   | Active implementation plans with step-by-step checkbox tracking.             |
| **Design Specifications**   | [`docs/specs/`](specs/)                   | Validated architectural and feature design documents.                        |
| **Skills Catalog**          | [`docs/SKILLS.md`](SKILLS.md)             | Generated catalog of task-specific runbooks in `.agents/skills/`.            |
| **Subagents Catalog**       | [`docs/SUBAGENTS.md`](SUBAGENTS.md)       | Generated catalog of specialized agent personas in `.agents/agents/`.        |
| **Live HAR Captures**       | `../metadata-store/extracts/`             | Extracted RPC payloads, bundles, and city ground truth.                      |

## Session Protocol

1. **Workspace Entrypoint**: Read [`AGENTS.md`](../AGENTS.md) for non-negotiable workspace rules and boundaries.
2. **Current State**: Read [`docs/STATUS.md`](STATUS.md) for open items, and [`docs/HANDOFF.md`](HANDOFF.md) when resuming a thread.
3. **Task Scope**: Check `docs/plans/` for active plans before starting non-trivial tasks.
4. **Clean Worktree**: Inspect `git status` before editing; do not work against a dirty or stale state.
5. **Atomic Updates**: When a thread status changes or a task completes, update `docs/STATUS.md` in the same change.
