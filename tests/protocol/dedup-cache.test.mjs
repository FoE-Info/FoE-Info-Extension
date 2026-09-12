import assert from 'node:assert/strict';
import test from 'node:test';
import dedupPkg from '../../src/js/protocol/dedupCache.js';
import dispatcherPkg from '../../src/js/protocol/MessageDispatcher.js';

const { DedupCache } = dedupPkg;
const { MessageDispatcher } = dispatcherPkg;

const URL = 'https://en7.forgeofempires.com/game/json';
const BODY = JSON.stringify([{ requestClass: 'ResourceService' }]);

test('DedupCache - time-windowed deduplication and bounded eviction', async (t) => {
  await t.test('detects duplicate payload inside the window', () => {
    const cache = new DedupCache({ windowMs: 1000 });
    assert.equal(cache.isDuplicate(URL, BODY, null, 1000), false);
    assert.equal(cache.isDuplicate(URL, BODY, null, 1500), true);
    assert.equal(cache.isDuplicate(URL, BODY, null, 1999), true);
  });

  await t.test('does not detect duplicate after window expiry', () => {
    const cache = new DedupCache({ windowMs: 1000 });
    assert.equal(cache.isDuplicate(URL, BODY, null, 1000), false);
    assert.equal(cache.isDuplicate(URL, BODY, null, 2000), false);
    assert.equal(cache.isDuplicate(URL, BODY, null, 2500), true);
  });

  await t.test('treats numeric third argument as injected now', () => {
    const cache = new DedupCache({ windowMs: 1000 });
    assert.equal(cache.isDuplicate(URL, BODY, 500), false);
    assert.equal(cache.isDuplicate(URL, BODY, 900), true);
    assert.equal(cache.isDuplicate(URL, BODY, 1600), false);
  });

  await t.test('keeps distinct request payloads non-duplicate', () => {
    const cache = new DedupCache({ windowMs: 1000 });
    assert.equal(cache.isDuplicate(URL, BODY, { requestData: [1] }, 0), false);
    assert.equal(cache.isDuplicate(URL, BODY, { requestData: [2] }, 1), false);
    assert.equal(cache.isDuplicate(URL, BODY, { requestData: [1] }, 2), true);
  });

  await t.test('clears and resets cached entries', () => {
    const cache = new DedupCache({ windowMs: 1000 });
    assert.equal(cache.isDuplicate(URL, BODY, null, 100), false);
    assert.equal(cache.isDuplicate(URL, BODY, null, 200), true);
    cache.clear();
    assert.equal(cache.isDuplicate(URL, BODY, null, 300), false);
  });

  await t.test('evicts oldest entry when exceeding max size', () => {
    const cache = new DedupCache({ windowMs: 10000, maxSize: 3 });
    assert.equal(cache.isDuplicate(URL, 'a', null, 0), false);
    assert.equal(cache.isDuplicate(URL, 'b', null, 1), false);
    assert.equal(cache.isDuplicate(URL, 'c', null, 2), false);
    assert.equal(cache.isDuplicate(URL, 'd', null, 3), false);
    assert.equal(cache.isDuplicate(URL, 'b', null, 4), true);
    assert.equal(cache.isDuplicate(URL, 'a', null, 5), false);
  });

  await t.test('MessageDispatcher delegates to the extracted cache', () => {
    const dispatcher = new MessageDispatcher({
      dedupWindowMs: 1000,
      maxCacheSize: 2,
    });
    assert.equal(dispatcher.isDuplicate(URL, BODY, null, 0), false);
    assert.equal(dispatcher.isDuplicate(URL, BODY, null, 500), true);
    assert.equal(dispatcher.isDuplicate(URL, '{"b":2}', null, 0), false);
    assert.equal(dispatcher.isDuplicate(URL, '{"c":3}', null, 1), false);
    assert.equal(dispatcher.isDuplicate(URL, BODY, null, 2), false);
    dispatcher.clearDedupCache();
    assert.equal(dispatcher.isDuplicate(URL, '{"c":3}', null, 3), false);
  });
});
