import assert from 'node:assert/strict';
import test from 'node:test';
import { processCityMapEntities } from '../../src/js/calc/CityMapEntityProcessor.js';

test('CityMapEntityProcessor Suite', async (t) => {
  await t.test('handles empty or null entity array safely', () => {
    const City = { ForgePoints: 0, Coins: 0, Supplies: 0, TrazUnits: 0 };
    const result = processCityMapEntities([], { City });
    assert.equal(result.buildingsReady.length, 0);
    assert.equal(result.fpBuildings.length, 0);
    assert.equal(result.diamonds, 0);
    assert.equal(result.clanGoods, 0);

    const nullResult = processCityMapEntities(null, { City });
    assert.equal(nullResult.buildingsReady.length, 0);
  });

  await t.test(
    'collects ready buildings based on next_state_transition_at',
    () => {
      const City = {};
      const entities = [
        {
          cityentity_id: 'R_MultiAge_Residential1',
          state: { next_state_transition_at: 1700000000 },
        },
        {
          cityentity_id: 'R_MultiAge_Residential2',
          state: { next_state_transition_at: 500 }, // ignored (< 1000000000)
        },
        {
          cityentity_id: 'R_MultiAge_Residential3',
          state: {},
        },
      ];

      const mockHelper = {
        fEntityNameTrim: (id) => `Trimmed_${id}`,
      };

      const result = processCityMapEntities(entities, {
        City,
        helper: mockHelper,
      });

      assert.equal(result.buildingsReady.length, 1);
      assert.equal(result.buildingsReady[0].id, 'R_MultiAge_Residential1');
      assert.equal(result.buildingsReady[0].ready, 1700000000);
    },
  );

  await t.test('aggregates forge points, coins, supplies, and diamonds', () => {
    const City = {
      ForgePoints: 0,
      Coins: 0,
      Supplies: 0,
      TrazUnits: 0,
    };

    const entities = [
      {
        cityentity_id: 'W_MultiAge_Sanctuary1',
        type: 'residential',
        state: {
          current_product: {
            product: {
              resources: {
                strategy_points: 5,
                money: 1000,
                supplies: 500,
                premium: 10,
              },
            },
          },
        },
      },
      {
        cityentity_id: 'W_MultiAge_Sanctuary2',
        type: 'greatbuilding',
        state: {
          current_product: {
            product: {
              resources: {
                strategy_points: 12,
              },
            },
          },
        },
      },
    ];

    const mockHelper = {
      fEntityNameTrim: (id) => `Building_${id}`,
    };

    const result = processCityMapEntities(entities, {
      City,
      helper: mockHelper,
    });

    assert.equal(City.ForgePoints, 17);
    assert.equal(City.Coins, 1000);
    assert.equal(City.Supplies, 500);
    assert.equal(result.diamonds, 10);
    assert.equal(result.fpBuildings.length, 2);
    assert.equal(result.fpBuildings[0].isBoostable, true); // not GB
    assert.equal(result.fpBuildings[1].isBoostable, false); // GB is not boostable
  });

  await t.test('aggregates Great Building bonuses into City stats', () => {
    const City = {
      gbAttack: 0,
      gbDefense: 0,
      gbCityAttack: 0,
      gbCityDefense: 0,
      ArcBonus: 0,
      ChatBonus: 0,
      CoinBoost: 0,
    };

    const entities = [
      {
        cityentity_id: 'X_FutureEra_Landmark1', // Arc
        bonus: { type: 'contribution_boost', value: 90.6 },
        state: {},
      },
      {
        cityentity_id: 'X_ProgressiveEra_Landmark2', // Chateau
        bonus: { type: 'quest_boost', value: 150 },
        state: {},
      },
      {
        cityentity_id: 'X_EarlyMiddleAge_Landmark1', // Zeus
        bonus: { type: 'military_boost', value: 30 },
        state: {},
      },
      {
        cityentity_id: 'X_IronAge_Landmark1', // CoA
        bonus: { type: 'advanced_tactics', value: 20 },
        state: {},
      },
      {
        cityentity_id: 'X_ModernEra_Landmark1', // Deal Castle
        bonus: { type: 'fierce_resistance', value: 25 },
        state: {},
      },
      {
        cityentity_id: 'X_BronzeAge_Landmark1', // Babel
        bonus: { type: 'money_boost', value: 50 },
        state: {},
      },
    ];

    processCityMapEntities(entities, { City });

    assert.equal(City.ArcBonus, 90.6);
    assert.equal(City.ChatBonus, 150);
    assert.equal(City.gbAttack, 50); // 30 + 20
    assert.equal(City.gbDefense, 50); // 30 + 20
    assert.equal(City.gbCityAttack, 45); // 20 + 25
    assert.equal(City.gbCityDefense, 45); // 20 + 25
    assert.equal(City.CoinBoost, 50);
  });

  await t.test('aggregates guild goods and clan power', () => {
    const City = {};
    const entities = [
      {
        cityentity_id: 'B_MultiAge_Statue1',
        state: {
          current_product: {
            guildProduct: {
              resources: {
                clan_power: 100,
                wood: 25,
              },
            },
          },
        },
      },
      {
        cityentity_id: 'B_MultiAge_Statue2',
        state: {
          current_product: {
            name: 'clan_goods',
            amount: 50,
          },
        },
      },
    ];

    const mockResourceDefs = [{ id: 'wood', era: 'BronzeAge' }];
    const mockHelper = {
      fEntityNameTrim: (id) => id,
      fGVGagesname: (era) => era,
    };

    const result = processCityMapEntities(entities, {
      City,
      ResourceDefs: mockResourceDefs,
      helper: mockHelper,
      user: { era: 'BronzeAge' },
      MyInfo: { era: 'BronzeAge' },
    });

    assert.equal(result.clanPower, 100);
    assert.equal(result.clanGoods, 75); // 25 + 50
    assert.equal(result.clanGoodsBuildings.length, 2);
  });

  await t.test(
    'safely handles unmatched entity definitions without DOM mutations',
    () => {
      const City = {};
      const entities = [
        {
          id: 9999,
          cityentity_id: 'unknown_decor_1',
          type: 'decoration',
          state: {},
        },
      ];

      const result = processCityMapEntities(entities, {
        City,
        DEV: true,
        debugEnabled: true,
        fEntityName: (id) => `Name_${id}`,
      });

      assert.equal(result.buildingsReady.length, 0);
      assert.equal(result.fpBuildings.length, 0);
    },
  );
});
