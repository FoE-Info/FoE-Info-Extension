import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calculateArcReward,
  calculateDonorOutcome,
  calculateLevelClosingProfit,
  calculateOwnerSafeAdd,
  calculateSafeSpots,
  calculateSpotLock,
  calculateSuggestedDonation,
  getSafePlaces,
  isPlacePassable,
} from '../../src/js/calc/GreatBuildingCalculator.js';

describe('GreatBuildingCalculator Pure Math Engine', () => {
  describe('potential donor outcome', () => {
    it('matches the Statue of Zeus small-GB capture', () => {
      assert.deepEqual(calculateDonorOutcome(711, 500, 330, 100, 180), {
        spotLock: 606,
        costs: 594,
        donorReward: 660,
        donorRankCost: 606,
        net: 54,
        donorProfit: 54,
        outcome: 'profit',
        band: 'green',
        guaranteedProfit: false,
      });
    });

    it('matches the open Blue Galaxy row 4', () => {
      assert.deepEqual(calculateDonorOutcome(77, 0, 20, 100, 180), {
        spotLock: 39,
        costs: 36,
        donorReward: 40,
        donorRankCost: 39,
        net: 1,
        donorProfit: 1,
        outcome: 'profit',
        band: 'green',
        guaranteedProfit: false,
      });
    });

    it('matches the Statue of Zeus 1.8x and 1.9x cases', () => {
      assert.deepEqual(calculateDonorOutcome(4218, 501, 1050, 100, 180), {
        spotLock: 2360,
        costs: 1890,
        donorReward: 2100,
        donorRankCost: 2360,
        net: -260,
        donorProfit: -260,
        outcome: 'loss',
        band: 'red',
        guaranteedProfit: false,
      });
      assert.deepEqual(calculateDonorOutcome(4218, 501, 1050, 100, 190), {
        spotLock: 2360,
        costs: 1995,
        donorReward: 2100,
        donorRankCost: 2360,
        net: -260,
        donorProfit: -260,
        outcome: 'loss',
        band: 'red',
        guaranteedProfit: false,
      });
    });

    it('matches Stellar Warship P3 without treating holder investment as costs', () => {
      assert.equal(calculateSpotLock(523, 520), 522);
      assert.deepEqual(calculateDonorOutcome(523, 520, 260, 100, 190), {
        spotLock: 522,
        costs: 494,
        donorReward: 520,
        donorRankCost: 522,
        net: -2,
        donorProfit: -2,
        outcome: 'loss',
        band: 'red',
        guaranteedProfit: false,
      });
    });

    it('measures NET against the lock, not the suggested rate', () => {
      // Lock 5, suggested 494, gross 520 -> NET is measured against the lock.
      assert.deepEqual(calculateDonorOutcome(10, 0, 260, 100, 190), {
        spotLock: 5,
        costs: 494,
        donorReward: 520,
        donorRankCost: 5,
        net: 515,
        donorProfit: 515,
        outcome: 'profit',
        band: 'green',
        guaranteedProfit: true,
      });
    });

    it('treats a zero NET as safe (break-even), never a loss', () => {
      // Zeus P2 from the captured payload: lock 1480, suggested 1406, gross 1480.
      const outcome = calculateDonorOutcome(1480, 1480, 740, 100, 190);
      assert.equal(outcome.donorRankCost, 1480);
      assert.equal(outcome.net, 0);
      assert.equal(outcome.outcome, 'safe');
      assert.equal(outcome.band, 'green');
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

  describe('owner target place (HAR ground truth)', () => {
    const scenarios = [
      {
        name: 'Cosmic Catalyst (level 68)',
        total: 48328,
        current: 47470,
        investeds: [2983, 1542, 130, 0, 0],
        rewards: [1570, 785, 260, 65, 15],
        expectedPlace: 3,
        expectedOwnerAdd: 0,
      },
      {
        name: 'Statue of Zeus (level 157)',
        total: 19230,
        current: 17750,
        investeds: [2960, 1480, 0, 0, 0],
        rewards: [1480, 740, 245, 60, 10],
        expectedPlace: 3,
        expectedOwnerAdd: 548,
      },
      {
        name: 'The Blue Galaxy (level 96)',
        total: 9699,
        current: 9079,
        investeds: [3720, 1860, 620, 0, 0],
        rewards: [1860, 930, 310, 80, 15],
        expectedPlace: 4,
        expectedOwnerAdd: 316,
      },
    ];

    for (const s of scenarios) {
      it(`${s.name}: targets the first passable place, not a locked one`, () => {
        const remaining = s.total - s.current;
        let target = 0;
        for (let i = 0; i < s.investeds.length; i++) {
          if (isPlacePassable(remaining, s.investeds[i])) {
            target = i + 1;
            break;
          }
        }
        assert.equal(target, s.expectedPlace);

        const donateCustom = calculateSuggestedDonation(
          s.rewards[s.expectedPlace - 1],
          190,
        );
        assert.equal(
          calculateOwnerSafeAdd(
            remaining,
            s.investeds[s.expectedPlace - 1],
            donateCustom,
          ),
          s.expectedOwnerAdd,
        );
      });
    }

    it('treats an occupant holding the whole remaining pool as locked', () => {
      // Zeus P2: 1480 invested, 1480 remaining -> cannot be overtaken.
      assert.equal(isPlacePassable(1480, 1480), false);
      // Blue Galaxy P3: 620 invested, 620 remaining -> cannot be overtaken.
      assert.equal(isPlacePassable(620, 620), false);
      // One FP short is still overtakeable by leveling the building.
      assert.equal(isPlacePassable(1480, 1479), true);
    });
  });

  describe('Forge-Hammer SafePlaces parity', () => {
    // Test-only oracle ported from forge-hammer/js/web/part-calc/js/part-calc.js
    // (defaults: LockExistingPlaces=true, TrustExistingPlaces=false).
    const forgeHammer = (
      total,
      current,
      rewards,
      occupancies,
      arcPercent = 90,
    ) => {
      let Rest = total - current;
      const FP = rewards.map((r) => Math.round(r * (1 + arcPercent / 100)));
      const Eigens = new Array(5).fill(0);
      const LevelT = new Array(5).fill(false);
      const Danger = new Array(5).fill(0);
      const Available = new Array(5).fill(false);
      const M = [...occupancies].sort((a, b) => b - a);
      while (M.length < 5) M.push(0);
      for (let i = 0; i < 5; i++) {
        if (FP[i] <= M[i] || Rest <= M[i]) {
          const Next = M[i + 1] !== undefined ? M[i + 1] : 0;
          Eigens[i] = Math.max(Math.ceil(Rest + Next - M[i]), 0);
          Rest -= Eigens[i];
          continue;
        }
        const ceilRaw = Math.ceil(Rest + M[i] - 2 * FP[i]);
        if (ceilRaw < 0) {
          Danger[i] = Math.floor(-ceilRaw / 2);
          Eigens[i] = 0;
        } else {
          Eigens[i] = ceilRaw;
        }
        if (FP[i] >= Rest) LevelT[i] = true;
        for (let j = M.length - 1; j >= i; j--) {
          if (M[j] > 0) M[j + 1] = M[j];
        }
        M[i] = Math.min(FP[i], Rest);
        Available[i] = true;
        Rest -= Eigens[i] + M[i];
      }
      const SafePlaces = [];
      for (let i = 0; i < 5; i++) {
        if (Eigens[i] > 0) break;
        if (Available[i]) SafePlaces.push(i + 1);
      }
      return { Eigens, LevelT, Danger, SafePlaces };
    };

    const cases = [
      {
        name: 'Cosmic Catalyst',
        total: 48328,
        current: 47470,
        rewards: [1570, 785, 260, 65, 15],
        occ: [2983, 1542, 130, 0, 0],
      },
      {
        name: 'Statue of Zeus',
        total: 19230,
        current: 17750,
        rewards: [1480, 740, 245, 60, 10],
        occ: [2960, 1480, 0, 0, 0],
      },
      {
        name: 'The Blue Galaxy',
        total: 9699,
        current: 9079,
        rewards: [1860, 930, 310, 80, 15],
        occ: [3720, 1860, 620, 0, 0],
      },
      {
        name: 'crafted over-donation',
        total: 1000,
        current: 500,
        rewards: [400, 200, 80, 20, 10],
        occ: [100, 0, 0, 0, 0],
      },
      {
        name: 'crafted P6 donor (no position reward, still P5 next occupant)',
        total: 1000,
        current: 555,
        rewards: [50, 40, 30, 10, 5],
        occ: [200, 150, 100, 50, 30, 25],
      },
    ];

    for (const c of cases) {
      it(`${c.name}: matches owner adds, level warning, danger and SafePlaces`, () => {
        const rankings = c.occ.map((fp, i) => ({
          rank: i + 1,
          forge_points: fp,
          reward: { strategy_point_amount: c.rewards[i] },
        }));
        const spots = calculateSafeSpots(
          { total: c.total, current: c.current, rewards: c.rewards },
          rankings,
          90,
          190,
        );
        const fh = forgeHammer(c.total, c.current, c.rewards, c.occ, 90);

        assert.deepEqual(
          spots.map((s) => s.ownerAdd),
          fh.Eigens,
          'owner adds',
        );
        assert.deepEqual(
          spots.filter((s) => s.levelWarning).map((s) => s.place - 1),
          fh.LevelT.map((v, i) => (v ? i : -1)).filter((i) => i >= 0),
          'level warnings',
        );
        assert.deepEqual(
          spots.map((s) => s.danger),
          fh.Danger,
          'danger',
        );
        assert.deepEqual(getSafePlaces(spots), fh.SafePlaces, 'safe places');
      });
    }
  });

  describe('calculateLevelClosingProfit', () => {
    it('identifies profitable level-closing scenario without existing deposit', () => {
      const result = calculateLevelClosingProfit(50, 90, 0);
      assert.deepEqual(result, {
        cost: 50,
        netProfit: 40,
        isProfitable: true,
      });
    });

    it('identifies profitable level-closing with existing deposit accounted for', () => {
      const result = calculateLevelClosingProfit(40, 100, 20);
      assert.deepEqual(result, {
        cost: 40,
        netProfit: 40,
        isProfitable: true,
      });
    });

    it('identifies break-even scenario (netProfit == 0 is not profitable)', () => {
      const result = calculateLevelClosingProfit(100, 100, 0);
      assert.deepEqual(result, {
        cost: 100,
        netProfit: 0,
        isProfitable: false,
      });
    });

    it('identifies loss scenario when closing cost exceeds reward', () => {
      const result = calculateLevelClosingProfit(120, 100, 0);
      assert.deepEqual(result, {
        cost: 120,
        netProfit: -20,
        isProfitable: false,
      });
    });

    it('supports BigNumber and string inputs with exact precision', () => {
      const result = calculateLevelClosingProfit('150', '200', '25');
      assert.deepEqual(result, {
        cost: 150,
        netProfit: 25,
        isProfitable: true,
      });
    });
  });
});
