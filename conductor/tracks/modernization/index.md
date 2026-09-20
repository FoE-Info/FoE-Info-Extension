# Track: Codebase Modernization (Milestone 1)

## Track Overview

- **Track ID**: `modernization`
- **Status**: `in_progress`
- **Active Phase**: Phase 4 — Cluster 4: UI & Panels Decomposition
- **Active Task**: **Slice 4G** — Decompose `src/js/ui/indexUiBindings.js` (422L) down to $\le 250$ lines.

## Plan & Tasks

See the detailed phased execution plan in [plan.md](./plan.md).

---

## Active Phase Breakdown

### Cluster 4: UI & Panels Decomposition ($\le 250$ lines budget)

- [x] **Slice 4A**: `src/js/ui/panelDispatcher.js` (475L $\rightarrow$ 131L) by extracting `renderTreasuryPanel.js` (220L), `treasuryTableBuilder.js` (110L), and `treasuryPanelEvents.js` (130L).
- [x] **Slice 4B**: `src/js/fn/collapse.js` (450L $\rightarrow$ 142L) by extracting `collapseState.js` (146L), `cityPanelToggles.js` (112L), and `combatGbToggles.js` (198L).
- [x] **Slice 4C**: `src/js/ui/renderTargetGeneratorCard.js` (442L $\rightarrow$ 180L) by extracting `targetTokenAssembler.js` (160L) and `targetGeneratorEvents.js` (93L).
- [x] **Slice 4D**: `src/js/ui/renderGbDonationPanel.js` (422L $\rightarrow$ 239L) by extracting `gbDonationPlaceEvaluator.js` (198L) and `gbDonationPanelEvents.js` (67L).
- [x] **Slice 4E**: `src/js/ui/renderGalaxyPanel.js` (283L $\rightarrow$ 215L) by extracting `galaxyBuildingGrouper.js` (76L) and `galaxyPanelEvents.js` (53L).
- [x] **Slice 4F**: `src/js/ui/renderLiveCityStats.js` (416L $\rightarrow$ 233L) by extracting `liveCityGoodsAggregator.js` (126L), `liveCityStatsCalculator.js` (182L), and `liveCityViewDataBuilder.js` (100L).
- [ ] **Slice 4G** _(NEXT)_: `src/js/ui/indexUiBindings.js` (422L $\rightarrow \le 250$L).

---

## Completed Milestones Archive

### Legacy Bridge Decommissioning (Phases 1–4)

- **Slice 1**: Quantum Incursions decommissioned into `GuildRaidsService.js` with `.register(dispatcher)`, `quantumRoutes.js` deleted.
- **Slice 2**: Great Buildings & Blueprints decommissioned into `GreatBuildingsService.js` and `GbDonationService.js`, `buildingRoutes.js` deleted.
- **Slice 3**: City routes decommissioned into `CityMapService.js`, `CityProductionService.js`, `BonusService.js`, and `MetadataService.js`, `cityRoutes.js` deleted.
- **Slice 4**: Social and conversation routes decommissioned into `OtherPlayerService.js` and `ConversationService.js`, decoupled via `viewState.js`, `socialRoutes.js` deleted.
- **Slice 5**: Combat routes decommissioned into `GuildBattlegroundService.js`, `GuildExpeditionService.js`, and `ArmyUnitManagementService.js`, `combatRoutes.js` deleted.
- **Phase 4**: `indexBridgeSetup.js` streamlined (149L $\rightarrow$ 56L), `legacyBridge.js` formalized as deprecated no-op delegator.

### Cluster 1: Production Logic

- **Slice 1A**: `src/js/calc/prod/entityProductionParser.js` (497L $\rightarrow$ 202L) by extracting `productionResourceAccumulator.js` (211L) and `entityMetadataProductionParser.js` (208L).

### Cluster 2: Protocol Handlers

- **Slice 2A**: `src/js/msg/GuildBattlegroundService.js` (489L $\rightarrow$ 240L) by extracting `GbgTimeFormatter.js` (141L), `GbgLeaderboardHandler.js` (248L), and `GbgMapUtils.js` (111L).
- **Slice 2B**: `src/js/msg/StartupService.js` (424L $\rightarrow$ 246L) by extracting `StartupStateInitializer.js` (243L) and `StartupEntityCoordinator.js` (242L).
- **Slice 2C**: `src/js/msg/GbgSignalService.js` (403L $\rightarrow$ 221L) by extracting `GbgTargetListGenerator.js` (180L).

### Cluster 3: Protocol Pipeline & State Store

- **Slice 3A**: `src/js/protocol/MessageDispatcher.js` (494L $\rightarrow$ 187L) by extracting `MessagePriorityManager.js` (85L), `payloadCodec.js` (84L), `requestPayloadCorrelator.js` (90L), `batchExecutor.js` (79L), `rawDispatchPipeline.js` (98L), and `rpcRouter.js` (137L).
- **Slice 3B**: `src/js/state/MetadataStore.js` (487L $\rightarrow$ 245L) by extracting `entityResolver.js` (130L), `metadataRelations.js` (155L), `metadataDomainCollections.js` (147L), and `legacyEntityProxy.js` (62L).
- **Slice 3C**: `src/js/protocol/networkListener.js` (477L $\rightarrow$ 231L) by extracting `networkPayloadDeduplicator.js` (65L), `gameVersionTracker.js` (89L), `networkContentReader.js` (132L), `networkWorldDetector.js` (100L), `networkPacketDispatcher.js` (64L), and `networkDevtoolsHandler.js` (78L).
- **Slice 3D**: `src/js/state/storageListener.js` (403L $\rightarrow$ 193L) by extracting `storageWorldSettings.js` (164L) and `storageMetadataHydrator.js` (196L).

### Modern-Web & UX Modernization

- **ThemeManager**: Integrated light/dark theme preference manager with storage persistence and 7-locale i18n support.
- **Native HTML Popover API**: Migrated `PopoverManager.js` to HTML Popover API with CSS Anchor Positioning (`position-anchor`, `position-area: bottom span-all`).
- **CSS Grid Collapses**: Migrated Bootstrap collapse to native CSS Grid 0fr/1fr transitions with `.foe-resizable` support.
- **Content Visibility**: Added `content-visibility: auto` with `contain-intrinsic-size` to dense table rows.
