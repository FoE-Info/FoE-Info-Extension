/**
 * InventoryService.js
 *
 * Decoupled domain service for Forge of Empires player inventory.
 * Handles InventoryService.getItems and InventoryService.getGreatBuildings RPC payloads,
 * categorizing items (kits, fragments, boosts, buildings), tracking blueprints, and
 * calculating inventory Forge Point packs with BigNumber precision.
 */

const BigNumber = require('bignumber.js');
const { messageDispatcher } = require('../protocol/MessageDispatcher.js');

class InventoryItem {
  constructor(raw = {}) {
    this.id = raw.id || 0;
    this.name = raw.name || '';
    this.description = raw.description || '';
    this.inStock = raw.inStock || 0;
    this.itemAssetName = raw.itemAssetName || '';
    this.payloadClass = raw.item?.__class__ || '';
    this.item = raw.item || {};
    this.raw = raw;
  }

  isKit() {
    return (
      this.payloadClass.includes('Kit') ||
      this.payloadClass.endsWith('KitPayload')
    );
  }

  isFragment() {
    return this.payloadClass === 'FragmentItemPayload';
  }

  isBoost() {
    return (
      this.payloadClass === 'BoostItemPayload' ||
      this.payloadClass === 'BoostPotionItemPayload'
    );
  }

  isBuilding() {
    return this.payloadClass === 'BuildingItemPayload';
  }

  getForgePointsValue() {
    if (
      this.isBoost() ||
      this.isBuilding() ||
      this.isFragment() ||
      this.isKit()
    ) {
      return new BigNumber(0);
    }

    const isFpPackage =
      this.payloadClass === 'ForgePointPackagePayload' ||
      Boolean(this.item.resource_package) ||
      (typeof this.name === 'string' &&
        /(forge point|forge-punkte|points? forge|puntos? forge|punti forge|πόντοι forge|punkty forge)/i.test(
          this.name,
        )) ||
      (typeof this.item?.id === 'string' &&
        (this.item.id.includes('forge_point') ||
          this.item.id.includes('fp_package')));

    if (!isFpPackage) {
      return new BigNumber(0);
    }

    let packGain = this.item.resource_package?.gain || this.item.extraFp || 0;

    if (!packGain && typeof this.name === 'string') {
      const match = this.name.match(
        /(\d+)\s*(?:forge point|forge-punkte|points? forge|puntos? forge|punti forge|πόντοι forge|punkty forge)/i,
      );
      if (match) {
        packGain = parseInt(match[1], 10);
      }
    }

    if (packGain > 0) {
      return new BigNumber(this.inStock).multipliedBy(packGain);
    }

    return new BigNumber(0);
  }
}

class GreatBuildingInventoryEntry {
  constructor(raw = {}) {
    this.cityentityId = raw.cityentity_id || '';
    this.name = raw.name || '';
    this.maxLevel = raw.max_level || 0;
    this.blueprints = raw.blueprints || [];
    this.raw = raw;
  }

  getTotalBlueprints() {
    return this.blueprints.reduce(
      (acc, bp) => acc.plus(new BigNumber(bp.amount || 0)),
      new BigNumber(0),
    );
  }

  getCompleteSets() {
    const pieceMap = new Map();
    for (const bp of this.blueprints) {
      const num = bp.piece_number !== undefined ? bp.piece_number : -1;
      if (num >= 0) {
        pieceMap.set(num, new BigNumber(bp.amount || 0));
      }
    }
    if (pieceMap.size < 9) {
      return new BigNumber(0);
    }
    let minSets = null;
    for (const count of pieceMap.values()) {
      if (minSets === null || count.isLessThan(minSets)) {
        minSets = count;
      }
    }
    return minSets || new BigNumber(0);
  }
}

class InventoryService {
  constructor() {
    this.items = [];
    this.greatBuildings = [];
    this.totalForgePoints = new BigNumber(0);
    this.lastUpdated = null;

    this.getItems = this.getItems.bind(this);
    this.getGreatBuildings = this.getGreatBuildings.bind(this);
  }

  register(dispatcher = messageDispatcher) {
    if (dispatcher && typeof dispatcher.register === 'function') {
      dispatcher.register('InventoryService', 'getItems', this.getItems);
      dispatcher.register(
        'InventoryService',
        'getGreatBuildings',
        this.getGreatBuildings,
      );
    }
    return this;
  }

  getItems(msg) {
    const rawList =
      Array.isArray(msg?.responseData) ? msg.responseData
      : Array.isArray(msg?.responseData?.items) ? msg.responseData.items
      : [];

    this.items = rawList.map((i) => new InventoryItem(i));

    let fpSum = new BigNumber(0);
    for (const item of this.items) {
      fpSum = fpSum.plus(item.getForgePointsValue());
    }
    this.totalForgePoints = fpSum;
    this.lastUpdated = Date.now();

    try {
      const state = require('../vars/state.js');
      if (state) {
        state.availablePacksFP = fpSum.toNumber();
      }
    } catch {}

    if (typeof document !== 'undefined') {
      const availableEl = document.getElementById('availableFPID');
      if (availableEl) {
        availableEl.textContent = fpSum.toString();
      }
    }

    return {
      success: true,
      total: this.items.length,
      totalForgePoints: this.totalForgePoints,
      items: this.items,
    };
  }

  getGreatBuildings(msg) {
    const rawList =
      Array.isArray(msg?.responseData) ? msg.responseData
      : Array.isArray(msg?.responseData?.greatBuildings) ?
        msg.responseData.greatBuildings
      : [];

    this.greatBuildings = rawList.map(
      (b) => new GreatBuildingInventoryEntry(b),
    );
    this.lastUpdated = Date.now();

    return {
      success: true,
      total: this.greatBuildings.length,
      greatBuildings: this.greatBuildings,
    };
  }

  getAllItems() {
    return this.items;
  }

  getItemById(id) {
    return this.items.find((i) => i.id === id) || null;
  }

  getKits() {
    return this.items.filter((i) => i.isKit());
  }

  getFragments() {
    return this.items.filter((i) => i.isFragment());
  }

  getBoosts() {
    return this.items.filter((i) => i.isBoost());
  }

  getBuildings() {
    return this.items.filter((i) => i.isBuilding());
  }

  getTotalForgePoints() {
    return this.totalForgePoints;
  }

  getGreatBuildingById(cityentityId) {
    return (
      this.greatBuildings.find((b) => b.cityentityId === cityentityId) || null
    );
  }

  getCompleteBlueprintSets(cityentityId) {
    const gb = this.getGreatBuildingById(cityentityId);
    return gb ? gb.getCompleteSets() : new BigNumber(0);
  }

  getTotalBlueprints(cityentityId) {
    const gb = this.getGreatBuildingById(cityentityId);
    return gb ? gb.getTotalBlueprints() : new BigNumber(0);
  }
}

const inventoryService = new InventoryService();
if (messageDispatcher && typeof messageDispatcher.register === 'function') {
  inventoryService.register(messageDispatcher);
}

module.exports = {
  InventoryService,
  InventoryItem,
  GreatBuildingInventoryEntry,
  inventoryService,
  getItems: inventoryService.getItems,
  getGreatBuildings: inventoryService.getGreatBuildings,
};
module.exports.default = inventoryService;
