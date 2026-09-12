/**
 * rewardRenderBinding.js
 *
 * Subscribes the shared reward panel to RewardState and routes published
 * entries through the unified showReward renderer. Loaded for its side effect by
 * the panel entry.
 */

const { rewardState } = require('../state/RewardState.js');

let renderUnifiedReward = null;
if (typeof __webpack_require__ !== 'undefined') {
  try {
    ({ showReward: renderUnifiedReward } = require('./RewardRenderer.js'));
  } catch {}
}

function bindRewardPanel(
  state = rewardState,
  { showReward = renderUnifiedReward } = {},
) {
  if (!state || typeof state.subscribe !== 'function') return () => {};
  return state.subscribe((snapshot, channel) => {
    if (channel !== 'reward' && channel !== 'all') return;
    const entry = snapshot.getReward();
    if (!entry || typeof showReward !== 'function') return;
    showReward(entry.source, entry.payload);
  });
}

bindRewardPanel();

module.exports = { bindRewardPanel };
module.exports.default = module.exports;
