/**
 * armyRenderBinding.js
 *
 * Subscribes the Army panel to the reactive ArmyState. Loaded for its side
 * effect by the panel entry.
 */

const { armyState } = require('../state/ArmyState.js');
const { renderArmyPanel } = require('./renderArmyPanel.js');

function bindArmyPanel(
  state = armyState,
  { renderArmy = renderArmyPanel } = {},
) {
  if (!state || typeof state.subscribe !== 'function') return () => {};
  return state.subscribe((snapshot, channel) => {
    if (channel !== 'army' && channel !== 'all') return;
    const payload = snapshot.getArmyPanel();
    if (payload) renderArmy(payload);
  });
}

bindArmyPanel();

module.exports = { bindArmyPanel };
module.exports.default = module.exports;
