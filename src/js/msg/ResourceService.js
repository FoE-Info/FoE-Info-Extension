/**
 * ResourceService.js
 *
 * Domain service for Forge of Empires player resources and goods inventory.
 * Handles ResourceService.getResourceDefinitions, ResourceService.getPlayerResources,
 * and ResourceService.getPlayerResourceBag RPC payloads.
 */

let element = null;
let collapse = null;
let globals = null;
let helper = null;
let i18n = null;
let storage = null;
let showOptions = { showGoods: false };
let defaultState = {
  availablePacksFP: 0,
  goodsDIV: null,
  ResourceDefs: [],
  ResourceNames: {},
};

if (typeof __webpack_require__ !== 'undefined') {
  try {
    element = require('../fn/AddElement');
  } catch {}
  try {
    collapse = require('../fn/collapse.js');
  } catch {}
  try {
    globals = require('../fn/globals.js');
  } catch {}
  try {
    helper = require('../fn/helper.js');
  } catch {}
  try {
    i18n = require('../fn/i18n.js');
  } catch {}
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
}

const ResourceDefs = defaultState?.ResourceDefs || [];
const ResourceNames = defaultState?.ResourceNames || {};
let Resources = {};
let availableFP = 0;
let lastGoodsPayload = null;
// Only render the Goods Inventory panel once the player has actually
// opened the Marketplace this session - login/background resource RPCs
// must not surface it on their own. InventoryService.getItems was tried
// as a second unlock signal for opening Inventory, but live tracing
// confirmed the game fires it automatically on login too, so it can't
// be used to detect a real Inventory open; that detection is still
// unimplemented.
let goodsPanelUnlocked = false;

function getResourceDefinitions(msg) {
  if (msg && msg.responseData) {
    saveResourceDefs(msg.responseData);
  } else {
    console.debug('Resource Definitions msg:', msg);
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

  if (
    typeof document !== 'undefined' &&
    document.getElementById('availableFPID')
  ) {
    document.getElementById('availableFPID').textContent = availablePacksFP;
  }

  lastGoodsPayload = msg;
  renderGoodsPanel(Resources);
  return Resources;
}

function onMarketOpened(msg) {
  goodsPanelUnlocked = true;
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
  if (!currentResources || Object.keys(currentResources).length === 0) return;

  if (
    !force &&
    ((showOptions && showOptions.showGoods === false) || !goodsPanelUnlocked)
  ) {
    const targetDiv =
      (typeof document !== 'undefined' && document.getElementById('goods')) ||
      defaultState?.goodsDIV;
    if (targetDiv) {
      targetDiv.innerHTML = '';
      targetDiv.style.display = 'none';
    }
    return targetDiv;
  }

  const SPECIAL_GOODS = [
    'promethium',
    'orichalcum',
    'mars_ore',
    'asteroid_ice',
    'venus_carbon',
    'unknown_dna',
    'crystallized_hydrocarbons',
    'dark_matter',
  ];

  const NON_GOODS = [
    'money',
    'supplies',
    'medals',
    'strategy_points',
    'credits',
    'colonists',
    'life_support',
    'castle_points',
    'tavern_silver',
    'guild_power',
    'clan_power',
    'population',
    'happiness',
  ];

  var standardGoodsText = '';
  var specialGoodsRows = '';

  if (ResourceDefs && ResourceDefs.length > 0 && helper?.numAges) {
    for (var i = 0; i < helper.numAges; i++) {
      var eraGoodsText = '';
      var currentEraName = '';
      const eraLevel = helper.numAges - i;
      ResourceDefs.forEach((good) => {
        const goodEraLevel = helper.fLevelfromAge(good.era);
        if (
          goodEraLevel === eraLevel &&
          currentResources[good.id] &&
          currentResources[good.id] > 0 &&
          !SPECIAL_GOODS.includes(good.id) &&
          !NON_GOODS.includes(good.id) &&
          good.type !== 'special_resource' &&
          good.type !== 'currency' &&
          good.type !== 'population' &&
          good.type !== 'happiness'
        ) {
          currentEraName =
            typeof helper.fGVGagesname === 'function' ?
              helper.fGVGagesname(good.era)
            : good.era;
          eraGoodsText += `<tr><td class="text-start ps-3">${good.name}</td><td class="text-end">${currentResources[good.id].toLocaleString()}</td></tr>`;
        }
      });
      if (eraGoodsText) {
        standardGoodsText += `<tr><td colspan="2" class="goods-era-header">${currentEraName}</td></tr>${eraGoodsText}`;
      }
    }

    for (var i = 0; i < helper.numAges; i++) {
      const eraLevel = helper.numAges - i;
      ResourceDefs.forEach((good) => {
        const goodEraLevel = helper.fLevelfromAge(good.era);
        if (
          goodEraLevel === eraLevel &&
          currentResources[good.id] &&
          currentResources[good.id] > 0 &&
          (SPECIAL_GOODS.includes(good.id) ||
            good.type === 'special_resource') &&
          !NON_GOODS.includes(good.id)
        ) {
          specialGoodsRows += `<tr><td class="text-start ps-3">${good.name}</td><td class="text-end">${currentResources[good.id].toLocaleString()}</td></tr>`;
        }
      });
    }
  } else {
    Object.entries(currentResources).forEach(([goodId, qty]) => {
      if (NON_GOODS.includes(goodId) || !qty || qty <= 0) return;
      const name = ResourceNames[goodId] || goodId;
      if (SPECIAL_GOODS.includes(goodId)) {
        specialGoodsRows += `<tr><td class="text-start ps-3">${name}</td><td class="text-end">${qty.toLocaleString()}</td></tr>`;
      } else {
        standardGoodsText += `<tr><td class="text-start ps-3">${name}</td><td class="text-end">${qty.toLocaleString()}</td></tr>`;
      }
    });
  }

  var goodsText = standardGoodsText;
  if (specialGoodsRows) {
    goodsText += `<tr><td colspan="2" class="goods-era-header"><span data-i18n="special_goods">Special Goods</span></td></tr>`;
    goodsText += specialGoodsRows;
  }

  if (
    (force || (showOptions?.showGoods !== false && goodsPanelUnlocked)) &&
    typeof document !== 'undefined'
  ) {
    const targetDiv =
      document.getElementById('goods') || defaultState?.goodsDIV;
    if (!targetDiv) return null;

    targetDiv.style.display = '';
    if (targetDiv.classList && targetDiv.classList.contains('d-none')) {
      targetDiv.classList.remove('d-none');
    }

    const rawGoodsSize = globals?.toolOptions?.goodsSize;
    const goodsSize =
      typeof rawGoodsSize === 'number' && rawGoodsSize >= 80 ?
        rawGoodsSize
      : 200;
    const isCollapsed = collapse?.collapseGoods;

    const closeMarkup =
      element?.close ?
        element.close()
      : '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>';
    const iconMarkup =
      element?.icon ?
        element.icon('goodsicon', 'goodsText', isCollapsed)
      : `<span class="header-icon collapse-toggle fw-bold font-monospace" id="goodsicon" role="button" tabindex="0" aria-label="Toggle section" aria-expanded="${!isCollapsed}" aria-controls="goodsText" data-bs-target="#goodsText" data-bs-toggle="collapse">${isCollapsed ? '[+]' : '[-]'}</span>`;
    const copyMarkup =
      element?.copy ?
        element.copy('goodsCopyID', 'success', 'right', isCollapsed)
      : '<span id="goodsCopyID" class="badge bg-success float-end right-button">Copy</span>';

    let goodsHTML = `<div class="alert alert-success alert-dismissible show collapsed" role="alert">
            ${closeMarkup}`;
    goodsHTML += `<p id="goodsTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#goodsText" aria-expanded="${!isCollapsed}" aria-controls="goodsText" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">`;
    goodsHTML += iconMarkup;
    goodsHTML += `<strong><span data-i18n="inventory">Goods Inventory</span>:</strong></p>`;
    goodsHTML += copyMarkup;
    goodsHTML += `<div id="goodsText" style="height: ${goodsSize}px" class="overflow-y resize collapse ${
      isCollapsed ? '' : 'show'
    }"><table id="goodstable" class="goods-table w-100"><thead><tr><th class="text-start">Type</th><th class="text-end">Qty</th></tr></thead><tbody>`;
    if (targetDiv) {
      targetDiv.style.display = '';
      targetDiv.innerHTML =
        goodsHTML + goodsText + `</tbody></table></div></div>`;
    }
    if (collapse?.fCollapseGoods) {
      const labelEl = document.getElementById('goodsTextLabel');
      labelEl?.addEventListener('click', (e) => {
        if (
          e?.target &&
          typeof e.target.closest === 'function' &&
          e.target.closest('#goodsicon')
        ) {
          return;
        }
        collapse.fCollapseGoods();
      });
      const iconEl = document.getElementById('goodsicon');
      if (iconEl && iconEl !== labelEl) {
        iconEl.addEventListener('click', () => {
          collapse.fCollapseGoods();
        });
      }
    }
    const goodsDiv = document.getElementById('goodsText');
    if (
      goodsDiv &&
      typeof ResizeObserver !== 'undefined' &&
      globals?.setGoodsSize
    ) {
      try {
        const resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const height = entry.contentRect?.height;
            const isCollapsing =
              goodsDiv.classList?.contains('collapsing') ||
              (goodsDiv.classList && !goodsDiv.classList.contains('show'));
            if (typeof height === 'number' && height >= 80 && !isCollapsing) {
              globals.setGoodsSize(height);
            }
          }
        });
        resizeObserver.observe(goodsDiv);
      } catch (err) {
        console.error('[FoEInfo] Failed to observe goodsDiv resize:', err);
      }
    }
    if (document.body && i18n?.translateContainer) {
      i18n.translateContainer(document.body);
    }
    document
      .getElementById('goodsCopyID')
      ?.addEventListener('click', goodsCopy);

    return targetDiv;
  }
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
    dispatcher.register('TradeService', 'getTradeList', (msg) =>
      onMarketOpened(msg),
    );
    dispatcher.register('TradeService', 'getOpenOffers', (msg) =>
      onMarketOpened(msg),
    );
    dispatcher.register('TradeService', 'getTradeOffers', (msg) =>
      onMarketOpened(msg),
    );
    dispatcher.register('TradeService', 'getYourOffers', (msg) =>
      onMarketOpened(msg),
    );
  }
}

const getPlayerResourceBag = getPlayerResources;

function setResources(resource, needed = 0) {
  if (Resources[`${resource}`]) needed -= Resources[`${resource}`];
  return needed;
}

async function goodsCopy() {
  if (typeof document === 'undefined') return;
  const table = document.getElementById('goodstable');
  if (!table) return;

  let currentEra = '';
  const lines = [];

  const rows = table.querySelectorAll('tr');
  rows.forEach((row) => {
    const eraHeader = row.querySelector(
      '.goods-era-header, .special-goods-header',
    );
    if (eraHeader) {
      currentEra = eraHeader.textContent.trim();
      return;
    }

    const cells = row.querySelectorAll('td');
    if (cells.length === 2) {
      const itemName = cells[0].textContent.trim();
      const rawAmount = cells[1].textContent.trim();

      if (itemName) {
        lines.push(`${currentEra}\t${itemName}\t${rawAmount}`);
      }
    }
  });

  const tsvText = lines.join('\n');

  try {
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      navigator.clipboard.writeText
    ) {
      await navigator.clipboard.writeText(tsvText);
    } else {
      const temp = document.createElement('textarea');
      document.body.appendChild(temp);
      temp.value = tsvText;
      temp.select();
      document.execCommand('copy');
      temp.remove();
    }
  } catch (err) {
    console.error('goodsCopy clipboard write failed:', err);
  }
}

function setGlobals(g) {
  globals = g;
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
