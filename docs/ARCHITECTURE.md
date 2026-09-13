# Antigravity / OpenCode Architecture & Precedence

## Precedence Hierarchy

1. **Workspace Root** (`.agents/`, `AGENTS.md`)
2. **Declared Configs** (`.agents/skills/` individual files, `.agents/rules/`, `.agents/hooks.json`)
3. **Global** (`~/.gemini/config/`, `~/.config/opencode/`)
4. **Built-in** (agent defaults)

## Progressive Disclosure

- **Skills** load on-demand via `skill_view(name)`
- **Rules** inject contextually or via `always_on` trigger
- **Subagents** load only when invoked via `invoke_subagent`

## Dual-Harness MCP Registration

| Harness         | Config                    | Servers (7)                                                                                                                                   |
| --------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Antigravity CLI | `.agents/mcp_config.json` | chrome-devtools, github-mcp, graphify-foe-info, graphify-forge-hammer, graphify-metadata-store, graphify-foe-info-original, graphify-low-tool |
| OpenCode        | `opencode.json`           | Same 7, registered via plugin entries                                                                                                         |

**Permission grants:** `mcp(server/tool)` wrapper syntax in `~/.gemini/config/config.json`

## Handoff Protocol

See `antigravity-interop` skill for the full protocol:

- Antigravity runs out → OpenCode continues
- Grant rebuilds, MCP portability preserved
- Session context transferred via workspace state

## Documentation

- [Antigravity Docs](https://antigravity.google/docs)
- [Skills](https://antigravity.google/docs/skills)
- [Rules](https://antigravity.google/docs/rules-workflows)
- [Hooks](https://antigravity.google/docs/hooks)
- [MCP](https://antigravity.google/docs/mcp)

## Project Identity

`.agents/project.json` (canonical):

- `name`, `displayName`, `primaryGraph`

`package.json` mirrors these fields for npm/build tooling.
