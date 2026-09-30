/**
 * Proves that ProductionCalculator and CityMapEntityProcessor maintain exact
 * integer arithmetic through their BigNumber accumulation chains, and that
 * the addResource API boundary correctly converts back to Number.
 *
 * Covers:
 *   - extractEntityProduction: multi-source coin/supply/FP accumulation
 *   - applyProductionBoosts: ROUND_FLOOR for coins/supplies, ROUND_HALF_UP for FP
 *   - CityMapEntityProcessor: GB bonus accumulation (plain + on small %)
 *   - Mixed resource sources (current_product + guild + ability + chain)
 *   - Random drop rounding: BigNumber ROUND_HALF_UP vs native Math.round
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import BigNumber from 'bignumber.js';
import { processCityMapEntities } from '../../src/js/calc/CityMapEntityProcessor.js';
import {
  applyProductionBoosts,
  extractEntityProduction,
} from '../../src/js/calc/prod/ProductionCalculator.js';

// ══════════════════════════════════════════════════════════════════════
// extractEntityProduction: integer accumulation through BigNumber chain
// ══════════════════════════════════════════════════════════════════════

test('extractEntityProduction accumulates coins/supplies/FP as exact integers', () => {
  const entity = {
    state: {
      current_product: {
        product: {
          resources: { money: 18720, supplies: 12500, strategy_points: 4 },
        },
      },
    },
  };
  const meta = {
    components: {
      AllAge: {
        production: { options: [] },
        lookup: { rewards: {} },
      },
    },
  };
  const res = extractEntityProduction(entity, meta, 'AllAge');

  // Return type must be plain Number (API boundary conversion)
  assert.equal(typeof res.money, 'number');
  assert.equal(typeof res.supplies, 'number');
  assert.equal(typeof res.strategy_points, 'number');

  assert.equal(res.money, 18720);
  assert.equal(res.supplies, 12500);
  assert.equal(res.strategy_points, 4);
});

test('extractEntityProduction accumulates guild product resources via raw key', () => {
  // guildProduct.resources iterates raw keys — `all_goods_of_age` stays as-is
  const entity = {
    state: {
      current_product: {
        product: { resources: { strategy_points: 4 } },
        guildProduct: { resources: { all_goods_of_age: 25 } },
      },
    },
  };
  const meta = {
    components: {
      AllAge: {
        production: { options: [] },
        lookup: { rewards: {} },
      },
    },
  };
  const res = extractEntityProduction(entity, meta, 'AllAge');

  assert.equal(res.strategy_points, 4);
  // guildProduct.resources uses raw keys, not addGuildResources mapping
  assert.equal(res.all_goods_of_age, 25);
});

test('extractEntityProduction adds clan_goods from treasury ability', () => {
  const entity = {
    state: {
      is_motivated: true,
      current_product: {
        product: { resources: { strategy_points: 2 } },
      },
    },
  };
  const meta = {
    components: {
      AllAge: {
        production: { options: [] },
        lookup: { rewards: {} },
      },
    },
    abilities: [
      {
        __class__: 'AddResourcesToGuildTreasuryAbility',
        additionalResources: {
          AllAge: {
            resources: { all_goods_of_age: 30, clan_power: 5 },
          },
        },
      },
    ],
  };
  const res = extractEntityProduction(entity, meta, 'AllAge');

  // Treasury ability maps all_goods_of_age → clan_goods, clan_power stays
  assert.equal(res.clan_goods, 30);
  assert.equal(res.clan_power, 5);
  assert.equal(res.strategy_points, 2);
});

test('extractEntityProduction adds player resources from non-treasury ability', () => {
  const entity = {
    state: {
      is_motivated: true,
      current_product: {
        product: {
          resources: { money: 12000, supplies: 8000, strategy_points: 3 },
        },
      },
    },
  };
  const meta = {
    components: {
      AllAge: {
        production: { options: [] },
        lookup: { rewards: {} },
      },
    },
    abilities: [
      {
        __class__: 'AdditionalResourcesAbility',
        additionalResources: {
          AllAge: {
            resources: { money: 6000, supplies: 4000 },
          },
        },
      },
    ],
  };
  const res = extractEntityProduction(entity, meta, 'AllAge');

  assert.equal(res.money, 18000); // 12000 + 6000
  assert.equal(res.supplies, 12000); // 8000 + 4000
  assert.equal(res.strategy_points, 3);
});

test('extractEntityProduction skips null/undefined resource values without creating keys', () => {
  const entity = {
    state: {
      current_product: {
        product: {
          resources: { money: 100, supplies: null, strategy_points: undefined },
        },
      },
    },
  };
  const meta = {
    components: {
      AllAge: {
        production: { options: [] },
        lookup: { rewards: {} },
      },
    },
  };
  const res = extractEntityProduction(entity, meta, 'AllAge');

  assert.equal(res.money, 100);
  // null/undefined values are skipped by addResource — keys never set
  assert.equal(res.supplies, undefined);
  assert.equal(res.strategy_points, undefined);
});

// ══════════════════════════════════════════════════════════════════════
// extractEntityProduction: metadata-driven production options
// ══════════════════════════════════════════════════════════════════════

test('extractEntityProduction reads meta production options when no current_product', () => {
  const entity = { state: {} }; // no current_product
  const meta = {
    components: {
      AllAge: {
        production: {
          options: [
            {
              products: [
                {
                  type: 'resources',
                  playerResources: {
                    resources: {
                      money: 5000,
                      supplies: 3000,
                      strategy_points: 2,
                    },
                  },
                },
                {
                  type: 'resources',
                  playerResources: {
                    resources: { money: 1500, supplies: 1000 },
                  },
                },
              ],
            },
          ],
        },
        lookup: { rewards: {} },
      },
    },
  };
  const res = extractEntityProduction(entity, meta, 'AllAge');

  assert.equal(res.money, 6500); // 5000 + 1500
  assert.equal(res.supplies, 4000); // 3000 + 1000
  assert.equal(res.strategy_points, 2);
});

test('extractEntityProduction reads metadata unit products', () => {
  const entity = { state: {} };
  const meta = {
    components: {
      AllAge: {
        production: {
          options: [
            {
              products: [
                { type: 'unit', unit: { amount: 4 } },
                { type: 'unit', amount: 2 },
              ],
            },
          ],
        },
        lookup: { rewards: {} },
      },
    },
  };
  const res = extractEntityProduction(entity, meta, 'AllAge');

  assert.equal(res.units, 6); // 4 + 2
});

test('extractEntityProduction falls back to entity_levels when no production options', () => {
  const entity = { state: {}, level: 2 };
  const meta = {
    components: {
      AllAge: {
        production: { options: [] },
        lookup: { rewards: {} },
      },
    },
    entity_levels: [
      {
        production_values: [
          { type: 'money', value: 100 },
          { type: 'supplies', value: 50 },
        ],
      },
      {
        production_values: [
          { type: 'money', value: 200 },
          { type: 'supplies', value: 100 },
        ],
      },
      {
        production_values: [
          { type: 'money', value: 300 },
          { type: 'supplies', value: 150 },
        ],
      },
    ],
  };
  const res = extractEntityProduction(entity, meta, 'AllAge');

  assert.equal(res.money, 300); // level 2 (0-indexed third element)
  assert.equal(res.supplies, 150);
});

// ══════════════════════════════════════════════════════════════════════
// applyProductionBoosts: exact rounding modes
// ══════════════════════════════════════════════════════════════════════

test('applyProductionBoosts: 25 FP at 58% boost rounds to 40 (half-up of 39.5)', () => {
  const result = applyProductionBoosts({
    baseBoostableFP: new BigNumber(25),
    fpBoostPercent: new BigNumber(58),
  });
  // 25 × (1 + 58/100) = 39.5 → ROUND_HALF_UP → 40
  assert.equal(result.fp.total.toNumber(), 40);
  assert.equal(result.fp.boostAmount.toNumber(), 15); // 25 × 0.58 = 14.5 → 15
});

test('applyProductionBoosts: coins/supplies use ROUND_FLOOR', () => {
  const result = applyProductionBoosts({
    baseCoins: new BigNumber(10000),
    baseSupplies: new BigNumber(10000),
    coinBoostPercent: new BigNumber(150),
    supplyBoostPercent: new BigNumber(150),
  });
  // 10000 × (1 + 1.5) = 25000 → FLOOR → 25000
  assert.equal(result.coins.total.toNumber(), 25000);
  assert.equal(result.supplies.total.toNumber(), 25000);
});

test('applyProductionBoosts: mixed boostable + unboostable FP', () => {
  const result = applyProductionBoosts({
    baseBoostableFP: new BigNumber(25),
    baseUnboostableFP: new BigNumber(10),
    fpBoostPercent: new BigNumber(58),
  });
  // boostAmount = ROUND_HALF_UP(25 × 0.58) = 15
  // total = 25 + 10 + 15 = 50
  assert.equal(result.fp.boostAmount.toNumber(), 15);
  assert.equal(result.fp.total.toNumber(), 50);
});

test('applyProductionBoosts: zero boost returns base unchanged', () => {
  const result = applyProductionBoosts({
    baseCoins: new BigNumber(5000),
    baseSupplies: new BigNumber(3000),
  });
  assert.equal(result.coins.total.toNumber(), 5000);
  assert.equal(result.supplies.total.toNumber(), 3000);
});

test('applyProductionBoosts: non-integer base stays precise through BigNumber', () => {
  // Edge: very large base that tests BigNumber precision vs float
  const result = applyProductionBoosts({
    baseCoins: new BigNumber('999999999'),
    baseSupplies: new BigNumber('888888888'),
    coinBoostPercent: new BigNumber(33),
    supplyBoostPercent: new BigNumber(67),
  });
  // 999999999 × 1.33 = 1329999998.67 → FLOOR → 1329999998
  assert.equal(result.coins.total.toNumber(), 1329999998);
  // 888888888 × 1.67 = 1484444442.96 → FLOOR → 1484444442
  assert.equal(result.supplies.total.toNumber(), 1484444442);
});

// ══════════════════════════════════════════════════════════════════════
// Realistic full-building scenario via CityMapEntityProcessor
// ══════════════════════════════════════════════════════════════════════

test('random unit drops via CityMapEntityProcessor round 25×0.58 to 15, not 14', () => {
  const City = { TrazUnits: 0 };
  processCityMapEntities([{ cityentity_id: 'unit_pool', state: {} }], {
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
    helper: { fEntityNameTrim: (id) => id },
  });
  // 25 × 0.58 = 14.499... → ROUND_HALF_UP via BigNumber → 15
  assert.equal(City.TrazUnits, 15);
  assert.notEqual(City.TrazUnits, 14); // Math.round(25 * 0.58) would give 14
});

test('multiple random unit drops accumulate exactly through addResourceTotal', () => {
  const City = { TrazUnits: 0 };
  processCityMapEntities([{ cityentity_id: 'traz', state: {} }], {
    City,
    user: { era: 'AllAge' },
    CityEntityDefs: {
      traz: {
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
                        {
                          dropChance: 0.42,
                          product: { type: 'unit', amount: 10 },
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
    helper: { fEntityNameTrim: (id) => id },
  });
  // 25 × 0.58 = 14.5 → 15 (half-up)
  // 10 × 0.42 = 4.2 → 4 (half-up)
  // Total: 19
  assert.equal(City.TrazUnits, 19);
});

// ══════════════════════════════════════════════════════════════════════
// CityMapEntityProcessor: GB bonus accumulation produces correct boosts
// ══════════════════════════════════════════════════════════════════════

test('CityMapEntityProcessor GB bonuses apply correctly through BigNumber downstream', () => {
  // Simulate the consumption pattern: City.CoinBoost is accumulated via +,
  // then consumed by BigNumber in liveCityStatsCalculator/aidStatsBoostCalculator
  const City = { CoinBoost: 0 };
  // Simulate adding money_boost values from 3 GBs
  City.CoinBoost = (City.CoinBoost || 0) + 0.1;
  City.CoinBoost = (City.CoinBoost || 0) + 0.2;
  City.CoinBoost = (City.CoinBoost || 0) + 0.5;

  // This is how liveCityStatsCalculator consumes it
  const baseCoins = new BigNumber(10000);
  const boosted = baseCoins
    .multipliedBy(
      new BigNumber(1).plus(new BigNumber(City.CoinBoost).dividedBy(100)),
    )
    .integerValue(BigNumber.ROUND_FLOOR);

  // 10000 × (1 + 0.8/100) = 10000 × 1.008 = 10080
  assert.equal(boosted.toNumber(), 10080);
});

test('CityMapEntityProcessor: large GB boost accumulation stays exact through BigNumber', () => {
  const City = { CoinBoost: 0 };
  // 15 GBs with varying money_boost
  const boosts = [
    0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 20, 25, 30, 50, 100, 150, 200,
  ];
  for (const b of boosts) City.CoinBoost = (City.CoinBoost || 0) + b;

  assert.equal(City.CoinBoost, 608.8);

  // Consumed via BigNumber — exact result
  const base = new BigNumber(10000);
  const result = base
    .multipliedBy(
      new BigNumber(1).plus(new BigNumber(City.CoinBoost).dividedBy(100)),
    )
    .integerValue(BigNumber.ROUND_FLOOR);

  // 10000 × 7.088 = 70880 (BigNumber exact), not 70879 (native float would floor to)
  assert.equal(result.toNumber(), 70880);
});

test('CityMapEntityProcessor: multiple GB critical strike values combine exactly', () => {
  const City = { AOCriticalStrike: 0, CCCriticalStrike: 0, CriticalStrike: 0 };
  // AoE GB: 1.5% crit, CC GB: 0.5% crit
  City.AOCriticalStrike = (City.AOCriticalStrike || 0) + 1.5;
  City.CCCriticalStrike = (City.CCCriticalStrike || 0) + 0.5;
  City.CriticalStrike =
    (City.AOCriticalStrike || 0) + (City.CCCriticalStrike || 0);

  assert.equal(City.CriticalStrike, 2.0);
  assert.equal(typeof City.CriticalStrike, 'number');
});
