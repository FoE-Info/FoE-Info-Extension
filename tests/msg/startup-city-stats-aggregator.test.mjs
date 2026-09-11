import assert from 'node:assert/strict';
import test from 'node:test';
import aggPkg from '../../src/js/msg/StartupCityStatsAggregator.js';

const { aggregateCityStats } = aggPkg;

function createHelper(names = {}, goods = null) {
  const tallies = {};
  return {
    tallies,
    fEntityNameTrim: (id) => names[id] || null,
    fGoodsTally: (era, amount) => {
      tallies[era] = (tallies[era] || 0) + amount;
      if (goods) {
        const key = era === 'BronzeAge' ? 'ba' : 'ia';
        goods[key] = (goods[key] || 0) + amount;
      }
    },
    numAges: 2,
    fAgefromLevel: (level) => level,
    fGVGagesname: (level) => (level === 1 ? 'ba' : 'ia'),
  };
}

function createTooltipHTML() {
  return { goods: [], totalGoods: [], fp: [], clanGoods: [] };
}

function baseArgs(overrides = {}) {
  const helper = createHelper({ A: 'Alpha', B: 'Beta' });
  return {
    helper,
    tooltipHTML: createTooltipHTML(),
    City: {},
    fpBuildings: [],
    goodsList: {},
    ResourceDefs: [],
    Goods: {},
    specialGoods: new Set(),
    fGoodsHTML: (age) => `<goods:${age}>`,
    ...overrides,
  };
}

test('aggregateCityStats', async (t) => {
  await t.test('groups FP buildings and totals boosted output', () => {
    const args = baseArgs({
      City: { fpProductionBoost: 100 },
      fpBuildings: [
        { id: 'A', name: 'Alpha', fp: 10, isBoostable: true },
        { id: 'A', name: 'Alpha', fp: 10, isBoostable: true },
        { id: 'B', name: 'Beta', fp: 5, isBoostable: false },
      ],
    });

    aggregateCityStats(args);

    assert.equal(args.City.baseBoostableFp, 20);
    assert.equal(args.City.baseUnboostableFp, 5);
    // 20 boostable * 100% = 20 bonus, plus 20 base + 5 unboostable
    assert.equal(args.City.ForgePoints, 45);
    assert.match(args.tooltipHTML.fp, /20FP <strong>Alpha<\/strong> \(x2\)/);
    assert.match(args.tooltipHTML.fp, /Base: 25FP \(\+100% Boost = 45FP\)/);
  });

  await t.test('normalizes the known 21231 anomaly to 21207', () => {
    const args = baseArgs({
      fpBuildings: [{ id: 'A', name: 'Alpha', fp: 21231, isBoostable: true }],
    });

    aggregateCityStats(args);

    assert.equal(args.City.baseBoostableFp, 21207);
    assert.equal(args.City.ForgePoints, 21207);
  });

  await t.test('tallies goods, skips special goods, builds goods HTML', () => {
    const Goods = { ba: 0, ia: 0 };
    const helper = createHelper({}, Goods);
    const args = baseArgs({
      helper,
      Goods,
      goodsList: { good1: 5, promethium: 99 },
      specialGoods: new Set(['promethium']),
      ResourceDefs: [
        { id: 'good1', name: 'Lumber', era: 'BronzeAge' },
        { id: 'promethium', name: 'Promethium', era: 'BronzeAge' },
      ],
    });

    const { goodsHTML } = aggregateCityStats(args);

    assert.equal(args.City.baseBoostableFp, undefined);
    assert.equal(helper.tallies.BronzeAge, 5);
    assert.equal(Goods.ba, 5);
    assert.equal(args.tooltipHTML.goods.BronzeAge, '5 Lumber<br>');
    // Only the BronzeAge bucket has a tally, so one goods section renders.
    assert.equal(goodsHTML, '<goods:ba>');
  });

  await t.test('leaves tooltip empty when there are no FP buildings', () => {
    const args = baseArgs({ City: { fpProductionBoost: 50 } });
    aggregateCityStats(args);
    assert.deepEqual(args.tooltipHTML.fp, []);
  });
});
