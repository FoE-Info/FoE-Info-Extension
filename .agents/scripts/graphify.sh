#!/usr/bin/env bash
set -e

#
# FoE-Info Unified Knowledge Graph Automation
#
# Supports all 5 repositories across ast, update, reindex, export, watch, and mcp.
# Usage: bash .agents/scripts/graphify.sh [target] [action] [options...]
#
# Targets: foe-info (default), foe-info-original, forge-hammer, low-tool, metadata
# Actions: ast (default), update, reindex, export, watch, mcp
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Source local inference policy if available
if [ -f "${SCRIPT_DIR}/llama-swap-env.sh" ]; then
  source "${SCRIPT_DIR}/llama-swap-env.sh"
fi

TARGET="${1:-foe-info}"
ACTION="${2:-ast}"
shift 2 2>/dev/null || true

case "$TARGET" in
  foe-info)
    TARGET_DIR="${WORKSPACE_ROOT}"
    export GRAPHIFY_OUT="${WORKSPACE_ROOT}/graphify-out/foe-info"
    ;;
  foe-info-original)
    TARGET_DIR="${ORIGINAL_DIR:-${WORKSPACE_ROOT}/../FoE-Info-Extension-original}"
    export GRAPHIFY_OUT="${TARGET_DIR}/graphify-out"
    ;;
  forge-hammer)
    TARGET_DIR="${FORGE_HAMMER_DIR:-${WORKSPACE_ROOT}/../forge-hammer}"
    export GRAPHIFY_OUT="${TARGET_DIR}/graphify-out"
    ;;
  low-tool)
    TARGET_DIR="${LOW_TOOL_DIR:-${WORKSPACE_ROOT}/../LoW-Tool}"
    export GRAPHIFY_OUT="${TARGET_DIR}/graphify-out"
    ;;
  metadata)
    TARGET_DIR="${METADATA_DIR:-${WORKSPACE_ROOT}/../metadata-store}"
    export GRAPHIFY_OUT="${TARGET_DIR}/graphify-out"
    ;;
  *)
    echo "Unknown target: $TARGET" >&2
    echo "Supported targets: foe-info, foe-info-original, forge-hammer, low-tool, metadata" >&2
    exit 1
    ;;
esac

if [ ! -d "$TARGET_DIR" ]; then
  echo "Target directory not found: $TARGET_DIR" >&2
  exit 1
fi

cd "$TARGET_DIR"

RUNNER="graphify"
if ! command -v graphify >/dev/null 2>&1; then
  RUNNER="uv run graphify"
fi

case "$ACTION" in
  ast)
    echo "==> AST update for $TARGET..."
    $RUNNER update . "$@"
    ;;
  update)
    echo "==> Incremental update for $TARGET..."
    $RUNNER update . "$@"
    $RUNNER export wiki obsidian svg html tree 2>/dev/null || true
    ;;
  reindex)
    echo "==> Full reindex for $TARGET..."
    $RUNNER extract . --token-budget 8192 "$@"
    $RUNNER label --max-concurrency 1 "$@"
    $RUNNER export wiki obsidian svg html tree 2>/dev/null || true
    ;;
  export)
    echo "==> Exporting graph documentation for $TARGET..."
    $RUNNER export wiki obsidian svg html tree "$@"
    ;;
  watch)
    echo "==> Watching $TARGET for changes..."
    $RUNNER watch . "$@"
    ;;
  mcp)
    exec graphify-mcp "${GRAPHIFY_OUT}/graph.json" "$@"
    ;;
  *)
    echo "Unknown action: $ACTION" >&2
    echo "Supported actions: ast, update, reindex, export, watch, mcp" >&2
    exit 1
    ;;
esac
