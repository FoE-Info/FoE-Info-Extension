# Modernization Plan: Briefs 12, 13, and 14

## Global Constraints

- Target module size <= 250 lines (hard ceiling <= 600 lines).
- Backward compatibility: preserve exports, function signatures, and devtools.js / panelWindow bridges.
- Dual CJS/ESM exports (`module.exports = { ... }; module.exports.default = ...`).
- **Debuggability Invariant**: Every new module and extracted slice must instantiate `createLogger('<ModuleName>')` from `src/js/utils/logger.js`, emitting `logger.debug(...)` diagnostics for calculations, renders, and state updates when debug mode is enabled, while remaining 100% silent in standard mode.
- Full 5-stage verification gate on every task: `npm test`, `npm run check`, `npm run lint`, `npm run typecheck`, `npm run build:dev`.
- Graphify AST refresh after code edits: `npm run graph:foe-info:ast`.
- Conventional commits adhering to unslop-commit standards (imperative mood, subject <= 72 chars, body <= 72 chars/line).

---

### Task 1: Brief 12 - GuildBattlegroundService.js Province & Leaderboard UI Extraction into src/js/ui/gbgProvinceView.js

**Context & Purpose:**
`src/js/msg/GuildBattlegroundService.js` currently contains 811 lines of mixed RPC ingestion, state management, and large HTML DOM string builders for province detail tables and participant leaderboards (`buildProvinceTableHTML`, `buildLeaderboardHTML`).

**Requirements:**

1. Create `src/js/ui/gbgProvinceView.js` (<= 250 lines):
   - Extract `buildProvinceTableHTML(provinceData, options)` and `buildLeaderboardHTML(participants, options)`.
   - Provide clean function signatures accepting explicit parameters and dependencies.
   - Dual CJS/ESM exports.
2. In `src/js/msg/GuildBattlegroundService.js`:
   - Import `buildProvinceTableHTML` and `buildLeaderboardHTML` from `../ui/gbgProvinceView.js`.
   - Replace inline DOM string template construction.
   - Net line reduction in `GuildBattlegroundService.js`: ~150-200 lines (bringing it well under 650 lines).
3. Unit Tests:
   - Create `tests/ui/gbg-province-view.test.mjs` verifying DOM generation for provinces, buildings, attrition tokens, and participant leaderboards.
4. Verification:
   - Run `npm test`, `npm run check`, `npm run lint`, `npm run typecheck`, `npm run build:dev`.

---

### Task 2: Brief 13 - GreatBuildingsService.js Overview Card & Level Math Extraction

**Context & Purpose:**
`src/js/msg/GreatBuildingsService.js` currently stands at 672 lines. It contains remaining overview card DOM builders and level step calculation helpers that can be cleanly separated.

**Requirements:**

1. Create `src/js/ui/gbOverviewCard.js` (<= 250 lines):
   - Extract Great Building summary overview card markup generation (`renderGbOverviewCard(gbData, options)`).
   - Dual CJS/ESM exports.
2. In `src/js/msg/GreatBuildingsService.js`:
   - Import `renderGbOverviewCard` from `../ui/gbOverviewCard.js`.
   - Delegate overview rendering.
   - Net line reduction in `GreatBuildingsService.js`: ~120-150 lines (bringing it below 550 lines).
3. Unit Tests:
   - Create `tests/ui/gb-overview-card.test.mjs` asserting markup, data-i18n bindings, and safety fallbacks.
4. Verification:
   - Run `npm test`, `npm run check`, `npm run lint`, `npm run typecheck`, `npm run build:dev`.

---

### Task 3: Brief 14 - index.js Card Rendering Dispatch Extraction into src/js/ui/panelDispatcher.js

**Context & Purpose:**
`src/js/index.js` currently has 1,186 lines and contains heavy card dispatch routines and event handlers (`processTreasuryData`, `clearVisitPlayer`, `clearCultural`, etc.).

**Requirements:**

1. Create `src/js/ui/panelDispatcher.js` (<= 250 lines):
   - Extract panel container clearing routines (`clearCultural`, `clearVisitPlayer`, etc.) and treasury card rendering (`renderTreasuryPanel(resources, deps)`).
   - Dual CJS/ESM exports.
2. In `src/js/index.js`:
   - Import and wire functions from `./ui/panelDispatcher.js`.
   - Replace inline implementations in `index.js`.
   - Net line reduction in `src/js/index.js`: ~150-200 lines (bringing it below 1,050 lines).
3. Unit Tests:
   - Create `tests/ui/panel-dispatcher.test.mjs` verifying container clearing, treasury rendering, and collapse bindings.
4. Verification:
   - Run `npm test`, `npm run check`, `npm run lint`, `npm run typecheck`, `npm run build:dev`.
