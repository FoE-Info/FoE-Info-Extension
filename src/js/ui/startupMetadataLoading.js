/**
 * startupMetadataLoading.js
 *
 * Renders the startup "loading metadata" placeholder card. Extracted from
 * msg/StartupRenderOrchestrator.js so the orchestration layer holds no markup.
 *
 * Dual CJS/ESM compatible; zero top-level DOM access.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('StartupMetadataLoading');
} catch {
  logger = null;
}

let escapeHTML = null;
try {
  const formatters = require('../utils/formatters.js');
  if (typeof formatters.escapeHTML === 'function') {
    escapeHTML = formatters.escapeHTML;
  }
} catch {
  escapeHTML = null;
}

function safeEscape(value) {
  if (typeof escapeHTML === 'function') return escapeHTML(value);
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Installs the spinner + "loading metadata" card into a container.
 *
 * @param {Object|null} container - Element whose innerHTML is replaced.
 * @param {Object} [options]
 * @param {string} [options.loadingText='Loading metadata...'] - Localized status text.
 * @param {Function} [options.translateContainer] - Optional i18n subtree translator.
 * @returns {boolean} True when the placeholder was written.
 */
function renderMetadataLoadingPlaceholder(
  container,
  { loadingText = 'Loading metadata...', translateContainer } = {},
) {
  if (!container || typeof container !== 'object') return false;

  const text = safeEscape(loadingText);
  container.innerHTML = `<div class="card my-2 shadow-sm border-0"><div class="card-body py-2 px-3 text-muted d-flex align-items-center"><span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span><span data-i18n="loading-metadata">${text}</span></div></div>`;

  if (typeof translateContainer === 'function') {
    translateContainer(container);
  }

  logger?.debug('Rendered metadata loading placeholder');
  return true;
}

module.exports = { renderMetadataLoadingPlaceholder };
module.exports.default = module.exports;
