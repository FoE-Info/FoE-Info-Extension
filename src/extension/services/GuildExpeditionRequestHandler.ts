import { HandlerMessage, RewardCallback, RewardData } from './types';

type GuildExpeditionMsg = HandlerMessage & {
  responseData?: RewardData;
};

type GuildExpeditionDeps = {
  clearExpedition: () => void;
  showOptions: {
    showExpedition?: boolean;
    showGErewards?: boolean;
  };
  guildExpeditionService: (msg: GuildExpeditionMsg) => void;
  helper: {
    fRewardShortName: (name: string | undefined) => string;
  };
  rewardsGE: Record<string, number>;
  showReward: RewardCallback;
};

export function handleGuildExpeditionServiceRequest(
  msg: GuildExpeditionMsg,
  deps: GuildExpeditionDeps,
): boolean {
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

  if (msg.requestMethod === 'getOverview') {
    clearExpedition();
  } else if (msg.requestMethod === 'getContributionList') {
    if (showOptions.showExpedition) {
      guildExpeditionService(msg);
    }
  } else if (msg.requestMethod === 'openChest') {
    const reward = msg.responseData;
    if (!reward || typeof reward.amount !== 'number') {
      return true;
    }

    reward.source = 'guildExpedition';
    const name = helper.fRewardShortName(reward.name);
    const qty = reward.amount;

    if (!rewardsGE[name]) {
      rewardsGE[name] = 0;
    }
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
