# Lifecycle Hooks Reference

Defined in `.agents/hooks.json`. Hooks run as Node.js scripts via Antigravity/OpenCode lifecycle events.

## Active Hooks (3)

| Hook                 | Event           | Matcher       | Script                                | Timeout | Purpose                                          |
| -------------------- | --------------- | ------------- | ------------------------------------- | ------- | ------------------------------------------------ |
| `safety-gate`        | `PreToolUse`    | `run_command` | `scripts/safety-gate.mjs`             | 5s      | Intercept destructive commands                   |
| `monolith-guardrail` | `PreInvocation` | —             | `scripts/pre-invocation-reminder.mjs` | 5s      | Inject guardrail reminders before subagent calls |
| `stop-guard`         | `Stop`          | —             | `scripts/stop-guard.mjs`              | 5s      | Block premature exit during background tasks     |

## Removed Hooks (cleanup)

| Hook             | Was                                | Reason         |
| ---------------- | ---------------------------------- | -------------- |
| `graphify-guard` | `PreToolUse: grep_search           | find_by_name   | call_mcp_tool                      | run_command` | Overzealous auto-sync, burned context |
| `graphify-sync`  | `PostToolUse: replace_file_content | write_to_file` | Overzealous AST sync on every edit |

**Graphify workflow still works** via `npm run graph:*:ast|update|reindex` — hooks were an auto-sync layer, not the pipeline.

## Script Locations

All scripts in `.agents/scripts/`:

- `safety-gate.mjs` — command interception
- `pre-invocation-reminder.mjs` — guardrail injection
- `stop-guard.mjs` — background task protection
- `llama-swap-lifecycle.sh` — LLM backend env setup (sourced by graphify scripts)
- `llama-swap-env.sh` — shared inference policy (OPENAI_BASE_URL, model, keys)
- `run-graphify-local.sh` — local graphify runner (MCP + watch modes)
- `graph-*-ast.sh|update.sh|reindex.sh` — 10 graphify pipeline scripts

## Hook Safety

The `safety-gate` intercepts commands matching destructive patterns. Test with:

```bash
node .agents/scripts/safety-gate.mjs "rm -rf /"
```
