/**
 * intakePolicy.js — LEAF module (no imports from protocol/, msg/, state/, ui/
 * or utils/storage.js; only utils/logger.js).
 *
 * Owns the pure network-intake policy so entry points that only need the URL
 * predicate (e.g. src/js/devtools.js) do not pull the dispatcher dependency
 * subgraph. src/js/protocol/networkListener.js re-exports these symbols so
 * existing consumer and test import paths keep working unchanged.
 */

// --- Trusted origin policy ---

/**
 * Game API path prefixes accepted for RPC intake.
 */
const GAME_API_PATH_PREFIXES = ['/game/json'];
const FOE_GAME_HOST = 'forgeofempires.com';
/**
 * InnoGames CDN host serving metadata payloads. Kept allowlisted separately
 * from the game host because CDN metadata reads never target
 * the game JSON API.
 */
const FOE_CDN_METADATA_HOSTS = ['foeen.innogamescdn.com'];

/**
 * Suffix-match a hostname against a trusted base host (exact or subdomain).
 */
function trustedHostMatches(hostname, trustedHost) {
  return hostname === trustedHost || hostname.endsWith(`.${trustedHost}`);
}

function pathMatchesApiPrefixes(pathname, prefixes) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Metadata endpoints may sit under arbitrary subpaths on a trusted host
 * (`/metadata`, `/start/metadata`, `/game/metadata?id=…`), so the marker is
 * matched as an exact path segment / query form instead of a bare substring.
 */
function pathMatchesMetadataEndpoint(url) {
  return (
    url.pathname.split('/').includes('metadata') ||
    url.search.includes('metadata?id=')
  );
}

/**
 * Pure, dependency-injectable origin evaluation for a network entry URL.
 * Accepts only `https:` requests to a `forgeofempires.com` (or subdomain)
 * host serving a recognised game API path, or to an explicitly allowlisted
 * InnoGames CDN metadata host. `wss:` is the WebSocket transport of the same
 * game API, so it is accepted on the same host and path terms. Everything
 * else is rejected before dispatch.
 *
 * @param {string} rawUrl
 * @param {Object} [deps] - injectable: URL, gameHost, cdnHosts, gameApiPathPrefixes, secureSchemes
 * @returns {{ accepted: boolean, reason?: string, kind?: 'game'|'cdn' }}
 */
function evaluateRequestOrigin(rawUrl, deps = {}) {
  const URLImpl = deps.URL || globalThis.URL;
  const gameHost = deps.gameHost || FOE_GAME_HOST;
  const cdnHosts = deps.cdnHosts || FOE_CDN_METADATA_HOSTS;
  const apiPrefixes = deps.gameApiPathPrefixes || GAME_API_PATH_PREFIXES;

  if (!rawUrl || typeof rawUrl !== 'string') {
    return { accepted: false, reason: 'invalid_url' };
  }
  let url;
  try {
    url = new URLImpl(rawUrl);
  } catch {
    return { accepted: false, reason: 'unparseable_url' };
  }
  const secureSchemes = deps.secureSchemes || ['https:', 'wss:'];
  if (!secureSchemes.includes(url.protocol)) {
    return { accepted: false, reason: 'insecure_scheme' };
  }
  const hostname = url.hostname.toLowerCase();
  const isGameHost = trustedHostMatches(hostname, gameHost);
  const isCdnHost =
    !isGameHost && cdnHosts.some((host) => trustedHostMatches(hostname, host));
  if (!isGameHost && !isCdnHost) {
    return { accepted: false, reason: 'untrusted_host' };
  }
  const isGameApiPath =
    pathMatchesApiPrefixes(url.pathname, apiPrefixes) ||
    pathMatchesMetadataEndpoint(url);
  if (!isGameApiPath) {
    return { accepted: false, reason: 'unrecognized_path' };
  }
  return { accepted: true, kind: isGameHost ? 'game' : 'cdn' };
}

/**
 * Checks whether the URL matches a trusted Forge of Empires RPC or CDN
 * metadata endpoint (https scheme + host suffix + game API path, validated
 * with WHATWG URL parsing instead of substring matching).
 *
 * @param {string} reqUrl
 * @returns {boolean}
 */
function isFoeNetworkUrl(reqUrl) {
  return evaluateRequestOrigin(reqUrl).accepted;
}

// --- Dispatch Ordering (§4: serialize state mutation across packets) ---

let dispatchSequenceCounter = 0;
/** Monotonic world/session generation admitted dispatches must belong to. */
let dispatchGenerationId = 0;
let lastAdmittedWorld = null;

function nextDispatchSequence() {
  dispatchSequenceCounter += 1;
  return dispatchSequenceCounter;
}

/** Current world/session generation admitted dispatches must belong to. */
function currentDispatchGeneration() {
  return dispatchGenerationId;
}

/**
 * Pure token logic: a dispatch token may commit only if it was admitted under
 * the currently active generation. Tokens admitted under a superseded
 * generation (world switch, session restart, version change) are stale.
 *
 * @param {{ generation: number, sequence: number }|null|undefined} token
 * @param {number} currentGenerationId
 * @returns {{ committed: boolean, dropped: boolean, reason?: string, sequence?: number }}
 */
function evaluateDispatchToken(token, currentGenerationId) {
  if (token == null || typeof token !== 'object') {
    return { committed: true, dropped: false, sequence: undefined };
  }
  if (token.generation !== currentGenerationId) {
    return {
      committed: false,
      dropped: true,
      reason: 'stale_generation',
      sequence: token.sequence,
    };
  }
  return { committed: true, dropped: false, sequence: token.sequence };
}

/** Stamps the next monotonic sequence number under the given generation. */
function stampNextDispatchToken(generationId) {
  return { generation: generationId, sequence: nextDispatchSequence() };
}

/**
 * Advance the generation: every previously stamped token becomes stale.
 * Pure argument, stateful effect — expose via testable evaluateDispatchToken.
 */
function advanceDispatchGeneration(nextWorld) {
  dispatchGenerationId += 1;
  lastAdmittedWorld = nextWorld ?? null;
  return dispatchGenerationId;
}

/**
 * Keeps the generation aligned with the admitted world: switching worlds
 * invalidates all in-flight dispatches admitted under the previous world.
 */
function syncDispatchGeneration(detectedWorld) {
  if (detectedWorld && detectedWorld !== lastAdmittedWorld) {
    return advanceDispatchGeneration(detectedWorld);
  }
  return dispatchGenerationId;
}

function resetDispatchOrdering() {
  dispatchSequenceCounter = 0;
  dispatchGenerationId = 0;
  lastAdmittedWorld = null;
}

module.exports = {
  GAME_API_PATH_PREFIXES,
  FOE_GAME_HOST,
  FOE_CDN_METADATA_HOSTS,
  evaluateRequestOrigin,
  isFoeNetworkUrl,
  evaluateDispatchToken,
  stampNextDispatchToken,
  nextDispatchSequence,
  currentDispatchGeneration,
  advanceDispatchGeneration,
  syncDispatchGeneration,
  resetDispatchOrdering,
};
module.exports.default = module.exports;
