# FoE-Info Extension — Live Work & Todos

Shared status board for all agents. **Update this file in the same change that
changes the underlying work** — this is the current-status source of truth, not
a changelog. See `docs/README.md` for the full hub.

> Standing constraint from `docs/COORDINATION.md`: no commit/push without the
> user's explicit approval; investigate-and-report before fixing; one verified
> change at a time.

## Todos

- [ ] Test Suite Footprint Optimization:
  - [x] Phase 1: Shared test harness utilities (`tests/helpers/test-mocks.mjs`) for DOM, Chrome extension APIs, and mock factories (shipped: `test-mocks.mjs` + `test-mocks.test.mjs`, adopted in initial suites).
  - [x] Phase 2: Decompose oversized monolithic tests violating <600 line limit (shipped: decomposed into focused suites under 600L — `domain-services.test.mjs` 347L, `domain-services-city.test.mjs` 523L, `domain-services-social.test.mjs` 429L; `guild-battleground-signals.test.mjs` 403L, `guild-battleground-targets.test.mjs` 569L, `guild-battleground-panels.test.mjs` 349L).
  - [x] Phase 3: Prune multi-megabyte captured JSON fixtures in `tests/fixtures/` (-22.4 MB, -720k lines pruned across 5 fixtures, verified clean). Plan: [`docs/plans/2026-09-14-test-suite-fixture-pruning-plan.md`](plans/2026-09-14-test-suite-fixture-pruning-plan.md).
- [ ] Modern-web Tier 3 (deferred, higher risk): migrate Bootstrap popovers/collapse to native `popover` + CSS Anchor Positioning, adopt `light-dark()`/`[data-bs-theme]` theming, and evaluate opt-in Built-in AI/WebMCP enhancements.
- [ ] Modern-web deferred items: `content-visibility` on measured card bodies (no safe stable selector yet), `MessageDispatcher` parse yielding, and residual table semantics. `renderBattlegroundsPanel.js` already has `<caption>`/`scope="col"`; the `renderInvestedPanel.js` table is a commented-out future feature.
- [ ] Graph-explorer follow-ups (2026-09-12), full ranked backlog in [`docs/plans/2026-09-12-post-f2-refactor-backlog.md`](plans/2026-09-12-post-f2-refactor-backlog.md):
  - Review the 4 lazy `resolveDep` `ui/ → msg/` fallbacks in `ui/indexUiBindings.js` (F3 left them, injectable from `index.js`).
  - Decide the fate of `ui/cityStatsHtmlBuilder.js` (production orphan).

## Open threads requiring a decision

- `graphify-out/foe-info/obsidian/` and `wiki/` markdown exports: git-ignored generated artifacts from the graphify knowledge graphs, retained locally.
