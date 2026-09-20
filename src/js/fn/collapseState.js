/**
 * collapseState.js
 *
 * Centralized collapse state variables and setter for FoE-Info panels.
 * Extracted from src/js/fn/collapse.js.
 */

import { createLogger } from '../utils/logger.js';

const logger = createLogger('CollapseState');

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

const SETTERS = {
  collapseFriends: (v) => {
    collapseFriends = v;
  },
  collapseGuild: (v) => {
    collapseGuild = v;
  },
  collapseHood: (v) => {
    collapseHood = v;
  },
  collapseIncidents: (v) => {
    collapseIncidents = v;
  },
  collapseArmy: (v) => {
    collapseArmy = v;
  },
  collapseGoods: (v) => {
    collapseGoods = v;
  },
  collapseStats: (v) => {
    collapseStats = v;
  },
  collapseGBInfo: (v) => {
    collapseGBInfo = v;
  },
  collapseGBRewards: (v) => {
    collapseGBRewards = v;
  },
  collapseGBDonors: (v) => {
    collapseGBDonors = v;
  },
  collapseGBinvest: (v) => {
    collapseGBinvest = v;
  },
  collapseInvested: (v) => {
    collapseInvested = v;
  },
  collapseDonation: (v) => {
    collapseDonation = v;
  },
  collapseBattleground: (v) => {
    collapseBattleground = v;
  },
  collapseBuildingCost: (v) => {
    collapseBuildingCost = v;
  },
  collapseExpedition: (v) => {
    collapseExpedition = v;
  },
  collapseTreasury: (v) => {
    collapseTreasury = v;
  },
  collapseTreasuryLog: (v) => {
    collapseTreasuryLog = v;
  },
  collapseGalaxy: (v) => {
    collapseGalaxy = v;
  },
  collapseTarget: (v) => {
    collapseTarget = v;
  },
  collapseTargetGen: (v) => {
    collapseTargetGen = v;
  },
  collapseBuildings: (v) => {
    collapseBuildings = v;
  },
  collapseLists: (v) => {
    collapseLists = v;
  },
  collapseRewards: (v) => {
    collapseRewards = v;
  },
  collapseBonus: (v) => {
    collapseBonus = v;
  },
  collapseCultural: (v) => {
    collapseCultural = v;
  },
  collapseClipboard: (v) => {
    collapseClipboard = v;
  },
  collapseGBGLeaderboard: (v) => {
    collapseGBGLeaderboard = v;
  },
  collapseQIContributions: (v) => {
    collapseQIContributions = v;
  },
  collapseQILeaderboard: (v) => {
    collapseQILeaderboard = v;
  },
};

export function setCollapse(key, value) {
  const setter = SETTERS[key];
  if (setter) {
    setter(value);
    logger.debug('setCollapse updated key', { key, value });
  } else {
    logger.debug('setCollapse unknown key ignored', { key, value });
  }
}

export default setCollapse;
