#!/usr/bin/env bash
# Backwards compatibility shim: delegates to llama-swap-lifecycle.sh
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if (return 0 2>/dev/null); then
  source "${SCRIPT_DIR}/llama-swap-lifecycle.sh"
else
  exec "${SCRIPT_DIR}/llama-swap-lifecycle.sh" "$@"
fi
