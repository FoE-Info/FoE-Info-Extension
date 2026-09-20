import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearDuplicatePayloadCache,
  isDuplicatePayload,
  processedPayloadCache,
} from '../../src/js/protocol/networkPayloadDeduplicator.js';

test('networkPayloadDeduplicator - Core operations', async (t) => {
  clearDuplicatePayloadCache();

  await t.test('detects duplicate payloads within TTL window', () => {
    const url = 'https://us1.forgeofempires.com/game/json';
    const body = '{"requestMethod":"getData"}';

    assert.equal(isDuplicatePayload(url, body), false);
    assert.equal(isDuplicatePayload(url, body), true);
  });

  await t.test('treats different URLs or bodies as unique', () => {
    const url1 = 'https://us1.forgeofempires.com/game/json';
    const url2 = 'https://us2.forgeofempires.com/game/json';
    const body1 = '{"requestMethod":"getData"}';
    const body2 = '{"requestMethod":"setData"}';

    assert.equal(isDuplicatePayload(url2, body1), false);
    assert.equal(isDuplicatePayload(url1, body2), false);
  });

  await t.test('handles empty or non-string inputs safely', () => {
    assert.equal(isDuplicatePayload('', 'test'), false);
    assert.equal(isDuplicatePayload('https://foo', null), false);
    assert.equal(isDuplicatePayload(null, null), false);
    assert.equal(isDuplicatePayload('https://foo', 12345), false);
  });

  await t.test('clears cache successfully', () => {
    const url = 'https://us10.forgeofempires.com/game/json';
    const body = '{"test":true}';

    assert.equal(isDuplicatePayload(url, body), false);
    assert.equal(isDuplicatePayload(url, body), true);

    clearDuplicatePayloadCache();
    assert.equal(processedPayloadCache.size, 0);
    assert.equal(isDuplicatePayload(url, body), false);
  });

  await t.test('evicts oldest entries when cache exceeds capacity', () => {
    clearDuplicatePayloadCache();
    for (let i = 0; i < 305; i++) {
      isDuplicatePayload(
        `https://us${i}.forgeofempires.com/game/json`,
        `{"id":${i}}`,
      );
    }
    assert.ok(processedPayloadCache.size <= 300);
  });
});
