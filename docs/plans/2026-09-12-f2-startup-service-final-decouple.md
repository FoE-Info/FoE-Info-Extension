# F2 Final Decoupling — StartupService (Sessions 10–11 remainder)

**Date**: 2026-09-12
**Status**: Planned — the last remaining `src/js/msg/ → src/js/ui/` static edges.
**Parent program**: [`2026-09-12-f2-reactive-decoupling-session-plan.md`](2026-09-12-f2-reactive-decoupling-session-plan.md)
**Evidence**: `graphify-out/foe-info/findings/2026-09-12-reactive-store-migration-audit.md`

> Standing constraint (`docs/COORDINATION.md`): no commit/push without explicit
> user approval; one verified change at a time; `npm run verify` green before
> completion.

## Why this one is different

Earlier F2 batches were mechanical: swap a renderer call for a store publish.
`StartupService` is not. Its remaining `../ui/` imports feed the **city-stats
render context** and **re-exported helpers**, so removing them naively would push
new `msg/ → ui/` edges into `protocol/` and `OtherPlayerService`:

| Import (`src/js/msg/StartupService.js`)    | Current role                                                       | Blocker                                                                                                              |
| :----------------------------------------- | :----------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------- |
| `buildTotalGoodsTooltipHTML`               | builds `tooltipHTML.totalGoods` consumed by `renderLiveCityStats`  | value is computed before publish and carried inside the context                                                      |
| `getUserTooltipHTML` / `getScoreDBOrigin`  | supplied to the city-stats context                                 | rendered by `ui/renderLiveCityStats.js`                                                                              |
| `formatPlayerLabel` / `updateIgnoreListUI` | re-exported                                                        | `protocol/routes/socialRoutes.js`, `protocol/indexBridgeSetup.js`, `msg/OtherPlayerService.js` consume the re-export |
| `showGalaxy` / `updateGalaxy`              | `blueGalaxyState` render callback, metadata re-render, re-exported | `CityProductionService` imports `updateGalaxy` from `StartupService`                                                 |
| `buildClanGoodsData` / `fGoodsHTML`        | clan-goods aggregation + goods HTML                                | aggregation is pure but currently lives in `ui/renderLiveCityStats.js`                                               |

**Invariant for every slice:** the final grep
`rg -nE "from '\.\./ui/|require\('\.\./ui/" src/js/msg/` must return only
`ConversationService.js → ui/AddElement.js` (deliberately retained element
factory), and no _new_ `msg/ → ui/` edges may be introduced downstream.

---

## Slice A (Session 10 remainder) — tooltip context + player helpers

**Goal:** remove `components/cityStatsTooltipBuilder`, `playerTooltip` (both the
value imports and the re-export) from `StartupService`.

**Design**

1. **Tooltip HTML ownership → renderer.** Let `ui/renderLiveCityStats.js` build
   its own tooltip HTML from the `goodsBuildings`/`fpBuildings` already present
   in the context (import `cityStatsTooltipBuilder` there — a `ui/ → ui/` edge).
   Remove `buildTotalGoodsTooltipHTML` from `StartupService`; the context no
   longer needs a precomputed `tooltipHTML.totalGoods`.
2. **Player helpers → renderer.** `getUserTooltipHTML`/`getScoreDBOrigin` become
   `ui/renderLiveCityStats.js` imports (or injected deps) rather than context
   function references.
3. **Ignore-list trigger → store channel.** Add an `ignore-list` channel to
   `StartupRenderState`; `OtherPlayerService` publishes its ignored-player
   payload (it already owns this code) and the startup binding calls
   `updateIgnoreListUI`. Re-point `socialRoutes`/`indexBridgeSetup` consumers to
   the store/binding — never to `ui/playerTooltip` directly from `msg/`.
4. Drop `formatPlayerLabel` from the re-export if no production consumer exists
   (confirm first; the player-tooltip test imports it from `ui/`).

**Acceptance**

- `StartupService` no longer imports `cityStatsTooltipBuilder` or
  `playerTooltip`.
- `OtherPlayerService` still has zero `../ui/` imports.
- New tests: `ignore-list` channel store/binding; `updateIgnoreListUI` still
  fires after a social-list ingest.
- `npm run verify` exit 0.

---

## Slice B (Session 11) — galaxy + live city stats

**Goal:** remove `renderGalaxyPanel` and `renderLiveCityStats` from
`StartupService`.

**Design**

1. **Galaxy wiring → binding.** Register `blueGalaxyState.setRenderCallback` and
   the `subscribeMetadataRenders` galaxy step inside a
   `ui/galaxyRenderBinding.js` (or extend `blueGalaxyBinding`) instead of
   `StartupService`. `showGalaxy` is called there.
2. **`updateGalaxy`** is imported by `CityProductionService` from
   `StartupService`; route it through `blueGalaxyState` (the store already owns
   galaxy state) or a small `state` publish so the caller never reaches `ui/`.
3. **Clan goods + goods HTML.** Move `buildClanGoodsData` to
   `calc/` (pure) or `msg/StartupCityStatsAggregator.js`; `fGoodsHTML` is only
   needed to build the context, so move its invocation to the renderer/binding.
4. `StartupService.renderLiveCityStats` remains the publish wrapper around
   `renderWhenStartupReady(...)`; the binding keeps the actual UI render.

**Acceptance**

- `rg -nE "from '\.\./ui/|require\('\.\./ui/" src/js/msg/` → only
  `ConversationService.js`.
- `graphify-foe-info_query_graph` / `links[]` shows production `msg/ → ui/`
  static edges = 0 (excluding `AddElement`).
- `tests/calc/calc-purity.test.mjs` still green; BigNumber hybrid untouched.
- `npm run verify` exit 0; refresh the FoE-Info AST and record the final edge
  count in the F2 section of the reactive-store migration audit.

---

## Program Definition of Done (F2)

- [ ] Only `ConversationService.js → ui/AddElement.js` remains in `src/js/msg/`.
- [ ] Production `msg/ → ui/` static edges = 0 (graphify).
- [ ] `ui/renderBindings.js` remains the single composition root; every new
      binding registered and covered by `tests/ui/render-bindings.test.mjs`.
- [ ] Store + binding suites per slice; `calc/` purity guard green.
- [ ] `npm run verify` exit 0; `docs/STATUS.md` + `docs/HANDOFF.md` updated.
