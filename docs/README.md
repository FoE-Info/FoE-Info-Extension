# FoE-Info Extension — Documentation Hub

Central documentation index for developers and agents working on the FoE-Info Chrome extension.

## Documentation Index

| Topic                       | Document                                        | Purpose                                                                      |
| :-------------------------- | :---------------------------------------------- | :--------------------------------------------------------------------------- |
| **Tracks & Active Work**    | [`conductor/tracks.md`](../conductor/tracks.md) | In-progress tracks, task plans, and open milestones.                         |
| **Product & Workflow**      | [`conductor/index.md`](../conductor/index.md)   | Product vision, tech stack, and development workflow.                        |
| **Software Architecture**   | [`docs/ARCHITECTURE.md`](ARCHITECTURE.md)       | Extension runtime architecture, data pipeline, and modular layer invariants. |
| **Commands & Verification** | [`docs/COMMANDS.md`](COMMANDS.md)               | Pipeline stages, test runners, build gates, and graphify commands.           |
| **Debugging Guide**         | [`docs/debugging.md`](debugging.md)             | Runtime Debug Mode, scoped loggers, and diagnostic conventions.              |
| **Knowledge Graph**         | [`docs/GRAPHIFY.md`](GRAPHIFY.md)               | Graph catalog, 3-tier contract, local launcher, and watch flows.             |
| **Lifecycle Hooks**         | [`docs/HOOKS.md`](HOOKS.md)                     | Command interceptors, safety gates, and lifecycle automation.                |
| **Implementation Plans**    | [`docs/plans/`](plans/)                         | Historical plan archive (active tasks tracked in `conductor/tracks/`).       |
| **Design Specifications**   | [`docs/specs/`](specs/)                         | Validated architectural and feature design documents.                        |
| **Skills Catalog**          | [`docs/SKILLS.md`](SKILLS.md)                   | Generated catalog of task-specific runbooks in `.agents/skills/`.            |
| **Subagents Catalog**       | [`docs/SUBAGENTS.md`](SUBAGENTS.md)             | Generated catalog of specialized agent personas in `.agents/agents/`.        |
| **Live HAR Captures**       | `../metadata-store/extracts/`                   | Extracted RPC payloads, bundles, and city ground truth (sibling workspace).  |

## Session Protocol

1. **Workspace Entrypoint**: Read [`AGENTS.md`](../AGENTS.md) for non-negotiable workspace rules and boundaries.
2. **Current State**: Read [`conductor/tracks.md`](../conductor/tracks.md) for active tracks, and [`conductor/workflow.md`](../conductor/workflow.md) when resuming a thread.
3. **Task Scope**: Check active track plans under [`conductor/tracks/`](../conductor/tracks/) before starting non-trivial tasks.
4. **Clean Worktree**: Inspect `git status` before editing; do not work against a dirty or stale state.
5. **Atomic Updates**: When a task completes, update the active track's `plan.md` and `conductor/tracks.md` in the same change.
