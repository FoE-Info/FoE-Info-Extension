/**
 * combatGbToggles.js
 *
 * Collapse toggles for GB, donation, military, GBG, expedition, treasury, and QI panels.
 * Extracted from src/js/fn/collapse.js.
 */

import { createToggle } from '../ui/collapseToggleRunner.js';
import { createLogger } from '../utils/logger.js';
import {
  collapseArmy,
  collapseBattleground,
  collapseBuildingCost,
  collapseDonation,
  collapseExpedition,
  collapseGBDonors,
  collapseGBGLeaderboard,
  collapseGBInfo,
  collapseInvested,
  collapseQIContributions,
  collapseQILeaderboard,
  collapseRewards,
  collapseTarget,
  collapseTargetGen,
  collapseTreasury,
  collapseTreasuryLog,
  setCollapse,
} from './collapseState.js';

const logger = createLogger('CombatGbToggles');
logger.debug('CombatGbToggles initialized');

export const fCollapseGBInfo = createToggle({
  get: () => collapseGBInfo,
  set: (v) => setCollapse('collapseGBInfo', v),
  key: 'collapseGBInfo',
  persist: true,
  copyEls: ['gbInfoCopyID'],
  icons: [{ iconId: 'gbinfoicon', targetId: 'gbInfoCollapse' }],
});

export const fCollapseArmy = createToggle({
  get: () => collapseArmy,
  set: (v) => setCollapse('collapseArmy', v),
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

export const fCollapseRewards = createToggle({
  get: () => collapseRewards,
  set: (v) => setCollapse('collapseRewards', v),
  icons: [{ iconId: 'rewardsicon', targetId: 'rewardsText' }],
});

export const fCollapseGBDonors = createToggle({
  get: () => collapseGBDonors,
  set: (v) => setCollapse('collapseGBDonors', v),
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
  set: (v) => setCollapse('collapseInvested', v),
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
  set: (v) => setCollapse('collapseDonation', v),
  copyEls: ['donationCopyID'],
  icons: [{ iconId: 'donationicon', targetId: 'donationText3' }],
});

export const fCollapseBattleground = createToggle({
  get: () => collapseBattleground,
  set: (v) => setCollapse('collapseBattleground', v),
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
  set: (v) => setCollapse('collapseBuildingCost', v),
  icons: [{ iconId: 'buildingCosticon', targetId: 'buildingCostText' }],
});

export const fCollapseExpedition = createToggle({
  get: () => collapseExpedition,
  set: (v) => setCollapse('collapseExpedition', v),
  copyEls: ['expeditionCopyID', 'geChampionshipCopyID', 'geContributionCopyID'],
  icons: [
    { iconId: 'expeditionicon', targetId: 'expeditionText' },
    { iconId: 'geChampionshipIcon', targetId: 'geChampionshipText' },
    { iconId: 'geContributionIcon', targetId: 'geContributionText' },
  ],
});

export const fCollapseTreasury = createToggle({
  get: () => collapseTreasury,
  set: (v) => setCollapse('collapseTreasury', v),
  copyEls: ['treasuryCopyID'],
  icons: [{ iconId: 'treasuryicon', targetId: 'treasuryText' }],
});

export const fCollapseTreasuryLog = createToggle({
  get: () => collapseTreasuryLog,
  set: (v) => setCollapse('collapseTreasuryLog', v),
  icons: [{ iconId: 'treasuryLogicon', targetId: 'treasuryLogText' }],
});

export const fCollapseTarget = createToggle({
  get: () => collapseTarget,
  set: (v) => setCollapse('collapseTarget', v),
  copyEls: ['targetPostID'],
  icons: [{ iconId: 'targeticon', targetId: 'targetText' }],
});

export const fCollapseTargetGen = createToggle({
  get: () => collapseTargetGen,
  set: (v) => setCollapse('collapseTargetGen', v),
  icons: [{ iconId: 'targetGenicon', targetId: 'targetGenCollapse' }],
});

export const fCollapseGBGLeaderboard = createToggle({
  get: () => collapseGBGLeaderboard,
  set: (v) => setCollapse('collapseGBGLeaderboard', v),
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
  set: (v) => setCollapse('collapseQIContributions', v),
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
  set: (v) => setCollapse('collapseQILeaderboard', v),
  copyEls: ['qiLeaderboardCopyID'],
  icons: [
    {
      iconId: 'qiLeaderboardIcon',
      targetId: 'qiLeaderboardCollapse',
    },
  ],
});
