# Context-Driven Panel Visibility Engine & Ephemeral Lifecycle Plan

**Author:** Antigravity & OpenCode  
**Date:** 2026-09-12  
**Target Branch:** `feat/context-view-engine` (OpenCode) & `feat/goods-and-panel-lifecycle` (Antigravity) $\to$ `development`  
**Status:** Approved for Parallel Execution

---

## 1. Problem Statement & Objectives

### The Issue

1. **Destructive DOM Clearing:** The legacy implementation in `src/js/ui/panelDispatcher.js` (`clearForMainCity`, `clearForBattleground`, `clearExpedition`, `clearVisitPlayer`, `clearCultural`) relied on wiping `innerHTML = ''` across containers. This destroyed in-memory DOM event listeners, broke scroll state, caused layout thrashing, and led to erratic panel respawns.
2. **Goods Inventory Zombie Lifecycle:** Goods Inventory (`#goods`) unlocks when opening the Marketplace or Inventory, but never locks back when dismissed by the user (`.btn-close`). Consequently, subsequent game harvests, production pickups, or city map entity loads cause `#goods` to respawn unwanted.
3. **Context Leakage:** Panels belonging to one context (e.g. GBG target generators, city harvest tables, or cultural settlement timers) bleed across different screens or stick around when switching game modes.

### The Objectives

1. **Declarative 6-Context Engine:** Replace destructive clearing with declarative visibility filtering in `src/js/ui/cardVisibility.js` (and typed mirror `cardVisibility.ts`) supporting 6 explicit game views:
   - `OWN_CITY` (default)
   - `GBG` (Guild Battlegrounds)
   - `GE` (Guild Expedition 1–5)
   - `QI` (Quantum Incursions map & settlement)
   - `SETTLEMENT` (Cultural settlements)
   - `OTHER_PLAYER` (Visiting neighbors/friends/guildmates)
2. **Deterministic RPC Signatures:** Ground context transitions in verified InnoGames JSON-RPC packets extracted from live HAR captures (39 sessions, 88 unique RPCs).
3. **Controlled Goods Lifecycle:** Extract `renderGoodsPanel.js` from `ResourceService.js` (thinning it $\le 380$ lines), implement `isGoodsPanelUnlocked()`, `lockGoodsPanel()`, `unlockGoodsPanel()`, bind `.btn-close` dismiss logic, and isolate `#goods` rendering strictly to `OWN_CITY` when unlocked.

---

## 2. InnoGames JSON-RPC Trigger Matrix

Based on live captures in `../metadata-store/extracts/rpc/`:

| Context View       | Primary InnoGames RPC Trigger                                                                     | Payload Discriminator / Signature                                                      | Allowed Panels                                                                        |
| :----------------- | :------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------ |
| **`OWN_CITY`**     | `StartupService.getData`<br>`CityMapService.getEntities`                                          | `gridId: "main"`<br>Entities include `main_building`, `friends_tavern`, `off_grid`     | City Stats, Army, Rewards, Incidents, GB Suite, Blue Galaxy, Guild Overview, Treasury |
| **`GBG`**          | `GuildBattlegroundService.getBattleground`<br>`GuildBattlegroundStateService.getState`            | `league`, `battlegroundParticipants`, `activeTrial`                                    | Header, Army, Rewards, Target Generator, Battlegrounds Changes, GBG Leaderboard       |
| **`GE`**           | `GuildExpeditionService.getOverview`                                                              | GE trial state & difficulty encounters                                                 | Header, Army, Rewards, GE Championship, GE Contributions                              |
| **`QI`**           | `GuildRaidsMapService.getOverview`<br>`GuildRaidsService.getState`<br>`CityMapService.getCityMap` | `gridId: "guild_raids"`<br>`choiceNodeRoutes`, `raidInstance`                          | Quantum Contributions, Quantum Leaderboard (and future QI Overview / Targets)         |
| **`SETTLEMENT`**   | `CityMapService.getCityMap`<br>`OutpostService.startEraOutpost`                                   | `gridId: "cultural_outpost"`<br>Primary resources (e.g. `doubloons`, `kava`, `barley`) | Cultural Settlement Panel (`#cultural`) only                                          |
| **`OTHER_PLAYER`** | `OtherPlayerService.visitPlayer`                                                                  | Payload has `other_player` (`player_id`, `name`, `score`, `rank`), `city_name`         | Visited City Stats, Visited GB Lock Helper                                            |

---

## 3. Parallel Workstreams & Division of Labor

```text
                                [development (12d3819)]
                                           │
             ┌─────────────────────────────┴─────────────────────────────┐
             ▼                                                           ▼
 [Worktree: feat-context-engine]                             [Worktree: feat-goods-lifecycle]
           (OpenCode)                                                  (Antigravity)
 1. CONTEXT_ALLOWED_PANELS matrix                            1. Extract renderGoodsPanel.js (<=250 lines)
 2. Wire setCurrentView(context) in routes:                  2. Thin ResourceService.js (580 -> <=380 lines)
    - combatRoutes (GBG, GE)                                 3. Add isGoodsUnlocked / lockGoods / unlockGoods
    - quantumRoutes (QI)                                     4. Wire .btn-close dismiss listener on #goods
    - cityRoutes (OWN_CITY via getEntities)                  5. Guard: suppress render unless unlocked
    - socialRoutes (OTHER_PLAYER via visitPlayer)            6. Add resource-market-trigger.test.mjs
 3. Replace destructive panelDispatcher clears
 4. Add context-view-filtering.test.mjs
             └─────────────────────────────┬─────────────────────────────┘
                                           ▼
                               [Merge back to development]
                                 Full 5-stage gate verify
```

---

## 4. Workstream 1: OpenCode Protocol & 6-Context Engine

### Target Worktree & Branch

- **Worktree:** `.worktrees/feat-context-engine`
- **Branch:** `feat/context-view-engine`

### Tasks

1. **`src/js/ui/cardVisibility.js` & `cardVisibility.ts`**:
   - Define canonical `CONTEXT_ALLOWED_PANELS` map for all 6 contexts (`OWN_CITY`, `GBG`, `GE`, `QI`, `SETTLEMENT`, `OTHER_PLAYER`).
   - Expand `setCurrentView(view)` to validate against the 6 contexts and trigger `applyCardVisibility()`.
   - Update `applyCardVisibility()` to hide panels not permitted in the current context (unless Debug Mode is active).
2. **Protocol Route Wiring**:
   - `src/js/protocol/routes/combatRoutes.js`:
     - On `GuildBattlegroundService.getBattleground` / `getState` $\to$ call `setCurrentView('GBG')`.
     - On `GuildExpeditionService.getOverview` $\to$ call `setCurrentView('GE')`.
   - `src/js/protocol/routes/quantumRoutes.js`:
     - On `GuildRaidsMapService.getOverview` / `GuildRaidsService.getState` $\to$ call `setCurrentView('QI')`.
   - `src/js/protocol/routes/cityRoutes.js`:
     - On `CityMapService.getEntities` $\to$ call `setCurrentView('OWN_CITY')`.
     - On `CityMapService.getCityMap` $\to$ check `gridId`: if `'cultural_outpost'` $\to$ `setCurrentView('SETTLEMENT')`; if `'guild_raids'` $\to$ `setCurrentView('QI')`; if `'city'` or `'main'` $\to$ `setCurrentView('OWN_CITY')`.
   - `src/js/protocol/routes/socialRoutes.js`:
     - On `OtherPlayerService.visitPlayer` $\to$ call `setCurrentView('OTHER_PLAYER')`.
3. **Refactor `panelDispatcher.js` & `panelDispatcher.ts`**:
   - Transition `clearForMainCity`, `clearForBattleground`, `clearExpedition`, `clearVisitPlayer`, `clearCultural` away from destructive `innerHTML = ''` to non-destructive delegation to `setCurrentView(context)`.
4. **Unit Testing**:
   - Create `tests/ui/context-view-filtering.test.mjs` verifying view transitions and allowed/blocked panels across all 6 contexts.

---

## 5. Workstream 2: Antigravity Presentation & Ephemeral Goods Lifecycle

### Target Worktree & Branch

- **Worktree:** `.worktrees/feat-goods-lifecycle`
- **Branch:** `feat/goods-and-panel-lifecycle`

### Tasks

1. **Create `src/js/ui/renderGoodsPanel.js`** ($\le 250$ lines):
   - Extract the goods table rendering DOM logic from `ResourceService.js` (`fshowResources`).
   - Create scoped logger: `createLogger('GoodsPanel')`.
2. **Thin `src/js/msg/ResourceService.js`** ($580 \to \le 380$ lines):
   - Add state management: `isGoodsPanelUnlocked()`, `unlockGoodsPanel()`, `lockGoodsPanel()`.
   - In `fshowResources`, guard execution: if `!isGoodsPanelUnlocked()` and not in debug mode, do NOT render or unhide `#goods`.
   - Re-export `renderGoodsPanel` for backward compatibility.
3. **Ephemeral Close & Dismiss Listeners**:
   - Attach click listener to `.btn-close` inside `#goods`: clicking `x` calls `lockGoodsPanel()` and clears `#goods.innerHTML`.
   - Add dismissal listeners to GBG, GE, and QI cards so users can dismiss cards cleanly.
4. **Unit Testing**:
   - Create `tests/msg/resource-market-trigger.test.mjs` asserting unlock on trade offers, suppression on raw resource bags, and locking on close.

---

## 6. Verification & Quality Gates

1. **Unit Suites:**
   - `npm test tests/ui/context-view-filtering.test.mjs`
   - `npm test tests/msg/resource-market-trigger.test.mjs`
   - `npm test` (all 922+ tests green)
2. **TypeScript:**
   - `npm run typecheck` (`tsc --noEmit`) exit 0 with 0 errors.
3. **Full 5-Stage Gate:**
   - `npm run verify` exit 0 (prettier, eslint, i18n parity, test, build:dev).
4. **Knowledge Graph Sync:**
   - `npm run graph:foe-info:ast`
