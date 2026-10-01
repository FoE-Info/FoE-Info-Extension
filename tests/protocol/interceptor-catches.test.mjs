import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

/**
 * §4: Interceptor catch triage.
 *
 * xhrInterceptor.js (MAIN world) and contentBridge.js (ISOLATED world) each
 * have multiple catch blocks. Operational failures that silently drop captured
 * traffic must log at debug level so developers can diagnose interception gaps.
 * Best-effort serialization fallbacks (returning null) and non-configurable
 * property copy failures remain silent.
 */

// ── xhrInterceptor.js ──────────────────────────────────────────────────

const interceptorSource = readFileSync(
  'src/js/protocol/xhrInterceptor.js',
  'utf8',
);

function buildSandbox() {
  const postedMessages = [];
  const consoleCalls = [];
  const messageListeners = [];

  function FakeXHR() {
    this._foeUrl = '';
    this._foeBody = null;
    this._loadListeners = [];
  }
  FakeXHR.prototype = {
    open() {},
    send() {},
    addEventListener(type, fn) {
      if (type === 'load') this._loadListeners.push(fn);
    },
    get responseURL() {
      return this._foeUrl || '';
    },
    get responseText() {
      return '{"response":true}';
    },
  };

  function FakeWebSocket(url) {
    this.url = url;
    this.readyState = 1;
    this._wsListeners = {};
  }
  FakeWebSocket.prototype = {
    send() {},
    addEventListener(type, fn) {
      if (!this._wsListeners[type]) this._wsListeners[type] = [];
      this._wsListeners[type].push(fn);
    },
  };
  FakeWebSocket.CONNECTING = 0;
  FakeWebSocket.OPEN = 1;
  FakeWebSocket.CLOSING = 2;
  FakeWebSocket.CLOSED = 3;

  const fakeWindow = {
    __foe_info_xhr_patched: false,
    location: {
      origin: 'https://forgeofempires.com',
      href: 'https://forgeofempires.com/',
    },
    addEventListener(_type, fn) {
      messageListeners.push(fn);
    },
    postMessage(msg) {
      postedMessages.push(msg);
    },
    WebSocket: FakeWebSocket,
  };

  const ctx = {
    window: fakeWindow,
    console: {
      debug(...args) {
        consoleCalls.push(args);
      },
      warn() {},
      error() {},
    },
    XMLHttpRequest: FakeXHR,
    WebSocket: FakeWebSocket,
    URL: globalThis.URL,
    TextDecoder: globalThis.TextDecoder,
    performance: { now: () => 0 },
    setTimeout: globalThis.setTimeout,
  };

  return { ctx, fakeWindow, postedMessages, consoleCalls, messageListeners };
}

test('xhrInterceptor - operational catches log at debug level', async (t) => {
  await t.test('XHR load dispatch failure is logged in debug mode', () => {
    const { ctx, fakeWindow, consoleCalls, messageListeners } = buildSandbox();

    vm.runInNewContext(interceptorSource, ctx, { timeout: 5000 });

    // Enable debug mode via the message listener
    const debugSyncListener = messageListeners.find(
      (fn) => typeof fn === 'function',
    );
    assert.ok(debugSyncListener, 'message listener registered');
    debugSyncListener({
      source: fakeWindow,
      origin: fakeWindow.location.origin,
      data: { type: 'FOE_INFO_DEBUG_SYNC', enabled: true },
    });

    // Create an XHR and trigger send
    const xhr = new ctx.XMLHttpRequest();
    xhr.open('POST', 'https://forgeofempires.com/game/json');
    xhr.send('{"request":1}');

    // Make postMessage throw to trigger the XHR load catch
    let callCount = 0;
    fakeWindow.postMessage = function () {
      callCount++;
      // First call might be debug sync; second is the game data
      if (callCount >= 1) throw new Error('postMessage simulated failure');
    };

    // Fire the load event handler with xhr as `this` (matching real addEventListener)
    assert.ok(xhr._loadListeners.length > 0, 'load handler attached');
    xhr._loadListeners[0].call(xhr);

    const debugLogs = consoleCalls.filter(
      (args) =>
        typeof args[0] === 'string' &&
        args[0].includes('XHR load dispatch failed'),
    );
    assert.ok(debugLogs.length > 0, 'XHR load failure logged at debug level');
  });

  await t.test('XHR load dispatch failure is silent when debug is off', () => {
    const { ctx, fakeWindow, consoleCalls } = buildSandbox();

    vm.runInNewContext(interceptorSource, ctx, { timeout: 5000 });

    const xhr = new ctx.XMLHttpRequest();
    xhr.open('POST', 'https://forgeofempires.com/game/json');
    xhr.send('{"request":1}');

    let callCount = 0;
    fakeWindow.postMessage = function () {
      callCount++;
      if (callCount >= 1) throw new Error('postMessage simulated failure');
    };

    xhr._loadListeners[0].call(xhr);

    const debugLogs = consoleCalls.filter(
      (args) =>
        typeof args[0] === 'string' &&
        args[0].includes('XHR load dispatch failed'),
    );
    assert.equal(debugLogs.length, 0, 'no debug log when debug is off');
  });

  await t.test(
    'fetch interception failure is logged in debug mode',
    async () => {
      const { ctx, fakeWindow, consoleCalls, messageListeners } =
        buildSandbox();

      // Must set fetch BEFORE vm.runInNewContext so the IIFE installs the wrapper
      fakeWindow.fetch = async function (..._args) {
        return {
          clone() {
            return {
              text() {
                return Promise.resolve('{"data":true}');
              },
            };
          },
        };
      };

      vm.runInNewContext(interceptorSource, ctx, { timeout: 5000 });

      // Enable debug mode
      const debugSyncListener = messageListeners.find(
        (fn) => typeof fn === 'function',
      );
      debugSyncListener({
        source: fakeWindow,
        origin: fakeWindow.location.origin,
        data: { type: 'FOE_INFO_DEBUG_SYNC', enabled: true },
      });

      // Capture the wrapped fetch (installed by the interceptor IIFE)
      const wrappedFetch = fakeWindow.fetch;

      // Pass a Request-like object whose .url getter throws — this hits the
      // synchronous try/catch in the fetch wrapper
      const throwingRequest = {
        get url() {
          throw new Error('url access failure');
        },
      };

      try {
        await wrappedFetch(throwingRequest);
      } catch {
        // Should not throw — the wrapper swallows
      }

      const debugLogs = consoleCalls.filter(
        (args) =>
          typeof args[0] === 'string' &&
          args[0].includes('Fetch interception failed'),
      );
      assert.ok(debugLogs.length > 0, 'fetch interception failure logged');
    },
  );
});

test('xhrInterceptor - silent catches remain silent', async (t) => {
  await t.test('serializeBody failure returns null without logging', () => {
    const { ctx, consoleCalls } = buildSandbox();

    vm.runInNewContext(interceptorSource, ctx, { timeout: 5000 });

    const xhr = new ctx.XMLHttpRequest();
    xhr.open('POST', 'https://forgeofempires.com/game/json');
    // Circular object causes JSON.stringify to throw in serializeBody
    const circular = {};
    circular.self = circular;
    xhr.send(circular);

    const serializeLogs = consoleCalls.filter(
      (args) => typeof args[0] === 'string' && args[0].includes('serialize'),
    );
    assert.equal(serializeLogs.length, 0, 'serializeBody failure is silent');
  });

  await t.test('WebSocket property copy failure is silent', () => {
    const { ctx, consoleCalls } = buildSandbox();

    vm.runInNewContext(interceptorSource, ctx, { timeout: 5000 });

    // After patching, window.WebSocket should be the patched version
    assert.ok(ctx.window.WebSocket, 'WebSocket was patched');
    assert.equal(typeof ctx.window.WebSocket, 'function');

    const propLogs = consoleCalls.filter(
      (args) => typeof args[0] === 'string' && args[0].includes('property'),
    );
    assert.equal(propLogs.length, 0, 'property copy failures are silent');
  });
});

test('xhrInterceptor - WebSocket listener memory safety', async (t) => {
  await t.test('WeakSet prevents duplicate listener attachment', () => {
    const { ctx } = buildSandbox();

    vm.runInNewContext(interceptorSource, ctx, { timeout: 5000 });

    // Use the patched WebSocket from window
    const PatchedWS = ctx.window.WebSocket;
    const ws1 = new PatchedWS('wss://forgeofempires.com/game/json');

    // PatchedWebSocket constructor calls attachWsListener during construction
    // So the listener should already be attached
    assert.ok(
      ws1._wsListeners?.message,
      'listener attached during construction',
    );

    const firstCount = ws1._wsListeners.message.length;

    // Calling send should not add a duplicate (WeakSet guard)
    ws1.send('ping');
    assert.equal(
      ws1._wsListeners.message.length,
      firstCount,
      'no duplicate listener on second send',
    );
  });

  await t.test('different sockets get independent listeners', () => {
    const { ctx } = buildSandbox();

    vm.runInNewContext(interceptorSource, ctx, { timeout: 5000 });

    const PatchedWS = ctx.window.WebSocket;
    const ws1 = new PatchedWS('wss://forgeofempires.com/game/json');
    const ws2 = new PatchedWS('wss://forgeofempires.com/game/json');

    assert.ok(ws1._wsListeners?.message, 'ws1 has listener');
    assert.ok(ws2._wsListeners?.message, 'ws2 has listener');
    assert.notEqual(
      ws1._wsListeners.message,
      ws2._wsListeners.message,
      'listeners are on separate objects',
    );
  });

  await t.test('untrusted WebSocket does not get a listener', () => {
    const { ctx } = buildSandbox();

    vm.runInNewContext(interceptorSource, ctx, { timeout: 5000 });

    const PatchedWS = ctx.window.WebSocket;
    const ws = new PatchedWS('wss://evil.example.com/game/json');

    assert.equal(
      ws._wsListeners?.message,
      undefined,
      'no listener on untrusted socket',
    );
  });
});

test('xhrInterceptor - WebSocket dispatch correlation', async (t) => {
  await t.test('WS frames are dispatched with the real socket URL', () => {
    const { ctx, fakeWindow, postedMessages, messageListeners } =
      buildSandbox();

    vm.runInNewContext(interceptorSource, ctx, { timeout: 5000 });

    const debugSyncListener = messageListeners.find(
      (fn) => typeof fn === 'function',
    );
    debugSyncListener({
      source: fakeWindow,
      origin: fakeWindow.location.origin,
      data: { type: 'FOE_INFO_DEBUG_SYNC', enabled: true },
    });

    const PatchedWS = ctx.window.WebSocket;
    const ws = new PatchedWS('wss://forgeofempires.com/game/json');

    // Simulate incoming WS message via the registered handler
    const msgHandler = ws._wsListeners?.message?.[0];
    assert.ok(msgHandler, 'message handler attached');
    msgHandler({ data: '[{"type":"SomeMessage"}]' });

    const gameMsg = postedMessages.find(
      (m) => m.type === 'FOE_INFO_XHR' && m.url && m.url.includes('wss://'),
    );
    assert.ok(gameMsg, 'WS frame dispatched as FOE_INFO_XHR');
    assert.equal(
      gameMsg.url,
      'wss://forgeofempires.com/game/json',
      'dispatched with real socket URL, not page origin',
    );
    assert.equal(gameMsg.postData, null, 'WS frames have no postData');
  });

  await t.test('WS PONG frames are silently ignored', () => {
    const { ctx, fakeWindow, postedMessages, messageListeners } =
      buildSandbox();

    vm.runInNewContext(interceptorSource, ctx, { timeout: 5000 });

    const debugSyncListener = messageListeners.find(
      (fn) => typeof fn === 'function',
    );
    debugSyncListener({
      source: fakeWindow,
      origin: fakeWindow.location.origin,
      data: { type: 'FOE_INFO_DEBUG_SYNC', enabled: true },
    });

    const PatchedWS = ctx.window.WebSocket;
    const ws = new PatchedWS('wss://forgeofempires.com/game/json');

    const msgHandler = ws._wsListeners?.message?.[0];
    msgHandler({ data: 'PONG' });

    const gameMsg = postedMessages.find(
      (m) => m.type === 'FOE_INFO_XHR' && m.url && m.url.includes('wss://'),
    );
    assert.equal(gameMsg, undefined, 'PONG not dispatched');
  });

  await t.test('non-JSON WS frames are silently ignored', () => {
    const { ctx, fakeWindow, postedMessages, messageListeners } =
      buildSandbox();

    vm.runInNewContext(interceptorSource, ctx, { timeout: 5000 });

    const debugSyncListener = messageListeners.find(
      (fn) => typeof fn === 'function',
    );
    debugSyncListener({
      source: fakeWindow,
      origin: fakeWindow.location.origin,
      data: { type: 'FOE_INFO_DEBUG_SYNC', enabled: true },
    });

    const PatchedWS = ctx.window.WebSocket;
    const ws = new PatchedWS('wss://forgeofempires.com/game/json');

    const msgHandler = ws._wsListeners?.message?.[0];
    msgHandler({ data: 'plain text not json' });

    const gameMsg = postedMessages.find(
      (m) => m.type === 'FOE_INFO_XHR' && m.url && m.url.includes('wss://'),
    );
    assert.equal(gameMsg, undefined, 'non-JSON WS frame not dispatched');
  });
});

// ── contentBridge.js ───────────────────────────────────────────────────
// contentBridge uses ES module imports; strip them for vm.runInNewContext,
// matching the pattern from content-bridge-logging.test.mjs.

const bridgeSource = readFileSync(
  'src/js/protocol/contentBridge.mjs',
  'utf8',
).replace(/^import .*;\n/gm, '');

test('contentBridge - sendMessage failures log in debug mode', async (t) => {
  await t.test('rejected runtime.sendMessage is logged', async () => {
    const logs = [];
    const window = {
      location: { origin: 'https://forgeofempires.com' },
      postMessage() {},
      addEventListener(type, fn) {
        window._listeners = window._listeners || {};
        window._listeners[type] = window._listeners[type] || [];
        window._listeners[type].push(fn);
      },
      _listeners: {},
    };

    const logger = {
      info() {},
      debug(...args) {
        logs.push(args.join(' '));
      },
    };

    const fakeBrowser = {
      storage: {
        local: {
          get: async () => ({ debugEnabled: true }),
        },
        onChanged: { addListener() {} },
      },
      runtime: {
        sendMessage: async () => {
          throw new Error('context invalidated');
        },
      },
    };

    vm.runInNewContext(
      bridgeSource,
      {
        browser: fakeBrowser,
        window,
        console: { info() {}, debug() {}, warn() {}, error() {} },
        performance: { now: () => 12 },
        createLogger: () => logger,
        setDebugEnabled: () => {},
      },
      { timeout: 5000 },
    );

    // Wait for async storage read + debug enable
    await new Promise((r) => setTimeout(r, 50));

    // Find and invoke the message handler
    const handlers = window._listeners?.message || [];
    assert.ok(handlers.length > 0, 'message handler registered');

    handlers[0]({
      source: window,
      origin: 'https://forgeofempires.com',
      data: {
        type: 'FOE_INFO_XHR',
        url: 'https://forgeofempires.com/game/json',
        body: '{"test":1}',
      },
    });

    // Wait for async sendMessage rejection
    await new Promise((r) => setTimeout(r, 50));

    const fwdLogs = logs.filter((l) => l.includes('Runtime message failed'));
    assert.ok(
      fwdLogs.length > 0,
      'sendMessage rejection logged at debug level',
    );
  });

  await t.test(
    'sendMessage rejection is silent when debug is off',
    async () => {
      const logs = [];
      const window = {
        location: { origin: 'https://forgeofempires.com' },
        postMessage() {},
        addEventListener(type, fn) {
          window._listeners = window._listeners || {};
          window._listeners[type] = window._listeners[type] || [];
          window._listeners[type].push(fn);
        },
        _listeners: {},
      };

      const logger = {
        info() {},
        debug(...args) {
          logs.push(args.join(' '));
        },
      };

      const fakeBrowser = {
        storage: {
          local: {
            get: async () => ({ debugEnabled: false }),
          },
          onChanged: { addListener() {} },
        },
        runtime: {
          sendMessage: async () => {
            throw new Error('context invalidated');
          },
        },
      };

      vm.runInNewContext(
        bridgeSource,
        {
          browser: fakeBrowser,
          window,
          console: { info() {}, debug() {}, warn() {}, error() {} },
          performance: { now: () => 12 },
          createLogger: () => logger,
          setDebugEnabled: () => {},
        },
        { timeout: 5000 },
      );

      await new Promise((r) => setTimeout(r, 50));

      const handlers = window._listeners?.message || [];
      if (handlers.length > 0) {
        handlers[0]({
          source: window,
          origin: 'https://forgeofempires.com',
          data: {
            type: 'FOE_INFO_XHR',
            url: 'https://forgeofempires.com/game/json',
            body: '{"test":1}',
          },
        });
      }

      await new Promise((r) => setTimeout(r, 50));

      const fwdLogs = logs.filter((l) => l.includes('Runtime message failed'));
      assert.equal(fwdLogs.length, 0, 'no debug log when debug is off');
    },
  );
});

test('Inventory URL hint traverses MAIN XHR, isolated bridge, and panel intake without reading response data', async () => {
  const { initNetworkListeners, unbind } =
    await import('../../src/js/protocol/networkListener.js');
  const { ctx, fakeWindow, messageListeners } = buildSandbox();
  let runtimeListener;
  let opened = 0;
  const browser = {
    devtools: { inspectedWindow: { tabId: 1 } },
    runtime: {
      onMessage: {
        addListener(fn) {
          runtimeListener = fn;
        },
        removeListener() {},
      },
      async sendMessage(msg) {
        runtimeListener(msg, { tab: { id: 1 } });
      },
    },
  };
  initNetworkListeners({ browser, onInventoryOpened: () => opened++ });
  try {
    fakeWindow.postMessage = (data) => {
      for (const listener of messageListeners)
        listener({
          source: fakeWindow,
          origin: fakeWindow.location.origin,
          data,
        });
    };
    vm.runInNewContext(interceptorSource, ctx);
    const bridgeSource = readFileSync(
      'src/js/protocol/contentBridge.mjs',
      'utf8',
    ).replace(/^import .*;\n/gm, '');
    vm.runInNewContext(bridgeSource, {
      ...ctx,
      browser,
      createLogger: () => ({ info() {}, debug() {} }),
      setDebugEnabled() {},
    });
    const xhr = new ctx.XMLHttpRequest();
    Object.defineProperty(xhr, 'responseText', {
      get() {
        throw Error('Inventory response body must not be read');
      },
    });
    xhr.open(
      'GET',
      'https://foeen.innogamescdn.com/assets/shared/gui/shop_inventory/shop_inventory_0-822fc9d8d.json',
    );
    xhr.send();
    for (const listener of xhr._loadListeners) listener.call(xhr);
    assert.equal(opened, 1);
    xhr.open(
      'GET',
      'https://attacker.test/assets/shared/gui/shop_inventory/shop_inventory_0-822fc9d8d.json',
    );
    for (const listener of xhr._loadListeners) listener.call(xhr);
    assert.equal(opened, 1);
  } finally {
    unbind();
  }
});
