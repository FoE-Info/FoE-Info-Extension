/**
 * MessageDispatcher.js
 *
 * Declarative, decoupled InnoGames JSON-RPC packet router and metadata dispatcher.
 * Handles payload decoding (UTF-8 / Base64), deduplication, priority sorting,
 * direct CDN metadata URL routing, and per-message failure isolation.
 */

class MessageDispatcher {
  /**
   * @param {Object} [options]
   * @param {number} [options.dedupWindowMs=1000] - Deduplication window in milliseconds
   * @param {number} [options.maxCacheSize=500] - Maximum deduplication cache size
   */
  constructor(options = {}) {
    this.handlers = new Map();
    this.classFallbacks = new Map();
    this.globalFallback = null;
    this.directMetadataHandler = null;
    this.errorHandler = null;

    this.dedupWindowMs =
      typeof options.dedupWindowMs === 'number' ? options.dedupWindowMs : 1000;
    this.maxCacheSize =
      typeof options.maxCacheSize === 'number' ? options.maxCacheSize : 500;
    this._dedupCache = new Map();
    this.priorities = new Map();
  }

  /**
   * Register a handler for a specific requestClass and requestMethod.
   * @param {string} requestClass
   * @param {string} requestMethod
   * @param {Function} handlerFn
   * @returns {MessageDispatcher} this
   */
  register(requestClass, requestMethod, handlerFn) {
    if (!requestClass || !requestMethod || typeof handlerFn !== 'function') {
      return this;
    }
    const key = `${requestClass}.${requestMethod}`;
    const existing = this.handlers.get(key);
    if (!existing) {
      this.handlers.set(key, handlerFn);
    } else {
      const combined = async (msg, ctx) => {
        const res1 = await existing(msg, ctx);
        const res2 = await handlerFn(msg, ctx);
        return res2 !== undefined ? res2 : res1;
      };
      this.handlers.set(key, combined);
    }
    return this;
  }

  /**
   * Register an entire service bundle where methods map to requestMethods.
   * @param {string} requestClass
   * @param {Object} handlersMap
   * @returns {MessageDispatcher} this
   */
  registerService(requestClass, handlersMap) {
    if (!requestClass || !handlersMap || typeof handlersMap !== 'object') {
      return this;
    }
    for (const key of Object.keys(handlersMap)) {
      if (typeof handlersMap[key] === 'function') {
        this.register(requestClass, key, handlersMap[key].bind(handlersMap));
      }
    }
    return this;
  }

  /**
   * Register a fallback handler for unhandled methods on a known class.
   * @param {string} requestClass
   * @param {Function} fallbackFn
   * @returns {MessageDispatcher} this
   */
  registerFallback(requestClass, fallbackFn) {
    if (requestClass && typeof fallbackFn === 'function') {
      this.classFallbacks.set(requestClass, fallbackFn);
    }
    return this;
  }

  /**
   * Register a global fallback handler for completely unhandled messages.
   * @param {Function} fallbackFn
   * @returns {MessageDispatcher} this
   */
  registerGlobalFallback(fallbackFn) {
    if (typeof fallbackFn === 'function') {
      this.globalFallback = fallbackFn;
    }
    return this;
  }

  /**
   * Register a dedicated handler for direct CDN metadata requests.
   * @param {Function} handlerFn
   * @returns {MessageDispatcher} this
   */
  registerDirectMetadata(handlerFn) {
    if (typeof handlerFn === 'function') {
      this.directMetadataHandler = handlerFn;
    }
    return this;
  }

  setDirectMetadataHandler(handlerFn) {
    return this.registerDirectMetadata(handlerFn);
  }

  /**
   * Register an error listener for isolated message dispatch exceptions.
   * @param {Function} errorHandlerFn
   * @returns {MessageDispatcher} this
   */
  onError(errorHandlerFn) {
    if (typeof errorHandlerFn === 'function') {
      this.errorHandler = errorHandlerFn;
    }
    return this;
  }

  /**
   * Assign a dispatch priority to a specific method or entire class.
   * @param {string} requestClass
   * @param {string|null} requestMethod
   * @param {number} priority
   * @returns {MessageDispatcher} this
   */
  setPriority(requestClass, requestMethod, priority) {
    const key =
      requestMethod ? `${requestClass}.${requestMethod}` : `${requestClass}.*`;
    this.priorities.set(key, priority);
    return this;
  }

  /**
   * Calculate priority weight for a message (higher executes earlier).
   * @param {Object} msg
   * @returns {number}
   */
  getMessagePriority(msg) {
    if (!msg || typeof msg !== 'object') return 0;
    const specificKey = `${msg.requestClass}.${msg.requestMethod}`;
    if (this.priorities.has(specificKey)) {
      return this.priorities.get(specificKey);
    }
    const classKey = `${msg.requestClass}.*`;
    if (this.priorities.has(classKey)) {
      return this.priorities.get(classKey);
    }
    // InnoGames Invariant: StaticDataService metadata must load before StartupService data
    if (
      msg.requestClass === 'StaticDataService' &&
      msg.requestMethod === 'getMetadata'
    ) {
      return 100;
    }
    if (msg.requestClass === 'StaticDataService') {
      return 90;
    }
    return 0;
  }

  /**
   * Stably sort an array of messages by priority descending.
   * @param {Array} messages
   * @returns {Array}
   */
  sortBatch(messages) {
    if (!Array.isArray(messages) || messages.length <= 1) return messages;
    return messages
      .map((msg, index) => ({
        msg,
        index,
        priority: this.getMessagePriority(msg),
      }))
      .sort((a, b) => b.priority - a.priority || a.index - b.index)
      .map((item) => item.msg);
  }

  /**
   * Decode network payload string according to transfer encoding.
   * @param {string|Object} body
   * @param {string} [encoding]
   * @returns {string}
   */
  decodeBody(body, encoding) {
    if (!body) return '';
    if (encoding === 'base64' && typeof body === 'string') {
      if (typeof Buffer !== 'undefined') {
        return Buffer.from(body, 'base64').toString('utf8');
      }
      const binaryStr = atob(body);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      return new TextDecoder('utf-8').decode(bytes);
    }
    return typeof body === 'string' ? body : JSON.stringify(body);
  }

  /**
   * Determine if the payload is an identical duplicate within dedup window.
   * @param {string} reqUrl
   * @param {string} textBody
   * @param {number} [now=Date.now()]
   * @returns {boolean}
   */
  isDuplicate(reqUrl, textBody, now = Date.now()) {
    if (!reqUrl || !textBody) return false;
    const len = typeof textBody === 'string' ? textBody.length : 0;
    const sample =
      typeof textBody === 'string' ?
        textBody.length > 200 ?
          `${textBody.slice(0, 100)}:${textBody.slice(-100)}`
        : textBody
      : '';
    const key = `${reqUrl}:${len}:${sample}`;

    if (this._dedupCache.has(key)) {
      const lastTime = this._dedupCache.get(key);
      if (now - lastTime < this.dedupWindowMs) {
        return true;
      }
    }
    this._dedupCache.set(key, now);
    if (this._dedupCache.size > this.maxCacheSize) {
      const firstKey = this._dedupCache.keys().next().value;
      this._dedupCache.delete(firstKey);
    }
    return false;
  }

  /**
   * Clear the deduplication cache.
   */
  clearDedupCache() {
    this._dedupCache.clear();
  }

  /**
   * Check if URL represents a direct InnoGames CDN metadata resource.
   * @param {string} url
   * @returns {boolean}
   */
  isDirectMetadataUrl(url) {
    if (!url || typeof url !== 'string') return false;
    return (
      (url.includes('metadata?id=') ||
        url.includes('/metadata') ||
        url.includes('/start/metadata')) &&
      !url.includes('/game/json')
    );
  }

  /**
   * Extract metadata id and hash from direct CDN metadata URL.
   * @param {string} reqUrl
   * @returns {{ metaId: string|null, metaHash: string|null, reqUrl: string }}
   */
  parseMetadataUrlContext(reqUrl) {
    let metaId = null;
    let metaHash = null;
    const metaIdx = reqUrl.indexOf('metadata?id=');
    if (metaIdx > -1) {
      const metaStr = reqUrl
        .substring(metaIdx + 'metadata?id='.length)
        .split('&')[0];
      const parts = metaStr.split('-');
      metaId = parts[0];
      if (parts.length > 1) {
        metaHash = parts.slice(1).join('-');
      }
    }
    return { metaId, metaHash, reqUrl };
  }

  /**
   * Dispatch a single ServerRequest to its registered handler.
   * @param {Object} msg
   * @param {Object} [context]
   * @returns {Promise<*>}
   */
  async dispatchSingle(msg, context = {}) {
    if (!msg || typeof msg !== 'object') return null;
    const { requestClass, requestMethod } = msg;
    const key = `${requestClass}.${requestMethod}`;

    const handler = this.handlers.get(key);
    if (handler) {
      return await handler(msg, context);
    }

    const classFallback = this.classFallbacks.get(requestClass);
    if (classFallback) {
      return await classFallback(msg, context);
    }

    if (this.globalFallback) {
      return await this.globalFallback(msg, context);
    }

    return { unhandled: true, requestClass, requestMethod };
  }

  /**
   * Dispatch a batch of ServerRequests with error isolation.
   * @param {Array<Object>|Object} serverRequests
   * @param {Object} [context]
   * @returns {Promise<{ total: number, succeeded: number, failed: number, results: Array }>}
   */
  async dispatchBatch(serverRequests, context = {}) {
    if (!serverRequests) {
      return { total: 0, succeeded: 0, failed: 0, results: [] };
    }
    const requests =
      Array.isArray(serverRequests) ? [...serverRequests] : [serverRequests];
    const sorted = this.sortBatch(requests);
    const results = [];
    let succeeded = 0;
    let failed = 0;

    for (const msg of sorted) {
      try {
        const res = await this.dispatchSingle(msg, context);
        succeeded++;
        results.push({ success: true, message: msg, result: res });
      } catch (err) {
        failed++;
        results.push({ success: false, message: msg, error: err });
        if (typeof this.errorHandler === 'function') {
          try {
            this.errorHandler(err, msg, context);
          } catch (loggingErr) {
            console.error(
              '[MessageDispatcher] Error in errorHandler:',
              loggingErr,
            );
          }
        }
      }
    }

    return { total: sorted.length, succeeded, failed, results };
  }

  /**
   * Core entrypoint called by DevTools & content bridges.
   * Decodes, deduplicates, and routes raw network responses.
   *
   * @param {string} reqUrl
   * @param {string|Object} body
   * @param {string} [encoding]
   * @param {Array} [headers=[]]
   * @param {Object} [request=null]
   * @returns {Promise<Object>}
   */
  async dispatchRaw(reqUrl, body, encoding = '', headers = [], request = null) {
    if (!reqUrl || !body) {
      return { handled: false, reason: 'empty_input' };
    }

    let textBody;
    try {
      textBody = this.decodeBody(body, encoding);
    } catch (err) {
      console.error('[MessageDispatcher] Failed to decode body:', err);
      return { handled: false, error: 'decode_error', details: err };
    }

    if (this.isDuplicate(reqUrl, textBody)) {
      return { handled: false, duplicate: true };
    }

    let parsed;
    try {
      parsed = typeof textBody === 'object' ? textBody : JSON.parse(textBody);
    } catch (err) {
      console.error('[MessageDispatcher] Failed to parse JSON body:', err);
      return { handled: false, error: 'json_parse_error', details: err };
    }

    const context = { reqUrl, headers, request };

    // Direct CDN metadata routing
    if (this.isDirectMetadataUrl(reqUrl)) {
      const metaCtx = {
        ...this.parseMetadataUrlContext(reqUrl),
        headers,
        request,
      };

      if (
        parsed &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed) &&
        !parsed.id &&
        metaCtx.metaId
      ) {
        parsed.id = metaCtx.metaId.replace(/^building_entity_/, '');
      }

      let handledDirect = false;
      let directResult = null;

      if (typeof this.directMetadataHandler === 'function') {
        try {
          directResult = await this.directMetadataHandler(parsed, metaCtx);
          handledDirect = true;
        } catch (err) {
          if (typeof this.errorHandler === 'function') {
            this.errorHandler(
              err,
              { isDirectMetadata: true, url: reqUrl },
              metaCtx,
            );
          }
        }
      }

      const staticKey = 'StaticDataService.getMetadata';
      if (this.handlers.has(staticKey)) {
        const staticMsg = {
          __class__: 'ServerRequest',
          requestClass: 'StaticDataService',
          requestMethod: 'getMetadata',
          responseData: parsed,
          requestId: 0,
          metaId: metaCtx.metaId,
          metaHash: metaCtx.metaHash,
          reqUrl,
          isDirectMetadata: true,
        };
        const res = await this.dispatchBatch([staticMsg], metaCtx);
        return {
          handled: true,
          isDirectMetadata: true,
          directResult,
          batchResult: res,
        };
      }

      return {
        handled: handledDirect,
        isDirectMetadata: true,
        directResult,
      };
    }

    const batchResult = await this.dispatchBatch(parsed, context);
    return { handled: true, duplicate: false, batchResult };
  }
}

const messageDispatcher = new MessageDispatcher();
if (typeof window !== 'undefined') {
  window.foeMessageDispatcher = messageDispatcher;
}

module.exports = {
  MessageDispatcher,
  messageDispatcher,
};
module.exports.default = messageDispatcher;
