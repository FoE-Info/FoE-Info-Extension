import assert from 'node:assert/strict';
import test from 'node:test';
import BigNumber from 'bignumber.js';
import {
  calculateDailyProductionAid,
  isEntityAided,
  isEntityMotivatable,
} from '../../src/js/calc/prod/DailyProductionAidCalculator.js';
import {
  buildUnaidedIndicatorHTML,
  formatFpHTML,
  formatGoodsHTML,
} from '../../src/js/ui/components/statFormatters.js';
import { renderLiveCityStats } from '../../src/js/ui/renderLiveCityStats.js';
import { buildOwnCityCard } from '../../src/js/ui/templates/ownCityCard.js';

test('DailyProductionAidCalculator - isEntityMotivatable identifies motivatable buildings', () => {
  const gbEntity = {
    cityentity_id: 'X_ProgressiveEra_Landmark1',
    type: 'greatbuilding',
  };
  const gbMeta = { type: 'greatbuilding', name: 'Alcatraz' };
  assert.equal(isEntityMotivatable(gbEntity, gbMeta), false);

  const genericMeta = {
    __class__: 'GenericCityEntity',
    components: { AllAge: { socialInteraction: {} } },
  };
  assert.equal(
    isEntityMotivatable({ cityentity_id: 'R_MultiAge_Event1' }, genericMeta),
    true,
  );

  const motivatableAbilityMeta = {
    abilities: [{ __class__: 'MotivatableAbility' }],
  };
  assert.equal(
    isEntityMotivatable({ cityentity_id: 'b1' }, motivatableAbilityMeta),
    true,
  );

  const polishableMeta = {
    abilities: [{ __class__: 'PolishableAbility' }],
  };
  assert.equal(
    isEntityMotivatable({ cityentity_id: 'd1' }, polishableMeta),
    true,
  );

  const randomUnitMeta = {
    abilities: [
      { __class__: 'RandomUnitOfAgeWhenMotivatedAbility', amount: 5 },
    ],
  };
  assert.equal(
    isEntityMotivatable({ cityentity_id: 'u1' }, randomUnitMeta),
    true,
  );

  const nonMotivatableMeta = {
    abilities: [{ __class__: 'AddResourcesToGuildTreasuryAbility' }],
  };
  assert.equal(
    isEntityMotivatable({ cityentity_id: 't1' }, nonMotivatableMeta),
    false,
  );
});

test('DailyProductionAidCalculator - isEntityAided detects motivation and polishing states', () => {
  assert.equal(isEntityAided({ state: { is_motivated: true } }, {}), true);
  assert.equal(isEntityAided({ state: { boosted: true } }, {}), true);
  assert.equal(
    isEntityAided(
      {
        state: {
          socialInteractionStartedAt: 1000,
          socialInteractionId: 'motivate',
        },
      },
      {},
    ),
    true,
  );

  const nowSec = Math.floor(Date.now() / 1000);
  assert.equal(
    isEntityAided(
      {
        state: {
          socialInteractionStartedAt: nowSec - 1000,
          socialInteractionId: 'polish',
        },
      },
      {},
    ),
    true,
  );
  assert.equal(
    isEntityAided(
      {
        state: {
          socialInteractionStartedAt: nowSec - 50000,
          socialInteractionId: 'polish',
        },
      },
      {},
    ),
    false,
  );

  assert.equal(isEntityAided({ state: { is_motivated: false } }, {}), false);
  assert.equal(isEntityAided({ state: {} }, {}), false);
});

test('DailyProductionAidCalculator - calculateDailyProductionAid when all buildings are aided', () => {
  const meta = {
    __class__: 'GenericCityEntity',
    name: 'Neo Solara Emporium',
    components: {
      SpaceAgeSpaceHub: {
        production: {
          options: [
            {
              products: [
                {
                  type: 'resources',
                  playerResources: {
                    resources: { strategy_points: 300, money: 10000 },
                  },
                },
                {
                  type: 'unit',
                  amount: 20,
                },
              ],
            },
          ],
        },
      },
    },
  };

  const entities = [
    {
      id: 1,
      cityentity_id: 'W_MultiAge_NeoSolara',
      state: { is_motivated: true },
    },
  ];

  const result = calculateDailyProductionAid({
    entities,
    CityEntityDefs: { W_MultiAge_NeoSolara: meta },
    playerEra: 'SpaceAgeSpaceHub',
    boosts: { fp: 10 },
  });

  // 300 FP + 10% boost (30 FP) = 330 FP
  assert.equal(result.max.fp.toNumber(), 330);
  assert.equal(result.current.fp.toNumber(), 330);
  assert.equal(result.diff.fp.toNumber(), 0);
  assert.equal(result.unaided.fp.length, 0);
  assert.equal(result.unaided.units.length, 0);
});

test('DailyProductionAidCalculator - calculateDailyProductionAid when buildings are unaided', () => {
  const metaSolara = {
    __class__: 'GenericCityEntity',
    name: 'Neo Solara Emporium',
    components: {
      AllAge: { socialInteraction: {} },
      SpaceAgeSpaceHub: {
        production: {
          options: [
            {
              products: [
                {
                  type: 'resources',
                  onlyWhenMotivated: true,
                  playerResources: { resources: { strategy_points: 300 } },
                },
                {
                  type: 'unit',
                  onlyWhenMotivated: true,
                  amount: 20,
                },
              ],
            },
          ],
        },
      },
    },
  };

  const entities = [
    // 2 unaided Neo Solaras
    {
      id: 1,
      cityentity_id: 'W_MultiAge_NeoSolara',
      state: { is_motivated: false },
    },
    {
      id: 2,
      cityentity_id: 'W_MultiAge_NeoSolara',
      state: { is_motivated: false },
    },
    // 1 aided Neo Solara
    {
      id: 3,
      cityentity_id: 'W_MultiAge_NeoSolara',
      state: { is_motivated: true },
    },
  ];

  const result = calculateDailyProductionAid({
    entities,
    CityEntityDefs: { W_MultiAge_NeoSolara: metaSolara },
    playerEra: 'SpaceAgeSpaceHub',
    boosts: { fp: 0 },
  });

  // Max FP: 3 * 300 = 900 FP
  assert.equal(result.max.fp.toNumber(), 900);
  // Current FP: 1 * 300 = 300 FP (only the 1 aided)
  assert.equal(result.current.fp.toNumber(), 300);
  // Diff FP: 600 FP
  assert.equal(result.diff.fp.toNumber(), 600);

  // Unaided FP list grouped: Neo Solara Emporium (x2) with diff 600
  assert.equal(result.unaided.fp.length, 1);
  assert.equal(result.unaided.fp[0].name, 'Neo Solara Emporium');
  assert.equal(result.unaided.fp[0].count, 2);
  assert.equal(result.unaided.fp[0].diff, 600);

  // Max Units: 3 * 20 = 60 Units; Current: 20; Diff: 40
  assert.equal(result.max.units.toNumber(), 60);
  assert.equal(result.current.units.toNumber(), 20);
  assert.equal(result.diff.units.toNumber(), 40);
  assert.equal(result.unaided.units.length, 1);
  assert.equal(result.unaided.units[0].count, 2);
  assert.equal(result.unaided.units[0].diff, 40);
});

test('UI - buildUnaidedIndicatorHTML renders warning popover when unaided buildings exist', () => {
  const aidStats = {
    current: { fp: new BigNumber(3000), units: new BigNumber(20) },
    max: { fp: new BigNumber(9000), units: new BigNumber(60) },
    diff: { fp: new BigNumber(6000), units: new BigNumber(40) },
    unaided: {
      fp: [{ name: 'Neo Solara Emporium', count: 2, diff: 6000 }],
      units: [{ name: 'Neo Solara Emporium', count: 2, diff: 40 }],
    },
  };

  const fpIndicator = buildUnaidedIndicatorHTML({
    resource: 'fp',
    aidStats,
    prefix: 'citystats',
    exact: true,
  });

  assert.ok(fpIndicator.includes('citystats-fp-unaided'));
  assert.ok(fpIndicator.includes('warning'));
  assert.ok(
    fpIndicator.includes('Mass Self-Aid recommended before collection!'),
  );
  assert.ok(fpIndicator.includes('Neo Solara Emporium (x2)'));
  assert.ok(fpIndicator.includes('-6,000'));

  // When no unaided buildings for a category:
  const goodsIndicator = buildUnaidedIndicatorHTML({
    resource: 'goods',
    aidStats,
    prefix: 'citystats',
  });
  assert.equal(goodsIndicator, '');
});

test('UI - formatFpHTML and ownCityCard append unaided indicators to Daily Production', () => {
  const aidStats = {
    current: {
      fp: new BigNumber(3000),
      units: new BigNumber(20),
      coins: new BigNumber(5000),
    },
    max: {
      fp: new BigNumber(9000),
      units: new BigNumber(60),
      coins: new BigNumber(10000),
    },
    diff: {
      fp: new BigNumber(6000),
      units: new BigNumber(40),
      coins: new BigNumber(5000),
    },
    unaided: {
      fp: [{ name: 'Neo Solara Emporium', count: 2, diff: 6000 }],
      units: [{ name: 'Neo Solara Emporium', count: 2, diff: 40 }],
      coins: [{ name: 'Residential House', count: 1, diff: 5000 }],
    },
  };

  const { fpHTML } = formatFpHTML(
    { fp: { total: 9000 }, aidStats },
    {},
    'citystats',
    true,
  );
  assert.ok(fpHTML.includes('citystats-fp-unaided'));
  assert.ok(fpHTML.includes('warning'));

  const cardHTML = buildOwnCityCard({
    prefix: 'citystats',
    playerName: 'Tester',
    playerInfo: {},
    stats: { aidStats },
    isCollapsed: false,
    fpHTML,
    coins: { total: 10000, boostPercent: 0 },
    supplies: { total: 5000, boostPercent: 0 },
    goodsDisplay: '100',
    goodsBoostText: '',
    goodsHTML: '<span>100</span>',
    clanGoodsHTML: '<span>50</span>',
    spec: {},
    units: { daily: 60 },
    mil: {
      red: { base: {}, gbg: {}, ge: {}, qi: {} },
      blue: { base: {}, gbg: {}, ge: {}, qi: {} },
    },
    exact: true,
  });

  // Contains both the FP and Coins unaided indicators
  assert.ok(cardHTML.includes('citystats-fp-unaided'));
  assert.ok(cardHTML.includes('citystats-coins-unaided'));
});

test('DailyProductionAidCalculator - calculates max potential goods by era with previous/current/next attribution', () => {
  const metaPreviousAndNext = {
    __class__: 'GenericCityEntity',
    name: 'Temporal Bazaar',
    components: {
      AllAge: { socialInteraction: {} },
      FutureEra: {
        production: {
          options: [
            {
              products: [
                {
                  type: 'resources',
                  onlyWhenMotivated: true,
                  playerResources: {
                    resources: {
                      all_goods_of_age: 50, // 50 FutureEra goods
                      all_goods_of_previous_age: 25, // 25 TomorrowEra goods
                      all_goods_of_next_age: 20, // 20 ArcticFuture goods
                    },
                  },
                },
              ],
            },
          ],
        },
      },
    },
  };

  const ResourceDefs = [
    { id: 'superconductors', name: 'Superconductors', era: 'FutureEra' },
  ];

  const entities = [
    {
      id: 1,
      cityentity_id: 'W_MultiAge_TemporalBazaar',
      level: 13, // FutureEra
      state: { is_motivated: false }, // unaided!
    },
  ];

  const result = calculateDailyProductionAid({
    entities,
    CityEntityDefs: { W_MultiAge_TemporalBazaar: metaPreviousAndNext },
    playerEra: 'FutureEra',
    boosts: { goods: 10 }, // 10% goods boost
    ResourceDefs,
  });

  // Max goodsByEra should contain boosted yields:
  // FE: 50 + 10% = 55
  // TE (Previous): 25 + 10% = 28 (27.5 rounded half-up = 28)
  // AF (Next): 20 + 10% = 22
  assert.equal(result.max.goodsByEra.FutureEra.toNumber(), 55);
  assert.equal(result.max.goodsByEra.TomorrowEra.toNumber(), 28);
  assert.equal(result.max.goodsByEra.ArcticFuture.toNumber(), 22);

  // Total max goods: 55 + 28 + 22 = 105
  assert.equal(result.max.goods.toNumber(), 105);

  // Current goods (building is unaided): 0
  assert.equal(result.current.goods.toNumber(), 0);
  assert.equal(result.diff.goods.toNumber(), 105);
  assert.equal(result.unaided.goods.length, 1);
  assert.equal(result.unaided.goods[0].name, 'Temporal Bazaar');
  assert.equal(result.unaided.goods[0].diff, 95); // base unboosted diff: 50 + 25 + 20 = 95
});

test('UI - buildUnaidedIndicatorHTML dark theme contrast and no duplicate inner tooltip', () => {
  const aidStats = {
    current: { goods: new BigNumber(100) },
    max: { goods: new BigNumber(300) },
    diff: { goods: new BigNumber(200) },
    unaided: {
      goods: [{ name: 'Event Building', count: 1, diff: 200 }],
    },
  };

  const html = buildUnaidedIndicatorHTML({
    resource: 'goods',
    aidStats,
    prefix: 'citystats',
  });

  // Dark amber styling instead of washed-out alert-warning
  assert.ok(html.includes('background-color: rgba(255, 193, 7, 0.15)'));
  assert.ok(html.includes('color: #ffca2c'));
  assert.ok(html.includes('text-nowrap'));

  // Single scrollbar invariant: Ensure no inner max-height or overflow-y on .unaided-building-list
  assert.ok(!html.includes('max-height: 160px'));
  assert.ok(!html.includes('overflow-y: auto'));

  // Ensure NO title attribute on the inner icon (which creates duplicate browser tooltip)
  assert.ok(
    !html.includes(
      'class="material-icons-outlined text-warning" style="font-size: 14px; line-height: 1; vertical-align: middle; cursor: pointer;" title=',
    ),
  );

  // Ensure formatGoodsHTML keeps trailingHTML grouped without breaking
  const formatted = formatGoodsHTML(
    {
      goodsHTML: '<span>AF:10 FE:2801 TE:722</span>',
      aidStats,
      goodsBoostPercent: 1,
    },
    {},
    'citystats',
  );
  assert.ok(
    formatted.includes(
      '<span class="text-nowrap">(+1%)<span id="citystats-goods-unaided"',
    ),
  );
});

test('UI - renderLiveCityStats renders max potential goods by era when aidStats is present', () => {
  const aidStats = {
    max: {
      fp: new BigNumber(1000),
      goods: new BigNumber(10668),
      goodsByEra: {
        ArcticFuture: new BigNumber(2718),
        FutureEra: new BigNumber(7199),
        TomorrowEra: new BigNumber(751),
      },
    },
  };

  const stats = renderLiveCityStats({
    aidStats,
  });

  assert.ok(stats.goodsHTML.includes('AF:2718'));
  assert.ok(stats.goodsHTML.includes('FE:7199'));
  assert.ok(stats.goodsHTML.includes('TE:751'));
  assert.equal(stats.goods.total.toNumber(), 10668);
});

test('DailyProductionAidCalculator - treasury abilities do not leak to player goods, and GBs are not boosted by guild goods boost', () => {
  const metaStatueOfHonor = {
    __class__: 'GenericCityEntity',
    name: 'Statue of Honor',
    abilities: [
      {
        __class__: 'AddResourcesToGuildTreasuryAbility',
        additionalResources: {
          AllAge: { resources: { all_goods_of_age: 80 } },
          SpaceAgeSpaceHub: { resources: { clan_power: 823 } },
        },
      },
    ],
  };

  const arcGbEntity = {
    cityentity_id: 'X_FutureEra_Landmark1',
    type: 'greatbuilding',
    state: {
      current_product: {
        name: 'clan_goods',
        goods: [
          { good_id: 'trans_tin', value: 368 },
          { good_id: 'purified_water', value: 368 },
          { good_id: 'algae', value: 368 },
          { good_id: 'superconductors', value: 368 },
          { good_id: 'nanoparticles', value: 368 },
        ],
      },
    },
  };

  const entities = [
    {
      id: 1,
      cityentity_id: 'W_MultiAge_StatueOfHonor',
      state: {},
    },
    arcGbEntity,
  ];

  const result = calculateDailyProductionAid({
    entities,
    CityEntityDefs: {
      W_MultiAge_StatueOfHonor: metaStatueOfHonor,
    },
    playerEra: 'SpaceAgeSpaceHub',
    boosts: { guildGoods: 10 }, // 10% guild goods boost
  });

  // Player goods must be 0 (treasury goods never leak into player goods)
  assert.equal(result.max.goods.toNumber(), 0);

  // Arc produces 5 * 368 = 1840 guild goods, unboostable GB
  // Statue of Honor produces 80 guild goods, boostable event building:
  // 80 base / 5 = 16 per good. 16 * 10% = 1.6 -> rounded 2. 2 * 5 = 10 boosted extra.
  // 80 + 10 = 90 boosted event clan goods.
  // Total max clan goods: 1840 (Arc) + 90 (SOH) = 1930
  assert.equal(result.max.baseClanGoods.toNumber(), 1920); // 1840 + 80
  assert.equal(result.max.clanGoods.toNumber(), 1930);
  assert.equal(result.max.baseBoostableClanGoods.toNumber(), 80);
  assert.equal(result.max.baseUnboostableClanGoods.toNumber(), 1840);
});
