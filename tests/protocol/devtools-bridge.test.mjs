import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import bridgePkg from '../../src/js/protocol/devtoolsBridge.js';

// Both ends of the bridge are extension pages, so the module resolves its
// targetOrigin from the extension runtime. Without this stub every send
// fails closed — which is itself the behaviour asserted below.
const EXTENSION_ORIGIN = 'chrome-extension://foeinfotestid';
function stubExtensionRuntime(value) {
  if (value === null) {
    delete globalThis.chrome;
    return;
  }
  globalThis.chrome = { runtime: { getURL: () => value } };
}
stubExtensionRuntime(`${EXTENSION_ORIGIN}/`);
after(() => stubExtensionRuntime(null));

const {
  CHANNEL,
  MESSAGE_TYPES,
  createHostMessageHandler,
  installPanelBridge,
  postNetworkEntry,
  postToWindow,
} = bridgePkg;

test('devtoolsBridge - extension origin', () => {
  after(() => stubExtensionRuntime(`${EXTENSION_ORIGIN}/`));

  test('sends to the extension origin, never to a wildcard', () => {
    const parent = createMockWindow();
    const panel = createMockWindow();
    panel.parent = parent;
    let targetOriginSeen;
    parent.postMessage = (data, targetOrigin) => {
      targetOriginSeen = targetOrigin;
      parent.posted.push(data);
    };

    installPanelBridge(panel, {});

    assert.equal(targetOriginSeen, EXTENSION_ORIGIN);
    assert.notEqual(targetOriginSeen, '*');
  });

  test('fails closed when the extension origin cannot be resolved', () => {
    const panel = createMockWindow();
    panel.parent = createMockWindow();
    stubExtensionRuntime(null);

    assert.equal(postNetworkEntry(panel, { url: 'u' }), false);
    assert.equal(panel.posted.length, 0);
  });
});

test('devtoolsBridge - postToWindow returns false without a window', () => {
  assert.equal(postToWindow(null, MESSAGE_TYPES.HOST_PING), false);
  assert.equal(postToWindow({}, MESSAGE_TYPES.HOST_PING), false);
});

function createMockWindow() {
  const listeners = new Map();
  const posted = [];
  const win = {
    posted,
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    removeEventListener(type, fn) {
      const arr = listeners.get(type) || [];
      const idx = arr.indexOf(fn);
      if (idx >= 0) arr.splice(idx, 1);
    },
    postMessage(data) {
      posted.push(data);
    },
    dispatch(data, source) {
      const event = { data, source };
      (listeners.get('message') || []).forEach((fn) => fn(event));
    },
  };
  return win;
}

test('devtoolsBridge - structured panel channel', async (t) => {
  await t.test('announces readiness to the parent window', () => {
    const parent = createMockWindow();
    const panel = createMockWindow();
    panel.parent = parent;

    installPanelBridge(panel, {});

    assert.equal(parent.posted.length, 1);
    assert.equal(parent.posted[0].source, CHANNEL);
    assert.equal(parent.posted[0].type, MESSAGE_TYPES.READY);
  });

  await t.test('re-announces readiness in response to a host ping', () => {
    const parent = createMockWindow();
    const panel = createMockWindow();
    panel.parent = parent;

    installPanelBridge(panel, {});
    panel.dispatch({ source: CHANNEL, type: MESSAGE_TYPES.HOST_PING }, parent);

    assert.equal(parent.posted.length, 2);
    assert.equal(parent.posted[1].type, MESSAGE_TYPES.READY);
  });

  await t.test('routes raw network entries to the handler', () => {
    const panel = createMockWindow();
    const received = [];
    installPanelBridge(panel, {
      handleRawNetworkEntry: (url, headers, body, encoding, request) => {
        received.push({ url, headers, body, encoding, request });
      },
    });

    panel.dispatch(
      {
        source: CHANNEL,
        type: MESSAGE_TYPES.RAW_NETWORK_ENTRY,
        payload: {
          url: 'https://en7.forgeofempires.com/game/json',
          headers: [{ name: 'x', value: 'y' }],
          body: '{}',
          encoding: 'utf-8',
          request: { url: 'x' },
        },
      },
      null,
    );

    assert.equal(received.length, 1);
    assert.equal(received[0].encoding, 'utf-8');
    assert.equal(received[0].headers[0].name, 'x');
  });

  await t.test(
    'routes request-finished envelopes and ignores foreign sources',
    () => {
      const parent = createMockWindow();
      const panel = createMockWindow();
      panel.parent = parent;
      let finished = 0;
      installPanelBridge(panel, {
        handleRequestFinished: () => {
          finished += 1;
        },
      });

      panel.dispatch(
        { source: 'other', type: MESSAGE_TYPES.REQUEST_FINISHED, payload: {} },
        null,
      );
      // Right channel string, wrong window: must not be routed.
      panel.dispatch(
        {
          source: CHANNEL,
          type: MESSAGE_TYPES.REQUEST_FINISHED,
          payload: { request: {} },
        },
        createMockWindow(),
      );
      panel.dispatch(
        {
          source: CHANNEL,
          type: MESSAGE_TYPES.REQUEST_FINISHED,
          payload: { request: {} },
        },
        parent,
      );

      assert.equal(finished, 1);
    },
  );

  await t.test('removes the listener on teardown', () => {
    const panel = createMockWindow();
    let handled = 0;
    const teardown = installPanelBridge(panel, {
      handleRawNetworkEntry: () => {
        handled += 1;
      },
    });

    teardown();
    panel.dispatch(
      { source: CHANNEL, type: MESSAGE_TYPES.RAW_NETWORK_ENTRY, payload: {} },
      null,
    );

    assert.equal(handled, 0);
  });

  await t.test('host handler fires only for the current panel window', () => {
    const panel = createMockWindow();
    let ready = 0;
    const handler = createHostMessageHandler({
      getPanelWindow: () => panel,
      onReady: () => {
        ready += 1;
      },
    });

    handler({
      data: { source: CHANNEL, type: MESSAGE_TYPES.READY },
      source: {},
    });
    assert.equal(ready, 0);
    handler({
      data: { source: CHANNEL, type: MESSAGE_TYPES.READY },
      source: panel,
    });
    assert.equal(ready, 1);
  });

  await t.test(
    'host handler ignores READY when no panel window is known',
    () => {
      // The panel window is only learned from devtools.panels.onShown. Before
      // that, an unknown window must not be adopted as the traffic sink.
      let readySource = null;
      const handler = createHostMessageHandler({
        getPanelWindow: () => null,
        onReady: (source) => {
          readySource = source;
        },
      });

      const impostor = createMockWindow();
      handler({
        data: { source: CHANNEL, type: MESSAGE_TYPES.READY },
        source: impostor,
      });

      assert.equal(readySource, null);
    },
  );

  await t.test('postNetworkEntry sends a channel envelope', () => {
    const panel = createMockWindow();
    postNetworkEntry(panel, { url: 'u', body: 'b', encoding: 'e' });

    assert.equal(panel.posted.length, 1);
    assert.equal(panel.posted[0].source, CHANNEL);
    assert.equal(panel.posted[0].type, MESSAGE_TYPES.RAW_NETWORK_ENTRY);
    assert.equal(panel.posted[0].payload.url, 'u');
  });
});
