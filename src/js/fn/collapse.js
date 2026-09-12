/** Bootstrap collapse/alert/popover binding helpers for panel toggles. */
import { Alert, Popover, Tooltip } from 'bootstrap';
import { checkDebug } from '../vars/state.js';
import * as element from './AddElement.js';
import * as storage from './storage.js';

export var collapseFriends = true;
export var collapseGuild = true;
export var collapseHood = true;
export var collapseIncidents = true;
export var collapseArmy = false;
export var collapseGoods = true;
export var collapseStats = false;
export var collapseGBInfo = false;
export var collapseGBRewards = false;
export var collapseGBDonors = false;
export var collapseGBinvest = false;
export var collapseInvested = false;
export var collapseDonation = false;
export var collapseBattleground = false;
export var collapseBuildingCost = true;
export var collapseExpedition = false;
export var collapseTreasury = true;
export var collapseTreasuryLog = true;
export var collapseGalaxy = false;
export var collapseTarget = false;
export var collapseTargetGen = false;
export var collapseBuildings = false;
export var collapseLists = false;
export var collapseRewards = false;
export var collapseBonus = true;
export var collapseCultural = true;
export var collapseClipboard = true;
export var collapseGBGLeaderboard = false;
export var collapseQIContributions = false;
export var collapseQILeaderboard = false;

// export default class set {
// 	constructor(name, state) {
// 		this[name] = state;
// 	}
// }

// export default function set (name, state){
// 	console.debug(name,state);
// 	this.name = state;
// 	console.debug(this.name);
// }

export default function set(key, value) {
  // console.debug(key, value);
  switch (key) {
    case 'collapseFriends':
      collapseFriends = value;
      // console.debug(collapseFriends);
      break;
    case 'collapseGuild':
      collapseGuild = value;
      break;
    case 'collapseStats':
      collapseStats = value;
      break;
    case 'collapseGoods':
      collapseGoods = value;
      break;
    case 'collapseIncidents':
      collapseIncidents = value;
      break;
    case 'collapseHood':
      collapseHood = value;
      break;
    case 'collapseArmy':
      collapseArmy = value;
      break;

    case 'collapseGBInfo':
      collapseGBInfo = value;
      break;
    case 'collapseGBRewards':
      collapseGBRewards = value;
      break;
    case 'collapseGBDonors':
      collapseGBDonors = value;
      break;
    case 'collapseGBinvest':
      collapseGBinvest = value;
      break;
    case 'collapseInvested':
      collapseInvested = value;
      break;
    case 'collapseDonation':
      collapseDonation = value;
      break;
    case 'collapseBattleground':
      collapseBattleground = value;
      break;
    case 'collapseBuildingCost':
      collapseBuildingCost = value;
      break;
    case 'collapseExpedition':
      collapseExpedition = value;
      break;
    case 'collapseTreasury':
      collapseTreasury = value;
      break;
    case 'collapseTreasuryLog':
      collapseTreasuryLog = value;
      break;
    case 'collapseGalaxy':
      collapseGalaxy = value;
      break;
    case 'collapseTarget':
      collapseTarget = value;
      break;
    case 'collapseTargetGen':
      collapseTargetGen = value;
      break;
    case 'collapseBuildings':
      collapseBuildings = value;
      break;
    case 'collapseLists':
      collapseLists = value;
      break;
    case 'collapseRewards':
      collapseRewards = value;
      break;
    case 'collapseBonus':
      collapseBonus = value;
      break;
    case 'collapseCultural':
      collapseCultural = value;
      break;
    case 'collapseClipboard':
      collapseClipboard = value;
      break;

    default:
      // console.debug(key, value);
      break;
  }
}

export function fCollapseGBInfo() {
  collapseGBInfo = !collapseGBInfo;
  storage.setCollapse('collapseGBInfo', collapseGBInfo);
  const copyEl = document.getElementById('gbInfoCopyID');
  if (copyEl) {
    copyEl.style.display = collapseGBInfo ? 'none' : 'block';
  }
  element.updateIcon('gbinfoicon', 'gbInfoCollapse', collapseGBInfo);
}

export function fCollapseFriends() {
  collapseFriends = !collapseFriends;
  const copyEl =
    typeof document !== 'undefined' && document.getElementById('friendsCopyID');
  if (copyEl) {
    copyEl.style.display = collapseFriends ? 'none' : 'inline-block';
  }
  // console.debug('collapseFriends',collapseFriends);
  element.updateIcon('friendsicon', 'friendsText', collapseFriends);
}

export function fCollapseLists() {
  collapseLists = !collapseLists;
  element.updateIcon('listsicon', 'listsText', collapseLists);
}

export function fCollapseHood() {
  collapseHood = !collapseHood;
  const copyEl =
    typeof document !== 'undefined' && document.getElementById('hoodCopyID');
  if (copyEl) {
    copyEl.style.display = collapseHood ? 'none' : 'inline-block';
  }
  // console.debug('collapseHood',collapseHood);
  element.updateIcon('hoodicon', 'hoodText', collapseHood);
}

export function fCollapseGalaxy() {
  collapseGalaxy = !collapseGalaxy;
  // storage.set('collapseGalaxy', collapseGalaxy);
  element.updateIcon('galaxyicon', 'galaxyText', collapseGalaxy);
}

export function fCollapseGuild() {
  collapseGuild = !collapseGuild;
  const copyEl =
    typeof document !== 'undefined' && document.getElementById('guildCopyID');
  if (copyEl) {
    copyEl.style.display = collapseGuild ? 'none' : 'inline-block';
  }
  // console.debug('collapseGuild',collapseGuild);
  element.updateIcon('guildicon', 'guildText', collapseGuild);
  element.updateIcon('guildOverviewIcon', 'guildOverviewText', collapseGuild);
}

export function fCollapseIncidents() {
  fHideAllTooltips();
  collapseIncidents = !collapseIncidents;
  element.updateIcon('incidentsicon', 'incidentsText', collapseIncidents);
  // console.debug('collapseIncidents',collapseIncidents);
}

export function fCollapseArmy() {
  collapseArmy = !collapseArmy;
  if (typeof document !== 'undefined') {
    const armyUnits = document.getElementById('armyUnits');
    const armyUnits2 = document.getElementById('armyUnits2');
    const armyUnits3 = document.getElementById('armyUnits3');
    if (armyUnits) {
      armyUnits.innerHTML =
        collapseArmy && armyUnits2 && armyUnits3 ?
          armyUnits2.innerHTML + ' ' + armyUnits3.innerHTML
        : '';
    }
  }
  element.updateIcon('armyicon', 'armyText', collapseArmy);
}

export function fCollapseGoods() {
  collapseGoods = !collapseGoods;
  const copyEl =
    typeof document !== 'undefined' ?
      document.getElementById('goodsCopyID')
    : null;
  if (copyEl) {
    copyEl.style.display = collapseGoods ? 'none' : 'block';
  }
  element.updateIcon('goodsicon', 'goodsText', collapseGoods);
}

export function fCollapseStats() {
  fHideAllTooltips();
  collapseStats = !collapseStats;
  // console.debug('collapseStats',collapseStats);
  const copyEl =
    typeof document !== 'undefined' ?
      document.getElementById('citystatsCopyID')
    : null;
  if (copyEl) {
    copyEl.style.display = collapseStats ? 'none' : 'block';
  }
  element.updateIcon('citystatsicon', 'citystatsText', collapseStats);
}

export function fCollapseRewards() {
  collapseRewards = !collapseRewards;
  // console.debug('collapseRewards',collapseRewards);
  element.updateIcon('rewardsicon', 'rewardsText', collapseRewards);
}

export function fCollapseGBDonors() {
  collapseGBDonors = !collapseGBDonors;
  const copyEl =
    typeof document !== 'undefined' ?
      document.getElementById('donorCopyID')
    : null;
  if (copyEl) {
    copyEl.style.display = collapseGBDonors ? 'none' : 'block';
  }
  const iconId =
    typeof document !== 'undefined' && document.getElementById('gbinvesticon') ?
      'gbinvesticon'
    : 'donoricon';
  const targetId =
    typeof document !== 'undefined' && document.getElementById('donorText') ?
      'donorText'
    : 'donorcollapse';
  element.updateIcon(iconId, targetId, collapseGBDonors);
}

export function fCollapseInvested() {
  collapseInvested = !collapseInvested;
  if (typeof document !== 'undefined') {
    const onHandEl = document.getElementById('onHandFP');
    const availableFpEl = document.getElementById('availableFPID');
    if (onHandEl) {
      if (collapseInvested && availableFpEl) {
        onHandEl.innerHTML = `<span data-i18n="available">Available FP</span>: ${availableFpEl.innerHTML}`;
      } else {
        onHandEl.innerHTML = '';
      }
    }
    const copyEl = document.getElementById('investedCopyID');
    if (copyEl) {
      copyEl.style.display = collapseInvested ? 'none' : 'block';
    }
  }
  element.updateIcon('investedicon', 'investedText', collapseInvested);
}

// export function fcollapseGBinvest() {
// 	collapseGBinvest = !collapseGBinvest;
// 	// storage.set('collapseGBinvest', collapseGBinvest);
// 	// console.debug('fcollapseGBinvest',collapseOptions);
// 	element.updateIcon("guildicon","guildText",collapseGuild);
// }

export function fCollapseDonation() {
  collapseDonation = !collapseDonation;
  // console.debug('fCollapseDonation',collapseOptions);
  const copyEl =
    typeof document !== 'undefined' ?
      document.getElementById('donationCopyID')
    : null;
  if (copyEl) {
    copyEl.style.display = collapseDonation ? 'none' : 'block';
  }
  element.updateIcon('donationicon', 'donationText3', collapseDonation);
}

export function fCollapseBattleground() {
  collapseBattleground = !collapseBattleground;
  // console.debug('fCollapseBattleground',collapseOptions);
  if (typeof document !== 'undefined') {
    const postEl = document.getElementById('battlegroundPostID');
    if (postEl) {
      postEl.style.display = collapseBattleground ? 'none' : 'block';
    }
    const copyEl = document.getElementById('battlegroundCopyID');
    if (copyEl) {
      copyEl.style.display = collapseBattleground ? 'none' : 'block';
    }
  }
  const targetId =
    (
      typeof document !== 'undefined' &&
      document.getElementById('battlegroundTextCollapse')
    ) ?
      'battlegroundTextCollapse'
    : 'battlegroundCollapse';
  element.updateIcon('battlegroundicon', targetId, collapseBattleground);
}

export function fCollapseBuildingCost() {
  collapseBuildingCost = !collapseBuildingCost;
  // console.debug('collapseBuildingCost',collapseBuildingCost);
  element.updateIcon(
    'buildingCosticon',
    'buildingCostText',
    collapseBuildingCost,
  );
}

export function fCollapseBuildings() {
  collapseBuildings = !collapseBuildings;
  // console.debug('collapseBuildings',collapseBuildings);
  element.updateIcon('buildingsicon', 'buildingsText', collapseBuildings);
}

export function fCollapseExpedition() {
  collapseExpedition = !collapseExpedition;
  if (typeof document !== 'undefined') {
    const copyIds = [
      'expeditionCopyID',
      'geChampionshipCopyID',
      'geContributionCopyID',
    ];
    for (const id of copyIds) {
      const el = document.getElementById(id);
      if (el) {
        el.style.display = collapseExpedition ? 'none' : 'block';
      }
    }
  }
  element.updateIcon('expeditionicon', 'expeditionText', collapseExpedition);
  element.updateIcon(
    'geChampionshipIcon',
    'geChampionshipText',
    collapseExpedition,
  );
  element.updateIcon(
    'geContributionIcon',
    'geContributionText',
    collapseExpedition,
  );
}

export function fCollapseTreasury() {
  collapseTreasury = !collapseTreasury;
  if (typeof document !== 'undefined') {
    const copyEl = document.getElementById('treasuryCopyID');
    if (copyEl) {
      copyEl.style.display = collapseTreasury ? 'none' : 'block';
    }
  }
  element.updateIcon('treasuryicon', 'treasuryText', collapseTreasury);
}

export function fCollapseTreasuryLog() {
  collapseTreasuryLog = !collapseTreasuryLog;
  element.updateIcon('treasuryLogicon', 'treasuryLogText', collapseTreasuryLog);
}

export function fCollapseTarget() {
  collapseTarget = !collapseTarget;
  if (typeof document !== 'undefined') {
    const postEl = document.getElementById('targetPostID');
    if (postEl) {
      postEl.style.display = collapseTarget ? 'none' : 'block';
    }
  }
  element.updateIcon('targeticon', 'targetText', collapseTarget);
}

export function fCollapseTargetGen() {
  collapseTargetGen = !collapseTargetGen;
  element.updateIcon('targetGenicon', 'targetGenCollapse', collapseTargetGen);
}

export function fCollapseBonus() {
  collapseBonus = !collapseBonus;
  element.updateIcon('bonusicon', 'bonusText', collapseBonus);
}

export function fCollapseCultural() {
  collapseCultural = !collapseCultural;
  element.updateIcon('culturalicon', 'culturalText', collapseCultural);
}

export function fCollapseClipboard() {
  collapseClipboard = !collapseClipboard;
  storage.setCollapse('collapseClipboard', collapseClipboard);
  if (typeof document !== 'undefined') {
    const copyEl = document.getElementById('clipboardCopyID');
    if (copyEl) {
      copyEl.style.display = collapseClipboard ? 'none' : 'block';
    }
  }
  element.updateIcon('clipboardicon', 'clipboardText', collapseClipboard);
}

export function fCollapseGBGLeaderboard() {
  collapseGBGLeaderboard = !collapseGBGLeaderboard;
  if (typeof document !== 'undefined') {
    const copyEl = document.getElementById('gbgLeaderboardCopyID');
    if (copyEl) {
      copyEl.style.display = collapseGBGLeaderboard ? 'none' : 'block';
    }
  }
  element.updateIcon(
    'gbgLeaderboardIcon',
    'gbgLeaderboardCollapse',
    collapseGBGLeaderboard,
  );
}

export function fCollapseQIContributions() {
  collapseQIContributions = !collapseQIContributions;
  if (typeof document !== 'undefined') {
    const copyEl = document.getElementById('qiContributionsCopyID');
    if (copyEl) {
      copyEl.style.display = collapseQIContributions ? 'none' : 'block';
    }
  }
  element.updateIcon(
    'qiContributionsIcon',
    'qiContributionsCollapse',
    collapseQIContributions,
  );
}

export function fCollapseQILeaderboard() {
  collapseQILeaderboard = !collapseQILeaderboard;
  if (typeof document !== 'undefined') {
    const copyEl = document.getElementById('qiLeaderboardCopyID');
    if (copyEl) {
      copyEl.style.display = collapseQILeaderboard ? 'none' : 'block';
    }
  }
  element.updateIcon(
    'qiLeaderboardIcon',
    'qiLeaderboardCollapse',
    collapseQILeaderboard,
  );
}

function fHideAllTooltips() {
  const popoverTriggerList = document.querySelectorAll(
    '[data-bs-toggle="popover"]',
  );
  const popoverList = [...popoverTriggerList].map((popoverEl) =>
    Popover.getOrCreateInstance(popoverEl).hide(),
  );
  const tooltipTriggerList = document.querySelectorAll(
    '[data-bs-toggle="tooltip"]',
  );
  const tooltipList = [...tooltipTriggerList].map((tooltipEl) =>
    Tooltip.getOrCreateInstance(tooltipEl).hide(),
  );
  if (checkDebug()) console.debug('fHideAllTooltips');
}
