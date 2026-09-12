#!/usr/bin/env bash
set -e

# Tier 1 primitive: fast AST-only refresh for the FoE-Info graph (no LLM, no exports).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${WORKSPACE_ROOT}"
export GRAPHIFY_OUT="${WORKSPACE_ROOT}/graphify-out/foe-info"

echo "==> Fast AST Update on FoE-Info Knowledge Graph..."
bash "${SCRIPT_DIR}/run-graphify-local.sh" update .
