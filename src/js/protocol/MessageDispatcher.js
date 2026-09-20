/**
 * MessageDispatcher.js
 *
 * Declarative, decoupled InnoGames JSON-RPC packet router and metadata dispatcher.
 * Handles payload decoding (UTF-8 / Base64), deduplication, priority sorting,
 * direct CDN metadata URL routing, and per-message failure isolation.
 */

const { DedupCache } = require('./dedupCache.js');
const { MessagePriorityManager } = require('./MessagePriorityManager.js');
const { decodeBody, parsePayload } = require('./payloadCodec.js');
const { executeBatchDispatch } = require('./batchExecutor.js');
const { executeRawDispatch } = require('./rawDispatchPipeline.js');
const { RpcRouter } = require('./rpcRouter.js');

let yieldToMain = async () => new Promise((resolve) => setTimeout(resolve, 0));
try {
  const scheduler = require('../utils/scheduler.js');
  if (typeof scheduler.yieldToMain === 'function') {
    yieldToMain = scheduler.yieldToMain;
  }
} catch {}

class MessageDispatcher {
  /**
   * @param {Object} [options]
   * @param {number} [options.dedupWindowMs=1000] - Deduplication window in milliseconds
   * @param {number} [options.maxCacheSize=500] - Maximum deduplication cache size
   * @param {number} [options.yieldInterval=10] - Yield to main thread every N messages in batch
   * @param {Function} [options.yieldFn] - Custom yielding function (defaults to yieldToMain)
   */
  constructor(options = {}) {
    this.router = new RpcRouter();
    this.handlers = this.router.handlers;
    this.classFallbacks = this.router.classFallbacks;
    this.directMetadataHandler = null;
    this.errorHandler = null;

    this.dedupWindowMs =
      typeof options.dedupWindowMs === 'number' ? options.dedupWindowMs : 1000;
    this.maxCacheSize =
      typeof options.maxCacheSize === 'number' ? options.maxCacheSize : 500;
    this.yieldInterval =
      typeof options.yieldInterval === 'number' ? options.yieldInterval : 10;
    this.yieldParseThresholdBytes =
      typeof options.yieldParseThresholdBytes === 'number' ?
        options.yieldParseThresholdBytes
      : 50 * 1024;
    this.yieldFn =
      typeof options.yieldFn === 'function' ? options.yieldFn : yieldToMain;
    this.dedupCache = new DedupCache({
      windowMs: this.dedupWindowMs,
      maxSize: this.maxCacheSize,
    });
    this.priorityManager = new MessagePriorityManager();
    this.priorities = this.priorityManager.priorities;
  }

  get globalFallback() {
    return this.router.globalFallback;
  }

  set globalFallback(fallbackFn) {
    this.router.globalFallback = fallbackFn;
  }

  /** Register a handler for a specific requestClass and requestMethod. */
  register(requestClass, requestMethod, handlerFn) {
    this.router.register(requestClass, requestMethod, handlerFn);
    return this;
  }

  /** Register an entire service bundle where methods map to requestMethods. */
  registerService(requestClass, handlersMap) {
    this.router.registerService(requestClass, handlersMap);
    return this;
  }

  /** Register a fallback handler for unhandled methods on a known class. */
  registerFallback(requestClass, fallbackFn) {
    this.router.registerFallback(requestClass, fallbackFn);
    return this;
  }

  /** Register a global fallback handler for completely unhandled messages. */
  registerGlobalFallback(fallbackFn) {
    this.router.registerGlobalFallback(fallbackFn);
    return this;
  }

  /** Register a dedicated handler for direct CDN metadata requests. */
  registerDirectMetadata(handlerFn) {
    if (typeof handlerFn === 'function') {
      this.directMetadataHandler = handlerFn;
    }
    return this;
  }

  setDirectMetadataHandler(handlerFn) {
    return this.registerDirectMetadata(handlerFn);
  }

  /** Register an error listener for isolated message dispatch exceptions. */
  onError(errorHandlerFn) {
    if (typeof errorHandlerFn === 'function') {
      this.errorHandler = errorHandlerFn;
    }
    return this;
  }

  /** Assign a dispatch priority to a specific method or entire class. */
  setPriority(requestClass, requestMethod, priority) {
    this.priorityManager.setPriority(requestClass, requestMethod, priority);
    return this;
  }

  /** Calculate priority weight for a message (higher executes earlier). */
  getMessagePriority(msg) {
    return this.priorityManager.getMessagePriority(msg);
  }

  /** Stably sort an array of messages by priority descending. */
  sortBatch(messages) {
    return this.priorityManager.sortBatch(messages);
  }

  /** Decode network payload string according to transfer encoding. */
  decodeBody(body, encoding) {
    return decodeBody(body, encoding);
  }

  /** Determine if the payload is an identical duplicate within dedup window. */
  isDuplicate(reqUrl, textBody, requestPayload = null, now = Date.now()) {
    return this.dedupCache.isDuplicate(reqUrl, textBody, requestPayload, now);
  }

  /** Clear the deduplication cache. */
  clearDedupCache() {
    this.dedupCache.clear();
  }

  /** Parse JSON body with cooperative main-thread yielding for heavy payloads. */
  async parsePayload(textBody) {
    return parsePayload(textBody, {
      yieldParseThresholdBytes: this.yieldParseThresholdBytes,
      yieldFn: this.yieldFn,
    });
  }

  /** Dispatch a single ServerRequest to its registered handler. */
  async dispatchSingle(msg, context = {}) {
    return this.router.dispatchSingle(msg, context);
  }

  /** Dispatch a batch of ServerRequests with error isolation. */
  async dispatchBatch(serverRequests, context = {}) {
    return executeBatchDispatch(serverRequests, context, {
      dispatchSingle: (msg, ctx) => this.dispatchSingle(msg, ctx),
      sortBatch: (msgs) => this.sortBatch(msgs),
      yieldInterval: this.yieldInterval,
      yieldFn: this.yieldFn,
      errorHandler: this.errorHandler,
    });
  }

  /** Core entrypoint called by DevTools & content bridges to decode, dedup, and route. */
  async dispatchRaw(reqUrl, body, encoding = '', headers = [], request = null) {
    return executeRawDispatch(this, {
      reqUrl,
      body,
      encoding,
      headers,
      request,
    });
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
