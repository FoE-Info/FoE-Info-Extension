import assert from 'node:assert/strict';
import test from 'node:test';
import {
  hydrateCityEntitiesFromChange,
  hydrateCityEntitiesFromSnapshot,
  hydrateLookupDefinitions,
} from '../../src/js/state/storageMetadataHydrator.js';

test('hydrateLookupDefinitions populates lookup maps and notifies stores', () => {
  assert.strictEqual(hydrateLookupDefinitions('Any', null), false);
  assert.strictEqual(hydrateLookupDefinitions('Any', undefined), false);
  assert.strictEqual(hydrateLookupDefinitions('unknownKey', {}), false);

  const registeredUrls = [];
  const mockMetadataStore = {
    registerLookupUrl: (id, url) => registeredUrls.push([id, url]),
  };

  const buildingLookup = {};
  const allyDefs = {};
  const researchDefs = {};
  const militaryDefs = {};
  const metaIds = {};
  const playerNames = {};
  let resourceDefsVal = null;

  const deps = {
    setResourceDefs: (v) => {
      resourceDefsVal = v;
    },
    BuildingEntityLookup: buildingLookup,
    AllyDefs: allyDefs,
    ResearchDefs: researchDefs,
    MilitaryDefs: militaryDefs,
    MetaIds: metaIds,
    playerNameCache: playerNames,
  };

  assert.strictEqual(
    hydrateLookupDefinitions(
      'ResourceDefs',
      { money: 'Coins' },
      deps,
      mockMetadataStore,
    ),
    true,
  );
  assert.deepStrictEqual(resourceDefsVal, { money: 'Coins' });

  assert.strictEqual(
    hydrateLookupDefinitions(
      'BuildingEntityLookup',
      { B1: 'https://cdn/b1.json' },
      deps,
      mockMetadataStore,
    ),
    true,
  );
  assert.strictEqual(buildingLookup.B1, 'https://cdn/b1.json');
  assert.deepStrictEqual(registeredUrls, [['B1', 'https://cdn/b1.json']]);

  assert.strictEqual(
    hydrateLookupDefinitions('AllyDefs', { A1: { name: 'Ally' } }, deps),
    true,
  );
  assert.deepStrictEqual(allyDefs.A1, { name: 'Ally' });

  assert.strictEqual(
    hydrateLookupDefinitions('ResearchDefs', { R1: { name: 'Tech' } }, deps),
    true,
  );
  assert.deepStrictEqual(researchDefs.R1, { name: 'Tech' });

  assert.strictEqual(
    hydrateLookupDefinitions('MilitaryDefs', { M1: { name: 'Unit' } }, deps),
    true,
  );
  assert.deepStrictEqual(militaryDefs.M1, { name: 'Unit' });

  assert.strictEqual(
    hydrateLookupDefinitions('MetaIds', { ID1: 123 }, deps),
    true,
  );
  assert.deepStrictEqual(metaIds.ID1, 123);

  assert.strictEqual(
    hydrateLookupDefinitions('playerNameCache', { 99: 'Player' }, deps),
    true,
  );
  assert.deepStrictEqual(playerNames['99'], 'Player');
});

test('hydrateCityEntitiesFromSnapshot safely handles empty or non-entity results', () => {
  const calls = [];
  const deps = {
    processMetadataData: () => calls.push('processMetadataData'),
    setMetadataLoaded: () => calls.push('setMetadataLoaded'),
  };

  hydrateCityEntitiesFromSnapshot(null, deps);
  hydrateCityEntitiesFromSnapshot(undefined, deps);
  hydrateCityEntitiesFromSnapshot({}, deps);
  hydrateCityEntitiesFromSnapshot({ unrelated: 123 }, deps);

  assert.strictEqual(calls.length, 0);
});

test('hydrateCityEntitiesFromSnapshot processes persistent entities and startup pipeline', () => {
  const calls = [];
  const initialPendingMsg = {
    responseData: { city_map: { entities: [{ id: 'm1' }] } },
  };
  let pendingMsg = initialPendingMsg;
  let lastMsg = null;

  const deps = {
    processMetadataData: (data) => calls.push(['processMetadataData', data]),
    setMetadataLoaded: (val) => calls.push(['setMetadataLoaded', val]),
    getPendingStartupMsg: () => pendingMsg,
    setPendingStartupMsg: (val) => {
      pendingMsg = val;
      calls.push(['setPendingStartupMsg', val]);
    },
    getLastStartupMsg: () => lastMsg,
    setLastStartupMsg: (val) => {
      lastMsg = val;
      calls.push(['setLastStartupMsg', val]);
    },
    startupService: (msg) => calls.push(['startupService', msg]),
    resolveMissingCityEntitiesFromMap: (entities) =>
      calls.push(['resolveMissingCityEntitiesFromMap', entities]),
    renderLiveCityStats: () => calls.push(['renderLiveCityStats']),
  };

  const snapshot = {
    CityEntityDefs: { b1: { id: 'b1', name: 'Tent' } },
    'metadata:cityEntities': {
      version: 1,
      entries: {
        b2: {
          data: { id: 'b2', name: 'Hut' },
        },
      },
    },
  };

  hydrateCityEntitiesFromSnapshot(snapshot, deps);

  assert.deepStrictEqual(calls, [
    ['processMetadataData', { b1: { id: 'b1', name: 'Tent' } }],
    ['processMetadataData', [{ id: 'b2', name: 'Hut' }]],
    ['setMetadataLoaded', true],
    ['setLastStartupMsg', initialPendingMsg],
    ['startupService', initialPendingMsg],
    ['setPendingStartupMsg', null],
    ['renderLiveCityStats'],
  ]);
});

test('hydrateCityEntitiesFromChange handles CityEntityDefs and metadata:cityEntities', () => {
  const calls = [];
  const mockStartupMsg = { id: 'startup_1' };

  const deps = {
    processMetadataData: (data) => calls.push(['processMetadataData', data]),
    setMetadataLoaded: (val) => calls.push(['setMetadataLoaded', val]),
    getLastStartupMsg: () => mockStartupMsg,
    startupService: (msg) => calls.push(['startupService', msg]),
  };

  assert.strictEqual(
    hydrateCityEntitiesFromChange('unrelatedKey', {}, deps),
    false,
  );

  assert.strictEqual(
    hydrateCityEntitiesFromChange(
      'CityEntityDefs',
      { b_armory: { name: 'Armory' } },
      deps,
    ),
    true,
  );
  assert.deepStrictEqual(calls, [
    ['processMetadataData', { b_armory: { name: 'Armory' } }],
    ['setMetadataLoaded', true],
    ['startupService', mockStartupMsg],
  ]);

  calls.length = 0;

  assert.strictEqual(
    hydrateCityEntitiesFromChange(
      'metadata:cityEntities',
      {
        entries: {
          b_stable: { data: { id: 'b_stable', name: 'Stable' } },
        },
      },
      deps,
    ),
    true,
  );
  assert.deepStrictEqual(calls, [
    ['processMetadataData', [{ id: 'b_stable', name: 'Stable' }]],
    ['setMetadataLoaded', true],
    ['startupService', mockStartupMsg],
  ]);
});
