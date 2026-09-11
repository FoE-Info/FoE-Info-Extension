import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import renderLivePkg from '../../src/js/ui/renderLiveCityStats.js';

const { fGoodsText, fGoodsHTML, buildClanGoodsData } =
  renderLivePkg.default || renderLivePkg;

test('renderLiveCityStats Unit Suite', async (t) => {
  await t.test('fGoodsText applies production boost to formatted text', () => {
    const goods = { FutureEra: '100 Transester Gas<br>' };
    const text = fGoodsText('fe', goods, 50); // 50% boost -> 150
    assert.match(text, /150 Transester Gas/);
  });

  await t.test(
    'buildClanGoodsData calculates unboosted and boosted totals',
    () => {
      const buildings = [
        {
          id: 'b1',
          name: 'Statue of Honor',
          baseGoods: 100,
          isBoostable: true,
        },
      ];
      const store = {};
      const total = buildClanGoodsData(buildings, 20, store); // 20% boost -> 120
      assert.equal(total, 120);
      assert.match(store.clanGoods, /120 <strong>Statue of Honor<\/strong>/);
    },
  );
});

for (const [age, amounts] of Object.entries({
  sad: [2840, 3140, 3862],
  sash: [14947, 14457, 17782],
  sat: [7671, 7021, 8636],
  sajm: [123],
})) {
  for (const amount of amounts) {
    test(`goods detail preserves ${age} quantity ${amount}`, () => {
      assert.match(
        fGoodsHTML(age, {}, { [age]: amount }, 0),
        new RegExp(`>${age.toUpperCase()}:${amount}</span>`),
      );
    });
  }
}

test('goods detail boosts the actual quantity and tooltip consistently', () => {
  const html = fGoodsHTML(
    'sad',
    { StellarAgeDiscovery: '2840 Goods<br>' },
    { sad: 2840 },
    25,
  );
  assert.match(html, />SAD:3550<\/span>/);
  assert.match(html, /3550 Goods<br>/);
});

test('guild goods total preserves the sum of building contributions', () => {
  const store = {};
  const total = buildClanGoodsData(
    [{ name: 'Guild producer', baseGoods: 31615, isBoostable: false }],
    0,
    store,
  );
  assert.equal(total, 31615);
  assert.match(store.clanGoods, /31615 <strong>Guild producer<\/strong>/);
});

function loadLiveRenderer(goods, boost) {
  const moduleUrl = new URL(
    '../../src/js/ui/renderLiveCityStats.js',
    import.meta.url,
  );
  const require = createRequire(moduleUrl);
  const city = { goodsProductionBoost: boost };
  const ages = Object.keys(goods);
  // Replace browser-bound dependencies, executing the full renderer unchanged.
  const dependencies = {
    '../state/CityState.js': { City: city },
    '../vars/state.js': { Goods: goods },
    '../fn/helper.js': {
      numAges: ages.length,
      fAgefromLevel: (level) => ages[level - 1],
      fGVGagesname: (age) => age.toUpperCase(),
    },
    './renderCityStats.js': { renderCityStats() {} },
    '../utils/logger.js': { createLogger: () => ({ info() {} }) },
  };
  const context = {
    module: { exports: {} },
    performance,
    require: (id) => dependencies[id] || require(id),
  };
  vm.runInNewContext(fs.readFileSync(moduleUrl, 'utf8'), context);
  return context.module.exports.renderLiveCityStats;
}

for (const [boost, expected, total] of [
  [
    0,
    { sad: '2840', sash: '14947', sat: '7671', sajm: '123', ba: '5' },
    '25586',
  ],
  [
    25,
    { sad: '3550', sash: '18684', sat: '9589', sajm: '154', ba: '6' },
    '31983',
  ],
]) {
  test(`live goods total includes actual era quantities with ${boost}% boost`, () => {
    const goods = {
      sad: 2840,
      sash: 14947,
      sat: 7671,
      sajm: 123,
      ba: 5,
      ia: 0,
    };
    const render = loadLiveRenderer(goods, boost);
    const stats = render();
    assert.equal(stats.goods.total.toString(), total);
    assert.deepEqual(
      Object.keys(stats.goods.byEra).sort(),
      Object.keys(expected).sort(),
    );
    for (const [age, amount] of Object.entries(expected)) {
      assert.equal(stats.goods.byEra[age].toString(), amount);
      assert.match(
        stats.goodsHTML,
        new RegExp(`>${age.toUpperCase()}:${amount}</span>`),
      );
    }
    assert.doesNotMatch(stats.goodsHTML, /id="ia"/);
    goods.sajm = 200;
    assert.equal(render().goods.byEra.sajm.toString(), boost ? '250' : '200');
  });
}
