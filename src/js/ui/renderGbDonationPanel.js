/**
 * renderGbDonationPanel.js
 *
 * Great Building Donation Panel controller and renderer.
 * Builds both classic and table-based donation views (1st-5th places, lock, profit/loss,
 * safe-to-add math, card table rows, event listener attachments, and clipboard snippet generation).
 * Decoupled from GreatBuildingsService.js to enforce single-responsibility UI boundaries.
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

let element = {};
try {
  element = require('./AddElement.js');
} catch {
  element = { close: () => '', copy: () => '', icon: () => '' };
}

let collapse = {};
try {
  collapse = require('../fn/collapse.js');
} catch {
  collapse = { collapseDonation: false };
}

let helper = {};
try {
  helper = require('../fn/helper.js');
} catch {
  helper = { fGBsname: (s) => s, escapeHTML: (s) => s };
}

let storage = {};
try {
  storage = require('../fn/storage.js');
} catch {}

let socialState = null;
try {
  ({ socialState } = require('../state/SocialState.js'));
} catch {}

let showOptionsModule;
try {
  showOptionsModule = require('../vars/showOptions.js');
} catch {
  showOptionsModule = { showOptions: {} };
}
const defaultOptions = showOptionsModule.showOptions || {};

let stateModule;
try {
  stateModule = require('../vars/state.js');
} catch {
  stateModule = {};
}
const defaultGameOrigin = stateModule.GameOrigin || 'en7';
const defaultGBselected = stateModule.GBselected || {};
const defaultMyInfo = stateModule.MyInfo || {};
const defaultPlayerID = stateModule.PlayerID || 0;
const defaultPlayerName = stateModule.PlayerName || '';

function getGbDonationTables() {
  try {
    return require('./gbDonationTables.js');
  } catch {
    return {};
  }
}

let loggerModule = {};
try {
  loggerModule = require('../utils/logger.js');
} catch {}

const {
  getFriendlyDonation,
  getSafe,
  getDonations,
  buildClassicDonationHeader,
  bindDonationEvents,
} = require('./gbDonationFormatters.js');

const { evaluateGbDonationPlaces } = require('./gbDonationPlaceEvaluator.js');

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

function checkInactive(playerId, hood, fr, gm) {
  const hoodList = hood || socialState?.getHoodlist?.() || [];
  const friendList = fr || socialState?.getFriends?.() || [];
  const guildList = gm || socialState?.getGuildMembers?.() || [];
  let html = inactiveHTML(hoodList, playerId);
  if (!html) html = inactiveHTML(friendList, playerId);
  if (!html) html = inactiveHTML(guildList, playerId);
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
  const BN = BigNumber || (typeof global !== 'undefined' && global.BigNumber);
  const profitFp =
    BN ?
      new BN(cfg.rewardFP).minus(cfg.donation).toNumber()
    : Number(cfg.rewardFP || 0) - Number(cfg.donation || 0);
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
        <h6 class="card-title mb-0"> <span id="GBselected">${cfg.gbData?.name} [${cfg.gbData?.level}/${cfg.gbData?.max_level}] (${cfg.gbData?.current}/${cfg.gbData?.total} FPs)</span></h6>
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
        <h6 class="card-title mb-0"> <span id="GBselected">${cfg.gbData?.name} [${cfg.gbData?.level}/${cfg.gbData?.max_level}] (${cfg.gbData?.current}/${cfg.gbData?.total})</span></h6>
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

function attachGbDonationPanelEvents(options = {}) {
  let {
    useNewDonationPanel: currentUseNew = false,
    donation2DIV,
    donationDIV,
    copyText = '',
    depCopy = {},
    depCollapse = {},
    depStorage = {},
    depHelper = {},
    onRerender,
    bindDonationEventsFn,
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

  if (typeof depHelper.translateContainer === 'function') {
    depHelper.translateContainer(donation2DIV || donationDIV);
  }

  return {
    useNewDonationPanel: activeUseNew,
  };
}

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
    depTables = params.depTables || getGbDonationTables(),
  } = params;

  logger.debug('renderGbDonationPanel called', {
    gb: GBselected.name,
    level: GBselected.level,
    player: PlayerName,
    currentPercent,
    availablePackageForgePoints,
  });

  const escapeFn = depHelper?.escapeHTML || ((s) => String(s ?? ''));
  const gbShortNameFn = depHelper?.fGBsname || ((s) => String(s ?? ''));
  const formatNumberFn =
    depHelper?.fFormatNumber ||
    ((n) =>
      Number.isFinite(Number(n)) ?
        Number(n).toLocaleString('en-US')
      : String(n));

  const calcPlaceValues =
    depTables?.getPlaceValues || depTables?.calcPlaceValues || (() => ({}));
  const checkInactiveFn = depTables?.checkInactive || checkInactive;
  const getPlayerLinkFn = depTables?.getPlayerLink || getPlayerLink;

  const resolvedTables = {
    gbTabSafe: depTables?.gbTabSafe || gbTabSafe,
    gbTabNotSafe: depTables?.gbTabNotSafe || gbTabNotSafe,
    gbTabEmpty: depTables?.gbTabEmpty || gbTabEmpty,
  };

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
  const prefixCopyText = `<div id='copyText'>${guildPosPrefix}${playerShortName || PlayerName} ${gbShortNameFn(GBselected.name)} `;

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
    : '<span id="donationCopyID" class="badge bg-secondary float-end">Copy</span>';
  const packageBadgeHtml =
    availablePackageForgePoints > 0 ?
      `<span class="badge bg-secondary ms-1">Packages: ${formatNumberFn(availablePackageForgePoints)} FP</span>`
    : '';

  const isGbLocked = Boolean(
    GBselected.max_level > 0 && GBselected.level >= GBselected.max_level,
  );

  const headerOldDonationHTML = buildClassicDonationHeader({
    isCollapsed,
    iconHtml,
    closeBtn,
    copyBtn,
    packageBadgeHtml,
    getPlayerLink: getPlayerLinkFn,
    PlayerName,
    GBselected,
    PlayerID,
    escapeFn,
    isGbLocked,
    checkInactive: checkInactiveFn,
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
    calcPlaceValues,
    isPlacePassableFn,
    getSafe,
    getFriendlyDonation,
    getDonations,
    depTables: resolvedTables,
    ownerSafeAddFn: GreatBuildingCalculator.calculateOwnerSafeAdd,
    BN,
  });

  const { foundPlace } = placeResult;
  const copyText = foundPlace ? prefixCopyText + placeResult.copyText : '';
  const olddonationHTML = headerOldDonationHTML + placeResult.olddonationHTML;
  const newdonationHTML = placeResult.newdonationHTML;

  if (showOptions?.showDonation !== false) {
    if (donation2DIV) {
      donation2DIV.innerHTML =
        useNewDonationPanel ?
          `${newdonationHTML}</div>`
        : `${olddonationHTML}${copyText}${donationSuffix || ''}</div>`;

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

module.exports = {
  renderGbDonationPanel,
  attachGbDonationPanelEvents,
  gbTabSafe,
  gbTabNotSafe,
  gbTabEmpty,
  resolveCardParams,
  buildCardFooter,
  getPlayerLink,
  inactiveHTML,
  checkInactive,
  getDonations_new,
  getSafe,
  getDonations,
  getFriendlyDonation,
};
module.exports.default = renderGbDonationPanel;
module.exports.renderGbDonationPanel = renderGbDonationPanel;
module.exports.attachGbDonationPanelEvents = attachGbDonationPanelEvents;
