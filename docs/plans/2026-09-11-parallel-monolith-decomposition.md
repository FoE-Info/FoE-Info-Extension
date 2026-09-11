# Parallel Monolith Decomposition Plan: GreatBuildingsService & GuildBattlegroundService

Date: 2026-09-11  
Harnesses: OpenCode & Antigravity (Parallel Worktrees)  
Methodology: `codebase-modernization-planner`, `using-git-worktrees`, `modular-architecture`, `verification-before-completion`

---

## 1. Executive Summary & Worktree Setup

Both `src/js/msg/GreatBuildingsService.js` (736 lines) and `src/js/msg/GuildBattlegroundService.js` (1,032 lines) exceed the repository hard cap ($\le 600$ lines).

To achieve maximum concurrency without file collisions or git merge conflicts:

- Work is partitioned into two 100% disjoint workstreams.
- Each agent operates in its own isolated worktree under `.worktrees/`.
- Both workstreams extract UI presentation logic from the RPC service modules into `src/js/ui/`.

```text
FoE-Info-Extension/ (main checkout: development)
├── .worktrees/
│   ├── antigravity-gb-donation/   (branch: refactor/antigravity-gb-donation)
│   └── opencode-gbg-result/       (branch: refactor/opencode-gbg-result)
```

---

## 2. Workstream A: Antigravity (GreatBuildingsService Decomposition)

- **Status**: Complete (2026-09-11, worktree `antigravity-gb-donation`, uncommitted). Extracted `renderGbDonationPanel.js` (492 lines). `GreatBuildingsService.js` dropped from 736 to 458 lines (−278 lines, −38%, $\le 600$ lines ceiling satisfied). All 745 unit tests pass, verification gate green.
- **Target File**: `src/js/msg/GreatBuildingsService.js` (736 lines $\to \le 450$ lines).
- **Target New Module**: `src/js/ui/renderGbDonationPanel.js` ($\le 300$ lines).
- **Test File**: `tests/ui/render-gb-donation-panel.test.mjs`.
- **Branch**: `refactor/antigravity-gb-donation` in `.worktrees/antigravity-gb-donation`.
- **Scope**:
  1. Extract `showGreatBuldingDonation()` and its internal donation table builder loop (lines 245–560) into `renderGbDonationPanel.js`.
  2. Implement `renderGbDonationPanel(params)` accepting:
     - `GBselected`, `rankings`, `showOptions`, `donationDIV`, `donation2DIV`, `PlayerName`, `MyInfo`, `City`, etc.
  3. Instrument with scoped logger: `createLogger('GbDonationPanel')`.
  4. Ensure backward compatibility: `GreatBuildingsService.js` re-exports or delegates to `renderGbDonationPanel`.
  5. Add characterization unit tests in `tests/ui/render-gb-donation-panel.test.mjs`.
  6. Verification: `npm test`, `npm run check`, `npm run lint`.

---

## 3. Workstream B: OpenCode (GuildBattlegroundService Decomposition)

- **Status**: Complete (2026-09-11, worktree `opencode-gbg-result`, uncommitted). Service reduced 1,032 $\to$ 980 lines; `getState` delegates to `renderBattlegroundResultCard.js` (217 lines). The $\le 850$ stretch target is not met by this single slice and would require further extraction.
- **Target File**: `src/js/msg/GuildBattlegroundService.js` (1,032 lines $\to \le 850$ lines).
- **Target Extraction Module**: `src/js/ui/gbgProvinceView.js` (or `src/js/ui/renderBattlegroundResultCard.js`).
- **Test File**: `tests/ui/gbg-province-view.test.mjs` (or `tests/ui/render-battleground-result-card.test.mjs`).
- **Branch**: `refactor/opencode-gbg-result` in `.worktrees/opencode-gbg-result`.
- **Scope**:
  1. Extract `getState(msg)` result card HTML generation (lines 206–285) into `renderBattlegroundResultCard(responseData, options)` in `src/js/ui/gbgProvinceView.js` (or `renderBattlegroundResultCard.js`).
  2. The extracted function builds the `#battlegroundResultCard` DOM structure, including rank, member, negs, fights, and attrition table.
  3. Instrument with scoped logger: `createLogger('GbgResultCard')`.
  4. Preserve pure decoupling: zero state mutations inside the view builder; returns HTML string and attaches copy/collapse listeners.
  5. In `GuildBattlegroundService.js`, replace the inline 80-line HTML builder with the extracted function call.
  6. Add unit test verifying HTML structure and total fights/negotiations calculation.
  7. Verification: `npm test`, `npm run check`.

---

## 4. Verification Protocol Before Integration

1. Each agent runs `npm test` and `npm run check` inside its own worktree directory.
2. Once verified, report ready for user review.
3. Integrate branches into `development` sequentially:
   - Branch A (`refactor/antigravity-gb-donation`) $\to$ `development`
   - Branch B (`refactor/opencode-gbg-result`) $\to$ `development`
4. Run full 5-stage verification gate (`npm run verify`) on merged `development`.
5. Remove worktrees after clean merge.
