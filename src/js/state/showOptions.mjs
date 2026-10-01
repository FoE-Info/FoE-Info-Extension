/** Reactive panel-visibility options shared across the panel UI. */
import { createLogger } from '../utils/logger.js';
import { onWorldSettingsChange } from '../utils/storage.js';

const logger = createLogger('ShowOptions');

export let showFriends = true;
export let showGuild = true;
export let showHood = true;
export let showBonus = true;
export let showIncidents = true;
export let showStats = true;
export let showGBInfo = true;
export let showGBRewards = true;
export let showGBDonors = true;
export let showInvested = true;
export let showDonation = true;
export let showBattleground = true;
export let showBattlegroundChanges = false;
export let showInternationalExpedition = true;
export let showExpedition = true;
export let showTreasury = true;
export let showGBGTreasury = false;
export let showVisit = true;
export let showSettlement = true;
export let showArmy = true;
export let showGoods = true;
export let showGuildOverview = true;
export let showLeaderboard = false;
export let showGBGrewards = true;
export let GBGprovinceTime = true;
export let GBGshowSC = true;
export let showGErewards = true;
export let showRewards = true;
export let showLogs = true;
export let showContributions = true;
export let showGuildPosition = false;
export let hideUnsafe = true;
export let buildingCosts = false;
export let collectionTimes = false;
export let clipboard = true;
export let showGalaxy = true;
export let debugGalaxy = false;
export let showQuantum = true;
export let showQuantumLeaderboard = true;
export let showQIChanges = false;
export let showDailyCoins = true;
export let showDailySupplies = true;
export let showCoinBoost = true;
export let showSupplyBoost = true;

export function updateShowOptions(newOptions) {
  if (!newOptions || typeof newOptions !== 'object') return;
  Object.assign(items, newOptions);
  if (typeof window !== 'undefined' && window.dispatchEvent) {
    window.dispatchEvent(
      new CustomEvent('foe_options_updated', { detail: items }),
    );
  }
}

// Subscribe to storage changes for current world
if (typeof onWorldSettingsChange === 'function') {
  onWorldSettingsChange((newWorldSettings) => {
    if (newWorldSettings && newWorldSettings.showOptions) {
      updateShowOptions(newWorldSettings.showOptions);
    }
  });
}

export default function set(name, state) {
  logger.debug(name, state);
  if (!state || typeof state !== 'object') return;
  updateShowOptions(state);
}

const items = {
  showFriends,
  showGuild,
  showHood,
  showBonus,
  showIncidents,
  showStats,
  showGBInfo,
  showGBRewards,
  showGBDonors,
  showInvested,
  showDonation,
  showBattleground,
  showBattlegroundChanges,
  showInternationalExpedition,
  showExpedition,
  showTreasury,
  showGBGTreasury,
  showVisit,
  showSettlement,
  showArmy,
  showGoods,
  showGuildOverview,
  showLeaderboard,
  showGBGrewards,
  GBGprovinceTime,
  GBGshowSC,
  showGErewards,
  showRewards,
  showLogs,
  showContributions,
  showGuildPosition,
  hideUnsafe,
  buildingCosts,
  collectionTimes,
  clipboard,
  showGalaxy,
  debugGalaxy,
  showQuantum,
  showQuantumLeaderboard,
  showQIChanges,
  showDailyCoins,
  showDailySupplies,
  showCoinBoost,
  showSupplyBoost,
};

export { items as showOptions };
