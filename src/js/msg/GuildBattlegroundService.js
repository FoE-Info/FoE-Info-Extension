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
import { Tooltip, Alert, Popover } from 'bootstrap';
import browser from 'webextension-polyfill';
import { showOptions } from '../vars/showOptions.js';
import * as helper from '../fn/helper.js';
import * as collapse from '../fn/collapse.js';
import * as copy from '../fn/copy.js';
import * as element from '../fn/AddElement';
import * as storage from '../fn/storage.js';
import * as post_webstore from '../fn/post.js';
import { BuildingDefs, VolcanoProvinceDefs, WaterfallProvinceDefs, targets, donationDIV, GameOrigin, EpocTime, url, targetText } from '../index.js';
import { toolOptions, setBuildingCostSize } from '../fn/globals.js';
import icons from 'bootstrap-icons/bootstrap-icons.svg';

export var BattlegroundPerformance = [];
export var GuildMembers = [];
export var BGtime = '';
var map = {};
var signals = {};
var battlegroundParticipants = {};
var mapName = '';
var ProvinceDefs = [];

var currentParticipantId = 0;

export var GBGdata = [];

export function getPlayerLeaderboard(msg) {


    BattlegroundPerformance = [];
    GBGdata = [];
    // GuildMembers = BattlegroundPerformance;		// save old values
    msg.responseData.forEach(entry => {
        // console.debug(entry);
        var wonNegotiations = 0;
        var wonBattles = 0;
        if (entry.negotiationsWon) wonNegotiations = entry.negotiationsWon;
        if (entry.battlesWon) wonBattles = entry.battlesWon;
        GBGdata.push({ 'name': entry.player.name, 'total': wonNegotiations * 2 + wonBattles });
        BattlegroundPerformance.push({ 'name': entry.player.name, 'wonNegotiations': wonNegotiations, 'wonBattles': wonBattles });
    });
    // console.debug('BattlegroundPerformance',BattlegroundPerformance,GBGdata);

    console.debug('2', showOptions.showBattleground);

    if (showOptions.showBattleground) {

        browser.storage.local.get([GameOrigin, GameOrigin + 'BGtime']).then((items) => {
            console.debug('items', items);
            if (items[GameOrigin])
                GuildMembers = items[GameOrigin];
            // console.debug('GuildMembers',GuildMembers);
            storage.set(GameOrigin + 'BGtime', EpocTime);
            if (items[GameOrigin + 'BGtime'])
                BGtime = new Date(items[GameOrigin + 'BGtime'] * 1000).toLocaleString();

            else
                BGtime = 'not set';

            BattlegroundPerformance.forEach(entry => {
                // console.debug('entry',entry);
                if (GuildMembers.find(id => id.name == entry.name) == null)
                    GuildMembers.push({ 'name': entry.name, 'wonNegotiations': 0, 'wonBattles': 0 }); // if member not listed, add new member
            });
            console.debug('save GBG', GameOrigin, BattlegroundPerformance);
            storage.set(GameOrigin, BattlegroundPerformance);
            helper.fshowBattleground();
        });
        // console.debug('BattlegroundPerformance',GBGdata);
        $('body').i18n();
    }

}

export function getLeaderboard(msg) {
    //console.debug('cityentity_id:', msg.responseData.cityentity_id);
    // console.debug('getLeaderboard:', msg.responseData);
    const leaderboard = msg.responseData;
    var leaderboardHTML = `<tr><th>Guild</th><th>VP/hr</th><th>Total VP</th></tr>`;
    leaderboard.forEach(guild => {
        // console.debug(guild.clan.name,guild.victoryPointsHourly,guild.victoryPointsTotal)
        leaderboardHTML += `<tr><td>${guild.clan.name}</td><td>${guild.victoryPointsHourly ? guild.victoryPointsHourly : 0}</td><td>${guild.victoryPointsTotal ? guild.victoryPointsTotal : 0}</td></tr>`;
    });
    output.innerHTML = `<div class="alert alert-info alert-dismissible show" role="alert">${element.close()}<strong>GBG Leaderboard:</strong>
            <p id="leaderboardText"><table>` + leaderboardHTML + `</table></p></div>`;

}

export function getState(msg) {
    // console.debug('getState:', msg);
    if (msg.responseData.stateId == 'subscribed') {
        console.debug('msg:', msg);
        storage.remove(GameOrigin + 'BGtime');
        storage.remove(GameOrigin);
        BattlegroundPerformance = [];
        var GBGdata = [];
        var totalFights = 0;
        var totalNegs = 0;
        var battlegroundHTML = `<div id="battlegroundResultTextLabel" class="alert alert-info alert-dismissible show collapsed" role="alert">
        ${element.close()}
        <p id="battlegroundResultTextLabel" href="#battlegroundTextCollapse" data-bs-toggle="collapse">
        <svg class="bi header-icon" id="battlegroundicon" href="#battlegroundTextCollapse" data-bs-toggle="collapse" fill="currentColor" width="12" height="16"><use xlink:href="${icons}#${collapse.collapseBattleground ? 'plus' : 'dash'}-circle"/></svg>
        <strong>Battleground Result:</strong></p>`;
        if(url.sheetGuildURL)
        battlegroundHTML += `<button type="button" class="badge rounded-pill bg-info float-end mid-button" id="battlegroundPostID"><span data-i18n="post">Post</span></button>`;
        battlegroundHTML += `<button type="button" class="badge rounded-pill bg-info float-end right-button" id="battlegroundCopyID"><span data-i18n="copy">Copy</span></button>`;
        battlegroundHTML += `<div id="battlegroundTextCollapse" class="table-responsive collapse ${collapse.collapseBattleground ? '' : 'show'}"><div class="overflow-y" id="battlegroundText"><table id="gbg-table" class="gbg-table"><tr><th>Rank</th><th>Member</th><th>Negs</th><th>Fights</th></tr>`
        msg.responseData.playerLeaderboardEntries.forEach(entry => {
            var wonNegotiations = 0;
            var wonBattles = 0;
            if (entry.negotiationsWon) wonNegotiations = entry.negotiationsWon;
            if (entry.battlesWon) wonBattles = entry.battlesWon;
            BattlegroundPerformance.push([entry.rank, entry.player.name, wonNegotiations, wonBattles]);
            battlegroundHTML += `<tr><td>${entry.rank}</td><td>${entry.player.name}</td><td>${wonNegotiations}</td><td>${wonBattles}</td></tr>`;
            // console.debug(entry.rank,entry.name,wonNegotiations,wonBattles);
            totalFights += wonBattles;
            totalNegs += wonNegotiations;
        });
        battlegroundHTML += `<tr><th></th><th>Guild Total</th><th>${totalNegs}</th><th>${totalFights}</th></tr>`;

        // console.debug(BattlegroundPerformance);
        donationDIV.innerHTML = battlegroundHTML + `</table></div></div></div>`;
        if (url.sheetGuildURL)
            document.getElementById("battlegroundPostID").addEventListener("click", post_webstore.postGBGtoSS);
        // else
            document.getElementById("battlegroundCopyID").addEventListener("click", copy.BattlegroundCopy);
        document.getElementById("battlegroundResultTextLabel").addEventListener("click", collapse.fCollapseBattleground);
        msg.responseData.playerLeaderboardEntries.forEach(entry => {
            // console.debug(entry);
            var wonNegotiations = 0;
            var wonBattles = 0;
            if (entry.wonNegotiations) wonNegotiations = entry.wonNegotiations;
            if (entry.wonBattles) wonBattles = entry.wonBattles;
            // GBGdata[i] = {'name':entry.player.name,
            // 'wonNegotiations': wonNegotiations,
            // 'wonBattles': wonBattles,
            // 'total':wonNegotiations*2+wonBattles};
            GBGdata.push({ 'name': entry.player.name, 'total': wonNegotiations * 2 + wonBattles });
        });
        // console.debug('GBGdata',GBGdata);
    }
}

export function getBattleground(msg) {
    mapName = msg.responseData.map.id.split("_")[0];
    console.debug(mapName, msg);
    if (mapName == 'volcano')
        ProvinceDefs = VolcanoProvinceDefs;
    else if (mapName == 'waterfall')
        ProvinceDefs = WaterfallProvinceDefs;

    var oldMap = map;
    currentParticipantId = msg.responseData.currentParticipantId;
    map = msg.responseData.map.provinces;
    // console.debug(oldMap,map);
    map.forEach((province, i) => {
        if (!province.id) province.id = 0;
        // if(oldMap[i] && oldMap[i].placedBuildings){
        //     province.placedBuildings = oldMap[i].placedBuildings;
        // }
        if (Object.keys(oldMap).length) {
            province.placedBuildings = oldMap.find(oldProvince => oldProvince.id == province.id).placedBuildings;
            province.availableBuildings = oldMap.find(oldProvince => oldProvince.id == province.id).availableBuildings;
        }
    });
    // console.debug(map);
    // console.debug(map);

    battlegroundParticipants = msg.responseData.battlegroundParticipants;
    signals = battlegroundParticipants.find(clan => clan.participantId == msg.responseData.currentParticipantId).signals;
    if (signals.find(clan => !clan.provinceId)) signals.find(clan => !clan.provinceId).provinceId = 0;
    console.debug(map, signals, battlegroundParticipants);

    // console.debug(message.lastMessage.text);

    checkProvinces();
}

export function getBuildings(msg) {
    var provinceId = 0;
    if (msg.responseData.provinceId) provinceId = msg.responseData.provinceId;
    map.find(province => province.id == provinceId).placedBuildings = msg.responseData.placedBuildings;
    map.find(province => province.id == provinceId).availableBuildings = msg.responseData.availableBuildings;
    checkProvinces();
    if (showOptions.buildingCosts && msg.responseData.availableBuildings)
        showBuildingCost(msg.responseData);
    // console.debug('getBuildings',msg.responseData,map);
}

export function setSignal(msg,payload) {
    console.debug('setSignal', msg, signals);
    signals.push({'provinceId':payload[0],'signal':'focus'});
    checkProvinces();
}
export function removeSignal(msg,payload) {
    console.debug('removeSignal', msg, signals);
    signals = signals.filter(p => p.provinceId != payload[0]);
    console.debug(payload,signals);
    checkProvinces();
}


export function clearBattleground() {
    BattlegroundPerformance = [];
    GuildMembers = [];
    map = {};
    if (document.getElementById("costs")) document.getElementById("costs").innerHTML = '';
}


function buildingCostCopy() {
    var selection = window.getSelection();
    selection.removeAllRanges();
    var range = document.createRange();
    var copytext = document.getElementById("buildingCostText");
    range.selectNode(copytext);
    selection.addRange(range);
    document.execCommand("copy");
    // copyToClipboard('p#buildingCostText');
}

function targetCopy() {
    // var selection = window.getSelection();
    // selection.removeAllRanges();
    // var range = document.createRange();
    // var copytext = document.getElementById("targetGenText");
    // range.selectNode(copytext);
    // selection.addRange(range);
    // document.execCommand("copy");


    copyToClipboard('#targetGenText');
    console.debug(document.getElementById("targetGenText").innerHTML);

    // var $temp = $("<textarea>");
    // $("body").append($temp);
    // var html = $('p#targetGenText').html();
    // console.debug(html);
    // // var html = $(element).text();
    // html = html.replace(/<br>/g, "\r\n"); // or \r\n
    // console.debug(html);
    // $temp.val(html).select();
    // document.execCommand("copy");
    // $temp.remove();

}

function copyToClipboard(element) {
    var $temp = $("<textarea>");
    $("body").append($temp);
    var html = $(element).html();
    console.debug(html);
    // var html = $(element).text();
    html = $('<div />').html(html).find('span').contents().unwrap().end().end().html();
    html = html.replace(/<\/?p[^>]*>/g, "").replace(/<br>/g, "\r\n"); // or \r\n
    console.debug(html);
    $temp.val(html).select();
    document.execCommand("copy");
    $temp.remove();
}

function timeGBG(time) {
    if (!time)
        return '';
    console.debug(time);
    var timeText = '@ ' + time.toLocaleTimeString([], { timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit' });

    if (GameOrigin.substr(0, 2) == 'en' || GameOrigin.substr(0, 2) == 'zz')
        timeText = '@ ' + time.toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' });
    if (GameOrigin.substr(0, 2) == 'us')
        timeText = '@ ' + time.toLocaleTimeString('en-US', { timeZone: 'US/Eastern', hour12: true });
    else if (GameOrigin.substr(0, 2) == 'de')
        timeText = '@ ' + time.toLocaleTimeString([], { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' });
    else if (GameOrigin.substr(0, 2) == 'fr')
        timeText = '@ ' + time.toLocaleTimeString([], { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });
    else if (GameOrigin.substr(0, 2) == 'gr')
        timeText = '@ ' + time.toLocaleTimeString([], { timeZone: 'Europe/Athens', hour: '2-digit', minute: '2-digit' });
    else if (GameOrigin.substr(0, 2) == 'fi')
        timeText = '@ ' + time.toLocaleTimeString([], { timeZone: 'Europe/Helsinki', hour: '2-digit', minute: '2-digit' });
    else if (GameOrigin.substr(0, 2) == 'ru')
        timeText = '@ ' + time.toLocaleTimeString([], { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' });

    // if(GameOrigin.substr(0,2) == 'en')

    return timeText;
}

function checkProvinces() {
    var textProvinceUnlocked = '';
    var textProvinceLocked = '';
    var targetGenerator = document.createElement('div');
    var targetsHTML;
    if (document.getElementById("targetsGBG")) {
        targetGenerator = document.getElementById("targetsGBG");
    }
    else {
        targetGenerator.id = "targetsGBG";
        targets.appendChild(targetGenerator);
    }
    var timerId = Math.random().toString(36).substr(2, 5);
    var targetsHTML = `<div class="alert-${timerId} alert alert-info alert-dismissible show" role="alert">`;
    targetsHTML += element.close();
    // if(url.sheetGuildURL)
    //     targetsHTML += `<button type="button" class="badge rounded-pill bg-primary right-button" id="targetPostID"><span data-i18n="post">Post</span></button>`;
    // else
    targetsHTML += `<button type="button" class="badge rounded-pill bg-primary right-button" id="targetCopyID"><span data-i18n="copy">Copy</span></button>
        <p id="targetGenLabel" href="#targetGenCollapse" aria-expanded="true" data-bs-toggle="collapse">
        <svg class="bi header-icon" id="targetGenicon" href="#targetGenCollapse" data-bs-toggle="collapse" fill="currentColor" width="12" height="16"><use xlink:href="${icons}#${collapse.collapseTargetGen ? 'plus' : 'dash'}-circle"/></svg>
        <strong>GBG Target Generator:</strong></p>`;

    var mapSorted = Array.from(map);
    mapSorted.sort(function (a, b) {
        if (!a.lockedUntil) return 1;
        else if (!b.lockedUntil) return -1;
        else return a.lockedUntil > b.lockedUntil ? 1 : b.lockedUntil > a.lockedUntil ? -1 : 0;;
    });

    mapSorted.forEach(province => {
        //check all signals - could be focus or ignore
        // console.debug(province);
        signals.forEach((clan) => {
            // console.debug(province,clan);
            // var signalId = clan.provinceId ? clan.provinceId : 0;

            //check all provinces with focus
            var thisdef = ProvinceDefs.find(def => def.id == province.id);
            if (thisdef && province.id == clan.provinceId && clan.signal == 'focus') {
                // if(thisdef && province.id == clan.provinceId){
                var campsReady = 0;
                var campsNotReady = 0;
                var name = thisdef.name.split(" ");
                console.debug(thisdef.name, name, thisdef);
                // if(name[0].charAt(1) == '1')
                //     name[1] = '';
                // else
                if (mapName == 'waterfall') {
                    name[1] = '';
                    name[0] = name[0].substr(0, 3);
                }
                else {
                    name[1] = name[1].charAt(0);
                    name[0] = name[0].substr(0, 2);
                }
                // console.debug(thisdef);
                // waterfall_archipelago
                //check connected provinces for siege camps
                if (thisdef && thisdef.connections) {
                    thisdef.connections.forEach(connection => {
                        const provinceData = mapSorted.find(province => province.id == connection);
                        // console.debug(connection,provinceData);
                        if (provinceData.placedBuildings && currentParticipantId == provinceData.ownerId) {
                            provinceData.placedBuildings.forEach(building => {
                                if (building.id == 'siege_camp') {
                                    if (building.readyAt < EpocTime) {
                                        console.debug('siege camp');
                                        campsReady++;
                                    }
                                    else {
                                        var time = new Date(building.readyAt);
                                        campsNotReady++;
                                        console.debug(building.readyAt,time);
                                        console.debug('siege camp ready ' + timeGBG(time));
                                    }
                                }
                            });
                        }
                    });
                }

                var text = name[0] + name[1];
                var campsText = '';
                if (showOptions.GBGshowSC && (campsReady || campsNotReady)) {
                    campsText = ' (';
                    if (campsReady && !campsNotReady)
                        campsText += campsReady + ` <span id="siegecamp_tooltip" title="Siege Camp">SC</span>)`;
                    else if (campsNotReady && !campsReady)
                        campsText += campsNotReady + ' UC)';
                    else if (campsReady && campsNotReady)
                        campsText += campsReady + ' SC + ' + campsNotReady + ' UC)';
                    else
                        campsText += '! SC)';
                }
                if (targetText)
                    text += ' ' + targetText;
                // check if province is locked
                if (province.lockedUntil && showOptions.GBGprovinceTime) {
                    var time = new Date(province.lockedUntil * 1000);
                    text += ` ${timeGBG(time)}`;
                    if (textProvinceLocked != '') {
                        textProvinceLocked += '<br>';
                    }
                    textProvinceLocked += text + campsText;
                    // console.debug(province.lockedUntil,time);
                }
                else {

                    if (textProvinceUnlocked != '') textProvinceUnlocked += '<br>';
                    textProvinceUnlocked += text + campsText;
                }
                // console.debug(text);
            }
        });
    });
    if ((textProvinceUnlocked || textProvinceLocked) && (helper.checkGBG || helper.MyGuildPermissions & 64)) {
        // targetsHTML += `<button type="button" class="badge rounded-pill bg-primary right-button" id="targetPostID">Post</button>`;

        targetGenerator.innerHTML = targetsHTML + `<div id="targetGenCollapse" class="collapse 
            ${collapse.collapseTargetGen == false ? 'show' : ''}"><p id="targetGenText">` + 
            textProvinceUnlocked + (textProvinceUnlocked != '' ? '<br>' : '') + textProvinceLocked + `</p></div>`;


        document.getElementById("targetCopyID").addEventListener("click", targetCopy);
        document.getElementById("targetGenLabel").addEventListener("click", collapse.fCollapseTargetGen);
        const siegecamp_tooltip = document.getElementById('siegecamp_tooltip');
        if(siegecamp_tooltip){
            const options = {
                html: true,
                delay: { "show": 200, "hide": 500 }
            };
            const tooltip = new Tooltip(siegecamp_tooltip, options);
            }
    }
}

function showBuildingCost(msg) {
    var provinceId = 0;
    if (msg.provinceId) provinceId = msg.provinceId;
    var costsHTML = '';
    var costsDiv = document.createElement('div');
    if (document.getElementById("costs")) {
        costsDiv = document.getElementById("costs");
        // costsHTML = document.getElementById("buildingCostText").innerHTML;
    }
    else {
        // costsDiv.innerHTML = `<div class="alert alert-info alert-dismissible show" role="alert">${element.close()}<p id="buildingCostTextLabel" href="#buildingCostCollapse" aria-expanded="true" aria-controls="buildingCostText" data-bs-toggle="collapse"><svg class="bi alert-warning" id="citystatsicon" href="#citystatsText" data-bs-toggle="collapse" fill="currentColor" width="12" height="16"><use xlink:href="${icons}#${collapse.collapseStats ? 'plus' : 'dash'}-circle"/></svg><strong>GBG Building Costs:</strong></p><button type="button" class="badge rounded-pill bg-primary right-button" id="buildingCostID"><span data-i18n="copy">Copy</span></button><table id="buildingCostText" class="table"></table></div>`;
        costsDiv.id = "costs";
        content.appendChild(costsDiv);
    }
    // var province = ProvinceDefs.find(def => def.id == provinceId);
    map.filter(p => p.availableBuildings != null).forEach(province => {
        console.debug(province);
        const costs = province.availableBuildings;
        const slots = province.totalBuildingSlots;
        var name = ProvinceDefs.find(def => def.id == province.id).name.split(" ");
        // var slots = ProvinceDefs.find(def => def.id == province.id).totalBuildingSlots;
        // console.debug(name,costsHTML);

        // if(name[0].charAt(1) == '1')
        //     name[1] = '';
        // else
        //     name[1] = name[1].charAt(0);
        // name[0] = name[0].substr(0,2);


        if (mapName == 'waterfall') {
            name[1] = '';
            name[0] = name[0].substr(0, 3);
        }
        else {
            name[1] = name[1].charAt(0);
            name[0] = name[0].substr(0, 2);
        }


        // costsHTML += `<tr><td class="fw-bold col-auto">${name[0] + name[1]}</td></tr>`;
        costsHTML += `<tr><th>${name[0] + name[1]}${slots ? ' [' + slots + ']' : ''}</th><th>Resource 1</th><th>Qty</th><th>Resource 2</th><th>Qty</th><th>Resource 3</th><th>Qty</th></tr>`;
        costs.forEach(building => {
            // console.debug(guild.clan.name,guild.victoryPointsHourly,guild.victoryPointsTotal)
            costsHTML += `<tr><td>${BuildingDefs[building.buildingId].name}</td>`;
            Object.keys(building.costs.resources).forEach(resource => {
                // Goods[entry] = entry;
                // console.debug(entry,rss[`${entry}`]);

                costsHTML += `<td>${helper.fResourceShortName(resource)}</td><td>${building.costs.resources[resource]}</td>`;
            });

            // <td>${building.costs.resources.length >= 1 ? building.costs.resources[0] : ''}</td>
            // <td>${building.costs.resources.length >= 2 ? building.costs.resources[1] : ''}</td>
            // <td>${building.costs.resources.length >= 3 ? building.costs.resources[2] : ''}</td>
            costsHTML += `</tr>`;
        });
    });
    // let htmlText = `<div class="card bg-light alert show collapsed p-0" >
    // <div class="card-header fw-bold"><span data-i18

    costsDiv.innerHTML = `<div class="alert alert-info alert-dismissible  show collapsed" role="alert">
    ${element.close()}
    <p id="buildingCostTextLabel" href="#buildingCostText" aria-expanded="true" aria-controls="buildingCostText" data-bs-toggle="collapse">
    <svg class="bi header-icon" id="buildingCosticon" href="#buildingCostText" data-bs-toggle="collapse" fill="currentColor" width="12" height="16"><use xlink:href="${icons}#${collapse.collapseBuildingCost ? 'plus' : 'dash'}-circle"/></svg>
    <strong>GBG Building Costs:</strong></p>
    <button type="button" class="badge rounded-pill bg-primary right-button" id="buildingCostID"><span data-i18n="copy">Copy</span></button>
    <table style="height: ${toolOptions.buildingCostSize}px"  id="buildingCostText" class="overflow-y table collapse ${collapse.collapseBuildingCost == false ? 'show' : ''}">` + costsHTML + `</table></div>`;
    document.getElementById("buildingCostID").addEventListener("click", buildingCostCopy);
    document.getElementById("buildingCostTextLabel").addEventListener("click", collapse.fCollapseBuildingCost);
    const costsTextDiv = document.getElementById("buildingCostText");
    const resizeObserver = new ResizeObserver(entries => {
        // console.debug(entries);
        for (const entry of entries) {
            if (entry.contentRect && entry.contentRect.height) setBuildingCostSize(entry.contentRect.height);
        }
    });
    resizeObserver.observe(costsDiv);
    $('body').i18n();
    // console.debug(toolOptions);
    console.debug('collapseBuildingCost', collapse);
}
