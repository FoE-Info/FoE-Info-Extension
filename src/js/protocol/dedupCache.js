/** Time-windowed dedup cache used by MessageDispatcher to suppress replay payloads. */
let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('DedupCache');
} catch {}

class DedupCache {
  constructor({ windowMs = 1000, maxSize = 500 } = {}) {
    this.windowMs = typeof windowMs === 'number' ? windowMs : 1000;
    this.maxSize = typeof maxSize === 'number' ? maxSize : 500;
    this._cache = new Map();
  }

  isDuplicate(reqUrl, textBody, requestPayload = null, now = Date.now()) {
    if (!reqUrl || !textBody) {
      logger?.warn('Malformed dedup input; treating as non-duplicate', {
        hasReqUrl: Boolean(reqUrl),
        hasTextBody: Boolean(textBody),
      });
      return false;
    }
    if (typeof requestPayload === 'number') {
      now = requestPayload;
      requestPayload = null;
    }
    const len = typeof textBody === 'string' ? textBody.length : 0;
    const sample =
      typeof textBody === 'string' ?
        textBody.length > 200 ?
          `${textBody.slice(0, 100)}:${textBody.slice(-100)}`
        : textBody
      : '';
    const reqSample =
      typeof requestPayload === 'string' ? requestPayload.slice(0, 120)
      : requestPayload ? JSON.stringify(requestPayload).slice(0, 120)
      : '';
    const key = `${reqUrl}:${len}:${sample}:${reqSample}`;

    if (this._cache.has(key)) {
      const lastTime = this._cache.get(key);
      if (now - lastTime < this.windowMs) {
        logger?.debug('Dedup cache hit', {
          reqUrl,
          ageMs: now - lastTime,
          size: this._cache.size,
        });
        return true;
      }
    }
    this._cache.set(key, now);
    logger?.debug('Dedup cache insert', {
      reqUrl,
      len,
      size: this._cache.size,
    });
    if (this._cache.size > this.maxSize) {
      const firstKey = this._cache.keys().next().value;
      this._cache.delete(firstKey);
      logger?.debug('Dedup cache eviction', {
        evictedKeyLength: firstKey.length,
        size: this._cache.size,
      });
    }
    return false;
  }

  clear() {
    this._cache.clear();
  }
}

module.exports = { DedupCache };
module.exports.default = DedupCache;
