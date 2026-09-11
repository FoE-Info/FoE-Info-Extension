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
let showOptions = { showGoods: true };
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
          Resources[good.id] &&
          Resources[good.id] > 0 &&
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
          eraGoodsText += `<tr><td class="text-start ps-3">${good.name}</td><td class="text-end">${Resources[good.id].toLocaleString()}</td></tr>`;
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
          Resources[good.id] &&
          Resources[good.id] > 0 &&
          (SPECIAL_GOODS.includes(good.id) ||
            good.type === 'special_resource') &&
          !NON_GOODS.includes(good.id)
        ) {
          specialGoodsRows += `<tr><td class="text-start ps-3">${good.name}</td><td class="text-end">${Resources[good.id].toLocaleString()}</td></tr>`;
        }
      });
    }
  } else {
    Object.entries(Resources).forEach(([goodId, qty]) => {
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
    goodsText += `<tr><td colspan="2" class="goods-era-header">Special Goods</td></tr>`;
    goodsText += specialGoodsRows;
  }

  if (showOptions?.showGoods && typeof document !== 'undefined' && element) {
    const targetDiv =
      document.getElementById('goods') || defaultState?.goodsDIV;
    const goodsSize = globals?.toolOptions?.goodsSize || 200;
    const isCollapsed = collapse?.collapseGoods;

    var goodsHTML = `<div class="alert alert-success alert-dismissible show collapsed" role="alert">
            ${element.close()}`;
    goodsHTML += `<p id="goodsTextLabel" href="#goodsText" data-bs-toggle="collapse">`;
    goodsHTML += element.icon('goodsicon', 'goodsText', isCollapsed);
    goodsHTML += `<strong><span data-i18n="inventory">Goods Inventory</span>:</strong></p>`;
    goodsHTML += element.copy('goodsCopyID', 'success', 'right', isCollapsed);
    goodsHTML += `<div id="goodsText" style="height: ${goodsSize}px" class="overflow-y resize collapse ${
      isCollapsed ? '' : 'show'
    }"><table id="goodstable" class="goods-table w-100"><thead><tr><th class="text-start">Type</th><th class="text-end">Qty</th></tr></thead><tbody>`;
    if (targetDiv) {
      targetDiv.innerHTML =
        goodsHTML + goodsText + `</tbody></table></div></div>`;
    }
    if (collapse?.fCollapseGoods) {
      document
        .getElementById('goodsTextLabel')
        ?.addEventListener('click', collapse.fCollapseGoods);
    }
    const goodsDiv = document.getElementById('goodsText');
    if (
      goodsDiv &&
      typeof ResizeObserver !== 'undefined' &&
      globals?.setGoodsSize
    ) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect && entry.contentRect.height)
            globals.setGoodsSize(entry.contentRect.height);
        }
      });
      resizeObserver.observe(goodsDiv);
    }
    if (document.body && i18n?.translateContainer) {
      i18n.translateContainer(document.body);
    }
    document
      .getElementById('goodsCopyID')
      ?.addEventListener('click', goodsCopy);
  }

  return Resources;
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

const exportsObj = {
  ResourceDefs,
  ResourceNames,
  getResourceDefinitions,
  saveResourceDefs,
  setResourceDefs,
  getPlayerResources,
  getPlayerResourceBag,
  setResources,
};

Object.defineProperty(exportsObj, 'Resources', {
  get: () => Resources,
  set: (val) => {
    Resources = val;
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

module.exports = exportsObj;
module.exports.default = exportsObj;
