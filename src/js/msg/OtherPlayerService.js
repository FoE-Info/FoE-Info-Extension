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
import $ from "jquery";
import "@wikimedia/jquery.i18n/libs/CLDRPluralRuleParser/src/CLDRPluralRuleParser.js"
import "@wikimedia/jquery.i18n/src/jquery.i18n";
import "@wikimedia/jquery.i18n/src/jquery.i18n.messagestore.js";
import "@wikimedia/jquery.i18n/src/jquery.i18n.fallbacks.js";
import "@wikimedia/jquery.i18n/src/jquery.i18n.parser.js";
import "@wikimedia/jquery.i18n/src/jquery.i18n.emitter.js";
import "@wikimedia/jquery.i18n/src/jquery.i18n.language.js";
import BigNumber from "bignumber.js";
import icons from 'bootstrap-icons/bootstrap-icons.svg';

import {showOptions} from '../vars/showOptions.js';
import * as helper from '../fn/helper.js';
import * as collapse from '../fn/collapse.js';
import * as post_webstore from '../fn/post_webstore.js';
import * as copy from '../fn/copy.js';
import {setPlayerName,CityProtections,CityEntityDefs,PlayerName,checkDebug,url,MyInfo,GameOrigin,PlayerID} from '../index.js';
import {toolOptions,setFriendsSize} from '../fn/globals.js';
import {fArcname} from './StartupService.js';

var friendsHTML = '';

var visitData = [];
var visitAttack = 0;
var visitDefense = 0;
var visitCityAttack = 0;
var visitCityDefense = 0;
var tooltipHTML = [];
var goodsList = [];
var Goods = {
	'sajm':0,
	'sav':0,
	'saab':0,
	'sam':0,
	'vf':0,
	'of':0,
	'af':0,
	'tf':0,
	'te':0,
	'ce':0,
	'pme':0,
	'me':0,
	'pe':0,
	'ina':0,
	'cma':0,
	'lma':0,
	'hma':0,
	'ema':0,
	'ia':0,
	'ba':0,
	'noage':0
	};
	
	export var friends = [];
	export var guildMembers = [];
	export var hoodlist = [];

export function otherPlayerService(msg){
	var googleSheetAPI = url.sheetGuildURL;
	var visitForgePoints = 0;
	var visitArcBonus = null;
	var visitArcLevel = null;
	var visitObsLevel = null;
	var visitTrazLevel = null;
	var visitCdMLevel = null;
	var visitCAPELevel = null;
	var visitCoALevel = null;
	var visitZeusLevel = null;
	var visitINNOLevel = null;
	var visitAOLevel = null;
	var visitHSLevel = null;
	var visitKrakenLevel = null;
	var visitTerraLevel = null;
	var visitCFLevel = null;
	var visitHCLevel = null;
	var visitSCLevel = null;
	var visitAILevel = null;
	var visitAtomLevel = null;
	var visitToRLevel = null;
	var visitstatsHTML = ``;
	var clanPower = 0;
	var clanBuildings = 0;
	var clanHOFcount = 0;
	var clanSOHcount = 0;
	var clanTGEcount = 0;
	var visitPenal = 0;
	var clanGoods = 0;
	var clanGoodsHTML = '';
	var visitbetafp = null;
	var visitbetaad = null;
	var visitbetagoods = null;
	var visitbetapower = null;
	visitAttack = 0;
	visitDefense = 0;
	visitCityAttack = 0;
	visitCityDefense = 0;
	visitData = [];
	// var plunderList = [];
	// var plunderHTML = '';
	Goods = {
		'sajm':0,
		'sav':0,
		'saab':0,
		'sam':0,
		'vf':0,
		'of':0,
		'af':0,
		'tf':0,
		'te':0,
		'ce':0,
		'pme':0,
		'me':0,
		'pe':0,
		'ina':0,
		'cma':0,
		'lma':0,
		'hma':0,
		'ema':0,
		'ia':0,
		'ba':0,
		'noage':0
		};
		// var output = document.createElement('div');
    // output.innerHTML = '';
	// console.debug(msg.responseData);
	// console.debug('era:', msg.responseData.other_player_era);
	// console.debug('showStats:',showOptions.showStats);
	// console.debug('msg:', msg);


	if(DEV && checkDebug()){
		// console.debug(msg.responseData);
		var beta = document.getElementById("beta");

		if( beta == null){
			// console.debug('2');
			beta = document.createElement('div');
			document.getElementById("content").appendChild(beta);
			beta.id = 'beta';
		}
		visitbetafp = `<p><strong>FP</strong></p><p>`;
		visitbetaad = '</p><p><strong>A/D</strong></p><p>';
		visitbetagoods = '</p><p><strong>Goods</strong></p><p>';
		visitbetapower = '</p><p><strong>Power</strong></p><p>';
	}


if(msg.responseData.city_map.entities.length) {
		var map_entities = msg.responseData.city_map.entities;
		// console.debug('entities:', map_entities,map_entities.length);
		var cityBuidings = [];
		var motivated = 0;
		var notmotivated = 0;
		var canBeMotivated = 0;
		var canBePolished = 0;
		map_entities.forEach( (mapID,id) => {

				if(mapID.type != 'street' 
					&& mapID.type != 'off_grid')
				// console.debug(id,mapID);

				if(mapID.state && mapID.state.is_motivated == true) motivated++;
				if(mapID.state && mapID.state.is_motivated != true) notmotivated++;

				if(CityEntityDefs[mapID.cityentity_id] 
					&& CityEntityDefs[mapID.cityentity_id].abilities.find(id => id.__class__ == 'PolishableAbility')) 
						canBePolished++;

				if(CityEntityDefs[mapID.cityentity_id] 
					&& CityEntityDefs[mapID.cityentity_id].abilities.find(id => id.__class__ == 'MotivatableAbility')) 
						canBeMotivated++;
		
				if(cityBuidings[mapID.cityentity_id]){
					// console.debug(cityBuidings[mapID.cityentity_id]);
					cityBuidings[mapID.cityentity_id].qty++;
				}
				else{
					// console.debug(CityEntityDefs[mapID.cityentity_id].name);
					cityBuidings[mapID.cityentity_id]= {'name':helper.fGBname(mapID.cityentity_id),'qty':1};
				}
				// if(!mapID.connected){
					// console.debug('disconnected'.mapID);
				// }else 
				if(mapID.cityentity_id.substring(0,24) == 'R_MultiAge_Battlegrounds')
				{
					// SoH & Great Elephant
					clanBuildings++;
					clanSOHcount++;
				}
				else if(mapID.cityentity_id.substring(0,19) == "Z_MultiAge_CupBonus")
				{
					// HoF ?
					clanBuildings++;
					clanHOFcount++;
				}
				else if(mapID.cityentity_id == "X_ProgressiveEra_Landmark1" && mapID.state.current_product && mapID.state.current_product.amount)
				{
					visitPenal = mapID.state.current_product.amount;
					visitTrazLevel = mapID.level;
				}
				else if(mapID.cityentity_id == "X_AllAge_Expedition") visitToRLevel = mapID.level;
				else if(mapID.cityentity_id == "X_AllAge_EasterBonus4") visitObsLevel = mapID.level;
				else if(mapID.cityentity_id == "X_BronzeAge_Landmark2") visitZeusLevel = mapID.level;
				else if(mapID.cityentity_id == "X_EarlyMiddleAge_Landmark1") visitHSLevel = mapID.level;
				else if(mapID.cityentity_id == "X_EarlyMiddleAge_Landmark2") visitCoALevel = mapID.level;
				else if(mapID.cityentity_id == "X_LateMiddleAge_Landmark3") visitCdMLevel = mapID.level;
				else if(mapID.cityentity_id == "X_ProgressiveEra_Landmark2") visitCFLevel = mapID.level;
				else if(mapID.cityentity_id == "X_ModernEra_Landmark2") visitAtomLevel = mapID.level;
				else if(mapID.cityentity_id == "X_PostModernEra_Landmark1") visitCAPELevel = mapID.level;
				else if(mapID.cityentity_id == "X_ContemporaryEra_Landmark2") visitINNOLevel = mapID.level;
				else if(mapID.cityentity_id == "X_FutureEra_Landmark1") visitArcLevel = mapID.level;
				else if(mapID.cityentity_id == "X_ArcticFuture_Landmark2") visitAOLevel = mapID.level;
				else if(mapID.cityentity_id == "X_OceanicFuture_Landmark2") visitKrakenLevel = mapID.level;
				else if(mapID.cityentity_id == "X_VirtualFuture_Landmark1") visitTerraLevel = mapID.level;
				else if(mapID.cityentity_id == "X_VirtualFuture_Landmark2") visitHCLevel = mapID.level;
				else if(mapID.cityentity_id == "X_SpaceAgeAsteroidBelt_Landmark1") visitSCLevel = mapID.level;
				else if(mapID.cityentity_id == "X_SpaceAgeJupiterMoon_Landmark1") visitAILevel = mapID.level;
				else{
					// const entity = CityEntityDefs[mapID.cityentity_id];
					// if(entity.type != 'tower' && entity.type != 'street' && entity.type != 'hub_main' && entity.type != 'hub_part' && entity.type != 'off_grid'){
						// console.debug(entity.name,mapID,entity);
					// }
				}
				if(CityEntityDefs[mapID.cityentity_id]){
					const entity = CityEntityDefs[mapID.cityentity_id];
					var boost = {};
					const entityAge = helper.fAgefromLevel(mapID.level)
					var forgePoints = 0;
					// console.debug(entity.name,entity,mapID);
					// debug.innerHTML += `<p>${CityEntityDefs[mapID.cityentity_id].name}`;
					// if(entity.type == 'street' || entity.type == 'hub_main' || entity.type == 'hub_part' || entity.type == 'off_grid'){
						// break;
					// }
					
					if(entity.entity_levels){
						forgePoints = 0;
						const production = entity.entity_levels;
						// console.debug(production,production[mapID.level]);
						if(production[mapID.level] && production[mapID.level].production_values && production[mapID.level].production_values.length){
							for(var value = 0; value < production[mapID.level].production_values.length; value++){
								if(production[mapID.level].production_values[value].type == 'strategy_points'){
									forgePoints =  production[mapID.level].production_values[value].value;
									// console.debug(production[mapID.level].production_values[value].value);
								}
							}
							if(forgePoints && 
								mapID.state.current_product && 
								mapID.state.current_product.product && 
								mapID.state.current_product.product.resources && 
								mapID.state.current_product.product.resources.strategy_points){
									console.debug(mapID);
									visitForgePoints +=  forgePoints;
								console.debug(helper.fGBname(mapID.cityentity_id),entity,mapID);
								if(DEV && checkDebug()){
									if(mapID.state.__class__ == 'ProductionFinishedState')
										visitbetafp += `<br>#${id}: ${mapID.x}/${mapID.y} ${forgePoints}FP Total: ${visitForgePoints}FP <strong>${helper.fGBname(mapID.cityentity_id)} ${mapID.state.current_product.product.resources.strategy_points}</strong>`;
									else
										visitbetafp += `<br>#${id}: ${mapID.x}/${mapID.y} ${forgePoints}FP Total: ${visitForgePoints}FP ${helper.fGBname(mapID.cityentity_id)}`;
								}
							}
						}
					}
					
					if(entity.available_products && entity.available_products[0].__class__ == 'CityEntityClanPowerProduct'){
					// console.debug(CityEntityDefs[mapID.cityentity_id].name,entity);
						
						if(entity.entity_levels[mapID.level].__class__ == 'ClanPowerProductionEntityLevel')
							clanPower += entity.entity_levels[mapID.level].clan_power;
						if(DEV && checkDebug()){
							// console.debug(CityEntityDefs[mapID.cityentity_id].name,mapID.state.current_product);
							if(entity.entity_levels[mapID.level].__class__ == 'ClanPowerProductionEntityLevel')
								visitbetapower += `<br>#${id}: ${mapID.x}/${mapID.y} ${entity.entity_levels[mapID.level].clan_power} ${helper.fGBname(mapID.cityentity_id)}`;
						}
					}

					if(entity.abilities){
						forgePoints = 0;
						boost = {};
						var totalboost = 0;
						const bonus = entity.abilities;
						// console.debug(entity.name,bonus,entity,mapID);
						bonus.forEach(ability => {
							if(ability.__class__ == 'AddResourcesToGuildTreasuryAbility') {
								// console.debug(entity.name,mapID);
								// console.debug(entity.name,ability,ability.additionalResources[entityAge]);
								const resources = ability.additionalResources[entityAge];
								if(resources && resources.resources && resources.resources.clan_power)
									clanPower += ability.additionalResources[entityAge].resources.clan_power;
								if(ability.additionalResources['AllAge'].resources.all_goods_of_age){
									const goods = ability.additionalResources['AllAge'].resources.all_goods_of_age;
									clanGoods += goods;
									// console.debug(entity.name,mapID);
									// console.debug(entity.name,ability,ability.additionalResources[entityAge]);
										// console.debug(levelSoH,mapID.level,PowerSoH[levelSoH][mapID.level],GuildsGoods[levelSoH],clanPower,clanGoods);
									clanGoodsHTML += helper.fGBname(mapID.cityentity_id) + ': ' + goods + '<br>';
									fGoodsTally(helper.fAgefromLevel(mapID.level),goods);
								}
								if(DEV && checkDebug()){
									// console.debug(CityEntityDefs[mapID.cityentity_id].name,mapID.state.current_product);
									if(ability.additionalResources['AllAge'].resources.all_goods_of_age)
										visitbetagoods += `<br>#${id}: ${mapID.x}/${mapID.y} ${ability.additionalResources['AllAge'].resources.all_goods_of_age} ${helper.fGBname(mapID.cityentity_id)}`;
									if(resources && resources.resources && resources.resources.clan_power)
										visitbetapower += `<br>#${id}: ${mapID.x}/${mapID.y} ${ability.additionalResources[entityAge].resources.clan_power} ${helper.fGBname(mapID.cityentity_id)}`;
								}
							}
							if(ability.__class__ == 'AddResourcesWhenMotivatedAbility' || ability.__class__ == 'AddResourcesAbility') {
								// console.debug(entity.name,ability,ability.additionalResources[entityAge])
								if(ability.additionalResources['AllAge'] && ability.additionalResources['AllAge'].resources.strategy_points)
									forgePoints +=  ability.additionalResources['AllAge'].resources.strategy_points;
									// console.debug(forgePoints);
								if(DEV && checkDebug()){
									if(ability.additionalResources['AllAge'] && ability.additionalResources['AllAge'].resources.strategy_points)
										visitbetagoods += `<br>#${id}: ${mapID.x}/${mapID.y} ${ability.additionalResources['AllAge'].resources.strategy_points} ${helper.fGBname(mapID.cityentity_id)}`;
								}
							}
							if(ability.__class__ == 'RandomUnitOfAgeWhenMotivatedAbility') {
								// console.debug(entity.name,ability,ability.amount)
								visitPenal += ability.amount;
							}
						});

						for(var abID = 0; abID < bonus.length; abID++){
							const bonusAr = bonus[abID];
							if(bonusAr.boostHints && bonusAr.boostHints.length){
								for(var j = 0; j < bonusAr.boostHints.length; j++){
									if(bonusAr.boostHints[j].boostHintEraMap[entityAge])
										boost = bonusAr.boostHints[j].boostHintEraMap[entityAge];
									else 
										boost = bonusAr.boostHints[j].boostHintEraMap['AllAge'];
									totalboost += fBoost(boost);
								}
							}else if(bonusAr.bonuses && bonusAr.bonuses.length){
								for(var j = 0; j < bonusAr.bonuses.length; j++){
									// console.debug(bonusAr.bonuses[j]);
									if(bonusAr.bonuses[j].boost[entityAge])
										boost = bonusAr.bonuses[j].boost[entityAge];
									else if(bonusAr.bonuses[j].boost['AllAge'])
										boost = bonusAr.bonuses[j].boost['AllAge'];
									else
										boost = null;
									if(boost)
										totalboost += fBoost(boost);

									if(bonusAr.bonuses[j].revenue[entityAge] && bonusAr.bonuses[j].revenue[entityAge].resources.strategy_points)
										forgePoints += bonusAr.bonuses[j].revenue[entityAge].resources.strategy_points;
									// console.debug(forgePoints);
									if(bonusAr.bonuses[j].revenue['AllAge'] && bonusAr.bonuses[j].revenue['AllAge'].resources.strategy_points)
										forgePoints += bonusAr.bonuses[j].revenue['AllAge'].resources.strategy_points;
										// console.debug(forgePoints);
										// else
										// forgePoints = 0;
								}
							}else if(bonusAr.bonusGiven){
								// for(var j = 0; j < entity.bonusGiven.length; j++){
									// console.debug(bonusAr.bonusGiven);
									if(bonusAr.bonusGiven.boost[entityAge])
										boost = bonusAr.bonusGiven.boost[entityAge];
									else if(bonusAr.bonusGiven.boost['AllAge'])
										boost = bonusAr.bonusGiven.boost['AllAge'];
									else
										boost = null;
									if(boost){
										bonusAr.linkPositions.forEach(element => {
											totalboost += fBoost(boost);
										});
									}
								// }
							}else if(bonusAr.boostHints){
								boost = bonusAr;
								totalboost += fBoost(boost);
							}else if(bonusAr.additionalResources){
									// if(bonusAr.additionalResources[entityAge])
									// 	// boost = bonusAr.bonusGiven.boost[entityAge];
									// 	// console.debug(bonusAr.additionalResources[entityAge]);
									// if(bonusAr.additionalResources['AllAge'] && bonusAr.additionalResources['AllAge'].resources.strategy_points)
									// 	forgePoints +=  bonusAr.additionalResources['AllAge'].resources.strategy_points;
									// 	console.debug(forgePoints);
									// 	// else
									// 	// console.debug(bonusAr.additionalResources);
							}else{
								// console.debug(entity);
							}
						}
						if(forgePoints){
							visitForgePoints += forgePoints;
							if(DEV && checkDebug()){
								visitbetafp += `<br>#${id}: ${mapID.x}/${mapID.y} ${forgePoints}FP Total: ${visitForgePoints}FP ${helper.fGBname(mapID.cityentity_id)}`;
								// console.debug(CityEntityDefs[mapID.cityentity_id].name,entity,mapID);
							}
						}
						if(totalboost){
							if(DEV && checkDebug()){
								visitbetaad += `<br>#${id}: ${mapID.x}/${mapID.y} ${totalboost}% ${visitAttack}/${visitDefense}/${visitCityAttack}/${visitCityDefense} ${helper.fGBname(mapID.cityentity_id)}`;
										// console.debug(CityEntityDefs[mapID.cityentity_id].name,entity,mapID);
							}
						}
					}

				}
				else{
					// console.debug(mapID.cityentity_id,CityEntityDefs[mapID.cityentity_id]);
				}
				
				if(mapID.state.current_product)
				{
					forgePoints = 0;
					// console.debug(CityEntityDefs[mapID.cityentity_id].name,mapID.state.current_product);
					if(mapID.state.current_product.product){
						if(mapID.state.current_product.product.resources)
						{
							if(mapID.state.current_product.product.resources.strategy_points){
								forgePoints = mapID.state.current_product.product.resources.strategy_points;
								visitForgePoints += forgePoints;
								if(DEV && checkDebug()){
									// console.debug(CityEntityDefs[mapID.cityentity_id].name,mapID.state.current_product);
									visitbetafp += `<br>#${id}: ${forgePoints}FP Total: ${visitForgePoints}FP ${helper.fGBname(mapID.cityentity_id)}`;
								}
							}
							// if(mapID.state.current_product.product.resources.money)
							// 	Coins += mapID.state.current_product.product.resources.money;
						}
					}
					
					if(mapID.state.current_product.goods)
					{
						// console.debug(mapID.state.current_product.goods);
						if(mapID.state.current_product.goods.name = 'clan_goods'){
							// console.debug(mapID);
							var goods = 0;
							var goodsHTML = '';
							for(var good = 0; good < mapID.state.current_product.goods.length; good++){
								// console.debug(mapID.state.current_product.goods[good]);
								goods += mapID.state.current_product.goods[good].value;
								goodsHTML += '<br>' + mapID.state.current_product.goods[good].good_id + ': ' + mapID.state.current_product.goods[good].value;

                                if(goodsList[`${mapID.state.current_product.goods[good].good_id}`])
                                    goodsList[`${mapID.state.current_product.goods[good].good_id}`] += mapID.state.current_product.goods[good].value;
                                else
                                    goodsList[`${mapID.state.current_product.goods[good].good_id}`] = mapID.state.current_product.goods[good].value;

							}
							clanGoods += goods;
							clanGoodsHTML += helper.fGBname(mapID.cityentity_id) + ': ' + goods + '<br>';
							fGoodsTally(msg.responseData.other_player_era,goods);


							if(DEV && checkDebug()){
								// console.debug(CityEntityDefs[mapID.cityentity_id].name,mapID.state.current_product);
								visitbetagoods += `<br>#${id}: ${goods} ${helper.fGBname(mapID.cityentity_id)}`;
							}
					}
						// if(mapID.state.current_product.product.resources.money)
						// 	Coins += mapID.state.current_product.product.resources.money;
					}
				}
				
				if(mapID.bonus)
				{
					if(mapID.bonus.type == "contribution_boost")
						visitArcBonus = mapID.bonus.value;
					// if(mapID.bonus.type == "money_boost")
					// 	CoinBoost += mapID.bonus.value;
					if(mapID.bonus.type == "military_boost"){
						// += mapID.bonus.value;
						visitDefense += mapID.bonus.value;
						visitAttack += mapID.bonus.value;
						// console.debug(mapID);
						// debug.innerHTML += `<p>${CityEntityDefs[mapID.cityentity_id]} ${mapID.bonus.value}</p>`;
					}
					if(mapID.bonus.type == "fierce_resistance"){
						// += mapID.bonus.value;
						visitCityDefense += mapID.bonus.value;
						visitCityAttack += mapID.bonus.value;
						// console.debug(mapID);
						// debug.innerHTML += `<p>${mapID.bonus.value}</p>`;
					}
					if(mapID.bonus.type == "advanced_tactics"){
						// += mapID.bonus.value;
						visitDefense += mapID.bonus.value;
						visitAttack += mapID.bonus.value;
						visitCityDefense += mapID.bonus.value;
						visitCityAttack += mapID.bonus.value;
						// console.debug(mapID);
						// debug.innerHTML += `<p>${mapID.bonus.value}</p>`;
					}
					if(DEV && checkDebug() && (mapID.bonus.type == "military_boost" || mapID.bonus.type == "fierce_resistance" || mapID.bonus.type == "advanced_tactics")){
						visitbetaad += `<br>#${id}: ${mapID.bonus.value}% ${visitAttack}/${visitDefense}/${visitCityAttack}/${visitCityDefense} ${helper.fGBname(mapID.cityentity_id)}`;
								// console.debug(CityEntityDefs[mapID.cityentity_id].name,entity,mapID);
					}
				}
		});

		// console.debug(motivated,notmotivated,canBeMotivated,canBePolished);
	}
	// if(msg.responseData.armies[2].units[0].bonuses.length) {
	// 	var att = msg.responseData.armies[2].units[0];
	// 	for(var id = 0; id < att.bonuses.length; id++) {
	// 		if(att.bonuses[id].type == "attack_boost" || att.bonuses[id].type == "military_boost" || att.bonuses[id].type == "advanced_tactics")
	// 			Attack += att.bonuses[id].value;
	// 	}
    // }
    var player = msg.responseData.other_player;
	var html = '';
	setPlayerName(player.name,player.player_id);
	// MyInfo.id = msg.responseData.user_data.player_id;
	// MyInfo.guild = msg.responseData.user_data.clan_name;
	// console.debug('user :', MyInfo.id,MyInfo.name,MyInfo.guild);
	
	// if (users.checkGC())
	visitstatsHTML = `<div  role="alert">
	<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>
	<p href="#visitstatsText" data-toggle="collapse"><a href="https://foe.scoredb.io/${GameOrigin}/Player/${PlayerID}" target="_blank"><strong>${PlayerName}</strong></a> (${player.clan && player.clan.name ? player.clan.name : 'NO GUILD'})</p>`;

	if(googleSheetAPI && MyInfo.guild == player.clan.name) {
		visitstatsHTML += `<button type="button" class="badge badge-pill badge-dark right-button" id="guildPostID">Guild</button>`;
	}

	

	visitstatsHTML += '<div id="visitstatsText" class="collapse show">';
	// else
	// visitstatsHTML = `<div class="alert alert-warning"><p><strong>${MyInfo.name}</strong> ${MyInfo.id}<br>`;

	// console.debug(player.name,player.player_id,friends,CityProtections);

	html += checkInactivePlunder(hoodlist);
	if(html == '')	html += checkInactivePlunder(friends);		
	if(html == '')	html += checkInactivePlunder(guildMembers);
	visitstatsHTML += html;
	if(CityProtections.length){
		var match = false;
		CityProtections.forEach(city =>  {
			// console.debug(city);
			if(player.player_id == city.playerId && city.expireTime > 0){
				match = true;
				var finish = new Date(city.expireTime);
				var diffText ='';
				finish -= Date.now()/1000;
				var diff = Math.abs(finish);
				// console.debug(city,finish,diff,Date.now()/1000);
				// calculate (and subtract) whole days
				var days = Math.floor(diff / 86400);
				if (days) diffText += `${days} ${days > 1 ? 'Days' : 'Day'} `;

				// get hours        
				var hours = Math.floor(diff / 3600) % 24;        
				// document.write("<br>Difference (Hours): "+hours);  
				if(hours) diffText += `${hours}hr `;
				
				// get minutes
				var minutes = Math.floor(diff / 60) % 60;
				// document.write("<br>Difference (Minutes): "+minutes);  
				if(!days && minutes) diffText += `${minutes}min `;
			
				// get seconds
				var seconds = Math.floor(diff) % 60;
				// document.write("<br>Difference (Seconds): "+seconds);  
				if(!days && !hours && seconds) diffText += `${seconds}sec`;
				visitstatsHTML += `<span class='red'>*** <span data-i18n="shield">SHIELD</span> ***</span> ${diffText}<br>`;
			}
			// else
				// friendsHTML += `<tr><td>${entry.name}</td></tr>`;
			// console.debug(city.playerId,entry.player_id);
		})
	}

	console.debug(goodsList);
	// Object.keys(goodsList).forEach(good => {
	// 	var rssName;
	// 	ResourceDefs.forEach(resource => {
	// 		// console.debug(resource.name,resource,good,goodsList[good]);
	// 		// citystatsHTML += `${resource.id} ${resource.name}<br>`
	// 		if(resource.id === good){
	// 			// console.debug(resource.name,good,goodsList[good]);
	// 			rssName = resource.name;
	// 			helper.fGoodsTally(resource.era,goodsList[good]);
	// 			if(!tooltipHTML[resource.era]) tooltipHTML[resource.era] = '';
	// 			tooltipHTML[resource.era] += `${goodsList[good]} ${rssName}<br>`;
	// 		}
	// 	});

	if(Goods.sajm) clanGoodsHTML += `SAJM:${Goods.sajm}<br>`;	
	if(Goods.sav) clanGoodsHTML += `SAV:${Goods.sav}<br>`;	
		if(Goods.saab) clanGoodsHTML += `SAAB:${Goods.saab}<br>`;
		if(Goods.sam) clanGoodsHTML += `SAM:${Goods.sam}<br>`;	
		if(Goods.vf) clanGoodsHTML += `VF:${Goods.vf}<br>`;	
		if(Goods.of) clanGoodsHTML += `OF:${Goods.of}<br>`;	
		if(Goods.af) clanGoodsHTML += `AF:${Goods.af}<br>`;	
		if(Goods.tf) clanGoodsHTML += `FE:${Goods.tf}<br>`;	
		if(Goods.te) clanGoodsHTML += `TE:${Goods.te}<br>`;	
		if(Goods.ce) clanGoodsHTML += `CE:${Goods.ce}<br>`;	
		if(Goods.pme) clanGoodsHTML += `PME:${Goods.pme}<br>`;	
		if(Goods.me) clanGoodsHTML += `ME:${Goods.me}<br>`;	
		if(Goods.pe) clanGoodsHTML += `PE:${Goods.pe}<br>`;	
		if(Goods.ina) clanGoodsHTML += `IndA:${Goods.ina}<br>`;	
		if(Goods.cma) clanGoodsHTML += `CA:${Goods.cma}<br>`;	
		if(Goods.lma) clanGoodsHTML += `LMA:${Goods.lma}<br>`;	
		if(Goods.hma) clanGoodsHTML += `HMA:${Goods.hma}<br>`;	
		if(Goods.ema) clanGoodsHTML += `EMA:${Goods.ema}<br>`;	
		if(Goods.ia) clanGoodsHTML += `IA:${Goods.ia}<br>`;	
		if(Goods.ba) clanGoodsHTML += `>BA:${Goods.ba}`;
	

	visitstatsHTML += `Age: ${msg.responseData.other_player_era.match(/[A-Z][a-z]+|[0-9]+/g).join(" ")}<br>`;
	visitstatsHTML += `Score: ${player.score > 1000000 ? BigNumber(player.score).div(1000000).toFormat(0) + 'M' : player.score} <br>`;
	visitstatsHTML += `<span data-i18n="daily">Daily</span> FP: ${visitForgePoints ? visitForgePoints : 0} <br>`;
	if(visitArcBonus)
		visitstatsHTML += `${fArcname()} <span data-i18n="bonus">Bonus</span>: ${visitArcBonus}%<br>`;
	if(visitPenal)
		visitstatsHTML += `<span data-i18n="army">Army Units</span>: ${visitPenal}<br>`;
	visitstatsHTML += `<span data-i18n="attackers">Attackers</span>: ${visitAttack}% Att, ${visitDefense}% Def<br>`;
	visitstatsHTML += `<span data-i18n="defenders">Defenders</span>: ${visitCityAttack}% Att, ${visitCityDefense}% Def<br>`;
	if(clanGoods)
		visitstatsHTML += `<span id="guildgoods" data-html="true" title="${clanGoodsHTML}" data-i18n="guildgoods">Guild Goods</span>: ${clanGoods}<br>`;
	if(clanBuildings)
		visitstatsHTML += `<span data-i18n="guildpower">Guild Power</span>: ${clanPower} ${clanSOHcount ? clanSOHcount + ` <span data-i18n="soh">SoH/TGE</span>` : ''}  ${clanHOFcount ? clanHOFcount + ` <span data-i18n="hof">HoF</span>` : ''}  <br>`;
	// if(clanHOFcount)
	// 	visitstatsHTML += `<br>`;
	// if(clanSOHcount)
	// 	visitstatsHTML += `<br>`;

	if (showOptions.showStats){
        var visitstats = document.getElementById("visit");
		if(visitstats == null){
            visitstats = document.createElement('div');
			document.getElementById("content").appendChild(visitstats);
			visitstats.id="visit";
		}
		// console.debug(plunderList.length,plunderList);
		
		
		visitstats.innerHTML = visitstatsHTML + `</div></div>`;
		visitstats.className = "alert alert-dark alert-dismissible show collapsed";
		// console.debug('clanGoodsHTML',clanGoodsHTML);
		$('body').i18n();
		$('#guildgoods').tooltip({
			content: function(){
				var element = $( this );
				return element.attr('title')
			}
		});

		if(DEV && checkDebug()){
			beta.innerHTML = `<div><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><h6>BETA</h6><div class='overflow'>` + visitbetafp + visitbetaad + visitbetagoods + visitbetapower + '</div></div>';
			beta.className = 'alert alert-dismissible alert-success';
		}

		visitData.push({
			'Name':PlayerName,
			'Guild': player.clan.name,
			'Age':helper.fGVGagesname(msg.responseData.other_player_era),
			'AgeNo':helper.fLevelfromAge(msg.responseData.other_player_era),
			'Points':player.score,
			'ARC':visitArcLevel,
			'TRAZ':visitTrazLevel,
			'OBS':visitObsLevel,
			'Att':visitAttack,
			'Def':visitDefense,
			'CityAtt':visitCityAttack,
			'CityDef':visitCityDefense,
			'FP':visitForgePoints,
			'HoF':clanHOFcount,
			'SoH':clanSOHcount,
			'Power':clanPower,
			'Goods':clanGoods,
			'GoodsByAge':Goods,
			'CdM':visitCdMLevel,
			'CAPE':visitCAPELevel,
			'CoA':visitCoALevel,
			'Zeus':visitZeusLevel,
			'INNO':visitINNOLevel,
			'AO':visitAOLevel,
			'HS':visitHSLevel,
			'Kraken':visitKrakenLevel,
			'Terra':visitTerraLevel,
			'CF':visitCFLevel,
			'HC':visitHCLevel,
			'SC':visitSCLevel,
			'AI':visitAILevel,
			'ATOM':visitAtomLevel,
			'TOR':visitToRLevel
		}); 
		// console.debug(visitData);
		if(googleSheetAPI) {
			document.getElementById("guildPostID").addEventListener("click", () => post_webstore.postPlayerToSS(visitData));
		}
}
	// console.debug('showStats:',showOptions.showStats);

}


export function otherPlayerServiceUpdateActions(msg){

	    console.debug(msg);

    // if(!users.checkGuild() && msg.responseData.socialbar_list.length){
		if(msg.friends.length){

			  friends = msg.friends;
			  guildMembers = msg.guildMembers;
			  hoodlist = msg.neighbours;

			// console.debug(friends);
			// var type = friends[0].__class__;
			// var title ='';
			// if(type == 'ClanMember' && showOptions.] == true)
				// title = 'Guild Members';
			// else if(type == 'Player' && showOptions.showHood == true)
				// title = 'Hood List';
			// else if(type == 'Friend' && showOptions.showFriends == true)
				// title = 'Friends List';
			// else 
				// title = '???';
				// console.debug(title,friends);
				// <svg id="friendsicon" href="#friendsText" data-toggle="collapse" class="alert-success bi header-icon" width="22" height="10">
				// <svg id="friendsicon" href="#friendsText" data-toggle="collapse" class="bi bi-tools text-success" width="22" height="10" xmlns="http://www.w3.org/2000/svg">
				//     <img href="${!collapse.collapseFriends ? dash : plus}" width="22" height="10"></img>
				// </svg>
				// <svg width="22" height="10"><img class="bi header-icon" src="${!collapse.collapseFriends ? dash : plus}"></svg>
				// <svg width="20" height="20">       
				//    <image class="alert-success bi header-icon" xlink:href="${!collapse.collapseFriends ? dash : plus}" width="20" height="20"/>    
				// </svg>
			
			if(showOptions.showGuild || showOptions.showHood || showOptions.showFriends)
			{
				friendsHTML = `<div class="alert alert-success alert-dismissible show collapsed" role="alert"><p id="listTextLabel" href="#listsText" data-toggle="collapse">
				<svg class="bi header-icon" id="listsicon" href="#listsText" data-toggle="collapse" fill="currentColor" width="12" height="16"><use xlink:href="${icons}#${collapse.collapseLists ? 'plus' : 'dash'}-circle"/></svg>
				<strong>Lists:</strong></p>
				<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>
				<div id="listsText" class="collapse ${collapse.collapseLists ? '' : 'show'} resize">`;
				
				if(showOptions.showFriends)
				{				
					console.debug(collapse.collapseFriends);
					friendsHTML += `<div class="alert alert-success show collapsed nopadding" role="alert"><p id="friendsTextLabel" href="#friendsText" data-toggle="collapse">
					<svg class="bi header-icon" id="friendsicon" href="#friendsText" data-toggle="collapse" fill="currentColor" width="12" height="16"><use xlink:href="${icons}#${collapse.collapseFriends ? 'plus' : 'dash'}-circle"/></svg>
					<strong>Friends</strong></p>`;
					friendsHTML += `<div id="friendsCopy"><button type="button" class="badge badge-pill badge-success right-button" id="friendsCopyID" style="display: ${collapse.collapseFriends ? 'none' : 'block'}"><span data-i18n="copy">Copy</span></button></div>`;
					friendsHTML += `<div id="friendsText" class="collapse ${collapse.collapseFriends ? '' : 'show'}"><table id="friendsText2">`;
					friendsHTML += getFriendsHTML(friends);
					friendsHTML += `</table></div></div>`;
				}
				if(showOptions.showGuild)
				{				
					friendsHTML += `<div class="alert alert-success show collapsed nopadding" role="alert"><p id="guildTextLabel" href="#guildText" data-toggle="collapse">
					<svg class="bi header-icon" id="guildicon" href="#guildText" data-toggle="collapse" fill="currentColor" width="12" height="16"><use xlink:href="${icons}#${collapse.collapseGuild ? 'plus' : 'dash'}-circle"/></svg>
					<strong>Guild</strong></p>`;
					friendsHTML += `<div id="guildCopy"><button type="button" class="badge badge-pill badge-success right-button" id="guildCopyID" style="display: ${collapse.collapseGuild ? 'none' : 'block'}"><span data-i18n="copy">Copy</span></button></div>`;
					friendsHTML += `<div id="guildText" class="collapse ${collapse.collapseGuild ? '' : 'show'}"><table id="guildText2">`;
					friendsHTML += getFriendsHTML(guildMembers);
					friendsHTML += `</table></div></div>`;
				}
				if(showOptions.showHood)
				{
					friendsHTML += `<div class="alert alert-success show collapsed nopadding" role="alert"><p id="hoodTextLabel" href="#hoodText" data-toggle="collapse">
					<svg class="bi header-icon" id="hoodicon" href="#hoodText" data-toggle="collapse" fill="currentColor" width="12" height="16"><use xlink:href="${icons}#${collapse.collapseHood ? 'plus' : 'dash'}-circle"/></svg>
					<strong>Hood</strong></p>
					<div id="hoodCopy"><button type="button" class="badge badge-pill badge-success right-button" id="hoodCopyID" style="display: ${collapse.collapseHood ? 'none' : 'block'}"><span data-i18n="copy">Copy</span></button></div>`;
					friendsHTML += `<div id="hoodText" class="collapse ${collapse.collapseHood ? '' : 'show'}"><table id="hoodText2">`;
				friendsHTML += getFriendsHTML(hoodlist);
				friendsHTML += `</table></div></div></div></div>`;
				}
				if(showOptions.showGuild || showOptions.showHood || showOptions.showFriends)
				{				
					var friendsID = document.getElementById("friends");
					friendsID.innerHTML = friendsHTML;
					// console.debug(friendsHTML);
					const  friendsDiv = document.getElementById("friendsText");
					// console.debug(friendsDiv.offsetHeight,toolOptions.friendsSize);
					if(friendsDiv.offsetHeight > toolOptions.friendsSize){
						friendsDiv.style.height = toolOptions.friendsSize+'px';
						// console.debug(friendsDiv.offsetHeight,toolOptions.friendsSize);
					}
					if (showOptions.showFriends){
						document.getElementById("friendsCopyID").addEventListener("click", copy.fFriendsCopy);
						document.getElementById("friendsTextLabel").addEventListener("click", collapse.fCollapseFriends);
					}
					if (showOptions.showGuild){
						document.getElementById("guildCopyID").addEventListener("click", copy.fGuildCopy);
						document.getElementById("guildTextLabel").addEventListener("click", collapse.fCollapseGuild);
					}
					if (showOptions.showHood){
						document.getElementById("hoodCopyID").addEventListener("click", copy.fHoodCopy);
						document.getElementById("hoodTextLabel").addEventListener("click", collapse.fCollapseHood);
					}
					document.getElementById("listTextLabel").addEventListener("click", collapse.fCollapseLists);
					const resizeObserver = new ResizeObserver(entries => {
						for (const entry of entries) {
							if (entry.contentRect && entry.contentRect.height) {
								setFriendsSize(entry.contentRect.height);
						} 
						}
					});
					resizeObserver.observe(friendsDiv);
				}			
}
		}
	
	
}

function getFriendsHTML(list){
	var htmlFriends = "";
	list.forEach( entry => {
		var html = "";
		// console.debug(entry);
		if(entry.hasOwnProperty("is_self") && entry.__class__ != "ClanMember")
		{
			// do nothing
			console.debug(entry);
		}
		// else if(entry.is_friend == true && entry.accepted != true){
			//     // SELF
			//     // html += `<tr><td>${entry.name}</td><td>PENDING</td></tr>`;
			//     console.debug(entry);
			// }
			// else if(type == 'Friend' && entry.is_friend != true && entry.accepted != true){
		else if(entry.is_friend == false && entry.accepted == false){
			// friends not ACCEPTED yet
			// html += `<tr><td>${entry.name}</td><td>PENDING</td></tr>`;
			// console.debug(entry);
		}
		else if(entry.hasOwnProperty("canSabotage")){
			html += `<tr><td>${entry.name}</td><td>Plunder</td></tr>`;
			// console.debug("canSabotage",entry);
		}
		else if(entry.hasOwnProperty("is_neighbor")){
			// console.debug("is_neighbor",entry);
			if(CityProtections.length){
				var match = false;
				CityProtections.forEach(city =>  {
					// console.debug(city);
					if(city.playerId == entry.player_id && city.expireTime > 0){
						match = true;
						var finish = new Date(city.expireTime);
						var diffText ='';
						finish -= Date.now()/1000;
						var diff = Math.abs(finish);
						// console.debug(start,finish,diff,Date.now()/1000);
						// calculate (and subtract) whole days
						var days = Math.floor(diff / 86400);
						if (days) diffText += `${days} ${days > 1 ? 'Days' : 'Day'} `;
						
						// get hours        
						var hours = Math.floor(diff / 3600) % 24;        
						// document.write("<br>Difference (Hours): "+hours);  
						diffText += `${hours}:`;
						
						// get minutes
						var minutes = Math.floor(diff / 60) % 60;
						// document.write("<br>Difference (Minutes): "+minutes);  
						if(!days) diffText += `${minutes}:`;
						
						// get seconds
						var seconds = Math.floor(diff) % 60;
						// document.write("<br>Difference (Seconds): "+seconds);  
						if(!days && !hours) diffText += `${seconds}`;
						html += `<tr><td>${entry.name}</td><td><span data-i18n="shield">Shield</span>: ${diffText}</td></tr>`;
					}
					// else
					// html += `<tr><td>${entry.name}</td></tr>`;
					// console.debug(city.playerId,entry.player_id);
				})
				if(!match)	 html += `<tr><td>${entry.name}</td></tr>`;
			}
			else 
			html += `<tr><td>${entry.name}</td></tr>`;
		}									
		else if(!entry.hasOwnProperty('is_active')){
			html += `<tr><td>${entry.name}</td><td>INACTIVE</td></tr>`;
			// console.debug(entry);
		}
		else if(entry.hasOwnProperty("is_friend") || entry.hasOwnProperty("is_guild_member")){
				html += `<tr><td>${entry.name}</td></tr>`;
				// console.debug(entry);
			}
		else 
				console.debug(entry,html);
		// if(entry.is_self == true && type == 'ClanMember'){
		// 	setMyGuildPosition(entry.rank);
		// 	// console.debug('MyInfo.guildPosition',entry.rank);
		// }
		htmlFriends += html;
	});
	return htmlFriends;
}

function fBoost(boost){
    // console.debug(boost);
    if(boost.type == "att_boost_attacker"){
        visitAttack += boost.value;
        // console.debug('visitAttack:', visitAttack, boost.value);
        // debug.innerHTML += ` ${boost.value}</p>`;
    }
    else if(boost.type == "att_boost_defender"){
        visitCityAttack += boost.value;
        // console.debug('CityAttack:', CityAttack, boost[j].value);
    }
    else if(boost.type == "def_boost_attacker"){
        visitDefense += boost.value;
        // console.debug('Defense:', Defense, boost[j].value);
    }
    else if(boost.type == "def_boost_defender"){
        visitCityDefense += boost.value;
        // console.debug('visitCityDefense:', visitCityDefense, boost.value);
        // debug.innerHTML += ` ${boost.value}</p>`;
    }
    // else if(boost.type == "att_def_boost_attacker"){
    //     visitAttack += boost.value;
    //     visitDefense += boost.value;
    //     // console.debug('CityAttack:', CityAttack, boost[j].value);
    // }
    // else if(boost.type == "att_def_boost_defender"){
    //     visitCityAttack += boost.value;
    //     visitCityDefense += boost.value;
    //     // console.debug('CityAttack:', CityAttack, boost[j].value);
    // }
	else if(boost.type != "coin_production" && boost.type != "happiness_amount" && boost.type != "city_shield" && boost.type != "life_support" && boost.type != "supply_production" && boost.type != "tavern_visit_silver_drop" && boost.type != "tavern_silver_collect_bonus" && boost.type != "tavern_visit_fp_drop" && boost.type != "construction_time"){
		console.debug('other:', boost.type);
	}
    return boost.value;
}

function fGoodsTally(age,good){
    // console.debug(age,good);
        if (age == "BronzeAge") Goods.ba += good;
        else if (age == "IronAge") Goods.ia += good;
        else if (age == "EarlyMiddleAge") Goods.ema += good;
        else if (age == "HighMiddleAge") Goods.hma += good;
        else if (age == "LateMiddleAge") Goods.lma += good;
        else if (age == "ColonialAge") Goods.cma += good;
        else if (age == "IndustrialAge") Goods.ina += good;
        else if (age == "ProgressiveEra") Goods.pe += good;
        else if (age == "ModernEra") Goods.me += good;
        else if (age == "PostModernEra") Goods.pme += good;
        else if (age == "ContemporaryEra") Goods.ce += good;
        else if (age == "TomorrowEra") Goods.te += good;
        else if (age == "FutureEra") Goods.tf += good;
        else if (age == "ArcticFuture") Goods.af += good;
        else if (age == "OceanicFuture") Goods.of += good;
        else if (age == "VirtualFuture") Goods.vf += good;
        else if (age == "SpaceAgeMars") Goods.sam += good;
        else if (age == "SpaceAgeAsteroidBelt") Goods.saab += good;
        else if (age == "SpaceAgeVenus") Goods.sav += good;
        else if (age == "SpaceAgeJupiterMoon") Goods.sajm += good;
        else if (age == "NoAge") Goods.noage += good;
        else console.debug(age,good);
    }

	function checkInactivePlunder(friends){
		var html = '';
		friends.forEach(entry => {
			if(PlayerID == entry.player_id && entry.is_active != true)
			html += `<span class='red'>*** <span data-i18n="inactive">INACTIVE</span> ***</span><br>`;
			if(PlayerID == entry.player_id && entry.canSabotage == true)
			html += `<span class='red'>*** <span data-i18n="plunder">PLUNDER</span> ***</span><br>`;
		});
		return html;
	}