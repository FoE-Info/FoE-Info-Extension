import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calculateArcReward,
  calculateDonorOutcome,
  calculateOwnerSafeAdd,
  calculateSafeSpots,
  calculateSpotLock,
  calculateSuggestedDonation,
} from '../../src/js/calc/GreatBuildingCalculator.js';

// Half-up rounding used by FH.Main.round and BigNumber.dp(0, ROUND_HALF_UP).
const r2 = (x) => Math.floor(x + 0.5);

// ---------------------------------------------------------------------------
// Oracle 1: FoE-Info-original v1  (and LoW-Tool — byte-identical math)
//   Donation = round((total-current + occupant)/2)
//   RewardFP = round(base * (1 + Arc/100))
//   Profit   = RewardFP - Donation          (0 counts as profit/green)
//   ownerAdd = (Donation - deposit) * 2     (own GB only, when positive)
// ---------------------------------------------------------------------------
function original(remaining, occupant, base, arc, percent) {
  const lock = r2((remaining + occupant) / 2);
  const gross = r2(base * (1 + arc / 100));
  const deposit = r2((base * percent) / 100);
  const profit = gross - lock;
  const ownerAdd = lock - deposit > 0 ? (lock - deposit) * 2 : 0;
  return {
    lock,
    gross,
    deposit,
    profit,
    ownerAdd,
    verdict: profit >= 0 ? 'profit' : 'loss',
  };
}
// LoW-Tool: verified byte-identical getPlaceValues/getSafe across both copies.
const lowTool = original;

// ---------------------------------------------------------------------------
// Oracle 2: Forge-Hammer donor table (calculator.js)
//   safeRankCost = round((occupant + remaining)/2)
//   donorFpReward = round(base * (1 + Forder/100))
//   fpGrossReward = round(base * (1 + Ark/100))
//   donorRankCost = min(max(donorFpReward, safeRankCost), remaining)
//   donorProfit   = fpGrossReward - donorFpReward   (NOT the lock)
// ---------------------------------------------------------------------------
function forgeHammerDonor(remaining, occupant, base, ark = 100, forder = 90) {
  const safeRankCost = r2((occupant + remaining) / 2);
  const gross = r2(base * (1 + ark / 100));
  const deposit = r2(base * (1 + forder / 100));
  const donorRankCost = Math.min(Math.max(deposit, safeRankCost), remaining);
  const donorProfit = gross - deposit;
  const notPossible = safeRankCost <= occupant;
  return {
    safeRankCost,
    gross,
    deposit,
    donorRankCost,
    donorProfit,
    notPossible,
  };
}

// Our code, wrapped to the same call shape.
function ours(remaining, occupant, base, arc = 100, percent = 190) {
  const o = calculateDonorOutcome(remaining, occupant, base, arc, percent);
  const ownerAdd = calculateOwnerSafeAdd(remaining, occupant, o.costs);
  return {
    lock: o.spotLock,
    gross: o.donorReward,
    deposit: o.costs,
    donorRankCost: o.donorRankCost,
    profit: o.donorProfit,
    net: o.net,
    ownerAdd,
    verdict: o.outcome,
  };
}

const ARC = 100;
const PCT = 190;

// Captured payload cases (all have lock >= deposit).
const captured = [
  { name: 'Cosmic Catalyst P3', remaining: 858, occupant: 130, base: 260 },
  { name: 'Statue of Zeus P2', remaining: 1480, occupant: 1480, base: 740 },
  { name: 'Statue of Zeus P3', remaining: 1480, occupant: 0, base: 245 },
  { name: 'The Blue Galaxy P3', remaining: 620, occupant: 620, base: 310 },
  { name: 'The Blue Galaxy P4', remaining: 620, occupant: 0, base: 80 },
];

describe('4-way GB parity: FH vs ours vs FoE-Info-original vs LoW-Tool', () => {
  describe('captured payloads (lock >= deposit)', () => {
    for (const c of captured) {
      it(`${c.name}: ours == original == LoW-Tool`, () => {
        const a = ours(c.remaining, c.occupant, c.base, ARC, PCT);
        const v1 = original(c.remaining, c.occupant, c.base, ARC, PCT);
        const low = lowTool(c.remaining, c.occupant, c.base, ARC, PCT);

        // Lock is identical across every implementation, including FH.
        assert.equal(a.lock, v1.lock);
        assert.equal(a.lock, low.lock);
        assert.equal(
          a.lock,
          forgeHammerDonor(c.remaining, c.occupant, c.base).safeRankCost,
        );

        // Verdict basis: ours (gross - max(deposit,lock)) == v1 (gross - lock)
        // because lock >= deposit here.
        assert.equal(a.profit, v1.profit, 'our NET should equal v1 profit');
        assert.equal(low.profit, v1.profit, 'LoW-Tool should equal v1');

        // Owner add: exact vs v1 (lock-deposit)*2 — equal on these (even) cases.
        assert.equal(a.ownerAdd, v1.ownerAdd, 'owner add should match v1 here');
      });
    }

    it('Forge-Hammer donor profit differs: it subtracts the deposit, not the lock', () => {
      for (const c of captured) {
        const a = ours(c.remaining, c.occupant, c.base, ARC, PCT);
        const fh = forgeHammerDonor(c.remaining, c.occupant, c.base, ARC, PCT);
        assert.equal(fh.donorProfit, fh.gross - fh.deposit);
        if (fh.deposit !== a.lock) {
          assert.notEqual(
            fh.donorProfit,
            a.profit,
            `${c.name} should expose the basis gap`,
          );
        }
      }
    });
  });

  describe('documented edge cases', () => {
    it('deposit > lock: NET is still measured against the lock (matches v1)', () => {
      // remaining 100, occupant 0, base 200 -> lock 50, deposit 380, gross 400.
      const a = ours(100, 0, 200, ARC, PCT);
      const v1 = original(100, 0, 200, ARC, PCT);
      assert.equal(a.lock, 50);
      assert.equal(a.deposit, 380);
      assert.equal(
        a.profit,
        350,
        'ours: 400 - 50 (lock, not the 1.9x deposit)',
      );
      assert.equal(v1.profit, 350, 'v1: 400 - 50');
      assert.equal(a.profit, v1.profit);
    });

    it('odd R+X: v1 owner add overcharges vs the exact formula', () => {
      // remaining 101, occupant 0, base 20 -> lock 51, deposit 38.
      const a = ours(101, 0, 20, ARC, PCT);
      const v1 = original(101, 0, 20, ARC, PCT);
      assert.equal(a.lock, 51);
      assert.equal(a.deposit, 38);
      assert.equal(a.ownerAdd, 25, 'exact: ceil(101 + 0 - 2*38) = 25');
      assert.equal(v1.ownerAdd, 26, 'v1: (51 - 38) * 2 = 26');
      assert.notEqual(a.ownerAdd, v1.ownerAdd);
    });
  });
});
