export function handleOtherPlayerServiceRequest(msg, deps) {
  if (!msg || msg.requestClass !== 'OtherPlayerService') {
    return false;
  }

  const {
    helper,
    GBselected,
    getPlayerID,
    clearVisitPlayer,
    otherPlayerService,
    otherPlayerServiceUpdateActions,
    showOptions,
    rewardsOtherPlayer,
    showReward,
    setPlayerState,
    setCityProtections,
  } = deps;

  if (msg.requestMethod == 'getOtherPlayerCityMapEntity') {
    const selected = msg.responseData;
    if (getPlayerID() != selected.player_id) setPlayerState('', selected.player_id);
    else setPlayerState(GBselected.player_name || '', selected.player_id);

    GBselected.id = selected.id;
    GBselected.name = helper.fGBname(selected.cityentity_id);
    GBselected.level = selected.level;
    GBselected.max_level = selected.max_level;
    GBselected.connected = selected.connected;
    GBselected.total = selected.state.forge_points_for_level_up;
    if (selected.state.invested_forge_points)
      GBselected.current = selected.state.invested_forge_points;
    else GBselected.current = 0;
    console.debug(GBselected);
  } else if (msg.requestMethod == 'getSocialList') {
    otherPlayerServiceUpdateActions(msg.responseData);
  } else if (msg.requestMethod == 'visitPlayer') {
    if (showOptions.showVisit) {
      clearVisitPlayer();
      otherPlayerService(msg);
    }
  } else if (msg.requestMethod == 'rewardPlunder') {
    const rewards = msg.responseData[0].product.resources;
    Object.keys(rewards).forEach((reward) => {
      var name = helper.fResourceShortName(reward);
      var qty = rewards[reward];

      if (!rewardsOtherPlayer[name]) rewardsOtherPlayer[name] = 0;
      rewardsOtherPlayer[name] += qty;
    });

    var reward = [];
    reward.source = 'otherPlayer';
    reward.name = '';
    reward.amount = 0;

    if (showOptions.showGErewards) {
      showReward(reward);
    }
  } else if (msg.requestMethod == 'rewardResources') {
    const rewards = msg.responseData.resources;

    Object.keys(rewards).forEach((reward) => {
      var name = helper.fResourceShortName(reward);
      var qty = rewards[reward];

      if (!rewardsOtherPlayer[name]) rewardsOtherPlayer[name] = 0;
      rewardsOtherPlayer[name] += qty;
    });

    var reward = [];
    reward.source = 'otherPlayer';
    reward.name = '';
    reward.amount = 0;

    if (showOptions.showGErewards) {
      showReward(reward);
    }
  } else if (msg.requestMethod == 'getCityProtections') {
    if (msg.responseData) setCityProtections(msg.responseData);
  } else {
    return false;
  }

  return true;
}
