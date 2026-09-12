import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  calculateSpotLock,
  calculateArcReward,
  calculateOwnerSafeAdd,
} = require('../../src/js/calc/GreatBuildingCalculator.js');

test('Formula parity: calculateSpotLock pins ROUND_CEIL', async (t) => {
  await t.test('locks a half point upward', () => {
    assert.equal(calculateSpotLock(101, 0), 51);
    assert.equal(calculateSpotLock(100, 1), 51);
    assert.equal(calculateSpotLock(100, 0), 50);
  });

  await t.test(
    'ceils fractional remainders where half-up would round down',
    () => {
      // 100.2 / 2 = 50.1 -> ceil 51. ROUND_HALF_UP would yield 50.
      assert.equal(calculateSpotLock(100.2, 0), 51);
      assert.notEqual(calculateSpotLock(100.2, 0), 50);
      // 0.1 remainder added to a fractional spot stays ceil-locked.
      assert.equal(calculateSpotLock(100.4, 0.1), 51);
    },
  );

  await t.test('never returns a lock below zero', () => {
    assert.equal(calculateSpotLock(0, 0), 0);
  });
});

test('Formula parity: calculateArcReward pins ROUND_HALF_UP', async (t) => {
  await t.test('rounds .5 rewards up (never floored)', () => {
    assert.equal(calculateArcReward(5, 90), 10); // 9.5
    assert.equal(calculateArcReward(105, 90), 200); // 199.5
    assert.equal(calculateArcReward(1, 50), 2); // 1.5
  });

  await t.test(
    'rounds sub-half rewards down where ceiling would overshoot',
    () => {
      // 100 * (1 + 0.912) = 191.2 -> 191 half-up. ROUND_CEIL would yield 192.
      assert.equal(calculateArcReward(100, 91.2), 191);
      assert.notEqual(calculateArcReward(100, 91.2), 192);
    },
  );

  await t.test('honours non-standard Arc percentages exactly', () => {
    assert.equal(calculateArcReward(100, 80), 180);
    assert.equal(calculateArcReward(50, 90), 95);
  });
});

test('Formula parity: calculateOwnerSafeAdd uses direct remainder', async (t) => {
  await t.test('avoids the legacy odd-remainder 1 FP doubling bug', () => {
    // Legacy: (ceil(101/2) - 40) * 2 = 22 FP. Direct: 101 - 2*40 = 21 FP.
    assert.equal(calculateOwnerSafeAdd(101, 0, 40), 21);
    assert.notEqual(calculateOwnerSafeAdd(101, 0, 40), 22);
  });

  await t.test(
    'computes exact owner adds for even and spot-invested cases',
    () => {
      assert.equal(calculateOwnerSafeAdd(100, 0, 40), 20);
      assert.equal(calculateOwnerSafeAdd(100, 10, 40), 30);
    },
  );

  await t.test('returns zero when the spot is already safe', () => {
    assert.equal(calculateOwnerSafeAdd(80, 0, 40), 0);
    assert.equal(calculateOwnerSafeAdd(50, 0, 40), 0);
  });

  await t.test('ceils fractional remainders', () => {
    assert.equal(calculateOwnerSafeAdd(100.2, 0, 0), 101);
  });
});

test('Formula parity: native float drift guard', async (t) => {
  await t.test('BigNumber keeps 0.1 + 0.2 exact', () => {
    assert.notEqual(0.1 + 0.2, 0.3);
    const BigNumber = require('bignumber.js');
    assert.equal(new BigNumber('0.1').plus('0.2').toNumber(), 0.3);
  });
});
