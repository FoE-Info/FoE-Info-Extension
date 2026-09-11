/**
 * InvestedCalculator.js
 *
 * Pure calculation engine for Great Building investments.
 * Computes FP contributions, Arc multiplier boosts with ceiling rounding,
 * safe position locking status, and safe vs all profit/loss aggregation,
 * with support for filtering hidden Great Buildings.
 */

const BigNumber = require('bignumber.js');

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('InvestedCalc');
} catch {}

/**
 * Generates a unique stable identifier for a Great Building contribution.
 * @param {Object} entry
 * @returns {string}
 */
function getInvestmentKey(entry) {
  const playerId = entry.player?.player_id || entry.player_id || '0';
  const entityId = entry.city_entity_id || entry.entity_id || 'unknown';
  return `${playerId}_${entityId}`;
}

/**
 * Determines whether an investment is securely locked (safe from snipes).
 * A spot is safe when the remaining FP needed to level is <= the investor's current FP.
 *
 * @param {number|BigNumber} investedFP
 * @param {number|null} currentProgress
 * @param {number|null} maxProgress
 * @returns {boolean}
 */
function isPositionSafe(investedFP, currentProgress, maxProgress) {
  if (!maxProgress || maxProgress <= 0) return false;
  const current = currentProgress || 0;
  const remaining = Math.max(0, maxProgress - current);
  const investedNum =
    investedFP instanceof BigNumber ?
      investedFP.toNumber()
    : Number(investedFP) || 0;
  return investedNum >= remaining;
}

/**
 * Calculates investments, Arc returns, safe status, and net totals.
 *
 * @param {Array<Object>|Object} rawContributions InnoGames RPC contributions or payload
 * @param {number} [arcBonusPercent=90] Player's Arc boost percentage (e.g. 100 for 2.0x)
 * @param {Array<string>|Set<string>} [hiddenKeys=[]] Set or Array of hidden investment keys
 * @param {Object} [options={}] Calculation options
 * @param {boolean} [options.showHiddenGb=false] Whether hidden GBs are displayed
 * @param {boolean} [options.calculateOnlySafeProfit=false] Only count profit on locked spots
 * @returns {Object} Full breakdown of contributions, totals, and counts
 */
function calculateInvestments(
  rawContributions,
  arcBonusPercent = 90,
  hiddenKeys = [],
  options = {},
) {
  let list = [];
  if (Array.isArray(rawContributions)) {
    list = rawContributions;
  } else if (Array.isArray(rawContributions?.responseData)) {
    list = rawContributions.responseData;
  } else if (Array.isArray(rawContributions?.responseData?.contributions)) {
    list = rawContributions.responseData.contributions;
  } else if (Array.isArray(rawContributions?.contributions)) {
    list = rawContributions.contributions;
  }

  const hiddenSet =
    hiddenKeys instanceof Set ? hiddenKeys : new Set(hiddenKeys || []);
  const showHiddenGb = !!options.showHiddenGb;
  const calculateOnlySafeProfit = !!options.calculateOnlySafeProfit;

  const validBonus =
    typeof arcBonusPercent === 'number' && !isNaN(arcBonusPercent) ?
      arcBonusPercent
    : 90;
  const arcMultiplier = new BigNumber(1).plus(
    new BigNumber(validBonus).dividedBy(100),
  );

  logger?.debug('Calculating GB investments', {
    entryCount: list.length,
    arcBonusPercent: validBonus,
    calculateOnlySafeProfit,
  });

  let totalInvested = new BigNumber(0);
  let totalReturn = new BigNumber(0);
  let hiddenCount = 0;
  let safeCount = 0;
  const results = [];

  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;

    const key = getInvestmentKey(entry);
    const isHidden = hiddenSet.has(key);
    if (isHidden) {
      hiddenCount++;
    }

    // Skip item completely if hidden and showHiddenGb is false
    if (isHidden && !showHiddenGb) {
      continue;
    }

    const invested = new BigNumber(entry.forge_points || 0);
    const baseReward = new BigNumber(
      entry.reward?.strategy_points ?? entry.reward?.strategy_point_amount ?? 0,
    );
    const returnFP = baseReward
      .multipliedBy(arcMultiplier)
      .integerValue(BigNumber.ROUND_HALF_UP);
    const profit = returnFP.minus(invested);

    const currentProgress = entry.current_progress ?? null;
    const maxProgress = entry.max_progress ?? null;
    const remainingFP =
      maxProgress !== null && currentProgress !== null ?
        Math.max(0, maxProgress - currentProgress)
      : null;
    const isSafe = isPositionSafe(invested, currentProgress, maxProgress);

    if (isSafe) {
      safeCount++;
    }

    // Determine profit to include in totals
    // If hidden: excluded from totals
    // If calculateOnlySafeProfit and spot is unsafe: profit counts as 0 (return counts as invested)
    let effectiveProfit = profit;
    let effectiveReturn = returnFP;

    if (calculateOnlySafeProfit && !isSafe) {
      effectiveProfit = new BigNumber(0);
      effectiveReturn = invested;
    }

    if (!isHidden) {
      totalInvested = totalInvested.plus(invested);
      totalReturn = totalReturn.plus(effectiveReturn);
    }

    const player = entry.player || {};
    const playerName =
      player.name ||
      (player.player_id ? `Player ${player.player_id}` : 'Unknown');

    results.push({
      key,
      player: {
        player_id: player.player_id || entry.player_id || 0,
        name: playerName,
      },
      name: entry.name || '',
      city_entity_id: entry.city_entity_id || entry.entity_id || '',
      entity_id: entry.entity_id || null,
      level: entry.level ?? null,
      rank: entry.rank !== undefined ? entry.rank : null,
      forge_points: invested.toNumber(),
      invested,
      baseReward,
      returnFP,
      profit,
      effectiveProfit,
      netProfitLoss: profit.toNumber(),
      current_progress: currentProgress,
      max_progress: maxProgress,
      remaining_fp: remainingFP,
      is_safe: isSafe,
      is_hidden: isHidden,
      reward: {
        strategy_points: returnFP.toNumber(),
        base_strategy_points: baseReward.toNumber(),
        blueprints: entry.reward?.blueprints ?? 0,
        medals: entry.reward?.medals ?? 0,
      },
    });
  }

  const netProfitLoss = totalReturn.minus(totalInvested);

  logger?.debug('GB investments calculated', {
    totalInvested: totalInvested.toString(),
    totalReturn: totalReturn.toString(),
    netProfitLoss: netProfitLoss.toString(),
    safeCount,
    hiddenCount,
  });

  return {
    success: true,
    results,
    totalInvested: totalInvested.toNumber(),
    totalReturn: totalReturn.toNumber(),
    netProfitLoss: netProfitLoss.toNumber(),
    totalInvestedBN: totalInvested,
    totalReturnBN: totalReturn,
    netProfitLossBN: netProfitLoss,
    arcBonusPercent: validBonus,
    hiddenCount,
    safeCount,
    totalCount: list.length,
    calculateOnlySafeProfit,
    showHiddenGb,
  };
}

module.exports = {
  getInvestmentKey,
  isPositionSafe,
  calculateInvestments,
};
