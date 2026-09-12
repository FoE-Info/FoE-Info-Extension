/**
 * visitedCityRenderBinding.js
 *
 * Subscribes the visited-player city card renderer to the reactive
 * VisitedCityState. Loaded for its side effect by the panel entry.
 */

const { visitedCityState } = require('../state/VisitedCityState.js');
const { renderCityStats } = require('./renderCityStats.js');

let translateContainer = null;
try {
  translateContainer = require('../fn/i18n.js').translateContainer;
} catch {}

function bindVisitedCityRender(
  state = visitedCityState,
  { renderCity = renderCityStats, translate = translateContainer } = {},
) {
  if (!state || typeof state.subscribe !== 'function') return () => {};
  return state.subscribe((snapshot, channel) => {
    if (channel !== 'visit' && channel !== 'all') return;
    const payload = snapshot.getVisit();
    if (!payload || typeof renderCity !== 'function') return;
    renderCity(
      payload.containerId,
      payload.stats,
      payload.context,
      payload.options,
    );
    if (typeof translate !== 'function') return;
    const container =
      typeof document !== 'undefined' ?
        document.getElementById(payload.containerId)
      : null;
    if (!container) return;
    try {
      translate(container);
    } catch {
      // Ignore translation failures in headless/test environments
    }
  });
}

bindVisitedCityRender();

module.exports = { bindVisitedCityRender };
module.exports.default = module.exports;
