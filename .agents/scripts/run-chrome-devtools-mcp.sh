#!/usr/bin/env bash
# Wrapper script for chrome-devtools-mcp with complete feature flags
# Integrates with foe-browser (port 9222) and provides resilient standalone fallback.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
EXTENSION_DEV="${WORKSPACE_ROOT}/build/FoE-Info-DEV"
FORGE_HAMMER="${FORGE_HAMMER:-${WORKSPACE_ROOT}/../forge-hammer}"


# Common diagnostic & capability flags matching full chrome-devtools-plugin parity
COMMON_FLAGS=(
  "--experimentalMemory"
  "--experimentalVision"
  "--categoryExperimentalWebmcp"
  "--experimentalDevtools"
  "--experimentalIncludeAllPages"
  "--experimentalPageIdRouting"
  "--allowUnrestrictedPaths"
  "--no-usage-statistics"
)

# Detect if chrome-devtools-mcp binary is in PATH, otherwise fall back to Homebrew or npx
MCP_BIN=""
if command -v chrome-devtools-mcp >/dev/null 2>&1; then
  MCP_BIN="$(command -v chrome-devtools-mcp)"
elif [ -x "/home/linuxbrew/.linuxbrew/bin/chrome-devtools-mcp" ]; then
  MCP_BIN="/home/linuxbrew/.linuxbrew/bin/chrome-devtools-mcp"
else
  MCP_BIN="npx -y chrome-devtools-mcp@latest"
fi

# Function to check if CDP port 9222 is alive
is_cdp_alive() {
  curl -s -m 1 http://127.0.0.1:9222/json/version >/dev/null 2>&1
}

# Strict Invariant: NEVER auto-spawn browser or steal control without explicit user command.
# If port 9222 is not already active, do not launch foe-browser or fallback Chromium.
if ! is_cdp_alive; then
  echo "[chrome-devtools-mcp] CDP port 9222 is not active. MCP will not auto-launch browser without explicit user command." >&2
  exit 0
fi

# Only connect when an existing browser instance was explicitly launched on port 9222
exec ${MCP_BIN} \
  --browserUrl="http://127.0.0.1:9222" \
  "${COMMON_FLAGS[@]}" \
  "$@"

