# Monolith Decomposition Roadmap & Debt Inventory

Verified inventory (measured 2026-09-12) and proposed breakdown strategy for the largest files in `src/js/`. Proposed target filenames are not an inventory of implemented modules.

---

## 1. Monolith Inventory & Debt Analysis

| File                              | Current L | Status         |
| :-------------------------------- | --------: | :------------- |
| `msg/StartupService.js`           |       422 | decompose      |
| `index.js`                        |       174 | thin           |
| `msg/GreatBuildingsService.js`    |       468 | decompose      |
| `fn/helper.js`                    |       203 | not a monolith |
| `msg/GuildBattlegroundService.js` |       446 | decompose      |
| `protocol/legacyBridge.js`        |        62 | not a monolith |

**>450 L decomposition backlog (measured 2026-09-12):**

- `protocol/MessageDispatcher.js` (586)
- `ui/containerBinding.js` (571)
- `ui/indexUiBindings.js` (528)
- `calc/entities/CityEntityHarvestCalculator.js` (513)
- `ui/renderGbDonationPanel.js` (504)
- `ui/cardVisibility.js` (503)
- `ui/gbDonationTables.js` (503)
- `msg/OtherPlayerService.js` (500)
- `fn/collapse.js` (493)
- `state/MetadataStore.js` (486)
- `protocol/networkListener.js` (476)
- `ui/panelDispatcher.js` (475)

---

## 2. The 5-Step Slice Extraction Protocol

For every single slice extracted from any monolith:

1. **Characterization Test**:
   - Write a unit test using `tests/fixtures/` or recorded InnoGames RPC payloads to freeze exact expected behavior _before_ modifying code.
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
