import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  initStorageBootstrap,
  logStorageUsage,
  CANONICAL_LOCALES,
} = require('../../src/js/ui/storageBootstrap.js');

test('storageBootstrap Suite', async (t) => {
  await t.test('CANONICAL_LOCALES contains all 7 supported locales', () => {
    assert.deepEqual(Object.keys(CANONICAL_LOCALES).sort(), [
      'de',
      'el',
      'en',
      'es',
      'fr',
      'gr',
      'it',
    ]);
    for (const [locale, path] of Object.entries(CANONICAL_LOCALES)) {
      assert.equal(path, `i18n/${locale}.json`);
    }
  });

  await t.test(
    'logStorageUsage queries getBytesInUse and logs size without throwing',
    async () => {
      let queried = false;
      const mockBrowser = {
        storage: {
          local: {
            getBytesInUse: () => {
              queried = true;
              return Promise.resolve(1024);
            },
          },
        },
      };

      logStorageUsage(mockBrowser);
      assert.equal(queried, true);

      // Safe with null or missing browser
      logStorageUsage(null);
      logStorageUsage({});
    },
  );

  await t.test(
    'initStorageBootstrap hydrates storage and loads i18n translations',
    async () => {
      let receivedStored = null;
      let receivedDeps = null;
      const mockStorageDeps = { id: 'testDeps' };

      let loadedLocales = null;
      let setLocaleVal = null;
      let translatedEl = null;

      const mockI18n = {
        load: (locales) => {
          loadedLocales = locales;
          return {
            done: (cb) => {
              cb();
            },
          };
        },
      };

      const mockDollar = function () {};
      mockDollar.i18n = function (opts) {
        if (opts?.locale) {
          setLocaleVal = opts.locale;
        }
        return mockI18n;
      };

      const mockBody = { id: 'mockBody' };
      const mockDoc = { body: mockBody };

      const mockBrowser = {
        storage: {
          local: {
            getBytesInUse: () => Promise.resolve(2048),
            get: () => Promise.resolve({ 'global:settings': { test: 1 } }),
          },
        },
      };

      const config = {
        browser: mockBrowser,
        document: mockDoc,
        getLanguage: () => 'de',
        handleReceiveStorage: (stored, deps) => {
          receivedStored = stored;
          receivedDeps = deps;
        },
        translateContainer: (el) => {
          translatedEl = el;
        },
        $: mockDollar,
      };

      await initStorageBootstrap(config, mockStorageDeps);

      assert.deepEqual(receivedStored, { 'global:settings': { test: 1 } });
      assert.equal(receivedDeps, mockStorageDeps);
      assert.equal(setLocaleVal, 'de');
      assert.deepEqual(loadedLocales, CANONICAL_LOCALES);
      assert.equal(translatedEl, mockBody);
    },
  );

  await t.test(
    'initStorageBootstrap exits safely when browser is missing',
    async () => {
      const res = await initStorageBootstrap({}, {});
      assert.equal(res, undefined);
    },
  );
});
