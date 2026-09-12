# Payload-Driven Architecture Improvements

**Date**: 2026-09-12
**Status**: Analysis complete — report-mode tooling landed; no runtime change, no commit.
**Evidence base**: 44 live `.har` captures (2.3 GB, git-ignored `docs/har/`), extracted by
`scripts/ingest-hars-to-metadata.mjs` into `../metadata-store/extracts/` (49 MB, 103 unique RPCs,
27 domain bundles, 13 visited cities), and indexed as first-class nodes into
`../metadata-store/graphify-out/graph.json`.

This is the **architecture-level** companion to
[`2026-09-12-captured-payload-panel-improvements.md`](2026-09-12-captured-payload-panel-improvements.md)
(which maps captures to individual panels). This document answers: _what does the captured traffic
let us change about how the codebase is structured?_

---

## 1. The Two Knowledge Sources (and what each is actually good for)

| Source                  | Location                                    | Nature                                                                                                            | Authority                                                 |
| :---------------------- | :------------------------------------------ | :---------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------- |
| **Live captures**       | `docs/har/` → `../metadata-store/extracts/` | recordings of real server RPC responses **and** request payloads (`rpc/_action_request_samples.json`, 36 actions) | **Ground truth for traffic shape**                        |
| **Metadata graph**      | `../metadata-store/graphify-out/graph.json` | 5,499 nodes / 46,623 edges / 383 communities, 100% EXTRACTED                                                      | **Identity & provenance index — not a formula authority** |
| **Extension AST graph** | `graphify-out/foe-info/graph.json`          | 2,948 nodes / 4,778 edges / 250 communities                                                                       | code topology                                             |

The distinction matters: the metadata graph answers _"which building/era/resource is this ID, and
which RPC carried it?"_. It does **not** model GB economics — the Arc multiplier, rank-reward curve,
level costs, spot locks, or owner-safe-add are absent as nodes/edges (see
`../metadata-store/graphify-out/findings/2026-09-12-gb-safe-spot-reward-authority.md`). Do not try to
source calculations from the graph; use captured payloads as **test oracles** instead.

---

## 2. Metadata Graph Tour (current state)

Node composition: 2,787 `BuildingEntity`, 569 `research`, 483 `BuildingUpgradeKit`, 442 `SelectionKit`,
356 `Resource`, 188 `MilitaryUnit`, 49 `GreatBuilding`, 41 `HistoricalAlly`, plus the payload layer:
**103 `NetworkRPCPayload`**, 70 `RPCPayload`, 27 `PayloadBundle`, 13 `PlayerCitySnapshot`.

- **Communities** are themed (e.g. `City Core and Streets`, `Space Age Buildings`, `Settlement
Buildings`, `Autumn Event Relics`). Payload nodes scatter across communities by the entities they
  reference, so a single domain (e.g. Great Buildings) is split across several.
- **Payload→entity edges are string matches on IDs** (`building_id`, `city_entity_id`, `min_era`,
  `goodsResourceIds`). Flat arrays expand (`getOtherPlayerOverview` → 49 GB edges); nested arrays
  collapse to a single representative edge (`getConstruction` → 1 edge despite referencing Zeus,
  Cosmic Catalyst and Blue Galaxy inside `rankings[].reward.blueprintRewards[].building_id`).
- **False positives exist** (e.g. a player `name` string matched to a visited-city node), so graph
  links are _candidates_, not authority.

### Graph hygiene issues to fix

1. **Duplicate provenance**: 103 captured `NetworkRPCPayload` vs 70 baseline `RPCPayload` with **61
   overlapping labels** — the same RPC exists as two nodes (`extracts/rpc/...` vs `rpc/...`),
   weakening degree/community reads.
2. **Stale generated report**: `GRAPH_SUMMARY.md` claims 219,445 links and Forge Points degree 18,906,
   while the live graph reports 46,623 edges and degree 111. The human-readable report is not
   trustworthy.
3. **No semantics for economics**: no `RankRewardCurve`/`reward_for` edges; reward arrays live only
   as opaque `data` blobs.

---

## 3. The Architectural Thesis

The extension pipeline is:

```
game server → xhrInterceptor → contentBridge → MessageDispatcher
            → protocol/routes/* → msg/*Service → state → calc/* → ui/*
```

Today several layers are built on **assumptions** about that traffic. The captures replace assumptions
with recordings. Concretely, each layer improves as follows.

### 3.1 Routing / dispatch — make the traffic a contract

The captures enumerate the exact RPCs that occur (103). Diffing against the runtime-registered set (99)
exposes:

- **45 captured RPCs with no handler** — of which the panel-relevant ones are:
  - QI: `GuildRaidsOutpostService.getOutpost`, `GuildRaidsMapService.setNodeTarget`, `getNodeExtendedInfo`.
  - GBG live actions: `GuildBattlegroundBuildingService.place` / `destroy` / `instantFinish`.
  - `GreatBuildingsService.getAvailablePackageForgePoints`, `TimerService.getTimers`,
    `RankingService.newRank`, `NoticeIndicatorService.getPlayerNoticeIndicators`,
    `OtherPlayerService.getSocialList` / `updateActions`.
- **41 registered RPCs never captured** — stale or speculative aliases. Confirmed examples:
  `ResourceService.getTreasuryBag` (real traffic is `ClanService.getTreasuryBag`),
  `GuildBattlegroundService.getBuildings` / `getState` (real classes are
  `GuildBattlegroundBuildingService` / `GuildBattlegroundStateService`), `TimeService.getTime` vs
  `updateTime`, `ClanService.getClanData` vs `getOwnClanData`, `StartupService.getOverview` vs `getData`.
- **14 duplicate registrations** silently chained by `MessageDispatcher.register`
  (`MessageDispatcher.js:45-66`), including `ClanService.getTreasuryBag`, `TradeService.getTradeOffers`,
  `ResourceService.getPlayerResourceBag`, `RankingService.searchRanking`. This is the D2 defect class.

### 3.2 Parsing — replace shape heuristics with captured shapes

`combatRoutes.js:38-144` (`extractSignalData`) is ~100 lines of defensive guessing. The captured
request samples pin the shapes exactly:

| RPC                                                          | Captured `requestData` shape                               |
| :----------------------------------------------------------- | :--------------------------------------------------------- |
| `GuildBattlegroundSignalsService.setSignal`                  | `[[provinceId, "focus"\|"ignore"], …]`                     |
| `GuildBattlegroundSignalsService.removeSignal`               | `[[provinceId], …]`                                        |
| `GuildBattlegroundBuildingService.place`                     | `[[provinceId, buildingId], …]`                            |
| `GuildBattlegroundBuildingService.destroy` / `instantFinish` | `[[provinceId, slotId], …]`                                |
| `GuildRaidsMapService.setNodeTarget`                         | `[[nodeId, {value: "low"\|"medium"\|"high"\|"avoid"}], …]` |
| `GreatBuildingsService.getConstructionRanking`               | `[[entityId, playerId, level], …]`                         |

Deterministic parsers driven by these shapes move domain knowledge out of blanket heuristics and into
`protocol/routes/` adapters that can be unit-tested against fixtures.

### 3.3 Calculation — captured server numbers as test oracles

Captures contain server-authoritative rewards (`getConstructionRanking` →
`rankings[].reward.strategy_point_amount`, `BlueprintService.newReward` → medals/blueprints). The
observed rank fractions are consistent with `1 : 0.5 : 0.1667 : 0.04 : 0.008`. These become fixtures
that pin the BigNumber model in `src/js/calc/GreatBuildingCalculator.js`; the 1.9x/2.0x Arc multiplier
cannot be corroborated from the graph or these captures alone.

### 3.4 UI / state — panel → payload mapping

Every panel is fed by specific RPCs. The unhandled GBG action RPCs explain why the GBG panel cannot
update live after builds/destroys; handling them removes a class of manual-refresh/desync bugs. Mapping
panel → payload should drive a `cardVisibility`-style declarative refresh table rather than ad-hoc
re-render calls.

### 3.5 Metadata/resolution — accurate field resolution

Graph edges confirm which payload field maps to which building/era/resource. Use this to validate
`MetadataResolver` output, but parse nested fields directly (`blueprintRewards[].building_id`) rather
than trusting the lossy graph edges.

### 3.6 Testing — the largest durable payoff

Captures become a permanent regression suite under `tests/fixtures/rpc/har/`. Coverage today:

| Domain bundle     | Fixture  | Ground-truth test                                     |
| :---------------- | :------- | :---------------------------------------------------- |
| `gbg/`            | yes      | `tests/msg/har-gbg-ground-truth.test.mjs`             |
| `greatbuildings/` | yes      | `tests/msg/har-great-buildings-ground-truth.test.mjs` |
| `treasury/`       | yes      | `tests/msg/har-treasury-pagination.test.mjs`          |
| `visits/`         | yes (13) | `tests/fn/har-visited-cities.test.mjs`                |
| `qi/`             | yes      | **none**                                              |
| `economy/`        | yes      | **none**                                              |

`qi/` and `economy/` are the highest-value untested domains.

---

## 4. Delivered in Report Mode

- `scripts/rpc-contract.mjs` — drives the real registration path (`registerAllServices` +
  `registerLegacyBridge`) against a fake dispatcher + proxy handlers to capture the exact registered
  set, then diffs against `tests/fixtures/rpc/captured-rpcs.json` (103 keys, checked in so tooling does
  not depend on the 49 MB sibling store). Supports `--json` and `--check`.
- `scripts/rpc-contract.config.json` — allowlist policy (`ignoreClasses`, `allowUnhandled`,
  `allowStale`, `allowDuplicates`); intentionally empty pending triage.
- `tests/agents/rpc-contract.test.mjs` — 8 tests for the analysis rules, fixture integrity, and live
  collection.
- `package.json` — `npm run rpc:contract`. **Not** wired into `npm run verify` yet.
- Verification: `npm run verify` exit 0 (967/967 tests, prettier clean, eslint 0 errors, dev build).

---

## 5. Prioritized Roadmap

1. **Triage the contract and enforce it** — populate `rpc-contract.config.json`, resolve the 41 stale
   aliases (prune or rename), record intentional exemptions, then add `rpc:contract --check` to the
   `verify` chain.
2. **Fixture-driven parsers** — replace `combatRoutes.extractSignalData` and the QI/GBG action
   heuristics with deterministic adapters backed by `rpc/_action_request_samples.json`.
3. **Close the untested bundles** — add contract tests for `qi/` and `economy/`; use captured rank
   rewards as the GB calculation oracle.
4. **Panel → payload refresh map** — handle `place`/`destroy`/`instantFinish` and the QI target RPCs so
   panels update from the event stream.
5. **Graph hygiene** — de-duplicate `NetworkRPCPayload` vs `RPCPayload` provenance, regenerate
   `GRAPH_SUMMARY.md`, and (optional, Graphify-side) emit `reward_for`/`RankRewardCurve` semantics for
   nested reward arrays.

---

## 6. Invariants

- Dynamic runtime metadata only: no captured/preseeded game JSON in `src/`; captures are test fixtures.
- BigNumber for all FP/medal/blueprint aggregation; half-up rewards, ceiling locks.
- New modules ≤ 600 lines, scoped `createLogger`, i18n for every new label.
- No commit/push without explicit user approval; one verified change at a time.
