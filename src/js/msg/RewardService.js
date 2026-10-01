/** Routes collected GBG, GE, and PvP rewards through the shared reward state. */
const { rewardState } = require('../state/RewardState.js');
const { showOptions } = require('../state/showOptions.mjs');
const { createLogger } = require('../utils/logger.js');
const logger = createLogger('RewardService');
function collectReward(
  msg,
  { state = rewardState, options = showOptions } = {},
) {
  const data = msg?.responseData;
  if (!Array.isArray(data) || !Array.isArray(data[0])) return;
  const route =
    data[1] === 'spoilsOfWar' ?
      { source: 'himejiCastle', enabled: options.showGBRewards }
    : data[1] === 'diplomaticGifts' ?
      { source: 'spaceCarrier', enabled: options.showGBRewards }
    : data[1] === 'battlegrounds_conquest' ?
      { source: 'battleground', enabled: options.showGBGrewards }
    : (
      data[1] === 'guildExpedition' ||
      data[1] === 'guild_expedition_reward_notification'
    ) ?
      { source: 'expedition', enabled: options.showGErewards }
    : data[1] === 'item_exchange' ?
      { source: 'antiquesSales', enabled: options.showGBRewards }
    : data[1] === 'item_shop' ?
      { source: 'antiquesShop', enabled: options.showGBRewards }
    : data[1] === 'pvp_arena' ?
      { source: 'pvpArena', enabled: options.showGBRewards }
    : null;
  if (!route || route.enabled === false) return;
  const publish = (payload) => {
    if (!payload || typeof payload !== 'object') return;
    if (payload.type === 'set' && Array.isArray(payload.rewards)) {
      for (const reward of payload.rewards) publish(reward);
      return;
    }
    state.setReward({ source: route.source, payload });
  };
  for (const payload of data[0]) publish(payload);
  logger.debug('Collected rewards routed', { count: data[0].length });
}

const rewardService = {
  register(dispatcher) {
    dispatcher.register('RewardService', 'collectReward', (msg) =>
      collectReward(msg),
    );
    return this;
  },
};
module.exports = { collectReward, rewardService };
