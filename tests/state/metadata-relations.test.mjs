import assert from 'node:assert/strict';
import test from 'node:test';
import { MetadataRelations } from '../../src/js/state/metadataRelations.js';

test('MetadataRelations - registerBuildingSets & query', () => {
  const rel = new MetadataRelations();
  rel.registerBuildingSets([
    {
      id: 'cherry_set',
      name: 'Cherry Garden Set',
      cityEntityIds: ['cherry_gate', 'cherry_gong'],
    },
  ]);

  assert.equal(rel.getSet('cherry_gate')?.name, 'Cherry Garden Set');
  assert.equal(rel.getSet('cherry_set')?.name, 'Cherry Garden Set');
  assert.equal(rel.getSetForEntity('cherry_gong'), 'cherry_set');
  assert.equal(rel.getSetForEntity('unknown_bldg'), null);
});

test('MetadataRelations - registerBuildingChains & query', () => {
  const rel = new MetadataRelations();
  rel.registerBuildingChains([
    {
      id: 'train_chain',
      name: 'Winter Train',
      buildings: ['train_car_dining', 'train_car_sleeping'],
    },
  ]);

  assert.equal(rel.getChain('train_car_dining')?.name, 'Winter Train');
  assert.equal(rel.getChain('train_chain')?.name, 'Winter Train');
  assert.equal(rel.getChainForEntity('train_car_sleeping'), 'train_chain');
  assert.equal(rel.getChainForEntity('unknown'), null);
});

test('MetadataRelations - registerBuildingUpgrades & getUpgradePath', () => {
  const rel = new MetadataRelations();
  rel.registerBuildingUpgrades([
    {
      upgradeItem: { id: 'colossus_kit', name: 'Colossus Upgrade Kit' },
      upgradeSteps: [
        { buildingIds: ['colossus_lvl1'] },
        { buildingIds: ['colossus_lvl2'] },
        { buildingIds: ['colossus_lvl3'] },
      ],
    },
  ]);

  const mockEntities = {
    colossus_lvl1: { id: 'colossus_lvl1', name: 'Colossus Lv 1' },
    colossus_lvl2: { id: 'colossus_lvl2', name: 'Colossus Lv 2' },
    colossus_lvl3: { id: 'colossus_lvl3', name: 'Colossus Lv 3' },
  };

  const path = rel.getUpgradePath('colossus_lvl2', (id) => mockEntities[id]);
  assert.ok(path);
  assert.equal(path.kitId, 'colossus_kit');
  assert.equal(path.level, 2);
  assert.equal(path.maxLevel, 3);
  assert.equal(path.buildings.length, 3);
  assert.equal(path.buildings[0].name, 'Colossus Lv 1');
  assert.equal(path.buildings[1].name, 'Colossus Lv 2');
  assert.equal(path.buildings[2].name, 'Colossus Lv 3');

  assert.equal(rel.getUpgradePath('unknown_id'), null);
});

test('MetadataRelations - registerSelectionKits & getSelectionKits', () => {
  const rel = new MetadataRelations();
  rel.registerSelectionKits([
    {
      selectionKitId: 'hero_kit',
      name: 'Heroes Selection Kit',
      options: [
        { name: 'Hero Lv 1', item: { cityEntityId: 'hero_bldg_1', level: 1 } },
        { name: 'Hero Lv 2', item: { cityEntityId: 'hero_bldg_2', level: 2 } },
      ],
    },
  ]);

  const kits = rel.getSelectionKits('hero_bldg_1');
  assert.equal(kits.length, 1);
  assert.equal(kits[0].kitId, 'hero_kit');
  assert.equal(kits[0].kitName, 'Heroes Selection Kit');
  assert.equal(kits[0].optionName, 'Hero Lv 1');
  assert.equal(kits[0].level, 1);

  assert.deepEqual(rel.getSelectionKits('non_existent'), []);
});

test('MetadataRelations - reset clears all internal maps', () => {
  const rel = new MetadataRelations();
  rel.registerBuildingSets([{ id: 'set_1', cityEntityIds: ['b1'] }]);
  assert.ok(rel.getSet('b1'));

  rel.reset();
  assert.equal(rel.getSet('b1'), null);
  assert.equal(rel.sets.size, 0);
  assert.equal(rel.chains.size, 0);
  assert.equal(rel.upgradeKits.size, 0);
  assert.equal(rel.selectionKits.size, 0);
  assert.equal(rel.entityToUpgrade.size, 0);
  assert.equal(rel.entityToKits.size, 0);
  assert.equal(rel.entityToSet.size, 0);
  assert.equal(rel.entityToChain.size, 0);
});
