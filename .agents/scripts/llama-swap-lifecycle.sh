#!/usr/bin/env bash
set -e

# Configuration
CONFIG_PATH="${HOME}/.config/llama-swap/config-vision.yaml"
BASE_URL="http://127.0.0.1:8081"
LOG_PATH="${HOME}/.cache/llama-swap-ephemeral.log"
STARTED_SERVER=0
LLAMA_SWAP_PID=""

# Ensure log directory exists
mkdir -p "${HOME}/.cache"

cleanup_llama_swap() {
  local exit_code=$?
  if [ "${_LLAMA_SWAP_CLEANED:-0}" -eq 1 ]; then
    return 0
  fi
  _LLAMA_SWAP_CLEANED=1
  trap - EXIT INT TERM
  echo "==> [llama-swap] Cleaning up LLM resources..."

  # 1. Instruct llama-swap to unload all models from VRAM
  if curl -s -m 2 -X POST "${BASE_URL}/api/models/unload" >/dev/null 2>&1; then
    echo "==> [llama-swap] Successfully sent unload request to free VRAM."
  fi

  # 2. If we started the server, stop it cleanly
  if [ "${STARTED_SERVER:-0}" -eq 1 ] && [ -n "${LLAMA_SWAP_PID:-}" ]; then
    echo "==> [llama-swap] Stopping ephemeral llama-swap instance (PID ${LLAMA_SWAP_PID})..."
    kill -TERM "${LLAMA_SWAP_PID}" 2>/dev/null || true
    for _ in {1..10}; do
      if ! kill -0 "${LLAMA_SWAP_PID}" 2>/dev/null; then
        break
      fi
      sleep 0.2
    done
    if kill -0 "${LLAMA_SWAP_PID}" 2>/dev/null; then
      kill -9 "${LLAMA_SWAP_PID}" 2>/dev/null || true
    fi
    # Terminate any remaining orphan llama-server processes if needed
    pkill -f "llama-server.*qwen2.5-vl-7b" 2>/dev/null || true
    echo "==> [llama-swap] Server stopped and VRAM released."
  else
    echo "==> [llama-swap] Existing server retained, model unloaded."
  fi
}

stop_llama_swap() {
  cleanup_llama_swap
}

trap cleanup_llama_swap EXIT
trap "cleanup_llama_swap; exit 130" INT
trap "cleanup_llama_swap; exit 143" TERM

# 1. Probe if an OpenAI-compatible backend is already listening
if curl -s -m 2 "${BASE_URL}/v1/models" >/dev/null 2>&1; then
  echo "==> [llama-swap] Active OpenAI backend detected on ${BASE_URL}. Using existing instance."
  STARTED_SERVER=0
else
  echo "==> [llama-swap] Nothing serving on ${BASE_URL}. Starting ephemeral llama-swap..."
  STARTED_SERVER=1

  # Locate llama-swap binary
  LLAMA_SWAP_BIN=$(command -v llama-swap 2>/dev/null || echo "/home/linuxbrew/.linuxbrew/bin/llama-swap")
  if [ ! -x "${LLAMA_SWAP_BIN}" ]; then
    echo "ERROR: llama-swap binary not found. Ensure it is installed and on PATH." >&2
    exit 1
  fi

  if [ ! -f "${CONFIG_PATH}" ]; then
    echo "ERROR: Configuration file not found at ${CONFIG_PATH}." >&2
    exit 1
  fi

  # Launch llama-swap in background (explicit -listen; config `listen:` is not authoritative in this build)
  "${LLAMA_SWAP_BIN}" --config "${CONFIG_PATH}" --listen 127.0.0.1:8081 > "${LOG_PATH}" 2>&1 &
  LLAMA_SWAP_PID=$!

  # Wait for readiness
  READY=0
  for i in {1..30}; do
    if curl -s -m 1 "${BASE_URL}/v1/models" >/dev/null 2>&1; then
      READY=1
      echo "==> [llama-swap] Server is ready (took ~$((i * 200))ms, PID ${LLAMA_SWAP_PID})."
      break
    fi
    sleep 0.2
  done

  if [ "${READY}" -ne 1 ]; then
    echo "ERROR: Timed out waiting for llama-swap to start. Check log: ${LOG_PATH}" >&2
    exit 1
  fi
fi

# Shared local-only inference policy (also used by watch and MCP launchers).
source "$(dirname "${BASH_SOURCE[0]}")/graphify-local-env.sh"

# Detect if being sourced vs executed directly
if (return 0 2>/dev/null); then
  # Sourced by another script — environment and trap are active, return to caller
  return 0
fi

# 3. Direct execution: Execute target command or default Graphify extract
if [ $# -gt 0 ]; then
  echo "==> Executing: $*"
  "$@"
else
  echo "==> Executing default: graphify extract . --token-budget 8192 --max-concurrency 1"
  graphify extract . --token-budget 8192 --max-concurrency 1
fi
