import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { MetadataStore } from '../../src/js/state/MetadataStore.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(__dirname, '../fixtures/visits');

test('VisitedCityStatsCalculator Suite', async (t) => {
  const { VisitedCityStatsCalculator, visitedCityStatsCalculator } =
    await import('../../src/js/fn/VisitedCityStatsCalculator.js');

  await t.test('instantiation and exports', () => {
    assert.ok(VisitedCityStatsCalculator);
    assert.ok(visitedCityStatsCalculator instanceof VisitedCityStatsCalculator);
  });

  await t.test('defensive defaults with empty or invalid input', () => {
    const calc = new VisitedCityStatsCalculator();
    const emptyStats = calc.calculateVisitedCityStats();

    assert.ok(emptyStats);
    assert.equal(emptyStats.fp.total.toNumber(), 0);
    assert.equal(emptyStats.fp.boostPercent.toNumber(), 0);
    assert.equal(emptyStats.goods.total.toNumber(), 0);
    assert.equal(emptyStats.goods.treasury.toNumber(), 0);
    assert.equal(emptyStats.units.total.toNumber(), 0);
    assert.equal(emptyStats.military.red.base.att.toNumber(), 0);
    assert.equal(emptyStats.military.blue.base.def.toNumber(), 0);
    assert.equal(emptyStats.special.arcPercent.toNumber(), 0);
    assert.equal(emptyStats.special.goodsPerQuest.toNumber(), 5);
  });

  await t.test(
    'idempotence: identical output on consecutive runs (no accumulator leakage)',
    () => {
      const fixturePath = path.join(FIXTURES_DIR, 'hood_1_Crispy_Frisbee.json');
      if (!fs.existsSync(fixturePath)) {
        t.skip('Fixture hood_1_Crispy_Frisbee.json not found');
        return;
      }

      const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
      const entities = fixture.payload.city_map.entities;
      const playerEra = fixture.payload.other_player.era;

      const calc = new VisitedCityStatsCalculator();
      const run1 = calc.calculateVisitedCityStats({ entities, playerEra });
      const run2 = calc.calculateVisitedCityStats({ entities, playerEra });

      // Assert absolute equality of numeric totals (preventing the 2x doubling bug)
      assert.equal(run1.fp.total.toString(), run2.fp.total.toString());
      assert.equal(run1.goods.total.toString(), run2.goods.total.toString());
      assert.equal(
        run1.goods.treasury.toString(),
        run2.goods.treasury.toString(),
      );
      assert.equal(run1.units.total.toString(), run2.units.total.toString());
      assert.equal(run1.units.traz.toString(), run2.units.traz.toString());
      assert.equal(
        run1.military.red.base.att.toString(),
        run2.military.red.base.att.toString(),
      );
      assert.equal(
        run1.military.blue.base.def.toString(),
        run2.military.blue.base.def.toString(),
      );
      assert.equal(
        run1.special.arcPercent.toString(),
        run2.special.arcPercent.toString(),
      );
    },
  );

  await t.test(
    'sequential visits across multiple players (cross-player isolation)',
    () => {
      const summaryPath = path.join(FIXTURES_DIR, '_summary.json');
      if (!fs.existsSync(summaryPath)) {
        t.skip('Visits summary not found');
        return;
      }

      const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
      const calc = new VisitedCityStatsCalculator();

      const results = [];
      // Visit first 5 players
      const sample = summary.slice(0, 5);
      for (const item of sample) {
        const pPath = path.join(FIXTURES_DIR, item.filename);
        const data = JSON.parse(fs.readFileSync(pPath, 'utf8'));
        const stats = calc.calculateVisitedCityStats({
          entities: data.payload.city_map.entities,
          playerEra: data.payload.other_player.era,
        });
        results.push({ item, stats });
      }

      // Re-visit player 0 and assert exact parity with previous result
      const firstPPath = path.join(FIXTURES_DIR, sample[0].filename);
      const firstData = JSON.parse(fs.readFileSync(firstPPath, 'utf8'));
      const reVisitStats = calc.calculateVisitedCityStats({
        entities: firstData.payload.city_map.entities,
        playerEra: firstData.payload.other_player.era,
      });

      assert.equal(
        results[0].stats.fp.total.toString(),
        reVisitStats.fp.total.toString(),
        'Revisiting player 0 must not compound FP',
      );
      assert.equal(
        results[0].stats.goods.total.toString(),
        reVisitStats.goods.total.toString(),
        'Revisiting player 0 must not compound Goods',
      );
      assert.equal(
        results[0].stats.military.red.base.att.toString(),
        reVisitStats.military.red.base.att.toString(),
        'Revisiting player 0 must not compound Military Boosts',
      );
    },
  );

  await t.test(
    'renders with renderCityStats without error or missing keys',
    async () => {
      const { renderCityStats } =
        await import('../../src/js/fn/renderCityStats.js');
      const fixturePath = path.join(FIXTURES_DIR, 'hood_1_Crispy_Frisbee.json');
      if (!fs.existsSync(fixturePath)) return;

      const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
      const calc = new VisitedCityStatsCalculator();
      const stats = calc.calculateVisitedCityStats({
        entities: fixture.payload.city_map.entities,
        playerEra: fixture.payload.other_player.era,
      });

      const html = renderCityStats('#visit', stats, {
        isOwnCity: false,
        name: fixture.payload.other_player.name,
        era: fixture.payload.other_player.era,
        score: fixture.payload.other_player.score,
      });

      assert.ok(html.includes('id="visit-panel"'));
      assert.ok(html.includes(fixture.payload.other_player.name));
      assert.ok(html.includes('data-i18n="attackers"'));
      assert.ok(html.includes('data-i18n="defenders"'));
    },
  );

  await t.test(
    'visited stats output exposes exactNumbers and root clan stats',
    () => {
      const calc = new VisitedCityStatsCalculator();
      const stats = calc.calculateVisitedCityStats();

      assert.equal(stats.exactNumbers, true);
      assert.ok(stats.clanPower);
      assert.equal(typeof stats.sohCount, 'number');
      assert.equal(typeof stats.hofCount, 'number');
      assert.equal(stats.clanPower.toString(), stats.clan.power.toString());
      assert.equal(stats.sohCount, stats.clan.sohCount);
      assert.equal(stats.hofCount, stats.clan.hofCount);
    },
  );

  await t.test('resolves Castle System visual stage combat boost', () => {
    const calc = new VisitedCityStatsCalculator();
    const statsStage4 = calc.calculateVisitedCityStats({
      entities: [{ id: 1, cityentity_id: 'V_AllAge_CastleSystem4' }],
    });
    assert.equal(statsStage4.military.red.base.att.toNumber(), 30);
    assert.equal(statsStage4.military.red.base.def.toNumber(), 30);
    assert.equal(statsStage4.military.blue.base.att.toNumber(), 30);
    assert.equal(statsStage4.military.blue.base.def.toNumber(), 30);

    const statsStage7 = calc.calculateVisitedCityStats({
      entities: [{ id: 2, cityentity_id: 'V_AllAge_CastleSystem7' }],
    });
    assert.equal(statsStage7.military.red.base.att.toNumber(), 60);
    assert.equal(statsStage7.military.red.base.def.toNumber(), 60);
    assert.equal(statsStage7.military.blue.base.att.toNumber(), 60);
    assert.equal(statsStage7.military.blue.base.def.toNumber(), 60);
  });

  await t.test(
    'skips entities with UnconnectedState (unconnected buildings)',
    () => {
      const store = new MetadataStore();
      store.registerEntity({
        id: 'building_fp',
        components: {
          SpaceAgeSpaceHub: {
            production: {
              options: [
                {
                  products: [
                    { playerResources: { resources: { strategy_points: 50 } } },
                  ],
                },
              ],
            },
          },
        },
      });
      const calc = new VisitedCityStatsCalculator(store);
      const stats = calc.calculateVisitedCityStats({
        playerEra: 'SpaceAgeSpaceHub',
        entities: [
          {
            id: 1,
            cityentity_id: 'building_fp',
            state: { __class__: 'UnconnectedState' },
          },
          { id: 2, cityentity_id: 'building_fp', state: {} },
        ],
      });
      // Only the connected building produces 50 FP
      assert.equal(stats.fp.total.toNumber(), 50);
    },
  );

  await t.test('validates chain link connectivity in visited city', () => {
    const store = new MetadataStore();
    store.registerBuildingChains([
      { id: 'train_chain', cityEntityIds: ['engine', 'car'] },
    ]);
    store.registerEntity({
      id: 'engine',
      width: 3,
      length: 3,
      abilities: [{ __class__: 'ChainStartAbility', chainId: 'train_chain' }],
    });
    store.registerEntity({
      id: 'car',
      width: 2,
      length: 3,
      abilities: [
        {
          __class__: 'ChainLinkAbility',
          chainId: 'train_chain',
          bonuses: [
            {
              revenue: {
                SpaceAgeSpaceHub: { resources: { strategy_points: 10 } },
              },
            },
          ],
        },
      ],
    });
    const calc = new VisitedCityStatsCalculator(store);
    const stats = calc.calculateVisitedCityStats({
      playerEra: 'SpaceAgeSpaceHub',
      entities: [
        { id: 1, cityentity_id: 'engine', x: 0, y: 0, width: 3, length: 3 },
        { id: 2, cityentity_id: 'car', x: 3, y: 0, width: 2, length: 3 }, // adjacent
        { id: 3, cityentity_id: 'car', x: 20, y: 20, width: 2, length: 3 }, // disconnected
      ],
    });
    // Only the adjacent car produces 10 FP
    assert.equal(stats.fp.total.toNumber(), 10);
  });

  await t.test(
    'accumulates unit chest generic rewards into units.total and units.daily',
    () => {
      const store = new MetadataStore();
      store.registerEntity({
        id: 'solara',
        components: {
          SpaceAgeSpaceHub: {
            production: {
              options: [
                {
                  products: [
                    {
                      type: 'genericReward',
                      reward: { id: 'rw_chest_solara' },
                    },
                  ],
                },
              ],
            },
            lookup: {
              rewards: {
                rw_chest_solara: {
                  type: 'chest',
                  id: 'genb_random_unit_chest60',
                  possible_rewards: [{ reward: { type: 'unit', amount: 60 } }],
                },
              },
            },
          },
        },
      });
      const calc = new VisitedCityStatsCalculator(store);
      const stats = calc.calculateVisitedCityStats({
        playerEra: 'SpaceAgeSpaceHub',
        entities: [{ id: 1, cityentity_id: 'solara' }],
      });
      assert.equal(stats.units.daily.toNumber(), 60);
      assert.equal(stats.units.traz.toNumber(), 0);
      assert.equal(stats.units.total.toNumber(), 60);
    },
  );

  await t.test(
    'AddResourcesToGuildTreasuryAbility splits AllAge goods and targetEra clan_power correctly',
    () => {
      const store = new MetadataStore();
      store.registerEntity({
        id: 'soh_test',
        abilities: [
          {
            __class__: 'AddResourcesToGuildTreasuryAbility',
            additionalResources: {
              AllAge: { resources: { all_goods_of_age: 80 } },
              SpaceAgeSpaceHub: { resources: { clan_power: 823 } },
            },
          },
        ],
      });
      const calc = new VisitedCityStatsCalculator(store);
      const stats = calc.calculateVisitedCityStats({
        playerEra: 'SpaceAgeSpaceHub',
        entities: [{ id: 1, cityentity_id: 'soh_test' }],
      });
      assert.equal(stats.goods.treasury.toNumber(), 80);
      assert.equal(stats.goods.total.toNumber(), 0);
      assert.equal(stats.clanPower.toNumber(), 823);
    },
  );

  await t.test(
    'extractEntityProduction resolves AllAge production when era component lacks production',
    () => {
      const store = new MetadataStore();
      store.registerEntity({
        id: 'eternal_market_test',
        components: {
          AllAge: {
            production: {
              options: [
                {
                  products: [
                    {
                      type: 'guildResources',
                      guildResources: { resources: { all_goods_of_age: 7200 } },
                    },
                  ],
                },
              ],
            },
          },
          SpaceAgeSpaceHub: {
            boosts: {},
          },
        },
      });
      const calc = new VisitedCityStatsCalculator(store);
      const stats = calc.calculateVisitedCityStats({
        playerEra: 'SpaceAgeSpaceHub',
        entities: [{ id: 1, cityentity_id: 'eternal_market_test' }],
      });
      assert.equal(stats.goods.treasury.toNumber(), 7200);
    },
  );

  await t.test(
    'verifies authentic Guild Goods for Radika (32,440), II-IIyPer-79 (32,740), and robinmagister (23,380)',
    () => {
      const radikaHarPath = path.resolve(
        __dirname,
        '../../docs/har/visit-Radika.har',
      );
      const iiyperHarPath = path.resolve(
        __dirname,
        '../../docs/har/visit-ii-iiyper-79.har',
      );
      const robinHarPath = path.resolve(
        __dirname,
        '../../docs/har/visit-robinmagister.har',
      );
      const entitiesDir = path.resolve(
        __dirname,
        '../../metadata-store/entities',
      );

      function extractVisitData(harPath) {
        if (!fs.existsSync(harPath)) return null;
        const har = JSON.parse(fs.readFileSync(harPath, 'utf8'));
        for (const entry of har.log?.entries || []) {
          const postText = entry.request?.postData?.text || '';
          if (
            postText.includes('OtherPlayerService') &&
            postText.includes('visitPlayer')
          ) {
            const respText = entry.response?.content?.text;
            if (respText) {
              const rpcList = JSON.parse(respText);
              const visitRpc = rpcList.find(
                (r) =>
                  r.requestClass === 'OtherPlayerService' &&
                  r.requestMethod === 'visitPlayer',
              );
              if (visitRpc?.responseData) return visitRpc.responseData;
            }
          }
        }
        return null;
      }

      function createPopulatedStore(entities) {
        const store = new MetadataStore();
        if (!fs.existsSync(entitiesDir)) return store;
        const loaded = new Set();
        for (const ent of entities || []) {
          const id = ent?.cityentity_id;
          if (!id || loaded.has(id)) continue;
          loaded.add(id);

          const filePath = path.join(entitiesDir, `building_entity_${id}.json`);
          if (fs.existsSync(filePath)) {
            try {
              const meta = JSON.parse(fs.readFileSync(filePath, 'utf8'));
              store.registerEntity(meta);
            } catch {
              // ignore malformed
            }
          }
        }
        return store;
      }

      // Radika verification (Target: 32,440)
      const radikaData = extractVisitData(radikaHarPath);
      if (radikaData?.city_map?.entities) {
        const store = createPopulatedStore(radikaData.city_map.entities);
        const calc = new VisitedCityStatsCalculator(store);
        const stats = calc.calculateVisitedCityStats({
          entities: radikaData.city_map.entities,
          playerEra: radikaData.other_player.era,
        });
        assert.equal(stats.goods.treasury.toNumber(), 32440);
      }

      // II-IIyPer-79 verification (Target: 32,740)
      const iiyperData = extractVisitData(iiyperHarPath);
      if (iiyperData?.city_map?.entities) {
        const store = createPopulatedStore(iiyperData.city_map.entities);
        const calc = new VisitedCityStatsCalculator(store);
        const stats = calc.calculateVisitedCityStats({
          entities: iiyperData.city_map.entities,
          playerEra: iiyperData.other_player.era,
        });
        assert.equal(stats.goods.treasury.toNumber(), 32740);
      }

      // robinmagister verification (Target: Treasury 23,380, FP 51,471, Units 3,306, SASH ~4,822-4,830)
      const robinData = extractVisitData(robinHarPath);
      if (robinData?.city_map?.entities) {
        const store = createPopulatedStore(robinData.city_map.entities);
        const calc = new VisitedCityStatsCalculator(store);
        const stats = calc.calculateVisitedCityStats({
          entities: robinData.city_map.entities,
          playerEra: robinData.other_player.era,
        });
        assert.equal(stats.goods.treasury.toNumber(), 23380);
        assert.equal(stats.fp.total.toNumber(), 51471);
        assert.equal(stats.units.total.toNumber(), 3306);
        const sashGoods = stats.goods.byEra?.SpaceAgeSpaceHub?.toNumber() || 0;
        assert.ok(
          sashGoods >= 4820 && sashGoods <= 4835,
          `Expected SASH goods around 4822-4830, got ${sashGoods}`,
        );
      }
    },
  );
});
