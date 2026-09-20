import assert from 'node:assert/strict';
import test from 'node:test';
import { createLegacyCityEntityProxy } from '../../src/js/state/legacyEntityProxy.js';

test('legacyEntityProxy - trap behavior and proxy interaction', () => {
  const mockStore = {
    entities: new Map(),
    peekEntity(id) {
      return this.entities.get(id) || null;
    },
    registerEntity(entity) {
      this.entities.set(entity.id, entity);
    },
  };

  mockStore.registerEntity({ id: 'bldg_alcatraz', name: 'Alcatraz' });

  const proxy = createLegacyCityEntityProxy(mockStore);

  // 'get' trap
  assert.equal(proxy['bldg_alcatraz']?.name, 'Alcatraz');
  assert.equal(proxy['non_existent'], undefined);
  assert.equal(proxy[Symbol('sym')], undefined);

  // 'has' trap
  assert.equal('bldg_alcatraz' in proxy, true);
  assert.equal('non_existent' in proxy, false);

  // 'set' trap
  proxy['bldg_arc'] = { id: 'bldg_arc', name: 'The Arc' };
  assert.equal(mockStore.entities.get('bldg_arc')?.name, 'The Arc');
  assert.equal(proxy['bldg_arc']?.name, 'The Arc');

  // 'ownKeys' trap
  const keys = Object.keys(proxy);
  assert.ok(keys.includes('bldg_alcatraz'));
  assert.ok(keys.includes('bldg_arc'));

  // 'getOwnPropertyDescriptor' trap
  const desc = Object.getOwnPropertyDescriptor(proxy, 'bldg_alcatraz');
  assert.ok(desc);
  assert.equal(desc.enumerable, true);
  assert.equal(desc.configurable, true);
  assert.equal(desc.value.name, 'Alcatraz');

  const descMissing = Object.getOwnPropertyDescriptor(proxy, 'missing');
  assert.equal(descMissing, undefined);
});
