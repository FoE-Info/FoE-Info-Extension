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
import * as collapse from "../fn/collapse.js";
import * as copy from "../fn/copy.js";
import * as element from "../fn/AddElement";
import { donationDIV2 } from "../index.js";
import { toolOptions, setExpeditionSize } from "../fn/globals.js";
import icons from "bootstrap-icons/bootstrap-icons.svg";

export function guildExpeditionService(msg) {
  var ExpeditionPerformance = [];
  var expeditionHTML = `<div id="expeditionTextLabel" class="alert alert-info alert-dismissible show collapsed" role="alert">
		${element.close()}
		<p id="expeditionTextLabel" href="#expeditionText" aria-expanded="true" aria-controls="expeditionText" data-bs-toggle="collapse">
      ${element.icon(
        "expeditionicon",
        "expeditionText",
        collapse.collapseExpedition
      )}
		<strong>Guild Expedition:</strong></p>`;
  expeditionHTML += element.copy(
    "expeditionCopyID",
    "info",
    "right",
    collapse.collapseExpedition
  );
  expeditionHTML += `<div id="expeditionText" style="height: ${
    toolOptions.expeditionSize
  }px" class="alert-info overflow collapse ${
    collapse.collapseExpedition ? "" : "show"
  }"><table><tr><th>Member</th><th>Points</th><th>Encounters</th></tr>`;
  msg.responseData.forEach((entry) => {
    var solvedEncounters = 0;
    var expeditionPoints = 0;
    if (entry.solvedEncounters) solvedEncounters = entry.solvedEncounters;
    if (entry.expeditionPoints) expeditionPoints = entry.expeditionPoints;
    ExpeditionPerformance.push([entry.player.name, solvedEncounters]);
    expeditionHTML += `<tr><td>${entry.player.name}</td><td>${expeditionPoints} </td><td>${solvedEncounters} </td></tr>`;
    console.debug(entry.player.name, entry);
  });
  // console.debug(ExpeditionPerformance);
  donationDIV2.innerHTML = expeditionHTML + `</table></div></div>`;
  document
    .getElementById("expeditionCopyID")
    .addEventListener("click", copy.ExpeditionCopy);
  document
    .getElementById("expeditionicon")
    .addEventListener("click", collapse.fCollapseExpedition);
  document
    .getElementById("expeditionTextLabel")
    .addEventListener("click", collapse.fCollapseExpedition);
  const expeditionDiv = document.getElementById("expeditionText");
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.contentRect && entry.contentRect.height)
        setExpeditionSize(entry.contentRect.height);
    }
  });
  resizeObserver.observe(expeditionDiv);
  $("body").i18n();
}
