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
import "@wikimedia/jquery.i18n/libs/CLDRPluralRuleParser/src/CLDRPluralRuleParser.js"
import "@wikimedia/jquery.i18n/src/jquery.i18n";
import "@wikimedia/jquery.i18n/src/jquery.i18n.messagestore.js";
import "@wikimedia/jquery.i18n/src/jquery.i18n.fallbacks.js";
import "@wikimedia/jquery.i18n/src/jquery.i18n.parser.js";
import "@wikimedia/jquery.i18n/src/jquery.i18n.emitter.js";
import "@wikimedia/jquery.i18n/src/jquery.i18n.language.js";
import BigNumber from "bignumber.js";

// import 'bootstrap';
import { Tooltip, Alert, Popover } from 'bootstrap';
import icons from 'bootstrap-icons/bootstrap-icons.svg';


// import icons from 'bootstrap-icons/bootstrap-icons.svg';
import { setMyInfo, MyInfo, GameOrigin, EpocTime, debugEnabled, checkDebug, removeDebug, ignoredPlayers } from '../index.js';
import { availablePacksFP, CityEntityDefs, Goods, language } from '../index.js';
import { ResourceDefs, availableFP } from './ResourceService.js';
import * as helper from '../fn/helper.js';
import * as collapse from '../fn/collapse.js';
import * as copy from '../fn/copy.js';
import * as element from '../fn/AddElement';
import { showOptions } from '../vars/showOptions.js';
import { clearArmyUnits } from './ArmyUnitManagementService.js';

export var City = {
    ArcBonus: 90,
    ChatBonus: 0,
    ForgePoints: 0,
    TrazUnits: 0,
    Coins: 0,
    CoinBoost: 0,
    SupplyBoost: 0,
    Attack: 0,
    Defense: 0,
    CityAttack: 0,
    CityDefense: 0,
    SoH: 0,
    tGE: 0
};

var tooltipHTML = {
    goods: [],
    totalGoods: [],
    fp: [],
    clanGoods: [],
    clanPower: [],
    SoH: [],
    tGE: []
};

export var Galaxy = {
    html: '',
    bonus: [],
    amount: 0
};

var buildingsReady = [];
var fpBuildings = [];
var goodsBuildings = [];
var clanGoodsBuildings = [];

export function startupService(msg) {
    // console.debug('parsed:', parsed);
    // console.debug('msg:', msg);
    const user = msg.responseData.user_data;
    console.debug('user_data:', user);
    // setMyName(user.user_name);
    // setMyInfo.id(user.player_id);
    // setMyGuild(user.clan_name);
    // setMyGuildID(user.clan_id);
    setMyInfo(user.user_name,
        user.player_id,
        user.clan_name,
        user.clan_id,
        user.createdAt,
        user.era);
    helper.setMyGuildPermissions(user.clan_permissions);
    clearArmyUnits();
    Galaxy.bonus = [];
    buildingsReady = [];
    fpBuildings = [];
    goodsBuildings = [];
    clanGoodsBuildings = [];

    console.debug('window', window);

    console.debug('user :', MyInfo);
    if (language != "auto") {
        $.i18n({
            locale: language
        });
    }
    console.debug(language, $.i18n().locale, $.i18n.debug);

    // console.log('checkBeta:', users.checkBeta());
    if (DEV) {
        var beta = document.getElementById("beta");
        if (beta == null) {
            // console.log('2');
            beta = document.createElement('div');
            document.getElementById("content").appendChild(beta);
            beta.id = 'beta';
            // beta.className = 'alert alert-dismissible alert-success';
        }
    } else {
        removeDebug();
    }
    var diamonds = 0;
    var clanPower = 0;
    var clanGoods = 0;
    var totalGoods = 0;
    var goodsList = [];
    var goodsHTML = '';
    var citystatsHTML = ``;
    tooltipHTML.goods = [];
    // Galaxy.html = '';
    // Galaxy.amount = 0;

    if (msg.responseData.city_map.entities.length) {
        var map_entities = msg.responseData.city_map.entities;
        console.debug(map_entities, CityEntityDefs);
        for (var id = 0; id < map_entities.length; id++) {
            const mapID = map_entities[id];
            // if (DEV && checkDebug()) {
            //     if (CityEntityDefs[mapID.cityentity_id])
            //         console.debug(CityEntityDefs[mapID.cityentity_id].name, CityEntityDefs[mapID.cityentity_id], mapID,);
            //     else
            //         console.debug(mapID);
            // }
            // console.debug(mapID.cityentity_id,mapID,);
            var forgePoints = 0;
            var found = null; // this IS used
            // console.debug('mapID: ', mapID);

            if (mapID.cityentity_id.substring(0, 10) == "W_MultiAge"){
                console.info(mapID.name, mapID);
            }
                   
            if (mapID.cityentity_id.substring(0, 24) == "R_MultiAge_SummerBonus20"
                || mapID.cityentity_id.substring(0, 27) == "R_MultiAge_CulturalBuilding") {
                // console.debug(mapID);
                if (CityEntityDefs[mapID.cityentity_id]) {
                    const entity = CityEntityDefs[mapID.cityentity_id];
                    // console.debug(entity.name, entity);
                    // if(mapID.state.is_motivated)
                    // SOKmot++;
                    if (entity && entity.abilities && entity.abilities.find(id => id.__class__ == 'RandomUnitOfAgeWhenMotivatedAbility')) {
                        City.TrazUnits += entity.abilities.find(id => id.__class__ == 'RandomUnitOfAgeWhenMotivatedAbility').amount;
                        // console.debug(entity.name, entity.abilities.find(id => id.__class__ == 'RandomUnitOfAgeWhenMotivatedAbility').amount);
                    }
                    if (entity && entity.abilities && entity.abilities.find(id => id.__class__ == 'AddResourcesToGuildTreasuryAbility')) {
                        // clanGoods += entity.abilities.find(id => id.__class__ == 'AddResourcesToGuildTreasuryAbility').additionalResources['AllAge'].resources.all_goods_of_age;
                        // clanGoodsBuildings.push({'name': helper.fEntityNameTrim(mapID.cityentity_id),'goods': entity.abilities.find(id => id.__class__ == 'AddResourcesToGuildTreasuryAbility').additionalResources['AllAge'].resources.all_goods_of_age});
                        // console.debug(entity.name, entity.abilities.find(id => id.__class__ == 'AddResourcesToGuildTreasuryAbility').additionalResources['AllAge'].resources.all_goods_of_age);
                    }
                }
            }
            else if (mapID.cityentity_id == "X_OceanicFuture_Landmark3") {
                // if(mapID.bonus)
                //     Galaxy.amount = mapID.bonus.amount;
                console.debug('Galaxy.amount', mapID);
            }

            if (mapID.state.hasOwnProperty('next_state_transition_at')) {
                buildingsReady.push({ 'name': helper.fEntityNameTrim(mapID.cityentity_id), 'ready': mapID.state.next_state_transition_at });
                // console.debug(CityEntityDefs[mapID.cityentity_id].name, mapID,);
            }

            if (mapID.state.current_product) {
                if (DEV && checkDebug()) {
                    if (CityEntityDefs[mapID.cityentity_id])
                        console.debug(CityEntityDefs[mapID.cityentity_id].name, mapID.state.current_product.name, mapID);
                    else
                        console.debug(mapID.cityentity_id, mapID.state.current_product.name, mapID);
                }
                if (mapID.state.current_product.guildProduct) {
                    // if(CityEntityDefs[mapID.cityentity_id])
                    //     console.debug(CityEntityDefs[mapID.cityentity_id].name, mapID.state.current_product.name,mapID);
                    // else
                    //     console.debug(mapID.cityentity_id, mapID.state.current_product.name,mapID);
                    if (mapID.state.current_product.guildProduct.resources) {
                        var goods = 0;
                        var era = '';
                        Object.keys(mapID.state.current_product.guildProduct.resources).forEach(entry => {
                            if (entry != "clan_power") {
                                if (DEV && checkDebug()) console.debug(mapID.state.current_product.guildProduct.resources[entry], entry);
                                ResourceDefs.forEach(resource => { if (resource.id === entry) { era = resource.era; } });
                                goods += mapID.state.current_product.guildProduct.resources[entry];
                            }
                        });
                        if (goods > 0) {
                            clanGoods += goods;
                            clanGoodsBuildings.push({ 'name': helper.fEntityNameTrim(mapID.cityentity_id) + " " + helper.fGVGagesname(era), 'goods': goods });
                            if (DEV && checkDebug()) console.debug(helper.fEntityNameTrim(mapID.cityentity_id), mapID, goods, era);
                        }
                        else {
                            if (DEV && checkDebug()) console.debug(helper.fEntityNameTrim(mapID.cityentity_id), mapID);
                        }
                        // console.debug(mapID.state.current_product.guildProduct.resources,mapID.state.current_product.guildProduct.resources.clan_power);
                        if (mapID.state.current_product.guildProduct.resources.clan_power)
                            clanPower += mapID.state.current_product.guildProduct.resources.clan_power;
                        // console.debug('clanPower: ', clanPower);
                    }
                }
                if (mapID.state.current_product.goods) {
                    if (DEV && checkDebug()) console.debug(mapID.state.current_product.goods);
                    if (mapID.state.current_product.goods.name = 'clan_goods') {
                        // console.debug(mapID);
                        var goods = 0;
                        for (var good = 0; good < mapID.state.current_product.goods.length; good++) {
                            // console.debug(mapID.state.current_product.goods[good]);
                            goods += mapID.state.current_product.goods[good].value;
                        }
                        if (goods > 0) {
                            clanGoods += goods;
                            clanGoodsBuildings.push({ 'name': helper.fEntityNameTrim(mapID.cityentity_id) + " " + helper.fGVGagesname(MyInfo.era), 'goods': goods });
                            if (DEV && checkDebug()) console.debug(helper.fEntityNameTrim(mapID.cityentity_id), mapID, goods);
                        }
                        else {
                            if (DEV && checkDebug()) console.debug(helper.fEntityNameTrim(mapID.cityentity_id), mapID);
                        }
                        if (DEV && checkDebug()) {
                            if (CityEntityDefs[mapID.cityentity_id])
                                console.debug(CityEntityDefs[mapID.cityentity_id].name, goods, mapID.state.current_product);
                            else
                                console.debug(goods, mapID.state.current_product);
                            // visitbetagoods += `<br>#${id}: ${goods} ${CityEntityDefs[mapID.cityentity_id].name}`;
                        }
                    }
                }
                if (mapID.state.current_product.product) {
                    if (mapID.state.current_product.product.resources) {
                        if (mapID.state.current_product.product.resources.premium)
                            diamonds += mapID.state.current_product.product.resources.premium;
                        if (mapID.state.current_product.product.resources.strategy_points) {
                            forgePoints += mapID.state.current_product.product.resources.strategy_points;
                            if (forgePoints > 0) {
                                City.ForgePoints += forgePoints;
                                found = true;
                                // tooltipHTML.fp += `<br>${forgePoints}FP <strong>${helper.fEntityNameTrim(mapID.cityentity_id)}</strong>`;
                                fpBuildings.push({ 'name': helper.fEntityNameTrim(mapID.cityentity_id), 'fp': forgePoints });
                                if (DEV && checkDebug()) {
                                    if (helper.fEntityNameTrim(mapID.cityentity_id)) {
                                        beta.innerHTML += `<br>#${id}: ${forgePoints}FP Total: ${City.ForgePoints}FP <strong>${helper.fEntityNameTrim(mapID.cityentity_id)}</strong>`;
                                    } else {
                                        beta.innerHTML += `<br>#${id}: ${mapID.cityentity_id} ${forgePoints}FP Total: ${City.ForgePoints}FP`;
                                        // console.debug(mapID.cityentity_id, mapID.state.current_product.name,mapID);
                                    }
                                }
                                if (mapID.type != 'greatbuilding' && helper.fEntityNameTrim(mapID.cityentity_id)) {
                                    Galaxy.bonus.push({ 'id': mapID.cityentity_id, 'name': helper.fEntityNameTrim(mapID.cityentity_id), 'fp': mapID.state.current_product.product.resources.strategy_points });
                                }
                                // buildingsReady.push({'name': helper.fEntityNameTrim(mapID.cityentity_id),'ready': mapID.state.next_state_transition_at});
                                console.debug(CityEntityDefs[mapID.cityentity_id].name, mapID,);
                            }
                        }
                        if (mapID.state.current_product.product.resources.money)
                            City.Coins += mapID.state.current_product.product.resources.money;
                        if (mapID.state.current_product.name == "random_goods") {
                            // console.debug('random_goods: ', mapID.state.current_product.product.resources);
                            Object.keys(mapID.state.current_product.product.resources).forEach(entry => {
                                // console.debug('random_goods: ', entry,mapID.state.current_product.product.resources[entry]);
                                // randomGoods += mapID.state.current_product.product.resources[entry];
                            });
                        }
                        var goods = 0;

                        Object.keys(mapID.state.current_product.product.resources).forEach(entry => {
                            if (entry != "medals" && entry != "money" && entry != "supplies" && entry != "strategy_points" && entry != "clanPower") {
                                // totalGoods += mapID.state.current_product.product.resources[entry];
                                // console.debug(goodsList[entry],entry);
                                var entryGoods = mapID.state.current_product.product.resources[entry];
                                goods += entryGoods;
                                if (entryGoods > 0) {
                                    if (goodsList[`${entry}`])
                                        goodsList[`${entry}`] += entryGoods;
                                    else
                                        goodsList[`${entry}`] = entryGoods;
                                }

                                // if()
                                // goodsList.push([entry,mapID.state.current_product.product.resources[entry]]);
                                // goodsList.forEach(good => {
                                // 	console.debug(good,good.name,entry);
                                // 	// if(good === entry)
                                // 	entry.value
                                // });
                            }
                        });
                        if (goods > 0) {
                            goodsBuildings.push({ 'name': helper.fEntityNameTrim(mapID.cityentity_id), 'goods': goods });
                            if (DEV && checkDebug()) console.debug(helper.fEntityNameTrim(mapID.cityentity_id), goods, mapID);
                            totalGoods += goods;
                        }
                        else {
                            if (DEV && checkDebug()) console.debug(helper.fEntityNameTrim(mapID.cityentity_id), mapID);
                        }
                    }
                    // console.debug('goods: ', goodsList);
                }
                if (mapID.state.current_product.clan_power) {
                    clanPower += mapID.state.current_product.clan_power;
                    // console.debug('clanPower: ', clanPower);
                }
                if (mapID.state.current_product.asset_name == 'penal_unit') {
                    City.TrazUnits += mapID.state.current_product.amount;
                }

            }

            if (mapID.state.productionOption) {
                if (DEV && checkDebug()) {
                    if (CityEntityDefs[mapID.cityentity_id])
                        console.debug(CityEntityDefs[mapID.cityentity_id].name, mapID.state.productionOption.name, mapID);
                    else
                        console.debug(mapID.cityentity_id, mapID.state.productionOption.name, mapID);
                }
                if (mapID.state.productionOption.guildProduct) {
                    // if(CityEntityDefs[mapID.cityentity_id])
                    //     console.debug(CityEntityDefs[mapID.cityentity_id].name, mapID.state.productionOption.name,mapID);
                    // else
                    //     console.debug(mapID.cityentity_id, mapID.state.productionOption.name,mapID);
                    if (mapID.state.productionOption.guildProduct.resources) {
                        var goods = 0;
                        Object.keys(mapID.state.productionOption.guildProduct.resources).forEach(entry => {
                            if (entry != "clan_power") {
                                // console.debug(mapID.state.productionOption.guildProduct.resources[entry],entry);
                                goods += mapID.state.productionOption.guildProduct.resources[entry];
                            }
                        });
                        if (goods > 0) {
                            clanGoods += goods;
                            clanGoodsBuildings.push({ 'name': helper.fEntityNameTrim(mapID.cityentity_id), 'goods': goods });
                            if (DEV && checkDebug()) console.debug(helper.fEntityNameTrim(mapID.cityentity_id), mapID, goods);
                        }
                        else {
                            if (DEV && checkDebug()) console.debug(helper.fEntityNameTrim(mapID.cityentity_id), mapID);
                        }
                        // console.debug(mapID.state.productionOption.guildProduct.resources,mapID.state.productionOption.guildProduct.resources.clan_power);
                        if (mapID.state.productionOption.guildProduct.resources.clan_power)
                            clanPower += mapID.state.productionOption.guildProduct.resources.clan_power;
                        // console.debug('clanPower: ', clanPower);
                    }
                }
                if (mapID.state.productionOption.goods) {
                    if (DEV && checkDebug()) console.debug(mapID.state.productionOption.goods);
                    if (mapID.state.productionOption.goods.name = 'clan_goods') {
                        // console.debug(mapID);
                        var goods = 0;
                        for (var good = 0; good < mapID.state.productionOption.goods.length; good++) {
                            // console.debug(mapID.state.productionOption.goods[good]);
                            goods += mapID.state.productionOption.goods[good].value;
                        }
                        if (goods > 0) {
                            clanGoods += goods;
                            clanGoodsBuildings.push({ 'name': helper.fEntityNameTrim(mapID.cityentity_id), 'goods': goods });
                            if (DEV && checkDebug()) console.debug(helper.fEntityNameTrim(mapID.cityentity_id), mapID, goods);
                        }
                        else {
                            if (DEV && checkDebug()) console.debug(helper.fEntityNameTrim(mapID.cityentity_id), mapID);
                        }
                        if (DEV && checkDebug()) {
                            if (CityEntityDefs[mapID.cityentity_id])
                                console.debug(CityEntityDefs[mapID.cityentity_id].name, goods, mapID.state.productionOption);
                            else
                                console.debug(goods, mapID.state.productionOption);
                            // visitbetagoods += `<br>#${id}: ${goods} ${CityEntityDefs[mapID.cityentity_id].name}`;
                        }
                    }
                }
                if (mapID.state.productionOption.products.length > 0) {
                    if (DEV && checkDebug()) console.debug(mapID.state.productionOption);
                    mapID.state.productionOption.products.forEach(product => {
                        console.debug(product);
                        if (product.hasOwnProperty('playerResources') && product.playerResources.hasOwnProperty('resources')){
                            const resources = product.playerResources.resources;
                            if (resources.hasOwnProperty('premium'))
                                diamonds += resources.premium;
                            if (resources.hasOwnProperty('strategy_points')) {
                                if (DEV && checkDebug()) console.debug(mapID.state.productionOption);
                                forgePoints += resources.strategy_points;
                            }
                            if (resources.money)
                                City.Coins += resources.money;
                            if (mapID.state.productionOption.name == "random_goods") {
                                // console.debug('random_goods: ', product.playerResources.resources);
                                Object.keys(resources).forEach(entry => {
                                    // console.debug('random_goods: ', entry,product.playerResources.resources[entry]);
                                    // randomGoods += product.playerResources.resources[entry];
                                });
                            }
                            var goods = 0;

                            Object.keys(resources).forEach(entry => {
                                if (entry != "medals" && entry != "money" && entry != "supplies" && entry != "strategy_points" && entry != "clanPower") {
                                    // totalGoods += product.playerResources.resources[entry];
                                    // console.debug(goodsList[entry],entry);
                                    var entryGoods = resources[entry];
                                    goods += entryGoods;
                                    if (goodsList[`${entry}`])
                                        goodsList[`${entry}`] += entryGoods;
                                    else
                                        goodsList[`${entry}`] = entryGoods;

                                    // if()
                                    // goodsList.push([entry,product.playerResources.resources[entry]]);
                                    // goodsList.forEach(good => {
                                    // 	console.debug(good,good.name,entry);
                                    // 	// if(good === entry)
                                    // 	entry.value
                                    // });
                                }
                            });

                        }
                        if (goods > 0) {
                            goodsBuildings.push({ 'name': helper.fEntityNameTrim(mapID.cityentity_id), 'goods': goods });
                            if (DEV && checkDebug()) console.debug(helper.fEntityNameTrim(mapID.cityentity_id), goods, mapID.cityentity_id);
                            totalGoods += goods;
                        }
                        else {
                            if (DEV && checkDebug()) console.debug(helper.fEntityNameTrim(mapID.cityentity_id), mapID);
                        }
                    });
                    // console.debug('goods: ', goodsList);
                }
                if (forgePoints > 0) {
                    City.ForgePoints += forgePoints;
                    found = true;
                    // tooltipHTML.fp += `<br>${forgePoints}FP <strong>${helper.fEntityNameTrim(mapID.cityentity_id)}</strong>`;
                    fpBuildings.push({ 'name': helper.fEntityNameTrim(mapID.cityentity_id), 'fp': forgePoints });
                    if (DEV && checkDebug()) {
                        if (helper.fEntityNameTrim(mapID.cityentity_id)) {
                            beta.innerHTML += `<br>#${id}: ${forgePoints}FP Total: ${City.ForgePoints}FP <strong>${helper.fEntityNameTrim(mapID.cityentity_id)}</strong>`;
                        } else {
                            beta.innerHTML += `<br>#${id}: ${mapID.cityentity_id} ${forgePoints}FP Total: ${City.ForgePoints}FP`;
                            console.debug(mapID.cityentity_id, mapID.state.productionOption.name, mapID);
                        }
                    }
                    if (mapID.type != 'greatbuilding' && helper.fEntityNameTrim(mapID.cityentity_id)) {
                        Galaxy.bonus.push({ 'id': mapID.cityentity_id, 'name': helper.fEntityNameTrim(mapID.cityentity_id), 'fp': forgePoints });
                    }
                    // buildingsReady.push({'name': helper.fEntityNameTrim(mapID.cityentity_id),'ready': mapID.state.next_state_transition_at});
                    console.debug(CityEntityDefs[mapID.cityentity_id].name, mapID,);
                }
                if (mapID.state.productionOption.clan_power) {
                    clanPower += mapID.state.productionOption.clan_power;
                    // console.debug('clanPower: ', clanPower);
                }
                if (mapID.state.productionOption.asset_name == 'penal_unit') {
                    City.TrazUnits += mapID.state.productionOption.amount;
                }

            }

            if (mapID.hasOwnProperty('components')) {
                console.debug(mapID.name, mapID);
                const comp = mapID.components[user.era];
                if (comp && comp.hasOwnProperty('boosts')) {
                }
                if (comp && comp.hasOwnProperty('production')) {
                    if (comp.production.hasOwnProperty('options')){
                        const products = comp.production.options[0];
                        products.array.forEach(product => {
                            console.debug(product);
                        });
                    }
                }
            }

        // if(mapID.ability.__class__ == 'RandomUnitOfAgeWhenMotivatedAbility') {
            // 	console.debug(entity.name,ability,ability.amount)
            // 	trazUnits += ability.amount;
            // }

            if (mapID.bonus) {
                if (mapID.bonus.type == "contribution_boost")
                    City.ArcBonus = mapID.bonus.value;
                else if (mapID.bonus.type == "money_boost")
                    City.CoinBoost += mapID.bonus.value;
                else if (mapID.bonus.type == "military_boost") {
                    City.Attack += mapID.bonus.value;
                    City.Defense += mapID.bonus.value;
                }
                else if (mapID.bonus.type == "advanced_tactics") {
                    // += mapID.bonus.value;
                    City.Attack += mapID.bonus.value;
                    City.Defense += mapID.bonus.value;
                    City.CityAttack += mapID.bonus.value;
                    City.CityDefense += mapID.bonus.value;
                }
                else if (mapID.bonus.type == "fierce_resistance") {
                    // += mapID.bonus.value;
                    City.CityAttack += mapID.bonus.value;
                    City.CityDefense += mapID.bonus.value;
                }
                else if (mapID.bonus.type == "quest_boost") {
                    City.ChatBonus = mapID.bonus.value;
                }
                else
                    console.debug('mapID.bonus: ', mapID.bonus);
            }
            if (DEV && found == false) {
                if (CityEntityDefs[mapID.cityentity_id]) {
                    debug.innerHTML += `<br>#${id}: ${CityEntityDefs[mapID.cityentity_id].name}`;
                } else {
                    debug.innerHTML += `<br>#${id}: ${mapID.cityentity_id}`;
                }
                if (DEV && checkDebug())
                    console.debug('NOT FOUND: ', id, mapID.cityentity_id, mapID);
            }
        }
    }

    // if(Galaxy.amount){
    showGalaxy();
    // }

    if (showOptions.collectionTimes) {
        buildingsReady.sort(function (a, b) { return a.ready - b.ready });
        var buildingsHTML = `<div class="alert alert-success alert-dismissible show collapsed"><p id="buildingsTextLabel" href="#buildingsText" data-bs-toggle="collapse">
        <svg class="bi header-icon" id="buildingsicon" href="#buildingsText" data-bs-toggle="collapse" fill="currentColor" width="12" height="16"><use xlink:href="${icons}#${collapse.collapseBuildings ? 'plus' : 'dash'}-circle"/></svg>
        <strong><span data-i18n="collection">Building Collection Times</span>:</strong></p>`;
        buildingsHTML += element.close();
        buildingsHTML += `<div id="buildingsText" class="resize collapse ${collapse.collapseBuildings ? '' : 'show'}">`;
        buildingsReady.forEach((entry, id) => {
            var timer = new Date(entry.ready * 1000);
            if (entry.ready > EpocTime)
                buildingsHTML += `${entry.name}: ${timer.toLocaleString()}<br>`;
            // console.debug(entry);
        });

        var buildings = document.getElementById("buildings");
        buildings.innerHTML = buildingsHTML + `</p></div></div>`;
        document.getElementById("buildingsTextLabel").addEventListener("click", collapse.fCollapseBuildings);
    }

    if (goodsBuildings.length > 0) {
        goodsBuildings.sort(function (b, a) { return a.goods - b.goods });
        tooltipHTML.totalGoods = ``;
        goodsBuildings.forEach((entry, id) => {
            tooltipHTML.totalGoods += `${entry.goods} ${entry.name}<br>`;
            // console.debug(entry);
        });
    }

    if (fpBuildings.length > 0) {
        fpBuildings.sort(function (b, a) { return a.fp - b.fp });
        tooltipHTML.fp = ``;
        fpBuildings.forEach((entry, id) => {
            tooltipHTML.fp += `${entry.fp}FP ${entry.name}<br>`;
            // console.debug(entry);
        });
    }

    if (clanGoodsBuildings.length > 0) {
        clanGoodsBuildings.sort(function (b, a) { return a.goods - b.goods });
        tooltipHTML.clanGoods = ``;
        clanGoodsBuildings.forEach((entry, id) => {
            tooltipHTML.clanGoods += `${entry.goods} ${entry.name}<br>`;
            if (DEV && checkDebug()) console.debug('clanGoodsBuildings', entry.goods, entry.name);
        });
    }

    Goods.sajm = 0;
    Goods.sav = 0;
    Goods.saab = 0;
    Goods.sam = 0;
    Goods.vf = 0;
    Goods.of = 0;
    Goods.af = 0;
    Goods.tf = 0;
    Goods.te = 0;
    Goods.ce = 0;
    Goods.pme = 0;
    Goods.me = 0;
    Goods.pe = 0;
    Goods.ina = 0;
    Goods.cma = 0;
    Goods.lma = 0;
    Goods.hma = 0;
    Goods.ema = 0;
    Goods.ia = 0;
    Goods.ba = 0;
    Goods.noage = 0;

    // if(randomGoods)
    // citystatsHTML += `Unrefined Goods: ${randomGoods}<br>`;
    // if(totalGoods)
    Object.keys(goodsList).forEach(good => {
        var rssName;
        ResourceDefs.forEach(resource => {
            // console.debug(resource.name,resource,good,goodsList[good]);
            // citystatsHTML += `${resource.id} ${resource.name}<br>`
            if (resource.id === good) {
                // console.debug(resource.name,good,goodsList[good]);
                rssName = resource.name;
                helper.fGoodsTally(resource.era, goodsList[good]);
                if (!tooltipHTML.goods[resource.era]) tooltipHTML.goods[resource.era] = '';
                tooltipHTML.goods[resource.era] += `${goodsList[good]} ${rssName}<br>`;
            }
        });
        // if(tooltipHTML.goods) tooltipHTML.goods += ', ';
        // tooltipHTML.goods += `${goodsList[good]} ${rssName}<br>`;
    });
    // console.debug('tooltipHTML.goods',tooltipHTML.goods);

    for (let index = 0; index < helper.numAges; index++) {
        const age = (helper.fGVGagesname(helper.fAgefromLevel(helper.numAges - index))).toLowerCase();
        if (Goods[age]) goodsHTML += fGoodsHTML(age, tooltipHTML.goods);
    }

    // console.debug('Ignored By:',msg.responseData.ignoredByPlayerIds);
    // console.debug('Ignoring:',msg.responseData.ignoredPlayerIds);
    var userTooltipHTML = `<p class="pop">`;
    if (ignoredPlayers.ignoredByPlayerIds.length > 0) {
        userTooltipHTML += `<strong>Ignored By:</strong><br>`;
        Object.values(ignoredPlayers.ignoredByPlayerIds).forEach(elem => {
            userTooltipHTML += `<a href="https://foe.scoredb.io/${GameOrigin}/Player/${elem}" target="_blank"><strong>${elem}</strong></a><br>`;
        });
    }
    if (ignoredPlayers.ignoredPlayerIds.length > 0) {
        userTooltipHTML += `<strong>Ignoring:</strong><br>`;
        Object.values(ignoredPlayers.ignoredPlayerIds).forEach(elem => {
            userTooltipHTML += `<a href="https://foe.scoredb.io/${GameOrigin}/Player/${elem}" target="_blank"><strong>${elem}</strong></a><br>`;
        });
    }
    userTooltipHTML += `</p>`;
    var fpHTML = `<span id="fp" class="pop" data-bs-container="#fp" data-bs-toggle="popover" data-bs-placement="bottom" title="Daily FP" data-bs-content="${tooltipHTML.fp}"><span data-i18n="daily">Daily</span>: ${City.ForgePoints ? City.ForgePoints : 0}FP</span>`;
    var userHTML = `<span id="user" class="pop" data-bs-container="#user" data-bs-toggle="popover" data-bs-placement="bottom"
        title="Playing <strong>FoE</strong> since<br>${(new Date(MyInfo.createdAt * 1000)).toLocaleString()}"
        data-bs-content='${userTooltipHTML}</p>'><strong>${GameOrigin.toUpperCase()} ${MyInfo.name}</strong>
        <svg class="bi info-icon" id="infoIcon" fill="currentColor" width="12" height="16"><use xlink:href="/97e6fe41382965602bd0b302d051d7f8.svg#info-circle"></use></svg></span>`;
    var clanGoodsHTML = `<span id="clanGoods" class="pop" data-bs-container="#clanGoods" data-bs-toggle="popover" data-bs-placement="bottom" title="Guild Goods" data-bs-content="${tooltipHTML.clanGoods}"><span data-i18n="guildgoods">Guild Goods</span>: ${clanGoods}</span>`;
    var totalGoodsHTML = `<span id="goods" class="pop" data-bs-container="#goods" data-bs-toggle="popover" data-bs-placement="bottom" title="Daily Goods" data-bs-content="${tooltipHTML.totalGoods}"><span data-i18n="goods">Goods</span>:</span> ${goodsHTML}`;

    citystatsHTML = `<p href="#citystatsText" data-bs-toggle="collapse" id="citystatsLabel">`;
    citystatsHTML += element.icon('citystatsicon','citystatsText',collapse.collapseStats);
    citystatsHTML += element.close();
    citystatsHTML += userHTML;
    citystatsHTML += `</p>`;
    citystatsHTML += element.copy('citystatsCopyID','warning','right',collapse.collapseStats);
    citystatsHTML += `<div id="citystatsText" class="collapse ${collapse.collapseStats ? '' : 'show'}"><div>`;
    // citystatsHTML += `<p id="citystatsText"><br>`;
    if (City.ForgePoints)
        citystatsHTML += `<p>${fpHTML}, ${City.Coins > 1000000 ? Math.floor(City.Coins * (1 + City.CoinBoost / 100) / 1000000) + 'M' : Math.floor(City.Coins * (1 + City.CoinBoost / 100))} <span data-i18n="coins">Coins</span><br>`;
    // citystatsHTML += `<a href="#" data-bs-toggle="tooltip" title="<p>${tooltipHTML.goods}</p>">Goods:</a> ${Goods.sam}/${Goods.vf}/${Goods.of}/${Goods.af}<br>`;
    citystatsHTML += `${totalGoodsHTML}<br>`;
    // citystatsHTML += `<span data-bs-toggle="tooltip" title="<b>bold</b>">Goods: </span>${Goods.sam} SAM / ${Goods.vf} VF / ${Goods.of} OF / ${Goods.af} AF<br>`;
    // <span data-i18n=""></span>
    if (diamonds)
        citystatsHTML += `<span class='green'><span data-i18n="diamonds">Diamonds</span>: ${diamonds}</span><br>`;

    if (City.ArcBonus)
        citystatsHTML += `${fArcname()} <span data-i18n="bonus">Bonus</span>: ${City.ArcBonus}%<br>`;
    if (City.ChatBonus)
        citystatsHTML += `${fCFname()} <span data-i18n="bonus">Bonus</span>: ${City.ChatBonus}% / ${BigNumber(City.ChatBonus).div(20).plus(5).toFormat(0)} <span data-i18n="goods">Goods</span><br>`;

    if (clanGoods)
        citystatsHTML += `${clanGoodsHTML}<br>`;
    if (clanPower)
        citystatsHTML += `<span data-i18n="guildpower">Guild Power</span>: ${clanPower}<br>`;
    if (City.TrazUnits)
        citystatsHTML += `<span data-i18n="army">Army Units</span>: ${City.TrazUnits}<br>`;
    // citystatsHTML += `Army: ${Attack}% Att, ${Defense}% Def City: ${CityAttack}% Att, ${CityDefense}% Def<br>`;
    citystatsHTML += `<span data-i18n="attackers">Attackers</span>: ${City.Attack}% Att, ${City.Defense}% Def<br>`;
    citystatsHTML += `<span data-i18n="defenders">Defenders</span>: ${City.CityAttack}% Att, ${City.CityDefense}% Def<br>`;
    citystatsHTML += `<span data-i18n="available">Available FP</span>: <span id="availableFPID">${availablePacksFP + availableFP}</span></p>`;
    citystatsHTML += `</div></div>`;
    //citystatsHTML += `<hr>`;
    // console.debug('citystatsHTML:',citystatsHTML);
    // console.debug('showOptions:',showOptions);

    if (showOptions.showStats) {

        var citystats = document.getElementById("citystats");

        if (citystats == null) {
            // console.debug('2');
            citystats = document.createElement('div');
            var list = document.getElementById("content");
            list.insertBefore(citystats, list.childNodes[0]);
            citystats.id = 'citystats';
        }

        citystats.innerHTML = citystatsHTML;
        citystats.className = "alert alert-dismissible alert-warning show collapsed";
        // citystats.title=`<p>${tooltipHTML}</p>`;
        // document.querySelector('#citystats').addEventListener("click", function() {
        // console.debug('citystats toggle');
        // $(this).find('span.toggle-icon').toggleClass('glyphicon-collapse-up glyphicon-collapse-down');
        // });
        document.getElementById("citystatsLabel").addEventListener("click", collapse.fCollapseStats);
        //document.getElementById("citystatsicon").addEventListener("click", collapse.fCollapseStats);
        if (!collapse.collapseStats)
            document.getElementById("citystatsCopyID").addEventListener("click", copy.fCityStatsCopy);
        // $(document).ready(function(){
        //     $('body').tooltip({html: true,placement: 'bottom'});
        //     });


        showTooltips();

        // fLoadi18n();
        $('body').i18n();
        // $('#bonus').i18n();
        // var set_locale_to = function(locale) {
        //     if (locale) {
        //       $.i18n().locale = locale;
        //     }
        //     $('body').i18n();
        //   };
    }
    // console.debug('tooltipHTML:',tooltipHTML);

}

export function emissaryService(msg) {

    if (DEV && checkDebug()) {
        console.debug('msg:', msg);
        var beta = document.getElementById("beta");

        if (beta == null) {
            // console.debug('2');
            beta = document.createElement('div');
            document.getElementById("content").appendChild(beta);
            beta.id = 'beta';
        }
    }

    for (var j = 0; j < msg.responseData.length; j++) {
        if (msg.responseData[j].bonus.subType == 'strategy_points') {
            // console.debug('Emissary FP',msg.responseData[j].bonus.amount);
            City.ForgePoints += msg.responseData[j].bonus.amount;
            if (DEV && checkDebug()) beta.innerHTML += `Emissary ${msg.responseData[j].bonus.amount}FP Total: ${City.ForgePoints}FP<br>`;
        }
        else if (msg.responseData[j].bonus.type == 'unit') {
            // console.debug('Emissary unit',msg.responseData[j].bonus.amount,msg.responseData[j].bonus.name);
            City.TrazUnits += msg.responseData[j].bonus.amount;
            if (DEV && checkDebug()) beta.innerHTML += `Emissary ${msg.responseData[j].bonus.amount} ${msg.responseData[j].bonus.name}<br>`;
        }
    }

}

export function boostService(msg) {
    City.CoinBoost = 0;
    City.SupplyBoost = 0;
    City.Attack = 0;
    City.Defense = 0;
    City.CityAttack = 0;
    City.CityDefense = 0;
    if (msg.responseData.length) {
        var boost = msg.responseData;
        // console.debug('boost:', boost);
        for (var j = 0; j < boost.length; j++) {
            // console.debug(boost[j].id);
            for (var k = 0; k < boost[j].entries.length; k++) {
                if (boost[j].id === "coinProduction")
                    City.CoinBoost += boost[j].entries[k].boostValue * boost[j].entries[k].amount
                else if (boost[j].id === "supplyProduction")
                    City.SupplyBoost += boost[j].entries[k].boostValue * boost[j].entries[k].amount
                else if (boost[j].id === "attackingUnits")
                    if (boost[j].entries[k].boostType === "att_def_boost_attacker") {
                        City.Attack += boost[j].entries[k].boostValue * boost[j].entries[k].amount
                        City.Defense += boost[j].entries[k].boostValue * boost[j].entries[k].amount
                    }
                    else
                        City.Attack += boost[j].entries[k].boostValue * boost[j].entries[k].amount
                else if (boost[j].id === "defendingUnits")
                    if (boost[j].entries[k].boostType === "att_def_boost_defender") {
                        City.CityAttack += boost[j].entries[k].boostValue * boost[j].entries[k].amount
                        City.CityDefense += boost[j].entries[k].boostValue * boost[j].entries[k].amount
                    }
                    else
                        City.CityDefense += boost[j].entries[k].boostValue * boost[j].entries[k].amount
                // console.debug(boost[j].entries[k].boostValue, boost[j].entries[k].amount)
            }
        }
        // if(showBoosts)
        // output.innerHTML = `<div class="alert alert-info alert-dismissible show" role="alert">${element.close()}Boosts:<br>Coins ${CoinBoost}%<br>Supply ${SupplyBoost}%<br>Attacking ${Attack}%/${Defense}%<br>Defending ${CityAttack}%/${CityDefense}%</div>`;
        //console.debug('CoinBoost:', CoinBoost);
        //console.debug('Attack:', Attack);
        //console.debug('CityDefense:', CityDefense);
    }

}

export function boostServiceAllBoosts(msg) {
    // console.debug('msg:', msg);
    City.CoinBoost = 0;
    City.Attack = 0;
    City.Defence = 0;
    var AllHappiness = 0;
    City.Defense = 0;
    City.CityDefense = 0;
    City.CityAttack = 0;
    if (msg.responseData.length) {
        var boost = msg.responseData;
        // console.debug('all boosts:', boost);
        for (var j = 0; j < boost.length; j++) {
            if (boost[j].type == "coin_production")
                City.CoinBoost += boost[j].value;
            else if (boost[j].type == "att_boost_attacker") {
                City.Attack += boost[j].value;
                // console.debug('Attack:', Attack, boost[j].value);
            }
            else if (boost[j].type == "att_boost_defender") {
                City.CityAttack += boost[j].value;
                // console.debug('CityAttack:', CityAttack, boost[j].value);
            }
            else if (boost[j].type == "def_boost_attacker") {
                City.Defense += boost[j].value;
                // console.debug('Defense:', Defense, boost[j].value);
            }
            else if (boost[j].type == "def_boost_defender")
                City.CityDefense += boost[j].value;
            else if (boost[j].type == "happiness_amount")
                AllHappiness += boost[j].value;
            else if (boost[j].type == "att_def_boost_attacker") {
                City.Attack += boost[j].value;
                City.Defense += boost[j].value;
                // console.debug('Attack/Defense:', boost[j].value);
            }
            else if (boost[j].type == "att_def_boost_defender") {
                City.CityAttack += boost[j].value;
                City.CityDefense += boost[j].value;
                // console.debug('City Attack/Defense:', boost[j].value);
            }
            else if (boost[j].type != "city_shield" && boost[j].type != "life_support" && boost[j].type != "supply_production" && boost[j].type != "tavern_visit_silver_drop" && boost[j].type != "tavern_silver_collect_bonus" && boost[j].type != "tavern_visit_fp_drop" && boost[j].type != "construction_time")
                console.debug('other boost:', boost[j].type, boost[j]);

        }
        // if(showBoosts)
        // output.innerHTML = `<div class="alert alert-info alert-dismissible show" role="alert">${element.close()}Boosts:<p>Coins ${CoinBoost}%</p><p>Attack ${Attack}%</p><p>Defense ${Defense}%</p></div>`;
        // console.debug('CoinBoost:', CoinBoost);
        // console.debug('Attack:', Attack);
        // console.debug('CityDefense:', CityDefense);
    }

}

function fCFname() {
    if (helper.fGBname('X_ProgressiveEra_Landmark2')) {
        var nameArray = helper.fGBname('X_ProgressiveEra_Landmark2').split(" ");
        if (nameArray[0] == 'Chateau' || nameArray[0] == 'Château')
            return nameArray[0];
        else if (nameArray[1] == 'Frontenac')
            return nameArray[1];
        else
            return helper.fGBname('X_ProgressiveEra_Landmark2');
    } else
        return 'Chateau';
}

export function fArcname() {
    if (helper.fGBname('X_FutureEra_Landmark1')) {
        if (helper.fGBname('X_FutureEra_Landmark1') == 'The Arc')
            return 'Arc';
        else
            return helper.fGBname('X_FutureEra_Landmark1');
    } else
        return 'Arc';
}

function fLoadi18n() {
    try {
        $.i18n().load({
            en: 'i18n/en.json',
            // nl: "i18n/nl.json",
            // fi: "i18n/fi.json",
            fr: "i18n/fr.json",
            // de: "i18n/de.json",
            el: "i18n/el.json",
            gr: "i18n/gr.json",
            // it: "i18n/it.json",
            // pt: "i18n/pt.json",
            // ru: "i18n/ru.json",
            // sr_Cyrl: "i18n/sr_cyrl.json",
            // sr_Latn: "i18n/sr_latn.json",
            // sr: "i18n/sr.json",
            es: "i18n/es.json",
            // sv: "i18n/sv.json"
        }).done(function () { console.debug('i18n.load OK') });
    }
    catch {
        console.debug('i18n.load error');
    }
}

var LANGUAGE_BY_LOCALE = {
    ar: "Arabic",
    zh_Hans: "Chinese (Simplified Han)",
    zh_Hant: "Chinese (Traditional Han)",
    zh: "Chinese",
    hr: "Croatian",
    cs: "Czech",
    da: "Danish",
    nl: "Dutch",
    en: "English",
    fi: "Finnish",
    fr: "French",
    de: "German",
    el: "Greek",
    he: "Hebrew",
    hi: "Hindi",
    hu: "Hungarian",
    id: "Indonesian",
    it: "Italian",
    ja: "Japanese",
    nb: "Norwegian Bokmål",
    nn: "Norwegian Nynorsk",
    fa: "Persian",
    pl: "Polish",
    pt: "Portuguese",
    ru: "Russian",
    sr_Cyrl: "Serbian (Cyrillic)",
    sr_Latn: "Serbian (Latin)",
    sr: "Serbian",
    sk: "Slovak",
    sl: "Slovenian",
    es: "Spanish",
    sv: "Swedish",
    tr: "Turkish",
}


function showTooltips() {

    const Ages = ['sajm', 'sav', 'saab', 'sam', 'vf', 'of', 'af', 'tf', 'te', 'ce', 'pme',
        'me', 'pe', 'ina', 'cma', 'lma', 'hma', 'ema', 'ia', 'ba'];

    // $('#demo').tooltip({
    //     text: '',
    //     cls: '',
    //     position: 'default',
    //     forcePosition: false,
    //     animate: false,
    //     trigger: 'hover',
    //     showDelay: 200,
    //     dontHideOnTooltipHover: false,
    //     selector: ''
    //   });


    //   $('#sav').tooltip({
    //     content: tooltipHTML['SpaceAgeVenus'],
    //     items: '#sav'
    //     });

    for (var age = 0; age < Ages.length; age++) {
        const tip = document.getElementById(Ages[age]);
        if (tip) {
            const options = {
                html: true,
                delay: { "show": 100, "hide": 500 },
                container: '#' + Ages[age]
            };
            const tooltip = new Tooltip(tip, options);
        }
    }

    // $('#'+Ages[age]).tooltip({
    //         content: function(){
    //             var element = $( this );
    //             return element.attr('title')
    //         },
    //         delay: { "show": 200, "hide": 500 }
    //     });

    // const user = document.getElementById('user');
    // if(user){
    //     const options = {
    //         html: true,
    //         delay: { "show": 500, "hide": 2000 }
    //     };
    //     const tooltip = new Tooltip(user, options);
    // }

    // $('#user').tooltip({
    //     content: function(){
    //         var element = $( this );
    //         return element.attr('title')
    //     },
    //     delay: { "show": 500, "hide": 500 }
    // });

    const options = {
        trigger: "hover focus",
        html: true,
        delay: { "show": 200, "hide": 500 }
    };
    const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');
    const popoverList = [...popoverTriggerList].map(popoverTriggerEl => new Popover(popoverTriggerEl, options));

    // $(".pop").popover({
    //     trigger: "hover",
    //     html: true,
    //     animation:true,
    //     delay: { "show": 500, "hide": 500 }
    // });


    // $('#fp').popover({
    //     trigger: 'focus'
    //   })

    // $('#fp').tooltip({
    //     content: function(){
    //         var element = $( this );
    //         return element.attr('title')
    //     },
    //     delay: { "show": 200, "hide": 400 }
    // });

    // $('#clanGoods').tooltip({
    //     content: function(){
    //         var element = $( this );
    //         return element.attr('title')
    //     },
    //     delay: { "show": 200, "hide": 400 }
    // });

    // $('#goods').tooltip({
    //     content: function(){
    //         var element = $( this );
    //         return element.attr('title')
    //     },
    //     delay: { "show": 200, "hide": 400 }
    // });

    // $( ".selector" ).tooltip({
    //     classes: {
    //       "ui-tooltip": "highlight"
    //     }
    //   });
}

function fGoodsHTML(age, goods){
    return `<span id="${age}" data-bs-toggle="tooltip" data-bs-placement="bottom" title="${fGoodsText(age, goods)}">${age.toUpperCase()}:${Goods[age]}</span> `;
}

function fGoodsText(age, goods) {
    // console.debug(age,good);

    // var text = `<span data-bs-toggle="tooltip" title="<p>`;
    if (age == "ba") {
        return `<p>` + goods["BronzeAge"] + `</p>`;
    }
    else if (age == "ia") {
        return `<p>` + goods["IronAge"] + `</p>`;
    }
    else if (age == "ema") {
        return `<p>` + goods["EarlyMiddleAge"] + `</p>`;
    }
    else if (age == "hma") {
        return `<p>` + goods["HighMiddleAge"] + `</p>`;
    }
    else if (age == "lma") {
        return `<p>` + goods["LateMiddleAge"] + `</p>`;
    }
    else if (age == "ca") {
        return `<p>` + goods["ColonialAge"] + `</p>`;
    }
    else if (age == "ina") {
        return `<p>` + goods["IndustrialAge"] + `</p>`;
    }
    else if (age == "pe") {
        return `<p>` + goods["ProgressiveEra"] + `</p>`;
    }
    else if (age == "me") {
        return `<p>` + goods["ModernEra"] + `</p>`;
    }
    else if (age == "pme") {
        return `<p>` + goods["PostModernEra"] + `</p>`;
    }
    else if (age == "ce") {
        return `<p>` + goods["ContemporaryEra"] + `</p>`;
    }
    else if (age == "te") {
        return `<p>` + goods["TomorrowEra"] + `</p>`;
    }
    else if (age == "tf") {
        return `<p>` + goods["FutureEra"] + `</p>`;
    }
    else if (age == "af") {
        return `<p>` + goods["ArcticFuture"] + `</p>`;
    }
    else if (age == "of") {
        return `<p>` + goods["OceanicFuture"] + `</p>`;
    }
    else if (age == "vf") {
        return `<p>` + goods["VirtualFuture"] + `</p>`;
    }
    else if (age == "sam") {
        return `<p>` + goods["SpaceAgeMars"] + `</p>`;
    }
    else if (age == "saab") {
        return `<p>` + goods["SpaceAgeAsteroidBelt"] + `</p>`;
    }
    else if (age == "sav") {
        return `<p>` + goods["SpaceAgeVenus"] + `</p>`;
    }
    else if (age == "sajm") {
        return `<p>` + goods["SpaceAgeJupiterMoon"] + `</p>`;
    }
    else console.debug(age);
}

export function updateGalaxy(id) {
    Galaxy.bonus = Galaxy.bonus.filter(item => item.id !== id);
    showGalaxy();
}

export function showGalaxy() {
    Galaxy.bonus.sort(function (a, b) { return b.fp - a.fp });
    console.debug('showGalaxy', Galaxy);
    Galaxy.html = `<div class="alert alert-success alert-dismissible show collapsed" role="alert"><p id="galaxyTextLabel" href="#galaxyText" data-bs-toggle="collapse">
    <svg class="bi header-icon" id="galaxyicon" href="#galaxyText" data-bs-toggle="collapse" fill="currentColor" width="12" height="16"><use xlink:href="${icons}#${collapse.collapseGalaxy ? 'plus' : 'dash'}-circle"/></svg>
    <strong>Galaxy Double Collection:</strong></p>`;
    Galaxy.html += element.close();
    Galaxy.html += `<div id="galaxyText" class="resize  collapse ${collapse.collapseGalaxy == false ? 'show' : ''}">`;
    Galaxy.html += `<p>Tries Remaining: <span id='galaxyID'>${Galaxy.amount}</span></p><p>`;
    Galaxy.bonus.forEach((entry, id) => {
        if (id < Galaxy.amount || debugEnabled == true) Galaxy.html += `${entry.fp}FP ${entry.name}<br>`;
    });

    var galaxy = document.getElementById("galaxy");
    galaxy.innerHTML = Galaxy.html + `</p></div></div>`;
    document.getElementById("galaxyTextLabel").addEventListener("click", collapse.fCollapseGalaxy);
    if (Galaxy.amount > 0 || debugEnabled == true)
        galaxy.style.display = "block";
    else
        galaxy.style.display = "none";
}
