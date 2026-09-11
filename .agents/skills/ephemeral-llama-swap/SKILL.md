---
name: ephemeral-llama-swap
description: "Manage local LLM lifecycle with automatic VRAM eviction."
---

# Ephemeral Llama-Swap Lifecycle Manager

Automated on-demand lifecycle manager for local LLM inference via `llama-swap`. Ensures zero GPU VRAM is wasted when idle.

## Overview

Running local LLMs consumes GPU VRAM according to the configured model and quantization. Leaving a model loaded in `llama-server` behind `llama-swap` can block other GPU workloads; inspect the local configuration rather than assuming a GPU model or memory footprint.

This skill provides an **automated sourcing & ephemeral lifecycle pattern**:
1. **Auto-Sourced by Graphify Scripts**: `.agents/scripts/graph-foe-info-reindex.sh`, `graph-metadata-reindex.sh`, and `graph-forge-hammer-reindex.sh` source `llama-swap-lifecycle.sh`. Their npm runners are `graph:foe-info:reindex`, `graph:metadata:reindex`, and `graph:forge-hammer:reindex`.
2. **Probe**: Checks if `http://127.0.0.1:8081/v1/models` (vision-instance `llama-swap`) is already responding.
3. **On-Demand Spawn**: If inactive, spawns `llama-swap --config ~/.config/llama-swap/config-vision.yaml` in the background and waits for HTTP readiness.
4. **Execute**: Runs the requested `graphify` extraction and labeling commands.
5. **Immediate AI Teardown**: As soon as tasks needing the local AI backend complete, `stop_llama_swap` unloads the model (`POST /api/models/unload`) and stops `llama-swap` before documentation/visual export steps proceed.
6. **Clean Exit Trap**: Guaranteed cleanup on script exit or unexpected errors via signal traps (`EXIT`, `INT`, `TERM`).
   - If spawned by this session, terminates `llama-swap` and releases all GPU memory.
   - If pre-existing, leaves the server running for the user.

---

## When to Use

### Automated Usage (Zero Manual Toggling)
You do **NOT** need to manually toggle `:auto` or wrap commands individually. Simply run standard npm scripts:
- `npm run graph:foe-info:reindex` (append `-- --mode deep` or `-- --force` when needed)
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
| **FoE-Info Deep Reindex** | `npm run graph:foe-info:reindex -- --mode deep` | Deep extraction mode |
| **FoE-Info Force Reindex** | `npm run graph:foe-info:reindex -- --force` | Full re-scan bypassing cached hashes |
| **Metadata Reindex** | `npm run graph:metadata:reindex` | Auto-manages llama-swap lifecycle |
| **Forge-Hammer Reindex** | `npm run graph:forge-hammer:reindex` | Auto-manages llama-swap lifecycle |
| **Custom Graphify Command** | `./.agents/scripts/run-with-llama-swap.sh graphify label . --backend openai --model qwen2.5-vl-7b` | Standalone CLI wrapper |
| **Manual Model Eviction** | `curl -s -X POST http://127.0.0.1:8081/api/models/unload` | Immediate VRAM eviction |

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
| **GPU VRAM Stuck** | Process killed violently (`kill -9`) bypassing unload. | Run `curl -s -X POST http://127.0.0.1:8081/api/models/unload` or `pkill -f "llama-server.*qwen2.5-vl-7b"`. |
| **Timeout on Startup** | Port 8081 blocked or invalid config in `~/.config/llama-swap/config-vision.yaml`. | Check `${HOME}/.cache/llama-swap-ephemeral.log` for config validation errors. |
