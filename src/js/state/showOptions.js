import { onWorldSettingsChange } from '../utils/storage.js';

export var showFriends = true;
export var showGuild = true;
export var showHood = true;
export var showBonus = true;
export var showIncidents = true;
export var showStats = true;
export var showGBInfo = true;
export var showGBRewards = true;
export var showGBDonors = true;
export var showInvested = true;
export var showDonation = true;
export var showBattleground = true;
export var showBattlegroundChanges = false;
export var showInternationalExpedition = true;
export var showExpedition = true;
export var showTreasury = true;
export var showVisit = true;
export var showSettlement = true;
export var showArmy = true;
export var showGoods = true;
export var showGuildOverview = true;
export var showLeaderboard = false;
export var showGBGrewards = true;
export var GBGprovinceTime = true;
export var GBGshowSC = true;
export var showGErewards = true;
export var showRewards = true;
export var showLogs = true;
export var showContributions = true;
export var showGuildPosition = false;
export var hideUnsafe = true;
export var buildingCosts = false;
export var collectionTimes = false;
export var clipboard = true;
export var showGalaxy = true;
export var showQuantum = true;
export var showQuantumLeaderboard = true;
export var showQIChanges = false;
export var showDailyCoins = true;
export var showDailySupplies = true;
export var showCoinBoost = true;
export var showSupplyBoost = true;

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
  console.debug(name, state);
  if (!state || typeof state !== 'object') return;
  updateShowOptions(state);
}

var items = {
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
  showQuantum,
  showQuantumLeaderboard,
  showQIChanges,
  showDailyCoins,
  showDailySupplies,
  showCoinBoost,
  showSupplyBoost,
};

export { items as showOptions };
