/**
 * rewardCategories.js
 *
 * Pure, DOM-free reward-source routing table. `showReward(source, payload)` in
 * RewardRenderer.js is the single runtime entry point; it formats the reward
 * and delegates the bucket mutation here so category ownership lives in one
 * place and stays unit-testable without a browser environment.
 */

const SOURCE_BUCKETS = {
  greatBuilding: 'rewardsGeneric',
  quest: 'rewardsCity',
  cityProductionArmy: 'rewardsArmy',
  cityProductionCity: 'rewardsCity',
};

function resolveBucketKey(source) {
  return Object.prototype.hasOwnProperty.call(SOURCE_BUCKETS, source) ?
      SOURCE_BUCKETS[source]
    : null;
}

function addToBucket(buckets, source, name, qty = 1) {
  const key = resolveBucketKey(source);
  if (!key || !buckets || !buckets[key]) return null;

  const bucket = buckets[key];
  const amount = Number(qty);
  const delta = Number.isFinite(amount) ? amount : 1;
  bucket[name] = (Number(bucket[name]) || 0) + delta;
  return key;
}

module.exports = { SOURCE_BUCKETS, resolveBucketKey, addToBucket };
module.exports.default = module.exports;
