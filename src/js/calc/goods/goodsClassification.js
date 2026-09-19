/**
 * goodsClassification.js
 *
 * Domain classifications for InnoGames resource goods vs non-goods and special goods.
 * Pure module: zero DOM, zero external dependencies.
 */

const NON_GOODS_KEYS = new Set([
  'money',
  'supplies',
  'medals',
  'strategy_points',
  'clan_power',
  'population',
  'happiness',
  'units',
  'premium',
]);

const SPECIAL_GOODS = new Set([
  'promethium',
  'orichalcum',
  'mars_ore',
  'asteroid_ice',
  'venus_carbon',
  'unknown_dna',
  'crystallized_hydrocarbons',
  'dark_matter',
  'stellar_void_shard',
  'stel_void_shard',
]);

/**
 * Checks whether a given resource key is an InnoGames special/space exploration good.
 *
 * @param {string} key
 * @returns {boolean}
 */
function isSpecialGood(key) {
  if (!key || typeof key !== 'string') return false;
  return SPECIAL_GOODS.has(key);
}

/**
 * Checks whether a given resource key is a standard non-good (coins, supplies, medals, etc.).
 *
 * @param {string} key
 * @returns {boolean}
 */
function isNonGoodKey(key) {
  if (!key || typeof key !== 'string') return false;
  return NON_GOODS_KEYS.has(key);
}

module.exports = {
  NON_GOODS_KEYS,
  SPECIAL_GOODS,
  isSpecialGood,
  isNonGoodKey,
};
module.exports.default = module.exports;
