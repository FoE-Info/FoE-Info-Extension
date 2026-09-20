# Monolith Decomposition Roadmap & Debt Inventory

Verified inventory (measured 2026-09-20) and proposed breakdown strategy for the largest files in `src/js/`. Proposed target filenames are not an inventory of implemented modules.

---

## 1. Monolith Inventory & Debt Analysis

| File                                | Current L | Status         | Notes                                                   |
| :---------------------------------- | --------: | :------------- | :------------------------------------------------------ |
| `calc/prod/entityProductionParser.js`|       202 | **decomposed** | Slice 1A: decomposed from 497 L into <= 250 L modules   |
| `msg/StartupService.js`             |       246 | **decomposed** | Slice 2B: decomposed from 424 L into <= 250 L modules   |
| `index.js`                          |       174 | thin           | Entry orchestrator                                      |
| `msg/GreatBuildingsService.js`      |       389 | decompose      | Milestone 2                                             |
| `fn/helper.js`                      |       203 | not a monolith | Helper utilities                                        |
| `msg/GuildBattlegroundService.js`   |       240 | **decomposed** | Slice 2A: decomposed from 489 L into <= 250 L modules   |
| `protocol/legacyBridge.js`          |        62 | not a monolith | Thin routing bridge                                     |

**Milestone 1 backlog (400–497 L, measured 2026-09-20):**

- `calc/prod/entityProductionParser.js` (202 L — **Done**, Slice 1A)
- `msg/GuildBattlegroundService.js` (240 L — **Done**, Slice 2A)
- `msg/StartupService.js` (246 L — **Done**, Slice 2B)
- `protocol/MessageDispatcher.js` (493 L)
- `state/MetadataStore.js` (486 L)
- `protocol/networkListener.js` (476 L)
- `ui/panelDispatcher.js` (475 L)
- `fn/collapse.js` (449 L)
- `ui/renderTargetGeneratorCard.js` (441 L)
- `msg/StartupService.js` (424 L)
- `ui/renderGbDonationPanel.js` (422 L)
- `ui/indexUiBindings.js` (422 L)
- `ui/gbPlaceTableRows.js` (417 L)
- `ui/renderLiveCityStats.js` (415 L)
- `ui/components/statFormatters.js` (411 L)
- `state/storageListener.js` (402 L)
- `msg/GbgSignalService.js` (402 L)
- `ui/components/PopoverManager.js` (400 L)

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
   - Run `npm run check && npm test && npm run build:dev` (or the full `npm run verify` gate). This headless gate is mandatory for every slice.
   - Live browser verification (OpenCLI / browser bridge) runs only on explicit user request; autonomous browser launches or tab reloads violate the Browser Hygiene rule.
   - Sync Knowledge Graph: `npm run graph:foe-info:update`.
