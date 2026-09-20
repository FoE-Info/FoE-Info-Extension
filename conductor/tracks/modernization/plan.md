# Implementation Plan: Codebase Modernization (Cluster 4)

## Phase 4: UI & Panels Decomposition ($\le 250$ Lines Budget)

### Completed Tasks

- [x] **Slice 4A**: Decompose `src/js/ui/panelDispatcher.js` (475L $\rightarrow$ 131L)
  - Extracted `renderTreasuryPanel.js`, `treasuryTableBuilder.js`, `treasuryPanelEvents.js`.
  - Added unit test coverage for extracted modules.
- [x] **Slice 4B**: Decompose `src/js/fn/collapse.js` (450L $\rightarrow$ 142L)
  - Extracted `collapseState.js`, `cityPanelToggles.js`, `combatGbToggles.js`.
  - Added unit test coverage for extracted modules.
- [x] **Slice 4C**: Decompose `src/js/ui/renderTargetGeneratorCard.js` (442L $\rightarrow$ 180L)
  - Extracted `targetTokenAssembler.js`, `targetGeneratorEvents.js`.
  - Added unit test suite `tests/ui/target-token-assembler.test.mjs`.
- [x] **Slice 4D**: Decompose `src/js/ui/renderGbDonationPanel.js` (422L $\rightarrow$ 239L)
  - Extracted `gbDonationPlaceEvaluator.js` (198L) and `gbDonationPanelEvents.js` (67L).
  - Added unit test suites `tests/ui/gb-donation-place-evaluator.test.mjs` and `tests/ui/gb-donation-panel-events.test.mjs`.
  - Verified `renderGbDonationPanel.js` is 239 lines ($\le 250$ lines target).
  - Confirmed 100% test parity and `npm run verify` gate pass.

---

- [x] **Slice 4E**: Decompose `src/js/ui/renderGalaxyPanel.js` (283L $\rightarrow$ 215L)
  - Extracted `galaxyBuildingGrouper.js` (76L) and `galaxyPanelEvents.js` (53L).
  - Added unit test suites `tests/ui/galaxy-building-grouper.test.mjs` and `tests/ui/galaxy-panel-events.test.mjs`.
  - Verified `renderGalaxyPanel.js` is 215 lines ($\le 250$ lines target).
  - Confirmed 100% test parity and `npm run verify` gate pass.

---

### Active Tasks

#### [ ] Slice 4F: Decompose `src/js/ui/renderLiveCityStats.js` (416L $\rightarrow \le 250$L)

- **Goal**: Decompose live city statistics and goods output rendering.
- **Subtasks**:
  - [ ] Extract goods output generators and city statistics table builders.
  - [ ] Verify test parity and line count $\le 250$ lines.

---

## Verification & Quality Gates

- **Unit Tests**: `node --test --test-reporter=dot tests/**/*.test.mjs`
- **Verification Gate**: `npm run verify`
- **Session Resumption**: `/boost Resume active modernization track from conductor/`
