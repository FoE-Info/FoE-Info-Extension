/**
 * metadataDomainCollections.js
 *
 * Dedicated storage and query handlers for Forge of Empires domain metadata:
 * resources, technologies, military units, eras, allies, and lookup URLs.
 */

let logger = null;
try {
  const logging = require('../utils/logger.js');
  logger = logging.createLogger('metadataDomainCollections');
} catch {}

class MetadataDomainCollections {
  constructor() {
    this.reset();
  }

  reset() {
    logger?.debug('Domain collections reset');
    this.resources = new Map();
    this.technologies = new Map();
    this.units = new Map();
    this.eras = new Map();
    this.allies = new Map();
    this.lookupUrls = new Map();
    this.volcanoProvinces = [];
    this.waterfallProvinces = [];
    this.buildingDefs = [];
  }

  registerLookupUrl(identifier, url) {
    if (!identifier || !url) return;
    this.lookupUrls.set(identifier, url);
    if (
      typeof identifier === 'string' &&
      identifier.startsWith('building_entity_')
    ) {
      this.lookupUrls.set(identifier.replace('building_entity_', ''), url);
    }
  }

  getLookupUrl(id) {
    if (!id) return null;
    return (
      this.lookupUrls.get(id) ||
      this.lookupUrls.get(`building_entity_${id}`) ||
      this.lookupUrls.get(String(id).replace(/^building_entity_/, '')) ||
      null
    );
  }

  registerResources(resources) {
    if (!Array.isArray(resources)) return;
    logger?.debug(`Registering ${resources.length} resources`);
    for (const r of resources) {
      if (r.id) this.resources.set(r.id, r);
    }
  }

  getResource(id) {
    return this.resources.get(id) || null;
  }

  registerTechnologies(techs) {
    if (!techs) return;
    const list = Array.isArray(techs) ? techs : Object.values(techs);
    logger?.debug(`Registering ${list.length} technologies`);
    for (const t of list) {
      if (t.id) this.technologies.set(t.id, t);
    }
  }

  getTechnology(id) {
    return this.technologies.get(id) || null;
  }

  registerUnit(unit) {
    if (!unit) return;
    const id = unit.unitTypeId || unit.id;
    if (id) {
      const normalized = {
        unitTypeId: id,
        id: id,
        name: unit.name || id,
        era: unit.era || unit.minEra || 'NoAge',
        minEra: unit.minEra || unit.era || 'NoAge',
        ...unit,
      };
      this.units.set(id, normalized);
    }
  }

  registerUnits(units) {
    if (!units) return;
    const list = Array.isArray(units) ? units : Object.values(units);
    logger?.debug(`Registering ${list.length} military units`);
    for (const u of list) {
      this.registerUnit(u);
    }
  }

  getUnit(unitTypeId) {
    return this.units.get(unitTypeId) || null;
  }

  registerEras(eras) {
    if (!Array.isArray(eras)) return;
    logger?.debug(`Registering ${eras.length} eras`);
    for (const e of eras) {
      if (e.era) this.eras.set(e.era, e);
    }
  }

  getEra(eraKey) {
    return this.eras.get(eraKey) || null;
  }

  registerAllies(allies) {
    if (!Array.isArray(allies)) return;
    logger?.debug(`Registering ${allies.length} allies`);
    for (const a of allies) {
      if (a.id) this.allies.set(a.id, a);
    }
  }

  getAlly(allyId) {
    return this.allies.get(allyId) || null;
  }
}

const COLLECTION_PROPERTIES = [
  'resources',
  'technologies',
  'units',
  'eras',
  'allies',
  'lookupUrls',
  'volcanoProvinces',
  'waterfallProvinces',
  'buildingDefs',
];

module.exports = {
  MetadataDomainCollections,
  COLLECTION_PROPERTIES,
};
