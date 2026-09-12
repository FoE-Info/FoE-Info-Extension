#!/usr/bin/env bash
set -e

# Tier 2: AST refresh + visual doc exports (no LLM).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${WORKSPACE_ROOT}"

echo "==> Step 1: Fast AST Update on Knowledge Graph..."
bash "${SCRIPT_DIR}/graph-foe-info-ast.sh"

echo "==> Step 2: Regenerating Wiki, Call-Flow, Obsidian Vault, SVG, and HTML Exports..."
npm run graph:foe-info:export

echo "==> Graphify update & doc export complete for FoE-Info-Extension!"
