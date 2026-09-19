import assert from 'node:assert/strict';
import test from 'node:test';
import BigNumber from 'bignumber.js';
import {
  calculateDailyProductionAid,
  extractEntityProductionData,
  isEntityAided,
  isEntityMotivatable,
} from '../../src/js/calc/prod/DailyProductionAidCalculator.js';
import {
  buildUnaidedIndicatorHTML,
  formatClanGoodsHTML,
  formatFpHTML,
  formatGoodsHTML,
  formatUnitsHTML,
} from '../../src/js/ui/components/statFormatters.js';
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
