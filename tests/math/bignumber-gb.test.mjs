import assert from 'node:assert/strict';
import test from 'node:test';
import BigNumber from 'bignumber.js';

test('BigNumber GB Reward & Arc 1.9x Multiplier Precision', async (t) => {
  function calculateArcReward(baseRewardFp, arcBonusPercent) {
    const base = new BigNumber(baseRewardFp);
    const multiplier = new BigNumber(1).plus(
      new BigNumber(arcBonusPercent).dividedBy(100),
    );
    return base
      .multipliedBy(multiplier)
      .integerValue(BigNumber.ROUND_HALF_UP)
      .toNumber();
  }

  await t.test(
    'calculates exact 1.9x Arc rewards with half-up rounding (Forge-Hammer parity)',
    () => {
      // 90% Arc bonus (standard 1.9x boost)
      assert.equal(calculateArcReward(5, 90), 10); // 5 * 1.9 = 9.5 -> 10
      assert.equal(calculateArcReward(15, 90), 29); // 15 * 1.9 = 28.5 -> 29
      assert.equal(calculateArcReward(50, 90), 95); // 50 * 1.9 = 95 -> 95
      assert.equal(calculateArcReward(105, 90), 200); // 105 * 1.9 = 199.5 -> 200
      assert.equal(calculateArcReward(145, 90), 276); // 145 * 1.9 = 275.5 -> 276
      assert.equal(calculateArcReward(185, 90), 352); // 185 * 1.9 = 351.5 -> 352
    },
  );

  await t.test('calculates non-standard Arc bonuses (e.g. 80%, 91.2%)', () => {
    assert.equal(calculateArcReward(100, 80), 180);
    // 100 * 1.912 = 191.2 -> 191 with ROUND_HALF_UP (Forge-Hammer Math.round parity)
    assert.equal(calculateArcReward(100, 91.2), 191);
  });

  await t.test('prevents standard JavaScript floating point drift', () => {
    // In native JS float: 0.1 + 0.2 = 0.30000000000000004
    const floatSum = 0.1 + 0.2;
    assert.notEqual(floatSum, 0.3);

    // In BigNumber:
    const bnSum = new BigNumber('0.1').plus(new BigNumber('0.2')).toNumber();
    assert.equal(bnSum, 0.3);
  });
});

test('Great Building Safe Spot Lock Formula', async (t) => {
  /**
   * Calculates required FP for an investor to guarantee a spot (lock).
   * spotIsSafe when: remainingFPToLevel <= currentSpotInvestment
   */
  function calculateSafeInvestment(
    totalLevelCost,
    currentOwnerInvested,
    rivalInvestment,
  ) {
    const total = new BigNumber(totalLevelCost);
    const owner = new BigNumber(currentOwnerInvested);
    const rival = new BigNumber(rivalInvestment);

    const remaining = total.minus(owner);
    // Spot is secured if (remaining - rival) / 2 <= myInvestment
    // To lock: ceil((remaining + rival) / 2)
    const neededToLock = remaining
      .plus(rival)
      .dividedBy(2)
      .integerValue(BigNumber.ROUND_CEIL);
    return BigNumber.maximum(0, neededToLock).toNumber();
  }

  await t.test(
    'calculates lock investment accurately without prior rivals',
    () => {
      // GB needs 1000 total, owner put 200, 0 rival investment -> 800 remaining -> 400 needed
      assert.equal(calculateSafeInvestment(1000, 200, 0), 400);
    },
  );

  await t.test('calculates lock investment with rival competition', () => {
    // GB needs 1000 total, owner put 200 (800 remaining), rival already put 100
    // To lock ahead of rival: (800 + 100) / 2 = 450
    assert.equal(calculateSafeInvestment(1000, 200, 100), 450);
  });
});

test('Great Building Owner Safe Add Formula', async (t) => {
  function calculateOwnerSafeAdd(remaining, spotInvested, donateAmount) {
    const diff = new BigNumber(remaining)
      .plus(spotInvested || 0)
      .minus(new BigNumber(donateAmount).multipliedBy(2));
    return Math.max(0, Math.ceil(diff.toNumber()));
  }

  await t.test(
    'calculates exact owner FP needed without doubling remainder',
    () => {
      // Legacy formula: (ceil(101/2) - 40) * 2 = (51 - 40) * 2 = 22 FP
      // Exact formula: 101 - 2 * 40 = 21 FP (Forge-Hammer parity, eliminates 1 FP discrepancy)
      assert.equal(calculateOwnerSafeAdd(101, 0, 40), 21);
    },
  );

  await t.test('calculates exact owner FP with even remaining', () => {
    assert.equal(calculateOwnerSafeAdd(100, 0, 40), 20);
  });

  await t.test('returns 0 when spot is already safe', () => {
    assert.equal(calculateOwnerSafeAdd(80, 0, 40), 0);
    assert.equal(calculateOwnerSafeAdd(50, 0, 40), 0);
  });

  await t.test('accounts for existing spot investment correctly', () => {
    // 100 remaining, competitor has put 10, target donation is 40 -> 100 + 10 - 80 = 30
    assert.equal(calculateOwnerSafeAdd(100, 10, 40), 30);
  });
});
