# Guild Expedition Engineering Knowledge

On-demand domain knowledge and worked reasoning for the `guild-expedition` topic handled by `foe-combat-analyst`. Operational workflow, safety invariants, and verification remain in the flat agent definition and topic profile.

## Authoritative Game Domain Knowledge

### 1. Trials & Encounter Progression (Levels 1–5)

- **Trial Structure**: 16 encounters per level across 5 full levels (80 encounters total).
  - Levels 1 to 4: Standard attacking army boosts apply for combat encounters.
  - Level 5: Special defensive combat mechanics apply — encounters utilize the player's **City Defending Army boosts** (defending army attack and defense) rather than attacking boosts.
- **Level 5 Fortifications & Rituals**:
  - Construction of fortifications on the map grid using goods or diamonds.
  - Fortifications provide combat boost bonuses or eliminate negotiation resource options.
  - Optimization model: evaluate net era goods expenditure between building tactical fortifications versus direct negotiation.

### 2. Negotiation Solver & Odds Matrix

- **Encounter Mechanics**:
  - Standard negotiation allows 3 turns (extended to 4 turns when Friends Tavern negotiation boost is active).
  - Responses per slot: `correct` (resource and slot locked), `wrong_person` (resource valid for encounter, but wrong person), `nobody_wants` (resource eliminated from all unsolved slots).
- **Optimization Strategy**:
  - Probability engine models remaining candidate sets across turns.
  - Minimizes high-tier and next-era goods usage while maximizing resolution odds on turns 2 and 3.

### 3. Temple of Relics (ToR) Mechanics

- **Relic Generation**:
  - Evaluates spawn probability upon encounter completion based on player's Temple of Relics Great Building level.
  - Relic rarities: Common, Uncommon, Rare (Jade).
  - Drop tables include Forge Points, blueprints, military units, selection kits, and building fragments.

### 4. Guild Championship & Progression Metrics

- **Championship Scoring**:
  - Calculated as percentage completion relative to guild member count.
  - Baseline 100% completion corresponds to all members finishing Level 4 (64 encounters).
  - Maximum 133.33% completion corresponds to all members finishing Level 5 (80 encounters).
- **Guild Speed & Participation**:
  - Tracks encounter completion timestamps and trial clearance times for matchup rankings.

---

## Technical Architecture & Implementation

### 1. Calculation Engine

- Pure calculation modules for negotiation candidate pruning and Temple of Relics probability tables.
- Zero DOM references; isolated unit-testable math functions.
- Goods expenditure and championship percentage calculations require deterministic precision.

### 2. Telemetry & RPC Status

- Services: `GuildExpeditionService` and `ChampionshipService` routes are registered in the protocol layer.
- Capture corpus status: Live capture payloads for full GE responses are queued for verification. Schema implementations must validate incoming response envelopes before binding UI views.

---

## Worked Reasoning Example: Negotiation Candidate Pruning

**Scenario:** 5-person negotiation encounter on Turn 1. 5 resource types: Coins, Supplies, Basmati, Spices, Lotus. Player offered Coins across all 5 slots.  
**Feedback Received:**

- Slot 1: `correct`
- Slot 2: `wrong_person`
- Slot 3: `nobody_wants`
- Slot 4: `wrong_person`
- Slot 5: `nobody_wants`

**Reasoning Trace:**

1. Slot 1 is solved (`correct`) $\to$ Lock Coins in Slot 1.
2. `nobody_wants` on Slots 3 & 5 eliminates Coins completely from any unsolved slots.
3. `wrong_person` on Slots 2 & 4 indicates Coins is wanted elsewhere, but since Coins is eliminated everywhere else by `nobody_wants`, Coins is fully resolved and locked to Slot 1.
4. Remaining candidates for Slots 2, 4, and 5: `{Supplies, Basmati, Spices, Lotus}`.
5. Turn 2 allocation: Distribute remaining 4 resources across open slots to maximize information entropy and narrow the solution space.
