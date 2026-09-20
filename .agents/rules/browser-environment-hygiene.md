---
trigger: model_decision
description: Invariant prohibiting autonomous browser launches, focus-stealing, or game tab clicks; OpenCLI zero-focus background hygiene.
---

# Rule: Browser Environment Hygiene

## Zero autonomous browser interference

The agent and every background process (tools, subagents, hooks, scripts) must never steal window focus, navigate away, reload active game tabs, or close browser tabs.

- **Primary Browser Interface**: Browser observation and testing rely on OpenCLI (`@jackwener/opencli`) via the local daemon (`localhost:19825`) and its lightweight browser bridge extension.
- **Mandatory Background Invariant**: All browser session commands must use `--window background` to guarantee zero tab activation, window resizing, or focus stealing during gameplay.
- **Dual-Mode Operational Boundary**:
  - **Game Tabs (`*forgeofempires.com*`)**: Strictly **read-only observation**. The agent may inspect network RPC payloads (`opencli browser <session> network`) and monitor engine console output (`opencli browser <session> console`). The agent must **NEVER** trigger automated clicks, keystrokes, navigation, or form fills on game tabs.
  - **Extension Panel (`chrome-extension://*`)**: Active debugging and verification are permitted (querying DOM state with `opencli browser <session> state`, testing buttons, auditing memory and exceptions).
- **Tab Lifecycle**: Never close existing tabs or deduplicate tabs destructively. The game client transmits its full state once at initial boot (`StartupService.getData`); reloading is strictly user-controlled.
- **Headless First**: Standard verification runs headless (`npm test`, `npm run verify`). Routine tasks must not reach for browser interaction when headless tests suffice.

## When browser interaction is requested

Load `.agents/references/browser-test-environment.md` for OpenCLI daemon commands, session binding syntax, network RPC observation, and extension panel debugging procedures.
