# GB Donation + Rewards Routing — Continuation Plan

**Date**: 2026-09-12
**Status**: active plan (awaiting decisions on §5)
**Baseline commit**: `421591e` — `fix(gb): restore lock-based donation NET and safe-spot targeting`

Related docs:

- [`2026-09-12-gb-donation-terminology.md`](../specs/2026-09-12-gb-donation-terminology.md) — shared vocabulary + lock/NET rules
- [`2026-09-12-gb-historical-behavior-baseline.md`](../specs/2026-09-12-gb-historical-behavior-baseline.md) — v1 / LoW-Tool behaviour + 4-way parity
- [`2026-09-12-captured-payload-panel-improvements.md`](../specs/2026-09-12-captured-payload-panel-improvements.md) — payload-driven panel roadmap

---

## 1. Decisions locked

1. **Restore v1 behaviour.** The donation panel is a **top-down cascade**: show the
   first position with `lock < remaining`, drop to the next when taken. `remaining`
   is reset per position (`total − current`), never threaded.
2. **NET = gross reward − lock.** Break-even (`NET 0`) = the Arc-boosted reward.
   `NET 0` renders as **safe / green**, never a loss.
3. The **1.9× deposit is not a NET cost** — it only feeds the
   "Add X FP to make safe for 1.9" line.
4. **Owner safe-add is exact** (`ceil(R + X − 2·dep)`), not v1's doubled
   `(lock − dep) × 2` (the 1-FP overcharge the precision rule bans).
5. **Own vs other view share one calculation.** The only own-only element is the
   "Add … to make safe" line (gated on `PlayerName === MyInfo.name`).
6. Colour: **green = profitable or safe** (`NET ≥ 0`); **red = not safe = net loss**
   (`NET < 0`).

---

## 2. Done

- **GB donation alignment** (`421591e`): selection fixed to `occupant < remaining`;
  NET measured against the lock; `safe_net` i18n key (7 languages); TS twin kept in
  parity; glossary + baseline docs added.
- **Tests**: HAR ground-truth cases, Forge-Hammer SafePlaces oracle, and a
  **4-way parity test** (`tests/math/gb-four-implementation-parity.test.mjs`) vs
  Forge-Hammer, our code, FoE-Info-original and LoW-Tool. `npm run verify` green
  (975/975).

### 4-way result (Arc 100%, rate 1.9)

| Case               | lock | gross | ours | v1 / LoW | Forge-Hammer |
| :----------------- | ---: | ----: | ---: | -------: | -----------: |
| Cosmic P3          |  494 |   520 |  +26 |      +26 |          +26 |
| Zeus P2            | 1480 |  1480 |    0 |        0 |          +74 |
| Zeus P3            |  740 |   490 | −250 |     −250 |          +24 |
| Blue Galaxy P3     |  620 |   620 |    0 |        0 |          +31 |
| Blue Galaxy P4     |  310 |   160 | −150 |     −150 |           +8 |
| edge: deposit>lock |   50 |   400 | +350 |     +350 |          +20 |
| edge: odd owner    |   51 |    40 |  +25 |      +26 |            — |

`ours == FoE-Info-original == LoW-Tool` everywhere. The only literal v1 difference
is the odd owner-add (kept exact). Forge-Hammer's verdict subtracts the deposit,
not the lock.

---

## 3. Item status (from the 2026-09-12 review exchange)

| #   | Item                                                      | Status                                                                                                                                                                                                                                                                                |
| --- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Donor view state machine + `+/-`                          | **Resolved — no change needed.** v1 behaviour (cascade + `gross − lock`, `0` = safe) is implemented and is what the user chose. The FH `NOT_POSSIBLE`/`WORSE_PROFIT` labels + `+/-` column are the _other_ model, deliberately dropped.                                               |
| 2   | Own-view routing via `calculateSafeSpots`/`getSafePlaces` | **Resolved — no change needed.** v1 used the per-place cascade; our owner add is exact and v1-equivalent. Routing through SafePlaces would move away from v1.                                                                                                                         |
| 3   | `getOtherPlayerOverview` scope                            | **Answered.** One call returns a player's **entire GB list** (9 rows of `GreatBuildingContributionRow`: player, forge_points, entity_id, city_entity_id, name, level, current_progress, max_progress). Covers GBs only, not the city/units. Enables a one-call "player GB list" card. |
| 4   | `getAvailablePackageForgePoints`                          | **Answered.** Returns your banked FP-package total (e.g. `324500`). `contributeForgePoints` is `[entityId, playerId, level, amount, <packageFlag>]`. Enables showing/spending packages from the donation card. Not yet surfaced in the UI.                                            |
| 5   | Rewards routing + feature categorization                  | **Audited — work below (§5).**                                                                                                                                                                                                                                                        |

---

## 4. Payload inventory (44 HARs → `../metadata-store/extracts/`)

| Payload                                            |  Captures | Wired?                                       |
| :------------------------------------------------- | --------: | :------------------------------------------- |
| `getConstruction`                                  |        10 | ✅ GB donation panel                         |
| `getConstructionRanking`                           |     1,962 | ✅ rankings handler                          |
| `getOtherPlayerOverview`                           |   305 × 9 | ⚠️ only registers entities (no GB list card) |
| `BlueprintService.newReward`                       |        33 | ✅ reward card (no level-closing view yet)   |
| `getAvailablePackageForgePoints`                   |        70 | ❌ unused                                    |
| `getOtherPlayerCityMapEntity`                      |      many | ✅ progress sync                             |
| `GuildRaidsOutpostService.getOutpost` / QI bundles |         7 | ✅ QI panels                                 |
| treasury / gbg / economy bundles                   | 3 / 5 / 4 | ✅ mostly wired                              |

---

## 5. Rewards routing audit (open work)

### What routes today

- `BlueprintService.newReward` → `showReward(source:'greatBuilding')` → `rewardsGeneric` ✅
- `CityProductionService.pickupProduction` → mutates `rewardsArmy`/`rewardsCity`
  directly, then `showReward(source:'pickupProduction')` (no-op branch) ⚠️

### Gaps

| Reward source       | Payload                           | Issue                                                               |
| :------------------ | :-------------------------------- | :------------------------------------------------------------------ |
| Guild Expeditions   | `GuildExpeditionService.*`        | no reward parsing; `showReward('guildExpedition')` is **dead code** |
| Guild Battlegrounds | `GuildBattlegroundService.*`      | same; `showReward('battlegrounds_conquest')` is **dead code**       |
| Quests              | `QuestService.getUpdates`         | parsed for the quest card, **never** calls `showReward`             |
| Incidents           | `HiddenRewardService.getOverview` | routed to the **incidents** panel (may be intentional)              |
| Events / challenges | `ChallengeService.*`              | not routed                                                          |
| FP packages         | `getAvailablePackageForgePoints`  | not surfaced (depends on item 4)                                    |

**Categorization problem**: buckets exist (`rewardsGE`, `rewardsGBG`, `rewardsArmy`,
`rewardsCity`, `rewardsGeneric`, `rewardsOtherPlayer`) but classification is split —
`CityProductionService` mutates its buckets itself and calls `showReward` with a
source that hits the no-op branch. `showReward`'s own `guildExpedition` /
`battlegrounds_conquest` / `otherPlayer` branches are unreachable.

### Proposed work (priority order)

1. **Single-source categorization** — make `showReward(source)` the only place that
   buckets; have `CityProductionService` pass explicit sources
   (`cityProductionArmy`, `cityProductionCity`). Contained, low risk.
2. **Quest rewards** — confirm whether `QuestService.getUpdates` carries reward
   items; if yes, route via `showReward(source:'quest')`.
3. **GE / GBG** — no captured reward RPC exists. Either add a capture + producer, or
   **delete the dead branches** to avoid false confidence.
4. **Incidents** — decide: rewards panel or incidents card only.
5. **FP packages** — surface the package balance on the donation card once item 4
   is addressed.

### Decisions needed

- (a) Implement **1** and delete the dead GE/GBG branches now?
- (b) Also chase **2** (quest rewards)?
- (c) Record a capture gap for GE/GBG reward RPCs?

---

## 6. Invariants for all work here

- Dynamic runtime metadata only — no baked game JSON in `src/`.
- BigNumber for all FP/medal/blueprint aggregation.
- Modules ≤ 600 lines; scoped `createLogger`; i18n for every new label.
- `npm run verify` green before any completion claim.
- Commit only with explicit user approval; Conventional Commits via `unslop-commit`.
