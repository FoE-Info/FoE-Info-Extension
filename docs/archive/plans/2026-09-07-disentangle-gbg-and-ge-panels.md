# Disentangle GBG and GE Panels & Restore Distinctive Containers Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish dedicated, semantically named DOM containers for Guild Battlegrounds (`#battleground` for Member Activity, `#gbgLeaderboard` for Guild Leaderboard) and Guild Expedition (`#geScoreboard`), stop hijacking `#donation` (`donationDIV`), re-align GE naming to "Championship" vs "Member Contributions", and prevent panel runtime crashes.

**Architecture:**

1. Export dedicated singletons in `src/js/state/state.js` (`battlegroundDIV`, `gbgLeaderboardDIV`, `geScoreboardDIV`) and mount them in `src/js/index.js` without local variable shadowing.
2. Route `helper.fshowBattleground()` and `GuildBattlegroundService.js` to write to `battlegroundDIV` and `gbgLeaderboardDIV`.
3. Guard all DOM listener attachments (`getElementById`) in `src/js/fn/helper.js` against null references.
4. Rename GE subpanels in `src/js/ui/expeditionTables.js` and `src/i18n/` to "Championship" (cross-guild standings) and "Member Contributions" (in-guild player participation).
5. Update `src/js/ui/cardVisibility.js` to map 1:1 with user options so toggling GB donations never hides GBG.

**Tech Stack:** JavaScript (ESM / CommonJS), Bootstrap 5.3, Chrome DevTools Protocol, Node test runner (`node:test`).

**Spec / Trace:** User report, screenshots, and live CDP inspector evidence showing `TypeError: Cannot read properties of null (reading 'addEventListener')` at `app.js:12004`.

---

## Global Constraints

- Slices <= 100 lines per step.
- Hard file cap: <= 250 lines per module in `src/js/`.
- No static game JSON dumps in `src/`.
- All user-facing strings localized via `data-i18n` or `t(...)`.
- Every task verified with terminal test evidence before completion.

---

### Task 1: Dedicated Containers in `state.js` and `index.js`

**Files:**

- Modify: `src/js/state/state.js:180-195`
- Modify: `src/js/index.js:80-105, 505-530`
- Modify: `src/js/ui/containerBinding.js:20-55`
- Test: `tests/ui/container-binding.test.mjs`

**Interfaces:**

- Consumes: Document DOM creation in `state.js`.
- Produces: `battlegroundDIV` (`#battleground`), `gbgLeaderboardDIV` (`#gbgLeaderboard`), `geScoreboardDIV` (`#geScoreboard`), while preserving `donationDIV` (`#donation`) strictly for Great Buildings.

- [x] **Step 1: Update container-binding test to assert dedicated GBG and GE containers**
- [x] **Step 2: Run test to confirm failure** (`node --test tests/ui/container-binding.test.mjs`)
- [x] **Step 3: Define `battlegroundDIV` and `gbgLeaderboardDIV` in `state.js`, import and mount in `index.js`, and remove duplicate local variable declarations**
- [x] **Step 4: Verify test passes with 0 errors**
- [x] **Step 5: Commit changes** (`fix(ui): establish dedicated battleground and gbgLeaderboard containers`)

---

### Task 2: Route GBG Scoreboard and Leaderboard to Dedicated Containers with Null Guards

**Files:**

- Modify: `src/js/fn/helper.js:940-985`
- Modify: `src/js/msg/GuildBattlegroundService.js:110-130, 180-190`
- Test: `tests/msg/guild-battleground-signals.test.mjs`

**Interfaces:**

- Consumes: InnoGames `GuildBattlegroundService` RPC responses.
- Produces: Live GBG Leaderboard inside `#gbgLeaderboard` and live Member Activity Scoreboard inside `#battleground` with safe event bindings.

- [x] **Step 1: Write a unit test ensuring `fshowBattleground` renders to `battlegroundDIV` and handles missing elements without throwing**
- [x] **Step 2: Run test to verify failure**
- [x] **Step 3: Direct `fshowBattleground()` to `battlegroundDIV`, direct `getLeaderboard()` to `gbgLeaderboardDIV`, and wrap listener bindings in null guards**
- [x] **Step 4: Verify test passes with 0 errors**
- [x] **Step 5: Commit changes** (`fix(gbg): render gbg panels into dedicated containers with listener guards`)

---

### Task 3: Align GE Terminology to "Championship" vs "Member Contributions"

**Files:**

- Modify: `src/js/ui/expeditionTables.js:30-80`
- Modify: `src/js/msg/GuildExpeditionService.js:60-80`
- Modify: `src/i18n/en.json` (and run `npm run i18n:fix`)
- Modify: `src/chrome/options.html:120-135`
- Test: `tests/msg/guild-expedition-trial.test.mjs`

**Interfaces:**

- Consumes: GE Championship and Member Contribution payloads.
- Produces: Subpanels labeled "Championship" and "Member Contributions".

- [x] **Step 1: Write/update unit test checking GE subpanel labels**
- [x] **Step 2: Run test to verify failure**
- [x] **Step 3: Replace "International Guild Expedition" with "Championship" and "Guild Leaderboard" with "Member Contributions"**
- [x] **Step 4: Sync localization keys across dictionaries via `npm run i18n:fix` and `npm run i18n:check`**
- [x] **Step 5: Commit changes** (`refactor(ge): rename ge subpanels to championship and member contributions`)

---

### Task 4: Decouple Card Visibility & Verify End-to-End

**Files:**

- Modify: `src/js/ui/cardVisibility.js:15-85`
- Test: `tests/ui/card-visibility.test.mjs` (or existing card visibility tests)

**Interfaces:**

- Consumes: Active world `showOptions`.
- Produces: Independent visibility for `#battleground`, `#gbgLeaderboard`, `#donation`, and `#geScoreboard`.

- [x] **Step 1: Add visibility tests asserting toggling `showDonation` does not hide `#battleground`**
- [x] **Step 2: Run test to confirm failure**
- [x] **Step 3: Update `cardVisibility.js` to map `showBattleground` -> `#battleground`, `showLeaderboard` -> `#gbgLeaderboard`, and `showDonation` -> `#donation`**
- [x] **Step 4: Run full verification gate (`npm run verify`)**
- [x] **Step 5: Commit changes** (`fix(visibility): isolate gbg card visibility from gb donation settings`)
- [x] **Step 6: Live browser verification via `node .agents/scripts/inspect-extension.js` on port 9222**
