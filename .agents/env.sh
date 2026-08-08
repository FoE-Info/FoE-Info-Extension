#!/usr/bin/env bash
# Environment loader for Antigravity non-interactive subshells
AGENTS_PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="$HOME/.local/share/mise/shims:/home/linuxbrew/.linuxbrew/bin:$HOME/.local/bin:$PATH"

export NODE_ENV="development"

set -a
for AGENTS_ENV_FILE in "$AGENTS_PROJECT_ROOT/.env" "$AGENTS_PROJECT_ROOT/.env.local"; do
  if [ -f "$AGENTS_ENV_FILE" ]; then
    chmod 600 "$AGENTS_ENV_FILE" 2>/dev/null || true
    source "$AGENTS_ENV_FILE" 2>/dev/null
  fi
done
set +a

unset AGENTS_ENV_FILE AGENTS_PROJECT_ROOT
