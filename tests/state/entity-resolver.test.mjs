import assert from 'node:assert/strict';
import test from 'node:test';
import {
  indexEntityAliases,
  isEntityEqual,
  peekEntity,
  reportEntityLookup,
} from '../../src/js/state/entityResolver.js';

test('entityResolver - isEntityEqual deep equality', () => {
  assert.equal(isEntityEqual(null, null), true);
  assert.equal(isEntityEqual(undefined, undefined), true);
  assert.equal(isEntityEqual(null, {}), false);
  assert.equal(isEntityEqual({}, null), false);

  const objA = {
    id: 'building_1',
    size: { width: 3, length: 4 },
    tags: ['military'],
  };
  const objB = {
    id: 'building_1',
    size: { width: 3, length: 4 },
    tags: ['military'],
  };
  const objC = {
    id: 'building_1',
    size: { width: 3, length: 5 },
    tags: ['military'],
  };

  assert.equal(isEntityEqual(objA, objB), true);
  assert.equal(isEntityEqual(objA, objC), false);
  assert.equal(isEntityEqual(objA, { id: 'building_1' }), false);
});

test('entityResolver - indexEntityAliases and peekEntity prefix stripping', () => {
  const map = new Map();
  const entity = {
    id: 'building_entity_W_MultiAge_GrandTower',
    asset_id: 'grand_tower_asset',
    name: 'Grand Tower',
    entity_levels: [
      {
        id: 'grand_tower_lvl1',
        asset_id: 'grand_tower_lvl1_asset',
        name: 'Grand Tower L1',
      },
      { id: 'grand_tower_lvl2', name: 'Grand Tower L2' },
    ],
  };

  indexEntityAliases(map, entity);

  // Exact ID
  assert.equal(
    peekEntity(map, 'building_entity_W_MultiAge_GrandTower')?.name,
    'Grand Tower',
  );
  // Asset ID
  assert.equal(peekEntity(map, 'grand_tower_asset')?.name, 'Grand Tower');
  // Raw entity ID without prefix
  assert.equal(peekEntity(map, 'W_MultiAge_GrandTower')?.name, 'Grand Tower');
  // Clean ID
  assert.equal(peekEntity(map, 'GrandTower')?.name, 'Grand Tower');
  // Level IDs
  assert.equal(peekEntity(map, 'grand_tower_lvl1')?.name, 'Grand Tower L1');
  assert.equal(
    peekEntity(map, 'grand_tower_lvl1_asset')?.name,
    'Grand Tower L1',
  );
  assert.equal(peekEntity(map, 'grand_tower_lvl2')?.name, 'Grand Tower L2');

  // Null / missing lookups
  assert.equal(peekEntity(map, null), null);
  assert.equal(peekEntity(map, ''), null);
  assert.equal(peekEntity(map, 'unknown_id'), null);
});

test('entityResolver - reportEntityLookup bounded tracking', () => {
  const misses = new Set();

  reportEntityLookup(misses, 'building_missing_1', null);
  assert.equal(misses.has('building_missing_1'), false); // debug is disabled in test mode

  // When found, delete from misses
  misses.add('existing_id');
  reportEntityLookup(misses, 'existing_id', { id: 'existing_id' });
  assert.equal(misses.has('existing_id'), false);

  // Null safety
  reportEntityLookup(misses, null, null);
  reportEntityLookup(null, 'some_id', null);
});
