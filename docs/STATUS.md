# FoE-Info Extension — Live Work & Todos

Shared status board for all agents. **Update this file in the same change that
changes the underlying work** — this is the current-status source of truth, not
a changelog. See `docs/README.md` for the full hub.

> Standing constraint from `docs/COORDINATION.md`: no commit/push without the
> user's explicit approval; investigate-and-report before fixing; one verified
> change at a time.

## In progress

| GreatBuildingsService Decomposition (Antigravity) | In Progress | Extracting `showGreatBuldingDonation()` and table loop into `src/js/ui/renderGbDonationPanel.js`. Target: 736 -> <= 450 lines (<= 600 ceiling). Worktree: `.worktrees/antigravity-gb-donation`. |
| GuildBattlegroundService Decomposition (OpenCode) | Done (unmerged worktree) | Extracted `getState(msg)` Battleground Result card into `src/js/ui/renderBattlegroundResultCard.js` (217 lines) with `createLogger('GbgResultCard')`; `getState` resolves the target container, delegates rendering, and pushes `BattlegroundPerformance` via the `onRow` callback. Service 1032 -> 980 lines. Added `tests/ui/render-battleground-result-card.test.mjs` (6 tests); updated source-coupled assertions in `guild-battleground-signals` and `panel-resize-and-visibility`. Worktree verification green: 745/745 tests, prettier clean, lint 0 errors, dev build compiles. `<= 850` target not reached by this single slice; uncommitted pending final gate. Worktree: `.worktrees/opencode-gbg-result`. |
| Monolith Decomposition Phase B (Antigravity) | Done | Extracted `EmissaryService.js`, `gbNaming.js`, `StartupBoostCoordinator.js`, and `cityStatsHtmlBuilder.js` from `StartupService.js`; dropped line count from 804 to 600 lines (<= 600 hard ceiling satisfied). Full verification gate green (739/739 tests). |
| Era Mapping Extraction (OpenCode) | Done | Extracted `fLevelfromAge`, `fAgefromLevel`, `fGVGagesname`/`fEraAbbreviation`, and `numAges` from `helper.js` into pure `src/js/calc/eraMapping.js` (Map lookups), re-exported from `helper.js` for full backward compatibility; `helper.js` 758 -> 592 lines. Added `tests/calc/era-mapping.test.mjs` (11 tests) and verified 1:1 behavioral parity against the pre-extraction source. Verification gate green (739/739). |
| Town Hall / Beta Debug Panel (OpenCode) | Done | Removed inline `max-height`/`overflow` overrides and the dual collapse listener from `betaDebugPanel.js`; Bootstrap now solely owns the collapse while icon state syncs from `hidden/shown.bs.collapse`. Bound height persistence to `beta:height` (250px default) via `bindResizableCollapse`. Added `tests/ui/beta-debug-panel.test.mjs`; verification gate green (716/716). |
| Codebase audit quick fixes | Done | Implemented verified quick fixes from multi-agent audit: `RewardRenderer.js` and `BonusService.js` collapse label and icon event binding parity, `AddElement.js` duplicate global keydown listener guard (`_foeA11yBound`), `CityProductionService.js` defensive property and state guarding, `ConversationService.js` numeric Unix epoch timestamp formatting via `dateUtils.formatTime`, `renderGbInfoPanel.js` dead code cleanup, and `gbDonationTables.js` copy ID deduplication. |
| Context View Filtering & 15-Panel Layout | Done | Implemented dynamic context view filtering in `cardVisibility.js` (GBG map view restricts to 6 combat panels, City view hides GBG panels, debug mode forces all 15 panels visible with debug placeholder stubs), created standalone `renderIncidentsPanel.js` decoupled from Harvest, created `renderHeaderPanel.js` integrating Player Points and City Boosts (Arc, CF, Coins, Supplies), normalized player score in `accountParser.js` + `StartupService.js`, and established strict 15-panel vertical mounting hierarchy in `containerBinding.js`. |
| DevTools teardown delay | Done | Eliminated 1.7–2.5s freeze when closing DevTools; guarded flushCityEntityDefs to only run when dirty, stripped 30MB unmodified metadata writes (AllyDefs, BuildingEntityLookup) on unload, and cleaned up panelWindow references in devtools.js on panel.onHidden/unload (`39e3b10`). |
| Own-city GB cache registration | Done | Fixed own-city Great Building lookup miss and foreign GB sticking when opening own GB by clicking inside city; registered city map Great Building entities in `GreatBuildingRegistry` and handled player ID fallback in `legacyBridge.js`. |
| GB and GBG panel display order | Done | Enforced panel order for Great Buildings (1. GB Donation, 2. GB Info, 3. GB Contributors) and GBG (1. Target Generator, 2. Battlegrounds Changes, 3. GBG Leaderboard, 4. rest) in `containerBinding.js` and `GreatBuildingsService.js`. |
| Custom panel resize retention | Done | Created `panelResize.js` (`bindResizableCollapse`) preventing panels from expanding to full content size on collapse/expand; removed `max-height: max-content !important` from `.resize`; preserved user drag size in world storage across collapse toggles for Army, Goods, and Treasury panels. |
| Army panel sizing & persistence | Done | Calibrated default Army Panel height to 185px (`#armyText`, outer card 229px) across `globals.js`, `factoryDefaults.js`, and `ArmyUnitManagementService.js`. Added `.collapsing` and `!show` guards to `ResizeObserver` preventing animation frames from corrupting stored height; verified per-world storage persistence (`3b167a3` + update). |
| Battlegrounds collapse performance | Done | Fixed lag/freeze on Battlegrounds panel collapse: scoped `min-height: 250px` to `.gbg-full-roster.show` and disabled collapse transitions on `.collapsing` in `custom.scss` to eliminate frame-by-frame 350ms table reflow; added observer guards in `helper.js`. |
| Lists Copy button alignment | Done | Fixed Friends, Guild, and Hood player lists Copy buttons overlapping container borders; replaced absolute offset with flex header rows (`d-flex flex-row justify-content-between align-items-center mb-0`) in `OtherPlayerService.js` and updated `collapse.js`. |
| GE Championship server alignment | Done | Left-aligned Server column header and cell text (`text-start`) in `expeditionTables.js` and `custom.scss` (`#geChampionshipTable`). |
| GE Leaderboard styling parity | Done | Styled GE Leaderboard (`#geContributionTable`) to match GBG Leaderboard: `.goods-table` table styling, text-start for members, text-center for trial, and centered formatted numbers with `tabular-nums`. |
| Panel layout ordering | Done | Organized DevTools `#content` container into a clean 5-group player workflow in `containerBinding.js` (City -> Military -> Great Buildings -> Guild Activities -> Social/System). |
| Table header capitalization | Done | Capitalized `Type` and `Amount` across all 7 language dictionaries in `src/i18n/` for Goods Inventory and Guild Treasury consistency. |
| Goods & Treasury table alignment | Done | Removed artificial `ps-3` indentation from item cells in `ResourceService.js`, `panelDispatcher.js`, and `OutpostService.js`, aligning goods and resource rows flush with table headers and era titles (`5608b43`). |
| Own City Info card non-dismissible | Done | Preserved player's own City Info overview as permanently visible by removing close button and `alert-dismissible` from `ownCityCard.js` and `renderCityStats.js` (`5c2dbf1`). |
| GB donation place headers | Done | Reverted GB donation place titles to classic "1st Place", "2nd Place" etc. by removing accidental `(${donorArcPercent}% Arc)` suffix (`53b89c0`). |
| Universal panel collapsibility & controls | Done | Made all panels collapsible on title click with `[-]`/`[+]` toggles and close buttons. Created dedicated "Other Player Information" header with player link on line 1 (`c1c8a00`). |
| GB closed panels reopen fix | Done | Retained `#greatbuilding`, `#gbInfo`, `#donation2` containers in DOM upon close so opening subsequent Great Buildings re-mounts and displays them properly (`fbe4b4a`). |
| CF Bonus line placement | Done | Positioned Chateau Frontenac (CF) bonus on its own line directly under Arc bonus in `ownCityCard.js` and `visitedCityCard.js` (`b19c2eb`). |
| Options page instant render | Done | Eliminated blank delay and unpopulated FOUC in options.html; populated form synchronously from storage; moved tab discovery to non-blocking background; added unit test. |
| Release v0.0.835 | Done | Context-aware view filtering (GBG 6-panel mode, City view, Debug mode override with stubs), standalone Incidents extraction, 15-panel stacking hierarchy, player score normalization, and audit quick fixes (`RewardRenderer`, `BonusService`, `AddElement`, `CityProductionService`, `ConversationService`, `renderGbInfoPanel`, `gbDonationTables`). Verification gate passed (683/683 tests), WebStore zip built, GitHub Release published. |
| Release v0.0.834 | Done | Codebase audit fixes (detached DOM nodes, tooltip IDs, card visibility, popover listeners, RPC guards, BigNumber edge cases), verification gate passed (661/661 tests), WebStore zip built, git tag v0.0.834 pushed, GitHub Release published. |
| Release v0.0.833 | Done | Bumped version to 0.0.833, created CHANGELOG.md, added scripts/release.mjs, built WebStore zip, created git tag v0.0.833. |
| GBG UC & rushed camps | Done | Formatted UC camps as `(60% / 20% UC)`. Reconciled server `gainAttritionChance` in `GbgCalculator.js` so rushed camps promote to ready immediately rather than showing stale UC (`bbd25b9`). |
| GBG instant conquest signals | Done | Registered `GuildBattlegroundService.getAction` (`province_conquered`) in `legacyBridge.js`; conquered sectors clear from target generator instantly via WebSocket push instead of ~50s poll lag (`bbd25b9`). |
| GBG panel sizing & initial height | Done | Adapted GBG panel sizing: default restricted height increased to 400px; changes-only mode sets `height: auto` (`.gbg-changes-full`), preventing panel starting off cramped (`bbd25b9`). |
| Passive network interception | Done | Restored `xhrInterceptor.js` to 100% passive observation; removed out-of-band active POST RPC fetches that interfered with player's live session and message threads. |
| Custom targets topic matching | Done | Dynamically resolves custom target topic from options/state in `ConversationService.js` with fallback to `targets` / `🎯` without active background querying. |
| Teaser payload shapes support | Done | Supported all teaser payload shapes (array items with text or flat objects) in `ConversationService.js` (`c3756e5`). |
| Content bridge role confirmed | Done | Verified `contentBridge.js` is essential MV3 network transport; confirmed Claude log mirroring was already removed in `981180d`. |
| Restore using-superpowers skill | Done | Recreated `.agents/skills/using-superpowers/SKILL.md` + references for `/using-superpowers` slash command (53 skills total, verified 40/40 agent tests). |
| Protocol paths & webpack proxy | Done | Relocated `xhrInterceptor.js` and `contentBridge.js` directly to `src/js/protocol/`; created root `webpack.config.js` proxy. |
| GE panels rename & color | Done | Renamed Championship/Contributions to GE Championship and GE Leaderboard; updated i18n, options, and inherited alert-info font color on table elements (verified 602/602 tests). |
| GB donation panel refresh | Done | Fixed real-time progress update on FP donation (`GbDonationService.updateContributionProgress` + `CityMapService.updateEntity` sync); live browser verified on en7 Zeus 2026-09-11. |
| Codex/Claude residue removal | Done | 3 codex worktrees deleted; `codex-sync.log` deleted; no `codex/*` branch refs remain (`git branch -a` clean as of 2026-09-11). Historical decommission mentions in docs intentionally retained. |
| Safety-gate branch-delete policy | Done | `.agents/scripts/safety-gate.mjs` now blocks deleting `development` only (local + remote); all other branch deletes allowed. Tested 21/21. |
| Docs consolidation | Done | Created `docs/README.md` hub + this board; plans/specs migrated to `docs/plans/` + `docs/specs/`; AGENTS.md/COORDINATION.md/OPENCODE.md/HANDOFF.md all reference the hub. |
| `.opencode/` lockfile | Done | `.opencode/package-lock.json` tracked in `089e655`. |
| Verification gate | Done | `npm run verify` exit 0 confirmed 2026-09-11 (624/624 tests, prettier clean, lint 0 errors, dev build compiles). Reproof after any new change. |
| Graph pipeline extension | Done | Scripts + npm runners + MCP servers for `graphify-low-tool` and `graphify-foe-info-original` (sibling repos); repointed original graph; fixed forge-hammer sibling path bug; added `graphify-out/` gitignore in both sibling repos. |
| 5 new graph subagents | Done | `low-tool-comparator`, `foe-info-original-comparator`, `forge-hammer-kg-explorer`, `low-tool-kg-explorer`, `foe-info-original-kg-explorer` (canonical + opencode shims). 36 subagents total (`b3e2875`). |
| Ecosystem count sync | Done | AGENTS.md, graphify rule, antigravity-interop skill, guardrail, utils, docs (`STATUS`/`COORDINATION`/`OPENCODE`/`HANDOFF`) and agent-config tests updated to 36 subagents / 6 MCP servers / 53 skills. +10 `mcp(graphify-low-tool/*)` Antigravity grants. |
| Chrome types & hybrid TS config | Done | Installed `@types/chrome` (^0.2.9) in devDependencies, configured `tsconfig.json` for gradual adoption (`allowJs`, `checkJs: false`, `strict: false`, chrome/webextension-polyfill/node types), scoped Chrome extension globals (`globals.browser/chrome/webextensions`) to `src/**/*.{js,mjs,cjs}` in `eslint.config.mjs`; `npx tsc --noEmit` clean (`a5c5b96`, merged `9e63acb`). |
| UI visibility/dispatcher TS mirrors | Done | Added typed `src/js/ui/cardVisibility.ts` (`ViewState`, `PanelId` union for all 15 panels, `ShowOptionsState`) and `src/js/ui/panelDispatcher.ts` (containers, treasury deps) mirroring the `.js` runtimes 1:1; verified jQuery-free (vanilla DOM only); `.js` callers and tests untouched; `tsc --noEmit` clean and full `npm run verify` green (`ceef68d`, merged `d7dd28d`, 704/704 tests). |

## Todos

- [x] GBG Target pruning on sector conquest by any guild (`GuildBattlegroundService.js`)
- [x] Restore pure passive observation in `xhrInterceptor.js`, eliminating active out-of-band POST RPC requests
- [x] Support multiple teaser payload shapes in `ConversationService.js` (`c3756e5`)
- [x] Confirm `contentBridge.js` architecture and historical Claude logger removal (`981180d`)
- [x] Restore `using-superpowers` skill for `/using-superpowers` slash command (53 skills total)
- [x] Relocate `xhrInterceptor.js` and `contentBridge.js` directly to `src/js/protocol/`
- [x] Add root `webpack.config.js` proxy for default tooling compatibility
- [x] Fix GB donation panel double-count on donate (`6df53f3`, unpushed; live spot-check pending)
- [x] Delete codex worktrees + `codex-sync.log` (2026-09-10)
- [x] Delete remaining `codex/*` branch refs (confirmed gone 2026-09-11)
- [x] Relax safety-gate branch-delete block (allow non-`development` local/remote deletes)
- [x] Migrate `docs/superpowers/plans` → `docs/plans/` (9 files)
- [x] Migrate `docs/superpowers/specs` → `docs/specs/`
- [x] Create `docs/README.md` coordination hub + `docs/STATUS.md` live board
- [x] Update `AGENTS.md`, `HANDOFF.md`, `OPENCODE.md`, `COORDINATION.md` pointers to the hub + new plan paths
- [x] Commit `.opencode/package-lock.json` (`089e655`)
- [x] Run `npm run verify` + graphify AST sync after consolidation completes (2026-09-11)
- [x] Push `development` (`6df53f3` + `5dae931`) to `origin/development` (2026-09-11)
- [x] Live browser spot-check: own GB donate → card refreshes without reopening (verified on en7 Zeus 2026-09-11)
- [x] Position Chateau Frontenac (CF) bonus on its own line under Arc bonus in City Overview (`b19c2eb`)
- [x] Fix GB closed panels (GB info, contributors, donation) to reappear upon opening Great Buildings (`fbe4b4a`)
- [x] Make all panels collapsible on title click with `[-]`/`[+]` icons and close buttons; "Other Player Information" header separation (`c1c8a00`)
- [x] Revert GB donation place headers to classic "1st Place", "2nd Place" (removed Arc bonus suffix) (`53b89c0`)
- [x] Keep player's own City Info overview non-dismissible without close button (`5c2dbf1`)
- [x] Align Goods Inventory, Guild Treasury, and Cultural Outpost tables flush with headers (removed `ps-3`) (`5608b43`)
- [x] Calibrate Army Panel default height to 185px (`#armyText`, outer card 229px) and guard ResizeObserver against collapse animation (`3b167a3` + update)
- [x] Fix Battlegrounds panel collapse stutter/lag (min-height scoping + collapse transition suppression)
- [x] Fix Lists Copy button border overlap via flex header alignment (`OtherPlayerService.js`)
- [x] Left-align Server column in GE Championship table
- [x] Match GE Leaderboard styling to GBG Leaderboard with tabular-nums and number formatting
- [x] Organize `#content` panel order into clean 5-group workflow (`containerBinding.js`)
- [x] Capitalize `Type` and `Amount` across all 7 language dictionaries for Goods & Treasury tables
- [x] Fix own-city Great Building cache miss and foreign GB sticking (`GreatBuildingRegistry.js`, `legacyBridge.js`)
- [x] Enforce GB panel order (Donation -> Info -> Contributors) and GBG panel order (Target Generator -> Changes -> Leaderboard) (`containerBinding.js`, `GreatBuildingsService.js`)
- [x] Retain custom panel resize dimensions across collapse/expand and prevent full-height blowup (`panelResize.js`, `custom.scss`)
- [x] Generate `../LoW-Tool/graphify-out/graph.json` via `npm run graph:low-tool:reindex` (completed 2026-09-11)
- [x] Generate `../FoE-Info-Extension-original/graphify-out/graph.json` via `npm run graph:foe-info-original:reindex` (completed 2026-09-11)
- [x] Relocate `metadata-store` to sibling `../metadata-store` with graphify output suite (`graph.json`, `wiki/`, `obsidian/`, `svg`, `html`, `tree`)
- [x] Align `../forge-hammer` peer repository to minimal graph-only setup matching `LoW-Tool` and `FoE-Info-original` (removed unneeded `.agents/`, `AGENTS.md`, `tests/`, `package.json`)
- [x] Decouple 11 technical specialist personas (`javascript-expert`, `typescript-expert`, `webpack-expert`, etc.) to general domain experts
- [x] Comprehensive codebase audit across `src/js/msg/`, `src/js/calc/`, `src/js/ui/`, and `src/js/protocol/`
- [x] Implement non-breaking quick fixes (detached `#visit` DOM nodes, Colonial Age tooltip ID, `#citystats` card visibility, Popover listener leaks, RPC payload guards, BigNumber edge cases)
- [x] Monolith decomposition Phase A: Extract OutpostService.js (Cultural Settlements) and QuestService.js
- [x] Monolith decomposition Phase B: Extract EmissaryService.js from StartupService.js (Antigravity)
- [x] Town Hall / Beta Debug panel height & scroll behavior refactor (OpenCode, see docs/plans/2026-09-11-town-hall-beta-debug-panel.md)

## Recently completed threads

- **Metadata-Store Sibling Relocation** — RESOLVED. Moved `metadata-store` to
  `../metadata-store`, aligning symmetrically with `FoE-Info-Extension-original`,
  `LoW-Tool`, and `forge-hammer`. Graph exports (`wiki/`, `obsidian/`, `svg`, `tree`)
  and download scripts updated and verified.
- **Forge-Hammer Agent Cleanup** — RESOLVED. Removed internal `.agents/`,
  `AGENTS.md`, `tests/`, and `package.json` from `../forge-hammer`, retaining
  strictly graphify-out and `.gitignore` to match peer baseline standards.
- **General Specialist Decoupling** — RESOLVED. Restored 11 technical subagent
  personas (`javascript-expert`, `typescript-expert`, `webpack-expert`, etc.)
  to general domain expertise without FoE-Info-specific hardcoding.
- **Cold-login delay** — RESOLVED. Was Debug Mode's own logging overhead, not a
  real bug. Standard Mode cold entry ~5.49s; middleware subscriber removes the
  spinner ~100ms before resolver finish (not confirmed visible-wrong-data).
- **Graphify local backend** — RESOLVED. Shared launcher wires env vars into
  `graphify-*` MCP servers + `graphify watch`.
- **Persona-loading** — RESOLVED. `.agents/agents/*.md` are connected via
  manual/instruction-driven subagent delegation, not auto-loaded.
- **Full ecosystem audit** — verified 36 subagents / 17 rules / 53 skills;
  fixed 2 stale counts. Gaps: rules not auto-injected by trigger mode in hosts;
  hooks enforced by host adapters.
- **Hook parity** — `graphify-sync`, `graphify-guard`, `monolith-guardrail`
  built + live-verified; `stop-guard` logs a warning plugin (no `fullyIdle`
  equivalent).
- **opencode takeover** — RESOLVED. `opencode.json` (16 rules as instructions,
  6 MCP servers), 36 shims in `.opencode/agents/`, 4 hook plugins live-verified.
  Codex/Claude compatibility layer decommissioned 2026-09-09; opencode is the
  sole coding host.

## Open threads requiring a decision

- ~~`backup-development-2026-09-06` worktree~~ — Resolved: verified deleted; git worktree list clean, no active worktrees under `.worktrees/`.
- `graphify-out/foe-info/obsidian/` + `wiki/` markdown exports — git-ignored
  generated artifacts from the graphify knowledge graphs; retained locally.
- ~~Town Hall / Beta Debug panel height & scroll behavior (`betaDebugPanel.js`).~~ Resolved 2026-09-11: Bootstrap-owned collapse, inline overrides removed, `beta:height` persistence via `bindResizableCollapse`.
