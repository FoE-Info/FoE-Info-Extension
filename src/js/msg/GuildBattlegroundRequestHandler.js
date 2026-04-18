export function handleGuildBattlegroundRequest(msg, deps) {
  if (!msg) {
    return false;
  }

  const {
    showOptions,
    clearForBattleground,
    getLeaderboard,
    getPlayerLeaderboard,
    getBattleground,
    getState,
    getBuildings,
  } = deps;

  if (msg.requestClass == 'GuildBattlegroundService') {
    if (msg.requestMethod == 'getLeaderboard') {
      if (showOptions.showLeaderboard) getLeaderboard(msg);
    } else if (msg.requestMethod == 'getPlayerLeaderboard') {
      getPlayerLeaderboard(msg);
    } else if (msg.requestMethod == 'getBattleground') {
      clearForBattleground();
      getBattleground(msg);
    } else if (msg.requestMethod == 'getState') {
      if (msg.responseData.stateId == 'participating') {
        // no-op
      }
    } else {
      console.debug('GuildBattlegroundService', msg);
    }
    return true;
  }

  if (msg.requestClass == 'GuildBattlegroundStateService') {
    if (
      msg.requestMethod == 'getState' &&
      msg.responseData.stateId == 'participating'
    ) {
      // no-op
    } else if (
      msg.requestMethod == 'getState' &&
      showOptions.showBattleground
    ) {
      getState(msg);
    } else {
      console.debug('GuildBattlegroundStateService', msg);
    }
    return true;
  }

  if (msg.requestClass == 'GuildBattlegroundBuildingService') {
    if (msg.requestMethod == 'getBuildings') {
      getBuildings(msg);
    } else {
      console.debug('GuildBattlegroundBuildingService', msg);
    }
    return true;
  }

  return false;
}
