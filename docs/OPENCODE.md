# OpenCode Adapter

`.agents/` is the Git-tracked source of truth for skills, subagents, rules, references, scripts, and hooks. `.opencode/` contains only the shims and plugins OpenCode requires; it does not own a second copy of the canonical library.

## Startup

1. Read `AGENTS.md`, `docs/STATUS.md`, and `docs/HANDOFF.md`.
2. Inspect the current branch, working tree, and relevant source before acting on a plan.
3. OpenCode injects the eight canonical rules whose frontmatter is `trigger: always_on`, plus `.opencode/instructions/*.md`.
4. Read a `model_decision` rule from `.agents/rules/` only when its declared scope matches the task.
5. Select project skills from `.agents/skills/` and subagents from `.opencode/agents/`.
6. Query the relevant Graphify graph before broad source discovery.
7. Run the verification required by `.agents/rules/verification-before-completion.md`.

## Canonical Inventory

- 55 skills under `.agents/skills/<name>/SKILL.md`.
- 20 delegated personas under `.agents/agents/<name>.md`.
- 17 rules under `.agents/rules/`: eight always-on and nine model-decided.
- Exact skill and subagent catalogs are generated from canonical frontmatter with `.agents/scripts/generate-agent-catalogs.mjs`.

The OpenCode agent roster must match the canonical subagent roster by name and description. Profile-driven agents require an explicit graph, comparison, or FoE topic profile from `.agents/references/agents/`.

## Tool Mapping

| Canonical/Antigravity action   | OpenCode action                       |
| ------------------------------ | ------------------------------------- |
| `run_command`                  | `bash`                                |
| `view_file`                    | `read`                                |
| `replace_file_content`         | `edit`                                |
| `write_to_file`                | `write`                               |
| `grep_search` / `find_by_name` | `grep` / `glob`                       |
| `invoke_subagent`              | `task` with `subagent_type: <name>`   |
| skill activation               | `skill` with `name: <skill>`          |
| `call_mcp_tool`                | configured MCP server tool            |
| isolated parallel workspace    | explicit worktree under `.worktrees/` |

See `.agents/references/harness-adapters.md` for the complete host-difference contract.

## Rule Activation

OpenCode does not interpret Antigravity rule frontmatter. `opencode.json` therefore lists every and only `always_on` rule explicitly. Do not restore an `.agents/rules/*.md` wildcard: it would make domain rules such as BigNumber precision global.

When changing a trigger:

1. update the canonical rule frontmatter;
2. synchronize `opencode.json` if the rule enters or leaves `always_on`;
3. run `node --test tests/agents/harness-parity.test.mjs tests/agents/taxonomy.test.mjs`.

## MCP Profiles

`.agents/mcp-registry.json` is canonical. Commands resolve through `PATH`; repository and sibling graph paths are workspace-relative. Generate task-scoped host configuration with:

```sh
node .agents/scripts/mcp-profile.mjs default
node .agents/scripts/mcp-profile.mjs browser
node .agents/scripts/mcp-profile.mjs research
node .agents/scripts/mcp-profile.mjs github
node .agents/scripts/mcp-profile.mjs linux
node .agents/scripts/mcp-profile.mjs full
```

The default profile enables only `graphify-foe-info`. Other servers remain disabled until a matching task requires them. Credentials remain environment substitutions; never commit secret values.

## Hooks and Permissions

- `.opencode/plugins/safety-gate.mjs` imports the shared dangerous-command classifier and blocks destructive commands.
- `.opencode/plugins/stop-guard.mjs` warns on idle while AST synchronization is pending; OpenCode has no equivalent blocking `fullyIdle` gate.
- `opencode.json` allows read/edit/search/task/skill operations. Shell commands ask by default; only named read, build, test, and verification patterns are pre-approved.
- Staging, committing, pushing, restoring, cleaning, stashing, destructive deletion, publishing, and external writes require the applicable explicit authorization.

## Verification

```sh
node --test tests/agents/harness-parity.test.mjs
node --test tests/agents/mcp-profile.test.mjs
node --test tests/agents/taxonomy.test.mjs
npm run test:agents
npm run verify
git diff --check
```

Live plugin or MCP behavior still requires an OpenCode runtime with the selected server/profile available; import and configuration tests do not prove a live external integration.
