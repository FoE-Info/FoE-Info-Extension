/**
 * renderGbDonationPanel.js
 *
 * Great Building Donation Panel renderer.
 * Builds both classic and table-based donation views (1st-5th places, lock, profit/loss,
 * safe-to-add math, and clipboard snippet generation).
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

let element = {};
try {
  element = require('../fn/AddElement.js');
} catch {}

let collapse = {};
try {
  collapse = require('../fn/collapse.js');
} catch {}

let copy = {};
try {
  copy = require('../fn/copy.js');
} catch {}

let helper = {};
try {
  helper = require('../fn/helper.js');
} catch {}

let storage = {};
try {
  storage = require('../fn/storage.js');
} catch {}

let gbDonationTables = {};
try {
  gbDonationTables = require('./gbDonationTables.js');
} catch {}

let loggerModule = {};
try {
  loggerModule = require('../utils/logger.js');
} catch {}

const logger =
  typeof loggerModule.createLogger === 'function' ?
    loggerModule.createLogger('GbDonationPanel')
  : { debug: () => {}, warn: () => {} };

let useNewDonationPanel = false;
try {
  if (typeof storage.getSync === 'function') {
    const syncVal = storage.getSync('useNewDonationPanel');
    if (syncVal !== null) useNewDonationPanel = syncVal;
  }
} catch {}

function getFriendlyDonation(donation, reward, percent, lock) {
  const isLoss =
    donation &&
    reward &&
    lock &&
    (donation.isGreaterThan(reward) || lock.isGreaterThan(donation));
  return `<span class="${isLoss ? 'red' : 'green'}">${
    percent / 100
  }: ${donation}FP</span><br>`;
}

function getSafe(params = {}) {
  const {
    place = 1,
    GBrewards = [0, 0, 0, 0, 0],
    currentPercent = 190,
    remaining = 0,
    Top = [0, 0, 0, 0, 0, 0],
    calculateSuggestedDonation = GreatBuildingCalculator.calculateSuggestedDonation,
  } = params;

  const safe = [];
  const donateSuggest = [];
  const index = place - 1;
  let rem = remaining;

  for (let i = index; i < 5; i++) {
    const BN = BigNumber || (typeof global !== 'undefined' && global.BigNumber);
    const suggested =
      typeof calculateSuggestedDonation === 'function' ?
        calculateSuggestedDonation(GBrewards[i] || 0, currentPercent)
      : BN ?
        new BN(GBrewards[i] || 0)
          .multipliedBy(currentPercent)
          .dividedBy(100)
          .integerValue(BN.ROUND_HALF_UP)
          .toNumber()
      : Math.round((GBrewards[i] || 0) * (currentPercent / 100));

    donateSuggest[i] = BN ? new BN(suggested) : suggested;

    const numVal =
      typeof donateSuggest[i]?.toNumber === 'function' ?
        donateSuggest[i].toNumber()
      : Number(donateSuggest[i] || 0);

    rem -= numVal;
    safe[i] = rem <= numVal - (Top[i + 1] || 0);
  }

  return { safe, donateSuggest };
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

function renderGbDonationPanel(params = {}) {
  const {
    GBselected = {},
    showOptions = {},
    donationDIV,
    donation2DIV,
    Top = [0, 0, 0, 0, 0, 0],
    GBrewards = [0, 0, 0, 0, 0],
    currentPercent = 190,
    City = {},
    PlayerID = 0,
    PlayerName = '',
    MyInfo = {},
    donationSuffix = '',
    onRerender,
    depHelper = helper,
    depElement = element,
    depCollapse = collapse,
    depCopy = copy,
    depStorage = storage,
    depTables = gbDonationTables,
  } = params;

  logger.debug('renderGbDonationPanel called', {
    gb: GBselected.name,
    level: GBselected.level,
    player: PlayerName,
    currentPercent,
  });

  const escapeFn =
    typeof depHelper.escapeHTML === 'function' ?
      depHelper.escapeHTML
    : (s) => String(s ?? '');
  const gbShortNameFn =
    typeof depHelper.fGBsname === 'function' ?
      depHelper.fGBsname
    : (s) => String(s ?? '');

  const calcPlaceValues =
    depTables.getPlaceValues || depTables.calcPlaceValues || (() => ({}));
  const gbTabSafe = depTables.gbTabSafe || (() => '');
  const gbTabNotSafe = depTables.gbTabNotSafe || (() => '');
  const gbTabEmpty = depTables.gbTabEmpty || (() => '');
  const checkInactive = depTables.checkInactive || (() => '');
  const getPlayerLink = depTables.getPlayerLink || ((n) => escapeFn(n));

  const playerShortName =
    PlayerName && PlayerName.length > 5 && PlayerName.indexOf(' ') > 0 ?
      PlayerName.substr(0, PlayerName.indexOf(' '))
    : PlayerName;

  let newdonationHTML = '';
  let copyText = `<div id='copyText'>${
    (
      showOptions.showGuildPosition &&
      PlayerName === MyInfo.name &&
      MyInfo.guildPosition
    ) ?
      '#' + MyInfo.guildPosition + ' '
    : ''
  }${playerShortName ? playerShortName : PlayerName} ${gbShortNameFn(GBselected.name)} `;

  const isCollapsed = Boolean(depCollapse.collapseDonation);
  const iconHtml =
    typeof depElement.icon === 'function' ?
      depElement.icon('donationicon', 'donationText3', isCollapsed)
    : `<span id="donationicon">[${isCollapsed ? '+' : '-'}]</span>`;
  const closeBtn =
    typeof depElement.close === 'function' ?
      depElement.close()
    : '<button type="button" class="btn-close" data-bs-dismiss="alert"></button>';
  const copyBtn =
    typeof depElement.copy === 'function' ?
      depElement.copy('donationCopyID', 'secondary', 'right', isCollapsed)
    : '<span id="donationCopyID" class="badge bg-secondary float-end">Copy</span>';

  let olddonationHTML = `<div class="alert alert-secondary alert-dismissible show collapsed" role="alert">
            ${closeBtn}
            <p id="freeTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#donationText3" aria-expanded="${!isCollapsed}" aria-controls="donationText3" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">
      ${iconHtml}
            <strong><span data-i18n="gb">GB</span> <span data-i18n="donation">Donation</span>:</strong></p>`;
  olddonationHTML += copyBtn;
  olddonationHTML += `<div id="donationText3" class="collapse ${
    isCollapsed ? '' : 'show'
  }"><p>${getPlayerLink(PlayerName || GBselected.player_name, PlayerID || GBselected.player)}<br>`;
  olddonationHTML += `<span id="GBselected">${escapeFn(GBselected.name)} ${(GBselected.level || 0) + 1}</span></p>`;

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

  if (donationDIV) {
    donationDIV.innerHTML = '';
    donationDIV.style.display = 'block';
  }
  if (donation2DIV && showOptions?.showDonation !== false) {
    donation2DIV.style.display = '';
  }

  const BN = BigNumber || (typeof global !== 'undefined' && global.BigNumber);
  let foundPlace = false;
  let remaining = 0;
  let Donation = BN ? new BN(0) : 0;
  let RewardFP = BN ? new BN(0) : 0;
  let Profit = 0;
  let Percent = BN ? new BN(0) : 0;
  let donateCustom = BN ? new BN(0) : 0;
  let safeArr = [];
  let donateSuggestArr = [];

  for (let p = 1; p <= 5; p++) {
    remaining = Math.max(
      0,
      (GBselected.total || 0) - (GBselected.current || 0),
    );

    const vals = calcPlaceValues(
      GBselected,
      p,
      Top,
      GBrewards,
      currentPercent,
      City?.ArcBonus ?? 90,
    );
    remaining = vals.remaining ?? remaining;
    Donation = vals.donation ?? Donation;
    RewardFP = vals.rewardFP ?? RewardFP;
    Profit = vals.profit ?? Profit;
    Percent = vals.percent ?? Percent;
    donateCustom = vals.donateCustom ?? donateCustom;

    const safeRes = getSafe({
      place: p,
      GBrewards,
      currentPercent,
      remaining,
      Top,
      calculateSuggestedDonation:
        GreatBuildingCalculator.calculateSuggestedDonation,
    });
    safeArr = safeRes.safe;
    donateSuggestArr = safeRes.donateSuggest;
    const placeIdx = p - 1;

    const isLeq =
      typeof Donation?.isLessThanOrEqualTo === 'function' ?
        Donation.isLessThanOrEqualTo(BN ? new BN(remaining) : remaining)
      : Number(Donation) <= remaining;

    if (isLeq) {
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
          donateSuggestArr,
          GBrewards,
          GBselected.connected,
          isGbLocked,
          safeArr,
        );
      } else {
        const netDifference =
          typeof Donation?.minus === 'function' ?
            Donation.minus(donateCustom).toNumber()
          : Number(Donation) - Number(donateCustom);

        let outcomeKey = 'safe';
        let outcomeLabel = 'Break-even';
        let outcomeClass = 'invest-neutral';
        let outcomeValue = 0;

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
        }

        olddonationHTML += `<p class="${outcomeClass}">${placeOrdinal} Place<br><span data-i18n="lock">Lock</span>: ${Donation}FP<br><span data-i18n="${outcomeKey}">${outcomeLabel}</span>: ${outcomeValue}<br>`;
        newdonationHTML += gbTabNotSafe(
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

      if (GBrewards[placeIdx]) {
        olddonationHTML += getFriendlyDonation(
          donateCustom,
          RewardFP,
          currentPercent,
          Donation,
        );
        olddonationHTML +=
          p === 1 ? `BE: ${RewardFP}FP</p>` : `BE: ${RewardFP}FP<br></p>`;

        const ownerSafeAddFn =
          GreatBuildingCalculator.calculateOwnerSafeAdd || (() => 0);
        const ownerAdd = ownerSafeAddFn(
          remaining,
          Top[placeIdx] || 0,
          donateCustom,
        );

        if (PlayerName === MyInfo.name && ownerAdd > 0) {
          olddonationHTML += `<p class=""><span data-i18n="add">Add</span> ${ownerAdd}FP <span data-i18n="safe">to make safe for</span> ${
            currentPercent ? currentPercent / 100 : '1.9'
          }</p>`;
        }
        copyText += getDonations({
          place: p,
          safe: safeArr,
          donateSuggest: donateSuggestArr,
          showOptions,
        });
      } else {
        olddonationHTML += '</p>';
        if (p === 1) {
          copyText += getDonations({
            place: 1,
            safe: safeArr,
            donateSuggest: donateSuggestArr,
            showOptions,
          });
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
      donateSuggestArr,
      GBrewards,
      GBselected.connected,
      isGbLocked,
    );
  }

  if (showOptions?.showDonation !== false) {
    if (donation2DIV) {
      if (useNewDonationPanel) {
        donation2DIV.innerHTML = newdonationHTML + '</div>';
      } else {
        donation2DIV.innerHTML =
          olddonationHTML +
          copyText +
          (donationSuffix ? donationSuffix : '') +
          '</div>';

        if (typeof document !== 'undefined') {
          const donationCopyEl = document.getElementById('donationCopyID');
          if (donationCopyEl) {
            if (typeof depCopy.DonationCopy === 'function') {
              donationCopyEl.addEventListener('click', depCopy.DonationCopy);
            }
            if (!copyText) donationCopyEl.style.display = 'none';
          }

          const freeTextLabelEl = document.getElementById('freeTextLabel');
          if (
            freeTextLabelEl &&
            typeof depCollapse.fCollapseDonation === 'function'
          ) {
            freeTextLabelEl.addEventListener(
              'click',
              depCollapse.fCollapseDonation,
            );
          }
        }
      }

      if (typeof document !== 'undefined') {
        const gbSelectedEl = document.getElementById('GBselected');
        if (gbSelectedEl) {
          gbSelectedEl.addEventListener('click', (event) => {
            if (event.shiftKey) {
              useNewDonationPanel = !useNewDonationPanel;
              if (typeof depStorage.set === 'function') {
                depStorage.set('useNewDonationPanel', useNewDonationPanel);
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
    }
  } else {
    if (donation2DIV) donation2DIV.innerHTML = '';
    if (donationDIV) donationDIV.innerHTML = '';
  }

  return {
    foundPlace,
    copyText,
    useNewDonationPanel,
  };
}

module.exports = {
  renderGbDonationPanel,
  getSafe,
  getDonations,
  getFriendlyDonation,
};
module.exports.default = renderGbDonationPanel;
module.exports.renderGbDonationPanel = renderGbDonationPanel;
