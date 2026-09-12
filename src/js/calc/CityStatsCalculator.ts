import BigNumber from 'bignumber.js';

const metadataStorePkg = require('../state/MetadataStore.js');
const {
  getPreviousEra,
  getNextEra,
  getBuildingEra,
} = require('./utils/eraUtils.js');
const { toBigNumber } = require('./utils/bignumberUtils.js');
const { computeSetAdjacencies } = require('./utils/spatialUtils.js');
const {
  createRawBoosts,
  createQiBoosts,
  createProdBoosts,
  extractEntityBoosts,
  formatMilitaryBoosts,
  tallySingleBoost,
} = require('./boosts/MilitaryBoostCalculator.js');
const {
  extractEntityProduction,
  applyProductionBoosts,
} = require('./prod/ProductionCalculator.js');
const {
  createGoodsAccumulator,
  processEntityGoods,
  finalizeGoods,
} = require('./goods/GoodsCalculator.js');
const {
  createUnitsAccumulator,
  processEntityUnits,
  extractSpecialBonuses,
  computeChateauGoods,
} = require('./units/UnitCalculator.js');

const defaultMetadataStore = metadataStorePkg.metadataStore;

let logger: { debug?: (...args: unknown[]) => void } | null = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('CityStatsCalc');
} catch {}

export type NumericValue = number | string | BigNumber;

export interface CityEntityBonus {
  type?: string;
  value?: NumericValue;
  [key: string]: unknown;
}

export interface CityEntityState {
  current_product?: {
    name?: string;
    amount?: NumericValue;
    product?: { resources?: Record<string, NumericValue> };
    [key: string]: unknown;
  };
  productionOption?: { products?: unknown };
  is_motivated?: boolean;
  [key: string]: unknown;
}

export interface CityEntity {
  id?: number | string;
  cityentity_id?: string;
  city_entity_id?: string;
  type?: string;
  level?: number;
  x?: number;
  y?: number;
  width?: number;
  length?: number;
  bonus?: CityEntityBonus;
  state?: CityEntityState | null;
  [key: string]: unknown;
}

export interface MetadataEntityLevel {
  id?: string;
  asset_id?: string;
  name?: string;
  level?: number;
  bonuses?: Array<{ value?: NumericValue; [key: string]: unknown }>;
  production_values?: Array<{ type?: string; value?: number }>;
  [key: string]: unknown;
}

export interface MetadataEntity {
  id?: string;
  asset_id?: string;
  name?: string;
  type?: string;
  era?: string;
  level?: number;
  entity_levels?: MetadataEntityLevel[];
  abilities?: unknown[];
  components?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface MetadataResource {
  id?: string;
  era?: string;
  [key: string]: unknown;
}

export interface MetadataLookupStore {
  getEntity(id?: string | number | null): MetadataEntity | null | undefined;
  getResource?(
    id?: string | number | null,
  ): MetadataResource | null | undefined;
  getSetForEntity?(id?: string | number | null): unknown;
  [key: string]: unknown;
}

export interface ProductionComponentResult {
  base: BigNumber;
  boostPercent: BigNumber;
  total: BigNumber;
}

export interface FpProductionResult {
  boostable: BigNumber;
  unboostable: BigNumber;
  boostPercent: BigNumber;
  boostAmount: BigNumber;
  total: BigNumber;
}

export interface ProductionBoostResult {
  coins: ProductionComponentResult;
  supplies: ProductionComponentResult;
  fp: FpProductionResult;
}

export interface GoodsStatsResult {
  currentEra: BigNumber;
  previousEra: BigNumber;
  nextEra: BigNumber;
  otherEras: BigNumber;
  treasury: BigNumber;
  gbTreasury: BigNumber;
  eventTreasury: BigNumber;
  total: BigNumber;
  byEra: Record<string, BigNumber>;
  boostPercent: BigNumber;
}

export interface UnitBuildingContribution {
  name: string;
  amount: number;
}

export interface UnitsStatsResult {
  daily: BigNumber;
  traz: BigNumber;
  buildings: UnitBuildingContribution[];
}

export interface MilitaryBoostPair {
  att: BigNumber;
  def: BigNumber;
}

export interface MilitaryBoostMatrix {
  base: MilitaryBoostPair;
  gbg: MilitaryBoostPair;
  ge: MilitaryBoostPair;
  qi: MilitaryBoostPair;
}

export interface MilitaryBoosts {
  red: MilitaryBoostMatrix;
  blue: MilitaryBoostMatrix;
}

export interface QiBoostResult {
  coins: BigNumber;
  supplies: BigNumber;
  goods: BigNumber;
  actions: BigNumber;
}

export interface CityStatsSpecial {
  arcPercent: BigNumber;
  chatBonus: BigNumber;
  goodsPerQuest: BigNumber;
  qiBoosts: QiBoostResult;
  aoCriticalStrike: BigNumber;
  ccCriticalStrike: BigNumber;
}

export interface CityStatsResult {
  coins: ProductionComponentResult;
  supplies: ProductionComponentResult;
  fp: FpProductionResult;
  goods: GoodsStatsResult;
  units: UnitsStatsResult;
  military: MilitaryBoosts;
  special: CityStatsSpecial;
}

export interface CityStatsProductionBoostsInput {
  coin?: NumericValue;
  supply?: NumericValue;
  forgePoints?: NumericValue;
}

export interface CityStatsBoostsInput {
  production?: CityStatsProductionBoostsInput;
  boosts?: CityEntityBonus[];
  [key: string]: unknown;
}

export type CityStatsBoostsSource =
  CityStatsBoostsInput | CityEntityBonus[] | null | undefined;

export interface CalculateCityStatsOptions {
  entities?: CityEntity[];
  playerEra?: string;
  boosts?: CityStatsBoostsSource;
  metadataStore?: MetadataLookupStore | null;
}

export class CityStatsCalculator {
  metadataStore: MetadataLookupStore;

  constructor(store: MetadataLookupStore = defaultMetadataStore) {
    this.metadataStore = store;
  }

  calculateCityStats({
    entities = [],
    playerEra = 'SpaceAgeTitan',
    boosts = null,
    metadataStore = this.metadataStore,
  }: CalculateCityStatsOptions = {}): CityStatsResult {
    logger?.debug('Starting city stats calculation', {
      entityCount: entities?.length,
      playerEra,
    });
    const store = metadataStore || defaultMetadataStore;
    const prevEra = getPreviousEra(playerEra);
    const nextEra = getNextEra(playerEra);

    let baseCoins = new BigNumber(0);
    let baseSupplies = new BigNumber(0);
    let baseBoostableFP = new BigNumber(0);
    let baseUnboostableFP = new BigNumber(0);

    let arcBonusPercent = new BigNumber(0);
    let chatBonusPercent = new BigNumber(0);
    let aoCritPercent = new BigNumber(0);
    let ccCritPercent = new BigNumber(0);

    const rawBoosts = createRawBoosts();
    const qiBoosts = createQiBoosts();
    const prodBoosts = createProdBoosts();
    const goodsAccum = createGoodsAccumulator();
    const unitsAccum = createUnitsAccumulator();

    computeSetAdjacencies(entities, store);

    for (const entity of entities) {
      if (!entity || !entity.cityentity_id) continue;
      const entityId = entity.cityentity_id;
      const meta = store.getEntity(entityId);
      const isGB =
        entity.type === 'greatbuilding' ||
        meta?.type === 'greatbuilding' ||
        entityId.startsWith('X_');
      const level = entity.level ?? 0;
      const bEra = getBuildingEra(entity, playerEra);

      if (isGB) {
        const special = extractSpecialBonuses({ entity, meta, level });
        if (special.arcBonusPercent) arcBonusPercent = special.arcBonusPercent;
        if (special.chatBonusPercent)
          chatBonusPercent = special.chatBonusPercent;
        if (special.aoCritPercent) aoCritPercent = special.aoCritPercent;
        if (special.ccCritPercent) ccCritPercent = special.ccCritPercent;

        if (entity.bonus?.type && entity.bonus.value != null) {
          tallySingleBoost(entity.bonus, rawBoosts, qiBoosts);
        }
      }

      const prodResources = extractEntityProduction(entity, meta, bEra, false);

      if (prodResources.money)
        baseCoins = baseCoins.plus(toBigNumber(prodResources.money));
      if (prodResources.supplies)
        baseSupplies = baseSupplies.plus(toBigNumber(prodResources.supplies));
      if (prodResources.strategy_points) {
        const fpAmount = toBigNumber(prodResources.strategy_points);
        if (isGB) baseUnboostableFP = baseUnboostableFP.plus(fpAmount);
        else baseBoostableFP = baseBoostableFP.plus(fpAmount);
      }

      processEntityGoods({
        prodResources,
        accum: goodsAccum,
        playerEra,
        buildingEra: bEra,
        prevEra,
        nextEra,
        store,
        isGB,
      });
      processEntityUnits({ entity, meta, prodResources, accum: unitsAccum });
      extractEntityBoosts(entity, meta, rawBoosts, qiBoosts, prodBoosts, bEra);
    }

    if (boosts) {
      const boostInput = Array.isArray(boosts) ? null : boosts;
      if (boostInput?.production) {
        if (boostInput.production.coin)
          prodBoosts.coin = prodBoosts.coin.plus(
            toBigNumber(boostInput.production.coin),
          );
        if (boostInput.production.supply)
          prodBoosts.supply = prodBoosts.supply.plus(
            toBigNumber(boostInput.production.supply),
          );
        if (boostInput.production.forgePoints)
          prodBoosts.fp = prodBoosts.fp.plus(
            toBigNumber(boostInput.production.forgePoints),
          );
      }
      const bList = Array.isArray(boosts) ? boosts : boosts.boosts || [];
      for (const b of bList) {
        tallySingleBoost(b, rawBoosts, qiBoosts, prodBoosts);
      }
    }

    const prodResult = applyProductionBoosts({
      baseCoins,
      baseSupplies,
      baseBoostableFP,
      baseUnboostableFP,
      coinBoostPercent: prodBoosts.coin,
      supplyBoostPercent: prodBoosts.supply,
      fpBoostPercent: prodBoosts.fp,
    });

    const goodsResult = finalizeGoods({
      accum: goodsAccum,
      goodsBoostPercent: prodBoosts.goods,
      guildGoodsBoostPercent: prodBoosts.guildGoods,
    });

    const military = formatMilitaryBoosts(rawBoosts);
    const goodsPerQuest = computeChateauGoods(chatBonusPercent);

    logger?.debug('City stats calculation completed', {
      fp: prodResult.fp?.total?.toString?.() || prodResult.fp?.total,
      dailyGoods:
        goodsResult?.totalDailyGoods?.toString?.() ||
        goodsResult?.totalDailyGoods,
      arcPercent: arcBonusPercent?.toString?.(),
    });

    return {
      coins: prodResult.coins,
      supplies: prodResult.supplies,
      fp: prodResult.fp,
      goods: goodsResult,
      units: {
        daily: unitsAccum.dailyUnits,
        traz: unitsAccum.trazUnits,
        buildings: unitsAccum.buildings,
      },
      military,
      special: {
        arcPercent: arcBonusPercent,
        chatBonus: chatBonusPercent,
        goodsPerQuest,
        qiBoosts,
        aoCriticalStrike: aoCritPercent,
        ccCriticalStrike: ccCritPercent,
      },
    };
  }
}

const cityStatsCalculator = new CityStatsCalculator();

export const calculateCityStats =
  cityStatsCalculator.calculateCityStats.bind(cityStatsCalculator);

export { cityStatsCalculator };

export default cityStatsCalculator;
