import { HandlerMessage, RewardCallback, RewardData } from './types';

type RewardServiceOptions = {
  showGBGrewards?: boolean;
  showRewards?: boolean;
};

type RewardServiceMessage = HandlerMessage & {
  requestClass?: string;
  requestMethod?: string;
  responseData?: unknown;
};

type BlueprintResponseData = {
  cityentity_id: string | number;
  strategy_point_amount: number;
  building_owner: {
    name: string;
  };
  level: number;
};

type BlueprintMessage = HandlerMessage & {
  requestClass?: string;
  requestMethod?: string;
  responseData?: BlueprintResponseData;
};

type BlueprintDeps = {
  helper: {
    fGBname: (cityEntityId: string | number) => string;
    fGBsname: (gbName: string) => string;
  };
  showOptions: {
    showGBRewards?: boolean;
  };
  collapse: {
    collapseRewards: boolean;
    fCollapseRewards: EventListener;
  };
  element: {
    icon: (iconName: string, targetId: string, collapsed: boolean) => string;
    close: () => string;
  };
  cityrewards: {
    innerHTML: string;
  };
  rewardObserve: () => void;
  addAvailablePacksFP: (value: number) => void;
  getTotalAvailableFP: () => number;
};

type RewardSetData = {
  reward?: {
    rewards?: RewardData[];
  };
  context?: string;
};

type CollectRewardResponse = [RewardData[]?, string?];

export function handleRewardServiceRequest(
  msg: RewardServiceMessage,
  showOptions: RewardServiceOptions,
  showReward: RewardCallback,
): boolean {
  if (!msg || msg.requestClass !== 'RewardService') {
    return false;
  }

  if (msg.requestMethod === 'collectReward') {
    const data = msg.responseData as CollectRewardResponse | undefined;
    if (data && data.length) {
      const rewardRows = data[0];
      const reward = rewardRows?.[0];
      if (reward) {
        reward.source = data[1];
        console.debug(data[1], reward);
        if (showOptions.showGBGrewards) {
          showReward(reward);
        }
      }
    }
  } else if (msg.requestMethod === 'collectRewardSet') {
    const data = msg.responseData as RewardSetData | undefined;
    if (data && Object.prototype.hasOwnProperty.call(data, 'reward')) {
      const rewards = data.reward?.rewards ?? [];
      if (rewards.length) {
        rewards.forEach((reward) => {
          reward.source = data.context;
        });
        console.debug(rewards);
        if (showOptions.showRewards) {
          rewards.forEach((reward) => {
            showReward(reward);
          });
        }
      }
    }
  } else if (msg.requestMethod === '') {
    // no-op
  } else {
    console.debug('RewardService', msg);
  }

  return true;
}

export function handleBlueprintServiceRequest(
  msg: BlueprintMessage,
  deps: BlueprintDeps,
): boolean {
  if (
    !msg ||
    msg.requestClass !== 'BlueprintService' ||
    msg.requestMethod !== 'newReward' ||
    !msg.responseData
  ) {
    return false;
  }

  const {
    helper,
    showOptions,
    collapse,
    element,
    cityrewards,
    rewardObserve,
    addAvailablePacksFP,
    getTotalAvailableFP,
  } = deps;

  const GBname = helper.fGBname(msg.responseData.cityentity_id);

  addAvailablePacksFP(msg.responseData.strategy_point_amount);

  const availableFPNode = document.getElementById('availableFPID');
  if (availableFPNode) {
    availableFPNode.textContent = String(getTotalAvailableFP());
  }

  if (showOptions.showGBRewards) {
    const oldText = document.getElementById('rewardsText');
    if (oldText) {
      oldText.innerHTML =
        `${msg.responseData.building_owner.name} ${helper.fGBsname(GBname)} ${msg.responseData.level} - ${
          msg.responseData.strategy_point_amount
        }FP<br>` + oldText.innerHTML;
    } else {
      cityrewards.innerHTML = `<div class="alert alert-danger alert-dismissible show collapsed"><p id="rewardsTextLabel" href="#rewardsText" data-bs-toggle="collapse">
${element.icon('rewardsicon', 'rewardsText', collapse.collapseRewards)}
<span data-i18n="reward"><strong>REWARDS:</strong></span></p>
${element.close()}
<div id="rewardsText" class="overflow resize collapse ${
        collapse.collapseRewards ? '' : 'show'
      }"><p class="overflow" id="rewardsText">${msg.responseData.building_owner.name} ${helper.fGBsname(
        GBname,
      )} ${msg.responseData.level} - ${msg.responseData.strategy_point_amount}FP</p></div></div>`;

      document
        .getElementById('rewardsTextLabel')
        ?.addEventListener('click', collapse.fCollapseRewards);
    }

    rewardObserve();
  }

  return true;
}
