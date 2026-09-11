/*
 * ________________________________________________________________
 * Copyright (C) 2022 FoE-Info - All Rights Reserved
 * this source-code uses a copy-left license
 *
 * you are welcome to contribute changes here:
 * https://github.com/FoE-Info/FoE-Info-Extension
 *
 * AGPL license info:
 * https://github.com/FoE-Info/FoE-Info-Extension/master/LICENSE.md
 * or else visit https://www.gnu.org/licenses/#AGPL
 * ________________________________________________________________
 */
import browser from 'webextension-polyfill';
import { createLogger, isDebugEnabled } from './utils/logger.js';

const devtoolsLogger = createLogger('DevTools');

let panelWindow = null;
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

function forwardOrBufferEntry(entry) {
  if (
    panelWindow &&
    typeof panelWindow.handleRawNetworkEntry === 'function' &&
    entry.body
  ) {
    try {
      if (isDebugEnabled()) {
        devtoolsLogger.debug('Forwarding raw network entry to panelWindow:', {
          url: entry.url,
          bodyLength: entry.body?.length,
        });
      }
      panelWindow.handleRawNetworkEntry(
        entry.url,
        entry.headers,
        entry.body,
        entry.encoding,
        entry.request,
      );
    } catch (e) {
      console.error('Error forwarding network entry to panelWindow:', e);
      panelWindow = null;
    }
  } else if (
    panelWindow &&
    typeof panelWindow.handleRequestFinished === 'function' &&
    entry.request
  ) {
    try {
      if (isDebugEnabled()) {
        devtoolsLogger.debug('Forwarding request to handleRequestFinished:', {
          url: entry.request?.request?.url,
        });
      }
      panelWindow.handleRequestFinished(entry.request);
    } catch (e) {
      console.error('Error forwarding request to handleRequestFinished:', e);
      panelWindow = null;
    }
  } else {
    if (isDebugEnabled()) {
      devtoolsLogger.debug('Buffering pending network entry:', {
        url: entry.url || entry.request?.request?.url,
        pendingCount: pendingEntries.length + 1,
      });
    }
    pendingEntries.push(entry);
    if (pendingEntries.length > 500) pendingEntries.shift();
  }
}

function flushPending() {
  if (!panelWindow || pendingEntries.length === 0) return;
  const toProcess = pendingEntries;
  pendingEntries = [];
  toProcess.forEach((entry) => {
    try {
      if (
        typeof panelWindow.handleRawNetworkEntry === 'function' &&
        entry.body
      ) {
        panelWindow.handleRawNetworkEntry(
          entry.url,
          entry.headers,
          entry.body,
          entry.encoding,
          entry.request,
        );
      } else if (
        typeof panelWindow.handleRequestFinished === 'function' &&
        entry.request
      ) {
        panelWindow.handleRequestFinished(entry.request);
      }
    } catch (e) {
      console.error('Error in flushPending:', e);
    }
  });
}

let firstRelevantRequestIntercepted = false;

// Create DevTools panel
browser.devtools.panels.create(EXT_NAME, null, 'panel.html').then((panel) => {
  panel.onShown.addListener((win) => {
    devtoolsLogger.info(
      `[TIMING:P1] DevTools panel.onShown fired | t = ${performance.now().toFixed(2)}ms`,
    );
    panelWindow = win;
    flushPending();
  });
  panel.onHidden.addListener(() => {
    panelWindow = null;
  });
});

if (typeof window !== 'undefined') {
  window.addEventListener('unload', () => {
    panelWindow = null;
    pendingEntries = [];
  });
}

// Pass network entries directly to panelWindow
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
