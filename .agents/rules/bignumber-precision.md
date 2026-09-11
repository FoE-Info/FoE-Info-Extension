---
trigger: always_on
description: Mandate high-precision BigNumber arithmetic for all Forge Point, Great Building, and Arc boost calculations to avoid floating-point drift.
---

# Rule: BigNumber Arithmetic Precision

In Forge of Empires, Forge Points (FP) in high-level Great Buildings (Level 100+), treasury goods, and battle multipliers frequently exceed safe floating-point boundaries or introduce fractional rounding errors when calculated using standard JavaScript `Number`.

---

## 1. The BigNumber Standard

Always import and use `bignumber.js` for mathematical operations involving:
* Great Building investment rewards and 1.9x Arc multiplier boosts.
* Forge Point bank balances, daily collections, and inventory packs.
* Guild Treasury donation tallies and battleground attrition scaling.

```javascript
import BigNumber from 'bignumber.js';

// GOOD: Exact decimal arithmetic with explicit rounding
const baseReward = new BigNumber(reward.fp);
const arcMultiplier = new BigNumber(1).plus(new BigNumber(arcBonusPercent).dividedBy(100));
const safeReward = baseReward.multipliedBy(arcMultiplier).integerValue(BigNumber.ROUND_CEIL);

// BAD: Floating-point drift and incorrect rounding
const badReward = Math.ceil(reward.fp * (1 + arcBonusPercent / 100));
```

---

## 2. FoE Rounding Invariants

* **Arc Boost Contributions**: InnoGames uses ceiling rounding (`BigNumber.ROUND_CEIL`) for 1.9x investment returns.
* **Never Mix Types**: Do not mix `BigNumber` with native floats inside math expressions. Convert explicitly using `.toNumber()` or `.toString()` only at the final display/UI rendering boundary.
* **Zero & NaN Defensiveness**: Always check `.isNaN()` or `.isFinite()` before passing calculated values to DOM or storage.
