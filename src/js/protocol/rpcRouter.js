/**
 * rpcRouter.js
 *
 * Route registry and single-message dispatcher for InnoGames JSON-RPC packets.
 * Maintains registered method handlers, class-level fallbacks, and global fallbacks.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('RpcRouter');
} catch {}

const { shouldLogUnhandledRpc } = require('./rpcScope.js');

const combinedHandlerMembers = new WeakMap();

class RpcRouter {
  constructor() {
    this.handlers = new Map();
    this.classFallbacks = new Map();
    this.globalFallback = null;
  }

  /**
   * Register a handler for a specific requestClass and requestMethod.
   * Supports chaining multiple handlers onto the same key.
   *
   * @param {string} requestClass
   * @param {string} requestMethod
   * @param {Function} handlerFn
   * @returns {RpcRouter} this
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
   * @returns {RpcRouter} this
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
   * @returns {RpcRouter} this
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
   * @returns {RpcRouter} this
   */
  registerGlobalFallback(fallbackFn) {
    if (typeof fallbackFn === 'function') {
      this.globalFallback = fallbackFn;
    }
    return this;
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

    if (shouldLogUnhandledRpc(requestClass)) {
      logger?.debug(`Unhandled RPC service method: ${key}`);
    }
    return { unhandled: true, requestClass, requestMethod };
  }
}

module.exports = {
  RpcRouter,
};
