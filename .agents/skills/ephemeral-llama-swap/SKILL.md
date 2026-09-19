---
name: ephemeral-llama-swap
description: 'Local LLM backend: env policy, availability, VRAM eviction.'
---
# Local Llama-Swap Backend

How the workspace talks to the local OpenAI-compatible backend (`llama-swap` on
`http://127.0.0.1:8081/v1`) and how to free GPU memory when done.

## Overview

The workspace pins all Graphify inference to the local backend through
`.agents/scripts/llama-swap-env.sh` — a thin, side-effect-free policy script
that exports the endpoint, key, model, and neutralizes higher-priority cloud
provider credentials and proxy variables. It starts nothing and prints nothing,
so it is safe to source concurrently from parallel orchestrators.

`.agents/scripts/llama-swap-lifecycle.sh` sources that policy and nothing else:
**the workspace no longer auto-spawns or auto-tears-down the server.** Run
`llama-swap` yourself (or via your own launcher) before a `reindex` tier; MCP
queries and AST updates never need it.

```bash
# Availability probe
curl -s -m 2 http://127.0.0.1:8081/v1/models >/dev/null && echo up || echo down
```

## When to Use

- A graph `reindex` tier (the only LLM-backed tier) needs the local backend up.
- GPU VRAM must be released after a heavy local inference job.
- Diagnosing `Connection Refused` from graphify or an MCP graph server.

| Tier           | Command                        | Needs local backend |
| -------------- | ------------------------------ | ------------------- |
| **ast**        | `npm run graph:<repo>:ast`     | No                  |
| **update**     | `npm run graph:<repo>:update`  | No                  |
| **reindex**    | `npm run graph:<repo>:reindex` | Yes                 |

## Quick Reference

| Action                    | Command                                                             |
| :------------------------ | :------------------------------------------------------------------ |
| **Probe backend**         | `curl -s -m 2 http://127.0.0.1:8081/v1/models`                      |
| **Unload model (VRAM)**   | `curl -s -X POST http://127.0.0.1:8081/api/models/unload`           |
| **Backend log**           | `~/.cache/llama-swap-ephemeral.log`                                 |
| **Graphify watch log**    | `~/.cache/foe-info/graphify-watch.log`                              |
| **Graphify MCP log**      | `~/.cache/foe-info/graphify-mcp.log`                                |
| **FoE-Info reindex**      | `npm run graph:foe-info:reindex [-- --mode deep] [-- --force]`      |

## Key Invariants

- **Env only, no lifecycle**: `llama-swap-env.sh` exports policy and nothing
  else — no traps, no server start, no stdout. Keep it that way so parallel
  scripts can source it without side effects.
- **No cloud fallback**: cloud backend overrides are rejected by
  `run-graphify-local.sh` before execution. Pinning is deliberate.
- **Unload before stopping**: send `POST /api/models/unload` before killing
  anything, so `llama-server` tears down cleanly instead of leaking VRAM.

## Troubleshooting

| Issue                  | Root Cause                                                        | Resolution                                                                                                  |
| :--------------------- | :---------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------- |
| **Connection Refused** | No backend listening — the workspace does not start one for you.   | Start `llama-swap` with your own launcher, then re-run the reindex tier.                                     |
| **GPU VRAM Stuck**     | Process killed with `kill -9`, bypassing model unload.             | `curl -s -X POST http://127.0.0.1:8081/api/models/unload`, or `pkill -f "llama-server.*qwen2.5-vl-7b"`.      |
| **Semantic work skipped** | `extract`/`label` found `/v1/models` unreachable and exited 0.  | Check the watch log for `unavailable; ... skipped`, start the backend, re-run.                                |

