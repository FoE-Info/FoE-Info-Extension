# Environment & Tool Resolution Rules (mise Integration)

## Dynamic Tool Management via `mise`

This workspace uses `mise` (installed via Linuxbrew) for managing Node, Python, and uv versions as configured in `.mise.toml`.

### Subshell & Global PATH Integration

`mise` shims (`~/.local/share/mise/shims`) are exported in `PATH` globally via `~/.bashrc.d/10-mise.sh` and `~/.config/environment.d/10-mise.conf`.

### Tool Resolution Paths (via `mise` Shims)

- **mise Shims**: `~/.local/share/mise/shims/` (`node`, `npm`, `npx`, `uv`, `python`, `pip`)
- **mise Binary**: `/home/linuxbrew/.linuxbrew/bin/mise`

## Execution Guidelines

1. `node`, `npm`, `npx`, `uv`, `python`, and `pip` are dynamically resolved by `mise` shims in all subshells.
2. This repository does **NOT** use `.venv` virtualenvs. Tools (e.g. `graphify`) are installed globally via `uv tool` per `.mise.toml` hooks.
3. Do **NOT** hardcode specific version numbers (e.g. `22.23.2`) in scripts or commands — `mise` reads `.mise.toml` automatically.
4. Do **NOT** run `which`, `export PATH`, or manual setup commands in chat — tools are pre-activated.
5. Project `.env` environment variables are loaded automatically by `mise` and `~/.antigravity_env.sh`.

## MCP Server Configuration (`.agents/mcp_config.json`)

1. **Naming Invariant**: Use underscored server names (e.g., `chrome_devtools`) matching system definitions to ensure local configurations cleanly override system defaults without registering duplicate servers.
2. **Executable Paths**: Use `npx` or `~/.local/share/mise/shims/npx` rather than hardcoded version paths (e.g. avoid `/installs/node/22.23.2/...`).
3. **Feature Parity Flags**: For `chrome_devtools`, include experimental flags when full capability is needed:
   - `--experimentalMemory`: Enables memory snapshots and heap node analysis tools.
   - `--experimentalScreencast`: Enables screencast recording tools.

