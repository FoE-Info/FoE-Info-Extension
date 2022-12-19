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
import { checkDebug } from '..';
import * as element from './AddElement';

import * as storage from './storage.js';
import { Tooltip, Alert, Popover } from 'bootstrap';

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


export default function set(key, value) {
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

export function fCollapseGBInfo() {
	collapseGBInfo = !collapseGBInfo;
	storage.set('collapseGBInfo', collapseGBInfo);
	element.updateIcon("guildicon","guildText",collapseGuild);
}

export function fCollapseFriends() {
	collapseFriends = !collapseFriends;
	document.getElementById("friendsCopyID").style.display = collapseFriends ? 'none' : 'block';
	// console.debug('collapseFriends',collapseFriends);
	updateIcon("friendsicon","friendsText",collapseFriends);
}

export function fCollapseLists() {
	collapseLists = !collapseLists;
	element.updateIcon("listsicon","listsText",collapseLists);
}

export function fCollapseHood() {
	collapseHood = !collapseHood;
	document.getElementById("hoodCopyID").style.display = collapseHood ? 'none' : 'block';
	// console.debug('collapseHood',collapseHood);
	element.updateIcon("hoodicon","hoodText",collapseHood);
}

export function fCollapseGalaxy() {
	collapseGalaxy = !collapseGalaxy;
	// storage.set('collapseGalaxy', collapseGalaxy);
	element.updateIcon("galaxyicon","galaxyText",collapscollapseGalaxyeGuild);
}

export function fCollapseGuild() {
	collapseGuild = !collapseGuild;
	document.getElementById("guildCopyID").style.display = collapseGuild ? 'none' : 'block';
	// console.debug('collapseGuild',collapseGuild);
	element.updateIcon("guildicon","guildText",collapseGuild);
}

export function fCollapseIncidents() {
	fHideAllTooltips();
	collapseIncidents = !collapseIncidents;
	element.updateIcon("incidentsicon","incidentsText",collapseIncidents);
	// console.debug('collapseIncidents',collapseIncidents);
}

export function fCollapseGVG() {
	collapseGVG = !collapseGVG;
	element.updateIcon("gvgicon","gvgText",collapseGVG);
	// console.debug('fCollapseGVG',collapseOptions);
}

export function fCollapseGVGinfo() {
	collapseGVGinfo = !collapseGVGinfo;
	element.updateIcon("gvgInfoIcon","gvgInfoText",collapseGVGinfo);
	// console.debug('fCollapseGVGinfo',collapseGVGinfo,collapseOptions);
}

export function fCollapseArmy() {
  collapseArmy = !collapseArmy;
  document.getElementById("armyUnits").innerHTML = collapseArmy
    ? document.getElementById("armyUnits2").innerHTML +
      " " +
      document.getElementById("armyUnits3").innerHTML
    : "";
  element.updateIcon("armyicon", "armyText", collapseArmy);
}

export function fCollapseGoods() {
	collapseGoods = !collapseGoods;
	document.getElementById("goodsCopyID").style.display = collapseGoods ? 'none' : 'block';
	element.updateIcon("goodsicon","goodsText",collapseGoods);
}

export function fCollapseStats() {
	fHideAllTooltips();
	collapseStats = !collapseStats;
	// console.debug('collapseStats',collapseStats);
	//document.getElementById("citystatsCopyID").style.display = collapseStats ? 'none' : 'block';
	element.updateIcon("citystatsicon","citystatsText",collapseStats);
}

export function fCollapseRewards() {
	collapseRewards = !collapseRewards;
	// console.debug('collapseRewards',collapseRewards);
	element.updateIcon("rewardsicon","rewardsText",collapseRewards);
}

export function fCollapseGBDonors() {
	collapseGBDonors = !collapseGBDonors;
	document.getElementById("donorCopyID").style.display = collapseGBDonors ? 'none' : 'block';
	element.updateIcon("donoricon","donorcollapse",collapseGBDonors);
}

export function fCollapseInvested() {
    collapseInvested = !collapseInvested;
    document.getElementById("onHandFP").innerHTML = collapseInvested
      ? document.getElementById("onHandFP2").innerHTML
      : "";
    document.getElementById("investedCopyID").style.display = collapseInvested
      ? "none"
      : "block";
    element.updateIcon("investedicon", "investedText", collapseInvested);
}

// export function fcollapseGBinvest() {
// 	collapseGBinvest = !collapseGBinvest;
// 	// storage.set('collapseGBinvest', collapseGBinvest);
// 	// console.debug('fcollapseGBinvest',collapseOptions);
// 	element.updateIcon("guildicon","guildText",collapseGuild);
// }

export function fCollapseDonation() {
	collapseDonation = !collapseDonation;
	// console.debug('fCollapseDonation',collapseOptions);
	element.updateIcon("donationicon","donationText3",collapseDonation);
}

export function fCollapseBattleground() {
	collapseBattleground = !collapseBattleground;
	// console.debug('fCollapseBattleground',collapseOptions);
	element.updateIcon("battlegroundicon","battlegroundCollapse",collapseBattleground);
}

export function fCollapseBuildingCost() {
	collapseBuildingCost = !collapseBuildingCost;
	// console.debug('collapseBuildingCost',collapseBuildingCost);
	element.updateIcon("buildingCosticon","buildingCostText",collapseBuildingCost);
}

export function fCollapseBuildings() {
	collapseBuildings = !collapseBuildings;
	// console.debug('collapseBuildings',collapseBuildings);
	element.updateIcon("buildingsicon","buildingsText",collapseBuildings);
}

export function fCollapseExpedition() {
	collapseExpedition = !collapseExpedition;
	document.getElementById("expeditionCopyID").style.display = collapseExpedition ? 'none' : 'block';
	element.updateIcon("expeditionicon","expeditionText",collapseGuild);
}

export function fCollapseTreasury() {
	collapseTreasury = !collapseTreasury;
	document.getElementById("treasuryCopyID").style.display = collapseTreasury ? 'none' : 'block';
	element.updateIcon("treasuryicon","treasuryText",collapseTreasury);
}

export function fCollapseTreasuryLog() {
	collapseTreasuryLog = !collapseTreasuryLog;
	element.updateIcon("treasuryLogicon","treasuryLogText",collapseTreasuryLog);
}

export function fCollapseTarget() {
	collapseTarget = !collapseTarget;
	document.getElementById("targetPostID").style.display = collapseTarget ? 'none' : 'block';
	element.updateIcon("targeticon","targetText",collapseTarget);
}

export function fCollapseTargetGen() {
	collapseTargetGen = !collapseTargetGen;
	element.updateIcon("targetGenicon","targetGenCollapse",collapseTargetGen);
}

export function fCollapseBonus() {
	collapseBonus = !collapseBonus;
	element.updateIcon("guildicon","guildText",collapseGuild);
}

export function fCollapseCultural() {
	collapseCultural = !collapseCultural;
	element.updateIcon("guildicon","guildText",collapseGuild);
}

export function fCollapseClipboard() {
	collapseClipboard = !collapseClipboard;
	storage.set('collapseClipboard', collapseClipboard);
	document.getElementById("clipboardCopyID").style.display = collapseClipboard ? 'none' : 'block';
	element.updateIcon("clipboardicon","clipboardText",collapseClipboard);
}

function fHideAllTooltips(){
    const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');
    const popoverList = [...popoverTriggerList].map(popoverEl => Popover.getOrCreateInstance(popoverEl).hide());
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(tooltipEl => Tooltip.getOrCreateInstance(tooltipEl).hide());
	if(checkDebug()) console.debug("fHideAllTooltips");
}


