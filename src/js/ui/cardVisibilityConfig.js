/**
 * cardVisibilityConfig.js
 *
 * Frozen panel/context visibility tables extracted from cardVisibility.js so
 * both the .js runtime and the .ts mirror share one source of truth.
 */

const GAME_CONTEXTS = Object.freeze([
  'OWN_CITY',
  'GBG',
  'GE',
  'QI',
  'SETTLEMENT',
  'OTHER_PLAYER',
]);

/**
 * Canonical whitelist of panels per game context. Ancestor wrapper containers
 * are resolved automatically by getAllowedPanelsForView(), so listing a nested
 * panel (e.g. #goods) keeps its wrapper (#goodsInventory) visible too.
 */
const CONTEXT_ALLOWED_PANELS = Object.freeze({
  OWN_CITY: Object.freeze([
    'header',
    'citystats',
    'incidents',
    'army',
    'rewards',
    'cityrewards',
    'bonus',
    'galaxy',
    'invested',
    'greatbuilding',
    'gbInfo',
    'donation',
    'donation2',
    'donationDIV2',
    'guild',
    'treasury',
    'treasuryLog',
    'goods',
    'friends',
  ]),
  GBG: Object.freeze([
    'header',
    'citystats',
    'army',
    'rewards',
    'targets',
    'gbgTargetGenerator',
    'battleground',
    'battlegrounds',
    'gbgLeaderboard',
  ]),
  GE: Object.freeze([
    'header',
    'citystats',
    'army',
    'rewards',
    'geChampionship',
    'geContributions',
    'geInternationalSection',
    'geContributionSection',
  ]),
  QI: Object.freeze([
    'header',
    'citystats',
    'army',
    'rewards',
    'quantumContributions',
    'quantumLeaderboard',
  ]),
  SETTLEMENT: Object.freeze(['header', 'citystats', 'cultural']),
  OTHER_PLAYER: Object.freeze([
    'header',
    'citystats',
    'visit',
    'donation',
    'donation2',
    'gbInfo',
    'greatbuilding',
  ]),
});

/** Parent wrapper container for each nested panel. */
const PANEL_PARENT = Object.freeze({
  citystats: 'header',
  cityrewards: 'rewards',
  donation2: 'gbDonation',
  donation2DIV: 'gbDonation',
  donation: 'gbDonation',
  greatbuilding: 'gbContributors',
  targets: 'gbgTargetGenerator',
  battleground: 'battlegrounds',
  donationDIV2: 'geChampionship',
  goods: 'goodsInventory',
  geContributionSection: 'donationDIV2',
  geInternationalSection: 'donationDIV2',
  guild: 'guildOverview',
  treasuryLog: 'treasury',
  leaderboard: 'gbgLeaderboard',
});

/** showOptions key gating each panel (absent means "always permitted"). */
const PANEL_OPTION_KEY = Object.freeze({
  header: 'showStats',
  citystats: 'showStats',
  incidents: 'showIncidents',
  army: 'showArmy',
  rewards: 'showGBRewards',
  cityrewards: 'showGBRewards',
  bonus: 'showBonus',
  galaxy: 'showGalaxy',
  invested: 'showInvested',
  greatbuilding: 'showGBDonors',
  gbInfo: 'showGBInfo',
  donation: 'showDonation',
  donation2: 'showDonation',
  guild: 'showGuildOverview',
  guildOverview: 'showGuildOverview',
  treasury: 'showTreasury',
  treasuryLog: 'showTreasury',
  goodsInventory: 'showGoods',
  friends: 'showFriends',
  gbgTargetGenerator: 'showBattleground',
  targets: 'showBattleground',
  battlegrounds: 'showBattleground',
  battleground: 'showBattleground',
  gbgLeaderboard: 'showLeaderboard',
  leaderboard: 'showLeaderboard',
  quantumContributions: 'showQuantum',
  quantumLeaderboard: 'showQuantumLeaderboard',
  cultural: 'showSettlement',
  visit: 'showVisit',
  geContributions: 'showExpedition',
  geContributionSection: 'showExpedition',
  geInternationalSection: 'showInternationalExpedition',
});

const ALL_15_PANEL_IDS = [
  'header',
  'incidents',
  'army',
  'rewards',
  'gbDonation',
  'gbInfo',
  'gbContributors',
  'gbgTargetGenerator',
  'battlegrounds',
  'gbgLeaderboard',
  'geChampionship',
  'geContributions',
  'goodsInventory',
  'guildOverview',
  'treasury',
];

const GBG_ALLOWED_PANEL_IDS = new Set(CONTEXT_ALLOWED_PANELS.GBG);

const CITY_HIDDEN_PANEL_IDS = new Set([
  'gbgTargetGenerator',
  'battlegrounds',
  'gbgLeaderboard',
]);

const optionToElementId = {
  showStats: 'citystats',
  showBonus: 'bonus',
  showIncidents: 'incidents',
  showInvested: 'invested',
  showVisit: 'visit',
  showDonation: 'donation',
  showGBInfo: 'gbInfo',
  showGBDonors: 'greatbuilding',
  showSettlement: 'cultural',
  showArmy: 'army',
  showFriends: 'friends',
  showGuildOverview: 'guild',
  showHood: 'hood',
  showTreasury: 'treasury',
  showGBRewards: 'cityrewards',
  showGalaxy: 'galaxy',
  showBattleground: 'battleground',
  showLeaderboard: 'gbgLeaderboard',
  showQuantum: 'quantumContributions',
  showQuantumLeaderboard: 'quantumLeaderboard',
};

const SECONDARY_PANEL_IDS = [
  'donation2DIV',
  'leaderboard',
  'friends',
  'hood',
  'overview',
  'info',
  'buildings',
  'goodsInventory',
  'guildOverview',
  'gbDonation',
  'gbContributors',
  'bonus',
  'galaxy',
  'invested',
  'citystats',
  'cityrewards',
  'donation',
  'donation2',
  'donationDIV2',
  'greatbuilding',
  'targets',
  'battleground',
  'guild',
  'treasuryLog',
  'goods',
  'geInternationalSection',
  'geContributionSection',
];

const CONTEXT_PANEL_IDS = new Set();
for (const list of Object.values(CONTEXT_ALLOWED_PANELS)) {
  for (const id of list) CONTEXT_PANEL_IDS.add(id);
}

const ALL_KNOWN_PANEL_IDS = Array.from(
  new Set([
    ...ALL_15_PANEL_IDS,
    ...CONTEXT_PANEL_IDS,
    ...Object.values(optionToElementId),
    ...SECONDARY_PANEL_IDS,
  ]),
);

/**
 * Panels eligible for a debug stub. Only the visible topmost non-empty target in
 * a subtree is stubbed, so wrappers and empty shells are skipped. The Lists card
 * (#friends) is unwrapped into its three per-checker sections, and the GE cards
 * are targeted directly rather than their hidden wrappers.
 */
const DEBUG_STUB_EXCLUDED = new Set([
  'friends',
  'geChampionship',
  'geContributions',
  'geContributionSection',
  'geInternationalSection',
  'donationDIV2',
  'donation2DIV',
]);
const DEBUG_STUB_PANEL_IDS = new Set([
  ...ALL_KNOWN_PANEL_IDS.filter((id) => !DEBUG_STUB_EXCLUDED.has(id)),
  'friendsText',
  'guildText',
  'hoodText',
  'geChampionshipCard',
  'geContributionCard',
]);

module.exports = {
  GAME_CONTEXTS,
  CONTEXT_ALLOWED_PANELS,
  PANEL_PARENT,
  PANEL_OPTION_KEY,
  ALL_15_PANEL_IDS,
  GBG_ALLOWED_PANEL_IDS,
  CITY_HIDDEN_PANEL_IDS,
  optionToElementId,
  SECONDARY_PANEL_IDS,
  CONTEXT_PANEL_IDS,
  ALL_KNOWN_PANEL_IDS,
  DEBUG_STUB_EXCLUDED,
  DEBUG_STUB_PANEL_IDS,
};
module.exports.default = module.exports;
