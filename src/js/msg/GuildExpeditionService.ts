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
import * as collapse from '../fn/collapse';
import * as copy from '../fn/copy';
import * as element from '../fn/AddElement';
import { donationDIV2 } from '../index';
import { toolOptions, setExpeditionSize } from '../fn/globals';

export function guildExpeditionService(msg: Record<string, unknown>) {
  var ExpeditionPerformance: Array<[string, number]> = [];
  var expeditionHTML = `<div id="expeditionTextLabel" class="alert alert-info alert-dismissible show collapsed" role="alert">
		${element.close()}
		<p id="expeditionTextLabel" href="#expeditionText" data-bs-toggle="collapse">
      ${element.icon('expeditionicon', 'expeditionText', collapse.collapseExpedition)}
		<strong>Guild Expedition:</strong></p>`;
  expeditionHTML += element.copy(
    'expeditionCopyID',
    'info',
    'right',
    collapse.collapseExpedition,
  );
  expeditionHTML += `<div id="expeditionText" style="height: ${
    toolOptions.expeditionSize
  }px" class="alert-info overflow collapse ${
    collapse.collapseExpedition ? '' : 'show'
  }"><table><tr><th>Member</th><th>Points</th><th>Encounters</th></tr>`;
  (msg.responseData as Array<Record<string, unknown>>).forEach((entry) => {
    var solvedEncounters = 0;
    var expeditionPoints = 0;
    if (entry.solvedEncounters)
      solvedEncounters = entry.solvedEncounters as number;
    if (entry.expeditionPoints)
      expeditionPoints = entry.expeditionPoints as number;
    const playerName = (entry.player as Record<string, unknown>).name as string;
    ExpeditionPerformance.push([playerName, solvedEncounters]);
    expeditionHTML += `<tr><td>${playerName}</td><td>${expeditionPoints} </td><td>${solvedEncounters} </td></tr>`;
    console.debug(playerName, entry);
  });
  // console.debug(ExpeditionPerformance);
  donationDIV2.innerHTML = expeditionHTML + `</table></div></div>`;
  document
    .getElementById('expeditionCopyID')!
    .addEventListener('click', copy.ExpeditionCopy);
  document
    .getElementById('expeditionicon')!
    .addEventListener('click', collapse.fCollapseExpedition);
  document
    .getElementById('expeditionTextLabel')!
    .addEventListener('click', collapse.fCollapseExpedition);
  const expeditionDiv = document.getElementById('expeditionText')!;
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.contentRect && entry.contentRect.height)
        setExpeditionSize(entry.contentRect.height);
    }
  });
  resizeObserver.observe(expeditionDiv);
  ($('body') as JQuery & { i18n(): void }).i18n();
}
