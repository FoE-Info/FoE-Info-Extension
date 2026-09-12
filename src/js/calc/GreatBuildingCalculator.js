/**
 * GreatBuildingCalculator.js
 *
 * Modular pure-math calculator engine for Great Buildings.
 * Handles Arc contribution multipliers (1.9x / custom), safe position locking,
 * owner safe add thresholds, and spot profit forecasting.
 *
 * Implements strict Forge-Hammer parity with BigNumber.ROUND_HALF_UP precision.
 * Zero DOM dependencies (no document, window, jQuery, or HTML).
 */

const BigNumber = require('bignumber.js');

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('GBCalc');
} catch {}

/**
 * Calculates the exact FP the building owner needs to add to secure a spot for a donor.
 * Formula: Math.max(0, Math.ceil(remaining + spotInvested - 2 * donateAmount))
 * Eliminates legacy 1 FP odd remainder doubling discrepancies.
 *
 * @param {number|string|BigNumber} remaining Remaining FP to level up the GB
 * @param {number|string|BigNumber} [spotInvested=0] Existing investment on this spot by competitors/self
 * @param {number|string|BigNumber} [donateAmount=0] Target donation amount to lock (e.g. 1.9x reward)
 * @returns {number} Non-negative FP required from owner
 */
function calculateOwnerSafeAdd(remaining, spotInvested = 0, donateAmount = 0) {
  const remBN = new BigNumber(remaining || 0);
  const spotBN = new BigNumber(spotInvested || 0);
  const donateBN = new BigNumber(donateAmount || 0);

  const needed = remBN.plus(spotBN).minus(donateBN.multipliedBy(2));
  const ceilVal = needed.integerValue(BigNumber.ROUND_CEIL).toNumber();
  return Math.max(0, ceilVal);
}

/**
 * Calculates the FP a potential donor must add to overtake a place outright.
 * This is independent of the owner's sequential safe-spot contribution.
 */
function calculateSpotLock(remaining, spotInvested = 0) {
  return new BigNumber(remaining || 0)
    .plus(spotInvested || 0)
    .dividedBy(2)
    .integerValue(BigNumber.ROUND_CEIL)
    .toNumber();
}

/**
 * Calculates the Arc boosted reward using standard half-up rounding.
 * Formula: baseReward * (1 + arcBonusPercent / 100) rounded half-up
 *
 * @param {number|string|BigNumber} baseReward Default level reward FP
 * @param {number|string|BigNumber} [arcBonusPercent=90] Arc bonus percent (e.g. 90 for 1.9x)
 * @returns {number} Boosted FP reward rounded half-up
 */
function calculateArcReward(baseReward, arcBonusPercent = 90) {
  const baseBN = new BigNumber(baseReward || 0);
  const bonusBN = new BigNumber(arcBonusPercent ?? 90);
  const multiplier = new BigNumber(1).plus(bonusBN.dividedBy(100));

  const reward = baseBN
    .multipliedBy(multiplier)
    .integerValue(BigNumber.ROUND_HALF_UP)
    .toNumber();

  logger?.debug('Arc reward calculated:', {
    baseReward: baseBN.toString(),
    arcBonusPercent: bonusBN.toString(),
    reward,
  });

  return reward;
}

/**
 * Calculates suggested donation based on a target percentage rate (e.g. 190 for 1.9x).
 * Formula: baseReward * targetPercent / 100 rounded half-up
 *
 * @param {number|string|BigNumber} baseReward Default level reward FP
 * @param {number|string|BigNumber} [targetPercent=190] Target rate percentage (e.g. 190 for 1.9x, 192 for 1.92x)
 * @returns {number} Suggested donation FP rounded half-up
 */
function calculateSuggestedDonation(baseReward, targetPercent = 190) {
  const baseBN = new BigNumber(baseReward || 0);
  const targetBN = new BigNumber(targetPercent ?? 190);

  return baseBN
    .multipliedBy(targetBN)
    .dividedBy(100)
    .integerValue(BigNumber.ROUND_HALF_UP)
    .toNumber();
}

/**
 * Calculates the outcome for the account viewing an open place as a donor.
 * The Arc bonus is the viewer's own known bonus; it says nothing about the
 * Arc level of the existing contributor in that place.
 */
function calculateDonorOutcome(
  remaining,
  spotInvested = 0,
  baseReward = 0,
  arcBonusPercent = 90,
  standardPercent = 190,
) {
  const spotLock = calculateSpotLock(remaining, spotInvested);
  const donorReward = calculateArcReward(baseReward, arcBonusPercent);
  const costs = calculateSuggestedDonation(baseReward, standardPercent);

  // NET is measured against the break-even = the Arc-boosted reward. The
  // invested FP is the lock (safe amount); the suggested rate (1.9x) is only
  // used for the "Add ... to make safe" line, never for the profit/loss.
  const donorRankCost = spotLock;
  const donorProfit = new BigNumber(donorReward).minus(spotLock).toNumber();
  const outcome =
    donorProfit > 0 ? 'profit'
    : donorProfit === 0 ? 'safe'
    : 'loss';
  const band = outcome === 'loss' ? 'red' : 'green';

  return {
    spotLock,
    donorReward,
    costs,
    donorRankCost,
    net: donorProfit,
    donorProfit,
    outcome,
    band,
    guaranteedProfit: costs >= spotLock,
  };
}

/**
 * Performs Forge-Hammer's sequential Secure spot analysis across P1-P5.
 * Existing payments are secured and not trusted (Forge-Hammer's defaults).
 *
 * @param {Object} gbData GB overview/construction data containing progress and rewards
 * @param {Array<number|Object>} [rankings=[]] Rankings array (either numbers or objects with rank/forge_points)
 * @param {number} [arcBonusPercent=90] Arc boost percentage for calculating rewardFP (default: 90)
 * @param {number} [customPercent=190] Custom multiplier percentage for thread donations (default: 190)
 * @returns {Array<Object>} 5 spots; lockFP is the owner FP addition for that place
 */
function calculateSafeSpots(
  gbData = {},
  rankings = [],
  arcBonusPercent = 90,
  customPercent = 190,
) {
  const total =
    gbData?.total ??
    gbData?.max_progress ??
    gbData?.forge_points_for_level_up ??
    0;
  const current = gbData?.current ?? gbData?.current_progress ?? 0;
  let remaining = BigNumber.maximum(
    0,
    new BigNumber(total || 0).minus(current || 0),
  );

  const rewards =
    Array.isArray(gbData?.rewards) ? gbData.rewards
    : Array.isArray(gbData?.GBrewards) ? gbData.GBrewards
    : [];

  const spots = [];
  const hasRankedEntries = rankings.some(
    (ranking) => ranking && typeof ranking === 'object' && 'rank' in ranking,
  );
  const rankingsByPlace = Array.from({ length: 5 }, (_, idx) =>
    hasRankedEntries ?
      rankings.find((ranking) => ranking?.rank === idx + 1)
    : rankings[idx],
  );
  const investedByPlace = rankingsByPlace.map((ranking) =>
    typeof ranking === 'number' ? ranking : (ranking?.forge_points ?? 0),
  );
  // All ranked contributors (P1..P5 plus P6+ who earn no position reward) feed
  // the sequential pool, so a P6 donor is still P5's next occupant. Self/owner
  // and deleted (rank < 1) entries are excluded.
  const workingInvestments = (
    hasRankedEntries ?
      rankings
        .filter(
          (ranking) =>
            ranking &&
            typeof ranking === 'object' &&
            typeof ranking.rank === 'number' &&
            ranking.rank >= 1,
        )
        .map((ranking) => Number(ranking.forge_points) || 0)
    : [...investedByPlace]).sort((a, b) => b - a);

  let bestProfit = -Infinity;

  for (let place = 1; place <= 5; place++) {
    const idx = place - 1;
    const currentInvested = investedByPlace[idx];

    // Resolve base reward for this place
    let baseReward = 0;
    if (typeof rewards[idx] === 'number') {
      baseReward = rewards[idx];
    } else if (rankingsByPlace[idx]?.reward) {
      baseReward =
        rankingsByPlace[idx].reward.strategy_point_amount ??
        rankingsByPlace[idx].reward.strategy_points ??
        0;
    }

    const rewardFP = calculateArcReward(baseReward, arcBonusPercent);
    const donateCustom = calculateSuggestedDonation(baseReward, customPercent);
    const workingInvested = workingInvestments[idx] ?? 0;
    const remainingBefore = remaining;
    const alreadySafe =
      donateCustom <= workingInvested ||
      remaining.isLessThanOrEqualTo(workingInvested);
    let lockFP;
    let rawOwnerAdd;
    let safeToDonate = false;
    let levelWarning = false;
    let danger = 0;

    if (alreadySafe) {
      const nextInvested = workingInvestments[idx + 1] ?? 0;
      rawOwnerAdd = remaining.plus(nextInvested).minus(workingInvested);
      lockFP = BigNumber.maximum(0, rawOwnerAdd)
        .integerValue(BigNumber.ROUND_CEIL)
        .toNumber();
      remaining = remaining.minus(lockFP);
    } else {
      rawOwnerAdd = remaining
        .plus(workingInvested)
        .minus(new BigNumber(donateCustom).multipliedBy(2));
      const ceilOwnerAdd = rawOwnerAdd
        .integerValue(BigNumber.ROUND_CEIL)
        .toNumber();
      lockFP = Math.max(0, ceilOwnerAdd);
      // Over-donation: the suggested payment exceeds the amount needed to lock,
      // so the excess shrinks the pool and can expose lower spots.
      danger = ceilOwnerAdd < 0 ? Math.floor(-ceilOwnerAdd / 2) : 0;
      // The suggested payment alone would level the building.
      levelWarning = new BigNumber(donateCustom).isGreaterThanOrEqualTo(
        remainingBefore,
      );
      workingInvestments.splice(
        idx,
        0,
        BigNumber.minimum(donateCustom, remaining).toNumber(),
      );
      remaining = remaining.minus(lockFP).minus(workingInvestments[idx]);
      safeToDonate = lockFP === 0;
    }

    const isSafe = alreadySafe && lockFP === 0;
    const profit = new BigNumber(rewardFP).minus(lockFP).toNumber();
    const worseProfit = profit <= bestProfit;
    if (profit > bestProfit) bestProfit = profit;

    spots.push({
      place,
      currentInvested,
      baseReward,
      rewardFP,
      donateCustom,
      lockFP,
      ownerAdd: lockFP,
      isSafe,
      safeToDonate,
      levelWarning,
      danger,
      profit,
      worseProfit,
    });
  }

  return spots;
}

/**
 * Derives the leading "safe to donate" places from a calculateSafeSpots result.
 * Matches Forge-Hammer's SafePlaces: scan P1..P5 in order, stop at the first
 * place that needs an owner top-up, and keep the claimable places needing none.
 *
 * @param {Array<Object>} spots Result of calculateSafeSpots
 * @returns {number[]} 1-based place numbers that need no owner top-up
 */
function getSafePlaces(spots = []) {
  const safePlaces = [];
  for (const spot of spots) {
    if ((spot?.ownerAdd ?? spot?.lockFP ?? 0) > 0) break;
    if (spot?.safeToDonate) safePlaces.push(spot.place);
  }
  return safePlaces;
}

/**
 * Determines whether a place can still be overtaken by a rival donor.
 * A rival can pass the occupant while they can add at least occupant + 1 FP
 * without exceeding the remaining pool, i.e. occupant < remaining.
 * Once occupant >= remaining the place is locked/safe (adding enough to pass
 * would level the building before the overtake succeeds).
 *
 * @param {number|string|BigNumber} remaining Remaining FP to level up the GB
 * @param {number|string|BigNumber} [occupantInvested=0] FP already placed on that spot
 * @returns {boolean} True when the place is still unsafe/passable
 */
function isPlacePassable(remaining, occupantInvested = 0) {
  return new BigNumber(occupantInvested || 0).isLessThan(
    new BigNumber(remaining || 0),
  );
}

module.exports = {
  calculateOwnerSafeAdd,
  calculateSpotLock,
  calculateArcReward,
  calculateSuggestedDonation,
  calculateDonorOutcome,
  calculateSafeSpots,
  getSafePlaces,
  isPlacePassable,
};
