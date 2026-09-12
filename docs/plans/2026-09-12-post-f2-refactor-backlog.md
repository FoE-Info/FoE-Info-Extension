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

- ✅ Deleted `fn/cityStatsUtils.js` (0 consumers) on 2026-09-12.
- ✅ Deleted `ui/cityStatsHtmlBuilder.js` (131 L, production-orphan) on 2026-09-12.
- ✅ Retargeted `fn/CityStatsCalculator.js` consumers to `calc/` and deleted legacy shim (7 L) on 2026-09-12.
- **NEW (verified 2026-09-12):** `GbDonationState.setDonationPanel` /
  `getDonationPanel` / the `'donation'` channel are **dead production code**.
  Evidence: the only production caller of the store is
  `msg/GbDonationService.js:320,328`, and it calls `setReward` exclusively;
  `grep -rn setDonationPanel src/` returns nothing outside the store itself,
  while `tests/state/gb-donation-state.test.mjs` and
  `tests/ui/gb-donation-render-binding.test.mjs` drive it by hand. The live
  donation panel renders through the _other_ store — `GreatBuildingsState` →
  `ui/greatBuildingsRenderBinding.js` → `renderGbDonationPanel.js` (the real
  panel, now `ui/renderGbDonationLegacy.js`). `ui/gbDonationRenderBinding.js`
  wires its `'donation'` branch to the legacy renderer, so that branch is both
  unreachable and pointed at the superseded renderer. Decision required: either
  complete the F2 cutover (make `GbDonationService` publish `setDonationPanel`
  and drop the `GreatBuildingsState.donation` path) or delete the dead
  `donationPanel` half of `GbDonationState` + the `'donation'` branch and
  `renderGbDonationLegacy.js`. Do **not** delete without deciding which store
  owns the donation panel.

### P2 — monolith extracts (ranked, all with existing tests)

| File (lines)                               | Extract                                                         | ~Lines |
| :----------------------------------------- | :-------------------------------------------------------------- | -----: |
| `protocol/MessageDispatcher.js` (434)      | ✅ direct-CDN metadata router → `protocol/directMetadata.js`    |    106 |
| ”                                          | ✅ request `postData` extraction → `protocol/requestPayload.js` |     63 |
| `msg/GreatBuildingsService.js` (468 → 386) | ✅ `fCheckOutput` → `ui/gbOutputRepair.js`                      |     83 |
| `ui/containerBinding.js` (571 → 274)       | ✅ `setupPanelContainers` → `ui/panelContainerFactory.js`       |    277 |
| `fn/collapse.js` (494 → 448)               | ✅ 28 toggles + runner → `ui/collapseToggleRunner.js`           |    172 |
| `ui/indexUiBindings.js` (528)              | storage bootstrap + drop hardcoded jQuery locale map L210–242   |     75 |

### P2 — TS mirror drift ✅ resolved by Phase 0

- All 12 hand-maintained `.js`/`.ts` pairs were deleted in
  `chore(ts): remove dead js/ts twin modules` (`899735a`), guarded by
  `tests/architecture/no-js-ts-twins.test.mjs`. Canonical direction decided:
  real TS is authored from the authoritative `.js` in a later phase, never
  mirrored. No `.ts` files remain under `src/js/` (only the `src/types/*.d.ts`
  ambient contracts). See `docs/plans/2026-09-12-ts-hygiene-phase0.md`.

### P2 — small rule fixes

- ✅ `msg/StartupService.js` ungated `console.debug` calls (window/user/i18n
  locale) routed through the scoped `logger.debug` on 2026-09-12.
- `fn/helper.js:32,38` re-export UI panels (`renderBattlegroundsPanel`,
  `incidentsPanel`) — split out.
