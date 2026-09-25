/**
 * startupPanel.js
 *
 * Unified Startup UI controller:
 * - Startup metadata loading placeholder & spinner card
 * - Startup metadata loading reactive subscription (bindStartupMetadataLoading)
 * - City stats, collection times, and tooltip bindings (bindStartupRenderState)
 */

const { startupRenderState } = require('../state/StartupRenderState.js');
const liveStats = require('./renderLiveCityStats.js');
const buildingCollection = require('./renderBuildingCollectionTimes.js');
const cityStatsTooltips = require('./cityStatsTooltips.js');
const playerTooltip = require('./playerTooltip.js');

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('StartupPanel');
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

// ============================================================================
// 1. METADATA LOADING PLACEHOLDER
// ============================================================================

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

// ============================================================================
// 2. REACTIVE STORE BINDINGS
// ============================================================================

function bindStartupMetadataLoading(
  state = startupRenderState,
  { renderPlaceholder = renderMetadataLoadingPlaceholder } = {},
) {
  if (!state || typeof state.subscribe !== 'function') return () => {};
  return state.subscribe((snapshot, channel) => {
    if (channel !== 'metadata-loading' && channel !== 'all') return;
    const payload = snapshot.getMetadataLoading();
    if (!payload) return;
    renderPlaceholder(payload.container, payload.options);
  });
}

function bindStartupRenderState(
  state = startupRenderState,
  {
    renderCityStats = liveStats.renderLiveCityStats,
    renderBuildingCollection = buildingCollection.renderBuildingCollectionTimes,
    showCityStatsTooltips = cityStatsTooltips?.showTooltips,
    refreshIgnoreList = playerTooltip?.updateIgnoreListUI,
  } = {},
) {
  if (!state || typeof state.subscribe !== 'function') return () => {};
  return state.subscribe((snapshot, channel) => {
    if (channel === 'city-stats' || channel === 'all') {
      renderCityStats(snapshot.getCityStatsContext() || {});
      if (typeof showCityStatsTooltips === 'function') {
        showCityStatsTooltips();
      }
    }
    if (channel === 'building-collection' || channel === 'all') {
      renderBuildingCollection(snapshot.getBuildingCollectionOptions() || {});
    }
    if (channel === 'ignore-list' && typeof refreshIgnoreList === 'function') {
      refreshIgnoreList();
    }
  });
}

module.exports = {
  renderMetadataLoadingPlaceholder,
  bindStartupMetadataLoading,
  bindStartupRenderState,
};
module.exports.default = bindStartupRenderState;
