---
trigger: model_decision
description: Apply when launching Chromium instances, setting browser automation flags, or debugging extension DevTools and panel.html via CDP.
---

# Browser Environment Hygiene Rule

## 1. Subshell & Terminal Environment Isolation
- NEVER launch development browser instances directly inside terminal emulator subshells (e.g. Ghostty, Kitty) or subagent environments without stripping environment variables.
- ALWAYS use the dedicated `foe-browser` script (`/var/home/kronikpillow/.local/bin/foe-browser`) which isolates the desktop environment and unsets terminal pollution variables (`LD_PRELOAD`, `GHOSTTY_*`, `LIBGL_*`, `MESA_*`, `ELECTRON_*`, `TERM`, `VTE_VERSION`).

## 2. Hardware Acceleration Flags & Isolated Profile
- Chromium runs decoupled via `setsid -f` using `--enable-zero-copy`, `--enable-features=AcceleratedVideoEncoder`, and `--disable-session-crashed-bubble` with a dedicated user profile (`~/.config/foe-info-chrome-profile`).

## 3. Remote Debugging Port Connection & CDP Controller
- Port `9222` is bound with `--remote-debugging-port=9222` and `--remote-debugging-address=0.0.0.0`.
- The companion CDP controller script (`scripts/foe-browser-control.mjs`) automatically deduplicates game tabs, selects the target world, and focuses the FoE-Info DevTools panel.
- When an un-sandboxed Chromium instance is active on port `9222`, click "Proceed Anyway" if the Antigravity UI shows a debugging modal.

## 4. Extension Console & Error Inspection Protocol (panel.html Context)
- **Mandatory Target**: Always inspect errors against the extension DevTools panel context (`chrome-extension://.../panel.html`) using `.agents/scripts/inspect-extension.js`.
- **Runtime Exception Subscription**: Always subscribe to `Runtime.exceptionThrown` and `Log.entryAdded` events over CDP rather than querying static initial window state.
- **Context Disambiguation**: Remember that `panel.html` runs inside an iframe under the main DevTools window (`devtools_app.html`). Always ensure CDP queries filter for `url.includes('panel.html')`.

## 5. Extension & Game Lifecycle Invariant: Mandatory Game Reload (F5)
- **Extension Reload Mandates Game Reload (F5)**: The FoE game client transmits its full city topology, buildings, inventory, era, and production multipliers ONLY ONCE during initial game boot via `StartupService.getData`.
- When the extension is rebuilt, reloaded in `chrome://extensions`, or its DevTools panel re-opened, all in-memory extension state (`MetadataStore`, `state.js`) is reset to empty.
- **The "Load the game to see your City Stats" Banner**:
  - This banner indicates that the game's startup RPC payload has not yet been intercepted since the extension attached.
  - It is **NOT** a code defect, broken styling, or missing template logic.
  - **Never attempt to debug code or investigate missing City Stats without first reloading the game tab** (F5 / `Page.reload`) while the extension DevTools panel is open and listening.
- Whenever testing extension changes in the browser, always ensure the game tab is refreshed after the extension panel is mounted so live startup packets are captured.

## 6. Standard CLI Control Commands
- `foe-browser`: Default start/attach; focuses DevTools panel and reloads game tab to ingest fresh startup data.
- `foe-browser --restart`: Clean restart with cleared session files; focuses panel and reloads game.
- `foe-browser --stop` or `foe-browser --kill`: Gracefully terminates the running test browser.
- `foe-browser --no-reload`: Attaches without reloading the game tab (only use when explicitly preserving in-flight game state).
- `foe-browser --world <world>`: Targets specific game world (e.g., `--world en7`).

