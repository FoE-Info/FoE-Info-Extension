import assert from 'node:assert/strict';
import test from 'node:test';
import pkg from '../../src/js/utils/storage.js';

const {
  isPlayableWorld,
  sanitizeWorldId,
  getWorldKey,
  setWorld,
  getCurrentWorld,
  initStorage,
  onWorldSettingsChange,
  getWorldSettings,
  saveWorldSettings,
  resetWorldSettings,
  getGlobalSettings,
  registerKnownWorld,
  set: setStorage,
  get: getStorage,
  getSync,
  remove: removeStorage,
  _clearMemoryCacheForTesting,
} = pkg;

function createMockBrowserStorage() {
  const store = Object.create(null);
  const changeListeners = [];

  return {
    store,
    storage: {
      local: {
        async get(keys) {
          if (keys === null || keys === undefined) {
            return { ...store };
          }
          if (typeof keys === 'string') {
            return { [keys]: store[keys] };
          }
          if (Array.isArray(keys)) {
            const res = {};
            for (const k of keys) res[k] = store[k];
            return res;
          }
          return {};
        },
        async set(obj) {
          const changes = {};
          for (const [k, v] of Object.entries(obj)) {
            const oldValue = store[k];
            store[k] = v;
            changes[k] = { oldValue, newValue: v };
          }
          changeListeners.forEach((fn) => fn(changes, 'local'));
        },
        async remove(key) {
          delete store[key];
        },
      },
      onChanged: {
        addListener(fn) {
          changeListeners.push(fn);
        },
      },
    },
  };
}

test('Per-World Storage Subsystem', async (t) => {
  let mock;

  t.beforeEach(() => {
    mock = createMockBrowserStorage();
    globalThis.browser = mock;
    _clearMemoryCacheForTesting();
  });

  t.afterEach(() => {
    delete globalThis.browser;
    _clearMemoryCacheForTesting();
  });

  await t.test('isPlayableWorld & landing page filtering', () => {
    // Valid playable game worlds
    assert.equal(isPlayableWorld('en7'), true);
    assert.equal(isPlayableWorld('en16'), true);
    assert.equal(isPlayableWorld('us8'), true);
    assert.equal(isPlayableWorld('de1'), true);
    assert.equal(isPlayableWorld('zz1'), true); // Beta server
    assert.equal(isPlayableWorld('zz2'), true);

    // Unplayable landing portals and invalid inputs
    assert.equal(isPlayableWorld('en0'), false);
    assert.equal(isPlayableWorld('us0'), false);
    assert.equal(isPlayableWorld('de0'), false);
    assert.equal(isPlayableWorld('zz0'), false);
    assert.equal(isPlayableWorld('www'), false);
    assert.equal(isPlayableWorld(''), false);
    assert.equal(isPlayableWorld(null), false);
  });

  await t.test('sanitizeWorldId & getWorldKey', () => {
    assert.equal(sanitizeWorldId('en7'), 'en7');
    assert.equal(sanitizeWorldId('EN16'), 'en16');
    assert.equal(sanitizeWorldId('  us_8  '), 'us8');
    assert.equal(sanitizeWorldId('en0'), 'en7');
    assert.equal(sanitizeWorldId('us0'), 'en7');
    assert.equal(sanitizeWorldId(''), 'en7');
    assert.equal(sanitizeWorldId(null), 'en7');
    assert.equal(sanitizeWorldId(123), 'en7');

    assert.equal(getWorldKey('en7'), 'world:en7');
    assert.equal(getWorldKey('EN16'), 'world:en16');
  });

  await t.test(
    'setWorld & getCurrentWorld ignores unplayable landing page en0',
    () => {
      assert.equal(getCurrentWorld(), 'en7');
      setWorld('de4');
      assert.equal(getCurrentWorld(), 'de4');
      setWorld('en0'); // Must be ignored
      assert.equal(getCurrentWorld(), 'de4');
      setWorld('zz1'); // Beta server world 1
      assert.equal(getCurrentWorld(), 'zz1');
    },
  );

  await t.test(
    'getWorldSettings seeds pristine factory defaults for uninitialized world',
    async () => {
      const settings = await getWorldSettings('en16');
      assert.ok(settings);
      assert.strictEqual(settings.showOptions.showBonus, true);
      assert.strictEqual(settings.donation.percent, 190);
      assert.deepStrictEqual(settings.caches.hiddenInvestments, []);

      // Verify stored in mock chrome.storage.local
      assert.ok(mock.store['world:en16']);
      assert.strictEqual(mock.store['world:en16'].donation.percent, 190);

      // Verify world is registered in global:settings
      const globals = await getGlobalSettings();
      assert.ok(globals.knownWorlds.includes('en16'));
      assert.equal(globals.lastActiveWorld, 'en16');
    },
  );

  await t.test(
    'saveWorldSettings isolates mutations per world without cross-world bleed',
    async () => {
      // Initialize en7 and en16
      await getWorldSettings('en7');
      await getWorldSettings('en16');

      // Update en7 only
      await saveWorldSettings('en7', {
        showOptions: { showBonus: false },
        donation: { percent: 185 },
      });

      const en7 = await getWorldSettings('en7');
      const en16 = await getWorldSettings('en16');

      assert.strictEqual(en7.showOptions.showBonus, false);
      assert.strictEqual(en7.donation.percent, 185);

      // en16 must remain untouched pristine factory defaults
      assert.strictEqual(en16.showOptions.showBonus, true);
      assert.strictEqual(en16.donation.percent, 190);
    },
  );

  await t.test(
    'resetWorldSettings restores pristine factory defaults',
    async () => {
      await saveWorldSettings('en7', {
        donation: { percent: 150 },
        showOptions: { showStats: false },
      });

      let current = await getWorldSettings('en7');
      assert.strictEqual(current.donation.percent, 150);
      assert.strictEqual(current.showOptions.showStats, false);

      const reset = await resetWorldSettings('en7');
      assert.strictEqual(reset.donation.percent, 190);
      assert.strictEqual(reset.showOptions.showStats, true);

      // Check persisted in storage
      assert.strictEqual(mock.store['world:en7'].donation.percent, 190);
    },
  );

  await t.test(
    'initStorage migrates legacy flat storage to world:en7 and global:settings',
    async () => {
      // Pre-seed legacy flat structure
      mock.store['showOptions'] = { showBonus: false, showStats: true };
      mock.store['donationPercent'] = 195;
      mock.store['donationSuffix'] = 'Arc';
      mock.store['targets'] = 'P1, P2';
      mock.store['targetText'] = 'Take safe spot';
      mock.store['url'] = { discordTargetURL: 'https://discord.com/api/test' };
      mock.store['tool'] = { language: 'de' };
      mock.store['hiddenInvestments'] = [1001, 1002];

      await initStorage();

      // Check migrated world:en7
      const en7 = mock.store['world:en7'];
      assert.ok(en7);
      assert.strictEqual(en7.showOptions.showBonus, false);
      assert.strictEqual(en7.donation.percent, 195);
      assert.strictEqual(en7.donation.suffix, 'Arc');
      assert.strictEqual(en7.donation.targets, 'P1, P2');
      assert.strictEqual(en7.donation.targetText, 'Take safe spot');
      assert.strictEqual(
        en7.webhooks.discordTargetURL,
        'https://discord.com/api/test',
      );
      assert.deepStrictEqual(en7.caches.hiddenInvestments, [1001, 1002]);

      // Check global:settings
      const globals = mock.store['global:settings'];
      assert.ok(globals);
      assert.strictEqual(globals.language, 'de');
      assert.deepStrictEqual(globals.knownWorlds, ['en7']);
      assert.strictEqual(globals.lastActiveWorld, 'en7');
    },
  );

  await t.test('backward-compatible shims (getSync, set, get)', async () => {
    setWorld('en7');
    await getWorldSettings('en7');

    // Test getSync for hiddenInvestments
    assert.deepStrictEqual(getSync('hiddenInvestments'), []);

    // Test set for hiddenInvestments
    setStorage('hiddenInvestments', [42, 99]);
    assert.deepStrictEqual(getSync('hiddenInvestments'), [42, 99]);

    // Test set for showOptions via investSettings shim
    setStorage('investSettings', { showBonus: false });
    assert.strictEqual(getSync('showOptions').showBonus, false);

    // Test generic key
    setStorage('customTestKey', 'foobar');
    assert.strictEqual(getSync('customTestKey'), 'foobar');

    const asyncVal = await getStorage('customTestKey');
    // Test removeStorage
    removeStorage('customTestKey');
    const removedVal = await getStorage('customTestKey');
    assert.strictEqual(removedVal, null);
  });

  await t.test('registerKnownWorld adds unique world codes', async () => {
    await registerKnownWorld('de4');
    let globals = await getGlobalSettings();
    assert.ok(globals.knownWorlds.includes('de4'));
    assert.strictEqual(globals.lastActiveWorld, 'de4');

    // Duplicate registration should be idempotent
    await registerKnownWorld('de4');
    globals = await getGlobalSettings();
    assert.strictEqual(
      globals.knownWorlds.filter((w) => w === 'de4').length,
      1,
    );
  });

  await t.test('onWorldSettingsChange event notification', async () => {
    setWorld('en7');
    await getWorldSettings('en7');

    let notified = null;
    let targetWorld = null;

    const unsubscribe = onWorldSettingsChange((newSettings, wid) => {
      notified = newSettings;
      targetWorld = wid;
    });

    // Mutate en7 via saveWorldSettings
    await saveWorldSettings('en7', { donation: { percent: 175 } });

    assert.ok(notified);
    assert.strictEqual(notified.donation.percent, 175);
    assert.strictEqual(targetWorld, 'en7');

    // Reset and mutate another world (en16) -> en7 listener should NOT fire
    notified = null;
    await saveWorldSettings('en16', { donation: { percent: 180 } });

    assert.strictEqual(notified, null);

    // Test unsubscribe
    unsubscribe();
    await saveWorldSettings('en7', { donation: { percent: 192 } });
    assert.strictEqual(notified, null);
  });
});
