# Lifecycle Hooks Reference

Defined in `.agents/hooks.json`. Hooks run as Node.js scripts via Antigravity lifecycle events.

## Active Hooks (1)

| Hook          | Event        | Matcher       | Script                            | Timeout | Purpose                        |
| ------------- | ------------ | ------------- | --------------------------------- | ------- | ------------------------------ |
| `safety-gate` | `PreToolUse` | `run_command` | `.agents/scripts/safety-gate.mjs` | 5s      | Intercept destructive commands |

## Script Locations

All scripts in `.agents/scripts/`:

- `safety-gate.mjs` — command interception and destructive command safety gate
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
