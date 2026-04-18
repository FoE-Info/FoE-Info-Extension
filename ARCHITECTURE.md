# FoE-Info Architecture

This document summarizes the current request-flow architecture after handler extraction and TypeScript migration.

## High-Level Flow

1. Network/service messages are received by the main extension runtime.
2. Dispatcher logic routes each message by requestClass and requestMethod.
3. Specialized request-handler modules process payloads.
4. Service modules aggregate state and render UI fragments.
5. Shared utilities handle storage, formatting, posting, and copy/export behavior.

## Core Entry Points

1. src/extension/index.ts:

- Initializes runtime state.
- Wires message routing.
- Connects UI state, options, and services.

2. src/extension/options.ts:

- Options page state persistence.
- Local storage synchronization for toggles and tool settings.

3. src/extension/popup.ts:

- Popup interaction logic and options navigation.

## Request Handler Layer

Request handlers in src/extension/msg are split by service domain to keep routing deterministic and testable.

Primary handler files:

1. CityMapRequestHandler.ts
2. ClanBattleRequestHandler.ts
3. ClanServiceRequestHandler.ts
4. GreatBuildingsRequestHandler.ts
5. GuildBattlegroundRequestHandler.ts
6. GuildBattlegroundSignalsRequestHandler.ts
7. GuildExpeditionRequestHandler.ts
8. InventoryRequestHandler.ts
9. MiscRequestHandler.ts
10. OtherPlayerRequestHandler.ts
11. RewardAndBlueprintRequestHandler.ts
12. StartupRequestHandler.ts

## Service Layer

Service modules own domain-specific aggregation and rendering behavior.

Examples:

1. ArmyUnitManagementService.ts
2. BonusService.ts
3. CityProductionService.ts
4. ClanBattleService.ts
5. ConversationService.ts
6. GreatBuildingsService.ts
7. GuildBattlegroundService.ts
8. GuildExpeditionService.ts
9. OtherPlayerService.ts
10. ResourceService.ts
11. StartupService.ts

## Styling Layer

1. src/css/main.scss:
   Global style entry.
2. src/css/custom.scss:
   Shared extension-specific styling and semantic tokens.
3. src/css/options.scss:
   Options page styling.
4. src/css/popup.scss:
   Popup page styling.

## Testing and Validation

1. tests/handlers:
   Vitest regression coverage for handler behavior.
2. npm run typecheck:
   Strict compile-time validation for migrated TypeScript.

## Design Principles

1. Keep request parsing in handler modules, not in UI templates.
2. Keep service side effects explicit and localized.
3. Prefer typed payload shapes close to usage points.
4. Preserve behavior parity when refactoring legacy logic.
5. Maintain one focused commit per migration or styling slice where practical.
