import assert from 'node:assert/strict';
import test from 'node:test';
import { handleRequestFinished } from '../../src/js/protocol/networkDevtoolsHandler.js';

test('networkDevtoolsHandler - DevTools onRequestFinished interception', async (t) => {
  await t.test(
    'intercepts RPC, detects version, and processes content',
    async () => {
      let capturedVersion = null;
      let dispatchedUrl = null;
      let dispatchedBody = null;

      const mockRequest = {
        request: {
          url: 'https://en1.forgeofempires.com/game/json?h=def',
          headers: [
            { name: 'client-identification', value: 'version=1.299.1' },
          ],
        },
        response: {
          headers: [{ name: 'content-type', value: 'application/json' }],
        },
        getContent: async () => ['[{"requestClass":"BonusService"}]', 'utf-8'],
      };

      handleRequestFinished(mockRequest, {
        onGameVersionChange: (v) => {
          capturedVersion = v;
        },
        processContentDirect: async (url, body) => {
          dispatchedUrl = url;
          dispatchedBody = body;
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 20));
      assert.equal(capturedVersion, '1.299');
      assert.equal(
        dispatchedUrl,
        'https://en1.forgeofempires.com/game/json?h=def',
      );
      assert.equal(dispatchedBody, '[{"requestClass":"BonusService"}]');
    },
  );

  await t.test('ignores non-Foe URLs', async () => {
    let called = false;
    const mockRequest = {
      request: {
        url: 'https://google.com/search',
        headers: [],
      },
      response: { headers: [] },
      getContent: async () => ['<html></html>', 'utf-8'],
    };

    handleRequestFinished(mockRequest, {
      processContentDirect: async () => {
        called = true;
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(called, false);
  });
});
