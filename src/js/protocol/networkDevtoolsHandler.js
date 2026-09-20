/**
 * networkDevtoolsHandler.js
 *
 * Handles DevTools onRequestFinished events, extracts headers and version info,
 * and schedules payload decoding. Extracted from networkListener.js.
 */

const {
  getType,
  isFoeNetworkUrl,
  safeProcessContent,
} = require('./networkContentReader.js');
const { notifyGameVersionChange } = require('./gameVersionTracker.js');
const { processContentDirect } = require('./networkPacketDispatcher.js');

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('NetworkDevtoolsHandler');
} catch {}

/**
 * Handles a finished DevTools HAR request object, inspects content headers,
 * extracts client version, and safely schedules body decoding.
 *
 * @param {Object} request
 * @param {Object} [deps={}]
 */
function handleRequestFinished(request, deps = {}) {
  if (!request) return;
  const response = request.response || {};
  const responseHeaders = response.headers || [];
  const requestHeaders = (request.request && request.request.headers) || [];

  let contentType = '';
  const contentHeader = responseHeaders.find(
    (header) =>
      header && header.name && header.name.toLowerCase() === 'content-type',
  );

  if (contentHeader) {
    const getTypeFn = deps.getType || getType;
    contentType = getTypeFn(contentHeader.value);
  }

  const reqUrl =
    request.request && request.request.url ? request.request.url : '';
  if (isFoeNetworkUrl(reqUrl)) {
    const clientIdentHeader = requestHeaders.find(
      (header) =>
        header &&
        header.name &&
        header.name.toLowerCase() === 'client-identification',
    );

    if (clientIdentHeader && clientIdentHeader.value) {
      notifyGameVersionChange(clientIdentHeader.value.substr(8, 5), deps);
    }

    const processContent = (body, encoding) => {
      const dispatchFn = deps.processContentDirect || processContentDirect;
      return dispatchFn(
        reqUrl,
        body,
        encoding,
        request.request ? request.request.headers : [],
        request,
        deps,
      );
    };
    safeProcessContent(request, processContent);
  }
}

module.exports = {
  handleRequestFinished,
};
module.exports.default = module.exports;
