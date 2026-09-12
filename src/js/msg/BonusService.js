/** Server boost RPC service surfacing limited and city-wide bonuses. */
import { blueGalaxyState } from '../state/BlueGalaxyState.js';
import { bonusState } from '../state/BonusState.js';
import { City } from '../state/CityState.js';
import { createLogger } from '../utils/logger.js';
import { showOptions } from '../vars/showOptions.js';
import { Bonus } from '../vars/state.js';

const logger = createLogger('BonusService');

export function getLimitedBonuses(msg) {
  if (
    showOptions &&
    showOptions.showBonus &&
    Array.isArray(msg?.responseData) &&
    msg.responseData.length
  ) {
    let bonusHTML = '';
    let dailyForgePoints = null;
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
        City.ForgePoints += fp;
        dailyForgePoints = City.ForgePoints;
      }
    });

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
