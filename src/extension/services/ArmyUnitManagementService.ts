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

import { MilitaryDefs, armyDIV } from '../index';
const _MilitaryDefs = MilitaryDefs as unknown as Record<
  string,
  Record<string, string>
>;
import { toolOptions, setArmySize } from '../core/globals';
import { showOptions } from '../state/showOptions';
import * as helper from '../core/helper';
import * as collapse from '../core/collapse';
import * as element from '../core/AddElement';

var ArmyUnits: Record<string, number> = {};

export function armyUnitManagementService(msg: Record<string, unknown>) {
  var armyHTML = ``;
  var allUnits = 0;
  var rogues = 0;

  const responseData = msg.responseData as Record<string, unknown>;
  if ((responseData.counts as unknown[]).length) {
    const army = responseData.counts as Array<Record<string, unknown>>;
    const unitsPerEra: Array<{ era: string; text: string }> = [];
    for (var j = army.length - 1; j >= 0; j--) {
      var units = 0;
      const unitTypeId = army[j].unitTypeId as string;
      var eraText = helper.fGVGagesname(_MilitaryDefs[unitTypeId].era);
      let eraId = _MilitaryDefs[unitTypeId].era;
      if (eraId != 'NoAge' || unitTypeId == 'rogue') {
        if (army[j].unattached) units += army[j].unattached as number;
        if (army[j].attached) units += army[j].attached as number;
        if (unitTypeId == 'rogue') {
          rogues += units;
          if (ArmyUnits[unitTypeId] == null) {
            ArmyUnits[unitTypeId] = units;
          }
        } else {
          if (ArmyUnits[unitTypeId] == null) {
            ArmyUnits[unitTypeId] = units;

            unitsPerEra.push({
              era: eraId,
              text: `${eraText}: ${_MilitaryDefs[unitTypeId].name} ${units}`,
            });
          } else {
            if (units != ArmyUnits[unitTypeId]) {
              var diff = units - ArmyUnits[unitTypeId];
              armyHTML = `<span class=${diff > 0 ? '"green">+' : '"red">'}${diff}</span>`;
            } else {
              armyHTML = ``;
            }

            unitsPerEra.push({
              era: eraId,
              text:
                `${eraText}: ${_MilitaryDefs[unitTypeId].name} ${units} ` +
                armyHTML,
            });
          }
          allUnits += units;
        }
      }
    }

    if (showOptions.showArmy && (rogues || allUnits)) {
      var diff = rogues - (ArmyUnits['rogue'] ?? 0);
      armyHTML = `<div class="alert alert-success alert-dismissible show collapsed" role="alert">`;
      armyHTML += element.close();
      armyHTML += `<p id="armyTextLabel" href="#armyText" data-bs-toggle="collapse">`;
      armyHTML += element.icon('armyicon', 'armyText', collapse.collapseArmy);
      armyHTML += `<strong>Army:</strong><span id="armyUnits">${
        collapse.collapseArmy ? `Rogues: ${rogues} Units: ${allUnits}` : ''
      }</span></p>`;
      armyHTML += `<div id="armyText" style="height: ${toolOptions.armySize}px" class="overflow-y collapse ${
        collapse.collapseArmy ? '' : 'show'
      }"><p class="" >`;
      armyHTML += `<span id="armyUnits2">Rogues: ${rogues}</span> <span class=${diff > 0 ? '"green">+' : '"red">'}${
        diff != 0 ? diff : ''
      }</span><br><span id="armyUnits3">Units: ${allUnits}</span><br>`;
      const armyText = unitsPerEra
        .sort(
          (a, b) => helper.fLevelfromAge(b.era) - helper.fLevelfromAge(a.era),
        )
        .map((item) => item.text)
        .join('<br>');
      armyDIV.innerHTML = armyHTML + armyText + `</p></div></div>`;
      document
        .getElementById('armyTextLabel')!
        .addEventListener('click', collapse.fCollapseArmy);
      const armyDiv = document.getElementById('armyText')!;
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect && entry.contentRect.height)
            setArmySize(entry.contentRect.height);
        }
      });
      resizeObserver.observe(armyDiv);
      ($('body') as JQuery & { i18n(): void }).i18n();
    }
  }
  console.debug(ArmyUnits);
}

export function clearArmyUnits() {
  ArmyUnits = {};
}
