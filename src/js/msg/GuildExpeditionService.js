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
import * as collapse from '../fn/collapse.js';
import * as copy from '../fn/copy.js';
import {donationDIV2} from '../index.js';
import {toolOptions,setExpeditionSize} from '../fn/globals.js';
import icons from 'bootstrap-icons/bootstrap-icons.svg';


export function guildExpeditionService(msg){
		var ExpeditionPerformance = [];
		var expeditionHTML = `<div id="expeditionTextLabel" class="alert alert-info alert-dismissible show collapsed" role="alert">
		<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>
		<p id="expeditionTextLabel" href="#expeditionText" aria-expanded="true" aria-controls="expeditionText" data-toggle="collapse">
		<svg class="bi header-icon" id="expeditionicon" href="#expeditionText" data-toggle="collapse" fill="currentColor" width="12" height="16"><use xlink:href="${icons}#${collapse.collapseExpedition ? 'plus' : 'dash'}-circle"/></svg>
		<strong>Guild Expedition:</strong></p>
		<button type="button" class="badge badge-pill badge-info float-right right-button" id="expeditionCopyID"><span data-i18n="copy">Copy</span></button>`;
		expeditionHTML += `<div id="expeditionText" style="height: ${toolOptions.expeditionSize}px" class="alert-info overflow collapse ${collapse.collapseExpedition ? '' : 'show'}"><table><tr><th>Member</th><th>Points</th><th>Encounters</th></tr>`
		msg.responseData.forEach(entry => {
            var	solvedEncounters = 0;
            var expeditionPoints = 0;
			if(entry.solvedEncounters) solvedEncounters = entry.solvedEncounters;
			if(entry.expeditionPoints) expeditionPoints = entry.expeditionPoints;
			ExpeditionPerformance.push([entry.player.name,solvedEncounters]); 
			expeditionHTML += `<tr><td>${entry.player.name}</td><td>${expeditionPoints} </td><td>${solvedEncounters} </td></tr>`;
			console.debug(entry.player.name,entry);
		});
		// console.debug(ExpeditionPerformance);
		donationDIV2.innerHTML = expeditionHTML + `</table></div></div>`;
		document.getElementById("expeditionCopyID").addEventListener("click", copy.ExpeditionCopy);
		document.getElementById("expeditionTextLabel").addEventListener("click", collapse.fCollapseExpedition);
		const  expeditionDiv = document.getElementById("expeditionText");
		const resizeObserver = new ResizeObserver(entries => {
			for (const entry of entries) {
				if (entry.contentRect && entry.contentRect.height) setExpeditionSize(entry.contentRect.height);
			}
		});
		resizeObserver.observe(expeditionDiv);
        $('body').i18n();	
}