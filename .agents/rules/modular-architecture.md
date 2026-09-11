---
trigger: always_on
description: Mandatory modular file limits (<= 250 lines) and strict directory taxonomy in src/.
---

# Rule: Modular Architecture & File Boundaries

To maintain high maintainability, testability, and clarity, agents must write modular, single-responsibility files rather than large monolithic classes.

---

## 1. File Size & Responsibility Budgets

- **Hard File Cap**: No new or refactored module in `src/js/` may exceed **250 lines** (absolute ceiling: 300 lines for complex dispatch tables).
- **Target Size**: 70–150 lines per module.
- **Single Responsibility Principle (SRP)**: Each file must do exactly one thing (e.g. military boost tallying, goods calculation, popover event binding).
- **Orchestrator Pattern**: High-level engines (like `CityStatsCalculator`) must not contain raw parsing algorithms; they must delegate to focused sub-modules and remain $\le 80$ lines.

---

## 2. Directory Placement Invariants

As defined in the project architecture:
- `src/js/calc/`: Pure mathematical and game calculation logic ONLY. Zero DOM references (`document`, `window`, jQuery).
- `src/js/ui/`: DOM generation, card templates, popover event listeners, clipboard formatters.
- `src/js/msg/`: InnoGames JSON-RPC service handlers (`*Service.js`).
- `src/js/protocol/`: Network packet interception, message dispatching, and envelope routing.
- `src/js/state/`: In-memory state, metadata lookup stores, player preferences.
- `src/js/utils/`: General-purpose utilities (storage, copy, i18n).
- `src/js/`: Root extension entry points only (`index.js`, `devtools.js`, `options.js`, etc.).
- Legacy monoliths (`src/js/index.js`, `StartupService.js`, `GreatBuildingsService.js`, `helper.js`) remain untouched until their dedicated refactoring slices.
