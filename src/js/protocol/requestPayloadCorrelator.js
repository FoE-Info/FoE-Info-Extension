/**
 * requestPayloadCorrelator.js
 *
 * Correlates outgoing client request payloads with incoming server response messages.
 * Matches by requestId, positional index, or class/method signatures, and attaches
 * requestData onto messages for downstream processing.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('RequestPayloadCorrelator');
} catch {}

/**
 * Correlates request items with parsed response messages.
 * @param {Array<Object>|Object} parsed
 * @param {Array<Object>|Object} requestPayload
 * @param {Object} [options]
 * @param {number} [options.yieldInterval=10]
 * @param {Function} [options.yieldFn]
 * @returns {Promise<void>}
 */
async function correlateRequestPayload(parsed, requestPayload, options = {}) {
  if (!parsed || !requestPayload) return;

  const reqItems =
    Array.isArray(requestPayload) ? requestPayload : [requestPayload];
  const parsedItems = Array.isArray(parsed) ? parsed : [parsed];

  const yieldInterval =
    typeof options.yieldInterval === 'number' ? options.yieldInterval : 10;
  const yieldFn =
    typeof options.yieldFn === 'function' ? options.yieldFn : null;

  for (let i = 0; i < parsedItems.length; i++) {
    if (yieldInterval > 0 && i > 0 && i % yieldInterval === 0 && yieldFn) {
      await yieldFn();
    }
    const msg = parsedItems[i];
    if (!msg || typeof msg !== 'object') continue;

    let match = null;
    if (msg.requestId !== undefined) {
      match = reqItems.find((r) => r && r.requestId === msg.requestId);
    }
    if (
      !match &&
      reqItems[i] &&
      (reqItems[i].requestClass === msg.requestClass || !msg.requestClass)
    ) {
      match = reqItems[i];
    }
    if (!match) {
      match = reqItems.find(
        (r) =>
          r &&
          r.requestClass === msg.requestClass &&
          r.requestMethod === msg.requestMethod,
      );
    }
    if (!match && reqItems.length === 1) {
      match = reqItems[0];
    }

    if (match) {
      if (!msg.requestClass && match.requestClass) {
        msg.requestClass = match.requestClass;
      }
      if (!msg.requestMethod && match.requestMethod) {
        msg.requestMethod = match.requestMethod;
      }
      if (
        match.requestData !== undefined &&
        (msg.requestData === undefined || msg.requestData === null)
      ) {
        msg.requestData = match.requestData;
      }
      logger?.debug('Correlated request payload onto message', {
        requestId: msg.requestId,
        requestClass: msg.requestClass,
        requestMethod: msg.requestMethod,
      });
    }
  }
}

module.exports = {
  correlateRequestPayload,
};
