# Lifecycle Hooks Reference

Defined in `.agents/hooks.json`. Hooks run as Node.js scripts via Antigravity/OpenCode lifecycle events.

## Active Hooks (3)

| Hook                 | Event           | Matcher       | Script                                | Timeout | Purpose                                          |
| -------------------- | --------------- | ------------- | ------------------------------------- | ------- | ------------------------------------------------ |
| `safety-gate`        | `PreToolUse`    | `run_command` | `scripts/safety-gate.mjs`             | 5s      | Intercept destructive commands                   |
| `monolith-guardrail` | `PreInvocation` | —             | `scripts/pre-invocation-reminder.mjs` | 5s      | Inject guardrail reminders before subagent calls |
| `stop-guard`         | `Stop`          | —             | `scripts/stop-guard.mjs`              | 5s      | Block premature exit during background tasks     |

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
