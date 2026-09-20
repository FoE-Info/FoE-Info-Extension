import assert from 'node:assert/strict';
import test from 'node:test';
import BigNumber from 'bignumber.js';
import { aggregateLiveGoods } from '../../src/js/ui/liveCityGoodsAggregator.js';

test('liveCityGoodsAggregator Unit Suite', async (t) => {
  await t.test('aggregates empty goods gracefully', () => {
    const result = aggregateLiveGoods({
      city: { goodsProductionBoost: 0 },
      aidStats: null,
      goods: {},
      helper: { numAges: 0 },
    });

    assert.equal(result.totalGoodsAmount.toNumber(), 0);
    assert.deepEqual(result.goodsByEra, {});
    assert.equal(result.liveGoodsHTML, '');
  });

  await t.test('applies goods production boost to raw goods', () => {
    const helper = {
      numAges: 2,
      fAgefromLevel: (lvl) => (lvl === 2 ? 'FutureEra' : 'BronzeAge'),
      fGVGagesname: (name) => (name === 'FutureEra' ? 'fe' : 'ba'),
    };
    const goods = {
      fe: 100,
      ba: 50,
    };
    const result = aggregateLiveGoods({
      city: { goodsProductionBoost: 50 },
      aidStats: null,
      goods,
      helper,
      fGoodsHTMLFn: (age, tooltips, map, boost) =>
        `<div id="${age}">${Math.round(map[age] * (1 + (boost || 0) / 100))}</div>`,
    });

    // 100 * 1.5 = 150; 50 * 1.5 = 75
    assert.equal(result.goodsByEra.fe.toNumber(), 150);
    assert.equal(result.goodsByEra.ba.toNumber(), 75);
    assert.equal(result.totalGoodsAmount.toNumber(), 225);
    assert.match(result.liveGoodsHTML, /<div id="fe">150<\/div>/);
    assert.match(result.liveGoodsHTML, /<div id="ba">75<\/div>/);
  });

  await t.test('prioritizes aidStats.max.goodsByEra when provided', () => {
    const helper = {
      numAges: 1,
      fAgefromLevel: () => 'SpaceAgeSpaceHub',
      fGVGagesname: () => 'sash',
    };
    const aidStats = {
      max: {
        goods: new BigNumber(10000),
        goodsByEra: {
          SpaceAgeSpaceHub: 5000,
        },
      },
    };
    const result = aggregateLiveGoods({
      city: { goodsProductionBoost: 20 },
      aidStats,
      goods: { sash: 100 },
      helper,
      getEraAcronymFn: () => 'SASH',
      fGoodsHTMLFn: (age, tooltips, map) => `<span>${age}:${map[age]}</span>`,
    });

    assert.equal(result.goodsByEra.sash.toNumber(), 5000);
    assert.equal(result.totalGoodsAmount.toNumber(), 10000);
    assert.match(result.liveGoodsHTML, /<span>sash:5000<\/span>/);
  });
});
