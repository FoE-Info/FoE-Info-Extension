import assert from 'node:assert/strict';
import test from 'node:test';
import pkg from '../../src/js/state/storageListener.js';

const { handleStorageChange, handleReceiveStorage, initStorageListeners } = pkg;

test('initStorageListeners registers listener on browser.storage.onChanged', () => {
  let registeredListener = null;
  let removedListener = null;

  const mockBrowser = {
    storage: {
      onChanged: {
        addListener: (fn) => {
          registeredListener = fn;
        },
        removeListener: (fn) => {
          removedListener = fn;
        },
      },
    },
  };

  const listener = initStorageListeners({ browser: mockBrowser });
  assert.strictEqual(typeof registeredListener, 'function');
  assert.strictEqual(registeredListener, listener);

  // Calling initStorageListeners again replaces listener and cleans up previous
  const secondListener = initStorageListeners({ browser: mockBrowser });
  assert.strictEqual(removedListener, listener);
  assert.strictEqual(registeredListener, secondListener);
});

test('handleStorageChange applies world-scoped options for current world', () => {
  const calls = [];
  const deps = {
    storage: { getCurrentWorld: () => 'en1' },
    setOptions: (name, val) => calls.push(['setOptions', name, val]),
    applyCardVisibility: () => calls.push(['applyCardVisibility']),
    setDonationPercent: (val) => calls.push(['setDonationPercent', val]),
    setCurrentPercent: (val) => calls.push(['setCurrentPercent', val]),
    setDonationSuffix: (val) => calls.push(['setDonationSuffix', val]),
    setTargetsTopic: (val) => calls.push(['setTargetsTopic', val]),
    setTargetText: (val) => calls.push(['setTargetText', val]),
    setUrl: (val) => calls.push(['setUrl', val]),
    setToolOptions: (val) => calls.push(['setToolOptions', val]),
    collapseOptions: (k, v) => calls.push(['collapseOptions', k, v]),
  };

  const changes = {
    'world:en1': {
      newValue: {
        showOptions: { showBonus: true },
        donation: {
          percent: 190,
          suffix: 'arc',
          targets: 'p1',
          targetText: 'p1 target',
        },
        webhooks: { discord: 'https://discord.test' },
        toolOptions: { minSize: 100 },
        collapses: { collapseGBInfo: true },
      },
    },
  };

  handleStorageChange(changes, 'local', deps);

  assert.deepStrictEqual(calls, [
    ['setOptions', 'showOptions', { showBonus: true }],
    ['applyCardVisibility'],
    ['setDonationPercent', 190],
    ['setCurrentPercent', 190],
    ['setDonationSuffix', 'arc'],
    ['setTargetsTopic', 'p1'],
    ['setTargetText', 'p1 target'],
    ['setUrl', { discord: 'https://discord.test' }],
    ['setToolOptions', { minSize: 100 }],
    ['collapseOptions', 'collapseGBInfo', true],
  ]);
});

test('handleStorageChange ignores world-scoped changes for different worlds', () => {
  const calls = [];
  const deps = {
    storage: { getCurrentWorld: () => 'en1' },
    setOptions: (name, val) => calls.push(['setOptions', name, val]),
    applyCardVisibility: () => calls.push(['applyCardVisibility']),
  };

  const changes = {
    'world:de2': {
      newValue: {
        showOptions: { showBonus: true },
      },
    },
  };

  handleStorageChange(changes, 'local', deps);
  assert.strictEqual(calls.length, 0);
});

test('handleStorageChange handles legacy global settings', () => {
  const calls = [];
  const deps = {
    storage: { getCurrentWorld: () => 'en1' },
    setLanguage: (val) => calls.push(['setLanguage', val]),
    setTargetsTopic: (val) => calls.push(['setTargetsTopic', val]),
    setTargetText: (val) => calls.push(['setTargetText', val]),
    setToolOptions: (val) => calls.push(['setToolOptions', val]),
    setDonationPercent: (val) => calls.push(['setDonationPercent', val]),
    setCurrentPercent: (val) => calls.push(['setCurrentPercent', val]),
    setDonationSuffix: (val) => calls.push(['setDonationSuffix', val]),
    setUrl: (val) => calls.push(['setUrl', val]),
  };

  const changes = {
    tool: { newValue: { language: 'fr' } },
    targets: { newValue: 'target_abc' },
    targetText: { newValue: 'text_xyz' },
    toolOptions: { newValue: { autoCollect: true } },
    donationPercent: { newValue: 195 },
    donationSuffix: { newValue: 'fp' },
    url: { newValue: 'https://hook.url' },
  };

  handleStorageChange(changes, 'local', deps);

  assert.deepStrictEqual(calls, [
    ['setLanguage', 'fr'],
    ['setTargetsTopic', 'target_abc'],
    ['setTargetText', 'text_xyz'],
    ['setToolOptions', { autoCollect: true }],
    ['setDonationPercent', 195],
    ['setCurrentPercent', 195],
    ['setDonationSuffix', 'fp'],
    ['setUrl', 'https://hook.url'],
  ]);
});

test('handleReceiveStorage updates storage cache and world configuration', () => {
  let cacheUpdated = null;
  const calls = [];

  const deps = {
    storage: {
      getCurrentWorld: () => 'en1',
      updateCache: (data) => {
        cacheUpdated = data;
      },
    },
    setOptions: (name, val) => calls.push(['setOptions', name, val]),
    applyCardVisibility: () => calls.push(['applyCardVisibility']),
    setDonationPercent: (val) => calls.push(['setDonationPercent', val]),
    setCurrentPercent: (val) => calls.push(['setCurrentPercent', val]),
  };

  const result = {
    'world:en1': {
      showOptions: { showBonus: true },
      donation: { percent: 185 },
    },
    // Top-level fallbacks should be skipped when world:en1 is present
    showOptions: { showBonus: false },
    donationPercent: 180,
  };

  handleReceiveStorage(result, deps);

  assert.deepStrictEqual(cacheUpdated, result);
  assert.deepStrictEqual(calls, [
    ['setOptions', 'showOptions', { showBonus: true }],
    ['applyCardVisibility'],
    ['setDonationPercent', 185],
    ['setCurrentPercent', 185],
  ]);
});

test('handleReceiveStorage applies legacy fallbacks when curWorldData is absent', () => {
  const calls = [];
  const deps = {
    storage: {
      getCurrentWorld: () => 'en1',
      updateCache: () => {},
    },
    setOptions: (name, val) => calls.push(['setOptions', name, val]),
    applyCardVisibility: () => calls.push(['applyCardVisibility']),
    setTargetsTopic: (val) => calls.push(['setTargetsTopic', val]),
    setTargetText: (val) => calls.push(['setTargetText', val]),
    setToolOptions: (val) => calls.push(['setToolOptions', val]),
    setDonationPercent: (val) => calls.push(['setDonationPercent', val]),
    setCurrentPercent: (val) => calls.push(['setCurrentPercent', val]),
    setDonationSuffix: (val) => calls.push(['setDonationSuffix', val]),
    setUrl: (val) => calls.push(['setUrl', val]),
  };

  const result = {
    showOptions: { showBonus: true },
    targets: 'legacy_targets',
    targetText: 'legacy_text',
    toolOptions: { minSize: 80 },
    donationPercent: 192,
    donationSuffix: 'arc',
    url: 'https://legacy.url',
  };

  handleReceiveStorage(result, deps);

  assert.deepStrictEqual(calls, [
    ['setOptions', 'showOptions', { showBonus: true }],
    ['applyCardVisibility'],
    ['setTargetsTopic', 'legacy_targets'],
    ['setTargetText', 'legacy_text'],
    ['setToolOptions', { minSize: 80 }],
    ['setDonationPercent', 192],
    ['setCurrentPercent', 192],
    ['setDonationSuffix', 'arc'],
    ['setUrl', 'https://legacy.url'],
  ]);
});

test('handleReceiveStorage processes CityEntityDefs and resolves startup', () => {
  const calls = [];
  const initialPendingMsg = {
    responseData: { city_map: { entities: [{ id: 10 }] } },
  };
  let pendingMsg = initialPendingMsg;
  let lastMsg = null;

  const deps = {
    storage: { getCurrentWorld: () => 'en1', updateCache: () => {} },
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

  const result = {
    CityEntityDefs: { b_residential: { name: 'House' } },
  };

  handleReceiveStorage(result, deps);

  assert.deepStrictEqual(calls, [
    ['processMetadataData', { b_residential: { name: 'House' } }],
    ['setMetadataLoaded', true],
    ['setLastStartupMsg', initialPendingMsg],
    ['startupService', initialPendingMsg],
    ['setPendingStartupMsg', null],
    ['renderLiveCityStats'],
  ]);
});

test('handleReceiveStorage populates lookup caches and collapse options', () => {
  const buildingLookup = {};
  const allyDefs = {};
  const researchDefs = {};
  const militaryDefs = {};
  const metaIds = {};
  const playerNames = {};
  const collapseCalls = [];

  const deps = {
    storage: { getCurrentWorld: () => 'en1', updateCache: () => {} },
    BuildingEntityLookup: buildingLookup,
    AllyDefs: allyDefs,
    ResearchDefs: researchDefs,
    MilitaryDefs: militaryDefs,
    MetaIds: metaIds,
    playerNameCache: playerNames,
    collapseOptions: (k, v) => collapseCalls.push([k, v]),
  };

  const result = {
    'world:en1': {
      collapses: { collapse_card1: true },
    },
    BuildingEntityLookup: { B_1: 'Barracks' },
    AllyDefs: { A_1: 'Alexander' },
    ResearchDefs: { R_1: 'Wheel' },
    MilitaryDefs: { M_1: 'Spearman' },
    MetaIds: { ID_1: 'Metadata' },
    playerNameCache: { 101: 'PlayerOne' },
  };

  handleReceiveStorage(result, deps);

  assert.deepStrictEqual(collapseCalls, [['collapse_card1', true]]);
  assert.strictEqual(buildingLookup.B_1, 'Barracks');
  assert.strictEqual(allyDefs.A_1, 'Alexander');
  assert.strictEqual(researchDefs.R_1, 'Wheel');
  assert.strictEqual(militaryDefs.M_1, 'Spearman');
  assert.strictEqual(metaIds.ID_1, 'Metadata');
  assert.strictEqual(playerNames['101'], 'PlayerOne');
});

test('handleStorageChange and handleReceiveStorage handle invalid inputs without throwing', () => {
  assert.doesNotThrow(() => handleStorageChange(null, 'local'));
  assert.doesNotThrow(() => handleStorageChange(undefined, 'local'));
  assert.doesNotThrow(() => handleStorageChange({}, 'local'));
  assert.doesNotThrow(() => handleReceiveStorage(null));
  assert.doesNotThrow(() => handleReceiveStorage(undefined));
  assert.doesNotThrow(() => handleReceiveStorage({}));
});
