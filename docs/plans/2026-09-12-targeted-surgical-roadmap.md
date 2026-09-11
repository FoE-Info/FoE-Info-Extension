# Targeted Surgical Roadmap (Post Quad-Graph Exploration)

**Date**: 2026-09-12
**Status**: Proposed — awaiting go-ahead
**Source**: `graphify-out/foe-info/findings/2026-09-12-quad-graph-executive-synthesis.md`
(derived from the 4-stream suite in
[`2026-09-12-quad-graph-exploration-and-comparison.md`](2026-09-12-quad-graph-exploration-and-comparison.md))

> Standing constraint (`docs/COORDINATION.md`): no commit/push without explicit user
> approval; investigate-and-report before fixing; one verified change at a time.
> All slices ≤ 100 lines, files ≤ 600 L, BigNumber hybrid preserved, dynamic runtime
> metadata preserved, failing-first tests added, and `npm run verify` green before
> completion.

---

## Confirmed defects (evidence-backed)

| ID  | Defect                                                                                                                                                                                                                                                                                  | Severity            | Evidence                                                                                                                                                     |
| :-- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | `fResourceShortName(name, lookup = null)` no longer reads the runtime `ResourceNames` map; all 8 call sites omit the lookup → generic resources render as raw IDs. Tests only cover the explicit-lookup path.                                                                           | High (user-visible) | `utils/formatters.js:42`; callers `CityProductionService.js:47,71`, `RewardRenderer.js:92,232`, `panelDispatcher.js:429`/`.ts:643`, `gbgProvinceView.js:106` |
| D2  | Duplicate RPC ownership: `registerServices.js` and `legacyBridge.js` both register `EmissaryService.getOverview/getAssigned`, `BoostService.getAllBoosts`, `OutpostService.getAll`; `MessageDispatcher.register()` silently composes a combined handler → possible double side effects. | High (subtle)       | `MessageDispatcher.js:45-66`; `legacyBridge.js:122,123,126,488`                                                                                              |
| D3  | calc dependency impurity: `VisitedCityStatsCalculator.js:21` imports `../msg/CastleSystemService.js` (calc→msg inversion); `gbNaming.js:185-194` reads `globalThis.CityEntityDefs`/`metadataStore`.                                                                                     | Medium              | `src/js/calc/*`                                                                                                                                              |
| D4  | `webRequestFilter.js` is orphaned (never imported/called) and the `webRequest` manifest permission was dropped while panel-context CDN metadata fetches persist.                                                                                                                        | Medium              | zero `initWebRequestFilter` call sites                                                                                                                       |
| D5  | 10 `.js`/`.ts` mirrors can drift; `npm run verify` does not run `tsc --noEmit`.                                                                                                                                                                                                         | Medium              | `package.json` verify; `webpack.common.js:107`                                                                                                               |

---

## Phase A — Correctness & Safety (P0)

- [ ] **A1 (D1)** Restore resource-name mapping. Pass the live `ResourceNames` map at call sites that have it, or bind a thin wrapper in `src/js/fn/helper.js`. Add a **helper-path** regression test with a populated map. Blast radius < ~40 L.
- [ ] **A2 (D2)** Choose one owner per duplicated RPC key; remove the `legacyBridge` duplicate; add a test asserting exactly one distinct handler per key. Log `combinedHandlerMembers` growth when duplicates are combined.
- [ ] **A3 (D4)** Decide `webRequestFilter.js`: re-add `"webRequest"` and call `initWebRequestFilter()` from the entry (with a live CDN smoke check), **or** delete the module and document page-context metadata fetching. Do not leave it orphaned.

## Phase B — Purity & Containment (P1)

- [ ] **B1 (D3)** Add a calc purity test-guard: fail if `src/js/calc/**` imports from `../msg/` or references `window`/`document`/`globalThis`; forbid raw `Math.round|ceil|floor` in GB/reward calc paths. Then inject the castle boost lookup and remove `gbNaming.js` `globalThis` fallbacks.
- [ ] **B2 (D5)** Add `npm run typecheck` to the `verify` pipeline (smaller/safer) — or delete runtime-shadowed `.ts` mirrors.
- [ ] **B3** Decompose `CityMapEntityProcessor.processCityMapEntities` (~610 L) into `src/js/calc/cityMap/` per-entity processors with a ≤80-L orchestrator. No external import changes; keep the existing test. **Safest first decomposition.**
- [ ] **B4** Decompose `registerLegacyBridge` (~817 L, 71 register calls) into per-domain registrars under `src/js/protocol/legacy/` (city map, GB, clan/treasury, battleground, trade/other-player) behind a byte-compatible `registerLegacyBridge(dispatcher, handlers)` facade. **Do after A2.**
- [ ] **B5** Pull residual DOM out of `msg`/`protocol` into `src/js/ui/`: `networkListener.js:123` `innerHTML` (worst), `StartupRenderOrchestrator.js:63`, `StartupService.js:221-225/348-355`, `GuildBattlegroundService.js:153`.

## Phase C — Differentiated Feature Parity (P1–P2)

- [ ] **C1** Blue Galaxy economic ranking: extend the pure calc with `CombinedValue = FP + goodsRate·Goods + olderGoodsRate·OlderGoods` (user-configurable rates, optionally fragments). Failed-first tests + i18n keys + `npm run i18n:check`. **(Order before C3.)**
- [ ] **C2** Date-engine completion: localized name tokens (`MMM`/`MMMM`/`ddd`) via `Intl.DateTimeFormat`, relative time via `Intl.RelativeTimeFormat`, four independent format types, live preview + reset; migrate the 30 residual `toLocale*` date call sites. **No moment.js.**
- [ ] **C3** Blue Galaxy UX + sniping UX controls: 23.5 h window filter, polivation/fragment indicators, sortable columns, auto-open trigger; surface "trust/lock existing places" and danger warnings on top of the existing precise BigNumber engine.

## Phase D — Guardrails & Record (P2)

- [ ] **D1g** Formula parity fixtures: pin `calculateSpotLock` = `ROUND_CEIL`, `calculateArcReward` = `ROUND_HALF_UP`, and the direct-remainder `calculateOwnerSafeAdd` against the LoW-Tool/Forge-Hammer lineage reference.
- [ ] **D2g** Dispatcher resilience tests: reconnection replay, world-switch reset, stale `activeRun` barrier.
- [ ] **D3g** Archive the LoW-Tool exclusion rationale (synthesis + Stream 4 dossier) as the record for intentionally not restoring the `src/extras/` overlay.

---

## Recommended immediate next slice

**A1 (D1)** — the only confirmed user-visible defect, self-contained, < ~40 L, with an
obvious regression test. Then **A2 (D2)** before any `legacyBridge` decomposition.

## Plan premises corrected (do not inherit)

1. v1 baseline line counts were wrong: actual `index.js` **2,806** (`~1,646` claimed), `StartupService` **1,554** (`~2,334`), `helper.js` **846** (`~993`), `GreatBuildingsService` **1,025** (`~1,226`).
2. v1 **already used BigNumber**; the real v1→modern wins are the owner-safe-add formula fix and explicit `ROUND_CEIL` locks.
3. **No Blue Galaxy probability model exists** in either extension — charges are deterministic.
4. **LoW-Tool is a fork of FoE-Info**, not the upstream original; antique dealer/settlements were never in LoW-Tool, and its `src/extras/` overlay (hardcoded webhooks, embedded Apps Script key, per-world allowlists) must not be restored.

## Dossier index

| Stream            | Dossier                                                                        |
| :---------------- | :----------------------------------------------------------------------------- |
| 1 — host topology | `graphify-out/foe-info/findings/2026-09-12-foe-info-modern-architecture.md`    |
| 2 — v1 baseline   | `graphify-out/foe-info-original/findings/2026-09-12-v1-baseline-comparison.md` |
| 3 — Forge-Hammer  | `graphify-out/forge-hammer/findings/2026-09-12-forge-hammer-comparison.md`     |
| 4 — LoW-Tool      | `graphify-out/low-tool/findings/2026-09-12-low-tool-comparison.md`             |
| Synthesis         | `graphify-out/foe-info/findings/2026-09-12-quad-graph-executive-synthesis.md`  |

(`graphify-out/` is git-ignored; the sibling-copy dossiers live under
`../forge-hammer/graphify-out/findings/` and `../LoW-Tool/graphify-out/findings/`.)
