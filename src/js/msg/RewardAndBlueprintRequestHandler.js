export function handleRewardServiceRequest(msg, showOptions, showReward) {
  if (!msg || msg.requestClass !== 'RewardService') {
    return false;
  }

  if (msg.requestMethod == 'collectReward') {
    if (msg.responseData.length) {
      var reward = msg.responseData[0][0];
      reward.source = msg.responseData[1];
      console.debug(msg.responseData[1], reward);
      if (showOptions.showGBGrewards) {
        showReward(reward);
      }
    }
  } else if (msg.requestMethod == 'collectRewardSet') {
    if (
      msg.responseData.hasOwnProperty('reward') &&
      msg.responseData.reward.rewards.length
    ) {
      var rewards = msg.responseData.reward.rewards;
      rewards.source = msg.responseData.context;
      console.debug(rewards);
      if (showOptions.showRewards) {
        rewards.forEach((reward) => {
          showReward(reward);
        });
      }
    }
  } else if (msg.requestMethod == '') {
    // no-op
  } else {
    console.debug('RewardService', msg);
  }

  return true;
}

export function handleBlueprintServiceRequest(msg, deps) {
  if (
    !msg ||
    msg.requestClass !== 'BlueprintService' ||
    msg.requestMethod !== 'newReward'
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
    availableFPNode.textContent = getTotalAvailableFP();
  }

  if (showOptions.showGBRewards) {
    var oldText = document.getElementById('rewardsText');
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
        .addEventListener('click', collapse.fCollapseRewards);
    }

    rewardObserve();
  }

  return true;
}
