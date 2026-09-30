/**
 * gbDonationPlaceEvaluator.js
 *
 * Pure Great Building donation place evaluation: safe-place math, suggested
 * donation values, and per-place lock/profit outcomes.
 *
 * Extracted from ui/gbDonationPanel.js because this is arithmetic, not
 * rendering. It has no DOM access, returns only numbers and BigNumber values,
 * and is reusable by any surface that needs place economics. The panel keeps
 * only the HTML assembly and event wiring.
 *
 * BigNumber is required for exactness: donation percentages and profit
 * arithmetic must not drift through IEEE 754 doubles.
 */

const BigNumber = require('bignumber.js');

let GreatBuildingCalculator = {};
try {
  GreatBuildingCalculator = require('./GreatBuildingCalculator.js');
} catch {}

const {
  calculateDonorOutcome,
  calculateOwnerSafeAdd,
  calculateSuggestedDonation,
} = GreatBuildingCalculator;

const BN = BigNumber;

// ============================================================================
// 1. SUGGESTED DONATION
// ============================================================================

function fDonationSuggest(reward, currentPercent = 190) {
  return new BN(reward || 0)
    .times(currentPercent)
    .div(100)
    .integerValue(BN.ROUND_HALF_UP);
}

// ============================================================================
// 2. SAFE PLACES
// ============================================================================

function getSafe(params = {}) {
  const {
    place = 1,
    GBrewards = [0, 0, 0, 0, 0],
    currentPercent = 190,
    remaining = 0,
    Top = [0, 0, 0, 0, 0, 0],
    calculateSuggestedDonation: depCalcSuggested = calculateSuggestedDonation,
  } = params;

  const safe = [];
  const donateSuggest = [];
  const index = place - 1;
  let rem = new BN(remaining);

  for (let i = index; i < 5; i++) {
    const suggested =
      typeof depCalcSuggested === 'function' ?
        depCalcSuggested(GBrewards[i] || 0, currentPercent)
      : fDonationSuggest(GBrewards[i], currentPercent);

    donateSuggest[i] = new BN(suggested);
    rem = rem.minus(donateSuggest[i]);
    safe[i] = rem.lte(donateSuggest[i].minus(new BN(Top[i + 1] || 0)));
  }

  return { safe, donateSuggest };
}

// ============================================================================
// 3. PER-PLACE VALUES
// ============================================================================

function getPlaceValues(
  gbData,
  place,
  topInvestors = [],
  rewards = [],
  currentPercent = 190,
  arcBonus = 90,
  defaultGBselected = {},
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
  const remaining = BN.maximum(
    0,
    new BN(data?.total || 0).minus(data?.current || 0),
  ).toNumber();
  const baseReward = rew[index] ?? 0;
  const outcome = calculateDonorOutcome(
    remaining,
    top[index] ?? 0,
    baseReward,
    arc ?? 90,
    percent,
  );
  const donation = new BN(outcome.spotLock);
  const rewardFP = new BN(outcome.donorReward);
  const donateCustom = new BN(outcome.costs);
  const committedCost = new BN(outcome.donorRankCost);
  const net = new BN(outcome.net);
  const profitStr = net.toString();
  const profit = net.toNumber();
  const spotPercent =
    committedCost.isZero() ?
      new BN(0)
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

/**
 * Walks places 1-5 and returns the first passable place's economics together
 * with a flag telling the caller whether any place was passable at all. The
 * panel uses the flag to decide between the safe/unsafe/empty tab views, so it
 * is part of the result rather than a separate query.
 */
function evaluatePlaces(options = {}) {
  const {
    GBselected = {},
    Top = [0, 0, 0, 0, 0, 0],
    GBrewards = [0, 0, 0, 0, 0],
    currentPercent = 190,
    arcBonus = 90,
    calcPlaceValues = getPlaceValues,
    isPlacePassableFn = () => false,
    getSafe: depGetSafe = getSafe,
    ownerSafeAddFn = calculateOwnerSafeAdd,
  } = options;

  let foundPlace = false;
  let donation = new BN(0);
  let rewardFP = new BN(0);
  let profit = 0;
  let percent = new BN(0);
  let donateCustom = new BN(0);
  let safeArr = [];
  let donateSuggestArr = [];
  let remaining = 0;

  for (let p = 1; p <= 5; p++) {
    remaining = BN.maximum(
      0,
      new BN(GBselected.total || 0).minus(GBselected.current || 0),
    ).toNumber();

    const vals = calcPlaceValues(
      GBselected,
      p,
      Top,
      GBrewards,
      currentPercent,
      arcBonus,
    );
    remaining = vals.remaining ?? remaining;
    donation = vals.donation ?? donation;
    rewardFP = vals.rewardFP ?? rewardFP;
    profit = vals.profit ?? profit;
    percent = vals.percent ?? percent;
    donateCustom = vals.donateCustom ?? donateCustom;

    const safeRes = depGetSafe({
      place: p,
      GBrewards,
      currentPercent,
      remaining,
      Top,
    });
    safeArr = safeRes.safe || [];
    donateSuggestArr = safeRes.donateSuggest || [];

    const canBePassed = isPlacePassableFn(remaining, Top[p - 1] || 0);
    if (!canBePassed) continue;

    foundPlace = true;
    // Only a place with a reward has an owner-safe top-up to compute.
    const ownerAdd =
      GBrewards[p - 1] ?
        ownerSafeAddFn(remaining, Top[p - 1] || 0, donateCustom)
      : 0;

    return {
      foundPlace,
      place: p,
      remaining,
      donation,
      rewardFP,
      profit,
      percent,
      donateCustom,
      safe: safeArr,
      donateSuggest: donateSuggestArr,
      outcome: vals.outcome || (profit > 0 ? 'profit' : 'loss'),
      netValue: Math.abs(vals.profitNum ?? 0),
      ownerAdd,
      band: vals.band,
      hasReward: Boolean(GBrewards[p - 1]),
    };
  }

  return {
    foundPlace,
    place: null,
    remaining,
    donation,
    rewardFP,
    profit,
    percent,
    donateCustom,
    safe: safeArr,
    donateSuggest: donateSuggestArr,
    outcome: null,
    netValue: 0,
    ownerAdd: 0,
    band: null,
    hasReward: false,
  };
}

module.exports = {
  fDonationSuggest,
  getSafe,
  getPlaceValues,
  evaluatePlaces,
};
