import { HandlerMessage } from './types';

type MiscMessage = HandlerMessage & {
  responseData?: unknown;
};

type MiscIgnoreData = {
  ignoredByPlayerIds?: unknown;
  ignoredPlayerIds?: unknown;
};

type MiscRankingResponse = {
  rankings: Array<{
    player: {
      is_self?: boolean;
      name: string;
      player_id: number;
    };
    clan: {
      name: string;
    };
  }>;
  category?: string;
};

type MiscHiddenRewardsResponse = {
  hiddenRewards: unknown[];
};

type MiscAdvancementResource = {
  requirements: {
    resources: Record<string, number>;
  };
  isUnlocked?: boolean;
};

type MiscAutoAidResponse = {
  id?: unknown;
  totalPeers?: unknown;
};

type MiscDeps = {
  conversationService: (msg: MiscMessage) => void;
  getConversation: (msg: MiscMessage) => void;
  armyUnitManagementService: (msg: MiscMessage) => void;
  clearStartup: () => void;
  clearBattleground: () => void;
  ignoredPlayers: MiscIgnoreData;
  setEpocTime: (time: number) => void;
  clearForMainCity: () => void;
  helper: {
    fShowIncidents: () => void;
    fResourceShortName: (resource: string) => string;
  };
  getResourceDefinitions: (msg: MiscMessage) => void;
  getPlayerResources: (msg: MiscMessage) => void;
  MyInfo: {
    name?: string;
    id?: number;
    guild?: string;
  };
  showOptions: {
    showStats?: boolean;
    showSettlement?: boolean;
  };
  citystats: {
    innerHTML: string;
  };
  setHiddenRewards: (rewards: unknown[]) => void;
  emissaryService: (msg: MiscMessage) => void;
  getCultural: () => HTMLElement;
  setCultural: (node: HTMLElement) => void;
  Resources: Record<string, number>;
  collapse: {
    collapseCultural?: boolean;
    fCollapseCultural: EventListener;
  };
  element: {
    close: () => string;
    icon: (iconId: string, targetId: string, collapsed?: boolean) => string;
  };
  showCultural: {
    clearCultural: () => void;
  };
  getBonuses: (msg: MiscMessage) => void;
  getLimitedBonuses: (msg: MiscMessage) => void;
  boostService: (msg: MiscMessage) => void;
  boostServiceAllBoosts: (msg: MiscMessage) => void;
};

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
    const ignoreData = msg.responseData as MiscIgnoreData | undefined;
    if (ignoreData) {
      console.debug('Ignored By:', ignoreData.ignoredByPlayerIds);
      console.debug('Ignoring:', ignoreData.ignoredPlayerIds);
      ignoredPlayers.ignoredByPlayerIds = ignoreData.ignoredByPlayerIds;
      ignoredPlayers.ignoredPlayerIds = ignoreData.ignoredPlayerIds;
      console.debug('Ignores:', ignoredPlayers);
    }
    return true;
  }

  if (
    msg.requestClass === 'TimeService' &&
    msg.requestMethod === 'updateTime'
  ) {
    const timeData = msg.responseData as { time: number } | undefined;
    if (timeData) {
      setEpocTime(timeData.time);
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

  if (
    msg.requestClass === 'TimerService' &&
    msg.requestMethod === 'getTimers'
  ) {
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
    const rankingData = msg.responseData as MiscRankingResponse;
    if (
      rankingData.rankings.length &&
      rankingData.category !== 'clan_battle_clan_global'
    ) {
      for (let j = 0; j < rankingData.rankings.length; j++) {
        if (rankingData.rankings[j].player.hasOwnProperty('is_self')) {
          if (
            MyInfo.name !== rankingData.rankings[j].player.name ||
            MyInfo.id !== rankingData.rankings[j].player.player_id
          ) {
            MyInfo.name = rankingData.rankings[j].player.name;
            MyInfo.id = rankingData.rankings[j].player.player_id;
            MyInfo.guild = rankingData.rankings[j].clan.name;
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
    const hiddenRewards = msg.responseData as MiscHiddenRewardsResponse;
    if (hiddenRewards.hiddenRewards.length) {
      setHiddenRewards(hiddenRewards.hiddenRewards);
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
    (msg.responseData as MiscAdvancementResource[]).forEach((resource) => {
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
      const autoAidData = msg.responseData as MiscAutoAidResponse;
      console.debug('AutoAidService', autoAidData.id, autoAidData.totalPeers);
    } else if (msg.requestMethod === '') {
      // no-op
    } else {
      console.debug('AutoAidService', msg);
    }
    return true;
  }

  return false;
}
