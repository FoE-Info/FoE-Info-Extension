# Codebase Modernization — Master Roadmap & Decomposition Specification

**Date**: 2026-09-20  
**Status**: Active  
**Scope**: Master architectural roadmap for decomposing legacy modules down to $\le 250$ lines per file, followed by a leaf-first TypeScript migration across the FoE-Info Chrome extension.  
**Related Specs**: [`docs/specs/2026-09-12-codebase-modernization-design.md`](2026-09-12-codebase-modernization-design.md)

---

## 1. Master Strategy & Phasing

Following the agreed architectural decisions:

1. **Phase A (Modular Decomposition to $\le 250$ lines)**:
   - Decompose all modules $> 250$ lines in JavaScript first.
   - Maintain strict BigNumber precision, zero DOM dependencies in calculation engines, and structured logging via `createLogger`.
   - Preserve 100% backward-compatible public exports to avoid breaking cross-module importers.
2. **Phase B (Leaf-First TypeScript Migration)**:
   - Incrementally convert modules to `.ts` starting with pure calculation engines and leaf utilities, progressing to domain services, protocol handlers, and UI renderers, concluding with entry orchestrators.

---

## 2. Phase A Scoping: Two-Tier Ratchet

The decomposition of modules to $\le 250$ lines is structured into two sequential milestones:

### Milestone 1: Critical Files (400–497 Lines)

Sequenced strictly by blast radius:

1. **Cluster 1: Calculations & Parsers** (Pure math, zero DOM, highly testable)
   - `src/js/calc/prod/entityProductionParser.js` (497 L $\rightarrow$ **202 L**, **Completed in Slice 1A**)
2. **Cluster 2: Domain Services**
   - `src/js/msg/GuildBattlegroundService.js` (489 L $\rightarrow$ **240 L**, **Completed in Slice 2A**)
   - `src/js/msg/StartupService.js` (424 L $\rightarrow$ **246 L**, **Completed in Slice 2B**)
   - `src/js/msg/GbgSignalService.js` (402 L $\rightarrow$ **221 L**, **Completed in Slice 2C**)
3. **Cluster 3: Protocol & State**
   - `src/js/protocol/MessageDispatcher.js` (493 L)
   - `src/js/state/MetadataStore.js` (486 L)
   - `src/js/protocol/networkListener.js` (476 L)
   - `src/js/state/storageListener.js` (402 L)
4. **Cluster 4: UI Presenters & Renderers**
   - `src/js/ui/panelDispatcher.js` (475 L)
   - `src/js/fn/collapse.js` (449 L)
   - `src/js/ui/renderTargetGeneratorCard.js` (441 L)
   - `src/js/ui/renderGbDonationPanel.js` (422 L)
   - `src/js/ui/indexUiBindings.js` (422 L)
   - `src/js/ui/gbPlaceTableRows.js` (417 L)
   - `src/js/ui/renderLiveCityStats.js` (415 L)
   - `src/js/ui/components/statFormatters.js` (411 L)
   - `src/js/ui/components/PopoverManager.js` (400 L)

### Milestone 2: Remaining Modules (251–399 Lines)

42 remaining modules partitioned across calculation engines, service handlers, route tables, and UI template cards.

---

## 3. Slice Extraction Protocol

Every extracted slice adheres to:

1. **Characterization Test**: Unit test safety net under `tests/` verifying current behavior before or alongside modifications.
2. **Modular Extraction**: New modules $\le 250$ lines with explicit imports and zero hidden globals.
3. **Debuggability Instrumentation**: Scoped logger via `createLogger('<ModuleName>')` from `src/js/utils/logger.js`. Silent in standard mode; structured JSON output in debug mode.
4. **Call Site Delegation**: Facade modules delegate directly to extracted submodules, maintaining public API signatures.
5. **Full Gate Verification**: Headless gate execution (`npm run verify`) confirming formatting, linter, TypeScript compiler, RPC contracts, i18n key parity, test runner, and development build.

---

## 4. Completed Slices

- **Slice 1A (2026-09-20)**: Decomposed `entityProductionParser.js` (497 L $\rightarrow$ 202 L) by extracting:
  - `src/js/calc/prod/productionResourceAccumulator.js` (211 L)
  - `src/js/calc/prod/entityMetadataProductionParser.js` (208 L)
  - Added unit test suite `tests/calc/production-resource-accumulator.test.mjs`.
- **Slice 2A (2026-09-20)**: Decomposed `GuildBattlegroundService.js` (489 L $\rightarrow$ 240 L) by extracting:
  - `src/js/msg/GbgTimeFormatter.js` (141 L)
  - `src/js/msg/GbgLeaderboardHandler.js` (248 L)
  - `src/js/msg/GbgMapUtils.js` (111 L)
  - Added unit test suites `tests/msg/gbg-time-formatter.test.mjs`, `tests/msg/gbg-leaderboard-handler.test.mjs`, and `tests/msg/gbg-map-utils.test.mjs`.
- **Slice 2B (2026-09-20)**: Decomposed `StartupService.js` (424 L $\rightarrow$ 246 L) by extracting:
  - `src/js/msg/StartupStateInitializer.js` (243 L)
  - `src/js/msg/StartupEntityCoordinator.js` (242 L)
  - Added unit test suites `tests/msg/startup-state-initializer.test.mjs` and `tests/msg/startup-entity-coordinator.test.mjs`.
- **Slice 2C (2026-09-20)**: Decomposed `GbgSignalService.js` (403 L $\rightarrow$ 221 L) by extracting:
  - `src/js/msg/GbgTargetListGenerator.js` (180 L)
  - Delegated `timeGBG` and `getServerMarket` to `src/js/msg/GbgTimeFormatter.js`
  - Added unit test suite `tests/msg/gbg-target-list-generator.test.mjs`.
