/**
 * webRequestFilter.js
 *
 * Strips origin headers from extension requests to InnoGames CDNs
 * so requests appear indistinguishable from standard browser page requests.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('WebRequestFilter');
} catch {
  logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}

/**
 * Checks if an HTTP header is an Origin header set by a browser extension.
 * @param {Object} header - An HTTP header object with name and value.
 * @returns {boolean} True if the header is an extension origin header.
 */
function originWithId(header) {
  if (!header || !header.name) return false;
  const name = String(header.name).toLowerCase();
  const value = String(header.value || '');
  return (
    name === 'origin' &&
    (value.indexOf('moz-extension://') === 0 ||
      value.indexOf('chrome-extension://') === 0)
  );
}

/**
 * Registers a webRequest listener to strip extension origin headers from CDN requests.
 * @param {Object} [chromeInstance] - Optional chrome API object (defaults to global chrome).
 * @returns {boolean} True if listener was registered successfully.
 */
function initWebRequestFilter(
  chromeInstance = typeof chrome !== 'undefined' ? chrome : null,
) {
  if (
    chromeInstance &&
    chromeInstance.webRequest &&
    chromeInstance.webRequest.onBeforeSendHeaders
  ) {
    try {
      chromeInstance.webRequest.onBeforeSendHeaders.addListener(
        (details) => {
          logger.debug('Filtering CDN request headers', { url: details?.url });
          return {
            requestHeaders: (details.requestHeaders || []).filter(
              (x) => !originWithId(x),
            ),
          };
        },
        { urls: ['https://*.innogamescdn.com/*'] },
        ['requestHeaders'],
      );
      logger.debug('WebRequest origin filter registered successfully');
      return true;
    } catch (e) {
      logger.warn('Failed to register webRequest filter:', e);
      return false;
    }
  }
  return false;
}

module.exports = {
  originWithId,
  initWebRequestFilter,
};
module.exports.default = module.exports;
