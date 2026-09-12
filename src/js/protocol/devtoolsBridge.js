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

function postToWindow(targetWindow, type, payload = {}) {
  if (!targetWindow || typeof targetWindow.postMessage !== 'function') {
    return false;
  }
  try {
    targetWindow.postMessage({ source: CHANNEL, type, payload }, '*');
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
 */
function createHostMessageHandler({ getPanelWindow, onReady } = {}) {
  return (event) => {
    const data = event?.data;
    if (!data || data.source !== CHANNEL) return;
    const panelWindow =
      typeof getPanelWindow === 'function' ? getPanelWindow() : null;
    if (panelWindow && event.source && event.source !== panelWindow) {
      return;
    }
    if (data.type === MESSAGE_TYPES.READY) {
      logger.debug('panel bridge ready');
      if (typeof onReady === 'function') onReady(event.source);
    }
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
  postToWindow,
  postNetworkEntry,
  postRequestFinished,
  createHostMessageHandler,
  installPanelBridge,
};
module.exports.default = module.exports;
