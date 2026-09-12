#!/usr/bin/env bash
set -e

# Tier 2: AST refresh + visual doc exports (no LLM).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ORIGINAL_DIR="${ORIGINAL_DIR:-$(cd "${SCRIPT_DIR}/../.." && pwd)/../FoE-Info-Extension-original}"

if [ ! -d "$ORIGINAL_DIR" ]; then
  echo "Error: FoE-Info-Extension-original directory not found at $ORIGINAL_DIR"
  exit 1
fi

echo "==> Step 1: Fast AST Update on FoE-Info-Extension-original Knowledge Graph..."
bash "${SCRIPT_DIR}/graph-foe-info-original-ast.sh"

echo "==> Step 2: Regenerating Wiki, Call-Flow, Obsidian Vault, SVG, HTML, and Tree..."
cd "$ORIGINAL_DIR"
graphify export wiki
graphify export callflow-html
graphify export obsidian
graphify export svg
graphify export html
graphify tree

echo "==> Graphify update & doc export complete for FoE-Info-Extension-original!"
