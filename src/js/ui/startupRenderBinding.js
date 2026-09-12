/**
 * startupRenderBinding.js
 *
 * Subscribes the city-stats and building-collection renderers to the reactive
 * StartupRenderState published by StartupService. City-stats tooltips are bound
 * immediately after each city-stats paint.
 */

const { startupRenderState } = require('../state/StartupRenderState.js');
const liveStats = require('./renderLiveCityStats.js');
const buildingCollection = require('./renderBuildingCollectionTimes.js');
const cityStatsTooltips = require('./cityStatsTooltips.js');

function bindStartupRenderState(
  state = startupRenderState,
  {
    renderCityStats = liveStats.renderLiveCityStats,
    renderBuildingCollection = buildingCollection.renderBuildingCollectionTimes,
    showCityStatsTooltips = cityStatsTooltips.showTooltips,
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
  });
}

bindStartupRenderState();

module.exports = { bindStartupRenderState };
module.exports.default = module.exports;
