#!/usr/bin/env bash
set -eu
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/graphify-local-env.sh"

if [ "${1:-}" = '--mcp' ]; then
  shift
  GRAPHIFY_LOG="${GRAPHIFY_LOG:-${HOME}/.cache/foe-info/graphify-mcp.log}"
  mkdir -p "$(dirname "$GRAPHIFY_LOG")"
  # stdout belongs exclusively to the MCP transport; never redirect it.
  exec graphify-mcp "$@" 2>>"$GRAPHIFY_LOG"
fi

GRAPHIFY_LOG="${GRAPHIFY_LOG:-${HOME}/.cache/foe-info/graphify-watch.log}"
mkdir -p "$(dirname "$GRAPHIFY_LOG")"
# Reject cloud backend overrides, including ones forwarded by reindex callers.
for arg in "$@"; do
  case "$arg" in
    --backend*) echo 'Use the fixed local backend; backend overrides are disabled.' >&2; exit 2 ;;
  esac
done
case "${1:-}" in
  extract|label)
    if ! curl --fail --silent --max-time 2 "$OPENAI_BASE_URL/models" >/dev/null 2>&1; then
      echo "Local Graphify inference unavailable; extraction/labeling skipped." >>"$GRAPHIFY_LOG"
      exit 0
    fi
    set -- "$@" --backend openai --model "$OPENAI_MODEL"
    ;;
esac
if graphify "$@" >>"$GRAPHIFY_LOG" 2>&1; then
  exit 0
else
  status=$?
  echo "Graphify failed (exit $status); log: $GRAPHIFY_LOG" >&2
  tail -n 12 "$GRAPHIFY_LOG" >&2
  exit "$status"
fi
