---
name: audit-memory-leaks
description: Isolate and eliminate detached DOM nodes and panel memory leaks via CDP.
---

# Workflow: Audit Memory Leaks & Panel Performance

Use this skill to detect, isolate, and eliminate memory leaks, detached DOM nodes, and unbounded object accumulation in the FoE-Info DevTools panel.

> [!CAUTION]
> **Token Safety Guardrail**: **NEVER** inspect or read raw `.heapsnapshot` files directly using `view_file` or `cat`. Heap snapshots are 30–200+ MB JSON dumps that will immediately exhaust the model context window. Always process them through `compare_snapshots.mjs`, `chrome-devtools` MCP tools, or `memlab`.

---

## Phase 1: Establish Baseline Memory Footprint
1. Start the test browser with a clean session:
   ```bash
   foe-browser --restart
   ```
2. Check initial Chromium process memory:
   ```bash
   ps aux | grep chrome-linux64/chrome | awk '{print $2, $4, $5, $6, $11}'
   ```
3. Record initial RSS (Resident Set Size).

---

## Phase 2: Stress Simulation Cycle
1. Run active gameplay or simulate repeated panel refreshes (repeat user interactions and panel view switches 5–10 times to amplify subtle leaks):
   ```bash
   for i in {1..5}; do foe-browser; sleep 2; done
   ```
2. Monitor runtime logs and panel exceptions:
   ```bash
   node .agents/scripts/inspect-extension.js 10000
   ```
3. Measure RSS memory again. If RSS grows continuously by >100 MB without plateauing, a leak exists.

---

## Phase 3: Root Cause Isolation
Check for primary FoE-Info leak patterns and remediation techniques:
1. **Unbounded RPC Logging Arrays**:
   - Check if `buildingsReady`, `goodsBuildings`, or chat messages grow indefinitely.
   - Fix: Cap arrays with fixed-size ring buffers (e.g., `arr.slice(-500)`).
2. **Detached DOM Nodes & jQuery Event Handlers**:
   - Search for `$(...).on(...)` inside functions called on every RPC message.
   - Fix: Call `$(...).off(...)` before attaching, or use delegated event handling at the document level.
   - **Bootstrap Tooltip/Popover Disposal**: Always call `.dispose()` on component instances before removing or replacing host DOM nodes to prevent detached node accumulation. See [Bootstrap JS Lifecycle & Teardown](../add-feature-panel/references/bootstrap-js-api.md).
   - *Caution on Detached DOM*: Certain detached DOM elements may be intentional cached table templates across tab switches. Confirm if nodes are active caches before nulling references.

3. **Global Window Caches & Retained Closures**:
   - Check if `window.CityEntities` or `window.Metadata` accumulates duplicate keys.
   - Fix: Store in scoped modules with explicit deduplication. Use `WeakMap` or `WeakSet` for DOM node associations so entries automatically garbage-collect when elements leave the DOM.
4. **Active Interval Timers**:
   - Search for `setInterval` without corresponding `clearInterval`.

For canonical JavaScript memory leak patterns and remediation recipes, consult [`references/common-leaks.md`](references/common-leaks.md).

---

## Phase 4: 3-Snapshot Heap Comparison (Deep Inspection)

If continuous memory growth is observed, follow the **3-Snapshot Lifecycle** to distinguish active state allocations from genuine leaks:
1. **Baseline Snapshot**: Captured immediately after panel startup (`baseline.heapsnapshot`).
2. **Target Snapshot**: Captured after repeated view switches, tab clicks, or 500+ RPC messages (`target.heapsnapshot`).
3. **Final Snapshot (Post-Revert)**: Captured after navigating back to the starting tab and allowing GC to settle (`final.heapsnapshot`).

### 1. Snapshot Capture
Capture snapshots programmatically using the `chrome-devtools` MCP server on CDP port 9222:
* Call `take_heapsnapshot` with `pageId` (from `list_pages`) and target `filePath` (`/tmp/baseline.heapsnapshot`).
* Alternatively, capture manually in DevTools: `Memory` tab -> `Take snapshot` -> right click -> `Save...`.

### 2. Compare Peak Allocation vs. Persistent Leaks
Run `compare_snapshots.mjs` with all 3 snapshots:
```bash
node .agents/skills/audit-memory-leaks/scripts/compare_snapshots.mjs /tmp/baseline.heapsnapshot /tmp/target.heapsnapshot /tmp/final.heapsnapshot
```
*(Or use the native `compare_heapsnapshots` MCP tool within active agent sessions).*

The utility computes:
* **Active Allocation (`Baseline -> Target`)**: Objects allocated to support gameplay and rendering.
* **Persistent Leaks (`Baseline -> Final`)**: Objects that failed to garbage-collect after returning to the initial state (detached DOM, orphaned closures, lingering listeners).

### 3. Deep Retainer Tracing via `memlab` (Optional)
If `compare_snapshots.mjs` isolates detached DOM trees or closures, run `memlab` to trace the exact retaining path in the code:
```bash
# Trace full root-to-leaf retainer paths for leaks across 3 snapshots
npx memlab find-leaks --baseline /tmp/baseline.heapsnapshot --target /tmp/target.heapsnapshot --final /tmp/final.heapsnapshot

# Or analyze largest individual retained objects within a single snapshot
npx memlab analyze snapshot --snapshot /tmp/target.heapsnapshot
```

---

## Phase 5: Verification & Build
1. Rebuild extension:
   ```bash
   npm run build:dev
   ```
2. Reload browser:
   ```bash
   foe-browser
   ```
3. Confirm memory stabilizes under repeated cycles.
