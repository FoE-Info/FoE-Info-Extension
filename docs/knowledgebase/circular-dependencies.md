# FoE-Info-Extension: Circular Dependency Analysis & Refactoring Plan

**Source Files**: `graphify-out/GRAPH_REPORT.md`, `src/js/fn/`, `src/js/msg/`, `src/js/index.js`

---

## 1. Executive Summary

The latest verified Graphify snapshot lists **20 three-file cycle paths**, grouped below into 14 recurring import patterns. They share one structural defect: **The Triangular Dependency Pattern**, where UI helper modules (`src/js/fn/*.js`) import state and DOM handles from the application root (`src/js/index.js`), which in turn imports the message services (`src/js/msg/*.js`) that import those same UI helpers.

Webpack 5 can bundle these cycles and the production build currently succeeds, but they impose significant maintenance costs and runtime initialization risk:

- **Tight coupling** between the UI helper layer and application state prevents independent testing or reuse of either layer.
- **Difficulty tracing data flow** — any change to a state variable in `index.js` can have unpredictable knock-on effects across multiple cycle participants.
- **Impediment to refactoring** — extracting any single service or utility requires untangling all cycles it participates in simultaneously.
- **Low architectural cohesion** around `index.js`, which mixes request routing, global state, DOM ownership, and debug behavior.

The recommended fix is a phased state extraction refactoring, outlined in [Section 5](#5-recommended-refactoring-strategies).

---

## 2. Knowledge Graph Metrics & God Node Analysis

Graph totals change whenever source code or documentation is re-indexed. Use local `graphify-out/GRAPH_REPORT.md` for the current node, edge, community, and centrality values. The stable architectural signal is the concentration of responsibilities in the following hubs.

### 2.1 God Node Betweenness Table

God nodes are modules or functions with disproportionately high edge counts or betweenness centrality — they represent architectural bottlenecks where changes have the widest blast radius.

| God Node                     | Location                              | Structural Impact                                                                                                                                                                                      |
| ---------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `handleRequestFinished()`    | `src/js/index.js`                     | **Primary bottleneck.** Single monolithic network request handler dispatching to message services and multiple inline UI state functions. Any new API route requires modifying this function directly. |
| `src/js/index.js` (module)   | `src/js/index.js`                     | **Monolithic root hub.** Holds global state variables, DOM node handles, and network listeners. It is imported by services and helpers that the module itself imports.                                 |
| `showGreatBuldingDonation()` | `src/js/msg/GreatBuildingsService.js` | Central rendering pipeline for Great Building donation calculations. Imports from several other modules.                                                                                               |
| `startupService()`           | `src/js/msg/StartupService.js`        | Primary city initialization path — reads definition data and writes the resulting city statistics.                                                                                                     |
| `checkDebug()`               | `src/js/index.js`                     | Debug logging utility invoked across helpers and message services. Keeping it in `index.js` creates cycles in its importers.                                                                           |

---

## 3. The Triangular Dependency Pattern

All 14 cycles are variations of the same 3-node structural defect:

```
                   ┌───────────────────────────────┐
                   │        src/js/index.js        │
                   │   (State, DOM Handles, Hub)   │
                   └──────────────┬────────────────┘
                                  │           ▲
                1. Imports        │           │ 3. Imports State &
                Services & UI     │           │    DOM Containers
                                  ▼           │
                       ┌─────────────────────────┐
                       │   src/js/msg/*.js       │
                       │   (Message Services)    │
                       └──────────┬──────────────┘
                                  │
                2. Imports        │
                UI Helpers        ▼
                       ┌─────────────────────────┐
                       │    src/js/fn/*.js       │
                       │     (UI Helpers)        │
                       └─────────────────────────┘
```

**Why the pattern emerges:**

1. `index.js` needs to import message services to dispatch intercepted game API messages.
2. Message services (`msg/*.js`) need UI utilities (`fn/*.js`) to render their results.
3. UI utilities need application state and DOM node references — and the only place that has them is `index.js`.

The result is that every `fn/*.js` module that imports _anything_ from `index.js` participates in a cycle with every `msg/*.js` that imports it.

**Why Webpack tolerates it:**
Webpack 5 handles circular ES module imports by deferring binding resolution to runtime (lazy evaluation of circular references). The extension builds and runs correctly — but the coupling is real and creates hidden initialization order dependencies.

---

## 4. All 14 Circular Dependency Cycles — Detailed Breakdown

### 4.1 `checkDebug()` Import Group (7 cycles)

These cycles all share the same root cause: `fn/collapse.js` imports `checkDebug` directly from `../index.js` (line 14: `import { checkDebug } from '..'`), and multiple `msg/*.js` services import `collapse.js`.

| Cycle #  | 3-File Flow                                                                                                    | Import Chain                                                                                                                                            | Root Cause                                                        |
| -------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **4**    | `fn/collapse.js` → `index.js` → `msg/GreatBuildingsService.js` → `fn/collapse.js`                              | `collapse.js:14` imports `checkDebug` from `index.js`. `index.js` imports `GreatBuildingsService.js`. `GreatBuildingsService.js` imports `collapse.js`. | `collapse.js` depends on `checkDebug` defined in root `index.js`. |
| **7**    | `fn/collapse.js` → `index.js` → `msg/ResourceService.js` → `fn/collapse.js`                                    | Same collapse→index import. `index.js` imports `ResourceService.js`. `ResourceService.js` imports `collapse.js`.                                        | Same root — `checkDebug` in `index.js`.                           |
| **8**    | `fn/collapse.js` → `index.js` → `msg/ConversationService.js` → `fn/collapse.js`                                | Same collapse→index import. `index.js` imports `ConversationService.js`. `ConversationService.js` imports `collapse.js`.                                | Same root — `checkDebug` in `index.js`.                           |
| **10**   | `fn/collapse.js` → `index.js` → `msg/GuildExpeditionService.js` → `fn/collapse.js`                             | Same collapse→index import. `index.js` imports `GuildExpeditionService.js`. `GuildExpeditionService.js` imports `collapse.js`.                          | Same root — `checkDebug` in `index.js`.                           |
| **12**   | `fn/collapse.js` → `index.js` → `msg/GuildBattlegroundService.js` → `fn/collapse.js`                           | Same collapse→index import. `index.js` imports `GuildBattlegroundService.js`. `GuildBattlegroundService.js` imports `collapse.js`.                      | Same root — `checkDebug` in `index.js`.                           |
| **14**   | `fn/collapse.js` → `index.js` → `msg/ArmyUnitManagementService.js` → `fn/collapse.js`                          | Same collapse→index import. `index.js` imports `ArmyUnitManagementService.js`. `ArmyUnitManagementService.js` imports `collapse.js`.                    | Same root — `checkDebug` in `index.js`.                           |
| _(var.)_ | Additional cycles with `BonusService.js`, `ClanBattleService.js`, `OtherPlayerService.js`, `StartupService.js` | Same pattern — these services also import `collapse.js`.                                                                                                | Same root.                                                        |

**The single fix that breaks all 7**: Move `checkDebug` and `debugEnabled` out of `index.js` into a standalone `src/js/state/debug.js` module.

---

### 4.2 `copy.js` DOM Import Group (3 cycles)

Root cause: `fn/copy.js` imports `debug` (a DOM node reference) from `../index.js` (line 15: `import { debug } from '../index.js'`).

| Cycle # | 3-File Flow                                                                  | Import Chain                                                                                         | Root Cause                                                             |
| ------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **5**   | `fn/copy.js` → `index.js` → `msg/GreatBuildingsService.js` → `fn/copy.js`    | `copy.js:15` imports DOM node `debug` from `index.js`. `GreatBuildingsService.js` imports `copy.js`. | `copy.js` needs the scratch `debug` DOM element defined in `index.js`. |
| **11**  | `fn/copy.js` → `index.js` → `msg/GuildExpeditionService.js` → `fn/copy.js`   | Same copy→index import. `GuildExpeditionService.js` imports `copy.js`.                               | Same root — `debug` DOM handle in `index.js`.                          |
| **13**  | `fn/copy.js` → `index.js` → `msg/GuildBattlegroundService.js` → `fn/copy.js` | Same copy→index import. `GuildBattlegroundService.js` imports `copy.js`.                             | Same root — `debug` DOM handle in `index.js`.                          |

**The single fix that breaks all 3**: Move the `debug` DOM node reference into a DOM registry module (e.g. `src/js/state/domHandles.js`).

---

### 4.3 `post.js` State Import Group (2 cycles)

Root cause: `fn/post.js` imports `alerts`, `MyInfo`, `url` from `../index.js`.

| Cycle # | 3-File Flow                                                             | Import Chain                                                                                             | Root Cause                                                          |
| ------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **2**   | `fn/post.js` → `index.js` → `msg/ConversationService.js` → `fn/post.js` | `post.js` imports `alerts`, `MyInfo`, `url` from `index.js`. `ConversationService.js` imports `post.js`. | `post.js` needs `alerts` DOM node and player state from `index.js`. |
| **3**   | `fn/post.js` → `index.js` → `msg/OtherPlayerService.js` → `fn/post.js`  | Same post→index import. `OtherPlayerService.js` imports `post.js`.                                       | Same root — player state and DOM node in `index.js`.                |

---

### 4.4 `helper.js` State Import Group (3 cycles)

Root cause: `fn/helper.js` imports `CityEntityDefs`, `donationDIV`, `GameOrigin`, `url` from `../index.js`.

| Cycle # | 3-File Flow                                                                   | Import Chain                                                                                                     | Root Cause                                                            |
| ------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **1**   | `fn/helper.js` → `index.js` → `msg/CityProductionService.js` → `fn/helper.js` | `helper.js` imports `CityEntityDefs` from `index.js`. `CityProductionService.js` imports `helper.js`.            | `helper.js` needs `CityEntityDefs` (static data map) from `index.js`. |
| **6**   | `fn/helper.js` → `index.js` → `msg/GreatBuildingsService.js` → `fn/helper.js` | `helper.js` imports `donationDIV`, `GameOrigin` from `index.js`. `GreatBuildingsService.js` imports `helper.js`. | `helper.js` needs DOM handle `donationDIV` and player origin.         |
| **9**   | `fn/helper.js` → `index.js` → `msg/ConversationService.js` → `fn/helper.js`   | `helper.js` imports `url`, `GameOrigin` from `index.js`. `ConversationService.js` imports `helper.js`.           | `helper.js` needs global state from `index.js`.                       |

---

### 4.5 Secondary Inter-Module Coupling Cycles

Additional cross-boundary cycles not following the standard triangular pattern:

| Cycle                                       | Flow          | Import                                                                                                          |
| ------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------- |
| `post.js` → `GuildBattlegroundService.js`   | Direct import | `post.js` imports `GBGdata` directly from `msg/GuildBattlegroundService.js`.                                    |
| `helper.js` → `ResourceService.js`          | Direct import | `helper.js` imports `ResourceNames` from `msg/ResourceService.js`.                                              |
| `helper.js` → `GuildBattlegroundService.js` | Direct import | `helper.js` imports `BattlegroundPerformance`, `BGtime`, `GuildMembers` from `msg/GuildBattlegroundService.js`. |

These are resolved by the `src/js/constants/gameData.js` extraction strategy (Strategy 3 below).

---

## 5. Recommended Refactoring Strategies

### Strategy 1: Extract Debug Utility — `src/js/state/debug.js`

**Priority: HIGH (Quick Win)**  
**Cycles Broken: 7+ (all `checkDebug` group)**  
**Complexity: Low**

Create a new module containing only the debug flag and utility function:

```javascript
// src/js/state/debug.js
export let debugEnabled = false;

export function checkDebug(msg) {
  if (debugEnabled) console.log('[FoE-Info]', msg);
}

export function setDebugEnabled(value) {
  debugEnabled = value;
}
```

**Import changes required:**

| File                                             | Before                                     | After                                            |
| ------------------------------------------------ | ------------------------------------------ | ------------------------------------------------ |
| `src/js/fn/collapse.js:14`                       | `import { checkDebug } from '..'`          | `import { checkDebug } from '../state/debug.js'` |
| `src/js/fn/copy.js`                              | `import { checkDebug } from '../index.js'` | `import { checkDebug } from '../state/debug.js'` |
| `src/js/msg/*.js` (any that import `checkDebug`) | `import { checkDebug } from '../index.js'` | `import { checkDebug } from '../state/debug.js'` |

`index.js` re-exports for backwards compatibility:

```javascript
export { checkDebug, debugEnabled, setDebugEnabled } from './state/debug.js';
```

---

### Strategy 2: Extract App State Container — `src/js/state/appState.js`

**Priority: HIGH**  
**Cycles Broken: All `helper.js` and `post.js` group cycles (5+)**  
**Complexity: Medium**

Create a state module holding all shared player state and DOM node references:

```javascript
// src/js/state/appState.js
export let MyInfo = {};
export let GameOrigin = '';
export let EpocTime = 0;
export let url = '';
export let CityEntityDefs = {};
export let hiddenRewards = [];

// DOM Container Registry
export let donationDIV = null;
export let incidents = null;
export let alerts = null;
export let debug = null;

// Setters (for initialization from index.js)
export function setMyInfo(info) {
  MyInfo = info;
}
export function setDomHandles({ donationDIV: d, incidents: i, alerts: a, debug: db }) {
  donationDIV = d;
  incidents = i;
  alerts = a;
  debug = db;
}
```

**Import changes required:**

| File                                | Symbol(s)                                                             | Change                   |
| ----------------------------------- | --------------------------------------------------------------------- | ------------------------ |
| `src/js/fn/helper.js`               | `CityEntityDefs`, `donationDIV`, `GameOrigin`, `url`, `hiddenRewards` | → `../state/appState.js` |
| `src/js/fn/post.js`                 | `alerts`, `MyInfo`, `url`                                             | → `../state/appState.js` |
| `src/js/fn/copy.js`                 | `debug`                                                               | → `../state/appState.js` |
| `src/js/msg/*.js` (state consumers) | `MyInfo`, `GameOrigin`, `EpocTime`, `url`                             | → `../state/appState.js` |

---

### Strategy 3: Extract Shared Game Data — `src/js/constants/gameData.js`

**Priority: MEDIUM**  
**Cycles Broken: All secondary inter-module cycles**  
**Complexity: Medium**

Move shared data structures that are currently exported from `msg/*.js` but imported by `fn/*.js`:

```javascript
// src/js/constants/gameData.js
export let ResourceNames = {}; // moved from ResourceService.js
export let GBGdata = {}; // moved from GuildBattlegroundService.js
export let BattlegroundPerformance = {}; // moved from GuildBattlegroundService.js
export let BGtime = 0; // moved from GuildBattlegroundService.js
export let GuildMembers = []; // moved from GuildBattlegroundService.js
```

**Import changes required:**

| File                                     | Symbol(s)                                                            | Change                                 |
| ---------------------------------------- | -------------------------------------------------------------------- | -------------------------------------- |
| `src/js/fn/helper.js`                    | `ResourceNames`, `BattlegroundPerformance`, `BGtime`, `GuildMembers` | → `../constants/gameData.js`           |
| `src/js/fn/post.js`                      | `GBGdata`                                                            | → `../constants/gameData.js`           |
| `src/js/msg/ResourceService.js`          | `ResourceNames` (re-exports from gameData)                           | Import from `../constants/gameData.js` |
| `src/js/msg/GuildBattlegroundService.js` | `GBGdata`, `BattlegroundPerformance`, etc.                           | Import from `../constants/gameData.js` |

---

### Strategy 4: Refactor `handleRequestFinished()` into a Router Registry

**Priority: LOW (architectural improvement)**  
**Cycles Broken: None directly (reduces god node complexity)**  
**Complexity: High**

Split the 47-edge monolithic dispatcher into a declarative route map:

```javascript
// src/js/dispatch/requestRouter.js
import { armyUnitManagementService } from '../msg/ArmyUnitManagementService.js';
import { startupService } from '../msg/StartupService.js';

// ... all service imports

export const ROUTE_MAP = {
  'StartupService.getData': (msg) => startupService(msg),
  'ArmyUnitManagementService.getArmyInfo': (msg) => armyUnitManagementService(msg),
  'GreatBuildingsService.getConstruction': (msg) => getConstruction(msg),
  // ... all 54+ routes
};

export function dispatch(requestClass, requestMethod, msg) {
  const key = `${requestClass}.${requestMethod}`;
  const handler = ROUTE_MAP[key];
  if (handler) handler(msg);
}
```

**Impact**: Reduces `index.js` from a 1900-line monolith to a lean initialization and listener registration file. Enables individual route handler unit testing.

---

## 6. Refactoring Roadmap & Priority Order

### Phase 1 — Quick Win: Debug Utility Extraction (1–2 hours)

> **Break 7+ cycles with the smallest possible change.**

1. Create `src/js/state/debug.js` with `debugEnabled` and `checkDebug()`.
2. Update `src/js/fn/collapse.js` import (1 line change).
3. Update any `msg/*.js` files importing `checkDebug` from `index.js`.
4. Add re-export in `index.js` for backwards compatibility.
5. Run `mise run build` — verify exit code 0.
6. Run `mise run graphify-update` — verify cycle count drops by 7+.

**Expected post-Phase 1 cycle count**: ≤ 7 remaining cycles.

---

### Phase 2 — State Container Extraction (4–6 hours)

> **Break all remaining `helper.js` and `post.js` group cycles.**

1. Create `src/js/state/appState.js` with all shared state and DOM registry.
2. In `index.js`, initialize DOM handles after `DOMContentLoaded` and call `setDomHandles(...)`.
3. Update `fn/helper.js`, `fn/post.js`, `fn/copy.js` imports.
4. Update all `msg/*.js` state consumers.
5. Run `mise run build` — verify exit code 0.
6. Verify no runtime errors (DOM references initialized before first use).

**Expected post-Phase 2 cycle count**: ≤ 3 remaining cycles (secondary inter-module only).

---

### Phase 3 — Game Data Constants Extraction (2–4 hours)

> **Eliminate all secondary inter-module coupling cycles.**

1. Create `src/js/constants/gameData.js` with shared data structures.
2. Update `ResourceService.js` and `GuildBattlegroundService.js` to import/re-export from `gameData.js`.
3. Update `fn/helper.js` and `fn/post.js` to import from `gameData.js`.
4. Run `mise run build` — verify exit code 0.
5. Run `mise run graphify-update` — verify 0 circular cycles.

**Expected post-Phase 3 cycle count**: **0 cycles**.

---

### Phase 4 — Router Registry Refactor (1–2 days, optional)

> **Architectural improvement — reduces god node complexity.**

1. Create `src/js/dispatch/requestRouter.js` with full `ROUTE_MAP`.
2. Reduce `handleRequestFinished()` in `index.js` to a thin dispatcher calling `requestRouter.dispatch(...)`.
3. Migrate all inline handlers into dedicated small handler modules or keep as inline closures in `requestRouter.js`.
4. Run `mise run build` — verify exit code 0.
5. Conduct smoke test in Chrome Extension DevTools environment.

---

## 7. Refactored Module Dependency Graph (Target State)

After all 4 phases, the dependency graph should be fully acyclic:

```
                               ┌──────────────────────────────┐
                               │  src/js/state/appState.js    │
                               │  (Shared State & DOM Refs)   │
                               └──────────────▲───────────────┘
                                              │
                    ┌─────────────────────────┴────────────────────────┐
                    │                                                  │
       ┌────────────┴─────────────┐                       ┌────────────┴─────────────┐
       │   src/js/state/debug.js  │                       │ src/js/constants/        │
       │   (debugEnabled,         │                       │ gameData.js              │
       │    checkDebug)           │                       │ (ResourceNames, GBGdata) │
       └────────────▲─────────────┘                       └────────────▲─────────────┘
                    │                                                  │
        ┌───────────┴─────────────┐                        ┌───────────┴─────────────┐
        │     src/js/fn/*.js      │                        │     src/js/msg/*.js     │
        │      (UI Helpers)       │◄───────────────────────│   (Message Services)    │
        └───────────▲─────────────┘                        └───────────▲─────────────┘
                    │                                                  │
                    └─────────────────────────┬────────────────────────┘
                                              │
                               ┌──────────────┴───────────────┐
                               │       src/js/index.js        │
                               │  (Listener Registration &    │
                               │   Route Dispatch)            │
                               └──────────────────────────────┘
```

All data flow is now strictly downward (or sideways between peer layers). No module in `fn/` or `msg/` has any upward dependency on `index.js`.

---

## 8. Verification Methodology

### 8.1 Pre-Refactor Baseline

```bash
# Verify current cycle count from graphify report
grep -c "Cycle" graphify-out/GRAPH_REPORT.md

# Confirm current build baseline
mise run build
echo "Build exit code: $?"
```

### 8.2 Post-Refactor Verification

After each phase:

```bash
# 1. Run Webpack build
mise run build
# Expected: exit code 0

# 2. Update graphify knowledge graph
mise run graphify-update

# 3. Check circular cycles in new graph report
grep "circular" graphify-out/GRAPH_REPORT.md
# Expected after Phase 3: no circular cycles reported

# 4. Check god node edge counts
grep "handleRequestFinished" graphify-out/GRAPH_REPORT.md
# Expected after Phase 4: reduced from 47 edges

# 5. Check community cohesion for index.js
grep "cohesion" graphify-out/GRAPH_REPORT.md
# Expected: improved from 0.07
```

### 8.3 Runtime Smoke Test

After refactoring, test in Chrome Extension DevTools:

1. Load the unpacked extension from `build/FoE-Info-DEV/`.
2. Navigate to a Forge of Empires game session.
3. Verify `#citystats` panel populates on `StartupService.getData`.
4. Verify GB donation calculator renders on `GreatBuildingsService.getConstruction`.
5. Verify collapse/expand toggles work for all 33 panels.
6. Verify clipboard copy functions produce correct formatted output.

### 8.4 Invalidation Conditions

The 0-cycle claim becomes invalid if:

- Any new `fn/*.js` module is added that imports from `index.js` directly (instead of from `state/appState.js`).
- Any new `msg/*.js` service imports `checkDebug` from `index.js` (instead of `state/debug.js`).
- The router registry in Phase 4 introduces new cross-layer imports.

> [!TIP]
> Add a CI lint rule (e.g. `eslint-plugin-import` with `no-cycle`) to enforce the acyclic constraint going forward.

---

## 9. Quick Reference: Import Changes Summary

| File             | Symbol                                                                | Current Import Source                  | Target Import Source         |
| ---------------- | --------------------------------------------------------------------- | -------------------------------------- | ---------------------------- |
| `fn/collapse.js` | `checkDebug`                                                          | `'../index.js'`                        | `'../state/debug.js'`        |
| `fn/copy.js`     | `debug`                                                               | `'../index.js'`                        | `'../state/appState.js'`     |
| `fn/copy.js`     | `checkDebug`                                                          | `'../index.js'`                        | `'../state/debug.js'`        |
| `fn/helper.js`   | `CityEntityDefs`, `donationDIV`, `GameOrigin`, `url`, `hiddenRewards` | `'../index.js'`                        | `'../state/appState.js'`     |
| `fn/helper.js`   | `ResourceNames`                                                       | `'../msg/ResourceService.js'`          | `'../constants/gameData.js'` |
| `fn/helper.js`   | `BattlegroundPerformance`, `BGtime`, `GuildMembers`                   | `'../msg/GuildBattlegroundService.js'` | `'../constants/gameData.js'` |
| `fn/post.js`     | `alerts`, `MyInfo`, `url`                                             | `'../index.js'`                        | `'../state/appState.js'`     |
| `fn/post.js`     | `GBGdata`                                                             | `'../msg/GuildBattlegroundService.js'` | `'../constants/gameData.js'` |
| `msg/*.js`       | `checkDebug`                                                          | `'../index.js'`                        | `'../state/debug.js'`        |
| `msg/*.js`       | `MyInfo`, `GameOrigin`, `EpocTime`, `url`                             | `'../index.js'`                        | `'../state/appState.js'`     |
