import assert from 'node:assert/strict';
import test from 'node:test';
import { MetadataDomainCollections } from '../../src/js/state/metadataDomainCollections.js';

test('MetadataDomainCollections - lookup URLs', () => {
  const coll = new MetadataDomainCollections();
  coll.registerLookupUrl(
    'building_entity_W_MultiAge_ANNI23A1',
    'https://example.com/anni.json',
  );
  assert.equal(
    coll.getLookupUrl('W_MultiAge_ANNI23A1'),
    'https://example.com/anni.json',
  );
  assert.equal(
    coll.getLookupUrl('building_entity_W_MultiAge_ANNI23A1'),
    'https://example.com/anni.json',
  );
  assert.equal(coll.getLookupUrl('unknown'), null);
});

test('MetadataDomainCollections - resources & technologies', () => {
  const coll = new MetadataDomainCollections();
  coll.registerResources([{ id: 'strategy_points', name: 'Forge Points' }]);
  assert.equal(coll.getResource('strategy_points')?.name, 'Forge Points');
  assert.equal(coll.getResource('unknown'), null);

  coll.registerTechnologies([{ id: 'tech_wheel', name: 'The Wheel' }]);
  assert.equal(coll.getTechnology('tech_wheel')?.name, 'The Wheel');
  assert.equal(coll.getTechnology('unknown'), null);
});

test('MetadataDomainCollections - military units, eras, and allies', () => {
  const coll = new MetadataDomainCollections();
  coll.registerUnits([
    { unitTypeId: 'spearfighter', name: 'Spearfighter', era: 'BronzeAge' },
    { id: 'rogue', name: 'Rogue', minEra: 'NoAge' },
  ]);
  assert.equal(coll.getUnit('spearfighter')?.name, 'Spearfighter');
  assert.equal(coll.getUnit('rogue')?.era, 'NoAge');
  assert.equal(coll.getUnit('rogue')?.minEra, 'NoAge');
  assert.equal(coll.getUnit('unknown'), null);

  coll.registerEras([{ era: 'BronzeAge', name: 'Bronze Age' }]);
  assert.equal(coll.getEra('BronzeAge')?.name, 'Bronze Age');
  assert.equal(coll.getEra('unknown'), null);

  coll.registerAllies([{ id: 'alexander', name: 'Alexander the Great' }]);
  assert.equal(coll.getAlly('alexander')?.name, 'Alexander the Great');
  assert.equal(coll.getAlly('unknown'), null);
});

test('MetadataDomainCollections - reset clears collections', () => {
  const coll = new MetadataDomainCollections();
  coll.registerResources([{ id: 'money' }]);
  assert.ok(coll.getResource('money'));

  coll.reset();
  assert.equal(coll.getResource('money'), null);
  assert.equal(coll.resources.size, 0);
  assert.equal(coll.technologies.size, 0);
  assert.equal(coll.units.size, 0);
  assert.equal(coll.eras.size, 0);
  assert.equal(coll.allies.size, 0);
  assert.equal(coll.lookupUrls.size, 0);
});
