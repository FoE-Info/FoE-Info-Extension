---
name: browser-testing
description: 'Observe game telemetry and test FoE-Info extension panel via OpenCLI.'
---

# Browser Testing & Observation Skill (OpenCLI)

This skill teaches the agent how to observe Forge of Empires game telemetry and test the FoE-Info extension panel live in the user's browser using **OpenCLI** (`@jackwener/opencli` v1.8.7) via the local daemon (`localhost:19825`) and Browser Bridge.

---

## Non-Interference Invariants

1. **Zero autonomous browser control**: Never close tabs, navigate away from the game, or steal window focus.
2. **Mandatory background flag**: Always invoke OpenCLI browser commands with `--window background`.
3. **Dual-mode scope**:
   - **Game tabs (`*forgeofempires.com*`)**: Read-only passive observation (`network`, `console`). Never `click`, `type`, or navigate.
   - **Extension panel (`chrome-extension://*`)**: Active inspection and interaction allowed (`state`, `extract`, `click`, `eval`).

---

## 1. Health Check & Discovery

Verify the daemon and browser bridge status before running commands:

```bash
# Check daemon & bridge extension connection
opencli doctor

# List open browser tabs in a session
opencli browser default tab list

```

---

## 2. Binding to Targets

Bind sessions to specific target tabs using URL matching:

```bash
# Bind to the active Forge of Empires game tab (read-only telemetry)
opencli browser foe-game bind --url "*forgeofempires.com*"

# Bind to the active FoE-Info DevTools extension panel
opencli browser foe-panel bind --url "chrome-extension://*/panel.html"
```

---

## 3. Observing Game Telemetry (Read-Only)

Monitor InnoGames JSON-RPC messages and engine console output passively:

```bash
# View recent network requests / RPC payloads
opencli browser foe-game network

# Filter for specific RPC requests or JSON payloads
opencli browser foe-game network --filter "jsonrpc"

# Monitor browser console logs and errors from the game tab
opencli browser foe-game console
```

---

## 4. Testing & Inspecting the FoE-Info Panel

Perform active inspection, DOM state extraction, and JavaScript evaluation on the extension panel:

```bash
# Extract full DOM state of panel.html
opencli browser foe-panel state

# Query rendered text or extract structured content
opencli browser foe-panel extract

# Execute JavaScript in panel context to inspect runtime objects
opencli browser foe-panel eval "window.location.href"
opencli browser foe-panel eval "document.querySelectorAll('.nav-link').length"

# Tail panel console errors
opencli browser foe-panel console
```

---

## 5. Pre-Merge Verification Checklist

Before claiming any extension UI feature or RPC handler is verified live:

1. Build development bundle: `npm run build:dev`
2. Ensure `opencli doctor` reports connected daemon and browser bridge.
3. Verify panel errors: `opencli browser foe-panel console` yields zero unhandled exceptions.
4. Verify DOM rendering: `opencli browser foe-panel state` confirms expected cards and elements render.

---

## Modern Web Guidance (Project Overlay)

Apply the FoE-Info modern web conventions: [project conventions](../../rules/modern-web-conventions.md).
Primary reference categories: `accessibility/`, `performance/`.
Uphold:

- Assert live regions/roles and table semantics
- Check for detached observers
- Measure render timing after scheduler changes
