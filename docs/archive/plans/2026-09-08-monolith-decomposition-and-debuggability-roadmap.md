# Master Roadmap: Monolith Decomposition & Ubiquitous Debuggability

This roadmap governs the ongoing and future refactoring of the remaining monolithic anchors (`StartupService.js`, `index.js`, `GreatBuildingsService.js`, `helper.js`, `GuildBattlegroundService.js`) and mandates that **all future features and extracted services are debuggable by design**.

---

## 1. The Core Architectural Invariants

Every future task, extracted service, calculation engine, or UI renderer must adhere to these invariants:

1. **Hard Module Cap**: Maximum 250–300 lines per module (hard ceiling 600 lines).
2. **Dual Operating Modes (Standard vs. Debugging)**:
   - **Standard Mode (Default)**: 100% silent. Zero extraneous console logs, zero performance overhead.
   - **Debugging Mode (Toggled via Header Logo Icon)**: Verbose, structured diagnostics covering:
     - Inbound RPC envelopes & parsed entity counts.
     - Pure mathematical computations & intermediate steps.
     - Cache reads, writes, hits, misses, and invalidations.
     - Async fetch resolutions and storage synchronization.
     - UI panel re-renders, filter toggles, and state bindings.
     - Potential race conditions or ordering dependencies.
3. **Unified Logging Pipeline**:
   - Every module instantiates a scoped logger:
     ```javascript
     import { createLogger } from '../utils/logger.js';

     const logger = createLogger('ModuleName');
     ```
   - All logs flow through `logger.js` which emits tagged `[FoE-Info:ModuleName]` entries directly into the DevTools panel console.
   - This ensures full visibility for both human users and external AI assistants.
4. **Zero Static Metadata**: All entity definitions are resolved dynamically at runtime via `MetadataStore`.
5. **BigNumber Precision**: All FP math, Arc boosts, and reward scaling use `bignumber.js` with `BigNumber.ROUND_HALF_UP`.
6. **5-Stage Verification Gate**: Every increment must pass `npm test`, `npm run check`, `npm run lint`, `npm run typecheck`, and `npm run build:dev`.

---

## 2. Monolith Decomposition Phases & Debug Instrumentation

```text
Phase A: Leaf Calculators & UI Views (Current)
  ├── Task A.1: gbgProvinceView.js (Brief 12) + [FoE-Info:GbgProvinceView]
  ├── Task A.2: gbOverviewCard.js (Brief 13) + [FoE-Info:GbOverviewCard]
  └── Task A.3: panelDispatcher.js (Brief 14) + [FoE-Info:PanelDispatcher]

Phase B: InnoGames RPC Extraction from StartupService.js (2,334 lines)
  ├── Task B.1: SettlementService.js + [FoE-Info:SettlementService]
  ├── Task B.2: QuestService.js + [FoE-Info:QuestService]
  ├── Task B.3: InventoryRpcService.js + [FoE-Info:InventoryRpcService]
  └── Task B.4: CastleSystemRpcService.js + [FoE-Info:CastleSystemRpcService]

Phase C: Legacy Helper Disbandment (helper.js - 993 lines)
  ├── Task C.1: dateUtils.js (Customizable date formatting) + [FoE-Info:DateUtils]
  ├── Task C.2: stringFormatters.js + [FoE-Info:StringFormatters]
  └── Task C.3: domSanitizer.js + [FoE-Info:DomSanitizer]

Phase D: Orchestrator Thinning (index.js -> <= 80 lines)
  ├── Task D.1: eventWireup.js (DOM and shortcut listeners) + [FoE-Info:EventWireup]
  ├── Task D.2: storageSync.js (Preference persistence) + [FoE-Info:StorageSync]
  └── Task D.3: Pure routing bootstrap in index.js
```

---

## 3. Phase Details & Debug Specifications

### Phase A: Remaining View & Math Extractions

#### Task A.1: GBG Province & Leaderboard View Extraction (Brief 12)

- **Source**: `src/js/msg/GuildBattlegroundService.js` (811 lines)
- **Target**: `src/js/ui/gbgProvinceView.js` (<= 250 lines)
- **Extracted Logic**: `buildProvinceTableHTML()`, `buildLeaderboardHTML()`
- **Debug Instrumentation**:
  ```javascript
  const logger = createLogger('GbgProvinceView');
  logger.debug('Rendering province table', {
    provinceId: provinceData.id,
    buildingCount: provinceData.buildings?.length,
  });
  logger.debug('Rendering participant leaderboard', {
    participantCount: participants?.length,
  });
  ```
- **Test**: `tests/ui/gbg-province-view.test.mjs`

#### Task A.2: Great Buildings Overview Card Extraction (Brief 13)

- **Source**: `src/js/msg/GreatBuildingsService.js` (672 lines)
- **Target**: `src/js/ui/gbOverviewCard.js` (<= 250 lines)
- **Extracted Logic**: `renderGbOverviewCard(gbData, options)`
- **Debug Instrumentation**:
  ```javascript
  const logger = createLogger('GbOverviewCard');
  logger.debug('Generating overview card', {
    gbId: gbData.id,
    level: gbData.level,
    currentFp: gbData.current_progress,
  });
  ```
- **Test**: `tests/ui/gb-overview-card.test.mjs`

---

### Phase B: StartupService.js Decomposition

#### Task B.1: Settlement & Outpost RPC Service Extraction

- **Source**: `src/js/msg/StartupService.js`
- **Target**: `src/js/msg/SettlementService.js` (<= 250 lines)
- **Extracted Methods**: `CityProductionService.getOutpostCity`, settlement goods, building timelines.
- **Debug Instrumentation**:
  ```javascript
  const logger = createLogger('SettlementService');
  logger.debug('Outpost payload received', {
    era: data.eraId,
    buildings: data.city_map?.entities?.length,
  });
  ```
- **Test**: `tests/msg/settlement-service.test.mjs`

#### Task B.2: Quest & Story Progress Service Extraction

- **Source**: `src/js/msg/StartupService.js`
- **Target**: `src/js/msg/QuestService.js` (<= 250 lines)
- **Extracted Methods**: `QuestService.getUpdates`, recurring quests, story conditions.
- **Debug Instrumentation**:
  ```javascript
  const logger = createLogger('QuestService');
  logger.debug('Quest update received', {
    activeQuests: data.quests?.length,
    state: data.state,
  });
  ```
- **Test**: `tests/msg/quest-service.test.mjs`

---

### Phase C: Helper Disbandment & Date Formatting Parity

#### Task C.1: Centralized Date & Time Engine (`src/js/utils/date.js`)

- **Context**: Replace scattered `toLocaleString()` calls across Blue Galaxy, GB Info, and timers with user-customizable date formatting (European `DD.MM.YYYY HH:mm:ss`, US, ISO, 24h).
- **Target**: `src/js/utils/date.js` (<= 200 lines)
- **Debug Instrumentation**:
  ```javascript
  const logger = createLogger('DateUtils');
  logger.debug('Formatting timestamp', {
    timestamp,
    format: currentFormatPattern,
    result,
  });
  ```
- **Test**: `tests/utils/date.test.mjs`

---

## 4. Subagent Delegation Checklist for Future Tasks

When delegating tasks from this roadmap to subagents:

- [ ] Include the **Debuggability Invariant** in the prompt:
  > "Ensure the target module imports `createLogger` from `src/js/utils/logger.js`, emits detailed diagnostics in debug mode, and stays silent in standard mode."
- [ ] Specify isolated git worktrees: `Workspace: "share"` when running parallel tasks.
- [ ] Verify test coverage with characterization tests before and unit tests after extraction.
- [ ] Execute `npm run verify` to confirm the full gate passes before completion.
