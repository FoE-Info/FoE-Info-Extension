#!/usr/bin/env bash
# Wrapper script for chrome-devtools-mcp with complete feature flags
# Integrates with foe-browser (port 9222) and provides resilient standalone fallback.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
EXTENSION_DEV="${WORKSPACE_ROOT}/build/FoE-Info-DEV"
FORGE_HAMMER="${FORGE_HAMMER:-${HOME}/Projects/Forge-Hammer/forge-hammer}"


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

# If not alive, attempt to start the isolated foe-browser service
if ! is_cdp_alive; then
  if command -v foe-browser >/dev/null 2>&1; then
    foe-browser >/dev/null 2>&1 || true
    for _ in {1..15}; do
      if is_cdp_alive; then
        break
      fi
      sleep 0.2
    done
  fi
fi

# If port 9222 is active, connect to the running browser
if is_cdp_alive; then
  exec ${MCP_BIN} \
    --browserUrl="http://127.0.0.1:9222" \
    "${COMMON_FLAGS[@]}" \
    "$@"
fi

# Fallback: Launch standalone Chromium instance with FoE extensions
LOAD_EXT="${EXTENSION_DEV}"
if [ -d "${FORGE_HAMMER}" ]; then
  LOAD_EXT="${EXTENSION_DEV},${FORGE_HAMMER}"
fi

STANDALONE_FLAGS=(
  "--channel=stable"
  "--viewport=1920x1080"
  "--user-data-dir=${HOME}/.config/foe-info-chrome-profile"
  "--ignore-default-chrome-arg=--disable-extensions"
  "--chrome-arg=--load-extension=${LOAD_EXT}"
  "--chrome-arg=--no-sandbox"
  "--chrome-arg=--disable-setuid-sandbox"
)

exec ${MCP_BIN} \
  "${STANDALONE_FLAGS[@]}" \
  "${COMMON_FLAGS[@]}" \
  "$@"
