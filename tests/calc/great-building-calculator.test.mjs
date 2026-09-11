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

describe('GreatBuildingCalculator Pure Math Engine', () => {
  describe('potential donor outcome', () => {
    it('matches the Statue of Zeus small-GB capture', () => {
      assert.deepEqual(calculateDonorOutcome(711, 500, 330, 100, 180), {
        spotLock: 606,
        costs: 594,
        donorReward: 660,
        donorProfit: 54,
        guaranteedProfit: false,
      });
    });

    it('matches the open Blue Galaxy row 4', () => {
      assert.deepEqual(calculateDonorOutcome(77, 0, 20, 100, 180), {
        spotLock: 39,
        costs: 36,
        donorReward: 40,
        donorProfit: 1,
        guaranteedProfit: false,
      });
    });

    it('matches the Statue of Zeus 1.8x and 1.9x cases', () => {
      assert.deepEqual(calculateDonorOutcome(4218, 501, 1050, 100, 180), {
        spotLock: 2360,
        costs: 1890,
        donorReward: 2100,
        donorProfit: -260,
        guaranteedProfit: false,
      });
      assert.deepEqual(calculateDonorOutcome(4218, 501, 1050, 100, 190), {
        spotLock: 2360,
        costs: 1995,
        donorReward: 2100,
        donorProfit: -260,
        guaranteedProfit: false,
      });
    });

    it('matches Stellar Warship P3 without treating holder investment as costs', () => {
      assert.equal(calculateSpotLock(523, 520), 522);
      assert.deepEqual(calculateDonorOutcome(523, 520, 260, 100, 190), {
        spotLock: 522,
        costs: 494,
        donorReward: 520,
        donorProfit: -2,
        guaranteedProfit: false,
      });
    });

    it('marks a lock at or below costs as guaranteed profit', () => {
      assert.deepEqual(calculateDonorOutcome(10, 0, 260, 100, 190), {
        spotLock: 5,
        costs: 494,
        donorReward: 520,
        donorProfit: 515,
        guaranteedProfit: true,
      });
    });
  });

  describe('calculateOwnerSafeAdd', () => {
    it('calculates exact owner FP needed with odd remaining (Forge-Hammer parity)', () => {
      // Legacy doubled remainder: (ceil(101/2) - 40) * 2 = 22 FP
      // Exact parity: 101 + 0 - 2 * 40 = 21 FP
      assert.equal(calculateOwnerSafeAdd(101, 0, 40), 21);
    });

    it('calculates exact owner FP with even remaining', () => {
      assert.equal(calculateOwnerSafeAdd(100, 0, 40), 20);
    });

    it('returns 0 when spot is already safe or over-invested', () => {
      assert.equal(calculateOwnerSafeAdd(80, 0, 40), 0);
      assert.equal(calculateOwnerSafeAdd(50, 0, 40), 0);
      assert.equal(calculateOwnerSafeAdd(0, 0, 40), 0);
    });

    it('accounts for existing spot investment correctly', () => {
      // 100 remaining, rival put 10, target donation is 40 -> 100 + 10 - 80 = 30
      assert.equal(calculateOwnerSafeAdd(100, 10, 40), 30);
    });

    it('handles undefined or zero values gracefully', () => {
      assert.equal(calculateOwnerSafeAdd(0, 0, 0), 0);
      assert.equal(calculateOwnerSafeAdd(undefined, undefined, undefined), 0);
    });

    it('Stellar Warship P3 1.92: 2x donor lock loss equals owner safe add', () => {
      // remaining + spotInvested = 1440 -> spotLock 720; 265 * 1.92 = 509
      const outcome = calculateDonorOutcome(1440, 0, 265, 100, 192);
      assert.equal(outcome.spotLock, 720);
      assert.equal(outcome.costs, 509);
      const netLoss = outcome.spotLock - outcome.costs;
      assert.equal(netLoss, 211);
      assert.equal(calculateOwnerSafeAdd(1440, 0, outcome.costs), netLoss * 2);
    });
  });

  describe('calculateArcReward', () => {
    it('calculates standard 1.9x Arc rewards (+90%)', () => {
      assert.equal(calculateArcReward(100, 90), 190);
      assert.equal(calculateArcReward(10, 90), 19);
    });

    it('applies ROUND_HALF_UP rounding on .5 values (Forge-Hammer parity)', () => {
      // 5 * 1.9 = 9.5 -> rounds half-up to 10
      assert.equal(calculateArcReward(5, 90), 10);
      // 15 * 1.9 = 28.5 -> rounds half-up to 29
      assert.equal(calculateArcReward(15, 90), 29);
      // 25 * 1.9 = 47.5 -> rounds half-up to 48
      assert.equal(calculateArcReward(25, 90), 48);
    });

    it('calculates custom Arc bonus rates (e.g. 100% / 2.0x and 80% / 1.8x)', () => {
      assert.equal(calculateArcReward(365, 100), 730);
      assert.equal(calculateArcReward(15, 80), 27);
      assert.equal(calculateArcReward(100, 0), 100);
    });

    it('handles 0 base reward', () => {
      assert.equal(calculateArcReward(0, 90), 0);
    });
  });

  describe('calculateSuggestedDonation', () => {
    it('calculates standard 190% donation suggestions', () => {
      assert.equal(calculateSuggestedDonation(100, 190), 190);
      assert.equal(calculateSuggestedDonation(5, 190), 10);
    });

    it('calculates custom target rates (e.g. 192% or 185%)', () => {
      assert.equal(calculateSuggestedDonation(25, 192), 48);
      // 10 * 1.85 = 18.5 -> rounds half-up to 19
      assert.equal(calculateSuggestedDonation(10, 185), 19);
    });

    it('defaults to 190% when target percent is omitted', () => {
      assert.equal(calculateSuggestedDonation(100), 190);
    });
  });

  describe('calculateSafeSpots', () => {
    const sampleGb = {
      total: 2000,
      current: 400, // 1600 remaining
      rewards: [500, 250, 100, 30, 10],
    };

    it('analyzes 5 spots with empty current investments', () => {
      const spots = calculateSafeSpots(sampleGb, [0, 0, 0, 0, 0], 90, 190);

      assert.equal(spots.length, 5);

      // Spot 1: owner addition is zero; its 950 FP payment leaves 650 FP.
      assert.equal(spots[0].place, 1);
      assert.equal(spots[0].currentInvested, 0);
      assert.equal(spots[0].baseReward, 500);
      assert.equal(spots[0].rewardFP, 950); // 500 * 1.9 = 950
      assert.equal(spots[0].donateCustom, 950);
      assert.equal(spots[0].lockFP, 0);
      assert.equal(spots[0].isSafe, false);
      assert.equal(spots[0].profit, 950);

      // Spot 5: base 10
      assert.equal(spots[4].place, 5);
      assert.equal(spots[4].rewardFP, 19);
      assert.equal(spots[4].lockFP, 0);
      assert.equal(spots[4].isSafe, true);
      assert.equal(spots[4].profit, 19);
    });

    it('identifies locked spots when current investment >= lockFP', () => {
      const gb = {
        total: 1000,
        current: 960, // 40 remaining
        rewards: [100, 50, 20, 10, 5],
      };
      const spots = calculateSafeSpots(gb, [50, 10, 0, 0, 0], 90, 190);
      assert.equal(spots[0].isSafe, true);
      assert.equal(spots[1].isSafe, false);
    });

    it('supports InnoGames RPC rankings object structure with rank field', () => {
      const gb = {
        max_progress: 1000,
        current_progress: 200,
        rewards: [100, 50, 20, 10, 5],
      };
      const rpcRankings = [
        { rank: 1, forge_points: 120 },
        { rank: 2, forge_points: 60 },
      ];

      const spots = calculateSafeSpots(gb, rpcRankings, 90, 190);
      assert.equal(spots[0].currentInvested, 120);
      assert.equal(spots[1].currentInvested, 60);
      assert.equal(spots[2].currentInvested, 0);
    });

    it('threads the Stellar Warship remaining pool across all five places', () => {
      const stellarWarship = {
        total: 60011,
        current: 59488,
      };
      const rankings = [
        { forge_points: 54469, player: { is_self: true } },
        {
          rank: 1,
          forge_points: 2771,
          reward: { strategy_point_amount: 1570 },
        },
        { rank: 2, forge_points: 1570, reward: { strategy_point_amount: 785 } },
        { rank: 3, forge_points: 520, reward: { strategy_point_amount: 260 } },
        { rank: 4, forge_points: 128, reward: { strategy_point_amount: 65 } },
        { rank: 5, forge_points: 30, reward: { strategy_point_amount: 15 } },
      ];

      const spots = calculateSafeSpots(stellarWarship, rankings, 90, 190);

      assert.deepEqual(
        spots.map(({ rewardFP, lockFP }) => ({ rewardFP, lockFP })),
        [
          { rewardFP: 2983, lockFP: 0 },
          { rewardFP: 1492, lockFP: 0 },
          { rewardFP: 494, lockFP: 131 },
          { rewardFP: 124, lockFP: 294 },
          { rewardFP: 29, lockFP: 68 },
        ],
      );
    });

    it('uses the selected donation target instead of the owner Arc reward', () => {
      const cosmicCatalyst = { total: 48328, current: 14263 };
      const rankings = [
        { forge_points: 12591, player: { is_self: true } },
        {
          rank: 1,
          forge_points: 1542,
          reward: { strategy_point_amount: 1570 },
        },
        { rank: 2, forge_points: 130, reward: { strategy_point_amount: 785 } },
      ];

      const spots = calculateSafeSpots(cosmicCatalyst, rankings, 100, 190);

      assert.equal(spots[0].rewardFP, 3140);
      assert.equal(spots[0].donateCustom, 2983);
      assert.equal(spots[0].lockFP, 29641);
    });
  });
});
