#!/usr/bin/env bash
set -e

# Change directory to the workspace root so all operations (extract, label, export)
# stay strictly scoped to FoE-Info-Extension and use graphify-out/
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${WORKSPACE_ROOT}"
export GRAPHIFY_OUT="${WORKSPACE_ROOT}/graphify-out/foe-info"

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

# 1. Extract extension code AST + semantic entities
echo "==> Step 1: Running Graphify Extraction on FoE-Info-Extension..."
graphify extract . \
  --token-budget 8192 \
  --max-concurrency 1 \
  "${EXTRACT_ARGS[@]}"

# 2. Label extension graph communities using local LLM
echo "==> Step 2: Labeling Graph Communities..."
graphify label . \
  --backend openai \
  --model qwen2.5-vl-7b \
  --max-concurrency 1 \
  "${LABEL_ARGS[@]}"

# Tasks needing local AI backend are complete: unload model and stop llama-swap now
stop_llama_swap

# 3. Generate export artifacts inside graphify-out/ (no LLM required)
echo "==> Step 3: Exporting Visualizations and Docs..."
npm run graph:foe-info:export

echo "==> Graphify pipeline complete for FoE-Info-Extension!"
