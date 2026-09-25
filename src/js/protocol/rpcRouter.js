/**
 * rpcRouter.js
 *
 * Route registry, RPC scope filtering, and debug telemetry for InnoGames JSON-RPC packets.
 * Maintains registered method handlers, class-level fallbacks, global fallbacks,
 * out-of-scope RPC filtering, and rolling in-memory RPC logs.
 */

const { createLogger, isDebugEnabled } = require('../utils/logger.js');

let logger = null;
let rpcLogger = null;
try {
  logger = createLogger('RpcRouter');
  rpcLogger = createLogger('RPC');
} catch {}

// --- RPC Scope & Filtering ---

const STORAGE_KEY = 'showIgnoredRpc';

const IGNORED_RPC_CLASSES = new Set([
  'AnnouncementsService',
  'CampaignService',
  'CashShopService',
  'ChallengeService',
  'ClanRecruitmentService',
  'CrmService',
  'ForgePlusPackageService',
  'FriendService',
  'ItemAuctionService',
  'ItemShopService',
  'ItemStoreService',
  'LogService',
  'MessageService',
  'PlayerProfileService',
  'PremiumService',
  'ResearchService',
  'SaleInfoService',
  'SettingsService',
  'TrackingService',
  'TutorialService',
  'VisitAllService',
]);

let showIgnoredRpc = false;
const subscribers = new Set();

function getBrowserStorage() {
  if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
    return chrome.storage.local;
  }
  if (typeof browser !== 'undefined' && browser?.storage?.local) {
    return browser.storage.local;
  }
  return null;
}

function isIgnoredRpcClass(requestClass) {
  return !!requestClass && IGNORED_RPC_CLASSES.has(requestClass);
}

function isIgnoredRpcLoggingEnabled() {
  return showIgnoredRpc;
}

function shouldLogUnhandledRpc(requestClass) {
  return !isIgnoredRpcClass(requestClass) || showIgnoredRpc;
}

function setIgnoredRpcLoggingEnabled(value, { persist = true } = {}) {
  const next = Boolean(value);
  if (showIgnoredRpc === next) return showIgnoredRpc;
  showIgnoredRpc = next;

  if (persist) {
    const storage = getBrowserStorage();
    if (storage?.set) {
      try {
        const p = storage.set({ [STORAGE_KEY]: next });
        if (p && typeof p.catch === 'function') {
          p.catch(() => {});
        }
      } catch {}
    }
  }

  logger?.info(`Ignored RPC logging ${next ? 'enabled' : 'disabled'}`);

  for (const cb of subscribers) {
    try {
      cb(showIgnoredRpc);
    } catch (e) {
      console.warn('[FoE-Info:RpcScope] Subscriber error:', e);
    }
  }

  return showIgnoredRpc;
}

function toggleIgnoredRpcLogging(opts = {}) {
  return setIgnoredRpcLoggingEnabled(!showIgnoredRpc, opts);
}

function onIgnoredRpcToggle(callback) {
  if (typeof callback !== 'function') return () => {};
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

async function initIgnoredRpcState() {
  const storage = getBrowserStorage();
  if (storage?.get) {
    try {
      const res = await storage.get(STORAGE_KEY);
      if (res && typeof res[STORAGE_KEY] === 'boolean') {
        setIgnoredRpcLoggingEnabled(res[STORAGE_KEY], { persist: false });
      }
    } catch {}
  }

  const onChanged =
    (typeof chrome !== 'undefined' && chrome?.storage?.onChanged) ||
    (typeof browser !== 'undefined' && browser?.storage?.onChanged);

  if (onChanged?.addListener) {
    try {
      onChanged.addListener((changes, areaName) => {
        if (areaName && areaName !== 'local') return;
        if (changes?.[STORAGE_KEY]) {
          setIgnoredRpcLoggingEnabled(Boolean(changes[STORAGE_KEY].newValue), {
            persist: false,
          });
        }
      });
    } catch {}
  }
}

if (typeof window !== 'undefined' || typeof self !== 'undefined') {
  initIgnoredRpcState().catch(() => {});
  if (typeof window !== 'undefined') {
    window.foeShowIgnoredRpc = (value) =>
      value === undefined ?
        toggleIgnoredRpcLogging()
      : setIgnoredRpcLoggingEnabled(value);
  }
}

function _resetForTesting() {
  showIgnoredRpc = false;
  subscribers.clear();
}

// --- RPC Logging & Debug Telemetry ---

const rpcLog = [];
if (typeof window !== 'undefined') {
  window.foeRpcLog = rpcLog;
}

function logRpcMessage(msg, isHandled) {
  if (!msg || typeof msg !== 'object') return;
  const reqClass = msg.requestClass || msg.__class__ || 'Metadata/Unknown';
  const reqMethod = msg.requestMethod || 'N/A';
  const debug = typeof isDebugEnabled === 'function' ? isDebugEnabled() : false;
  const handled = !!isHandled;
  const ignored = !handled && isIgnoredRpcClass(reqClass);

  if (ignored && !shouldLogUnhandledRpc(reqClass)) return;

  const entry = {
    timestamp: new Date().toISOString(),
    requestClass: reqClass,
    requestMethod: reqMethod,
    requestId: msg.requestId ?? null,
    handled,
    ignored,
    responseData:
      debug ?
        msg.responseData !== undefined ?
          msg.responseData
        : msg
      : `${reqClass}.${reqMethod}`,
  };

  rpcLog.push(entry);
  if (rpcLog.length > 500) {
    rpcLog.shift();
  }

  const tag =
    handled ? '[HANDLED]'
    : ignored ? '[IGNORED]'
    : '[UNHANDLED]';
  const style =
    handled ? 'color: #2e7d32; font-weight: bold;'
    : ignored ? 'color: #f57c00; font-weight: bold;'
    : 'color: #d32f2f; font-weight: bold;';

  if (debug) {
    console.groupCollapsed(
      `%c[FoE-RPC] ${tag} ${reqClass}.${reqMethod}`,
      style,
    );
    console.debug('Full Message:', msg);
    console.debug('Response Data:', entry.responseData);
    console.groupEnd();
    rpcLogger?.debug(`${tag} ${reqClass}.${reqMethod}`, {
      requestClass: reqClass,
      requestMethod: reqMethod,
      requestId: entry.requestId,
      responseData: entry.responseData,
    });
  }
}

// --- RPC Router Registry ---

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
  // RpcScope
  STORAGE_KEY,
  IGNORED_RPC_CLASSES,
  isIgnoredRpcClass,
  isIgnoredRpcLoggingEnabled,
  shouldLogUnhandledRpc,
  setIgnoredRpcLoggingEnabled,
  toggleIgnoredRpcLogging,
  onIgnoredRpcToggle,
  initIgnoredRpcState,
  _resetForTesting,
  // RpcLogger
  rpcLog,
  logRpcMessage,
};
module.exports.default = module.exports;
