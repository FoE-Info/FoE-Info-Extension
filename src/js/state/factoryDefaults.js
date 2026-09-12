/**
 * factoryDefaults.js
 *
 * Factory default templates and cloning utilities for isolated per-world and global settings.
 */

const FACTORY_WORLD_SETTINGS = Object.freeze({
  showOptions: Object.freeze({
    showBonus: true,
    showIncidents: true,
    showStats: true,
    showGBInfo: true,
    showGBRewards: true,
    showGBDonors: true,
    showInvested: true,
    showDonation: true,
    showFriends: true,
    showGuild: true,
    showHood: true,
    showBattleground: true,
    showBattlegroundChanges: false,
    showInternationalExpedition: true,
    showExpedition: true,
    showTreasury: true,
    showVisit: true,
    showSettlement: true,
    showArmy: true,
    showGoods: true,
    showGuildOverview: true,
    showLeaderboard: false,
    showGBGrewards: true,
    GBGprovinceTime: true,
    GBGshowSC: true,
    GBGtimeMode: 'server',
    showGErewards: true,
    showRewards: true,
    showGalaxy: true,
    showLogs: true,
    showContributions: true,
    showGuildPosition: false,
    hideUnsafe: true,
    buildingCosts: false,
    collectionTimes: false,
    clipboard: true,
    showQuantum: true,
    showQuantumLeaderboard: true,
    showQIChanges: false,
    showDailyCoins: true,
    showDailySupplies: true,
    showCoinBoost: true,
    showSupplyBoost: true,
  }),
  donation: Object.freeze({
    percent: 190,
    suffix: '',
    targets: '',
    targetText: '',
  }),
  webhooks: Object.freeze({
    discordTargetURL: '',
    sheetGuildURL: '',
  }),
  toolOptions: Object.freeze({
    armySize: 185,
    goodsSize: 200,
    friendsSize: 200,
    treasurySize: 200,
    logsSize: 200,
    battlegroundsSize: 480,
    expeditionSize: 200,
    visitSize: 200,
    rewardSize: 200,
    buildingCostSize: 200,
    minSize: 50,
  }),
  caches: Object.freeze({
    hiddenInvestments: Object.freeze([]),
  }),
  collapses: Object.freeze({}),
});

const FACTORY_GLOBAL_SETTINGS = Object.freeze({
  language: 'game',
  knownWorlds: Object.freeze([]),
  lastActiveWorld: null,
  timeFormatting: Object.freeze({
    dateFormat: 'DD.MM.YYYY',
    timeFormat: 'HH:mm:ss',
    dateTimeFormat: 'DD.MM.YYYY HH:mm:ss',
    customPattern: '',
  }),
});

function createFreshWorldSettings() {
  return structuredClone(FACTORY_WORLD_SETTINGS);
}

function createFreshGlobalSettings() {
  return structuredClone(FACTORY_GLOBAL_SETTINGS);
}

module.exports = {
  FACTORY_WORLD_SETTINGS,
  FACTORY_GLOBAL_SETTINGS,
  createFreshWorldSettings,
  createFreshGlobalSettings,
};
