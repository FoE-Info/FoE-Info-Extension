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

const { evaluateGbDonationPlaces } = require('./gbDonationPlaceEvaluator.js');
const { attachGbDonationPanelEvents } = require('./gbDonationPanelEvents.js');

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

function renderGbDonationPanel(params = {}) {
  const {
    GBselected = {},
    showOptions = {},
    donationDIV,
    donation2DIV,
    currentPercent = 190,
    PlayerID = 0,
    PlayerName = '',
    MyInfo = {},
    donationSuffix = '',
    availablePackageForgePoints = 0,
    depHelper = helper,
    depElement = element,
    depCollapse = collapse,
    depTables = gbDonationTables,
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
    depTables.getPlaceValues || depTables.calcPlaceValues || (() => ({}));
  const checkInactive = depTables.checkInactive || (() => '');
  const getPlayerLink = depTables.getPlayerLink || ((n) => escapeFn(n));

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
    calcPlaceValues,
    isPlacePassableFn,
    getSafe,
    getFriendlyDonation,
    getDonations,
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
  getSafe,
  getDonations,
  getFriendlyDonation,
};
module.exports.default = renderGbDonationPanel;
module.exports.renderGbDonationPanel = renderGbDonationPanel;
