/**
 * outpostRenderBinding.js
 *
 * Subscribes the Cultural Settlement panel to the reactive OutpostState. Loaded
 * for its side effect by the panel entry.
 */

const { outpostState } = require('../state/OutpostState.js');
const { renderCulturalPanel } = require('./renderCulturalPanel.js');

function bindOutpostPanel(
  state = outpostState,
  { renderCultural = renderCulturalPanel } = {},
) {
  if (!state || typeof state.subscribe !== 'function') return () => {};
  return state.subscribe((snapshot, channel) => {
    if (channel !== 'cultural' && channel !== 'all') return;
    const payload = snapshot.getCulturalPanel();
    if (!payload) return;
    renderCultural(
      payload.activeSettlement,
      payload.advancements,
      payload.remainingCosts,
    );
  });
}

bindOutpostPanel();

module.exports = { bindOutpostPanel };
module.exports.default = module.exports;
