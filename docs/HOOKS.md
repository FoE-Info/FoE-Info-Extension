# Lifecycle Hooks Reference

Defined in `.agents/hooks.json`. Hooks run as Node.js scripts via Antigravity lifecycle events.

## Active Hooks (2)

| Hook             | Event        | Matcher                                                       | Script                               | Timeout | Purpose                                                         |
| ---------------- | ------------ | ------------------------------------------------------------- | ------------------------------------ | ------- | --------------------------------------------------------------- |
| `safety-gate`    | `PreToolUse` | `run_command`                                                 | `.agents/scripts/safety-gate.mjs`    | 5s      | Intercept destructive commands (RTK-compatible)                 |
| `graphify-guard` | `PreToolUse` | `run_command`, `grep_search`, `find_by_name`, `call_mcp_tool` | `.agents/scripts/graphify-guard.mjs` | 5s      | Enforce Query-First protocol on broad searches (RTK-compatible) |

## Script Locations

All scripts in `.agents/scripts/`:

- `safety-gate.mjs` — command interception and destructive command safety gate
- `graphify-guard.mjs` — query-first search interception and Graphify redirection
- `generate-agent-catalogs.mjs` — frontmatter catalog generator for skills and subagents
- `mcp-profile.mjs` — MCP profile activation and config generator
- `llama-swap-env.sh` — shared inference policy (OPENAI_BASE_URL, model, keys)
- `graphify.sh` — unified runner for all knowledge graph targets (ast, update, reindex, export, watch)

The graphify pipeline runs via `npm run graph:*:ast|update|reindex`.

## Hook Safety

The `safety-gate` intercepts commands matching destructive patterns. Test with:

```bash
node .agents/scripts/safety-gate.mjs "rm -rf /"
```
