/**
 * gbOverviewCard.js
 *
 * Great Building overview and contributors/donors card renderer.
 * Decoupled from GreatBuildingsService.js for modular UI rendering and unit testing.
 */

let element = {};
let collapse = {};
let copy = {};
let helper = {};
let BigNumber;

try {
  BigNumber = require('bignumber.js');
} catch {}
try {
  element = require('./AddElement.js');
} catch {
  try {
    element = require('../fn/AddElement.js');
  } catch {}
}
try {
  collapse = require('../fn/collapse.js');
} catch {}
try {
  copy = require('../fn/copy.js');
} catch {}
try {
  helper = require('../fn/helper.js');
} catch {}
let GreatBuildingCalculator = {};
try {
  GreatBuildingCalculator = require('../calc/GreatBuildingCalculator.js');
} catch {}

function defaultCalculateArcReward(baseFp, arcBonusPercent = 90) {
  if (typeof GreatBuildingCalculator.calculateArcReward === 'function') {
    return GreatBuildingCalculator.calculateArcReward(baseFp, arcBonusPercent);
  }
  const BN = BigNumber || (typeof global !== 'undefined' && global.BigNumber);
  if (BN) {
    const base = new BN(baseFp || 0);
    const bonus = new BN(arcBonusPercent ?? 90);
    const multiplier = new BN(1).plus(bonus.dividedBy(100));
    return base
      .multipliedBy(multiplier)
      .integerValue(BN.ROUND_HALF_UP)
      .toNumber();
  }
  return Math.round(
    Number(baseFp || 0) * (1 + Number(arcBonusPercent ?? 90) / 100),
  );
}

function renderGbDonorsCard(params = {}) {
  const {
    GBselected = {},
    rankings,
    showOptions = {},
    greatbuilding,
    Top,
    GBrewards,
    Reward,
    City,
    PlayerID,
    setPlayerName,
    helper: depHelper = helper,
    element: depElement = element,
    collapse: depCollapse = collapse,
    copy: depCopy = copy,
    calculateArcReward = defaultCalculateArcReward,
  } = params;

  // Reset arrays in place if provided
  if (Array.isArray(Top)) {
    for (let i = 0; i < Top.length; i++) Top[i] = 0;
  }
  if (Array.isArray(GBrewards)) {
    for (let i = 0; i < GBrewards.length; i++) GBrewards[i] = 0;
  }
  if (Array.isArray(Reward)) {
    for (let i = 0; i < Reward.length; i++) Reward[i] = 0;
  }

  if (!rankings || !Array.isArray(rankings)) {
    if (greatbuilding) {
      greatbuilding.innerHTML = '';
    }
    return { outputHTML: '', donorsHTML: '' };
  }

  const escapeFn =
    typeof depHelper?.escapeHTML === 'function' ?
      depHelper.escapeHTML
    : (s) => String(s ?? '');
  const ownerName = escapeFn(
    GBselected.player_name || params.PlayerName || params.playerName || '',
  );
  const gbName = escapeFn(GBselected.name || '');
  const gbLevel = GBselected.level || 0;
  const gbMaxLevel = GBselected.max_level || gbLevel + 1;
  const gbCurrent = GBselected.current || 0;
  const gbTotal = GBselected.total || 0;

  const closeBtn =
    typeof depElement?.close === 'function' ? depElement.close() : '';
  const copyBtnHtml =
    typeof depElement?.copy === 'function' ?
      depElement.copy(
        'donorCopyID',
        'secondary',
        'right',
        depCollapse?.collapseGBDonors,
      )
    : '';
  const iconHtml =
    typeof depElement?.icon === 'function' ?
      depElement.icon(
        'gbinvesticon',
        'donorText',
        depCollapse?.collapseGBDonors,
      )
    : '';

  const outputHTML = `<div class="alert alert-secondary alert-dismissible show collapsed" role="alert">
      ${closeBtn}
      <p id="donorTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#donorText" aria-expanded="${!depCollapse?.collapseGBDonors}" aria-controls="donorText" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">
      ${iconHtml}
      <strong><span data-i18n="gb">GB</span> <span data-i18n="contributors">Contributors</span>:</strong>
      </p>
      ${copyBtnHtml}
      <div id="donorText" class="collapse ${depCollapse?.collapseGBDonors ? '' : 'show'}">
        ${ownerName ? `<div>Owner: ${ownerName}</div>` : ''}
        <div>Building: ${gbName}</div>
        <div>Level: ${gbLevel} / ${gbMaxLevel}</div>
        <div>Invested: ${gbCurrent} of ${gbTotal} FP</div>
        <div class="mt-2">`;

  let donorsHTML = '';
  let validDonorsCount = 0;

  for (const place of rankings) {
    if (!place) continue;
    const rank = place.rank;
    const fp = place.forge_points || 0;
    if (rank > 0 && rank <= 5) {
      if (Array.isArray(Top)) {
        Top[rank - 1] = fp;
      }
      if (place.reward?.strategy_point_amount) {
        if (Array.isArray(GBrewards)) {
          GBrewards[rank - 1] = place.reward.strategy_point_amount;
        }
        if (Array.isArray(Reward)) {
          Reward[rank - 1] = calculateArcReward(
            place.reward.strategy_point_amount,
            City?.ArcBonus ?? 90,
          );
        }
      }
    }
    if (rank > 0 && rank <= 10) {
      if (fp > 0 && place.player?.name) {
        validDonorsCount++;
        donorsHTML += `<div>${rank}. ${place.player.name} (${fp} FP)</div>`;
        if (
          PlayerID != null &&
          place.player?.player_id != null &&
          PlayerID == place.player.player_id
        ) {
          if (typeof setPlayerName === 'function') {
            setPlayerName(place.player.name, PlayerID);
          }
        }
      }
    } else {
      if (
        PlayerID != null &&
        place.player?.player_id != null &&
        PlayerID == place.player.player_id
      ) {
        if (typeof setPlayerName === 'function') {
          setPlayerName(place.player.name, PlayerID);
        }
      }
    }
  }

  if (validDonorsCount === 0) {
    donorsHTML =
      '<span class="text-muted" data-i18n="no_contributors">No contributors yet</span>';
  }

  console.debug('outputHTML', outputHTML, donorsHTML);

  if (greatbuilding) {
    if (showOptions?.showGBDonors !== false) {
      const donorsBody = donorsHTML;
      greatbuilding.innerHTML = outputHTML + donorsBody + '</div></div></div>';

      const doc = typeof document !== 'undefined' ? document : null;
      const copyEl =
        greatbuilding.querySelector?.('#donorCopyID') ||
        doc?.getElementById?.('donorCopyID');
      if (copyEl && typeof depCopy?.DonorCopy === 'function') {
        copyEl.addEventListener('click', depCopy.DonorCopy);
      }

      const labelEl =
        greatbuilding.querySelector?.('#donorTextLabel') ||
        doc?.getElementById?.('donorTextLabel');
      if (labelEl && typeof depCollapse?.fCollapseGBDonors === 'function') {
        labelEl.addEventListener('click', (e) => {
          if (
            e?.target &&
            typeof e.target.closest === 'function' &&
            (e.target.closest('#gbinvesticon') ||
              e.target.closest('#donoricon'))
          ) {
            return;
          }
          depCollapse.fCollapseGBDonors();
        });
      }

      const iconEl =
        greatbuilding.querySelector?.('#gbinvesticon') ||
        doc?.getElementById?.('gbinvesticon');
      if (
        iconEl &&
        iconEl !== labelEl &&
        typeof depCollapse?.fCollapseGBDonors === 'function'
      ) {
        iconEl.addEventListener('click', () => {
          depCollapse.fCollapseGBDonors();
        });
      }

      if (typeof depHelper?.translateContainer === 'function') {
        depHelper.translateContainer(greatbuilding);
      }
    } else {
      greatbuilding.innerHTML = '';
    }
  }

  return { outputHTML, donorsHTML };
}

const renderGbOverviewCard = renderGbDonorsCard;

module.exports = {
  renderGbDonorsCard,
  renderGbOverviewCard,
  default: renderGbDonorsCard,
};
