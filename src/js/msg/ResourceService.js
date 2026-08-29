import { availablePacksFP, goodsDIV } from '../index.js';
import { toolOptions, setGoodsSize } from '../fn/globals.js';
import * as collapse from '../fn/collapse.js';
import * as helper from '../fn/helper.js';
import * as storage from '../fn/storage.js';
import * as element from '../fn/AddElement';
import { showOptions } from '../vars/showOptions.js';

export var ResourceDefs = [];
export var ResourceNames = [];
export var Resources = [];
export var availableFP = 0;

export function getResourceDefinitions(msg) {
  if (msg.responseData) {
    saveResourceDefs(msg.responseData);
  } else {
    console.debug('Resource Definitions msg:', msg);
  }
}

export function saveResourceDefs(msg) {
  loadResourceDefs(msg);
  storage.set('ResourceDefs', ResourceDefs);
}

export function setResourceDefs(msg) {
  loadResourceDefs(msg);
}

function loadResourceDefs(msg) {
  ResourceDefs = msg;
  ResourceDefs.forEach((rssDef) => {
    ResourceNames[rssDef.id] = rssDef.name;
  });
}

export function normalizeResources(data) {
  if (!data) return {};
  const map = {};

  const processItem = (id, val) => {
    if (!id || isNonGoodResource(id)) return;
    if (typeof val === 'number') {
      map[id] = val;
    } else if (val && typeof val === 'object') {
      const qty = val.amount ?? val.value ?? val.quantity ?? val.count ?? 0;
      if (typeof qty === 'number') {
        map[id] = qty;
      }
    }
  };

  if (Array.isArray(data)) {
    data.forEach((item) => {
      if (item && item.id) {
        processItem(
          item.id,
          item.amount ?? item.value ?? item.quantity ?? item.count ?? item,
        );
      }
    });
  } else if (typeof data === 'object') {
    const target =
      data.resources?.resources || data.resources || data.resourceBag || data;
    if (Array.isArray(target)) {
      target.forEach((item) => {
        if (item && item.id) {
          processItem(
            item.id,
            item.amount ?? item.value ?? item.quantity ?? item.count ?? item,
          );
        }
      });
    } else if (target && typeof target === 'object') {
      Object.entries(target).forEach(([key, val]) => {
        if (key === 'resources' && typeof val === 'object') {
          Object.entries(val).forEach(([k, v]) => processItem(k, v));
        } else {
          processItem(key, val);
        }
      });
    }
  }

  return map;
}

export function setPlayerResourcesFromStorage(res) {
  if (res) {
    Resources = normalizeResources(res);
    availableFP = Resources.strategy_points || 0;
    if (document.getElementById('availableFPID'))
      document.getElementById('availableFPID').textContent =
        availablePacksFP + availableFP;
    if (showOptions.showGoods) {
      renderGoodsInventory();
    }
  }
}

export function getPlayerResources(msg) {
  if (msg && msg.responseData) {
    const normalized = normalizeResources(msg.responseData);
    if (Object.keys(normalized).length > 0) {
      Resources = normalized;
      storage.set('Resources', Resources);
      availableFP = Resources.strategy_points || 0;
      if (document.getElementById('availableFPID'))
        document.getElementById('availableFPID').textContent =
          availablePacksFP + availableFP;
      if (showOptions.showGoods) {
        renderGoodsInventory();
      }
    }
  }
}

const SPECIAL_GOOD_IDS = new Set([
  'promethium',
  'orichalcum',
  'mars_ore',
  'asteroid_ice',
  'venus_carbon',
  'unknown_dna',
  'crystallized_hydrocarbons',
  'dark_matter',
]);

const NON_GOOD_RESOURCE_IDS = new Set([
  'colonists',
  'credits',
  'life_support',
  'strategy_points',
  'money',
  'supplies',
  'population',
  'castle_points',
  'tavern_silver',
  'guild_power',
  'clan_power',
]);

export function isNonGoodResource(id) {
  if (!id) return false;
  return NON_GOOD_RESOURCE_IDS.has(id);
}

export function isSpecialGood(good) {
  if (!good) return false;
  if (isNonGoodResource(good.id)) return false;
  if (
    good.is_special ||
    good.type === 'special' ||
    good.group === 'special' ||
    good.group === 'special_good' ||
    good.isSpecial
  )
    return true;
  if (good.id && SPECIAL_GOOD_IDS.has(good.id)) return true;
  return false;
}

const SPECIAL_GOOD_ERAS = {
  promethium: 'ArcticFuture',
  orichalcum: 'OceanicFuture',
  mars_ore: 'SpaceAgeMars',
  asteroid_ice: 'SpaceAgeAsteroidBelt',
  venus_carbon: 'SpaceAgeVenus',
  unknown_dna: 'SpaceAgeJupiterMoon',
  crystallized_hydrocarbons: 'SpaceAgeTitan',
  dark_matter: 'SpaceAgeSpaceHub',
};

function getSpecialGoodEraLabel(good, id) {
  const goodId = id || good?.id;
  const eraStr = good?.era || SPECIAL_GOOD_ERAS[goodId];
  if (eraStr) {
    return helper.fGVGagesname(eraStr);
  }
  return '---';
}

export function renderGoodsInventory() {
  if (!showOptions.showGoods || !Resources) return;

  var treasuryText = '';
  var specialText = '';

  if (ResourceDefs && ResourceDefs.length) {
    for (let i = 0; i < helper.numAges; i++) {
      const eraName = helper.fAgefromLevel(helper.numAges - i);
      var eraGoodsRows = '';

      ResourceDefs.forEach((good) => {
        if (isNonGoodResource(good.id)) return;
        const matchesEra =
          good.era === eraName ||
          (eraName === 'StellarAgeDiscovery' &&
            good.era === 'SpaceAgeDiscovery') ||
          (eraName === 'SpaceAgeDiscovery' &&
            good.era === 'StellarAgeDiscovery');

        if (matchesEra && !isSpecialGood(good)) {
          const qty = Resources[good.id];
          if (qty !== undefined && qty > 0) {
            eraGoodsRows += `<tr><td style="text-align: left; padding: 2px 4px 2px 12px;">${good.name}</td><td style="text-align: right; padding: 2px 4px;">${qty.toLocaleString()}</td></tr>`;
          }
        }
      });

      if (eraGoodsRows) {
        const eraLabel = helper.fGVGagesname(eraName);
        treasuryText += `<tr><td colspan="2" style="font-weight: bold; font-size: 0.85em; padding: 4px 4px 2px 4px; background-color: rgba(0, 0, 0, 0.05); border-top: 1px solid rgba(0, 0, 0, 0.12); border-bottom: 1px solid rgba(0, 0, 0, 0.08);">${eraLabel}</td></tr>`;
        treasuryText += eraGoodsRows;
      }
    }

    if (Resources.medals !== undefined && Resources.medals > 0) {
      treasuryText += `<tr><td style="text-align: left; padding: 2px 4px;">Medals</td><td style="text-align: right; padding: 2px 4px;">${Resources.medals.toLocaleString()}</td></tr>`;
    }

    const specialDefs = ResourceDefs.filter((good) => isSpecialGood(good));
    specialDefs.sort((a, b) => {
      const eraA =
        helper.fLevelfromAge(a.era) ||
        helper.fLevelfromAge(SPECIAL_GOOD_ERAS[a.id]);
      const eraB =
        helper.fLevelfromAge(b.era) ||
        helper.fLevelfromAge(SPECIAL_GOOD_ERAS[b.id]);
      return eraB - eraA;
    });

    const processedSpecialIds = new Set();
    specialDefs.forEach((good) => {
      processedSpecialIds.add(good.id);
      const qty = Resources[good.id];
      if (qty !== undefined && qty > 0) {
        specialText += `<tr><td style="text-align: left; padding: 2px 4px 2px 12px;">${good.name}</td><td style="text-align: right; padding: 2px 4px;">${qty.toLocaleString()}</td></tr>`;
      }
    });

    SPECIAL_GOOD_IDS.forEach((specialId) => {
      if (!processedSpecialIds.has(specialId)) {
        const qty = Resources[specialId];
        if (qty !== undefined && qty > 0) {
          const name =
            ResourceNames[specialId] || helper.fResourceShortName(specialId);
          specialText += `<tr><td style="text-align: left; padding: 2px 4px 2px 12px;">${name}</td><td style="text-align: right; padding: 2px 4px;">${qty.toLocaleString()}</td></tr>`;
        }
      }
    });
  } else if (Resources) {
    Object.entries(Resources).forEach(([goodId, qty]) => {
      if (isNonGoodResource(goodId) || qty <= 0) return;
      const name = ResourceNames[goodId] || goodId;
      if (SPECIAL_GOOD_IDS.has(goodId)) {
        specialText += `<tr><td style="text-align: left; padding: 2px 4px 2px 12px;">${name}</td><td style="text-align: right; padding: 2px 4px;">${qty.toLocaleString()}</td></tr>`;
      } else if (goodId === 'medals') {
        treasuryText += `<tr><td style="text-align: left; padding: 2px 4px;">Medals</td><td style="text-align: right; padding: 2px 4px;">${qty.toLocaleString()}</td></tr>`;
      } else {
        treasuryText += `<tr><td style="text-align: left; padding: 2px 4px 2px 12px;">${name}</td><td style="text-align: right; padding: 2px 4px;">${qty.toLocaleString()}</td></tr>`;
      }
    });
  }

  var goodsText = '';
  if (treasuryText || specialText) {
    goodsText = `<table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr>
          <th style="text-align: left; padding: 2px 4px;">Type</th>
          <th style="text-align: right; padding: 2px 4px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${treasuryText}`;

    if (treasuryText && specialText) {
      goodsText += `<tr><td colspan="2" style="font-weight: bold; font-size: 0.85em; padding: 6px 4px 2px 4px; background-color: rgba(0, 0, 0, 0.05); border-top: 1px solid rgba(0, 0, 0, 0.12); border-bottom: 1px solid rgba(0, 0, 0, 0.08);">Special Goods</td></tr>`;
    }

    if (specialText) {
      goodsText += specialText;
    }

    goodsText += `</tbody></table>`;
  }

  if (goodsText) {
    var goodsHTML = `<div class="alert alert-success alert-dismissible show collapsed" role="alert">
          ${element.close()}`;
    goodsHTML += `<p id="goodsTextLabel" href="#goodsText" data-bs-toggle="collapse">`;
    goodsHTML += element.icon('goodsicon', 'goodsText', collapse.collapseGoods);
    goodsHTML += `<strong><span data-i18n="inventory">Goods Inventory</span>:</strong></p>`;
    goodsHTML += element.copy(
      'goodsCopyID',
      'success',
      'right',
      collapse.collapseGoods,
    );
    const goodsHeight =
      toolOptions.goodsSize && toolOptions.goodsSize <= 350 ?
        toolOptions.goodsSize
      : 160;
    goodsHTML += `<div id="goodsText" style="height: ${goodsHeight}px" class="overflow-y collapse ${
      collapse.collapseGoods ? '' : 'show'
    }">${goodsText}</div></div>`;
    goodsDIV.style.display = 'block';
    goodsDIV.innerHTML = goodsHTML;

    const closeBtn = goodsDIV.querySelector('.btn-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        goodsDIV.innerHTML = '';
      });
    }

    document
      .getElementById('goodsTextLabel')
      .addEventListener('click', collapse.fCollapseGoods);
    const goodsDiv = document.getElementById('goodsText');
    if (goodsDiv) {
      helper.observeElementSize(goodsDiv, (height) => {
        setGoodsSize(height);
      });
    }
    $('#goodsDIV').i18n();
    const copyBtn = document.getElementById('goodsCopyID');
    if (copyBtn) {
      copyBtn.addEventListener('click', goodsCopy);
    }
  } else {
    goodsDIV.innerHTML = '';
  }
}

export function setResources(resource, needed = 0) {
  if (Resources[`${resource}`]) needed -= Resources[`${resource}`];
  return needed;
}

function goodsCopy() {
  var selection = window.getSelection();
  selection.removeAllRanges();
  var range = document.createRange();
  var copytext = document.getElementById('goodsText');
  range.selectNode(copytext);
  selection.addRange(range);
  document.execCommand('copy');
}
