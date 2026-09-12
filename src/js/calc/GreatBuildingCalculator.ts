/**
 * GreatBuildingCalculator.ts
 *
 * Modular pure-math calculator engine for Great Buildings.
 * Handles Arc contribution multipliers (1.9x / custom), safe position locking,
 * owner safe add thresholds, and spot profit forecasting.
 *
 * Implements strict Forge-Hammer parity with BigNumber.ROUND_HALF_UP precision.
 * Zero DOM dependencies (no document, window, jQuery, or HTML).
 */

import BigNumber from 'bignumber.js';
import type { GreatBuildingSpot } from '../../types/state';

let logger: { debug?: (...args: unknown[]) => void } | null = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('GBCalc');
} catch {}

export type NumericValue = number | string | BigNumber;

export interface GreatBuildingRankingItem {
  rank?: number;
  forge_points?: number;
  reward?: {
    strategy_point_amount?: number;
    strategy_points?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export type GreatBuildingRankingInput =
  number | GreatBuildingRankingItem | null | undefined;

export interface GreatBuildingCalculationInput {
  total?: number;
  max_progress?: number;
  forge_points_for_level_up?: number;
  current?: number;
  current_progress?: number;
  rewards?: number[];
  GBrewards?: number[];
  [key: string]: unknown;
}

export type DonorOutcome = 'profit' | 'safe' | 'loss';

export interface GreatBuildingDonorOutcome {
  spotLock: number;
  donorReward: number;
  costs: number;
  donorRankCost: number;
  net: number;
  donorProfit: number;
  outcome: DonorOutcome;
  band: 'green' | 'red';
  guaranteedProfit: boolean;
}

/**
 * Calculates the exact FP the building owner needs to add to secure a spot for a donor.
 * Formula: Math.max(0, Math.ceil(remaining + spotInvested - 2 * donateAmount))
 * Eliminates legacy 1 FP odd remainder doubling discrepancies.
 *
 * @param remaining Remaining FP to level up the GB
 * @param spotInvested Existing investment on this spot by competitors/self
 * @param donateAmount Target donation amount to lock (e.g. 1.9x reward)
 * @returns Non-negative FP required from owner
 */
export function calculateOwnerSafeAdd(
  remaining: NumericValue,
  spotInvested: NumericValue = 0,
  donateAmount: NumericValue = 0,
): number {
  const remBN = new BigNumber(remaining || 0);
  const spotBN = new BigNumber(spotInvested || 0);
  const donateBN = new BigNumber(donateAmount || 0);

  const needed = remBN.plus(spotBN).minus(donateBN.multipliedBy(2));
  const ceilVal = needed.integerValue(BigNumber.ROUND_CEIL).toNumber();
  return Math.max(0, ceilVal);
}

/** Calculates the FP a potential donor must add to overtake a place outright. */
export function calculateSpotLock(
  remaining: NumericValue,
  spotInvested: NumericValue = 0,
): number {
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
 * @param baseReward Default level reward FP
 * @param arcBonusPercent Arc bonus percent (e.g. 90 for 1.9x)
 * @returns Boosted FP reward rounded half-up
 */
export function calculateArcReward(
  baseReward: NumericValue,
  arcBonusPercent: NumericValue = 90,
): number {
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
 * @param baseReward Default level reward FP
 * @param targetPercent Target rate percentage (e.g. 190 for 1.9x, 192 for 1.92x)
 * @returns Suggested donation FP rounded half-up
 */
export function calculateSuggestedDonation(
  baseReward: NumericValue,
  targetPercent: NumericValue = 190,
): number {
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
 * The Arc bonus is the viewer's own known bonus, not the existing contributor's.
 */
export function calculateDonorOutcome(
  remaining: NumericValue,
  spotInvested: NumericValue = 0,
  baseReward: NumericValue = 0,
  arcBonusPercent: NumericValue = 90,
  standardPercent: NumericValue = 190,
): GreatBuildingDonorOutcome {
  const spotLock = calculateSpotLock(remaining, spotInvested);
  const donorReward = calculateArcReward(baseReward, arcBonusPercent);
  const costs = calculateSuggestedDonation(baseReward, standardPercent);
  // NET is measured against the break-even = the Arc-boosted reward. The
  // invested FP is the lock (safe amount); the suggested rate (1.9x) is only
  // used for the "Add ... to make safe" line, never for the profit/loss.
  const donorRankCost = spotLock;
  const donorProfit = new BigNumber(donorReward).minus(spotLock).toNumber();
  const outcome: DonorOutcome =
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
 * @param gbData GB overview/construction data containing progress and rewards
 * @param rankings Rankings array (either numbers or objects with rank/forge_points)
 * @param arcBonusPercent Arc boost percentage for calculating rewardFP (default: 90)
 * @param customPercent Custom multiplier percentage for thread donations (default: 190)
 * @returns 5 spots; lockFP is the owner FP addition for that place
 */
export function calculateSafeSpots(
  gbData: GreatBuildingCalculationInput = {},
  rankings: GreatBuildingRankingInput[] = [],
  arcBonusPercent: NumericValue = 90,
  customPercent: NumericValue = 190,
): GreatBuildingSpot[] {
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

  const spots: GreatBuildingSpot[] = [];
  const hasRankedEntries = rankings.some(
    (ranking) =>
      typeof ranking === 'object' && ranking !== null && 'rank' in ranking,
  );
  const rankingsByPlace = Array.from({ length: 5 }, (_, idx) =>
    hasRankedEntries ?
      rankings.find(
        (ranking) =>
          typeof ranking === 'object' &&
          ranking !== null &&
          ranking.rank === idx + 1,
      )
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
          (ranking): ranking is GreatBuildingRankingItem =>
            typeof ranking === 'object' &&
            ranking !== null &&
            typeof ranking.rank === 'number' &&
            ranking.rank >= 1,
        )
        .map((ranking) => Number(ranking.forge_points) || 0)
    : [...investedByPlace]).sort((a, b) => b - a);
  let bestProfit = -Infinity;

  for (let place = 1; place <= 5; place++) {
    const idx = place - 1;
    const currentInvested = investedByPlace[idx];

    let baseReward = 0;
    if (typeof rewards[idx] === 'number') {
      baseReward = rewards[idx];
    } else if (
      typeof rankingsByPlace[idx] === 'object' &&
      rankingsByPlace[idx] !== null
    ) {
      const rankingObj = rankingsByPlace[idx] as GreatBuildingRankingItem;
      if (rankingObj?.reward) {
        baseReward =
          rankingObj.reward.strategy_point_amount ??
          rankingObj.reward.strategy_points ??
          0;
      }
    }

    const rewardFP = calculateArcReward(baseReward, arcBonusPercent);
    const donateCustom = calculateSuggestedDonation(baseReward, customPercent);
    const workingInvested = workingInvestments[idx] ?? 0;
    const remainingBefore = remaining;
    const alreadySafe =
      donateCustom <= workingInvested ||
      remaining.isLessThanOrEqualTo(workingInvested);
    let lockFP: number;
    let rawOwnerAdd: BigNumber;
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
      danger = ceilOwnerAdd < 0 ? Math.floor(-ceilOwnerAdd / 2) : 0;
      levelWarning = new BigNumber(donateCustom).isGreaterThanOrEqualTo(
        remainingBefore,
      );
      workingInvestments.splice(
        idx,
        0,
        Math.min(donateCustom, remaining.toNumber()),
      );
      remaining = remaining.minus(lockFP).minus(workingInvestments[idx]);
      safeToDonate = lockFP === 0;
    }

    const isSafe = alreadySafe && lockFP === 0;
    const profit = rewardFP - lockFP;
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
 * @param spots Result of calculateSafeSpots
 * @returns 1-based place numbers that need no owner top-up
 */
export function getSafePlaces(spots: GreatBuildingSpot[] = []): number[] {
  const safePlaces: number[] = [];
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
 * @param remaining Remaining FP to level up the GB
 * @param occupantInvested FP already placed on that spot
 * @returns True when the place is still unsafe/passable
 */
export function isPlacePassable(
  remaining: NumericValue,
  occupantInvested: NumericValue = 0,
): boolean {
  return new BigNumber(occupantInvested || 0).isLessThan(
    new BigNumber(remaining || 0),
  );
}

export default {
  calculateOwnerSafeAdd,
  calculateSpotLock,
  calculateArcReward,
  calculateSuggestedDonation,
  calculateDonorOutcome,
  calculateSafeSpots,
  getSafePlaces,
  isPlacePassable,
};
