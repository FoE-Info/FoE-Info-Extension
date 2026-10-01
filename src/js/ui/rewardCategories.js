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
  battleground: 'rewardsGeneric',
  expedition: 'rewardsGeneric',
  pvpArena: 'rewardsGeneric',
  antiquesShop: 'rewardsGeneric',
  antiquesSales: 'rewardsGeneric',
  himejiCastle: 'rewardsGeneric',
  spaceCarrier: 'rewardsGeneric',
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
  const previous = Object.hasOwn(bucket, name) ? Number(bucket[name]) || 0 : 0;
  Object.defineProperty(bucket, name, {
    value: previous + delta,
    writable: true,
    enumerable: true,
    configurable: true,
  });
  return key;
}

module.exports = { SOURCE_BUCKETS, resolveBucketKey, addToBucket };
module.exports.default = module.exports;
