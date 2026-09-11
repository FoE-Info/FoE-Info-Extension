/**
 * gbNaming.js
 *
 * Great Building naming helpers, short abbreviations, and landmark resolution.
 * Decoupled from helper.js and StartupService.js.
 */

let metadataStore = null;
try {
  metadataStore = require('../state/MetadataStore.js').metadataStore;
} catch {}

let stateModule = {};
try {
  stateModule = require('../vars/state.js');
} catch {}

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('gbNaming');
} catch {
  logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}

const GB_SHORT_NAMES = new Map([
  ['Castel del Monte', 'CdM'],
  ['Innovation Tower', 'Inno'],
  ['Alcatraz', 'Traz'],
  ['Château Frontenac', 'CF'],
  ['The Arc', 'Arc'],
  ['Cape Canaveral', 'Cape'],
  ['Hagia Sophia', 'Hagia'],
  ['Arctic Orangery', 'AO'],
  ['The Kraken', 'Kraken'],
  ['Statue of Zeus', 'Zeus'],
  ['Cathedral of Aachen', 'CoA'],
  ["St. Mark's Basilica", 'SMB'],
  ['Temple of Relics', 'ToR'],
  ['The Blue Galaxy', 'Galaxy'],
  ['Terracotta Army', 'Army'],
  ['Observatory', 'Obs'],
  ['Rain Forest Project', 'RF'],
  ['Royal Albert Hall', 'RAH'],
  ['Lighthouse of Alexandria', 'LoA'],
  ['Truce Tower', 'Truce'],
  ['Frauenkirche of Dresden', 'FoD'],
  ["Saint Basil's Cathedral", 'Basils'],
  ['Atlantis Museum', 'Atlantis'],
  ['Tower of Babel', 'Babel'],
  ['Deal Castle', 'Deal'],
  ['Himeji Castle', 'Himeji'],
  ['Star Gazer', 'Gazer'],
  ['The Virgo Project', 'Virgo'],
  ['Seed Vault', 'Seed'],
  ['Space Carrier', 'SC'],
  ['The Habitat', 'Hab'],
  ['Gaea Statue', 'Gaea'],
  ['Galata Tower', 'Galata'],
  ['Flying Island', 'Flying'],
  ['A.I Core', 'AI'],
  ['Saturn VI Gate CENTAURUS', 'Centaurus'],
  ['Saturn VI Gate PEGASUS', 'Pegasus'],
  ['Saturn VI Gate HYDRA', 'Hydra'],
  ['Stellar Warship', 'SW'],
  ['Cosmic Catalyst', 'CC'],
]);

/**
 * Canonical landmark identifier to Great Building name dictionary.
 * Single source of truth for GB naming (consolidated F12 debt).
 */
const GB_NAME_MAP = {
  X_AllAge_EasterBonus4: 'Observatory',
  X_AllAge_Expedition: 'Temple of Relics',
  X_AllAge_Oracle: 'Oracle of Delphi',
  X_AllAge_Galata: 'Galata Tower',
  X_BronzeAge_Landmark1: 'Tower of Babel',
  X_BronzeAge_Landmark2: 'Statue of Zeus',
  X_IronAge_Landmark1: 'Colosseum',
  X_IronAge_Landmark2: 'Lighthouse of Alexandria',
  X_EarlyMiddleAge_Landmark1: 'Hagia Sophia',
  X_EarlyMiddleAge_Landmark2: 'Cathedral of Aachen',
  X_EarlyMiddleAge_Landmark3: 'Galata Tower',
  X_HighMiddleAge_Landmark1: "St. Mark's Basilica",
  X_HighMiddleAge_Landmark3: 'Notre Dame',
  X_LateMiddleAge_Landmark1: "St. Basil's Cathedral",
  X_LateMiddleAge_Landmark3: 'Castel del Monte',
  X_ColonialAge_Landmark1: 'Frauenkirche of Dresden',
  X_ColonialAge_Landmark2: 'Deal Castle',
  X_IndustrialAge_Landmark1: 'Royal Albert Hall',
  X_IndustrialAge_Landmark2: 'Capitol',
  X_ProgressiveEra_Landmark1: 'Alcatraz',
  X_ProgressiveEra_Landmark2: 'Château Frontenac',
  X_ModernEra_Landmark1: 'Space Needle',
  X_ModernEra_Landmark2: 'Atomium',
  X_PostModernEra_Landmark1: 'Cape Canaveral',
  X_PostModernEra_Landmark2: 'The Habitat',
  X_ContemporaryEra_Landmark1: 'Lotus Temple',
  X_ContemporaryEra_Landmark2: 'Innovation Tower',
  X_TomorrowEra_Landmark1: 'Voyager V1',
  X_TomorrowEra_Landmark2: 'Truce Tower',
  X_FutureEra_Landmark1: 'The Arc',
  X_FutureEra_Landmark2: 'Rain Forest Project',
  X_ArcticFuture_Landmark1: 'Gaea Statue',
  X_ArcticFuture_Landmark2: 'Arctic Orangery',
  X_ArcticFuture_Landmark3: 'Seed Vault',
  X_OceanicFuture_Landmark1: 'Atlantis Museum',
  X_OceanicFuture_Landmark2: 'The Kraken',
  X_OceanicFuture_Landmark3: 'The Blue Galaxy',
  X_VirtualFuture_Landmark1: 'Terracotta Army',
  X_VirtualFuture_Landmark2: 'Himeji Castle',
  X_SpaceAgeMars_Landmark1: 'Star Gazer',
  X_SpaceAgeMars_Landmark2: 'The Virgo Project',
  X_SpaceAgeAsteroidBelt_Landmark1: 'Space Carrier',
  X_SpaceAgeVenus_Landmark1: 'Flying Island',
  X_SpaceAgeJupiterMoon_Landmark1: 'A.I. Core',
  X_SpaceAgeTitan_Landmark1: 'Saturn VI Gate CENTAURUS',
  X_SpaceAgeTitan_Landmark2: 'Saturn VI Gate PEGASUS',
  X_SpaceAgeTitan_Landmark3: 'Saturn VI Gate HYDRA',
  X_SpaceAgeSpaceHub_Landmark1: 'Stellar Warship',
  X_SpaceAgeSpaceHub_Landmark2: 'Cosmic Catalyst',
  X_SpaceAgeDiscovery_Landmark1: 'Space Age Discovery Landmark 1',
  X_SpaceAgeDiscovery_Landmark2: 'Space Age Discovery Landmark 2',
};

const GB_FALLBACK_NAMES = new Map(Object.entries(GB_NAME_MAP));

/**
 * Resolves a landmark identifier to its canonical Great Building name.
 *
 * @param {string} cityEntityId - Entity identifier (optionally prefixed).
 * @returns {string} Canonical name or empty string when unknown.
 */
function getGreatBuildingName(cityEntityId) {
  if (!cityEntityId) return '';
  const cleanId = String(cityEntityId).replace(/^building_entity_/, '');
  return GB_NAME_MAP[cleanId] || GB_NAME_MAP[cityEntityId] || '';
}

/**
 * Returns short abbreviation for a Great Building name.
 *
 * @param {string} city_entity - Great Building name string.
 * @returns {string} Short abbreviation (e.g. 'CdM', 'Inno', 'Arc').
 */
function fGBsname(city_entity) {
  if (!city_entity) return '';
  const str = String(city_entity);
  const mapped = GB_SHORT_NAMES.get(str);
  if (mapped) return mapped;
  return str.slice(0, 10);
}

/**
 * Resolves Great Building entity identifier to its full localized name.
 *
 * @param {string} city_entity - Entity identifier or name.
 * @param {boolean} [reportLookup=true] - Whether to report lookup to MetadataStore.
 * @param {Object} [customCityEntityDefs=null] - Optional CityEntityDefs override.
 * @param {Object} [customMetadataStore=null] - Optional MetadataStore override.
 * @returns {string} Resolved Great Building name.
 */
function fGBname(
  city_entity,
  reportLookup = true,
  customCityEntityDefs = null,
  customMetadataStore = null,
) {
  if (!city_entity) return '';
  const GB_name = String(city_entity);
  const cleanId = GB_name.replace(/^building_entity_/, '').replace(
    /^[WXRLM]_(MultiAge|AllAge|[A-Za-z0-9]+)_/,
    '',
  );

  const defs =
    customCityEntityDefs ||
    stateModule.CityEntityDefs ||
    (typeof globalThis !== 'undefined' && globalThis.CityEntityDefs ?
      globalThis.CityEntityDefs
    : null) ||
    {};
  const store =
    customMetadataStore ||
    metadataStore ||
    (typeof globalThis !== 'undefined' && globalThis.metadataStore ?
      globalThis.metadataStore
    : null);

  const candidates = [
    GB_name,
    cleanId,
    `X_AllAge_${cleanId}`,
    `X_MultiAge_${cleanId}`,
    `W_MultiAge_${cleanId}`,
    `R_MultiAge_${cleanId}`,
    `M_AllAge_${cleanId}`,
    `M_MultiAge_${cleanId}`,
  ];

  for (const key of candidates) {
    const def = defs[key];
    if (def) {
      const name = def.name || def.Name || def.title;
      if (name) {
        if (
          reportLookup &&
          store &&
          typeof store.reportEntityLookup === 'function'
        ) {
          store.reportEntityLookup(String(city_entity), def);
        }
        logger.debug('Resolved GB name from defs:', {
          entity: city_entity,
          name,
        });
        return name;
      }
    }
  }

  const fallback = GB_FALLBACK_NAMES.get(GB_name);
  const resolved = fallback || GB_name;

  if (reportLookup && store && typeof store.reportEntityLookup === 'function') {
    store.reportEntityLookup(String(city_entity), Boolean(fallback));
  }

  logger.debug('Resolved GB name from fallback/raw:', {
    entity: city_entity,
    name: resolved,
  });
  return resolved;
}

/**
 * Resolves Chateau Frontenac display name.
 *
 * @param {Object} [customHelper] - Optional helper instance with fGBname method.
 * @returns {string} Name token or full name (defaults to 'Chateau').
 */
function fCFname(customHelper = null) {
  const gbNameFn =
    customHelper != null ? customHelper.fGBname
    : typeof fGBname === 'function' ? fGBname
    : null;
  const rawName = gbNameFn?.('X_ProgressiveEra_Landmark2');
  if (rawName) {
    const nameArray = String(rawName).split(' ');
    if (nameArray[0] === 'Chateau' || nameArray[0] === 'Château') {
      return nameArray[0];
    } else if (nameArray[1] === 'Frontenac') {
      return nameArray[1];
    } else {
      return rawName;
    }
  }
  return 'Chateau';
}

/**
 * Resolves The Arc display name.
 *
 * @param {Object} [customHelper] - Optional helper instance with fGBname method.
 * @returns {string} Name token (defaults to 'Arc').
 */
function fArcname(customHelper = null) {
  const gbNameFn =
    customHelper != null ? customHelper.fGBname
    : typeof fGBname === 'function' ? fGBname
    : null;
  const rawName = gbNameFn?.('X_FutureEra_Landmark1');
  if (rawName) {
    if (rawName === 'The Arc') {
      return 'Arc';
    }
    return rawName;
  }
  return 'Arc';
}

module.exports = {
  fGBsname,
  fGBname,
  fCFname,
  fArcname,
  GB_SHORT_NAMES,
  GB_FALLBACK_NAMES,
  GB_NAME_MAP,
  getGreatBuildingName,
};
module.exports.default = module.exports;
module.exports.fGBsname = fGBsname;
module.exports.fGBname = fGBname;
module.exports.fCFname = fCFname;
module.exports.fArcname = fArcname;
