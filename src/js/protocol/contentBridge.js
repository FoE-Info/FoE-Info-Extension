/** MV3 content-script bridge forwarding page network messages to the panel. */
import browser from 'webextension-polyfill';
import { createLogger, setDebugEnabled } from '../utils/logger.js';

// In ISOLATED world: Forward window messages to Extension panel script
if (typeof window !== 'undefined' && !window.__foe_info_bridge_active) {
  window.__foe_info_bridge_active = true;
  const initializedAt = performance.now();
  const logger = createLogger('ContentBridge');

  let debugEnabled = false;

  function syncDebug(enabled) {
    debugEnabled = Boolean(enabled);
    setDebugEnabled(debugEnabled, { persist: false });
    logger.info(
      `[TIMING:P2] Content bridge initialized and active | t = ${initializedAt.toFixed(2)}ms`,
    );
    window.postMessage(
      {
        type: 'FOE_INFO_DEBUG_SYNC',
        enabled: debugEnabled,
      },
      window.location.origin,
    );
  }

  if (browser?.storage?.local) {
    browser.storage.local
      .get('debugEnabled')
      .then((res) => {
        if (res && typeof res.debugEnabled === 'boolean') {
          syncDebug(res.debugEnabled);
        }
      })
      .catch(() => {});

    browser.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.debugEnabled) {
        syncDebug(changes.debugEnabled.newValue);
      }
    });
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window || event.origin !== window.location.origin)
      return;
    if (
      event.data &&
      event.data.type === 'FOE_INFO_XHR' &&
      typeof event.data.url === 'string' &&
      typeof event.data.body === 'string'
    ) {
      if (debugEnabled) {
        logger.debug(
          'Forwarding network event:',
          event.data.url,
          'Payload size:',
          event.data.body.length,
        );
      }
      let postData = event.data.postData;
      if (postData && typeof postData !== 'string') {
        try {
          if (postData instanceof ArrayBuffer) {
            postData = new TextDecoder('utf-8').decode(postData);
          } else if (ArrayBuffer.isView(postData)) {
            postData = new TextDecoder('utf-8').decode(postData);
          } else if (
            typeof postData === 'object' &&
            Object.keys(postData).length === 0
          ) {
            postData = null;
          } else {
            postData = JSON.stringify(postData);
          }
        } catch {
          postData = null;
        }
      }
      if (postData === '{}') {
        postData = null;
      }
      try {
        browser.runtime
          .sendMessage({
            type: 'FOE_INFO_NET_DATA',
            url: event.data.url,
            body: event.data.body,
            postData,
          })
          .catch(() => {});
      } catch (e) {}
    }
  });
}
