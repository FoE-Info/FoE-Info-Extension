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
  // Session teardown invalidates any in-flight dispatches.
  advanceDispatchGeneration();
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

// --- Origin Validation (shared intake policy, §2.1) ---
// The pure policy lives in the LEAF module src/js/utils/intakePolicy.js so
// entry points that only need the URL predicate (src/js/devtools.js) do not
// pull this dispatcher module's dependency subgraph. All symbols are
// re-exported below to keep every existing consumer and test path unchanged.
const {
  GAME_API_PATH_PREFIXES,
  FOE_GAME_HOST,
  FOE_CDN_METADATA_HOSTS,
  evaluateRequestOrigin,
  isFoeNetworkUrl,
  evaluateDispatchToken,
  stampNextDispatchToken,
  nextDispatchSequence,
  currentDispatchGeneration,
  advanceDispatchGeneration,
  syncDispatchGeneration,
  resetDispatchOrdering,
} = require('../utils/intakePolicy.js');

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

  const originVerdict = evaluateRequestOrigin(reqUrl, deps);
  if (!originVerdict.accepted) {
    logger?.debug('Rejected network entry from unrelated inspected origin', {
      reqUrl,
      reason: originVerdict.reason,
    });
    return { accepted: false, reason: originVerdict.reason };
  }
  return { accepted: true, kind: originVerdict.kind };
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

// §4: cross-batch dispatch ordering.
//
// A body at or above the dispatcher's yieldParseThresholdBytes (50 KiB by
// default) yields the event loop before it is parsed
// (rawDispatchPipeline.js), so a later small response can finish parsing and
// commit first, overwriting state the earlier packet carried. Sequencing is
// therefore a property of ADMISSION, not of parsing: every admitted dispatch is
// chained here in the order it was admitted, and the next link does not start
// until the previous one has settled.
//
// Tradeoff, stated rather than hidden: one large parse now delays the small
// packets behind it. That is a latency cost, bounded by a single parse, and it
// buys commits that cannot overtake one another.
//
// A sequence-keyed reorder buffer was tried and reverted. A buffer needs
// gap handling (a sequence that never arrives
// stalls it) and a generation bump is not a reliable rescue, because
// rawDispatchPipeline returns early for empty_input, decode_error, duplicate
// and json_parse_error. A chain has no gaps: every link settles.
let dispatchOrderChain = Promise.resolve();

/**
 * Runs `task` after every previously enqueued dispatch has settled.
 *
 * The chain itself must never reject, or one failed link would poison every
 * dispatch behind it. Errors are handed back to the caller through the
 * returned promise; the chain absorbs them.
 *
 * @param {() => Promise<*>} task
 * @returns {Promise<*>} the value `task` resolved to
 */
function enqueueOrderedDispatch(task) {
  const result = dispatchOrderChain.then(task, task);
  dispatchOrderChain = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
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
  token = null,
) {
  if (!body) return;
  const mergedDeps = getDeps(deps);
  const dispatcher = mergedDeps.messageDispatcher;
  const logRpc = mergedDeps.logRpcMessage;

  // §4: verify the dispatch token is still current before any state-mutating
  // commit; work admitted under a superseded world/session generation is dropped.
  const verdict = evaluateDispatchToken(token, currentDispatchGeneration());
  if (verdict.dropped) {
    logger?.debug('Dropping stale dispatch token', {
      reqUrl,
      admittedGeneration: token.generation,
      admittedSequence: token.sequence,
      currentGeneration: currentDispatchGeneration(),
      reason: verdict.reason,
    });
    return { dropped: true, stale: true, reason: verdict.reason };
  }

  try {
    if (dispatcher && typeof dispatcher.dispatchRaw === 'function') {
      const res = await enqueueOrderedDispatch(async () => {
        // Re-check the generation at execution time, not only at admission: a
        // world switch while this dispatch sat in the chain must drop it
        // rather than commit another world's state.
        const atRun = evaluateDispatchToken(token, currentDispatchGeneration());
        if (atRun.dropped) {
          logger?.debug('Dropping stale dispatch token at execution', {
            reqUrl,
            admittedGeneration: token?.generation,
            admittedSequence: token?.sequence,
            currentGeneration: currentDispatchGeneration(),
            reason: atRun.reason,
          });
          return { dropped: true, stale: true, reason: atRun.reason };
        }
        const dispatched = await dispatcher.dispatchRaw(
          reqUrl,
          body,
          encoding,
          headers,
          request,
        );
        if (
          dispatched &&
          dispatched.batchResult &&
          Array.isArray(dispatched.batchResult.results) &&
          typeof logRpc === 'function'
        ) {
          for (const item of dispatched.batchResult.results) {
            logRpc(item.message, !item.result?.unhandled && item.success);
          }
        }
        return dispatched;
      });
      return res;
    }
  } catch (err) {
    logger?.error('Error in processContentDirect dispatch:', err);
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
    // §4: a world switch invalidates dispatches admitted under prior worlds.
    if (worldCheck.detectedWorld) {
      syncDispatchGeneration(worldCheck.detectedWorld);
    }
    processContentDirect(
      reqUrl,
      body,
      encoding || '',
      headers || [],
      request,
      mergedDeps,
      stampNextDispatchToken(currentDispatchGeneration()),
    );
  } else {
    logger?.debug('Rejected network entry at shared intake', {
      reqUrl,
      reason: evaluateRequestOrigin(reqUrl).reason,
    });
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
        stampNextDispatchToken(currentDispatchGeneration()),
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
    processContentDirect,
    safeProcessContent,
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
  processContentDirect,
  safeProcessContent,
  initNetworkListeners,
  unbind,
  detectAndSyncWorldOrigin,
  getGameVersion,
  setGameVersion,
  getType,
  isFoeNetworkUrl,
  evaluateRequestOrigin,
  evaluateDispatchToken,
  stampNextDispatchToken,
  nextDispatchSequence,
  syncDispatchGeneration,
  advanceDispatchGeneration,
  resetDispatchOrdering,
  greatBuildingsService: defaultGreatBuildingsService,
  startupService: defaultStartupService,
};
module.exports.default = module.exports;
