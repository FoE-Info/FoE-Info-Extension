import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  createHarvestAccumulator,
  accumulatePlayerGoods,
  parseCurrentProduct,
  parseProductionOption,
} = require('../../src/js/calc/entities/harvestAccumulator.js');

test('harvestAccumulator suite', async (t) => {
  await t.test(
    'createHarvestAccumulator initializes all collections and counters',
    () => {
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
    },
  );

  await t.test(
    'accumulatePlayerGoods filters out non-goods and special goods',
    () => {
      const accum = createHarvestAccumulator();
      const helper = { fEntityNameTrim: (id) => `Trimmed_${id}` };
      const resources = {
        money: 1000,
        supplies: 500,
        medals: 50,
        strategy_points: 5,
        clanPower: 20,
        mars_ore: 10, // special good
        promethium: 15, // special good
        iron: 20,
        cloth: 30,
      };

      accumulatePlayerGoods({
        resources,
        cid: 'goods_producer_1',
        accum,
        helper,
      });

      assert.equal(accum.totalGoods, 50);
      assert.deepEqual(accum.goodsList, { iron: 20, cloth: 30 });
      assert.equal(accum.goodsBuildings.length, 1);
      assert.equal(accum.goodsBuildings[0].id, 'goods_producer_1');
      assert.equal(accum.goodsBuildings[0].name, 'Trimmed_goods_producer_1');
      assert.equal(accum.goodsBuildings[0].goods, 50);
    },
  );

  await t.test('parseCurrentProduct handles FP, goods, and penal units', () => {
    const accum = createHarvestAccumulator();
    const City = {};
    const Galaxy = { bonus: [] };
    const helper = {
      fEntityNameTrim: (id) => id,
      fGVGagesname: (era) => era,
    };
    const curProduct = {
      product: {
        resources: {
          strategy_points: 12,
          money: 5000,
          premium: 25,
        },
      },
      asset_name: 'penal_unit',
      amount: 4,
    };

    const parsed = parseCurrentProduct({
      curProduct,
      cid: 'B_Alcatraz',
      mapID: {
        id: 1,
        type: 'greatbuilding',
        state: { __class__: 'ProducingState' },
      },
      MyInfo: { era: 'ModernEra' },
      ResourceDefs: [],
      helper,
      City,
      Galaxy,
      accum,
    });

    assert.equal(parsed.found, true);
    assert.equal(parsed.forgePoints, 12);
    assert.equal(City.ForgePoints, 12);
    assert.equal(City.Coins, 5000);
    assert.equal(City.TrazUnits, 4);
    assert.equal(accum.diamonds, 25);
    assert.equal(accum.fpBuildings.length, 1);
    assert.equal(accum.fpBuildings[0].fp, 12);
  });

  await t.test(
    'parseProductionOption handles clan power and guild goods',
    () => {
      const accum = createHarvestAccumulator();
      const City = {};
      const Galaxy = { bonus: [] };
      const helper = {
        fEntityNameTrim: (id) => id,
        fGVGagesname: (era) => era,
      };
      const prodOpt = {
        guildProduct: {
          resources: {
            clan_power: 80,
            iron: 10,
          },
        },
        clan_power: 20,
      };

      const parsed = parseProductionOption({
        prodOpt,
        cid: 'G_StatueOfHonor',
        mapID: {
          id: 2,
          type: 'residential',
          state: { __class__: 'ProducingState' },
        },
        ResourceDefs: [{ id: 'iron', era: 'IronAge' }],
        helper,
        City,
        Galaxy,
        accum,
      });

      assert.equal(parsed.found, false);
      assert.equal(accum.clanGoods, 10);
      assert.equal(accum.clanPower, 100); // 80 from guildProduct + 20 from prodOpt
      assert.equal(accum.clanGoodsBuildings.length, 1);
      assert.equal(accum.clanGoodsBuildings[0].goods, 10);
    },
  );
});
