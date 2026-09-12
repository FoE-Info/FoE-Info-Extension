# F2 Reactive Decoupling — Multi-Session Implementation Plan

> **For agentic workers:** Each session below is self-contained and can be picked
> up by pasting its **Prompt** block into a fresh opencode session. REQUIRED
> SUB-SKILL: `subagent-driven-development` or `executing-plans` for the task
> loop, `test-driven-development` for the store/binding tests, and
> `verification-before-completion` before claiming done.

**Goal:** Finish Actionable Item 2 / F2 — remove every remaining production
`src/js/msg/` → `src/js/ui/` static import by moving each service onto the
`service → state ← ui` reactive pattern (store + render binding).

**Architecture:** For every coupled service: (1) add a channeled
`src/js/state/<Domain>State.js` publish/subscribe store mirroring
`ArmyState.js`; (2) add `src/js/ui/<domain>RenderBinding.js` that subscribes the
existing renderers to the store; (3) the service publishes a prepared payload
instead of importing the renderer; (4) register the binding in the single
composition root `src/js/ui/renderBindings.js`; (5) migrate any test that
asserted synchronous DOM to load the binding or assert the store payload.

**Tech Stack:** Vanilla ES/CommonJS dual modules, Node `node:test`, Webpack 5,
BigNumber.js.

**Spec / evidence:**

- `graphify-out/foe-info/findings/2026-09-12-reactive-store-migration-audit.md`
  (F2 table, remaining services, test-isolation lesson)
- `docs/plans/2026-09-12-targeted-surgical-roadmap.md`
- `docs/HANDOFF.md` current session (batches 1–4)

## Global Constraints

Every session inherits these; do not restate them in code.

- Target module size ≤ 250 lines; hard ceiling ≤ 600 lines (`src/js/`).
- Debuggability by Design (Rule 16): every new/refactored module instantiates
  `createLogger('<ModuleName>')` from `src/js/utils/logger.js` and emits
  `logger.debug(...)`; 100% silent in standard mode.
- BigNumber precision (Rule 9) for all FP / game resource math — never mix
  `BigNumber` with native floats.
- `calc/` purity: no `calc/ → msg|ui` imports; no `globalThis.`/`window.`/`document.`
- No static game metadata in `src/` (Rule: dynamic runtime metadata).
- i18n parity for any new user-visible string (add to `src/i18n/en.json`, then
  `npm run i18n:fix`, then `npm run i18n:check`).
- `npm run verify` must exit 0 before completion; run `npm run typecheck`
  separately if `.ts` mirrors are touched.
- Small incremental slices; one verified change at a time; no commit unless the
  user explicitly asks.

## The Established Pattern (copy this)

Reference files — read these first in every session:

| Concern               | Reference                                                     |
| :-------------------- | :------------------------------------------------------------ |
| Store                 | `src/js/state/ArmyState.js` (60 L)                            |
| Binding               | `src/js/ui/armyRenderBinding.js` (26 L)                       |
| Store test            | `tests/state/army-state.test.mjs` (48 L)                      |
| Binding test          | `tests/ui/army-render-binding.test.mjs` (43 L)                |
| Multi-channel binding | `src/js/ui/treasuryRenderBinding.js`                          |
| Service publish diff  | `git show 9fc156e -- src/js/msg/ArmyUnitManagementService.js` |
| Composition root      | `src/js/ui/renderBindings.js` (created by Session 0)          |

**Store contract (exact):** class `<Domain>State` with `subscribe(fn)`,
`unsubscribe(fn)`, `notify(channel='all')` that isolates subscriber errors via
`this.logger?.error?.('Reactive subscriber failed', { channel, error })`, one
`set<Payload>(payload)` per channel plus `get<Payload>()`, a module singleton,
and dual `module.exports` / `module.exports.default`. Lazy
`createLogger('<Domain>State')` inside `try/catch`.

**Binding contract (exact):** `function bind<Domain>Panel(state = <singleton>,
{ render<X> = <default renderer> } = {})` returns an unsubscribe function;
guards `typeof state.subscribe !== 'function'`; filters on channel; calls the
renderer only when a payload exists; ends with a module-load self-subscription
call; dual exports.

## Session Map

Sessions are **sequential by default**. Sessions tagged `‖` touch disjoint files
and may run in parallel worktrees (`.worktrees/<branch>`); the only shared file
is `src/js/ui/renderBindings.js` (one-line addition each), so a trivial rebase/
merge is expected.

| #   | Domain                             | Service(s)                  | UI edges removed | Parallel | Depends on |
| :-- | :--------------------------------- | :-------------------------- | :--------------: | :------: | :--------- |
| 0   | Foundation (F7)                    | —                           |        0         |    —     | —          |
| 1   | GB donation + rewards              | `GbDonationService`         |        3         |    ‖     | 0          |
| 2   | Great Buildings info               | `GreatBuildingsService`     |        3         |    ‖     | 0, 1       |
| 3   | Guild Battlegrounds                | `GuildBattlegroundService`  |        4         |    ‖     | 0          |
| 4   | Guild Expedition                   | `GuildExpeditionService`    |        2         |    —     | 0          |
| 5   | City Production / Invested / Quest | 3 services                  |        4         |    ‖     | 0          |
| 6   | Other Player / Visited City        | `OtherPlayerService`        |        2         |    ‖     | 0          |
| 7   | Outpost / Cultural                 | `OutpostService`            |        1         |    ‖     | 0          |
| 8   | Resource / Goods                   | `ResourceService`           |        2         |    ‖     | 0          |
| 9   | Startup render orchestration       | `StartupRenderOrchestrator` |        1         |    ‖     | 0          |
| 10  | StartupService (city stats)        | `StartupService`            |        3         |    —     | 0, 9       |
| 11  | StartupService (galaxy/tooltips)   | `StartupService`            |        3         |    —     | 0, 10      |

**Out of scope (record, do not migrate):** `ConversationService.js:19`
(`AddElement.js` is a DOM element factory, not a panel renderer) and
`QuestService`/`InvestedService` lazy `RewardRenderer`/`renderInvestedPanel`
triggers are folded into Session 5.

---

## Session 0 — Foundation: explicit render-binding composition root (F7)

**Scope:** Make the side-effect binding wiring explicit and testable so every
later session has one, obvious registration point.

**Create:**

- `src/js/ui/renderBindings.js` — side-effect imports of the 5 existing
  bindings (`armyRenderBinding`, `bonusRenderBinding`, `quantumRenderBinding`,
  `startupRenderBinding`, `treasuryRenderBinding`); one-line purpose header.
- `tests/ui/render-bindings.test.mjs`.

**Modify:**

- `src/js/index.js:23-28` — replace the 5 bare binding imports with
  `import './ui/renderBindings.js';` (keep the `initIndexUiBindings` import).
- `docs/HANDOFF.md` — note F7 wiring landed.

**Test:** importing `renderBindings.js` causes each of the 5 shared singleton
stores to have ≥ 1 subscriber (compare `state.subscribers.size` before/after a
fresh dynamic import using a cache-buster query), and the barrel exports no
named symbols that shadow the bindings.

**Verify:** `npm run verify` exit 0.

**Prompt:**

```text
Read AGENTS.md, then docs/README.md, docs/STATUS.md, docs/HANDOFF.md, and
docs/plans/2026-09-12-f2-reactive-decoupling-session-plan.md (Session 0).
Using writing-plans/executing-plans conventions, implement F7: create
src/js/ui/renderBindings.js as the single composition root that side-effect
imports armyRenderBinding.js, bonusRenderBinding.js, quantumRenderBinding.js,
startupRenderBinding.js, and treasuryRenderBinding.js. Replace the five bare
'./ui/*RenderBinding.js' imports in src/js/index.js with a single
import './ui/renderBindings.js';. Add tests/ui/render-bindings.test.mjs proving
each singleton store gains a subscriber after importing the barrel (use a
cache-busted dynamic import to get a fresh module registry). Keep the change
<= 100 lines, files <= 600 lines, no behavior change. Run `npm test` then
`npm run verify`; report exact test counts and exit code. Do not commit.
```

---

## Session 1 — GB donation + rewards (`GbDonationService`)

**Scope:** `GbDonationService.js` (340 L) imports `renderGbDonationLegacy`,
`renderRewardsPanel`, and lazily `RewardRenderer`. Publish a donation-panel
payload and a generic-reward payload.

**Create:**

- `src/js/state/GbDonationState.js`
- `src/js/ui/gbDonationRenderBinding.js`
- `tests/state/gb-donation-state.test.mjs`
- `tests/ui/gb-donation-render-binding.test.mjs`

**Modify:**

- `src/js/msg/GbDonationService.js` — replace the two top-level requires and the
  line-268 `RewardRenderer` require with `gbDonationState.setDonationPanel(...)`
  and `gbDonationState.setReward(...)` (or a single channeled payload). Preserve
  the public `renderGbDonationPanel` / `handleNewReward` re-exports
  (`docs/HANDOFF.md` B5 contract).
- `src/js/ui/renderBindings.js` — add `import './gbDonationRenderBinding.js';`
- `docs/STATUS.md` + `docs/HANDOFF.md` — record F2 batch.

**Interfaces:**

- Store channels: `'donation'` → `getDonationPanel()`, `'reward'` → `getReward()`.
- Binding injects `renderDonation = renderGbDonationPanel`,
  `renderReward = renderGenericReward`.

**Tests:** store publish/channel/error-isolation; binding forwards to injected
renderers and skips null payloads. Migrate any coupled assertion in
`tests/msg/great-buildings-options.test.mjs` if it reads the service's UI import.

**Verify:** `npm run verify` exit 0.

**Prompt:**

```text
Read AGENTS.md, docs/HANDOFF.md, and
docs/plans/2026-09-12-f2-reactive-decoupling-session-plan.md (Session 1 + "The
Established Pattern"). Decouple src/js/msg/GbDonationService.js from
src/js/ui/. Model on src/js/state/ArmyState.js and
src/js/ui/armyRenderBinding.js. Create state/GbDonationState.js (channels
'donation' and 'reward') and ui/gbDonationRenderBinding.js (inject renderers
renderGbDonationPanel from ui/renderGbDonationLegacy.js and renderGenericReward
from ui/renderRewardsPanel.js). Replace the top-level requires and the
function-scoped RewardRenderer require (around line 268) with state publishes.
Preserve the public renderGbDonationPanel and handleNewReward re-exports used by
GreatBuildingsService. Migrate any test asserting synchronous DOM to assert the
store payload or to import the binding. Register the binding in
src/js/ui/renderBindings.js. Add store + binding test suites mirroring
tests/state/army-state.test.mjs and tests/ui/army-render-binding.test.mjs.
Validate the service no longer imports ../ui/ (grep). Run `npm test` then
`npm run verify`; report test counts and exit code. Update docs/STATUS.md and
docs/HANDOFF.md F2 batch. Do not commit.
```

---

## Session 2 — Great Buildings info (`GreatBuildingsService`)

**Scope:** `GreatBuildingsService.js` (466 L) imports `gbOverviewCard`,
`renderGbInfoPanel`, `renderGbDonationPanel` (plus a public re-export of
`renderGbDonationPanel`). It also imports `City` from `StartupService` and
`GbDonationService` / `InvestedService` (msg→msg; leave those).

**Create:**

- `src/js/state/GreatBuildingsState.js`
- `src/js/ui/greatBuildingsRenderBinding.js`
- `tests/state/great-buildings-state.test.mjs`
- `tests/ui/great-buildings-render-binding.test.mjs`

**Modify:**

- `src/js/msg/GreatBuildingsService.js` — publish donors-card / info-panel /
  donation-panel payloads; keep the `export { renderGbDonationPanel } from
'../ui/renderGbDonationPanel.js';` back-compat export (a direct re-export is
  acceptable because it is re-exporting, not calling — but prefer moving the
  single consumer to import from `ui/` directly and deleting the re-export if
  nothing else depends on it; check first).
- `src/js/ui/renderBindings.js` — add the binding import.
- `docs/STATUS.md` + `docs/HANDOFF.md`.

**Tests:** migrate DOM assertions in `tests/msg/great-buildings-unified.test.mjs`,
`great-buildings-contributions.test.mjs`, `great-buildings-close-reopen.test.mjs`
to store/binding; keep `har-great-buildings-ground-truth.test.mjs` intact (pure
parsing).

**Verify:** `npm run verify` exit 0.

**Prompt:**

```text
Read AGENTS.md, docs/HANDOFF.md, and
docs/plans/2026-09-12-f2-reactive-decoupling-session-plan.md (Session 2 + "The
Established Pattern"). Decouple src/js/msg/GreatBuildingsService.js from
src/js/ui/. Create state/GreatBuildingsState.js + ui/greatBuildingsRenderBinding.js
modeled on ArmyState.js/armyRenderBinding.js, with channels for the donors card
(gbOverviewCard), the info panel (renderGbInfoPanel), and the donation panel
(renderGbDonationPanel). Replace direct renderer calls with publishes. Check
whether the `export { renderGbDonationPanel }` re-export still has consumers;
if none, remove it, otherwise keep it as a pure re-export. Migrate DOM-asserting
tests (great-buildings-unified, great-buildings-contributions,
great-buildings-close-reopen) to the store/binding; do not weaken the HAR
ground-truth parsing test. Register the binding in src/js/ui/renderBindings.js.
Add store + binding test suites. Grep-verify zero ../ui/ imports in the service.
Run `npm test` then `npm run verify`; report counts and exit code. Update
STATUS/HANDOFF. Do not commit.
```

---

## Session 3 — Guild Battlegrounds (`GuildBattlegroundService`)

**Scope:** `GuildBattlegroundService.js` (507 L) imports `gbgProvinceView`,
`renderBattlegroundResultCard`, `renderBattlegroundsPanel`,
`renderTargetGeneratorCard` — the largest edge count. Keep the service under the
600-line cap.

**Create:**

- `src/js/state/GuildBattlegroundState.js`
- `src/js/ui/gbgRenderBinding.js`
- `tests/state/guild-battleground-state.test.mjs`
- `tests/ui/gbg-render-binding.test.mjs`

**Modify:**

- `src/js/msg/GuildBattlegroundService.js` — publish `'province'`, `'result'`,
  `'leaderboard'`, `'targets'` channels. If the file stays > 580 lines after the
  edit, extract the smallest self-contained helper into `src/js/msg/` and note it.
- `src/js/ui/renderBindings.js` — add the binding import.
- `docs/STATUS.md` + `docs/HANDOFF.md`.

**Tests:** migrate source-coupled assertions in
`tests/msg/guild-battleground-signals.test.mjs` and
`tests/ui/gbg-province-view.test.mjs` that read the service module for renderer
wiring; keep `guild-battleground-guards.test.mjs` (pure guards) intact.

**Verify:** `npm run verify` exit 0.

**Prompt:**

```text
Read AGENTS.md, docs/HANDOFF.md, and
docs/plans/2026-09-12-f2-reactive-decoupling-session-plan.md (Session 3 + "The
Established Pattern"). Decouple src/js/msg/GuildBattlegroundService.js from
src/js/ui/ (currently imports gbgProvinceView, renderBattlegroundResultCard,
renderBattlegroundsPanel, renderTargetGeneratorCard). Create
state/GuildBattlegroundState.js with channels province/result/leaderboard/targets
and ui/gbgRenderBinding.js, following ArmyState.js/armyRenderBinding.js. Replace
direct renderer calls with publishes. Keep the service <= 600 lines; if needed,
extract a small helper into src/js/msg/ and say which. Migrate source-coupled
test assertions (guild-battleground-signals, gbg-province-view) to the
store/binding; keep guard tests intact. Register the binding in
src/js/ui/renderBindings.js. Add store + binding suites. Grep-verify zero ../ui/
imports in the service. Run `npm test` then `npm run verify`; report counts and
exit code. Update STATUS/HANDOFF. Do not commit.
```

---

## Session 4 — Guild Expedition (`GuildExpeditionService`)

**Scope:** `GuildExpeditionService.js` (138 L) imports `expeditionTables` and
`renderExpeditionPanel`. **Blocker (read first):** its tests import the service
with a cache-buster (`?t=…`) to get fresh module-level caches; moving caches to
a singleton removes per-import isolation. This session must first add a
`reset()` (or `resetCaches()`) to the new store and call it in every test's
`beforeEach`, then migrate the 380-line `guild-expedition-trial.test.mjs`
synchronous-DOM assertions to the binding.

**Create:**

- `src/js/state/ExpeditionState.js` (with `reset()`)
- `src/js/ui/expeditionRenderBinding.js`
- `tests/state/expedition-state.test.mjs`
- `tests/ui/expedition-render-binding.test.mjs`

**Modify:**

- `src/js/msg/GuildExpeditionService.js` — publish parsed expedition payloads.
- `tests/msg/guild-expedition-trial.test.mjs` — reset store in `beforeEach`,
  assert store payload + binding render instead of synchronous DOM.
- `src/js/ui/renderBindings.js`, `docs/STATUS.md`, `docs/HANDOFF.md`.

**Note:** `src/js/parsers/expeditionParser.js` already exists (F2-prep) — keep
using it; do not move parsing back into `ui/`.

**Verify:** `npm run verify` exit 0.

**Prompt:**

```text
Read AGENTS.md, docs/HANDOFF.md, and
docs/plans/2026-09-12-f2-reactive-decoupling-session-plan.md (Session 4 + "The
Established Pattern", including the GE test-isolation lesson). Decouple
src/js/msg/GuildExpeditionService.js from src/js/ui/expeditionTables.js and
ui/renderExpeditionPanel.js. Create state/ExpeditionState.js (with an explicit
reset() so per-import cache isolation is replaced by deterministic resets) and
ui/expeditionRenderBinding.js, following ArmyState.js. Before migrating, update
tests/msg/guild-expedition-trial.test.mjs: call the new reset() in beforeEach,
stop using the ?t= cache-buster for cache isolation where possible, and assert
the store payload plus binding render instead of synchronous DOM. Keep
src/js/parsers/expeditionParser.js as the parser. Register the binding in
src/js/ui/renderBindings.js. Add store + binding suites. Grep-verify zero ../ui/
imports in the service. Run `npm test` then `npm run verify`; report counts and
exit code. Update STATUS/HANDOFF. Do not commit.
```

---

## Session 5 — City Production / Invested / Quest

**Scope:** Three related small services that consume shared reward/galaxy
renderers:

- `CityProductionService.js` → `RewardRenderer`, `renderGalaxyPanel` (and
  imports `updateGalaxy` from `StartupService`).
- `InvestedService.js` (82 L) → lazy `renderInvestedPanel`.
- `QuestService.js` (227 L) → lazy `RewardRenderer`.

**Create per service:** `state/CityProductionState.js`,
`state/InvestedState.js`, `state/QuestState.js`;
`ui/cityProductionRenderBinding.js`, `ui/investedRenderBinding.js`,
`ui/questRenderBinding.js`; and matching `tests/state/*`, `tests/ui/*`.

**Modify:** the three services (publish payloads), `src/js/ui/renderBindings.js`,
`docs/STATUS.md`, `docs/HANDOFF.md`.

**Tests:** migrate `tests/msg/invested-service.test.mjs` and any
`city-production` DOM assertions to the bindings. Note the `RewardRenderer` is
shared with `quest` and `cityProduction` in `index.js` — do not double-subscribe;
one binding per store.

**Verify:** `npm run verify` exit 0.

**Prompt:**

```text
Read AGENTS.md, docs/HANDOFF.md, and
docs/plans/2026-09-12-f2-reactive-decoupling-session-plan.md (Session 5 + "The
Established Pattern"). Decouple three services from src/js/ui/:
CityProductionService.js (RewardRenderer, renderGalaxyPanel),
InvestedService.js (renderInvestedPanel), and QuestService.js (RewardRenderer).
For each, create state/<Domain>State.js + ui/<domain>RenderBinding.js following
ArmyState.js/armyRenderBinding.js, and replace direct renderer calls with
publishes. Beware the shared RewardRenderer: keep one subscription per store so
index.js bootstrap does not double-render. Migrate tests/msg/invested-service.test.mjs
and any city-production DOM assertions to the bindings. Register all three
bindings in src/js/ui/renderBindings.js. Add store + binding suites. Grep-verify
zero ../ui/ imports in all three services. Run `npm test` then `npm run verify`;
report counts and exit code. Update STATUS/HANDOFF. Do not commit.
```

---

## Session 6 — Other Player / Visited City (`OtherPlayerService`)

**Scope:** `OtherPlayerService.js` (509 L) lazily requires
`renderLiveCityStats` (line 279) and imports `ui/playerTooltip`. This is the
same `renderLiveCityStats` pattern used by `EmissaryService`, which already
routes through `StartupRenderState.requestCityStatsRepaint()` — reuse it rather
than creating a new store where possible. The visited-player card additionally
needs a store channel for its own payload.

**Create:**

- `src/js/state/VisitedCityState.js`
- `src/js/ui/visitedCityRenderBinding.js`
- `tests/state/visited-city-state.test.mjs`
- `tests/ui/visited-city-render-binding.test.mjs`

**Modify:**

- `src/js/msg/OtherPlayerService.js` — publish the visited-city payload; for the
  own-city repaint call `startupRenderState.requestCityStatsRepaint()` (or a new
  `setCityStatsContext`) instead of requiring `renderLiveCityStats`; move
  `playerTooltip` usage behind the binding or an injected dependency.
- `src/js/ui/renderBindings.js`, `docs/STATUS.md`, `docs/HANDOFF.md`.

**Tests:** migrate `tests/msg/other-player-service.test.mjs` and
`other-player-service-shield-countdown.test.mjs` DOM assertions.

**Verify:** `npm run verify` exit 0.

**Prompt:**

```text
Read AGENTS.md, docs/HANDOFF.md, and
docs/plans/2026-09-12-f2-reactive-decoupling-session-plan.md (Session 6 + "The
Established Pattern"). Decouple src/js/msg/OtherPlayerService.js from
src/js/ui/ (lazy renderLiveCityStats at ~line 279, plus ui/playerTooltip).
First check EmissaryService.js: it already repaints city stats via
state/StartupRenderState.js requestCityStatsRepaint() — reuse that path instead
of a new store. Create state/VisitedCityState.js + ui/visitedCityRenderBinding.js
for the visited-player card payload (follow ArmyState.js), and route the
own-city repaint through StartupRenderState. Move playerTooltip usage behind the
binding or inject it. Migrate tests/msg/other-player-service*.test.mjs DOM
assertions to the store/binding. Register the binding in
src/js/ui/renderBindings.js. Add store + binding suites. Grep-verify zero ../ui/
imports in the service. Run `npm test` then `npm run verify`; report counts and
exit code. Update STATUS/HANDOFF. Do not commit.
```

---

## Session 7 — Outpost / Cultural (`OutpostService`)

**Scope:** `OutpostService.js` (321 L) imports `renderCulturalPanel`. Preserve
the public `renderCulturalPanel` / `setShowOptions` API (B5 contract) via
re-exports.

**Create:**

- `src/js/state/OutpostState.js`
- `src/js/ui/outpostRenderBinding.js`
- `tests/state/outpost-state.test.mjs`
- `tests/ui/outpost-render-binding.test.mjs`

**Modify:** `src/js/msg/OutpostService.js`, `src/js/ui/renderBindings.js`,
`docs/STATUS.md`, `docs/HANDOFF.md`. Migrate `tests/msg/outpost-service.test.mjs`.

**Verify:** `npm run verify` exit 0.

**Prompt:**

```text
Read AGENTS.md, docs/HANDOFF.md, and
docs/plans/2026-09-12-f2-reactive-decoupling-session-plan.md (Session 7 + "The
Established Pattern"). Decouple src/js/msg/OutpostService.js from
src/js/ui/renderCulturalPanel.js. Create state/OutpostState.js +
ui/outpostRenderBinding.js following ArmyState.js/armyRenderBinding.js, and
publish the cultural-outpost payload. Preserve the public renderCulturalPanel and
setShowOptions re-exports/internal API. Migrate tests/msg/outpost-service.test.mjs
DOM assertions. Register the binding in src/js/ui/renderBindings.js. Add store +
binding suites. Grep-verify zero ../ui/ imports in the service. Run `npm test`
then `npm run verify`; report counts and exit code. Update STATUS/HANDOFF. Do
not commit.
```

---

## Session 8 — Resource / Goods (`ResourceService`)

**Scope:** `ResourceService.js` (305 L) imports `renderGoodsPanel` and
`renderResourcePanel`. Preserve the ephemeral goods-panel lock
(`isGoodsPanelUnlocked` / `unlockGoodsPanel` / `lockGoodsPanel`) and the market
trigger regression (`tests/msg/resource-market-trigger.test.mjs`).

**Create:**

- `src/js/state/ResourceState.js`
- `src/js/ui/resourceRenderBinding.js`
- `tests/state/resource-state.test.mjs`
- `tests/ui/resource-render-binding.test.mjs`

**Modify:** `src/js/msg/ResourceService.js`, `src/js/ui/renderBindings.js`,
`docs/STATUS.md`, `docs/HANDOFF.md`.

**Verify:** `npm run verify` exit 0; `resource-market-trigger` green.

**Prompt:**

```text
Read AGENTS.md, docs/HANDOFF.md, and
docs/plans/2026-09-12-f2-reactive-decoupling-session-plan.md (Session 8 + "The
Established Pattern"). Decouple src/js/msg/ResourceService.js from
src/js/ui/renderGoodsPanel.js and ui/renderResourcePanel.js. Create
state/ResourceState.js + ui/resourceRenderBinding.js following ArmyState.js, with
separate channels for the goods inventory and the resource/market panel. Preserve
the ephemeral goods lock API (isGoodsPanelUnlocked/unlockGoodsPanel/lockGoodsPanel)
and the market-trigger behavior (tests/msg/resource-market-trigger.test.mjs must
stay green). Register the binding in src/js/ui/renderBindings.js. Add store +
binding suites. Grep-verify zero ../ui/ imports in the service. Run `npm test`
then `npm run verify`; report counts and exit code. Update STATUS/HANDOFF. Do not
commit.
```

---

## Session 9 — Startup render orchestration (`StartupRenderOrchestrator`)

**Scope:** `StartupRenderOrchestrator.js` (211 L) lazily requires
`ui/startupMetadataLoading`. This module already coordinates `StartupRenderState`
metadata renders; publish the loading-status payload through a channel instead of
requiring the UI helper.

**Create:**

- `src/js/state/StartupLoadingState.js` (or extend `StartupRenderState` with a
  `'metadata-loading'` channel — prefer the extension to avoid a store per
  concern)
- `src/js/ui/startupMetadataLoadingBinding.js`
- `tests/state/*`, `tests/ui/*`

**Modify:** `src/js/msg/StartupRenderOrchestrator.js`,
`src/js/ui/renderBindings.js`, `docs/STATUS.md`, `docs/HANDOFF.md`. Migrate
`tests/msg/startup-render-barrier.test.mjs` assertions if needed.

**Verify:** `npm run verify` exit 0.

**Prompt:**

```text
Read AGENTS.md, docs/HANDOFF.md, and
docs/plans/2026-09-12-f2-reactive-decoupling-session-plan.md (Session 9 + "The
Established Pattern"). Decouple src/js/msg/StartupRenderOrchestrator.js from
src/js/ui/startupMetadataLoading.js. Prefer extending the existing
state/StartupRenderState.js with a metadata-loading channel over creating a new
store; otherwise create state/StartupLoadingState.js. Add the matching render
binding and replace the lazy require with a store publish. Migrate
tests/msg/startup-render-barrier.test.mjs assertions as needed. Register the
binding in src/js/ui/renderBindings.js. Add store + binding suites. Grep-verify
zero ../ui/ imports in the service. Run `npm test` then `npm run verify`; report
counts and exit code. Update STATUS/HANDOFF. Do not commit. This session must
land before Sessions 10-11.
```

---

## Session 10 — StartupService city-stats helpers

**Scope:** `StartupService.js` (484 L) imports `buildCityStatsHTML`,
`showTooltips`, the city-stats tooltip builder, `playerTooltip`,
`renderGalaxyPanel`, `renderLiveCityStats`. Split this split-adverse file across
two sessions (10 and 11). This session handles the **city-stats HTML + tooltips**:
`cityStatsHtmlBuilder`, `cityStatsTooltips`, `components/cityStatsTooltipBuilder`,
`playerTooltip`. Use the existing `StartupRenderState` `'city-stats'` channel
where it already carries a context; publish the HTML/tooltip payload for the
binding.

**Create:** `src/js/ui/startupCityStatsRenderBinding.js` (extend
`startupRenderBinding.js` if it is the natural home), tests.

**Modify:** `src/js/msg/StartupService.js`, `src/js/ui/renderBindings.js`,
`tests/msg/startup-city-stats-aggregator.test.mjs`,
`tests/msg/startup-service-deferred-render.test.mjs`, `docs/STATUS.md`,
`docs/HANDOFF.md`.

**Verify:** `npm run verify` exit 0.

**Prompt:**

```text
Read AGENTS.md, docs/HANDOFF.md, and
docs/plans/2026-09-12-f2-reactive-decoupling-session-plan.md (Session 10 + "The
Established Pattern"). In src/js/msg/StartupService.js, decouple the city-stats
HTML + tooltip UI imports (ui/cityStatsHtmlBuilder.js, ui/cityStatsTooltips.js,
ui/components/cityStatsTooltipBuilder.js, ui/playerTooltip.js) by publishing
through the existing state/StartupRenderState.js 'city-stats' channel (extend it
with a payload field if needed) and adding ui/startupCityStatsRenderBinding.js
(or extending ui/startupRenderBinding.js). Do not touch renderGalaxyPanel or
renderLiveCityStats — those are Session 11. Migrate
startup-city-stats-aggregator/startup-service-deferred-render tests. Register any
new binding in src/js/ui/renderBindings.js. Grep-verify no ../ui/ imports remain
for these four modules. Run `npm test` then `npm run verify`; report counts and
exit code. Update STATUS/HANDOFF. Do not commit. Depends on Session 9.
```

---

## Session 11 — StartupService galaxy + live city stats

**Scope:** Remaining `StartupService.js` UI imports: `renderGalaxyPanel`,
`renderLiveCityStats` (plus `playerTooltip` if not fully moved in Session 10).
Route the galaxy payload through `state/BlueGalaxyState.js` (already exists) or
a new channel, and live city stats through `StartupRenderState`.

**Create/modify:** extend `ui/startupRenderBinding.js` / add
`ui/startupGalaxyRenderBinding.js`; modify `StartupService.js`,
`src/js/ui/renderBindings.js`, `docs/STATUS.md`, `docs/HANDOFF.md`.

**Final gate for the program:** after this session,
`grep -rnE "from '\.\./ui/|require\('\.\./ui/" src/js/msg/` must return only the
deliberately retained non-renderer cases (`ConversationService` → `AddElement`),
and `graphify-foe-info_query_graph` or a `links[]` aggregation over
`graphify-out/foe-info/graph.json` must show production `msg/ → ui/` static edges
= 0 (excluding `AddElement`). Record the final count and update the F2 section of
the audit finding.

**Verify:** `npm run verify` exit 0.

**Prompt:**

```text
Read AGENTS.md, docs/HANDOFF.md, and
docs/plans/2026-09-12-f2-reactive-decoupling-session-plan.md (Session 11 + "The
Established Pattern"). Finish decoupling src/js/msg/StartupService.js by removing
its remaining ../ui/ imports (renderGalaxyPanel, renderLiveCityStats, and any
playerTooltip left by Session 10). Route galaxy renders through
state/BlueGalaxyState.js or a dedicated channel and live city stats through
state/StartupRenderState.js, adding/extending the matching ui/ binding. Register
in src/js/ui/renderBindings.js. Then run the program-closing check:
grep -rnE "from '\.\./ui/|require\('\.\./ui/" src/js/msg/ should show only
ConversationService.js -> ui/AddElement.js (deliberately retained: element
factory, not a renderer). Refresh the FoE-Info AST and confirm production
msg/ -> ui/ static edges = 0 excluding AddElement; record the final count and
update the F2 section of graphify-out/foe-info/findings/2026-09-12-reactive-store-migration-audit.md
and docs/STATUS.md/HANDOFF.md. Run `npm test` then `npm run verify`; report
counts and exit code. Do not commit. Depends on Sessions 9 and 10.
```

---

## Program Definition of Done

- [x] `src/js/ui/renderBindings.js` is the single composition root; `index.js`
      has no bare `./ui/*RenderBinding.js` imports.
- [x] Every session's store + binding has a passing `tests/state/*` and
      `tests/ui/*` suite. (Session 5 shipped a shared `RewardState` instead of
      separate `CityProductionState`/`QuestState`; documented in STATUS.)
- [x] `grep -rnE "from '\.\./ui/|require\('\.\./ui/" src/js/msg/` returns only
      `ConversationService.js → ui/AddElement.js`.
- [x] Production `msg/ → ui/` static import edges = 0 (grep-verified; AST
      refreshed via `npm run graph:foe-info:ast`, exit 0; recorded in
      `graphify-out/foe-info/findings/2026-09-12-reactive-store-migration-audit.md`).
- [x] `calc/` purity guard (`tests/calc/calc-purity.test.mjs`) still green.
- [x] `npm run verify` exit 0 with all test counts reported per session.
- [x] `docs/STATUS.md` + `docs/HANDOFF.md` updated for each shipped batch.

**Deferred (no `msg → ui` edge):** Session 6's `VisitedCityState.js` +
`visitedCityRenderBinding.js` landed in Batch 17 (2026-09-12) — the
visited-player card now renders through the reactive store/binding rather than
the legacy `fn/renderCityStats.js` → `ui/renderCityStats.js` shim.
