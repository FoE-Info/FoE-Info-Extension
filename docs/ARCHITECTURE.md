# Harness Architecture and Precedence

## Canonical Layers

1. `AGENTS.md` — portable repository entrypoint.
2. `.agents/` — canonical skills, subagents, rules, references, scripts, hooks, MCP registry, and project identity.
3. Host adapters — `.opencode/`, `opencode.json`, and equivalent host-native registration.
4. User/global host configuration.
5. Harness defaults.

A lower layer may translate tool names or registration formats but must not duplicate or override canonical repository behavior silently.

## Progressive Disclosure

- Eight `always_on` rules are active for every task.
- Nine `model_decision` rules load only when their declared domain matches.
- Skills load by task relevance from `.agents/skills/`.
- Subagents load only when dispatched from the 20-persona roster.
- Optional facts, profiles, and examples load from reference catalogs.

## MCP Profiles

`.agents/mcp-registry.json` defines the available servers and task-scoped profiles. `.agents/scripts/mcp-profile.mjs` generates `.agents/mcp_config.json` and synchronizes OpenCode `enabled` flags while preserving unrelated OpenCode configuration.

Commands resolve through `PATH`; graph locations are workspace-relative. The default profile enables only the FoE-Info graph. Browser, peer-graph, GitHub, and Linux servers are opt-in by task.

## Host Adapter

See [.agents/references/harness-adapters.md](../.agents/references/harness-adapters.md) for current tool mapping, subagent dispatch, worktree isolation, rule activation, skill discovery, hook parity, and artifact placement.

## Project Identity

`.agents/project.json` owns `name`, `displayName`, and `primaryGraph`. `package.json` mirrors the fields needed by npm and build tooling.

## Verification

Harness parity, exact catalogs, rule activation, profile generation, Markdown links, and configuration structure are enforced under `tests/agents/` and through `npm run test:agents`.
