import assert from 'node:assert/strict';
import test from 'node:test';
import { processCityMapEntities } from '../../src/js/calc/CityMapEntityProcessor.js';
import {
  createHarvestAccumulator,
  evaluateEntityHarvest,
  SPECIAL_GOODS,
} from '../../src/js/calc/entities/CityEntityHarvestCalculator.js';

function makeContext(overrides = {}) {
  return {
    City: {},
    CityEntityDefs: {},
    metadataStore: null,
    user: {},
    MyInfo: {},
    ResourceDefs: [],
    blueGalaxyState: null,
    Galaxy: { bonus: [] },
    helper: {
      fEntityNameTrim: (id) => id,
      fGVGagesname: (era) => era,
    },
    formatLiveName: (id, fallback) => fallback,
    checkDebug: () => false,
    debugEnabled: false,
    DEV: false,
    accum: createHarvestAccumulator(),
    ...overrides,
  };
}

test('CityEntityHarvestCalculator Suite', async (t) => {
  await t.test('creates an empty accumulator with stable defaults', () => {
    const accum = createHarvestAccumulator();
    assert.deepEqual(accum.buildingsReady, []);
    assert.deepEqual(accum.fpBuildings, []);
    assert.deepEqual(accum.goodsBuildings, []);
    assert.deepEqual(accum.clanGoodsBuildings, []);
    assert.deepEqual(accum.goodsList, {});
    assert.equal(accum.diamonds, 0);
    assert.equal(accum.clanPower, 0);
    assert.equal(accum.clanGoods, 0);
    assert.equal(accum.totalGoods, 0);
  });

  await t.test('collects ready buildings from next_state_transition_at', () => {
    const ctx = makeContext();
    const result = evaluateEntityHarvest(
      {
        cityentity_id: 'R_MultiAge_Residential1',
        state: { next_state_transition_at: 1700000000 },
      },
      0,
      ctx,
    );

    assert.equal(result.found, false);
    assert.equal(ctx.accum.buildingsReady.length, 1);
    assert.equal(ctx.accum.buildingsReady[0].id, 'R_MultiAge_Residential1');
    assert.equal(ctx.accum.buildingsReady[0].ready, 1700000000);
  });

  await t.test(
    'aggregates forge points, coins, supplies, diamonds and goods',
    () => {
      const ctx = makeContext();
      const result = evaluateEntityHarvest(
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
                  wood: 3,
                },
              },
            },
          },
        },
        0,
        ctx,
      );

      assert.equal(result.found, true);
      assert.equal(ctx.City.ForgePoints, 5);
      assert.equal(ctx.City.Coins, 1000);
      assert.equal(ctx.City.Supplies, 500);
      assert.equal(ctx.accum.diamonds, 10);
      assert.equal(ctx.accum.fpBuildings.length, 1);
      assert.equal(ctx.accum.fpBuildings[0].isBoostable, true);
      assert.equal(ctx.accum.goodsBuildings.length, 1);
      assert.equal(ctx.accum.goodsBuildings[0].goods, 13);
      assert.deepEqual(ctx.accum.goodsList, { premium: 10, wood: 3 });
      assert.equal(ctx.accum.totalGoods, 13);
      assert.equal(ctx.Galaxy.bonus.length, 1);
      assert.equal(ctx.Galaxy.bonus[0].fp, 5);
    },
  );

  await t.test('excludes special goods from tally totals', () => {
    const ctx = makeContext();
    evaluateEntityHarvest(
      {
        cityentity_id: 'W_MultiAge_Sanctuary2',
        state: {
          current_product: {
            product: {
              resources: { promethium: 4, orichalcum: 2, wood: 1 },
            },
          },
        },
      },
      0,
      ctx,
    );

    assert.equal(SPECIAL_GOODS.has('promethium'), true);
    assert.deepEqual(ctx.accum.goodsList, { wood: 1 });
    assert.equal(ctx.accum.totalGoods, 1);
    assert.equal(ctx.accum.goodsBuildings[0].goods, 1);
  });

  await t.test('aggregates guild product clan power and goods', () => {
    const ctx = makeContext({
      ResourceDefs: [{ id: 'wood', era: 'BronzeAge' }],
      helper: {
        fEntityNameTrim: (id) => id,
        fGVGagesname: (era) => `Era_${era}`,
      },
    });
    evaluateEntityHarvest(
      {
        cityentity_id: 'B_MultiAge_Statue1',
        state: {
          current_product: {
            guildProduct: { resources: { clan_power: 100, wood: 25 } },
          },
        },
      },
      0,
      ctx,
    );

    assert.equal(ctx.accum.clanPower, 100);
    assert.equal(ctx.accum.clanGoods, 25);
    assert.equal(ctx.accum.clanGoodsBuildings.length, 1);
    assert.equal(ctx.accum.clanGoodsBuildings[0].era, 'BronzeAge');
    assert.equal(
      ctx.accum.clanGoodsBuildings[0].name,
      'B_MultiAge_Statue1 Era_BronzeAge',
    );
  });

  await t.test(
    'parses productionOption products with guild and player resources',
    () => {
      const ctx = makeContext();
      const result = evaluateEntityHarvest(
        {
          cityentity_id: 'W_MultiAge_Sanctuary3',
          type: 'residential',
          state: {
            productionOption: {
              products: [
                {
                  playerResources: {
                    resources: { strategy_points: 7, premium: 2, wood: 4 },
                  },
                  guildResources: {
                    resources: { all_goods_of_age: 5 },
                  },
                },
              ],
            },
          },
        },
        0,
        ctx,
      );

      assert.equal(result.found, true);
      assert.equal(ctx.City.ForgePoints, 7);
      assert.equal(ctx.accum.diamonds, 2);
      assert.equal(ctx.accum.totalGoods, 6);
      assert.deepEqual(ctx.accum.goodsList, { premium: 2, wood: 4 });
      assert.equal(ctx.accum.clanGoods, 5);
      assert.equal(ctx.accum.clanGoodsBuildings.length, 1);
      assert.equal(ctx.accum.clanGoodsBuildings[0].baseGoods, 5);
      assert.equal(ctx.accum.clanGoodsBuildings[0].isBoostable, true);
    },
  );

  await t.test(
    'adds summer bonus units and treasury goods from entity abilities',
    () => {
      const ctx = makeContext({
        CityEntityDefs: {
          R_MultiAge_SummerBonus20_1: {
            abilities: [
              {
                __class__: 'RandomUnitOfAgeWhenMotivatedAbility',
                amount: 3,
              },
              {
                __class__: 'AddResourcesToGuildTreasuryAbility',
                additionalResources: {
                  AllAge: { resources: { all_goods_of_age: 2 } },
                },
              },
            ],
          },
        },
      });
      evaluateEntityHarvest(
        {
          cityentity_id: 'R_MultiAge_SummerBonus20_1',
          state: {},
        },
        0,
        ctx,
      );

      assert.equal(ctx.City.TrazUnits, 3);
      assert.equal(ctx.accum.clanGoods, 10);
      assert.equal(ctx.accum.clanGoodsBuildings.length, 1);
    },
  );

  await t.test('delegates blue galaxy registration for each entity', () => {
    const registered = [];
    const ctx = makeContext({
      blueGalaxyState: {
        addEntity: (entity, store, nameFn, flag) => {
          registered.push({ entity, store, nameFn, flag });
        },
      },
      formatLiveName: (id, fallback) => `Live_${fallback}`,
      helper: { fEntityNameTrim: (id) => `Trim_${id}` },
    });
    evaluateEntityHarvest(
      { cityentity_id: 'W_MultiAge_Sanctuary4', state: {} },
      0,
      ctx,
    );

    assert.equal(registered.length, 1);
    assert.equal(registered[0].entity.cityentity_id, 'W_MultiAge_Sanctuary4');
    assert.equal(registered[0].flag, false);
    assert.equal(registered[0].nameFn('raw'), 'Live_Trim_raw');
  });

  await t.test(
    'preserves parity with processCityMapEntities harvest output',
    () => {
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
                  wood: 3,
                },
              },
            },
          },
        },
        {
          cityentity_id: 'B_MultiAge_Statue1',
          state: {
            current_product: {
              guildProduct: { resources: { clan_power: 100, wood: 25 } },
            },
          },
        },
        {
          cityentity_id: 'R_MultiAge_Residential1',
          state: { next_state_transition_at: 1700000000 },
        },
      ];

      const sharedOptions = {
        City: {},
        ResourceDefs: [{ id: 'wood', era: 'BronzeAge' }],
        helper: {
          fEntityNameTrim: (id) => id,
          fGVGagesname: (era) => era,
        },
      };

      const orchestratorResult = processCityMapEntities(entities, {
        ...sharedOptions,
        City: {},
      });

      const accum = createHarvestAccumulator();
      const ctx = makeContext({
        ...sharedOptions,
        accum,
      });
      let foundCount = 0;
      entities.forEach((entity, index) => {
        const res = evaluateEntityHarvest(entity, index, ctx);
        if (res.found) foundCount++;
      });

      assert.deepEqual(accum.buildingsReady, orchestratorResult.buildingsReady);
      assert.deepEqual(accum.fpBuildings, orchestratorResult.fpBuildings);
      assert.deepEqual(accum.goodsBuildings, orchestratorResult.goodsBuildings);
      assert.deepEqual(
        accum.clanGoodsBuildings,
        orchestratorResult.clanGoodsBuildings,
      );
      assert.deepEqual(accum.goodsList, orchestratorResult.goodsList);
      assert.equal(accum.diamonds, orchestratorResult.diamonds);
      assert.equal(accum.clanPower, orchestratorResult.clanPower);
      assert.equal(accum.clanGoods, orchestratorResult.clanGoods);
      assert.equal(accum.totalGoods, orchestratorResult.totalGoods);
      assert.equal(foundCount > 0, true);
    },
  );
});
