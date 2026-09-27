/**
 * Structured postMessage channel between the DevTools page and the panel iframe.
 * Replaces the direct `panelWindow.handleRawNetworkEntry` global attachment with
 * an explicit, versioned message envelope plus a readiness handshake.
 */
const { createLogger } = require('../utils/logger.js');

const logger = createLogger('DevtoolsBridge');

const CHANNEL = 'foe-info-devtools';
const MESSAGE_TYPES = {
  HOST_PING: 'host-ping',
  READY: 'panel-ready',
  RAW_NETWORK_ENTRY: 'raw-network-entry',
  REQUEST_FINISHED: 'request-finished',
};

/**
 * Resolve the one origin both ends of this channel live on.
 *
 * The DevTools page and the panel iframe are both extension pages, so
 * `chrome.runtime.getURL('')` names the origin that is correct for every
 * message on this channel. A `'*'` targetOrigin is not a safe default here:
 * it hands intercepted game traffic to whatever origin the receiving window
 * is on, which is exactly the unknown-window case the handshake refuses.
 *
 * @returns {string|null} the extension origin, or null when unavailable —
 *   callers must fail closed rather than guess.
 */
function extensionOrigin() {
  try {
    const base = globalThis.chrome?.runtime?.getURL?.('');
    if (typeof base === 'string' && base.startsWith('chrome-extension://')) {
      return base.replace(/\/+$/, '');
    }
  } catch (err) {
    logger.warn('could not resolve the extension origin', err);
  }
  return null;
}

function postToWindow(targetWindow, type, payload = {}) {
  if (!targetWindow || typeof targetWindow.postMessage !== 'function') {
    return false;
  }
  const targetOrigin = extensionOrigin();
  if (!targetOrigin) {
    logger.warn('dropping bridge message: extension origin unresolved', {
      type,
    });
    return false;
  }
  try {
    targetWindow.postMessage({ source: CHANNEL, type, payload }, targetOrigin);
    return true;
  } catch (err) {
    logger.warn('postMessage failed', err);
    return false;
  }
}

function postNetworkEntry(targetWindow, entry = {}) {
  return postToWindow(targetWindow, MESSAGE_TYPES.RAW_NETWORK_ENTRY, {
    url: entry.url,
    headers: entry.headers,
    body: entry.body,
    encoding: entry.encoding,
    request: entry.request,
  });
}

function postRequestFinished(targetWindow, request) {
  return postToWindow(targetWindow, MESSAGE_TYPES.REQUEST_FINISHED, {
    request,
  });
}

/**
 * Host (DevTools page) side handshake. Returns a `message` event handler that
 * invokes `onReady(source)` once the panel announces itself.
 *
 * Fails CLOSED: the panel window is only ever learned from
 * `browser.devtools.panels.onShown`, so a READY is trustworthy only when it
 * comes from that exact window. Adopting an unknown sender would hand the
 * intercepted game traffic to whichever window asked first. `onShown`
 * re-pings on every show, so a dropped unsolicited READY is recovered.
 */
function createHostMessageHandler({ getPanelWindow, onReady } = {}) {
  return (event) => {
    const data = event?.data;
    if (!data || data.source !== CHANNEL) return;
    if (data.type !== MESSAGE_TYPES.READY) return;
    const panelWindow =
      typeof getPanelWindow === 'function' ? getPanelWindow() : null;
    if (!panelWindow || event.source !== panelWindow) {
      logger.warn('ignoring READY from an unknown window', {
        known: Boolean(panelWindow),
        matches: Boolean(panelWindow) && event.source === panelWindow,
      });
      return;
    }
    logger.debug('panel bridge ready');
    if (typeof onReady === 'function') onReady(event.source);
  };
}

/**
 * Panel (index.js) side. Installs the message listener, routes envelopes to the
 * supplied handlers, answers host pings, and announces readiness to the parent
 * DevTools window.
 */
function installPanelBridge(targetWindow, handlers = {}) {
  if (!targetWindow || typeof targetWindow.addEventListener !== 'function') {
    return () => {};
  }

  const announceReady = () => {
    const parent = targetWindow.parent;
    if (parent && parent !== targetWindow) {
      postToWindow(parent, MESSAGE_TYPES.READY);
    }
  };

  const onMessage = (event) => {
    const data = event?.data;
    if (!data || data.source !== CHANNEL) return;
    // The only legitimate sender is the DevTools page that embeds this panel
    // iframe. `event.source` is set by the browser and cannot be spoofed by the
    // sender, so this is the authenticated half of the relationship — a
    // same-channel string from any other window is not evidence of anything.
    const parent = targetWindow.parent;
    if (parent && parent !== targetWindow && event.source !== parent) {
      logger.warn('ignoring bridge message from a non-parent window');
      return;
    }
    const payload = data.payload || {};
    if (data.type === MESSAGE_TYPES.RAW_NETWORK_ENTRY) {
      if (typeof handlers.handleRawNetworkEntry === 'function') {
        handlers.handleRawNetworkEntry(
          payload.url,
          payload.headers,
          payload.body,
          payload.encoding,
          payload.request,
        );
      }
    } else if (data.type === MESSAGE_TYPES.REQUEST_FINISHED) {
      if (typeof handlers.handleRequestFinished === 'function') {
        handlers.handleRequestFinished(payload.request);
      }
    } else if (data.type === MESSAGE_TYPES.HOST_PING) {
      announceReady();
    }
  };

  targetWindow.addEventListener('message', onMessage);
  announceReady();

  return () => targetWindow.removeEventListener('message', onMessage);
}

module.exports = {
  CHANNEL,
  MESSAGE_TYPES,
  extensionOrigin,
  postToWindow,
  postNetworkEntry,
  postRequestFinished,
  createHostMessageHandler,
  installPanelBridge,
};
module.exports.default = module.exports;
