# Antiques Dealer Expert Knowledge

On-demand domain knowledge and worked reasoning for the `foe-antiques-dealer-expert` subagent. Operational workflow, safety invariants, and verification remain in the flat agent definition.

## Core Focus Areas

### 1. Antiques Dealer Valuation Architecture & RPC Schemas

- **RPC Services & Handlers**:
  - `ItemExchangeService.getConfig`: Provides exchange slot configurations (1–5 slots based on era and questline), available exchange durations (2h, 8h, 24h), and the duration multipliers:
    - 2 Hours: `outputModifier: 1.0` (+0% bonus)
    - 8 Hours: `outputModifier: 1.25` (+25% bonus)
    - 24 Hours: `outputModifier: 1.50` (+50% bonus)
  - `ItemExchangeService.getAuction`: Live auction snapshot containing:
    - `currentBid`: Highest active player bid in Trade Coins.
    - `highestBidder`: Player identity of top bidder.
    - `transitionAt`: Unix timestamp for auction close.
    - **Payload Truth**: No anti-snipe extension seconds or historical price lists exist in the server packet. Do not hallucinate price history or extension fields.
  - `InventoryService.getItems`: Full inventory item catalog containing `id`, `asset_id`, `item_type`, `name`, and item counts.
  - **Class Naming Invariant**: There is NO `AntiquesDealerService` class in the FoE protocol. Dealer logic uses `ItemExchangeService` and `InventoryService`.

### 2. Inventory Valuation & Knapsack Optimization

- **Item Valuation Matrix**:
  - Compute Trade Coins and Gems yielded per item based on base definition, era, and rarity.
  - Apply `BigNumber.ROUND_HALF_UP` for coin/gem calculations to maintain numeric precision.
- **Exchange Batch Optimization**:
  - Formulate slot allocation as a bounded knapsack heuristic: Given $K$ available exchange slots ($1 \le K \le 5$) and duration $D \in \{2\text{h}, 8\text{h}, 24\text{h}\}$, select the item subset that maximizes total gem and coin output while honoring item locks.
- **Item Classification Triage**:
  1. **Locked / Essential (Never Scrap)**: Current event selection kits, meta combat boost buildings, and Historical Ally leveling items (Heroic Scrolls, Valor Tokens).
  2. **High-Yield Convertible**: Outdated event buildings or high-rarity decors with high Gem yields but low tile efficiency.
  3. **Pure Scrap / Junk**: Obsolete production buildings, victory towers, face of the ancients, and gates of the sun god.

### 3. Error Handling & Edge-Case Protocols

- **Missing Metadata / Unknown Entity**: If an inventory item definition is missing from the active store, fall back to default rarity appraisal without throwing an exception. Scoped logger must emit `logger.warn('Unknown entity appraisal fallback', entityId)`.
- **Zero Inventory or Empty Auction**: Safely return empty appraisal models with zero-state UI messaging; never render broken templates or throw on `null` items.

### 4. Verification & Quality Standards

- **Pure Calc Separation**: All appraisal and knapsack algorithms live in `src/js/calc/` with zero DOM or window globals.
- **Execution Yielding**: When analyzing large inventories (>500 items), yield execution using `await yieldToMain()` (`src/js/utils/scheduler.js`) to keep the extension responsive.

---

## Few-Shot Reasoning Example: Exchange Batch Yield Calculation

**Scenario:** Player selects a 24-hour exchange duration with 3 items yielding base 1,200 Trade Coins and 12 Gems.
**Reasoning Trace:**

1. Retrieve duration multiplier: For 24 hours, `outputModifier = 1.50` (+50%).
2. Apply precision rounding:
   $$\text{Final Coins} = \text{round}_{\text{half-up}}(1200 \times 1.50) = 1800\text{ Trade Coins}$$
   $$\text{Final Gems} = \text{round}_{\text{half-up}}(12 \times 1.50) = 18\text{ Gems}$$
3. Slot check: 3 items require 3 unlocked slots ($3 \le K$).
4. Return appraisal model with duration timestamp `transitionAt`.

---
