# FoE-Info Graph Knowledge

> Durable architecture knowledge for the `foe-info` Graphify profile. This document is a synthesized knowledge base, not a chronological query transcript. Direct graph evidence is separated from labeled inference. No application source was changed during this verification.

## Executive architecture summary

The graph describes a passive Manifest V3 browser-extension architecture organized around an ingress-to-dispatch-to-domain-service pipeline:

1. **Composition and bridge setup** — `src/js/index.js` is the principal composition root. It imports the network listener, dispatcher, bridge setup, startup/domain services, render bindings, UI bindings, state, theme, formatter, and logger modules. `src/js/protocol/indexBridgeSetup.js` connects service registration and legacy/UI bridge setup.
2. **Network and protocol ingress** — `src/js/protocol/networkListener.js` coordinates request/network handling, game-version synchronization, world-origin detection, content classification, duplicate suppression, and packet handoff. `devtools.js`, `devtoolsBridge.js`, and the network helper modules form the browser/DevTools boundary.
3. **Dispatch and service registration** — `src/js/protocol/MessageDispatcher.js` is the central dispatch contract. `src/js/msg/registerServices.js` imports and registers the domain service set, including metadata, resources, inventory, boosts, great buildings, city, treasury, guild, expedition, and army services.
4. **State, metadata, calculations, and presentation** — domain services feed state modules, `MetadataStore`, and calculation modules. Startup, storage, render bindings, UI bindings, panel dispatch, and domain renderers consume the resulting state and expose panel behavior.

A graph-supported dependency shape is:

```text
browser/DevTools entry
  -> networkListener
  -> MessageDispatcher
  -> registerServices + domain services
  -> domain state + MetadataStore + storage
  -> calculators and derived views
  -> UI bindings + panelDispatcher + domain renderers
```

The arrows summarize graph relationships. They do not prove a complete runtime event sequence; asynchronous ordering and several indirect calls remain unresolved.

## Graph scope and coverage

- **Profile:** `graphify-foe-info`
- **Graph:** `graphify-out/graph.json`
- **Graph scale (2026-09-24 verification snapshot):** 3,228 nodes, 5,171 edges, 389 communities. The tracked graph has since been re-extracted and relabelled (2026-09-29); run `graph_stats` for the current figures rather than trusting any number copied here, including the per-node degrees quoted below.
- **Edge confidence (2026-09-24 snapshot):** 86% `EXTRACTED`, 14% `INFERRED`, 0% `AMBIGUOUS`. The 2026-09-29 re-extraction skewed further toward `EXTRACTED`; re-query for the current split.
- **Graph shape:** mixed code/documentation graph. Query results also contain `conductor/`, `docs/`, `CHANGELOG.md`, scripts, generated artifacts, package metadata, and DevTools URLs. Application conclusions below are restricted to graph nodes and relationships explicitly identified as code or named architectural boundaries.
- **Coverage performed:** `graph_stats`; `god_nodes`; subsystem BFS queries for ingress, dispatch, state/metadata, calculations, UI, and guild/combat; focused DFS queries for extension seams, startup/readiness, and dispatch contracts; exact `get_node` and `get_neighbors` queries for central nodes; directed and undirected `shortest_path` queries; and final central-node degree rechecks.
- **Representative communities observed:** `Game Version Tracker`, `Message Dispatcher`, `Batch Executor`, `Register Services`, `RPC Router`, `Direct Metadata`, `Dedup Cache`, `State Management`, `Metadata Store`, `Entity Resolver`, `Storage Listener`, `Startup Service`, `Startup Context`, `Startup Render Orchestrator`, `Index UI Bindings`, `Network Bridge`, `Panel Dispatcher`, `Great Building Calculator`, `Guild Battleground Service`, `Army Unit Management Service`, and domain-specific calculator/service/render communities.
- **Community-size limitation:** the queried MCP responses exposed community names but not a complete ranked community-size table. The names above are representative, not a complete ranking.
- **Source limitation:** this verification used Graphify MCP only. It did not inspect application source, start/stop an inference model, run semantic reindexing, or alter graph/AST files.

### Delegated investigation and main-agent ownership

A bounded, read-only `graph-knowledge-explorer` investigation was delegated with the profile, graph path, artifact path, Graphify-first requirement, and no-write boundaries. Its pass corroborated graph scale/confidence and named `MessageDispatcher`, `registerServices`, `networkBridge`, `panelDispatcher`, and `StartupService` as central components; it also identified state representation, panel detail, service-community detail, and direct-metadata-versus-dispatcher distinctions as gaps. The main agent independently planned and ran all catalog, subsystem, exact-node, neighbor, shortest-path, seam, risk, and central-node recheck queries. Claims about path direction, direct metadata bypassing the dispatcher, and community count were not imported unless main-agent queries supported them; the graph places raw dispatch and direct metadata inside the `MessageDispatcher` contract. The main agent separated direct evidence from inference, synthesized this document, wrote the artifact, and verified it. The subagent did not own the final artifact or synthesis.

## Major subsystem map

### Runtime composition and entry points

- `src/js/index.js` — degree 73; main composition root. Direct graph evidence connects it to `StartupService`, `MessageDispatcher`, `indexBridgeSetup`, `installPanelBridge`, `initIndexUiBindings`, `renderBindings`, `containerBinding`, `formatters`, `logger`, state symbols, and panel/state re-exports.
- `src/js/protocol/indexBridgeSetup.js` — degree 25; imports `registerAllServices`, `registerLegacyBridge`, `setCurrentView`, `clearVisitPlayer`, `cardVisibility`, `playerTooltip`, and `renderGuildPanel`; contains `setupIndexBridge()`.
- `src/js/protocol/devtoolsBridge.js` and `src/js/devtools.js` — DevTools/window bridge boundary. `devtools.js` imports `postNetworkEntry` and `postRequestFinished`; `devtoolsBridge.js` exposes `postToWindow`, `postNetworkEntry`, `postRequestFinished`, `createHostMessageHandler`, and `installPanelBridge`.
- `src/js/ui/indexUiBindings.js` — degree 37; UI composition hub. It imports storage, card visibility, runtime lifecycle, element bindings, and network bridge seams, and contains `initIndexUiBindings()`/`bootstrapExtensionUi()`.
- `src/js/utils/logger.js` and `createLogger()` — shared diagnostics surface; `god_nodes` reports `createLogger()` at 130 edges, the highest returned hub, although this mixed graph includes many logging/documentation relationships.

### Protocol and network ingress

Representative community: `Game Version Tracker`.

- `src/js/protocol/networkListener.js` — degree 34; central ingress coordinator and sole owner of the former micro-file responsibilities. It directly defines `isFoeNetworkUrl`, `detectAndSyncWorldOrigin`, `processContentDirect`, and `handleRequestFinished`, and imports `gameVersionTracker.js`, `MessageDispatcher.js`, and `logger.js`. Duplicate detection is not its contract: `isDuplicate`/`clearDedupCache` live on `MessageDispatcher` and are backed by `dedupCache.js`. A 2026 refactor (commit `9afabc1`, "consolidate micro-files into cohesive domain modules") absorbed the previous `networkContentReader.js`, `networkWorldDetector.js`, `networkPacketDispatcher.js`, `networkDevtoolsHandler.js`, and `networkPayloadDeduplicator.js`.
- `src/js/protocol/gameVersionTracker.js` — `getGameVersion`, `setGameVersion`, and `notifyGameVersionChange` are graph-visible version functions.
- `src/js/devtools.js` and `src/js/protocol/devtoolsBridge.js` — the DevTools entry and the host/window bridge; request/network entries are forwarded or buffered and posted onward.

### Dispatch, routing, and service registration

Representative communities: `Message Dispatcher`, `Batch Executor`, `Register Services`, `RPC Router`, `RPC Logger`, `Direct Metadata`, and `Dedup Cache`.

- `src/js/protocol/MessageDispatcher.js` — degree 42; the central dispatch contract. Its direct methods are `register`, `registerService`, `registerFallback`, `registerGlobalFallback`, `registerDirectMetadata`, `setDirectMetadataHandler`, `decodeBody`, `isDuplicate`, `clearDedupCache`, `parsePayload`, `dispatchSingle`, `dispatchBatch`, and `dispatchRaw`.
- `src/js/protocol/rpcRouter.js` — degree 8; `MessageDispatcher` imports it. It contains `RpcRouter`, `.register`, and `.registerService`; `.registerService()` calls `.register()`.
- `src/js/protocol/rpcRouter.js` — also owns the out-of-scope filtering policy that previously lived in `rpcScope.js` (absorbed in `9afabc1`): `IGNORED_RPC_CLASSES`, `isIgnoredRpcClass`, and `shouldLogUnhandledRpc` are all defined here, and `window.foeShowIgnoredRpc` is installed by the same module.
- `src/js/protocol/MessagePriorityManager.js` — contains `.setPriority`, `.getMessagePriority`, and `.sortBatch`; `MessageDispatcher` imports it and its constructor calls the manager constructor.
- `src/js/protocol/rawDispatchPipeline.js` — degree 13; imports request-payload extraction, direct-metadata routing, and request-payload correlation. Its `executeRawDispatch` node is graph-visible as an inferred call target.
- `src/js/protocol/batchExecutor.js`, `payloadCodec.js`, `dedupCache.js`, `directMetadata.js`, `requestPayload.js`, and `requestPayloadCorrelator.js` — graph-visible supporting dispatch/codec/deduplication/metadata nodes.
- `src/js/msg/registerServices.js` — degree 78; service composition/registration hub. It imports `MessageDispatcher` and the service set: hidden rewards, castle, boosts, allies, inventory, outpost, auto-aid, friends tavern, treasury, quests, item exchange, time, emissary, resources, guild raids, great buildings, city production, city map, metadata, other player, conversation, guild battleground, guild expedition, and army unit management. It contains `registerAllServices()` and `registeredDispatchers`.
- `src/js/protocol/indexBridgeSetup.js` directly imports `registerServices`; `setupIndexBridge()` calls `registerAllServices()` and `registerLegacyBridge()`.

### State, persistence, and metadata

Representative communities: `State Management`, `Metadata Store`, `Entity Resolver`, `Metadata Service`, `Storage Listener`, `Storage Bootstrap`, `Factory Settings`, and `Options Storage`.

- `src/js/state/state.js` — degree 39; broad mutable/global state owner. Direct neighbors include `MetadataStore`, `utils/storage.js`, logger/debug functions, and setters/getters for URL, rewards, player identity, guild identity/permissions/position, ignored players, game origin, player-name cache, time, targets, and debug state. Incoming edges include `indexEntityDefs.js`, `panelDispatcher.js`, `renderTreasuryPanel.js`, `ui/RewardRenderer.js`, `OtherPlayerService.js`, and `GbDonationService.js`.
- `src/js/state/MetadataStore.js` — module-node degree 32; its exact class node has degree 46. The shared metadata registry directly exposes entity/domain registration and lookup methods plus `getEntity`, `peekEntity`, `reportEntityLookup`, legacy city proxies, `whenReady`, `isReady`, `markReady`, `subscribe`, `unsubscribe`, and `notifySubscribers`.
- Metadata consumers include `helper.js`, `liveNameResolver.js`, `GuildBattlegroundService.js`, `MetadataService.js`, `MetadataResolver.js`, `StartupService.js`, `TradeService`, and `state/state.js`.
- `src/js/msg/MetadataService.js` — imports `MetadataResolver`, `MessageDispatcher`, `scheduler`, and logger. `GbgMetadataHandler` no longer exists; GBG metadata lives in `GbgSignalService`/`GuildBattlegroundService`. Its graph-visible processing chain includes metadata entry/data processing, missing city/unit resolution, and metadata-updated notification.
- `src/js/state/indexEntityDefs.js` — links entity definitions, `MetadataService`, `StartupService`, and state.
- `src/js/state/storageListener.js` — degree 18; imports `storageWorldSettings.js` and `storageMetadataHydrator.js`; contains storage change/receive initialization and world/debug/hydration functions.
- `src/js/ui/storageBootstrap.js` — degree 11; storage initialization and usage logging boundary consumed by `indexUiBindings`.
- `src/js/msg/StartupService.js` — absorbed `StartupStateInitializer.js` and `StartupRenderOrchestrator.js` in `9afabc1`. It owns `initStartupUser`, `resetCityStartupState`, `updateCombatTotals`, `initializeStartupSession`, `createTimingTracker`, `createStartupContext`, `renderWhenStartupReady`, `scheduleStartupRender`, `subscribeMetadataRenders`, and `detectMissingCityEntities`, and imports `StartupRenderState` and `scheduler`.

### Calculations and shared numeric abstractions

- `src/js/calc/GreatBuildingCalculator.js` — degree 17; imports `bignumber.js` and logger. Inferred call nodes include `calculateOwnerSafeAdd`, `calculateSpotLock`, `calculateArcReward`, `calculateSuggestedDonation`, `calculateDonorOutcome`, `calculateSafeSpots`, `getSafePlaces`, `isPlacePassable`, and `calculateLevelClosingProfit`. Direct consumers are `msg/GreatBuildingsService.js`, `msg/GbDonationService.js`, `calc/gbDonationPlaceEvaluator.js`, `ui/gbDonationPanel.js`, and `ui/greatBuildingsPanel.js`.
- `src/js/calc/utils/bignumberUtils.js` — degree 15; imports `bignumber.js` and contains `toBigNumber()`. Direct consumers include `BlueGalaxyCalculator`, `MilitaryBoostCalculator`, `CityStatsCalculator`, `goods/GoodsCalculator.js`, production/aid calculators/parsers/accumulators, `units/UnitCalculator.js`, and `VisitedCityStatsCalculator`.
- `src/js/calc/BlueGalaxyCalculator.js`, `CityStatsCalculator.js`, `VisitedCityStatsCalculator.js`, `goods/GoodsCalculator.js`, `units/UnitCalculator.js`, `MilitaryBoostCalculator.js`, `boosts/CastleBoostCalculator.js`, `prod/ProductionCalculator.js`, `aidStatsBoostCalculator.js`, and the production parsers/accumulators form the visible derived-data layer. Several calculators were subfoldered by domain after `2bd0ff6`; check `src/js/calc/{goods,units,prod,boosts,entities,utils}/` before assuming a flat layout.
- `BigNumber` and `bignumberUtils.js` are cross-cutting numeric boundaries. The graph proves shared imports, not a complete precision policy or every arithmetic invariant.

### UI bindings and panel dispatch

Representative communities: `Index UI Bindings`, `Panel Dispatcher`, `Network Bridge`, `Card Visibility`, `Factory Settings`, `Bootstrap`, and domain-specific render communities.

- `src/js/ui/indexUiBindings.js` — degree 37; imports `networkBridge.js`, `storageListener.js`, `storageBootstrap.js`, `cardVisibility.js`, `runtimeLifecycle.js`, `uiElementBindings.js`, formatter/logger helpers, and contains storage/UI/lifecycle initialization. Graph edges show `bootstrapExtensionUi()` calling `initIndexUiBindings()` and `initIndexUiBindings()` calling storage bootstrap, storage listeners, runtime lifecycle, element bindings, and network bridge binding.
- `src/js/ui/networkBridge.js` — degree 17; imports `MessageDispatcher`, `initNetworkListeners`, `cardVisibility`, and logger; contains `bindNetworkBridge()` and `safeRequire`/`resolveDep` seams.
- `src/js/ui/panelDispatcher.js` — degree 19; imports `state/state.js`, treasury rendering, logger, and exports `setCurrentView`/`clearElement`. It has inferred cleanup paths for visit-player, expedition, battleground, main-city, startup, and cultural views.
- `src/js/ui/cardVisibility.js` and `cardVisibilityConfig.js` — context-aware panel visibility, panel IDs, allowed-panel sets, and view application.
- `src/js/ui/renderBindings.js` — degree 1; its only direct neighbor is `js/index.js` via `imports_from`. This sparse node is a coverage gap, not evidence that the module has no runtime role.
- Domain rendering is consolidated into panel modules (`galaxyPanel.js`, `gbgPanel.js`, `armyPanel.js`, `investedPanel.js`, `treasuryPanel.js`, `expeditionPanel.js`, `renderCityStats.js`, `renderGuildPanel.js`), dispatched through `panelDispatcher.js`. The separate `treasuryRenderBinding.js`, `gbgRenderBinding.js`, `armyRenderBinding.js`, `expeditionRenderBinding.js`, `galaxyRenderBinding.js`, and `startupRenderBinding.js` files no longer exist; `rewardRenderBinding.js` is the one render-binding module still present, and `renderBindings.js` composes the UI bindings.

### Guild, combat, and player-domain services

- `src/js/msg/GuildBattlegroundService.js` — imports `GuildBattlegroundState` (from `GuildDomainState.js`), `MetadataStore`, `GbgSignalService`, and logger; the former `Gbg*Handler`/`Gbg*Utils` modules are gone. It exposes signal, province, leaderboard, building-cost, pending-update, registration, and state access functions. The service is a major guild/combat hub.
- `GuildRaidsService.js` — degree 11; service registration and overview/state/ranking handlers are graph-visible.
- `GuildExpeditionService.js` — degree 14; registered service with expedition parser integration.
- `src/js/msg/ArmyUnitManagementService.js` — degree 22; registered service with era inference, army state, and unit-management functions.
- `src/js/msg/BoostService.js` — degree 22; registered service importing `MessageDispatcher` and `bignumber.js`; contains feature boost matrices, `addBoost`, and `applyBoostsToCity`.
- `src/js/msg/CityMapService.js`, `CityProductionService.js`, `ResourceService.js`, `InventoryService.js`, `TreasuryService.js`, `AllyService.js`, `ConversationService.js`, `OtherPlayerService.js`, and `EmissaryService.js` are additional registered domain boundaries visible in `registerServices` and subsystem queries.
- Domain state is consolidated into four modules by `9afabc1`; the former per-domain state files no longer exist. `GuildDomainState.js` owns `GuildBattlegroundState`, `ExpeditionState`, `TreasuryState`, and `QuantumState`. `CityDomainState.js` owns `ResourceState`, `OutpostState`, `BlueGalaxyState`, and `BonusState`. `GreatBuildingDomainState.js` owns `GreatBuildingsState`. `ArmyState.js` remains standalone. Service and panel modules reference these state objects as consumers, not as definition sites.

## Central nodes and architectural hubs

The `god_nodes` result is a mixed-graph ranking and includes symbols, scripts, documentation, and duplicated labels. The exact file-node degrees below are the more useful architecture evidence from `get_node`. **Every degree in this table is the 2026-09-24 snapshot value** and the graph has been re-extracted and relabelled since; several have already moved (`registerServices` 78→87, `StartupService` 68→112, `networkListener` 34→57, `GuildBattlegroundService` 53→65, `MetadataStore` 32→42, `MessageDispatcher` 42→63, `renderBindings` 1→55, `logger.js` 150→120). Re-query before citing a number.

| Node                                                                                                    |               Degree | Architectural role                                                               |
| ------------------------------------------------------------------------------------------------------- | -------------------: | -------------------------------------------------------------------------------- |
| `src/js/msg/registerServices.js`                                                                        |                   78 | Service import/registration hub                                                  |
| `src/js/index.js`                                                                                       |                   73 | Main composition root and public re-export boundary                              |
| `src/js/msg/StartupService.js`                                                                          |                   68 | Startup coordination and cross-domain initialization                             |
| `src/js/msg/GuildBattlegroundService.js`                                                                |                   53 | Guild battleground service and combat/UI state hub                               |
| `src/js/state/MetadataStore.js`                                                                         | 32 module / 46 class | Shared metadata registry and readiness/subscription boundary                     |
| `src/js/protocol/MessageDispatcher.js`                                                                  |                   42 | Central RPC/message dispatch contract                                            |
| `src/js/state/state.js`                                                                                 |                   39 | Broad global/account/guild/reward/target/debug state                             |
| `src/js/ui/indexUiBindings.js`                                                                          |                   37 | UI composition, storage, lifecycle, and bridge hub                               |
| `src/js/msg/MetadataService.js`                                                                         |                   34 | Metadata ingestion/resolution service                                            |
| `src/js/protocol/networkListener.js`                                                                    |                   34 | Network ingress coordinator                                                      |
| `src/js/msg/GreatBuildingsService.js`                                                                   |                   47 | Great-building state, ranking, donation, and calculation coordination            |
| `src/js/msg/BoostService.js`                                                                            |                   22 | Boost ingestion/application boundary                                             |
| `src/js/msg/ArmyUnitManagementService.js`                                                               |                   22 | Army/unit management boundary                                                    |
| `src/js/ui/panelDispatcher.js`                                                                          |                   19 | Panel selection and cleanup boundary                                             |
| `src/js/ui/networkBridge.js`                                                                            |                   17 | Dispatcher/network-to-UI bridge                                                  |
| `src/js/calc/GreatBuildingCalculator.js`                                                                |                   17 | Great-building calculation boundary                                              |
| `src/js/calc/utils/bignumberUtils.js`                                                                   |                   15 | Shared numeric conversion boundary                                               |
| `src/js/protocol/indexBridgeSetup.js`                                                                   |                   25 | Service/legacy/UI bridge setup                                                   |
| `src/js/protocol/rawDispatchPipeline.js`                                                                |                   13 | Raw payload, direct metadata, and correlation pipeline                           |
| `src/js/protocol/rpcRouter.js`                                                                          |                   17 | RPC routing plus the logging/ignore scope absorbed from the former `rpcScope.js` |
| `src/js/ui/renderBindings.js`                                                                           |                    1 | Sparse graph node imported by composition root                                   |
| Additional exact symbol-node checks reconcile the delegated hub pass with the mixed `god_nodes` result: |

| Exact node ID                                  | Degree | Architectural role                                                          |
| ---------------------------------------------- | -----: | --------------------------------------------------------------------------- |
| `src_js_utils_logger_createlogger`             |    130 | Cross-subsystem diagnostics utility                                         |
| `src_js_fn_collapsestate_setcollapse`          |     32 | UI collapse/toggle control hub                                              |
| `src_js_msg_startupservice_startupservice`     |     20 | Startup service function boundary                                           |
| `src_js_calc_utils_bignumberutils_tobignumber` |     27 | Shared numeric conversion function                                          |
| `package_dependencies_bignumber_js`            |      1 | Package dependency node, distinct from the `god_nodes` label `bignumber.js` |

The `god_nodes` result and exact package-dependency node are not contradictory when they refer to different graph nodes: the broad label `bignumber.js` has a returned degree of 30, while `package_dependencies_bignumber_js` has degree 1. The delegated pass also returned build-script paths into application nodes; those paths traverse package/scripts metadata and were not treated as runtime ingress.

`god_nodes(top_n=30, exclude_hubs_percentile=100)` returned `createLogger()` at 130 edges, `scripts` at 54, `MetadataStore` at 46 and 33, `setCollapse()` at 32, `bignumber.js` at 30, `toBigNumber()` at 27, `startupService()` at 20, then domain/service/state/UI candidates including `StartupRenderState`, `GuildBattlegroundState`, `MetadataDomainCollections`, `InventoryService`, `MetadataRelations`, `BonusState`, `QuestService`, `TreasuryService`, `BlueGalaxyState`, `ResourceState`, `OutpostService`, `isDebugEnabled()`, `TreasuryState`, `CastleSystemService`, `TimeService`, `formatStatNumber()`, `renderCityStats()`, `getStorageLocal()`, and `initWorldStorage()`. This is a mixed graph ranking, not a runtime-only centrality measure. Exact file-node degrees in the table are the architecture baseline; exact symbol rechecks resolved ambiguous labels for `StartupRenderState`, `InventoryService`, `TreasuryService`, `setCollapse()`, `toBigNumber()`, and `MetadataStore`.

### Likely entry points

- **Composition:** `src/js/index.js`.
- **DevTools/network entry:** `src/js/devtools.js` and `src/js/protocol/devtoolsBridge.js`.
- **Network initialization:** `src/js/protocol/networkListener.js` and `initNetworkListeners()`.
- **Service composition:** `src/js/msg/registerServices.js` and `registerAllServices()`.
- **Startup coordination:** `src/js/msg/StartupService.js` and `startupService()`.
- **UI initialization:** `src/js/ui/indexUiBindings.js` and `bootstrapExtensionUi()`.

## Key relationships and dependency paths

### Bootstrap, service registration, and network ingress

Direct graph path:

```text
js/index.js
  --imports_from--> indexBridgeSetup.js
  --imports_from--> registerServices.js
  --imports_from--> MessageDispatcher.js
```

`setupIndexBridge()` directly calls `registerAllServices()` and `registerLegacyBridge()`. The shortest undirected path from `networkListener.js` to `registerServices.js` is:

```text
networkListener.js
  --imports_from--> MessageDispatcher.js
  <--imports_from-- registerServices.js
```

The path is a dependency path through the dispatcher. It is not evidence that `networkListener` directly invokes `registerServices`.

The direct network path is:

```text
networkListener.js
  -> MessageDispatcher.js        (dispatchRaw)
       payloadCodec.js            body decode
       dedupCache.js              duplicate detection
  -> devtoolsBridge.js / contentBridge.js   DevTools + MAIN-world forwarding
```

The `networkContentReader`/`networkWorldDetector`/`networkPacketDispatcher`/`networkDevtoolsHandler`/`networkPayloadDeduplicator` micro-files named in earlier passes no longer exist; their responsibilities were absorbed by `networkListener.js`, `payloadCodec.js`, `dedupCache.js`, and `devtoolsBridge.js`. The sequence above is the current module structure; exact event ordering among content reading, world detection, direct dispatch, request-finished handling, and deduplication remains unresolved.

### Dispatch to services and routing

`MessageDispatcher` has direct incoming imports from `registerServices.js`, `networkBridge.js`, and many domain services. It imports `rpcRouter.js`, `rawDispatchPipeline.js`, `MessagePriorityManager.js`, and scheduler/logging helpers. The direct `MessagePriorityManager` evidence includes the dispatcher's constructor call to the manager constructor and the manager's priority/sort methods.

`rawDispatchPipeline.js` directly imports `requestPayload.js`, `directMetadata.js`, and `requestPayloadCorrelator.js`. Focused DFS evidence records `MessageDispatcher.dispatchRaw()` → `executeRawDispatch()` → request extraction, correlation, and direct-metadata routing; `dispatchBatch()` connects to `executeBatchDispatch()`; the dispatcher constructor creates `RpcRouter`; and `RpcRouter` imports `shouldLogUnhandledRpc`. Exact precedence among route, fallback, direct metadata, raw dispatch, and batch handling remains unresolved.

### Startup, state, metadata, and persistence

Direct graph relationships include:

```text
StartupService.js --imports_from--> StartupStateInitializer.js
StartupService.js --imports_from--> StartupRenderOrchestrator.js
StartupService.js --imports_from--> MetadataStore
MetadataService.js --imports_from--> MetadataStore
MetadataService.js --imports_from--> MetadataResolver.js
state/state.js --imports_from--> MetadataStore
storageListener.js --imports_from--> storageWorldSettings.js
storageListener.js --imports_from--> storageMetadataHydrator.js
indexUiBindings.js --imports_from--> storageListener.js
indexUiBindings.js --imports_from--> storageBootstrap.js
```

The shortest undirected path from `MetadataService.js` to `state/state.js` is:

```text
MetadataService.js
  <--imports_from-- indexEntityDefs.js
  --imports_from--> state/state.js
```

This establishes a dependency path through entity definitions. It does not by itself establish metadata write order or mutation semantics.

`MetadataStore` directly exposes entity/domain registration and lookup methods plus `whenReady`, `isReady`, `markReady`, `subscribe`, `unsubscribe`, and `notifySubscribers`. Storage paths directly call metadata hydration functions: change handling → `hydrateLookupDefinitions()` and `hydrateCityEntitiesFromChange()`; receive/snapshot handling → `hydrateLookupDefinitions()` and `hydrateCityEntitiesFromSnapshot()`. The exact readiness/persistence/render order remains a follow-up target.

### Calculation to service and presentation

The shortest undirected path from `GreatBuildingCalculator.js` to `renderBindings.js` is:

```text
GreatBuildingCalculator.js
  <--imports_from-- GreatBuildingsService.js
  <--imports_from-- js/index.js
  --imports_from--> renderBindings.js
```

Direct calculator consumers are `msg/GreatBuildingsService.js`, `msg/GbDonationService.js`, `calc/gbDonationPlaceEvaluator.js`, `ui/gbDonationPanel.js`, and `ui/greatBuildingsPanel.js`; the `gbDonationTables.js` and `gbPlaceTableRows.js` modules named in the 2026-09-24 pass no longer exist. The graph supports a calculator-to-service-to-composition dependency path. It does not prove which render event invokes the calculator. `renderBindings.js` itself has degree 1 in this graph, so its internal render topology is a coverage gap rather than evidence of no runtime role.

The numeric boundary is explicit:

```text
bignumberUtils.js --imports_from--> bignumber.js
bignumberUtils.js <--imports_from-- GreatBuildingCalculator.js
GreatBuildingCalculator.js <--imports_from-- GreatBuildingsService.js
```

`bignumberUtils.js` is imported by blue-galaxy, military-boost, city-stats, goods, production/aid, unit, and visited-city calculation nodes. Exact `toBigNumber()` rechecks show direct calls from galaxy economics, boost tallying, city/visited-city stats, goods processing, production parsers/accumulators, and unit processing. This is a cross-cutting numeric conversion seam; the graph does not prove every arithmetic invariant.

### UI and panel paths

`networkBridge.js` directly imports `MessageDispatcher` and `initNetworkListeners`; its shortest path to the dispatcher is one hop. `indexUiBindings.js` imports `networkBridge.js` and storage/lifecycle/visibility helpers. `panelDispatcher.js` imports `state/state.js` and treasury rendering, and is imported by `indexBridgeSetup.js`.

The shortest undirected path from `networkListener.js` to `panelDispatcher.js` is:

```text
networkListener.js
  <--imports_from-- js/index.js
  --re_exports--> panelDispatcher.js
```

This is a composition/re-export path, not proof of a direct network-to-panel runtime call. A separate two-hop undirected path connects the panel dispatcher's treasury re-export through `js/index.js` to the dispatcher import. Panel renderers and domain render bindings are connected through their own state/service neighborhoods.

### Guild and combat path

Direct service and state edges include:

```text
registerServices.js --imports_from--> GuildBattlegroundService.js
GuildBattlegroundService.js --imports_from--> GuildBattlegroundState.js
GuildBattlegroundService.js --imports_from--> MetadataStore
GuildBattlegroundService.js --imports_from--> GuildDomainState.js (GuildBattlegroundState)
GuildBattlegroundService.js --imports_from--> MetadataStore.js
GuildBattlegroundService.js --imports_from--> GbgSignalService.js
```

The separate `GbgMapUtils.js`, `GbgSignalPayloadHandler.js`, `GbgLeaderboardHandler.js`, and `GbgTimeFormatter.js` modules no longer exist; their province, leaderboard, signal, and time helpers are internal to `GuildBattlegroundService.js` / `gbgPanel.js` or live in `GbgSignalService.js`.

`gbgRenderBinding.js` was renamed to `src/js/ui/renderGbgTargets.js`; it imports `logger`, `escapeHTML`, and `serviceDomBridge` and renders GBG target messages, with `renderTargetMessage()` as its graph-visible entry. Battleground result cards live in `src/js/ui/gbgPanel.js` (`renderBattlegroundResultCard`). `armyRenderBinding.js` no longer exists; army rendering lives in `src/js/ui/armyPanel.js`. The guild/combat service-to-state-to-render seam still holds, while exact signal/update/render ordering is not proven.

## Control-flow and data-flow boundaries

### Directly observed boundaries

- **Browser/DevTools → protocol:** `devtools.js`, `devtoolsBridge.js`, request-finished handlers, network entries, and host/window message functions.
- **Protocol ingress → dispatch:** URL/content classification, world/version synchronization, packet processing, duplicate checks, and `MessageDispatcher` handoff.
- **Dispatch → domain:** dispatcher registration methods, service imports, RPC routing, raw dispatch, direct metadata, and batch/codec/dedup helpers.
- **Services → state:** service modules import or call domain/global state setters and domain state modules; the graph exposes these as `imports_from`, `imports`, `calls`, or `indirect_call` relationships.
- **Services → metadata:** metadata service/resolver, guild service, startup service, live-name resolver, helper, trade service, and global state import `MetadataStore`; metadata registration/readiness/subscription nodes cross this boundary.
- **State/metadata → calculations:** calculation modules import metadata/state-facing abstractions and shared utilities. The graph does not expose every input field or invocation.
- **Services/calculations → presentation:** service and renderer/binding nodes consume state, calculated values, and shared formatters; panel dispatch controls view selection/cleanup.
- **Storage → runtime/UI:** storage listener, metadata hydrator, world settings, storage bootstrap, and index UI bindings are connected by direct imports and initialization calls.

### Cross-subsystem control/data flow

The strongest graph-supported control/data seams are:

1. `networkListener` selects/filters network material and hands it to protocol/dispatch modules.
2. `MessageDispatcher` and `registerServices` form the service registration boundary.
3. Domain services write or expose state through global state, domain state modules, `MetadataStore`, and storage-facing modules.
4. `StartupService` coordinates state initialization, entity coordination, boost coordination, metadata readiness, and render orchestration.
5. Calculators share BigNumber and metadata/state inputs, then feed service and renderer neighborhoods.
6. UI bridges bind dispatcher/network events, storage changes, visibility, lifecycle, and panel dispatch.

The ordering of these seams is partly inferred from names, degrees, and import topology. Only edges marked `EXTRACTED` below are treated as direct graph evidence; `INFERRED` edges are not proof of runtime invocation.

## Important contracts, services, state owners, and shared abstractions

### Dispatch and protocol contracts

- `MessageDispatcher`: registration, fallback, direct metadata, decode, duplicate detection, parsing, priority sorting, and single/batch/raw dispatch.
- `RpcRouter`: route registration and unhandled-RPC scope integration.
- `rpcScope`/`rpcLogger`: ignored/unhandled RPC classification and logging.
- `MessagePriorityManager`: priority assignment and batch sorting.
- `rawDispatchPipeline`: raw payload extraction, direct metadata routing, and request correlation.
- `networkListener`, `payloadCodec`, `dedupCache`, and `devtoolsBridge`: the ingress filtering, origin/version, packet decode, request-finished, and deduplication contracts that the former network micro-files used to own.

### Service registration and domain services

- `registerServices.js` is the service composition contract.
- `StartupService`, `MetadataService`, `MetadataResolver`, `GreatBuildingsService`, `GbDonationService`, `BoostService`, `CityMapService`, `CityProductionService`, `ResourceService`, `InventoryService`, `TreasuryService`, `GuildBattlegroundService`, `GuildRaidsService`, `GuildExpeditionService`, and `ArmyUnitManagementService` are graph-visible service boundaries.
- `GuildBattlegroundService` is the highest-degree exact guild/combat service node at degree 53.
- `GreatBuildingsService` is degree 47 and connects state, registry, donation, calculator, startup, city map, conversation, and UI-oriented service neighborhoods.

### State owners

- `state/state.js` owns a broad global/account/guild/reward/target/debug surface by graph-visible setters/getters and consumers.
- `MetadataStore` owns metadata registration/lookup/readiness/subscription nodes.
- Domain state nodes include `GuildBattlegroundState`, `ArmyState`, `ExpeditionState`, `GreatBuildingsState`, `BlueGalaxyState`, `BonusState`, `ResourceState`, `TreasuryState`, `OutpostState`, `QuantumState`, and `StartupRenderState`.
- Exact authority between global state, domain state, metadata, storage, and renderer-local state is unresolved.

### Shared abstractions

- `BigNumber`/`bignumberUtils.js`: numeric conversion and precision boundary.
- `MetadataStore`, `MetadataResolver`, `entityResolver`, `metadataDomainCollections`, and `metadataRelations`: entity/metadata identity and lookup boundary.
- `storage.js`, `worldStorage.js`, `storageWorldSettings.js`, `storageMetadataHydrator.js`, `storageListener.js`, and `storageBootstrap.js`: persistence/hydration boundary.
- `logger.js`/`createLogger()`: shared diagnostics boundary.
- `scheduler.js`: asynchronous scheduling boundary.
- `formatters.js`, `statFormatters.js`, card visibility, and render-binding modules: presentation contracts.

## Extension points and integration seams

The following are graph-supported seams. The “use” language is an implementation recommendation, not a direct graph fact.

1. **New RPC/domain service:** add or extend a service module and include it in the `registerServices.js` import/registration set; preserve the dispatcher registration contract.
2. **New protocol route or payload type:** inspect and extend `networkListener`, `rawDispatchPipeline`, `payloadCodec`, `requestPayload`, `directMetadata`, and `MessageDispatcher` together. `RpcRouter`, `rpcScope`, and priority management are routing/logging/order boundaries.
3. **New metadata entity/lookup:** extend `MetadataStore` registration/lookup/relation methods and the `MetadataService`/`MetadataResolver` path; account for `whenReady`, `markReady`, subscriptions, persistence hydration, and entity aliases.
4. **New global or domain state:** choose the graph-visible owner deliberately. Global fields appear in `state/state.js`; domain fields appear in domain state nodes. Avoid assuming that an import proves write ownership.
5. **New derived metric:** place the calculation in the relevant calculation module and use the existing `BigNumber`/`bignumberUtils` boundary where numeric conversion is required; connect the result through a service and existing render seam.
6. **New panel/view:** extend `indexUiBindings`, `renderBindings`, `panelDispatcher`, card-visibility configuration, and the relevant domain render binding. Preserve view cleanup for existing inferred panel cleanup paths.
7. **Storage-backed behavior:** use the storage listener/bootstrap/hydrator boundaries and verify both snapshot and change paths.
8. **Diagnostics:** use `createLogger()`/the logger boundary rather than introducing an unrelated logging contract.
9. **Guild/combat behavior:** register through `registerServices`, use `GuildBattlegroundState`/`ArmyState`/related domain state, and connect through the existing GBG/army render bindings.

## Risk hotspots and areas needing caution

### High-connectivity and high-impact nodes

- `registerServices.js` degree 78: changes affect service registration breadth.
- `js/index.js` degree 73: changes affect composition, bridge setup, UI, network, and public re-exports.
- `StartupService.js` degree 68: startup/state/metadata/boost/render coordination risk.
- `GuildBattlegroundService.js` degree 53: guild/combat state, metadata, signal, map, leaderboard, and UI blast radius.
- `MetadataStore.js` degree 46: shared entity identity, readiness, and subscriber behavior.
- `GreatBuildingsService.js` degree 47 and `GreatBuildingCalculator.js`: ranking/donation/calculation precision and presentation risk.
- `MessageDispatcher.js` degree 42: common convergence point for registered and raw dispatch.
- `state/state.js` degree 39: broad mutable state with multiple service/UI consumers.
- `indexUiBindings.js` degree 37: UI/storage/lifecycle/bridge composition risk.

### Semantic and data-integrity risks

- **Numeric correctness:** BigNumber is a shared dependency, but the graph does not establish complete precision invariants for all arithmetic.
- **Metadata identity/readiness:** missing, stale, duplicate, or late entity registration can affect city entities, names, guild data, resources, technologies, units, and derived calculations.
- **Network filtering/deduplication:** incorrect URL/content filtering, world detection, duplicate suppression, or payload correlation can drop or stale-initialize updates.
- **Dispatch precedence:** route, fallback, priority, direct metadata, and raw-dispatch ordering is not fully exposed; the 14% inferred-edge rate increases this caution.
- **State ownership:** `state/state.js` and domain state modules may overlap; graph imports do not prove authoritative writes.
- **Startup ordering:** readiness, storage hydration, service registration, metadata resolution, and render scheduling are connected but not fully ordered.
- **Panel cleanup:** `panelDispatcher` exposes inferred cleanup paths for several views; stale DOM/listener behavior is a presentation risk.
- **Mixed graph noise:** documentation, changelog, scripts, package metadata, generated artifacts, and DevTools URLs can inflate hub metrics and produce paths that are not application runtime paths.
- **Ambiguous labels:** `MessageDispatcher`, `MetadataStore`, and `MessagePriorityManager` each match multiple graph nodes; exact IDs were required for reliable node queries.

## Observed graph facts

- The graph contains 3,228 nodes, 5,171 edges, and 389 communities.
- Graph edge confidence is 86% `EXTRACTED`, 14% `INFERRED`, and 0% `AMBIGUOUS`.
- `src/js/index.js` is degree 73 and directly imports/re-exports core runtime, network, state, service, and UI boundaries.
- `src/js/msg/registerServices.js` is degree 78 and directly imports the domain service set and `MessageDispatcher`.
- `src/js/msg/StartupService.js` is degree 68 and directly imports startup state/render, metadata, boost, city, resource, and UI support modules.
- `src/js/protocol/MessageDispatcher.js` has exact node ID `src_js_protocol_messagedispatcher_messagedispatcher`, degree 42, and exposes registration, fallback, decode, dedupe, parse, priority, single, batch, and raw dispatch methods.
- `src/js/state/MetadataStore.js` has exact node ID `src_js_state_metadatastore_metadatastore`, degree 46, and exposes metadata registration/lookup/readiness/subscription methods.
- `src/js/state/state.js` is degree 39 and includes player, guild, reward, target, time, origin, name-cache, and debug state nodes.
- `src/js/ui/indexUiBindings.js` is degree 37; `src/js/ui/networkBridge.js` is degree 17; `src/js/ui/panelDispatcher.js` is degree 19.
- `src/js/msg/GuildBattlegroundService.js` is degree 53 and directly imports `GuildBattlegroundState`, `MetadataStore`, GBG handlers, and time/map utilities.
- `src/js/calc/GreatBuildingCalculator.js` is degree 17 and directly imports BigNumber; direct consumers include great-building service, donation service, and UI table modules.
- `src/js/calc/utils/bignumberUtils.js` is degree 15 and directly serves multiple calculation subsystems.
- `networkListener` has direct neighbors for content reading, world detection, packet dispatch, request-finished handling, duplicate detection, version tracking, and `MessageDispatcher`.
- `indexBridgeSetup` directly imports `registerServices`, `panelDispatcher`, `legacyBridge`, card visibility, player tooltip, and guild rendering; `setupIndexBridge()` calls service and legacy bridge registration.
- `MetadataService` directly imports `MetadataStore`, `MetadataResolver`, `GbgMetadataHandler`, `MessageDispatcher`, scheduler, and logger.
- `storageListener` directly imports world-settings and metadata-hydrator modules; `indexUiBindings` directly imports storage listener/bootstrap.
- `renderBindings.js` has degree 1 and only a direct `imports_from` neighbor to `js/index.js` in the queried result.
- The graph contains documentation, changelog, conductor, script, package, generated, and DevTools URL nodes alongside application code.
- The delegated graph-knowledge-explorer independently corroborated graph scale/confidence and central components. The main agent reverified exact file-node degrees, direct calls/imports, shortest paths, and the final hub set.

## Inferences

The following are **inferences**, not direct graph facts:

- The runtime is layered around ingress → dispatch → services → state/metadata/calculations → presentation. **Inference from direct imports, node neighborhoods, and shortest paths.**
- `registerServices.js` is the service composition seam and `MessageDispatcher` is the runtime dispatch seam. **Inference from their direct imports, registration methods, and high degrees.**
- `MetadataStore` is a shared readiness-gated metadata registry. **Inference from `whenReady`, `isReady`, `markReady`, subscription methods, and cross-domain consumers.**
- `StartupService` coordinates startup state/entity/boost/render work. **Inference from its direct imports of `StartupStateInitializer`, `StartupRenderOrchestrator`, `StartupBoostCoordinator`, `MetadataStore`, and domain state.**
- UI updates are bridge/lifecycle/storage driven rather than uniformly direct DOM writes from every service. **Inference from `networkBridge`, `indexUiBindings`, `runtimeLifecycle`, storage listeners, render bindings, and panel dispatch topology.**
- Guild/combat services feed dedicated state modules and panel renderers. **Inference from the direct `GuildBattlegroundService`/`GuildBattlegroundState`/`renderGbgTargets` and `ArmyUnitManagementService`/`ArmyState`/`armyPanel` neighborhoods.**
- The 14% inferred-edge population likely includes meaningful runtime relationships, but it must not be treated as equivalent to extracted call evidence. **Inference from graph confidence labels and the number of inferred call/import paths.**

## Unresolved questions and coverage gaps

1. What is the exact initialization order among `js/index.js`, `setupIndexBridge`, `registerAllServices`, `StartupService`, storage bootstrap, metadata hydration, `MetadataStore.markReady`, and first render?
2. Which services publish UI updates directly, which publish through storage, and which wait for metadata readiness?
3. What is the authoritative state ownership split between `state/state.js`, domain state modules, `MetadataStore`, storage, and renderer-local state?
4. What is the exact precedence and fallback order among `RpcRouter`, `MessageDispatcher`, `MessagePriorityManager`, `rawDispatchPipeline`, direct metadata, and batch dispatch?
5. Which exact methods in `renderBindings.js` connect domain state to panels, given its degree-1 graph representation?
6. Which graph edges represent actual runtime calls rather than imports, re-exports, or inferred collection/argument edges?
7. What are the largest communities and member distributions? MCP exposed names but not a complete ranked size table.
8. How are metadata snapshots, storage changes, lookup hydration, and live resolver updates ordered?
9. How do storage migration/listener failures propagate into service state and UI visibility?
10. What are the complete numeric and semantic invariants for great-building, boost, treasury, production, and guild/combat calculations beyond shared BigNumber conversion?
11. Which panel cleanup methods are real call paths versus inferred collection edges?
12. How much do documentation, generated, script, package, and DevTools URL nodes distort hub rankings and shortest paths?
13. Why does the broad `bignumber.js` label report degree 30 while exact package/dependency and module nodes report different degrees?
14. What service-community membership and direct-metadata precedence details are absent from the mixed graph?

## Graph query evidence

### Catalog and confidence

- `graph_stats(project_path=...)`:
  - Nodes: `3228`
  - Edges: `5171`
  - Communities: `389`
  - `EXTRACTED`: `86%`
  - `INFERRED`: `14%`
  - `AMBIGUOUS`: `0%`
- `god_nodes(top_n=30, exclude_hubs_percentile=100, project_path=...)`:
  - Returned `createLogger()` 130, `scripts` 54, `MetadataStore` 46 and 33, `setCollapse()` 32, `bignumber.js` 30, `toBigNumber()` 27, `startupService()` 20, `StartupRenderState` 18, `GuildBattlegroundState` 18, `MetadataDomainCollections` 18, and the other hub candidates listed in the central-nodes section.
- `god_nodes(top_n=25, exclude_hubs_percentile=80, project_path=...)`:
  - Returned a four-edge filtered sample including `BonusService`, `Settlement`, `createToggle()`, `hideAllTooltips()`, `formatBoostText()`, `getBattleground()`, and `scheduleStartupRender()`.

### Broad and focused `query_graph` queries

All queries used the declared project path. Broad subsystem passes used BFS depth 3 with `imports`, `imports_from`, `calls`, `indirect_call`, `contains`, `method`, `references`, and `re_exports` filters as applicable. Focused contract passes used DFS depth 3–4 and narrower `calls`/import/method filters.

- Protocol/ingress: network listener, content reader, world detector, packet dispatcher, DevTools handler, deduplicator, dispatcher, and DevTools bridge.
- Dispatch/registration: `MessageDispatcher`, `RpcRouter`, scope/logger, priority manager, raw pipeline, batch executor, direct metadata, and `registerServices`.
- State/metadata: global state, `MetadataStore`, metadata service/resolver, entity definitions, storage listener/hydrator, startup initializer/orchestrator/state.
- Calculations: great-building, BigNumber, blue-galaxy, city/visited-city stats, goods, production/aid, unit, and boost calculators.
- UI: index bindings, network bridge, panel dispatcher, render bindings, storage bootstrap, card visibility, and lifecycle.
- Guild/combat: GBG service/state/handlers/render binding, guild raids/expedition, army service/state, and target/combat views.
- Extension seams: service registration, direct metadata, metadata collections, storage hydration, render bindings, and inventory numeric calls.
- Startup/readiness: startup service, entity coordinator, render orchestrator/state, metadata readiness, storage hydration, entity definitions, and startup UI.
- Dispatch contracts: dispatcher methods, router construction, priority sorting, raw extraction/correlation/direct metadata, and batch execution.
- Hotspot/risk rechecks: central state, metadata, guild, numeric, logging, collapse, service, and UI nodes.

### Exact node/degree queries

| Queried label or ID                                   | Result                                                                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `src_js_index`                                        | degree 73, community `Webextension Polyfill`                                                            |
| `src_js_msg_registerservices`                         | degree 78, community `Great Buildings Services`                                                         |
| `src_js_msg_startupservice`                           | degree 68, community `Startup Service`                                                                  |
| `src_js_msg_greatbuildingsservice`                    | degree 47, community `Great Buildings Service`                                                          |
| `src_js_protocol_messagedispatcher_messagedispatcher` | degree 42, community `Message Dispatcher`                                                               |
| `src_js_state_metadatastore`                          | degree 32, community `Entity Resolver`; class node `src_js_state_metadatastore_metadatastore` degree 46 |
| `src_js_state_state`                                  | degree 39, community `State Management`                                                                 |
| `src_js_ui_indexuibindings`                           | degree 37, community `Index UI Bindings`                                                                |
| `src_js_ui_networkbridge`                             | degree 17, community `Network Bridge`                                                                   |
| `src_js_ui_paneldispatcher`                           | degree 19, community `Panel Dispatcher`                                                                 |
| `src_js_msg_metadataservice`                          | degree 34, community `Metadata Service`                                                                 |
| `src_js_msg_guildbattlegroundservice`                 | degree 53, community `Guild Battleground Service`                                                       |
| `src_js_msg_guildraidsservice`                        | degree 11, community `Guild Raids Service`                                                              |
| `src_js_msg_guildexpeditionservice`                   | degree 14, community `Guild Expedition Service`                                                         |
| `src_js_msg_armyunitmanagementservice`                | degree 22, community `Army Unit Management Service`                                                     |
| `src_js_msg_boostservice`                             | degree 22, community `Boost Service`                                                                    |
| `src_js_msg_inventoryservice_inventoryservice`        | degree 16, community `Inventory Service`                                                                |
| `src_js_msg_treasuryservice_treasuryservice`          | degree 15, community `Treasury Service`                                                                 |
| `src_js_state_startuprenderstate_startuprenderstate`  | degree 18, community `Startup Render State`                                                             |
| `src_js_state_guildbattlegroundstate`                 | degree 5, community `Guild Battleground State`                                                          |
| `src_js_calc_greatbuildingcalculator`                 | degree 17, community `Great Building Calculator`                                                        |
| `src_js_calc_utils_bignumberutils`                    | degree 15, community `Aid Stats Boost Calculator`                                                       |
| `src_js_calc_utils_bignumberutils_tobignumber`        | degree 27, community `Entity Motivation`                                                                |
| `src_js_fn_collapsestate_setcollapse`                 | degree 32, community `City Collapse`                                                                    |
| `src_js_msg_startupservice_startupservice`            | degree 20, community `Startup Service`                                                                  |
| `src_js_protocol_rawdispatchpipeline`                 | degree 13, community `Direct Metadata`                                                                  |
| `src_js_protocol_rpcrouter`                           | degree 8, community `RPC Router`                                                                        |
| `src_js_state_storagelistener`                        | degree 18, community `Storage Listener`                                                                 |
| `src_js_ui_gbgrenderbinding`                          | degree 27, community `Guild Battleground State`                                                         |
| `src_js_ui_renderbindings`                            | degree 1, community `Webextension Polyfill`                                                             |
| `src_js_utils_logger`                                 | degree 150, community `Account Parser`; `createLogger()` hub degree 130                                 |

### Direct neighbor queries

The following exact node IDs were queried with `get_neighbors`; direct output included both inbound and outbound edges:

- `src_js_index`
- `src_js_protocol_networklistener`
- `src_js_protocol_messagedispatcher_messagedispatcher`
- `src_js_protocol_messageprioritymanager_messageprioritymanager`
- `src_js_protocol_rawdispatchpipeline`
- `src_js_protocol_rpcrouter`
- `src_js_msg_registerservices`
- `src_js_protocol_indexbridgesetup`
- `src_js_msg_startupservice` and `src_js_msg_startupservice_startupservice`
- `src_js_msg_guildbattlegroundservice` and `src_js_state_guildbattlegroundstate`
- `src_js_state_state`
- `src_js_state_metadatastore` and `src_js_state_metadatastore_metadatastore`
- `src_js_state_storagelistener`
- `src_js_state_startuprenderstate_startuprenderstate`
- `src_js_msg_inventoryservice_inventoryservice`
- `src_js_msg_treasuryservice_treasuryservice`
- `src_js_ui_indexuibindings`
- `src_js_ui_networkbridge`
- `src_js_ui_paneldispatcher`
- `src_js_ui_gbgrenderbinding`
- `src_js_ui_renderbindings`
- `src_js_calc_greatbuildingcalculator`
- `src_js_calc_utils_bignumberutils` and `src_js_calc_utils_bignumberutils_tobignumber`
- `src_js_fn_collapsestate_setcollapse`
- `src_js_utils_logger`

Representative direct relationship evidence:

- `networkListener --imports_from--> gameVersionTracker`, `MessageDispatcher`, `logger` (snapshot-era edges also named the now-absorbed network micro-files).
- `MessageDispatcher --contains--> register`, `registerService`, `registerFallback`, `registerDirectMetadata`, `decodeBody`, `parsePayload`, `dispatchSingle`, `dispatchBatch`, `dispatchRaw`; service files have `imports_from` edges into the dispatcher.
- `registerServices --imports_from--> MessageDispatcher` and the domain service files; `indexBridgeSetup --imports_from--> registerServices`.
- `state/state --imports_from--> MetadataStore`, storage, logger, and state setter/getter nodes; `indexEntityDefs`, `panelDispatcher`, treasury rendering, and reward rendering have inbound imports.
- `MetadataStore --contains--> registerEntity`, `registerEntities`, lookup, readiness, subscription, and notification methods; helper, live-name resolver, guild service, metadata service/resolver, startup service, trade service, and state import it.
- `indexUiBindings --imports_from--> networkBridge`, storage listener/bootstrap, card visibility, runtime lifecycle, UI element bindings, and formatters/logger; its initialization nodes call storage/lifecycle/network bridge setup.
- `GuildBattlegroundService --imports_from--> GuildBattlegroundState`, `MetadataStore`, GBG leaderboard/map/signal/time handlers, and logger; `registerServices --imports_from--> GuildBattlegroundService`.
- `GreatBuildingCalculator --imports_from--> bignumber.js`; `bignumberUtils --imports_from--> bignumber.js`; service/UI table modules import the calculator.
- `RawDispatchPipeline --imports_from--> requestPayload`, `directMetadata`, and `requestPayloadCorrelator`; `MessagePriorityManager` methods are called from the dispatcher constructor.

### Shortest-path queries

- `networkListener.js` → `MessageDispatcher`, directed: 2 hops, `networkListener.js --imports_from--> MessageDispatcher.js --contains--> MessageDispatcher`.
- `networkListener.js` → `registerServices.js`, undirected: 2 hops through `MessageDispatcher.js`; dependency path, not a direct runtime call.
- `panelDispatcher` treasury re-export → dispatcher, undirected: 2 hops through `js/index.js`.
- `MessageDispatcher` → `GuildBattlegroundState`, undirected: 3 hops through `registerServices.js` and `GuildBattlegroundService.js`.
- `GreatBuildingCalculator.js` → `renderBindings.js`, undirected: 3 hops through `GreatBuildingsService.js` and `js/index.js`; dependency path, not render invocation.
- `networkListener.js` → `panelDispatcher.js`, undirected: 2 hops through `js/index.js` and `re_exports`; composition path, not direct runtime flow.
- `GuildBattlegroundState` class → `renderGbgTargets.js`: the snapshot path ran through the now-renamed `gbgRenderBinding.js`; re-run the query against the current graph before citing a hop count.
- `MetadataStore` module/class → global state/UI path queries were ambiguous or returned no path; treat no-path results as coverage limitations, not proof of isolation.
- `bignumberUtils` → logger path query returned no path; direct neighbor evidence nevertheless shows calculator and logger are separate shared dependencies.
- `logger` → `js/index.js` exact path query was ambiguous; direct neighbor evidence shows `js/index.js --imports_from--> logger.js`.

### Relationship types observed

`imports_from`, `imports`, `contains`, `method`, `calls`, `indirect_call`, `re_exports`, and `references` appeared in the main-agent query results. The document uses `EXTRACTED` for direct extracted edges and `INFERRED` for inferred edges. A relationship type alone does not establish runtime ordering.

## Recommended follow-up queries

1. Query exact `RpcRouter`, `rpcScope`, `rpcLogger`, `MessagePriorityManager`, `payloadCodec`, `batchExecutor`, and `rawDispatchPipeline` nodes with relation filters for `calls`, `imports_from`, and `indirect_call` to reconstruct route/fallback precedence.
2. Query `StartupStateInitializer`, `StartupEntityCoordinator`, `StartupBoostCoordinator`, `StartupRenderOrchestrator`, `StartupRenderState`, `MetadataStore.whenReady`, and `MetadataStore.markReady` with caller/callee filters to resolve startup and readiness order.
3. Query `state/state.js` inbound edges grouped by `imports_from`, `calls`, and `indirect_call`; identify consumers separately from apparent writers.
4. Query `MetadataStore` `registerEntity`, `registerEntities`, `subscribe`, `notifySubscribers`, `whenReady`, and `markReady` callers; then compare with `MetadataResolver`, `storageMetadataHydrator`, and `liveNameResolver`.
5. Query `panelDispatcher` `setCurrentView`, `clearElement`, and each cleanup function with `calls`/`indirect_call` filters; compare `cardVisibility` and domain render bindings.
6. Query `renderBindings.js` by exact ID and all relation filters, then inspect its imported panel/render nodes individually. Its current degree-1 result is a graph sparsity gap.
7. Query `GreatBuildingCalculator` with `calls` versus `imports_from` against its current consumers (`GreatBuildingsService`, `GbDonationService`, `gbDonationPlaceEvaluator`, `gbDonationPanel`, `greatBuildingsPanel`); separate exact calculation calls from inferred links.
8. Query `bignumberUtils.js` and `BigNumber` inbound edges by calculator family to map the complete numeric blast radius.
9. Query `GuildBattlegroundState`, `GbgSignalService`, `GuildBattlegroundService`, and `renderGbgTargets` with signal/state/UI call filters to resolve combat update ordering; the old `Gbg*Handler`/`GbgMapUtils`/`gbgRenderBinding` nodes no longer exist.
10. Query the named communities after obtaining valid community IDs from Graphify tooling; current responses did not expose complete ranked community sizes.
11. Re-run exact-node, neighbor, and shortest-path evidence after any permitted AST refresh. This verification intentionally did not run a semantic reindex.

## Last verified against graph

- **Unix timestamp:** `1790262155` seconds
- **Profile:** `graphify-foe-info`
- **Graph file:** `graphify-out/graph.json`
- **Verification scope:** Graphify MCP graph queries and artifact checks only; no application source inspection, inference-model lifecycle action, semantic reindex, or application-source edit.
- **Evidence ownership:** main agent performed query planning, subsystem tracing, exact-node/neighbor/path rechecks, synthesis, artifact write, and verification. The delegated `graph-knowledge-explorer` supplied an independent read-only broad pass and did not own the final artifact.
- **Post-snapshot change:** the tracked graph was re-extracted and relabelled on 2026-09-29 (`graphify ast` then `graphify label`). Every figure above is from the 2026-09-24 verification pass; re-verify before citing.
