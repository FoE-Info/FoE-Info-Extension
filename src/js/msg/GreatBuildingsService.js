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

// import '../../css/main.css';
import BigNumber from 'bignumber.js';
import * as element from '../fn/AddElement';
import * as collapse from '../fn/collapse.js';
import * as copy from '../fn/copy.js';
import * as helper from '../fn/helper.js';
import * as storage from '../fn/storage.js';
import { showOptions } from '../vars/showOptions.js';
import {
  cityinvested,
  donation2DIV,
  donationDIV,
  donationDIV2,
  donationPercent,
  donationSuffix,
  GameOrigin,
  GBselected,
  greatbuilding,
  MyInfo,
  overview,
  PlayerID,
  PlayerName,
  setPlayerName,
  url,
} from '../vars/state.js';
import { friends, guildMembers, hoodlist } from './OtherPlayerService';
import { City } from './StartupService.js';

var Top = [0, 0, 0, 0, 0, 0];
var GBrewards = [0, 0, 0, 0, 0];
var Reward = [0, 0, 0, 0, 0];
var currentPercent = donationPercent ? donationPercent : 190;
var googleSheetGame = '';
var useNewDonationPanel = false;
var rankings;
var donateSuggest = [];
var donateCustom = new BigNumber(0);
var safe = [];
var remaining = 0;
var Donation = new BigNumber(0);
var RewardFP = new BigNumber(0);
var Profit = 0;
var Percent = new BigNumber(0);
const darkMode = false; // dont use darkMode until we sort out a dark theme to use

if (storage.getSync('useNewDonationPanel') !== null)
  useNewDonationPanel = storage.getSync('useNewDonationPanel');

if (url && url.hasOwnProperty('sheetGameURL'))
  googleSheetGame = url.sheetGameURL;

export function getConstruction(msg) {
  rankings = msg.responseData.rankings;
  console.debug('rankings', rankings);
  showGreatBuldingDonation();
}

export function contributeForgePoints(msg) {
  rankings = msg;
  console.debug('rankings', rankings);
  showGreatBuldingDonation();
}

export function showGreatBuldingDonation() {
  var outputHTML = '';
  var donorsHTML = '';
  overview.innerHTML = '';
  //greatbuilding.innerHTML = ``;
  outputHTML = `<div class="alert alert-success alert-dismissible" role="alert">
    <p id="donorTextLabel" data-bs-toggle="collapse" href="#donorcollapse">`;
  outputHTML += element.icon(
    'donoricon',
    'donorcollapse',
    collapse.collapseGBDonors,
  );
  outputHTML += `<strong><span data-i18n="gb">GB</span> Donors:</strong></p>`;
  outputHTML += element.copy(
    'donorCopyID',
    'success',
    'right',
    collapse.collapseGBDonors,
  );
  outputHTML += element.close();
  outputHTML += `<div id="donorcollapse" class="collapse ${
    collapse.collapseGBDonors ? '' : 'show'
  }"><p id="donorText">`;

  // if (debug == true)
  // 	greatbuilding.innerHTML += `<div>${contentType} : ${msg.requestClass} : ${msg.requestMethod}</div>`;
  console.debug('rankings', rankings);
  if (rankings.length) {
    var Rank = 0;

    for (var j = 0; j < rankings.length; j++) {
      const place = rankings[j];
      if (place.hasOwnProperty('rank')) {
        Rank = place.rank;
        if (donorsHTML != '' && place.player.name != 'No contributor yet') {
          donorsHTML += '<br>';
          // console.debug(j,place,donorsHTML);
        }
      } else Rank = 0;
      if (Rank > 0) {
        if (Rank < 6) {
          if (place.forge_points) Top[Rank - 1] = place.forge_points;
          else Top[Rank - 1] = 0;
          if (place.reward.strategy_point_amount)
            GBrewards[Rank - 1] = new BigNumber(
              place.reward.strategy_point_amount,
            ).dp(0);
          else GBrewards[Rank - 1] = 0;
          Reward[Rank - 1] = BigNumber(GBrewards[Rank - 1])
            .times(1.9)
            .integerValue(BigNumber.ROUND_CEIL);
          // console.debug(place.reward.strategy_point_amount,BigNumber(place.reward.strategy_point_amount).dp(0),GBrewards[Rank-1]);
        } else if (Rank == 6) {
          if (place.forge_points) Top[5] = place.forge_points;
          else Top[5] = 0;
        }
        if (Rank > 0) {
          // else{
          // console.debug('place.forge_points:', place.player.name,place.forge_points,place.reward.strategy_point_amount);
          if (place.player.name != 'No contributor yet') {
            const safePlayerName = helper.escapeHTML(place.player.name);
            if (place.reward && place.reward.strategy_point_amount) {
              donorsHTML += `${safePlayerName} ${place.forge_points}FP ${BigNumber(
                place.forge_points,
              )
                .times(100)
                .div(place.reward.strategy_point_amount)
                .toFormat(0)}%`;
            } else {
              donorsHTML += `${safePlayerName} ${place.forge_points}FP`;
            }
          }
          // }
        }
      } else {
        if (PlayerID == place.player.player_id)
          // PlayerName = place.player.name;
          setPlayerName(place.player.name, PlayerID);
      }
    }
    // console.debug('Reward',Reward);

    console.debug('outputHTML', outputHTML, donorsHTML);
    if (showOptions.showGBDonors) {
      fCheckOutput();

      greatbuilding.innerHTML = outputHTML + donorsHTML;
      document
        .getElementById('donorCopyID')
        ?.addEventListener('click', copy.DonorCopy);
      document
        .getElementById('donorTextLabel')
        ?.addEventListener('click', collapse.fCollapseGBDonors);
    }

    var playerShortName =
      PlayerName.length > 5 ?
        PlayerName.substr(0, PlayerName.indexOf(' '))
      : PlayerName;
    var newdonationHTML = '';
    var copyText = `<div id='copyText'>${
      (
        showOptions.showGuildPosition &&
        PlayerName == MyInfo.name &&
        MyInfo.guildPosition
      ) ?
        '#' + MyInfo.guildPosition + ' '
      : ''
    }${playerShortName ? playerShortName : PlayerName} ${helper.fGBsname(GBselected.name)} `;
    var olddonationHTML = `<div class="alert alert-secondary alert-dismissible show collapsed" role="alert">
            ${element.close()}
            <p id="freeTextLabel" href="#donationText3" aria-controls="donationText3" data-bs-toggle="collapse">
      ${element.icon('donationicon', 'donationText3', collapse.collapseDonation)}
            <strong><span data-i18n="gb">GB</span> <span data-i18n="donation">Donation</span>:</strong></p>`;
    olddonationHTML += element.copy(
      'donationCopyID',
      'secondary',
      'right',
      collapse.collapseDonation,
    );
    olddonationHTML += `<div id="donationText3" class="collapse ${
      collapse.collapseDonation ? '' : 'show'
    }"><p>${getPlayerLink()}<br>`;
    olddonationHTML += `<span id="GBselected">${helper.escapeHTML(GBselected.name)} ${GBselected.level + 1}</span></p>`;
    if (GBselected.connected == null) {
      olddonationHTML += '<p class="red">*** DISCONNECTED ***</p>';
    }
    if (GBselected.level == GBselected.max_level) {
      olddonationHTML += '<p class="red">*** LOCKED ***</p>';
    }
    olddonationHTML += checkInactive();

    donationDIV.innerHTML = '';
    donationDIV.style.display = 'block';

    // Check Top1
    getPlaceValues(1);
    getSafe(1);
    console.debug('RewardFP/Donation/Profit ', RewardFP, Donation, Profit);
    if (Donation.isLessThan(BigNumber(remaining))) {
      if (Profit >= 0) {
        olddonationHTML += `<p class="invest-good">1st Place<br><span data-i18n="lock">Lock</span>: ${Donation}FP<br><span data-i18n="profit">Profit</span>: ${Profit} (${Percent}%)<br>`;
        newdonationHTML += gbTabSafe(
          1,
          currentPercent,
          Donation,
          RewardFP,
          donateCustom,
          donateSuggest,
          GBrewards,
          GBselected.connected,
          GBselected.level == GBselected.max_level,
          safe,
        );
      } else {
        olddonationHTML += `<p class="invest-bad">1st Place<br><span data-i18n="lock">Lock</span>: ${Donation}FP<br><span data-i18n="loss">Loss</span>: ${
          Profit * -1
        }<br>`;
        newdonationHTML += gbTabNotSafe(
          1,
          currentPercent,
          Donation,
          RewardFP,
          donateCustom,
          donateSuggest,
          GBrewards,
          GBselected.connected,
          GBselected.level == GBselected.max_level,
          safe,
        );
      }
      if (GBrewards[0]) {
        olddonationHTML += getFriendlyDonation(
          donateCustom,
          RewardFP,
          currentPercent,
          Donation,
        );
        olddonationHTML += `BE: ${RewardFP}FP</p>`;
      } else olddonationHTML += `</p>`;
      if (PlayerName == MyInfo.name && Donation - donateSuggest[0] > 0)
        olddonationHTML += `<p class=""><span data-i18n="add">Add</span> ${
          (Donation - donateCustom) * 2
        }FP <span data-i18n="safe">to make safe for</span> ${currentPercent ? currentPercent / 100 : '1.9'}</p>`;
      copyText += getDonations(1, safe, donateSuggest);
    }
    // not Top1, Check Top2
    else {
      getPlaceValues(2);
      getSafe(2);
      if (Donation.isLessThan(BigNumber(remaining))) {
        if (Profit >= 0) {
          olddonationHTML += `<p class="invest-good">2nd Place<br><span data-i18n="lock">Lock</span>: ${Donation}FP<br><span data-i18n="profit">Profit</span>: ${Profit} (${Percent}%)<br>`;
          newdonationHTML += gbTabSafe(
            2,
            currentPercent,
            Donation,
            RewardFP,
            donateCustom,
            donateSuggest,
            GBrewards,
            GBselected.connected,
            GBselected.level == GBselected.max_level,
            safe,
          );
        } else {
          olddonationHTML += `<p class="invest-bad">2nd Place<br><span data-i18n="lock">Lock</span>: ${Donation}FP<br><span data-i18n="loss">Loss</span>: ${
            Profit * -1
          }<br>`;
          newdonationHTML += gbTabNotSafe(
            2,
            currentPercent,
            Donation,
            RewardFP,
            donateCustom,
            donateSuggest,
            GBrewards,
            GBselected.connected,
            GBselected.level == GBselected.max_level,
            safe,
          );
        }
        if (GBrewards[1]) {
          olddonationHTML += getFriendlyDonation(
            donateCustom,
            RewardFP,
            currentPercent,
            Donation,
          );
          olddonationHTML += `BE: ${RewardFP}FP<br></p>`;
          if (PlayerName == MyInfo.name && Donation - donateSuggest[1] > 0)
            olddonationHTML += `<p class="">Add ${
              (Donation - donateCustom) * 2
            }FP <span data-i18n="safe">to make safe for</span> ${currentPercent ? currentPercent / 100 : '1.9'}</p>`;
          copyText += getDonations(2, safe, donateSuggest);
        } else olddonationHTML += `</p>`;
      }
      // not Top2, Check Top3
      else {
        getPlaceValues(3);
        getSafe(3);
        console.debug(
          'RewardFP/Donation/Profit ',
          RewardFP,
          Donation,
          Profit,
          donateCustom,
          currentPercent,
        );
        if (Donation.isLessThan(BigNumber(remaining))) {
          if (Profit >= 0) {
            olddonationHTML += `<p class="invest-good">3rd Place<br><span data-i18n="lock">Lock</span>: ${Donation}FP<br><span data-i18n="profit">Profit</span>: ${Profit} (${Percent}%)<br>`;
            newdonationHTML += gbTabSafe(
              3,
              currentPercent,
              Donation,
              RewardFP,
              donateCustom,
              donateSuggest,
              GBrewards,
              GBselected.connected,
              GBselected.level == GBselected.max_level,
              safe,
            );
          } else {
            olddonationHTML += `<p class="invest-bad">3rd Place<br><span data-i18n="lock">Lock</span>: ${Donation}FP<br><span data-i18n="loss">Loss</span>: ${
              Profit * -1
            }<br>`;
            newdonationHTML += gbTabNotSafe(
              3,
              currentPercent,
              Donation,
              RewardFP,
              donateCustom,
              donateSuggest,
              GBrewards,
              GBselected.connected,
              GBselected.level == GBselected.max_level,
              safe,
            );
          }
          if (GBrewards[2]) {
            olddonationHTML += getFriendlyDonation(
              donateCustom,
              RewardFP,
              currentPercent,
              Donation,
            );
            olddonationHTML += `BE: ${RewardFP}FP<br></p>`;
            if (PlayerName == MyInfo.name && Donation - donateSuggest[2] > 0)
              olddonationHTML += `<p class="">Add ${
                (Donation - donateCustom) * 2
              }FP <span data-i18n="safe">to make safe for</span> ${currentPercent ? currentPercent / 100 : '1.9'}</p>`;
            copyText += getDonations(3, safe, donateSuggest);
          } else olddonationHTML += `</p>`;
        }
        // not Top3, Check Top4
        else {
          getPlaceValues(4);
          getSafe(4);
          if (Donation.isLessThan(BigNumber(remaining))) {
            if (Profit >= 0) {
              olddonationHTML += `<p class="invest-good">4th Place<br><span data-i18n="lock">Lock</span>: ${Donation}FP<br><span data-i18n="profit">Profit</span>: ${Profit} (${Percent}%)<br>`;
              newdonationHTML += gbTabSafe(
                4,
                currentPercent,
                Donation,
                RewardFP,
                donateCustom,
                donateSuggest,
                GBrewards,
                GBselected.connected,
                GBselected.level == GBselected.max_level,
                safe,
              );
            } else {
              olddonationHTML += `<p class="invest-bad">4th Place<br><span data-i18n="lock">Lock</span>: ${Donation}FP<br><span data-i18n="loss">Loss</span>: ${
                Profit * -1
              }<br>`;
              newdonationHTML += gbTabNotSafe(
                4,
                currentPercent,
                Donation,
                RewardFP,
                donateCustom,
                donateSuggest,
                GBrewards,
                GBselected.connected,
                GBselected.level == GBselected.max_level,
                safe,
              );
            }
            if (GBrewards[3]) {
              olddonationHTML += getFriendlyDonation(
                donateCustom,
                RewardFP,
                currentPercent,
                Donation,
              );
              olddonationHTML += `BE: ${RewardFP}FP<br></p>`;
              if (PlayerName == MyInfo.name && Donation - donateSuggest[3] > 0)
                olddonationHTML += `<p class="">Add ${
                  (Donation - donateCustom) * 2
                }FP <span data-i18n="safe">to make safe for</span> ${
                  currentPercent ? currentPercent / 100 : '1.9'
                }</p>`;
              copyText += getDonations(4, safe, donateSuggest);
            } else olddonationHTML += `</p>`;
          }
          // not Top4, Check Top5
          else {
            getPlaceValues(5);
            getSafe(5);
            if (Donation.isLessThan(BigNumber(remaining))) {
              if (Profit >= 0) {
                olddonationHTML += `<p class="invest-good">5th Place<br><span data-i18n="lock">Lock</span>: ${Donation}FP<br><span data-i18n="profit">Profit</span>: ${Profit} (${Percent}%)<br>`;
                newdonationHTML += gbTabSafe(
                  5,
                  currentPercent,
                  Donation,
                  RewardFP,
                  donateCustom,
                  donateSuggest,
                  GBrewards,
                  GBselected.connected,
                  GBselected.level == GBselected.max_level,
                  safe,
                );
              } else {
                olddonationHTML += `<p class="invest-bad">5th Place<br><span data-i18n="lock">Lock</span>: ${Donation}FP<br><span data-i18n="loss">Loss</span>: ${
                  Profit * -1
                }<br>`;
                newdonationHTML += gbTabNotSafe(
                  5,
                  currentPercent,
                  Donation,
                  RewardFP,
                  donateCustom,
                  donateSuggest,
                  GBrewards,
                  GBselected.connected,
                  GBselected.level == GBselected.max_level,
                  safe,
                );
              }
              if (GBrewards[4]) {
                olddonationHTML += getFriendlyDonation(
                  donateCustom,
                  RewardFP,
                  currentPercent,
                  Donation,
                );
                olddonationHTML += `BE: ${RewardFP}FP<br></p>`;
                if (
                  PlayerName == MyInfo.name &&
                  Donation - donateSuggest[4] > 0
                )
                  olddonationHTML += `<p class="">Add ${
                    (Donation - donateCustom) * 2
                  }FP <span data-i18n="safe">to make safe for</span> ${
                    currentPercent ? currentPercent / 100 : '1.9'
                  }</p>`;
                copyText += getDonations(5, safe, donateSuggest);
              } else olddonationHTML += `</p>`;
            } else {
              copyText = '';
              newdonationHTML += gbTabEmpty(
                '-',
                currentPercent,
                Donation,
                RewardFP,
                donateCustom,
                donateSuggest,
                GBrewards,
                GBselected.connected,
                GBselected.level == GBselected.max_level,
              );
            }
          }
        }
      }
    }

    // close table
    if (showOptions.showDonation) {
      if (useNewDonationPanel) {
        donation2DIV.innerHTML = newdonationHTML + `</div>`;
      } else {
        donation2DIV.innerHTML =
          olddonationHTML +
          copyText +
          (donationSuffix ? donationSuffix : '' + `</div>`);
        const donationCopyEl = document.getElementById('donationCopyID');
        if (donationCopyEl) {
          donationCopyEl.addEventListener('click', copy.DonationCopy);
          if (!copyText) donationCopyEl.style.display = 'none';
        }

        if (document.getElementById('freeTextLabel'))
          document
            .getElementById('freeTextLabel')
            .addEventListener('click', collapse.fCollapseDonation);
      }
      document
        .getElementById('GBselected')
        ?.addEventListener('click', clickDonation);

      helper.translateContainer(donationDIV);
    }
  }
}

export function getConstructionRanking(msg, data) {
  for (var j = 0; j < data.length; j++) {
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
  overview.innerHTML = '';
  //greatbuilding.innerHTML = ``;
  outputHTML = `<div class="alert alert-success alert-dismissible show" role="alert">`;
  outputHTML += element.close();
  outputHTML += element.copy(
    'donorCopyID2',
    'success',
    'right',
    collapse.collapseGBDonors,
  );
  if (msg.responseData.length) {
    // var total = 0;
    for (var j = 0; j < msg.responseData.length; j++) {
      const place = msg.responseData[j];
      // total += place.forge_points;
      if (place.rank > 0) {
        if (place.player.name != 'No contributor yet') {
          // else{
          if (place.reward && place.reward.strategy_point_amount) {
            // console.debug('place.forge_points:', place.player.name,place.forge_points,place.reward.strategy_point_amount);
            rowsHTML += `${place.player.name} ${place.forge_points}FP ${BigNumber(
              place.forge_points,
            )
              .times(100)
              .div(place.reward.strategy_point_amount)
              .toFormat(0)}%<br>`;
          } else rowsHTML += `${place.player.name} ${place.forge_points}FP<br>`;
          // }
        }
        if (place.rank < 6) {
          if (place.rank == 1) {
            // donorHTML += place.reward.strategy_point_amount + '\n';
            // console.debug(GBselected.level+GBlevelNext,GBrewards[place.rank - 1] , place.reward.strategy_point_amount);
            // console.debug(GBrewards[place.rank - 1] , place.reward.strategy_point_amount,GBlevelNext);
          }
          GBrewards[place.rank - 1] = place.reward.strategy_point_amount;
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
  if (showOptions.showGBDonors) {
    fCheckOutput();
    // else{
    greatbuilding.innerHTML = outputHTML;
    document
      .getElementById('donorCopyID2')
      ?.addEventListener('click', copy.DonorCopy2);
    document
      .getElementById('donorTextLabel2')
      ?.addEventListener('click', collapse.fCollapseGBDonors);
    // }
    helper.translateContainer(greatbuilding);
  }
}

function fPercentBanded(Percent) {
  if (Percent >= 20) return 'green';
  else if (Percent >= 10) return 'invest-good';
  else if (Percent > 5) return 'invest-fair';
  return '';
}

function round(number) {
  return Math.round(Math.round(number * 10) / 10);
}

function fCheckOutput() {
  const contentEl =
    typeof document !== 'undefined' ? document.getElementById('content') : null;
  if (greatbuilding) {
    greatbuilding.id = 'greatbuilding';
    if (contentEl && !contentEl.contains(greatbuilding)) {
      contentEl.appendChild(greatbuilding);
    }
  }
  if (donationDIV) {
    donationDIV.id = 'donation';
    if (contentEl && !contentEl.contains(donationDIV)) {
      contentEl.appendChild(donationDIV);
    }
  }
}

function fDonationSuggest(reward) {
  return new BigNumber(reward)
    .times(currentPercent)
    .div(100)
    .integerValue(BigNumber.ROUND_CEIL);
}

export function setCurrentPercent(percent) {
  if (percent) currentPercent = percent;
  else currentPercent = donationPercent;
  console.debug(percent);
}

function gbTabSafe(
  place,
  currentPercent,
  donation,
  rewardFP,
  donateCustom,
  donateSuggest,
  bgrewards,
  connected,
  maxlevel,
  safe,
) {
  var placeString =
    place == 1 ? '1st'
    : place == 2 ? '2nd'
    : place == 3 ? '3rd'
    : place + 'th';
  var playerShortName =
    PlayerName.length > 5 ?
      PlayerName.substr(0, PlayerName.indexOf(' '))
    : PlayerName;
  var remainingInvestors = 0;
  var i;
  for (i = place - 1; i <= 4; i++) {
    remainingInvestors = new BigNumber(remainingInvestors)
      .plus(fDonationSuggest(bgrewards[i]))
      .toNumber();
  }
  var remainingOwner =
    GBselected.total - GBselected.current - remainingInvestors;

  var footer = '';
  if (PlayerName == MyInfo.name) {
    footer = `<div class="card-footer text-muted">`;
    if (donation - donateSuggest[place - 1] > 0) {
      footer += `Add <strong>${
        (donation - donateCustom) * 2
      } FP </strong> <span data-i18n="safe">to make safe for</span> ${currentPercent ? currentPercent / 100 : '1.9'}`;
    }
    var txt = getDonations_new(place, safe, donateSuggest);
    if (txt) {
      footer += `<div id='copyText'>${
        (
          showOptions.showGuildPosition &&
          PlayerName == MyInfo.name &&
          MyInfo.guildPosition
        ) ?
          '#' + MyInfo.guildPosition + ' '
        : ''
      }${playerShortName ? playerShortName : PlayerName} ${helper.fGBsname(GBselected.name)} `;
      footer += txt + '</div>';
    }
    // footer += `</div><p>Remaining <strong>${GBselected.total - GBselected.current}</strong> FPs [${remainingOwner} (owner) / ${remainingInvestors} (investors)]</p>`;
    footer += `<p>Remaining <strong>${GBselected.total - GBselected.current}</strong> FPs</p>`;
  }
  let htmlText =
    `<div class="card ${darkMode == 'dark' ? 'text-light bg-dark' : 'text-dark bg-light'} alert show collapsed p-0" >
    <div class="card-header fw-bold"><span data-i18n="gb">GB</span> <span data-i18n="donation">donation</span> [` +
    getPlayerLink() +
    `]` +
    (connected == null ?
      '<br><span class="red">*** DISCONNECTED ***</span>'
    : '') +
    checkInactive() +
    (maxlevel == true ? '<br><span class="red">*** LOCKED ***</span>' : '') +
    element.close() +
    element.copy('donationCopyID', 'info', 'right', collapse.collapseDonation) +
    `</div><div class="card-body alert-success p-2">
      <h6 class="card-title mb-0"> <span id="GBselected">${GBselected.name} [${GBselected.level}/${
        GBselected.max_level
      }] (${GBselected.current}/${GBselected.total} FPs)</span></h6>
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
    </div>` +
    footer +
    `</div>`;
  return htmlText;
}
function gbTabNotSafe(
  place,
  currentPercent,
  donation,
  rewardFP,
  donateCustom,
  donateSuggest,
  bgrewards,
  connected,
  maxlevel,
  safe,
) {
  var placeString =
    place == 1 ? '1st'
    : place == 2 ? '2nd'
    : place == 3 ? '3rd'
    : place + 'th';
  var playerShortName =
    PlayerName.length > 5 ?
      PlayerName.substr(0, PlayerName.indexOf(' '))
    : PlayerName;
  var remainingInvestors = 0;
  var i;
  for (i = place - 1; i <= 4; i++) {
    remainingInvestors = new BigNumber(remainingInvestors)
      .plus(fDonationSuggest(bgrewards[i]))
      .toNumber();
  }
  var remainingOwner =
    GBselected.total - GBselected.current - remainingInvestors;
  var footer = '';
  if (PlayerName == MyInfo.name) {
    footer = `<div class="card-footer text-muted">`;
    if (donation - donateSuggest[place - 1] > 0) {
      footer += `Add <strong>${
        (donation - donateCustom) * 2
      } FP </strong> <span data-i18n="safe">to make safe for</span> ${currentPercent ? currentPercent / 100 : '1.9'}`;
    }
    var txt = getDonations_new(place, safe, donateSuggest);
    if (txt) {
      footer += `<div id='copyText'>${
        (
          showOptions.showGuildPosition &&
          PlayerName == MyInfo.name &&
          MyInfo.guildPosition
        ) ?
          '#' + MyInfo.guildPosition + ' '
        : ''
      }${playerShortName ? playerShortName : PlayerName} ${helper.fGBsname(GBselected.name)} `;
      footer += txt + '</div>';
    }
    // footer += `<p>Remaining <strong>${GBselected.total - GBselected.current}</strong> FPs [${remainingOwner} (owner) / ${remainingInvestors} (investors)]</p>`;
    footer += `<p>Remaining <strong>${GBselected.total - GBselected.current}</strong> FPs</p>`;
  }
  let htmlText =
    `<div class="card ${darkMode == 'dark' ? 'text-light bg-dark' : 'text-dark bg-light'} alert show collapsed p-0 "  >
           <div class="card-header fw-bold"><span data-i18n="gb">GB</span> <span data-i18n="donation">Donation</span> [${getPlayerLink()}]
           ${element.close()}` +
    element.copy('donationCopyID', 'info', 'right', collapse.collapseDonation) +
    `</div><div class="card-body alert-danger p-2">
           <h6 class="card-title mb-0"> <span id="GBselected">${GBselected.name} [${GBselected.level}/${
             GBselected.max_level
           }] (${GBselected.current}/${GBselected.total})</span></h6>
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
        <td>${donation} FP <strong>[${rewardFP - donation} FP]</strong></td>
        <td>${donateCustom} FP</td>
        <td>${rewardFP} FP</td>
      </tr>
    </tbody>
  </table>
  </div>` +
    footer +
    `</div>`;
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
  maxlevel,
) {
  let htmlText = `<div class="card ${
    darkMode == 'dark' ? 'text-light bg-dark' : 'text-dark bg-light'
  } alert show collapsed p-0 " >
           <div class="card-header fw-bold"> GB Donation [${getPlayerLink()}]${element.close()}</div>
           <div class="card-body alert-danger p-2">
           <h6 class="card-title mb-0""> <span id="GBselected">${GBselected.name} [${GBselected.level + 1}]</span></h6>
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

function checkInactive() {
  var html = inactiveHTML(hoodlist);
  if (html == '') html += inactiveHTML(friends);
  if (html == '') html += inactiveHTML(guildMembers);
  return html;
}

function inactiveHTML(members) {
  members.forEach((entry) => {
    if (
      entry.is_self != true &&
      PlayerID == entry.player_id &&
      entry.is_active != true
    )
      return `<br><span class='red'>*** <span data-i18n="inactive">INACTIVE</span> ***</span>`;
  });
  return '';
}

function getDonations_new(place, safe, donateSuggest) {
  var footer = '';
  console.debug(place, safe, donateSuggest);
  if (place <= 5 && safe[4]) {
    footer += `P5(${donateSuggest[4]}) `;
  }
  if (place <= 4 && safe[3]) {
    footer += `P4(${donateSuggest[3]}) `;
  }
  if (place <= 3 && safe[2]) {
    footer += `P3(${donateSuggest[2]}) `;
  }
  if (place <= 2 && safe[1]) {
    footer += `P2(${donateSuggest[1]}) `;
  }
  if (place <= 1 && safe[0]) {
    footer += `P1(${donateSuggest[0]}) `;
  }
  return footer;
}

function getPlayerLink() {
  const origin = (
    GameOrigin && GameOrigin.trim() ?
      GameOrigin
    : 'en7').toLowerCase();
  return (
    '<a href="https://foe.scoredb.io/' +
    origin +
    '/Player/' +
    PlayerID +
    '" target="_blank">' +
    PlayerName +
    '</a>'
  );
}

function getDonations(place, safe, donateSuggest) {
  var footer = '';
  console.debug(place, safe, donateSuggest);
  for (var i = 5; i > 0; i--) {
    if (
      place <= i &&
      donateSuggest[i - 1] > 0 &&
      (safe[i - 1] || !showOptions.hideUnsafe)
    ) {
      footer += `<span class="${safe[i - 1] ? 'invest-good' : 'invest-bad'}">P${
        i + '(' + donateSuggest[i - 1]
      })</span> `;
    }
  }
  return footer;
}

function clickDonation(event) {
  console.debug('event', event);
  if (event.shiftKey) {
    useNewDonationPanel = !useNewDonationPanel;
    storage.set('useNewDonationPanel', useNewDonationPanel);
    console.debug('useNewDonationPanel', useNewDonationPanel);
    showGreatBuldingDonation();
  }
}

function getFriendlyDonation(donation, reward, percent, lock) {
  //console.debug('getFriendlyDonation', percent);
  console.debug(
    donation,
    reward,
    percent,
    lock,
    donation.isGreaterThan(reward) || lock.isGreaterThan(donation),
    donation.isGreaterThan(reward),
    lock.isGreaterThan(donation),
  );
  return `<span class="${donation.isGreaterThan(reward) || lock.isGreaterThan(donation) ? 'red' : 'green'}">${
    percent / 100
  }: ${donation}FP</span><br>`;
}

function getSafe(place) {
  safe = [];
  donateSuggest = [];
  var index = place - 1;
  var rem = remaining;
  for (var i = index; i < 5; i++) {
    donateSuggest[i] = new BigNumber(GBrewards[i])
      .times(currentPercent)
      .div(100)
      .integerValue(BigNumber.ROUND_CEIL);
    rem -= donateSuggest[i];
    safe[i] = rem <= donateSuggest[i] - Top[place] ? true : false;
  }
}

function getPlaceValues(place) {
  var index = place - 1;
  Donation = new BigNumber(GBselected.total - GBselected.current + Top[index])
    .div(2)
    .dp(0, 2);
  RewardFP = new BigNumber(GBrewards[index])
    .multipliedBy(1 + City.ArcBonus / 100)
    .integerValue(BigNumber.ROUND_CEIL);
  Profit = RewardFP.minus(Donation).toString();
  Percent = new BigNumber(Profit).multipliedBy(100).idiv(Donation);
  const band = fPercentBanded(Percent);
  donateCustom = new BigNumber(GBrewards[index])
    .multipliedBy(currentPercent)
    .div(100)
    .integerValue(BigNumber.ROUND_CEIL);
  remaining = GBselected.total - GBselected.current;
}

function renderInvestedPanel(
  results,
  totalInvested,
  totalReturn,
  netProfitLoss,
  arcBonusPercent,
) {
  if (typeof document === 'undefined') return;

  const targetEl =
    document.getElementById('invested') ||
    document.getElementById('cityinvested') ||
    cityinvested;
  if (!targetEl) return;

  if (!showOptions.showInvested || results.length === 0) {
    targetEl.innerHTML = '';
    return;
  }

  const isCollapsed = !!collapse.collapseInvested;
  const profitClass =
    netProfitLoss.isGreaterThanOrEqualTo(0) ? 'text-success' : 'text-danger';
  const profitSign = netProfitLoss.isGreaterThanOrEqualTo(0) ? '+' : '';

  let html = `<div class="alert alert-success alert-dismissible show" role="alert">`;
  html += element.close();
  html += element.copy('investedCopyID', 'success', 'right', isCollapsed);
  html += `<p id="investedTextLabel" data-bs-toggle="collapse" href="#investedText" role="button">`;
  html += element.icon('investedicon', 'investedText', isCollapsed);
  html += `<strong><span data-i18n="fp_status">FP Status</span>:</strong> `;
  html += `<span id="onHandFP" class="ms-1">${
    isCollapsed ? `${totalInvested.toString()} FP` : ''
  }</span></p>`;
  html += `<div id="investedText" class="collapse ${isCollapsed ? '' : 'show'}">`;
  html += `<div class="mb-2">`;
  html += `<span data-i18n="fp_invested">FP Invested</span>: <strong id="onHandFP2">${totalInvested.toString()} FP</strong> (${
    results.length
  } <span data-i18n="gb">GB</span>)<br>`;
  html += `<span data-i18n="gb">GB</span> <span data-i18n="reward">Rewards</span>: <strong>${totalReturn.toString()} FP</strong> (+${arcBonusPercent}%)<br>`;
  html += `<span data-i18n="total">Total</span> <span data-i18n="profit">Profit</span>/<span data-i18n="loss">Loss</span>: <strong class="${profitClass}">${profitSign}${netProfitLoss.toString()} FP</strong>`;
  html += `</div>`;

  html += `<div class="table-responsive"><table class="table table-sm table-striped align-middle mb-0">`;
  html += `<thead><tr>`;
  html += `<th><span data-i18n="player">Player</span></th>`;
  html += `<th><span data-i18n="gb">GB</span></th>`;
  html += `<th><span data-i18n="rank">Rank</span></th>`;
  html += `<th><span data-i18n="invested">Invested</span></th>`;
  html += `<th><span data-i18n="reward">Reward</span></th>`;
  html += `<th>+/-</th>`;
  html += `</tr></thead><tbody>`;

  for (const item of results) {
    const itemDiff = item.profit;
    const itemClass =
      itemDiff.isGreaterThanOrEqualTo(0) ? 'text-success' : 'text-danger';
    const itemSign = itemDiff.isGreaterThanOrEqualTo(0) ? '+' : '';
    const gbName = helper.escapeHTML(
      helper.fGBname(item.city_entity_id) || item.city_entity_id || '-',
    );
    const playerName = helper.escapeHTML(item.player.name);
    const rankDisplay =
      item.rank !== null && item.rank !== undefined ? `P${item.rank}` : '-';

    html += `<tr>`;
    html += `<td>${playerName}</td>`;
    html += `<td>${gbName}</td>`;
    html += `<td>${rankDisplay}</td>`;
    html += `<td>${item.invested.toString()}</td>`;
    html += `<td>${item.returnFP.toString()}</td>`;
    html += `<td class="${itemClass}">${itemSign}${itemDiff.toString()}</td>`;
    html += `</tr>`;
  }

  html += `</tbody></table></div></div></div>`;

  targetEl.innerHTML = html;

  const copyBtn = document.getElementById('investedCopyID');
  copyBtn?.addEventListener('click', copy.fInvestedCopy);
  const labelEl = document.getElementById('investedTextLabel');
  labelEl?.addEventListener('click', collapse.fCollapseInvested);

  helper.translateContainer(targetEl);
}

/**
 * Modernized handler for GreatBuildingsService.getContributions RPC.
 * Calculates total FP invested across other players' Great Buildings,
 * computes expected returns with Arc multiplier using InnoGames ceiling rounding (BigNumber.ROUND_CEIL),
 * tallies net profit/loss, and renders the #invested panel.
 *
 * @param {Object|Array} msg ServerRequest packet or contributions array
 * @param {number} [arcBonusOverride] Optional Arc bonus percentage override
 * @returns {Object} Calculated contributions, totals, and net profit/loss
 */
export function getContributions(msg, arcBonusOverride) {
  let list = [];
  if (Array.isArray(msg)) {
    list = msg;
  } else if (Array.isArray(msg?.responseData)) {
    list = msg.responseData;
  } else if (Array.isArray(msg?.responseData?.contributions)) {
    list = msg.responseData.contributions;
  } else if (Array.isArray(msg?.contributions)) {
    list = msg.contributions;
  }

  const arcBonusPercent =
    arcBonusOverride !== undefined ? arcBonusOverride
    : msg?.arcBonusPercent !== undefined ? msg.arcBonusPercent
    : City?.ArcBonus !== undefined ? City.ArcBonus
    : 90;

  const arcMultiplier = new BigNumber(1).plus(
    new BigNumber(arcBonusPercent).dividedBy(100),
  );

  let totalInvested = new BigNumber(0);
  let totalReturn = new BigNumber(0);
  const results = [];

  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;

    const invested = new BigNumber(entry.forge_points || 0);
    const baseReward = new BigNumber(
      entry.reward?.strategy_points ?? entry.reward?.strategy_point_amount ?? 0,
    );
    const returnFP = baseReward
      .multipliedBy(arcMultiplier)
      .integerValue(BigNumber.ROUND_CEIL);
    const profit = returnFP.minus(invested);

    totalInvested = totalInvested.plus(invested);
    totalReturn = totalReturn.plus(returnFP);

    const player = entry.player || {};
    const playerName =
      player.name ||
      (player.player_id ? `Player ${player.player_id}` : 'Unknown');

    results.push({
      player: {
        player_id: player.player_id || 0,
        name: playerName,
      },
      city_entity_id: entry.city_entity_id || entry.entity_id || '',
      rank: entry.rank !== undefined ? entry.rank : null,
      forge_points: invested.toNumber(),
      invested,
      baseReward,
      returnFP,
      reward: {
        strategy_points: returnFP.toNumber(),
        base_strategy_points: baseReward.toNumber(),
        blueprints: entry.reward?.blueprints ?? 0,
        medals: entry.reward?.medals ?? 0,
      },
      profit,
      netProfitLoss: profit.toNumber(),
    });
  }

  const netProfitLoss = totalReturn.minus(totalInvested);

  renderInvestedPanel(
    results,
    totalInvested,
    totalReturn,
    netProfitLoss,
    arcBonusPercent,
  );

  return {
    success: true,
    contributions: results,
    totalInvested: totalInvested.toNumber(),
    totalReturn: totalReturn.toNumber(),
    netProfitLoss: netProfitLoss.toNumber(),
    totalInvestedBN: totalInvested,
    totalReturnBN: totalReturn,
    netProfitLossBN: netProfitLoss,
    arcBonusPercent: Number(arcBonusPercent),
  };
}

export default {
  getConstruction,
  contributeForgePoints,
  showGreatBuldingDonation,
  getConstructionRanking,
  setCurrentPercent,
  getContributions,
};
