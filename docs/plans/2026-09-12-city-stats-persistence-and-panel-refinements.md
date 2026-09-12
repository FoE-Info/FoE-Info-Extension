# Dual-Harness Plan: City Overview Persistence, Stat Accuracies, Coin/Supply Options, QI/GBG Sizing & Guild Redesign

**Date**: 2026-09-12  
**Baseline**: Clean `development` (commit `a7fa94a`, 1,002/1,002 tests passing)  
**Coordinating Agents**: Antigravity (Tech Lead & Protocol Engine) ↔ OpenCode (UI Lifter & Panels)

---

## 1. Architectural Terminology & Scope Specification

- **Canonical Panel Name**: **City Overview** / **City Info** (synonymous, with or without "panel" — e.g. "City Overview Panel" or "City Info").
- **Permanence Invariant**: The City Overview panel (`#citystats` / `#header`) is an unconditionally permanent anchor. No game context transition (`GBG`, `GE`, `QI`, `SETTLEMENT`, `OTHER_PLAYER`) may ever set it to `display: none` or wipe its contents.
- **Options Scope for "City Info"**: The "City Info" card in `options.html` must contain **only** settings that directly configure this panel itself. Standalone feature panels (`#incidents`, `#galaxy`, `#guild`, `#bonus`) must live in their respective dedicated cards.

---

## 2. Track Division & Responsibilities

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                      TRACK 1: ANTIGRAVITY TECH LEAD                         │
│                    (Protocol, Routing, Math & Storage)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. City Overview Permanence in cardVisibility.ts & cardVisibility.js       │
│ 2. Combat Boosts Wiring (BoostService.getAllBoosts -> 1,005 server boosts)  │
│ 3. Score Hydration & Persistent Caching (OtherPlayerService & ClanService)  │
│ 4. Daily Units Tally Fix (Reward ID regex repair in CityMapEntityProcessor) │
│ 5. Login Quest Rewards Suppression (Seed historical closed event quests)    │
│ 6. Goods Inventory Trigger Decoupling in ResourceService.js                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        TRACK 2: OPENCODE LIFTER                             │
│                  (UI Panels, Layouts, Sizing & Options)                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. QI & GBG Contributions & Leaderboard Dynamic Sizing:                     │
│    - QI Contributions: 20 players + scrollbar (off) vs full height (on)     │
│    - GBG Battlegrounds: 20 players + scrollbar (off) vs full height (on)    │
│    - QI Leaderboard: default top 10 guilds with scrollbar + collapse state  │
│ 2. Guild Overview Header & Responsive Table Redesign:                       │
│    - Collapsed: [+] Guild: <Name> (<count> Members)                         │
│    - Expanded: [-] Guild Overview + subtitle <Name> • <count> Members       │
│    - Flexbox header + .table-responsive for mid-width docking               │
│ 3. City Info Options Clean-Up & 4 New Settings:                             │
│    - options.html: Reorganize City Info card to strictly host panel items   │
│    - options.js & showOptions.js: showDailyCoins, showDailySupplies,        │
│      showCoinBoost, showSupplyBoost (all defaulting to true)                │
│    - ownCityCard.js & visitedCityCard.js: render coins, supplies, boosts    │
│    - src/i18n/*.json: 7-language parity check & synchronization             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Track 1 Specification (Antigravity Tech Lead)

### 3.1 City Overview Permanence

- **Files**: `src/js/ui/cardVisibility.ts` & `src/js/ui/cardVisibility.js`
- **Change**:
  - Add `'citystats'` and `'header'` to all entries in `CONTEXT_ALLOWED_PANELS` (`OWN_CITY`, `GBG`, `GE`, `QI`, `SETTLEMENT`, `OTHER_PLAYER`).
  - In `applyContextVisibility()`, ensure `#citystats` and `#header` are never set to `display: none` on context changes.
- **Verification**: `tests/ui/card-visibility.test.mjs` and `tests/ui/context-view-filtering.test.mjs`.

### 3.2 Combat Boosts Wiring

- **Files**: `src/js/protocol/routes/combatRoutes.js` and/or `cityRoutes.js`
- **Change**:
  - Register `BoostService.getAllBoosts` with `StartupService.boostServiceAllBoosts`.
  - Ingest the 1,005 server boosts from `en7 login.har` to mutate `City.GBGAttackingAttack`, `City.GEAttackingAttack`, `City.QIAttackingAttack`, `City.GBGDefendingAttack`, etc.
  - Trigger `renderLiveCityStats()` upon boost receipt.
- **Verification**: Verify GBG, GE, and QI boosts render authentic values instead of duplicating base boosts or showing 0%.

### 3.3 Score Hydration & Persistent Storage

- **Files**: `src/js/msg/OtherPlayerService.js` and `src/js/msg/ClanService.js`
- **Change**:
  - In `OtherPlayerService.getSocialList`, match `p.is_self === true` or `p.player_id === MyInfo.id` and assign `MyInfo.score = p.score`.
  - In `ClanService.getOwnClanData`, update `MyInfo.score` if player entry in clan list has valid score.
  - Persist to `worldStorage` under `world:<id>.playerScore` so cold start hydrates immediately.
  - Call `renderLiveCityStats()` if `#citystats` currently displays 0.
- **Verification**: Score displays `6,249,698,209` matching `en7 login.har`.

### 3.4 Daily Units Tally Fix

- **Files**: `src/js/calc/CityMapEntityProcessor.js`
- **Change**:
  - Fix buggy regex `const match = rId.match(/\d+$/);` which was treating numeric suffixes in reward IDs (e.g. `unit_12345`) as unit quantities.
  - Deduplicate unit counting between `evaluateEntityHarvest` and metadata components options iteration.
- **Verification**: Units tally reflects authentic daily yield (~136 from Alcatraz + actual daily buildings).

### 3.5 Login Rewards Suppression

- **Files**: `src/js/msg/QuestService.js`
- **Change**:
  - In `QuestService.getUpdates`, on initial cold start, initialize `rewardedQuestIds` with all quests already in `closed` or `completed` state.
  - Prevent historical event quests (`Momiji Stop Upgrade Kit` and `95 Sack of Flour`) from emitting false rewards on startup.
- **Verification**: `en7 login.har` produces 0 false login reward cards.

### 3.6 Goods Inventory Trigger Decoupling

- **Files**: `src/js/msg/ResourceService.js`
- **Change**:
  - Decouple Goods Inventory from the artificial Market-only lock.
  - Unlock and render when `showOptions.showGoods` is true and data is hydrated, while still respecting manual dismissal (`[X]`).
- **Verification**: `tests/msg/resource-market-trigger.test.mjs`.

---

## 4. Track 2 Specification (OpenCode Lifter)

### 4.1 QI & GBG Contributions & Leaderboard Dynamic Sizing

- **Files**: `src/js/ui/renderQuantumPanels.js`, `src/js/ui/renderBattlegroundsPanel.js`, `src/css/custom.scss`
- **Change**:
  - **QI Contributions**:
    - When "show changes only" is OFF: bounded height (~20 players, ~480px) with `overflow-y: auto`.
    - When "show changes only" is ON: full natural height (`height: auto`, no scrollbar).
  - **GBG Battlegrounds**:
    - When "show changes only" is OFF: bounded height (~20 players, ~480px) with `overflow-y: auto`.
    - When "show changes only" is ON: full natural height (`height: auto`, no scrollbar).
  - **QI Leaderboard**:
    - Default size bounded to top 10 guilds (~260px / 10 rows) with `overflow-y: auto`.
    - Collapsing and re-expanding restores top-10 height.

### 4.2 Guild Overview Panel Redesign

- **Files**: `src/js/ui/renderGuildPanel.js`
- **Change**:
  - **Collapsed**: `[+] Guild: <GuildName> (<count> Guild Members)  [X]`
  - **Expanded**:
    `[-] Guild Overview                              [Copy] [X]`
    `<GuildName> • <count> Members`
  - Replace float button layout with a Bootstrap flex container (`d-flex align-items-center justify-content-between`).
  - Wrap table in `<div class="table-responsive">` with compact column priority.

### 4.3 Options Reorganization & Coin/Supply Boost Toggles

- **Files**: `src/chrome/options.html`, `src/js/options.js`, `src/js/state/showOptions.js`, `src/js/ui/templates/ownCityCard.js`, `src/js/ui/templates/visitedCityCard.js`, `src/i18n/*.json`
- **Change**:
  - Clean up "City Info" card in `options.html` to strictly contain panel options: `Stats`, `visit`, `army`, `showDailyCoins`, `showDailySupplies`, `showCoinBoost`, `showSupplyBoost`.
  - Move `#incidents`, `#galaxy`, `#guild`, `#bonus`, and `collectionTimes` to their own dedicated cards.
  - Wire the 4 new options in `options.js` and `showOptions.js` (defaulting to `true`).
  - In `ownCityCard.js` and `visitedCityCard.js`, conditionally render:
    - Daily Coins: `Coins: <amount>`
    - Daily Supplies: `Supplies: <amount>`
    - Coin Boost: `Coins Bonus: +<percent>%`
    - Supply Boost: `Supplies Bonus: +<percent>%`
  - Ensure 100% i18n key parity across all 7 language dictionaries (`npm run i18n:check`).

---

## 5. Dual-Harness Execution Flow

1. **Antigravity executes Track 1** directly in workspace root on branch `development`.
2. **OpenCode executes Track 2** in worktree `.worktrees/opencode-panels-redesign` (or directly on `development` if executed sequentially).
3. **Full 5-Stage Verification Gate**:
   - `npm run verify` (format, lint, i18n parity, test suite, dev build).
