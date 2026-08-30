import * as element from '../fn/AddElement';
import * as collapse from '../fn/collapse.js';
import { setGoodsSize, toolOptions } from '../fn/globals.js';
import * as helper from '../fn/helper.js';
import { fGVGagesname } from '../fn/helper.js';
import * as storage from '../fn/storage.js';
import { showOptions } from '../vars/showOptions.js';
import { availablePacksFP, goodsDIV } from '../vars/state.js';

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

export function getPlayerResources(msg) {
  if (msg.responseData && ResourceDefs) {
    Resources =
      msg.responseData.resources?.resources || msg.responseData.resources || {};
    availableFP = Resources.strategy_points;
    if (document.getElementById('availableFPID'))
      document.getElementById('availableFPID').textContent =
        availablePacksFP + availableFP;
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
    ];

    var standardGoodsText = '';
    for (var i = 0; i < helper.numAges; i++) {
      ResourceDefs.forEach((good) => {
        if (
          helper.fLevelfromAge(good.era) == helper.numAges - i &&
          Resources[good.id] &&
          Resources[good.id] > 0 &&
          !SPECIAL_GOODS.includes(good.id) &&
          !NON_GOODS.includes(good.id) &&
          good.type !== 'special_resource' &&
          good.type !== 'currency' &&
          good.type !== 'population' &&
          good.type !== 'happiness'
        ) {
          standardGoodsText += `<tr><td class="text-start">${good.name}</td><td class="text-end">${Resources[good.id].toLocaleString()}</td><td class="text-end">${fGVGagesname(good.era)}</td></tr>`;
        }
      });
    }

    var specialGoodsText = '';
    for (var i = 0; i < helper.numAges; i++) {
      ResourceDefs.forEach((good) => {
        if (
          helper.fLevelfromAge(good.era) == helper.numAges - i &&
          Resources[good.id] &&
          Resources[good.id] > 0 &&
          (SPECIAL_GOODS.includes(good.id) ||
            good.type === 'special_resource') &&
          !NON_GOODS.includes(good.id)
        ) {
          specialGoodsText += `<tr><td class="text-start">${good.name}</td><td class="text-end">${Resources[good.id].toLocaleString()}</td><td class="text-end">${fGVGagesname(good.era)}</td></tr>`;
        }
      });
    }

    var goodsText = standardGoodsText;
    if (specialGoodsText) {
      goodsText += `<tr><th colspan="3" class="special-goods-header">Special Goods</th></tr>`;
      goodsText += specialGoodsText;
    }

    if (showOptions.showGoods) {
      const targetDiv = document.getElementById('goods') || goodsDIV;
      var goodsHTML = `<div class="alert alert-success alert-dismissible show collapsed" role="alert">
            ${element.close()}`;
      goodsHTML += `<p id="goodsTextLabel" href="#goodsText" data-bs-toggle="collapse">`;
      goodsHTML += element.icon(
        'goodsicon',
        'goodsText',
        collapse.collapseGoods,
      );
      goodsHTML += `<strong><span data-i18n="inventory">Goods Inventory</span>:</strong></p>`;
      goodsHTML += element.copy(
        'goodsCopyID',
        'success',
        'right',
        collapse.collapseGoods,
      );
      goodsHTML += `<div id="goodsText" style="height: ${toolOptions.goodsSize}px" class="overflow-y resize collapse ${
        collapse.collapseGoods ? '' : 'show'
      }"><table id="goodstable" class="goods-table w-100"><thead><tr><th class="text-start">Good</th><th class="text-end">Qty</th><th class="text-end">Era</th></tr></thead><tbody>`;
      if (targetDiv) {
        targetDiv.innerHTML =
          goodsHTML + goodsText + `</tbody></table></div></div>`;
      }
      document
        .getElementById('goodsTextLabel')
        ?.addEventListener('click', collapse.fCollapseGoods);
      const goodsDiv = document.getElementById('goodsText');
      if (goodsDiv) {
        const resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            if (entry.contentRect && entry.contentRect.height)
              setGoodsSize(entry.contentRect.height);
          }
        });
        resizeObserver.observe(goodsDiv);
      }
      $('body').i18n();
      document
        .getElementById('goodsCopyID')
        ?.addEventListener('click', goodsCopy);
    }
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
