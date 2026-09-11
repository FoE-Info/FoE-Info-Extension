/**
 * gbDonationTables.js
 *
 * DOM builders and card renderers for Great Building donation places.
 * Provides gbTabSafe, gbTabNotSafe, gbTabEmpty, and getPlaceValues.
 */

const BigNumber = require('bignumber.js');
const {
  calculateOwnerSafeAdd,
  calculateDonorOutcome,
} = require('../calc/GreatBuildingCalculator.js');

let element;
try {
  element = require('./AddElement.js');
} catch (e) {
  try {
    element = require('../fn/AddElement.js');
  } catch (err) {
    element = { close: () => '', copy: () => '', icon: () => '' };
  }
}

let collapse;
try {
  collapse = require('../fn/collapse.js');
} catch (e) {
  collapse = { collapseDonation: false };
}

let helper;
try {
  helper = require('../fn/helper.js');
} catch (e) {
  helper = { fGBsname: (s) => s, escapeHTML: (s) => s };
}

let OtherPlayerService;
try {
  OtherPlayerService = require('../msg/OtherPlayerService.js');
} catch (e) {
  OtherPlayerService = {};
}
const hoodlist = OtherPlayerService.hoodlist || [];
const friends = OtherPlayerService.friends || [];
const guildMembers = OtherPlayerService.guildMembers || [];

let showOptionsModule;
try {
  showOptionsModule = require('../vars/showOptions.js');
} catch (e) {
  showOptionsModule = { showOptions: {} };
}
const defaultOptions = showOptionsModule.showOptions || {};

let stateModule;
try {
  stateModule = require('../vars/state.js');
} catch (e) {
  stateModule = {};
}
const defaultGameOrigin = stateModule.GameOrigin || 'en7';
const defaultGBselected = stateModule.GBselected || {};
const defaultMyInfo = stateModule.MyInfo || {};
const defaultPlayerID = stateModule.PlayerID || 0;
const defaultPlayerName = stateModule.PlayerName || '';

function fPercentBanded(percent) {
  const num = typeof percent === 'number' ? percent : Number(percent);
  if (num >= 20) return 'green';
  if (num >= 10) return 'invest-good';
  if (num > 5) return 'invest-fair';
  return '';
}

function fDonationSuggest(reward, currentPercent = 190) {
  return new BigNumber(reward || 0)
    .times(currentPercent)
    .div(100)
    .integerValue(BigNumber.ROUND_HALF_UP);
}

function getPlayerLink(playerName, playerId, gameOrigin) {
  let stateMod = null;
  try {
    stateMod = require('../vars/state.js');
  } catch {}
  const name =
    playerName ||
    stateMod?.PlayerName ||
    stateMod?.GBselected?.player_name ||
    defaultPlayerName ||
    '';
  const id =
    playerId ||
    stateMod?.PlayerID ||
    stateMod?.GBselected?.player ||
    defaultPlayerID ||
    '';
  const origin =
    (gameOrigin || stateMod?.GameOrigin || defaultGameOrigin || 'en7')
      .trim()
      .toLowerCase() || 'en7';
  if (!name && !id) return '';
  return `<a href="https://foe.scoredb.io/${origin}/Player/${id}" target="_blank">${name || id}</a>`;
}

function inactiveHTML(members = [], playerId) {
  const targetId = playerId ?? defaultPlayerID;
  for (const entry of members) {
    if (
      entry.is_self !== true &&
      targetId === entry.player_id &&
      entry.is_active !== true
    ) {
      return `<br><span class='red'>*** <span data-i18n="inactive">INACTIVE</span> ***</span>`;
    }
  }
  return '';
}

function checkInactive(
  playerId,
  hood = hoodlist,
  fr = friends,
  gm = guildMembers,
) {
  let html = inactiveHTML(hood, playerId);
  if (!html) html = inactiveHTML(fr, playerId);
  if (!html) html = inactiveHTML(gm, playerId);
  return html;
}

function getDonations_new(place, safe = [], donateSuggest = []) {
  let footer = '';
  for (let i = 4; i >= 0; i--) {
    if (place <= i + 1 && safe[i]) {
      footer += `P${i + 1}(${donateSuggest[i] ?? 0}) `;
    }
  }
  return footer;
}

function getPlaceValues(
  gbData,
  place,
  topInvestors = [],
  rewards = [],
  currentPercent = 190,
  arcBonus = 90,
) {
  let p = place;
  let data = gbData;
  let top = topInvestors;
  let rew = rewards;
  let percent = currentPercent;
  let arc = arcBonus;

  if (typeof gbData === 'number') {
    p = gbData;
    data = defaultGBselected;
    top = [];
    rew = [];
    percent = currentPercent ?? 190;
    arc = arcBonus ?? 90;
  }

  const index = Math.max(0, (p || 1) - 1);
  const remaining = Math.max(0, (data?.total || 0) - (data?.current || 0));
  const baseReward = rew[index] ?? 0;
  const outcome = calculateDonorOutcome(
    remaining,
    top[index] ?? 0,
    baseReward,
    arc ?? 90,
    percent,
  );
  const donation = new BigNumber(outcome.spotLock);
  const rewardFP = new BigNumber(outcome.donorReward);
  const donateCustom = new BigNumber(outcome.costs);
  const profitStr = rewardFP.minus(donation).toString();
  const profit = rewardFP.minus(donation).toNumber();
  const spotPercent =
    donation.isZero() ?
      new BigNumber(0)
    : new BigNumber(profitStr).multipliedBy(100).idiv(donation);

  return {
    remaining,
    donation,
    rewardFP,
    profit: profitStr,
    profitNum: profit,
    percent: spotPercent,
    donateCustom,
    guaranteedProfit: outcome.guaranteedProfit,
    band: fPercentBanded(spotPercent),
  };
}

function resolveCardParams(arg0, ...rest) {
  if (
    arg0 &&
    typeof arg0 === 'object' &&
    !Array.isArray(arg0) &&
    !arg0.isBigNumber
  ) {
    return {
      place: arg0.place ?? 1,
      currentPercent: arg0.currentPercent ?? 190,
      donation: arg0.donation ?? 0,
      rewardFP: arg0.rewardFP ?? 0,
      donateCustom: arg0.donateCustom ?? 0,
      donateSuggest: arg0.donateSuggest ?? [],
      bgrewards: arg0.rewards ?? arg0.bgrewards ?? [],
      connected:
        arg0.connected ?? arg0.gbData?.connected ?? defaultGBselected.connected,
      maxlevel: arg0.maxlevel ?? arg0.isGbLocked ?? false,
      safe: arg0.safe ?? [],
      gbData: arg0.gbData ?? arg0.GBselected ?? defaultGBselected,
      playerName: arg0.playerName ?? arg0.PlayerName ?? defaultPlayerName,
      playerId: arg0.playerId ?? arg0.PlayerID ?? defaultPlayerID,
      topInvestors: arg0.topInvestors ?? arg0.Top ?? [],
      remaining:
        arg0.remaining ??
        Math.max(
          0,
          (arg0.gbData?.total ?? defaultGBselected.total ?? 0) -
            (arg0.gbData?.current ?? defaultGBselected.current ?? 0),
        ),
      myInfo: arg0.myInfo ?? arg0.MyInfo ?? defaultMyInfo,
      options: arg0.options ?? arg0.showOptions ?? defaultOptions,
      darkMode: arg0.darkMode ?? false,
    };
  }
  const [
    currentPercent,
    donation,
    rewardFP,
    donateCustom,
    donateSuggest,
    bgrewards,
    connected,
    maxlevel,
    safe,
    options,
  ] = rest;
  return {
    place: arg0 ?? 1,
    currentPercent: currentPercent ?? 190,
    donation: donation ?? 0,
    rewardFP: rewardFP ?? 0,
    donateCustom: donateCustom ?? 0,
    donateSuggest: donateSuggest ?? [],
    bgrewards: bgrewards ?? [],
    connected: connected ?? defaultGBselected.connected,
    maxlevel: maxlevel ?? false,
    safe: safe ?? [],
    gbData: options?.gbData ?? defaultGBselected,
    playerName: options?.playerName ?? defaultPlayerName,
    playerId: options?.playerId ?? defaultPlayerID,
    topInvestors: options?.topInvestors ?? [],
    remaining:
      options?.remaining ??
      Math.max(
        0,
        (defaultGBselected.total || 0) - (defaultGBselected.current || 0),
      ),
    myInfo: options?.myInfo ?? defaultMyInfo,
    options: options ?? defaultOptions,
    darkMode: options?.darkMode ?? false,
  };
}

function buildCardFooter(cfg) {
  const {
    playerName,
    myInfo,
    options,
    place,
    safe,
    donateSuggest,
    remaining,
    topInvestors,
    donateCustom,
    currentPercent,
    gbData,
  } = cfg;
  if (playerName !== myInfo?.name) return '';

  const playerShortName =
    playerName.length > 5 ?
      playerName.slice(0, playerName.indexOf(' '))
    : playerName;
  const topVal = topInvestors[place - 1] ?? 0;
  const ownerAdd = calculateOwnerSafeAdd(remaining, topVal, donateCustom);

  let footer = '<div class="card-footer text-muted">';
  if (ownerAdd > 0) {
    footer += `<span data-i18n="add">Add</span> <strong>${ownerAdd} FP </strong> <span data-i18n="safe">to make safe for</span> ${currentPercent ? currentPercent / 100 : '1.9'}`;
  }
  const txt = getDonations_new(place, safe, donateSuggest);
  if (txt) {
    const guildPos =
      (
        options?.showGuildPosition &&
        playerName === myInfo?.name &&
        myInfo?.guildPosition
      ) ?
        `#${myInfo.guildPosition} `
      : '';
    const copyId = place === 1 ? 'copyText' : `copyText_${place}`;
    footer += `<div id='${copyId}'>${guildPos}${playerShortName || playerName} ${helper.fGBsname(gbData?.name)} ${txt}</div>`;
  }
  footer += `<p>Remaining <strong>${(gbData?.total || 0) - (gbData?.current || 0)}</strong> FPs</p></div>`;
  return footer;
}

function gbTabSafe(...args) {
  const cfg = resolveCardParams(...args);
  const placeString =
    cfg.place === 1 ? '1st'
    : cfg.place === 2 ? '2nd'
    : cfg.place === 3 ? '3rd'
    : `${cfg.place}th`;
  const footer = buildCardFooter(cfg);
  const disconnected =
    cfg.connected == null ?
      '<br><span class="red">*** DISCONNECTED ***</span>'
    : '';
  const inactive = checkInactive(cfg.playerId);
  const locked =
    cfg.maxlevel ? '<br><span class="red">*** LOCKED ***</span>' : '';
  const profitFp = new BigNumber(cfg.rewardFP).minus(cfg.donation).toNumber();
  const guaranteedNote =
    cfg.donation <= cfg.donateCustom ? '<small>Guaranteed profit</small>' : '';

  const isDonationCollapsed = !!collapse.collapseDonation;
  const closeBtn = typeof element.close === 'function' ? element.close() : '';
  const copyBtn =
    typeof element.copy === 'function' ?
      element.copy('donationCopyID', 'info', 'right', isDonationCollapsed)
    : '';
  const iconHtml =
    typeof element.icon === 'function' ?
      element.icon('donationicon', 'donationText', isDonationCollapsed)
    : '';

  return `<div class="card ${cfg.darkMode === 'dark' ? 'text-light bg-dark' : 'text-dark bg-light'} alert show collapsed p-0">
    <div class="card-header fw-bold d-flex align-items-center justify-content-between">
      <div id="donationTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#donationText" aria-expanded="${!isDonationCollapsed}" aria-controls="donationText" class="cursor-pointer user-select-none d-flex align-items-center gap-1 text-truncate" style="cursor: pointer; user-select: none;">
        ${iconHtml}
        <span><span data-i18n="gb">GB</span> <span data-i18n="donation">donation</span></span>${disconnected}${inactive}${locked}
      </div>
      <div class="d-flex align-items-center gap-1 flex-shrink-0">
        ${closeBtn}${copyBtn}
      </div>
    </div>
    <div id="donationText" class="collapse ${isDonationCollapsed ? '' : 'show'}">
      <div class="card-body alert-success p-2">
        <h6 class="card-title mb-0"> <span id="GBselected">${cfg.gbData?.name} [${cfg.gbData?.level}/${cfg.gbData?.max_level}] (${cfg.gbData?.current}/${cfg.gbData?.total} FPs)</span></h6>
        <table class="table mb-1">
        <thead><tr>
        <th class="border border-top-0 border-left-0 border-right-0 border-dark">#</th>
        <th class="border border-top-0 border-left-0 border-right-0 border-dark">Lock</th>
        <th class="border border-top-0 border-left-0 border-right-0 border-dark">${cfg.currentPercent / 100}</th>
        <th class="border border-top-0 border-left-0 border-right-0 border-dark">Reward</th>
        </tr></thead>
        <tbody><tr>
        <td><strong>${placeString}</strong></td>
        <td>${cfg.donation} FP <strong>[+${profitFp} FP]</strong><br>${guaranteedNote}</td>
        <td>${cfg.donateCustom} FP</td>
        <td>${cfg.rewardFP} FP</td>
        </tr></tbody>
        </table>
      </div>${footer}
    </div>
  </div>`;
}

function gbTabNotSafe(...args) {
  const cfg = resolveCardParams(...args);
  const placeString =
    cfg.place === 1 ? '1st'
    : cfg.place === 2 ? '2nd'
    : cfg.place === 3 ? '3rd'
    : `${cfg.place}th`;
  const footer = buildCardFooter(cfg);
  const profitFp = new BigNumber(cfg.rewardFP).minus(cfg.donation).toNumber();
  const alertClass = profitFp === 0 ? 'alert-warning' : 'alert-danger';
  const guaranteedNote =
    cfg.donation <= cfg.donateCustom ? '<small>Guaranteed profit</small>' : '';

  const isDonationCollapsed = !!collapse.collapseDonation;
  const closeBtn = typeof element.close === 'function' ? element.close() : '';
  const copyBtn =
    typeof element.copy === 'function' ?
      element.copy('donationCopyID', 'info', 'right', isDonationCollapsed)
    : '';
  const iconHtml =
    typeof element.icon === 'function' ?
      element.icon('donationicon', 'donationText', isDonationCollapsed)
    : '';

  return `<div class="card ${cfg.darkMode === 'dark' ? 'text-light bg-dark' : 'text-dark bg-light'} ${alertClass} show collapsed p-0 ">
    <div class="card-header fw-bold d-flex align-items-center justify-content-between">
      <div id="donationTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#donationText" aria-expanded="${!isDonationCollapsed}" aria-controls="donationText" class="cursor-pointer user-select-none d-flex align-items-center gap-1 text-truncate" style="cursor: pointer; user-select: none;">
        ${iconHtml}
        <span><span data-i18n="gb">GB</span> <span data-i18n="donation">Donation</span></span>
      </div>
      <div class="d-flex align-items-center gap-1 flex-shrink-0">
        ${closeBtn}${copyBtn}
      </div>
    </div>
    <div id="donationText" class="collapse ${isDonationCollapsed ? '' : 'show'}">
      <div class="card-body ${alertClass} p-2">
        <h6 class="card-title mb-0"> <span id="GBselected">${cfg.gbData?.name} [${cfg.gbData?.level}/${cfg.gbData?.max_level}] (${cfg.gbData?.current}/${cfg.gbData?.total})</span></h6>
        <table class="table mb-1">
        <thead><tr>
        <th class="border border-top-0 border-left-0 border-right-0 border-dark">#</th>
        <th class="border border-top-0 border-left-0 border-right-0 border-dark">Lock</th>
        <th class="border border-top-0 border-left-0 border-right-0 border-dark">${cfg.currentPercent / 100}</th>
        <th class="border border-top-0 border-left-0 border-right-0 border-dark">Reward</th>
        </tr></thead>
        <tbody><tr>
        <td><strong>${placeString}</strong></td>
        <td>${cfg.donation} FP <strong>[${profitFp} FP]</strong><br>${guaranteedNote}</td>
        <td>${cfg.donateCustom} FP</td>
        <td>${cfg.rewardFP} FP</td>
        </tr></tbody>
        </table>
      </div>${footer}
    </div>
  </div>`;
}

function gbTabEmpty(...args) {
  const cfg = resolveCardParams(...args);
  const nextLevel = (cfg.gbData?.level || 0) + 1;

  const isDonationCollapsed = !!collapse.collapseDonation;
  const closeBtn = typeof element.close === 'function' ? element.close() : '';
  const iconHtml =
    typeof element.icon === 'function' ?
      element.icon('donationicon', 'donationText', isDonationCollapsed)
    : '';

  return `<div class="card ${cfg.darkMode === 'dark' ? 'text-light bg-dark' : 'text-dark bg-light'} alert show collapsed p-0 ">
    <div class="card-header fw-bold d-flex align-items-center justify-content-between">
      <div id="donationTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#donationText" aria-expanded="${!isDonationCollapsed}" aria-controls="donationText" class="cursor-pointer user-select-none d-flex align-items-center gap-1 text-truncate" style="cursor: pointer; user-select: none;">
        ${iconHtml}
        <span>GB Donation [${getPlayerLink(cfg.playerName, cfg.playerId)}]</span>
      </div>
      <div class="flex-shrink-0">
        ${closeBtn}
      </div>
    </div>
    <div id="donationText" class="collapse ${isDonationCollapsed ? '' : 'show'}">
      <div class="card-body alert-danger p-2">
        <h6 class="card-title mb-0"> <span id="GBselected">${cfg.gbData?.name} [${nextLevel}]</span></h6>
        <table class="table mb-1">
        <thead><tr>
        <th class="border border-top-0 border-left-0 border-right-0 border-dark">#</th>
        <th class="border border-top-0 border-left-0 border-right-0 border-dark">Lock</th>
        <th class="border border-top-0 border-left-0 border-right-0 border-dark">${cfg.currentPercent / 100}</th>
        <th class="border border-top-0 border-left-0 border-right-0 border-dark">Reward</th>
        </tr></thead>
        <tbody><tr>
        <td><strong>-</strong></td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        </tr></tbody>
        </table>
      </div>
    </div>
  </div>`;
}

module.exports = {
  fPercentBanded,
  fDonationSuggest,
  getPlayerLink,
  checkInactive,
  getDonations_new,
  getPlaceValues,
  gbTabSafe,
  gbTabNotSafe,
  gbTabEmpty,
  default: {
    fPercentBanded,
    fDonationSuggest,
    getPlayerLink,
    checkInactive,
    getDonations_new,
    getPlaceValues,
    gbTabSafe,
    gbTabNotSafe,
    gbTabEmpty,
  },
};
