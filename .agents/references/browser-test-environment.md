# Browser Test Environment

Operational detail for the isolated Chromium instance, the CDP port, and the extension console protocol. The always-on prohibition lives in `.agents/rules/browser-environment-hygiene.md`; this file is the reference you load once the user has actually approved browser work.

## Subshell and terminal environment isolation

Never launch development browser instances directly inside terminal emulator subshells (Ghostty, Kitty) or subagent environments without stripping environment variables.

When the user explicitly asks for a test browser, resolve the dedicated `foe-browser` command from `PATH`. It isolates the desktop environment and unsets terminal pollution variables: `LD_PRELOAD`, `GHOSTTY_*`, `LIBGL_*`, `MESA_*`, `ELECTRON_*`, `TERM`, `VTE_VERSION`. If the command is unavailable, stop and report that prerequisite instead of guessing a workstation path.

## Hardware acceleration flags and isolated profile

Chromium runs decoupled via `setsid -f` with `--enable-zero-copy`, `--enable-features=AcceleratedVideoEncoder`, and `--disable-session-crashed-bubble`, against a dedicated profile at `~/.config/foe-info-chrome-profile`.

## Remote debugging port

Port `9222` is bound by the external `foe-browser` launcher with `--remote-debugging-port=9222` and `--remote-debugging-address=0.0.0.0`. The launcher is not tracked in this repository.

## Extension console and error inspection (panel.html context)

- Inspect live extension output against the DevTools panel context (`chrome-extension://.../panel.html`) using `.agents/scripts/inspect-extension.js`.
- Subscribe to `Runtime.exceptionThrown` and `Log.entryAdded` over CDP. Static initial window state misses exceptions that fire later.
- `panel.html` runs inside an iframe under the main DevTools window (`devtools_app.html`), so CDP queries must filter for `url.includes('panel.html')`.

## Game lifecycle: reload is user-controlled

The FoE game client transmits its full city topology, buildings, inventory, era, and production multipliers once, during initial boot, via `StartupService.getData`. Rebuilding or reloading the extension resets the DevTools panel, so the user reloads the game tab when they are ready to ingest fresh data. The agent never triggers a page reload on its own.

## CLI control commands

| Command | Effect |
| :--- | :--- |
| `foe-browser` | Start or attach passively. Does not reload the game or close tabs. |
| `foe-browser --reload` | Start or attach, then reload the game tab. |
| `foe-browser --restart` | Clean restart with cleared session files. |
| `foe-browser --stop`, `--kill` | Gracefully terminate the running test browser. |
| `foe-browser --world <world>` | Target a specific game world, e.g. `--world en7`. |
