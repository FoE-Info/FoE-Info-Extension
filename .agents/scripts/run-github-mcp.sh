#!/usr/bin/env bash
# Launches the official GitHub MCP server over stdio.
#
# Prefers the native binary (Homebrew: `brew install github-mcp-server`) and
# falls back to the official Docker image when the binary is absent.
#
# The personal access token is NEVER stored in a tracked file. It is read, in
# order, from:
#   1. the GITHUB_PERSONAL_ACCESS_TOKEN environment variable
#   2. a local, git-ignored .env / .env.local at the repo root
#   3. ~/.config/foe-info/github-token
#
# Override the Docker image with GITHUB_MCP_IMAGE.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

if [[ -z "${GITHUB_PERSONAL_ACCESS_TOKEN:-}" ]]; then
  for candidate in \
    "${REPO_ROOT}/.env.local" \
    "${REPO_ROOT}/.env" \
    "${HOME}/.config/foe-info/github-token"; do
    if [[ -f "${candidate}" ]]; then
      # shellcheck disable=SC1090
      set -a
      source "${candidate}"
      set +a
      [[ -n "${GITHUB_PERSONAL_ACCESS_TOKEN:-}" ]] && break
    fi
  done
fi

if [[ -z "${GITHUB_PERSONAL_ACCESS_TOKEN:-}" ]]; then
  echo "github-mcp: GITHUB_PERSONAL_ACCESS_TOKEN is not set." >&2
  echo "Set it in the environment or in .env.local (git-ignored)." >&2
  exit 1
fi

if command -v github-mcp-server >/dev/null 2>&1; then
  exec github-mcp-server stdio
fi

GITHUB_MCP_IMAGE="${GITHUB_MCP_IMAGE:-ghcr.io/github/github-mcp-server}"

exec docker run -i --rm \
  -e GITHUB_PERSONAL_ACCESS_TOKEN \
  "${GITHUB_MCP_IMAGE}"
