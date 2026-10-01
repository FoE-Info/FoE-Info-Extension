import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { isInventoryAsset } from '../../src/js/utils/inventorySignal.js';

test('DevTools delivers URL-only Inventory hints without reading asset bodies', async () => {
  const source = fs
    .readFileSync('src/js/devtools.mjs', 'utf8')
    .replace(/^import[\s\S]*?;\n/gm, '');
  let shown, ready, requestFinished;
  const delivered = [];
  const panelWindow = { postMessage() {} };
  const context = vm.createContext({
    browser: {
      devtools: {
        panels: {
          create: async () => ({
            onShown: {
              addListener(fn) {
                shown = fn;
              },
            },
            onHidden: { addListener() {} },
          }),
        },
        network: {
          onRequestFinished: {
            addListener(fn) {
              requestFinished = fn;
            },
          },
        },
      },
    },
    window: { addEventListener() {}, removeEventListener() {} },
    EXT_NAME: 'Test',
    performance: { now: () => 0 },
    console,
    isInventoryAsset,
    evaluateRequestOrigin: () => ({ accepted: false }),
    createLogger: () => ({ info() {}, debug() {} }),
    isDebugEnabled: () => false,
    createHostMessageHandler: ({ onReady }) => {
      ready = onReady;
      return () => {};
    },
    MESSAGE_TYPES: { HOST_PING: 'ping' },
    postToWindow() {},
    postNetworkEntry: (target, entry) => {
      assert.equal(target, panelWindow);
      delivered.push(entry);
      return true;
    },
    postRequestFinished: () => {
      throw Error('URL-only hint must use raw envelope');
    },
  });
  vm.runInContext(source, context);
  await Promise.resolve();
  const url =
    'https://foeen.innogamescdn.com/assets/shared/gui/shop_inventory/shop_inventory_0-822fc9d8d.json';
  requestFinished({
    request: { url },
    getContent: () => {
      throw Error('Atlas body must not be read');
    },
  });
  assert.equal(delivered.length, 0);
  shown(panelWindow);
  ready(panelWindow);
  assert.equal(delivered.length, 1);
  assert.equal(delivered[0].url, url);
  assert.equal(delivered[0].body, null);
  requestFinished({ request: { url } });
  assert.equal(delivered.length, 2);
});
