#!/usr/bin/env bash
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/inference-env.sh"

find_ramalama() {
  if command -v ramalama >/dev/null 2>&1; then
    command -v ramalama
  elif [ -x "$HOME/.local/bin/ramalama" ]; then
    printf '%s\n' "$HOME/.local/bin/ramalama"
  else
    return 1
  fi
}

RAMALAMA_BIN="$(find_ramalama || true)"
ENDPOINT="http://127.0.0.1:${RAMALAMA_PORT}/v1/models"

require_ramalama() {
  if [ -z "$RAMALAMA_BIN" ]; then
    echo "RamaLama is not installed or not on PATH." >&2
    exit 1
  fi
}

endpoint_healthy() {
  curl -s -f "$ENDPOINT" >/dev/null 2>&1
}

start_model() {
  require_ramalama
  if endpoint_healthy; then
    echo "==> Model endpoint already active on port ${RAMALAMA_PORT}"
    return 0
  fi

  echo "==> Starting Qwen2.5-VL-7B-Instruct directly through RamaLama with llama-swap optimizations..."
  "$RAMALAMA_BIN" stop --ignore "$RAMALAMA_CONTAINER_NAME" >/dev/null 2>&1 || true
  
  "$RAMALAMA_BIN" serve -d \
    --name "$RAMALAMA_CONTAINER_NAME" \
    --port "$RAMALAMA_PORT" \
    --ctx-size "${RAMALAMA_CTX_SIZE:-16384}" \
    --ngl 99 \
    --temp 0 \
    --engine-args "--mount type=bind,source=${HOME}/.cache/llama.cpp,target=${HOME}/.cache/llama.cpp" \
    --runtime-args "--mmproj ${HOME}/.cache/llama.cpp/mmproj-F16.gguf --parallel 1 --flash-attn on --image-min-tokens 1024 --reasoning-format none" \
    "hf://unsloth/Qwen2.5-VL-7B-Instruct-GGUF/Qwen2.5-VL-7B-Instruct-Q8_0.gguf" || return 1

  local elapsed=0
  while [ "$elapsed" -lt "$RAMALAMA_START_TIMEOUT" ]; do
    if endpoint_healthy; then
      echo "==> Model is ready on port ${RAMALAMA_PORT}"
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done

  echo "==> Model failed to become ready within ${RAMALAMA_START_TIMEOUT}s." >&2
  "$RAMALAMA_BIN" stop --ignore "$RAMALAMA_CONTAINER_NAME" >/dev/null 2>&1 || true
  return 1
}

stop_model() {
  require_ramalama
  "$RAMALAMA_BIN" stop --ignore "$RAMALAMA_CONTAINER_NAME"
  echo "==> Stopped model container ${RAMALAMA_CONTAINER_NAME} (VRAM released)"
}

status_model() {
  require_ramalama
  local containers
  containers="$($RAMALAMA_BIN containers 2>/dev/null || true)"
  if printf '%s\n' "$containers" | grep -Fq "$RAMALAMA_CONTAINER_NAME"; then
    echo "==> Container ${RAMALAMA_CONTAINER_NAME}: running"
  else
    echo "==> Container ${RAMALAMA_CONTAINER_NAME}: stopped"
  fi
  if endpoint_healthy; then
    echo "==> Endpoint: responsive at ${ENDPOINT}"
  else
    echo "==> Endpoint: unresponsive at ${ENDPOINT}"
  fi
}

run_with_model() {
  if [ "$#" -eq 0 ]; then
    echo "Usage: $0 run <command> [args...]" >&2
    return 2
  fi

  WAS_ACTIVE=0
  if endpoint_healthy; then
    WAS_ACTIVE=1
    echo "==> Model endpoint already active; leaving container running"
  fi

  cleanup() {
    local exit_code=${1:-$?}
    trap - EXIT INT TERM HUP
    if [ "$WAS_ACTIVE" -eq 0 ] && [ -n "$RAMALAMA_BIN" ]; then
      echo "==> On-demand cleanup: stopping ${RAMALAMA_CONTAINER_NAME}..."
      "$RAMALAMA_BIN" stop --ignore "$RAMALAMA_CONTAINER_NAME" >/dev/null 2>&1 || true
    fi
    exit "$exit_code"
  }
  trap cleanup EXIT
  trap 'cleanup 130' INT
  trap 'cleanup 143' TERM
  trap 'cleanup 129' HUP
  if [ "$WAS_ACTIVE" -eq 0 ]; then
    start_model || return 1
  fi
  "$@"
}

case "${1:-}" in
  start) start_model ;;
  stop) stop_model ;;
  status) status_model ;;
  run) shift; run_with_model "$@" ;;
  *) echo "Usage: $0 {start|stop|status|run <command> [args...]}" >&2; exit 2 ;;
esac
