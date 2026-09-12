# Targeted Surgical Roadmap (Post Quad-Graph Exploration)

**Date**: 2026-09-12
**Status**: Reconciled 2026-09-12 — Phase A, B2–B5, C1/C2, D1g/D2g shipped; B1 shipped (calc purity); C3 closed (no longer required); D3g remains open. See `docs/STATUS.md` Actionable Items 1–4 for the current queue.
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

- [x] **A1 (D1)** Shipped — `src/js/fn/helper.js:37` now binds the live `ResourceNames` map (`lookup || ResourceNames`), so helper-path callers (`RewardRenderer`, `panelDispatcher`, `gbgProvinceView`) resolve names; one-arg lookup path covered in `tests/utils/formatters.test.mjs:94`.
- [x] **A2 (D2)** Shipped — all 14 duplicate RPC registrations eliminated; `scripts/rpc-contract.config.json` enforces `knownDuplicates: []` via `rpc:contract:check` in `npm run verify`.
- [x] **A3 (D4)** Resolved — orphaned `webRequestFilter.js` deleted; no `webRequest` permission in any `src/chrome/manifest*.json`; metadata fetching remains page-context.

## Phase B — Purity & Containment (P1)

- [x] **B1 (D3)** Shipped 2026-09-12 — removed the dead `globalThis.CityEntityDefs`/`metadataStore` fallbacks in `src/js/calc/gbNaming.js` (no assignments existed repo-wide); added `tests/calc/calc-purity.test.mjs` guarding `src/js/calc/**` against `globalThis.`/`window.`/`document.` and `../msg/` imports. Zero residual violations.
- [x] **B2 (D5)** Shipped — `npm run typecheck` (`tsc --noEmit`) wired into the `verify` pipeline.
- [x] **B3** Shipped — `CityMapEntityProcessor.js` 657 -> 244 L; harvest logic extracted to `src/js/calc/entities/CityEntityHarvestCalculator.js`.
- [x] **B4** Shipped — `legacyBridge.js` 831 -> 62 L with per-domain route tables under `src/js/protocol/routes/` behind the `registerLegacyBridge` facade.
- [x] **B5** Shipped 2026-09-12 — residual `msg/` DOM routed through `src/js/ui/` (`renderTreasuryLogPanel`, `renderCulturalPanel`, `renderBonusPanel`, `renderResourcePanel`, `renderExpeditionPanel`, `renderArmyPanel`, `renderRewardsPanel`, `renderGbDonationLegacy`); services keep state/parsing and delegate markup+binding.

## Phase C — Differentiated Feature Parity (P1–P2)

- [x] **C1** Shipped — pure `computeEconomicScore` in `BlueGalaxyCalculator.js` with configurable `fpWeight`/`goodsWeight`/`olderGoodsWeight` and BigNumber precision.
- [x] **C2** Shipped — `src/js/utils/date.js` uses `Intl` tokens (`MMM`/`MMMM`/`ddd`) + `formatRelativeTime()`; residual `toLocale*` call sites migrated. No moment.js.
- [x] **C3** Closed 2026-09-12 by user directive — sniping UX is already shipped (calculators sorted); BG enhancements may return later but are not a current priority.

## Phase D — Guardrails & Record (P2)

- [x] **D1g** Shipped — `tests/math/formula-parity-pinning.test.mjs` pins half-up Arc rewards, ceiling spot locks, and owner safe adds.
- [x] **D2g** Shipped 2026-09-12 — `tests/protocol/dispatcher-resilience.test.mjs` (18 tests): priority ordering, dedup replay/expiry, `clearDedupCache()` reset, error isolation, fallback precedence.
- [ ] **D3g** Open — LoW-Tool fork/exclusion rationale lives only in the synthesis + STATUS/HANDOFF; no dedicated archived record under `docs/specs/`.

---

## Recommended immediate next slice

Actionable Item 1 (dedup extraction), Actionable Item 3 (TS mirrors), B1 (calc
purity), D2g (dispatcher resilience tests), B5 (msg DOM decoupling),
Actionable Item 4 (structured DevTools bridge), and both Actionable Item 2
reactive-store slices (QuantumState, StartupRenderState) shipped 2026-09-12.
C3 was closed by user directive (sniping UX already shipped; BG deferred).
Only **D3g** (LoW-Tool exclusion record) remains open.

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
