/**
 * collapseState.js
 *
 * Centralized collapse state variables and setter for FoE-Info panels.
 * Extracted from src/js/fn/collapse.mjs.
 */

import { createLogger } from '../utils/logger.js';

const logger = createLogger('CollapseState');

export let collapseFriends = true;
export let collapseGuild = true;
export let collapseHood = true;
export let collapseIncidents = true;
export let collapseArmy = false;
export let collapseGoods = true;
export let collapseStats = false;
export let collapseGBInfo = false;
export let collapseGBRewards = false;
export let collapseGBDonors = false;
export let collapseGBinvest = false;
export let collapseInvested = false;
export let collapseDonation = false;
export let collapseBattleground = false;
export let collapseBuildingCost = true;
export let collapseExpedition = false;
export let collapseTreasury = false;
export let collapseTreasuryLog = false;
export let collapseTreasuryContributions = false;
export let collapseGalaxy = false;
export let collapseTarget = false;
export let collapseTargetGen = false;
export let collapseBuildings = false;
export let collapseLists = false;
export let collapseRewards = false;
export let collapseBonus = true;
export let collapseCultural = true;
export let collapseClipboard = true;
export let collapseGBGLeaderboard = false;
export let collapseQIContributions = false;
export let collapseQILeaderboard = false;

const SETTERS = {
  collapseTreasuryContributions: (v) => {
    collapseTreasuryContributions = v;
  },
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
