---
trigger: always_on
description: Mandatory modular file limits (<= 500 lines) and strict directory taxonomy in src/.
---

# Rule: Modular Architecture and File Boundaries

Write modular, single-responsibility files instead of large monolithic classes.

## Size budgets

No module in `src/js/` goes past 500 lines. Aim for 100 to 300 lines per module.

Each file does one thing: tally military boosts, calculate goods, bind popover events, and so on.

Orchestrators such as `CityStatsCalculator` hold no raw parsing algorithms. They delegate to focused sub-modules and stay under 80 lines.

## Where files go

| Directory | Contents |
| :--- | :--- |
| `src/js/calc/` | Pure math and game calculations. No DOM, no `document`, no `window`, no jQuery. |
| `src/js/ui/` | DOM generation, card templates, popover listeners, clipboard formatters. |
| `src/js/msg/` | InnoGames JSON-RPC service handlers (`*Service.js`). |
| `src/js/protocol/` | Network interception, message dispatching, envelope routing. |
| `src/js/state/` | In-memory state, metadata lookup stores, player preferences. |
| `src/js/utils/` | Shared utilities: storage, copy, i18n, logger. |
| `src/js/` | Extension entry points only (`index.js`, `devtools.js`, `options.js`). |

Legacy monoliths (`index.js`, `StartupService.js`, `GreatBuildingsService.js`, `helper.js`) stay as they are until their dedicated refactoring slice.

## Domain taxonomy

Feature logic, RPC parsing, and calculations do not go into the catch-alls (`StartupService.js`, `index.js`, `helper.js`). Each domain has its own trio:

| Domain | Service, calculator, renderer |
| :--- | :--- |
| City production and harvest | `CityProductionService.js`, `ProductionCalculator.js`, `renderProductionPanel.js` |
| Great Buildings and investments | `GreatBuildingsService.js`, `InvestedCalculator.js`, `renderInvestedPanel.js` |
| Guild Battlegrounds | `GuildBattlegroundService.js`, `GbgSignalService.js`, `renderGbgPanel.js` |
| Guild Expedition (1 to 5) | `GuildExpeditionService.js`, `renderExpeditionPanel.js` |
| Army and combat boosts | `ArmyUnitManagementService.js`, `UnitCalculator.js`, `renderArmyPanel.js` |
| Inventory and Historical Allies | `InventoryService.js`, `AllyService.js`, `renderAlliesPanel.js` |
| City boosts and Blue Galaxy | `CityStatsCalculator.js`, `BlueGalaxyCalculator.js`, `renderGalaxyPanel.js` |

## Logging

Every module that calculates, handles RPC, caches state, or renders UI instantiates a scoped logger with `createLogger('ModuleName')`, per [Debuggability by Design](debuggability-by-design.md).
