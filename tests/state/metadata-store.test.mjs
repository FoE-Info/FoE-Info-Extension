import assert from 'node:assert/strict';
import test from 'node:test';
import metadataServicePkg from '../../src/js/msg/MetadataService.js';
import pkg from '../../src/js/state/MetadataStore.js';

const { MetadataStore, metadataStore } = pkg;
const { processMetadataEntry, processMetadataData } = metadataServicePkg;

test('MetadataStore - Entity Registration & Canonical Lookup', () => {
  const store = new MetadataStore();
  const sampleBuilding = {
    id: 'W_MultiAge_ANNI23A1',
    asset_id: 'tower_conjunction_1',
    name: 'Tower of Conjunction - Lv. 1',
    width: 3,
    length: 3,
  };

  store.registerEntity(sampleBuilding);

  // Exact ID match
  assert.equal(
    store.getEntity('W_MultiAge_ANNI23A1')?.name,
    'Tower of Conjunction - Lv. 1',
  );
  // Asset ID match
  assert.equal(
    store.getEntity('tower_conjunction_1')?.name,
    'Tower of Conjunction - Lv. 1',
  );
  // Prefix normalized match
  assert.equal(
    store.getEntity('building_entity_W_MultiAge_ANNI23A1')?.name,
    'Tower of Conjunction - Lv. 1',
  );
  // Unknown ID returns null
  assert.equal(store.getEntity('non_existent_building'), null);
});

test('MetadataStore - Relational Upgrades & Selection Kits', () => {
  const store = new MetadataStore();

  store.registerEntity({ id: 'bldg_lv1', name: 'Tower Lv 1' });
  store.registerEntity({ id: 'bldg_lv2', name: 'Tower Lv 2' });

  store.registerBuildingUpgrades([
    {
      upgradeItem: { id: 'tower_kit', name: 'Tower Upgrade Kit' },
      upgradeSteps: [
        { buildingIds: ['bldg_lv1'] },
        { buildingIds: ['bldg_lv2'] },
      ],
    },
  ]);

  store.registerSelectionKits([
    {
      selectionKitId: 'tower_selkit',
      name: 'Tower Selection Kit',
      options: [
        { name: 'Tower Lv 1', item: { cityEntityId: 'bldg_lv1', level: 1 } },
      ],
    },
  ]);

  const upgrade = store.getUpgradePath('bldg_lv1');
  assert.ok(upgrade);
  assert.equal(upgrade.kitId, 'tower_kit');
  assert.equal(upgrade.level, 1);
  assert.equal(upgrade.maxLevel, 2);
  assert.equal(upgrade.buildings.length, 2);
  assert.equal(upgrade.buildings[1].name, 'Tower Lv 2');

  const kits = store.getSelectionKits('bldg_lv1');
  assert.equal(kits.length, 1);
  assert.equal(kits[0].kitId, 'tower_selkit');
});

test('MetadataStore - Sets & Chains', () => {
  const store = new MetadataStore();

  store.registerBuildingSets([
    {
      id: 'cherry_set',
      name: 'Cherry Garden Set',
      cityEntityIds: ['cherry_1', 'cherry_2'],
    },
  ]);

  store.registerBuildingChains([
    {
      id: 'train_chain',
      name: 'Winter Train',
      cityEntityIds: ['train_engine', 'train_car'],
    },
  ]);

  assert.equal(store.getSet('cherry_1')?.name, 'Cherry Garden Set');
  assert.equal(store.getChain('train_car')?.name, 'Winter Train');
});

test('MetadataStore - Lifecycle whenReady Synchronization', async () => {
  const store = new MetadataStore();
  let resolved = false;

  const promise = store.whenReady().then(() => {
    resolved = true;
  });

  assert.equal(resolved, false);
  store.markReady();
  await promise;
  assert.equal(resolved, true);
  assert.equal(store.isReady(), true);
});

test('MetadataStore - Legacy CityEntityDefs Proxy Bridge', () => {
  const store = new MetadataStore();
  store.registerEntity({
    id: 'A_ColonialAge_Embassy',
    name: 'Trading Company',
  });

  const proxy = store.createLegacyCityEntityProxy();
  assert.equal(proxy['A_ColonialAge_Embassy'].name, 'Trading Company');
  assert.equal('A_ColonialAge_Embassy' in proxy, true);
  assert.equal('non_existent' in proxy, false);
  assert.equal(proxy['non_existent'], undefined);

  // Test set trap
  proxy['B_BronzeAge_Hut'] = { id: 'B_BronzeAge_Hut', name: 'Hut' };
  assert.equal(store.getEntity('B_BronzeAge_Hut')?.name, 'Hut');
  assert.equal(proxy['B_BronzeAge_Hut']?.name, 'Hut');

  // Test ownKeys trap
  const keys = Object.keys(proxy);
  assert.ok(keys.includes('A_ColonialAge_Embassy'));
  assert.ok(keys.includes('B_BronzeAge_Hut'));

  // Test getOwnPropertyDescriptor trap
  const descriptor = Object.getOwnPropertyDescriptor(
    proxy,
    'A_ColonialAge_Embassy',
  );
  assert.ok(descriptor);
  assert.equal(descriptor.enumerable, true);
  assert.equal(descriptor.value.name, 'Trading Company');
});

test('MetadataStore - Lookup URL Registration & Retrieval', () => {
  const store = new MetadataStore();
  store.registerLookupUrl(
    'building_entity_W_MultiAge_ANNI23A1',
    'https://example.com/anni.json',
  );

  assert.equal(
    store.getLookupUrl('W_MultiAge_ANNI23A1'),
    'https://example.com/anni.json',
  );
  assert.equal(
    store.getLookupUrl('building_entity_W_MultiAge_ANNI23A1'),
    'https://example.com/anni.json',
  );
  assert.equal(store.getLookupUrl('non_existent'), null);
});

test('MetadataService - Ingestion of Cultural Buildings, Streets, and Impediments without Discard', () => {
  // Test cultural goods building
  processMetadataEntry({
    __class__: 'CityEntityCulturalGoodsBuilding',
    id: 'X_Cultural_Shrine',
    name: 'Shinto Shrine',
  });
  assert.equal(
    metadataStore.getEntity('X_Cultural_Shrine')?.name,
    'Shinto Shrine',
  );

  // Test street
  processMetadataEntry({
    __class__: 'CityEntityStreet',
    id: 'R_BronzeAge_Trail',
    name: 'Dirt Trail',
  });
  assert.equal(
    metadataStore.getEntity('R_BronzeAge_Trail')?.name,
    'Dirt Trail',
  );

  // Test impediment
  processMetadataEntry({
    __class__: 'CityEntityImpediment',
    id: 'X_AllAge_Rock',
    name: 'Obstacle Rock',
  });
  assert.equal(metadataStore.getEntity('X_AllAge_Rock')?.name, 'Obstacle Rock');
});
