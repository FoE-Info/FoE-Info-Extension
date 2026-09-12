---
name: chrome-devtools
description: "Chrome DevTools MCP debugging, DOM inspection, and CDP commands."
---

## Core Concepts

**Browser lifecycle in this workspace**: `.agents/scripts/run-chrome-devtools-mcp.sh` first attaches to the isolated browser on port 9222, attempts `foe-browser` if needed, and only then uses its standalone fallback. Direct upstream launch behavior can differ; inspect the wrapper before applying generic setup examples.

- Extension-management tools require `--categoryExtensions` with pipe transport in the installed CLI. They are unavailable on this workspace's normal `--browserUrl` connection; do not assume they exist or change transport merely to follow this example.
- For memory tooling, pass `--memoryDebugging`.

**Page targeting**: Tools operate on the target page. Use `list_pages` to view open tabs, then `select_page` or pass `pageId`. For extensions, `evaluate_script` accepts `serviceWorkerId` without `pageId`.

**Element interaction**: Use `take_snapshot` to inspect accessibility tree and obtain unique element `uid`s for `click`, `fill`, etc.

---

## Workflow Patterns

### 1. General Automation & DOM Inspection
1. **Navigate**: `navigate_page` or `new_page`.
2. **Wait**: `wait_for` until target selector or state appears.
3. **Snapshot**: `take_snapshot` with `pageId` to retrieve element `uid`s.
4. **Interact**: `click`, `fill`, `hover`, or `press_key` using `uid`.

### 2. Chrome Extension Testing (optional pipe-transport tools)
These upstream steps apply only when the connected server actually exposes the named tools. For this workspace's normal port-9222 setup, use the `browser-testing` runbook and existing scripted CDP tooling instead.
1. **Install**: `install_extension` with path to unpacked build directory.
2. **Inspect**: Obtain extension ID via `list_extensions`.
3. **Trigger**: `trigger_extension_action` to open popup or side panel.
4. **Service Worker**: `evaluate_script` passing `serviceWorkerId` (omitting `pageId`).
5. **DOM Verification**: `take_snapshot` to assert content script element injection.

### 3. Memory & Heap Analysis (`--memoryDebugging`)
1. **Capture**: `take_heapsnapshot` to record baseline and post-action `.heapsnapshot` files.
2. **Summarize & Diff**: `get_heapsnapshot_summary` and `compare_heapsnapshots`.
3. **Retaining Paths**: `get_heapsnapshot_retainers` and `get_heapsnapshot_dominators`.
4. **Cleanup**: Always call `close_heapsnapshot` to free server RAM.

### 4. CLI Usage
Direct terminal interaction using the `chrome-devtools` binary for command execution and automation. See [references/cli-reference.md](references/cli-reference.md) for the complete command reference and [references/cli-installation.md](references/cli-installation.md) for setup and installation instructions.

---

## Offline References

Deep reference manuals from `ChromeDevTools/chrome-devtools-mcp`:
- [`tool-reference.md`](references/tool-reference.md): Bundled tool-reference snapshot; the connected server's tool schema determines current availability.
- [`configuration.md`](references/configuration.md): Complete flags and startup options.
- [`advanced-usage.md`](references/advanced-usage.md): Multi-page routing, isolated contexts, and traces.
- [`design-principles.md`](references/design-principles.md): MCP tool design philosophy.
- [`slim-tool-reference.md`](references/slim-tool-reference.md): Slim 3-tool minimal footprint mode.
- [`troubleshooting.md`](../chrome-devtools-troubleshooting/references/troubleshooting.md): Port binding, connection timeout, and profile debugging.

---

## Modern Web Guidance (Project Overlay)

Apply the `modern-web-guidance` library with the FoE-Info overlay: [modern-web-guidance](../modern-web-guidance/SKILL.md) and [project conventions](../modern-web-guidance/references/project-conventions.md).
Primary reference categories: `accessibility/`, `performance/`.
Uphold:
- inspect the a11y tree for `role`/`aria-*`, use Perf insights for long tasks/INP
