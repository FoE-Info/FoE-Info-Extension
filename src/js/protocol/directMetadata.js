/**
 * directMetadata.js
 *
 * Routing for direct InnoGames CDN metadata responses — StaticDataService
 * payloads fetched as raw CDN resources outside the normal JSON-RPC envelope.
 * Extracted from MessageDispatcher so the router stays focused on batched RPC
 * dispatch. `routeDirectMetadata` takes the dispatcher as its first argument to
 * reach the registered metadata handler, error handler, and batch dispatcher.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('DirectMetadata');
} catch {}

/**
 * Check if URL represents a direct InnoGames CDN metadata resource.
 * @param {string} url
 * @returns {boolean}
 */
function isDirectMetadataUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return (
    (url.includes('metadata?id=') ||
      url.includes('/metadata') ||
      url.includes('/start/metadata')) &&
    !url.includes('/game/json')
  );
}

/**
 * Extract metadata id and hash from a direct CDN metadata URL.
 * @param {string} reqUrl
 * @returns {{ metaId: string|null, metaHash: string|null, reqUrl: string }}
 */
function parseMetadataUrlContext(reqUrl) {
  let metaId = null;
  let metaHash = null;
  const metaIdx = reqUrl.indexOf('metadata?id=');
  if (metaIdx > -1) {
    const metaStr = reqUrl
      .substring(metaIdx + 'metadata?id='.length)
      .split('&')[0];
    const parts = metaStr.split('-');
    metaId = parts[0];
    if (parts.length > 1) {
      metaHash = parts.slice(1).join('-');
    }
  }
  return { metaId, metaHash, reqUrl };
}

/**
 * Route a direct CDN metadata response, returning the dispatch envelope, or
 * null when the URL is not a direct metadata resource.
 * @param {Object} dispatcher Owning MessageDispatcher (handlers/error seams).
 * @param {Object} params
 * @param {*} params.parsed Decoded response body.
 * @param {string} params.reqUrl
 * @param {Array} params.headers
 * @param {Object|null} params.request
 * @returns {Promise<Object|null>}
 */
async function routeDirectMetadata(
  dispatcher,
  { parsed, reqUrl, headers, request },
) {
  if (!isDirectMetadataUrl(reqUrl)) return null;

  const metaCtx = {
    ...parseMetadataUrlContext(reqUrl),
    headers,
    request,
  };
  logger?.debug('Routing direct metadata', { metaId: metaCtx.metaId });

  if (
    parsed &&
    typeof parsed === 'object' &&
    !Array.isArray(parsed) &&
    !parsed.id &&
    metaCtx.metaId
  ) {
    parsed.id = metaCtx.metaId.replace(/^building_entity_/, '');
  }

  let handledDirect = false;
  let directResult = null;

  if (typeof dispatcher.directMetadataHandler === 'function') {
    try {
      directResult = await dispatcher.directMetadataHandler(parsed, metaCtx);
      handledDirect = true;
    } catch (err) {
      if (typeof dispatcher.errorHandler === 'function') {
        dispatcher.errorHandler(
          err,
          { isDirectMetadata: true, url: reqUrl },
          metaCtx,
        );
      }
    }
  }

  const staticKey = 'StaticDataService.getMetadata';
  if (dispatcher.handlers.has(staticKey)) {
    const staticMsg = {
      __class__: 'ServerRequest',
      requestClass: 'StaticDataService',
      requestMethod: 'getMetadata',
      responseData: parsed,
      requestId: 0,
      metaId: metaCtx.metaId,
      metaHash: metaCtx.metaHash,
      reqUrl,
      isDirectMetadata: true,
    };
    const res = await dispatcher.dispatchBatch([staticMsg], metaCtx);
    return {
      handled: true,
      isDirectMetadata: true,
      directResult,
      batchResult: res,
    };
  }

  return {
    handled: handledDirect,
    isDirectMetadata: true,
    directResult,
  };
}

module.exports = {
  isDirectMetadataUrl,
  parseMetadataUrlContext,
  routeDirectMetadata,
};
