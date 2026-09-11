const { metadataStore } = require('../state/MetadataStore.js');

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

const fetchedMetadataUrls = new Set();

function getEntityId(id) {
  if (id === null || id === undefined) return null;
  if (typeof id === 'string' || typeof id === 'number') return id;
  if (typeof id === 'object') {
    return id.value || id.id || id.identifier || null;
  }
  return null;
}

const IGNORED_CLASSES = new Set(['QuestTabMetadata', 'InfoScreen']);

function getCandidateEntityLookupKeys(rawId) {
  if (!rawId) return [];
  const strId = String(rawId);
  const cleanId = strId
    .replace(/^building_entity_/, '')
    .replace(/^(W_|R_|X_|L_|D_|B_|M_|S_|P_|G_|Q_)/, '')
    .replace(/^(MultiAge_|AllAge_)/, '');

  return [
    strId,
    `building_entity_${strId}`,
    cleanId,
    `building_entity_${cleanId}`,
    `W_MultiAge_${cleanId}`,
    `building_entity_W_MultiAge_${cleanId}`,
    `R_MultiAge_${cleanId}`,
    `building_entity_R_MultiAge_${cleanId}`,
    `M_AllAge_${cleanId}`,
    `building_entity_M_AllAge_${cleanId}`,
    `M_MultiAge_${cleanId}`,
    `building_entity_M_MultiAge_${cleanId}`,
  ];
}

const METADATA_HANDLERS = {
  StaticData(msg) {
    if (!msg.identifier || !msg.url) return;
    const identifier = getEntityId(msg.identifier) || msg.identifier;
    BuildingEntityLookup[identifier] = msg.url;
    if (
      metadataStore &&
      typeof metadataStore.registerLookupUrl === 'function'
    ) {
      metadataStore.registerLookupUrl(identifier, msg.url);
    }
    if (
      typeof identifier === 'string' &&
      identifier.startsWith('building_entity_')
    ) {
      const rawId = identifier.replace('building_entity_', '');
      BuildingEntityLookup[rawId] = msg.url;
      if (
        metadataStore &&
        typeof metadataStore.registerLookupUrl === 'function'
      ) {
        metadataStore.registerLookupUrl(rawId, msg.url);
      }
    }
  },
  UnitType(msg) {
    const unitTypeId = getEntityId(msg.unitTypeId) || msg.unitTypeId;
    if (unitTypeId) {
      MilitaryDefs[unitTypeId] = {
        name: msg.name,
        era: msg.minEra,
      };
      if (metadataStore && typeof metadataStore.registerUnit === 'function') {
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
      metadataStore.registerTechnology(msg);
    }
  },
  AllyMetadata(msg) {
    const id = getEntityId(msg.id);
    if (id) {
      AllyDefs[id] = msg;
      metadataStore.registerAlly(msg);
    }
  },
  BuildingSetMetadata(msg) {
    if (
      metadataStore &&
      typeof metadataStore.registerBuildingSets === 'function'
    ) {
      metadataStore.registerBuildingSets([msg]);
    }
  },
  ChainMetadata(msg) {
    if (
      metadataStore &&
      typeof metadataStore.registerBuildingChains === 'function'
    ) {
      metadataStore.registerBuildingChains([msg]);
    }
  },
  BuildingUpgrade(msg) {
    if (
      metadataStore &&
      typeof metadataStore.registerBuildingUpgrades === 'function'
    ) {
      metadataStore.registerBuildingUpgrades([msg]);
    }
  },
};

function processMetadataEntry(msg) {
  if (!msg || typeof msg !== 'object') return;

  const id = getEntityId(msg.id) || msg.asset_id || msg.identifier;
  const name =
    msg.name ||
    msg.Name ||
    msg.title ||
    (Array.isArray(msg.entity_levels) &&
      msg.entity_levels[0] &&
      msg.entity_levels[0].name) ||
    msg.name_key ||
    msg.nameKey;

  const staticId = msg.identifier || msg.id;
  if (staticId && msg.url) {
    const identifier = getEntityId(staticId) || staticId;
    BuildingEntityLookup[identifier] = msg.url;
    if (
      metadataStore &&
      typeof metadataStore.registerLookupUrl === 'function'
    ) {
      metadataStore.registerLookupUrl(identifier, msg.url);
    }
    if (typeof identifier === 'string') {
      const rawId = identifier.replace(/^building_entity_/, '');
      BuildingEntityLookup[rawId] = msg.url;
      if (
        metadataStore &&
        typeof metadataStore.registerLookupUrl === 'function'
      ) {
        metadataStore.registerLookupUrl(rawId, msg.url);
      }
    }
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
    if (id) {
      const resolvedName =
        name ||
        msg.name ||
        msg.Name ||
        msg.title ||
        (Array.isArray(msg.entity_levels) &&
          msg.entity_levels[0] &&
          msg.entity_levels[0].name) ||
        null;

      const normalizedEntry = { ...msg, name: resolvedName };
      CityEntityDefs[id] = normalizedEntry;
      if (msg.asset_id) CityEntityDefs[msg.asset_id] = normalizedEntry;

      if (Array.isArray(msg.entity_levels)) {
        msg.entity_levels.forEach((lvl) => {
          if (lvl && lvl.id) {
            CityEntityDefs[lvl.id] = {
              ...lvl,
              name: lvl.name || resolvedName,
            };
            if (lvl.asset_id) {
              CityEntityDefs[lvl.asset_id] = CityEntityDefs[lvl.id];
            }
          }
        });
      }

      if (typeof id === 'string') {
        const rawEntityId = id.replace(/^building_entity_/, '');
        CityEntityDefs[rawEntityId] = normalizedEntry;
        CityEntityDefs[`building_entity_${rawEntityId}`] = normalizedEntry;

        const cleanId = rawEntityId
          .replace(/^(W_|R_|X_|L_|D_|B_|M_|S_|P_|G_|Q_)/, '')
          .replace(/^(MultiAge_|AllAge_)/, '');
        if (cleanId) {
          CityEntityDefs[cleanId] = normalizedEntry;
          CityEntityDefs[`building_entity_${cleanId}`] = normalizedEntry;
          CityEntityDefs[`W_MultiAge_${cleanId}`] = normalizedEntry;
          CityEntityDefs[`R_MultiAge_${cleanId}`] = normalizedEntry;
          CityEntityDefs[`M_MultiAge_${cleanId}`] = normalizedEntry;
          CityEntityDefs[`M_AllAge_${cleanId}`] = normalizedEntry;
        }
      }

      metadataStore.registerEntity(normalizedEntry);
    }
    return;
  }

  // Recurse into nested metadata dictionaries
  if (!id && !name && typeof msg === 'object') {
    Object.keys(msg).forEach((key) => {
      const val = msg[key];
      if (val && typeof val === 'object') {
        if (!Array.isArray(val) && !val.id && !val.asset_id) {
          val.id = key;
        }
        processMetadataEntry(val);
      }
    });
  }
}

function processMetadataData(data) {
  if (!data) return;
  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      processMetadataEntry(data[i]);
    }
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
            BuildingEntityLookup[key.replace(/^building_entity_/, '')] = entry;
          } else if (Array.isArray(entry)) {
            for (let i = 0; i < entry.length; i++) {
              processMetadataEntry(entry[i]);
            }
          } else if (entry && typeof entry === 'object') {
            processMetadataEntry(entry);
          }
        }
      }
    }
  }
}

async function resolveMissingCityEntities(ids, onUpdate) {
  if (!ids || ids.length === 0) return;
  const uniqueIds = [...new Set(ids)];
  const toFetch = [];

  for (const rawId of uniqueIds) {
    if (!rawId) continue;
    const existing = CityEntityDefs[rawId] || metadataStore.getEntity(rawId);
    if (existing) continue;

    let foundUrl =
      BuildingEntityLookup[rawId] ||
      BuildingEntityLookup[`building_entity_${rawId}`] ||
      (metadataStore &&
        typeof metadataStore.getLookupUrl === 'function' &&
        metadataStore.getLookupUrl(rawId)) ||
      null;

    if (!foundUrl) {
      const candidates = getCandidateEntityLookupKeys(rawId);
      for (const k of candidates) {
        if (BuildingEntityLookup[k]) {
          foundUrl = BuildingEntityLookup[k];
          break;
        }
      }
    }

    if (foundUrl && !fetchedMetadataUrls.has(foundUrl)) {
      toFetch.push({ id: String(rawId), url: foundUrl });
    }
  }

  if (toFetch.length === 0) return;

  const results = await Promise.allSettled(
    toFetch.map(async (item) => {
      fetchedMetadataUrls.add(item.url);
      try {
        const res = await fetch(item.url);
        if (res.ok) {
          const json = await res.json();
          if (json) {
            if (!json.id) json.id = item.id;
            processMetadataData(json);
            return true;
          }
        }
      } catch (e) {
        console.warn(
          'Failed to fetch building metadata:',
          item.id,
          item.url,
          e,
        );
      }
      return false;
    }),
  );

  const anyLoaded = results.some(
    (r) => r.status === 'fulfilled' && r.value === true,
  );
  if (anyLoaded && typeof onUpdate === 'function') {
    onUpdate();
  }
}

async function resolveMissingUnitTypes(onUpdate) {
  const unitUrl =
    BuildingEntityLookup['unit_types'] ||
    BuildingEntityLookup['building_entity_unit_types'];
  if (!unitUrl || fetchedMetadataUrls.has(unitUrl)) return false;
  fetchedMetadataUrls.add(unitUrl);

  try {
    const res = await fetch(unitUrl);
    if (res.ok) {
      const json = await res.json();
      if (json) {
        processMetadataData(json);
        if (typeof onUpdate === 'function') {
          onUpdate();
        }
        return true;
      }
    }
  } catch (e) {
    console.warn('Failed to fetch unit_types metadata:', unitUrl, e);
  }
  return false;
}

module.exports = {
  fetchedMetadataUrls,
  getEntityId,
  getCandidateEntityLookupKeys,
  processMetadataEntry,
  processMetadataData,
  resolveMissingCityEntities,
  resolveMissingUnitTypes,
};
module.exports.default = module.exports;
