# Cross-Agent Coordination

`docs/README.md` is the coordination hub. `AGENTS.md` is the portable harness entrypoint, `docs/STATUS.md` lists open work only, and `docs/HANDOFF.md` records verified state for resume work.

## Ownership

- `.agents/` is the Git-tracked canonical library: 55 skills, 20 subagents, 17 rules, shared references, scripts, hooks, and MCP registry.
- `.opencode/` and `opencode.json` adapt the canonical library to OpenCode without owning duplicate skills or personas.
- Other harnesses consume the same canonical definitions through their native discovery and adapter mechanisms.

## Session Discipline

1. Read `AGENTS.md`, `docs/README.md`, and `docs/STATUS.md` at startup. Read `docs/HANDOFF.md` only when resuming a named thread or verifying known state.
2. Inspect branch, working tree, and current source before acting on a plan.
3. Select a relevant skill before implementation and a subagent only for independently bounded specialist work.
4. Keep unrelated working-tree changes untouched.
5. Do not stage, commit, push, publish, merge, restore, clean, or mutate external systems without the applicable explicit authorization.
6. Use Graphify for broad architecture discovery; verify conclusions against current source.
7. Follow `.agents/rules/verification-before-completion.md` before claiming completion.

## Host Differences

Read `.agents/references/harness-adapters.md` for tool names, subagent dispatch, rule activation, worktree isolation, hooks, and artifact placement. Host adapters may translate capabilities, but they must not fork canonical behavior.

## Current Work

Use `docs/STATUS.md`. Completed work is removed from the live board; Git history is the backup.
