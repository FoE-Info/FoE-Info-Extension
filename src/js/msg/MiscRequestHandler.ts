import { HandlerMessage } from './types';

type MiscMessage = HandlerMessage & {
  responseData?: any;
};

type MiscDeps = Record<string, any>;

export function handleMiscRequest(msg: MiscMessage, deps: MiscDeps): boolean {
  const {
    conversationService,
    getConversation,
    armyUnitManagementService,
    clearStartup,
    clearBattleground,
    ignoredPlayers,
    setEpocTime,
    clearForMainCity,
    helper,
    getResourceDefinitions,
    getPlayerResources,
    MyInfo,
    showOptions,
    citystats,
    setHiddenRewards,
    emissaryService,
    getCultural,
    setCultural,
    Resources,
    collapse,
    element,
    showCultural,
    getBonuses,
    getLimitedBonuses,
    boostService,
    boostServiceAllBoosts,
  } = deps;

  if (msg.requestClass === 'ConversationService') {
    if (msg.requestMethod === 'getCategory') {
      conversationService(msg);
    } else if (msg.requestMethod === 'getOverviewForCategory') {
      conversationService(msg);
    } else if (msg.requestMethod === 'getConversation') {
      getConversation(msg);
    } else {
      return false;
    }
    return true;
  }

  if (
    msg.requestClass === 'ArmyUnitManagementService' &&
    msg.requestMethod === 'getArmyInfo'
  ) {
    armyUnitManagementService(msg);
    return true;
  }

  if (
    msg.requestClass === 'FriendsTavernService' &&
    msg.requestMethod === 'getSittingPlayersCount'
  ) {
    return true;
  }

  if (
    msg.requestClass === 'IgnorePlayerService' &&
    msg.requestMethod === 'getIgnoreList'
  ) {
    clearStartup();
    clearBattleground();
    if (msg.responseData) {
      console.debug('Ignored By:', msg.responseData.ignoredByPlayerIds);
      console.debug('Ignoring:', msg.responseData.ignoredPlayerIds);
      ignoredPlayers.ignoredByPlayerIds = msg.responseData.ignoredByPlayerIds;
      ignoredPlayers.ignoredPlayerIds = msg.responseData.ignoredPlayerIds;
      console.debug('Ignores:', ignoredPlayers);
    }
    return true;
  }

  if (msg.requestClass === 'TimeService' && msg.requestMethod === 'updateTime') {
    if (msg.responseData) {
      setEpocTime(msg.responseData.time);
    }
    return true;
  }

  if (
    msg.requestClass === 'AnnouncementsService' &&
    msg.requestMethod === 'fetchAllAnnouncements'
  ) {
    clearForMainCity();
    helper.fShowIncidents();
    return true;
  }

  if (msg.requestClass === 'TimerService' && msg.requestMethod === 'getTimers') {
    return true;
  }

  if (msg.requestClass === 'ResourceService') {
    if (msg.requestMethod === 'getResourceDefinitions') {
      getResourceDefinitions(msg);
    } else if (msg.requestMethod === 'getPlayerResources') {
      getPlayerResources(msg);
    } else {
      return false;
    }
    return true;
  }

  if (
    msg.requestClass === 'RankingService' &&
    msg.requestMethod === 'searchRanking'
  ) {
    if (
      msg.responseData.rankings.length &&
      msg.responseData.category !== 'clan_battle_clan_global'
    ) {
      for (let j = 0; j < msg.responseData.rankings.length; j++) {
        if (msg.responseData.rankings[j].player.hasOwnProperty('is_self')) {
          if (
            MyInfo.name !== msg.responseData.rankings[j].player.name ||
            MyInfo.id !== msg.responseData.rankings[j].player.player_id
          ) {
            MyInfo.name = msg.responseData.rankings[j].player.name;
            MyInfo.id = msg.responseData.rankings[j].player.player_id;
            MyInfo.guild = msg.responseData.rankings[j].clan.name;
            console.debug('user :', MyInfo);
            if (showOptions.showStats) {
              citystats.innerHTML = `<div class="alert alert-warning"><strong>${MyInfo.name}</strong></div>`;
            }
          }
        }
      }
    }
    return true;
  }

  if (
    msg.requestClass === 'HiddenRewardService' &&
    msg.requestMethod === 'getOverview'
  ) {
    if (msg.responseData.hiddenRewards.length) {
      setHiddenRewards(msg.responseData.hiddenRewards);
    } else {
      setHiddenRewards([]);
    }
    helper.fShowIncidents();
    return true;
  }

  if (
    msg.requestClass === 'EmissaryService' &&
    msg.requestMethod === 'getAssigned'
  ) {
    emissaryService(msg);
    return true;
  }

  if (
    msg.requestClass === 'AdvancementService' &&
    msg.requestMethod === 'getAll'
  ) {
    showCultural.clearCultural();
    const culturalGoods: Record<string, number> = {};
    msg.responseData.forEach((resource: any) => {
      const rss = resource.requirements.resources;

      if (resource.isUnlocked !== true) {
        Object.keys(rss).forEach((entry) => {
          if (culturalGoods[entry]) {
            culturalGoods[entry] += rss[entry];
          } else {
            culturalGoods[entry] = rss[entry];
          }
        });
      }
    });

    let culturalHTML = `<div  role="alert">
							${element.close()}
							<p id="culturalTextLabel" href="#culturalText" data-bs-toggle="collapse">
							${element.icon('culturalicon', 'culturalText', collapse.collapseCultural)}
							<strong><span data-i18n="cultural">Cultural Settlement</span></strong></p>`;

    culturalHTML +=
      '<div id="culturalText" class="collapse show"><span data-i18n="needed">Goods Needed</span>:<br>';

    Object.keys(culturalGoods).forEach((entry) => {
      let needed = culturalGoods[entry];
      if (Resources[entry]) {
        needed -= Resources[entry];
      }
      if (entry !== 'diplomacy' && needed > 0) {
        culturalHTML += `${needed} ${helper.fResourceShortName(entry)}<br>`;
      }
    });

    if (showOptions.showSettlement) {
      let cultural = getCultural();
      if (document.getElementById('cultural') == null) {
        cultural = document.createElement('div');
        document.getElementById('content')?.appendChild(cultural);
        cultural.id = 'cultural';
        setCultural(cultural);
      }
      cultural.innerHTML = culturalHTML + `</div></div>`;
      cultural.className = 'alert alert-info alert-dismissible show collapsed';
      document
        .getElementById('culturalicon')
        ?.addEventListener('click', collapse.fCollapseCultural);
      document
        .getElementById('culturalTextLabel')
        ?.addEventListener('click', collapse.fCollapseCultural);
    }

    return true;
  }

  if (msg.requestClass === 'BonusService') {
    if (msg.requestMethod === 'getLimitedBonuses') {
      getLimitedBonuses(msg);
    } else if (msg.requestMethod === 'getBonuses') {
      getBonuses(msg);
      if (document.getElementById('targetsGBG')) {
        document.getElementById('targetsGBG')!.innerHTML = '';
      }
    } else {
      return false;
    }
    return true;
  }

  if (msg.requestClass === 'BoostService') {
    if (msg.requestMethod === 'getOverview') {
      boostService(msg);
    } else if (msg.requestMethod === 'getAllBoosts') {
      boostServiceAllBoosts(msg);
    } else if (msg.requestMethod === 'getTimerBoost') {
      // TODO
    } else {
      return false;
    }
    return true;
  }

  if (msg.requestClass === 'AutoAidService') {
    console.debug('AutoAidService', msg);
    if (msg.requestMethod === 'collect') {
      console.debug(
        'AutoAidService',
        msg.responseData.id,
        msg.responseData.totalPeers,
      );
    } else if (msg.requestMethod === '') {
      // no-op
    } else {
      console.debug('AutoAidService', msg);
    }
    return true;
  }

  return false;
}
