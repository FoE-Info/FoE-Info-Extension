#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${WORKSPACE_ROOT}"

# Pre-flight: Ensure graphify is installed with full extras (mcp, openai, watch, svg)
GRAPHIFY_PYTHON="${HOME}/.local/share/uv/tools/graphifyy/bin/python3"
if [ -x "$GRAPHIFY_PYTHON" ]; then
  if ! "$GRAPHIFY_PYTHON" -c "import openai, mcp, watchdog, matplotlib" >/dev/null 2>&1; then
    echo "==> Restoring missing graphifyy extras [mcp, openai, watch, svg]..."
    uv tool install "graphifyy[mcp,openai,watch,svg]" --force
  fi
elif ! command -v graphify >/dev/null 2>&1; then
  echo "==> Installing graphifyy with full extras [mcp, openai, watch, svg]..."
  uv tool install "graphifyy[mcp,openai,watch,svg]" --force
fi

# Ensure local AI backend (llama-swap) is running and will clean up on exit
source "${SCRIPT_DIR}/llama-swap-lifecycle.sh"

LABEL_ARGS=()
for arg in "$@"; do
  if [ "$arg" = "--force" ]; then
    LABEL_ARGS+=("--force")
  fi
done

echo "==> Step 1: Building Metadata Knowledge Graph from raw entities..."
node scripts/build-metadata-graph.mjs

echo "==> Step 2: Clustering and Labeling Metadata Graph with Local LLM..."
export GRAPHIFY_OUT="${WORKSPACE_ROOT}/graphify-out/metadata"
graphify cluster-only .
graphify label . \
  --backend openai \
  --model qwen2.5-vl-7b \
  --max-concurrency 1 \
  "${LABEL_ARGS[@]}"

# Tasks needing local AI backend are complete: unload model and stop llama-swap now
stop_llama_swap

echo "==> Metadata graph pipeline complete!"
