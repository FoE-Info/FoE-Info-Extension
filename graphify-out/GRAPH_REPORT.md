# Graph Report - FoE-Info-Extension  (2026-09-30)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2614 nodes · 4783 edges · 250 communities (111 shown, 139 thin omitted)
- Extraction: 83% EXTRACTED · 17% INFERRED · 0% AMBIGUOUS · INFERRED: 797 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f343e254`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- collapse.js
- worldStorage.js
- calc/VisitedCityStatsCalculator.js
- Clipboard Utilities
- InventoryService
- StartupService.js
- networkListener.js
- ui/RewardRenderer.js
- QuestService
- MetadataService.js
- City Map Service
- ArmyUnitManagementService.js
- MetadataStore
- Metadata Store
- ResourceService.js
- toBigNumber
- Guild Battleground UI
- options.js
- gbDonationPanel.js
- indexUiBindings.js
- js/index.js
- Battleground Calculator
- registerServices.js
- Great Building State
- README.md
- helper.js
- GuildBattlegroundService.js
- Resource Panel UI
- Extension Manifest
- renderBindings.js
- Card Visibility Rules
- Boost Service
- state/state.js
- Aid Boost Calculation
- bignumberUtils.js
- GreatBuildingsService.js
- createGreatBuildingsService
- BlueGalaxyState
- date.js
- Copy Utilities
- Outpost Service
- expeditionPanel.js
- ProductionCalculator.js
- galaxyPanel.js
- TreasuryService
- Castle System Service
- devtools.js
- Social Domain State
- MessageDispatcher
- MetadataStore.js
- GuildBattlegroundState
- indexBridgeSetup.js
- TradeService.js
- MessageDispatcher.js
- MetadataResolver.js
- Great Buildings Panel
- GuildRaidsService.js
- Friends Tavern Service
- Hidden Reward Service
- rpcRouter.js
- Ally Service
- Auto Aid Service
- OtherPlayerService.js
- Metadata Collections
- playerTooltip.js
- ConversationService.js
- startupService
- Time Service
- MetadataRelations
- investedPanel.js
- socialPanel.js
- treasuryPanel.js
- escape.js
- GB Donation Service
- startupPanel.js
- Internationalization
- rawDispatchPipeline.js
- outpostPanel.js
- serviceDomBridge.js
- EmissaryService.js
- post.js
- Signal Processing
- eraUtils.js
- createLogger
- InvestedCalculator.js
- GuildDomainState.js
- Target Generator UI
- ref_bignumber_js
- Bonus Service
- Bonus State
- containerBinding.js
- Network Bridge
- destinationValidator.js
- TypeScript Definitions
- BlueGalaxyCalculator.js
- Great Building Calculator
- City Production Service
- globals.js
- RpcRouter
- Guild Expedition Service
- Item Exchange Service
- Entity Definitions Cache
- ExpeditionState
- Quantum Panel Rendering
- StartupRenderState
- Incident State Management
- TreasuryState
- Storage Bootstrap
- Battleground State Handler
- xhrInterceptor.js
- FoE-Info Debugging & Diagnostic Infrastructure
- Donation Place Evaluator
- CityDomainState.js
- Theme Manager
- Great Building Registry
- ui/AddElement.js
- Player Name Cache
- panelDispatcher.js
- Debug Toggle
- Repo Contracts And Boundaries
- logger.js
- Visited City Stats
- renderGbgTargets.js
- renderGuildPanel.js
- View State Manager
- RPC Type Definitions
- TreasuryService.js
- Guild Permissions
- City Stats Components
- Content Configuration
- Dark Mode Setting
- Debug Setting
- Language Setting
- Title Setting
- Building Costs Setting
- Clipboard Setting
- Collection Times Setting
- GBG Province Time
- GBG Show SC
- Hide Unsafe Setting
- Show Army Setting
- Show Battleground Setting
- Show Battleground Changes
- Show Bonus Setting
- Show Coin Boost
- Show Contributions Setting
- Show Daily Coins
- Show Daily Supplies
- Show Donation Setting
- Show Expedition Setting
- Show Friends Setting
- Show Galaxy Setting
- Show GB Donors
- Show GB Rewards
- Show GB Info
- Show GB Rewards
- Show GE Rewards
- Show Goods Setting
- Show Guild Setting
- Show Guild Overview
- Show Guild Position
- Show Hood Setting
- Show Incidents Setting
- Show International Expedition
- Show Invested Setting
- Show Leaderboard Setting
- Show Logs Setting
- Show QI Changes
- Show Quantum Setting
- Show Quantum Leaderboard
- Show Rewards Setting
- Show Settlement Setting
- Show Stats Setting
- Show Supply Boost
- Show Treasury Setting
- Show Visit Setting
- Alerts Component
- Bottom Alerts
- Ally Definitions
- Army Component
- Available FP Packs
- Battleground Performance
- Battleground Time
- Bonus Component
- Boost Metadata Definitions
- Building Definitions
- Building Entity Lookup
- Castle Definitions
- City Invested Data
- City Protections
- City Stats Data
- Clipboard Management
- Content Metadata
- Cultural Preferences
- Debug Utilities
- Debug Configuration
- Donation Settings
- Donation Formatting
- Time Utilities
- Social Features
- Galaxy Interface
- Game Origin
- Battle Data
- Goods Interface
- Guild Core
- Guild Membership
- Hidden Rewards
- Player Moderation
- Incident Tracking
- Information Display
- Language Settings
- Metadata Status
- Metadata Identifiers
- Military Definitions
- Modal Interface
- Guild Permissions
- Game Overview
- Player Identification
- Player Display
- Research Definitions
- Resource Definitions
- Battle Rewards
- Event Rewards
- Player Rewards
- Kit Definitions
- Targeting Topics
- Target Text
- Treasury Management
- Treasury Log
- Visit Statistics
- Volcano Province Data
- Waterfall Province Data
- World Management
- runtimeLifecycle.js
- FoE-Info Extension — Software Architecture
- playerScoreResolver.js
- renderRewardsPanel.js
- Full Internationalization (i18n)
- scheduler.js
- Debug Mode
- Cohesion Over Line Count

## God Nodes (most connected - your core abstractions)
1. `createLogger()` - 96 edges
2. `MetadataStore` - 46 edges
3. `toBigNumber()` - 45 edges
4. `MessageDispatcher` - 41 edges
5. `escapeHTML()` - 37 edges
6. `MetadataStore` - 35 edges
7. `setCollapse()` - 32 edges
8. `startupService()` - 26 edges
9. `initializeUIBindings()` - 20 edges
10. `GuildBattlegroundState` - 19 edges

## Surprising Connections (you probably didn't know these)
- `Console Debugging (`logger.js`)` --references--> `error()`  [INFERRED]
  docs/debugging.md → src/js/ui/panelContainerFactory.js
- `Console Debugging (`logger.js`)` --references--> `info()`  [INFERRED]
  docs/debugging.md → src/js/ui/panelContainerFactory.js
- `Console Debugging (`logger.js`)` --references--> `warn()`  [INFERRED]
  docs/debugging.md → src/js/ui/panelContainerFactory.js
- `Startup Metadata and Render Coordination` --references--> `createStartupService()`  [INFERRED]
  docs/architecture.md → src/js/msg/StartupService.js
- `Console Debugging (`logger.js`)` --references--> `debug()`  [INFERRED]
  docs/debugging.md → src/js/ui/panelContainerFactory.js

## Import Cycles
- 3-file cycle: `src/js/utils/logger.js -> src/js/utils/storage.js -> src/js/utils/worldStorage.js -> src/js/utils/logger.js`

## Hyperedges (group relationships)
- **Core Principles** — concept_passive_observation, concept_dynamic_metadata, concept_bignumber_precision, concept_full_internationalization [INFERRED 0.90]

## Communities (250 total, 139 thin omitted)

### Community 0 - "collapse.js"
Cohesion: 0.06
Nodes (73): fCollapseBonus, fCollapseBuildings, fCollapseClipboard, fCollapseCultural, fCollapseFriends, fCollapseGalaxy, fCollapseGoods, fCollapseGuild (+65 more)

### Community 1 - "worldStorage.js"
Cohesion: 0.10
Nodes (50): createFreshGlobalSettings(), createFreshWorldSettings(), FACTORY_GLOBAL_SETTINGS, FACTORY_WORLD_SETTINGS, setupPanelHeader(), tr(), getCollapse(), getStorage() (+42 more)

### Community 2 - "calc/VisitedCityStatsCalculator.js"
Cohesion: 0.09
Nodes (41): extractEntityBoosts(), BigNumber, createProdBoosts(), createQiBoosts(), createRawBoosts(), extractEntityBoosts(), { extractEntityBoosts: extractBoosts }, formatMilitaryBoosts() (+33 more)

### Community 3 - "Clipboard Utilities"
Cohesion: 0.09
Nodes (49): ERA_ORDER, getEraAcronym(), set(), updateShowOptions(), copyTextToClipboard(), formatStatsText(), handleCopyStats(), bindPopoverElementEvents() (+41 more)

### Community 4 - "InventoryService"
Cohesion: 0.10
Nodes (6): BigNumber, GreatBuildingInventoryEntry, InventoryItem, InventoryService, { messageDispatcher }, serviceDom

### Community 5 - "StartupService.js"
Cohesion: 0.05
Nodes (42): Startup Metadata and Render Coordination, resolveMissingCityEntities(), src_js_msg_resourceservice_resourcedefs, {
  addResourceTotal,
  boostedForgePoints,
  toBigNumber,
}, { applyBoostsToCity }, { blueGalaxyState }, {
  buildClanGoodsData: buildClanGoodsDataImpl,
  fGoodsHTML,
}, buildingsReady (+34 more)

### Community 6 - "networkListener.js"
Cohesion: 0.11
Nodes (35): Packet Ordering and Replay Suppression, getGameVersion(), notifyGameVersionChange(), setGameVersion(), activeDeps, detectAndSyncWorldOrigin(), dispatchOrderChain, enqueueOrderedDispatch() (+27 more)

### Community 7 - "ui/RewardRenderer.js"
Cohesion: 0.17
Nodes (14): toolOptions, cityrewards, rewardsArmy, rewardsCity, rewardsGeneric, addToBucket(), resolveBucketKey(), SOURCE_BUCKETS (+6 more)

### Community 8 - "QuestService"
Cohesion: 0.09
Nodes (6): COMPLETED_QUEST_STATES, { messageDispatcher }, Quest, QuestService, { rewardState }, RewardState

### Community 9 - "MetadataService.js"
Cohesion: 0.13
Nodes (21): getEntityId(), processCityEntity(), defaultState, handleBattlegroundBuilding(), handleBattlegroundMap(), IGNORED_CLASSES, ingestBattlegroundBuildingMetadata(), ingestBattlegroundMapMetadata() (+13 more)

### Community 10 - "City Map Service"
Cohesion: 0.09
Nodes (24): src_js_calc_utils_gbnames_getgreatbuildingname, CityMapService, defaultGbRegistry, defaultState, extractGridId(), GbDonationService, { messageDispatcher }, registerCityEntities() (+16 more)

### Community 11 - "ArmyUnitManagementService.js"
Cohesion: 0.07
Nodes (23): { armyState }, armyUnitManagementService(), ArmyUnits, clearArmyUnits(), { createLogger }, defaultState, ERA_LEVELS, exportsObj (+15 more)

### Community 14 - "ResourceService.js"
Cohesion: 0.13
Nodes (19): { createLogger, isDebugEnabled }, defaultState, exportsObj, getPlayerResources(), getResourceDefinition(), getResourceDefinitions(), loadResourceDefs(), lockGoodsPanel() (+11 more)

### Community 15 - "toBigNumber"
Cohesion: 0.14
Nodes (25): isEntityAided(), isEntityMotivatable(), {
  addPlayerResources,
  addGuildResources,
  applyGenericRewardToResult,
}, { createLogger }, logger, parseEntityMetadataProduction(), { toBigNumber }, {
  addPlayerResources,
  addGuildResources,
} (+17 more)

### Community 16 - "Guild Battleground UI"
Cohesion: 0.10
Nodes (31): bindGuildBattlegroundPanels(), buildBattlegroundResultCardHTML(), buildBuildingCostCardHTML(), buildBuildingCostsTableHTML(), buildingCostCopy(), buildLeaderboardHTML(), buildResultOptions(), buildTargetParams() (+23 more)

### Community 17 - "options.js"
Cohesion: 0.11
Nodes (31): { createLogger }, detectActiveGameTab(), detectActiveWorld(), discoverOpenGameWorlds(), getBrowser(), {
  getGlobalSettings,
  getWorldSettings,
  initStorage,
  registerKnownWorld,
  resetWorldSettings,
  sanitizeWorldId,
  saveWorldSettings,
  setWorld,
}, initOptions(), isOptionsFormValid() (+23 more)

### Community 18 - "gbDonationPanel.js"
Cohesion: 0.13
Nodes (28): attachGbDonationPanelEvents(), bindDonationEvents(), buildCardFooter(), buildClassicDonationHeader(), checkInactive(), collapse, copy, element (+20 more)

### Community 19 - "indexUiBindings.js"
Cohesion: 0.13
Nodes (22): initStorageListeners(), { applyCardVisibility }, { bindNetworkBridge }, {
  bindOptionsButton,
  bindWindowMessageListener,
  bindThemeToggle,
}, {
  bindRuntimeLifecycle,
  onRequested,
  onError,
}, bindStorageListeners(), bootstrapExtensionUi(), buildStorageDeps() (+14 more)

### Community 20 - "js/index.js"
Cohesion: 0.06
Nodes (29): ref_bootstrap, ref_webextension_polyfill, src_css_main, src_js_fn_rewardrenderer_rewardobserve, src_js_fn_rewardrenderer_showreward, containers, initEntityDefsLifecycle(), setLastStartupMsg() (+21 more)

### Community 21 - "Battleground Calculator"
Cohesion: 0.12
Nodes (21): calculateProvinceAttrition(), formatCampsText(), formatSectorName(), formatTargetToken(), getAttritionReduction(), { toBigNumber }, attritionReduction(), extractSignalData() (+13 more)

### Community 22 - "registerServices.js"
Cohesion: 0.07
Nodes (27): src_js_msg_greatbuildingsservice_greatbuildingsservice, { allyService }, { armyUnitManagementService }, { autoAidService }, { boostService }, { castleSystemService }, { cityMapService }, { cityProductionService } (+19 more)

### Community 23 - "Great Building State"
Cohesion: 0.09
Nodes (4): GbDonationState, GreatBuildingDomainState, GreatBuildingsState, InvestedState

### Community 24 - "README.md"
Cohesion: 0.20
Nodes (7): Agent Harness, BigNumber Precision, Dual Intake Paths, Dynamic Metadata Streaming, Graphify, Passive Observation, Verification Gate

### Community 25 - "helper.js"
Cohesion: 0.07
Nodes (27): AGE_TO_LEVEL, ERA_ABBREVIATIONS, fAgefromLevel(), fEraAbbreviation(), fLevelfromAge(), LEVEL_TO_AGE, src_js_calc_eramapping_numages, fArcname() (+19 more)

### Community 26 - "GuildBattlegroundService.js"
Cohesion: 0.09
Nodes (21): battlegroundParticipants, checkProvinces(), defaultState, getBattleground(), getBuildings(), { getServerMarket, timeGBG }, getUpdatedProvinces(), guildBattlegroundService (+13 more)

### Community 27 - "Resource Panel UI"
Cohesion: 0.10
Nodes (23): bindCollapseAndResize(), bindDismiss(), bindResourcePanel(), buildGoodsRows(), clearGoodsPanel(), collapse, { createLogger }, disconnectGoodsResize() (+15 more)

### Community 28 - "Extension Manifest"
Cohesion: 0.08
Nodes (25): action, default_popup, content_scripts, content_security_policy, extension_pages, description, devtools_page, homepage_url (+17 more)

### Community 29 - "renderBindings.js"
Cohesion: 0.06
Nodes (32): bindBonusPanel(), { bonusState }, collapse, { createLogger }, element, logger, bindGbDonationPanels(), bindGreatBuildingsPanels() (+24 more)

### Community 30 - "Card Visibility Rules"
Cohesion: 0.13
Nodes (21): applyCardVisibility(), applyContextVisibility(), applyUnconstrainedVisibility(), {
  GAME_CONTEXTS,
  CONTEXT_ALLOWED_PANELS,
  PANEL_PARENT,
  PANEL_OPTION_KEY,
  ALL_15_PANEL_IDS,
  GBG_ALLOWED_PANEL_IDS,
  CITY_HIDDEN_PANEL_IDS,
  optionToElementId,
  ALL_KNOWN_PANEL_IDS,
}, getAllowedPanelsForView(), normalizeContext(), setCurrentView(), setElementDisplay() (+13 more)

### Community 31 - "Boost Service"
Cohesion: 0.14
Nodes (13): addBoost(), applyBoostsToCity(), BigNumber, BoostService, CITY_BOOST_KEYS, createFeatureBoostMatrix(), { createLogger }, exportsObj (+5 more)

### Community 32 - "state/state.js"
Cohesion: 0.10
Nodes (7): flushPlayerNameCache(), removeDebug(), scheduleNameCacheFlush(), setPlayerName(), toggleDebug(), updatePlayerNameCache(), onDebugToggle()

### Community 33 - "Aid Boost Calculation"
Cohesion: 0.23
Nodes (13): applyBoost(), BigNumber, finalizeUnaidedList(), recalculateAidStatsBoosts(), recordUnaided(), { toBigNumber }, BigNumber, calculateDailyProductionAid() (+5 more)

### Community 34 - "bignumberUtils.js"
Cohesion: 0.15
Nodes (22): { addResourceTotal, chanceAmount }, buildResult(), {
  calculateDailyProductionAid,
}, {
  createHarvestAccumulator,
  evaluateEntityHarvest,
  SPECIAL_GOODS,
}, processCityMapEntities(), {
  addResourceTotal,
  addExactTotal,
}, src_js_calc_entities_cityentityharvestcalculator_createharvestaccumulator, {
  createHarvestAccumulator,
  parseCurrentProduct,
  parseProductionOption,
} (+14 more)

### Community 35 - "GreatBuildingsService.js"
Cohesion: 0.08
Nodes (22): { calculateArcReward }, City, collapse, copy, defaultGreatBuildingsService, defaultState, element, GbDonationService (+14 more)

### Community 36 - "createGreatBuildingsService"
Cohesion: 0.25
Nodes (14): createGreatBuildingsService(), localContributeForgePoints(), localGetConstruction(), localGetConstructionRanking(), localRegister(), localShowGreatBuldingDonation(), localSyncRankingPayload(), extractRankingData() (+6 more)

### Community 38 - "date.js"
Cohesion: 0.08
Nodes (42): {
  applyWorldConfig,
  applyGlobalSettings,
  applyLegacyWorldFallbacks,
  applyDebugEnabled,
  redactWorldData,
}, buildWorldSnapshotData(), handleReceiveStorage(), handleStorageChange(), {
  hydrateLookupDefinitions,
  hydrateCityEntitiesFromSnapshot,
  hydrateCityEntitiesFromChange,
}, logger, registeredDeps, resolveDeps() (+34 more)

### Community 39 - "Copy Utilities"
Cohesion: 0.18
Nodes (20): addToClipboard(), announceCopy(), BattlegroundCopy(), copyNode(), copyToClipboard(), DonationCopy(), DonorCopy(), DonorCopy2() (+12 more)

### Community 40 - "Outpost Service"
Cohesion: 0.12
Nodes (7): CULTURAL_GOODS_MAP, exportsObj, isSettlementActive(), { messageDispatcher }, OutpostService, { outpostState }, Settlement

### Community 41 - "expeditionPanel.js"
Cohesion: 0.16
Nodes (21): attachSubpanelToggle(), attachTableHandlers(), bindExpeditionPanel(), buildContributionTable(), buildExpeditionContentHtml(), buildInternationalTable(), buildSubpanel(), { createLogger } (+13 more)

### Community 42 - "ProductionCalculator.js"
Cohesion: 0.18
Nodes (14): addGuildResources(), addResource(), applyGenericReward(), applyProductionBoosts(), BigNumber, extractEntityProduction(), {
  toBigNumber,
  boostedForgePoints,
}, UNIT_MULTIPLIER (+6 more)

### Community 43 - "galaxyPanel.js"
Cohesion: 0.13
Nodes (19): backfillPendingNames(), formatLiveName(), { metadataStore }, { onMetadataUpdated }, resolveLiveName(), onMetadataUpdated(), { backfillPendingNames }, bindGalaxyCollapseEvents() (+11 more)

### Community 44 - "TreasuryService"
Cohesion: 0.13
Nodes (3): BigNumber, TreasuryLogEntry, TreasuryService

### Community 45 - "Castle System Service"
Cohesion: 0.12
Nodes (6): getCastleBoostsForEntity(), getCastleBoostsForStage(), STAGE_BOOST_MAP, CastleSystemService, {
  getCastleBoostsForStage,
}, { messageDispatcher }

### Community 46 - "devtools.js"
Cohesion: 0.17
Nodes (19): bufferEntry(), deliverEntry(), devtoolsLogger, flushPending(), forwardOrBufferEntry(), isRelevantRequest(), pendingEntries, createTimingTracker() (+11 more)

### Community 47 - "Social Domain State"
Cohesion: 0.12
Nodes (3): SocialDomainState, SocialState, VisitedCityState

### Community 49 - "MetadataStore.js"
Cohesion: 0.13
Nodes (12): indexEntityAliases(), isDebugEnabled(), isEntityEqual(), peekEntity(), reportEntityLookup(), createLegacyCityEntityProxy(), COLLECTION_PROPERTIES, RELATION_PROPERTIES (+4 more)

### Community 51 - "indexBridgeSetup.js"
Cohesion: 0.15
Nodes (16): registerAllServices(), configuredDispatchers, dispatcherLogger, setupIndexBridge(), registerLegacyBridge(), GBselected, getPlayerName(), MyInfo (+8 more)

### Community 52 - "TradeService.js"
Cohesion: 0.20
Nodes (11): BigNumber, calculateTradeRatio(), classifyFairTrade(), formatRatioLabel(), getDefaultResolveEra(), getEraRelationship(), isFairTrade(), normalizeTradeOffer() (+3 more)

### Community 53 - "MessageDispatcher.js"
Cohesion: 0.15
Nodes (9): DedupCache, { decodeBody, parsePayload }, { DedupCache }, { executeBatchDispatch }, { executeRawDispatch }, { MessagePriorityManager }, { RpcRouter }, decodeBody() (+1 more)

### Community 54 - "MetadataResolver.js"
Cohesion: 0.26
Nodes (13): fetchedMetadataUrls, getCachedMetadata(), getCandidateEntityLookupKeys(), getMetadataStorage(), loadPersistentMetadata(), markMetadataUrlFetched(), { metadataStore }, pendingMetadataUrls (+5 more)

### Community 55 - "Great Buildings Panel"
Cohesion: 0.13
Nodes (16): collapse, copy, { createLogger }, dateUtils, defaultShowOptions, element, { escapeHTML }, GreatBuildingCalculator (+8 more)

### Community 56 - "GuildRaidsService.js"
Cohesion: 0.14
Nodes (4): GuildRaidsService, { messageDispatcher }, { quantumState }, setCurrentView()

### Community 57 - "Friends Tavern Service"
Cohesion: 0.14
Nodes (3): FriendsTavernService, { messageDispatcher }, OtherTavernState

### Community 58 - "Hidden Reward Service"
Cohesion: 0.14
Nodes (3): HiddenReward, HiddenRewardService, { messageDispatcher }

### Community 59 - "rpcRouter.js"
Cohesion: 0.17
Nodes (12): combinedHandlerMembers, { createLogger, isDebugEnabled }, getBrowserStorage(), IGNORED_RPC_CLASSES, initIgnoredRpcState(), isIgnoredRpcClass(), logRpcMessage(), rpcLog (+4 more)

### Community 60 - "Ally Service"
Cohesion: 0.16
Nodes (6): AllyService, AssignedAlly, BigNumber, createBoostMatrix(), KNOWN_FEATURES, { messageDispatcher }

### Community 61 - "Auto Aid Service"
Cohesion: 0.17
Nodes (3): AutoAidService, AutoAidState, { messageDispatcher }

### Community 62 - "OtherPlayerService.js"
Cohesion: 0.12
Nodes (14): checkInactivePlunder(), { createLogger }, friends, guildMembers, hoodlist, logger, otherPlayerService(), otherPlayerServiceUpdateActions() (+6 more)

### Community 64 - "playerTooltip.js"
Cohesion: 0.11
Nodes (28): src_js_calc_eramapping_fgvgagesname, BigNumber, buildClanGoodsData(), fGoodsHTML(), fGoodsText(), { fGVGagesname }, { toBigNumber }, tr() (+20 more)

### Community 65 - "ConversationService.js"
Cohesion: 0.22
Nodes (11): conversationService(), extractRateFromTitle(), getConversation(), getLatestMessage(), getNewMessage(), getPercent(), getTargetsTopic(), isTargetsTopic() (+3 more)

### Community 66 - "startupService"
Cohesion: 0.16
Nodes (24): boostServiceAllBoosts(), buildClanGoodsData(), coordinateStartupEntities(), createStartupContext(), createStartupService(), ensureCitystatsContainer(), fEntityName(), formatLiveName() (+16 more)

### Community 69 - "investedPanel.js"
Cohesion: 0.16
Nodes (14): bindInvestedPanel(), cachedContributions, { calculateInvestments }, collapse, copy, element, getStoredHiddenKeys(), getStoredInvestSettings() (+6 more)

### Community 70 - "socialPanel.js"
Cohesion: 0.16
Nodes (14): collapse, copy, { createLogger }, element, { escapeHTML }, { formatShieldCountdown }, getFriendsHTML(), logger (+6 more)

### Community 71 - "treasuryPanel.js"
Cohesion: 0.22
Nodes (13): bindTreasuryEvents(), bindTreasuryPanel(), buildTreasuryTableHtml(), clearElement(), clearForTreasury(), { createLogger }, defaultExport, disconnectTreasuryResize() (+5 more)

### Community 72 - "escape.js"
Cohesion: 0.14
Nodes (17): fResourceShortName(), ESCAPE_MAP, escapeHTMLAttribute(), escapeString(), toDisplayString(), {
  escapeHTML,
  escapeHTMLAttribute,
  toDisplayString,
}, fAgestring(), fFormatNumber() (+9 more)

### Community 73 - "GB Donation Service"
Cohesion: 0.14
Nodes (9): { calculateSafeSpots }, extractRankingLevel(), extractRankingParams(), gbDonationService, { gbDonationState }, handleNewReward(), register(), serviceDom (+1 more)

### Community 74 - "startupPanel.js"
Cohesion: 0.12
Nodes (13): AGES, { escapeHTML }, renderBuildingCollectionTimes(), bindStartupMetadataLoading(), bindStartupRenderState(), buildingCollection, cityStatsTooltips, { escapeHTML: canonicalEscapeHTML } (+5 more)

### Community 75 - "Internationalization"
Cohesion: 0.31
Nodes (13): initOptionsI18n(), collectI18nElements(), dictionaries, getLocale(), I18N_ATTRIBUTES, loadAll(), loadLocale(), loadTranslations() (+5 more)

### Community 76 - "rawDispatchPipeline.js"
Cohesion: 0.26
Nodes (9): isDirectMetadataUrl(), parseMetadataUrlContext(), routeDirectMetadata(), { correlateRequestPayload }, executeRawDispatch(), { extractRequestPayload }, { routeDirectMetadata }, extractRequestPayload() (+1 more)

### Community 77 - "outpostPanel.js"
Cohesion: 0.16
Nodes (11): collapse, { createLogger }, element, { escapeHTML }, getResolvedShowOptions(), helper, i18n, logger (+3 more)

### Community 78 - "serviceDomBridge.js"
Cohesion: 0.16
Nodes (9): updateActivePopoverContent(), logger, refreshFpPopover(), { translateContainer }, translateDynamicMarkup(), {
  updateActivePopoverContent,
}, updateClanGoodsDisplay(), updateFpDisplay() (+1 more)

### Community 79 - "EmissaryService.js"
Cohesion: 0.18
Nodes (7): { City }, { createLogger }, EmissaryService, emissaryServiceInstance, logger, { startupRenderState }, City

### Community 80 - "post.js"
Cohesion: 0.29
Nodes (10): GBGdata, MyInfo, postGBGtoSS(), postTargetGenToDiscord(), postTargetsToDiscord(), postToDiscord(), sanitizeDiscordText(), url (+2 more)

### Community 81 - "Signal Processing"
Cohesion: 0.22
Nodes (13): applySignalAction(), applySignalToList(), extractSignalData(), register(), removeSignal(), removeSignalFromList(), resolveCandidateObject(), resolvePostText() (+5 more)

### Community 82 - "eraUtils.js"
Cohesion: 0.20
Nodes (14): BigNumber, categorizeGoods(), { getPreviousEra, getNextEra }, NON_GOODS_KEYS, processEntityGoods(), { toBigNumber }, ERA_ACRONYMS, ERA_INDEX_MAP (+6 more)

### Community 83 - "createLogger"
Cohesion: 0.20
Nodes (7): { createLogger }, extractPlayerPoints(), parseUserAccount(), executeBatchDispatch(), { createLogger }, logger, createLogger()

### Community 84 - "InvestedCalculator.js"
Cohesion: 0.39
Nodes (7): BigNumber, calculateInvestments(), getInvestmentKey(), isPositionSafe(), { calculateInvestments }, getContributions(), { investedState }

### Community 86 - "Target Generator UI"
Cohesion: 0.22
Nodes (10): bindTargetGeneratorEvents(), buildTargetGeneratorMarkup(), buildTargetGeneratorTargets(), collapse, GbgCalculator, logger, post_webstore, renderTargetGeneratorCard() (+2 more)

### Community 87 - "ref_bignumber_js"
Cohesion: 0.32
Nodes (5): ref_bignumber_js, aggregateLiveGoods(), BigNumber, BigNumber, calculateLiveCityStats()

### Community 88 - "Bonus Service"
Cohesion: 0.20
Nodes (8): bonusAmount(), bonusService, getLimitedBonuses(), logger, register(), Bonus, src_js_vars_showoptions_showoptions, src_js_vars_state_bonus

### Community 90 - "containerBinding.js"
Cohesion: 0.25
Nodes (12): Console Debugging (`logger.js`), {
  ensureContainerMounted,
  setupPanelContainers,
}, mountPanels(), safeguardOutputContainers(), debug(), ensureContainerMounted(), error(), info() (+4 more)

### Community 91 - "Network Bridge"
Cohesion: 0.23
Nodes (11): { applyCardVisibility }, { applyWorldConfig }, bindNetworkBridge(), { createLogger }, createWorldSwitcher(), switchToWorld(), {
  initNetworkListeners: initNetworkListenersDefault,
}, logger (+3 more)

### Community 92 - "destinationValidator.js"
Cohesion: 0.24
Nodes (10): CHECKBOX_CONFIG, readWorldSettingsFromForm(), { validateDestinationUrl }, { createLogger }, detectServiceType(), DISCORD_WEBHOOK_HOSTS, logger, validateDestinationUrl() (+2 more)

### Community 93 - "TypeScript Definitions"
Cohesion: 0.17
Nodes (11): CityEntityInstance, CityState, GameEntityDefinition, GoodsInventory, GreatBuildingCalculationResult, GreatBuildingRecord, GreatBuildingSpot, HiddenRewardPayload (+3 more)

### Community 94 - "BlueGalaxyCalculator.js"
Cohesion: 0.23
Nodes (11): computeEconomicScore(), createGalaxyCandidate(), DEFAULT_ECONOMIC_WEIGHTS, extractEntityFp(), { extractEntityProduction }, filterAndSortGalaxyCandidates(), getTopReadyGalaxyBuildings(), isCandidateReady() (+3 more)

### Community 95 - "Great Building Calculator"
Cohesion: 0.42
Nodes (9): BigNumber, calculateArcReward(), calculateDonorOutcome(), calculateLevelClosingProfit(), calculateOwnerSafeAdd(), calculateSafeSpots(), calculateSpotLock(), calculateSuggestedDonation() (+1 more)

### Community 96 - "City Production Service"
Cohesion: 0.20
Nodes (8): blueGalaxyState, CityProductionService, fTitleCase(), { messageDispatcher }, MilitaryDefs, pickupProduction(), rewardStatePkg, showOptions

### Community 97 - "globals.js"
Cohesion: 0.28
Nodes (11): saveSize(), setArmySize(), setBattlegroundSize(), setBuildingCostSize(), setExpeditionSize(), setFriendsSize(), setGoodsSize(), setLogsSize() (+3 more)

### Community 99 - "Guild Expedition Service"
Cohesion: 0.24
Nodes (6): { expeditionState }, {
  extractTrialLevel,
  extractInternationalExpeditionEntries,
}, guildExpeditionService(), register(), extractInternationalExpeditionEntries(), extractTrialLevel()

### Community 101 - "Entity Definitions Cache"
Cohesion: 0.31
Nodes (6): flushCityEntityDefs(), initEntityDefsUnloadHandler(), resolveMissingCityEntities(), resolveMissingCityEntitiesFromMap(), saveCityEntityDefsDebounced(), scheduleStartupRerun()

### Community 103 - "Quantum Panel Rendering"
Cohesion: 0.27
Nodes (9): applyContributionsSizing(), applyLeaderboardSizing(), bindQuantumPanels(), { escapeHTML }, getWorldLabel(), { quantumState }, renderQuantumContributionsCard(), renderQuantumLeaderboardCard() (+1 more)

### Community 107 - "Storage Bootstrap"
Cohesion: 0.33
Nodes (8): CANONICAL_LOCALES, { createLogger }, initStorageBootstrap(), logger, logStorageUsage(), resolveDollar(), resolveHandleReceiveStorage(), resolveTranslateContainer()

### Community 108 - "Battleground State Handler"
Cohesion: 0.25
Nodes (8): formatDateTime(), getPlayerLeaderboard(), getState(), getStateVar(), handleBattlegroundState(), handlePlayerLeaderboard(), translateContainer(), setBGtime()

### Community 109 - "xhrInterceptor.js"
Cohesion: 0.31
Nodes (5): postData(), attachWsListener(), dispatchWsText(), isFoeWebSocketUrl(), trustedHostMatches()

### Community 110 - "FoE-Info Debugging & Diagnostic Infrastructure"
Cohesion: 0.17
Nodes (12): 1. Operating Modes Overview, 2. Header Toggle Mechanism, 3. Filterable Console Tags Cheat-Sheet, 4. Out-of-Scope RPC Log Filtering, 5. Architecture & Technical Design, 6. AI Pair-Debugging Workflow, 7. Local Verification Evidence, 8. Runtime Evidence Design (+4 more)

### Community 111 - "Donation Place Evaluator"
Cohesion: 0.33
Nodes (5): BigNumber, fDonationSuggest(), getPlaceValues(), getSafe(), GreatBuildingCalculator

### Community 112 - "CityDomainState.js"
Cohesion: 0.16
Nodes (5): CityDomainState, createFreshCityState(), {
  createGalaxyCandidate,
  filterAndSortGalaxyCandidates,
  updateCandidateState,
}, OutpostState, resetCityState()

### Community 113 - "Theme Manager"
Cohesion: 0.43
Nodes (4): applyTheme(), initTheme(), resolveTheme(), updateThemeState()

### Community 115 - "ui/AddElement.js"
Cohesion: 0.22
Nodes (4): fAddCollapseIcon(), fCollapseIcon(), fSyncTriggerState(), storage

### Community 117 - "panelDispatcher.js"
Cohesion: 0.31
Nodes (10): clearCultural(), clearElement(), clearExpedition(), clearForBattleground(), clearForMainCity(), clearStartup(), clearVisitPlayer(), panelDispatcher (+2 more)

### Community 118 - "Debug Toggle"
Cohesion: 0.60
Nodes (3): applyDebugA11y(), createDebugLogo(), tr()

### Community 119 - "Repo Contracts And Boundaries"
Cohesion: 0.20
Nodes (10): Audit Checks, Baseline / Allowlist Policy, Detected Mapping, Diff Checks, Failure Message Shape, Garden Loop, Generated Reports / Snapshots, Protected Boundaries (+2 more)

### Community 120 - "logger.js"
Cohesion: 0.33
Nodes (7): syncDebug(), defaultLogger, getBrowserStorage(), initDebugState(), setDebugEnabled(), subscribers, toggleDebug()

### Community 122 - "renderGbgTargets.js"
Cohesion: 0.28
Nodes (8): collapse, { createLogger }, { escapeHTML }, formatTimeSafe(), logger, { renderGbgTargetMessage }, renderTargetMessage(), renderGbgTargetMessage()

### Community 123 - "renderGuildPanel.js"
Cohesion: 0.32
Nodes (7): collapse, element, { escapeHTML }, helper, renderGuildPanel(), resolveGuildOverviewWrapper(), unhideElement()

### Community 129 - "TreasuryService.js"
Cohesion: 0.33
Nodes (4): { messageDispatcher }, showOptions, { treasuryState }, resolveShowOptions()

### Community 242 - "runtimeLifecycle.js"
Cohesion: 0.47
Nodes (5): bindRuntimeLifecycle(), { createLogger }, logger, onError(), onRequested()

### Community 243 - "FoE-Info Extension — Software Architecture"
Cohesion: 0.40
Nodes (5): Architectural Layers, Core Data Pipeline, FoE-Info Extension — Software Architecture, Module Loading Policy, Non-Negotiable Architectural Invariants

### Community 244 - "playerScoreResolver.js"
Cohesion: 0.50
Nodes (4): { createLogger }, loadStoredScore(), logger, resolvePlayerScore()

### Community 245 - "renderRewardsPanel.js"
Cohesion: 0.50
Nodes (4): buildGenericRewardHtml(), { createLogger }, logger, renderGenericReward()

### Community 247 - "scheduler.js"
Cohesion: 0.83
Nodes (3): getSchedulerApi(), postBackgroundTask(), yieldToMain()

## Knowledge Gaps
- **722 isolated node(s):** `InnoRpcEnvelope`, `InnoRpcMessage`, `CityEntityInstance`, `CityState`, `GameEntityDefinition` (+717 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1222 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **139 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Work-memory lessons

**Preferred sources** — corroborated by past sessions; start here.
- `StartupService.js` (4× useful, score=3.997462167) _(code changed — re-verify)_
- `MetadataStore` (3× useful, score=2.998098497)
- `registerServices.js` (3× useful, score=2.998095505) _(code changed — re-verify)_
- `README.md` (2× useful, score=1.999321129) _(code changed — re-verify)_
- `DEBUGGING.md` (2× useful, score=1.999321107) _(code changed — re-verify)_
- `CONTRIBUTING.md` (2× useful, score=1.999321086) _(code changed — re-verify)_
- `ARCHITECTURE.md` (2× useful, score=1.999321064) _(code changed — re-verify)_

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createLogger()` connect `createLogger` to `collapse.js`, `worldStorage.js`, `calc/VisitedCityStatsCalculator.js`, `Clipboard Utilities`, `StartupService.js`, `networkListener.js`, `ui/RewardRenderer.js`, `City Map Service`, `ArmyUnitManagementService.js`, `ResourceService.js`, `toBigNumber`, `options.js`, `indexUiBindings.js`, `Battleground Calculator`, `Great Building State`, `helper.js`, `GuildBattlegroundService.js`, `Resource Panel UI`, `renderBindings.js`, `Boost Service`, `bignumberUtils.js`, `GreatBuildingsService.js`, `date.js`, `expeditionPanel.js`, `ProductionCalculator.js`, `Castle System Service`, `devtools.js`, `Social Domain State`, `indexBridgeSetup.js`, `TradeService.js`, `MessageDispatcher.js`, `MetadataResolver.js`, `Great Buildings Panel`, `GuildRaidsService.js`, `rpcRouter.js`, `OtherPlayerService.js`, `playerTooltip.js`, `ConversationService.js`, `socialPanel.js`, `treasuryPanel.js`, `startupPanel.js`, `rawDispatchPipeline.js`, `outpostPanel.js`, `EmissaryService.js`, `post.js`, `InvestedCalculator.js`, `GuildDomainState.js`, `Bonus Service`, `Network Bridge`, `destinationValidator.js`, `scheduler.js`, `BlueGalaxyCalculator.js`, `Great Building Calculator`, `City Production Service`, `RpcRouter`, `Guild Expedition Service`, `Entity Definitions Cache`, `Quantum Panel Rendering`, `Storage Bootstrap`, `CityDomainState.js`, `runtimeLifecycle.js`, `Player Name Cache`, `playerScoreResolver.js`, `panelDispatcher.js`, `renderRewardsPanel.js`, `logger.js`, `renderGbgTargets.js`?**
  _High betweenness centrality (0.196) - this node is a cross-community bridge._
- **Why does `MetadataStore` connect `MetadataStore` to `state/state.js`, `StartupService.js`, `MetadataService.js`, `galaxyPanel.js`, `MetadataStore.js`, `TradeService.js`, `MetadataResolver.js`, `helper.js`, `GuildBattlegroundService.js`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `MessageDispatcher` connect `MessageDispatcher` to `TreasuryService.js`, `InventoryService`, `QuestService`, `MetadataService.js`, `City Map Service`, `js/index.js`, `registerServices.js`, `Boost Service`, `GreatBuildingsService.js`, `Outpost Service`, `Castle System Service`, `MessageDispatcher.js`, `GuildRaidsService.js`, `Friends Tavern Service`, `Hidden Reward Service`, `Ally Service`, `Auto Aid Service`, `Time Service`, `Bonus Service`, `Network Bridge`, `City Production Service`, `RpcRouter`, `Item Exchange Service`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **What connects `InnoRpcEnvelope`, `InnoRpcMessage`, `CityEntityInstance` to the rest of the system?**
  _722 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `collapse.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05927405927405927 - nodes in this community are weakly interconnected._
- **Should `worldStorage.js` be split into smaller, more focused modules?**
  _Cohesion score 0.1038961038961039 - nodes in this community are weakly interconnected._
- **Should `calc/VisitedCityStatsCalculator.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09224489795918367 - nodes in this community are weakly interconnected._