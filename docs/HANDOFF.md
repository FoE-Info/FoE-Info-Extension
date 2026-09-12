# FoE-Info Extension — Project Handoff

Updated 2026-09-12 after the quad-graph exploration and comparative analysis suite.

## Current session (2026-09-12)

- **Context-Driven Panel Visibility Engine & Ephemeral Lifecycle (Parallel Execution: OpenCode & Antigravity)**:
  - **Plan**: [`docs/plans/2026-09-12-context-driven-panel-visibility-engine.md`](plans/2026-09-12-context-driven-panel-visibility-engine.md).
  - **Stream 1 (OpenCode)**: Worktree `.worktrees/feat-context-engine` on branch `feat/context-view-engine`. Declarative 6-context visibility matrix (`OWN_CITY`, `GBG`, `GE`, `QI`, `SETTLEMENT`, `OTHER_PLAYER`) in `cardVisibility.js` / `cardVisibility.ts`, route transitions in `combatRoutes.js`, `quantumRoutes.js`, `cityRoutes.js`, `socialRoutes.js`, non-destructive `panelDispatcher.js` refactoring, and test suite `tests/ui/context-view-filtering.test.mjs`.
  - **Stream 2 (Antigravity)**: Worktree `.worktrees/feat-goods-lifecycle` on branch `feat/goods-and-panel-lifecycle`. Extract `renderGoodsPanel.js` (<=250L) from `ResourceService.js` (dropping 580 -> <=380L), wire `.btn-close` dismiss/lock lifecycle, and prevent unwanted goods respawns on harvests/reloads.

- **Quantum Incursions (QI) UX & Modernization Parallel Integration (Antigravity & OpenCode)**:
  - **Stream 1 — QI UX (Antigravity)**:
    - Implemented `src/js/msg/GuildRaidsService.js` (243L) handling `GuildRaidsService.getMemberActivityOverview` and `RankingService.searchRanking` (`guild_raids` category).
    - Tracks member progress contributions and action points spent, computing diffs against `world:<id>.qiPerformance`.
    - Created `src/js/ui/renderQuantumPanels.js` (335L) implementing:
      1. `renderQuantumContributionsCard`: Table with Member, Progress (+diff badge), AP Spent (+diff badge), "show changes only" checkbox filter, Last Saved timestamp, and clipboard copy button.
      2. `renderQuantumLeaderboardCard`: 3-column championship guild leaderboard (`Guild | Rank | Total Points`) matching the user-provided screenshot.
    - Bound `#quantumContributions` and `#quantumLeaderboard` into `src/js/ui/containerBinding.js`, `cardVisibility.js`, and `collapse.js`.
    - Added 6 new translation keys across all 7 language dictionaries in `src/i18n/` with 100% key parity.
    - Added unit test suites `tests/msg/guild-raids-service.test.mjs` and `tests/ui/render-quantum-panels.test.mjs`.
  - **Stream 2 — Modernization DOM Decoupling, Trade Economy & Formula Parity (OpenCode)**:
    - Roadmap B5: Extracted inline DOM manipulations from `networkListener.js`, `StartupRenderOrchestrator.js`, `StartupService.js`, and `GuildBattlegroundService.js` into decoupled UI helpers (`gameVersionStatus.js`, `startupMetadataLoading.js`).
    - Track 2.5: Implemented `src/js/msg/TradeService.js` parsing live marketplace trades and fair trade ratios (1:1 same era, 1:2 adjacent era) against real 7.8MB capture fixture `marketplace_trades.json` (`tests/msg/trade-service.test.mjs`).
    - Roadmap D1g: Created `tests/math/formula-parity-pinning.test.mjs` pinning BigNumber half-up Arc rewards, ceiling spot locking, and owner safe adds against LoW-Tool / Forge-Hammer lineage formulas.
  - **Verification Gate**:
    - **922/922 tests passing** across 90 suites with 0 failures (expanded from 871 tests).
    - Full 5-stage verification gate (`npm run verify`) passed exit 0 (prettier check, eslint 0 errors, i18n check, 922 tests, webpack dev build).
    - Knowledge Graph AST refreshed cleanly (`npm run graph:foe-info:ast`).
    - Temporary git worktrees pruned cleanly.

- **Live HAR Ingestion, Multi-Domain Verification & QI Architecture (OpenCode)**:
  - **Phase 1 — isolated ingestion**: Added `scripts/ingest-hars-to-metadata.mjs` (`npm run metadata:extract-hars`), a string-aware streaming scanner that walks every `log.entries[]` object without loading a whole `.har` (up to 231 MB) via `JSON.parse`. It ingested the 39 captures in `docs/har/` (2.0 GB, git-ignored) in ~101 s into sibling `../metadata-store/extracts/`: 5,644 entries scanned, 1,468 game RPC responses, 88 unique RPCs (`rpc/<Class>.<Method>.json`), 18 domain bundles (`gbg/`, `qi/`, `treasury/`, `economy/`), 13 visited-city payloads, `raw_rpc_capture.json` ledger, and `meta.json`. Baseline `entities/`, `rpc/`, `manifest.json`, and `raw_rpc_capture.json` were not modified; `git ls-files docs/har` = 0.
  - **Fixtures**: Non-destructive mirrors into `tests/fixtures/visits/visit-<name>.json` (13) and `tests/fixtures/rpc/har/**` (18 bundles), plus 6 `<GbgAction>.action.json` request-payload fixtures. Existing fixtures were never overwritten.
  - **Phase 2 — Treasury (real bug fixed)**: The 10 captured `ClanService.getTreasuryLogs` pages (offsets 0–90) each overwrote `this.logs`, so only the last page survived against a real `count` of 29,385. `src/js/msg/TreasuryService.js` now accumulates by absolute offset (capped at 2,000), resets on a fresh offset-0 scan, and parses `player.player_id` and `createdAt`. Regression: `tests/msg/har-treasury-pagination.test.mjs` (6 tests).
  - **Phase 2 — GBG (verified)**: Confirmed `place=[provinceId, buildingId]`, `destroy`/`instantFinish=[provinceId, slotId]`, and `getBuildings` → `provinceId` + `placedBuildings[].readyAt`; `setSignal=[provinceId, "focus"|"ignore"]` and `removeSignal=[provinceId]`. `GbgCalculator` correctly splits ready vs under-construction camps and reconciles `gainAttritionChance` for diamond-rushed camps. Regression: `tests/msg/har-gbg-ground-truth.test.mjs` (12 tests).
  - **Phase 2 — Visited cities (verified)**: All 13 snapshots parse deterministically without throwing. Regression: `tests/fn/har-visited-cities.test.mjs` (4 tests).
  - **Phase 3 — QI architecture**: [`docs/plans/2026-09-12-quantum-incursions-architecture.md`](plans/2026-09-12-quantum-incursions-architecture.md) documents exact contracts for `GuildRaidsService.getState`/`getMemberActivityOverview`, `GuildRaidsMapService.getOverview`/`getNodeExtendedInfo`/`setNodeTarget`, and `GuildRaidsOutpostService.getOutpost`, plus the Slice 1–3 module layout. AP-regeneration constants are absent from the captures and are deliberately not hardcoded.
  - **Knowledge graph**: Rebuilt `../metadata-store/graphify-out/graph.json` (5,356 nodes / 180,809 edges / 0 dangling) and relabeled with the **DeepSeek** backend (`graphify label . --backend=deepseek`): 748 communities, 0 placeholder labels. Wiki/Obsidian/SVG/tree exports regenerated without the local llama-swap model.
  - **Evidence**: `npm run verify` exit 0 — 871/871 tests across 87 suites, prettier clean, eslint 0 errors, dev build compiles. `docs/STATUS.md` updated.
  - **Note**: `.agents/scripts/graph-{foe-info,metadata}-reindex.sh` and `src/js/msg/GbgSignalPayloadHandler.js` were modified concurrently by another process (DeepSeek backend support / ESM→CJS); those edits were preserved untouched.

- **OpenCode Heavy Lifting Milestone — All 3 Tracks Complete & Merged (`development`)**:
  - **Track 1 (P0 Safety & Correctness - `feat/opencode-safety-fixes`)**:
    - Fixed D1: `fResourceShortName` now falls back to `globalThis.ResourceNames` / `state.js` dictionary when called with 1 argument (resolving resource names for all 8 callers across city production, rewards, and province views).
    - Fixed D2: Removed duplicate RPC registrations from `src/js/protocol/legacyBridge.js` (`EmissaryService`, `BoostService`, `OutpostService`); modern domain services now exclusively own these handlers.
    - Cleaned up D4/D5: Removed orphaned `src/js/protocol/webRequestFilter.js`; added `"typecheck"` to the `"verify"` script in `package.json`.
  - **Track 2 (P1 Monolith Decomposition & Purity - `feat/opencode-monolith-decomp`)**:
    - Decomposed `src/js/calc/CityMapEntityProcessor.js`: dropped from **657 -> 254 lines** by extracting harvest readiness, collection times, and special goods into pure leaf calculator `src/js/calc/entities/CityEntityHarvestCalculator.js` (556 lines).
    - Decomposed `src/js/protocol/legacyBridge.js`: dropped from **831 -> 60 lines** by extracting four domain route tables into `src/js/protocol/routes/` (`combatRoutes.js` 317L, `cityRoutes.js` 264L, `socialRoutes.js` 193L, `buildingRoutes.js` 159L).
    - Fixed D3: Decoupled `VisitedCityStatsCalculator.js` from `CastleSystemService.js` via injected `CastleBoostCalculator.js`.
  - **Track 3 (P1/P2 Feature Parity & Polish - `feat/opencode-feature-parity`)**:
    - Implemented Blue Galaxy economic valuation ranking in `src/js/calc/BlueGalaxyCalculator.ts` and `.js` (combining FP and weighted Goods with BigNumber precision).
    - Unified date/time formatting engine in `src/js/utils/date.js` with native `Intl` tokens (`MMM`, `MMMM`, `ddd`) and `formatRelativeTime()`; migrated residual call sites in `ConversationService.js`, `renderGbInfoPanel.js`, and `GuildBattlegroundService.js`.
  - **Verification Gate**:
    - **849/849 unit tests pass** across 87 suites (0 failures; expanded from 826 tests).
    - Full 5-stage verification gate (`npm run verify`) passed exit 0 (lint, typecheck, tests, dev build).
    - Knowledge Graph AST refreshed cleanly (`npm run graph:foe-info:ast`).
    - Every functional module in `src/js/` satisfies the $\le 600$-line ceiling.

  - **Four parallel specialist streams** executed against the DeepSeek-reindexed graphs: `graph-knowledge-explorer` (host topology), `foe-info-original-comparator` (v1 baseline `8c681d1`), `forge-hammer-comparator` (peer architecture), and `low-tool-comparator` (closed-source fork lineage). All dossiers saved under the respective `graphify-out/*/findings/` directories (plus plan-designated sibling copies for the two peers). No source code was modified.
  - **Consensus**: the modernization is **architecturally ahead of all measured peers**; `src/js/calc/` is 100% DOM-free and the network pipeline (passive `xhrInterceptor` → `MessageDispatcher` → services → calc → UI) is sound. Risk is concentrated in residual seams, not the design.
  - **Confirmed defects (Targeted Surgical input)**: (D1) `fResourceShortName` no longer reads the runtime `ResourceNames` map, so generic resources render as raw IDs (all 8 call sites omit the lookup; uncovered by tests); (D2) duplicate RPC ownership (`EmissaryService.getOverview/getAssigned`, `BoostService.getAllBoosts`, `OutpostService.getAll`) silently combined by `MessageDispatcher.register`, risking double side effects; (D3) calc dependency impurity — `VisitedCityStatsCalculator` imports `../msg/CastleSystemService.js` and `gbNaming.js` reads `globalThis`; (D4) `webRequestFilter.js` is orphaned and the `webRequest` permission was dropped while panel-context CDN fetches persist; (D5) `npm run verify` excludes `typecheck` while 10 `.js`/`.ts` mirrors can drift.
  - **Residual monoliths**: `src/js/protocol/legacyBridge.js` (831 L; `registerLegacyBridge` ~817 L with 71 `dispatcher.register` calls) and `src/js/calc/CityMapEntityProcessor.js` (657 L; one ~610-L `processCityMapEntities` function — the safest decomposition target). `panelDispatcher.ts` 749 L and `MessageDispatcher.js` 607 L are marginally over cap.
  - **Feature gaps vs Forge-Hammer**: Blue Galaxy economic ranking (FP + configurable goods rates) and the date/time engine (four format types, localized tokens, relative time, live preview; 30 residual `toLocale*` call sites). Explicitly reject Forge-Hammer's eager 70-script injection, `window.FH` globals, jQuery/moment vendoring, and absent test gate.
  - **Plan premises corrected**: v1 baseline line counts (actual `index.js` 2,806, `StartupService` 1,554, `helper.js` 846, `GBService` 1,025); v1 **already used BigNumber** (real v1→modern wins are the owner-safe-add formula correction and explicit `ROUND_CEIL` locks); **no Blue Galaxy probability model exists** in either extension (charges are deterministic); and **LoW-Tool is a fork of FoE-Info** with a private `src/extras/` overlay, not the upstream original — its antique-dealer/settlement "features" were never in LoW-Tool, and the overlay (hardcoded Discord webhooks, embedded Apps Script key, per-world player-ID allowlists) must **not** be restored.
  - **Evidence**: 4 dossiers + executive synthesis at `graphify-out/foe-info/findings/2026-09-12-quad-graph-executive-synthesis.md` (graphify-out is git-ignored). Tracked roadmap: [`docs/plans/2026-09-12-targeted-surgical-roadmap.md`](plans/2026-09-12-targeted-surgical-roadmap.md). `docs/STATUS.md` updated.

- **Modernization Milestone — All 3 Parallel Tracks Integrated (`development`)**:
  - **Track 1 (OpenCode Agent 1 - `index.js` Monolith Decomposition)**: Extracted index-level UI bindings to `src/js/ui/indexUiBindings.js` (434 lines); `src/js/index.js` dropped from **1,003 → 566 lines** (≤ 600 cap satisfied).
  - **Track 2 (OpenCode Agent 2 - `helper.js` Modernization)**: Extracted GBG changes renderer to `src/js/ui/renderBattlegroundsPanel.js` (230 lines) and created pure formatters in `src/js/utils/formatters.js`; `src/js/fn/helper.js` dropped from **402 → 210 lines** (< 250 target satisfied).
  - **Track 3 (Antigravity - Calc TS Ports)**: Added strict typed ports `src/js/calc/eraMapping.ts` (114 lines) and `src/js/calc/utils/spatialUtils.ts` (250 lines) with clean `tsc --noEmit`.
  - **Worktree Cleanup**: All three temporary worktrees (`.worktrees/*`) cleanly pruned and feature branches removed.
  - **Invariant Milestone**: **100% of files in `src/js/` are now strictly ≤ 600 lines**.
  - **Evidence**: `npm run verify` passed exit 0 across all 5 stages; `npm test` 826/826 tests pass across 83 suites (0 failures); Webpack compiled in 4,752 ms; AST reindexed cleanly.

- **Modernization Phase 4 — Helper Formatter & GBG Renderer Extraction (OpenCode Agent 2, branch `feat/opencode-modernization-helper`)**:
  - **Corrected brief premise**: The Phase 4 brief claimed `fRound`, `fNumber`, `fFormatNumber`, and `fAgestring` lived in `src/js/fn/helper.js`. They do not exist anywhere in repository history, the frozen `FoE-Info-Extension-original` v1 baseline, or `LoW-Tool`. The only `git log -S` hit is the brief commit `79f6405`, and the only other `fRound` occurrences are unrelated `fRoundFinishes`/`fRoundTimeRemaining` symbols inside `docs/har/login.har`. They were therefore implemented as new pure utilities rather than migrated.
  - **New pure formatters** (`src/js/utils/formatters.js`): null-safe `fRound(val, decimals = 2)` (fixed-decimal rounding, invalid → `0`), `fNumber(val, fallback = 0)` (separator/whitespace-tolerant numeric coercion), `fFormatNumber(num, locale = 'en-US')` (locale thousands grouping, invalid → `'0'`), and `fAgestring(ageKey)` (camel-cased era key → spaced label, nullish → `''`). All four are re-exported from `helper.js` for backward compatibility.
  - **Real thinning** (`src/js/fn/helper.js` → `src/js/ui/renderBattlegroundsPanel.js`): Extracted the ~180-line GBG changes panel (`fshowBattleground`, `fshowBattlegroundChanges`, `setHeight`, `heightGBG`/`gbgResizeObserver` state) into `src/js/ui/renderBattlegroundsPanel.js` with `createLogger('BattlegroundsPanel')` diagnostics; `helper.js` re-exports both functions and retains `getCityEntityDef`, `fEntityNameTrim`, `fGoodsTally`, `translateContainer`, `checkGBG`. `helper.js` dropped **402 → 210 lines** (< 250 target, −192).
  - **Tests**: Added `tests/fn/helper-modernization.test.mjs` (formatter re-export identity parity, extracted-renderer identity, legacy surface intact, `< 250`-line guard; uses the in-process `registerHooks` ESM loader + browser stubs) and expanded `tests/utils/formatters.test.mjs` with 36 cases. Updated source-coupled assertions in `tests/ui/panel-resize-and-visibility.test.mjs` and `tests/msg/guild-battleground-signals.test.mjs` to read the extracted renderer.
  - **Evidence**: `npm run verify` exit 0 — 817/817 tests, prettier clean, eslint 0 errors (179 pre-existing warnings), `npm run build:dev` compiled successfully.
  - **Follow-up**: Graphify AST refresh (`npm run graph:foe-info:ast`) not run in this slice; `graphify-out/` is git-ignored.

## Current session (2026-09-11)

- **Modernization Phase 3 — `index.js` Monolith Decomposition (OpenCode Agent 1, branch `feat/opencode-modernization-index`)**:
  - Created `src/js/ui/indexUiBindings.js` (`createLogger('IndexUiBindings')`) owning the index-level UI, startup, and runtime bindings: `#go-to-options` click handler (with `openOptionsPage` fallback), `prefers-color-scheme` theme listener, `window` message bridge, `browser.storage.local.getBytesInUse` logging, the storage/i18n bootstrap (localized dictionary load + `translateContainer`), runtime lifecycle (`onInstalled`, `onUpdateAvailable`, `requestUpdateCheck`), storage-change wiring (`initStorageListeners`), and the DevTools/network bridge (`initNetworkListeners`).
  - `src/js/index.js` dropped **1,003 → 566 lines** (≤ 600 modular cap) by replacing the extracted blocks with a single `initIndexUiBindings({...})` call and removing dead code: the never-assigned clipboard HTML block, `onClickHandler`, `onEvent`, `storageChange`, the unreachable permission-request branch (`Promise.resolve(true)` else path), unused `clearExpedition`/`clearForBattleground`/`clearForMainCity`/`clearStartup`/`clearCultural` helpers, `GuildDonations`/`GuildsGoods`, and now-unused imports.
  - Added `tests/ui/index-ui-bindings.test.mjs` (7 tests: options button, message bridge, theme toggle, storage usage logging, runtime lifecycle, safe full initialization in a mock DOM, and a `src/js/index.js` size/wiring guard). Updated the source-coupled assertion in `tests/msg/guild-battleground-signals.test.mjs` to check the extracted module for `setTargetText`/`setTargetsTopic` wiring.
  - Verification: `npm test` 804/804, `npm run check` clean, `npm run lint` 0 errors (146 warnings), `npm run build:dev` compiles successfully.
- **Slice 4 Track A — Storage Isolation & Startup Thinning (OpenCode Agent 1, branch `feat/opencode-slice4-heavy`)**:
  - **F26** (`collapse.js`, `storage.js`, `worldStorage.js`, `storageMigration.js`, `storageListener.js`): collapse flags now persist per world under `world:<id>.collapses`. Added `setCollapse`/`getCollapse`, `saveWorldSettings` merges a `collapses` bag, `storageListener` restores world-scoped values on initial load and on `world:*` change events, and legacy flat `collapseGBInfo`/`collapseClipboard` keys migrate to `world:en7` then get removed. No flat global collapse key is written.
  - **F27** (`storage.js`): removed the flat `toolOptions` dual-write; world storage is now authoritative for reads, stale flat keys are cleaned, and they can no longer override per-world panel heights.
  - **StartupService thinning**: extracted the FP/goods tooltip aggregation into `src/js/msg/StartupCityStatsAggregator.js` and moved the metadata render subscription into `StartupRenderOrchestrator.subscribeMetadataRenders`; `StartupService.js` dropped **600 → 501 lines** (≤ 520 target).
  - **CastleSystemService**: added `createLogger('CastleSystemService')` scoped debug traces and a dedicated `tests/msg/castle-system-service.test.mjs` suite.
  - Verification: `npm test` 792/792, `npm run check` clean, `npm run lint` 0 errors (179 pre-existing warnings), `npm run build:dev` compiles.
- **Modernization Phase 2: Calc TS Ports & F12 GB Map Consolidation (OpenCode Agent 2, branch `feat/opencode-modernization-calc`)**:
  - **Typed calc ports**: Added `src/js/calc/BlueGalaxyCalculator.ts` (exports `GalaxyCandidate`, `GalaxyRankedCandidate`, `GalaxyEntityProduction`, `GalaxyOptions`, `GalaxyMetadataStore`; mirrors `extractEntityFp`, `createGalaxyCandidate`, `filterAndSortGalaxyCandidates`, `isCandidateReady`, `getTopReadyGalaxyBuildings`, `updateCandidateState`; lazy `createLogger('BlueGalaxy')`) and `src/js/calc/InvestedCalculator.ts` (exports `InvestmentEntry`, `InvestmentReward`, `InvestmentOptions`, `InvestmentSummary`; mirrors `getInvestmentKey`, `isPositionSafe`, `calculateInvestments` with `BigNumber.ROUND_HALF_UP` Arc rewards; lazy `createLogger('InvestedCalc')`). Both keep the shipping `.js` runtimes untouched and use CommonJS/ESM dual-compatible exports.
  - **F12 consolidation**: `GB_NAME_MAP` (canonical landmark→name object) and `getGreatBuildingName` now live in `src/js/calc/gbNaming.js`; `GB_FALLBACK_NAMES` is derived via `new Map(Object.entries(GB_NAME_MAP))`. `src/js/calc/utils/gbNames.js` is now a thin re-export shim of the same references, so `GreatBuildingRegistry.js` continues to resolve names without modification.
  - **Utility parity**: Confirmed `src/js/calc/utils/bignumberUtils.ts` and `src/js/calc/utils/eraUtils.ts` typecheck cleanly.
  - **Evidence**: Added `tests/calc/gb-names-consolidation.test.mjs` (4 tests). `npx tsc --noEmit` exit 0, `npm test` 776/776, `npm run check` clean, `npm run lint` 0 errors, `npm run build:dev` compiled successfully.
- **Slices 1-3 Heavy Lifter (Track A) — F5/F6/F18/F19/F21/F23 remediated (`1343183`, merged `a062bdf`)**:
  - **F5**: Extracted the duplicated GBG signal payload resolution and signal-list mutation from `GuildBattlegroundService.js` into `src/js/msg/GbgSignalPayloadHandler.js` (`createLogger('GbgSignalPayloadHandler')`), exposing `resolveSignalData`, `resolveSignalTarget`, `applySignalToList`, and `removeSignalFromList`. `updateSignal`/`setSignal`/`removeSignal` now delegate; service dropped **857 → 596 lines** (≤ 600 hard cap). Existing GBG signal/guard suites unchanged and green.
  - **F6**: Reconciled the four divergent TS ports with their shipping `.js` runtimes: `GbgCalculator.ts` and `GreatBuildingCalculator.ts` regained the lazy scoped-logger debug path; `cardVisibility.ts` restored the guarded `__webpack_require__` lazy-init for `showOptionsState`/`isDebugEnabledGlobal` and dropped extra debug calls; `panelDispatcher.ts` restored the lazily-required `defaultShowOptions` and the `console.error` resize-failure log. `npx tsc --noEmit` exit 0.
  - **F18/F19**: `getAllBoosts` now null-guards each item (`if (!item) continue;`); `applyBoostsToCity` accumulates through `BigNumber.plus` and converts to `Number` only in the final export loop, matching the BigNumber model used by `getAllBoosts`.
  - **F21/F23**: Popover triggers in `statFormatters.js` and `cityStatsHtmlBuilder.js` carry `tabindex="0"`; informational cards in `expeditionTables.js`, `renderBattlegroundResultCard.js`, and `gbgProvinceView.js` now use `role="status" aria-live="polite"` instead of assertive `role="alert"`.
  - Verification: `npm run verify` exit 0 (768/768 tests, eslint 0 errors, prettier clean, dev build compiles), `npx tsc --noEmit` exit 0, `npm run check` clean.
- **Slices 1-3 Precision & Boundaries (Track B) — F4/F7/F8/F9/F10/F22/F25 remediated (`5209ab0`)**:
  - **F8**: Configured `getSafe` fallback calculation in `renderGbDonationPanel.js` to use `BigNumber.ROUND_HALF_UP` (Forge-Hammer parity) instead of primitive `Math.round`. Added unit test in `tests/ui/render-gb-donation-panel.test.mjs` verifying half-up behavior.
  - **F22**: Replaced invalid `href` attribute on `<p id="freeTextLabel">` in `renderGbDonationPanel.js` with valid `role="button"`, `tabindex="0"`, and `data-bs-target="#donationText3"`.
  - **F9**: Corrected module JSDoc header in `InvestedCalculator.js` to specify half-up rounding instead of ceiling rounding for Arc multipliers.
  - **F10**: Replaced `Math.min(donateCustom, remaining)` with `BigNumber.minimum(donateCustom, remaining)` and used `new BigNumber(rewardFP).minus(lockFP)` in `GreatBuildingCalculator.js`.
  - **F25**: Removed `!important` flags from inline `max-height` and `overflow-y` properties on `#galaxyText` in `renderGalaxyPanel.js`.
  - **F4**: Eliminated `debugEl.innerHTML += ...` DOM mutation in `CityMapEntityProcessor.js`; replaced with aggregated `uncountedEntitiesCount` logged in summary, preserving hot-path AST loop invariants (`tests/msg/startup-hot-path-logging.test.mjs`).
  - **F7**: Introduced `normalizeIgnoreListData(data)` in `playerTooltip.js` to decouple UI rendering from raw InnoGames RPC envelopes. Added unit test in `tests/ui/player-tooltip.test.mjs`.
  - Verification: Full test suite green (772/772 passing), `npm run verify` passed with 0 errors across all 5 stages.
- **GBG RPC Payload Defensive Guards — F14/F15/F16 remediated (`6019d29`, branch `fix/gbg-rpc-guards`)**:
  - Guarded `GuildBattlegroundService.getBattleground`, `getState`, and `getPlayerLeaderboard` against null, empty, non-array, and malformed RPC payloads: optional-chained `map.id` with `'default'` fallback, normalized `map` province arrays with null-entry filtering, guarded `stateId`, `Array.isArray` defaults for leaderboard arrays, and `entry?.player?.name || 'Unknown'` fallbacks. No more `TypeError` aborts on partial packets.
  - Added `tests/msg/guild-battleground-guards.test.mjs` (5 tests) using an in-process `registerHooks` ESM loader plus `bootstrap`/`webextension-polyfill` stubs to exercise null/empty/partial payloads across all three handlers.
  - Verification: targeted `node --test` 5/5, full `npm test` 768/768, `npm run check` clean, `npx eslint` 0 errors (6 pre-existing warnings).
- **End-to-End Codebase Review & Adversarial Debate (OpenCode + Antigravity)**:
  - OpenCode completed Phase 1 comprehensive audit across 5 squads, generating 27 findings (F1–F27) in `docs/archive/reviews/2026-09-11-codebase-audit-findings.md` under schema `debate-review.findings.v1`.
  - Antigravity completed Phase 2 Adversarial Debate under schema `debate-review.debate.v1`:
    - Evaluated all 27 findings against source code.
    - Confirmed 5 true blockers: GBG RPC payload guards (`F14`, `F15`, `F16`), QI boost type mapping (`F17`, `F20`), and duplicate DOM ID collision (`F24`).
    - Refuted wholesale deletion of essential UI community abbreviation maps and cold fallbacks (`F11`, `F13`).
    - Downgraded legacy duplication and non-crashing debt (`F11`, `F12`, `F13`).
    - Structured remaining 19 non-blocking improvements into a prioritized 4-slice remediation roadmap.
- **Blocker Remediation Track B: QI Boosts & Guild DOM ID Collision (`b8994e7`)**:
  - Implemented $F17$ & $F20$ in `src/js/calc/boosts/MilitaryBoostCalculator.js`: mapped real InnoGames server RPC strings (`guild_raids_coins_production`, `guild_raids_coins_start`, `guild_raids_supplies_production`, `guild_raids_goods_start`, `guild_raids_action_points_collection`, `guild_raids_action_points_capacity`) alongside legacy aliases; updated `tests/fn/city-stats-calculator.test.mjs`.
  - Implemented $F24$ in `src/js/ui/renderGuildPanel.js` & `src/js/fn/collapse.js`: namespaced `#guildText`, `#guildTextLabel`, and `#guildicon` to `#guildOverviewText`, `#guildOverviewTextLabel`, and `#guildOverviewIcon`, eliminating collapse state collisions with `OtherPlayerService.js`.
  - Full test suite green (763/763 passing), merged cleanly into `development`, and worktree `.worktrees/antigravity-blockers` pruned.
  - Concurrent workstream execution in isolated worktrees (`.worktrees/antigravity-gb-naming` and `.worktrees/opencode-gbg-province`).
  - **GB Naming Helper (Antigravity)**: Extracted `fGBsname` and `fGBname` into `src/js/calc/gbNaming.js` (266 lines) with dual CJS/ESM exports and 100% backward-compatible re-exports from `helper.js`. `src/js/fn/helper.js` dropped from **592 to 408 lines** (−184 lines, $\le 475$ target met). Updated `tests/fn/entity-lookup-logging.test.mjs` and expanded `tests/calc/gb-naming.test.mjs`.
  - **GuildBattlegroundService (OpenCode)**: Extracted `checkProvinces()` target generator DOM assembly into `src/js/ui/renderTargetGeneratorCard.js` (409 lines) with `createLogger('GbgTargetGen')`. `GuildBattlegroundService.js` dropped from **980 to 848 lines** (−132 lines). Modularized `src/js/ui/gbgProvinceView.js` (269 lines). Added tests in `tests/ui/gbg-province-view.test.mjs`.
  - Both branches merged into `development`, worktrees removed and feature branches deleted. Full verification gate green (759/759 tests).
- **Parallel Monolith Decomposition (`GreatBuildingsService.js` & `GuildBattlegroundService.js`)**:
  - Concurrent workstream execution in isolated worktrees (`.worktrees/antigravity-gb-donation` and `.worktrees/opencode-gbg-result`).
  - **GreatBuildingsService (Antigravity)**: Extracted 315-line donation table view & calculation loop into `src/js/ui/renderGbDonationPanel.js` (492 lines) with `createLogger('GbDonationPanel')`. `GreatBuildingsService.js` dropped from **736 to 458 lines** (−278 lines, $\le 600$ hard ceiling satisfied). Cleaned up dead variables and unused imports. Added `tests/ui/render-gb-donation-panel.test.mjs` (6 tests).
  - **GuildBattlegroundService (OpenCode)**: Extracted `getState(msg)` 80-line result card generator into `src/js/ui/renderBattlegroundResultCard.js` (217 lines) with `createLogger('GbgResultCard')`. `GuildBattlegroundService.js` dropped from **1,032 to 980 lines**. Added `tests/ui/render-battleground-result-card.test.mjs` (6 tests).
  - Both branches merged into `development`, worktrees removed and branches deleted. Full verification gate green (745/745 tests).
- **TypeScript visibility/dispatcher mirrors (`ceef68d`, merged `d7dd28d`)**:
  - Added `src/js/ui/cardVisibility.ts` exporting `ViewState = 'CITY' | 'GBG'`, `ViewFilter`, `PanelId` (all 15 sidebar panels), `ReadonlySet<PanelId>` allow/block sets, and `ShowOptionsState`; all four view branches (debug override, GBG, CITY, unconstrained default) mirror `cardVisibility.js` exactly.
  - Added `src/js/ui/panelDispatcher.ts` with typed `PanelContainers`, `ResettableState`, `TreasuryResources` (Map + BigNumber-`toNumber` aware), `ResourceDef`, and `RenderTreasuryDeps`; all seven clear routines and `renderTreasuryPanel` mirror `panelDispatcher.js` exactly.
  - Grep-verified both modules are jQuery-free (vanilla `getElementById`/`querySelector`/`addEventListener` only); `.js` runtimes, callers (`index.js`, `networkListener.js`, `TreasuryService.js`), and tests untouched — zero UI behavior shift.
  - Verification on merged `development`: `npx tsc --noEmit` clean, `npm run verify` exit 0 (eslint 0 errors, prettier clean, 704/704 tests pass, webpack dev build compiles).
- **Chrome API types & hybrid TS config (`a5c5b96`, merged `9e63acb`)**:
  - `@types/chrome` (^0.2.9) in devDependencies; `tsconfig.json` set for gradual adoption (`allowJs`, `checkJs: false`, `strict: false`, `chrome`/`webextension-polyfill`/`node` types); `eslint.config.mjs` scopes Chrome extension globals (`globals.browser`/`chrome`/`webextensions`) to `src/**/*.{js,mjs,cjs}`.
  - `typescript-eslint` (^8.70.0) added as devDependency but not wired into the flat config: it does not support TypeScript 7.x yet, so `.ts` files stay outside `eslint .` (default JS-only lint) until upstream supports TS ≥ 7.1.
- **Release v0.0.835 (tag `v0.0.835`)**:
  - Context-aware dynamic view filtering, standalone Incidents card extraction, 15-panel vertical mounting hierarchy, player score normalization, and codebase audit hardening across `src/js/msg/` and `src/js/ui/`.
  - Re-verified full test suite (683/683 passed, 0 failures) and prepared for `npm run release` execution.
- **Codebase Audit Quick Fixes (`RewardRenderer.js`, `BonusService.js`, `AddElement.js`, `CityProductionService.js`, `ConversationService.js`, `renderGbInfoPanel.js`, `gbDonationTables.js`)**:
  - Parity for collapse headers: Added label-click listener to `rewardsTextLabel` in `RewardRenderer.js` and `bonusTextLabel` in `BonusService.js`, allowing users to toggle collapses by clicking anywhere on the header without conflicting with icon clicks.
  - Guarded against duplicate accessibility keydown listeners in `AddElement.js` via `document._foeA11yBound`.
  - Added defensive optional chaining to `CityProductionService.js` for `reward.state?.current_product?.product?.resources` and nullish `unit` objects, preventing unhandled `TypeError` exceptions.
  - Formatted raw numeric Unix epoch timestamps in `ConversationService.js` using `dateUtils.formatTime` (with `dayjs` and `toLocaleTimeString` fallbacks) instead of rendering raw integer epoch digits.
  - Cleaned up dead code `playerPrefix` in `renderGbInfoPanel.js`.
  - Prevented duplicate DOM `id='copyText'` in `gbDonationTables.js` by scoping secondary place card footers to `copyText_${place}`.
  - Added unit test in `tests/msg/conversation-service.test.mjs` verifying formatted numeric timestamps (683/683 tests passing, full `npm run verify` passed).
- **Context-Aware View Filtering, Incidents Extraction, Player Points Fix, and 15-Panel Stacking Order (`cardVisibility.js`, `containerBinding.js`, `renderIncidentsPanel.js`, `renderHeaderPanel.js`, `accountParser.js`)**:
  - Implemented dynamic context view filtering in `src/js/ui/cardVisibility.js`:
    - **GBG Map View (`currentView === 'GBG'`)**: Shows ONLY 6 combat-essential panels (`#header`, `#army`, `#rewards`, `#gbgTargetGenerator`, `#battlegrounds`, `#gbgLeaderboard`) and explicitly blocks/hides all 9 non-combat panels plus city utility lists.
    - **City View (`currentView === 'CITY'`)**: Hides GBG-specific panels (`#gbgTargetGenerator`, `#battlegrounds`, `#gbgLeaderboard`) while city panels obey `showOptions`.
    - **Debug Mode Override (`isDebug === true`)**: Overrides all view gates and forces ALL 15 panels visible simultaneously, injecting `<div class="alert alert-secondary p-2 mb-2 font-monospace small debug-stub"><strong>[DEBUG STUB]</strong> ${panelId}</div>` when content is absent.
    - Integrated with `panelDispatcher.js` (`clearForBattleground` -> 'GBG', `clearForMainCity` -> 'CITY', `clearStartup` -> 'CITY').
  - Extracted Incidents into standalone card module `src/js/ui/renderIncidentsPanel.js` decoupled from Harvest (`#buildings`), instrumented with `createLogger('IncidentsPanel')`.
  - Created `src/js/ui/renderHeaderPanel.js` with `createLogger('HeaderPanel')`, integrating Player Points, Era, Guild, Daily Income, Combat Boosts (Base, GBG, GE, QI), and City Boosts (Arc, CF, Coins, Supplies) into `#header`.
  - Created `src/js/parsers/accountParser.js` to normalize user account data and extract player points across `rank_points ?? player_points ?? score ?? points`, wiring into `StartupService.js`, `state.js`, and `renderLiveCityStats.js`.
  - Reordered `setupPanelContainers` and `mountPanels` in `src/js/ui/containerBinding.js` to mount the exact 15-panel vertical sequence directly into `#content`:
    1. `#header`, 2. `#incidents`, 3. `#army`, 4. `#rewards`, 5. `#gbDonation`, 6. `#gbInfo`, 7. `#gbContributors`, 8. `#gbgTargetGenerator`, 9. `#battlegrounds`, 10. `#gbgLeaderboard`, 11. `#geChampionship`, 12. `#geContributions`, 13. `#goodsInventory`, 14. `#guildOverview`, 15. `#treasury`.
  - Added unit test suites `tests/parsers/account-parser.test.mjs`, `tests/ui/render-incidents-panel.test.mjs`, `tests/ui/render-header-panel.test.mjs`, `tests/ui/context-view-filtering.test.mjs`, and updated `tests/ui/container-binding.test.mjs` (682/682 tests passing, full `npm run verify` passed).
  - Fixed own-city Great Building failing to load or sticking on a previously viewed foreign GB when clicked inside city.
  - Root cause: clicking an own-city GB triggered `CityProductionService.fGetEntityList` with `type: "greatbuilding"`, but `GreatBuildingRegistry` only registered GBs when visiting foreign cities or loading contributor lists, leaving own-city lookups unpopulated and falling back to whatever foreign GB was last cached.
  - Registered city map Great Building entities in `GreatBuildingRegistry.registerBuilding` upon receiving `city_map.getEntities` or `CityProductionService.fGetEntityList`.
  - Added fallback in `legacyBridge.js` to use local player ID when player ID is missing or `0` in Great Building service requests.
  - Added unit tests in `tests/msg/great-buildings-unified.test.mjs` (9 tests passing).
- **Enforced Great Buildings and GBG panel display ordering (`containerBinding.js`, `GreatBuildingsService.js`)**:
  - Enforced strict hierarchical panel DOM order:
    - Great Buildings: 1. GB Donation panel (`#donation2` / `#donationDIV2`), 2. GB Info (`#gbInfo`), 3. GB Contributors (`#greatbuilding`).
    - Guild Battlegrounds (GBG): 1. GBG Target Generator (`#targets` / `#targetsGBG`), 2. Battlegrounds Changes (`#battleground`), 3. GBG Leaderboard (`#gbgLeaderboard`), 4. rest (`#guild`, `#output`, `#treasury`, `#treasuryLog`).
  - Updated `mountPanels` and `setupPanelContainers` in `containerBinding.js` to mount containers in strict order.
  - Updated `fCheckOutput` in `GreatBuildingsService.js` to re-order DOM nodes using `insertBefore` if containers were inserted out-of-order, guarded for headless environments.
  - Added unit tests in `tests/ui/container-binding.test.mjs` (8 tests passing).
- **Custom panel resize retention & collapse expand bugfix (`panelResize.js`, `custom.scss`)**:
  - Eliminated bug where expanding a collapsed panel caused it to blow up to maximum content height (~800px) instead of restoring default or custom user-resized height.
  - Root cause: `.resize { max-height: max-content !important; }` in `custom.scss` overrode inline height styles; Bootstrap's `shown.bs.collapse` cleared inline `style.height = ''`.
  - Created reusable `bindResizableCollapse` in `src/js/ui/panelResize.js` using `ResizeObserver`, clamping `maxHeight` during `show.bs.collapse`, restoring persisted height on `shown.bs.collapse`, and storing user adjustments in per-world storage.
  - Applied `bindResizableCollapse` to Army (`#armyText`), Goods Inventory (`#goodsText`), and Guild Treasury (`#treasuryText`).
  - Added unit test suites in `tests/ui/panel-resize.test.mjs` and updated `tests/ui/panel-resize-and-visibility.test.mjs` (659 total unit tests passing).
- **Army panel default calibration & collapse guard (`3b167a3` + update)**:
  - Calibrated default Army Panel height to 185px (`#armyText`, outer card height 229px) across [`globals.js`](../src/js/fn/globals.js), [`factoryDefaults.js`](../src/js/state/factoryDefaults.js), and [`ArmyUnitManagementService.js`](../src/js/msg/ArmyUnitManagementService.js), matching desired visual geometry.
  - Added `.collapsing` and `!show` guards to the Army `ResizeObserver` preventing intermediate transition heights during collapse from corrupting the stored user height.
  - Wired per-world storage handling for `toolOptions` in [`storage.js`](../src/js/utils/storage.js) (`setStorage` and `getStorage`), saving via `saveWorldSettings(currentWorld, { toolOptions })` and syncing `memoryWorldCache`.
  - Preserved `resize-both` so custom user-resized heights persist across game sessions and world reloads.
  - Updated unit test suites verifying 185px default, custom overrides, collapse animation guards, and per-world persistence (649/649 tests passing).
- **Battlegrounds collapse performance & transition fix**:
  - Scoped `min-height: 250px` to `.gbg-full-roster.show` in [`custom.scss`](../src/css/custom.scss) to prevent CSS min-height from fighting Bootstrap collapse height calculation.
  - Suppressed animations on collapsing elements (`.collapsing { min-height: 0 !important; transition: none !important; }`), eliminating frame-by-frame 350ms table reflow lag.
  - Added observer guards in `helper.js` (`gbgResizeObserver`) so intermediate heights during collapse/hide are ignored.
  - Added `e.stopPropagation()` to `battlegroundicon` click handler preventing event double-triggers.
- **Lists Copy button alignment (`OtherPlayerService.js`)**:
  - Replaced absolute offset positioning (`top: 0; right: 0; margin-top: 0.75em; margin-right: 3em;`) with clean flex row headers (`<div class="d-flex flex-row justify-content-between align-items-center mb-0">`) for Friends, Guild, and Hood lists.
  - Aligned Copy buttons flush with the right edge without overlapping container borders.
  - Updated `collapse.js` (`fCollapseFriends`, `fCollapseGuild`, `fCollapseHood`) to handle `display = 'inline-block'`.
- **GE Championship & Leaderboard styling alignment (`expeditionTables.js`, `custom.scss`)**:
  - Left-aligned Server column header and data cells (`text-start`) in GE Championship table.
  - Styled GE Leaderboard (`#geContributionTable`) with `.goods-table table-sm table-borderless align-middle w-100 mb-0 bg-transparent`, aligning member names to the left, trial to center, and points and solved encounters centered with `tabular-nums` and formatted numbers (`toLocaleString()`).
- **DevTools `#content` panel ordering (`containerBinding.js`)**:
  - Organized all active panels into a clean, predictable 5-group workflow: City & Production (`#cityOverview`, `#visitinfo`, `#cityproduction`, `#bluegalaxy`, `#incidentstext`, `#bonusText`) $\to$ Military (`#army`, `#unitsText`, `#pvpArena`, `#combatBoosts`) $\to$ Great Buildings (`#greatbuilding`, `#gbInfo`, `#donation2`, `#invested`, `#stats`) $\to$ Guild Activities (`#guildoverview`, `#battleground`, `#gbgLeaderboard`, `#internationalExpedition`, `#expedition`, `#treasury`, `#guildraid`, `#contributions`) $\to$ Social & Logs (`#friends`, `#guild`, `#hood`, `#settlement`, `#goods`, `#rewardText`, `#buildingCost`, `#itemExchange`, `#logstext`).
- **i18n table header capitalization**:
  - Capitalized `Type` and `Amount` keys across all 7 language dictionaries (`de`, `el`, `en`, `es`, `fr`, `gr`, `it`) in `src/i18n/` for Goods Inventory and Guild Treasury consistency.
- **Goods Inventory, Treasury & Outpost table alignment (`5608b43`)**:
  - Removed artificial `ps-3` indentation from item cells in [`ResourceService.js`](../src/js/msg/ResourceService.js), [`panelDispatcher.js`](../src/js/ui/panelDispatcher.js), and [`OutpostService.js`](../src/js/msg/OutpostService.js).
  - Aligned all goods, medals, and outpost resources flush left with column headers (`Type`/`Resource`) and era section titles with uniform 6px padding.
  - Cleaned up `td.ps-3` override from [`custom.scss`](../src/css/custom.scss).
- **Universal panel collapsibility, GB reopen lifecycle & UI fixes (`c1c8a00`, `53b89c0`, `5c2dbf1`, `fbe4b4a`, `b19c2eb`)**:
  - Added title-click collapse, `[-]`/`[+]` icons, and close buttons across all active panels.
  - Separated "Other Player Information" header from player name ScoreDB link, moving the link to card body line 1.
  - Preserved player's own City Info overview as permanently visible without a close button.
  - Formatted Chateau Frontenac (CF) bonus on its own div line under Arc bonus in City Overview.
  - Reverted GB donation place headers to classic "1st Place", "2nd Place" (removed Arc bonus suffix).
  - Fixed closed Great Building panels (`#greatbuilding`, `#gbInfo`, `#donation2`) failing to reappear on subsequent GB opens by preserving container mount points.
- **Options page instant rendering & FOUC fix**:
  - Eliminated blank delay and unpopulated controls when opening `options.html`.
  - Populated the world selector and settings form immediately and synchronously from storage cache (`globals` and `getWorldSettings`) without waiting on browser tab IPC queries.
  - Moved `discoverOpenGameWorlds()` to a non-blocking background task.
  - Added smooth CSS transition on `.container.loaded` in [`options.scss`](../src/css/options.scss) to eliminate any flash of unpopulated checkboxes.
  - Fixed duplicate "Options Options" title in [`options.html`](../src/chrome/options.html).
  - Added unit test [`tests/ui/options.test.mjs`](../tests/ui/options.test.mjs) (verified 625/625 tests pass).
- **Release v0.0.834 and Codebase Audit Fixes (`bf83230`, tag `v0.0.834`)**:
  - Performed deep codebase audit across `src/js/msg/`, `src/js/calc/`, `src/js/ui/`, and `src/js/protocol/` with specialist subagents.
  - Resolved DOM node detachment on `#visit` close button click in `renderCityStats.js`, maintaining container order and preventing visit stats freeze.
  - Fixed Colonial Age tooltip ID typo (`cma` → `ca`) in `cityStatsTooltips.js`.
  - Bound `showStats` directly to `#citystats` container in `cardVisibility.js`, cleanly hiding outer card when disabled.
  - Resolved memory leak in `PopoverManager.js` by scoping `window` mouseup listener with `{ once: true }` on mousedown.
  - Fixed HTML syntax errors in `gbDonationTables.js` and removed orphaned `</p>` in `renderBuildingCollectionTimes.js`.
  - Guarded payload arrays in `BonusService.js` and `CityProductionService.js`; removed errant inner-loop bonus wipe in `BonusService.js`.
  - Replaced un-gated `console.debug()` calls with module loggers in `BonusService.js` and `CityProductionService.js`.
  - Cleaned up dead variables in `ownCityCard.js`.
  - Re-verified full test suite (661/661 passed) and executed `npm run release` to build WebStore zip and publish GitHub Release [v0.0.834](https://github.com/FoE-Info/FoE-Info-Extension/releases/tag/v0.0.834).
- **Release v0.0.833 and GitHub Release workflow (`02d776b`, tag `v0.0.833`)**:
  - Transitioned from ad-hoc local zip builds to formalized GitHub Releases using Option A (releasing and tagging directly on `development`).
  - Bumped version to `0.0.833` in [`package.json`](../package.json) and [`src/chrome/manifest.json`](../src/chrome/manifest.json).
  - Initialized [`CHANGELOG.md`](../CHANGELOG.md) following Keep a Changelog standards.
  - Added [`scripts/release.mjs`](../scripts/release.mjs) and npm runner `npm run release` to automate the 5-stage release pipeline (`npm run verify`, `npm run build`, zip artifact verification, git tagging, and `gh release create`).
  - Published GitHub Release [v0.0.833](https://github.com/FoE-Info/FoE-Info-Extension/releases/tag/v0.0.833) with compiled distribution bundle `build/FoE-Info_WEBSTORE_0.0.833_2026-09-11.zip` attached. Pushed `development` and tags to remote origin.
- **GBG combat verification & live bug fixes (`bbd25b9`)**:
  - **Live Observation via CDP**: Monitored active GBG combat on `en7` through Chrome DevTools Protocol port 9222 using real-time DOM mutation observers.
  - **Rushed Siege Camps Reconciliation**: Discovered that when camps were diamond-rushed on the map, the game server broadcasts `gainAttritionChance: 20` on the target province without pushing updated building entities to other players. In [`GbgCalculator.js`](../src/js/calc/GbgCalculator.js) and `GbgCalculator.ts`, reconciled `options.gainAttritionChance`: whenever the server's authoritative reduction exceeds local `campsReady`, the difference is promoted from `campsNotReady` to `campsReady`. Fixed sectors erroneously showing stale `(40% / 20% UC)` when they are already completed `(20%)`.
  - **Instant Conquest Signal Removal (`getAction`)**: Discovered InnoGames broadcasts real-time WebSocket push `GuildBattlegroundService.getAction` (`action: "province_conquered"`, `provinceId`) the instant a sector falls. FoE-Info previously lacked an `getAction` registration, causing a ~50-second lag before conquered sectors dropped off the target generator. In [`legacyBridge.js`](../src/js/protocol/legacyBridge.js), wired `getAction` (`province_conquered`) directly to `handleRemoveSignal`. Conquered sectors now disappear instantly.
  - **GBG Panel Sizing**: Set default restricted height to 400px in [`globals.js`](../src/js/fn/globals.js) and [`helper.js`](../src/js/fn/helper.js); added `.gbg-changes-full` with `height: auto !important` in [`custom.scss`](../src/css/custom.scss) for "show changes only" mode, eliminating cramped panel startup.
  - **Verification**: 4 new unit tests added (624 tests total, all passing); verified live hot-reloaded panel on active targets without disrupting game canvas.
- **Graph pipeline extension for LoW-Tool and FoE-Info-original (`b3e2875`)**:
  - Created `graph-foe-info-original-update.sh` and `graph-foe-info-original-reindex.sh` scripts mirroring the existing forge-hammer pattern for the frozen v1 baseline at `../FoE-Info-Extension-original` (commit `8c681d1`).
  - Created `graph-low-tool-update.sh` and `graph-low-tool-reindex.sh` scripts for the original closed-source implementation at `../LoW-Tool`.
  - Added npm scripts: `graph:low-tool:{update,reindex,export}`, `graph:foe-info-original:{update,reindex,export}`.
  - Repointed `graphify-foe-info-original` MCP server args from the missing in-repo path (`graphify-out/foe-info-original/graph.json`) to the sibling repo (`../FoE-Info-Extension-original/graphify-out/graph.json`).
  - Added 6th MCP server `graphify-low-tool` (args `../LoW-Tool/graphify-out/graph.json`) with full env block in both `.agents/mcp_config.json` and `opencode.json`.
  - Fixed sibling-repo path bug in all 4 new scripts **and** existing `graph-forge-hammer-{update,reindex}.sh` — default `FORGE_HAMMER_DIR` resolved to `<workspace>/forge-hammer` instead of `../forge-hammer`.
  - Created `graphify-out/low-tool/findings/` and `graphify-out/foe-info-original/findings/` directories for subagent findings.
  - Added `graphify-out/` to both sibling repo `.gitignore` files.
- **5 new subagents created** (36 total, up from 31):
  - `low-tool-comparator`, `foe-info-original-comparator` — compare vs FoE-Info (findings saved to `graphify-out/{low-tool,foe-info-original}/findings/`).
  - `forge-hammer-kg-explorer`, `low-tool-kg-explorer`, `foe-info-original-kg-explorer` — standalone explorers, treat the peer graph as their own project (no comparisons; findings saved to matching `graphify-out/<peer>/findings/`).
  - All have canonical `.agents/agents/*.md` and thin `.opencode/agents/*.md` shims.
- **Ecosystem count updates**:
  - 31→36 subagents, 5→6 MCP servers, 51→53 skills in AGENTS.md, `.agents/rules/graphify.md`, `.agents/rules/workspace-structure.md`, `antigravity-interop` skill, `.opencode/instructions/guardrail.md`, `pre-invocation-reminder.mjs`, `docs/STATUS.md`, `docs/COORDINATION.md`, `docs/OPENCODE.md`, `tests/agents/agent-config.test.mjs`.
  - Antigravity FoE-Info project grants: +10 `mcp(graphify-low-tool/*)`, 79 total, 0 bare MCP wildcards.
  - `graphify-guard` `GRAPHIFY_QUERY_TOOLS` regex and MCP prompt message updated with `low-tool` in both harnesses.
- **Graph generation status**: Completed 2026-09-11 via `npm run graph:low-tool:reindex` and `npm run graph:foe-info-original:reindex`; both `../LoW-Tool/graphify-out/graph.json` and `../FoE-Info-Extension-original/graphify-out/graph.json` are generated and available for MCP queries.

## Resume safely

Read `AGENTS.md` and [opencode coexistence](OPENCODE.md). Inspect `git status` before editing. The takeover is committed in logical chunks on `development`; it has been pushed. Three pre-existing `docs/antigravity_prompt_*.md` files are user workspace artifacts and remain untouched.

The previous handoff at `cec0ded:docs/HANDOFF.md` is retained in Git history for historical debugging context. Its completion labels and next-step instructions were not reliable. This document supersedes them.

## Current follow-ups (uncommitted)

- **Graph generation completed 2026-09-11** for LoW-Tool and FoE-Info-original (`npm run graph:low-tool:reindex`, `npm run graph:foe-info-original:reindex`); both `graphify-out/graph.json` files are generated and queryable via MCP. The reindex scripts now source `.env` and use the DeepSeek backend when `DEEPSEEK_API_KEY`/`GRAPHIFY_BACKEND=deepseek` is set, falling back to local `llama-swap` otherwise; the stale "auto-start llama-swap always" note no longer applies.
- **QI implementation Slice 1 (next up)**: add `src/js/protocol/routes/guildRaidsRoutes.js`, `src/js/state/quantumState.js`, and the `GuildRaids*Service.js` CJS parsers using `tests/fixtures/rpc/har/qi/`. See [`plans/2026-09-12-quantum-incursions-architecture.md`](plans/2026-09-12-quantum-incursions-architecture.md).
- Debug lookup fixes reduced MetadataStore messages from 170,669 to 258 across the measured cold capture; the first loop dropped from 119,227 to 102. Last-render completion was 4.01 seconds versus the earlier 18.73-second Debug Mode run.
- Painted-frame verification confirmed the old Daily Units 147-to-3299 flash. The shared resolver barrier removed that post-spinner intermediate value in the fixed capture.
- Graphify uses the shared local launcher; routine AST output is logged. See [local Graphify execution](graphify-local.md).
- Graphify graph synchronization and query-first enforcement have live evidence. See [opencode coexistence](OPENCODE.md) for the current host behavior.
- The ecosystem accuracy audit is archived; see [its change ledger](archive/agent-ecosystem-audit.md).

## Takeover changes and subsequent corrections

- Central service registration owns initialization. Individual service modules no longer self-register. Repeated registry initialization is idempotent per dispatcher; identical callbacks on the same route are deduplicated while distinct legacy and modern handlers are retained.
- Failed metadata requests can be retried on a later resolver invocation. Concurrent callers share pending downloads and each receive completion; only successful ingestion is cached as fetched. There is no automatic unbounded retry loop.
- The current startup barrier retains its spinner while the aggregate metadata resolver is pending. The three-second threshold now warns; it does not render early. Resolver failure or settlement without updates releases to the fallback. This supersedes the original takeover timeout behavior.
- Live goods detail and total rendering use supplied values. SAD/SASH/SAT fixed-value substitutions, SAJM suppression, and the guild-total substitution were removed. Existing boost and BigNumber rounding formulas were preserved.
- Routine logger info/debug output requires Debug Mode. Warnings/errors remain local in the DevTools panel console in Standard Mode and expand in Debug Mode. Content-bridge timing uses persisted debug state. Other legacy direct console calls remain to be audited.
- The CDP inspector requires confirmed subscriptions and reports connection failures, rejected subscriptions, exceptions, and warnings with a nonzero exit. Its native WebSocket fallback now uses the correct event API.
- LLM lifecycle tests use command fixtures instead of contacting the real server. Lint/format exclude worktrees; existing prompt documents are excluded from formatting without modifying their contents. The Node requirement is now 24 or later.
- `.opencode/` supplies the host-specific registration and hook plugins on top of the shared `.agents/` launcher. Hook trust and current enforcement limitations are documented in `OPENCODE.md`.

The implementation is recorded in Git history on `development`.

## Verification

Focused regression tests were observed failing before each runtime fix and passing afterward. Integration verification passed: formatting, lint (0 errors, 204 existing warnings), translation parity, 550 tests at the time of writing (591 as of 2026-09-09), and development build. `npm run typecheck` passed separately.

The root development extension was reloaded through `foe-browser --reload-ext`, followed by game login. A direct FoE `panel.html` CDP session confirmed City Info content, no metadata spinner, and 244 received RPC messages; a three-second inspector session captured zero panel warnings/errors. This is a smoke test, not validation of every game feature or slow-network recovery.

Follow-up reload timings on 2026-09-08, with Debug Mode off:

| Reload                 | Fresh startup RPC received |  First fresh City Info render | Last observed replacement |
| ---------------------- | -------------------------: | ----------------------------: | ------------------------: |
| Normal cache           |                    2.713 s |    2.962 s (root replacement) |                   4.615 s |
| Browser cache bypassed |                    2.588 s | 2.826 s (full card confirmed) |                   4.452 s |

Times are measured from sending the game-tab CDP reload command. Both fresh startup payloads contained 447 entities; the previous City Info DOM node was disconnected before counting the new render. The second run also confirmed the current copy button and no spinner. No runtime exceptions or log warnings were captured, and the final three-second panel inspector passed. Temporary observation instrumentation was removed; Debug Mode remained off.

These were authenticated game reloads with an already-running extension and warm in-memory metadata. Browser cache bypass does not clear the extension's metadata. They do not reproduce the reported 22-second delay on this path, but do not establish cold logout/login timing, final calculated-value correctness, or slow-network recovery.

MCP initialization and tools/list succeeded for Chrome DevTools and all five Graphify servers (6 MCP servers total). After the user's trust review and restart, the tools were exposed in the session and live browser/host-graph queries succeeded. The opencode hook plugins were exercised; see `OPENCODE.md` for the remaining host-specific differences.

## Architecture and remaining decomposition

The runtime pipeline is main-world XHR interception / DevTools network capture → dispatcher → services → state and metadata → calculators → UI. `MetadataStore` retains compatibility proxies for legacy consumers; mixed CommonJS/ESM modules are bundled by Webpack.

The extracted `gbgProvinceView.js`, `gbOverviewCard.js`, and `panelDispatcher.js` already exist and are used. Do not repeat Briefs 12–14 based on stale plan checkboxes.

Oversized modules at the takeover baseline:

| File                                     | Lines |
| ---------------------------------------- | ----: |
| `src/js/msg/StartupService.js`           | 1,432 |
| `src/js/index.js`                        | 1,078 |
| `src/js/fn/helper.js`                    |   710 |
| `src/js/msg/GuildBattlegroundService.js` |   656 |
| `src/js/protocol/legacyBridge.js`        |   629 |

These are remaining architecture debt, not evidence that previous extractions never happened. Continue in bounded slices, without adding inline feature logic to `index.js` or `StartupService.js`.

## Decisions and corrections to old instructions

### Workspace identity

`.agents/project.json` is the canonical workspace identity anchor (`name`, `displayName`, `primaryGraph`), restored after its brief removal in `e61503f`. `package.json` mirrors those fields for npm/build tooling. `tests/agents/agent-config.test.mjs` verifies the file's presence and schema.

### Arithmetic

The active `.agents/rules/bignumber-precision.md` defines a deliberate rounding hybrid: `ROUND_HALF_UP` for Arc rewards and suggested donations, `ROUND_CEIL` for spot locks, owner-safe-adds, and safe-spots. The reviewer role now defers to the rule and validated calculation tests. No Arc or investment calculation formula was changed in this takeover. Validate operation-specific game examples before any future change; do not apply historical blanket single-mode rounding instructions.

### Goods substitutions

Commit `eccddbe` removed the original renderer substitutions; `3c89c8a` reintroduced and expanded them without supporting metadata, and `f90d531` extracted them unchanged. They changed arbitrary matching live quantities rather than deriving results from game data. The current regressions cover both detail and aggregate rendering with changing runtime values.

### Browser inspection

The old statement that DevTools panels cannot be inspected through CDP was too broad. Availability depends on exposed targets and frames. Use `npm run inspect:panel` and verify connection/subscription success. If panel targets are unavailable, inspect the DevTools target/frame context; report the actual limitation rather than claiming the panel was tested.

## Preserve these existing fixes

- `MetadataStore.registerEntity` avoids unchanged registrations. The proxy set trap only registers canonical IDs; alias writes retain the existing multi-key lookup behavior. Do not remove those alias writes or the canonical-ID guard.
- Startup rendering delegates to `scheduleStartupRender`; do not restore an unconditional early render.
- GBG renders in its dedicated battleground containers, not Great Buildings' `#donation` container.
- Legacy GvG removal was deliberate; do not reintroduce its dead panels.
- Runtime game metadata stays network-driven. `../metadata-store/` is offline development/test input, never a runtime bundle dependency.

## Remaining product work

1. If investigating remaining startup latency, use the existing scripted fresh server-entry flow, preserving account authentication. Cold Standard Mode previously reached its last render at 5.49 seconds; the logging fix reached 4.01 seconds in Debug Mode. Do not confuse those final-render endpoints with the historical 2.8–3.0-second first-render measurements or the user-reported 22 seconds.
2. Timing instrumentation now exists for P1–P6 across bootstrap, content bridge, network listener, and startup/resolution paths. Check current source and capture availability before adding duplicate tags. Persisted debug state is loaded asynchronously; earliest startup events may not be logged.
3. Validate slow/failed metadata recovery in the real panel, including recomputed FP and goods totals. Unit tests cover lifecycle behavior, not a full live gameplay scenario.
4. Confirm desired Galaxy debug behavior before changing it: current debug mode shows the full candidate set and can display the panel with no charges; standard mode filters readiness/charges. This takeover did not change that behavior.
5. Investigate the reported Town Hall long list, missing collapse control, and height/scroll behavior in the actual render path. It has not been established as fixed.
6. Reconcile the UI/RPC punch-list against source and existing tests before execution. Several named tasks already have implementations/tests; unchecked boxes do not prove they are unstarted.
7. Re-scope the StartupService decomposition roadmap against actual remaining responsibilities. Settlement/quest/inventory/castle services already exist; their existence alone does not establish all old responsibilities have migrated.

Relevant historical plans:

- [UI/RPC/metadata punch-list](archive/plans/2026-09-08-ui-rpc-and-metadata-fixes.md)
- [Modernization Briefs 12–14](archive/plans/2026-09-08-modernization-briefs-12-14.md)
- [Decomposition and debuggability roadmap](archive/plans/2026-09-08-monolith-decomposition-and-debuggability-roadmap.md)

Plans/specs live in `docs/plans/` and `docs/specs/`; the coordination hub is
`docs/README.md` and the live work/todo board is `docs/STATUS.md`.

Run `npm run verify` and `npm run typecheck` on the integrated checkout. TypeScript has `checkJs: false`; translation parity proves matching keys, not translation quality. Distinguish runtime observations, source findings, and unverified assumptions when updating this handoff.

## GB donation math: Costs/Reward/Lock model (2026-09-08, commit 9388525)

The GB donation panels previously conflated three distinct quantities into a single "safe spot" number, producing wrong Profit/Loss figures once a viewer's own Arc bonus diverged from the guild's standard donation percent. `GreatBuildingCalculator.js` now exposes them separately:

- **Costs** (`calculateSuggestedDonation(baseReward, standardPercent)`): the guild-convention donation amount at the configured standard (e.g. 190%). Unchanged, was always correct.
- **Lock / spotLock** (`calculateSpotLock(remaining, spotInvested)` = `ceil((remaining + spotInvested) / 2)`): the worst-case FP a potential donor must add to make a place mathematically unsnipeable. Independent of any Arc bonus or standard percent.
- **Donor Reward** (`calculateArcReward(baseReward, viewerArcPercent)`): what the _viewing_ account would receive at its own known Arc bonus, not the existing holder's.
- **Headline Profit** = Donor Reward − Costs (not minus Lock). `calculateDonorOutcome(remaining, spotInvested, baseReward, arcBonusPercent, standardPercent)` returns `{ spotLock, costs, donorReward, donorProfit, guaranteedProfit }`, where `guaranteedProfit = spotLock <= costs` (true when the building owner has over-funded their own place, meaning even the fully-safe lock threshold is cheaper than the guild-standard cost — a stronger "risk-free" case worth visually distinguishing from ordinary profit).

Root causes fixed: (1) `calculateSafeSpots()` wasn't threading a sequential `remaining` value across P1–P5 the way Forge-Hammer's reference algorithm does; (2) it compared against the wrong quantity (owner's personal Arc reward instead of the community-standard donation amount) when deciding if a spot was already safe. Both confirmed against Forge-Hammer's live `part-calc.js` source and multiple real in-game examples (Stellar Warship P3, Blue Galaxy row 4, Statue of Zeus at 180%/190% standard) — all now match exactly, including the case that had read as a false "profit" being an actual loss under the old Reward-minus-Lock formula.

UI: three-way color coding (green = profit, yellow/neutral = break-even, red = loss) plus a "Guaranteed profit" note when `guaranteedProfit` is true. The donation-loop card headers in `GreatBuildingsService.js` no longer attribute a place to a player name (the loop iterates P1–P5 as the _viewer's_ potential-donor outcome at each rank, not a specific current holder's identity — the old code was mislabeling the building owner as sitting in P1). All 575 tests pass at the time of writing (591 as of 2026-09-09); `npm run verify`/`typecheck` should still be run before the Chrome Web Store release, but the math itself is verified release-ready.

## Guild thread donation ratio parsing (Implemented & Verified)

Implemented in `src/js/fn/rateParser.js` (`extractRateFromTitle`) and wired into `src/js/msg/ConversationService.js` (`getConversation` → `getPercent` → `setCurrentPercent`), overriding the configured "Donation %" default when a guild message thread title carries an embedded ratio in the 1.00–2.50 (100%–250%) range (e.g. `LoW BE All GBs [secure @ 1.92]`, `1.9 Secure`, `2.0 All Levels`). Verified in `tests/protocol/domain-services.test.mjs`. Fallback to static Options default remains when no valid ratio or thread title is present.
