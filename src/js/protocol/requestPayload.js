/**
 * requestPayload.js
 *
 * Pure extraction of the InnoGames request payload from a raw network request
 * descriptor (DevTools / WebRequest postData shape). The payload is attached to
 * responses and used to differentiate otherwise-identical duplicate requests.
 * Never throws: unknown or unparseable shapes resolve to null.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('RequestPayload');
} catch {}

/**
 * @param {*} request Raw request descriptor (array, JSON string, or object).
 * @returns {*} Parsed request payload, or null when none can be resolved.
 */
function extractRequestPayload(request) {
  if (Array.isArray(request)) return request;

  if (typeof request === 'string') {
    try {
      return JSON.parse(request);
    } catch {
      return null;
    }
  }

  if (!request || typeof request !== 'object') return null;

  let requestPayload = null;
  try {
    const postText =
      request.request?.postData?.text ||
      request.postData?.text ||
      (typeof request.request?.postData === 'string' ? request.request.postData
      : typeof request.postData === 'string' ? request.postData
      : null);

    if (typeof postText === 'string') {
      try {
        requestPayload = JSON.parse(postText);
        if (
          requestPayload &&
          typeof requestPayload === 'object' &&
          !Array.isArray(requestPayload) &&
          Object.keys(requestPayload).length === 0
        ) {
          requestPayload = null;
        }
      } catch {
        requestPayload = null;
      }
    } else if (typeof postText === 'object' && postText !== null) {
      requestPayload =
        Object.keys(postText).length > 0 || Array.isArray(postText) ?
          postText
        : null;
    }

    if (!requestPayload) {
      if (Array.isArray(request.request?.postData)) {
        requestPayload = request.request.postData;
      } else if (
        typeof request.request?.postData === 'object' &&
        request.request.postData !== null
      ) {
        requestPayload = request.request.postData;
      } else if (Array.isArray(request.postData)) {
        requestPayload = request.postData;
      } else if (
        typeof request.postData === 'object' &&
        request.postData !== null
      ) {
        requestPayload = request.postData;
      } else if (Array.isArray(request.requestPayload)) {
        requestPayload = request.requestPayload;
      }
    }
  } catch {
    logger?.debug('Ignoring unparseable request payload descriptor');
  }

  if (requestPayload) {
    logger?.debug('Extracted request payload', {
      shape: Array.isArray(requestPayload) ? 'array' : typeof requestPayload,
    });
  }
  return requestPayload;
}

module.exports = { extractRequestPayload };
