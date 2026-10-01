/**
 * gbDonationPanel.js
 *
 * Unified Great Building Donation panel controller:
 * - Table card DOM builders (safe, not safe, empty place views, percent badges)
 * - Place evaluators & lock math (1st-5th places, profit/loss, suggested snippets)
 * - Classic & table-based donation panel rendering & DOM event attachments
 * - Reactive store subscription (bindGbDonationPanels)
 */

let BigNumber;
try {
  BigNumber = require('bignumber.js');
} catch {}

let GreatBuildingCalculator = {};
try {
  GreatBuildingCalculator = require('../calc/GreatBuildingCalculator.js');
} catch {}

const { calculateOwnerSafeAdd } = GreatBuildingCalculator;

let placeEvaluator = {};
try {
  placeEvaluator = require('../calc/gbDonationPlaceEvaluator.js');
} catch {}

const { fDonationSuggest, getSafe, getPlaceValues, evaluatePlaces } =
  placeEvaluator;

let element = {};
try {
  element = require('./AddElement.js');
} catch {
  element = { close: () => '', copy: () => '', icon: () => '' };
}

let collapse = {};
try {
  collapse = require('../fn/collapse.mjs');
} catch {
  collapse = { collapseDonation: false };
}

let copy = {};
try {
  copy = require('../fn/copy.mjs');
} catch {}

const { escapeHTML } = require('../utils/escape.js');

let helper = {};
try {
  helper = require('../fn/helper.mjs');
} catch {
  helper = { fGBsname: (s) => s, escapeHTML };
}

let storage = {};
try {
  storage = require('../fn/storage.js');
} catch {}

let socialState = null;
try {
  ({ socialState } = require('../state/SocialDomainState.js'));
} catch {}

const { gbDonationState } = require('../state/GreatBuildingDomainState.js');
const { renderGenericReward } = require('./renderRewardsPanel.js');

let renderUnifiedReward = null;
if (typeof __webpack_require__ !== 'undefined') {
  try {
    ({ showReward: renderUnifiedReward } = require('./RewardRenderer.mjs'));
  } catch {}
}

let showOptionsModule;
try {
  showOptionsModule = require('../vars/showOptions.mjs');
} catch {
  showOptionsModule = { showOptions: {} };
}
const defaultOptions = showOptionsModule.showOptions || {};

let stateModule;
try {
  stateModule = require('../vars/state.mjs');
} catch {
  stateModule = {};
}
const defaultGameOrigin = stateModule.GameOrigin || 'en7';
const defaultGBselected = stateModule.GBselected || {};
const defaultMyInfo = stateModule.MyInfo || {};
const defaultPlayerID = stateModule.PlayerID || 0;
const defaultPlayerName = stateModule.PlayerName || '';

let loggerModule = {};
try {
  loggerModule = require('../utils/logger.js');
} catch {}

const logger =
  typeof loggerModule.createLogger === 'function' ?
    loggerModule.createLogger('GbDonationPanel')
  : { debug: () => {}, warn: () => {} };

const isPlacePassableFn =
  GreatBuildingCalculator.isPlacePassable ||
  ((rem, occ) => Number(occ || 0) < Number(rem || 0));

let useNewDonationPanel = false;
try {
  if (typeof storage.getSync === 'function') {
    const syncVal = storage.getSync('useNewDonationPanel');
    if (syncVal !== null && syncVal !== undefined)
      useNewDonationPanel = syncVal;
  }
} catch {}

// ============================================================================
// 1. FORMATTERS & BADGES
// ============================================================================

function fPercentBanded(percent) {
  const num = typeof percent === 'number' ? percent : Number(percent);
  if (num >= 20) return 'green';
  if (num >= 10) return 'invest-good';
  if (num > 5) return 'invest-fair';
  return '';
}

function getFriendlyDonation(donation, reward, percent, lock, band) {
  const isLoss =
    band !== undefined ?
      band === 'red'
    : donation &&
      reward &&
      lock &&
      (donation.isGreaterThan(reward) || lock.isGreaterThan(donation));
  return `<span class="${isLoss ? 'red' : 'green'}">${
    percent / 100
  }: ${donation}FP</span><br>`;
}

function getDonations(params = {}) {
  const { place = 1, safe = [], donateSuggest = [], showOptions = {} } = params;

  let footer = '';
  for (let i = 5; i > 0; i--) {
    const suggestVal =
      typeof donateSuggest[i - 1]?.toNumber === 'function' ?
        donateSuggest[i - 1].toNumber()
      : Number(donateSuggest[i - 1] || 0);

    if (
      place <= i &&
      suggestVal > 0 &&
      (safe[i - 1] || !showOptions.hideUnsafe)
    ) {
      footer += `<span class="${safe[i - 1] ? 'invest-good' : 'invest-bad'}">P${
        i + '(' + suggestVal + ')'
      }</span> `;
    }
  }
  return footer;
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

function getPlayerLink(playerName, playerId, gameOrigin) {
  let stateMod = null;
  try {
    stateMod = require('../vars/state.mjs');
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

function checkInactive(playerId, hood, fr, gm) {
  const hoodList = hood || socialState?.getHoodlist?.() || [];
  const friendList = fr || socialState?.getFriends?.() || [];
  const guildList = gm || socialState?.getGuildMembers?.() || [];
  let html = inactiveHTML(hoodList, playerId);
  if (!html) html = inactiveHTML(friendList, playerId);
  if (!html) html = inactiveHTML(guildList, playerId);
  return html;
}

// ============================================================================
// 2. CARD PARAMS & DOM TABLE BUILDERS
// ============================================================================

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

function buildCardFooter(cfg, getDonationsFn = getDonations_new) {
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
  const ownerAdd =
    typeof calculateOwnerSafeAdd === 'function' ?
      calculateOwnerSafeAdd(remaining, topVal, donateCustom)
    : 0;

  let footer = '<div class="card-footer text-muted">';
  if (ownerAdd > 0) {
    footer += `<span data-i18n="add">Add</span> <strong>${ownerAdd} FP </strong> <span data-i18n="safe">to make safe for</span> ${currentPercent ? currentPercent / 100 : '1.9'}`;
  }
  const txt =
    typeof getDonationsFn === 'function' ?
      getDonationsFn(place, safe, donateSuggest)
    : '';
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
    footer += `<div id='${copyId}'>${guildPos}${escapeHTML(playerShortName || playerName)} ${escapeHTML(helper.fGBsname(gbData?.name))} ${txt}</div>`;
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
  const BN = BigNumber || (typeof global !== 'undefined' && global.BigNumber);
  const profitFp =
    BN ?
      new BN(cfg.rewardFP).minus(cfg.donation).toNumber()
    : Number(cfg.rewardFP || 0) - Number(cfg.donation || 0);
  const guaranteedNote =
    cfg.donation <= cfg.donateCustom ?
      `<small><span data-i18n="guaranteed_profit">Guaranteed profit</span></small>`
    : '';

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

  return `<div class="card text-dark bg-light alert show collapsed p-0">
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
        <h6 class="card-title mb-0"> <span id="GBselected">${escapeHTML(cfg.gbData?.name)} [${cfg.gbData?.level}/${cfg.gbData?.max_level}] (${cfg.gbData?.current}/${cfg.gbData?.total} FPs)</span></h6>
        <table class="table mb-1">
        <caption class="visually-hidden"><span data-i18n="donation">GB Donation</span></caption>
        <thead><tr>
        <th scope="col" class="border border-top-0 border-left-0 border-right-0 border-dark">#</th>
        <th scope="col" class="border border-top-0 border-left-0 border-right-0 border-dark"><span data-i18n="lock">Lock</span></th>
        <th scope="col" class="border border-top-0 border-left-0 border-right-0 border-dark">${cfg.currentPercent / 100}</th>
        <th scope="col" class="border border-top-0 border-left-0 border-right-0 border-dark"><span data-i18n="reward">Reward</span></th>
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
  const BN = BigNumber || (typeof global !== 'undefined' && global.BigNumber);
  const profitFp =
    BN ?
      new BN(cfg.rewardFP).minus(cfg.donation).toNumber()
    : Number(cfg.rewardFP || 0) - Number(cfg.donation || 0);
  const alertClass = profitFp === 0 ? 'alert-warning' : 'alert-danger';
  const guaranteedNote =
    cfg.donation <= cfg.donateCustom ?
      `<small><span data-i18n="guaranteed_profit">Guaranteed profit</span></small>`
    : '';

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

  return `<div class="card text-dark bg-light ${alertClass} show collapsed p-0 ">
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
        <h6 class="card-title mb-0"> <span id="GBselected">${escapeHTML(cfg.gbData?.name)} [${cfg.gbData?.level}/${cfg.gbData?.max_level}] (${cfg.gbData?.current}/${cfg.gbData?.total})</span></h6>
        <table class="table mb-1">
        <caption class="visually-hidden"><span data-i18n="donation">GB Donation</span></caption>
        <thead><tr>
        <th scope="col" class="border border-top-0 border-left-0 border-right-0 border-dark">#</th>
        <th scope="col" class="border border-top-0 border-left-0 border-right-0 border-dark"><span data-i18n="lock">Lock</span></th>
        <th scope="col" class="border border-top-0 border-left-0 border-right-0 border-dark">${cfg.currentPercent / 100}</th>
        <th scope="col" class="border border-top-0 border-left-0 border-right-0 border-dark"><span data-i18n="reward">Reward</span></th>
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

  return `<div class="card text-dark bg-light alert show collapsed p-0 ">
    <div class="card-header fw-bold d-flex align-items-center justify-content-between">
      <div id="donationTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#donationText" aria-expanded="${!isDonationCollapsed}" aria-controls="donationText" class="cursor-pointer user-select-none d-flex align-items-center gap-1 text-truncate" style="cursor: pointer; user-select: none;">
        ${iconHtml}
        <span>GB Donation [${getPlayerLink(escapeHTML(cfg.playerName), cfg.playerId)}]</span>
      </div>
      <div class="flex-shrink-0">
        ${closeBtn}
      </div>
    </div>
    <div id="donationText" class="collapse ${isDonationCollapsed ? '' : 'show'}">
      <div class="card-body alert-danger p-2">
        <h6 class="card-title mb-0"> <span id="GBselected">${escapeHTML(cfg.gbData?.name)} [${nextLevel}]</span></h6>
        <table class="table mb-1">
        <caption class="visually-hidden"><span data-i18n="donation">GB Donation</span></caption>
        <thead><tr>
        <th scope="col" class="border border-top-0 border-left-0 border-right-0 border-dark">#</th>
        <th scope="col" class="border border-top-0 border-left-0 border-right-0 border-dark"><span data-i18n="lock">Lock</span></th>
        <th scope="col" class="border border-top-0 border-left-0 border-right-0 border-dark">${cfg.currentPercent / 100}</th>
        <th scope="col" class="border border-top-0 border-left-0 border-right-0 border-dark"><span data-i18n="reward">Reward</span></th>
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

// ============================================================================
// 3. PLACE EVALUATOR (HTML ASSEMBLY)
//
// The arithmetic lives in ../calc/gbDonationPlaceEvaluator.js. This section
// only turns an evaluated place into markup and clipboard text.
// ============================================================================

function formatPlaceOrdinal(p) {
  if (p === 1) return '1st';
  if (p === 2) return '2nd';
  if (p === 3) return '3rd';
  return `${p}th`;
}

function evaluateGbDonationPlaces(options = {}) {
  const {
    GBselected = {},
    Top = [0, 0, 0, 0, 0, 0],
    GBrewards = [0, 0, 0, 0, 0],
    currentPercent = 190,
    City = {},
    PlayerName = '',
    MyInfo = {},
    isGbLocked = false,
    showOptions = {},
    depTables = {},
    calcPlaceValues = getPlaceValues,
    isPlacePassableFn = () => false,
    getSafe: depGetSafe = getSafe,
    getFriendlyDonation: depGetFriendlyDonation = getFriendlyDonation,
    getDonations: depGetDonations = getDonations,
    ownerSafeAddFn = calculateOwnerSafeAdd,
    evaluatePlaces: depEvaluatePlaces = evaluatePlaces,
  } = options;

  const tabSafe = depTables.gbTabSafe || gbTabSafe;
  const tabNotSafe = depTables.gbTabNotSafe || gbTabNotSafe;
  const tabEmpty = depTables.gbTabEmpty || gbTabEmpty;

  // Arithmetic is delegated; this function only assembles markup.
  const place = depEvaluatePlaces({
    GBselected,
    Top,
    GBrewards,
    currentPercent,
    arcBonus: City?.ArcBonus ?? 90,
    calcPlaceValues,
    isPlacePassableFn,
    getSafe: depGetSafe,
    ownerSafeAddFn,
  });

  const { foundPlace } = place;
  const Donation = place.donation;
  const RewardFP = place.rewardFP;
  const Percent = place.percent;
  const donateCustom = place.donateCustom;
  const safeArr = place.safe;
  const donateSuggestArr = place.donateSuggest;

  let olddonationHTML = '';
  let newdonationHTML = '';
  let copyText = '';

  if (foundPlace) {
    const p = place.place;
    const outcome = place.outcome;
    const netValue = place.netValue;
    const outcomeClass = outcome === 'loss' ? 'invest-bad' : 'invest-good';
    const placeOrdinal = formatPlaceOrdinal(p);

    if (outcome === 'loss') {
      olddonationHTML += `<p class="${outcomeClass}">${placeOrdinal} <span data-i18n="place">Place</span><br><span data-i18n="lock">Lock</span>: ${Donation}FP<br><span data-i18n="loss">Loss</span>: ${netValue}<br>`;
      newdonationHTML += tabNotSafe(
        p,
        currentPercent,
        Donation,
        RewardFP,
        donateCustom,
        donateSuggestArr,
        GBrewards,
        GBselected.connected,
        isGbLocked,
        safeArr,
      );
    } else {
      const outcomeLine =
        outcome === 'safe' ?
          `<span data-i18n="safe_net">Safe</span>: 0 <span data-i18n="net">NET</span>`
        : `<span data-i18n="profit">Profit</span>: ${netValue} (${Percent}%)`;
      olddonationHTML += `<p class="${outcomeClass}">${placeOrdinal} <span data-i18n="place">Place</span><br><span data-i18n="lock">Lock</span>: ${Donation}FP<br>${outcomeLine}<br>`;
      newdonationHTML += tabSafe(
        p,
        currentPercent,
        Donation,
        RewardFP,
        donateCustom,
        donateSuggestArr,
        GBrewards,
        GBselected.connected,
        isGbLocked,
        safeArr,
      );
    }

    if (place.hasReward) {
      olddonationHTML += depGetFriendlyDonation(
        donateCustom,
        RewardFP,
        currentPercent,
        Donation,
        place.band,
      );
      olddonationHTML +=
        p === 1 ?
          `<span data-i18n="building_effect">BE</span>: ${RewardFP}FP</p>`
        : `<span data-i18n="building_effect">BE</span>: ${RewardFP}FP<br></p>`;

      if (PlayerName === MyInfo.name && place.ownerAdd > 0) {
        olddonationHTML += `<p class=""><span data-i18n="add">Add</span> ${place.ownerAdd}FP <span data-i18n="safe">to make safe for</span> ${
          currentPercent ? currentPercent / 100 : '1.9'
        }</p>`;
      }
      copyText += depGetDonations({
        place: p,
        safe: safeArr,
        donateSuggest: donateSuggestArr,
        showOptions,
      });
    } else {
      olddonationHTML += '</p>';
      if (p === 1) {
        copyText += depGetDonations({
          place: 1,
          safe: safeArr,
          donateSuggest: donateSuggestArr,
          showOptions,
        });
      }
    }
  } else {
    newdonationHTML += tabEmpty(
      '-',
      currentPercent,
      Donation,
      RewardFP,
      donateCustom,
      donateSuggestArr,
      GBrewards,
      GBselected.connected,
      isGbLocked,
      safeArr,
    );
  }

  return {
    foundPlace,
    olddonationHTML,
    newdonationHTML,
    copyText: copyText.trim(),
  };
}

// ============================================================================
// 4. CLASSIC DONATION HEADER & EVENT BINDINGS
// ============================================================================

function buildClassicDonationHeader(options = {}) {
  const {
    isCollapsed,
    iconHtml,
    closeBtn,
    copyBtn,
    getPlayerLink: getPlayerLinkFn = getPlayerLink,
    PlayerName,
    GBselected,
    PlayerID,
    escapeFn = escapeHTML,
    isGbLocked,
    checkInactive: checkInactiveFn = checkInactive,
  } = options;

  let html = `<div class="alert alert-secondary alert-dismissible show collapsed" role="status" aria-live="polite">
            ${closeBtn}
            <p id="freeTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#donationText3" aria-expanded="${!isCollapsed}" aria-controls="donationText3" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">
      ${iconHtml}
            <strong><span data-i18n="gb">GB</span> <span data-i18n="donation">Donation</span>:</strong></p>`;
  html += copyBtn;
  html += `<div id="donationText3" class="collapse ${
    isCollapsed ? '' : 'show'
  }"><p>${getPlayerLinkFn(escapeHTML(PlayerName || GBselected?.player_name), PlayerID || GBselected?.player)}<br>`;
  html += `<span id="GBselected">${escapeFn(GBselected?.name)} ${(GBselected?.level || 0) + 1}</span></p>`;

  if (GBselected?.connected === false) {
    html += '<p class="red">*** DISCONNECTED ***</p>';
  }
  if (isGbLocked) {
    html += '<p class="red">*** LOCKED ***</p>';
  }
  html += typeof checkInactiveFn === 'function' ? checkInactiveFn() : '';
  return html;
}

function bindDonationEvents(options = {}) {
  const {
    depCopy = copy,
    depCollapse = collapse,
    depStorage = storage,
    onRerender,
    getUseNewPanel,
    setUseNewPanel,
    copyText,
  } = options;

  if (typeof document === 'undefined') return;

  const donationCopyEl = document.getElementById('donationCopyID');
  if (donationCopyEl) {
    if (typeof depCopy?.DonationCopy === 'function') {
      donationCopyEl.addEventListener('click', depCopy.DonationCopy);
    }
    if (!copyText) donationCopyEl.style.display = 'none';
  }

  const freeTextLabelEl = document.getElementById('freeTextLabel');
  if (freeTextLabelEl && typeof depCollapse?.fCollapseDonation === 'function') {
    freeTextLabelEl.addEventListener('click', depCollapse.fCollapseDonation);
  }

  const gbSelectedEl = document.getElementById('GBselected');
  if (gbSelectedEl) {
    gbSelectedEl.addEventListener('click', (event) => {
      if (event && event.shiftKey) {
        const nextVal =
          typeof getUseNewPanel === 'function' ? !getUseNewPanel() : false;
        if (typeof setUseNewPanel === 'function') {
          setUseNewPanel(nextVal);
        }
        if (typeof depStorage?.set === 'function') {
          depStorage.set('useNewDonationPanel', nextVal);
        }
        if (typeof onRerender === 'function') {
          onRerender();
        }
      }
    });
  }
}

function attachGbDonationPanelEvents(options = {}) {
  let {
    useNewDonationPanel: currentUseNew = false,
    donation2DIV,
    donationDIV,
    copyText = '',
    depCopy = copy,
    depCollapse = collapse,
    depStorage = storage,
    depHelper = helper,
    onRerender,
    bindDonationEventsFn = bindDonationEvents,
    doc = typeof document !== 'undefined' ? document : null,
  } = options;

  let activeUseNew = currentUseNew;

  if (!activeUseNew && typeof bindDonationEventsFn === 'function') {
    bindDonationEventsFn({
      depCopy,
      depCollapse,
      depStorage,
      onRerender,
      getUseNewPanel: () => activeUseNew,
      setUseNewPanel: (val) => {
        activeUseNew = val;
      },
      copyText,
    });
  }

  if (activeUseNew && doc && typeof doc.getElementById === 'function') {
    const gbSelectedEl = doc.getElementById('GBselected');
    if (gbSelectedEl && typeof gbSelectedEl.addEventListener === 'function') {
      gbSelectedEl.addEventListener('click', (event) => {
        if (event && event.shiftKey) {
          activeUseNew = !activeUseNew;
          if (typeof depStorage.set === 'function') {
            depStorage.set('useNewDonationPanel', activeUseNew);
          }
          if (typeof onRerender === 'function') {
            onRerender();
          }
        }
      });
    }
  }

  if (typeof depHelper?.translateContainer === 'function') {
    depHelper.translateContainer(donation2DIV || donationDIV);
  }

  return {
    useNewDonationPanel: activeUseNew,
  };
}

// ============================================================================
// 5. MAIN DONATION PANEL RENDERER
// ============================================================================

function renderGbDonationPanel(params = {}) {
  const {
    GBselected = {},
    currentPercent = 190,
    PlayerName = '',
    PlayerID = 0,
    MyInfo = {},
    showOptions = {},
    donationDIV = null,
    donation2DIV = null,
    donationSuffix = '',
    availablePackageForgePoints = 0,
    depHelper = helper,
    depElement = element,
    depCollapse = collapse,
  } = params;

  logger.debug('renderGbDonationPanel called', {
    gb: GBselected.name,
    level: GBselected.level,
    player: PlayerName,
    currentPercent,
    availablePackageForgePoints,
  });

  const escapeFn = depHelper?.escapeHTML || escapeHTML;
  const gbShortNameFn = depHelper?.fGBsname || ((s) => String(s ?? ''));
  const playerShortName =
    PlayerName && PlayerName.length > 5 && PlayerName.indexOf(' ') > 0 ?
      PlayerName.substr(0, PlayerName.indexOf(' '))
    : PlayerName;

  const guildPosPrefix =
    (
      showOptions.showGuildPosition &&
      PlayerName === MyInfo.name &&
      MyInfo.guildPosition
    ) ?
      `#${MyInfo.guildPosition} `
    : '';
  const prefixCopyText = `<div id='copyText'>${guildPosPrefix}${escapeHTML(playerShortName || PlayerName)} ${escapeHTML(gbShortNameFn(GBselected.name))} `;

  const isCollapsed = Boolean(depCollapse.collapseDonation);
  const iconHtml =
    depElement.icon ?
      depElement.icon('donationicon', 'donationText3', isCollapsed)
    : `<span id="donationicon">[${isCollapsed ? '+' : '-'}]</span>`;
  const closeBtn =
    depElement.close ?
      depElement.close()
    : '<button type="button" class="btn-close" data-bs-dismiss="alert"></button>';
  const copyBtn =
    depElement.copy ?
      depElement.copy('donationCopyID', 'secondary', 'right', isCollapsed)
    : '<span id="donationCopyID" class="badge bg-secondary float-end" data-i18n="copy">Copy</span>';
  const isGbLocked = Boolean(
    GBselected.max_level > 0 && GBselected.level >= GBselected.max_level,
  );

  const headerOldDonationHTML = buildClassicDonationHeader({
    isCollapsed,
    iconHtml,
    closeBtn,
    copyBtn,
    getPlayerLink,
    PlayerName,
    GBselected,
    PlayerID,
    escapeFn,
    isGbLocked,
    checkInactive,
  });

  if (donationDIV) {
    donationDIV.innerHTML = '';
    donationDIV.style.display = 'block';
  }
  if (donation2DIV && showOptions?.showDonation !== false) {
    donation2DIV.style.display = '';
  }

  const BN = BigNumber || (typeof global !== 'undefined' && global.BigNumber);

  const placeResult = evaluateGbDonationPlaces({
    ...params,
    isGbLocked,
    calcPlaceValues: getPlaceValues,
    isPlacePassableFn,
    getSafe,
    getFriendlyDonation,
    getDonations,
    depTables: {
      gbTabSafe,
      gbTabNotSafe,
      gbTabEmpty,
    },
    ownerSafeAddFn: calculateOwnerSafeAdd,
    BN,
  });

  const { foundPlace } = placeResult;
  const copyText =
    foundPlace && placeResult.copyText ?
      prefixCopyText + placeResult.copyText + (donationSuffix || '') + '</div>'
    : '';
  const olddonationHTML = headerOldDonationHTML + placeResult.olddonationHTML;
  const newdonationHTML = placeResult.newdonationHTML;

  if (showOptions?.showDonation !== false) {
    if (donation2DIV) {
      donation2DIV.innerHTML =
        useNewDonationPanel ?
          `${newdonationHTML}</div>`
        : `${olddonationHTML}${copyText}</div></div>`;

      const eventResult = attachGbDonationPanelEvents({
        ...params,
        useNewDonationPanel,
        copyText,
        bindDonationEventsFn: bindDonationEvents,
      });
      useNewDonationPanel = eventResult.useNewDonationPanel;
    }
  } else {
    if (donation2DIV) donation2DIV.innerHTML = '';
    if (donationDIV) donationDIV.innerHTML = '';
  }

  return { foundPlace, copyText, useNewDonationPanel };
}

// ============================================================================
// 6. REACTIVE STORE BINDING
// ============================================================================

function bindGbDonationPanels(
  state = gbDonationState,
  { renderReward = renderGenericReward, showReward = renderUnifiedReward } = {},
) {
  if (!state || typeof state.subscribe !== 'function') return () => {};
  return state.subscribe((snapshot, channel) => {
    if (channel === 'reward' || channel === 'all') {
      const reward = snapshot.getReward();
      if (!reward) return;
      if (reward.mode === 'generic' || typeof showReward !== 'function') {
        renderReward(reward.container, reward.amount, reward.formattedName);
      } else {
        showReward('greatBuilding', reward.args);
      }
    }
  });
}

module.exports = {
  renderGbDonationPanel,
  attachGbDonationPanelEvents,
  gbTabSafe,
  gbTabNotSafe,
  gbTabEmpty,
  getPlaceValues,
  calcPlaceValues: getPlaceValues,
  getFriendlyDonation,
  getSafe,
  getDonations,
  getDonations_new,
  resolveCardParams,
  buildCardFooter,
  getPlayerLink,
  inactiveHTML,
  checkInactive,
  fPercentBanded,
  fDonationSuggest,
  buildClassicDonationHeader,
  bindDonationEvents,
  evaluateGbDonationPlaces,
  bindGbDonationPanels,
};
module.exports.default = module.exports;
module.exports.renderGbDonationPanel = renderGbDonationPanel;
