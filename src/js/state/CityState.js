/**
 * CityState.js
 *
 * Canonical state store for the player's active City.
 * Holds production boosts, combat stats, Arc bonuses, and FP totals.
 * Dual CJS/ESM compatible.
 */

function createFreshCityState() {
  return {
    ArcBonus: 90,
    ChatBonus: 0,
    ForgePoints: 0,
    baseBoostableFp: 0,
    baseUnboostableFp: 0,
    fpProductionBoost: 0,
    goodsProductionBoost: 0,
    guildGoodsProductionBoost: 0,
    TrazUnits: 0,
    Coins: 0,
    CoinBoost: 0,
    SupplyBoost: 0,
    Attack: 0,
    Defense: 0,
    CityAttack: 0,
    CityDefense: 0,
    // Bonus values for GE / GBG / QI
    // To get the total amount, add Attack / Defence / CityAttack / CityDefence
    GEAttackingAttack: 0,
    GEAttackingDefense: 0,
    GEDefendingAttack: 0,
    GEDefendingDefense: 0,
    GBGAttackingAttack: 0,
    GBGAttackingDefense: 0,
    GBGDefendingAttack: 0,
    GBGDefendingDefense: 0,
    QIAttackingAttack: 0,
    QIAttackingDefense: 0,
    QIDefendingAttack: 0,
    QIDefendingDefense: 0,

    SoH: 0,
    tGE: 0,
  };
}

const City = createFreshCityState();

function getCityState() {
  return City;
}

function resetCityState(target = City) {
  const fresh = createFreshCityState();
  for (const key of Object.keys(target)) {
    if (!(key in fresh)) {
      delete target[key];
    }
  }
  Object.assign(target, fresh);
  return target;
}

module.exports = {
  City,
  createFreshCityState,
  getCityState,
  resetCityState,
  default: {
    City,
    createFreshCityState,
    getCityState,
    resetCityState,
  },
};
