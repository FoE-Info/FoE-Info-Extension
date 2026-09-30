/**
 * destinationValidator.js — LEAF module (no imports from protocol/, msg/,
 * state/, ui/ or utils/storage.js; only utils/logger.js).
 *
 * Validates user-configured external publication destinations at both settings
 * intake (optionsForm.js) and active consumption (fn/post.js). Supported
 * services are Discord webhook URLs and Google Apps Script deployment URLs.
 * Empty strings are accepted (feature not configured).
 */

const { createLogger } = require('./logger.js');
const logger = createLogger('DestinationValidator');

/**
 * Supported Discord webhook URL host patterns.
 * @type {string[]}
 */
const DISCORD_WEBHOOK_HOSTS = ['discord.com', 'discordapp.com'];

/**
 * Supported Google Apps Script host pattern.
 * @type {string}
 */
const GOOGLE_SCRIPTS_HOST = 'script.google.com';

/**
 * Expected path prefix for Google Apps Script deployments.
 * @type {string}
 */
const GOOGLE_SCRIPTS_PATH_PREFIX = '/macros/s/';

// --- Pure validation helpers ---

/**
 * Validate a Discord webhook URL: HTTPS scheme, recognised host, and
 * /api/webhooks/ path prefix.
 *
 * @param {string} rawUrl
 * @param {Object} [deps] - injectable: URL constructor
 * @returns {{ valid: boolean, reason?: string, service?: 'discord' }}
 */
function validateDiscordWebhookUrl(rawUrl, deps = {}) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, reason: 'empty_or_non_string' };
  }

  let parsed;
  try {
    const URLImpl = deps.URL || globalThis.URL;
    parsed = new URLImpl(rawUrl);
  } catch {
    return { valid: false, reason: 'unparseable_url' };
  }

  if (parsed.protocol !== 'https:') {
    return { valid: false, reason: 'insecure_scheme' };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!DISCORD_WEBHOOK_HOSTS.includes(hostname)) {
    return { valid: false, reason: 'unrecognised_host' };
  }

  const pathname = parsed.pathname;
  if (!pathname.startsWith('/api/webhooks/')) {
    return { valid: false, reason: 'unrecognised_path' };
  }

  return { valid: true, service: 'discord' };
}

/**
 * Validate a Google Apps Script deployment URL: HTTPS scheme,
 * script.google.com host, and /macros/s/ path prefix ending with /exec.
 *
 * @param {string} rawUrl
 * @param {Object} [deps] - injectable: URL constructor
 * @returns {{ valid: boolean, reason?: string, service?: 'sheets' }}
 */
function validateGoogleSheetUrl(rawUrl, deps = {}) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, reason: 'empty_or_non_string' };
  }

  let parsed;
  try {
    const URLImpl = deps.URL || globalThis.URL;
    parsed = new URLImpl(rawUrl);
  } catch {
    return { valid: false, reason: 'unparseable_url' };
  }

  if (parsed.protocol !== 'https:') {
    return { valid: false, reason: 'insecure_scheme' };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname !== GOOGLE_SCRIPTS_HOST) {
    return { valid: false, reason: 'unrecognised_host' };
  }

  const pathname = parsed.pathname;
  if (
    !pathname.startsWith(GOOGLE_SCRIPTS_PATH_PREFIX) ||
    !pathname.endsWith('/exec')
  ) {
    return { valid: false, reason: 'unrecognised_path' };
  }

  return { valid: true, service: 'sheets' };
}

/**
 * Determine the expected service type for a URL based on its hostname.
 *
 * @param {string} rawUrl
 * @returns {'discord'|'sheets'|'unknown'}
 */
function detectServiceType(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return 'unknown';
  try {
    const parsed = new URL(rawUrl);
    const hostname = parsed.hostname.toLowerCase();
    if (DISCORD_WEBHOOK_HOSTS.includes(hostname)) return 'discord';
    if (hostname === GOOGLE_SCRIPTS_HOST) return 'sheets';
  } catch {}
  return 'unknown';
}

/**
 * Validate a destination URL against supported service rules. Accepts empty
 * strings (feature not configured). If serviceHint is provided, validates
 * against that specific service; otherwise auto-detects.
 *
 * @param {string} rawUrl - The destination URL to validate
 * @param {Object} [options]
 * @param {'discord'|'sheets'} [options.serviceHint] - Expected service type
 * @param {Object} [options.deps] - Injectable URL constructor
 * @returns {{ valid: boolean, reason?: string, service?: string }}
 */
function validateDestinationUrl(rawUrl, options = {}) {
  // Empty string = feature not configured; always valid.
  if (!rawUrl || (typeof rawUrl === 'string' && rawUrl.trim() === '')) {
    logger.debug('Destination validation result', true, '');
    return { valid: true, service: 'none' };
  }

  const { serviceHint, deps } = options;

  const service = serviceHint || detectServiceType(rawUrl);
  let result;
  switch (service) {
    case 'discord':
      result = validateDiscordWebhookUrl(rawUrl, deps);
      break;
    case 'sheets':
      result = validateGoogleSheetUrl(rawUrl, deps);
      break;
    default:
      result = { valid: false, reason: 'unsupported_service' };
  }
  logger.debug(
    'Destination validation result',
    result.valid,
    result.reason || '',
  );
  return result;
}

module.exports = {
  DISCORD_WEBHOOK_HOSTS,
  GOOGLE_SCRIPTS_HOST,
  GOOGLE_SCRIPTS_PATH_PREFIX,
  validateDiscordWebhookUrl,
  validateGoogleSheetUrl,
  detectServiceType,
  validateDestinationUrl,
};
module.exports.default = module.exports;
