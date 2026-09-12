#!/usr/bin/env bash
set -e

# Tier 1 primitive: fast AST-only refresh for the v1 baseline graph (no LLM, no exports).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ORIGINAL_DIR="${ORIGINAL_DIR:-$(cd "${SCRIPT_DIR}/../.." && pwd)/../FoE-Info-Extension-original}"

if [ ! -d "$ORIGINAL_DIR" ]; then
  echo "Error: FoE-Info-Extension-original directory not found at $ORIGINAL_DIR"
  exit 1
fi

cd "$ORIGINAL_DIR"

echo "==> Fast AST Update on FoE-Info-Extension-original Knowledge Graph..."
bash "${SCRIPT_DIR}/run-graphify-local.sh" update .
