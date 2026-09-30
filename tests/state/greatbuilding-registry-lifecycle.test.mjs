// Lifecycle suite for GreatBuildingRegistry: capacity bound, alias
// normalization, and world-switch reset.
//
// Every sub-test is written to fail against the pre-change code for a
// BEHAVIOURAL reason, using only API that exists before the change:
//
// - Capacity: the pre-change Map grew without bound, so 2000 registrations
//   produced far more entries than the documented cap. Asserted against
//   `getRegistry().size` (pre-existing) and a fallback cap of 512, so the red
//   is the missing bound itself, not a missing export.
// - Alias count: pre-change filed 2 shared keys for this entity ('1001_777'
//   and '777'); '0_777' only appears when the owner id is 0, which it is not
//   here. Expected 1, found 2.
// - World-switch reset: driven through bindNetworkBridge's OWN default, with
//   no resetSessionState supplied by the test. An earlier version of this file
//   passed its own resetSessionState into createWorldSwitcher, which proved
//   only that a hook the test itself injected was invoked — and passed against
//   the pre-change code, since createWorldSwitcher already called any hook it
//   was given. The reset is captured via the injected networkListeners hook,
//   so the default resolution is what is under test.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const registry = require('../../src/js/state/GreatBuildingRegistry.js');
const bridge = require('../../src/js/ui/networkBridge.js');

const { registerGreatBuilding, getGreatBuilding, reset, getRegistry } =
  registry;
const bindNetworkBridge = bridge.bindNetworkBridge;

const DOCUMENTED_CAPACITY = 512;
const slug = 'X_FutureEra_Landmark1';

const entityAt = (i) => ({
  id: 900000 + i,
  cityentity_id: slug,
  type: 'greatbuilding',
  player_id: 1000 + i,
  level: 10 + (i % 50),
  max_level: 11,
  connected: 1,
  state: {
    invested_forge_points: 100,
    forge_points_for_level_up: 1000,
  },
});

test('GreatBuildingRegistry lifecycle: bound, aliasing, world reset', async (t) => {
  t.beforeEach(() => reset());

  await t.test('registry stays bounded under a synthetic flood', () => {
    const COUNT = 2000;
    for (let i = 0; i < COUNT; i++) {
      registerGreatBuilding(entityAt(i), 1000 + i);
    }

    const size = getRegistry().size;
    // Fall back to the documented cap so this still fails on pre-change code,
    // where the export does not exist yet.
    const cap = registry.registryCapacity ?? DOCUMENTED_CAPACITY;
    assert.ok(size > 0, 'some entries registered');
    assert.ok(
      size <= cap,
      `registry must stay bounded: ${size} entries > cap ${cap}`,
    );

    // Newest entries must remain retrievable (nothing spuriously dropped).
    const newest = getGreatBuilding(1000 + COUNT - 1, 900000 + COUNT - 1);
    assert.ok(newest, 'newest entry survives the flood');
    assert.equal(newest.player_id, 1000 + COUNT - 1);
    assert.equal(newest.id, 900000 + COUNT - 1);
  });

  await t.test('one logical entry costs one canonical key', () => {
    const e = {
      id: 777,
      entity_id: 777,
      cityentity_id: slug,
      type: 'greatbuilding',
      player_id: 1001,
      level: 80,
      max_level: 85,
      connected: 1,
      state: {
        invested_forge_points: 1500,
        forge_points_for_level_up: 5000,
      },
    };
    assert.ok(registerGreatBuilding(e, 1001), 'registered');

    const shared = [...getRegistry().values()].filter(
      (v) => v && v.id === 777 && v.player_id === 1001,
    ).length;
    assert.equal(shared, 1, `expected exactly 1 shared key; found ${shared}`);

    // Owner lookup and ownerless fallback resolve to the same record.
    assert.equal(getGreatBuilding(1001, 777), getGreatBuilding(null, 777));
  });

  await t.test(
    'world switch clears prior-world entries via the bridge default',
    async () => {
      registerGreatBuilding(entityAt(1), 3001);
      assert.ok(
        getGreatBuilding(3001, 900001),
        'prior-world entry is readable before switch',
      );

      // Capture the switch function the bridge hands to the network layer.
      // No resetSessionState is supplied: the DEFAULT is what must fire.
      //
      // bindNetworkBridge resolves dependency defaults through safeRequire,
      // which is a deliberate no-op unless __webpack_require__ exists
      // (networkBridge.js:12) — the loader is a webpack concern. Defining the
      // global is therefore required to exercise the real default path here,
      // rather than handing the test its own hook and proving nothing. node
      // --test runs each file in its own process, so this does not leak.
      globalThis.__webpack_require__ = () => {};
      t.after(() => {
        delete globalThis.__webpack_require__;
      });

      let switchToWorld;
      bindNetworkBridge({
        storage: {
          setWorld() {},
          registerKnownWorld() {},
          isPlayableWorld: () => true,
          getWorldSettings: async () => ({}),
        },
        networkListeners: (deps) => {
          switchToWorld = deps.switchToWorld;
        },
      });
      assert.equal(
        typeof switchToWorld,
        'function',
        'bridge exposed a switch fn',
      );

      await switchToWorld('zz1');

      assert.equal(
        getGreatBuilding(3001, 900001),
        null,
        'previous world entry must not survive a world switch',
      );
      assert.equal(
        getRegistry().size,
        0,
        'registry must be empty after switch',
      );
    },
  );
});
