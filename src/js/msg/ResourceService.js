import { goodsDIV } from "../index.js";
import { availablePacksFP } from "../handleRequestFinished.js";
import { toolOptions, setGoodsSize } from "../fn/globals.js";
import * as collapse from "../fn/collapse.js";
import { fGVGagesname } from "../fn/helper.js";
import * as storage from "../fn/storage.js";
import * as element from "../fn/AddElement";
import { showOptions } from "../vars/showOptions.js";

export var ResourceDefs = [];
export var ResourceNames = [];
export var Resources = [];
export var availableFP = 0;

export function getResourceDefinitions(msg) {
  if (msg.responseData) {
    saveResourceDefs(msg.responseData);
  } else {
    console.debug("Resource Definitions msg:", msg);
  }
}

export function saveResourceDefs(msg) {
  loadResourceDefs(msg);
  storage.set("ResourceDefs", ResourceDefs);
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
    Resources = msg.responseData.resources;
    availableFP = Resources.strategy_points;
    if (document.getElementById("availableFPID"))
      document.getElementById("availableFPID").textContent = availablePacksFP + availableFP;
    var goodsText = "";
    ResourceDefs.forEach((good) => {
      if (good.abilities.rankingPoints && Resources[good.id])
        goodsText += `<tr><td>${good.name}</td><td>${Resources[good.id]}</td><td>${fGVGagesname(good.era)}</td></tr>`;
    });

    if (showOptions.showGoods) {
      var goodsHTML = `<div class="alert alert-success alert-dismissible show collapsed" role="alert">
            ${element.close()}`;
      goodsHTML += `<p id="goodsTextLabel" href="#goodsText" data-bs-toggle="collapse">`;
      goodsHTML += element.icon("goodsicon", "goodsText", collapse.collapseGoods);
      goodsHTML += `<strong><span data-i18n="inventory">Goods Inventory</span>:</strong></p>`;
      goodsHTML += element.copy("goodsCopyID", "success", "right", collapse.collapseGoods);
      goodsHTML += `<div id="goodsText" style="height: ${toolOptions.goodsSize}px" class="overflow-y collapse ${
        collapse.collapseGoods ? "" : "show"
      }"><table><tr><th>Good</th><th>Qty</th><th>Era</th></tr>`;
      goodsDIV.innerHTML = goodsHTML + goodsText + `</table></div></div>`;
      document.getElementById("goodsTextLabel").addEventListener("click", collapse.fCollapseGoods);
      const goodsDiv = document.getElementById("goodsText");
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect && entry.contentRect.height) setGoodsSize(entry.contentRect.height);
        }
      });
      resizeObserver.observe(goodsDiv);
      $("body").i18n();
      document.getElementById("goodsCopyID").addEventListener("click", goodsCopy);
    }
  }
}

export function setResources(resource) {
  if (Resources[`${resource}`]) needed -= Resources[`${resource}`];
}

function goodsCopy() {
  var selection = window.getSelection();
  selection.removeAllRanges();
  var range = document.createRange();
  var copytext = document.getElementById("goodsText");
  range.selectNode(copytext);
  selection.addRange(range);
  document.execCommand("copy");
}
