/**
 * networkListener.js
 *
 * Unified network intake pipeline: packet interception, DevTools request routing,
 * payload deduplication, URL content extraction, and world detection.
 */

const {
  getGameVersion,
  setGameVersion,
  notifyGameVersionChange,
} = require('./gameVersionTracker.js');

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('NetworkListener');
} catch {}

let postBackgroundTask = (fn) => setTimeout(fn, 0);
try {
  const scheduler = require('../utils/scheduler.js');
  if (typeof scheduler.postBackgroundTask === 'function') {
    postBackgroundTask = scheduler.postBackgroundTask;
  }
} catch {}

let defaultMessageDispatcher;
try {
  const md = require('./MessageDispatcher.js');
  defaultMessageDispatcher = md.messageDispatcher || md.default || md;
} catch {}

let defaultStorage;
try {
  defaultStorage = require('../utils/storage.js');
} catch {}

let defaultState;
try {
  defaultState = require('../vars/state.js');
} catch {}

let defaultShowOptions;
try {
  defaultShowOptions = require('../vars/showOptions.js');
} catch {}

let defaultCardVisibility;
try {
  defaultCardVisibility = require('../ui/cardVisibility.js');
} catch {}

let defaultGreatBuildingsService = null;
try {
  const {
    createGreatBuildingsService,
  } = require('../msg/GreatBuildingsService.js');
  const {
    greatBuildingsState,
  } = require('../state/GreatBuildingDomainState.js');
  const metadataStorePkg = require('../state/MetadataStore.js');
  defaultGreatBuildingsService = createGreatBuildingsService({
    greatBuildingsState,
    metadataStore: metadataStorePkg?.metadataStore,
  });
} catch {}

let defaultStartupService = null;
try {
  const { createStartupService } = require('../msg/StartupService.js');
  const { startupRenderState } = require('../state/StartupRenderState.js');
  const metadataStorePkg = require('../state/MetadataStore.js');
  const { blueGalaxyState } = require('../state/CityDomainState.js');
  const { City } = require('../state/CityDomainState.js');
  defaultStartupService = createStartupService({
    startupRenderState,
    metadataStore: metadataStorePkg?.metadataStore,
    blueGalaxyState,
    city: City,
  });
} catch {}

let activeDeps = {};
let firstRpcPacketIntercepted = false;

let activeMessageListener = null;
let activeBrowserRef = null;

function unbind() {
  if (
    activeBrowserRef?.runtime?.onMessage?.removeListener &&
    activeMessageListener
  ) {
    try {
      activeBrowserRef.runtime.onMessage.removeListener(activeMessageListener);
    } catch (e) {
      logger?.debug('Error removing runtime onMessage listener', e);
    }
  }
  activeMessageListener = null;
  activeBrowserRef = null;
}
// --- Payload Deduplication ---
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

// --- Content Reading & URL Detection ---

/**
 * Normalizes content-type header string into standard identifier.
 *
 * @param {string} type
 * @returns {string}
 */
function getType(type) {
  if (!type || typeof type !== 'string') return '';
  return type.replace(/.*(javascript|image|html|font|json|css|text).*/g, '$1');
}

/**
 * Checks whether the URL matches Forge of Empires RPC or metadata endpoints.
 *
 * @param {string} reqUrl
 * @returns {boolean}
 */
function isFoeNetworkUrl(reqUrl) {
  if (!reqUrl || typeof reqUrl !== 'string') return false;
  return (
    reqUrl.includes('/game/json') ||
    reqUrl.includes('metadata?id=') ||
    reqUrl.includes('/metadata') ||
    reqUrl.includes('/start/metadata')
  );
}

/**
 * Safely extracts body content from DevTools network request, supporting
 * both modern Promise-based and legacy callback-based getContent implementations.
 * Defers retries to background tasks if initial body is empty.
 *
 * @param {Object} request - Chrome DevTools network request object
 * @param {Function} processContent - Callback receiving (content, encoding)
 */
function safeProcessContent(request, processContent) {
  if (!request || typeof request.getContent !== 'function') return;
  try {
    let called = false;
    const safeProcess = (content, encoding) => {
      if (called) return;
      if (!content) {
        setTimeout(() => {
          if (called) return;
          postBackgroundTask(() => {
            try {
              let p;
              try {
                p = request.getContent();
              } catch {
                request.getContent((retryContent, retryEncoding) => {
                  if (retryContent) {
                    called = true;
                    processContent(retryContent, retryEncoding);
                  }
                });
                return;
              }
              if (p && typeof p.then === 'function') {
                p.then((res) => {
                  const [retryContent, retryEncoding] =
                    Array.isArray(res) ? res : [res, ''];
                  if (retryContent) {
                    called = true;
                    processContent(retryContent, retryEncoding);
                  }
                }).catch(() => {});
              }
            } catch (e) {
              logger?.debug('Error during background getContent retry', e);
            }
          });
        }, 150);
        return;
      }
      called = true;
      processContent(content, encoding);
    };

    let res;
    try {
      res = request.getContent();
    } catch {
      res = request.getContent((content, encoding) => {
        safeProcess(content, encoding);
      });
    }

    if (res && typeof res.then === 'function') {
      res
        .then((args) => {
          if (Array.isArray(args)) safeProcess(args[0], args[1]);
          else safeProcess(args, '');
        })
        .catch((err) => {
          logger?.error('getContent promise error', err);
          console.error('getContent promise error', err);
        });
    }
  } catch (e) {
    logger?.error('Error in safeProcessContent', e);
    console.error('Error in safeProcessContent', e);
  }
}

// --- World & Origin Detection ---

/**
 * Detects world and origin from request URL, verifies matching inspected world,
 * and synchronizes state, storage, and UI options.
 *
 * @param {string} reqUrl
 * @param {Object} deps
 * @returns {{ accepted: boolean, detectedWorld?: string, origin?: string }}
 */
function detectAndSyncWorldOrigin(reqUrl, deps = {}) {
  if (!reqUrl) return { accepted: true };

  const originMatch = reqUrl.match(/^(https?:\/\/[^/]+)/i);
  if (originMatch) {
    const worldMatch = originMatch[1].match(
      /https?:\/\/([a-z]+[1-9][0-9]*)\.forgeofempires\.com/i,
    );
    if (worldMatch && worldMatch[1]) {
      const detectedWorld = worldMatch[1].toLowerCase();
      const inspectedWorld =
        typeof deps.getInspectedWorldId === 'function' ?
          deps.getInspectedWorldId()
        : (deps.inspectedWorldId ?? null);

      if (inspectedWorld && detectedWorld !== inspectedWorld) {
        if (inspectedWorld.endsWith('0') || inspectedWorld === 'www') {
          logger?.debug('Updating inspected world from portal/landing ID', {
            inspectedWorld,
            detectedWorld,
          });
          if (typeof deps.setInspectedWorldId === 'function') {
            deps.setInspectedWorldId(detectedWorld);
          }
        } else {
          logger?.debug('Ignored network entry: inspected world mismatch', {
            inspectedWorld,
            detectedWorld,
          });
          return { accepted: false, detectedWorld };
        }
      }

      if (typeof deps.setGameOrigin === 'function') {
        deps.setGameOrigin(originMatch[1]);
      }

      const storage = deps.storage;
      if (storage) {
        if (
          typeof storage.getCurrentWorld === 'function' &&
          storage.getCurrentWorld() !== detectedWorld
        ) {
          if (typeof storage.setWorld === 'function') {
            storage.setWorld(detectedWorld);
          }
          if (typeof storage.getWorldSettings === 'function') {
            Promise.resolve(storage.getWorldSettings(detectedWorld)).then(
              (worldSettings) => {
                if (
                  worldSettings?.showOptions &&
                  typeof deps.setOptions === 'function'
                ) {
                  deps.setOptions('showOptions', worldSettings.showOptions);
                  if (typeof deps.applyCardVisibility === 'function') {
                    deps.applyCardVisibility();
                  }
                }
              },
            );
          }
        }
        if (typeof storage.registerKnownWorld === 'function') {
          storage.registerKnownWorld(detectedWorld);
        }
      }

      return { accepted: true, detectedWorld, origin: originMatch[1] };
    }
  }

  return { accepted: true };
}

// --- Dependency Resolution ---

function getDeps(overrideDeps = {}) {
  return {
    storage: defaultStorage,
    setGameOrigin: defaultState?.setGameOrigin,
    setOptions: defaultShowOptions?.default || defaultShowOptions?.setOptions,
    applyCardVisibility: defaultCardVisibility?.applyCardVisibility,
    messageDispatcher: defaultMessageDispatcher,
    greatBuildingsService: defaultGreatBuildingsService,
    startupService: defaultStartupService,
    logRpcMessage: null,
    browser:
      typeof browser !== 'undefined' ? browser
      : typeof chrome !== 'undefined' ? chrome
      : null,
    ...activeDeps,
    ...overrideDeps,
  };
}

// --- Direct Content Dispatching ---

/**
 * Dispatches a raw packet body directly to the message dispatcher and logs results.
 *
 * @param {string} reqUrl
 * @param {string} body
 * @param {string} encoding
 * @param {Array} [headers=[]]
 * @param {Object} [request=null]
 * @param {Object} [deps={}]
 * @returns {Promise<Object|undefined>}
 */
async function processContentDirect(
  reqUrl,
  body,
  encoding = '',
  headers = [],
  request = null,
  deps = {},
) {
  if (!body) return;
  const mergedDeps = getDeps(deps);
  const dispatcher = mergedDeps.messageDispatcher;
  const logRpc = mergedDeps.logRpcMessage;

  try {
    if (dispatcher && typeof dispatcher.dispatchRaw === 'function') {
      const res = await dispatcher.dispatchRaw(
        reqUrl,
        body,
        encoding,
        headers,
        request,
      );
      if (res && res.batchResult && Array.isArray(res.batchResult.results)) {
        if (typeof logRpc === 'function') {
          for (const item of res.batchResult.results) {
            logRpc(item.message, !item.result?.unhandled && item.success);
          }
        }
      }
      return res;
    }
  } catch (err) {
    logger?.error('Error in processContentDirect dispatch:', err);
    console.error('Error in processContentDirect dispatch:', err);
  }
}

// --- Network Interception Handlers ---

function handleRawNetworkEntry(
  reqUrl,
  headers,
  body,
  encoding,
  request = null,
  deps = {},
) {
  if (!reqUrl) return;
  const mergedDeps = getDeps(deps);

  const worldCheck = detectAndSyncWorldOrigin(reqUrl, mergedDeps);
  if (!worldCheck.accepted) {
    return;
  }

  if (isFoeNetworkUrl(reqUrl)) {
    if (!firstRpcPacketIntercepted) {
      firstRpcPacketIntercepted = true;
      logger?.info(
        `[TIMING:P3] NetworkListener first RPC packet received/dispatched | t = ${performance.now().toFixed(2)}ms | url = ${reqUrl}`,
      );
    }
    const clientIdentHeader = (headers || []).find(
      (h) => h && h.name && h.name.toLowerCase() === 'client-identification',
    );
    if (clientIdentHeader && clientIdentHeader.value) {
      notifyGameVersionChange(clientIdentHeader.value.substr(8, 5), mergedDeps);
    }
    processContentDirect(
      reqUrl,
      body,
      encoding || '',
      headers || [],
      request,
      mergedDeps,
    );
  }
}

function handleRequestFinished(request, deps = {}) {
  if (!request) return;
  const mergedDeps = getDeps(deps);
  const requestHeaders = (request.request && request.request.headers) || [];

  const reqUrl =
    request.request && request.request.url ? request.request.url : '';
  if (isFoeNetworkUrl(reqUrl)) {
    const clientIdentHeader = requestHeaders.find(
      (header) =>
        header &&
        header.name &&
        header.name.toLowerCase() === 'client-identification',
    );

    if (clientIdentHeader && clientIdentHeader.value) {
      notifyGameVersionChange(clientIdentHeader.value.substr(8, 5), mergedDeps);
    }

    const processContent = (body, encoding) => {
      const dispatchFn =
        mergedDeps.processContentDirect || processContentDirect;
      return dispatchFn(
        reqUrl,
        body,
        encoding,
        request.request ? request.request.headers : [],
        request,
        mergedDeps,
      );
    };
    safeProcessContent(request, processContent);
  }
}

function initNetworkListeners(deps = {}) {
  unbind();
  activeDeps = { ...activeDeps, ...deps };
  const mergedDeps = getDeps(deps);
  const browserRef = mergedDeps.browser;
  activeBrowserRef = browserRef;

  if (browserRef?.runtime?.onMessage?.addListener) {
    try {
      activeMessageListener = (msg, sender) => {
        if (msg && msg.type === 'FOE_INFO_NET_DATA' && msg.url && msg.body) {
          if (
            sender &&
            sender.tab &&
            sender.tab.id &&
            browserRef.devtools &&
            browserRef.devtools.inspectedWindow &&
            browserRef.devtools.inspectedWindow.tabId &&
            sender.tab.id !== browserRef.devtools.inspectedWindow.tabId
          ) {
            return;
          }
          let rawPost = msg.postData;
          let postText =
            typeof rawPost === 'string' ? rawPost
            : rawPost ? JSON.stringify(rawPost)
            : null;
          if (postText === '{}' || postText === '[]') {
            postText = null;
          }
          const requestPayload =
            msg.request || (postText ? { postData: { text: postText } } : null);
          handleRawNetworkEntry(
            msg.url,
            [],
            msg.body,
            '',
            requestPayload,
            activeDeps,
          );
        }
      };
      browserRef.runtime.onMessage.addListener(activeMessageListener);
    } catch (e) {
      logger?.debug('Error attaching runtime onMessage listener', e);
    }
  }

  if (typeof window !== 'undefined') {
    window.handleRawNetworkEntry = (reqUrl, headers, body, encoding, request) =>
      handleRawNetworkEntry(
        reqUrl,
        headers,
        body,
        encoding,
        request,
        activeDeps,
      );
    window.handleRequestFinished = (request) =>
      handleRequestFinished(request, activeDeps);
  }

  return {
    handleRawNetworkEntry,
    handleRequestFinished,
    isDuplicatePayload,
    processContentDirect,
    safeProcessContent,
    clearDuplicatePayloadCache,
    unbind,
    greatBuildingsService: mergedDeps.greatBuildingsService,
    startupService: mergedDeps.startupService,
  };
}

if (typeof window !== 'undefined') {
  window.handleRawNetworkEntry =
    window.handleRawNetworkEntry || handleRawNetworkEntry;
  window.handleRequestFinished =
    window.handleRequestFinished || handleRequestFinished;
}

module.exports = {
  handleRawNetworkEntry,
  handleRequestFinished,
  isDuplicatePayload,
  processContentDirect,
  safeProcessContent,
  initNetworkListeners,
  unbind,
  clearDuplicatePayloadCache,
  processedPayloadCache,
  detectAndSyncWorldOrigin,
  getGameVersion,
  setGameVersion,
  getType,
  isFoeNetworkUrl,
  greatBuildingsService: defaultGreatBuildingsService,
  startupService: defaultStartupService,
};
module.exports.default = module.exports;
