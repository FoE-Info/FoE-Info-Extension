---
trigger: model_decision
description: FoE precision math invariants (bignumber.js hybrid rounding — half-up for Arc rewards and suggested donations, ceiling for spot locks and owner safe adds) for Great Buildings and reward calculations.
---

# Rule: BigNumber Arithmetic Precision

In Forge of Empires, Forge Points (FP) in high-level Great Buildings (Level 100+), treasury goods, and battle multipliers frequently exceed safe floating-point boundaries or introduce fractional rounding errors when calculated using standard JavaScript `Number`.

---

## 1. The FoE Mathematical Rounding Hybrid

FoE-Info implements a deliberate two-rule rounding hybrid, matching Forge-Hammer parity for rewards while guaranteeing lock-safety for owner-funded spots:

* **Half-up for rewards and donations** (`BigNumber.ROUND_HALF_UP`): Standard mathematical rounding for Arc reward boosts and suggested donation amounts. Fractional values $\ge 0.5$ round up, while $< 0.5$ round down.
* **Ceiling for locks and owner adds** (`BigNumber.ROUND_CEIL`): Spot-lock thresholds, owner-safe-add amounts, and sequential safe-spot lock math. A lock you must fully fund can never be rounded down; flooring would leave the place theoretically unsnipeable.
* **Mandatory `bignumber.js`**: Always import and use `bignumber.js` for all FP calculations, Arc boosts, Great Building levels, and investment calculations:
```javascript
import BigNumber from 'bignumber.js';

// Half-up for Arc rewards (Forge-Hammer parity)
const baseReward = new BigNumber(reward.fp);
const arcMultiplier = new BigNumber(1).plus(new BigNumber(arcBonusPercent).dividedBy(100));
const safeReward = baseReward.multipliedBy(arcMultiplier).integerValue(BigNumber.ROUND_HALF_UP);
```
* **Owner Safe Add Formula**: Never multiply intermediate ceiling-divided numbers by 2 (e.g. `(ceil(rem/2) - donate) * 2`), as odd remainders double and cause 1–3 FP overcharges. Always compute direct remainder:
```javascript
// Exact owner FP needed to secure spot: Math.max(0, Math.ceil(rem + spot - 2 * donate))
const ownerSafeAdd = Math.max(0, Math.ceil(remaining + spotInvested - 2 * donateAmount));
```
* **Never Mix Types**: Do not mix `BigNumber` with native floats inside math expressions. Convert explicitly using `.toNumber()` or `.toString()` only at the final display/UI rendering boundary.
* **Never Use Native Floats for Rewards**: Never calculate Great Building FP contributions, boost percentages, or guild treasury goods using native JavaScript numbers (`*`, `/`, `Math.ceil`, `Math.round`).

---

## 2. Common Precision Invariants

* **Half-up for Arc boosts and suggested donations**: Always use `BigNumber.ROUND_HALF_UP` for Arc rewards and rate suggestions (e.g. `calculateArcReward`, `calculateSuggestedDonation`).
* **Ceiling for locks and owner adds**: Always use `BigNumber.ROUND_CEIL` for spot locks, owner-safe-add amounts, and sequential safe-spot lock thresholds (e.g. `calculateSpotLock`, `calculateOwnerSafeAdd`, `calculateSafeSpots`) — a lock must always be fully funded, never rounded down.
* **Zero & NaN Defensiveness**: Always check `.isNaN()` or `.isFinite()` before passing calculated values to DOM or storage.