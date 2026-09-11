---
name: browser-testing
description: Live Chromium testing, DevTools panel inspection, and CDP socket diagnostics on port 9222.
---

# Browser Testing & DevTools Automation Skill

This skill teaches the agent how to test FoE-Info live in Chromium using the isolated `foe-browser` service and Chrome DevTools Protocol (CDP).

---

## 1. Launching & Managing the Test Browser

The test browser runs un-sandboxed with the developer build loaded, isolated from terminal environment pollution (`LD_PRELOAD`, `GHOSTTY_*`).

### Quick Commands
* **Start or Take Over Game Tab**:
  ```bash
  foe-browser
  # or: npm run browser
  ```
  - If Chromium is already running, it takes over the existing `en7.forgeofempires.com` tab, closes any duplicate tabs, reloads the game, and focuses the FoE-Info DevTools panel.
  - If Chromium is stopped, it starts `foe-browser.service` cleanly with exactly one game tab and docks DevTools on the right.

* **Clean Restart**:
  ```bash
  foe-browser --restart
  # or: npm run browser:restart
  ```

* **Stop Browser**:
  ```bash
  foe-browser --stop
  ```

---

## 2. Inspecting the Extension via CDP (Port 9222)

Chromium exposes the Chrome DevTools Protocol at `http://127.0.0.1:9222`.

### Query Open Targets
```bash
curl -s http://127.0.0.1:9222/json
```
Targets include:
* `page`: The Forge of Empires game tab (`en7.forgeofempires.com/game/index`).
* `page` (with `devtools://` URL): The docked DevTools window.
* `iframe` (with `chrome-extension://.../panel.html`): The active FoE-Info UI panel.

### Trapping Runtime Exceptions Across All Targets
Run the diagnostic script to listen for unhandled exceptions or console errors for a specified duration (e.g. 5 seconds):
```bash
node .agents/scripts/inspect-extension.js 5000
# or: npm run inspect
```
This inspects the game page, background service worker, and `panel.html` iframe simultaneously.

### Targeting the Main Panel Specifically (`panel.html`)
To filter logs and isolate exceptions specifically originating inside `panel.html`:
```bash
node .agents/scripts/inspect-extension.js 5000 --target panel.html
# or: npm run inspect:panel
```

### Listing All Connected CDP Targets
```bash
node .agents/scripts/inspect-extension.js 3000 --all
```

---

## 3. Pre-Merge Verification Checklist

Before claiming any feature or bugfix is complete:
1. Rebuild the extension: `npm run build:dev`
2. Run `foe-browser` to reload the game tab with the new build.
3. Run `node .agents/scripts/inspect-extension.js 5000` to confirm:
   - Zero `Runtime.exceptionThrown` events.
   - Zero console errors in `panel.html`.
   - Successful RPC message interception.
