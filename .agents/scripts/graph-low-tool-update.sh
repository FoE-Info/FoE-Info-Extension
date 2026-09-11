#!/usr/bin/env bash
set -e

source "$(dirname "${BASH_SOURCE[0]}")/graphify-local-env.sh"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

LOW_TOOL_DIR="${LOW_TOOL_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/../LoW-Tool}"

if [ ! -d "$LOW_TOOL_DIR" ]; then
  echo "Error: LoW-Tool directory not found at $LOW_TOOL_DIR"
  exit 1
fi

cd "$LOW_TOOL_DIR"

echo "==> Step 1: Fast AST Update on LoW-Tool Knowledge Graph..."
bash "${SCRIPT_DIR}/run-graphify-local.sh" update .

echo "==> Step 2: Regenerating Wiki, Call-Flow, Obsidian Vault, SVG, HTML, and Tree..."
graphify export wiki
graphify export callflow-html
graphify export obsidian
graphify export svg
graphify export html
graphify tree

echo "==> Graphify update & doc export complete for LoW-Tool!"