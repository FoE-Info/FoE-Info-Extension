# Circular Dependency Catalog & Refactoring Guide

This document details the circular dependency import cycles identified by Graphify AST analysis in `FoE-Info-Extension`, their root causes, and guidelines for preventing regression bugs.

---

## 1. Overview of Detected Cycles

Graphify AST parsing discovered **14 three-file import cycles** in the codebase. All cycles follow a distinct architectural pattern where utility helper modules (`src/js/fn/*.js`) import the main dispatcher (`src/js/index.js`), which imports message service handlers (`src/js/msg/*Service.js`), which in turn reference helper functions back in `src/js/fn/*.js`.

### The Core Triangular Dependency Pattern

```mermaid
flowchart LR
    Index["src/js/index.js<br/>(Dispatcher)"]
    Service["src/js/msg/*Service.js<br/>(Domain Handlers)"]
    Fn["src/js/fn/{collapse,helper,copy,post}.js<br/>(UI & Utility Helpers)"]

    Index -->|imports & calls| Service
    Service -->|calls helper & copy| Fn
    Fn -->|calls checkDebug() / index state| Index
```

---

## 2. Catalog of 14 Circular Dependency Cycles

| Cycle # | Participating Files                                                                                                       | Root Cause Symbol                  | Impact & Danger                                                                                                                  |
| :-----: | :------------------------------------------------------------------------------------------------------------------------ | :--------------------------------- | :------------------------------------------------------------------------------------------------------------------------------- |
|  **1**  | `fn/collapse.js` $\rightarrow$ `index.js` $\rightarrow$ `msg/ArmyUnitManagementService.js` $\rightarrow$ `fn/collapse.js` | `checkDebug()` in `index.js`       | Modifying `checkDebug()` signature or initialization timing can cause runtime undefined errors during initial script evaluation. |
|  **2**  | `fn/helper.js` $\rightarrow$ `index.js` $\rightarrow$ `msg/ArmyUnitManagementService.js` $\rightarrow$ `fn/helper.js`     | `checkDebug()` / global state      | Global age/unit constants shared circularly across initialization.                                                               |
|  **3**  | `fn/collapse.js` $\rightarrow$ `index.js` $\rightarrow$ `msg/GreatBuildingsService.js` $\rightarrow$ `fn/collapse.js`     | Modal toggles & tooltips           | Great Building UI rendering triggering collapse handlers before `index.js` finishes loading.                                     |
|  **4**  | `fn/copy.js` $\rightarrow$ `index.js` $\rightarrow$ `msg/GreatBuildingsService.js` $\rightarrow$ `fn/copy.js`             | `fClipboardCopy()` / `DonorCopy()` | Clipboard formatting functions referencing global `index.js` variables.                                                          |
|  **5**  | `fn/helper.js` $\rightarrow$ `index.js` $\rightarrow$ `msg/GreatBuildingsService.js` $\rightarrow$ `fn/helper.js`         | Age calculation utilities          | `numAges` and `fHideTooltips()` circular references.                                                                             |
|  **6**  | `fn/collapse.js` $\rightarrow$ `index.js` $\rightarrow$ `msg/StartupService.js` $\rightarrow$ `fn/collapse.js`            | Startup debug toggles              | `checkDebug()` / `removeDebug()` / `toggleDebug()`.                                                                              |
|  **7**  | `fn/copy.js` $\rightarrow$ `index.js` $\rightarrow$ `msg/StartupService.js` $\rightarrow$ `fn/copy.js`                    | Player clipboard state             | Player info copying referencing `index.js` dispatch state.                                                                       |
|  **8**  | `fn/helper.js` $\rightarrow$ `index.js` $\rightarrow$ `msg/StartupService.js` $\rightarrow$ `fn/helper.js`                | Helper UI utils                    | Startup initialization calling helper rendering functions.                                                                       |
|  **9**  | `fn/collapse.js` $\rightarrow$ `index.js` $\rightarrow$ `msg/BonusService.js` $\rightarrow$ `fn/collapse.js`              | Boost collapse handlers            | Boost display UI toggling collapse states.                                                                                       |
| **10**  | `fn/helper.js` $\rightarrow$ `index.js` $\rightarrow$ `msg/CityProductionService.js` $\rightarrow$ `fn/helper.js`         | Production collection timers       | Timer calculation helpers referencing global index methods.                                                                      |
| **11**  | `fn/collapse.js` $\rightarrow$ `index.js` $\rightarrow$ `msg/ClanBattleService.js` $\rightarrow$ `fn/collapse.js`         | GvG collapse views                 | GvG map breakdown UI toggles.                                                                                                    |
| **12**  | `fn/helper.js` $\rightarrow$ `index.js` $\rightarrow$ `msg/ClanBattleService.js` $\rightarrow$ `fn/helper.js`             | GvG age translation                | `fGVGagesname()` circular lookup.                                                                                                |
| **13**  | `fn/collapse.js` $\rightarrow$ `index.js` $\rightarrow$ `msg/ConversationService.js` $\rightarrow$ `fn/collapse.js`       | Conversation modal views           | Chat overlay toggling.                                                                                                           |
| **14**  | `fn/helper.js` $\rightarrow$ `index.js` $\rightarrow$ `msg/ConversationService.js` $\rightarrow$ `fn/helper.js`           | Webhook message formatting         | Discord webhook payload posting (`fn/post.js`).                                                                                  |

---

## 3. Mitigation Guidelines for AI Agents & Refactoring Roadmap

> [!WARNING]
> When modifying `src/js/index.js`, `src/js/fn/*.js`, or `src/js/msg/*Service.js`, AI agents MUST observe the following refactoring rules to prevent cyclic import crashes:

1. **Decouple Global State into `src/js/fn/globals.js`**:
   - Do NOT import `index.js` into helper functions just to call `checkDebug()` or retrieve state.
   - Access or register debug toggles via [`src/js/fn/globals.js`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/src/js/fn/globals.js) or pass state parameters explicitly into functions.
2. **Dependency Injection in Services**:
   - Pass helper callback parameters into service handlers rather than statically importing `index.js` at module top-level.
3. **Graphify Verification**:
   - After refactoring any of the cycle files, execute `npm run graphify-update` to verify if the cycle count decreased in `graphify-out/GRAPH_REPORT.md`.
