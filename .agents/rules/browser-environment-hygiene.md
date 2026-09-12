---
trigger: always_on
description: Strict invariant prohibiting autonomous browser launches, restarts, focus-stealing, or tab manipulation without user permission.
---

# Browser Environment Hygiene Rule

## 0. Strict Invariant: Zero Autonomous Browser Control
- **Explicit Permission Only**: The agent and all background processes (MCP servers, subagents, hooks, scripts) must **NEVER** launch `foe-browser`, attach via CDP, steal window focus, navigate, reload a game tab, or close any browser tabs without the user's direct, explicit permission in the current prompt.
- **Never Auto-Spawn in Background**: Background MCP servers (such as `chrome-devtools`) must remain strictly passive; they must never spawn a browser window or launch `foe-browser` when port 9222 is offline.
- **Zero Tab Termination & Non-Destructive Operation**: Scripts must NEVER close existing browser tabs or force-navigate away from an active game session. Deduplication and destructive reloads are strictly forbidden.
- **Default to Headless Verification**: All standard verification, testing, and checks must use headless CLI tools (`npm test`, `npm run verify`).
- **Global Plugin Neutralization**: Global opencode plugins that can spawn or attach to a browser (e.g. `opencode-browser` from `~/.config/opencode/opencode.json`) must not be relied on while this invariant is in force. Use only the passive `chrome-devtools` MCP server for inspection, and disable any global browser-automation plugin that violates this rule.

## 1. Subshell & Terminal Environment Isolation
- NEVER launch development browser instances directly inside terminal emulator subshells (e.g. Ghostty, Kitty) or subagent environments without stripping environment variables.
- When explicitly requested by the user to launch a test browser, use the dedicated `foe-browser` script (`/var/home/kronikpillow/.local/bin/foe-browser`) which isolates the desktop environment and unsets terminal pollution variables (`LD_PRELOAD`, `GHOSTTY_*`, `LIBGL_*`, `MESA_*`, `ELECTRON_*`, `TERM`, `VTE_VERSION`).

## 2. Hardware Acceleration Flags & Isolated Profile
- Chromium runs decoupled via `setsid -f` using `--enable-zero-copy`, `--enable-features=AcceleratedVideoEncoder`, and `--disable-session-crashed-bubble` with a dedicated user profile (`~/.config/foe-info-chrome-profile`).

## 3. Remote Debugging Port Connection & CDP Controller
- Port `9222` is bound with `--remote-debugging-port=9222` and `--remote-debugging-address=0.0.0.0`.
- The companion CDP controller script (`scripts/foe-browser-control.mjs`) operates passively without closing tabs or forcing reloads unless explicit CLI flags (`--reload`, `--force-navigate`, `--auto-login`) are supplied.

## 4. Extension Console & Error Inspection Protocol (panel.html Context)
- **Mandatory Target**: When explicitly requested to inspect live extension output, inspect errors against the extension DevTools panel context (`chrome-extension://.../panel.html`) using `.agents/scripts/inspect-extension.js`.
- **Runtime Exception Subscription**: Always subscribe to `Runtime.exceptionThrown` and `Log.entryAdded` events over CDP rather than querying static initial window state.
- **Context Disambiguation**: Remember that `panel.html` runs inside an iframe under the main DevTools window (`devtools_app.html`). Always ensure CDP queries filter for `url.includes('panel.html')`.

## 5. Extension & Game Lifecycle Invariant: User-Controlled Game Reload (F5)
- The FoE game client transmits its full city topology, buildings, inventory, era, and production multipliers ONLY ONCE during initial game boot via `StartupService.getData`.
- When the extension is rebuilt or reloaded, the extension DevTools panel is reset. The user reloads the game tab (F5) when ready to ingest fresh game data. The agent must NEVER automatically trigger page reloads without express permission.

## 6. Standard CLI Control Commands
- `foe-browser`: Start/attach passively (does NOT reload game or close tabs).
- `foe-browser --reload`: Start/attach and explicitly reload game tab.
- `foe-browser --restart`: Clean restart with cleared session files.
- `foe-browser --stop` or `foe-browser --kill`: Gracefully terminates the running test browser.
- `foe-browser --world <world>`: Targets specific game world (e.g., `--world en7`).


