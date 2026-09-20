/**
 * metadataRelations.js
 *
 * Relational inverted indexes for Forge of Empires building sets, chains,
 * upgrade kits, and selection kits.
 */

let logger = null;
try {
  const logging = require('../utils/logger.js');
  logger = logging.createLogger('metadataRelations');
} catch {}

class MetadataRelations {
  constructor() {
    this.reset();
  }

  reset() {
    logger?.debug('Metadata relations reset');
    this.sets = new Map();
    this.chains = new Map();
    this.upgradeKits = new Map();
    this.selectionKits = new Map();

    // Relational Inverted Indexes
    this.entityToUpgrade = new Map();
    this.entityToKits = new Map();
    this.entityToSet = new Map();
    this.entityToChain = new Map();
  }

  registerBuildingSets(sets) {
    if (!Array.isArray(sets)) return;
    logger?.debug(`Registering ${sets.length} building sets`);
    for (const s of sets) {
      if (!s.id) continue;
      this.sets.set(s.id, s);
      const ids = s.cityEntityIds || s.buildings || [];
      for (const bId of ids) {
        this.entityToSet.set(bId, s.id);
      }
    }
  }

  registerBuildingChains(chains) {
    if (!Array.isArray(chains)) return;
    logger?.debug(`Registering ${chains.length} building chains`);
    for (const c of chains) {
      if (!c.id) continue;
      this.chains.set(c.id, c);
      const ids = c.cityEntityIds || c.buildings || [];
      for (const bId of ids) {
        this.entityToChain.set(bId, c.id);
      }
    }
  }

  registerBuildingUpgrades(upgrades) {
    if (!Array.isArray(upgrades)) return;
    logger?.debug(`Registering ${upgrades.length} building upgrades`);
    for (const u of upgrades) {
      const kitId = u.upgradeItem?.id;
      if (!kitId) continue;
      this.upgradeKits.set(kitId, u);

      const steps = (u.upgradeSteps || [])
        .map((s) => s.buildingIds || [])
        .flat();
      steps.forEach((bId, idx) => {
        this.entityToUpgrade.set(bId, {
          kitId,
          kitName: u.upgradeItem?.name,
          level: idx + 1,
          maxLevel: steps.length,
          chain: steps,
        });
      });
    }
  }

  registerSelectionKits(kits) {
    if (!Array.isArray(kits)) return;
    logger?.debug(`Registering ${kits.length} selection kits`);
    for (const k of kits) {
      const kitId = k.selectionKitId || k.id;
      if (!kitId) continue;
      this.selectionKits.set(kitId, k);

      for (const opt of k.options || []) {
        const bId = opt.item?.cityEntityId;
        if (bId) {
          if (!this.entityToKits.has(bId)) {
            this.entityToKits.set(bId, []);
          }
          this.entityToKits.get(bId).push({
            kitId,
            kitName: k.name,
            optionName: opt.name,
            level: opt.item?.level,
          });
        }
      }
    }
  }

  getUpgradePath(id, getEntityFn) {
    const info = this.entityToUpgrade.get(id);
    if (!info) return null;
    return {
      ...info,
      buildings: info.chain.map(
        (bId) => (getEntityFn ? getEntityFn(bId) : null) || { id: bId },
      ),
    };
  }

  getSelectionKits(id) {
    return this.entityToKits.get(id) || [];
  }

  getSet(id) {
    const setId = this.entityToSet.get(id) || id;
    return this.sets.get(setId) || null;
  }

  getSetForEntity(id) {
    return this.entityToSet.get(id) || null;
  }

  getChain(id) {
    const chainId = this.entityToChain.get(id) || id;
    return this.chains.get(chainId) || null;
  }

  getChainForEntity(id) {
    return this.entityToChain.get(id) || null;
  }
}

const RELATION_PROPERTIES = [
  'sets',
  'chains',
  'upgradeKits',
  'selectionKits',
  'entityToUpgrade',
  'entityToKits',
  'entityToSet',
  'entityToChain',
];

module.exports = {
  MetadataRelations,
  RELATION_PROPERTIES,
};
