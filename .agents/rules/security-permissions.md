---
trigger: model_decision
description: Prohibit wildcard tool grants and redundant MCP registrations.
---

# Security & Tool Permissions Rule

## 1. No Wildcard Permission Grants

- NEVER use wildcard patterns (`*`, `tool:*`, `tool/*`, `mcp(*)`) when configuring tool permission grants in configuration files (`~/.gemini/config/config.json`, project JSON files, `settings.json`).
- ALWAYS grant permissions using explicit, fully-qualified tool names with the Antigravity MCP wrapper syntax (e.g., `mcp(chrome-devtools/click)`, `mcp(chrome-devtools/navigate_page)`, `mcp(graphify-foe-info/query_graph)`). Bare `server/tool` strings without `mcp(...)` are rejected by the Antigravity permission store.
- Wildcard grants bypass granular security controls and present unacceptable security risks.

## 2. Prevent Redundant MCP Server Definitions

- Before registering an MCP server in `.agents/mcp_config.json`, verify whether an Antigravity plugin (`plugins/<name>/plugin.json`) already provides those tools natively.
- Do not register duplicate standalone stdio MCP servers for tools already mounted via active Antigravity plugins.
- **Approved Exception**: Project-specific MCP entry points (such as `chrome-devtools` connecting to the browser on remote debugging port 9222 with explicit unpolluted desktop environment flags) are permitted, provided secrets are never inlined into tracked config and are instead resolved from git-ignored env files via `{env:VAR}` interpolation or inherited process environment.

## 3. Complete MCP Decommissioning Protocol

When retiring or removing an MCP server:
- **Workspace Registry**: Remove the server definition and any associated profiles or references from `.agents/mcp-registry.json`.
- **Test Parity**: Update registry test assertions in `tests/agents/mcp-profile.test.mjs` to keep invariant test suites green.
- **Permission Cleanup**: Remove corresponding `mcp(<server>/*)` grants from `~/.gemini/config/config.json`.
- **Schema Cache Invalidation**: Delete cached schema directories in both `~/.gemini/antigravity/mcp/<server>/` and `~/.gemini/antigravity-cli/mcp/<server>/` to prevent ghost tool definitions from consuming customization tokens.
