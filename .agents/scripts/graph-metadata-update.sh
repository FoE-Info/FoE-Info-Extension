#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${WORKSPACE_ROOT}"
export GRAPHIFY_OUT="${WORKSPACE_ROOT}/graphify-out/metadata"

echo "==> Rebuilding Metadata Knowledge Graph from entities..."
node scripts/build-metadata-graph.mjs

echo "==> Metadata graph update complete!"
