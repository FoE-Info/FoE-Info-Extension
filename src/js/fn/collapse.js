/**
 * collapse.js
 *
 * Bootstrap collapse/alert/popover state bindings and declarative toggle
 * functions for extension panels and cards.
 */

import { createToggle, hideAllTooltips } from '../ui/collapseToggleRunner.js';

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

export default function set(key, value) {
  const setter = SETTERS[key];
  if (setter) {
    setter(value);
  }
}

export const fCollapseGBInfo = createToggle({
  get: () => collapseGBInfo,
  set: (v) => {
    collapseGBInfo = v;
  },
  key: 'collapseGBInfo',
  persist: true,
  copyEls: ['gbInfoCopyID'],
  icons: [{ iconId: 'gbinfoicon', targetId: 'gbInfoCollapse' }],
});

export const fCollapseFriends = createToggle({
  get: () => collapseFriends,
  set: (v) => {
    collapseFriends = v;
  },
  copyEls: [{ id: 'friendsCopyID', display: 'inline-block' }],
  icons: [{ iconId: 'friendsicon', targetId: 'friendsText' }],
});

export const fCollapseLists = createToggle({
  get: () => collapseLists,
  set: (v) => {
    collapseLists = v;
  },
  icons: [{ iconId: 'listsicon', targetId: 'listsText' }],
});

export const fCollapseHood = createToggle({
  get: () => collapseHood,
  set: (v) => {
    collapseHood = v;
  },
  copyEls: [{ id: 'hoodCopyID', display: 'inline-block' }],
  icons: [{ iconId: 'hoodicon', targetId: 'hoodText' }],
});

export const fCollapseGalaxy = createToggle({
  get: () => collapseGalaxy,
  set: (v) => {
    collapseGalaxy = v;
  },
  icons: [{ iconId: 'galaxyicon', targetId: 'galaxyText' }],
});

export const fCollapseGuild = createToggle({
  get: () => collapseGuild,
  set: (v) => {
    collapseGuild = v;
  },
  copyEls: [{ id: 'guildCopyID', display: 'inline-block' }],
  icons: [
    { iconId: 'guildicon', targetId: 'guildText' },
    { iconId: 'guildOverviewIcon', targetId: 'guildOverviewText' },
  ],
});

export const fCollapseIncidents = createToggle({
  get: () => collapseIncidents,
  set: (v) => {
    collapseIncidents = v;
  },
  hideTooltips: true,
  icons: [{ iconId: 'incidentsicon', targetId: 'incidentsText' }],
});

export const fCollapseArmy = createToggle({
  get: () => collapseArmy,
  set: (v) => {
    collapseArmy = v;
  },
  onToggle: (next, doc) => {
    const armyUnits = doc.getElementById('armyUnits');
    const armyUnits2 = doc.getElementById('armyUnits2');
    const armyUnits3 = doc.getElementById('armyUnits3');
    if (armyUnits) {
      armyUnits.innerHTML =
        next && armyUnits2 && armyUnits3 ?
          armyUnits2.innerHTML + ' ' + armyUnits3.innerHTML
        : '';
    }
  },
  icons: [{ iconId: 'armyicon', targetId: 'armyText' }],
});

export const fCollapseGoods = createToggle({
  get: () => collapseGoods,
  set: (v) => {
    collapseGoods = v;
  },
  copyEls: ['goodsCopyID'],
  icons: [{ iconId: 'goodsicon', targetId: 'goodsText' }],
});

export const fCollapseStats = createToggle({
  get: () => collapseStats,
  set: (v) => {
    collapseStats = v;
  },
  hideTooltips: true,
  copyEls: ['citystatsCopyID'],
  icons: [{ iconId: 'citystatsicon', targetId: 'citystatsText' }],
});

export const fCollapseRewards = createToggle({
  get: () => collapseRewards,
  set: (v) => {
    collapseRewards = v;
  },
  icons: [{ iconId: 'rewardsicon', targetId: 'rewardsText' }],
});

export const fCollapseGBDonors = createToggle({
  get: () => collapseGBDonors,
  set: (v) => {
    collapseGBDonors = v;
  },
  copyEls: ['donorCopyID'],
  icons: [
    {
      iconId: (doc) =>
        doc && doc.getElementById('gbinvesticon') ?
          'gbinvesticon'
        : 'donoricon',
      targetId: (doc) =>
        doc && doc.getElementById('donorText') ? 'donorText' : 'donorcollapse',
    },
  ],
});

export const fCollapseInvested = createToggle({
  get: () => collapseInvested,
  set: (v) => {
    collapseInvested = v;
  },
  copyEls: ['investedCopyID'],
  onToggle: (next, doc) => {
    const onHandEl = doc.getElementById('onHandFP');
    const availableFpEl = doc.getElementById('availableFPID');
    if (onHandEl) {
      if (next && availableFpEl) {
        onHandEl.innerHTML = `<span data-i18n="available">Available FP</span>: ${availableFpEl.innerHTML}`;
      } else {
        onHandEl.innerHTML = '';
      }
    }
  },
  icons: [{ iconId: 'investedicon', targetId: 'investedText' }],
});

export const fCollapseDonation = createToggle({
  get: () => collapseDonation,
  set: (v) => {
    collapseDonation = v;
  },
  copyEls: ['donationCopyID'],
  icons: [{ iconId: 'donationicon', targetId: 'donationText3' }],
});

export const fCollapseBattleground = createToggle({
  get: () => collapseBattleground,
  set: (v) => {
    collapseBattleground = v;
  },
  copyEls: ['battlegroundPostID', 'battlegroundCopyID'],
  icons: [
    {
      iconId: 'battlegroundicon',
      targetId: (doc) =>
        doc && doc.getElementById('battlegroundTextCollapse') ?
          'battlegroundTextCollapse'
        : 'battlegroundCollapse',
    },
  ],
});

export const fCollapseBuildingCost = createToggle({
  get: () => collapseBuildingCost,
  set: (v) => {
    collapseBuildingCost = v;
  },
  icons: [{ iconId: 'buildingCosticon', targetId: 'buildingCostText' }],
});

export const fCollapseBuildings = createToggle({
  get: () => collapseBuildings,
  set: (v) => {
    collapseBuildings = v;
  },
  icons: [{ iconId: 'buildingsicon', targetId: 'buildingsText' }],
});

export const fCollapseExpedition = createToggle({
  get: () => collapseExpedition,
  set: (v) => {
    collapseExpedition = v;
  },
  copyEls: ['expeditionCopyID', 'geChampionshipCopyID', 'geContributionCopyID'],
  icons: [
    { iconId: 'expeditionicon', targetId: 'expeditionText' },
    { iconId: 'geChampionshipIcon', targetId: 'geChampionshipText' },
    { iconId: 'geContributionIcon', targetId: 'geContributionText' },
  ],
});

export const fCollapseTreasury = createToggle({
  get: () => collapseTreasury,
  set: (v) => {
    collapseTreasury = v;
  },
  copyEls: ['treasuryCopyID'],
  icons: [{ iconId: 'treasuryicon', targetId: 'treasuryText' }],
});

export const fCollapseTreasuryLog = createToggle({
  get: () => collapseTreasuryLog,
  set: (v) => {
    collapseTreasuryLog = v;
  },
  icons: [{ iconId: 'treasuryLogicon', targetId: 'treasuryLogText' }],
});

export const fCollapseTarget = createToggle({
  get: () => collapseTarget,
  set: (v) => {
    collapseTarget = v;
  },
  copyEls: ['targetPostID'],
  icons: [{ iconId: 'targeticon', targetId: 'targetText' }],
});

export const fCollapseTargetGen = createToggle({
  get: () => collapseTargetGen,
  set: (v) => {
    collapseTargetGen = v;
  },
  icons: [{ iconId: 'targetGenicon', targetId: 'targetGenCollapse' }],
});

export const fCollapseBonus = createToggle({
  get: () => collapseBonus,
  set: (v) => {
    collapseBonus = v;
  },
  icons: [{ iconId: 'bonusicon', targetId: 'bonusText' }],
});

export const fCollapseCultural = createToggle({
  get: () => collapseCultural,
  set: (v) => {
    collapseCultural = v;
  },
  icons: [{ iconId: 'culturalicon', targetId: 'culturalText' }],
});

export const fCollapseClipboard = createToggle({
  get: () => collapseClipboard,
  set: (v) => {
    collapseClipboard = v;
  },
  key: 'collapseClipboard',
  persist: true,
  copyEls: ['clipboardCopyID'],
  icons: [{ iconId: 'clipboardicon', targetId: 'clipboardText' }],
});

export const fCollapseGBGLeaderboard = createToggle({
  get: () => collapseGBGLeaderboard,
  set: (v) => {
    collapseGBGLeaderboard = v;
  },
  copyEls: ['gbgLeaderboardCopyID'],
  icons: [
    {
      iconId: 'gbgLeaderboardIcon',
      targetId: 'gbgLeaderboardCollapse',
    },
  ],
});

export const fCollapseQIContributions = createToggle({
  get: () => collapseQIContributions,
  set: (v) => {
    collapseQIContributions = v;
  },
  copyEls: ['qiContributionsCopyID'],
  icons: [
    {
      iconId: 'qiContributionsIcon',
      targetId: 'qiContributionsCollapse',
    },
  ],
});

export const fCollapseQILeaderboard = createToggle({
  get: () => collapseQILeaderboard,
  set: (v) => {
    collapseQILeaderboard = v;
  },
  copyEls: ['qiLeaderboardCopyID'],
  icons: [
    {
      iconId: 'qiLeaderboardIcon',
      targetId: 'qiLeaderboardCollapse',
    },
  ],
});

export { hideAllTooltips as fHideAllTooltips };
