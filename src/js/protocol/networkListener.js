/**
 * networkListener.js
 *
 * Network packet interception, DevTools request routing, and payload deduplication.
 * Streamlined orchestrator delegating to specialized protocol modules.
 */

const {
  isDuplicatePayload,
  clearDuplicatePayloadCache,
} = require('./networkPayloadDeduplicator.js');
const {
  getGameVersion,
  setGameVersion,
  notifyGameVersionChange,
} = require('./gameVersionTracker.js');
const {
  safeProcessContent,
  getType,
  isFoeNetworkUrl,
} = require('./networkContentReader.js');
const { detectAndSyncWorldOrigin } = require('./networkWorldDetector.js');
const {
  processContentDirect: directDispatch,
} = require('./networkPacketDispatcher.js');
const {
  handleRequestFinished: devtoolsHandleFinished,
} = require('./networkDevtoolsHandler.js');

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

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('NetworkListener');
} catch {}

let activeDeps = {};
let firstRpcPacketIntercepted = false;

function getDeps(overrideDeps = {}) {
  return {
    storage: defaultStorage,
    setGameOrigin: defaultState?.setGameOrigin,
    setOptions: defaultShowOptions?.default || defaultShowOptions?.setOptions,
    applyCardVisibility: defaultCardVisibility?.applyCardVisibility,
    messageDispatcher: defaultMessageDispatcher,
    logRpcMessage: null,
    browser:
      typeof browser !== 'undefined' ? browser
      : typeof chrome !== 'undefined' ? chrome
      : null,
    ...activeDeps,
    ...overrideDeps,
  };
}

function processContentDirect(
  reqUrl,
  body,
  encoding,
  headers = [],
  request = null,
  deps = {},
) {
  const mergedDeps = getDeps(deps);
  return directDispatch(reqUrl, body, encoding, headers, request, mergedDeps);
}

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
  const mergedDeps = getDeps(deps);
  return devtoolsHandleFinished(request, {
    ...mergedDeps,
    processContentDirect: (url, body, enc, hdrs, req, d) =>
      processContentDirect(url, body, enc, hdrs, req, d || mergedDeps),
  });
}

function initNetworkListeners(deps = {}) {
  activeDeps = { ...activeDeps, ...deps };
  const mergedDeps = getDeps(deps);
  const browserRef = mergedDeps.browser;

  if (browserRef?.runtime?.onMessage?.addListener) {
    try {
      browserRef.runtime.onMessage.addListener((msg, sender) => {
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
      });
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
  clearDuplicatePayloadCache,
  getGameVersion,
  setGameVersion,
  getType,
};
module.exports.default = module.exports;
