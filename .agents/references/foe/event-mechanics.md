# Event Mechanics Expert Knowledge

On-demand domain knowledge and worked reasoning for the `foe-event-mechanics-expert` subagent. Operational workflow, safety invariants, and verification remain in the flat agent definition.

## Core Focus Areas

### 1. Seasonal Event RPC Services

- Events build on shared services rather than per-event `HeroEventService` classes:
  - **Quest & Challenge Backbone**: `QuestService` (`getQuestPeriods`, `getUpdates`, `getQuestCategoryTimes`) + `ChallengeService` (`getActiveChallenges`, `getOptions`) drive most seasonal content and minigame board state.
  - **Tile-Matching (Wildlife)**: Board with colored blocks, `wildlife_pop_moves`, and boosters (`wildlife_booster_hammer`, `_color_destroyer`, `_row`) — surfaced through resource/quest payloads; there is no `HeroEventService` class.
  - **Card Battlers / Board Crawlers (Fellowship)**: board/quest-driven; no hero-deck or enemy-card fields are present in captures — verify live before modeling.
  - **Wheel / Tool Mechanics (Halloween)**: the captures reference a "wheel of fortune" and throwing-knife mechanics; Archeology is unverified. Resolve exact tool names from live payloads.
  - **Town Management (St. Patrick's)**: festival currency (`st_patricks_pot_of_gold`, Fortune Coin); production-manager and boat-rate fields are not present in captures.
  - **Energy / Key Mechanics (Winter / Forge Bowl)**: winter token tiers (`winter_event_token_common`/`_rare`), `winter_master_key_parts`, `winter_snowball_blast`, `winter_sleigh_combo`; no "yards"/"touchdown" fields exist in the corpus.

### 2. Event Payload Decomposition

When an event starts, intercept and inspect the initial RPC response:

- **Event Configuration**: Total duration, daily currency allowances, incident spawn rate of event currency.
- **Current Board / State**: Board matrix, remaining currency, current grand prize progress, active daily special.
- **Action Methods**: Event-specific request methods observed in live traffic (the names above are unverified hypotheses — capture real `requestMethod` values before wiring handlers).

### 3. Mini-Game Optimization & Solver Algorithms

- **Move Value Calculations**: Compute optimal moves per event currency spent (e.g. highest prize probability or lowest currency cost per grand prize point).
- **Daily Special Tracking**: Calculate the expected return of event currency saved for a specific daily special building.
- **Milestone Calculators**: Forecast whether the player can complete the event building without diamond expenditure based on remaining quest lines and daily currency.

### 4. Implementation Guidance (Portable)

- **Calculation Engine**: Pure calculation algorithms for currency efficiency, board moves, and grand prize forecasting — purely functional, zero DOM references, unit-testable.
- **RPC Handling**: Extract and parse temporary event RPC methods into a reactive state store. Register handlers cleanly without touching monolithic orchestrators.
- **UI Presentation**: Place event panels in a dedicated collapsible card with a localized, accessible UI. Gracefully hide the event UI when the event ends, preventing stale data from rendering.

## Few-Shot Reasoning Example: Grand Prize Pacing Forecast

**Scenario:** 21-day event. Grand prize needs 280 progress points. Player is on Day 10 with 110 points and 450 event currency banked. Average efficiency is 18 currency per progress point. 11 daily quest bonuses remain (100 currency each).
**Reasoning Trace:**

1. Remaining points needed: $280 - 110 = 170\text{ points}$.
2. Total projected currency: Current ($450$) + Remaining quests ($11 \times 100 = 1100$) $= 1550\text{ currency}$.
3. Currency required at 18/pt: $170 \times 18 = 3060\text{ currency}$.
4. Deficit calculation: $1550 - 3060 = -1510\text{ currency}$ deficit.
5. Recommendation: Early alert: Free currency is insufficient to finish the building without incident luck or diamond purchase.

---
