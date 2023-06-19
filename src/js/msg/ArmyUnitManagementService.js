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

import { MilitaryDefs, armyDIV } from "../index.js";
import { toolOptions, setArmySize } from "../fn/globals.js";
import { showOptions } from "../vars/showOptions.js";
import * as helper from "../fn/helper.js";
import * as collapse from "../fn/collapse.js";
import * as element from "../fn/AddElement";

var ArmyUnits = [];

export function armyUnitManagementService(msg) {
  var armyHTML = ``;
  var allUnits = 0;
  var rogues = 0;

  if (msg.responseData.counts.length) {
    const army = msg.responseData.counts;
    var armyText = "";
    for (var j = army.length - 1; j >= 0; j--) {
      var units = 0;
      var eraText = helper.fGVGagesname(MilitaryDefs[army[j].unitTypeId].era);
      if (MilitaryDefs[army[j].unitTypeId].era != "NoAge" || army[j].unitTypeId == "rogue") {
        if (army[j].unattached) units += army[j].unattached;
        if (army[j].attached) units += army[j].attached;
        if (army[j].unitTypeId == "rogue") {
          rogues += units;
          if (ArmyUnits[army[j].unitTypeId] == null) {
            ArmyUnits[army[j].unitTypeId] = units;
          }
        } else {
          if (ArmyUnits[army[j].unitTypeId] == null) {
            // ArmyUnits.push({'name':entry.player.name});
            ArmyUnits[army[j].unitTypeId] = units;
            armyText += `${eraText}: ${MilitaryDefs[army[j].unitTypeId].name} ${units}<br>`;
          } else {
            if (units != ArmyUnits[army[j].unitTypeId]) {
              var diff = units - ArmyUnits[army[j].unitTypeId];
              armyHTML = `<span class=${diff > 0 ? '"green">+' : '"red">'}${diff}</span>`;
            } else {
              armyHTML = ``;
            }
            armyText += `${eraText}: ${MilitaryDefs[army[j].unitTypeId].name} ${units} ` + armyHTML + `<br>`;
          }
          // console.debug(army[j],army[j].unitTypeId,army[j].unattached,army[j].attached,units);
          allUnits += units;
        }
      }
    }

    if (showOptions.showArmy && units) {
      var diff = rogues - ArmyUnits["rogue"];
      armyHTML = `<div class="alert alert-success alert-dismissible show collapsed" role="alert">`;
      armyHTML += element.close();
      armyHTML += `<p id="armyTextLabel" href="#armyText" data-bs-toggle="collapse">`;
      armyHTML += element.icon("armyicon", "armyText", collapse.collapseArmy);
      armyHTML += `<strong>Army:</strong><span id="armyUnits">${
        collapse.collapseArmy ? `Rogues: ${rogues} Units: ${allUnits}` : ""
      }</span></p>`;
      armyHTML += `<div id="armyText" style="height: ${toolOptions.armySize}px" class="overflow-y collapse ${
        collapse.collapseArmy ? "" : "show"
      }"><p class="" >`;
      armyHTML += `<span id="armyUnits2">Rogues: ${rogues}</span> <span class=${diff > 0 ? '"green">+' : '"red">'}${
        diff != 0 ? diff : ""
      }</span><br><span id="armyUnits3">Units: ${allUnits}</span><br>`;
      armyDIV.innerHTML = armyHTML + armyText + `</p></div></div>`;
      document.getElementById("armyTextLabel").addEventListener("click", collapse.fCollapseArmy);
      const armyDiv = document.getElementById("armyText");
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect && entry.contentRect.height) setArmySize(entry.contentRect.height);
        }
      });
      resizeObserver.observe(armyDiv);
      $("body").i18n();
    }
  }
  console.debug(ArmyUnits);
}

export function clearArmyUnits() {
  ArmyUnits = [];
}
