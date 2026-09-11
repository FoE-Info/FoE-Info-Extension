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

METADATA_STORE_DIR="${METADATA_STORE_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/../metadata-store}"

if [ ! -d "$METADATA_STORE_DIR" ]; then
  echo "Error: metadata-store directory not found at $METADATA_STORE_DIR"
  exit 1
fi

echo "==> Step 1: Building Metadata Knowledge Graph from raw entities..."
cd "${WORKSPACE_ROOT}"
export GRAPHIFY_OUT="${METADATA_STORE_DIR}/graphify-out"
node scripts/build-metadata-graph.mjs

echo "==> Step 2: Clustering and Labeling Metadata Graph with Local LLM..."
cd "$METADATA_STORE_DIR"
graphify cluster-only .
graphify label . \
  --backend openai \
  --model qwen2.5-vl-7b \
  --max-concurrency 1 \
  "${LABEL_ARGS[@]}"

# Tasks needing local AI backend are complete: unload model and stop llama-swap now
stop_llama_swap

echo "==> Step 3: Exporting Visualizations and Docs..."
graphify export wiki
graphify export obsidian
graphify export svg
graphify tree

echo "==> Metadata graph pipeline complete!"
