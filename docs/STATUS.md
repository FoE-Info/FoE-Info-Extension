# FoE-Info Extension — Live Work & Todos

Shared status board for all agents. **Update this file in the same change that
changes the underlying work** — this is the current-status source of truth, not
a changelog. See `docs/README.md` for the full hub.

> Standing constraint from `AGENTS.md`: no commit/push without the
> user's explicit approval; investigate-and-report before fixing; one verified
> change at a time.

## Todos

- [x] Modern-web Tier 3 (Popovers & Tooltips): migrated `PopoverManager.js` to native HTML Popover API with CSS Anchor Positioning (`position-anchor`, `position-area: bottom span-all`) and smooth `@starting-style` transitions.
- [x] Modern-web Tier 3 (Collapses & Theming): migrated Bootstrap collapse to native CSS Grid 0fr/1fr transitions with lifecycle event dispatching and height preservation (`.foe-resizable` support). Evaluated Bootstrap 5.3 `[data-bs-theme]` and rejected it to preserve FoE-Info's signature dark backdrop with pastel alert card palette.
- [x] Theme Parity & Light/Dark Support: Implemented ThemeManager module with auto/light/dark preferences, preserved signature pastel alert card palette across themes (restored .alert-purple for GB info, removed card-level dark overrides), options page theme selector, full 7-locale i18n parity, and dynamic storage synchronization.
- [x] Modern-web Tier 3: Built-in AI & WebMCP enhancements evaluated and rejected per user directive (unwanted dependency/overhead; extension remains 100% deterministic & local).
- [x] 500-Line Ratchet & Modular Decomposition: 100% complete! Cluster 1 (Slices 1A-1C) and Cluster 2 (Slices 2A-2C) finished. All 110+ JS files in src/js/ are strictly <= 500 lines (max 497 L). Hard cap officially ratcheted from 600 to 500 lines across AGENTS.md and .agents/rules/modular-architecture.md.
- [x] Modern-web deferred items (MessageDispatcher Parse Yielding): Implemented cooperative parse yielding via `scheduler.yield()` / setTimeout fallback for large JSON bodies, decode stages, and requestPayload correlation.
- [x] Historical Plans in docs/plans/: All 19 completed implementation plans verified, closed, and purged.
- [x] Modern-web deferred items: Implemented `content-visibility: auto` with `contain-intrinsic-size: auto 28px` on dense table rows (`.goods-table`, `.gbg-table`, `#friendsText2`, `#guildText2`, `#hoodText2`) and completed 100% accessible table semantics (visually-hidden `<caption>` and `<th scope="col">` across GBG building costs and social lists).
- [x] Codebase Modernization Milestone 1 (Slice 1A): Decomposed `entityProductionParser.js` (497L -> 202L) by extracting `productionResourceAccumulator.js` (211L) and `entityMetadataProductionParser.js` (208L), maintaining $\le 250$ line budget, BigNumber precision, structured debug logging, and 100% test parity.
- [x] Codebase Modernization Milestone 1 (Slice 2A): Decomposed `GuildBattlegroundService.js` (489L -> 240L) by extracting `GbgTimeFormatter.js` (141L), `GbgLeaderboardHandler.js` (248L), and `GbgMapUtils.js` (111L), maintaining $\le 250$ line budget across all files, backward-compatible exports, structured debug logging, and unit tests for each extracted component.
- [x] Codebase Modernization Milestone 1 (Slice 2B): Decomposed `StartupService.js` (424L -> 246L) by extracting `StartupStateInitializer.js` (243L) and `StartupEntityCoordinator.js` (242L), maintaining $\le 250$ line budget across all modules, structured debug logging, and 100% test parity with new unit test suites.

## Open threads requiring a decision

- `graphify-out/foe-info/obsidian/` and `wiki/` markdown exports: git-ignored generated artifacts from the graphify knowledge graphs, retained locally.
