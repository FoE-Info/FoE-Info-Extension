---
trigger: always_on
description: Strict invariant prohibiting autonomous browser launches, restarts, focus-stealing, or tab manipulation without user permission.
---

# Rule: Browser Environment Hygiene

## Zero autonomous browser control

The agent and every background process (MCP servers, subagents, hooks, scripts) must never launch `foe-browser`, attach over CDP, steal window focus, navigate, reload a game tab, or close browser tabs without the user's explicit permission in the current prompt.

- Background MCP servers such as `chrome-devtools` stay passive. They never spawn a browser window or launch `foe-browser` when port 9222 is offline.
- Never close existing browser tabs or navigate away from an active game session. No destructive reloads, no deduplication that kills tabs.
- Standard verification runs headless: `npm test`, `npm run verify`, and friends. Do not reach for a browser to check routine work.
- Global opencode plugins that can spawn or attach to a browser (for example `opencode-browser` from `~/.config/opencode/opencode.json`) must not be relied on while this invariant holds. Use only the passive `chrome-devtools` MCP server for inspection, and disable any global browser-automation plugin that violates this rule.
- The game client sends its full state once, at boot. The user reloads the game tab when they want fresh data, never the agent.

## Once the user has approved browser work

Load `.agents/references/browser-test-environment.md` for the isolated profile, hardware flags, debug port, console-inspection protocol, and the `foe-browser` CLI.
