# FoE-Info Extension — Software Architecture

FoE-Info is a Chrome Manifest V3 (MV3) extension for Forge of Empires. It observes the game's live InnoGames JSON-RPC traffic and parses it into economic, combat, guild, and city state views, with no game mutation, request injection, or botting.

Traffic reaches the pipeline over **two read-only intake paths**, both feeding the same dispatcher:

1. **DevTools network listener** (`src/js/devtools.js`) — the documented primary path, consuming the inspected tab's network events.
2. **MAIN-world content-script observer** (`src/js/protocol/xhrInterceptor.js` + `src/js/protocol/contentBridge.js`) — injected at `document_start` into `https://*.forgeofempires.com/game/*` in every build target. It wraps the page's `XMLHttpRequest`/`fetch`/`WebSocket` interfaces to observe traffic the DevTools listener may miss, and forwards envelopes through the ISOLATED-world bridge.

Neither path issues a game request or injects a DOM node. [SECURITY.md](../SECURITY.md) is the authoritative description of the boundary and of what each path does and does not authenticate.

## Core Data Pipeline

```text
InnoGames CDN & Game Client (RPC)
       │ (JSON-RPC network requests & responses)
       ├──────────────► DevTools Network Listener (`src/js/devtools.js`)
       │                        │
       └─ (page network APIs) ──► MAIN-world XHR Interceptor
                                    (`src/js/protocol/xhrInterceptor.js`)
                                    │ → ISOLATED-world Content Bridge
                                    │   (`src/js/protocol/contentBridge.js`)
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

Graph queries help locate this flow, but callback dependencies and dependencies
loaded by assignment inside `try` blocks can be absent from the graph. Verify
those connections in source before drawing dependency-direction conclusions.
The startup render barrier and metadata recovery tests cover stale completion,
pending timeouts, and resolution failure; they do not establish live-browser
behavior.

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

- **Cohesion Over Line Count**: A module holds one thing that changes for one reason. Length is a symptom, not the defect. Split when two parts change independently or on different schedules — for example when a user would name them as separate features, or when one part is arithmetic and the other is markup. Do **not** split sequential phases of a single operation; that only adds coupling.
  - Target range is 100–300 lines per module in `src/js/`. Modules that exceed it are expected: `msg/StartupService.js` and `msg/GuildBattlegroundService.js` are single-domain modules whose phases share one state owner, and `protocol/networkListener.js` is the intended result of consolidating that file's phases, which deliberately reversed an earlier micro-file split. Read current sizes from the audit below rather than from numbers copied here.
  - `npm run audit:refs -- --strict` lists modules over 500 lines. Treat that list as a prompt to check for a feature boundary, not as a violation to fix by splitting.
  - For agents, the practical test: if you cannot summarize a file's job in one sentence, an agent will misread it. A 1100-line file with a clear spine (`initialize → resolve → boost → render → dispatch`) is navigable; a 300-line file with nine unrelated helpers is not.
- **Zero Static Game Metadata**: Game metadata streams strictly from the live InnoGames CDN and RPC responses. No entity dumps or static game JSON inside `src/`.
- **Passive Observation Only**: No botting, automation, active clicking, or request injection into the game client. The MAIN-world interceptor observes the page's network interfaces; it never sends a request on the player's behalf.
- **BigNumber Precision**: Forge points, Great Building locks, treasury deposits, and boost calculations must preserve exact arithmetic without floating-point drift.
- **Strict Debuggability**: Every service, calculator, and renderer instantiates a scoped logger via `createLogger('ModuleName')`.

## Module Loading Policy

`package.json` sets `"type": "commonjs"`: native Node loads `.js` files as CommonJS and `.mjs` files as ESM. The extension is not loaded by native Node; webpack bundles six browser entry points in `webpack.common.js` and accepts both `import`/`export` and `require()`/`module.exports` in its module graph. UI and bridge entries use ESM syntax, while the standalone MAIN-world interceptor is a plain script. Many files within `src/js/` still use CommonJS, especially `calc/`. Neither syntax implies that a file is independently runnable in Node: browser globals, stylesheets, and transitive imports may require webpack.

For native Node tests, use `require()` for CJS-compatible `.js` modules; `.mjs` tests may import them and use the CJS namespace/default interop that Node actually exposes. Do not assume webpack's synthetic named-import behavior matches native Node, and do not `require()` an ESM-syntax `.js` entry under the current package type. Root webpack configs are `.js` CommonJS; scripts and tests include both `.js` CommonJS and `.mjs` ESM. Keep the explicit `.js` suffix in relative source imports.

`webpack.common.js` resolves `.ts`, `.js`, `.mjs`, and `.json`, disables the `fs` browser fallback, and provides `browser` via `webextension-polyfill`. **Decision: retain the working hybrid**, rather than migrate `calc/` for syntax uniformity. Retention keeps today's native Node test imports and webpack consumers intact; incremental ESM migration would remove the dual syntax but require changing `.js` loading under Node or moving files to `.mjs`, plus updating every CJS consumer and webpack import. Any later conversion must verify both the bundled entry and native Node test consumers of each converted module. Mixed syntax by itself is not a contract failure.

The passing `npm run typecheck` gate checks declarations plus four runtime calculator leaves with `checkJs: true`: `src/js/calc/utils/bignumberUtils.js`, `src/js/calc/utils/eraUtils.js`, `src/js/calc/goods/goodsClassification.js`, and `src/js/calc/boosts/CastleBoostCalculator.js`. The broader `npm run typecheck:calc` migration audit checks all of `calc/` and still reports errors; extend the passing slice only after resolving the new files' diagnostics, not by loosening `strict` or silencing them with `any`.

Mechanical layer checks and historical debt policy are documented in
[repository contracts](repository-contracts.md). Run `npm run contracts:diff` for
a changed-file check and `npm run contracts:audit` for the full audit; the full
audit is included in `npm run verify`.
