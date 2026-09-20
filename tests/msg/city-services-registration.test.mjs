import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cityMapService,
  CityMapService,
  extractGridId,
  registerCityEntities,
} from '../../src/js/msg/CityMapService.js';
import {
  cityProductionService,
  CityProductionService,
} from '../../src/js/msg/CityProductionService.js';
import metadataPkg from '../../src/js/msg/MetadataService.js';
import { registerAllServices } from '../../src/js/msg/registerServices.js';
import {
  getCurrentView,
  setCurrentView,
} from '../../src/js/ui/cardVisibility.js';

const { metadataService } = metadataPkg;

test('CityMapService & City Services Registration Suite', async (t) => {
  await t.test(
    'CityMapService exposes singleton instance and register API',
    () => {
      assert.ok(cityMapService instanceof CityMapService);
      assert.equal(typeof cityMapService.register, 'function');
      assert.equal(typeof extractGridId, 'function');
      assert.equal(typeof registerCityEntities, 'function');
    },
  );

  await t.test(
    'CityMapService.extractGridId resolves various envelope shapes',
    () => {
      assert.equal(extractGridId({ responseData: { gridId: 'main' } }), 'main');
      assert.equal(
        extractGridId({ responseData: [{ gridId: 'cultural_outpost' }] }),
        'cultural_outpost',
      );
      assert.equal(
        extractGridId({ requestData: [{ gridId: 'guild_raids' }] }),
        'guild_raids',
      );
      assert.equal(extractGridId({ gridId: 'city' }), 'city');
      assert.equal(extractGridId({}), null);
      assert.equal(extractGridId(null), null);
    },
  );

  await t.test('CityMapService.register wires all expected routes', () => {
    const registered = [];
    const dispatcher = {
      register(requestClass, method, handler) {
        registered.push([requestClass, method, handler]);
        return dispatcher;
      },
    };

    const service = new CityMapService();
    const result = service.register(dispatcher);
    assert.strictEqual(result, service);

    assert.deepEqual(
      registered.map(([cls, method]) => [cls, method]),
      [
        ['CityMapService', 'getEntities'],
        ['CityMapService', 'getCityMap'],
        ['CityMapService', 'updateEntity'],
        ['CityMapService', 'reset'],
        ['StartupService', 'getData'],
        ['StartupService', 'getOverview'],
        ['BonusService', 'getLimitedBonuses'],
      ],
    );
  });

  await t.test(
    'CityMapService.handleGetCityMap toggles views and returns gridId',
    () => {
      const service = new CityMapService();

      setCurrentView('GBG');
      const r1 = service.handleGetCityMap({
        responseData: { gridId: 'cultural_outpost' },
      });
      assert.equal(getCurrentView(), 'SETTLEMENT');
      assert.equal(r1.gridId, 'cultural_outpost');

      const r2 = service.handleGetCityMap({
        responseData: { gridId: 'guild_raids' },
      });
      assert.equal(getCurrentView(), 'QI');
      assert.equal(r2.gridId, 'guild_raids');

      const r3 = service.handleGetCityMap({
        responseData: { gridId: 'city' },
      });
      assert.equal(getCurrentView(), 'OWN_CITY');
      assert.equal(r3.gridId, 'city');
    },
  );

  await t.test(
    'CityMapService.handleGetEntities registers GBs and switches to OWN_CITY',
    () => {
      const service = new CityMapService();
      const registeredGbs = [];
      const mockGbRegistry = {
        registerGreatBuilding(entity, playerId) {
          registeredGbs.push({ entity, playerId });
        },
      };

      setCurrentView('GBG');
      const msg = {
        responseData: [
          { id: 10, type: 'greatbuilding', cityentity_id: 'X_Landmark1' },
          { id: 20, type: 'residential', cityentity_id: 'R_House' },
        ],
      };

      service.handleGetEntities(msg, {
        MyInfo: { id: 77, name: 'Alice' },
        gbRegistry: mockGbRegistry,
      });

      assert.equal(getCurrentView(), 'OWN_CITY');
      assert.equal(registeredGbs.length, 2); // registered with 0 and myId 77
      assert.equal(registeredGbs[0].entity.player_name, 'Alice');
      assert.equal(registeredGbs[0].entity.player_id, 77);
    },
  );

  await t.test('CityMapService.handleUpdateEntity syncs selected GB', () => {
    const service = new CityMapService();
    const registeredGbs = [];
    const mockGbRegistry = {
      registerGreatBuilding(entity, playerId) {
        registeredGbs.push({ entity, playerId });
      },
    };

    let setPlayerCalled = null;
    const targetGb = { id: 55, level: 3, current: 10, total: 100 };

    const msg = {
      responseData: [
        {
          id: 55,
          type: 'greatbuilding',
          player_id: 77,
          level: 4,
          current: 50,
          total: 120,
        },
      ],
    };

    service.handleUpdateEntity(msg, {
      MyInfo: { id: 77, name: 'Alice' },
      gbRegistry: mockGbRegistry,
      GBselected: targetGb,
      setPlayerName: (name, id) => {
        setPlayerCalled = { name, id };
      },
    });

    assert.equal(targetGb.level, 4);
    assert.equal(targetGb.current, 50);
    assert.deepEqual(setPlayerCalled, { name: 'Alice', id: 77 });
  });

  await t.test(
    'CityProductionService exposes singleton and registers pickupProduction',
    () => {
      assert.ok(cityProductionService instanceof CityProductionService);
      assert.equal(typeof cityProductionService.register, 'function');

      const registered = [];
      const dispatcher = {
        register(requestClass, method, handler) {
          registered.push([requestClass, method, handler]);
          return dispatcher;
        },
      };

      cityProductionService.register(dispatcher);
      assert.deepEqual(
        registered.map(([cls, method]) => [cls, method]),
        [['CityProductionService', 'pickupProduction']],
      );
    },
  );

  await t.test(
    'MetadataService exposes register and registers StaticDataService routes',
    () => {
      assert.equal(typeof metadataService.register, 'function');

      const registered = [];
      let directMetadataRegistered = false;
      const dispatcher = {
        register(requestClass, method, handler) {
          registered.push([requestClass, method, handler]);
          return dispatcher;
        },
        registerDirectMetadata() {
          directMetadataRegistered = true;
          return dispatcher;
        },
      };

      metadataService.register(dispatcher);
      assert.equal(directMetadataRegistered, true);
      assert.deepEqual(
        registered.map(([cls, method]) => [cls, method]),
        [['StaticDataService', 'getMetadata']],
      );
    },
  );

  await t.test(
    'registerAllServices registers all city, bonus, and metadata services',
    () => {
      const registered = new Set();
      const dispatcher = {
        register(requestClass, method) {
          registered.add(`${requestClass}.${method}`);
          return dispatcher;
        },
        registerDirectMetadata() {
          return dispatcher;
        },
      };

      registerAllServices(dispatcher);

      assert.ok(registered.has('CityMapService.getEntities'));
      assert.ok(registered.has('CityMapService.getCityMap'));
      assert.ok(registered.has('CityMapService.updateEntity'));
      assert.ok(registered.has('CityMapService.reset'));
      assert.ok(registered.has('StartupService.getData'));
      assert.ok(registered.has('StartupService.getOverview'));
      assert.ok(registered.has('CityProductionService.pickupProduction'));
      assert.ok(registered.has('BonusService.getLimitedBonuses'));
      assert.ok(registered.has('StaticDataService.getMetadata'));
    },
  );
});
