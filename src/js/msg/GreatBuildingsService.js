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
import {showOptions} from '../vars/showOptions.js';
import * as helper from '../fn/helper.js';
import * as collapse from '../fn/collapse.js';
import icons from 'bootstrap-icons/bootstrap-icons.svg';
import * as copy from '../fn/copy.js';
import {City} from './StartupService.js';
import {setPlayerName,MyInfo,PlayerID,PlayerName,donationDIV,donation2DIV,donationDIV2,GBselected,greatbuilding,donationPercent,donationSuffix,GameOrigin,url} from '../index.js';
// import '../../css/main.css';
import BigNumber from "bignumber.js";
import {friends,guildMembers,hoodlist} from './OtherPlayerService';
import * as storage from '../fn/storage.js';
var Top = [0,0,0,0,0,0];
var GBrewards = [0,0,0,0,0];
var Reward = [0,0,0,0,0];
var currentPercent = donationPercent ? donationPercent : 190;
var googleSheetGame = '';
var useNewDonationPanel = false;
var rankings ;
var donateSuggest = [];
var donateCustom = new BigNumber(0);
var safe = [];
var remaining = 0;
var Donation = new BigNumber(0);
var RewardFP = new BigNumber(0);
var Profit = 0;
var Percent = new BigNumber(0);
const darkMode = false; // dont use darkMode until we sort out a dark theme to use

if(storage.get('useNewDonationPanel') != null)
    useNewDonationPanel = storage.get('useNewDonationPanel');

    if(url && url.hasOwnProperty('sheetGameURL')) googleSheetGame = url.sheetGameURL;

export function getConstruction(msg){
    rankings = msg.responseData.rankings;
    console.debug('rankings',rankings);
    showGreatBuldingDonation();
}

export function contributeForgePoints(msg){
    rankings = msg;
    console.debug('rankings',rankings);
    showGreatBuldingDonation();
}

export function showGreatBuldingDonation(){

    var outputHTML = '';
    var donorsHTML = '';
    overview.innerHTML = "";
//greatbuilding.innerHTML = ``;
    outputHTML = `<div class="alert alert-success alert-dismissible" role="alert">
    <p id="donorTextLabel" data-bs-toggle="collapse" href="#donorcollapse">
    <svg class="bi header-icon" id="donoricon" href="#donorcollapse" data-bs-toggle="collapse" fill="currentColor" width="12" height="16"><use xlink:href="${icons}#${collapse.collapseGBDonors ? 'plus' : 'dash'}-circle"/></svg>
    <strong><span data-i18n="gb">GB</span> Donors:</strong></p>
    <button type="button" class="badge rounded-pill bg-success float-end right-button" id="donorCopyID"><span data-i18n="copy">Copy</span></button>
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
    outputHTML += `<div id="donorcollapse" class="collapse ${collapse.collapseGBDonors ? '' : 'show'}"><p id="donorText">`;

    // if (debug == true)
    // 	greatbuilding.innerHTML += `<div>${contentType} : ${msg.requestClass} : ${msg.requestMethod}</div>`;
    console.debug('rankings',rankings);
    if(rankings.length) {
        var Rank = 0;

        for(var j = 0; j < rankings.length; j++) {
            const place = rankings[j];
            if (place.hasOwnProperty('rank')){
                Rank = place.rank;
                if(donorsHTML != '' && place.player.name != 'No contributor yet'){
                    donorsHTML += '<br>';
                    // console.debug(j,place,donorsHTML);
                }
            }
            else
                Rank = 0;
            if(Rank>0){
                if (Rank<6){
                    if(place.forge_points)
                        Top[Rank-1] = place.forge_points;
                    else
                        Top[Rank-1] = 0;
                    if(place.reward.strategy_point_amount)
                        GBrewards[Rank-1] = new BigNumber(place.reward.strategy_point_amount).dp(0);
                    else
                        GBrewards[Rank-1] = 0;
                    Reward[Rank-1] = BigNumber(GBrewards[Rank-1]).times(1.9).dp(0); 
                    // console.debug(place.reward.strategy_point_amount,BigNumber(place.reward.strategy_point_amount).dp(0),GBrewards[Rank-1]);
                 }
                else if (Rank==6){
                    if(place.forge_points)
                        Top[5] = place.forge_points;
                    else
                        Top[5] = 0;
                }
                if(Rank > 0){
                    // else{
                        // console.debug('place.forge_points:', place.player.name,place.forge_points,place.reward.strategy_point_amount);
                        if(place.player.name != 'No contributor yet'){
                            if(place.reward && place.reward.strategy_point_amount){
                                donorsHTML += `${place.player.name} ${place.forge_points}FP ${BigNumber(place.forge_points).times(100).div(place.reward.strategy_point_amount).toFormat(0)}%`;
                            }
                            else{
                                donorsHTML += `${place.player.name} ${place.forge_points}FP>`;
                                // clipboardHTML += `<p>${place.player.name} ${place.forge_points}FP</p>`;

                            }
                        }
                    // }
                }
            }
            else{
                if(PlayerID == place.player.player_id)
                    // PlayerName = place.player.name;
                    setPlayerName(place.player.name,PlayerID);
                }
        }
        // console.debug('Reward',Reward);

        console.debug('outputHTML',outputHTML,donorsHTML)
        if(showOptions.showGBDonors){
            fCheckOutput();

            greatbuilding.innerHTML = outputHTML + donorsHTML;
            document.getElementById("donorCopyID").addEventListener("click", copy.DonorCopy);
            document.getElementById("donorTextLabel").addEventListener("click", collapse.fCollapseGBDonors);
        }

            var playerShortName = PlayerName.length > 5 ? PlayerName.substr(0, PlayerName.indexOf(" ")) : PlayerName;
            var newdonationHTML = ""; 
            var copyText = `<div id='copyText'>${showOptions.showGuildPosition && PlayerName == MyInfo.name && MyInfo.guildPosition ? '#' + MyInfo.guildPosition + ' ' : ''}${playerShortName ? playerShortName :PlayerName} ${helper.fGBsname(GBselected.name)} `;
            var olddonationHTML = `<div class="alert alert-secondary alert-dismissible show collapsed" role="alert">
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            <p id="freeTextLabel" href="#donationText3" aria-controls="donationText3" data-bs-toggle="collapse">
            <svg class="bi header-icon" id="donationicon" href="#donationText3" data-bs-toggle="collapse" fill="currentColor" width="12" height="16"><use xlink:href="${icons}#${collapse.collapseDonation ? 'plus' : 'dash'}-circle"/></svg>
            <strong><span data-i18n="gb">GB</span> <span data-i18n="donation">Donation</span>:</strong></p>
            <button type="button" class="badge rounded-pill bg-secondary float-end right-button" id="donationCopyID"><span data-i18n="copy">Copy</span></button>`;
            olddonationHTML += `<div id="donationText3" class="collapse ${collapse.collapseDonation ? '' : 'show'}"><p>${getPlayerLink()}<br>`;
            olddonationHTML += `<span id="GBselected">${GBselected.name} ${GBselected.level+1}</span></p>`;
            if(GBselected.connected == null){
                olddonationHTML += '<p class="red">*** DISCONNECTED ***</p>';
            }
            if(GBselected.level == GBselected.max_level){
                olddonationHTML += '<p class="red">*** LOCKED ***</p>';
            }
            olddonationHTML += checkInactive();

            donationDIV.innerHTML = '';
            donationDIV.style.display = "block";

            
            // Check Top1
            getPlaceValues(1);
            getSafe(1);
            console.debug('RewardFP/Donation/Profit ',RewardFP,Donation,Profit);
            if (Donation.isLessThan(BigNumber(remaining))){
                if (Profit >= 0) {
                    olddonationHTML += `<p class="invest-good">1st Place<br><span data-i18n="lock">Lock</span>: ${Donation}FP<br><span data-i18n="profit">Profit</span>: ${Profit}<br>`;
                    newdonationHTML += gbTabSafe(1, currentPercent, Donation, RewardFP, donateCustom, donateSuggest, GBrewards,
                        GBselected.connected, GBselected.level == GBselected.max_level, safe);
                } else {
                    olddonationHTML += `<p class="invest-bad">1st Place<br><span data-i18n="lock">Lock</span>: ${Donation}FP<br><span data-i18n="loss">Loss</span>: ${Profit * -1}<br>`;
                    newdonationHTML += gbTabNotSafe(1, currentPercent, Donation, RewardFP, donateCustom, donateSuggest, GBrewards,
                        GBselected.connected, GBselected.level == GBselected.max_level, safe);
                }
                if(GBrewards[0]){
                        olddonationHTML += getFriendlyDonation(donateCustom,RewardFP,currentPercent,Donation);   
                    olddonationHTML += `BE: ${RewardFP}FP</p>`;
                }else
                    olddonationHTML += `</p>`;
                if(PlayerName == MyInfo.name && Donation - donateSuggest[0] > 0)
                    olddonationHTML += `<p class=""><span data-i18n="add">Add</span> ${currentPercent ? (Donation - donateCustom) * 2 : (Donation - donate190) * 2}FP <span data-i18n="safe">to make safe for</span> ${currentPercent ? currentPercent / 100 : '1.9'}</p>`;
                copyText += getDonations(1,safe,donateSuggest);
            }
            // not Top1, Check Top2
            else{
                 getPlaceValues(2);
                getSafe(2);
                if (Donation.isLessThan(BigNumber(remaining))){
                    if (Profit >= 0) {
                        olddonationHTML += `<p class="invest-good">2nd Place<br><span data-i18n="lock">Lock</span>: ${Donation}FP<br><span data-i18n="profit">Profit</span>: ${Profit}<br>`;
                        newdonationHTML += gbTabSafe(2, currentPercent, Donation, RewardFP, donateCustom, donateSuggest, GBrewards,
                            GBselected.connected, GBselected.level == GBselected.max_level, safe);
                    } else {
                        olddonationHTML += `<p class="invest-bad">2nd Place<br><span data-i18n="lock">Lock</span>: ${Donation}FP<br><span data-i18n="loss">Loss</span>: ${Profit * -1}<br>`;
                        newdonationHTML += gbTabNotSafe(2, currentPercent, Donation, RewardFP, donateCustom, donateSuggest, GBrewards,
                            GBselected.connected, GBselected.level == GBselected.max_level, safe);
                    }
                    if (GBrewards[1]) {
                            olddonationHTML += getFriendlyDonation(donateCustom, RewardFP, currentPercent, Donation);
                        olddonationHTML += `BE: ${RewardFP}FP<br></p>`;
                        if (PlayerName == MyInfo.name && Donation - donateSuggest[1] > 0)
                            olddonationHTML += `<p class="">Add ${(Donation - donateCustom) * 2}FP <span data-i18n="safe">to make safe for</span> ${currentPercent ? currentPercent / 100 : '1.9'}</p>`;
                        copyText += getDonations(2, safe, donateSuggest);
                    } else
                        olddonationHTML += `</p>`;
                }
                // not Top2, Check Top3
                else{
                    getPlaceValues(3);
                    getSafe(3);
                    console.debug('RewardFP/Donation/Profit ',RewardFP,Donation,Profit,donateCustom,currentPercent);
                    if (Donation.isLessThan(BigNumber(remaining))){
                        if (Profit >= 0) {
                            olddonationHTML += `<p class="invest-good">3rd Place<br><span data-i18n="lock">Lock</span>: ${Donation}FP<br><span data-i18n="profit">Profit</span>: ${Profit}<br>`;
                            newdonationHTML += gbTabSafe(3, currentPercent, Donation, RewardFP, donateCustom, donateSuggest, GBrewards,
                                GBselected.connected, GBselected.level == GBselected.max_level, safe);
                        } else {
                            olddonationHTML += `<p class="invest-bad">3rd Place<br><span data-i18n="lock">Lock</span>: ${Donation}FP<br><span data-i18n="loss">Loss</span>: ${Profit * -1}<br>`;
                            newdonationHTML += gbTabNotSafe(3, currentPercent, Donation, RewardFP, donateCustom, donateSuggest, GBrewards,
                                GBselected.connected, GBselected.level == GBselected.max_level, safe);
                        }
                        if(GBrewards[2]){
                                olddonationHTML += getFriendlyDonation(donateCustom,RewardFP,currentPercent,Donation);   
                            olddonationHTML += `BE: ${RewardFP}FP<br></p>`;
                            if(PlayerName == MyInfo.name && Donation - donateSuggest[2] > 0)
                                olddonationHTML += `<p class="">Add ${(Donation - donateCustom) * 2}FP <span data-i18n="safe">to make safe for</span> ${currentPercent ? currentPercent / 100 : '1.9'}</p>`;
                                copyText += getDonations(3,safe,donateSuggest);
                        }else
                         olddonationHTML += `</p>`;
                    }
                    // not Top3, Check Top4
                    else{
                        getPlaceValues(4);
                        getSafe(4);
                        if (Donation.isLessThan(BigNumber(remaining))){
                            if (Profit >= 0) {
                                olddonationHTML += `<p class="invest-good">4th Place<br><span data-i18n="lock">Lock</span>: ${Donation}FP<br><span data-i18n="profit">Profit</span>: ${Profit}<br>`;
                                newdonationHTML += gbTabSafe(4, currentPercent, Donation, RewardFP, donateCustom, donateSuggest, GBrewards,
                                    GBselected.connected, GBselected.level == GBselected.max_level, safe);
                            } else {
                                olddonationHTML += `<p class="invest-bad">4th Place<br><span data-i18n="lock">Lock</span>: ${Donation}FP<br><span data-i18n="loss">Loss</span>: ${Profit * -1}<br>`;
                                newdonationHTML += gbTabNotSafe(4, currentPercent, Donation, RewardFP, donateCustom, donateSuggest, GBrewards,
                                    GBselected.connected, GBselected.level == GBselected.max_level, safe);
                            }
                            if(GBrewards[3]){
                                    olddonationHTML += getFriendlyDonation(donateCustom,RewardFP,currentPercent,Donation);   
                                olddonationHTML += `BE: ${RewardFP}FP<br></p>`;
                                if(PlayerName == MyInfo.name && Donation - donateSuggest[3] > 0)
                                    olddonationHTML += `<p class="">Add ${(Donation - donateCustom) * 2}FP <span data-i18n="safe">to make safe for</span> ${currentPercent ? currentPercent / 100 : '1.9'}</p>`;
                                copyText += getDonations(4,safe,donateSuggest);
                            }else
                                olddonationHTML += `</p>`;
                        }
                        // not Top4, Check Top5
                        else{
                            getPlaceValues(5);
                            getSafe(5);
                            if (Donation.isLessThan(BigNumber(remaining))){
                                if (Profit >= 0) {
                                    olddonationHTML += `<p class="invest-good">5th Place<br><span data-i18n="lock">Lock</span>: ${Donation}FP<br><span data-i18n="profit">Profit</span>: ${Profit}<br>`;
                                    newdonationHTML += gbTabSafe(5, currentPercent, Donation, RewardFP, donateCustom, donateSuggest, GBrewards,
                                        GBselected.connected, GBselected.level == GBselected.max_level, safe);
                                } else {
                                    olddonationHTML += `<p class="invest-bad">5th Place<br><span data-i18n="lock">Lock</span>: ${Donation}FP<br><span data-i18n="loss">Loss</span>: ${Profit * -1}<br>`;
                                    newdonationHTML += gbTabNotSafe(5, currentPercent, Donation, RewardFP, donateCustom, donateSuggest, GBrewards,
                                        GBselected.connected, GBselected.level == GBselected.max_level, safe);
                                }
                                if(GBrewards[4]){
                                        olddonationHTML += getFriendlyDonation(donateCustom,RewardFP,currentPercent,Donation);   
                                    olddonationHTML += `BE: ${RewardFP}FP<br></p>`;
                                    if(PlayerName == MyInfo.name && Donation - donateSuggest[4] > 0)
                                        olddonationHTML += `<p class="">Add ${(Donation - donateCustom) * 2}FP <span data-i18n="safe">to make safe for</span> ${currentPercent ? currentPercent / 100 : '1.9'}</p>`;
                                    copyText += getDonations(5,safe,donateSuggest);
                                }else
                                  olddonationHTML += `</p>`;
                            }
                            else {
                                copyText = "";
                                newdonationHTML += gbTabEmpty("-", currentPercent, Donation, RewardFP, donateCustom, donateSuggest, GBrewards,GBselected.connected, GBselected.level == GBselected.max_level);
                            }
                        }
                    }
                }
            }

        // close table
        if(showOptions.showDonation) {
            if(useNewDonationPanel){
                donation2DIV.innerHTML = newdonationHTML + `</div>`;
            }
            else{
                donation2DIV.innerHTML = olddonationHTML + copyText + (donationSuffix ? donationSuffix : '' + `</div>`);
                if(copyText)
                    document.getElementById("donationCopyID").addEventListener("click", copy.DonationCopy);
                else
                    $('#donationCopyID').hide();
                    // $('#donationCopyID').prop('disabled', true);
    
    
                if(document.getElementById("freeTextLabel"))
                    document.getElementById("freeTextLabel").addEventListener("click", collapse.fCollapseDonation);
            }
            document.getElementById("GBselected").addEventListener("click", clickDonation);
            
            $('body').i18n();
        }
    }

}

export function getConstructionRanking(msg,data){

    for(var j = 0; j < data.length; j++) 
    {
        // console.debug(data[j].requestData[2]);
        GBselected.level = data[j].requestData[2];
    }
    // var donorContainer = null;

    // if(document.getElementById("donor_rewards") == null){
        // donorContainer = document.createElement('div');
        // donorContainer.id = 'donor_rewards';
        // donorContainer.innerHTML = '<p></p>';
        // donorContainer.className = 'alert-success'
        // document.getElementById("content").appendChild(donorContainer);
        // donorContainer.innerHTML = '<p></p>';
        // donorContainer.textContent = 'textContent';
    // }else{
        // donorContainer = document.getElementById("donor_rewards");
    // }

    var outputHTML = '';
    var rowsHTML = '';
    // if(donorContainer.textContent)
        // donorHTML = donorContainer.textContent;
    overview.innerHTML = "";
    //greatbuilding.innerHTML = ``;
    outputHTML = `<div class="alert alert-success alert-dismissible show" role="alert">`;
    outputHTML += `<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
    outputHTML += `<button type="button" class="badge rounded-pill bg-success right-button" id="donorCopyID2"><span data-i18n="copy">Copy</span></button>`;
    
    if(msg.responseData.length) {
        // var total = 0;
        for(var j = 0; j < msg.responseData.length; j++) 
        {
            const place = msg.responseData[j];
            // total += place.forge_points;
            if(place.rank > 0){
                if(place.player.name != 'No contributor yet'){
                    // else{
                        if(place.reward && place.reward.strategy_point_amount){
                            // console.debug('place.forge_points:', place.player.name,place.forge_points,place.reward.strategy_point_amount);
                                rowsHTML += `${place.player.name} ${place.forge_points}FP ${BigNumber(place.forge_points).times(100).div(place.reward.strategy_point_amount).toFormat(0)}%<br>`;
                        }else
                            rowsHTML += `${place.player.name} ${place.forge_points}FP<br>`;
                    // }
                }
                if(place.rank < 6){
                    if(place.rank == 1){
                                // donorHTML += place.reward.strategy_point_amount + '\n';
                        // console.debug(GBselected.level+GBlevelNext,GBrewards[place.rank - 1] , place.reward.strategy_point_amount);
                        // console.debug(GBrewards[place.rank - 1] , place.reward.strategy_point_amount,GBlevelNext);
                    }
                    GBrewards[place.rank -1] = place.reward.strategy_point_amount;
                }
            }
        //greatbuilding.innerHTML = `<div class="table">${greatbuilding.innerHTML}</div>`;
        }
        // donor2HTML += total + '\n';
        // console.debug(donorHTML,donor2HTML);
        // donorContainer.textContent = donorHTML;
    }

    // else{
        outputHTML += `<p id="donorTextLabel2" data-bs-toggle="collapse" href="#donorTextCollapse"><strong><span data-i18n="gb">GB</span> Donors:</strong></p>`;
        outputHTML += `<div id="donorTextCollapse" class="collapse ${collapse.collapseGBDonors ? '' : 'show'}">`;
        outputHTML += `<p><span>${PlayerName} ${GBselected.name} ${GBselected.level}</span><br>`;
        outputHTML += rowsHTML += '</p></div></div>';
    // }


        // console.debug('outputHTML',outputHTML)
    if(showOptions.showGBDonors){ 
        fCheckOutput();
        // else{
            greatbuilding.innerHTML = outputHTML;
            document.getElementById("donorCopyID2").addEventListener("click", copy.DonorCopy2);
            document.getElementById("donorTextLabel2").addEventListener("click", collapse.fCollapseGBDonors);
        // }
        $('body').i18n();
    }

}


function fPercentBanded(Percent){
    if (Percent>=20) return 'green' 
    else if (Percent>=10) return 'invest-good'
    else if (Percent>5) return 'invest-fair'
    return '';
}

function round(number){
    return Math.round(Math.round(number * 10)/10);
}

function fCheckOutput(){
    if(greatbuilding == null){
        greatbuilding = document.createElement('div');
        document.getElementById("content").appendChild(greatbuilding);
        greatbuilding.id="greatbuilding";
    }
    if(donationDIV == null){
        donationDIV = document.createElement('div');
        document.getElementById("content").appendChild(donationDIV);
        donationDIV.id="donation";
    }

}

function fDonationSuggest(reward){
    console.debug(reward,currentPercent,BigNumber(reward).times(currentPercent).div(100).dp(0));
    return new BigNumber(reward).times(currentPercent).div(100).dp(0);
}

export function setCurrentPercent(percent){
    if(percent) 
        currentPercent = percent;
    else
        currentPercent = donationPercent;
        console.debug(percent);
}

function gbTabSafe(place, currentPercent, donation, rewardFP, donateCustom, donateSuggest, bgrewards, connected, maxlevel, safe)
{
  var placeString = place == 1 ? "1st": place == 2 ? "2nd" : place == 3 ? "3rd" : place+"th";
  var playerShortName = PlayerName.length > 5 ? PlayerName.substr(0, PlayerName.indexOf(" ")) : PlayerName;
  var remainingInvestors = 0;
  var i;
  for (i = place-1; i <= 4; i++) {
    remainingInvestors +=  fDonationSuggest(bgrewards[i]);
  }
  var remainingOwner = GBselected.total - GBselected.current - remainingInvestors;

  var footer = "";
  if (PlayerName == MyInfo.name) 
  {
    footer = `<div class="card-footer text-muted">`;
    if (donation - donateSuggest[place - 1] > 0) 
    {
      footer += `Add <strong>${(donation - donateCustom) * 2} FP </strong> <span data-i18n="safe">to make safe for</span> ${ currentPercent ? currentPercent / 100 : "1.9" }`;
    }
    var txt = getDonations_new(place,safe,donateSuggest);
    if(txt){
        footer += `<div id='copyText'>${showOptions.showGuildPosition && PlayerName == MyInfo.name && MyInfo.guildPosition ? "#" + MyInfo.guildPosition + " ": ""}${playerShortName ? playerShortName : PlayerName} ${helper.fGBsname(GBselected.name)} `;
        footer += txt + '</div>';
    }
    // footer += `</div><p>Remaining <strong>${GBselected.total - GBselected.current}</strong> FPs [${remainingOwner} (owner) / ${remainingInvestors} (investors)]</p>`;
    footer += `<p>Remaining <strong>${GBselected.total - GBselected.current}</strong> FPs</p>`;
  }
  let htmlText = `<div class="card ${darkMode == 'dark' ? 'text-light bg-dark' : 'text-dark bg-light'} alert show collapsed p-0" >
    <div class="card-header fw-bold"><span data-i18n="gb">GB</span> <span data-i18n="donation">donation</span> [${getPlayerLink()}]${connected == null ? '<br><span class="red">*** DISCONNECTED ***</span>' : ""}${checkInactive()}${maxlevel == true ? '<br><span class="red">*** LOCKED ***</span>' : ""} 
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      <button type="button" class="badge rounded-pill bg-info float-end mt-1 mr-1" id="donationCopyID"><span data-i18n="copy">Copy</span></button> 
    </div>
    <div class="card-body alert-success p-2">
      <h6 class="card-title mb-0"> <span id="GBselected">${GBselected.name} [${GBselected.level}/${GBselected.max_level}] (${GBselected.current}/${GBselected.total} FPs)</span></h6>
      <table class="table mb-1">
      <thead>
      <tr>
      <th class="border border-top-0 border-left-0 border-right-0 border-dark">#</th>
      <th class="border border-top-0 border-left-0 border-right-0 border-dark">Lock</th>
      <th class="border border-top-0 border-left-0 border-right-0 border-dark">${currentPercent / 100}</th>
      <th class="border border-top-0 border-left-0 border-right-0 border-dark">Reward</th>
      </tr>
      </thead>
      <tbody>
      <tr>
      <td><strong>${placeString}</strong></td>
      <td>${donation} FP <strong>[+${rewardFP - donation} FP]</strong></td>
      <td>${donateCustom} FP</td>
      <td>${rewardFP} FP</td>
      </tr>
      </tbody>
      </table>
    </div>`+ footer + `</div>`
  return htmlText;
}
function gbTabNotSafe(place, currentPercent, donation, rewardFP, donateCustom, donateSuggest, bgrewards, connected, maxlevel, safe)
{
  var placeString = place == 1 ? "1st": place == 2 ? "2nd" : place == 3 ? "3rd" : place+"th";
  var playerShortName = PlayerName.length > 5 ? PlayerName.substr(0, PlayerName.indexOf(" ")) : PlayerName;
  var remainingInvestors =0;
  var i;
  for (i = place - 1; i <= 4; i++) {
    remainingInvestors += fDonationSuggest(bgrewards[i]);
  }
  var remainingOwner = GBselected.total - GBselected.current - remainingInvestors;
  var footer = "";  
  if (PlayerName == MyInfo.name) 
  {
    footer = `<div class="card-footer text-muted">`;
    if (donation - donateSuggest[place - 1] > 0) 
    {
      footer += `Add <strong>${(donation - donateCustom) * 2} FP </strong> <span data-i18n="safe">to make safe for</span> ${ currentPercent ? currentPercent / 100 : "1.9" }`;
    }
    var txt = getDonations_new(place,safe,donateSuggest);
    if(txt){
        footer += `<div id='copyText'>${showOptions.showGuildPosition && PlayerName == MyInfo.name && MyInfo.guildPosition ? "#" + MyInfo.guildPosition + " ": ""}${playerShortName ? playerShortName : PlayerName} ${helper.fGBsname(GBselected.name)} `;
        footer += txt + '</div>';
    }
    // footer += `<p>Remaining <strong>${GBselected.total - GBselected.current}</strong> FPs [${remainingOwner} (owner) / ${remainingInvestors} (investors)]</p>`;
    footer += `<p>Remaining <strong>${GBselected.total - GBselected.current}</strong> FPs</p>`;
  }
  let htmlText = `<div class="card ${darkMode == 'dark' ? 'text-light bg-dark' : 'text-dark bg-light'} alert show collapsed p-0 "  >
           <div class="card-header fw-bold"><span data-i18n="gb">GB</span> <span data-i18n="donation">Donation</span> [${getPlayerLink()}]
           <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
           <button type="button" class="badge rounded-pill bg-info float-end mt-1 mr-1" id="donationCopyID"><span data-i18n="copy">Copy</span></button> 
           </div>
           <div class="card-body alert-danger p-2">
           <h6 class="card-title mb-0"> <span id="GBselected">${GBselected.name} [${GBselected.level}/${GBselected.max_level}] (${GBselected.current}/${GBselected.total})</span></h6>
           <table class="table mb-1">
       <thead>
       <tr>
        <th class="border border-top-0 border-left-0 border-right-0 border-dark">#</th>
        <th class="border border-top-0 border-left-0 border-right-0 border-dark">Lock</th>
        <th class="border border-top-0 border-left-0 border-right-0 border-dark">${
          currentPercent / 100
        }</th>
        <th class="border border-top-0 border-left-0 border-right-0 border-dark">Reward</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>${placeString}</strong></td>
        <td>${donation} FP <strong>[${rewardFP - donation} FP]</strong></td>
        <td>${donateCustom} FP</td>
        <td>${rewardFP} FP</td>
      </tr>
    </tbody>
  </table>
  </div>` + footer + `</div>`
  /*`<div class="card-body alert-primary p-2"> 
  <h6 class="card-title mb-0">Information</h6>
       <table class="table alert-primary mb-1">
        <tr>
          <td class="fw-bold">Level:</td>
          <td class="text-right">${GBselected.level}/${GBselected.max_level}</td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
        <tr>
          <td class="fw-bold">FPs:</td>
          <td class="text-right">${GBselected.current}/${GBselected.total}</td>
          <td class="">(${GBselected.total - GBselected.current})</td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      </thead>
  </div>`;*/
  return htmlText;
}

function gbTabEmpty(
  place,
  currentPercent,
  donation,
  rewardFP,
  donateCustom,
  donateSuggest,
  bgrewards,
  connected,
  maxlevel
) {
  let htmlText = `<div class="card ${darkMode == 'dark' ? 'text-light bg-dark' : 'text-dark bg-light'} alert show collapsed p-0 " >
           <div class="card-header fw-bold"> GB Donation [${getPlayerLink()}]<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>
           <div class="card-body alert-danger p-2">
           <h6 class="card-title mb-0""> <span id="GBselected">${GBselected.name} [${GBselected.level + 1}]</span></h6>
           <table class="table mb-1">
       <thead>
       <tr>
        <th class="border border-top-0 border-left-0 border-right-0 border-dark">#</th>
        <th class="border border-top-0 border-left-0 border-right-0 border-dark">Lock</th>
        <th class="border border-top-0 border-left-0 border-right-0 border-dark">${
          currentPercent / 100
        }</th>
        <th class="border border-top-0 border-left-0 border-right-0 border-dark">Reward</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>-</strong></td>
        <td>-</strong></td>
        <td>-</td>
        <td>-</td>
      </tr>
    </tbody>
  </table>
  </div>`;
  return htmlText;
}

function checkInactive(){
    var html = inactiveHTML(hoodlist);
	if(html == '')	html += inactiveHTML(friends);		
	if(html == '')	html += inactiveHTML(guildMembers);
	return html;

}

function inactiveHTML(members){
    members.forEach(entry => {
        if(entry.is_self != true && PlayerID == entry.player_id && entry.is_active != true)
            return `<br><span class='red'>*** <span data-i18n="inactive">INACTIVE</span> ***</span>`;
    });
    return '';
}

function getDonations_new(place,safe,donateSuggest){
    var footer = '';
    console.debug(place,safe,donateSuggest);
    if (place <= 5 && safe[4]) { footer += `P5(${donateSuggest[4]}) `; }
    if (place <= 4 && safe[3]) { footer += `P4(${donateSuggest[3]}) `; }
    if (place <= 3 && safe[2]) { footer += `P3(${donateSuggest[2]}) `; }
    if (place <= 2 && safe[1]) { footer += `P2(${donateSuggest[1]}) `; }
    if (place <= 1 && safe[0]) { footer += `P1(${donateSuggest[0]}) `; }
    return footer;
}

function getPlayerLink(){
    return '<a href="https://foe.scoredb.io/' + GameOrigin + '/Player/' + PlayerID + '" target="_blank">' + PlayerName + '</a>';
}

function getDonations(place,safe,donateSuggest){
    var footer = '';
    console.debug(place,safe,donateSuggest);
    for(var i = 5; i > 0; i--) {
        if (place <= i && donateSuggest[i-1] > 0 && (safe[i-1] || !showOptions.hideUnsafe)) { footer += `<span class="${safe[i-1] ? 'invest-good' : 'invest-bad'}">P${i + "(" + donateSuggest[i-1]})</span> `; }
    };
    return footer;
}

function clickDonation(event){
    console.debug('event',event);
    if(event.shiftKey){
        useNewDonationPanel = !useNewDonationPanel;
        storage.set('useNewDonationPanel',useNewDonationPanel);
        console.debug('useNewDonationPanel',useNewDonationPanel);
        showGreatBuldingDonation();
    }
}

function getFriendlyDonation(donation,reward,percent,lock){
    console.debug(donation,reward,percent,lock,(donation.isGreaterThan(reward) || lock.isGreaterThan(donation)),donation.isGreaterThan(reward),lock.isGreaterThan(donation));
    return `<span class="${(donation.isGreaterThan(reward) || lock.isGreaterThan(donation)) ? 'red' : 'green'}">${percent / 100}: ${donation}FP</span><br>`;   
}

function getSafe(place){
    safe = [];
    donateSuggest = [];
    var index = place - 1;
    var rem = remaining;
    for(var i = index; i < 5; i++) {
        donateSuggest[i] = new BigNumber(GBrewards[i]).times(currentPercent).div(100).dp(0);
        rem -= donateSuggest[i];
        safe[i] = (rem <= donateSuggest[i] - Top[place]) ? true : false;
    };
}

function getPlaceValues(place){
    var index = place - 1;
    Donation = new BigNumber(GBselected.total - GBselected.current + Top[index]).div(2).dp(0,2);
    RewardFP = new BigNumber(GBrewards[index]).multipliedBy(1 + (City.ArcBonus)/100).dp(0);
    Profit = RewardFP.minus(Donation).toString();
    Percent = new BigNumber(Profit).multipliedBy(100).idiv(Donation);
    const band = fPercentBanded(Percent);
    donateCustom = new BigNumber(GBrewards[index]).multipliedBy(currentPercent).div(100).dp(0);
    remaining = GBselected.total - GBselected.current;
}