#!/usr/bin/env bash
set -e

source "$(dirname "${BASH_SOURCE[0]}")/graphify-local-env.sh"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ORIGINAL_DIR="${ORIGINAL_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/../FoE-Info-Extension-original}"

if [ ! -d "$ORIGINAL_DIR" ]; then
  echo "Error: FoE-Info-Extension-original directory not found at $ORIGINAL_DIR"
  exit 1
fi

cd "$ORIGINAL_DIR"

echo "==> Step 1: Fast AST Update on FoE-Info-Extension-original Knowledge Graph..."
bash "${SCRIPT_DIR}/run-graphify-local.sh" update .

echo "==> Step 2: Regenerating Wiki, Call-Flow, Obsidian Vault, SVG, HTML, and Tree..."
graphify export wiki
graphify export callflow-html
graphify export obsidian
graphify export svg
graphify export html
graphify tree

echo "==> Graphify update & doc export complete for FoE-Info-Extension-original!"