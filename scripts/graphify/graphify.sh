#!/usr/bin/env bash
set -e

# Select a repository and its local Graphify installation.
# Native commands preserve upstream arguments, defaults, and caller environment.
# Repository conveniences: ast, reindex, export-all, metadata-build, serve-mcp.

SCRIPT_DIR="$(builtin cd "$(dirname "$(realpath "${BASH_SOURCE[0]}")")" && pwd)"
WORKSPACE_ROOT="$(builtin cd "${SCRIPT_DIR}/../.." && pwd)"
PARENT_WORKSPACE="$(builtin cd "${WORKSPACE_ROOT}/.." && pwd)"
PROJECTS_ROOT="$(builtin cd "${PARENT_WORKSPACE}/.." && pwd)"
if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  cat <<'USAGE'
Usage: bash scripts/graphify/graphify.sh [target] [action] [options...]
Targets: foe-info, foe-info-original, forge-hammer, metadata-store
Conveniences: ast (default), reindex, export-all, metadata-build, serve-mcp
All native commands pass through to Graphify unchanged. cli is an optional alias.
Native CLI help: bash scripts/graphify/graphify.sh foe-info --help
USAGE
  exit 0
fi

TARGET="${1:-foe-info}"
ACTION="${2:-ast}"
if [ "$#" -ge 2 ]; then
  shift 2
elif [ "$#" -eq 1 ]; then
  shift
fi

EXPORT_FORMATS=(wiki obsidian svg html)

# `graphify export` takes ONE format per invocation (html, callflow-html,
# obsidian, wiki, svg, graphml, neo4j, falkordb); anything after the first is
# parsed as that format's flags. `tree` is a top-level command, not an export
# format. Emitting four formats in one call silently produced only the first.
emit_exports() {
  local fmt
  local failed=()
  for fmt in "${EXPORT_FORMATS[@]}"; do
    if "${RUNNER[@]}" export "$fmt" "$@"; then
      echo "==> exported $fmt"
    else
      failed+=("$fmt")
    fi
  done
  if "${RUNNER[@]}" tree "$@"; then
    echo "==> exported tree"
  else
    failed+=("tree")
  fi
  if [ ${#failed[@]} -gt 0 ]; then
    echo "==> export failed for: ${failed[*]}" >&2
    return 1
  fi
}

case "$TARGET" in
  foe-info)
    TARGET_DIR="${WORKSPACE_ROOT}"
    export GRAPHIFY_OUT="${WORKSPACE_ROOT}/graphify-out"
    ;;
  foe-info-original)
    TARGET_DIR="${ORIGINAL_DIR:-${PARENT_WORKSPACE}/FoE-Info-Extension-original}"
    export GRAPHIFY_OUT="${TARGET_DIR}/graphify-out"
    ;;
  forge-hammer)
    TARGET_DIR="${FORGE_HAMMER_DIR:-${PARENT_WORKSPACE}/forge-hammer}"
    export GRAPHIFY_OUT="${TARGET_DIR}/graphify-out"
    ;;
  metadata-store)
    TARGET_DIR="${METADATA_DIR:-${PARENT_WORKSPACE}/metadata-store}"
    export GRAPHIFY_OUT="${TARGET_DIR}/graphify-out"
    export METADATA_STORE_DIR="${TARGET_DIR}"
    ;;
  *)
    echo "Unknown target: $TARGET" >&2
    echo "Supported targets: foe-info, foe-info-original, forge-hammer, metadata-store" >&2
    exit 1
    ;;
esac

if [ ! -d "$TARGET_DIR" ]; then
  echo "Target directory not found: $TARGET_DIR" >&2
  exit 1
fi

builtin cd "$TARGET_DIR"

# The runner is repository-local by contract: a clone must reproduce the same
# graphify after `mise run setup-full`, without depending on whatever happens to
# be on PATH. A globally installed `graphify` (uv tool) can differ in version and
# extras, which is exactly how a stale or partially-featured CLI shows up as a
# mysterious export failure. Use the project venv, fall back to `uv run` inside
# it, and fail loudly when neither exists.
if [ -x "${WORKSPACE_ROOT}/.venv/bin/graphify" ]; then
  RUNNER=("${WORKSPACE_ROOT}/.venv/bin/graphify")
elif command -v uv >/dev/null 2>&1; then
  RUNNER=(uv run --project "${WORKSPACE_ROOT}" graphify)
else
  echo "graphify is not installed for this repository." >&2
  echo "Run: mise run setup-full   (or: uv sync) to create .venv with graphifyy." >&2
  exit 1
fi

case "$ACTION" in
  ast)
    exec "${RUNNER[@]}" update . "$@"
    ;;
  reindex)
    exec "${RUNNER[@]}" extract . "$@"
    ;;
  export-all)
    if [ "$#" -ne 0 ]; then
      echo "export-all accepts no flags; use export <format> [options...] instead." >&2
      exit 2
    fi
    emit_exports
    ;;
  metadata-build)
    if [ "$TARGET" != "metadata-store" ]; then
      echo "metadata-build requires the metadata-store target." >&2
      exit 2
    fi
    if [ "$#" -ne 0 ]; then
      echo "metadata-build accepts no flags." >&2
      exit 2
    fi
    exec node "${SCRIPT_DIR}/build-metadata-graph.mjs"
    ;;
  serve-mcp)
    exec uv run --project "${WORKSPACE_ROOT}" graphify-mcp "${GRAPHIFY_OUT}/graph.json" "$@"
    ;;
  cli)
    exec "${RUNNER[@]}" "$@"
    ;;
  *)
    exec "${RUNNER[@]}" "$ACTION" "$@"
    ;;
esac
