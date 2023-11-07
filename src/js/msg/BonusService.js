/*
 * ________________________________________________________________
 * Copyright (C) 2022 FoE-Info - All Rights Reserved
 * this source-code uses a copy-left license
 *
 * you are welcome to contribute changes here:
 * https://github.com/FoE-Info/FoE-Info-Extension
 *
 * AGPL license info:
 * https://github.com/FoE-Info/FoE-Info-Extension/master/LICENSE.md
 * or else visit https://www.gnu.org/licenses/#AGPL
 * ________________________________________________________________
 */

import { City, Galaxy, showGalaxy } from "./StartupService.js";
import { checkDebug } from "../index.js";
import { Bonus } from "../handleRequestFinished.js";
import { showOptions } from "../vars/showOptions.js";
import * as collapse from "../fn/collapse.js";
import * as element from "../fn/AddElement";

export function getBonuses(msg) {
  console.debug("Info Erased");
  // console.debug(collapseOptions);
  City.ForgePoints = 0;
  City.Coins = 0;
  City.ArcBonus = 0;
  City.ChatBonus = 0;
  City.TrazUnits = 0;

  // TODO
  // add daily_strategypoint to city info (Daily FP)

  if (DEV && checkDebug()) {
    var beta = document.getElementById("beta");

    if (beta == null) {
      // console.debug('2');
      beta = document.createElement("div");
      document.getElementById("content").appendChild(beta);
      beta.id = "beta";
    }

    if (msg.responseData.length > 1 && msg.responseData[2].value) {
      City.ForgePoints += msg.responseData[2].value;
      beta.innerHTML = `${element.close()}<p><strong>Town Hall</strong> ${msg.responseData[2].value}FP Total: ${
        City.ForgePoints
      }FP</p>`;
      beta.className = "alert alert-dismissible alert-success";
      // console.debug('getBonuses',msg.responseData[2].value,ForgePoints);
    }
  }
}

export function getLimitedBonuses(msg) {
  if (showOptions && showOptions.showBonus && msg.responseData.length) {
    var bonusHTML = "";
    var bonus = document.getElementById("bonus");
    console.debug(msg.responseData);

    msg.responseData.forEach((entry) => {
      // console.debug(entry);
      if (!entry.amount) bonus.innerHTML = ``;

      if (entry.type == "spoils_of_war") {
        Bonus.spoils = entry.amount;
        if (document.getElementById("spoilsID")) document.getElementById("spoilsID").textContent = entry.amount;
        if (entry.amount) bonusHTML += `Spoils <span id="spoilsID">${Bonus.spoils}</span> `;
      } else if (entry.type == "diplomatic_gifts") {
        Bonus.diplomatic = entry.amount;
        if (document.getElementById("diplomaticID")) document.getElementById("diplomaticID").textContent = entry.amount;
        if (entry.amount) bonusHTML += `Dip <span id="diplomaticID">${Bonus.diplomatic}</span> `;
      } else if (entry.type == "first_strike") {
        Bonus.strike = entry.amount;
        if (document.getElementById("firststrikeID"))
          document.getElementById("firststrikeID").textContent = entry.amount;
        if (entry.amount) bonusHTML += `Strike <span id="firststrikeID">${Bonus.strike}</span> `;
      } else if (entry.type == "aid_goods") {
        Bonus.aid = entry.amount;
        if (document.getElementById("aidID")) document.getElementById("aidID").textContent = entry.amount;
        if (entry.amount) bonusHTML += `Aid <span id="aidID">${Bonus.aid}</span> `;
      } else if (entry.type == "double_collection") {
        Galaxy.amount = entry.amount > 0 ? entry.amount : 0;
        showGalaxy();
      }
    });
    // console.debug(bonusHTML);
    if (bonus.innerHTML == `` && (Bonus.aid || Bonus.spoils || Bonus.diplomatic || Bonus.strike)) {
      bonus.innerHTML = `<div id="bonusTip" class="alert alert-light alert-dismissible" role="alert">
            <p id="bonusTextLabel" href="#bonusText" data-bs-toggle="collapse">
      ${element.icon("bonusicon", "bonusText", collapse.collapseBonus)}
			<strong><span data-i18n="bonus">Bonus</span>:</strong> ${bonusHTML}</p>
            ${element.close()}
            <div id="bonusText" class="alert-light collapse"><p><strong>Legend:</strong><br>First <em>Strike</em> - Kraken<br><em>Spoils</em> of War - Himeji Castle<br><em>Dip</em>lomatic Gifts - Space Carrier<br><em>Aid</em> Goods - Truce Tower</p></div></div>`;
      document.getElementById("bonusicon").addEventListener("click", collapse.fCollapseBonus);
      document.getElementById("bonusTextLabel").addEventListener("click", collapse.fCollapseBonus);
    } else if (!(Bonus.aid || Bonus.spoils || Bonus.diplomatic || Bonus.strike)) {
      bonus.innerHTML = ``;
    }
  }
}
