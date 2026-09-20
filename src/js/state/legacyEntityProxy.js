/**
 * legacyEntityProxy.js
 *
 * Backward-compatibility Proxy facade for legacy code accessing cityEntityDefs
 * like a standard JavaScript dictionary.
 */

let logger = null;
try {
  const logging = require('../utils/logger.js');
  logger = logging.createLogger('legacyEntityProxy');
} catch {}

function createLegacyCityEntityProxy(store) {
  logger?.debug('Creating legacy cityEntityDefs proxy');
  return new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (typeof prop !== 'string') return undefined;
        return store.peekEntity(prop) || undefined;
      },
      has: (_target, prop) => {
        if (typeof prop !== 'string') return false;
        return store.peekEntity(prop) !== null;
      },
      set: (_target, prop, value) => {
        if (typeof prop === 'string' && value && typeof value === 'object') {
          const canonicalId = value.id || prop;
          if (prop === canonicalId) {
            store.registerEntity(value);
          } else {
            if (!store.entities.has(canonicalId)) {
              store.registerEntity({ ...value, id: canonicalId });
            }
            store.entities.set(prop, value);
          }
          return true;
        }
        return false;
      },
      ownKeys: () => {
        return Array.from(store.entities.keys());
      },
      getOwnPropertyDescriptor: (_target, prop) => {
        if (typeof prop === 'string' && store.peekEntity(prop)) {
          return {
            configurable: true,
            enumerable: true,
            writable: true,
            value: store.peekEntity(prop),
          };
        }
        return undefined;
      },
    },
  );
}

module.exports = {
  createLegacyCityEntityProxy,
};
