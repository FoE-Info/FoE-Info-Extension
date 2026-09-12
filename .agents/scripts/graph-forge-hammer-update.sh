#!/usr/bin/env bash
set -e

# Tier 2: AST refresh + visual doc exports (no LLM).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FORGE_HAMMER_DIR="${FORGE_HAMMER_DIR:-$(cd "${SCRIPT_DIR}/../.." && pwd)/../forge-hammer}"

if [ ! -d "$FORGE_HAMMER_DIR" ]; then
  echo "Error: Forge-Hammer directory not found at $FORGE_HAMMER_DIR"
  exit 1
fi

echo "==> Step 1: Fast AST Update on Forge-Hammer Knowledge Graph..."
bash "${SCRIPT_DIR}/graph-forge-hammer-ast.sh"

echo "==> Step 2: Regenerating Wiki, Call-Flow, Obsidian Vault, SVG, HTML, and Tree..."
cd "$FORGE_HAMMER_DIR"
graphify export wiki
graphify export callflow-html
graphify export obsidian
graphify export svg
graphify export html
graphify tree

echo "==> Graphify update & doc export complete for Forge-Hammer!"
