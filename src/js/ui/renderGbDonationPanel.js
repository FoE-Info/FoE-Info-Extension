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

const {
  getFriendlyDonation,
  getSafe,
  getDonations,
  buildClassicDonationHeader,
  bindDonationEvents,
} = require('./gbDonationFormatters.js');

const logger =
  typeof loggerModule.createLogger === 'function' ?
    loggerModule.createLogger('GbDonationPanel')
  : { debug: () => {}, warn: () => {} };

const isPlacePassableFn =
  typeof GreatBuildingCalculator.isPlacePassable === 'function' ?
    GreatBuildingCalculator.isPlacePassable
  : (remainingFp, occupantFp) =>
      Number(occupantFp || 0) < Number(remainingFp || 0);

let useNewDonationPanel = false;
try {
  if (typeof storage.getSync === 'function') {
    const syncVal = storage.getSync('useNewDonationPanel');
    if (syncVal !== null) useNewDonationPanel = syncVal;
  }
} catch {}

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
    availablePackageForgePoints = 0,
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
    availablePackageForgePoints,
  });

  const escapeFn =
    typeof depHelper.escapeHTML === 'function' ?
      depHelper.escapeHTML
    : (s) => String(s ?? '');
  const gbShortNameFn =
    typeof depHelper.fGBsname === 'function' ?
      depHelper.fGBsname
    : (s) => String(s ?? '');

  const formatNumberFn =
    typeof depHelper?.fFormatNumber === 'function' ?
      depHelper.fFormatNumber
    : (n) => {
        const num = Number(n || 0);
        return Number.isFinite(num) ? num.toLocaleString('en-US') : String(n);
      };

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
  const packageBadgeHtml =
    availablePackageForgePoints > 0 ?
      `<span class="badge bg-secondary ms-1">Packages: ${formatNumberFn(
        availablePackageForgePoints,
      )} FP</span>`
    : '';

  const isGbLocked = Boolean(
    GBselected.max_level > 0 && GBselected.level >= GBselected.max_level,
  );

  let olddonationHTML = buildClassicDonationHeader({
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
  });

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

    // Only target a place a rival can still overtake. Places whose occupant
    // already holds >= the remaining pool are locked (adding enough to pass
    // would level the GB first), so they are skipped.
    const canBePassed = isPlacePassableFn(remaining, Top[placeIdx] || 0);

    if (canBePassed) {
      foundPlace = true;
      const placeOrdinal =
        p === 1 ? '1st'
        : p === 2 ? '2nd'
        : p === 3 ? '3rd'
        : `${p}th`;

      const outcome = vals.outcome || (Profit > 0 ? 'profit' : 'loss');
      const netValue = Math.abs(vals.profitNum ?? 0);
      const outcomeClass = outcome === 'loss' ? 'invest-bad' : 'invest-good';

      if (outcome === 'loss') {
        olddonationHTML += `<p class="${outcomeClass}">${placeOrdinal} Place<br><span data-i18n="lock">Lock</span>: ${Donation}FP<br><span data-i18n="loss">Loss</span>: ${netValue}<br>`;
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
      } else {
        const outcomeLine =
          outcome === 'safe' ?
            `<span data-i18n="safe_net">Safe</span>: 0 NET`
          : `<span data-i18n="profit">Profit</span>: ${netValue} (${Percent}%)`;
        olddonationHTML += `<p class="${outcomeClass}">${placeOrdinal} Place<br><span data-i18n="lock">Lock</span>: ${Donation}FP<br>${outcomeLine}<br>`;
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
      }

      if (GBrewards[placeIdx]) {
        olddonationHTML += getFriendlyDonation(
          donateCustom,
          RewardFP,
          currentPercent,
          Donation,
          vals.band,
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

        bindDonationEvents({
          depCopy,
          depCollapse,
          depStorage,
          onRerender,
          getUseNewPanel: () => useNewDonationPanel,
          setUseNewPanel: (val) => {
            useNewDonationPanel = val;
          },
          copyText,
        });
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
