/**
 * storageMigration.js
 *
 * Handles atomic migration of legacy flat storage keys into isolated per-world namespaces.
 */

const {
  createFreshWorldSettings,
  createFreshGlobalSettings,
} = require('../state/factoryDefaults.js');

/**
 * Check and migrate flat legacy storage keys to world:en7 and global:settings.
 * @param {Object} all - Raw dictionary from chrome.storage.local.get(null)
 * @param {Object} local - chrome.storage.local instance
 * @returns {Promise<{ globalSettings: Object, migratedWorld: Object } | null>}
 */
async function migrateLegacyStorage(all, local) {
  if (!all || all['global:settings'] || !local) {
    return null;
  }

  const globalSettings = createFreshGlobalSettings();
  const migratedWorld = createFreshWorldSettings();

  if (all.showOptions && typeof all.showOptions === 'object') {
    Object.assign(migratedWorld.showOptions, all.showOptions);
  }
  if (typeof all.donationPercent === 'number') {
    migratedWorld.donation.percent = all.donationPercent;
  }
  if (typeof all.donationSuffix === 'string') {
    migratedWorld.donation.suffix = all.donationSuffix;
  }
  if (all.targets !== undefined) {
    migratedWorld.donation.targets = all.targets;
  }
  if (typeof all.targetText === 'string') {
    migratedWorld.donation.targetText = all.targetText;
  }
  if (all.url && typeof all.url === 'object') {
    Object.assign(migratedWorld.webhooks, all.url);
  }
  if (all.tool?.language) {
    globalSettings.language = all.tool.language;
  }
  if (all.hiddenInvestments && Array.isArray(all.hiddenInvestments)) {
    migratedWorld.caches.hiddenInvestments = all.hiddenInvestments;
  }
  for (const collapseKey of LEGACY_COLLAPSE_KEYS) {
    if (typeof all[collapseKey] === 'boolean') {
      migratedWorld.collapses[collapseKey] = all[collapseKey];
    }
  }

  globalSettings.knownWorlds = ['en7'];
  globalSettings.lastActiveWorld = 'en7';

  await local
    .set({
      'global:settings': globalSettings,
      'world:en7': migratedWorld,
    })
    .catch(() => {});

  await cleanLegacyFlatKeys(local);

  return { globalSettings, migratedWorld };
}

const LEGACY_COLLAPSE_KEYS = ['collapseGBInfo', 'collapseClipboard'];

const LEGACY_FLAT_KEYS = [
  'showOptions',
  'donationPercent',
  'donationSuffix',
  'targets',
  'targetText',
  'url',
  'tool',
  'toolOptions',
  'hiddenInvestments',
  'investSettings',
  ...LEGACY_COLLAPSE_KEYS,
];

async function cleanLegacyFlatKeys(local) {
  if (!local || typeof local.remove !== 'function') return;
  await local.remove(LEGACY_FLAT_KEYS).catch(() => {});
}

module.exports = {
  migrateLegacyStorage,
  cleanLegacyFlatKeys,
  LEGACY_FLAT_KEYS,
};
module.exports.default = module.exports;
