# Browser Test Environment: OpenCLI Workflow

Operational reference for browser observation, telemetry capture, and extension panel testing via **OpenCLI** (`@jackwener/opencli` v1.8.7). The always-on invariants live in `.agents/rules/browser-environment-hygiene.md`.

## OpenCLI Architecture

OpenCLI operates via a local daemon on port `19825` that communicates with the user's primary browser through the lightweight OpenCLI Browser Bridge Chrome extension.

- **Daemon endpoint**: `http://localhost:19825`
- **Bridge extension**: Connects existing browser tabs without launching isolated browser instances or stealing window focus.

## Background Non-Interference Invariant

All commands interacting with browser sessions **must** specify `--window background` to avoid stealing window focus or activating tabs while the user is actively working or playing.

## Common Operational Workflows

### 1. Health check & session discovery
```bash
# Check daemon and browser bridge status
opencli doctor

# List open browser tabs in a session
opencli browser default tab list

```

### 2. Binding to target tabs
```bash
# Bind to the active Forge of Empires tab (strictly read-only observation)
opencli browser foe-game bind --url "*forgeofempires.com*"

# Bind to the FoE-Info extension DevTools panel
opencli browser foe-panel bind --url "chrome-extension://*/panel.html"
```

### 3. Passive game telemetry observation (Read-Only)
```bash
# Inspect recent network requests / JSON-RPC payloads
opencli browser foe-game network

# Monitor browser console warnings/errors
opencli browser foe-game console
```

### 4. Extension panel testing & inspection
```bash
# Extract panel DOM structure
opencli browser foe-panel state

# Query runtime properties or execute inspection
opencli browser foe-panel eval "window.location.href"
```

## Game Lifecycle Note

The FoE game client transmits its full city topology, buildings, inventory, era, and production multipliers once, during initial boot (`StartupService.getData`). The user reloads the game tab when ready for fresh data; the agent never forces a reload on active game sessions.

