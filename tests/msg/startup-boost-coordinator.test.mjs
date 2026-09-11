import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
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
});
