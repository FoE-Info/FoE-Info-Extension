---
name: ephemeral-llama-swap
description: Manage on-demand local LLM lifecycle with automatic VRAM eviction and server shutdown.
---

# Ephemeral Llama-Swap Lifecycle Manager

Automated on-demand lifecycle manager for local LLM inference via `llama-swap`. Ensures zero GPU VRAM is wasted when idle.

## Overview

Running local LLMs (e.g. `qwen2.5-vl-7b` at Q8_0) requires ~11–12 GB of GPU VRAM. Leaving `llama-server` or `llama-swap` idling in the background ties up the RTX A5000 GPU and blocks other workloads.

This skill provides an **automated sourcing & ephemeral lifecycle pattern**:
1. **Auto-Sourced by Graphify Scripts**: All graphify reindexing scripts (`graphify-local.sh`, `graphify-metadata-local.sh`, `graphify-forge-hammer-local.sh`) and npm commands (`npm run graph:reindex`, `npm run graph:metadata:reindex`, `npm run graph:forge-hammer:reindex`) automatically source `run-with-llama-swap.sh`.
2. **Probe**: Checks if `http://127.0.0.1:8080/v1/models` is already responding.
3. **On-Demand Spawn**: If inactive, spawns `llama-swap --config ~/.config/llama-swap/config.yaml` in the background and waits for HTTP readiness.
4. **Execute**: Runs the requested `graphify` extraction and labeling commands.
5. **Immediate AI Teardown**: As soon as tasks needing the local AI backend complete, `stop_llama_swap` unloads the model (`POST /api/models/unload`) and stops `llama-swap` before documentation/visual export steps proceed.
6. **Clean Exit Trap**: Guaranteed cleanup on script exit or unexpected errors via signal traps (`EXIT`, `INT`, `TERM`).
   - If spawned by this session, terminates `llama-swap` and releases all GPU memory.
   - If pre-existing, leaves the server running for the user.

---

## When to Use

### Automated Usage (Zero Manual Toggling)
You do **NOT** need to manually toggle `:auto` or wrap commands individually. Simply run standard npm scripts:
- `npm run graph:foe-info:reindex` (or `:deep`, `:force`)
- `npm run graph:metadata:reindex`
- `npm run graph:forge-hammer:reindex`

### Standalone / Custom Command Execution
If running an arbitrary one-off command requiring the local LLM backend:
- Wrap with `./.agents/scripts/run-with-llama-swap.sh <command>` or source in your bash script: `source .agents/scripts/run-with-llama-swap.sh`.

---

## Quick Reference

| Action | Command | Notes |
| :--- | :--- | :--- |
| **FoE-Info Reindex** | `npm run graph:foe-info:reindex` | Auto-manages llama-swap lifecycle |
| **FoE-Info Deep Reindex** | `npm run graph:foe-info:reindex:deep` | Aggressive INFERRED semantic extraction |
| **FoE-Info Force Reindex** | `npm run graph:foe-info:reindex:force` | Full re-scan bypassing cached hashes |
| **Metadata Reindex** | `npm run graph:metadata:reindex` | Auto-manages llama-swap lifecycle |
| **Forge-Hammer Reindex** | `npm run graph:forge-hammer:reindex` | Auto-manages llama-swap lifecycle |
| **Custom Graphify Command** | `./.agents/scripts/run-with-llama-swap.sh graphify label . --backend openai --model qwen2.5-vl-7b` | Standalone CLI wrapper |
| **Manual Model Eviction** | `curl -s -X POST http://127.0.0.1:8080/api/models/unload` | Immediate VRAM eviction |

---

## Companion Script: `llama-swap-lifecycle.sh`

The executable runner lives at [`.agents/scripts/llama-swap-lifecycle.sh`](../../scripts/llama-swap-lifecycle.sh) (with a backwards-compatibility shim at [`.agents/scripts/run-with-llama-swap.sh`](../../scripts/run-with-llama-swap.sh)).

### Key Invariants
- **Signal Safety**: Uses `trap cleanup_llama_swap EXIT`, `INT`, and `TERM` to guarantee cleanup on normal exit, error, or `Ctrl+C` cancellation.
- **Model Unload First**: Always calls `POST /api/models/unload` before sending signals. This cleanly triggers `llama-server` teardown and prevents stale CUDA context leaks.
- **Ownership Tracking**: Uses `STARTED_SERVER` flag to distinguish between ephemeral sessions (stop on exit) and persistent sessions (retain server on exit).
- **Early Eviction API**: Exposes `stop_llama_swap` for scripts that finish AI tasks before non-AI export steps.

---

## Common Mistakes & Troubleshooting

| Issue | Root Cause | Resolution |
| :--- | :--- | :--- |
| **Connection Refused** | `llama-swap` not running and not started through the lifecycle wrapper. | Wrap invocation with `./.agents/scripts/run-with-llama-swap.sh <command>`. |
| **GPU VRAM Stuck** | Process killed violently (`kill -9`) bypassing unload. | Run `curl -s -X POST http://127.0.0.1:8080/api/models/unload` or `pkill -f "llama-server.*qwen2.5-vl-7b"`. |
| **Timeout on Startup** | Port 8080 blocked or invalid config in `~/.config/llama-swap/config.yaml`. | Check `${HOME}/.cache/llama-swap-ephemeral.log` for config validation errors. |
