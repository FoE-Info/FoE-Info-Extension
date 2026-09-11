# Restore GB Info Panels & Guild Battlegrounds Target Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the GB Donation Helper, GB Rewards, and Donor options in the GB Info card, and re-establish the Guild Battlegrounds Target Generator and signal tracking in the Guild Battlegrounds card.

**Architecture:**

1. Ingest `GuildBattlegroundMapMetadata` and `GuildBattlegroundBuildingMetadata` in `MetadataService.js` to populate `VolcanoProvinceDefs` and `WaterfallProvinceDefs` with sector definitions and siege-camp connectivity.
2. Fix `signals` array initialization and signal request routing in `GuildBattlegroundService.js` and `legacyBridge.js`.
3. Unify DOM container binding between `index.js` and `state.js` so `donation2DIV` and `targets` resolve to active elements in `#content`.
4. Connect options toggling (`showGBRewards`, `showGBDonors`, `showGBInfo`, `showDonation`) in `GreatBuildingsService.js`.

**Tech Stack:** JavaScript (ESM / CommonJS), Bootstrap 5.3, BigNumber.js (`ROUND_CEIL`), Node test runner (`node:test`).

**Spec:** [`docs/specs/2026-09-07-universal-foe-agent-ecosystem-design.md`](../specs/2026-09-07-universal-foe-agent-ecosystem-design.md) & recordings in `docs/GBG.json`, `docs/check player GBs.json`.

---

## Global Constraints

- Files in `src/js/` must not exceed 250 lines (single responsibility).
- All GB math, Arc bonuses (1.9x), and safe-spot locks must use `bignumber.js` with `BigNumber.ROUND_CEIL`.
- Never bundle static game JSON dumps into `src/`. All entity and map metadata must be ingested dynamically from InnoGames RPCs.
- All user-facing text must support localization through `t(...)` or `data-i18n`.
- Every task ends with fresh terminal test verification evidence.

---

### Task 1: Ingest GBG Map & Building Metadata in MetadataService

**Files:**

- Modify: `src/js/msg/MetadataService.js:50-160`
- Modify: `src/js/state/state.js:65-75`
- Test: `tests/msg/metadata-gbg-ingestion.test.mjs`

**Interfaces:**

- Consumes: `StaticDataService.getMetadata` RPC envelopes with `__class__: 'GuildBattlegroundMapMetadata'` and `'GuildBattlegroundBuildingMetadata'`.
- Produces: Populated `VolcanoProvinceDefs` and `WaterfallProvinceDefs` arrays with sector names and connections.

- [x] **Step 1: Write the failing unit test for GBG map and building metadata ingestion**
- [x] **Step 2: Run test to confirm failure** (`node --test tests/msg/metadata-gbg-ingestion.test.mjs`)
- [x] **Step 3: Implement `GuildBattlegroundMapMetadata` and `GuildBattlegroundBuildingMetadata` handlers in `MetadataService.js`**
- [x] **Step 4: Verify test passes with 0 errors**
- [x] **Step 5: Commit changes** (`feat(metadata): ingest gbg map and building definitions`)

---

### Task 2: Fix GBG Signals Array, Routing & Permission Gating

**Files:**

- Modify: `src/js/msg/GuildBattlegroundService.js:40-50, 270-300, 590-605`
- Modify: `src/js/protocol/legacyBridge.js:285-310`
- Test: `tests/msg/guild-battleground-signals.test.mjs`

**Interfaces:**

- Consumes: `GuildBattlegroundSignalsService.setSignal` and `removeSignal` requests with `requestData: [provinceId, signalType]`.
- Produces: Reactive `signals` array updating active focus/ignore sectors and triggering `checkProvinces()`.

- [x] **Step 1: Write the failing unit test for signal management and target list generation**
- [x] **Step 2: Run test to confirm failure** (`node --test tests/msg/guild-battleground-signals.test.mjs`)
- [x] **Step 3: Initialize `signals = []` as array in `GuildBattlegroundService.js`, extract `requestData` from POST body/context in `legacyBridge.js`, and permit local target generation without Discord webhook**
- [x] **Step 4: Verify test passes with 0 errors**
- [x] **Step 5: Commit changes** (`fix(gbg): initialize signals array and route signal post payload`)

---

### Task 3: Unify DOM Container Binding for Donation and Target Panels

**Files:**

- Modify: `src/js/state/state.js:150-185`
- Modify: `src/js/index.js:500-515`
- Modify: `src/js/msg/GreatBuildingsService.js:630-650`
- Test: `tests/ui/container-binding.test.mjs`

**Interfaces:**

- Consumes: Container access from services (`donation2DIV`, `targets`).
- Produces: Live, mounted DOM nodes inside `#content`.

- [x] **Step 1: Write the failing unit test verifying `donation2DIV` and `targets` resolve to mounted elements**
- [x] **Step 2: Run test to confirm failure** (`node --test tests/ui/container-binding.test.mjs`)
- [x] **Step 3: Unify container references so `state.js` containers are mounted in `#content` and `fCheckOutput()` safeguards `donation2DIV`**
- [x] **Step 4: Verify test passes with 0 errors**
- [x] **Step 5: Commit changes** (`fix(ui): mount donation2DIV and targets containers in content DOM`)

---

### Task 4: Connect GB Info Options & Restore GB Donation Helper Display

**Files:**

- Modify: `src/js/msg/GreatBuildingsService.js:160-220, 500-535`
- Modify: `src/js/protocol/legacyBridge.js:90-105`
- Test: `tests/msg/great-buildings-options.test.mjs`

**Interfaces:**

- Consumes: `GreatBuildingsService.getConstruction` and `getConstructionRanking`.
- Produces: Fully formatted 1.9x donation helper card with lock math, rewards, and copy functionality.

- [x] **Step 1: Write the failing unit test for GB options and donation helper rendering**
- [x] **Step 2: Run test to confirm failure** (`node --test tests/msg/great-buildings-options.test.mjs`)
- [x] **Step 3: Fix `getConstructionRanking` level extraction, wire `showGBRewards`, and align `showGBDonors` vs `showGBInfo`**
- [x] **Step 4: Verify test passes with 0 errors**
- [x] **Step 5: Commit changes** (`feat(gb): connect options toggles and restore donation helper display`)

---

### Task 5: Reconcile Rushed Siege Camps via Server Attrition Modifier

**Files:**

- Modify: `src/js/calc/GbgCalculator.js:75-95`
- Modify: `src/js/calc/GbgCalculator.ts:120-135`
- Test: `tests/calc/gbg-calculator.test.mjs`

**Interfaces:**

- Consumes: `options.gainAttritionChance` from live `GuildBattlegroundService.getProvinces` payload.
- Produces: Promotes rushed camp differences from `campsNotReady` to `campsReady` when server active reduction exceeds local timers.

- [x] **Step 1: Write failing unit test for rushed camps reconciliation**
- [x] **Step 2: Run test to confirm failure** (`node --test tests/calc/gbg-calculator.test.mjs`)
- [x] **Step 3: Implement reconciliation logic in `GbgCalculator.js` and `GbgCalculator.ts`**
- [x] **Step 4: Verify test passes with 0 errors**
- [x] **Step 5: Commit changes** (`fix(gbg): reconcile rushed camps and instant conquest signals`)

---

### Task 6: Instant Sector Conquest Routing via `getAction` & Panel Sizing

**Files:**

- Modify: `src/js/protocol/legacyBridge.js:595-615`
- Modify: `src/js/fn/globals.js:40-50`
- Modify: `src/js/fn/helper.js:615-720`
- Modify: `src/css/custom.scss`
- Test: `tests/msg/gbg-signals-service.test.mjs`
- Test: `tests/ui/panel-resize-and-visibility.test.mjs`

**Interfaces:**

- Consumes: WebSocket push `GuildBattlegroundService.getAction` with `{ action: 'province_conquered', provinceId }`.
- Produces: Instant removal of conquered sector from target generator and auto-height display in changes-only view.

- [x] **Step 1: Write failing unit tests for `getAction` routing and panel auto-height**
- [x] **Step 2: Run tests to confirm failure**
- [x] **Step 3: Register `getAction` in `legacyBridge.js` and implement `.gbg-changes-full` auto-height**
- [x] **Step 4: Verify tests pass with 0 errors**
- [x] **Step 5: Commit changes** (`fix(gbg): reconcile rushed camps and instant conquest signals`)
