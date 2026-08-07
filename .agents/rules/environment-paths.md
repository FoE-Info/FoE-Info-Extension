# Environment & OSTree Path Resolution Rules

## Path & Binary Resolution

- **OSTree Absolute Paths**: On OSTree/Silverblue systems (`/var/home`), reference `/var/home/linuxbrew/.linuxbrew/bin` directly or use installed binaries in `~/.local/share/mise/installs/` rather than unresolvable `/home/` symlinks.
- **Direct MCP Command Paths**: In `.agents/mcp_config.json`, use absolute binary paths (e.g. `.venv/bin/graphify-mcp` and Node `bin/npx`) instead of launching through interactive `mise exec` wrappers.
- **Subshell Environment Sync**: Maintain explicit `PATH` exports across `.envrc`, `.env`, and `.vscode/settings.json` so non-interactive subshells auto-activate the Node, UV, Python `.venv`, and Linuxbrew toolchain without manual intervention.
