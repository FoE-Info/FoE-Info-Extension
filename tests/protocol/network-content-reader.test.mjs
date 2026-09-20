import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getType,
  isFoeNetworkUrl,
  safeProcessContent,
} from '../../src/js/protocol/networkContentReader.js';

test('networkContentReader - Utilities and safe extraction', async (t) => {
  await t.test('getType parses standard MIME types correctly', () => {
    assert.equal(getType('application/json; charset=utf-8'), 'json');
    assert.equal(getType('text/javascript'), 'javascript');
    assert.equal(getType('text/html; charset=utf-8'), 'html');
    assert.equal(getType('image/png'), 'image');
    assert.equal(getType('text/css'), 'css');
    assert.equal(getType('font/woff2'), 'font');
    assert.equal(getType(null), '');
    assert.equal(getType(123), '');
  });

  await t.test('isFoeNetworkUrl matches relevant endpoints', () => {
    assert.equal(
      isFoeNetworkUrl('https://en1.forgeofempires.com/game/json'),
      true,
    );
    assert.equal(
      isFoeNetworkUrl('https://en1.forgeofempires.com/game/metadata?id=123'),
      true,
    );
    assert.equal(
      isFoeNetworkUrl('https://en1.forgeofempires.com/metadata'),
      true,
    );
    assert.equal(
      isFoeNetworkUrl('https://en1.forgeofempires.com/start/metadata'),
      true,
    );
    assert.equal(
      isFoeNetworkUrl('https://en1.forgeofempires.com/game/assets/icon.png'),
      false,
    );
    assert.equal(isFoeNetworkUrl(null), false);
  });

  await t.test(
    'safeProcessContent extracts async promise content',
    async () => {
      let extractedContent = null;
      let extractedEncoding = null;

      const mockRequest = {
        getContent: async () => ['{"response":"ok"}', 'utf-8'],
      };

      safeProcessContent(mockRequest, (content, encoding) => {
        extractedContent = content;
        extractedEncoding = encoding;
      });

      await new Promise((resolve) => setTimeout(resolve, 10));
      assert.equal(extractedContent, '{"response":"ok"}');
      assert.equal(extractedEncoding, 'utf-8');
    },
  );

  await t.test(
    'safeProcessContent extracts callback-based content',
    async () => {
      let extractedContent = null;

      const mockRequest = {
        getContent: (cb) => {
          cb('cb-body', 'base64');
        },
      };

      safeProcessContent(mockRequest, (content) => {
        extractedContent = content;
      });

      assert.equal(extractedContent, 'cb-body');
    },
  );

  await t.test(
    'safeProcessContent handles empty or malformed requests gracefully',
    () => {
      assert.doesNotThrow(() => safeProcessContent(null, () => {}));
      assert.doesNotThrow(() => safeProcessContent({}, () => {}));
    },
  );
});
