---
trigger: model_decision
description: Prohibit wildcard tool permission grants and prevent redundant MCP server registrations when editing agent, MCP, or tool permission configurations.
---

# Security & Tool Permissions Rule

## 1. No Wildcard Permission Grants
- NEVER use wildcard patterns (`*`, `tool:*`, `tool/*`, `mcp(*)`) when configuring tool permission grants in configuration files (`~/.gemini/config/config.json`, project JSON files, `settings.json`).
- ALWAYS grant permissions using explicit, fully-qualified tool names (e.g., `chrome-devtools/click`, `chrome-devtools/navigate_page`, `graphify-foe-info/query_graph`).
- Wildcard grants bypass granular security controls and present unacceptable security risks.

## 2. Prevent Redundant MCP Server Definitions
- Before registering an MCP server in `.agents/mcp_config.json`, verify whether an Antigravity plugin (`plugins/<name>/plugin.json`) already provides those tools natively.
- Do not register duplicate standalone stdio MCP servers for tools already mounted via active Antigravity plugins.
- **Approved Exception**: Project-specific wrapper scripts (such as `.agents/scripts/run-chrome-devtools-mcp.sh` in `.agents/mcp_config.json`) that provide essential environment isolation (connecting to `foe-browser` on remote debugging port 9222 with unpolluted desktop environment flags) are permitted.
