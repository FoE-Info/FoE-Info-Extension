#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

METADATA_STORE_DIR="${METADATA_STORE_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/../metadata-store}"

if [ ! -d "$METADATA_STORE_DIR" ]; then
  echo "Error: metadata-store directory not found at $METADATA_STORE_DIR"
  exit 1
fi

cd "${WORKSPACE_ROOT}"
export GRAPHIFY_OUT="${METADATA_STORE_DIR}/graphify-out"

echo "==> Step 1: Rebuilding Metadata Knowledge Graph from entities..."
node scripts/build-metadata-graph.mjs

cd "$METADATA_STORE_DIR"
echo "==> Step 2: Regenerating Wiki, Obsidian Vault, SVG, HTML, and Tree..."
graphify cluster-only .
graphify export wiki
graphify export obsidian
graphify export svg
graphify tree

echo "==> Graphify update & doc export complete for metadata-store!"
