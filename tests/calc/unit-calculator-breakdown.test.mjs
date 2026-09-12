import assert from 'node:assert/strict';
import test from 'node:test';
import BigNumber from 'bignumber.js';
import { CityStatsCalculator } from '../../src/js/calc/CityStatsCalculator.js';
import {
  createUnitsAccumulator,
  extractSpecialBonuses,
  processEntityUnits,
} from '../../src/js/calc/units/UnitCalculator.js';
import { VisitedCityStatsCalculator } from '../../src/js/calc/VisitedCityStatsCalculator.js';
import { buildUnitsTooltipHTML } from '../../src/js/ui/components/cityStatsTooltipBuilder.js';

test('Unit Calculator Breakdown & Critical Hit Suite', async (t) => {
  await t.test(
    'accumulates unit-producing buildings in units accumulator',
    () => {
      const accum = createUnitsAccumulator();
      assert.ok(
        Array.isArray(accum.buildings),
        'accum.buildings should be an array',
      );

      // Alcatraz product
      processEntityUnits({
        entity: {
          cityentity_id: 'X_ProgressiveEra_Landmark1',
          state: { current_product: { name: 'penal_unit', amount: 80 } },
        },
        meta: { name: 'Alcatraz' },
        prodResources: {},
        accum,
      });

      // Daily unit building (e.g. Governor's Villa)
      processEntityUnits({
        entity: { cityentity_id: 'villa_1' },
        meta: { name: "Governor's Villa" },
        prodResources: { units: 4 },
        accum,
      });

      assert.equal(accum.dailyUnits.toNumber(), 84);
      assert.equal(accum.buildings.length, 2);
      assert.equal(accum.buildings[0].name, 'Alcatraz');
      assert.equal(accum.buildings[0].amount, 80);
      assert.equal(accum.buildings[1].name, "Governor's Villa");
      assert.equal(accum.buildings[1].amount, 4);
    },
  );

  await t.test(
    'extracts critical hit chance strictly from AO and Cosmic Catalyst',
    () => {
      // Arctic Orangery
      const aoSpecial = extractSpecialBonuses({
        entity: {
          cityentity_id: 'X_ArcticFuture_Landmark2',
          bonus: { value: 33 },
        },
        meta: {},
        level: 70,
      });
      assert.ok(BigNumber.isBigNumber(aoSpecial.aoCritPercent));
      assert.equal(aoSpecial.aoCritPercent.toNumber(), 33);

      // Cosmic Catalyst
      const ccSpecial = extractSpecialBonuses({
        entity: {
          cityentity_id: 'X_SpaceAgeSpaceHub_Landmark2',
          bonus: { value: 25 },
        },
        meta: {},
        level: 68,
      });
      assert.ok(BigNumber.isBigNumber(ccSpecial.ccCritPercent));
      assert.equal(ccSpecial.ccCritPercent.toNumber(), 25);

      // Kraken must NOT have critical strike
      const krakenSpecial = extractSpecialBonuses({
        entity: {
          cityentity_id: 'X_OceanicFuture_Landmark1',
          bonus: { value: 50 },
        },
        meta: {},
        level: 60,
      });
      assert.equal(krakenSpecial.aoCritPercent, undefined);
      assert.equal(krakenSpecial.ccCritPercent, undefined);
      assert.equal(krakenSpecial.critPercent, undefined);
    },
  );

  await t.test('buildUnitsTooltipHTML formats sorted building list', () => {
    const html = buildUnitsTooltipHTML([
      { name: "Governor's Villa", amount: 4 },
      { name: 'Alcatraz', amount: 80 },
    ]);
    assert.match(html, /80 <strong>Alcatraz<\/strong>/);
    assert.match(
      html,
      /4 <strong>Governor&#39;s Villa<\/strong>|4 <strong>Governor's Villa<\/strong>/,
    );
    // Alcatraz should appear before Governor's Villa due to descending sort
    const alcIdx = html.indexOf('Alcatraz');
    const villaIdx = html.indexOf('Villa');
    assert.ok(alcIdx < villaIdx, 'Higher unit yield should be listed first');
  });

  await t.test(
    'CityStatsCalculator and VisitedCityStatsCalculator expose units.buildings and AO/CC crit hit',
    () => {
      const mockStore = {
        getEntity: (id) => {
          if (id === 'X_ArcticFuture_Landmark2') {
            return { name: 'Arctic Orangery', type: 'greatbuilding' };
          }
          if (id === 'X_SpaceAgeSpaceHub_Landmark2') {
            return { name: 'Cosmic Catalyst', type: 'greatbuilding' };
          }
          if (id === 'X_ProgressiveEra_Landmark1') {
            return { name: 'Alcatraz', type: 'greatbuilding' };
          }
          return { name: 'Test Villa' };
        },
      };

      const ownCalc = new CityStatsCalculator(mockStore);
      const ownStats = ownCalc.calculateCityStats({
        entities: [
          {
            cityentity_id: 'X_ArcticFuture_Landmark2',
            bonus: { value: 33 },
          },
          {
            cityentity_id: 'X_SpaceAgeSpaceHub_Landmark2',
            bonus: { value: 25 },
          },
          {
            cityentity_id: 'X_ProgressiveEra_Landmark1',
            state: { current_product: { name: 'penal_unit', amount: 80 } },
          },
        ],
        playerEra: 'SpaceAgeSpaceHub',
        metadataStore: mockStore,
      });

      assert.equal(ownStats.special.aoCriticalStrike.toNumber(), 33);
      assert.equal(ownStats.special.ccCriticalStrike.toNumber(), 25);
      assert.ok(Array.isArray(ownStats.units.buildings));
      assert.equal(ownStats.units.buildings.length, 1);
      assert.equal(ownStats.units.buildings[0].name, 'Alcatraz');
      assert.equal(ownStats.units.buildings[0].amount, 80);

      const visitedCalc = new VisitedCityStatsCalculator(mockStore);
      const visitedStats = visitedCalc.calculateVisitedCityStats({
        entities: [
          {
            cityentity_id: 'X_ArcticFuture_Landmark2',
            bonus: { value: 33 },
          },
          {
            cityentity_id: 'X_SpaceAgeSpaceHub_Landmark2',
            bonus: { value: 25 },
          },
          {
            cityentity_id: 'X_ProgressiveEra_Landmark1',
            level: 10,
            bonus: { value: 8 },
          },
        ],
        playerEra: 'SpaceAgeSpaceHub',
        metadataStore: mockStore,
      });

      assert.equal(visitedStats.special.aoCriticalStrike.toNumber(), 33);
      assert.equal(visitedStats.special.ccCriticalStrike.toNumber(), 25);
      assert.ok(Array.isArray(visitedStats.units.buildings));
      assert.equal(visitedStats.units.buildings.length, 1);
      assert.equal(visitedStats.units.buildings[0].name, 'Alcatraz');
      assert.equal(visitedStats.units.buildings[0].amount, 8);
    },
  );
});
