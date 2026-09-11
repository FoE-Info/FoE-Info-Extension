const { metadataStore } = require('../state/MetadataStore.js');
const {
  ingestBattlegroundMapMetadata,
  ingestBattlegroundBuildingMetadata,
} = require('./GbgMetadataHandler.js');
const resolver = require('./MetadataResolver.js');

let logger = null;
try {
  const logging = require('../utils/logger.js');
  logger = logging.createLogger('MetadataService');
} catch {}

let defaultState = {};
try {
  defaultState = require('../vars/state.js');
} catch (e) {
  // Defensive fallback for environments where state.js is not loaded or during Node testing
}

const AllyDefs = defaultState.AllyDefs || {};
const BoostMetadataDefs = defaultState.BoostMetadataDefs || [];
const BuildingEntityLookup = defaultState.BuildingEntityLookup || {};
const CastleDefs = defaultState.CastleDefs || [];
const CityEntityDefs = defaultState.CityEntityDefs || {};
const MilitaryDefs = defaultState.MilitaryDefs || {};
const ResearchDefs = defaultState.ResearchDefs || {};
const SelectionKitDefs = defaultState.SelectionKitDefs || [];
const VolcanoProvinceDefs =
  metadataStore.volcanoProvinces || defaultState.VolcanoProvinceDefs || [];
const WaterfallProvinceDefs =
  metadataStore.waterfallProvinces || defaultState.WaterfallProvinceDefs || [];
const BuildingDefs =
  metadataStore.buildingDefs || defaultState.BuildingDefs || [];

const { getEntityId, processCityEntity } = resolver;

const IGNORED_CLASSES = new Set(['QuestTabMetadata', 'InfoScreen']);

const METADATA_HANDLERS = {
  StaticData(msg) {
    if (!msg.identifier || !msg.url) return;
    const identifier = getEntityId(msg.identifier) || msg.identifier;
    BuildingEntityLookup[identifier] = msg.url;
    if (metadataStore?.registerLookupUrl) {
      metadataStore.registerLookupUrl(identifier, msg.url);
    }
    if (
      typeof identifier === 'string' &&
      identifier.startsWith('building_entity_')
    ) {
      const rawId = identifier.replace('building_entity_', '');
      BuildingEntityLookup[rawId] = msg.url;
      if (metadataStore?.registerLookupUrl) {
        metadataStore.registerLookupUrl(rawId, msg.url);
      }
    }
  },
  UnitType(msg) {
    const unitTypeId = getEntityId(msg.unitTypeId) || msg.unitTypeId;
    if (unitTypeId) {
      MilitaryDefs[unitTypeId] = { name: msg.name, era: msg.minEra };
      if (metadataStore?.registerUnit) {
        metadataStore.registerUnit({
          unitTypeId,
          name: msg.name,
          era: msg.minEra,
        });
      }
    }
  },
  CastleSystemLevelMetadata(msg) {
    const id = getEntityId(msg.id) || msg.level;
    if (
      !CastleDefs.some((item) => (getEntityId(item.id) || item.level) === id)
    ) {
      CastleDefs.push(msg);
    }
  },
  SelectionKitMetadata(msg) {
    const id = getEntityId(msg.id);
    if (!SelectionKitDefs.some((item) => getEntityId(item.id) === id)) {
      SelectionKitDefs.push(msg);
      metadataStore.registerSelectionKits([msg]);
    }
  },
  BoostMetadata(msg) {
    const id = getEntityId(msg.id);
    if (!BoostMetadataDefs.some((item) => getEntityId(item.id) === id)) {
      BoostMetadataDefs.push(msg);
    }
  },
  ResearchTechnology(msg) {
    const id = getEntityId(msg.id);
    if (id) {
      ResearchDefs[id] = msg;
      metadataStore.registerTechnologies([msg]);
    }
  },
  AllyMetadata(msg) {
    const id = getEntityId(msg.id);
    if (id) {
      AllyDefs[id] = msg;
      metadataStore.registerAllies([msg]);
    }
  },
  BuildingSetMetadata(msg) {
    metadataStore?.registerBuildingSets?.([msg]);
  },
  ChainMetadata(msg) {
    metadataStore?.registerBuildingChains?.([msg]);
  },
  BuildingUpgrade(msg) {
    metadataStore?.registerBuildingUpgrades?.([msg]);
  },
  GuildBattlegroundMapMetadata(msg) {
    ingestBattlegroundMapMetadata(
      msg,
      VolcanoProvinceDefs,
      WaterfallProvinceDefs,
    );
  },
  GuildBattlegroundBuildingMetadata(msg) {
    ingestBattlegroundBuildingMetadata(msg, BuildingDefs);
  },
};

function processMetadataEntry(msg) {
  if (!msg || typeof msg !== 'object') return;

  if (msg.responseData) {
    if (Array.isArray(msg.responseData)) {
      msg.responseData.forEach((item) => processMetadataEntry(item));
    } else if (typeof msg.responseData === 'object') {
      processMetadataEntry(msg.responseData);
    }
    return;
  }
  if (Array.isArray(msg)) {
    msg.forEach((item) => processMetadataEntry(item));
    return;
  }

  const id = getEntityId(msg.id) || msg.asset_id || msg.identifier;
  const name =
    msg.name ||
    msg.Name ||
    msg.title ||
    (Array.isArray(msg.entity_levels) && msg.entity_levels[0]?.name) ||
    msg.name_key ||
    msg.nameKey;

  const staticId = msg.identifier || msg.id;
  if (staticId && msg.url) {
    const identifier = getEntityId(staticId) || staticId;
    BuildingEntityLookup[identifier] = msg.url;
    if (metadataStore?.registerLookupUrl)
      metadataStore.registerLookupUrl(identifier, msg.url);
    if (typeof identifier === 'string') {
      const rawId = identifier.replace(/^building_entity_/, '');
      BuildingEntityLookup[rawId] = msg.url;
      if (metadataStore?.registerLookupUrl)
        metadataStore.registerLookupUrl(rawId, msg.url);
    }
    notifyMetadataUpdated();
    return;
  }

  if (msg.__class__ && IGNORED_CLASSES.has(msg.__class__)) return;

  const handler = msg.__class__ ? METADATA_HANDLERS[msg.__class__] : null;
  if (handler) {
    handler(msg);
    return;
  }

  const isCityEntityClass =
    msg.__class__ &&
    (msg.__class__.startsWith('CityEntity') ||
      msg.__class__ === 'GenericCityEntity');

  if (isCityEntityClass || (id && name)) {
    processCityEntity(msg, id, name, CityEntityDefs);
    if (id) notifyMetadataUpdated();
    return;
  }

  // Recurse into nested metadata dictionaries
  if (!id && !name && typeof msg === 'object') {
    Object.keys(msg).forEach((key) => {
      const val = msg[key];
      if (val && typeof val === 'object') {
        if (!Array.isArray(val) && !val.id && !val.asset_id) val.id = key;
        processMetadataEntry(val);
      }
    });
  }
}

let isBatchProcessing = false;
const metadataUpdateListeners = new Set();

function onMetadataUpdated(listener) {
  if (typeof listener !== 'function') return () => {};
  metadataUpdateListeners.add(listener);
  return () => metadataUpdateListeners.delete(listener);
}

let notifyDebounceTimer = null;
function notifyMetadataUpdated(options = {}) {
  if (options.immediate) {
    if (notifyDebounceTimer) {
      clearTimeout(notifyDebounceTimer);
      notifyDebounceTimer = null;
    }
    triggerMetadataUpdated();
    return;
  }
  if (!notifyDebounceTimer) {
    notifyDebounceTimer = setTimeout(() => {
      notifyDebounceTimer = null;
      triggerMetadataUpdated();
    }, 50);
  }
}

function triggerMetadataUpdated() {
  logger?.info(
    `[NAME-BACKFILL] metadata update fired | listeners = ${metadataUpdateListeners.size}`,
  );
  for (const listener of metadataUpdateListeners) {
    try {
      listener();
    } catch (err) {
      console.warn('MetadataService onMetadataUpdated error:', err);
    }
  }
  if (metadataStore?.notifySubscribers) {
    metadataStore.notifySubscribers({ type: 'metadataUpdated' });
  }
}

function processMetadataData(data, options = {}) {
  if (!data) return;
  const wasBatch = isBatchProcessing;
  isBatchProcessing = true;
  try {
    if (Array.isArray(data)) {
      for (let i = 0; i < data.length; i++) processMetadataEntry(data[i]);
    } else if (typeof data === 'object') {
      if (data.__class__ || data.id || (data.identifier && data.url)) {
        processMetadataEntry(data);
      } else {
        for (const key in data) {
          if (Object.prototype.hasOwnProperty.call(data, key)) {
            const entry = data[key];
            if (
              typeof entry === 'string' &&
              entry.startsWith('http') &&
              key.includes('building_entity')
            ) {
              BuildingEntityLookup[key] = entry;
              BuildingEntityLookup[key.replace(/^building_entity_/, '')] =
                entry;
            } else if (Array.isArray(entry)) {
              for (let i = 0; i < entry.length; i++)
                processMetadataEntry(entry[i]);
            } else if (entry && typeof entry === 'object') {
              processMetadataEntry(entry);
            }
          }
        }
      }
    }
  } finally {
    if (!wasBatch) {
      isBatchProcessing = false;
      notifyMetadataUpdated(options);
    }
  }
}

const resolveMissingCityEntities = (ids, onUpdate) =>
  resolver.resolveMissingCityEntities(
    ids,
    onUpdate,
    BuildingEntityLookup,
    CityEntityDefs,
    processMetadataData,
  );

const resolveMissingUnitTypes = (onUpdate) =>
  resolver.resolveMissingUnitTypes(
    onUpdate,
    BuildingEntityLookup,
    processMetadataData,
  );

module.exports = {
  fetchedMetadataUrls: resolver.fetchedMetadataUrls,
  getEntityId,
  getCandidateEntityLookupKeys: resolver.getCandidateEntityLookupKeys,
  processMetadataEntry,
  processMetadataData,
  resolveMissingCityEntities,
  resolveMissingUnitTypes,
  onMetadataUpdated,
  notifyMetadataUpdated,
  triggerMetadataUpdated,
  VolcanoProvinceDefs,
  WaterfallProvinceDefs,
  BuildingDefs,
};
module.exports.default = module.exports;
