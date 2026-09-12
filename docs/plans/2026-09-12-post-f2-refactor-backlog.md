# Post-F2 Refactoring Backlog

**Date**: 2026-09-12
**Source**: `graph-knowledge-explorer` pass over the refreshed FoE-Info AST after
the F2 reactive-decoupling program closed.
**Graph baseline**: 3,329 nodes / 5,193 edges / 266 communities
(EXTRACTED 88%, INFERRED 12%, AMBIGUOUS 0%); refreshed via
`npm run graph:foe-info:update` (exit 0).

> Graph caveat: AST extraction misses `require()` calls nested in closures, so
> every edge below was re-verified against source with `grep`/`read`.

## Layering status

| Edge class             | Result                                                                        |
| :--------------------- | :---------------------------------------------------------------------------- |
| `msg/ → ui/` direct    | 1 — `ConversationService.js:19` → `AddElement` (ok)                           |
| `msg/ → ui/` via `fn/` | present (e.g. `GreatBuildingsService` → `fn/AddElement` → `ui/AddElement`)    |
| `ui/ → msg/`           | 5 → 1 fixed (`gbDonationTables`), 4 lazy `resolveDep` in `indexUiBindings.js` |
| `state/ → msg/`        | 3 — `state/indexEntityDefs.js:10,15`, `state/entityDefsCache.js:28`           |
| `calc/ → msg           | ui`                                                                           | 0 ✅ |

## Prioritized backlog

### P0 — done

- **`gbDonationTables` stale social lists** (`ui/gbDonationTables.js:45-47`
  snapshot vs `msg/OtherPlayerService.js:192-194` reassignment) — fixed by
  `state/SocialState.js` (`4e3786c`). Inactive/plunder markers now render.

### P1 — `cardVisibility` config extraction

- ✅ **`.js` done (Batch 18)**: frozen tables moved to
  `ui/cardVisibilityConfig.js` (272 L); `ui/cardVisibility.js` 739 → 503 L.
- ⏳ **Remaining**: have `ui/cardVisibility.ts` (789 L) re-export
  `ui/cardVisibilityConfig.js` instead of duplicating the tables. Blocked on the
  `.js`/`.ts` canonical-direction decision below because the `PanelId` type is
  derived from the `ALL_15_PANEL_IDS` literal tuple.
- Tests: `tests/ui/card-visibility.test.mjs` (375 L),
  `tests/ui/context-view-filtering.test.mjs`.

### P2 — dead code

- Delete `fn/cityStatsUtils.js` (0 consumers).
- Decide `ui/cityStatsHtmlBuilder.js` (131 L, production-orphan;
  `buildCityStatsHTML` has no production importer).
- Retarget test-only `fn/CityStatsCalculator.js` consumers to `calc/`.

### P2 — monolith extracts (ranked, all with existing tests)

| File (lines)                          | Extract                                                       | ~Lines |
| :------------------------------------ | :------------------------------------------------------------ | -----: |
| `protocol/MessageDispatcher.js` (586) | direct-CDN metadata router L507–570                           |     64 |
| ”                                     | request `postData` extraction L381–443                        |     63 |
| `msg/GreatBuildingsService.js` (468)  | `fCheckOutput` L368–450 → `ui/gbOutputRepair.js`              |     83 |
| `ui/containerBinding.js` (571)        | `setupPanelContainers` L280–556 factory                       |    277 |
| `fn/collapse.js` (493)                | 27 toggles L143–478 → declarative specs                       |    330 |
| `ui/indexUiBindings.js` (528)         | storage bootstrap + drop hardcoded jQuery locale map L210–242 |     75 |

### P2 — TS mirror drift

- 12 hand-maintained `.js`/`.ts` pairs (none executed at runtime, validated
  only by `tsc --noEmit`). Decide canonical direction (JS runtime + generated
  `.d.ts`, or TS source compiled). Pairs: `ui/cardVisibility`,
  `ui/panelDispatcher`, `state/MetadataStore`, `calc/CityStatsCalculator`,
  `calc/GreatBuildingCalculator`, `calc/BlueGalaxyCalculator`,
  `calc/InvestedCalculator`, `calc/GbgCalculator`, `calc/utils/{spatialUtils,
eraUtils,bignumberUtils}`, `calc/eraMapping`.

### P2 — small rule fixes

- `msg/StartupService.js:171,173,179` use ungated `console.debug` (violates
  Debuggability by Design) — route through the scoped logger.
- `fn/helper.js:32,38` re-export UI panels (`renderBattlegroundsPanel`,
  `incidentsPanel`) — split out.
