/**
 * gameVersionStatus.js
 *
 * Pure-presentation helper that renders the detected game/extension version
 * status line into a container. Extracted from protocol/networkListener.js
 * so the network layer holds no DOM markup.
 *
 * Dual CJS/ESM compatible; zero top-level DOM access.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('GameVersionStatus');
} catch {
  logger = null;
}

// Canonical escaping core; fail-closed - escaping is never optional here.
const { escapeHTML } = require('../utils/escape.js');

const safeEscape = escapeHTML;

/**
 * Appends a localized game/extension version status block to a container.
 *
 * @param {Object|null} container - Element exposing innerHTML or insertAdjacentHTML.
 * @param {Object} [info]
 * @param {string} [info.version=''] - Detected client/game version string.
 * @param {string} [info.extName='FoE-Info'] - Extension display name.
 * @param {string} [info.toolVersion=''] - Extension tool version.
 * @returns {boolean} True when the status block was written.
 */
function appendGameVersionStatus(
  container,
  { version = '', extName = 'FoE-Info', toolVersion = '' } = {},
) {
  if (!container) return false;

  const safeVersion = safeEscape(version);
  const safeExtName = safeEscape(extName);
  const safeToolVersion = safeEscape(toolVersion);
  const html = `<div><span data-i18n="gameversion">Game Version</span>: ${safeVersion}<br>${safeExtName}: ${safeToolVersion}</div>`;

  if (typeof container.insertAdjacentHTML === 'function') {
    container.insertAdjacentHTML('beforeend', html);
  } else if (typeof container.innerHTML === 'string') {
    container.innerHTML = `${container.innerHTML}${html}`;
  } else {
    return false;
  }

  logger?.debug('Appended game version status', {
    version: safeVersion,
    extName: safeExtName,
  });
  return true;
}

module.exports = { appendGameVersionStatus };
module.exports.default = module.exports;
