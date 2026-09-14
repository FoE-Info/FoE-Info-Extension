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

- `safety-gate.mjs` — command interception
- `pre-invocation-reminder.mjs` — guardrail injection
- `stop-guard.mjs` — background task protection
- `llama-swap-env.sh` — shared inference policy (OPENAI_BASE_URL, model, keys)
- `llama-swap-lifecycle.sh` — sources the inference policy for graphify scripts
- `run-graphify-local.sh` — local graphify runner (MCP + watch modes)
- `graph-*-ast.sh|update.sh|reindex.sh` — 10 graphify pipeline scripts

The graphify pipeline runs manually via `npm run graph:*:ast|update|reindex`.

## Hook Safety

The `safety-gate` intercepts commands matching destructive patterns. Test with:

```bash
node .agents/scripts/safety-gate.mjs "rm -rf /"
```
