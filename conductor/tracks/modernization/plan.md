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

---

### Active Tasks

#### [ ] Slice 4D: Decompose `src/js/ui/renderGbDonationPanel.js` (422L $\rightarrow \le 250$L)

- **Goal**: Extract table generation and user event handlers while preserving BigNumber precision and existing exports.
- **Subtasks**:
  - [ ] Extract GB donation row rendering / formatters into dedicated sub-module.
  - [ ] Extract GB donation event listeners into dedicated handler module.
  - [ ] Add unit test suite for newly extracted components.
  - [ ] Verify `renderGbDonationPanel.js` is strictly $\le 250$ lines.
  - [ ] Run `npm run verify` to confirm 100% test parity and build success.

#### [ ] Slice 4E: Decompose `src/js/ui/renderGalaxyPanel.js` (336L $\rightarrow \le 250$L)

- **Goal**: Decompose Blue Galaxy collection grouping and display logic.
- **Subtasks**:
  - [ ] Extract Galaxy card rendering and building collection sorters.
  - [ ] Verify test parity and line count $\le 250$ lines.

---

## Verification & Quality Gates

- **Unit Tests**: `node --test --test-reporter=dot tests/**/*.test.mjs`
- **Verification Gate**: `npm run verify`
- **Session Resumption**: `/boost Resume active modernization track from conductor/`
