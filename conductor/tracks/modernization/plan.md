# Implementation Plan: Codebase Modernization (Cluster 4)

## Phase 4: UI & Panels Decomposition ($\le 250$ Lines Budget)

### Completed Tasks

- [x] Task 4A — **Slice 4A**: Decompose `src/js/ui/panelDispatcher.js` (475L $\rightarrow$ 131L)
  - Extracted `renderTreasuryPanel.js`, `treasuryTableBuilder.js`, `treasuryPanelEvents.js`.
  - Added unit test coverage for extracted modules.
- [x] Task 4B — **Slice 4B**: Decompose `src/js/fn/collapse.js` (450L $\rightarrow$ 142L)
  - Extracted `collapseState.js`, `cityPanelToggles.js`, `combatGbToggles.js`.
  - Added unit test coverage for extracted modules.
- [x] Task 4C — **Slice 4C**: Decompose `src/js/ui/renderTargetGeneratorCard.js` (442L $\rightarrow$ 180L)
  - Extracted `targetTokenAssembler.js`, `targetGeneratorEvents.js`.
  - Added unit test suite `tests/ui/target-token-assembler.test.mjs`.
- [x] Task 4D — **Slice 4D**: Decompose `src/js/ui/renderGbDonationPanel.js` (422L $\rightarrow$ 239L)
  - Extracted `gbDonationPlaceEvaluator.js` (198L) and `gbDonationPanelEvents.js` (67L).
  - Added unit test suites `tests/ui/gb-donation-place-evaluator.test.mjs` and `tests/ui/gb-donation-panel-events.test.mjs`.
  - Verified `renderGbDonationPanel.js` is 239 lines ($\le 250$ lines target).
  - Confirmed 100% test parity and `npm run verify` gate pass.

---

- [x] Task 4E — **Slice 4E**: Decompose `src/js/ui/renderGalaxyPanel.js` (283L $\rightarrow$ 215L)
  - Extracted `galaxyBuildingGrouper.js` (76L) and `galaxyPanelEvents.js` (53L).
  - Added unit test suites `tests/ui/galaxy-building-grouper.test.mjs` and `tests/ui/galaxy-panel-events.test.mjs`.
  - Verified `renderGalaxyPanel.js` is 215 lines ($\le 250$ lines target).
  - Confirmed 100% test parity and `npm run verify` gate pass.

- [x] Task 4F — **Slice 4F**: Decompose `src/js/ui/renderLiveCityStats.js` (416L $\rightarrow$ 233L)
  - Extracted `liveCityGoodsAggregator.js` (126L), `liveCityStatsCalculator.js` (182L), and `liveCityViewDataBuilder.js` (100L).
  - Added unit test suites `tests/ui/live-city-goods-aggregator.test.mjs`, `tests/ui/live-city-stats-calculator.test.mjs`, and `tests/ui/live-city-view-data-builder.test.mjs`.
  - Verified `renderLiveCityStats.js` is 233 lines ($\le 250$ lines target).
  - Confirmed 100% test parity and `npm run verify` gate pass.

---

### Active Tasks

- [x] Task 4G — **Slice 4G**: Decompose `src/js/ui/indexUiBindings.js` (422L $\rightarrow$ 220L)
  - Extracted `uiElementBindings.js` (55L: options button, message listener, theme toggle), `runtimeLifecycle.js` (79L: install/update listeners, `onRequested`, `onError`), `networkBridge.js` (133L: DevTools inspectedWindow/onNavigated bridge).
  - Added unit test suites `tests/ui/ui-element-bindings.test.mjs` (9 tests), `tests/ui/runtime-lifecycle.test.mjs` (6 tests), `tests/ui/network-bridge.test.mjs` (5 tests).
  - Verified `indexUiBindings.js` is 220 lines ($\le 250$ lines target).
  - Full test suite: all suites green except 3 pre-existing `tests/agents/mcp-profile.test.mjs` failures caused by uncommitted `.agents/mcp-registry.json` drift (outside this slice's footprint); i18n + RPC contract checks pass.

---

## Verification & Quality Gates

- **Unit Tests**: `node --test --test-reporter=dot tests/**/*.test.mjs`
- **Verification Gate**: `npm run verify`
- **Session Resumption**: `/boost Resume active modernization track from conductor/`
