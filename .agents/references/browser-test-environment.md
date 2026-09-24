# Browser Test Environment

Operational reference for browser observation, telemetry capture, and extension panel testing through the agent's attached browser session. The always-on invariants live in `.agents/rules/browser-environment-hygiene.md`.

## Background Non-Interference Invariant

All commands interacting with browser sessions **must** run in the background context to avoid stealing window focus or activating tabs while the user is actively working or playing.

## Common Operational Workflows

### 1. Health check & session discovery

Verify the attached browser session and enumerate tabs before interacting.

### 2. Binding to target tabs

Bind sessions to specific target tabs using URL matching:

- Forge of Empires game tab (strictly read-only observation): `*forgeofempires.com*`
- FoE-Info extension DevTools panel: `chrome-extension://*/panel.html`

### 3. Passive game telemetry observation (Read-Only)

Inspect recent network requests / JSON-RPC payloads and monitor browser console output passively. Never click, type, or navigate on game tabs.

### 4. Extension panel testing & inspection

Active inspection is permitted on the extension panel only: extract panel DOM state, query rendered text, evaluate JavaScript in panel context, tail panel console errors.

## Game Lifecycle Note

The FoE game client transmits its full city topology, buildings, inventory, era, and production multipliers once, during initial boot (`StartupService.getData`). The user reloads the game tab when ready for fresh data; the agent never forces a reload on active game sessions.
