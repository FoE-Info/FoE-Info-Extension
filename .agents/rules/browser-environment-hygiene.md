---
trigger: always_on
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

## 5. Standard CLI Control Commands
- `foe-browser`: Default start/attach; focuses DevTools panel.
- `foe-browser --restart`: Clean restart with cleared crash recovery session files.
- `foe-browser --stop` or `foe-browser --kill`: Gracefully terminates the running test browser.
- `foe-browser --no-reload`: Attaches without reloading the game tab.
- `foe-browser --world <world>`: Targets specific game world (e.g., `--world en7`).

