import assert from 'node:assert/strict';
import test from 'node:test';
import { processContentDirect } from '../../src/js/protocol/networkPacketDispatcher.js';

test('networkPacketDispatcher - Direct payload dispatch', async (t) => {
  await t.test('dispatches raw packet and logs rpc items', async () => {
    let dispatchedArgs = null;
    const loggedMessages = [];

    const mockDispatcher = {
      dispatchRaw: async (url, body, enc, hdrs, req) => {
        dispatchedArgs = { url, body, enc, hdrs, req };
        return {
          batchResult: {
            results: [
              {
                message: { requestClass: 'CityMapService' },
                result: { unhandled: false },
                success: true,
              },
              {
                message: { requestClass: 'UnknownService' },
                result: { unhandled: true },
                success: false,
              },
            ],
          },
        };
      },
    };

    const mockLogRpc = (msg, handled) => {
      loggedMessages.push({ msg, handled });
    };

    const res = await processContentDirect(
      'https://us1.forgeofempires.com/game/json',
      '[{}]',
      'utf-8',
      [{ name: 'foo', value: 'bar' }],
      { requestId: 1 },
      {
        messageDispatcher: mockDispatcher,
        logRpcMessage: mockLogRpc,
      },
    );

    assert.ok(res);
    assert.equal(
      dispatchedArgs.url,
      'https://us1.forgeofempires.com/game/json',
    );
    assert.equal(loggedMessages.length, 2);
    assert.equal(loggedMessages[0].handled, true);
    assert.equal(loggedMessages[1].handled, false);
  });

  await t.test('returns early on null or empty body', async () => {
    let called = false;
    await processContentDirect('https://url', '', '', [], null, {
      messageDispatcher: {
        dispatchRaw: async () => {
          called = true;
        },
      },
    });
    assert.equal(called, false);
  });
});
