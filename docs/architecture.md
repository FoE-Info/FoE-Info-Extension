# FoE-Info Extension — Software Architecture

FoE-Info is a Chrome Manifest V3 (MV3) extension for Forge of Empires. It observes the game's live InnoGames JSON-RPC traffic and parses it into economic, combat, guild, and city state views, with no game mutation, request injection, or botting.

Traffic reaches the pipeline over **two read-only intake paths**, both feeding the same dispatcher:

1. **DevTools network listener** (`src/js/devtools.mjs`) — the documented primary path, consuming the inspected tab's network events.
2. **MAIN-world content-script observer** (`src/js/protocol/xhrInterceptor.js` + `src/js/protocol/contentBridge.mjs`) — injected at `document_start` into `https://*.forgeofempires.com/game/*` in every build target. It wraps the page's `XMLHttpRequest`/`fetch`/`WebSocket` interfaces to observe traffic the DevTools listener may miss, and forwards envelopes through the ISOLATED-world bridge.

Neither path issues a game request or injects a DOM node. The [security architecture](security-architecture.md) describes what each path observes and authenticates.

## Core Data Pipeline

```text
InnoGames CDN & Game Client (RPC)
       │ (JSON-RPC network requests & responses)
       ├──────────────► DevTools Network Listener (`src/js/devtools.mjs`)
       │                        │
       └─ (page network APIs) ──► MAIN-world XHR Interceptor
                                    (`src/js/protocol/xhrInterceptor.js`)
                                    │ → ISOLATED-world Content Bridge
                                    │   (`src/js/protocol/contentBridge.mjs`)
                                    ▼
                         Network Listener (`src/js/protocol/networkListener.js`)
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
DevTools Panel Viewport (`src/chrome/panel.html`)
```

## Packet Ordering and Replay Suppression

`protocol/networkListener.js` serializes calls to `MessageDispatcher.dispatchRaw`
through `enqueueOrderedDispatch`. Ordering follows entry into this promise chain;
sequence numbers do not drive a reorder buffer. Each call waits for the previous
dispatch to settle, including parsing and awaited service handlers. This prevents
a later small packet from overtaking an earlier packet that yields before parsing,
at the cost of delaying packets behind a slow dispatch. A rejected dispatch does
not poison the chain; `processContentDirect` logs dispatch exceptions.

`utils/intakePolicy.js` owns world/session generation tokens. The listener checks
tokens before enqueueing and again immediately before dispatch, rejecting queued
work from a superseded generation. These checks do not cancel a dispatch already
running, and calls without a token are accepted by the token policy. Direct calls
to the dispatcher bypass the listener's cross-packet sequencing.

Within a packet, `protocol/rawDispatchPipeline.js` decodes the body, checks the
dispatcher-owned dedup cache, parses JSON, correlates request data, and routes
direct metadata or an RPC batch. `protocol/batchExecutor.js` awaits messages in
priority-sorted order, isolates message failures, and yields periodically. Batch
priority is distinct from the listener's packet admission order.

`protocol/dedupCache.js` defaults to a one-second window and 500 entries. Its key
combines URL, decoded body length, a body sample (first and last 100 characters
for bodies over 200 characters), and the first 120 characters of request data.
This is bounded replay suppression rather than a full-payload equality check:
equal-length bodies with matching samples can collide. Cache insertion precedes
JSON parsing, so even a parse failure can suppress an immediate matching replay.
A cache hit does not extend its timestamp, and capacity eviction removes the
first key in insertion order.

## Startup Metadata and Render Coordination

`msg/StartupService.js` retains the latest startup payload and derived city
context. After processing city entities, `scheduleStartupRender` checks the
original city map for missing entity definitions. Missing definitions install a
loading placeholder through `state/StartupRenderState.js` and start resolution
through `msg/MetadataService.js` and `msg/MetadataResolver.js`. Successful
resolution releases the render barrier and reruns startup processing with the
saved payload, so aggregates incorporate the new metadata before rendering.

The default three-second timer only warns and retains the placeholder while
resolution is pending. A resolver failure, or a promise that settles without
calling the update callback, releases the barrier and renders the available
context. Each scheduled run has an identity guard: completion from a superseded
run cannot release the current run's barrier. `renderLiveCityStats` uses
`renderWhenStartupReady`, including when called by metadata subscriptions, to
avoid replacing the placeholder with intermediate aggregates.

`state/MetadataStore.js` owns entity aliases and metadata subscriptions.
`subscribeMetadataRenders` in the startup service coalesces notifications over
50 milliseconds, then refreshes collection times, notifies Blue Galaxy state,
and attempts the guarded city stats render, yielding between those steps. This
subscription is installed against the module's singleton store; the
`createStartupService` factory passes injected stores into entity processing but
does not install a separate subscription for them. Store reset clears subscribers,
so callers must account for subscription lifecycle when resetting the store.

## Architectural Layers

| Layer            | Path               | Responsibility                                                   | Invariants                                                              |
| :--------------- | :----------------- | :--------------------------------------------------------------- | :---------------------------------------------------------------------- |
| **Protocol**     | `src/js/protocol/` | Network interception, payload extraction, and route registration | Passive only; zero write-backs to game client                           |
| **Services**     | `src/js/msg/`      | InnoGames JSON-RPC service handlers (`*Service.js`)              | Single responsibility; decouples RPC from DOM                           |
| **Calculators**  | `src/js/calc/`     | Mathematical domain logic (boosts, GB investment, harvest yield) | Pure functions; zero DOM, zero jQuery, BigNumber precision for FP/locks |
| **State**        | `src/js/state/`    | Session state stores and dynamic metadata lookups                | 100% dynamic from live RPC; zero static game JSON                       |
| **UI Renderers** | `src/js/ui/`       | Modular DOM templates, card builders, event listeners            | Bootstrap 5.3, scoped CSS, accessibility, strict sanitization           |
| **Utilities**    | `src/js/utils/`    | Shared helpers: scoped logger, i18n dictionaries, storage        | Scoped loggers (`createLogger`) per module                              |
| **Parsers**      | `src/js/parsers/`  | Game-payload parsers feeding state and services                  | Pure transforms; no DOM, no network                                     |
| **Bindings**     | `src/js/fn/`       | Feature-scoped UI bindings and DOM helpers                       | Own their markup; reuse `utils/` helpers instead of duplicating them    |
| **View State**   | `src/js/vars/`     | Panel option and view state                                      | No business rules; no RPC knowledge                                     |

## Non-Negotiable Architectural Invariants

Module cohesion is a development boundary; the decision procedure and historical debt policy live in [repository contracts](repository-contracts.md).

- **Zero Static Game Metadata**: Game metadata streams strictly from the live InnoGames CDN and RPC responses. No entity dumps or static game JSON inside `src/`.
- **Passive Observation Only**: No botting, automation, active clicking, or request injection into the game client. The MAIN-world interceptor observes the page's network interfaces; it never sends a request on the player's behalf.
- **BigNumber Precision**: Forge points, Great Building locks, treasury deposits, and boost calculations must preserve exact arithmetic without floating-point drift.
- **Strict Debuggability**: Every service, calculator, and renderer instantiates a scoped logger via `createLogger('ModuleName')`.

## Module Loading Policy

## Module Loading Policy

`package.json` sets `"type": "commonjs"`: native Node loads `.js` files as CommonJS and `.mjs` files as ESM. The extension is not loaded by native Node; webpack bundles six browser entry points in `webpack.common.js` and accepts both `import`/`export` and `require()`/`module.exports` in its module graph. UI and bridge entries use ESM syntax, while the standalone MAIN-world interceptor is a plain script. Many files within `src/js/` still use CommonJS, especially `calc/`. Neither syntax implies that a file is independently runnable in Node: browser globals, stylesheets, and transitive imports may require webpack.

Runtime JavaScript module behavior is summarized here. Native Node test conventions and migration procedures belong to [contribution guidance](../CONTRIBUTING.md#source-modules-and-tests).

Panel sizes are shared extension presentation preferences under `panelSizes`.
The compatibility `toolOptions` accessor reads/writes that shared key; legacy
world-specific size values are not applied. Without shared customization, every
world uses the same per-panel defaults. Game data, option toggles, donations and
collapse state retain their world scope. Only explicit resize-handle interactions
persist panel heights; content and collapse layout changes must not change size
preferences.

RewardService publishes received income through shared reward state, retaining
explicit producer sources independently of the current view. Collection payloads
feed income; purchase costs, auction bids, historical Event History entries and
cumulative inventory counts do not. Quest completion deduplication resets when a
quest returns to an active cycle, allowing recurring rewards to accumulate while
suppressing repeated completion snapshots. Great Building payouts use the supplied
final FP amount without applying Arc a second time.

InventoryService owns the available inventory-package FP total. Absolute
`updateItem` stock notifications and authoritative Great Building package totals
update that shared BigNumber state so FP Status and donation calculations use the
same balance.

Great Buildings construction/ranking responses reconcile complete rankings,
including the owner’s unranked FP, before publishing donors, information and
suggested donations. Explicit response progress overrides cached city metadata.
A ranked viewer’s self row alone does not establish complete owner progress.
Donation evaluation skips an occupied position when its investment is at least
the remaining level cost: a new donor cannot surpass it before the level closes.
