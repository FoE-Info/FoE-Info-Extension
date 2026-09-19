/**
 * gbDonationFormatters.js
 *
 * Formatting and calculation utilities for Great Building donation panels:
 * - getFriendlyDonation: generates colored badge string for donation rates.
 * - getSafe: computes safe array and suggested donations for places 1..5.
 * - getDonations: formats snippet string (P1(..), P2(..)) for copy-paste.
 * - buildClassicDonationHeader: builds the legacy alert-secondary card header.
 * - bindDonationEvents: attaches DOM click listeners for copy, collapse, and panel toggles.
 */

let BigNumber;
try {
  BigNumber = require('bignumber.js');
} catch {}

let GreatBuildingCalculator = {};
try {
  GreatBuildingCalculator = require('../calc/GreatBuildingCalculator.js');
} catch {}

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

function buildClassicDonationHeader(options = {}) {
  const {
    isCollapsed,
    iconHtml,
    closeBtn,
    copyBtn,
    packageBadgeHtml,
    getPlayerLink,
    PlayerName,
    GBselected,
    PlayerID,
    escapeFn,
    isGbLocked,
    checkInactive,
  } = options;

  let html = `<div class="alert alert-secondary alert-dismissible show collapsed" role="status" aria-live="polite">
            ${closeBtn}
            <p id="freeTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#donationText3" aria-expanded="${!isCollapsed}" aria-controls="donationText3" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">
      ${iconHtml}
            <strong><span data-i18n="gb">GB</span> <span data-i18n="donation">Donation</span>:</strong>${packageBadgeHtml}</p>`;
  html += copyBtn;
  html += `<div id="donationText3" class="collapse ${
    isCollapsed ? '' : 'show'
  }"><p>${getPlayerLink(PlayerName || GBselected?.player_name, PlayerID || GBselected?.player)}<br>`;
  html += `<span id="GBselected">${escapeFn(GBselected?.name)} ${(GBselected?.level || 0) + 1}</span></p>`;

  if (GBselected?.connected === false) {
    html += '<p class="red">*** DISCONNECTED ***</p>';
  }
  if (isGbLocked) {
    html += '<p class="red">*** LOCKED ***</p>';
  }
  html += typeof checkInactive === 'function' ? checkInactive() : '';
  return html;
}

function bindDonationEvents(options = {}) {
  const {
    depCopy,
    depCollapse,
    depStorage,
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
      if (event.shiftKey) {
        const nextVal = !getUseNewPanel();
        setUseNewPanel(nextVal);
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

module.exports = {
  getFriendlyDonation,
  getSafe,
  getDonations,
  buildClassicDonationHeader,
  bindDonationEvents,
};
module.exports.default = module.exports;
