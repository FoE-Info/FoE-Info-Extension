export function handleGuildExpeditionServiceRequest(msg, deps) {
  if (!msg || msg.requestClass !== 'GuildExpeditionService') {
    return false;
  }

  const {
    clearExpedition,
    showOptions,
    guildExpeditionService,
    helper,
    rewardsGE,
    showReward,
  } = deps;

  if (msg.requestMethod == 'getOverview') {
    clearExpedition();
  } else if (msg.requestMethod == 'getContributionList') {
    if (showOptions.showExpedition) {
      guildExpeditionService(msg);
    }
  } else if (msg.requestMethod == 'openChest') {
    var reward = msg.responseData;
    reward.source = 'guildExpedition';
    var name = helper.fRewardShortName(reward.name);
    var qty = reward.amount;

    if (!rewardsGE[name]) rewardsGE[name] = 0;
    rewardsGE[name] += qty;
    console.debug(reward);
    if (showOptions.showGErewards) {
      showReward(reward);
    }
    console.debug('rewardsGE:', rewardsGE, reward);
  } else {
    return false;
  }

  return true;
}
