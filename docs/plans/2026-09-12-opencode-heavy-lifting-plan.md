# OpenCode Heavy Lifting Execution Plan (Post-Audit Implementation)

**Date**: 2026-09-12  
**Harness**: OpenCode Session Execution  
**Architectural Baseline**: Quad-Graph Audit & `LESSONS.md` Consensus (`06dc680`)  
**Methodology**: `codebase-modernization-planner`, `using-git-worktrees`, `modular-architecture`, `small-incremental-changes`, `verification-before-completion`

---

## 1. Executive Summary & Heavy Lifting Mandate

The quad-graph exploration confirmed that **FoE-Info is architecturally ahead of all peers**, but identified two critical correctness bugs (D1, D2) and two oversized single-function monoliths (`legacyBridge.js` at 831L and `CityMapEntityProcessor.js` at 657L).

This plan structures the implementation into **three sequential, high-impact tracks** for OpenCode to execute using isolated Git worktrees:

```text
                                  [ development ]
                              (826/826 Passing Tests)
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        ▼                                ▼                                ▼
    [Track 1]                        [Track 2]                        [Track 3]
OpenCode Session 1               OpenCode Session 2               OpenCode Session 3
(P0 Correctness & Safety)        (P1 Monolith Decomposition)      (P1/P2 Feature Parity)
.worktrees/opencode-safety       .worktrees/opencode-monolith     .worktrees/opencode-features
feat/opencode-safety-fixes       feat/opencode-monolith-decomp    feat/opencode-feature-parity
        │                                │                                │
 ├── Fix D1 Resource Lookup       ├── Decompose CityMapProcessor   ├── Blue Galaxy Economic
 │   (formatters.js + callers)    │   (657L -> <300L, DOM-pure)    │   Ranking (FP + Goods)
 ├── Fix D2 Duplicate RPCs        ├── Decompose legacyBridge       ├── Date Engine Completion
 │   (legacyBridge vs regSvc)     │   (831L -> <200L modular)      │   (Intl tokens & migrate
 └── Fix D4 / Add Typecheck       └── Fix D3 Calc Inversions       │    30 toLocale* sites)
                                      (CastleSystem injection)     └── Pin Lineage Fixtures
        │                                │                                │
        └────────────────────────────────┼────────────────────────────────┘
                                         ▼
                            [Antigravity Integration Gate]
                             - Sequential branch merge
                             - Verification gate: npm run verify
                             - AST Re-index: npm run graph:foe-info:ast
```

---

## 2. Track 1: Correctness & Safety Invariants (P0 — Immediate)

**Worktree**: `.worktrees/opencode-safety`  
**Branch**: `feat/opencode-safety-fixes`  
**Target Time**: ~30–45 minutes  
**Blast Radius**: < 80 lines total

### Task 1.1: Fix D1 Resource-Name Parity Regression

- **Problem**: `fResourceShortName(name, lookup = null)` in `src/js/utils/formatters.js` defaults `lookup` to `null`. All 8 callers across `CityProductionService.js:47,71`, `RewardRenderer.js:92,232`, `panelDispatcher.js:429`, and `gbgProvinceView.js:106` pass only 1 argument. Generic resources render as raw keys (e.g. `raw_iron`).
- **Solution**:
  1. In `src/js/utils/formatters.js`, when `lookup` is not provided, fall back dynamically to `globalThis.ResourceNames` or bind runtime dictionary.
  2. In `src/js/fn/helper.js`, ensure the re-exported `fResourceShortName` binds `ResourceNames` from `state.js` before delegating.
  3. Add regression test in `tests/utils/formatters.test.mjs` verifying that calling `fResourceShortName('raw_iron')` without a second argument properly resolves when the runtime store is populated.

### Task 1.2: Fix D2 Duplicate RPC Handler Registrations

- **Problem**: `registerServices.js` and `legacyBridge.js` both register:
  - `EmissaryService.getOverview` & `getAssigned`
  - `BoostService.getAllBoosts`
  - `OutpostService.getAll`
    `MessageDispatcher.register()` silently creates a combined handler that executes both, risking double side effects.
- **Solution**:
  1. Audit which handler is authoritative (the modern `registerServices.js` modules).
  2. Remove the duplicate registrations from `src/js/protocol/legacyBridge.js`.
  3. Add a unit test in `tests/protocol/service-registration.test.mjs` asserting that every registered RPC key in `MessageDispatcher` maps to exactly one handler without silent chaining.

### Task 1.3: Clean Up D4 Orphaned `webRequestFilter.js` & Add `typecheck` Gate (D5)

- **Problem**: `webRequestFilter.js` has zero callers and its manifest permission was dropped. `npm run verify` does not run `tsc --noEmit`, allowing `.js` and `.ts` mirrors to drift.
- **Solution**:
  1. Remove `webRequestFilter.js` or document that modern MV3 panel context uses direct fetch without header manipulation.
  2. In `package.json`, update `"verify"` to `"npm run typecheck && npm run lint && npm run test && npm run build:dev"`.

---

## 3. Track 2: Monolith Decomposition & Purity (P1 — Core Heavy Lifting)

**Worktree**: `.worktrees/opencode-monolith`  
**Branch**: `feat/opencode-monolith-decomp`  
**Target Time**: ~1.5–2 hours

### Task 2.1: Decompose `CityMapEntityProcessor.js` (657 lines $\to < 300$ lines)

- **Status**: The safest decomposition target in the codebase (pure function, leaf node, betweenness only 6,540).
- **Solution**:
  1. Extract the entity readiness, collection time formatting, and special goods extraction logic (lines 43–350) into `src/js/calc/entities/CityEntityHarvestCalculator.js` (~220 lines).
  2. Leave `processCityMapEntities()` in `CityMapEntityProcessor.js` as an orchestrator ($\le 250$ lines) that loops through entities and delegates harvest evaluation.
  3. Verify zero changes to math formulas; verify clean run of `tests/calc/city-map-entity-processor.test.mjs`.

### Task 2.2: Decompose `legacyBridge.js` (831 lines $\to < 200$ lines)

- **Status**: The largest file in the workspace; spans 817 lines in a single function with 71 `dispatcher.register` calls.
- **Solution**:
  1. Partition into domain route tables under `src/js/protocol/routes/`:
     - `combatRoutes.js` (GBG, signals, army units, GE)
     - `cityRoutes.js` (City map entities, production, incidents, quests, outposts)
     - `socialRoutes.js` (Other players, clan members, ignore list, conversations)
     - `buildingRoutes.js` (Great Buildings, donations, blueprints)
  2. `registerLegacyBridge(dispatcher, handlers)` simply invokes these four registrars, preserving exact argument passing and backward compatibility.
  3. Verify all 6 protocol test suites pass without modification.

### Task 2.3: Fix D3 Calc Dependency Inversion

- **Problem**: `src/js/calc/VisitedCityStatsCalculator.js:21` imports `{ castleSystemService }` from `../msg/CastleSystemService.js` (calc $\to$ msg inversion), and `gbNaming.js` reads `globalThis.CityEntityDefs`.
- **Solution**:
  1. Pass the castle boost lookup function as an injected parameter into `VisitedCityStatsCalculator`, decoupling it from the RPC singleton.
  2. Pass entity definition maps into `gbNaming.js` rather than reading `globalThis`.

---

## 4. Track 3: Differentiated Feature Parity (P1–P2 — Game Polish)

**Worktree**: `.worktrees/opencode-features`  
**Branch**: `feat/opencode-feature-parity`  
**Target Time**: ~1–1.5 hours

### Task 3.1: Blue Galaxy Economic Ranking (Forge-Hammer Parity)

- **Problem**: FoE-Info currently ranks Blue Galaxy buildings purely by Forge Points (`FpRevenue`). Forge-Hammer uses an economic formula combining FP and goods rates (`CombinedValue = FP + goodsRate * Goods + olderGoodsRate * OlderGoods`).
- **Solution**:
  1. In `src/js/calc/BlueGalaxyCalculator.ts` and `.js`, add an optional `economicWeights` configuration (`fpWeight: 1`, `goodsWeight: 0.2`, `olderGoodsWeight: 0.1`).
  2. Calculate `totalScore` using BigNumber arithmetic and sort candidates by `totalScore`.
  3. Add unit test verifying that buildings producing high goods (e.g. 50 goods = 10 FP equivalent) rank above 2 FP buildings when weights are active.

### Task 3.2: Date & Time Engine Unification

- **Problem**: 30 call sites still bypass `src/js/utils/date.js` using raw `toLocaleTimeString` / `toLocaleString`.
- **Solution**:
  1. Extend `src/js/utils/date.js` with localized token support (`MMM`, `MMMM`, `ddd`) using native `Intl.DateTimeFormat` (no moment.js!).
  2. Add relative time formatting (`formatRelativeTime(timestamp)`) using `Intl.RelativeTimeFormat`.
  3. Migrate residual call sites in `ConversationService.js`, `renderGbInfoPanel.js`, and `GuildBattlegroundService.js` to use `formatDateTime` and `formatRelativeTime`.

---

## 5. Sequential Execution & Verification Protocol

### Commands for OpenCode:

```bash
# === Track 1 (Safety Fixes) ===
git worktree add .worktrees/opencode-safety -b feat/opencode-safety-fixes development
cd .worktrees/opencode-safety
# Implement Task 1.1 (D1), 1.2 (D2), 1.3 (D4/D5)
npm test
npm run verify

# === Track 2 (Monolith Decomposition) ===
git worktree add .worktrees/opencode-monolith -b feat/opencode-monolith-decomp development
cd .worktrees/opencode-monolith
# Implement Task 2.1 (CityMapProcessor), 2.2 (legacyBridge), 2.3 (D3)
npm test
npm run verify

# === Track 3 (Feature Parity) ===
git worktree add .worktrees/opencode-features -b feat/opencode-feature-parity development
cd .worktrees/opencode-features
# Implement Task 3.1 (Blue Galaxy), 3.2 (Date Engine)
npm test
npm run verify
```

### Integration Gate (Antigravity):

1. Review git diff of each branch.
2. Merge sequentially into `development`:
   ```bash
   git merge --no-ff feat/opencode-safety-fixes
   git merge --no-ff feat/opencode-monolith-decomp
   git merge --no-ff feat/opencode-feature-parity
   ```
3. Run full 5-stage verification:
   ```bash
   npm run verify
   ```
4. Refresh Knowledge Graph AST:
   ```bash
   npm run graph:foe-info:ast
   ```
5. Prune worktrees:
   ```bash
   git worktree remove .worktrees/opencode-safety
   git worktree remove .worktrees/opencode-monolith
   git worktree remove .worktrees/opencode-features
   ```
