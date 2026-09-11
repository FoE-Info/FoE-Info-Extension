# Monolith Decomposition Roadmap & Debt Inventory

Historical inventory and proposed breakdown strategy for six files in `src/js/`. The line counts and decomposition status below predate the current checkout; measure current files and query the graph before using this plan. Proposed target filenames are not an inventory of implemented modules.

---

## 1. Monolith Inventory & Debt Analysis

| Target File | Lines | Primary Smells | Target Modular Architecture |
|---|:---:|---|---|
| **`src/js/msg/StartupService.js`** | **2,334** | Mega-switch routing 40+ InnoGames RPC methods; inline state mutations; mixed DOM writes. | Extract individual handlers into `src/js/msg/*Service.ts`; route via `MessageDispatcher`. |
| **`src/js/index.js`** | **1,646** | Historical root orchestrator; attaches globals to `window`; mixed event listeners; inline popovers. | Reduce to $\le 80$-line routing entry point. Extract UI listeners to `src/js/ui/` and state to `src/js/state/`. |
| **`src/js/msg/GreatBuildingsService.js`** | **1,226** | Mixed FP calculations, investment spot locking, DOM rendering of tables, and RPC interception. | Separate into `src/js/calc/GreatBuildingCalculator.ts` (math) and `src/js/ui/renderGbInfoPanel.js` (DOM). |
| **`src/js/fn/helper.js`** | **993** | Dumping ground for string formatters, jQuery helpers, storage shims, and game math. | Disband into `src/js/utils/formatters.ts`, `src/js/utils/date.ts`, and `src/js/ui/domUtils.ts`. |
| **`src/js/msg/GuildBattlegroundService.js`** | **844** | Mixed attrition curves, sector math, signal coordination, and DOM rendering. | Separate pure sector/attrition math into `src/js/calc/GbgCalculator.ts` and UI into `src/js/ui/`. |
| **`src/js/protocol/legacyBridge.js`** | **598** | Legacy packet adaptation with hidden global variable references. | Cleanly integrate into `MessageDispatcher.js` and deprecate bridge shims. |

---

## 2. The 5-Step Slice Extraction Protocol

For every single slice extracted from any monolith:

1. **Characterization Test**:
   - Write a unit test using `tests/fixtures/` or recorded InnoGames RPC payloads to freeze exact expected behavior *before* modifying code.
   - Run `npm test` to verify test passes against current monolith implementation.
2. **Modular Extraction**:
   - Carve the targeted function or handler into a new file ($\le 250$ lines) under `src/js/msg/`, `src/js/calc/`, or `src/js/ui/`.
   - Explicitly import dependencies; zero hidden globals.
3. **Debuggability Instrumentation**:
   - Instantiate `const logger = createLogger('<ModuleName>')` from `src/js/utils/logger.js`.
   - Add detailed `logger.debug(...)` instrumentation for computations, cache operations, state writes, and DOM renders.
   - Verify zero console logging in standard mode; full structured `[FoE-Info:<ModuleName>]` logging when debug mode is enabled.
4. **Wire Call Site**:
   - Replace the legacy block in the monolith with an import and a single delegated function call.
   - Verify `git diff --stat` shows a net reduction in monolith size.
5. **Verification Gate**:
   - Run `npm run check && npm test && npm run build:dev`.
   - Run `foe-browser` and inspect via `npm run inspect:panel` to confirm zero runtime exceptions.
   - Sync Knowledge Graph: `npm run graph:foe-info:update`.


---

## 3. High-Priority Feature Backlog & Forge-Hammer Parity

### A. Customizable Date & Time Formatting Engine (Forge-Hammer Parity)
- **Problem**: Inconsistent date/time formatting across panels (hardcoded `toLocaleString()` / `toLocaleTimeString()` producing localized browser AM/PM instead of European 24-hour formats like `DD.MM.YYYY HH:mm:ss`). Only one panel had localized time while others remained unformatted.
- **Forge-Hammer Reference**: Forge-Hammer implements `FH.DateFormat` (`dateShort`, `dateLong`, `dateTimeShort`, `dateTimeLong`) configured via options settings with dropdown presets, custom format patterns, and storage synchronization.
- **Target Architecture**:
  - Centralized module `src/js/utils/date.js` providing `formatTime()`, `formatDate()`, and `formatDateTime()`.
  - Settings UI in `src/chrome/options.html` / `optionsForm.js` allowing users to select standard presets (European `DD.MM.YYYY HH:mm:ss`, US `MM/DD/YYYY hh:mm:ss A`, ISO `YYYY-MM-DD HH:mm:ss`, 24h `HH:mm:ss`) or define custom format strings.
  - Universal adoption across all panels: Blue Galaxy (`renderGalaxyPanel.js`), GB Info (`renderGbInfoPanel.js`), GBG last saved (`GuildBattlegroundService.js`), Incident timers (`helper.js`), Player stats (`StartupService.js`), and Outpost timers.
