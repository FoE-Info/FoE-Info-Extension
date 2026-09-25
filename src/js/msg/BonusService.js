/** Server boost RPC service surfacing limited and city-wide bonuses. */
import { messageDispatcher } from '../protocol/MessageDispatcher.js';
import { blueGalaxyState, bonusState, City } from '../state/CityDomainState.js';
import { createLogger } from '../utils/logger.js';
import { showOptions } from '../vars/showOptions.js';
import { Bonus } from '../vars/state.js';

const logger = createLogger('BonusService');

let lastDailyBonusFp = 0;

export function resetDailyBonusAccumulator() {
  lastDailyBonusFp = 0;
}
export function getLimitedBonuses(msg) {
  if (
    showOptions &&
    showOptions.showBonus &&
    Array.isArray(msg?.responseData) &&
    msg.responseData.length
  ) {
    let bonusHTML = '';
    let dailyForgePoints = null;
    let currentPayloadDailyFp = 0;
    logger.debug('Limited bonuses received:', msg.responseData);

    msg.responseData.forEach((entry) => {
      if (entry.type == 'spoils_of_war') {
        Bonus.spoils = entry.amount;
        if (entry.amount)
          bonusHTML += `Spoils <span id="spoilsID">${Bonus.spoils}</span> `;
      } else if (entry.type == 'diplomatic_gifts') {
        Bonus.diplomatic = entry.amount;
        if (entry.amount)
          bonusHTML += `Dip <span id="diplomaticID">${Bonus.diplomatic}</span> `;
      } else if (entry.type == 'first_strike') {
        Bonus.strike = entry.amount;
        if (entry.amount)
          bonusHTML += `Strike <span id="firststrikeID">${Bonus.strike}</span> `;
      } else if (entry.type == 'aid_goods') {
        Bonus.aid = entry.amount;
        if (entry.amount)
          bonusHTML += `Aid <span id="aidID">${Bonus.aid}</span> `;
      } else if (entry.type == 'double_collection') {
        blueGalaxyState.setCharges(entry.amount);
      } else if (
        entry.type == 'daily_strategypoint' ||
        entry.__class__ == 'DailyStrategyPointBonus'
      ) {
        const fp = entry.value ?? entry.amount ?? 0;
        currentPayloadDailyFp += fp;
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
