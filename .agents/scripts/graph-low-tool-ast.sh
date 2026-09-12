#!/usr/bin/env bash
set -e

# Tier 1 primitive: fast AST-only refresh for the LoW-Tool graph (no LLM, no exports).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOW_TOOL_DIR="${LOW_TOOL_DIR:-$(cd "${SCRIPT_DIR}/../.." && pwd)/../LoW-Tool}"

if [ ! -d "$LOW_TOOL_DIR" ]; then
  echo "Error: LoW-Tool directory not found at $LOW_TOOL_DIR"
  exit 1
fi

cd "$LOW_TOOL_DIR"

echo "==> Fast AST Update on LoW-Tool Knowledge Graph..."
bash "${SCRIPT_DIR}/run-graphify-local.sh" update .
