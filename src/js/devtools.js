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
      panelWindow.handleRawNetworkEntry(
        entry.url,
        entry.headers,
        entry.body,
        entry.encoding,
      );
    } catch (e) {
      console.error('Error forwarding network entry to panelWindow:', e);
    }
  } else if (
    panelWindow &&
    typeof panelWindow.handleRequestFinished === 'function' &&
    entry.request
  ) {
    try {
      panelWindow.handleRequestFinished(entry.request);
    } catch (e) {
      console.error('Error forwarding request to handleRequestFinished:', e);
    }
  } else {
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

// Create DevTools panel
browser.devtools.panels.create(EXT_NAME, null, 'panel.html').then((panel) => {
  panel.onShown.addListener((win) => {
    panelWindow = win;
    flushPending();
  });
});

// Pass network entries directly to panelWindow
browser.devtools.network.onRequestFinished.addListener((request) => {
  if (!isRelevantRequest(request)) return;

  const reqUrl = request.request?.url;
  const headers = request.request?.headers || [];

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
        request,
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
      request,
    });
  }
});
