/**
 * networkPayloadDeduplicator.js
 *
 * In-memory payload deduplication cache for FoE-Info network listener.
 * Prevents re-dispatching identical RPC payloads received within 3000ms.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('NetworkPayloadDeduplicator');
} catch {}

const processedPayloadCache = new Map();
const TTL_MS = 3000;
const MAX_CACHE_SIZE = 300;

/**
 * Checks whether an incoming payload is a duplicate within the TTL window.
 *
 * @param {string} reqUrl
 * @param {string} textBody
 * @returns {boolean} True if the payload was recently seen
 */
function isDuplicatePayload(reqUrl, textBody) {
  if (!reqUrl || !textBody) return false;

  const sample = typeof textBody === 'string' ? textBody.slice(0, 100) : '';
  const len = typeof textBody === 'string' ? textBody.length : 0;
  const key = `${reqUrl}:${len}:${sample}`;
  const now = Date.now();

  if (processedPayloadCache.has(key)) {
    const lastTime = processedPayloadCache.get(key);
    if (now - lastTime < TTL_MS) {
      logger?.debug('Duplicate payload suppressed', {
        key,
        deltaMs: now - lastTime,
      });
      return true;
    }
  }

  processedPayloadCache.set(key, now);
  if (processedPayloadCache.size > MAX_CACHE_SIZE) {
    const firstKey = processedPayloadCache.keys().next().value;
    processedPayloadCache.delete(firstKey);
  }
  return false;
}

/**
 * Clears the payload deduplication cache.
 */
function clearDuplicatePayloadCache() {
  logger?.debug('Clearing duplicate payload cache');
  processedPayloadCache.clear();
}

module.exports = {
  isDuplicatePayload,
  clearDuplicatePayloadCache,
  processedPayloadCache,
};
module.exports.default = module.exports;
