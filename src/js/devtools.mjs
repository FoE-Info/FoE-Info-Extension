/** DevTools panel registration and lifecycle bootstrap. */
import browser from 'webextension-polyfill';
import {
  createHostMessageHandler,
  MESSAGE_TYPES,
  postNetworkEntry,
  postRequestFinished,
  postToWindow,
} from './protocol/devtoolsBridge.js';
// Import from the LEAF intake-policy module, NOT protocol/networkListener.js:
// the devtools page bundle must not statically include the message-dispatcher
// dependency subgraph just to evaluate one URL predicate.
import { evaluateRequestOrigin } from './utils/intakePolicy.js';
import { isInventoryAsset } from './utils/inventorySignal.js';
import { createLogger, isDebugEnabled } from './utils/logger.js';

const devtoolsLogger = createLogger('DevTools');

let panelWindow = null;
let panelReady = false;
let pendingEntries = [];

function isRelevantRequest(request) {
  if (!request || !request.request || !request.request.url) return false;
  const verdict = evaluateRequestOrigin(request.request.url);
  if (!verdict.accepted) {
    // §2.1: response bodies from unrelated/attacker-controlled inspected
    // origins must never reach the dispatcher-side intake.
    devtoolsLogger.debug('Dropping network entry from untrusted origin', {
      url: request.request.url,
      reason: verdict.reason || 'unknown',
    });
    return false;
  }
  return true;
}

function deliverEntry(entry) {
  if (!panelWindow || typeof panelWindow.postMessage !== 'function') {
    return false;
  }
  if (entry.body || isInventoryAsset(entry.url)) {
    return postNetworkEntry(panelWindow, {
      url: entry.url,
      headers: entry.headers,
      body: entry.body,
      encoding: entry.encoding,
      request: entry.request,
    });
  }
  if (entry.request) {
    return postRequestFinished(panelWindow, entry.request);
  }
  return false;
}

function bufferEntry(entry) {
  if (isDebugEnabled()) {
    devtoolsLogger.debug('Buffering pending network entry:', {
      url: entry.url || entry.request?.request?.url,
      pendingCount: pendingEntries.length + 1,
    });
  }
  pendingEntries.push(entry);
  if (pendingEntries.length > 500) pendingEntries.shift();
}

function forwardOrBufferEntry(entry) {
  if (
    panelWindow &&
    typeof panelWindow.postMessage === 'function' &&
    panelReady &&
    (entry.body || entry.request || isInventoryAsset(entry.url))
  ) {
    try {
      if (isDebugEnabled()) {
        devtoolsLogger.debug('Forwarding network entry to panel:', {
          url: entry.url,
          bodyLength: entry.body?.length,
        });
      }
      if (!deliverEntry(entry)) {
        panelWindow = null;
        panelReady = false;
        bufferEntry(entry);
      }
    } catch (e) {
      console.error('Error forwarding network entry to panel:', e);
      panelWindow = null;
      panelReady = false;
      bufferEntry(entry);
    }
    return;
  }
  bufferEntry(entry);
}

function flushPending() {
  if (
    !panelWindow ||
    typeof panelWindow.postMessage !== 'function' ||
    !panelReady ||
    pendingEntries.length === 0
  ) {
    return;
  }
  const toProcess = pendingEntries;
  pendingEntries = [];
  toProcess.forEach((entry) => {
    try {
      deliverEntry(entry);
    } catch (e) {
      console.error('Error in flushPending:', e);
    }
  });
}

let hostMessageHandler = null;
if (typeof window !== 'undefined') {
  hostMessageHandler = createHostMessageHandler({
    getPanelWindow: () => panelWindow,
    onReady: (source) => {
      if (source && typeof source.postMessage === 'function') {
        panelWindow = source;
        panelReady = true;
        flushPending();
      }
    },
  });
  window.addEventListener('message', hostMessageHandler);
}

let firstRelevantRequestIntercepted = false;

// Create DevTools panel
browser.devtools.panels.create(EXT_NAME, null, 'panel.html').then((panel) => {
  panel.onShown.addListener((win) => {
    devtoolsLogger.info(
      `[TIMING:P1] DevTools panel.onShown fired | t = ${performance.now().toFixed(2)}ms`,
    );
    panelWindow = win;
    panelReady = false;
    // Re-handshake on every show: the panel page persists across hide/show, so
    // the single proactive READY may already have fired.
    postToWindow(win, MESSAGE_TYPES.HOST_PING);
  });
  panel.onHidden.addListener(() => {
    panelWindow = null;
    panelReady = false;
  });
});

if (typeof window !== 'undefined') {
  window.addEventListener('unload', () => {
    if (hostMessageHandler) {
      window.removeEventListener('message', hostMessageHandler);
      hostMessageHandler = null;
    }
    panelWindow = null;
    panelReady = false;
    pendingEntries = [];
  });
}

// Pass network entries directly to the panel via the structured channel
browser.devtools.network.onRequestFinished.addListener((request) => {
  const inventoryUrl = request?.request?.url;
  if (isInventoryAsset(inventoryUrl)) {
    // Only the URL is needed as an opening hint; never read atlas bodies.
    forwardOrBufferEntry({
      url: inventoryUrl,
      headers: [],
      body: null,
      encoding: '',
    });
    return;
  }
  if (!isRelevantRequest(request)) return;

  if (!firstRelevantRequestIntercepted) {
    firstRelevantRequestIntercepted = true;
    devtoolsLogger.info(
      `[TIMING:P3] DevTools first relevant network entry intercepted | t = ${performance.now().toFixed(2)}ms | url = ${request.request?.url}`,
    );
  }

  const reqUrl = request.request?.url;
  const headers = request.request?.headers || [];

  const extractEntryRequest = () => {
    let postText =
      request.request?.postData?.text ||
      (typeof request.request?.postData === 'string' ?
        request.request.postData
      : null);
    if (postText === '{}' || postText === '[]') {
      postText = null;
    }
    return {
      url: reqUrl,
      method: request.request?.method || 'GET',
      headers,
      postData: { text: postText },
      request: {
        url: reqUrl,
        method: request.request?.method || 'GET',
        headers,
        postData: { text: postText },
      },
    };
  };

  try {
    let handled = false;
    const handleContent = (content, encoding) => {
      if (handled) return;
      handled = true;
      forwardOrBufferEntry({
        url: reqUrl,
        headers,
        body: content,
        encoding: encoding || '',
        request: extractEntryRequest(),
      });
    };

    let res;
    try {
      res = request.getContent(handleContent);
    } catch {
      handleContent(null, '');
    }

    if (res && typeof res.then === 'function') {
      res
        .then((result) => {
          const [content, encoding] =
            Array.isArray(result) ? result : [result, ''];
          handleContent(content, encoding);
        })
        .catch(() => {
          handleContent(null, '');
        });
    }
  } catch {
    forwardOrBufferEntry({
      url: reqUrl,
      headers,
      body: null,
      encoding: '',
      request: extractEntryRequest(),
    });
  }
});
