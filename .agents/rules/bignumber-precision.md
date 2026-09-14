---
trigger: always_on
description: FoE precision math invariants (bignumber.js hybrid rounding: half-up for Arc rewards and suggested donations, ceiling for spot locks and owner safe adds) for Great Buildings and reward calculations.
---

# Rule: BigNumber Arithmetic Precision

Forge Points in high-level Great Buildings (level 100+), treasury goods, and battle multipliers exceed safe floating-point boundaries, and plain JavaScript `Number` introduces fractional rounding errors on the way.

## Rounding hybrid

Two rules, applied by value type:

- Arc reward boosts and suggested donation amounts use `BigNumber.ROUND_HALF_UP`, matching Forge-Hammer parity. Fractions at or above 0.5 round up.
- Spot-lock thresholds, owner-safe-add amounts, and sequential safe-spot locks use `BigNumber.ROUND_CEIL`. A lock the player must fully fund can never round down, or the place becomes unsnipeable on paper.

```javascript
import BigNumber from 'bignumber.js';

// Half-up for Arc rewards (Forge-Hammer parity)
const baseReward = new BigNumber(reward.fp);
const arcMultiplier = new BigNumber(1).plus(
  new BigNumber(arcBonusPercent).dividedBy(100),
);
const safeReward = baseReward
  .multipliedBy(arcMultiplier)
  .integerValue(BigNumber.ROUND_HALF_UP);
```

The owner-safe-add formula needs the direct remainder. Multiplying a ceiling-divided intermediate by 2 (`(ceil(rem/2) - donate) * 2`) doubles odd remainders and overcharges by 1 to 3 FP:

```javascript
// Exact owner FP needed to secure spot: Math.max(0, Math.ceil(rem + spot - 2 * donate))
const ownerSafeAdd = Math.max(
  0,
  Math.ceil(remaining + spotInvested - 2 * donateAmount),
);
```

## Type discipline

Never mix `BigNumber` with native floats inside an expression. Convert with `.toNumber()` or `.toString()` only at the display boundary.

Never compute Great Building contributions, boost percentages, or guild treasury goods with native numbers (`*`, `/`, `Math.ceil`, `Math.round`).

Check `.isNaN()` or `.isFinite()` before handing a calculated value to the DOM or storage.

## Named call sites

`calculateArcReward` and `calculateSuggestedDonation` use half-up. `calculateSpotLock`, `calculateOwnerSafeAdd`, and `calculateSafeSpots` use ceiling.
