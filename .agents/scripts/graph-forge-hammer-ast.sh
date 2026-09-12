#!/usr/bin/env bash
set -e

# Tier 1 primitive: fast AST-only refresh for the Forge-Hammer graph (no LLM, no exports).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FORGE_HAMMER_DIR="${FORGE_HAMMER_DIR:-$(cd "${SCRIPT_DIR}/../.." && pwd)/../forge-hammer}"

if [ ! -d "$FORGE_HAMMER_DIR" ]; then
  echo "Error: Forge-Hammer directory not found at $FORGE_HAMMER_DIR"
  exit 1
fi

cd "$FORGE_HAMMER_DIR"

echo "==> Fast AST Update on Forge-Hammer Knowledge Graph..."
bash "${SCRIPT_DIR}/run-graphify-local.sh" update .
