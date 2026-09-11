import assert from 'node:assert/strict';
import test from 'node:test';
import {
  initWebRequestFilter,
  originWithId,
} from '../../src/js/protocol/webRequestFilter.js';

test('WebRequestFilter Suite', async (t) => {
  await t.test('originWithId detects chrome and moz extension origins', () => {
    assert.equal(
      originWithId({
        name: 'Origin',
        value: 'chrome-extension://abcdefghijklmno',
      }),
      true,
    );
    assert.equal(
      originWithId({
        name: 'origin',
        value: 'moz-extension://12345-6789',
      }),
      true,
    );
    assert.equal(
      originWithId({
        name: 'Origin',
        value: 'https://en0.forgeofempires.com',
      }),
      false,
    );
    assert.equal(
      originWithId({
        name: 'User-Agent',
        value: 'chrome-extension://foobar',
      }),
      false,
    );
    assert.equal(originWithId(null), false);
    assert.equal(originWithId({}), false);
  });

  await t.test(
    'initWebRequestFilter registers listener on chrome.webRequest',
    () => {
      let registeredListener = null;
      let registeredFilter = null;
      let registeredExtra = null;

      const mockChrome = {
        webRequest: {
          onBeforeSendHeaders: {
            addListener: (fn, filter, extra) => {
              registeredListener = fn;
              registeredFilter = filter;
              registeredExtra = extra;
            },
          },
        },
      };

      const result = initWebRequestFilter(mockChrome);
      assert.equal(result, true);
      assert.deepEqual(registeredFilter, {
        urls: ['https://*.innogamescdn.com/*'],
      });
      assert.deepEqual(registeredExtra, ['requestHeaders']);

      // Test filtering headers
      const filtered = registeredListener({
        url: 'https://foede.innogamescdn.com/asset.png',
        requestHeaders: [
          { name: 'Accept', value: '*/*' },
          { name: 'Origin', value: 'chrome-extension://some-id' },
          { name: 'Referer', value: 'https://en7.forgeofempires.com/' },
        ],
      });

      assert.equal(filtered.requestHeaders.length, 2);
      assert.equal(filtered.requestHeaders[0].name, 'Accept');
      assert.equal(filtered.requestHeaders[1].name, 'Referer');
    },
  );

  await t.test(
    'initWebRequestFilter handles missing or throwing chrome gracefully',
    () => {
      assert.equal(initWebRequestFilter(null), false);
      assert.equal(initWebRequestFilter({}), false);

      const throwingChrome = {
        webRequest: {
          onBeforeSendHeaders: {
            addListener: () => {
              throw new Error('Permission denied');
            },
          },
        },
      };
      assert.equal(initWebRequestFilter(throwingChrome), false);
    },
  );
});
