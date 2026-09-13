#!/usr/bin/env bash
#
# Llama-Swap Lifecycle Wrapper
#
# Sources the llama-swap environment for LLM backend setup.
# Used by all graphify update/reindex scripts.
#
# Usage: source llama-swap-lifecycle.sh
#
# Exports:
#   OPENAI_BASE_URL — local OpenAI-compatible proxy endpoint
#   OPENAI_API_KEY  — API key for the proxy
#   OPENAI_MODEL    — model name to use
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAMA_SWAP_ENV="${SCRIPT_DIR}/llama-swap-env.sh"

if [ -f "$LAMA_SWAP_ENV" ]; then
  source "$LAMA_SWAP_ENV"
  export OPENAI_BASE_URL OPENAI_API_KEY OPENAI_MODEL
else
  echo "WARNING: llama-swap-env.sh not found at $LAMA_SWAP_ENV" >&2
  echo "Falling back to embedded defaults. Set OPENAI_BASE_URL, OPENAI_API_KEY," >&2
  echo "and OPENAI_MODEL in your environment if you need different values." >&2
  # Fallback defaults — keep in sync with llama-swap-env.sh
  export OPENAI_BASE_URL="${OPENAI_BASE_URL:-http://127.0.0.1:8081/v1}"
  export OPENAI_API_KEY="${OPENAI_API_KEY:-local}"
  export OPENAI_MODEL="${OPENAI_MODEL:-qwen2.5-vl-7b}"
  export GRAPHIFY_BACKEND="${GRAPHIFY_BACKEND:-openai}"
  export GRAPHIFY_OPENAI_MODEL="${GRAPHIFY_OPENAI_MODEL:-${OPENAI_MODEL}}"
fi
