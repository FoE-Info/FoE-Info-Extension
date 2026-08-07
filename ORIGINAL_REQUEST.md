# Original User Request

## Follow-up — 2026-08-07T04:27:17Z

Comprehensive Markdown architecture and API documentation for the FoE-Info-Extension repository in the `docs/` directory.

Working directory: /var/home/kronikpillow/Projects/FoE-Info-Extension
Integrity mode: development

## Requirements

### R1. Architecture & Extension Lifecycle Guide (`docs/architecture.md`)

Document the high-level Chrome Manifest V3 architecture, entrypoints (`src/js/index.js`, `src/chrome/devtools.js`, `src/chrome/popup.js`, `src/chrome/options.js`), DevTools network interception model (`handleRequestFinished`), Webpack bundling strategy (`foe-info-webstore.config.js`), and global event loop flow. Include at least two Mermaid sequence/flow diagrams.

### R2. Network Message Services Reference (`docs/services.md`)

Document all 11 domain service handlers in `src/js/msg/` (`StartupService`, `GreatBuildingsService`, `GuildBattlegroundService`, `OtherPlayerService`, `ArmyUnitManagementService`, `BonusService`, `CityProductionService`, `ClanBattleService`, `ConversationService`, `GuildExpeditionService`, `ResourceService`). For each service, detail its purpose, intercepted game API payloads, parsed data structures, and state mutations.

### R3. UI Helpers & Utilities Guide (`docs/utilities.md`)

Document helper modules in `src/js/fn/` (`AddElement.js`, `collapse.js`, `globals.js`, `helper.js`, `post.js`, `copy.js`, `storage.js`, `constants.js`), including DOM creation helpers, accordion collapse triggers, clipboard copy formats, Discord webhooks, and BigNumber math requirements.

## Acceptance Criteria

### Documentation Coverage & Quality

- [ ] `docs/architecture.md` exists, is >500 words, and includes Mermaid sequence diagrams of Chrome DevTools network interception.
- [ ] `docs/services.md` exists, is >1000 words, and covers all 11 domain service modules in `src/js/msg/`.
- [ ] `docs/utilities.md` exists, is >500 words, and documents all helper modules in `src/js/fn/`.
- [ ] All markdown documents use standard GitHub Flavored Markdown and contain clickable file links to relevant source files.
- [ ] All code blocks and JSON payload examples are properly formatted and valid syntax.
