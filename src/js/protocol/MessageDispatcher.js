/**
 * MessageDispatcher.js
 *
 * Declarative, decoupled InnoGames JSON-RPC packet router and metadata dispatcher.
 * Handles payload decoding (UTF-8 / Base64), deduplication, priority sorting,
 * direct CDN metadata URL routing, and per-message failure isolation.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('Dispatcher');
} catch {}

const { DedupCache } = require('./dedupCache.js');

const combinedHandlerMembers = new WeakMap();

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
    this.dedupCache = new DedupCache({
      windowMs: this.dedupWindowMs,
      maxSize: this.maxCacheSize,
    });
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
      const members =
        combinedHandlerMembers.get(existing) || new Set([existing]);
      if (members.has(handlerFn)) return this;
      const combined = async (msg, ctx) => {
        const res1 = await existing(msg, ctx);
        const res2 = await handlerFn(msg, ctx);
        return res2 !== undefined ? res2 : res1;
      };
      combinedHandlerMembers.set(combined, new Set([...members, handlerFn]));
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
   * @param {Object|string|number} [requestPayload=null]
   * @param {number} [now=Date.now()]
   * @returns {boolean}
   */
  isDuplicate(reqUrl, textBody, requestPayload = null, now = Date.now()) {
    return this.dedupCache.isDuplicate(reqUrl, textBody, requestPayload, now);
  }

  /**
   * Clear the deduplication cache.
   */
  clearDedupCache() {
    this.dedupCache.clear();
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
      logger?.debug(`Routing RPC: ${key}`, { requestId: msg.requestId });
      return await handler(msg, context);
    }

    const classFallback = this.classFallbacks.get(requestClass);
    if (classFallback) {
      logger?.debug(`Routing RPC fallback for class: ${requestClass}`);
      return await classFallback(msg, context);
    }

    if (this.globalFallback) {
      logger?.debug(`Routing RPC to global fallback: ${key}`);
      return await this.globalFallback(msg, context);
    }

    logger?.debug(`Unhandled RPC service method: ${key}`);
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

    // Parse request payload if available to attach requestData and differentiate duplicate requests
    let requestPayload = null;
    try {
      if (Array.isArray(request)) {
        requestPayload = request;
      } else if (typeof request === 'string') {
        try {
          requestPayload = JSON.parse(request);
        } catch {
          requestPayload = null;
        }
      } else if (request && typeof request === 'object') {
        const postText =
          request.request?.postData?.text ||
          request.postData?.text ||
          (typeof request.request?.postData === 'string' ?
            request.request.postData
          : typeof request.postData === 'string' ? request.postData
          : null);
        if (typeof postText === 'string') {
          try {
            requestPayload = JSON.parse(postText);
            if (
              requestPayload &&
              typeof requestPayload === 'object' &&
              !Array.isArray(requestPayload) &&
              Object.keys(requestPayload).length === 0
            ) {
              requestPayload = null;
            }
          } catch {
            requestPayload = null;
          }
        } else if (typeof postText === 'object' && postText !== null) {
          requestPayload =
            Object.keys(postText).length > 0 || Array.isArray(postText) ?
              postText
            : null;
        }

        if (!requestPayload) {
          if (Array.isArray(request.request?.postData)) {
            requestPayload = request.request.postData;
          } else if (
            typeof request.request?.postData === 'object' &&
            request.request.postData !== null
          ) {
            requestPayload = request.request.postData;
          } else if (Array.isArray(request.postData)) {
            requestPayload = request.postData;
          } else if (
            typeof request.postData === 'object' &&
            request.postData !== null
          ) {
            requestPayload = request.postData;
          } else if (Array.isArray(request.requestPayload)) {
            requestPayload = request.requestPayload;
          }
        }
      }
    } catch (e) {
      // Ignore parse failure on request payload
    }

    if (this.isDuplicate(reqUrl, textBody, requestPayload)) {
      return { handled: false, duplicate: true };
    }

    let parsed;
    try {
      parsed = typeof textBody === 'object' ? textBody : JSON.parse(textBody);
    } catch (err) {
      console.error('[MessageDispatcher] Failed to parse JSON body:', err);
      return { handled: false, error: 'json_parse_error', details: err };
    }

    if (requestPayload) {
      const reqItems =
        Array.isArray(requestPayload) ? requestPayload : [requestPayload];
      const parsedItems = Array.isArray(parsed) ? parsed : [parsed];

      for (let i = 0; i < parsedItems.length; i++) {
        const msg = parsedItems[i];
        if (msg && typeof msg === 'object') {
          let match = null;
          if (msg.requestId !== undefined) {
            match = reqItems.find((r) => r && r.requestId === msg.requestId);
          }
          if (
            !match &&
            reqItems[i] &&
            (reqItems[i].requestClass === msg.requestClass || !msg.requestClass)
          ) {
            match = reqItems[i];
          }
          if (!match) {
            match = reqItems.find(
              (r) =>
                r &&
                r.requestClass === msg.requestClass &&
                r.requestMethod === msg.requestMethod,
            );
          }
          if (!match && reqItems.length === 1) {
            match = reqItems[0];
          }
          if (match) {
            if (!msg.requestClass && match.requestClass) {
              msg.requestClass = match.requestClass;
            }
            if (!msg.requestMethod && match.requestMethod) {
              msg.requestMethod = match.requestMethod;
            }
            if (
              match.requestData !== undefined &&
              (msg.requestData === undefined || msg.requestData === null)
            ) {
              msg.requestData = match.requestData;
            }
          }
        }
      }
    }

    const context = { reqUrl, headers, request, requestPayload };

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
