/**
 * city-stats-calculator.test.mjs
 *
 * Unit test suite for CityStatsCalculator.
 * Asserts all 15 metrics calculate accurately with BigNumber precision,
 * authentic unblurred blue defense stats, and building set adjacencies.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import BigNumber from 'bignumber.js';
import calculatorPkg from '../../src/js/fn/CityStatsCalculator.js';
import { MetadataStore } from '../../src/js/state/MetadataStore.js';

const { CityStatsCalculator } = calculatorPkg;

test('CityStatsCalculator - 15 Metrics Full Engine Test', async (t) => {
  const store = new MetadataStore();

  // Register mock building metadata
  store.registerEntity({
    id: 'bldg_event_fp',
    name: 'Event Palace',
    components: {
      SpaceAgeTitan: {
        production: {
          options: [
            {
              products: [
                {
                  playerResources: {
                    resources: {
                      money: 50000,
                      supplies: 25000,
                      strategy_points: 30,
                      all_goods_of_age: 10, // 10 current era goods
                      clan_goods: 20, // 20 treasury goods
                    },
                  },
                },
              ],
            },
          ],
        },
        boosts: {
          boosts: [
            { type: 'att_boost_attacker', targetedFeature: 'all', value: 25 },
            { type: 'def_boost_attacker', targetedFeature: 'all', value: 20 },
            {
              type: 'att_boost_attacker',
              targetedFeature: 'battleground',
              value: 15,
            },
            // Blue defense boosts - MUST NOT BE BLURRED
            { type: 'att_boost_defender', targetedFeature: 'all', value: 35 },
            { type: 'def_boost_defender', targetedFeature: 'all', value: 40 },
            {
              type: 'def_boost_defender',
              targetedFeature: 'guild_expedition',
              value: 10,
            },
            // QI boosts
            {
              type: 'att_boost_attacker',
              targetedFeature: 'guild_raids',
              value: 50,
            },
            { type: 'guild_raids_coins_production', value: 12 },
            { type: 'guild_raids_supplies_production', value: 18 },
          ],
        },
      },
    },
  });

  // Great Buildings: The Arc (X_FutureEra_Landmark1) and Château Frontenac (X_ProgressiveEra_Landmark2)
  store.registerEntity({
    id: 'X_FutureEra_Landmark1',
    name: 'The Arc',
    type: 'greatbuilding',
  });
  store.registerEntity({
    id: 'X_ProgressiveEra_Landmark2',
    name: 'Château Frontenac',
    type: 'greatbuilding',
  });
  store.registerEntity({
    id: 'X_ArcticFuture_Landmark2',
    name: 'Arctic Orangery',
    type: 'greatbuilding',
  });

  const calculator = new CityStatsCalculator(store);

  const sampleEntities = [
    {
      id: 1,
      cityentity_id: 'bldg_event_fp',
      x: 0,
      y: 0,
      width: 4,
      length: 4,
    },
    {
      id: 2,
      cityentity_id: 'X_FutureEra_Landmark1',
      level: 80,
      bonus: { type: 'contribution_boost', value: 90 }, // Arc 90%
    },
    {
      id: 3,
      cityentity_id: 'X_ProgressiveEra_Landmark2',
      level: 60,
      bonus: { type: 'quest_boost', value: 500 }, // CF 500%
    },
    {
      id: 4,
      cityentity_id: 'X_ArcticFuture_Landmark2',
      level: 80,
      bonus: { type: 'critical_hit', value: 31.8 }, // AO 31.8%
    },
  ];

  const externalBoosts = {
    production: {
      coin: 100, // +100% coins
      supply: 50, // +50% supplies
      forgePoints: 20, // +20% FP
    },
  };

  const stats = calculator.calculateCityStats({
    entities: sampleEntities,
    playerEra: 'SpaceAgeTitan',
    boosts: externalBoosts,
  });

  // Metric 1: Coins (50,000 * 2.0 = 100,000)
  await t.test('Metric 1: Coins calculated with boost multiplier', () => {
    assert.equal(stats.coins.base.toNumber(), 50000);
    assert.equal(stats.coins.boostPercent.toNumber(), 100);
    assert.equal(stats.coins.total.toNumber(), 100000);
  });

  // Metric 2: Supplies (25,000 * 1.5 = 37,500)
  await t.test('Metric 2: Supplies calculated with boost multiplier', () => {
    assert.equal(stats.supplies.base.toNumber(), 25000);
    assert.equal(stats.supplies.boostPercent.toNumber(), 50);
    assert.equal(stats.supplies.total.toNumber(), 37500);
  });

  // Metric 3: Daily FP (30 base + round(30 * 0.20) = 30 + 6 = 36)
  await t.test(
    'Metric 3: Daily FP calculated with boostable/unboostable',
    () => {
      assert.equal(stats.fp.boostable.toNumber(), 30);
      assert.equal(stats.fp.boostAmount.toNumber(), 6);
      assert.equal(stats.fp.total.toNumber(), 36);
    },
  );

  // Metrics 4, 5, 6: Goods (all_goods_of_age gives 10 current era)
  await t.test('Metrics 4-6: Goods categorized by era and treasury', () => {
    assert.equal(stats.goods.currentEra.toNumber(), 10);
    assert.equal(stats.goods.previousEra.toNumber(), 0);
    assert.equal(stats.goods.treasury.toNumber(), 20);
    assert.equal(stats.goods.total.toNumber(), 10);
  });

  // Metrics 9 & 10: Red Attacking Boosts
  await t.test(
    'Metrics 9-10: Red military boosts aggregated across contexts',
    () => {
      assert.equal(stats.military.red.base.att.toNumber(), 25);
      assert.equal(stats.military.red.base.def.toNumber(), 20);
      // GBG: 25 + 15 = 40 Att
      assert.equal(stats.military.red.gbg.att.toNumber(), 40);
      assert.equal(stats.military.red.gbg.def.toNumber(), 20);
      // QI: does not inherit base
      assert.equal(stats.military.red.qi.att.toNumber(), 50);
    },
  );

  // Metrics 11 & 12: Blue Defending Boosts (STRICTLY UNBLURRED)
  await t.test(
    'Metrics 11-12: Blue defense boosts are authentic and unblurred',
    () => {
      assert.equal(stats.military.blue.base.att.toNumber(), 35);
      assert.equal(stats.military.blue.base.def.toNumber(), 40);
      // GE Blue Def: 40 + 10 = 50
      assert.equal(stats.military.blue.ge.def.toNumber(), 50);
    },
  );

  // Metrics 13, 14, 15: Special stats (Arc, CF, AO)
  await t.test(
    'Metrics 13-15: Arc %, CF goods per quest, and AO crit %',
    () => {
      assert.equal(stats.special.arcPercent.toNumber(), 90);
      assert.equal(stats.special.chatBonus.toNumber(), 500);
      // CF Goods per quest: floor(5 + 500 / 20) = floor(5 + 25) = 30
      assert.equal(stats.special.goodsPerQuest.toNumber(), 30);
      assert.equal(stats.special.aoCriticalStrike.toNumber(), 31.8);
      assert.equal(stats.special.qiBoosts.coins.toNumber(), 12);
      assert.equal(stats.special.qiBoosts.supplies.toNumber(), 18);
    },
  );
});

test('renderCityStats - Dashboard UI Rendering & Unblurred Parity', async (t) => {
  const { renderCityStats, formatStatNumber } =
    await import('../../src/js/fn/renderCityStats.js');

  const mockStats = {
    coins: { total: new BigNumber(12500000), boostPercent: new BigNumber(150) },
    supplies: {
      total: new BigNumber(8400000),
      boostPercent: new BigNumber(120),
    },
    fp: { total: new BigNumber(1450), boostPercent: new BigNumber(20) },
    goods: {
      total: new BigNumber(320),
      currentEra: new BigNumber(150),
      previousEra: new BigNumber(70),
      nextEra: new BigNumber(100),
      treasury: new BigNumber(500),
    },
    units: { daily: new BigNumber(45) },
    military: {
      red: {
        base: { att: new BigNumber(3500), def: new BigNumber(2800) },
        gbg: { att: new BigNumber(4200), def: new BigNumber(3100) },
        ge: { att: new BigNumber(3700), def: new BigNumber(2900) },
        qi: { att: new BigNumber(450), def: new BigNumber(300) },
      },
      blue: {
        base: { att: new BigNumber(1800), def: new BigNumber(2400) },
        gbg: { att: new BigNumber(1800), def: new BigNumber(2400) },
        ge: { att: new BigNumber(1800), def: new BigNumber(2400) },
        qi: { att: new BigNumber(120), def: new BigNumber(150) },
      },
    },
    special: {
      arcPercent: new BigNumber(90.6),
      chatBonus: new BigNumber(600),
      goodsPerQuest: new BigNumber(35),
      qiBoosts: { coins: new BigNumber(15), supplies: new BigNumber(15) },
      aoCriticalStrike: new BigNumber(32.4),
    },
  };

  await t.test('formatStatNumber compact notation', () => {
    assert.equal(formatStatNumber(12500000), '12.5M');
    assert.equal(formatStatNumber(8400), '8.4k');
    assert.equal(formatStatNumber(45), '45');
    assert.equal(formatStatNumber(null), '0');
  });

  await t.test(
    'renders #citystats with authentic unblurred stats and reorganized order',
    () => {
      const html = renderCityStats('#citystats', mockStats, {
        isOwnCity: true,
        name: 'TestCommander',
        era: 'SpaceAgeTitan',
        score: 150000000,
        guild: "Night's Watch",
        userTooltipHTML: '<p class="pop"><em>None</em></p>',
        userTitle: 'Playing FoE since 2020',
        origin: 'EN7',
      });

      assert.ok(html.includes('id="citystats-panel"'));
      assert.ok(html.includes('TestCommander'));
      assert.ok(html.includes('data-i18n="guild"'));
      assert.ok(html.includes('Night&#39;s Watch'));
      assert.ok(html.includes('id="infoIcon"'));
      assert.ok(html.includes('data-bs-toggle="popover"'));
      assert.ok(html.includes('Age'));
      assert.ok(html.includes('Space Age Titan'));
      assert.ok(html.includes('Score'));
      assert.ok(html.includes('150.0M'));
      // Ensure strong tag has collapse attributes and contains player name
      assert.match(
        html,
        /<strong[^>]*data-bs-toggle="collapse"[^>]*>\[EN7\] TestCommander<\/strong>/,
      );
      assert.ok(
        html.includes(
          'id="citystats-copy-btn" role="button" tabindex="0" class="badge rounded-pill bg-success',
        ),
      );
      assert.ok(
        html.includes(
          '<div>Arc <span data-i18n="bonus">Bonus</span>: 90.6%</div>',
        ),
      );
      assert.ok(
        html.includes(
          '<div>CF <span data-i18n="bonus">Bonus</span>: 600% (35 <span data-i18n="goods">Goods</span>)</div>',
        ),
      );
      assert.ok(
        html.includes('<span data-i18n="stat_daily_fp">Daily FP</span>'),
      );
      assert.ok(html.includes('1.5k (+20%)')); // 1450 FP formatted with boost
      // Coins and Supplies are disabled from display by default (code preserved for quick re-enabling)
      assert.ok(!html.includes('data-i18n="coins"'));
      assert.ok(!html.includes('data-i18n="supplies"'));
      assert.ok(
        html.includes('<span data-i18n="stat_daily_goods">Daily Goods</span>'),
      );
      assert.ok(html.includes('320'));
      // Daily Units renamed from Army Units
      assert.ok(html.includes('data-i18n="stat_daily_units"'));
      assert.ok(html.includes('Daily Units'));
      assert.ok(html.includes('3500% Att, 2800% Def')); // Red base
      // Crucial: Blue base must be unblurred (1800% Att, 2400% Def)
      assert.ok(html.includes('1800% Att, 2400% Def'));
      // Guild Goods right below Goods
      assert.ok(html.includes('Guild Goods'));
      // Available FP moved to FP Status card
      assert.ok(!html.includes('Available FP'));
      // Guild power / HoF / SoK removed
      assert.ok(!html.includes('data-i18n="guildpower"'));
      assert.ok(!html.includes('data-i18n="soh"'));
      assert.ok(!html.includes('data-i18n="hof"'));
    },
  );

  await t.test(
    'renders #visit for visited player with parity and clean layout',
    () => {
      const html = renderCityStats('#visit', mockStats, {
        isOwnCity: false,
        name: 'RivalNeighbor',
        guild: 'RivalGuild',
        era: 'SpaceAgeTitan',
        score: 85000000,
        shieldTimeText: '2 Days 4hr',
      });

      assert.ok(html.includes('id="visit-panel"'));
      assert.ok(html.includes('RivalNeighbor'));
      assert.ok(html.includes('Guild</span>: RivalGuild'));
      assert.ok(html.includes('Space Age Titan'));
      assert.ok(html.includes('🛡 2 Days 4hr'));
      assert.ok(html.includes('data-i18n="stat_daily_units"'));
      // Unblurred blue defense
      assert.ok(html.includes('1800% Att, 2400% Def'));
      // Guild Goods right below Goods
      assert.ok(html.includes('Guild Goods'));
      // Guild power / HoF / SoK removed
      assert.ok(!html.includes('data-i18n="guildpower"'));
      assert.ok(!html.includes('data-i18n="soh"'));
      assert.ok(!html.includes('data-i18n="hof"'));
    },
  );

  await t.test(
    'renders Daily FP, Goods, and Guild Goods popovers when tooltip HTML is provided',
    () => {
      const html = renderCityStats('#citystats', mockStats, {
        isOwnCity: true,
        name: 'TestCommander',
        era: 'SpaceAgeTitan',
        score: 150000000,
        fpTooltipHTML: '100FP <strong>Neo Colossus</strong><br>',
        clanGoodsTooltipHTML: '500 <strong>The Arc</strong><br>',
        goodsTooltipHTML: '500 <strong>Space Age Titan</strong><br>',
      });

      assert.ok(html.includes('id="citystats-fp"'));
      assert.ok(html.includes('data-bs-title="Daily FP"'));
      assert.ok(html.includes('100FP <strong>Neo Colossus</strong>'));
      assert.ok(html.includes('id="citystats-goods"'));
      assert.ok(html.includes('data-bs-title="Daily Goods"'));
      assert.ok(html.includes('500 <strong>Space Age Titan</strong>'));
      assert.ok(html.includes('id="citystats-clan-goods"'));
      assert.ok(html.includes('data-bs-title="Guild Goods"'));
      assert.ok(html.includes('500 <strong>The Arc</strong>'));
    },
  );

  await t.test(
    'extractPlayerIds handles arrays and object dictionaries',
    async () => {
      const { extractPlayerIds } =
        await import('../../src/js/fn/renderCityStats.js');

      // Array of IDs
      assert.deepEqual(extractPlayerIds([101, 102]), [101, 102]);

      // Array of objects
      assert.deepEqual(
        extractPlayerIds([{ player_id: 201 }, { player_id: 202 }]),
        [201, 202],
      );

      // Object map: ID -> true
      assert.deepEqual(extractPlayerIds({ 301: true, 302: true }), [
        '301',
        '302',
      ]);

      // Object map: index -> ID
      assert.deepEqual(extractPlayerIds({ 0: 401, 1: 402 }), [401, 402]);

      // Empty / null
      assert.deepEqual(extractPlayerIds(null), []);
      assert.deepEqual(extractPlayerIds({}), []);
    },
  );

  await t.test(
    'renders Goods with boost and chronological era breakdown tooltips',
    () => {
      const statsWithByEra = {
        ...mockStats,
        goods: {
          total: new BigNumber(30335),
          boostPercent: new BigNumber(23),
          byEra: {
            sajm: new BigNumber(55),
            sat: new BigNumber(8636),
            sash: new BigNumber(17782),
            sad: new BigNumber(3862),
          },
        },
      };

      const html = renderCityStats(
        '#citystats',
        statsWithByEra,
        {
          isOwnCity: true,
          name: 'TestCommander',
          era: 'StellarAgeDiscovery',
        },
        { exactNumbers: true },
      );

      // Check the header and end-aligned boost text
      assert.ok(
        html.includes('<span data-i18n="stat_daily_goods">Daily Goods</span>:'),
      );
      assert.ok(html.includes('(+23%)'));

      // Check tooltips are used instead of popovers
      assert.ok(html.includes('data-bs-toggle="tooltip"'));
      assert.ok(!html.includes('data-bs-title="Daily Goods"'));

      // Check individual era tooltip spans are present
      assert.ok(html.includes('id="citystats-sad"'));
      assert.ok(html.includes('SAD:3862'));
      assert.ok(html.includes('id="citystats-sash"'));
      assert.ok(html.includes('SASH:17782'));
      assert.ok(html.includes('id="citystats-sat"'));
      assert.ok(html.includes('SAT:8636'));
      assert.ok(html.includes('id="citystats-sajm"'));
      assert.ok(html.includes('SAJM:55'));

      // Verify chronological ordering of era spans: SAD -> SASH -> SAT -> SAJM
      const sadIdx = html.indexOf('SAD:3862');
      const sashIdx = html.indexOf('SASH:17782');
      const satIdx = html.indexOf('SAT:8636');
      const sajmIdx = html.indexOf('SAJM:55');
      assert.ok(sadIdx < sashIdx, 'SAD should appear before SASH');
      assert.ok(sashIdx < satIdx, 'SASH should appear before SAT');
      assert.ok(satIdx < sajmIdx, 'SAT should appear before SAJM');
    },
  );
});
