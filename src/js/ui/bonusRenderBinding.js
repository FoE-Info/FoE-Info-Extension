/**
 * bonusRenderBinding.js
 *
 * Subscribes the Bonus panel to the reactive BonusState. Loaded for its side
 * effect by the panel entry.
 */

const { bonusState } = require('../state/BonusState.js');
const {
  renderBonusSummary,
  updateBonusAmount,
  updateDailyForgePoints,
} = require('./renderBonusPanel.js');

function bindBonusPanel(
  state = bonusState,
  {
    renderSummary = renderBonusSummary,
    updateAmount = updateBonusAmount,
    updateDailyFp = updateDailyForgePoints,
  } = {},
) {
  if (!state || typeof state.subscribe !== 'function') return () => {};
  return state.subscribe((snapshot, channel) => {
    if (channel !== 'bonus' && channel !== 'all') return;

    renderSummary(snapshot.getBonusHTML(), snapshot.getSummary());
    updateAmount('spoilsID', snapshot.getSpoils());
    updateAmount('diplomaticID', snapshot.getDiplomatic());
    updateAmount('firststrikeID', snapshot.getStrike());
    updateAmount('aidID', snapshot.getAid());

    const dailyFp = snapshot.getDailyForgePoints();
    if (dailyFp != null) updateDailyFp(dailyFp);
  });
}

bindBonusPanel();

module.exports = { bindBonusPanel };
module.exports.default = module.exports;
