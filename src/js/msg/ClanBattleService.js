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
 */import {gvg,MyInfo} from '../index.js';
import {toolOptions,setGVGSize} from '../fn/globals.js';
import {showOptions} from '../vars/showOptions.js';
import * as collapse from '../fn/collapse.js';
import {fGVGagesname} from '../fn/helper.js';
import BigNumber from "bignumber.js";
import icons from 'bootstrap-icons/bootstrap-icons.svg';


export var gvgContainer = null;
export var gvgSummary = null;
export var gvgAges = null;
    var gvgPower = [];

export function getContinent(msg){
						// console.debug(gvg,gvgContainer,gvgSummary,document.getElementById("gvgInfo"));
	// console.debug(gvg,gvgContainer,gvgSummary,gvgAges);

	// collapseOptions('collapseGVGinfo',false);

	if(gvgContainer == null){
		console.debug('1');
		gvgContainer = document.createElement('div');
		gvg.appendChild(gvgContainer);
		gvgSummary = document.createElement('div');
		gvgContainer.appendChild(gvgSummary);
	}

	if(document.getElementById("gvgInfo") == null){
		console.debug('2');
		gvgContainer = document.createElement('div');
		gvgContainer.id="gvgInfo";
		gvgContainer.className="alert alert-success alert-dismissible show collapsed";
		gvgContainer.innerHTML = `<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span>
        </button><p id="gvgInfoTextLabel" href="#gvgInfoText" data-toggle="collapse">
        <svg class="bi header-icon" id="gvgInfoIcon" href="#gvgInfoText" data-toggle="collapse" fill="currentColor" width="12" height="16"><use xlink:href="${icons}#${collapse.collapseGVGinfo ? 'plus' : 'dash'}-circle"/></svg>
        <strong><span data-i18n="summary">GvG Summary</span>:</strong></p>`;
		gvg.appendChild(gvgContainer);
		gvgSummary = document.createElement('div');
		gvgContainer.appendChild(gvgSummary);
		// document.getElementById("content").appendChild(gvg);
	}

		if(showOptions.showGVG) {
			const map = msg.responseData.continent;
			var gvgAges_copy = null;

			// gvgContainer.innerHTML = `<p>`;
			if(document.getElementById("gvgInfoText") == null){
				gvgSummary = document.createElement('div');
				gvgSummary.id = "gvgInfoText";
				gvgSummary.className = `collapse${!collapse.collapseGVGinfo ? ' show' : ''}`;
				// gvgSummary.innerHTML = ``;
				gvgContainer.appendChild(gvgSummary);
				// gvgSummary = document.createElement('div');
				// gvgContainer.appendChild(gvgSummary);
				// document.getElementById("content").appendChild(gvg);
				// gvg.id="gvgInfo";
				// gvg.className="alert alert-success alert-dismissible show collapsed";
				// console.debug(gvg,gvgContainer,document.getElementById("gvgInfoText"));
			}

		
			// console.debug(gvg,gvgContainer,document.getElementById("gvgInfo"));
	// var clanHTML = gvg.outerHTML;
						// console.debug(clanHTML);
						// if(clanHTML = null){
							var clanHTML = `<p id='gvg_1'>`;
							// console.debug(msg.responseData);
						// }
							let count = 0;
							clanHTML += `Rank ${msg.responseData.clan_data.global_clan_rank}`
							map.provinces.forEach(era => {
								// console.debug(era.era);
								count = 0;
								era.sectors.forEach(sector => {
									if(sector.owner_id === MyInfo.guildID) {
										count++;
										// console.debug(sector.sector_id);
									}
								})
								if(count){
									const siege = Math.round((3 * Math.pow(count,1.5) + 0.045 * Math.pow(count,3.1)) / 5 + 1) * 5;
									// const siege = BigNumber((3 * Math.pow(count,1.5) + 0.045 * Math.pow(count,3.1)) / 5 + 1).times(5).dp(0);
									const eraName = fGVGagesname(era.era);
									if(era.era == 'AllAge')
										clanHTML += `<br>AA: ${count} sect, ${siege * 5} medals`;
									else
										clanHTML += `<br>${eraName}: ${count} sect, ${siege} goods`;
								}
							});
							clanHTML += `</p></div></div>`;
							// console.debug(clanHTML);
							if(document.getElementById("gvgAges"))
								gvgAges_copy = document.getElementById("gvgAges");
							gvgSummary.innerHTML = clanHTML;
							// gvg.innerText = clanHTML;
							document.getElementById("gvgInfoTextLabel").addEventListener("click", collapse.fCollapseGVGinfo);
							if(gvgAges_copy) {
                                gvgSummary.appendChild(gvgAges);
                                if(document.getElementById("gvgTextLabel"))
								    document.getElementById("gvgTextLabel").addEventListener("click", collapse.fCollapseGVG);
							}
                            $('body').i18n();
						}
						else{
							console.debug(msg.responseData.length);
						}
						// console.debug(gvgSummary,gvgAges);
						// gvgSummary.appendChild(gvgAges);
}

export function getProvinceDetailed(msg){
	// if(!clanHTML){
		// clanHTML = `<div id="gvgTitle" class="alert alert-success alert-dismissible show collapsed" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><p id="gvgTextLabel" href="#gvgText" data-toggle="collapse"><svg class="bi alert-warning" id="citystatsicon" href="#citystatsText" data-toggle="collapse" fill="currentColor" width="12" height="16"><use xlink:href="${icons}#${collapse.collapseStats ? 'plus' : 'dash'}-circle"/></svg><strong>GvG Power:</strong></p>`;
	// }
// var clanHTML = `<p class="alert-success">`;
	// console.debug(msg.responseData);

        if(showOptions.showGVG) {
            if(document.getElementById("gvgTextLabel") == null){
                gvgAges = document.createElement('div');
                gvgAges.id="gvgAges";
                gvgSummary.appendChild(gvgAges);
            }
            // var clanHTML = gvgAges.innerHTML;
            var clanHTML = `<p>`;
            var Guilds = [];
            var GuildSectors = [];
            var GuildPower = [];
            var GVGstatus = [];
            // console.debug(Guilds,GuildSectors,GuildPower,GVGstatus);
            const map = msg.responseData.province_detailed;
            // console.debug(map);
            var power = 0;
            var total = 0;
            const power0 = map.power_values[0];
            const power1 = map.power_values[1];
            const power2 = map.power_values[2];
            const power3 = map.power_values[3];
            map.clans.forEach(clan => {
                // console.debug(clan);
    
                Guilds[clan.id] = clan.name;
            });
    
            map.sectors.forEach(sector => {
                // if(sector.__class__ == 'ClanBattleProvinceBaseSector')
                // if(sector.is_landing_zone == true)
                //     console.debug(sector);
    
                if(sector.is_fogged != true && sector.owner_id > 0){
                    power = 0;
    
                    if(sector.power === 1)
                        power = power1;
                    else if(sector.power === 2)
                        power = power2;
                    else if(sector.power === 3)
                        power = power3;
                    else 
                        power = power0;
    
                    if(GuildSectors[sector.owner_id])
                        GuildSectors[sector.owner_id]++;
                    else
                        GuildSectors[sector.owner_id] = 1;
    
                    if(GuildPower[sector.owner_id])
                        GuildPower[sector.owner_id] += power;
                    else
                        GuildPower[sector.owner_id] = power;
    
                    // console.debug(sector, GuildPower,power);
                    // console.debug(sector, Guilds[sector.owner_id],GuildPower[sector.owner_id],power);
                }		
            });
                // console.debug(MyInfo.guildID,Guilds[MyInfo.guildID],GuildPower[MyInfo.guildID],GuildPower);
    
            // map.top_clans.forEach( (clan,j) => {
            // 	if(clan.id == MyInfo.guildID)
            // 		 power = GuildPower[MyInfo.guildID] * (1 + ((3 - j)/20));
            // });
    
            Guilds.forEach( (clan,j) => {
                // console.debug(clan);
                // console.debug(clan,GuildSectors[j],GuildPower[j]);
                GVGstatus.push({'name': clan,'sectors': GuildSectors[j],'power': GuildPower[j]});
            });
    
            GVGstatus.sort(function(a, b){return b.power - a.power});
    
            GVGstatus.forEach( (clan,j) => {
                // if(j < 3) clan.power =  Math.round(clan.power*(1 + ((3 - j)/20)));
                if(j < 3) clan.power = BigNumber(clan.power).times(1 + ((3 - j)/20)).dp(0);
                if(clan.name == MyInfo.guild) gvgPower[map.era] = clan.power;
            });
    
            // if(!gvgPower[map.era]){
            // 	gvgPower.push([map.era,Math.round(power)]);
            // }
            // else
            Object.keys(gvgPower).forEach(age => {
                if(age == map.era)
                    clanHTML += `<br><span id="gvgTextLabel" href="#gvgText" data-toggle="collapse">
                    <svg class="bi header-icon" id="gvgicon" href="#gvgText" data-toggle="collapse" fill="currentColor" width="12" height="16"><use xlink:href="${icons}#${collapse.collapseGVG ? 'plus' : 'dash'}-circle"/></svg>
                    <strong>${fGVGagesname(map.era)}</strong>:</span> ${gvgPower[age]}`;
                else
                    clanHTML += `<br>${fGVGagesname(age)}: ${gvgPower[age]}`;
                total += +gvgPower[age];
                // console.debug(gvgPower[age]);
            });
                // console.debug(gvgPower);
            clanHTML += `<br>Total: ${total}</p>`;
    
            // GuildPower.forEach( (clan,j) => {
            // 	// console.debug(clan);
            // 	console.debug(Guilds[j],GuildSectors[j],clan);
            // });
    
    
                clanHTML += `<br>`;
                clanHTML += `<div id="gvgText" class="collapse ${collapse.collapseGVG ? '' : 'show'}"><p><strong>${fGVGagesname(map.era)} <span data-i18n="livestatus">Live Status</span></strong></p><p id="gvgAgeText" style="height: ${toolOptions.gvgSize}px" class="overflow">`;
                // clanHTML += `<strong>${map.era}</strong><br>`;
                GVGstatus.forEach( (clan,j) => {
                    clanHTML += `${j+1} ${clan.name}:  ${Math.round(clan.power)} (${clan.sectors})<br>`;
                });
            // }
            // clanHTML += `<br>`;
    
            gvgAges.innerHTML = clanHTML + `</p></div>`;
            if(document.getElementById("gvgTextLabel"))
                document.getElementById("gvgTextLabel").addEventListener("click", collapse.fCollapseGVG);
            const  gvgAgeDiv = document.getElementById("gvgAgeText");
            const resizeObserver = new ResizeObserver(entries => {
                for (const entry of entries) {
                    if (entry.contentRect && entry.contentRect.height) setGVGSize(entry.contentRect.height);
                }
            });
            resizeObserver.observe(gvgAgeDiv);
            $('body').i18n();
    
        // console.debug(Guilds,GuildSectors,GuildPower,GVGstatus);
        }
        else{
            console.debug(msg.responseData.length);
        }
    }

export function deploySiegeArmy(msg){
    console.debug('Siege Placed',msg);
}
export function grantIndependence(msg){
    console.debug('Grant Freedom',msg);
}

