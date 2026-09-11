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
import {
  calculateArcReward,
  calculateOwnerSafeAdd,
  calculateSuggestedDonation,
} from '../calc/GreatBuildingCalculator.js';
import * as element from '../fn/AddElement.js';
import * as collapse from '../fn/collapse.js';
import * as copy from '../fn/copy.js';
import * as helper from '../fn/helper.js';
import * as storage from '../fn/storage.js';
import * as GreatBuildingRegistry from '../state/GreatBuildingRegistry.js';
import {
  getPlaceValues as calcPlaceValues,
  checkInactive,
  gbTabEmpty,
  gbTabNotSafe,
  gbTabSafe,
  getPlayerLink,
} from '../ui/gbDonationTables.js';
import { renderGbDonorsCard } from '../ui/gbOverviewCard.js';
import { renderGbInfoPanel } from '../ui/renderGbInfoPanel.js';
import { showOptions } from '../vars/showOptions.js';
import {
  cityrewards,
  donation2DIV,
  donationDIV,
  donationDIV2,
  donationPercent,
  donationSuffix,
  GameOrigin,
  gbInfoDIV,
  GBselected,
  getPlayerName,
  greatbuilding,
  MyInfo,
  overview,
  PlayerID,
  PlayerName,
  setPlayerName,
  url,
} from '../vars/state.js';
import * as GbDonationService from './GbDonationService.js';
import { getContributions } from './InvestedService.js';
import { friends, guildMembers, hoodlist } from './OtherPlayerService.js';
import { City } from './StartupService.js';

export { getContributions } from './InvestedService.js';

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

function syncRankingPayload(msg, rankingParams, extractedLevel) {
  if (extractedLevel !== undefined && !Number.isNaN(extractedLevel)) {
    GBselected.level = extractedLevel;
  }

  const myId = MyInfo?.id || 0;
  const myName = MyInfo?.name || MyInfo?.player_name || '';
  const isForeign =
    rankingParams?.playerId !== undefined &&
    rankingParams.playerId !== null &&
    rankingParams.playerId !== 0 &&
    rankingParams.playerId !== myId;

  const pId = isForeign ? rankingParams.playerId : 0;
  const eId = rankingParams?.entityId || GBselected.id || GBselected.entity_id;

  if (
    msg?.responseData &&
    typeof msg.responseData === 'object' &&
    !Array.isArray(msg.responseData)
  ) {
    GbDonationService.syncGbSelected(GBselected, msg.responseData);
    GreatBuildingRegistry.registerGreatBuilding(msg.responseData, pId);
    if (pId === 0 && myId) {
      GreatBuildingRegistry.registerGreatBuilding(msg.responseData, myId);
    }
  }

  if (Array.isArray(msg?.responseData?.rankings)) {
    rankings = msg.responseData.rankings;
  } else if (Array.isArray(msg?.responseData)) {
    rankings = msg.responseData;
  } else if (Array.isArray(msg)) {
    rankings = msg;
  } else if (!Array.isArray(rankings)) {
    rankings = [];
  }

  let cached = GreatBuildingRegistry.getGreatBuilding(pId, eId);
  if (!cached && pId === 0 && myId) {
    cached = GreatBuildingRegistry.getGreatBuilding(myId, eId);
  }
  if (!cached && eId) {
    cached = GreatBuildingRegistry.getGreatBuilding(null, eId);
  }
  if (!cached && pId) {
    cached = GreatBuildingRegistry.getGreatBuilding(pId, null);
  }

  if (cached) {
    if (pId === 0) {
      if (!cached.player && myId) cached.player = myId;
      if (!cached.player_name && myName) cached.player_name = myName;
    }
    GbDonationService.syncGbSelected(GBselected, cached);
    if (extractedLevel !== undefined && !Number.isNaN(extractedLevel)) {
      GBselected.level = extractedLevel;
    }
    const resolvedName = cached.player_name || (pId === 0 ? myName : '') || '';
    const resolvedId = cached.player || (pId === 0 ? myId : pId) || 0;
    if (resolvedName || resolvedId) {
      setPlayerName(resolvedName, resolvedId);
    }
  } else if (eId && eId !== GBselected.id) {
    GBselected.id = eId;
    GBselected.entity_id = eId;
    if (extractedLevel !== undefined && !Number.isNaN(extractedLevel)) {
      GBselected.level = extractedLevel;
    }
    if (pId === 0) {
      GBselected.player = myId;
      GBselected.player_name = myName;
      setPlayerName(myName, myId);
    } else {
      GBselected.player = pId;
      const foreignName = getPlayerName(pId) || '';
      GBselected.player_name = foreignName;
      setPlayerName(foreignName, pId);
    }
  }

  if (
    (!GBselected.total || GBselected.total === 0) &&
    GBselected.cityentity_id &&
    GBselected.level > 0
  ) {
    GBselected.total = GreatBuildingRegistry.calculateLevelCost(
      GBselected.cityentity_id,
      GBselected.level,
    );
  }
}

export function getConstruction(msg, data, context) {
  const rankingParams = GbDonationService.extractRankingParams(
    msg,
    data,
    context,
  );
  const extractedLevel =
    rankingParams?.level ??
    GbDonationService.extractRankingLevel(msg, data, context);
  syncRankingPayload(msg, rankingParams, extractedLevel);

  if (
    (!GBselected.current || GBselected.current === 0) &&
    Array.isArray(rankings)
  ) {
    const investedSum = (rankings || []).reduce(
      (sum, r) => sum + (Number(r?.forge_points) || 0),
      0,
    );
    if (investedSum > 0) GBselected.current = investedSum;
  }

  if (!GBselected.max_level || GBselected.max_level === 0) {
    GBselected.max_level = (GBselected.level || 0) + 1;
  }

  showGreatBuldingDonation();
}

export function contributeForgePoints(msg, data, context) {
  const rankingParams = GbDonationService.extractRankingParams(
    msg,
    data,
    context,
  );
  const extractedLevel =
    rankingParams?.level ??
    GbDonationService.extractRankingLevel(msg, data, context);
  syncRankingPayload(msg, rankingParams, extractedLevel);

  GbDonationService.updateContributionProgress(
    GBselected,
    rankings,
    rankingParams,
    PlayerID,
  );

  const pId = rankingParams?.playerId || GBselected.player || PlayerID;
  const eId = rankingParams?.entityId || GBselected.id || GBselected.entity_id;
  if (eId) {
    const cached = GreatBuildingRegistry.getGreatBuilding(pId, eId);
    if (cached) {
      cached.current = GBselected.current;
      cached.current_progress = GBselected.current;
    }
  }

  if (!GBselected.max_level || GBselected.max_level === 0) {
    GBselected.max_level = (GBselected.level || 0) + 1;
  }

  showGreatBuldingDonation();
}

export function showGreatBuldingDonation() {
  fCheckOutput();
  if (!Array.isArray(rankings)) {
    rankings = [];
  }

  renderGbDonorsCard({
    GBselected,
    rankings,
    showOptions,
    greatbuilding,
    Top,
    GBrewards,
    Reward,
    City,
    PlayerID,
    playerName: PlayerName || GBselected.player_name,
    setPlayerName,
    helper,
    element,
    collapse,
    copy,
    calculateArcReward,
  });
  renderGbInfoPanel(gbInfoDIV, GBselected, PlayerName, showOptions);

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
  }"><p>${getPlayerLink(PlayerName || GBselected.player_name, PlayerID || GBselected.player)}<br>`;
  olddonationHTML += `<span id="GBselected">${helper.escapeHTML(GBselected.name)} ${GBselected.level + 1}</span></p>`;
  const isGbLocked = Boolean(
    GBselected.max_level > 0 && GBselected.level >= GBselected.max_level,
  );
  if (GBselected.connected === false) {
    olddonationHTML += '<p class="red">*** DISCONNECTED ***</p>';
  }
  if (isGbLocked) {
    olddonationHTML += '<p class="red">*** LOCKED ***</p>';
  }
  olddonationHTML += checkInactive();

  donationDIV.innerHTML = '';
  donationDIV.style.display = 'block';
  if (donation2DIV) {
    if (showOptions?.showDonation !== false) {
      donation2DIV.style.display = '';
    }
  }

  function updatePlaceValues(place) {
    const vals = calcPlaceValues(
      GBselected,
      place,
      Top,
      GBrewards,
      currentPercent,
      City?.ArcBonus ?? 90,
    );
    remaining = vals.remaining;
    Donation = vals.donation;
    RewardFP = vals.rewardFP;
    Profit = vals.profit;
    Percent = vals.percent;
    donateCustom = vals.donateCustom;
  }

  let foundPlace = false;
  for (let p = 1; p <= 5; p++) {
    remaining = Math.max(
      0,
      (GBselected.total || 0) - (GBselected.current || 0),
    );
    updatePlaceValues(p);
    getSafe(p);
    const placeIdx = p - 1;

    if (Donation.isLessThanOrEqualTo(BigNumber(remaining))) {
      foundPlace = true;
      const placeOrdinal =
        p === 1 ? '1st'
        : p === 2 ? '2nd'
        : p === 3 ? '3rd'
        : `${p}th`;
      if (Profit > 0) {
        olddonationHTML += `<p class="invest-good">${placeOrdinal} Place<br><span data-i18n="lock">Lock</span>: ${Donation}FP<br><span data-i18n="profit">Profit</span>: ${Profit} (${Percent}%)<br>`;
        newdonationHTML += gbTabSafe(
          p,
          currentPercent,
          Donation,
          RewardFP,
          donateCustom,
          donateSuggest,
          GBrewards,
          GBselected.connected,
          isGbLocked,
          safe,
        );
      } else {
        const netDifference = Donation.minus(donateCustom).toNumber();
        let outcomeKey;
        let outcomeLabel;
        let outcomeClass;
        let outcomeValue;
        if (netDifference > 0) {
          outcomeKey = 'loss';
          outcomeLabel = 'Loss';
          outcomeClass = 'invest-bad';
          outcomeValue = netDifference;
        } else if (netDifference < 0) {
          outcomeKey = 'profit';
          outcomeLabel = 'Profit';
          outcomeClass = 'invest-good';
          outcomeValue = -netDifference;
        } else {
          outcomeKey = 'safe';
          outcomeLabel = 'Break-even';
          outcomeClass = 'invest-neutral';
          outcomeValue = 0;
        }
        olddonationHTML += `<p class="${outcomeClass}">${placeOrdinal} Place<br><span data-i18n="lock">Lock</span>: ${Donation}FP<br><span data-i18n="${outcomeKey}">${outcomeLabel}</span>: ${outcomeValue}<br>`;
        newdonationHTML += gbTabNotSafe(
          p,
          currentPercent,
          Donation,
          RewardFP,
          donateCustom,
          donateSuggest,
          GBrewards,
          GBselected.connected,
          isGbLocked,
          safe,
        );
      }

      if (GBrewards[placeIdx]) {
        olddonationHTML += getFriendlyDonation(
          donateCustom,
          RewardFP,
          currentPercent,
          Donation,
        );
        olddonationHTML +=
          p === 1 ? `BE: ${RewardFP}FP</p>` : `BE: ${RewardFP}FP<br></p>`;
        const ownerAdd = calculateOwnerSafeAdd(
          remaining,
          Top[placeIdx],
          donateCustom,
        );
        if (PlayerName == MyInfo.name && ownerAdd > 0) {
          olddonationHTML += `<p class=""><span data-i18n="add">Add</span> ${ownerAdd}FP <span data-i18n="safe">to make safe for</span> ${
            currentPercent ? currentPercent / 100 : '1.9'
          }</p>`;
        }
        copyText += getDonations(p, safe, donateSuggest);
      } else {
        olddonationHTML += `</p>`;
        if (p === 1) {
          copyText += getDonations(1, safe, donateSuggest);
        }
      }
      break;
    }
  }

  if (!foundPlace) {
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
      isGbLocked,
    );
  }

  // close table
  if (showOptions?.showDonation !== false) {
    if (useNewDonationPanel) {
      donation2DIV.innerHTML = newdonationHTML + `</div>`;
    } else {
      donation2DIV.innerHTML =
        olddonationHTML +
        copyText +
        (donationSuffix ? donationSuffix : '') +
        `</div>`;
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

    helper.translateContainer(donation2DIV || donationDIV);
  } else {
    if (donation2DIV) donation2DIV.innerHTML = '';
    if (donationDIV) donationDIV.innerHTML = '';
  }
}

export function getConstructionRanking(msg, data, context) {
  const rankingParams = GbDonationService.extractRankingParams(
    msg,
    data,
    context,
  );
  const extractedLevel =
    rankingParams?.level ??
    GbDonationService.extractRankingLevel(msg, data, context);
  if (extractedLevel !== undefined && !Number.isNaN(extractedLevel)) {
    GBselected.level = extractedLevel;
  }
  if (Array.isArray(msg?.responseData)) {
    rankings = msg.responseData;
  } else if (Array.isArray(msg)) {
    rankings = msg;
  } else if (Array.isArray(msg?.responseData?.rankings)) {
    rankings = msg.responseData.rankings;
  }

  const myId = MyInfo?.id || 0;
  const myName = MyInfo?.name || MyInfo?.player_name || '';
  const isForeign =
    rankingParams?.playerId !== undefined &&
    rankingParams.playerId !== null &&
    rankingParams.playerId !== 0 &&
    rankingParams.playerId !== myId;

  const pId = isForeign ? rankingParams.playerId : 0;
  const eId = rankingParams?.entityId || GBselected.id || GBselected.entity_id;

  let cached = GreatBuildingRegistry.getGreatBuilding(pId, eId);
  if (!cached && pId === 0 && myId) {
    cached = GreatBuildingRegistry.getGreatBuilding(myId, eId);
  }
  if (!cached && eId) {
    cached = GreatBuildingRegistry.getGreatBuilding(null, eId);
  }
  if (!cached && pId) {
    cached = GreatBuildingRegistry.getGreatBuilding(pId, null);
  }

  if (cached) {
    if (pId === 0) {
      if (!cached.player && myId) cached.player = myId;
      if (!cached.player_name && myName) cached.player_name = myName;
    }
    GbDonationService.syncGbSelected(GBselected, cached);
    if (extractedLevel !== undefined && !Number.isNaN(extractedLevel)) {
      GBselected.level = extractedLevel;
    }
    const resolvedName = cached.player_name || (pId === 0 ? myName : '') || '';
    const resolvedId = cached.player || (pId === 0 ? myId : pId) || 0;
    if (resolvedName || resolvedId) {
      setPlayerName(resolvedName, resolvedId);
    }
  } else if (eId && eId !== GBselected.id) {
    GBselected.id = eId;
    GBselected.entity_id = eId;
    if (extractedLevel !== undefined && !Number.isNaN(extractedLevel)) {
      GBselected.level = extractedLevel;
    }
    if (pId === 0) {
      GBselected.player = myId;
      GBselected.player_name = myName;
      setPlayerName(myName, myId);
    } else {
      GBselected.player = pId;
      const foreignName = getPlayerName(pId) || '';
      GBselected.player_name = foreignName;
      setPlayerName(foreignName, pId);
    }
  }

  if (
    (!GBselected.total || GBselected.total === 0) &&
    GBselected.cityentity_id &&
    GBselected.level > 0
  ) {
    GBselected.total = GreatBuildingRegistry.calculateLevelCost(
      GBselected.cityentity_id,
      GBselected.level,
    );
  }

  if (
    (!GBselected.current || GBselected.current === 0) &&
    Array.isArray(rankings)
  ) {
    const investedSum = (rankings || []).reduce(
      (sum, r) => sum + (Number(r?.forge_points) || 0),
      0,
    );
    if (investedSum > 0) GBselected.current = investedSum;
  }

  if (!GBselected.max_level || GBselected.max_level === 0) {
    GBselected.max_level = (GBselected.level || 0) + 1;
  }

  showGreatBuldingDonation();
}

export function handleNewReward(msg) {
  return GbDonationService.handleNewReward(msg, showOptions, cityrewards);
}

export function fCheckOutput() {
  const contentEl =
    typeof document !== 'undefined' ? document.getElementById('content') : null;
  if (!contentEl) return;

  // Invariant order: 1. GB Donation panel, 2. GB Info, 3. GB contributors
  if (greatbuilding) {
    greatbuilding.id = 'greatbuilding';
    if (!contentEl.contains(greatbuilding)) {
      contentEl.appendChild(greatbuilding);
    }
    if (
      showOptions?.showGBDonors !== false &&
      greatbuilding.style.display === 'none'
    ) {
      greatbuilding.style.display = '';
    }
  }

  if (gbInfoDIV) {
    gbInfoDIV.id = 'gbInfo';
    if (greatbuilding && contentEl.contains(greatbuilding)) {
      contentEl.insertBefore(gbInfoDIV, greatbuilding);
    } else if (!contentEl.contains(gbInfoDIV)) {
      contentEl.appendChild(gbInfoDIV);
    }
    if (
      showOptions?.showGBInfo !== false &&
      gbInfoDIV.style.display === 'none'
    ) {
      gbInfoDIV.style.display = '';
    }
  }

  const gbAnchor =
    (gbInfoDIV && contentEl.contains(gbInfoDIV) ? gbInfoDIV : null) ||
    (greatbuilding && contentEl.contains(greatbuilding) ? greatbuilding : null);

  if (donation2DIV) {
    donation2DIV.id = 'donation2';
    if (gbAnchor && gbAnchor !== donation2DIV) {
      contentEl.insertBefore(donation2DIV, gbAnchor);
    } else if (!contentEl.contains(donation2DIV)) {
      contentEl.appendChild(donation2DIV);
    }
    if (
      showOptions?.showDonation !== false &&
      donation2DIV.style.display === 'none'
    ) {
      donation2DIV.style.display = '';
    }
  }

  if (donationDIV) {
    donationDIV.id = 'donation';
    if (gbAnchor && gbAnchor !== donationDIV) {
      contentEl.insertBefore(donationDIV, gbAnchor);
    } else if (!contentEl.contains(donationDIV)) {
      contentEl.appendChild(donationDIV);
    }
    if (
      showOptions?.showDonation !== false &&
      donationDIV.style.display === 'none'
    ) {
      donationDIV.style.display = '';
    }
  }

  if (cityrewards) {
    cityrewards.id = 'cityrewards';
    if (!contentEl.contains(cityrewards)) {
      contentEl.appendChild(cityrewards);
    }
  }
}

export function setCurrentPercent(percent) {
  if (percent) currentPercent = percent;
  else currentPercent = donationPercent;
  console.debug(percent);
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
    donateSuggest[i] = new BigNumber(
      calculateSuggestedDonation(GBrewards[i], currentPercent),
    );
    rem -= donateSuggest[i].toNumber();
    safe[i] = rem <= donateSuggest[i].toNumber() - (Top[i + 1] || 0);
  }
}

export default {
  getConstruction,
  contributeForgePoints,
  showGreatBuldingDonation,
  getConstructionRanking,
  setCurrentPercent,
  getContributions,
  fCheckOutput,
};
