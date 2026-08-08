# Codebase Conventions & Service Architecture

Guidelines for code structure, DOM manipulation, service dispatching, and math utilities in `FoE-Info-Extension`.

## Git & Remote Workflow Invariants

- **Git Push Approval**: NEVER execute `git push` or modify remote branches without explicit, prior user approval in chat. Local commits and branch checkouts can be created, but remote push operations must strictly wait for user authorization.
- **Branch Preservation**: NEVER delete, prune, or force-reset local topic or scratch branches (e.g. `fix/...`, `feat/...`) without explicit, prior user confirmation.

## Documentation Hierarchy & Scope

- **Top-Level Overviews (`docs/*.md`)**: Focus on macro architecture, Chrome Manifest V3 security boundaries, network interception lifecycle, and high-level sequence diagrams.
- **Internal Knowledgebase (`docs/knowledgebase/*.md`)**: Store granular module audits, function catalog breakdowns, circular dependency analyses, and agent maintenance guides.

## Code Conventions & Interfaces

- **Modular Services (`src/js/msg/`)**:
  - Network message handling is split into 11 domain-specific service files: `StartupService.js`, `GreatBuildingsService.js`, `GuildBattlegroundService.js`, `OtherPlayerService.js`, `ArmyUnitManagementService.js`, `BonusService.js`, `CityProductionService.js`, `ClanBattleService.js`, `ConversationService.js`, `GuildExpeditionService.js`, and `ResourceService.js`.
  - Service functions accept parsed JSON payload objects and update global state / DOM UI accordingly.
- **UI, Storage & Helper Utilities (`src/js/fn/`)**:
  - [`AddElement.js`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/src/js/fn/AddElement.js): Overlay container & button construction (`fAddCollapseIcon()`, `fCopyIcon()`, `fPostButton()`, `fCloseButton()`).
  - [`collapse.js`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/src/js/fn/collapse.js): Panel collapsibility & visibility toggles (`fCollapseStats()`, `fCollapseBattleground()`, `fCollapseArmy()`, `fCollapseFriends()`).
  - [`constants.js`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/src/js/fn/constants.js): System security constants (`salt`).
  - [`copy.js`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/src/js/fn/copy.js): Clipboard string formatting for FP investments, donor ratios & GBG status (`BattlegroundCopy()`, `DonorCopy()`).
  - [`globals.js`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/src/js/fn/globals.js): Extension global UI state setters (`setToolOptions()`, `setFriendsSize()`, `setBattlegroundSize()`, `setArmySize()`).
  - [`helper.js`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/src/js/fn/helper.js): General UI helpers, age translations (`numAges`, `fGVGagesname()`), incident indicators (`fShowIncidents()`).
  - [`post.js`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/src/js/fn/post.js): Discord Webhook alert dispatching (`postToDiscord()`, `postAlerttoDsicord()`).
  - [`storage.js`](file:///var/home/kronikpillow/Projects/FoE-Info-Extension/src/js/fn/storage.js): Async wrapper for `chrome.storage.local` persistent state management.
  - DOM selection and event binding use jQuery 3.7 (`$`).
- **Precision Math**:
  - Always use `bignumber.js` (`BigNumber`) for large Forge of Empires resource, point, or donor calculation math to prevent JS IEEE 754 float precision loss.
- **Date Formatting**:
  - Use `dayjs` for timestamp parsing and date formatting.
- **Error Handling**:
  - Wrap network payload extraction in guard clauses (`checkDebug()`) to prevent uncaught runtime errors from disrupting the main game loop.
