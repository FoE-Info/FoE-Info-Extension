# FoE-Info Extension — Software Architecture

FoE-Info is a Chrome Manifest V3 (MV3) extension for Forge of Empires. It operates purely via passive DevTools network observation, parsing live InnoGames JSON-RPC payloads into economic, combat, guild, and city state views without game mutation, injection, or botting.

## Core Data Pipeline

```text
InnoGames CDN & Game Client (RPC)
       │ (JSON-RPC network requests & responses)
       ▼
DevTools Network Listener (`src/js/devtools.js`)
       │
       ▼
Network Interceptor (`src/js/protocol/network-interceptor.js`)
       │ (envelopes: requestData, responseData)
       ▼
Message Dispatcher (`src/js/protocol/MessageDispatcher.js`)
       │ (routes to registered services by serviceName.methodName)
       ├──► CityProductionService (`src/js/msg/CityProductionService.js`)
       ├──► GreatBuildingsService (`src/js/msg/GreatBuildingsService.js`)
       ├──► GuildBattlegroundService (`src/js/msg/GuildBattlegroundService.js`)
       ├──► GuildExpeditionService (`src/js/msg/GuildExpeditionService.js`)
       ├──► ArmyUnitManagementService (`src/js/msg/ArmyUnitManagementService.js`)
       ├──► HiddenRewardService (`src/js/msg/HiddenRewardService.js`)
       └──► Other Domain Services (`src/js/msg/`)
             │
             ├──► State Store (`src/js/state/`) — In-memory session state & live dynamic metadata
             │
             ├──► Pure Calculators (`src/js/calc/`) — Boosts, GB locks, era mappings, harvest yields
             │
             ▼
Modular UI Renderers (`src/js/ui/render*Panel.js`)
       │ (DOM generation, badge counts, tables, tooltips)
       ▼
DevTools Panel Viewport (`src/html/panel.html`)
```

## Architectural Layers

| Layer            | Path               | Responsibility                                                   | Invariants                                                              |
| :--------------- | :----------------- | :--------------------------------------------------------------- | :---------------------------------------------------------------------- |
| **Protocol**     | `src/js/protocol/` | Network interception, payload extraction, and route registration | Passive only; zero write-backs to game client                           |
| **Services**     | `src/js/msg/`      | InnoGames JSON-RPC service handlers (`*Service.js`)              | Single responsibility; decouples RPC from DOM                           |
| **Calculators**  | `src/js/calc/`     | Mathematical domain logic (boosts, GB investment, harvest yield) | Pure functions; zero DOM, zero jQuery, BigNumber precision for FP/locks |
| **State**        | `src/js/state/`    | Session state stores and dynamic metadata lookups                | 100% dynamic from live RPC; zero static game JSON                       |
| **UI Renderers** | `src/js/ui/`       | Modular DOM templates, card builders, event listeners            | Bootstrap 5.3, scoped CSS, accessibility, strict sanitization           |
| **Utilities**    | `src/js/utils/`    | Shared helpers: scoped logger, i18n dictionaries, storage        | Scoped loggers (`createLogger`) per module                              |

## Non-Negotiable Architectural Invariants

- **File Size Ceiling**: Maximum 600 lines per module in `src/js/` (absolute dispatch ceiling 800 lines). Target: 100–300 lines. See [.agents/rules/modular-architecture.md](../.agents/rules/modular-architecture.md).
- **Zero Static Game Metadata**: Game metadata streams strictly from the live InnoGames CDN and RPC responses. No entity dumps or static game JSON inside `src/`.
- **Passive Observation Only**: No botting, automation, active clicking, or request injection into the game client.
- **BigNumber Precision**: Forge points, Great Building locks, treasury deposits, and boost calculations must preserve exact arithmetic without floating-point drift.
- **Strict Debuggability**: Every service, calculator, and renderer instantiates a scoped logger via `createLogger('ModuleName')`.

## Agent & Environment Integration

Antigravity operates directly against the repository's canonical `.agents/` configuration:

- Tools, subagent execution, and lifecycle hooks are documented in [.agents/references/antigravity-environment.md](../.agents/references/antigravity-environment.md).
- Verification gates and pipelines are defined in [docs/COMMANDS.md](COMMANDS.md).
- Automation opportunities and Python SDK integration design are documented in [docs/specs/2026-09-19-google-antigravity-sdk-automation.md](specs/2026-09-19-google-antigravity-sdk-automation.md).
