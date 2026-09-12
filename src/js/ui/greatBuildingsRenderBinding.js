/**
 * greatBuildingsRenderBinding.js
 *
 * Subscribes the Great Buildings contributors, info, and donation panels to the
 * reactive GreatBuildingsState. Loaded for its side effect by the composition
 * root (src/js/ui/renderBindings.js).
 */

const { greatBuildingsState } = require('../state/GreatBuildingsState.js');
const { renderGbDonorsCard } = require('./gbOverviewCard.js');
const { renderGbInfoPanel } = require('./renderGbInfoPanel.js');
const { renderGbDonationPanel } = require('./renderGbDonationPanel.js');
const { repairGbOutput } = require('./gbOutputRepair.js');

function bindGreatBuildingsPanels(
  state = greatBuildingsState,
  {
    renderDonors = renderGbDonorsCard,
    renderInfo = renderGbInfoPanel,
    renderDonation = renderGbDonationPanel,
    repairOutput = repairGbOutput,
  } = {},
) {
  if (!state || typeof state.subscribe !== 'function') return () => {};
  return state.subscribe((snapshot, channel) => {
    if (channel === 'donors' || channel === 'all') {
      if (typeof repairOutput === 'function') repairOutput();
      const donors = snapshot.getDonors();
      if (donors) renderDonors(donors);
    }

    if (channel === 'info' || channel === 'all') {
      const info = snapshot.getInfo();
      if (info) {
        renderInfo(
          info.targetEl,
          info.gbData,
          info.playerName,
          info.showOptions,
        );
      }
    }

    if (channel === 'donation' || channel === 'all') {
      const donation = snapshot.getDonation();
      if (donation) renderDonation(donation);
    }
  });
}

bindGreatBuildingsPanels();

module.exports = { bindGreatBuildingsPanels };
module.exports.default = module.exports;
