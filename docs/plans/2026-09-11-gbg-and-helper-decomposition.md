# Parallel Modernization Plan: GBG Target Generator & GB Naming Helper Decomposition

Date: 2026-09-11  
Harnesses: OpenCode & Antigravity (Parallel Worktrees)  
Methodology: `codebase-modernization-planner`, `using-git-worktrees`, `modular-architecture`, `verification-before-completion`

---

## 1. Workstream Overview & Isolation Architecture

To continue shrinking monolithic anchors under the repository invariants ($\le 600$ lines):

- **OpenCode** decomposes `GuildBattlegroundService.js` (980 lines $\to \le 750$ lines).
- **Antigravity** thins `helper.js` (592 lines $\to \le 475$ lines).

Both workstreams are 100% disjoint with zero shared code files.

```text
FoE-Info-Extension/ (main checkout: development)
├── .worktrees/
│   ├── opencode-gbg-province/   (branch: refactor/opencode-gbg-province)
│   └── antigravity-gb-naming/   (branch: refactor/antigravity-gb-naming)
```

---

## 2. Workstream A: OpenCode (GuildBattlegroundService Target Generator Extraction)

- **Status**: Completed & Merged (2026-09-11). Extracted into `src/js/ui/renderTargetGeneratorCard.js` (409 lines) rather than `gbgProvinceView.js`, keeping both modules under the 600-line cap (`gbgProvinceView.js` 269 lines). `GuildBattlegroundService.js` dropped from 980 $\to$ 848 lines (-132 lines).
- **Target File**: `src/js/msg/GuildBattlegroundService.js` (980 lines $\to \le 750$ lines).
- **Target Extraction Module**: `src/js/ui/renderTargetGeneratorCard.js` (409 lines).
- **Test File**: `tests/ui/gbg-province-view.test.mjs`.
- **Branch**: `refactor/opencode-gbg-province` (merged into `development`, worktree removed).
- **Scope**:
  1. Extract target generator DOM assembly and signal matching loop in `checkProvinces()` into `src/js/ui/renderTargetGeneratorCard.js`.
  2. Implement `buildTargetGeneratorTargets` / `renderTargetGeneratorPanel`.
  3. Ensure `GuildBattlegroundService.js` delegates cleanly to the extracted function.
  4. Preserve all clipboard copy and Discord webhook hooks (`postTargetGenToDiscord`).
  5. Add unit tests in `tests/ui/gbg-province-view.test.mjs`.
  6. Verification: `npm test` and `npm run check` passed.

---

## 3. Workstream B: Antigravity (Helper GB Naming Extraction)

- **Status**: Completed & Merged (2026-09-11). Extracted `fGBsname` and `fGBname` into `src/js/calc/gbNaming.js` (266 lines). `helper.js` dropped from 592 $\to$ 408 lines (-184 lines, $\le 475$ target met).
- **Target File**: `src/js/fn/helper.js` (592 lines $\to \le 475$ lines).
- **Target Extraction Module**: `src/js/calc/gbNaming.js` (266 lines).
- **Test File**: `tests/calc/gb-naming.test.mjs`.
- **Branch**: `refactor/antigravity-gb-naming` (merged into `development`, worktree removed).
- **Scope**:
  1. Move `fGBsname(city_entity)` (short name resolution: CdM, Inno, Traz, CF, etc.) and `fGBname(city_entity)` (full name resolution) from `src/js/fn/helper.js` into `src/js/calc/gbNaming.js`.
  2. Re-export `fGBsname` and `fGBname` from `src/js/fn/helper.js` for 100% backward compatibility.
  3. Expand `tests/calc/gb-naming.test.mjs` to comprehensively cover short and full name mappings.
  4. Verification: Full verification gate green (759/759 tests, dev build clean).
