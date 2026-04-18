import { availablePacksFP, goodsDIV } from '../index';
import { toolOptions, setGoodsSize } from '../core/globals';
import * as collapse from '../core/collapse';
import { fGVGagesname } from '../core/helper';
import * as storage from '../core/storage';
import * as element from '../core/AddElement';
import { showOptions } from '../state/showOptions';

export var ResourceDefs: Array<Record<string, unknown>> = [];
export var ResourceNames: Record<string, string> = {};
export var Resources: Record<string, unknown> = {};
export var availableFP = 0;

export function getResourceDefinitions(msg: Record<string, unknown>) {
  if (msg.responseData) {
    saveResourceDefs(msg.responseData as Array<Record<string, unknown>>);
  } else {
    console.debug('Resource Definitions msg:', msg);
  }
}

export function saveResourceDefs(msg: Array<Record<string, unknown>>) {
  loadResourceDefs(msg);
  storage.set('ResourceDefs', ResourceDefs);
}

export function setResourceDefs(msg: Array<Record<string, unknown>>) {
  loadResourceDefs(msg);
}

function loadResourceDefs(msg: Array<Record<string, unknown>>) {
  ResourceDefs = msg;
  ResourceDefs.forEach((rssDef) => {
    ResourceNames[rssDef.id as string] = rssDef.name as string;
  });
}

export function getPlayerResources(msg: Record<string, unknown>) {
  if (msg.responseData && ResourceDefs) {
    Resources = (msg.responseData as Record<string, unknown>)
      .resources as Record<string, unknown>;
    availableFP = Resources.strategy_points as number;
    if (document.getElementById('availableFPID'))
      document.getElementById('availableFPID')!.textContent = String(
        availablePacksFP + availableFP,
      );
    var goodsText = '';
    ResourceDefs.forEach((good) => {
      if (
        (good.abilities as Record<string, unknown>)?.rankingPoints &&
        Resources[good.id as string]
      )
        goodsText += `<tr><td>${good.name}</td><td>${Resources[good.id as string]}</td><td>${fGVGagesname(good.era as string)}</td></tr>`;
    });

    if (showOptions.showGoods) {
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
      goodsHTML += `<div id="goodsText" style="height: ${toolOptions.goodsSize}px" class="overflow-y collapse ${
        collapse.collapseGoods ? '' : 'show'
      }"><table><tr><th>Good</th><th>Qty</th><th>Era</th></tr>`;
      goodsDIV.innerHTML = goodsHTML + goodsText + `</table></div></div>`;
      document
        .getElementById('goodsTextLabel')!
        .addEventListener('click', collapse.fCollapseGoods);
      const goodsDiv = document.getElementById('goodsText')!;
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect && entry.contentRect.height)
            setGoodsSize(entry.contentRect.height);
        }
      });
      resizeObserver.observe(goodsDiv);
      ($('body') as JQuery & { i18n(): void }).i18n();
      document
        .getElementById('goodsCopyID')!
        .addEventListener('click', goodsCopy);
    }
  }
}

export function setResources(resource: string, needed = 0) {
  if (Resources[`${resource}`]) needed -= Resources[`${resource}`] as number;
  return needed;
}

function goodsCopy() {
  var selection = window.getSelection();
  selection!.removeAllRanges();
  var range = document.createRange();
  var copytext = document.getElementById('goodsText');
  range.selectNode(copytext!);
  selection!.addRange(range);
  document.execCommand('copy');
}
