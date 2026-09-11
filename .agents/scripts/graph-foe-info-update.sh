#!/usr/bin/env bash
set -e

source "$(dirname "${BASH_SOURCE[0]}")/graphify-local-env.sh"

# Change directory to the workspace root so all operations stay strictly scoped to FoE-Info-Extension
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${WORKSPACE_ROOT}"
export GRAPHIFY_OUT="${WORKSPACE_ROOT}/graphify-out/foe-info"

echo "==> Step 1: Fast AST Update on Knowledge Graph..."
bash "${SCRIPT_DIR}/run-graphify-local.sh" update .

echo "==> Step 2: Regenerating Wiki, Call-Flow, Obsidian Vault, SVG, and HTML Exports..."
npm run graph:foe-info:export

echo "==> Graphify update & doc export complete for FoE-Info-Extension!"
