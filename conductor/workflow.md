# Workflow & Development Invariants

## Core Development Disciplines

1. **Test-Driven Development (TDD)**:
   - Follow strict Red $\rightarrow$ Green $\rightarrow$ Refactor cycles coordinated via the `test-driven-development` skill.
   - Write or update test suites under `tests/` before declaring implementation complete.
2. **Subagent-Driven Development (SDD)**:
   - For independent implementation tasks, dispatch bounded subagents via the `subagent-driven-development` skill and `invoke_subagent` per `.agents/rules/subagent-delegation.md`.
3. **Small Incremental Slices**:
   - Work in discrete increments targeting $\le 100$ lines of change per pass.
   - Clean up only code relevant to the immediate slice; avoid speculative abstractions.
4. **Modular Architecture**:
   - Files in `src/js/` must strictly remain $\le 500$ lines, with an active refactoring target of $\le 250$ lines.
5. **Verification Gate**:
   - Run `npm test` during development and `npm run verify` before completing any increment.
6. **Knowledge Graph Integration (Graphify)**:
   - Run `npm run graph:foe-info:ast` automatically via the `npm run verify` gate to ensure live AST freshness.
   - Query Graphify MCP (`god_nodes`, `get_community`, `query_graph`) before planning refactors or architecture tracks to cluster tasks by dependency coupling.

## Conductor Track Lifecycle

Tracks live under `conductor/tracks/` as self-contained work units:

1. **Track Specification (`index.md`)**: Defines context, requirements, acceptance criteria, and status.
2. **Implementation Plan (`plan.md`)**: Broken into phased tasks with test-first checkboxes.
3. **Verification**: Checked against `npm run verify` and test evidence.
4. **Git Checkpoint**: Committed with an unslop commit message after explicit user approval.

## Agent Environment & Tooling

Detailed Antigravity tool mappings, permissions, and sandbox constraints are documented in [`.agents/references/antigravity-environment.md`](../.agents/references/antigravity-environment.md).

## Session Resumption Protocol

To resume work on an active track in a fresh session:
`/boost Resume active modernization track from conductor/`
