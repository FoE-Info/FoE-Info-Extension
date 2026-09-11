/**
 * gbNames.js
 *
 * Landmark identifier to canonical name mapping dictionary.
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

function getGreatBuildingName(cityEntityId) {
  if (!cityEntityId) return '';
  const cleanId = String(cityEntityId).replace(/^building_entity_/, '');
  return GB_NAME_MAP[cleanId] || GB_NAME_MAP[cityEntityId] || '';
}

module.exports = {
  GB_NAME_MAP,
  getGreatBuildingName,
};
module.exports.default = module.exports;
