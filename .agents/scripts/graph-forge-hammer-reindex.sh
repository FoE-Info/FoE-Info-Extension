#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

FORGE_HAMMER_DIR="${FORGE_HAMMER_DIR:-${HOME}/Projects/Forge-Hammer/forge-hammer}"

if [ ! -d "$FORGE_HAMMER_DIR" ]; then
  echo "Error: Forge-Hammer directory not found at $FORGE_HAMMER_DIR"
  exit 1
fi

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

EXTRACT_ARGS=()
LABEL_ARGS=()

for arg in "$@"; do
  if [ "$arg" = "--force" ]; then
    EXTRACT_ARGS+=("--force")
    LABEL_ARGS+=("--force")
  else
    EXTRACT_ARGS+=("$arg")
  fi
done

cd "$FORGE_HAMMER_DIR"

echo "==> Step 1: Running Graphify Extraction on Forge-Hammer..."
graphify extract . \
  --token-budget 8192 \
  --max-concurrency 1 \
  "${EXTRACT_ARGS[@]}"

echo "==> Step 2: Labeling Graph Communities with Local LLM..."
graphify label . \
  --backend openai \
  --model qwen2.5-vl-7b \
  --max-concurrency 1 \
  "${LABEL_ARGS[@]}"

# Tasks needing local AI backend are complete: unload model and stop llama-swap now
stop_llama_swap

echo "==> Step 3: Exporting Visualizations and Docs..."
graphify export wiki
graphify export callflow-html
graphify export obsidian
graphify export svg
graphify export html
graphify tree

echo "==> Graphify pipeline complete for Forge-Hammer!"
