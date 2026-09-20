/**
 * networkPacketDispatcher.js
 *
 * Dispatches captured raw HTTP/RPC network payloads to MessageDispatcher
 * and logs RPC execution telemetry. Extracted from networkListener.js.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('NetworkPacketDispatcher');
} catch {}

/**
 * Dispatches a raw packet body directly to the message dispatcher and logs results.
 *
 * @param {string} reqUrl
 * @param {string} body
 * @param {string} encoding
 * @param {Array} [headers=[]]
 * @param {Object} [request=null]
 * @param {Object} [deps={}]
 * @returns {Promise<Object|undefined>}
 */
async function processContentDirect(
  reqUrl,
  body,
  encoding = '',
  headers = [],
  request = null,
  deps = {},
) {
  if (!body) return;
  const dispatcher = deps.messageDispatcher;
  const logRpc = deps.logRpcMessage;

  try {
    if (dispatcher && typeof dispatcher.dispatchRaw === 'function') {
      const res = await dispatcher.dispatchRaw(
        reqUrl,
        body,
        encoding,
        headers,
        request,
      );
      if (res && res.batchResult && Array.isArray(res.batchResult.results)) {
        if (typeof logRpc === 'function') {
          for (const item of res.batchResult.results) {
            logRpc(item.message, !item.result?.unhandled && item.success);
          }
        }
      }
      return res;
    }
  } catch (err) {
    logger?.error('Error in processContentDirect dispatch:', err);
    console.error('Error in processContentDirect dispatch:', err);
  }
}

module.exports = {
  processContentDirect,
};
module.exports.default = module.exports;
