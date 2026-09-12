import assert from 'node:assert/strict';
import test from 'node:test';
import bridgePkg from '../../src/js/protocol/devtoolsBridge.js';

const {
  CHANNEL,
  MESSAGE_TYPES,
  createHostMessageHandler,
  installPanelBridge,
  postNetworkEntry,
} = bridgePkg;

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
      const panel = createMockWindow();
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
      panel.dispatch(
        {
          source: CHANNEL,
          type: MESSAGE_TYPES.REQUEST_FINISHED,
          payload: { request: {} },
        },
        null,
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

  await t.test('postNetworkEntry sends a channel envelope', () => {
    const panel = createMockWindow();
    postNetworkEntry(panel, { url: 'u', body: 'b', encoding: 'e' });

    assert.equal(panel.posted.length, 1);
    assert.equal(panel.posted[0].source, CHANNEL);
    assert.equal(panel.posted[0].type, MESSAGE_TYPES.RAW_NETWORK_ENTRY);
    assert.equal(panel.posted[0].payload.url, 'u');
  });
});
