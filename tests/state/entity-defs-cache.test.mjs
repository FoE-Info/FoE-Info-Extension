import assert from 'node:assert/strict';
import test from 'node:test';
import {
  flushCityEntityDefs,
  initEntityDefsUnloadHandler,
  isCityEntityDefsDirty,
  markCityEntityDefsDirty,
  resolveMissingCityEntitiesFromMap,
  saveCityEntityDefsDebounced,
  setCityEntityDefsDirty,
} from '../../src/js/state/entityDefsCache.js';

test('EntityDefsCache Suite', async (t) => {
  t.beforeEach(() => {
    setCityEntityDefsDirty(false);
  });

  await t.test('tracks dirty state correctly', () => {
    assert.equal(isCityEntityDefsDirty(), false);
    markCityEntityDefsDirty();
    assert.equal(isCityEntityDefsDirty(), true);
    setCityEntityDefsDirty(false);
    assert.equal(isCityEntityDefsDirty(), false);
  });

  await t.test('flushCityEntityDefs returns early when not dirty', () => {
    let savedKey = null;
    const mockStorage = {
      set: (k) => {
        savedKey = k;
      },
    };

    const result = flushCityEntityDefs({
      storage: mockStorage,
      CityEntityDefs: { b1: { name: 'Building' } },
    });

    assert.equal(result, false);
    assert.equal(savedKey, null);
  });

  await t.test(
    'flushCityEntityDefs flushes to storage when dirty and clears dirty flag',
    () => {
      markCityEntityDefsDirty();
      let savedKey = null;
      let savedVal = null;
      const mockStorage = {
        set: (k, v) => {
          savedKey = k;
          savedVal = v;
        },
      };

      const defs = { b1: { name: 'Building 1' } };
      const result = flushCityEntityDefs({
        storage: mockStorage,
        CityEntityDefs: defs,
      });

      assert.equal(result, true);
      assert.equal(savedKey, 'CityEntityDefs');
      assert.deepEqual(savedVal, defs);
      assert.equal(isCityEntityDefsDirty(), false);
    },
  );

  await t.test(
    'saveCityEntityDefsDebounced schedules debounced flush',
    async () => {
      let flushCalled = false;
      const mockStorage = {
        set: () => {
          flushCalled = true;
        },
      };

      saveCityEntityDefsDebounced({
        storage: mockStorage,
        CityEntityDefs: { b2: { name: 'Building 2' } },
        delayMs: 10,
      });

      assert.equal(isCityEntityDefsDirty(), true);
      assert.equal(flushCalled, false);

      await new Promise((resolve) => setTimeout(resolve, 25));
      assert.equal(flushCalled, true);
      assert.equal(isCityEntityDefsDirty(), false);
    },
  );

  await t.test(
    'resolveMissingCityEntitiesFromMap detects missing entities and calls resolver',
    () => {
      let resolvedIds = null;
      const mockHelper = {
        getCityEntityDef: (id) => (id === 'existing_1' ? { name: 'E1' } : null),
      };
      const mockMetaService = {
        resolveMissingCityEntities: (ids) => {
          resolvedIds = ids;
        },
      };

      const entities = [
        { cityentity_id: 'existing_1' },
        { cityentity_id: 'missing_1' },
        { cityentity_id: 'missing_2' },
      ];

      resolveMissingCityEntitiesFromMap(entities, {
        helper: mockHelper,
        metadataService: mockMetaService,
      });

      assert.deepEqual(resolvedIds, ['missing_1', 'missing_2']);
    },
  );

  await t.test(
    'initEntityDefsUnloadHandler binds beforeunload to window',
    () => {
      let registeredEvent = null;
      let registeredHandler = null;
      const mockWindow = {
        addEventListener: (event, handler) => {
          registeredEvent = event;
          registeredHandler = handler;
        },
      };

      const bound = initEntityDefsUnloadHandler(mockWindow);
      assert.equal(bound, true);
      assert.equal(registeredEvent, 'beforeunload');
      assert.equal(typeof registeredHandler, 'function');
    },
  );
});
