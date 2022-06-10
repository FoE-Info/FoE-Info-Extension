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
import icons from 'bootstrap-icons/bootstrap-icons.svg';

import * as storage from './storage.js';

export var collapseFriends = false;
export var collapseGuild = false;
export var collapseHood = false;
export var collapseIncidents  = true;
export var collapseArmy  = false;
export var collapseGoods  = true;
export var collapseGVG  = false;
export var collapseGVGinfo  = false;
export var collapseStats  = false;
export var collapseGBInfo  = false;
export var collapseGBRewards  = false;
export var collapseGBDonors  = false;
export var collapseGBclub  = false;
export var collapseGBinvest  = false;
export var collapseInvested  = true;
export var collapseDonation  = false;
export var collapseBattleground  = false;
export var collapseBuildingCost  = true;
export var collapseExpedition  = false;
export var collapseTreasury  = true;
export var collapseTreasuryLog  = true;
export var collapseGalaxy  = false;
export var collapseTarget  = false;
export var collapseTargetGen  = false;
export var collapseBuildings  = false;
export var collapseLists  = false;
export var collapseRewards = false;
export var collapseBonus = true;
export var collapseCultural = true;
export var collapseClipboard = true;



// export default class set {
// 	constructor(name, state) {
// 		this[name] = state;
// 	}
// }

// export default function set (name, state){
// 	console.debug(name,state);
// 	this.name = state;
// 	console.debug(this.name);
// }


export default function set (key, value) {
	// console.debug(key, value);
	switch (key) {
		case 'collapseFriends':
			collapseFriends = value;
			console.debug(collapseFriends);
			break;
		case 'collapseGuild':
			collapseGuild = value;
			break;
		case 'collapseStats':
			collapseStats = value;
			break;
		case 'collapseGVGinfo':
			collapseGVGinfo = value;
			break;
		case 'collapseGVG':
			collapseGVG = value;
			break;
		case 'collapseGoods':
			collapseGoods = value;
			break;
		case 'collapseIncidents':
			collapseIncidents = value;
			break;
		case 'collapseHood':
			collapseHood = value;
			break;
		case 'collapseArmy':
			collapseArmy = value;
			break;

		case 'collapseGBInfo':
			collapseGBInfo = value;
			break;
		case 'collapseGBRewards':
			collapseGBRewards = value;
			break;
		case 'collapseGBDonors':
			collapseGBDonors = value;
			break;
		case 'collapseGBclub':
			collapseGBclub = value;
			break;
		case 'collapseGBinvest':
			collapseGBinvest = value;
			break;
		case 'collapseInvested':
			collapseInvested = value;
			break;
		case 'collapseDonation':
			collapseDonation = value;
			break;
		case 'collapseBattleground':
			collapseBattleground = value;
			break;
		case 'collapseBuildingCost':
			collapseBuildingCost = value;
			break;
		case 'collapseExpedition':
			collapseExpedition = value;
			break;
		case 'collapseTreasury':
			collapseTreasury = value;
			break;
			case 'collapseTreasuryLog':
				collapseTreasuryLog = value;
				break;
			case 'collapseGalaxy':
			collapseGalaxy = value;
			break;
		case 'collapseTarget':
			collapseTarget = value;
			break;
		case 'collapseTargetGen':
			collapseTargetGen = value;
			break;
		case 'collapseBuildings':
			collapseBuildings = value;
			break;
		case 'collapseLists':
			collapseLists = value;
			break;
		case 'collapseRewards':
			collapseRewards = value;
			break;
		case 'collapseBonus':
			collapseBonus = value;
			break;
		case 'collapseCultural':
			collapseCultural = value;
			break;
		case 'collapseClipboard':
			collapseClipboard = value;
			break;

		default:
			console.debug(key, value);
			break;
	}
}

export function fCollapseGBInfo(){
	collapseGBInfo = !collapseGBInfo;
	storage.set('collapseGBInfo',collapseGBInfo);
}

export function fCollapseFriends(){
	collapseFriends = !collapseFriends;
	storage.set('collapseFriends',collapseFriends);
	if(collapseFriends){
		document.getElementById("friendsCopyID").style.display = "none";
	}else{
		document.getElementById("friendsCopyID").style.display = "block";
	}
	// console.debug('collapseFriends',collapseFriends);
	// document.getElementById("friendsicon").outerHTML = `<svg id="friendsicon" href="#friendsText" data-bs-toggle="collapse" class="bi header-icon" width="22" height="10"><use xlink:href="${!collapseFriends ? dash : plus}"/></svg>`;
}

export function fCollapseLists(){
	collapseLists = !collapseLists;
	storage.set('collapseLists',collapseLists);
}

export function fCollapseHood(){
	collapseHood = !collapseHood;
	storage.set('collapseHood',collapseHood);
	if(collapseHood){
		// document.getElementById("hoodCopy").innerHTML = '';
		document.getElementById("hoodCopyID").style.display = "none";
	}else{
		document.getElementById("hoodCopyID").style.display = "block";
		// document.getElementById("hoodCopy").innerHTML = '<button type="button" class="badge rounded-pill bg-success float-end right-button" id="hoodCopyID"><span data-i18n="copy">Copy</span></button>';
		// document.getElementById("hoodCopyID").addEventListener("click", copy.fHoodCopy);
	}
	// console.debug('collapseHood',collapseHood);
	// document.getElementById("hoodicon").outerHTML = `<svg id="hoodicon" href="#hoodText" data-bs-toggle="collapse" class="bi header-icon" width="22" height="10"><use xlink:href="${!collapseHood ? dash : plus}"/></svg>`;
}

export function fCollapseGalaxy(){
	collapseGalaxy = !collapseGalaxy;
	storage.set('collapseGalaxy',collapseGalaxy);
}

// export function fCollapseGuild(){
// 	collapseGuild = !collapseGuild;
// 	storage.set('collapseOptions',collapseOptions);
// }

export function fCollapseGuild(){
	collapseGuild = !collapseGuild;
	storage.set('collapseGuild',collapseGuild);
	if(collapseGuild){
		// document.getElementById("guildCopy").innerHTML = '';
		document.getElementById("guildCopyID").style.display = "none";
	}else{
		// document.getElementById("guildCopy").innerHTML = '<button type="button" class="badge rounded-pill bg-success float-end right-button" id="guildCopyID"><span data-i18n="copy">Copy</span></button>';
		// document.getElementById("guildCopyID").addEventListener("click", copy.fGuildCopy);
		document.getElementById("guildCopyID").style.display = "block";
	}
	// console.debug('collapseGuild',collapseGuild);
	// document.getElementById("guildicon").outerHTML = `<svg id="guildicon" href="#guildText" data-bs-toggle="collapse" class="bi header-icon" width="22" height="10"><use xlink:href="${!collapseGuild ? dash : plus}"/></svg>`;
}

export function fCollapseIncidents(){
	collapseIncidents = !collapseIncidents;
	// console.debug('collapseIncidents',collapseIncidents);
	document.getElementById("incidentsicon").outerHTML = `<svg id="incidentsicon" href="#incidentsText" data-bs-toggle="collapse" class="bi header-icon" width="22" height="10"><use xlink:href="${!collapseIncidents ? dash : plus}"/></svg>`;
	// console.debug(document.getElementById("incidentsTextLabel").innerHTML);
	// console.debug(document.getElementById("incidentsicon").outerHTML);
	storage.set('collapseIncidents',collapseIncidents);
}

export function fCollapseGVG(){
	collapseGVG = !collapseGVG;
	storage.set('collapseGVG',collapseGVG);
	// console.debug('fCollapseGVG',collapseOptions);
}

export function fCollapseGVGinfo(){
	// console.debug('fCollapseGVGinfo',collapseGVGinfo,collapseOptions);
	collapseGVGinfo = !collapseGVGinfo;
	storage.set('collapseGVGinfo',collapseGVGinfo);
	// console.debug('fCollapseGVGinfo',collapseGVGinfo,collapseOptions);
}

export function fCollapseArmy(){
	collapseArmy = !collapseArmy;
	storage.set('collapseArmy',collapseArmy);
	// console.debug('fCollapseArmy',collapseOptions);
	if(!collapseArmy){
		document.getElementById("armyUnits").innerHTML = '';
	}else
	document.getElementById("armyUnits").innerHTML = document.getElementById("armyUnits2").innerHTML + ' ' + document.getElementById("armyUnits3").innerHTML;
}

export function fCollapseGoods(){
	collapseGoods = !collapseGoods;
	storage.set('collapseGoods',collapseGoods);
	// console.debug('fCollapseArmy',collapseOptions);
	// if(!collapseGoods){
		// 	document.getElementById("Goods").innerHTML = '';
		// }else
		// 	document.getElementById("Goods").innerHTML = document.getElementById("armyUnits2").innerHTML + ' ' + document.getElementById("armyUnits3").innerHTML;
	}

	export function fCollapseStats(){
		collapseStats = !collapseStats;
		// console.debug('collapseStats',collapseStats);
		if(collapseStats){
			// document.getElementById("citystatsCopy").innerHTML = '';
			document.getElementById("citystatsCopyID").style.display = "none";

		}else{
			document.getElementById("citystatsCopyID").style.display = "block";
			// document.getElementById("citystatsCopy").innerHTML = '<button type="button" class="badge rounded-pill bg-warning float-end right-button" id="citystatsCopyID"><span data-i18n="copy">Copy</span></button>';
			// document.getElementById("citystatsCopyID").addEventListener("click", copy.fCityStatsCopy);
		}
		document.getElementById("citystatsicon").outerHTML = `<svg class="bi header-icon" id="citystatsicon" href="#citystatsText" data-bs-toggle="collapse" fill="currentColor" width="12" height="16"><use xlink:href="${icons}#${collapseStats ? 'plus' : 'dash'}-circle"/></svg>`;
		// document.getElementById("citystatsicon").outerHTML = `<svg id="citystatsicon" href="#citystatsText" data-bs-toggle="collapse" class="bi header-icon" width="22" height="10"><use xlink:href="${!collapseStats ? dash : plus}"/>
		// </svg>`;
		storage.set('collapseStats',collapseStats);
	}

	export function fCollapseRewards(){
		collapseRewards = !collapseRewards;
		// console.debug('collapseRewards',collapseRewards);
		if(collapseRewards){
			// document.getElementById("citystatsCopy").innerHTML = '';
			// document.getElementById("citystatsCopyID").style.display = "none";

		}else{
			// document.getElementById("citystatsCopyID").style.display = "block";
			// document.getElementById("citystatsCopy").innerHTML = '<button type="button" class="badge rounded-pill bg-warning float-end right-button" id="citystatsCopyID"><span data-i18n="copy">Copy</span></button>';
			// document.getElementById("citystatsCopyID").addEventListener("click", copy.fCityStatsCopy);
		}
		document.getElementById("rewardsicon").outerHTML = `<svg class="bi header-icon" id="rewardsicon" href="#rewardsText" data-bs-toggle="collapse" fill="currentColor" width="12" height="16"><use xlink:href="${icons}#${collapseRewards ? 'plus' : 'dash'}-circle"/></svg>`;
		// document.getElementById("citystatsicon").outerHTML = `<svg id="citystatsicon" href="#citystatsText" data-bs-toggle="collapse" class="bi header-icon" width="22" height="10"><use xlink:href="${!collapseStats ? dash : plus}"/>
		// </svg>`;
		storage.set('collapseRewards',collapseRewards);
	}

	export function fCollapseGBRewards(){
		collapseGBRewards = !collapseGBRewards;
		storage.set('collapseGBRewards',collapseGBRewards);
	}

	export function fCollapseGBDonors(){
		collapseGBDonors = !collapseGBDonors;
		storage.set('collapseGBDonors',collapseGBDonors);
		document.getElementById("donorCopyID").style.display = `${collapseGBDonors ? 'none' : 'block'}`;
		// document.getElementById("citystatsicon").outerHTML = `<svg id="citystatsicon" href="#citystatsText" data-bs-toggle="collapse" class="bi header-icon" width="22" height="10"><use xlink:href="${!collapseGBDonors ? dash : plus}"/>
		// </svg>`;
	}

	// export function fCollapseGBclub(){
	// 	collapseGBclub = !collapseGBclub;
	// 	storage.set('collapseOptions',collapseOptions);
	// 	document.getElementById("citystatsicon").outerHTML = `<svg id="citystatsicon" href="#citystatsText" data-bs-toggle="collapse" class="bi header-icon" width="22" height="10"><use xlink:href="${!collapseGBclub ? dash : plus}"/>
	// 	</svg>`;
	// }

	export function fCollapseInvested(){
		collapseInvested = !collapseInvested;
		storage.set('collapseInvested',collapseInvested);
		if(collapseInvested){
			document.getElementById("onHandFP").innerHTML = '';
		}else
		document.getElementById("onHandFP").innerHTML = document.getElementById("onHandFP2").innerHTML;
	}

	export function fcollapseGBinvest(){
		collapseGBinvest = !collapseGBinvest;
		storage.set('collapseGBinvest',collapseGBinvest);
		// console.debug('fcollapseGBinvest',collapseOptions);
	}

	export function fCollapseDonation(){
		collapseDonation = !collapseDonation;
		storage.set('collapseDonation',collapseDonation);
		// console.debug('fCollapseDonation',collapseOptions);
	}

	export function fCollapseBattleground(){
		collapseBattleground = !collapseBattleground;
		storage.set('collapseBattleground',collapseBattleground);
		// console.debug('fCollapseBattleground',collapseOptions);
	}

	export function fCollapseBuildingCost(){
		collapseBuildingCost = !collapseBuildingCost;
		storage.set('collapseBuildingCost',collapseBuildingCost);
		// console.debug('collapseBuildingCost',collapseBuildingCost);
	}

	export function fCollapseBuildings(){
		collapseBuildings = !collapseBuildings;
		storage.set('collapseBuildings',collapseBuildings);
		// console.debug('collapseBuildings',collapseBuildings);
	}

	export function fCollapseExpedition(){
		collapseExpedition = !collapseExpedition;
		storage.set('collapseExpedition',collapseExpedition);
		document.getElementById("expeditionCopyID").style.display = `${collapseExpedition ? 'none' : 'block'}`;
	}

	export function fCollapseTreasury(){
		collapseTreasury = !collapseTreasury;
		storage.set('collapseTreasury',collapseTreasury);
	}

	export function fCollapseTreasuryLog(){
		collapseTreasuryLog = !collapseTreasuryLog;
		storage.set('collapseTreasuryLog',collapseTreasuryLog);
	}

	export function fCollapseTarget(){
		collapseTarget = !collapseTarget;
		storage.set('collapseTarget',collapseTarget);
		if(collapseTarget){
			document.getElementById("targetPostID").style.display = "none";
		}else{
			document.getElementById("targetPostID").style.display = "block";
		}
	}

	export function fCollapseTargetGen(){
		collapseTargetGen = !collapseTargetGen;
		storage.set('collapseTargetGen',collapseTargetGen);
	}


	export function fCollapseBonus(){
		collapseBonus = !collapseBonus;
		storage.set('collapseBonus',collapseBonus);
	}

	export function fCollapseCultural(){
		collapseCultural = !collapseCultural;
		storage.set('collapseCultural',collapseCultural);
	}

	export function fCollapseClipboard(){
		collapseClipboard = !collapseClipboard;
		storage.set('collapseClipboard',collapseClipboard);
		document.getElementById("clipboardCopyID").style.display = `${collapseClipboard ? 'none' : 'block'}`;
	}
