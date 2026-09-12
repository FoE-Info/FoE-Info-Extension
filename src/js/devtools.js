/** DevTools panel registration and lifecycle bootstrap. */
import browser from 'webextension-polyfill';
import {
  createHostMessageHandler,
  MESSAGE_TYPES,
  postNetworkEntry,
  postRequestFinished,
  postToWindow,
} from './protocol/devtoolsBridge.js';
import { createLogger, isDebugEnabled } from './utils/logger.js';

const devtoolsLogger = createLogger('DevTools');

let panelWindow = null;
let panelReady = false;
let pendingEntries = [];

function isRelevantRequest(request) {
  if (!request || !request.request || !request.request.url) return false;
  const url = request.request.url;
  return (
    url.includes('/game/json') ||
    url.includes('metadata?id=') ||
    url.includes('/metadata') ||
    url.includes('/start/metadata')
  );
}

function deliverEntry(entry) {
  if (entry.body) {
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
  if (panelWindow && panelReady && (entry.body || entry.request)) {
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
  if (!panelWindow || !panelReady || pendingEntries.length === 0) return;
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

if (typeof window !== 'undefined') {
  window.addEventListener(
    'message',
    createHostMessageHandler({
      getPanelWindow: () => panelWindow,
      onReady: (source) => {
        if (source) panelWindow = source;
        panelReady = true;
        flushPending();
      },
    }),
  );
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
    panelWindow = null;
    panelReady = false;
    pendingEntries = [];
  });
}

// Pass network entries directly to the panel via the structured channel
browser.devtools.network.onRequestFinished.addListener((request) => {
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
    } catch (e) {
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
  } catch (err) {
    forwardOrBufferEntry({
      url: reqUrl,
      headers,
      body: null,
      encoding: '',
      request: extractEntryRequest(),
    });
  }
});
