import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import BigNumber from 'bignumber.js';
import coordinatorPkg from '../../src/js/msg/StartupBoostCoordinator.js';

const { handleBoostServiceAllBoosts } =
  coordinatorPkg.default || coordinatorPkg;

describe('StartupBoostCoordinator Suite', () => {
  it('updates combat totals and applies boost multipliers with BigNumber precision', () => {
    let combatTotalsUpdated = false;
    let rendered = false;

    const City = {
      baseBoostableFp: 100,
      baseUnboostableFp: 20,
      fpProductionBoost: 15,
      ForgePoints: 0,
    };

    const msg = {
      responseData: [
        {
          type: 'forge_points_production',
          value: 15,
        },
      ],
    };

    handleBoostServiceAllBoosts({
      msg,
      City,
      updateCombatTotals: () => {
        combatTotalsUpdated = true;
      },
      tooltipHTML: { fp: '' },
      clanGoodsBuildings: [],
      buildClanGoodsData: () => 0,
      lastStartupContext: null,
      renderLiveCityStats: () => {
        rendered = true;
      },
    });

    assert.equal(combatTotalsUpdated, true);
    assert.equal(rendered, true);
    // 100 base boostable * 15% = 15 boost. Total: 100 + 20 + 15 = 135
    assert.equal(City.ForgePoints, 135);
  });

  it('recalculates City.aidStats and updates City coins, supplies, and FP when boosts arrive', () => {
    let rendered = false;

    const City = {
      baseBoostableFp: 100,
      baseUnboostableFp: 20,
      Coins: 1000,
      Supplies: 500,
      aidStats: {
        max: {
          baseBoostableFp: new BigNumber(100),
          baseUnboostableFp: new BigNumber(20),
          baseCoins: new BigNumber(1000),
          baseSupplies: new BigNumber(500),
          coins: new BigNumber(1000),
          supplies: new BigNumber(500),
          fp: new BigNumber(120),
        },
        current: {
          baseBoostableFp: new BigNumber(50),
          baseUnboostableFp: new BigNumber(10),
          baseCoins: new BigNumber(600),
          baseSupplies: new BigNumber(300),
          coins: new BigNumber(600),
          supplies: new BigNumber(300),
          fp: new BigNumber(60),
        },
        diff: {},
      },
    };

    const msg = {
      responseData: [
        { type: 'coin_production', value: 50 },
        { type: 'supply_production', value: 100 },
        { type: 'fp_production_boost', value: 10 },
      ],
    };

    handleBoostServiceAllBoosts({
      msg,
      City,
      updateCombatTotals: () => {},
      tooltipHTML: { fp: '' },
      clanGoodsBuildings: [],
      buildClanGoodsData: () => 0,
      lastStartupContext: null,
      renderLiveCityStats: () => {
        rendered = true;
      },
    });

    assert.equal(rendered, true);
    // Coin: 1000 base * +50% = 1500
    assert.equal(City.Coins, 1500);
    assert.equal(City.aidStats.max.coins.toNumber(), 1500);
    // Supply: 500 base * +100% = 1000
    assert.equal(City.Supplies, 1000);
    assert.equal(City.aidStats.max.supplies.toNumber(), 1000);
    // FP: 100 * 10% = 10 -> 100 + 20 + 10 = 130
    assert.equal(City.ForgePoints, 130);
    assert.equal(City.aidStats.max.fp.toNumber(), 130);
  });
});
