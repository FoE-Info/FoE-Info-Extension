import assert from 'node:assert/strict';
import test from 'node:test';
import worldStorage from '../../src/js/utils/worldStorage.js';

const { getGlobalSettings, updateGlobalSettings, _clearMemoryCacheForTesting } =
  worldStorage;

/**
 * §4: a write that did not land must not look like one that did.
 *
 * `saveWorldSettings` and `updateGlobalSettings` both await `local.set` with
 * no catch, so their rejections reach the caller and the UI can avoid
 * reporting a save that will vanish on the next cold start. `getGlobalSettings`
 * used to swallow its seed write with `.catch(() => {})`, which is the one
 * remaining place on the global-settings path where a failed write reported
 * success.
 */
function createStorage({ rejectWrites = [] } = {}) {
  const store = Object.create(null);
  return {
    store,
    local: {
      async get(keys) {
        if (typeof keys === 'string') return { [keys]: store[keys] };
        if (Array.isArray(keys)) {
          const res = {};
          for (const k of keys) res[k] = store[k];
          return res;
        }
        return { ...store };
      },
      set(obj) {
        for (const k of Object.keys(obj)) {
          if (rejectWrites.includes(k)) {
            return Promise.reject(new Error(`storage write failed: ${k}`));
          }
        }
        Object.assign(store, obj);
        return Promise.resolve();
      },
    },
  };
}

function install(storage) {
  globalThis.browser = { storage: { local: storage.local } };
  _clearMemoryCacheForTesting();
}

function uninstall() {
  delete globalThis.browser;
  _clearMemoryCacheForTesting();
}

test('global settings', async (t) => {
  await t.test(
    'a failed seed write rejects instead of reporting success',
    async () => {
      const storage = createStorage({ rejectWrites: ['global:settings'] });
      install(storage);
      t.after(uninstall);

      await assert.rejects(getGlobalSettings(), /storage write failed/);
      assert.equal(
        storage.store['global:settings'],
        undefined,
        'a rejected write must not leave a value behind',
      );
    },
  );

  await t.test(
    'a successful seed write persists and is then cached',
    async () => {
      const storage = createStorage();
      install(storage);
      t.after(uninstall);

      const seeded = await getGlobalSettings();
      assert.ok(seeded, 'a cold start returns defaults');
      assert.deepEqual(storage.store['global:settings'], seeded);
    },
  );

  await t.test(
    'a failed update write rejects rather than only failing in memory',
    async () => {
      const storage = createStorage();
      install(storage);
      await getGlobalSettings();
      // Only reject the update, not the cold-start seed.
      const rejecting = {
        ...storage.local,
        set(obj) {
          if (Object.prototype.hasOwnProperty.call(obj, 'global:settings')) {
            return Promise.reject(new Error('storage write failed: update'));
          }
          return storage.local.set(obj);
        },
      };
      globalThis.browser = { storage: { local: rejecting } };

      await assert.rejects(
        updateGlobalSettings((g) => ({ ...g, theme: 'dark' })),
        /storage write failed/,
      );
    },
  );
});
