/**
 * gbDonationRenderBinding.js
 *
 * Subscribes the Great Buildings donation and reward panels to the reactive
 * GbDonationState. Loaded for its side effect by the panel entry.
 */

const { gbDonationState } = require('../state/GbDonationState.js');
const { renderGbDonationPanel } = require('./renderGbDonationLegacy.js');
const { renderGenericReward } = require('./renderRewardsPanel.js');

let renderUnifiedReward = null;
if (typeof __webpack_require__ !== 'undefined') {
  try {
    ({ showReward: renderUnifiedReward } = require('./RewardRenderer.js'));
  } catch {}
}

function bindGbDonationPanels(
  state = gbDonationState,
  {
    renderDonation = renderGbDonationPanel,
    renderReward = renderGenericReward,
    showReward = renderUnifiedReward,
  } = {},
) {
  if (!state || typeof state.subscribe !== 'function') return () => {};
  return state.subscribe((snapshot, channel) => {
    if (channel === 'donation' || channel === 'all') {
      const donation = snapshot.getDonationPanel();
      if (donation) {
        renderDonation(
          donation.containers,
          donation.gbData,
          donation.rankings,
          donation.showOptions,
        );
      }
    }

    if (channel === 'reward' || channel === 'all') {
      const reward = snapshot.getReward();
      if (!reward) return;
      if (reward.mode === 'generic' || typeof showReward !== 'function') {
        renderReward(reward.container, reward.amount, reward.formattedName);
      } else {
        showReward('greatBuilding', reward.args);
      }
    }
  });
}

bindGbDonationPanels();

module.exports = { bindGbDonationPanels };
module.exports.default = module.exports;
