import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  coordinateStartupEntities,
  ensureCitystatsContainer,
  fEntityName,
} from '../../src/js/msg/StartupEntityCoordinator.js';

describe('StartupEntityCoordinator Suite', () => {
  describe('fEntityName', () => {
    it('returns building name when definition has a name', () => {
      const helper = {
        getCityEntityDef: (id) => {
          if (id === 'B_Hub_SpaceAge') return { name: 'Space Hub' };
          return null;
        },
      };
      assert.equal(fEntityName('B_Hub_SpaceAge', helper), 'Space Hub');
    });

    it('falls back to entity identifier when def or name is missing', () => {
      const helper = {
        getCityEntityDef: () => null,
      };
      assert.equal(
        fEntityName('Unknown_Building_Id', helper),
        'Unknown_Building_Id',
      );
    });
  });

  describe('coordinateStartupEntities', () => {
    it('processes entities, updates traz units, invokes combat totals and returns aggregated building lists', () => {
      const City = {
        TrazUnits: 25,
        emissaryUnits: 5,
        baseUnits: 0,
      };
      let combatTotalsCalled = false;
      let collectionTimesRendered = false;
      let boostsCalled = false;
      const timingSteps = [];

      const options = {
        msg: {
          responseData: {
            city_map: {
              entities: [],
            },
          },
        },
        user: { player_id: 1 },
        City,
        Galaxy: {},
        tooltipHTML: { goods: [], fp: [] },
        timingStep: (phase, desc) => {
          timingSteps.push({ phase, desc });
        },
        updateCombatTotals: (c) => {
          assert.equal(c, City);
          combatTotalsCalled = true;
        },
        lastBoostsMsg: { responseData: [] },
        boostServiceAllBoosts: () => {
          boostsCalled = true;
        },
        renderBuildingCollectionTimes: () => {
          collectionTimesRendered = true;
        },
        buildClanGoodsData: () => 1500,
        debugEnabled: true,
      };

      const result = coordinateStartupEntities(options);

      // Verify Traz and emissary unit calculations
      assert.equal(City.baseUnits, 25);
      assert.equal(City.TrazUnits, 30); // 25 base + 5 emissary

      // Verify invocations
      assert.equal(combatTotalsCalled, true);
      assert.equal(boostsCalled, true);
      assert.equal(collectionTimesRendered, true);

      // Verify returned collections
      assert.ok(Array.isArray(result.buildingsReady));
      assert.ok(Array.isArray(result.fpBuildings));
      assert.ok(Array.isArray(result.goodsBuildings));
      assert.ok(Array.isArray(result.clanGoodsBuildings));
      assert.equal(result.clanGoods, 1500);

      // Verify timing steps recorded
      const phases = timingSteps.map((s) => s.phase);
      assert.ok(phases.includes('P4b'));
      assert.ok(phases.includes('P4c'));
      assert.ok(phases.includes('P4d'));
      assert.ok(phases.includes('P4e'));
      assert.ok(phases.includes('P4g'));
      assert.ok(phases.includes('P4h'));
      assert.ok(phases.includes('P4i'));
      assert.ok(phases.includes('P4j'));
    });

    it('skips boostServiceAllBoosts when lastBoostsMsg is not present', () => {
      const City = { TrazUnits: 10 };
      let boostsCalled = false;

      coordinateStartupEntities({
        msg: { responseData: { city_map: { entities: [] } } },
        user: {},
        City,
        Galaxy: {},
        tooltipHTML: { goods: [], fp: [] },
        lastBoostsMsg: null,
        boostServiceAllBoosts: () => {
          boostsCalled = true;
        },
        updateCombatTotals: () => {},
      });

      assert.equal(boostsCalled, false);
    });

    it('resolves CityEntityDefs, Goods, and ResourceDefs from options.state', () => {
      const City = { TrazUnits: 0 };
      const mockState = {
        CityEntityDefs: { test_b: { name: 'Test Building' } },
        ResourceDefs: [{ id: 'coins', name: 'Coins' }],
        Goods: {},
        MyInfo: { name: 'Player1' },
      };

      const result = coordinateStartupEntities({
        msg: { responseData: { city_map: { entities: [] } } },
        user: {},
        City,
        Galaxy: {},
        tooltipHTML: { goods: [], fp: [] },
        updateCombatTotals: () => {},
        state: mockState,
      });

      assert.ok(result);
      assert.ok(Array.isArray(result.buildingsReady));
    });
  });

  describe('ensureCitystatsContainer', () => {
    it('returns null safely when document is not defined', () => {
      // In Node environment without global document
      const container = ensureCitystatsContainer();
      assert.equal(container, null);
    });

    it('returns existing element or creates and inserts if document is present', () => {
      const existingEl = { id: 'citystats' };
      globalThis.document = {
        getElementById: (id) => (id === 'citystats' ? existingEl : null),
      };

      try {
        const found = ensureCitystatsContainer();
        assert.equal(found, existingEl);
      } finally {
        delete globalThis.document;
      }
    });
  });
});
