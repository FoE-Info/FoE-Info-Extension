/**
 * ResourceService.js
 *
 * Domain service for Forge of Empires player resources and goods inventory.
 * Handles ResourceService.getResourceDefinitions, ResourceService.getPlayerResources,
 * and ResourceService.getPlayerResourceBag RPC payloads. Goods card DOM rendering
 * is delegated to src/js/ui/renderGoodsPanel.js.
 */

let storage = null;
let showOptions = { showGoods: false };
let defaultState = {
  availablePacksFP: 0,
  goodsDIV: null,
  ResourceDefs: [],
  ResourceNames: {},
};

try {
  storage = require('../fn/storage.js');
} catch {}
try {
  const showOpt = require('../vars/showOptions.js');
  showOptions = showOpt.showOptions || showOpt;
} catch {}
try {
  defaultState = require('../vars/state.js');
} catch {}

const { createLogger, isDebugEnabled } = require('../utils/logger.js');
const logger = createLogger('ResourceService');
const goodsRenderer = require('../ui/renderGoodsPanel.js');
const {
  setAvailableForgePoints,
  clearGoodsPanel,
  goodsCopy,
} = require('../ui/renderResourcePanel.js');

const ResourceDefs = defaultState?.ResourceDefs || [];
const ResourceNames = defaultState?.ResourceNames || {};
let Resources = {};
let availableFP = 0;
let lastGoodsPayload = null;
// Goods Inventory panel is unlocked by default when showGoods is enabled,
// while respecting manual dismissal ([X]). Opening Market or Inventory restores it.
let goodsPanelUnlocked = true;
let goodsPanelDismissed = false;

function getResourceDefinitions(msg) {
  if (msg && msg.responseData) {
    saveResourceDefs(msg.responseData);
  } else {
    logger.debug('Resource Definitions msg:', msg);
  }
}

function saveResourceDefs(msg) {
  loadResourceDefs(msg);
  if (storage && typeof storage.set === 'function') {
    storage.set('ResourceDefs', ResourceDefs);
  }
}

function setResourceDefs(msg) {
  loadResourceDefs(msg);
}

function loadResourceDefs(msg) {
  ResourceDefs.length = 0;
  if (Array.isArray(msg)) {
    ResourceDefs.push(...msg);
  }
  ResourceDefs.forEach((rssDef) => {
    ResourceNames[rssDef.id] = rssDef.name;
  });
}

function getResourceDefinition(msg) {
  const def = msg && msg.responseData !== undefined ? msg.responseData : msg;
  if (!def || typeof def !== 'object' || !def.id) return;
  const existing = ResourceDefs.find((item) => item.id === def.id);
  if (existing) {
    Object.assign(existing, def);
  } else {
    ResourceDefs.push(def);
  }
  ResourceNames[def.id] = def.name;
}

function getPlayerResources(msg) {
  if (!msg) msg = {};

  let rawResources =
    msg.responseData?.resources?.resources ||
    msg.responseData?.resources ||
    msg.responseData ||
    msg.resources?.resources ||
    msg.resources;

  if (
    !rawResources &&
    typeof msg === 'object' &&
    !msg.requestClass &&
    !msg.__class__
  ) {
    rawResources = msg;
  }

  if (
    rawResources &&
    typeof rawResources === 'object' &&
    rawResources.resources &&
    typeof rawResources.resources === 'object'
  ) {
    rawResources = rawResources.resources;
  }

  if (
    !rawResources ||
    (typeof rawResources === 'object' && Object.keys(rawResources).length === 0)
  ) {
    return Resources;
  }

  if (rawResources !== Resources) {
    Resources = {};
    if (Array.isArray(rawResources)) {
      rawResources.forEach((item) => {
        if (item && item.id) {
          Resources[item.id] =
            item.amount !== undefined ? item.amount : item.value || 0;
        }
      });
    } else if (typeof rawResources === 'object') {
      Resources = rawResources;
    }
  }

  availableFP = Resources.strategy_points || 0;
  let availablePacksFP = defaultState?.availablePacksFP || 0;
  try {
    const inv = require('./InventoryService.js');
    if (inv?.inventoryService?.totalForgePoints) {
      availablePacksFP = inv.inventoryService.totalForgePoints.toNumber();
    }
  } catch {}

  setAvailableForgePoints(availablePacksFP);

  lastGoodsPayload = msg;
  renderGoodsPanel(Resources);
  return Resources;
}

function isGoodsPanelUnlocked() {
  return goodsPanelUnlocked && !goodsPanelDismissed;
}

function unlockGoodsPanel() {
  goodsPanelDismissed = false;
  goodsPanelUnlocked = true;
  logger.debug('goods panel unlocked');
  return true;
}

function lockGoodsPanel() {
  goodsPanelDismissed = true;
  goodsPanelUnlocked = false;
  clearGoodsPanel();
  logger.debug('goods panel locked/dismissed');
  return false;
}

function onMarketOpened(msg) {
  unlockGoodsPanel();
  const currentGoods = exportsObj.goods || Resources;
  if (!currentGoods || Object.keys(currentGoods).length === 0) {
    return { success: false, retriggered: false, reason: 'no_cached_goods' };
  }
  const result = renderGoodsPanel(currentGoods, true);
  return { success: true, retriggered: true, targetDiv: result };
}

function renderGoodsPanel(
  currentResources = exportsObj.goods || Resources,
  force = false,
) {
  const isUnlocked = force || (goodsPanelUnlocked && !goodsPanelDismissed);
  return goodsRenderer.renderGoodsPanel(currentResources, {
    force,
    showGoods: showOptions?.showGoods,
    unlocked: isUnlocked,
    debug: isDebugEnabled(),
    resourceDefs: ResourceDefs,
    resourceNames: ResourceNames,
    fallbackDiv: defaultState?.goodsDIV,
    onDismiss: lockGoodsPanel,
    onCopy: goodsCopy,
  });
}

function register(dispatcher) {
  if (dispatcher && typeof dispatcher.register === 'function') {
    dispatcher.register(
      'ResourceService',
      'getPlayerResources',
      getPlayerResources,
    );
    dispatcher.register(
      'ResourceService',
      'getPlayerResourceBag',
      getPlayerResourceBag,
    );
    dispatcher.register(
      'ResourceService',
      'getResourceDefinitions',
      getResourceDefinitions,
    );
    dispatcher.register(
      'ResourceService',
      'getResourceDefinition',
      getResourceDefinition,
    );
    dispatcher.register('TradeService', 'getTradeList', onMarketOpened);
    dispatcher.register('TradeService', 'getOpenOffers', onMarketOpened);
    dispatcher.register('TradeService', 'getTradeOffers', onMarketOpened);
    dispatcher.register('TradeService', 'getYourOffers', onMarketOpened);
  }
}

const getPlayerResourceBag = getPlayerResources;

function setResources(resource, needed = 0) {
  if (Resources[`${resource}`]) needed -= Resources[`${resource}`];
  return needed;
}

function setGlobals(g) {
  goodsRenderer.setGlobals(g);
}

function setShowOptions(opts) {
  showOptions = opts;
}

const exportsObj = {
  ResourceDefs,
  ResourceNames,
  getResourceDefinitions,
  getResourceDefinition,
  saveResourceDefs,
  setResourceDefs,
  getPlayerResources,
  getPlayerResourceBag,
  setResources,
  renderGoodsPanel,
  onMarketOpened,
  register,
  setGlobals,
  setShowOptions,
  isGoodsPanelUnlocked,
  lockGoodsPanel,
  unlockGoodsPanel,
};

Object.defineProperty(exportsObj, 'Resources', {
  get: () => Resources,
  set: (val) => {
    Resources = val;
  },
  enumerable: true,
  configurable: true,
});

Object.defineProperty(exportsObj, 'goods', {
  get: () => Resources,
  set: (val) => {
    Resources = val;
  },
  enumerable: true,
  configurable: true,
});

Object.defineProperty(exportsObj, 'lastGoodsPayload', {
  get: () => lastGoodsPayload,
  set: (val) => {
    lastGoodsPayload = val;
  },
  enumerable: true,
  configurable: true,
});

Object.defineProperty(exportsObj, 'availableFP', {
  get: () => availableFP,
  set: (val) => {
    availableFP = val;
  },
  enumerable: true,
  configurable: true,
});

exportsObj.resourceService = exportsObj;

module.exports = exportsObj;
module.exports.default = exportsObj;
