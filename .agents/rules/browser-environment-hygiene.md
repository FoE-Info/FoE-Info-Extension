---
trigger: model_decision
description: Invariant prohibiting autonomous browser launches, focus-stealing, or game tab clicks; zero-focus background hygiene.
---

# Rule: Browser Environment Hygiene

## Zero autonomous browser interference

The agent and every background process (tools, subagents, hooks, scripts) must never steal window focus, navigate away, reload active game tabs, or close browser tabs.

- **Primary Browser Interface**: Browser observation and testing use the agent's attached browser session. Never launch a separate or headless browser to work around attachment.
- **Mandatory Background Invariant**: All browser session commands must run in the background context to guarantee zero tab activation, window resizing, or focus stealing during gameplay.
- **Dual-Mode Operational Boundary**:
  - **Game Tabs (`*forgeofempires.com*`)**: Strictly **read-only observation**. The agent may inspect network RPC payloads and monitor engine console output. The agent must **NEVER** trigger automated clicks, keystrokes, navigation, or form fills on game tabs.
  - **Extension Panel (`chrome-extension://*`)**: Active debugging and verification are permitted (querying DOM state, testing buttons, auditing memory and exceptions).
- **Tab Lifecycle**: Never close existing tabs or deduplicate tabs destructively. The game client transmits its full state once at initial boot (`StartupService.getData`); reloading is strictly user-controlled.
- **Headless First**: Standard verification runs headless (`npm test`, `npm run verify`). Routine tasks must not reach for browser interaction when headless tests suffice.
