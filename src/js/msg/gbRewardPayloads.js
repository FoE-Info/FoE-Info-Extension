/** Split a GB payout into actual income, excluding blueprint inventory totals. */
function parseGreatBuildingReward(data) {
  const rewards = [];
  const add = (type, subType, amount) => {
    const quantity = Number(amount);
    if (Number.isFinite(quantity) && quantity > 0)
      rewards.push({ type, subType, amount: quantity });
  };
  add('resource', 'strategy_points', data.strategy_point_amount);
  for (const [resource, amount] of Object.entries(data.resources || {})) {
    if (resource !== '__class__') add('resource', resource, amount);
  }
  // `blueprints` contains cumulative inventory; only `found` is this payout.
  for (const blueprint of data.blueprints?.found || []) {
    add(
      'blueprint',
      blueprint.building_id || data.cityentity_id,
      blueprint.amount,
    );
  }
  return rewards;
}

module.exports = { parseGreatBuildingReward };
