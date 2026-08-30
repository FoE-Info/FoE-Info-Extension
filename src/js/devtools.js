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
let pendingRequests = [];

function isRelevantRequest(request) {
  if (!request || !request.request || !request.request.url) return false;
  return request.request.url.includes('/game/json');
}

function flushPending() {
  if (
    panelWindow &&
    typeof panelWindow.handleRequestFinished === 'function' &&
    pendingRequests.length > 0
  ) {
    const toProcess = pendingRequests;
    pendingRequests = [];
    toProcess.forEach((req) => {
      try {
        panelWindow.handleRequestFinished(req);
      } catch (e) {
        console.error('Error in handleRequestFinished:', e);
      }
    });
  }
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
  pendingRequests.push(request);
  if (pendingRequests.length > 500) pendingRequests.shift();
  flushPending();
});
