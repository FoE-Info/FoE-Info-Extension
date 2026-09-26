import assert from 'node:assert/strict';
import test from 'node:test';
import BigNumber from 'bignumber.js';
import { processCityMapEntities } from '../../src/js/calc/CityMapEntityProcessor.js';
import {
  createHarvestAccumulator,
  parseCurrentProduct,
  parseProductionOption,
} from '../../src/js/calc/entities/harvestAccumulator.js';
import { getSafe } from '../../src/js/calc/gbDonationPlaceEvaluator.js';
import { formatCampsText } from '../../src/js/calc/GbgCalculator.js';
import { buildClanGoodsData } from '../../src/js/calc/goodsTooltipFormatter.js';
import { extractEntityProduction } from '../../src/js/calc/prod/ProductionCalculator.js';
import startup from '../../src/js/msg/StartupService.js';

const helper = {
  fEntityNameTrim: (id) => id,
  fGVGagesname: (era) => era,
  numAges: 0,
};

test('fresh startup FP base overwrites the early cached boost with exact half-up arithmetic', () => {
  const City = { fpProductionBoost: 58, ForgePoints: 0 };
  const tooltipHTML = { fp: '', goods: [] };
  startup.aggregateCityStats({
    City,
    fpBuildings: [{ id: 'fp', fp: 25, isBoostable: true }],
    tooltipHTML,
    helper,
  });
  assert.equal(City.baseBoostableFp, 25);
  assert.equal(City.ForgePoints, 40); // 25 + round_half_up(25 * .58) = 40
  assert.notEqual(City.ForgePoints, 39); // applying 58% as a native .58 factor can round the bonus down to 14
  assert.match(tooltipHTML.fp, /Boost = 40FP/);
});

test('current_product and productionOption fallbacks keep numeric City resource totals', () => {
  const City = { ForgePoints: 10, Coins: 100, Supplies: 200, TrazUnits: 2 };
  const accum = createHarvestAccumulator();
  const mapID = {
    type: 'greatbuilding',
    id: 1,
    state: { __class__: 'ProducingState' },
  };
  parseCurrentProduct({
    curProduct: {
      product: { resources: { strategy_points: 25, money: 58, supplies: 12 } },
      asset_name: 'penal_unit',
      amount: 5,
    },
    cid: 'current',
    mapID,
    City,
    accum,
    Galaxy: { bonus: [] },
    MyInfo: { era: 'AllAge' },
    ResourceDefs: [],
    helper,
  });
  parseProductionOption({
    prodOpt: {
      products: [
        {
          playerResources: {
            resources: { strategy_points: 4, money: 2, supplies: 3 },
          },
        },
      ],
      asset_name: 'penal_unit',
      amount: 7,
    },
    cid: 'option',
    mapID,
    City,
    accum,
    Galaxy: { bonus: [] },
    ResourceDefs: [],
    helper,
  });
  assert.deepEqual(
    {
      fp: City.ForgePoints,
      coins: City.Coins,
      supplies: City.Supplies,
      units: City.TrazUnits,
    },
    { fp: 39, coins: 160, supplies: 215, units: 14 },
  );
  assert.equal(typeof City.TrazUnits, 'number');
  assert.notEqual(City.ForgePoints, 35); // both harvest shapes must contribute
});

test('unit chance totals survive aid-stat failure and round 25 at 58% to 15, not 14', () => {
  const City = { TrazUnits: 0 };
  const result = processCityMapEntities(
    [{ cityentity_id: 'unit_pool', state: {} }],
    {
      City,
      user: { era: 'AllAge' },
      CityEntityDefs: {
        unit_pool: {
          components: {
            AllAge: {
              production: {
                options: [
                  {
                    products: [
                      {
                        type: 'random',
                        products: [
                          {
                            dropChance: 0.58,
                            product: { type: 'unit', amount: 25 },
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            },
          },
        },
      },
      // A missing aid-stat dependency must not discard the legacy unit total.
      helper: {
        fEntityNameTrim: () => {
          throw new Error('aid metadata unavailable');
        },
      },
    },
  );
  assert.equal(result.aidStats, null);
  assert.equal(City.TrazUnits, 15);
  assert.notEqual(City.TrazUnits, 14); // Math.round(25 * .58) = 14
  assert.equal(typeof City.TrazUnits, 'number');
});

test('generic rewards have only the default-one and BigNumber chance entry paths', () => {
  const rewards = {
    direct: { type: 'unit', amount: 25 },
    chance: { type: 'unit', amount: 25 },
  };
  const result = extractEntityProduction(
    { state: {} },
    {
      components: {
        AllAge: {
          lookup: { rewards },
          production: {
            options: [
              {
                products: [
                  { type: 'genericReward', reward: { id: 'direct' } },
                  {
                    type: 'random',
                    products: [
                      {
                        dropChance: 0.58,
                        product: {
                          type: 'genericReward',
                          reward: { id: 'chance' },
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    },
    'AllAge',
  );
  assert.equal(result.units, 40); // default 25 + chance 15
  assert.notEqual(result.units, 39); // native 25 * .58 would round to 14
});

test('GB safe-place math does not coerce BigNumber donations to unsafe native Numbers', () => {
  const { safe, donateSuggest } = getSafe({
    place: 1,
    remaining: '9007199254740993',
    GBrewards: [1, 0, 0, 0, 0],
    Top: [0, '9007199254740992', 0, 0, 0, 0],
    calculateSuggestedDonation: () => new BigNumber('9007199254740992'),
  });
  assert.equal(donateSuggest[0].toFixed(), '9007199254740992');
  assert.equal(safe[0], false); // exact remainder 1 > (suggested - Top[1]) 0
  assert.notEqual(safe[0], true); // coercing remaining to Number yields remainder 0
});

test('GBG camp percentages preserve decimal subtraction exactly', () => {
  assert.equal(formatCampsText(33.3, 33.4, true), '(66.7% / 33.3% UC)');
  assert.notEqual(
    formatCampsText(33.3, 33.4, true),
    '(66.7% / 33.300000000000004% UC)',
  );
});

test('guild treasury accumulation does not surface native float drift', () => {
  const tooltip = {};
  const total = buildClanGoodsData(
    [
      { id: 'Alpha', name: 'Alpha', goods: 0.1 },
      { id: 'Beta', name: 'Beta', goods: 0.2 },
    ],
    0,
    tooltip,
  );
  assert.equal(total, 0.3);
  assert.notEqual(total, 0.30000000000000004);
  assert.match(tooltip.clanGoods, /0.1 <strong>Alpha<\/strong>/);
  assert.match(tooltip.clanGoods, /0.2 <strong>Beta<\/strong>/);
});

test('fractional treasury entries retain their exact sum before display', () => {
  const accum = createHarvestAccumulator();
  parseCurrentProduct({
    curProduct: { guildProduct: { resources: { iron: 0.1, copper: 0.2 } } },
    cid: 'guild',
    mapID: { type: 'residential', state: {} },
    City: {},
    accum,
    Galaxy: { bonus: [] },
    MyInfo: { era: 'AllAge' },
    ResourceDefs: [
      { id: 'iron', era: 'AllAge' },
      { id: 'copper', era: 'AllAge' },
    ],
    helper,
  });
  assert.equal(accum.clanGoods, 0.3);
  assert.notEqual(accum.clanGoods, 0.30000000000000004);
  assert.equal(accum.clanGoodsBuildings[0].goods, 0.3);
});
