/**
 * investedRenderBinding.js
 *
 * Subscribes the invested-contributions panel to InvestedState. Loaded for its
 * side effect by the panel entry.
 */

const { investedState } = require('../state/InvestedState.js');

let renderInvestedPanel = null;
if (typeof __webpack_require__ !== 'undefined') {
  try {
    ({ renderInvestedPanel } = require('./renderInvestedPanel.js'));
  } catch {}
}

function bindInvestedPanel(
  state = investedState,
  { renderInvested = renderInvestedPanel } = {},
) {
  if (!state || typeof state.subscribe !== 'function') return () => {};
  return state.subscribe((snapshot, channel) => {
    if (channel !== 'contributions' && channel !== 'all') return;
    const payload = snapshot.getContributions();
    if (!payload || typeof renderInvested !== 'function') return;
    renderInvested(payload.list, payload.arcBonusPercent);
  });
}

bindInvestedPanel();

module.exports = { bindInvestedPanel };
module.exports.default = module.exports;
