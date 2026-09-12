# Plan: Quantum Incursions (QI) Architecture

**Date**: 2026-09-12  
**Status**: Architecture baseline (Slice 1–3 scoped, not yet implemented)  
**Evidence base**: 7 live `.har` captures ingested via `scripts/ingest-hars-to-metadata.mjs` into `../metadata-store/extracts/qi/` and mirrored to `tests/fixtures/rpc/har/qi/`.

---

## 1. Scope & Evidence

Quantum Incursions is the one major subsystem with no runtime handler in `src/`
today. Seven authentic captures provide full protocol ground truth:

| Capture                                                                                | Extracted RPCs                                                                    | Fixture                                              |
| :------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------- | :--------------------------------------------------- |
| `entered quantum incursions map.har`                                                   | `GuildRaidsService.getState`, `GuildRaidsMapService.getOverview`                  | `qi/state.json`, `qi/map_overview.json`              |
| `entered Quantum Settlement.har`                                                       | `GuildRaidsMapService.getNodeExtendedInfo`, `GuildRaidsOutpostService.getOutpost` | `qi/map_overview.json`, `qi/settlement_outpost.json` |
| `collected coins production in quantum settlement.har`                                 | `CityProductionService.pickupProduction`                                          | `qi/production_pickup.json`                          |
| `opened quantum rankings.har`                                                          | `RankingService.searchRanking`, `GuildRaidsService.getState`                      | `qi/rankings.json`                                   |
| `opened quantum ranking then member contributions.har`                                 | `GuildRaidsService.getMemberActivityOverview`                                     | `qi/member_contributions.json`                       |
| `opened quantum settlement scoreboard.har`                                             | `GuildRaidsService.getMemberActivityOverview`                                     | `qi/member_contributions.json`                       |
| `placed low focus, medium focus, high focus, stop sign in QI map on blue then red.har` | `GuildRaidsMapService.setNodeTarget`                                              | `qi/node_targets.json`                               |

---

## 2. Protocol Contracts (verified from captures)

### 2.1 `GuildRaidsService.getState`

```text
{
  description, endsAt, guildRaidsType,        // "guildRaidsMiddleAges5"
  championship: { startsAt, endsAt, endsAtTimestamp, eventPassContext },
  raidInstance: {
    difficultyLevel, raidName, assetContext, eraContext, outpostContent,
    goodsResourceIds[], expiresAt, wasMapVisited, wasSettlementVisited,
    rewardDeck: { id, context, options[RewardDeckOption] },
    rewardDeckProgress: { currentPoints, targetPoints },
    freeRewardDeckRewards: { freeRewardsAmount, currentProgress, requiredProgress }
  }
}
```

### 2.2 `GuildRaidsMapService.getOverview`

```text
{
  currentNode: "b6",
  nodes: [{
    id: "e2" | "g2" | ...,                  // e* = enemy, g* = guild/blue
    state: { nodeId, state: "finished"|"open"|"blocked"|"locked",
             playersCount, indicator: { __enum__:"GuildRaidsNodeIndicator",
             value:"none"|"low"|"medium"|"high"|"avoid" } },
    type: { __class__: "GuildRaidsMapNodeStart"|"GuildRaidsMapNodeFight"|"GuildRaidsMapNodeDonation",
            requiredProgress },
    position: { x, y },
    connectedNodes: [{ targetNodeId, movementCost:{ resources:{ guild_raids_action_points } }, pathTiles[] }]
  }],
  choiceNodeRoutes: []
}
```

### 2.3 `GuildRaidsMapService.getNodeExtendedInfo(nodeId)`

```text
{ actionProgress, contributorsCount, preferredUnitIds[], preferredUnitMultiplier,
  cost: { resources: { guild_raids_action_points } },
  reward: { reward: { type, id, name, possible_rewards[] } } }
```

### 2.4 `GuildRaidsMapService.setNodeTarget(nodeId, indicator)`

```text
requestData: ["e2", { "__enum__": "GuildRaidsNodeIndicator", "value": "low"|"medium"|"high"|"avoid"|"none" }]
responseData: { "__class__": "Success" }
```

- Focus levels are **low / medium / high**.
- `avoid` is the QI equivalent of a stop sign.
- `none` clears the indicator.

### 2.5 `GuildRaidsOutpostService.getOutpost` (Quantum Settlement)

```text
{
  id, name, gridId: "guild_raids",
  populationResourceId: "guild_raids_population",
  primaryResourceId:    "guild_raids_money",
  secondaryResourceId:  "guild_raids_supplies",
  goodsResourceIds: ["guild_raids_bronze", ...],
  moodLevels: [{ id, name, threshold, productionFactor, affectedResourceProductions[] }],
  unlockedBuildings: ["W_GuildRaids<Era>_<Type>", ...],
  buildingSelectionOptions: { guildParticipantsAmount, buildingSelectionOptions, selectionOptions },
  content: { "0": ..., ... }   // placed/encoded settlement grid (needs decode pass)
}
```

### 2.6 `GuildRaidsService.getMemberActivityOverview`

```text
{ rows: [{ player: { player_id, name, avatar, era }, actionPoints, progressContribution }] }
```

### 2.7 Economy primitives

| Resource id                                     | Meaning                                       |
| :---------------------------------------------- | :-------------------------------------------- |
| `guild_raids_action_points`                     | AP spent to move/attack nodes                 |
| `guild_raids_money`                             | Quantum Coins (primary settlement production) |
| `guild_raids_supplies`                          | Quantum Supplies (secondary)                  |
| `guild_raids_medals`                            | Quantum Medals (expansion currency)           |
| `guild_raids_chrono_alloy`                      | Mood-affected advanced good                   |
| `guild_raids_bronze/honey/brick/rope/gunpowder` | Middle-Ages era goods                         |

`CityProductionService.pickupProduction(ids[])` →
`{ updatedEntities, militaryProducts }` (settlement coin harvest).

`RankingService.searchRanking({ RankingCategory: "guild_raids" }, null, guild, true, "")`
→ `{ length, rankings[], category, search_successful }`.

---

## 3. Target Module Layout

```text
src/js/protocol/routes/guildRaidsRoutes.js   // Slice 1: dispatch table (CJS, like combatRoutes)
src/js/msg/GuildRaidsService.js              // Slice 1: getState / getMemberActivityOverview
src/js/msg/GuildRaidsMapService.js           // Slice 1: getOverview / getNodeExtendedInfo / setNodeTarget
src/js/msg/GuildRaidsOutpostService.js       // Slice 1: getOutpost / pickupProduction
src/js/state/quantumState.js                 // Slice 1: reactive store (CJS, mirrors state/*)
src/js/calc/QuantumIncursionsCalculator.js   // Slice 2: pure math (no DOM, BigNumber)
src/js/ui/renderQuantumOverviewPanel.js      // Slice 3: AP/season/reward-deck panel
src/js/ui/renderQuantumTargetPanel.js        // Slice 3: node focus / stop signs / boss status
src/js/ui/renderQuantumLeaderboardPanel.js   // Slice 3: member contribution rankings
```

All files ≤ 600 lines, scoped `createLogger('...')`, all user-visible text via
`data-i18n` / `t()`, all currency aggregation via `bignumber.js`.

---

## 4. Implementation Slices

### Slice 1 — Route dispatch, state & fixtures

1. Add `guildRaidsRoutes.js` (CJS, following `combatRoutes.js`) registering:
   - `GuildRaidsService.getState`, `getMemberActivityOverview`
   - `GuildRaidsMapService.getOverview`, `getNodeExtendedInfo`, `setNodeTarget`
   - `GuildRaidsOutpostService.getOutpost`
   - `CityProductionService.pickupProduction`, `RankingService.searchRanking`
2. Wire into `registerCombatRoutes` or `legacyBridge.js` (prefer a standalone
   `registerGuildRaidsRoutes(ctx)` invoked once).
3. `quantumState.js` holds `{ season, nodesById, currentNode, targetsById,
settlement, memberActivity, rankings }` and exposes read-only accessors.
4. Fixtures already mirrored at `tests/fixtures/rpc/har/qi/*.json`; add parser
   tests asserting the contracts above.

### Slice 2 — Pure calculation engine

- `QuantumIncursionsCalculator.js`:
  - Node progress: `requiredProgress` vs `actionProgress` → percent + contributors.
  - Cost totals: sum `connectedNodes[].movementCost` + `cost.resources.guild_raids_action_points`.
  - Donation nodes: `GuildRaidsMapNodeDonation` reward projection.
  - Settlement mood: map `moodLevels.threshold` against a supplied mood factor and
    compute era-goods output with `productionFactor` (BigNumber, half-up display).
  - **Open question**: AP regeneration interval / cap is **not present** in the
    captures. Do not hardcode; derive from `TimeService`/state if it surfaces, or
    omit until captured.

### Slice 3 — Panels

- `#quantumOverview`: raid name, difficulty, `endsAt` countdown, reward-deck
  `currentPoints / targetPoints`, free-reward progress.
- `#quantumTargets`: node list with state, indicator (low/medium/high/avoid),
  AP cost, contributors; blue (`g*`) vs red (`e*`) grouping.
- `#quantumLeaderboard`: `rows[]` sorted by `progressContribution`, then
  `actionPoints`; formatted via `tabular-nums`.
- Register containers + `cardVisibility` context rules (show QI panels only in
  the quantum context, mirroring the GBG/City view filtering).

---

## 5. Invariants & Verification

1. **Dynamic runtime metadata**: no static game JSON in `src/`; every node,
   reward, and resource name resolves from the live RPC payloads.
2. **BigNumber**: AP costs, `actionProgress`, `progressContribution`, and reward
   points use `bignumber.js`; display conversions at the UI boundary only.
3. **Line caps**: ≤ 600 lines per new module.
4. **Fixtures**: `tests/fixtures/rpc/har/qi/*.json` (18 bundles total including
   GBG/treasury/economy) are the regression source of truth.
5. **Gate**: `npm run verify` must stay green per slice.
