import assert from 'node:assert/strict';
import test from 'node:test';
import pkg from '../../src/js/ui/networkBridge.js';

const { bindNetworkBridge } = pkg;

// Helper to create a mock browser object with devtools eval and network onNavigated
function mockBrowser(opts = {}) {
  const devtools = {
    inspectedWindow: {
      eval(script, callback) {
        if (opts.hostname) {
          callback(opts.hostname);
        } else {
          callback(null);
        }
      },
    },
    network: {
      onNavigated: {
        addListener(listener) {
          this._listener = listener;
        },
        get listener() {
          return this._listener;
        },
      },
    },
  };
  const browserObj = {
    devtools,
    ...opts.browser,
  };
  return browserObj;
}

// Test 1: hostname eval detects world and calls setWorld, setGameOrigin, registerKnownWorld
// ---------------------------------------------------------------------------
test('bindNetworkBridge detects world from hostname', async () => {
  const setInspectedWorldIdCalls = [];
  const setGameOriginCalls = [];
  const storageSetWorldCalls = [];
  const storageRegisterKnownWorldCalls = [];
  const setOptionsCalls = [];
  const networkListenerCalls = [];

  const setInspectedWorldId = (world) => setInspectedWorldIdCalls.push(world);
  const setGameOrigin = (url) => setGameOriginCalls.push(url);
  const setOptions = (key, value) => setOptionsCalls.push({ key, value });
  const storage = {
    setWorld(world) {
      storageSetWorldCalls.push(world);
    },
    registerKnownWorld(world) {
      storageRegisterKnownWorldCalls.push(world);
    },
    getWorldSettings() {
      return Promise.resolve({ showOptions: true });
    },
    isPlayableWorld() {
      return true;
    },
  };
  const networkListenersMock = (deps) => {
    networkListenerCalls.push(deps);
  };

  const browserObj = mockBrowser({ hostname: 'en1.forgeofempires.com' });

  const config = {
    browser: browserObj,
    storage,
    state: {},
    setOptions,
    setGameOrigin,
    getInspectedWorldId: () => null,
    setInspectedWorldId,
    getGameVersion: () => 0,
    setGameVersion: () => {},
    onGameVersionChange: () => {},
    logRpcMessage: false,
    networkListeners: networkListenersMock,
  };

  bindNetworkBridge(config);
  await Promise.resolve();

  assert.strictEqual(setInspectedWorldIdCalls[0], 'en1');
  assert.strictEqual(storageSetWorldCalls[0], 'en1');
  assert.strictEqual(setGameOriginCalls[0], 'https://en1.forgeofempires.com');
  assert.strictEqual(storageRegisterKnownWorldCalls[0], 'en1');
  assert.strictEqual(setOptionsCalls.length, 1);
  assert.strictEqual(setOptionsCalls[0].key, 'showOptions');
  assert.strictEqual(setOptionsCalls[0].value, true);
});

// Test 2: non‑matching hostname is ignored
// --------------------------------------------
test('bindNetworkBridge ignores non‑matching hostname', async () => {
  const setInspectedWorldIdCalls = [];
  const setGameOriginCalls = [];
  const storageSetWorldCalls = [];
  const storageRegisterKnownWorldCalls = [];
  const networkListenerCalls = [];

  const setInspectedWorldId = (world) => setInspectedWorldIdCalls.push(world);
  const setGameOrigin = (url) => setGameOriginCalls.push(url);
  const storage = {
    setWorld(world) {
      storageSetWorldCalls.push(world);
    },
    registerKnownWorld(world) {
      storageRegisterKnownWorldCalls.push(world);
    },
    getWorldSettings() {
      return Promise.resolve({});
    },
    isPlayableWorld() {
      return false;
    },
  };
  const networkListenersMock = (deps) => {
    networkListenerCalls.push(deps);
  };

  const browserObj = mockBrowser({ hostname: 'example.com' });

  const config = {
    browser: browserObj,
    storage,
    state: {},
    setOptions: () => {},
    setGameOrigin,
    getInspectedWorldId: () => null,
    setInspectedWorldId,
    getGameVersion: () => 0,
    setGameVersion: () => {},
    onGameVersionChange: () => {},
    logRpcMessage: false,
    networkListeners: networkListenersMock,
  };

  bindNetworkBridge(config);
  await Promise.resolve();

  assert.strictEqual(setInspectedWorldIdCalls.length, 0);
  assert.strictEqual(storageSetWorldCalls.length, 0);
  assert.strictEqual(setGameOriginCalls.length, 0);
  assert.strictEqual(storageRegisterKnownWorldCalls.length, 0);
});

// Test 3: onNavigated for playable‑world URL updates world
// ---------------------------------------------------------
test('bindNetworkBridge processes onNavigated for playable world', async () => {
  const setInspectedWorldIdCalls = [];
  const setGameOriginCalls = [];
  const storageSetWorldCalls = [];
  const storageRegisterKnownWorldCalls = [];
  const networkListenerCalls = [];

  const setInspectedWorldId = (world) => setInspectedWorldIdCalls.push(world);
  const setGameOrigin = (url) => setGameOriginCalls.push(url);
  const storage = {
    setWorld(world) {
      storageSetWorldCalls.push(world);
    },
    registerKnownWorld(world) {
      storageRegisterKnownWorldCalls.push(world);
    },
    getWorldSettings() {
      return Promise.resolve({});
    },
    isPlayableWorld(world) {
      return world === 'en1';
    },
  };
  const networkListenersMock = (deps) => {
    networkListenerCalls.push(deps);
  };

  const browserObj = mockBrowser();
  const config = {
    browser: browserObj,
    storage,
    state: {},
    setOptions: () => {},
    setGameOrigin,
    getInspectedWorldId: () => null,
    setInspectedWorldId,
    getGameVersion: () => 0,
    setGameVersion: () => {},
    onGameVersionChange: () => {},
    logRpcMessage: false,
    networkListeners: networkListenersMock,
  };

  bindNetworkBridge(config);
  const listener = browserObj.devtools.network.onNavigated.listener;
  listener('https://en1.forgeofempires.com/game');

  assert.strictEqual(setInspectedWorldIdCalls[0], 'en1');
  assert.strictEqual(storageSetWorldCalls[0], 'en1');
  assert.strictEqual(setGameOriginCalls[0], 'https://en1.forgeofempires.com');
  assert.strictEqual(storageRegisterKnownWorldCalls[0], 'en1');
});

// Test 4: non‑playable URL ignored in onNavigated
// -------------------------------------------------
test('bindNetworkBridge ignores non‑playable URL onNavigated', async () => {
  const setInspectedWorldIdCalls = [];
  const setGameOriginCalls = [];
  const storageSetWorldCalls = [];
  const storageRegisterKnownWorldCalls = [];

  const setInspectedWorldId = (world) => setInspectedWorldIdCalls.push(world);
  const setGameOrigin = (url) => setGameOriginCalls.push(url);
  const storage = {
    setWorld(world) {
      storageSetWorldCalls.push(world);
    },
    registerKnownWorld(world) {
      storageRegisterKnownWorldCalls.push(world);
    },
    getWorldSettings() {
      return Promise.resolve({});
    },
    isPlayableWorld() {
      return false;
    },
  };

  const browserObj = mockBrowser();
  const config = {
    browser: browserObj,
    storage,
    state: {},
    setOptions: () => {},
    setGameOrigin,
    getInspectedWorldId: () => null,
    setInspectedWorldId,
    getGameVersion: () => 0,
    setGameVersion: () => {},
    onGameVersionChange: () => {},
    logRpcMessage: false,
    networkListeners: () => {}, // dummy
  };

  bindNetworkBridge(config);
  const listener = browserObj.devtools.network.onNavigated.listener;
  listener('https://en0.forgeofempires.com/game');

  assert.strictEqual(setInspectedWorldIdCalls.length, 0);
  assert.strictEqual(storageSetWorldCalls.length, 0);
  assert.strictEqual(setGameOriginCalls.length, 0);
  assert.strictEqual(storageRegisterKnownWorldCalls.length, 0);
});

// Test 5: missing browserObj still calls injected networkListeners safely
// ------------------------------------------------------------------------
test('bindNetworkBridge calls injected networkListeners when browserObj missing', async () => {
  const injectedCalls = [];
  const networkListenersMock = (deps) => injectedCalls.push(deps);

  const config = {
    // No browser property
    storage: {},
    state: {},
    setOptions: () => {},
    setGameOrigin: () => {},
    getInspectedWorldId: () => null,
    setInspectedWorldId: () => {},
    getGameVersion: () => 0,
    setGameVersion: () => {},
    onGameVersionChange: () => {},
    logRpcMessage: false,
    networkListeners: networkListenersMock,
  };

  bindNetworkBridge(config);
  await Promise.resolve();

  assert.strictEqual(injectedCalls.length, 1);
});
