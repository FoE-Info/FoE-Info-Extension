/**
 * startupRenderBinding.js
 *
 * Subscribes the city-stats and building-collection renderers to the reactive
 * StartupRenderState published by StartupService.
 */

const { startupRenderState } = require('../state/StartupRenderState.js');
const liveStats = require('./renderLiveCityStats.js');
const buildingCollection = require('./renderBuildingCollectionTimes.js');

function bindStartupRenderState(
  state = startupRenderState,
  {
    renderCityStats = liveStats.renderLiveCityStats,
    renderBuildingCollection = buildingCollection.renderBuildingCollectionTimes,
  } = {},
) {
  if (!state || typeof state.subscribe !== 'function') return () => {};
  return state.subscribe((snapshot, channel) => {
    if (channel === 'city-stats' || channel === 'all') {
      renderCityStats(snapshot.getCityStatsContext() || {});
    }
    if (channel === 'building-collection' || channel === 'all') {
      renderBuildingCollection(snapshot.getBuildingCollectionOptions() || {});
    }
  });
}

bindStartupRenderState();

module.exports = { bindStartupRenderState };
module.exports.default = module.exports;
