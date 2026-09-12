#!/usr/bin/env bash
set -e

# Tier 2: AST refresh + visual doc exports (no LLM).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOW_TOOL_DIR="${LOW_TOOL_DIR:-$(cd "${SCRIPT_DIR}/../.." && pwd)/../LoW-Tool}"

if [ ! -d "$LOW_TOOL_DIR" ]; then
  echo "Error: LoW-Tool directory not found at $LOW_TOOL_DIR"
  exit 1
fi

echo "==> Step 1: Fast AST Update on LoW-Tool Knowledge Graph..."
bash "${SCRIPT_DIR}/graph-low-tool-ast.sh"

echo "==> Step 2: Regenerating Wiki, Call-Flow, Obsidian Vault, SVG, HTML, and Tree..."
cd "$LOW_TOOL_DIR"
graphify export wiki
graphify export callflow-html
graphify export obsidian
graphify export svg
graphify export html
graphify tree

echo "==> Graphify update & doc export complete for LoW-Tool!"
