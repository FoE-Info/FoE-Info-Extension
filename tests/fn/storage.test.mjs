import assert from 'node:assert/strict';
import test from 'node:test';

function sanitizeKey(key) {
  if (typeof key !== 'string') return null;
  if (key === '__proto__' || key === 'constructor' || key === 'prototype')
    return null;
  return key;
}

function createSecureStorageCache() {
  const cache = Object.create(null);
  return {
    cache,
    update(obj) {
      if (obj && typeof obj === 'object') {
        for (const key of Object.keys(obj)) {
          const clean = sanitizeKey(key);
          if (clean) cache[clean] = obj[key];
        }
      }
    },
    set(key, val) {
      const clean = sanitizeKey(key);
      if (clean) cache[clean] = val;
    },
    get(key) {
      const clean = sanitizeKey(key);
      return clean && cache[clean] !== undefined ? cache[clean] : null;
    },
  };
}

test('storageCache - prototype pollution protection', () => {
  const store = createSecureStorageCache();
  const maliciousPayload = JSON.parse(
    '{"__proto__": {"polluted": true}, "constructor": {"polluted": true}, "prototype": {"polluted": true}, "validKey": "validValue"}',
  );

  store.update(maliciousPayload);

  // Assert global Object prototype is not polluted
  assert.equal({}.polluted, undefined);
  assert.equal(Object.prototype.polluted, undefined);

  // Assert valid keys work
  assert.equal(store.get('validKey'), 'validValue');

  // Assert dangerous keys return null
  assert.equal(store.get('__proto__'), null);
  assert.equal(store.get('constructor'), null);
  assert.equal(store.get('prototype'), null);
});
