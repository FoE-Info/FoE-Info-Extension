/**
 * rawDispatchPipeline.js
 *
 * Coordinates decoding, deduplication, payload correlation, direct metadata routing,
 * and batch execution for raw HTTP/XHR packets intercepted from the game client.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('RawDispatchPipeline');
} catch {}

const { extractRequestPayload } = require('./requestPayload.js');
const { routeDirectMetadata } = require('./directMetadata.js');
const { correlateRequestPayload } = require('./requestPayloadCorrelator.js');

/**
 * Executes full ingestion and routing pipeline for raw network payloads.
 *
 * @param {Object} dispatcher - The MessageDispatcher instance
 * @param {Object} params
 * @param {string} params.reqUrl
 * @param {string|Object} params.body
 * @param {string} [params.encoding='']
 * @param {Array} [params.headers=[]]
 * @param {Object} [params.request=null]
 * @returns {Promise<Object>}
 */
async function executeRawDispatch(dispatcher, params = {}) {
  const { reqUrl, body, encoding = '', headers = [], request = null } = params;

  if (!reqUrl || !body) {
    return { handled: false, reason: 'empty_input' };
  }

  let textBody;
  try {
    if (
      dispatcher.yieldParseThresholdBytes > 0 &&
      typeof body === 'string' &&
      body.length >= dispatcher.yieldParseThresholdBytes &&
      typeof dispatcher.yieldFn === 'function'
    ) {
      await dispatcher.yieldFn();
    }
    textBody = dispatcher.decodeBody(body, encoding);
  } catch (err) {
    console.error('[MessageDispatcher] Failed to decode body:', err);
    return { handled: false, error: 'decode_error', details: err };
  }

  const requestPayload = extractRequestPayload(request);

  if (dispatcher.isDuplicate(reqUrl, textBody, requestPayload)) {
    logger?.debug('Duplicate payload skipped', { reqUrl });
    return { handled: false, duplicate: true };
  }

  let parsed;
  try {
    parsed = await dispatcher.parsePayload(textBody);
  } catch (err) {
    console.error('[MessageDispatcher] Failed to parse JSON body:', err);
    return { handled: false, error: 'json_parse_error', details: err };
  }

  if (requestPayload) {
    await correlateRequestPayload(parsed, requestPayload, {
      yieldInterval: dispatcher.yieldInterval,
      yieldFn: dispatcher.yieldFn,
    });
  }

  const context = { reqUrl, headers, request, requestPayload };

  // Direct CDN metadata routing
  const direct = await routeDirectMetadata(dispatcher, {
    parsed,
    reqUrl,
    headers,
    request,
  });
  if (direct) return direct;

  const batchResult = await dispatcher.dispatchBatch(parsed, context);
  return { handled: true, duplicate: false, batchResult };
}

module.exports = {
  executeRawDispatch,
};
