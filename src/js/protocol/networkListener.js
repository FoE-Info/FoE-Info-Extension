/**
 * networkListener.js
 *
 * Network packet interception, DevTools request routing, and payload deduplication.
 * Decoupled from index.js monolith.
 */

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

let appendGameVersionStatus = null;
try {
  const versionStatus = require('../ui/gameVersionStatus.js');
  if (typeof versionStatus.appendGameVersionStatus === 'function') {
    appendGameVersionStatus = versionStatus.appendGameVersionStatus;
  }
} catch {}

let activeDeps = {};
let currentGameVersion = 0;
const processedPayloadCache = new Map();
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

function getType(type) {
  if (!type || typeof type !== 'string') return '';
  return type.replace(/.*(javascript|image|html|font|json|css|text).*/g, '$1');
}

function isDuplicatePayload(reqUrl, textBody) {
  if (!reqUrl || !textBody) return false;
  const sample = typeof textBody === 'string' ? textBody.slice(0, 100) : '';
  const len = typeof textBody === 'string' ? textBody.length : 0;
  const key = `${reqUrl}:${len}:${sample}`;
  const now = Date.now();
  if (processedPayloadCache.has(key)) {
    const lastTime = processedPayloadCache.get(key);
    if (now - lastTime < 3000) {
      return true;
    }
  }
  processedPayloadCache.set(key, now);
  if (processedPayloadCache.size > 300) {
    const firstKey = processedPayloadCache.keys().next().value;
    processedPayloadCache.delete(firstKey);
  }
  return false;
}

function clearDuplicatePayloadCache() {
  processedPayloadCache.clear();
}

function getGameVersion() {
  return currentGameVersion;
}

function setGameVersion(version) {
  currentGameVersion = version;
}

function notifyGameVersionChange(newVersion, deps) {
  const currentVersion =
    typeof deps.getGameVersion === 'function' ?
      deps.getGameVersion()
    : currentGameVersion;
  if (currentVersion != newVersion) {
    currentGameVersion = newVersion;
    if (typeof deps.setGameVersion === 'function') {
      deps.setGameVersion(newVersion);
    }
    if (typeof deps.onGameVersionChange === 'function') {
      deps.onGameVersionChange(newVersion);
    } else if (
      deps.citystats &&
      typeof appendGameVersionStatus === 'function'
    ) {
      appendGameVersionStatus(deps.citystats, {
        version: newVersion,
        extName: deps.extName || 'FoE-Info',
        toolVersion: deps.toolVersion || '',
      });
    }
  }
}

async function processContentDirect(
  reqUrl,
  body,
  encoding,
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
    console.error('Error in processContentDirect dispatch:', err);
  }
}

function safeProcessContent(request, processContent) {
  if (!request || typeof request.getContent !== 'function') return;
  try {
    let called = false;
    const safeProcess = (content, encoding) => {
      if (called) return;
      if (!content) {
        setTimeout(() => {
          if (called) return;
          try {
            let p;
            try {
              p = request.getContent();
            } catch (e) {
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
          } catch (e) {}
        }, 150);
        return;
      }
      called = true;
      processContent(content, encoding);
    };

    let res;
    try {
      res = request.getContent();
    } catch (err) {
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
        .catch((err) => console.error('getContent promise error', err));
    }
  } catch (e) {
    console.error('Error in safeProcessContent', e);
  }
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

  const originMatch = reqUrl.match(/^(https?:\/\/[^/]+)/i);
  if (originMatch) {
    const worldMatch = originMatch[1].match(
      /https?:\/\/([a-z]+[1-9][0-9]*)\.forgeofempires\.com/i,
    );
    if (worldMatch && worldMatch[1]) {
      const detectedWorld = worldMatch[1].toLowerCase();
      const inspectedWorld =
        typeof mergedDeps.getInspectedWorldId === 'function' ?
          mergedDeps.getInspectedWorldId()
        : (mergedDeps.inspectedWorldId ?? null);
      if (inspectedWorld && detectedWorld !== inspectedWorld) {
        if (inspectedWorld.endsWith('0') || inspectedWorld === 'www') {
          if (typeof mergedDeps.setInspectedWorldId === 'function') {
            mergedDeps.setInspectedWorldId(detectedWorld);
          }
        } else {
          return;
        }
      }
      if (typeof mergedDeps.setGameOrigin === 'function') {
        mergedDeps.setGameOrigin(originMatch[1]);
      }
      const storage = mergedDeps.storage;
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
                  typeof mergedDeps.setOptions === 'function'
                ) {
                  mergedDeps.setOptions(
                    'showOptions',
                    worldSettings.showOptions,
                  );
                  if (typeof mergedDeps.applyCardVisibility === 'function') {
                    mergedDeps.applyCardVisibility();
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
    }
  }

  if (
    reqUrl.includes('/game/json') ||
    reqUrl.includes('metadata?id=') ||
    reqUrl.includes('/metadata') ||
    reqUrl.includes('/start/metadata')
  ) {
    if (!firstRpcPacketIntercepted) {
      firstRpcPacketIntercepted = true;
      logger?.info(
        `[TIMING:P3] NetworkListener first RPC packet received/dispatched | t = ${performance.now().toFixed(2)}ms | url = ${reqUrl}`,
      );
    }
    const contentTypeHeader = (headers || []).find(
      (h) => h && h.name && h.name.toLowerCase() === 'client-identification',
    );
    if (contentTypeHeader && contentTypeHeader.value) {
      notifyGameVersionChange(contentTypeHeader.value.substr(8, 5), mergedDeps);
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
  const response = request.response || {};
  const responseHeaders = response.headers || [];
  const requestHeaders = (request.request && request.request.headers) || [];

  let contentType = '';
  const contentHeader = responseHeaders.find(
    (header) =>
      header && header.name && header.name.toLowerCase() === 'content-type',
  );

  if (contentHeader) {
    const getTypeFn = mergedDeps.getType || getType;
    contentType = getTypeFn(contentHeader.value);
  }

  const reqUrl =
    request.request && request.request.url ? request.request.url : '';
  if (
    reqUrl.includes('/game/json') ||
    reqUrl.includes('metadata?id=') ||
    reqUrl.includes('/metadata') ||
    reqUrl.includes('/start/metadata')
  ) {
    const clientIdentHeader = requestHeaders.find(
      (header) =>
        header &&
        header.name &&
        header.name.toLowerCase() === 'client-identification',
    );

    if (clientIdentHeader && clientIdentHeader.value) {
      notifyGameVersionChange(clientIdentHeader.value.substr(8, 5), mergedDeps);
    }

    const processContent = (body, encoding) =>
      processContentDirect(
        reqUrl,
        body,
        encoding,
        request.request ? request.request.headers : [],
        request,
        mergedDeps,
      );
    safeProcessContent(request, processContent);
  }
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
    } catch (e) {}
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
