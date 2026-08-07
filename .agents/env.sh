#!/usr/bin/env bash
# Environment loader for Antigravity non-interactive subshells
export PATH="$HOME/.local/share/mise/shims:/var/home/linuxbrew/.linuxbrew/bin:$HOME/.local/bin:$PATH"

export NODE_ENV="development"

if [ -f "$PWD/.env" ]; then
  set -a
  source "$PWD/.env" 2>/dev/null
  set +a
fi

