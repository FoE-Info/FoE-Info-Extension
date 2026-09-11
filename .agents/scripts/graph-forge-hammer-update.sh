#!/usr/bin/env bash
set -e

source "$(dirname "${BASH_SOURCE[0]}")/graphify-local-env.sh"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

FORGE_HAMMER_DIR="${FORGE_HAMMER_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/forge-hammer}"

if [ ! -d "$FORGE_HAMMER_DIR" ]; then
  echo "Error: Forge-Hammer directory not found at $FORGE_HAMMER_DIR"
  exit 1
fi

cd "$FORGE_HAMMER_DIR"

echo "==> Step 1: Fast AST Update on Forge-Hammer Knowledge Graph..."
bash "${SCRIPT_DIR}/run-graphify-local.sh" update .

echo "==> Step 2: Regenerating Wiki, Call-Flow, Obsidian Vault, SVG, HTML, and Tree..."
graphify export wiki
graphify export callflow-html
graphify export obsidian
graphify export svg
graphify export html
graphify tree

echo "==> Graphify update & doc export complete for Forge-Hammer!"
