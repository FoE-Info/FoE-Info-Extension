/**
 * gbDonationTables.js
 *
 * DOM builders and card renderers for Great Building donation places.
 * Provides gbTabSafe, gbTabNotSafe, gbTabEmpty, and getPlaceValues.
 */

const BigNumber = require('bignumber.js');
const { calculateDonorOutcome } = require('../calc/GreatBuildingCalculator.js');
const {
  resolveCardParams,
  buildCardFooter,
  gbTabSafe,
  gbTabNotSafe,
  gbTabEmpty,
  getPlayerLink,
  inactiveHTML,
  checkInactive,
  getDonations_new,
} = require('./gbPlaceTableRows.js');

let stateModule;
try {
  stateModule = require('../vars/state.js');
} catch {
  stateModule = {};
}
const defaultGBselected = stateModule.GBselected || {};

function fPercentBanded(percent) {
  const num = typeof percent === 'number' ? percent : Number(percent);
  if (num >= 20) return 'green';
  if (num >= 10) return 'invest-good';
  if (num > 5) return 'invest-fair';
  return '';
}

function fDonationSuggest(reward, currentPercent = 190) {
  return new BigNumber(reward || 0)
    .times(currentPercent)
    .div(100)
    .integerValue(BigNumber.ROUND_HALF_UP);
}

function getPlaceValues(
  gbData,
  place,
  topInvestors = [],
  rewards = [],
  currentPercent = 190,
  arcBonus = 90,
) {
  let p = place;
  let data = gbData;
  let top = topInvestors;
  let rew = rewards;
  let percent = currentPercent;
  let arc = arcBonus;

  if (typeof gbData === 'number') {
    p = gbData;
    data = defaultGBselected;
    top = [];
    rew = [];
    percent = currentPercent ?? 190;
    arc = arcBonus ?? 90;
  }

  const index = Math.max(0, (p || 1) - 1);
  const remaining = Math.max(0, (data?.total || 0) - (data?.current || 0));
  const baseReward = rew[index] ?? 0;
  const outcome = calculateDonorOutcome(
    remaining,
    top[index] ?? 0,
    baseReward,
    arc ?? 90,
    percent,
  );
  const donation = new BigNumber(outcome.spotLock);
  const rewardFP = new BigNumber(outcome.donorReward);
  const donateCustom = new BigNumber(outcome.costs);
  const committedCost = new BigNumber(outcome.donorRankCost);
  const net = new BigNumber(outcome.net);
  const profitStr = net.toString();
  const profit = net.toNumber();
  const spotPercent =
    committedCost.isZero() ?
      new BigNumber(0)
    : net.multipliedBy(100).idiv(committedCost);

  return {
    remaining,
    donation,
    rewardFP,
    committedCost,
    net,
    profit: profitStr,
    profitNum: profit,
    percent: spotPercent,
    donateCustom,
    outcome: outcome.outcome,
    guaranteedProfit: outcome.guaranteedProfit,
    band: outcome.band,
  };
}

module.exports = {
  fPercentBanded,
  fDonationSuggest,
  getPlayerLink,
  inactiveHTML,
  checkInactive,
  getDonations_new,
  getPlaceValues,
  gbTabSafe,
  gbTabNotSafe,
  gbTabEmpty,
  resolveCardParams,
  buildCardFooter,
  default: {
    fPercentBanded,
    fDonationSuggest,
    getPlayerLink,
    inactiveHTML,
    checkInactive,
    getDonations_new,
    getPlaceValues,
    gbTabSafe,
    gbTabNotSafe,
    gbTabEmpty,
    resolveCardParams,
    buildCardFooter,
  },
};
