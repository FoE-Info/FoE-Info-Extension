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
2. **Zero-Install & Multi-Ecosystem Python Tools**: For Python CLI tools (such as `graphify`), task runners and rules must use a 3-tier fallback chain (`uvx` -> `pipx run` -> direct binary) to support `mise`, `uv`, `pipx`, and standard `pip` setups seamlessly:
   `command -v uvx >/dev/null 2>&1 && uvx --from "package[extras]" command ... || (command -v pipx >/dev/null 2>&1 && pipx run --spec "package[extras]" command ... || command ...)`
3. Do **NOT** hardcode specific version numbers (e.g. `22.23.2`) in scripts or commands — `mise` reads `.mise.toml` automatically.
4. Prefer the activated toolchain. Read-only resolution checks such as `command -v` are appropriate when diagnosing setup; do not mutate `PATH` ad hoc when `.agents/env.sh` or `mise` can establish it consistently.
5. **Environment Variable Loading**: Antigravity runs non-interactive `bash -c` subshells that may not inherit vars from `systemd environment.d`, `~/.bashrc.d/`, or `mise`. Before running a command that needs project environment variables, prefix it with `source .agents/env.sh &&`. The loader resolves the repository root from its own location, sources `.env` followed by `.env.local`, and adds the `mise` and local binary directories to `PATH`. Never print secret values while diagnosing availability.
6. **Local Secret Preservation**: Prior to executing destructive environment clean commands (such as `git clean -dfx`), inspect untracked `.env` and `.env.local` files to back up local API keys and credentials. Ensure `.gitignore` specifies `.env*` and `.mise.toml` configures `_.file = [".env", ".env.local"]` to preserve secret overrides across setups.
7. **1-to-1 Task Runner Parity**: All npm scripts in `package.json` must have 100% feature-identical task entries in `.mise.toml` `[tasks]` and `.vscode/tasks.json`.

## Environment Variable Infrastructure

The following files work together to provide API keys and env vars across different execution contexts:

| File | Context | Mechanism |
|------|---------|----------|
| `.env` / `.env.local` | Project-level secrets | Sourced by `mise` and `.agents/env.sh` |
| `.agents/env.sh` | Antigravity non-interactive shells | Must be explicitly sourced: `source .agents/env.sh && <command>` |
| `~/.bashrc.d/20-gemini.sh` | Interactive terminal sessions | Auto-sourced by `~/.bashrc` |
| `~/.config/environment.d/20-gemini.conf` | Systemd user services / desktop session | Loaded by systemd |
| `.agents/hooks.json` | Antigravity session start | Runs `mise hook-env` |

## MCP Server Configuration (`.agents/mcp_config.json`)

1. **Naming Invariant**: Use underscored server names (e.g., `chrome_devtools`) matching system definitions to ensure local configurations cleanly override system defaults without registering duplicate servers.
2. **Executable Paths**: Use portable command names (`uvx`, `npx`) resolved through the activated environment rather than machine- or version-specific install paths.
3. **Feature Parity Flags**: For `chrome_devtools`, include experimental flags when full capability is needed:
   - `--experimentalMemory`: Enables memory snapshots and heap node analysis tools.
   - `--experimentalScreencast`: Enables screencast recording tools.
