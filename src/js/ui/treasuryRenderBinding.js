/**
 * treasuryRenderBinding.js
 *
 * Subscribes the Guild Treasury panels to the reactive TreasuryState.
 * Reserves and logs repaint independently. Loaded for its side effect by the
 * panel entry.
 */

const { treasuryState } = require('../state/TreasuryState.js');
const { renderTreasuryPanel } = require('./panelDispatcher.js');
const { renderTreasuryLogPanel } = require('./renderTreasuryLogPanel.js');

function bindTreasuryPanel(
  state = treasuryState,
  {
    renderReserves = renderTreasuryPanel,
    renderLogs = renderTreasuryLogPanel,
  } = {},
) {
  if (!state || typeof state.subscribe !== 'function') return () => {};
  return state.subscribe((snapshot, channel) => {
    if (channel === 'reserves' || channel === 'all') {
      const reserves = snapshot.getReserves();
      if (reserves) renderReserves(reserves);
    }
    if (channel === 'logs' || channel === 'all') {
      renderLogs(snapshot.getLogs(), snapshot.getTotals(), {
        showTreasury: snapshot.getShowTreasury(),
      });
    }
  });
}

bindTreasuryPanel();

module.exports = { bindTreasuryPanel };
module.exports.default = module.exports;
