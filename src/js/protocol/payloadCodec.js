/**
 * payloadCodec.js
 *
 * Handles payload decoding and cooperative JSON parsing for network payloads.
 * Supports Base64/UTF-8 decoding across Node/browser environments and cooperative
 * main-thread yielding for heavy payloads.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('PayloadCodec');
} catch {}

/**
 * Decode network payload string according to transfer encoding.
 * @param {string|Object} body
 * @param {string} [encoding]
 * @returns {string}
 */
function decodeBody(body, encoding) {
  if (!body) return '';
  if (encoding === 'base64' && typeof body === 'string') {
    logger?.debug('Decoding Base64 payload', { length: body.length });
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(body, 'base64').toString('utf8');
    }
    const binaryStr = atob(body);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  }
  return typeof body === 'string' ? body : JSON.stringify(body);
}

/**
 * Parse JSON body with cooperative main-thread yielding for heavy payloads.
 * @param {string|Object} textBody
 * @param {Object} [options]
 * @param {number} [options.yieldParseThresholdBytes=51200]
 * @param {Function} [options.yieldFn]
 * @returns {Promise<*>}
 */
async function parsePayload(textBody, options = {}) {
  if (!textBody) return null;
  if (typeof textBody === 'object') return textBody;

  const threshold =
    typeof options.yieldParseThresholdBytes === 'number' ?
      options.yieldParseThresholdBytes
    : 50 * 1024;
  const yieldFn =
    typeof options.yieldFn === 'function' ? options.yieldFn : null;

  const isHeavy =
    threshold > 0 &&
    typeof textBody === 'string' &&
    textBody.length >= threshold;

  if (isHeavy && yieldFn) {
    logger?.debug('Yielding before parsing heavy payload', {
      length: textBody.length,
    });
    await yieldFn();
  }

  const parsed = JSON.parse(textBody);

  if (isHeavy && yieldFn) {
    logger?.debug('Yielding after parsing heavy payload', {
      length: textBody.length,
    });
    await yieldFn();
  }

  return parsed;
}

module.exports = {
  decodeBody,
  parsePayload,
};
