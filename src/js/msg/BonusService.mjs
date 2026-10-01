/** Server boost RPC service surfacing limited and city-wide bonuses. */
import { messageDispatcher } from '../protocol/MessageDispatcher.js';
import { blueGalaxyState, bonusState, City } from '../state/CityDomainState.js';
import { metadataStore } from '../state/MetadataStore.js';
import { createLogger } from '../utils/logger.js';
import { showOptions } from '../vars/showOptions.mjs';
import { Bonus } from '../vars/state.mjs';

const logger = createLogger('BonusService');

let lastDailyBonusFp = 0;
const ownBonuses = new Map();
const passiveRewardTypes = new Set([
  'helping_hands',
  'helping_hands_boosted',
  'plunder_and_pillage',
  'mysterious_shards',
  'totem_drop',
]);

export function updateOwnCityBonuses(
  entities,
  ownerId,
  { replace = false } = {},
) {
  if (!Array.isArray(entities) || !ownerId) return;
  if (replace) ownBonuses.clear();
  for (const entity of entities) {
    if (
      !entity ||
      String(entity.player_id) !== String(ownerId) ||
      entity.type !== 'greatbuilding' ||
      !Array.isArray(entity.bonuses)
    )
      continue;
    const name = metadataStore.getEntity(entity.cityentity_id)?.name || '';
    const entries = entity.bonuses
      .filter(
        (bonus) =>
          bonus &&
          typeof bonus.type === 'string' &&
          bonus.type !== 'double_collection' &&
          (passiveRewardTypes.has(bonus.type) ||
            (Number(bonus.amount) >= 0 && bonus.amount != null)),
      )
      .map((bonus) => ({
        ...bonus,
        origin: 'cityEntity',
        entityId: entity.id,
        buildingName: name,
        kind: passiveRewardTypes.has(bonus.type) ? 'passive' : 'limited',
        remaining: remainingUses(bonus),
      }));
    ownBonuses.set(String(entity.id), entries);
  }
  const summary = bonusState.getSummary();
  const external = bonusState
    .getLimitedBonuses()
    .filter(
      (entry) =>
        entry.origin !== 'cityEntity' &&
        !ownBonuses.has(String(entry.entityId)),
    );
  bonusState.setSummary({
    ...summary,
    bonusHTML: bonusState.getBonusHTML(),
    dailyForgePoints: bonusState.getDailyForgePoints(),
    limitedBonuses: [...ownBonuses.values()].flat().concat(external),
  });
}

// `value` is the bonus strength/chance; `amount` is remaining uses.
function bonusAmount(entry) {
  return entry.value ?? entry.amount ?? 0;
}
function remainingUses(entry) {
  if (entry.isActive === false) return 0;
  const amount = Number(entry.amount);
  return entry.amount != null && Number.isFinite(amount) && amount >= 0 ?
      amount
    : null;
}

export function resetDailyBonusAccumulator() {
  lastDailyBonusFp = 0;
  ownBonuses.clear();
  bonusState.setSummary();
}
export function getLimitedBonuses(msg) {
  if (Array.isArray(msg?.responseData)) {
    const galaxy = msg.responseData.find(
      (entry) => entry.type === 'double_collection',
    );
    // Success percentage is not a remaining-attempt count. Missing/inactive
    // charge data must never manufacture usable attempts, even in debug mode.
    blueGalaxyState.setCharges(
      galaxy?.isActive === false ? 0 : (galaxy?.amount ?? 0),
    );
  }
  if (
    showOptions &&
    showOptions.showBonus &&
    Array.isArray(msg?.responseData)
  ) {
    let bonusHTML = '';
    Bonus.aid = Bonus.spoils = Bonus.diplomatic = Bonus.strike = 0;
    const limitedBonuses = msg.responseData
      .filter(
        (entry) =>
          entry &&
          typeof entry.type === 'string' &&
          !['daily_strategypoint', 'double_collection'].includes(entry.type) &&
          entry.__class__ !== 'DailyStrategyPointBonus',
      )
      .map((entry) => ({ ...entry, remaining: remainingUses(entry) }));
    let dailyForgePoints = null;
    let currentPayloadDailyFp = 0;
    logger.debug('Limited bonuses received:', msg.responseData);

    msg.responseData.forEach((entry) => {
      if (entry.type == 'spoils_of_war') {
        Bonus.spoils = remainingUses(entry) ?? 0;
        if (Bonus.spoils)
          bonusHTML += `Spoils <span id="spoilsID">${Bonus.spoils}</span> `;
      } else if (entry.type == 'diplomatic_gifts') {
        Bonus.diplomatic = remainingUses(entry) ?? 0;
        if (Bonus.diplomatic)
          bonusHTML += `Dip <span id="diplomaticID">${Bonus.diplomatic}</span> `;
      } else if (entry.type == 'first_strike') {
        Bonus.strike = remainingUses(entry) ?? 0;
        if (Bonus.strike)
          bonusHTML += `Strike <span id="firststrikeID">${Bonus.strike}</span> `;
      } else if (entry.type == 'aid_goods') {
        Bonus.aid = remainingUses(entry) ?? 0;
        if (Bonus.aid) bonusHTML += `Aid <span id="aidID">${Bonus.aid}</span> `;
      } else if (
        entry.type == 'daily_strategypoint' ||
        entry.__class__ == 'DailyStrategyPointBonus'
      ) {
        currentPayloadDailyFp += bonusAmount(entry);
      }
    });

    if (currentPayloadDailyFp > 0 || lastDailyBonusFp > 0) {
      const baseFp =
        (City.ForgePoints || 0) >= lastDailyBonusFp ?
          (City.ForgePoints || 0) - lastDailyBonusFp
        : City.ForgePoints || 0;
      City.ForgePoints = baseFp + currentPayloadDailyFp;
      lastDailyBonusFp = currentPayloadDailyFp;
      dailyForgePoints = City.ForgePoints;
    }

    bonusState.setSummary({
      bonusHTML,
      limitedBonuses: [...ownBonuses.values()]
        .flat()
        .filter(
          (owned) =>
            !limitedBonuses.some(
              (entry) =>
                String(entry.entityId) === String(owned.entityId) &&
                entry.type === owned.type,
            ),
        )
        .concat(limitedBonuses),
      aid: Bonus.aid,
      spoils: Bonus.spoils,
      diplomatic: Bonus.diplomatic,
      strike: Bonus.strike,
      dailyForgePoints,
    });
  }
}

export class BonusService {
  constructor() {
    this.getLimitedBonuses = getLimitedBonuses;
    this.resetDailyBonusAccumulator = resetDailyBonusAccumulator;
    this.register = this.register.bind(this);
  }

  register(dispatcher = messageDispatcher, options = {}) {
    if (!dispatcher || typeof dispatcher.register !== 'function') return this;
    const handler = options.getLimitedBonuses || getLimitedBonuses;
    dispatcher.register('BonusService', 'getLimitedBonuses', handler);
    logger.debug('BonusService registered getLimitedBonuses');
    return this;
  }
}

export const bonusService = new BonusService();
export const register = (dispatcher, options) =>
  bonusService.register(dispatcher, options);
export default bonusService;
